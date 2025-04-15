import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import fs from 'fs';
import path from 'path';

// Improved spam detection function
function isJudolComment(text: string, blacklist: string[], whitelist: string[]) {
  // Check for normalized form differences (often used in spam)
  const normalizedText = text.normalize("NFKD");
  if (text !== normalizedText) {
    return true;
  }
  
  // Convert to lowercase for case-insensitive matching
  const lowerText = text.toLowerCase();
  
  // Check against blacklist
  const containsBlockedWord = blacklist.some(word => 
    lowerText.includes(word.toLowerCase())
  );
  
  // Check against whitelist (if in whitelist, not spam)
  const containsWhitelistedWord = whitelist.some(word => 
    lowerText.includes(word.toLowerCase())
  );
  
  // It's spam if it contains blocked words and doesn't contain whitelisted words
  return containsBlockedWord && !containsWhitelistedWord;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { url } = await req.json();
    
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }
    
    // Extract video ID from YouTube URL
    const videoIdMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    const videoId = videoIdMatch ? videoIdMatch[1] : null;
    
    if (!videoId) {
      return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
    }
    
    console.log('Fetching comments for video ID:', videoId);
    
    // Load spam keywords
    const spamKeywordsPath = path.join(process.cwd(), 'config', 'spamKeywords.json');
    const spamKeywordsData = fs.readFileSync(spamKeywordsPath, 'utf8');
    const { blacklist, whitelist } = JSON.parse(spamKeywordsData);
    
    // Fetch comments from YouTube API
    const apiKey = process.env.YOUTUBE_API_KEY;
    
    if (!apiKey) {
      console.error('YouTube API key is missing');
      return NextResponse.json({ error: 'YouTube API key is not configured' }, { status: 500 });
    }
    
    console.log('Using YouTube API key:', apiKey.substring(0, 5) + '...');
    
    try {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&maxResults=100&key=${apiKey}`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('YouTube API error:', JSON.stringify(errorData));
        
        // Check for specific error types
        if (errorData.error?.errors?.[0]?.reason === 'commentsDisabled') {
          return NextResponse.json({ error: 'Comments are disabled for this video' }, { status: 400 });
        } else if (errorData.error?.errors?.[0]?.reason === 'quotaExceeded') {
          return NextResponse.json({ error: 'YouTube API quota exceeded. Please try again tomorrow.' }, { status: 429 });
        }
        
        return NextResponse.json({ 
          error: 'Failed to fetch comments from YouTube', 
          details: errorData.error?.message || 'Unknown error' 
        }, { status: response.status });
      }
      
      const data = await response.json();
      
      if (!data.items || !Array.isArray(data.items)) {
        console.error('Invalid response format:', JSON.stringify(data));
        return NextResponse.json({ error: 'Invalid response format from YouTube API' }, { status: 500 });
      }
      
      console.log(`Retrieved ${data.items.length} comments`);
      
      // Process comments and check for spam
      const comments = data.items.map((item: any) => {
        const commentId = item.id;
        const commentText = item.snippet.topLevelComment.snippet.textDisplay || '';
        const authorDisplayName = item.snippet.topLevelComment.snippet.authorDisplayName || '';
        const authorProfileImageUrl = item.snippet.topLevelComment.snippet.authorProfileImageUrl || '';
        const likeCount = item.snippet.topLevelComment.snippet.likeCount || 0;
        const publishedAt = item.snippet.topLevelComment.snippet.publishedAt || '';
        
        // Check if comment is spam using improved detection
        const isSpam = isJudolComment(commentText, blacklist, whitelist);
        
        return {
          commentId,
          text: commentText,
          authorName: authorDisplayName,
          authorProfileImageUrl,
          likeCount,
          publishedAt,
          isSpam,
        };
      });
      
      return NextResponse.json({ 
        videoId,
        comments,
        totalComments: comments.length,
        spamComments: comments.filter((comment: any) => comment.isSpam).length,
      });
    } catch (fetchError) {
      console.error('Error during YouTube API fetch:', fetchError);
      return NextResponse.json({ 
        error: 'Error communicating with YouTube API', 
        details: fetchError instanceof Error ? fetchError.message : 'Unknown error' 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch comments', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

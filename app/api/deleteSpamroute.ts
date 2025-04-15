import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function POST(req: NextRequest) {
  try {
    console.log('Delete spam API called');
    
    // Get the token directly using getToken
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    
    console.log('Token in deleteSpam API:', token ? 'Available' : 'Not available');
    
    if (!token) {
      console.error('Unauthorized: No token');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get the access token from the token
    const accessToken = token.accessToken as string;
    
    console.log('Access token in deleteSpam API:', accessToken ? 'Available' : 'Not available');
    
    if (!accessToken) {
      console.error('Missing access token in token');
      return NextResponse.json({ 
        error: 'Missing access token', 
        message: 'You need to sign in again to refresh your access token'
      }, { status: 401 });
    }
    
    // Parse the request body
    const body = await req.json();
    const { commentIds } = body;
    
    console.log('Comment IDs received:', commentIds);
    
    if (!commentIds || !Array.isArray(commentIds) || commentIds.length === 0) {
      console.error('No comment IDs provided');
      return NextResponse.json({ error: 'Comment IDs are required' }, { status: 400 });
    }
    
    console.log(`Attempting to delete ${commentIds.length} comments`);
    
    // Delete each comment
    const results = await Promise.allSettled(
      commentIds.map(async (commentId) => {
        console.log(`Deleting comment: ${commentId}`);
        
        try {
          // The correct endpoint for deleting comments
          const response = await fetch(
            `https://youtube.googleapis.com/youtube/v3/comments?id=${commentId}&key=${process.env.YOUTUBE_API_KEY}`,
            {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              },
            }
          );
          
          console.log(`Delete response status for ${commentId}:`, response.status);
          
          if (!response.ok) {
            let errorMessage = `Failed to delete comment (Status: ${response.status})`;
            
            try {
              const errorData = await response.json();
              console.error(`Error deleting comment ${commentId}:`, JSON.stringify(errorData));
              
              if (errorData.error?.message) {
                errorMessage = errorData.error.message;
              }
              
              // Check for specific error types
              if (errorData.error?.errors?.[0]?.reason === 'forbidden') {
                errorMessage = 'You do not have permission to delete this comment';
              } else if (errorData.error?.errors?.[0]?.reason === 'authError') {
                errorMessage = 'Authentication error. Please sign in again.';
              }
            } catch (e) {
              console.error('Error parsing error response:', e);
            }
            
            throw new Error(errorMessage);
          }
          
          console.log(`Successfully deleted comment: ${commentId}`);
          return { commentId, success: true };
        } catch (error) {
          console.error(`Error in delete operation for ${commentId}:`, error);
          throw error;
        }
      })
    );
    
    // Process results
    const successfulDeletes = results
      .filter((result): result is PromiseFulfilledResult<{commentId: string, success: boolean}> => 
        result.status === 'fulfilled')
      .map(result => result.value.commentId);
    
    const failedDeletes = results
      .filter((result): result is PromiseRejectedResult => 
        result.status === 'rejected')
      .map((result, index) => {
        console.error(`Failed delete for comment ${commentIds[index]}:`, result.reason);
        return {
          commentId: commentIds[index],
          error: result.reason instanceof Error ? result.reason.message : 'Unknown error'
        };
      });
    
    console.log(`Delete results: ${successfulDeletes.length} successful, ${failedDeletes.length} failed`);
    
    if (successfulDeletes.length === 0 && failedDeletes.length > 0) {
      // If all deletes failed, return an error
      const commonErrors = failedDeletes.map(f => f.error).filter(Boolean);
      const primaryError = commonErrors[0] || 'Failed to delete comments';
      
      return NextResponse.json({ 
        error: primaryError,
        failedDeletes 
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: successfulDeletes.length > 0,
      totalProcessed: commentIds.length,
      successfulDeletes,
      failedDeletes,
    });
    
  } catch (error) {
    console.error('Error deleting comments:', error);
    return NextResponse.json({ 
      error: 'Failed to delete comments',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

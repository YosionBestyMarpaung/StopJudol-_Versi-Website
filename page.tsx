'use client';

import { useState, useEffect } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import Image from 'next/image';
import CommentList from './components/CommentList';

type Comment = {
  commentId: string;
  text: string;
  authorName: string;
  authorProfileImageUrl: string;
  likeCount: number;
  publishedAt: string;
  isSpam: boolean;
};

export default function Home() {
  const { data: session, status } = useSession();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [videoId, setVideoId] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Debug session information
  useEffect(() => {
    if (session) {
      console.log('Session available:', session.user?.name);
      console.log('Access token available:', (session as any).accessToken ? 'Yes' : 'No');
    }
  }, [session]);

  const fetchComments = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setComments([]);
    
    if (!url) {
      setError('Please enter a YouTube video URL');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await fetch('/api/fetchComments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.details || data.error || 'Failed to fetch comments');
      }
      
      setComments(data.comments);
      setVideoId(data.videoId);
      
      const spamCount = data.comments.filter((comment: Comment) => comment.isSpam).length;
      if (spamCount > 0) {
        setSuccessMessage(`Found ${spamCount} spam comments out of ${data.comments.length} total comments`);
      } else {
        setSuccessMessage(`No spam comments found in ${data.comments.length} total comments`);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSpam = async (commentIds: string[]) => {
    if (!commentIds.length) return;
    
    setError('');
    setSuccessMessage('');
    setIsDeleting(true);
    
    try {
      console.log('Sending delete request for comments:', commentIds);
      
      // Check if session is available
      if (!session || !session.accessToken) {
        console.error('No session or access token available');
        throw new Error('You need to be signed in with proper permissions to delete comments');
      }
      
      const response = await fetch('/api/deleteSpam', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ commentIds }),
      });
      
      console.log('Delete response status:', response.status);
      
      const data = await response.json();
      console.log('Delete response data:', data);
      
      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to delete comments');
      }
      
      // Remove deleted comments from the list
      if (data.successfulDeletes && data.successfulDeletes.length > 0) {
        setComments(prevComments => 
          prevComments.filter(comment => !data.successfulDeletes.includes(comment.commentId))
        );
        
        setSuccessMessage(`Successfully deleted ${data.successfulDeletes.length} spam comments`);
      } else {
        setSuccessMessage('No comments were deleted. You may not have permission to delete these comments.');
      }
      
      if (data.failedDeletes && data.failedDeletes.length > 0) {
        const failureReasons = data.failedDeletes.map((fail: any) => fail.error).join('; ');
        setError(`Failed to delete ${data.failedDeletes.length} comments: ${failureReasons}`);
      }
    } catch (error) {
      console.error('Error in handleDeleteSpam:', error);
      setError(error instanceof Error ? error.message : 'An error occurred while deleting comments');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center">
            <h1 className="text-3xl font-bold text-gray-900">StopJudol</h1>
            <span className="ml-2 text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">Web Edition</span>
          </div>
          
          {status === 'authenticated' ? (
            <div className="flex items-center gap-4">
              <div className="flex items-center">
                {session.user?.image && (
                  <Image
                    src={session.user.image}
                    alt={session.user.name || 'User'}
                    width={32}
                    height={32}
                    className="rounded-full mr-2"
                  />
                )}
                <span className="text-sm text-gray-900">{session.user?.name}</span>
              </div>
              <button
                onClick={() => signOut()}
                className="text-sm bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-1 rounded"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <button
              onClick={() => signIn('google')}
              className="flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 px-4 py-2 rounded-md text-sm font-medium"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" xmlns="http://www.w3.org/2000/svg">
                <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                  <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z" />
                  <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z" />
                  <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z" />
                  <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z" />
                </g>
              </svg>
              Sign in with Google
            </button>
          )}
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">YouTube Comment Moderator</h2>
          
          {status === 'authenticated' ? (
            <>
              <form onSubmit={fetchComments} className="mb-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-grow">
                    <label htmlFor="youtube-url" className="block text-sm font-medium text-gray-700 mb-1">
                      YouTube Video URL
                    </label>
                    <input
                      type="text"
                      id="youtube-url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div className="self-end">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                          <span>Loading...</span>
                        </>
                      ) : (
                        <span>Check Comments</span>
                      )}
                    </button>
                  </div>
                </div>
              </form>
              
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
                  {error}
                </div>
              )}
              
              {successMessage && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md mb-6">
                  {successMessage}
                </div>
              )}
              
              {videoId && (
                <div className="mb-6">
                  <h3 className="text-lg font-medium mb-2">Video Preview</h3>
                  <div className="aspect-video bg-gray-100 rounded-md overflow-hidden">
                    <iframe
                      width="100%"
                      height="100%"
                      src={`https://www.youtube.com/embed/${videoId}`}
                      title="YouTube video player"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  </div>
                </div>
              )}
              
              {(comments.length > 0 || loading) && (
                <CommentList
                  comments={comments}
                  loading={loading}
                  onDeleteSpam={handleDeleteSpam}
                  isDeleting={isDeleting}
                />
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Sign in to get started</h3>
              <p className="text-gray-800 mb-6">
                You need to sign in with your Google account to access YouTube comment moderation features.
              </p>
              <button
                onClick={() => signIn('google')}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md text-sm font-medium"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" xmlns="http://www.w3.org/2000/svg" className="text-white">
                  <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                    <path fill="#FFFFFF" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z" />
                    <path fill="#FFFFFF" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z" />
                    <path fill="#FFFFFF" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z" />
                    <path fill="#FFFFFF" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z" />
                  </g>
                </svg>
                Sign in with Google
              </button>
            </div>
          )}
        </div>
        
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="bg-blue-100 text-blue-800 w-8 h-8 rounded-full flex items-center justify-center mb-3">1</div>
              <h3 className="font-medium mb-2">Sign in with Google</h3>
              <p className="text-gray-800 text-sm">Connect your Google account to access YouTube API features for comment moderation.</p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="bg-blue-100 text-blue-800 w-8 h-8 rounded-full flex items-center justify-center mb-3">2</div>
              <h3 className="font-medium mb-2">Enter YouTube URL</h3>
              <p className="text-gray-800 text-sm">Paste a YouTube video URL to fetch and analyze comments for spam detection.</p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="bg-blue-100 text-blue-800 w-8 h-8 rounded-full flex items-center justify-center mb-3">3</div>
              <h3 className="font-medium mb-2">Delete Spam Comments</h3>
              <p className="text-gray-800 text-sm">Review identified spam comments and remove them with a single click.</p>
            </div>
          </div>
        </div>
      </main>
      
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <p className="text-center text-gray-700 text-sm">
            &copy; {new Date().getFullYear()} StopJudol Web Edition. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

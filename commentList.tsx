'use client';

import React from 'react';
import Image from 'next/image';

type Comment = {
  commentId: string;
  text: string;
  authorName: string;
  authorProfileImageUrl: string;
  likeCount: number;
  publishedAt: string;
  isSpam: boolean;
};

type CommentListProps = {
  comments: Comment[];
  loading: boolean;
  onDeleteSpam: (commentIds: string[]) => void;
  isDeleting: boolean;
};

export default function CommentList({ comments, loading, onDeleteSpam, isDeleting }: CommentListProps) {
  const spamComments = comments.filter(comment => comment.isSpam);
  const hasSpamComments = spamComments.length > 0;

  if (loading) {
    return (
      <div className="w-full p-6 bg-white rounded-lg shadow-md">
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (comments.length === 0) {
    return (
      <div className="w-full p-6 bg-white rounded-lg shadow-md">
        <p className="text-center text-gray-900">No comments found for this video.</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">Comments ({comments.length})</h2>
          <p className="text-sm text-gray-900">
            {spamComments.length} spam comments detected
          </p>
        </div>
        {hasSpamComments && (
          <button
            onClick={() => onDeleteSpam(spamComments.map(c => c.commentId))}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isDeleting ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>Delete All Spam</span>
              </>
            )}
          </button>
        )}
      </div>

      <div className="divide-y">
        {comments.map((comment) => (
          <div 
            key={comment.commentId} 
            className={`p-4 ${comment.isSpam ? 'bg-red-50' : ''}`}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                {comment.authorProfileImageUrl ? (
                  <Image
                    src={comment.authorProfileImageUrl}
                    alt={comment.authorName}
                    width={40}
                    height={40}
                    className="rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                    <span className="text-gray-500">{comment.authorName.charAt(0)}</span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-900">
                    {comment.authorName}
                    {comment.isSpam && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                        Spam
                      </span>
                    )}
                  </h3>
                  <span className="text-xs text-gray-900">
                    {new Date(comment.publishedAt).toLocaleDateString()}
                  </span>
                </div>
                <div 
                  className="mt-1 text-sm text-gray-700"
                  dangerouslySetInnerHTML={{ __html: comment.text }}
                />
                <div className="mt-2 flex items-center text-xs text-gray-700">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                  </svg>
                  {comment.likeCount}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

import { useState, FormEvent } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sheetApi } from '../services/api';
import type { RowComment } from '../types';

interface CommentsPanelProps {
  sheetId: string;
  rowId: string | null;
  isViewOnly?: boolean;
}

export default function CommentsPanel({
  sheetId,
  rowId,
  isViewOnly = false,
}: CommentsPanelProps) {
  const [content, setContent] = useState('');
  const queryClient = useQueryClient();

  // Fetch comments
  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['comments', sheetId, rowId],
    queryFn: () => sheetApi.getRowComments(sheetId, rowId!),
    enabled: !!rowId,
  });

  // Create comment mutation
  const createCommentMutation = useMutation({
    mutationFn: (content: string) => sheetApi.createRowComment(sheetId, rowId!, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', sheetId, rowId] });
      queryClient.invalidateQueries({ queryKey: ['sheet', sheetId] });
      setContent('');
    },
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isViewOnly || !rowId) return;

    try {
      await createCommentMutation.mutateAsync(content.trim());
    } catch (error) {
      console.error('Failed to create comment:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (!rowId) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12 text-slate-400">
        <MessageSquare className="h-16 w-16 mb-4 text-slate-300" />
        <p className="text-sm">Select a row to view comments</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Comments List */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {isLoading ? (
          <div className="text-center py-8 text-slate-500">
            <div className="animate-pulse">Loading comments...</div>
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <MessageSquare className="h-12 w-12 mx-auto mb-3 text-slate-300" />
            <p className="text-sm">No comments yet</p>
            {!isViewOnly && <p className="text-xs mt-1">Be the first to add a comment</p>}
          </div>
        ) : (
          comments.map((comment: RowComment) => (
            <div key={comment.id} className="flex space-x-3">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
                  <span className="text-sm font-medium text-indigo-600">
                    {comment.user.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between">
                  <div className="flex items-baseline space-x-2">
                    <p className="text-sm font-medium text-slate-900">{comment.user.name}</p>
                    <p className="text-xs text-slate-500">{formatDate(comment.createdAt)}</p>
                  </div>
                </div>
                <p className="mt-1 text-sm text-slate-700 whitespace-pre-wrap break-words">
                  {comment.content}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Comment Input */}
      {!isViewOnly && (
        <div className="border-t border-slate-200 px-6 py-4">
          <form onSubmit={handleSubmit} className="flex flex-col space-y-3">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Add a comment..."
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-sm bg-white text-slate-900"
              disabled={createCommentMutation.isPending}
            />
            <button
              type="submit"
              disabled={!content.trim() || createCommentMutation.isPending}
              className="self-end px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              <Send className="h-4 w-4" />
              <span className="text-sm font-medium">Send</span>
            </button>
          </form>
          {createCommentMutation.isError && (
            <p className="mt-2 text-sm text-red-600">
              Failed to post comment. Please try again.
            </p>
          )}
        </div>
      )}

      {/* View-only message */}
      {isViewOnly && (
        <div className="border-t border-slate-200 px-6 py-4 bg-slate-50">
          <p className="text-sm text-slate-600 text-center">
            You have view-only access. Contact the owner for editor permissions to comment.
          </p>
        </div>
      )}
    </div>
  );
}

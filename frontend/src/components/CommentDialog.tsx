import { useState, FormEvent, useEffect } from 'react';
import { X, MessageSquare, Send } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sheetApi } from '../services/api';
import type { CellComment } from '../types';

interface CommentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  sheetId: string;
  cellId: string;
  isViewOnly?: boolean;
}

export default function CommentDialog({
  isOpen,
  onClose,
  sheetId,
  cellId,
  isViewOnly = false,
}: CommentDialogProps) {
  const [content, setContent] = useState('');
  const queryClient = useQueryClient();

  // Fetch comments
  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['comments', sheetId, cellId],
    queryFn: () => sheetApi.getCellComments(sheetId, cellId),
    enabled: isOpen,
  });

  // Create comment mutation
  const createCommentMutation = useMutation({
    mutationFn: (content: string) => sheetApi.createCellComment(sheetId, cellId, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', sheetId, cellId] });
      queryClient.invalidateQueries({ queryKey: ['sheet', sheetId] });
      setContent('');
    },
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isViewOnly) return;

    try {
      await createCommentMutation.mutateAsync(content.trim());
    } catch (error) {
      console.error('Failed to create comment:', error);
    }
  };

  // Reset form when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setContent('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center space-x-2">
            <MessageSquare className="h-5 w-5 text-indigo-600" />
            <h2 className="text-xl font-semibold text-slate-900">Comments</h2>
            {comments.length > 0 && (
              <span className="text-sm text-slate-500">({comments.length})</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {isLoading ? (
            <div className="text-center py-8 text-slate-500">
              Loading comments...
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 text-slate-300" />
              <p className="text-sm">No comments yet</p>
              {!isViewOnly && <p className="text-xs mt-1">Be the first to add a comment</p>}
            </div>
          ) : (
            comments.map((comment: CellComment) => (
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
          <div className="border-t border-slate-200 p-6">
            <form onSubmit={handleSubmit} className="flex space-x-3">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Add a comment..."
                rows={2}
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-sm"
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
    </div>
  );
}

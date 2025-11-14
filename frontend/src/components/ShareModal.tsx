import { useState, FormEvent } from 'react';
import { X, Mail, Trash2, UserPlus } from 'lucide-react';

interface Share {
  id: string;
  sharedWithEmail: string;
  permission: 'VIEWER' | 'EDITOR';
  sharedWith?: {
    name: string;
    email: string;
  };
}

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  sheetId: string;
  shares: Share[];
  onShare: (email: string, permission: 'VIEWER' | 'EDITOR') => Promise<void>;
  onRemoveShare: (shareId: string) => Promise<void>;
}

export default function ShareModal({
  isOpen,
  onClose,
  shares,
  onShare,
  onRemoveShare,
}: ShareModalProps) {
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState<'VIEWER' | 'EDITOR'>('VIEWER');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await onShare(email, permission);
      setEmail('');
      setPermission('VIEWER');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to share sheet');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async (shareId: string) => {
    try {
      await onRemoveShare(shareId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove share');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Share Sheet</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Share Form */}
          <form onSubmit={handleSubmit} className="mb-6">
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="colleague@example.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="permission" className="block text-sm font-medium text-gray-700 mb-1">
                  Permission
                </label>
                <select
                  id="permission"
                  value={permission}
                  onChange={(e) => setPermission(e.target.value as 'VIEWER' | 'EDITOR')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="VIEWER">Can view</option>
                  <option value="EDITOR">Can edit</option>
                </select>
              </div>

              {error && (
                <div className="rounded-md bg-red-50 p-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                {isSubmitting ? 'Sharing...' : 'Share'}
              </button>
            </div>
          </form>

          {/* Shared With List */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">
              Shared with ({shares.length})
            </h3>
            {shares.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                Not shared with anyone yet
              </p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {shares.map((share) => (
                  <div
                    key={share.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {share.sharedWith?.name || share.sharedWithEmail}
                      </p>
                      {share.sharedWith && (
                        <p className="text-xs text-gray-500 truncate">{share.sharedWithEmail}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        {share.permission === 'VIEWER' ? 'Can view' : 'Can edit'}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemove(share.id)}
                      className="ml-3 text-red-600 hover:text-red-800 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, FormEvent, useEffect, useRef } from 'react';
import { X, Mail, Trash2, UserPlus, ChevronDown } from 'lucide-react';
import { authApi } from '../services/api';

interface Share {
  id: string;
  sharedWithEmail: string;
  permission: 'VIEWER' | 'EDIT' | 'EDIT_CAN_SHARE' | 'OWNER';
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
  onShare: (email: string, permission: 'VIEWER' | 'EDIT' | 'EDIT_CAN_SHARE') => Promise<void>;
  onRemoveShare: (shareId: string) => Promise<void>;
  isViewOnly?: boolean;
}

interface User {
  id: string;
  email: string;
  name: string;
}

export default function ShareModal({
  isOpen,
  onClose,
  shares,
  onShare,
  onRemoveShare,
  isViewOnly = false,
}: ShareModalProps) {
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState<'VIEWER' | 'EDIT' | 'EDIT_CAN_SHARE'>('VIEWER');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch all users when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  // Filter users as email input changes
  useEffect(() => {
    if (email.trim() === '') {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(
        (user) =>
          user.email.toLowerCase().includes(email.toLowerCase()) ||
          user.name.toLowerCase().includes(email.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  }, [email, users]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const data = await authApi.getUsers();
      setUsers(data);
      setFilteredUsers(data);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setIsLoadingUsers(false);
    }
  };

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
          className="fixed inset-0 bg-slate-900/10 backdrop-blur-[2px] transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              {isViewOnly ? 'Sheet Access' : 'Share Sheet'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Share Form - Only shown for non-viewers */}
          {!isViewOnly && (
          <form onSubmit={handleSubmit} className="mb-6">
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email address
                </label>
                <div className="relative" ref={dropdownRef}>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                    <input
                      type="text"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onFocus={() => setShowDropdown(true)}
                      className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400"
                      placeholder="Type to search users..."
                      autoComplete="off"
                    />
                    <ChevronDown
                      className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 cursor-pointer"
                      onClick={() => setShowDropdown(!showDropdown)}
                    />
                  </div>

                  {/* Dropdown */}
                  {showDropdown && (
                    <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {isLoadingUsers ? (
                        <div className="px-4 py-3 text-sm text-gray-500 text-center">
                          Loading users...
                        </div>
                      ) : filteredUsers.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-gray-500 text-center">
                          {email ? 'No users found' : 'No users available'}
                        </div>
                      ) : (
                        filteredUsers.map((user) => (
                          <div
                            key={user.id}
                            onClick={() => {
                              setEmail(user.email);
                              setShowDropdown(false);
                            }}
                            className="px-4 py-3 hover:bg-gray-100 cursor-pointer transition-colors border-b last:border-b-0"
                          >
                            <div className="flex items-center space-x-3">
                              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-sm font-medium text-blue-600">
                                  {user.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {user.name}
                                </p>
                                <p className="text-xs text-gray-500 truncate">{user.email}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="permission" className="block text-sm font-medium text-gray-700 mb-1">
                  Permission
                </label>
                <select
                  id="permission"
                  value={permission}
                  onChange={(e) => setPermission(e.target.value as 'VIEWER' | 'EDIT' | 'EDIT_CAN_SHARE')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="VIEWER">Can view</option>
                  <option value="EDIT">Can edit</option>
                  <option value="EDIT_CAN_SHARE">Can edit and share</option>
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
          )}

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
                        {share.permission === 'OWNER'
                          ? 'Owner'
                          : share.permission === 'VIEWER'
                          ? 'Can view'
                          : share.permission === 'EDIT'
                          ? 'Can edit'
                          : 'Can edit and share'}
                      </p>
                    </div>
                    {!isViewOnly && share.permission !== 'OWNER' && (
                      <button
                        onClick={() => handleRemove(share.id)}
                        className="ml-3 text-red-600 hover:text-red-800 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
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

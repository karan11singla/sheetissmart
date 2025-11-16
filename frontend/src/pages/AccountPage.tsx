import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, Mail, Lock, FileText, Share2, CheckCircle, AlertCircle } from 'lucide-react';
import { authApi } from '../services/api';

export default function AccountPage() {
  const queryClient = useQueryClient();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['auth-me'],
    queryFn: authApi.getMe,
  });

  const { data: stats } = useQuery({
    queryKey: ['auth-stats'],
    queryFn: authApi.getStats,
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data: { name?: string; email?: string }) => authApi.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth-me'] });
      setIsEditingProfile(false);
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) =>
      authApi.changePassword(currentPassword, newPassword),
    onSuccess: () => {
      setPasswordMessage({ type: 'success', text: 'Password changed successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordMessage(null), 5000);
    },
    onError: (error: any) => {
      setPasswordMessage({
        type: 'error',
        text: error.response?.data?.message || 'Failed to change password',
      });
      setTimeout(() => setPasswordMessage(null), 5000);
    },
  });

  const handleEditProfile = () => {
    setName(user?.name || '');
    setEmail(user?.email || '');
    setIsEditingProfile(true);
  };

  const handleSaveProfile = () => {
    const updates: { name?: string; email?: string } = {};
    if (name !== user?.name) updates.name = name;
    if (email !== user?.email) updates.email = email;

    if (Object.keys(updates).length > 0) {
      updateProfileMutation.mutate(updates);
    } else {
      setIsEditingProfile(false);
    }
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New passwords do not match' });
      setTimeout(() => setPasswordMessage(null), 5000);
      return;
    }

    if (newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      setTimeout(() => setPasswordMessage(null), 5000);
      return;
    }

    changePasswordMutation.mutate({ currentPassword, newPassword });
  };

  if (userLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading account...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-gray-50">
      <div className="max-w-4xl mx-auto px-8 py-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Account Settings</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage your profile, security, and account information
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-50 rounded-lg">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Owned Sheets</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.ownedSheets || 0}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-50 rounded-lg">
                <Share2 className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Shared with Me</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.sharedWithMe || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Section */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Profile Information</h2>
            <p className="text-sm text-gray-600">Update your account profile information</p>
          </div>
          <div className="px-6 py-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="inline h-4 w-4 mr-2" />
                Name
              </label>
              {isEditingProfile ? (
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              ) : (
                <p className="text-gray-900 px-3 py-2 bg-gray-50 rounded-md">{user?.name}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Mail className="inline h-4 w-4 mr-2" />
                Email
              </label>
              {isEditingProfile ? (
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              ) : (
                <p className="text-gray-900 px-3 py-2 bg-gray-50 rounded-md">{user?.email}</p>
              )}
            </div>
            <div className="pt-2">
              {isEditingProfile ? (
                <div className="flex space-x-3">
                  <button
                    onClick={() => setIsEditingProfile(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveProfile}
                    disabled={updateProfileMutation.isPending}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleEditProfile}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Edit Profile
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Password Section */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Change Password</h2>
            <p className="text-sm text-gray-600">Update your password to keep your account secure</p>
          </div>
          <div className="px-6 py-6">
            <form onSubmit={handleChangePassword} className="space-y-4">
              {passwordMessage && (
                <div
                  className={`flex items-center space-x-2 p-3 rounded-md ${
                    passwordMessage.type === 'success'
                      ? 'bg-green-50 text-green-700'
                      : 'bg-red-50 text-red-700'
                  }`}
                >
                  {passwordMessage.type === 'success' ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <AlertCircle className="h-5 w-5" />
                  )}
                  <span className="text-sm font-medium">{passwordMessage.text}</span>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Lock className="inline h-4 w-4 mr-2" />
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Lock className="inline h-4 w-4 mr-2" />
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Lock className="inline h-4 w-4 mr-2" />
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  minLength={6}
                />
              </div>
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={changePasswordMutation.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {changePasswordMutation.isPending ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

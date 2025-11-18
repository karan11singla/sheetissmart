import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Clock, Star, User, Plus, LogOut, FolderOpen, Search } from 'lucide-react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { sheetApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import Logo from './Logo';
import { useState } from 'react';

interface SidebarProps {
  onNavigate?: () => void;
  onOpenSearch?: () => void;
}

export default function Sidebar({ onNavigate, onOpenSearch }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, logout } = useAuth();
  const [showBrowse, setShowBrowse] = useState(false);

  const { data: sheets } = useQuery({
    queryKey: ['sheets'],
    queryFn: sheetApi.getAll,
    enabled: showBrowse,
  });

  const navItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Search, label: 'Search', path: null, onClick: () => onOpenSearch?.() },
    { icon: FolderOpen, label: 'Browse', path: null, onClick: () => setShowBrowse(!showBrowse) },
    { icon: Clock, label: 'Recent', path: '/recent' },
    { icon: Star, label: 'Favorites', path: '/favorites' },
  ];

  const createSheetMutation = useMutation({
    mutationFn: () => sheetApi.create({
      name: `Untitled Sheet ${new Date().toLocaleDateString()}`,
      description: '',
    }),
    onSuccess: (sheet) => {
      queryClient.invalidateQueries({ queryKey: ['sheets'] });
      navigate(`/sheet/${sheet.id}`);
    },
  });

  const handleCreateSheet = () => {
    createSheetMutation.mutate();
  };

  return (
    <aside className="w-64 h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col shadow-2xl border-r border-slate-700">
      {/* Logo & Brand */}
      <div className="p-6 border-b border-slate-700">
        <Link to="/" className="flex items-center space-x-3 group">
          <Logo className="h-8 w-8 transition-transform group-hover:scale-110" />
          <span className="text-xl font-bold text-white">
            SheetIsSmart
          </span>
        </Link>
      </div>

      {/* Create Button */}
      <div className="p-4">
        <button
          onClick={handleCreateSheet}
          disabled={createSheetMutation.isPending}
          className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="h-5 w-5" />
          <span className="font-medium">
            {createSheetMutation.isPending ? 'Creating...' : 'Create Sheet'}
          </span>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.path && location.pathname === item.path;

          if (item.path === null) {
            // Browse button with dropdown
            return (
              <div key={item.label}>
                <button
                  onClick={item.onClick}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                    showBrowse
                      ? 'bg-slate-700 text-white shadow-lg'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <span className="font-medium">{item.label}</span>
                </button>

                {/* Sheet list dropdown */}
                {showBrowse && (
                  <div className="mt-2 ml-4 space-y-1 max-h-64 overflow-y-auto">
                    {sheets && sheets.length > 0 ? (
                      sheets.map((sheet: any) => (
                        <button
                          key={sheet.id}
                          onClick={() => {
                            navigate(`/sheet/${sheet.id}`);
                            onNavigate?.();
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-all truncate"
                        >
                          {sheet.name}
                        </button>
                      ))
                    ) : (
                      <p className="px-4 py-2 text-xs text-slate-500">No sheets yet</p>
                    )}
                  </div>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.path}
              to={item.path!}
              onClick={onNavigate}
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                isActive
                  ? 'bg-slate-700 text-white shadow-lg'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-slate-700 space-y-2">
        <Link
          to="/account"
          onClick={onNavigate}
          className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
            location.pathname === '/account'
              ? 'bg-slate-700 text-white'
              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <User className="h-5 w-5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{user?.name || 'Account'}</p>
            <p className="text-xs text-slate-400 truncate">{user?.email}</p>
          </div>
        </Link>
        <button
          onClick={logout}
          className="w-full flex items-center space-x-3 px-4 py-2 text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition-all"
        >
          <LogOut className="h-5 w-5" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
}

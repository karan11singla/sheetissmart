import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Clock, Star, Plus, LogOut, FolderOpen, Search, Bell } from 'lucide-react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { sheetApi, notificationApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import Logo from './Logo';
import { useState } from 'react';

interface SidebarProps {
  onNavigate?: () => void;
  onOpenSearch?: () => void;
  onOpenNotifications?: () => void;
}

export default function Sidebar({ onNavigate, onOpenSearch, onOpenNotifications }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, logout } = useAuth();
  const [showBrowse, setShowBrowse] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const { data: sheets } = useQuery({
    queryKey: ['sheets'],
    queryFn: sheetApi.getAll,
    enabled: showBrowse,
  });

  // Fetch unread notification count
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: notificationApi.getUnreadCount,
    refetchInterval: 30000,
  });

  const navItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Search, label: 'Search', path: null, onClick: () => onOpenSearch?.() },
    { icon: FolderOpen, label: 'Browse', path: null, onClick: () => setShowBrowse(!showBrowse) },
    { icon: Bell, label: 'Notifications', path: null, onClick: () => { setShowNotifications(!showNotifications); onOpenNotifications?.(); }, badge: unreadCount },
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
    <aside className="w-64 h-screen bg-white flex flex-col border-r border-neutral-200">
      {/* Logo & Brand */}
      <div className="p-5 pb-4">
        <Link to="/" className="flex items-center space-x-2.5 group">
          <Logo className="h-8 w-8 transition-transform group-hover:scale-105" />
          <span className="text-lg font-semibold text-neutral-900 tracking-tight">
            SheetSmart
          </span>
        </Link>
      </div>

      {/* Create Button */}
      <div className="px-3 pb-3">
        <button
          onClick={handleCreateSheet}
          disabled={createSheetMutation.isPending}
          className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
        >
          <Plus className="h-4 w-4" />
          <span>
            {createSheetMutation.isPending ? 'Creating...' : 'New Sheet'}
          </span>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-1 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.path && location.pathname === item.path;

          if (item.label === 'Browse') {
            return (
              <div key={item.label}>
                <button
                  onClick={item.onClick}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-all text-sm ${
                    showBrowse
                      ? 'bg-primary-50 text-primary-700 font-medium'
                      : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                  }`}
                >
                  <Icon className="h-[18px] w-[18px] flex-shrink-0" />
                  <span>{item.label}</span>
                </button>

                {showBrowse && (
                  <div className="mt-1 ml-3 space-y-0.5 max-h-64 overflow-y-auto border-l-2 border-neutral-100 pl-3">
                    {sheets && sheets.length > 0 ? (
                      sheets.map((sheet: any) => (
                        <button
                          key={sheet.id}
                          onClick={() => {
                            navigate(`/sheet/${sheet.id}`);
                            onNavigate?.();
                          }}
                          className="w-full text-left px-3 py-1.5 text-sm text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50 rounded transition-all truncate"
                        >
                          {sheet.name}
                        </button>
                      ))
                    ) : (
                      <p className="px-3 py-1.5 text-xs text-neutral-400">No sheets yet</p>
                    )}
                  </div>
                )}
              </div>
            );
          }

          if (item.path === null) {
            return (
              <button
                key={item.label}
                onClick={item.onClick}
                className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-all text-sm text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
              >
                <div className="relative">
                  <Icon className="h-[18px] w-[18px] flex-shrink-0" />
                  {(item as any).badge > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 bg-primary-500 text-white text-[10px] rounded-full flex items-center justify-center font-medium">
                      {(item as any).badge > 9 ? '9+' : (item as any).badge}
                    </span>
                  )}
                </div>
                <span>{item.label}</span>
              </button>
            );
          }

          return (
            <Link
              key={item.path}
              to={item.path!}
              onClick={onNavigate}
              className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-all text-sm ${
                isActive
                  ? 'bg-primary-50 text-primary-700 font-medium'
                  : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
              }`}
            >
              <Icon className="h-[18px] w-[18px] flex-shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="mt-auto border-t border-neutral-100">
        <div className="p-3 space-y-0.5">
          <Link
            to="/account"
            onClick={onNavigate}
            className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all text-sm ${
              location.pathname === '/account'
                ? 'bg-primary-50 text-primary-700'
                : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
            }`}
          >
            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate text-neutral-900">{user?.name || 'Account'}</p>
              <p className="text-xs text-neutral-400 truncate">{user?.email}</p>
            </div>
          </Link>
          <button
            onClick={logout}
            className="w-full flex items-center space-x-3 px-3 py-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 rounded-lg transition-all text-sm"
          >
            <LogOut className="h-[18px] w-[18px]" />
            <span>Log out</span>
          </button>
        </div>
      </div>
    </aside>
  );
}

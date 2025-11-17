import { Link, useLocation } from 'react-router-dom';
import { Home, Bell, Search, Folder, Clock, Star, Users, Grid, Plus } from 'lucide-react';

export default function Sidebar() {
  const location = useLocation();

  const navItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Bell, label: 'Notifications', path: '/notifications' },
    { icon: Search, label: 'Search', path: '/search' },
    { icon: Folder, label: 'Browse', path: '/browse' },
    { icon: Clock, label: 'Recents', path: '/recents' },
    { icon: Star, label: 'Favorites', path: '/favorites' },
    { icon: Users, label: 'Resource Management', path: '/resources' },
    { icon: Grid, label: 'WorkApps', path: '/workapps' },
  ];

  return (
    <aside className="w-16 bg-gradient-to-b from-indigo-800 via-indigo-700 to-indigo-900 flex flex-col h-full shadow-lg">
      {/* Navigation */}
      <nav className="flex-1 py-4 flex flex-col items-center space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`group relative flex flex-col items-center justify-center w-12 h-12 rounded-lg transition-all ${
                isActive
                  ? 'bg-white bg-opacity-20 text-white'
                  : 'text-white text-opacity-70 hover:bg-white hover:bg-opacity-10 hover:text-opacity-100'
              }`}
              title={item.label}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[9px] mt-0.5 font-medium">{item.label.split(' ')[0]}</span>

              {/* Tooltip */}
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
                {item.label}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Create Button */}
      <div className="p-2 border-t border-white border-opacity-20">
        <Link
          to="/"
          onClick={(e) => {
            e.preventDefault();
            // This will be handled by the home page create button
            window.location.href = '/?create=true';
          }}
          className="flex flex-col items-center justify-center w-12 h-12 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors text-white"
          title="Create"
        >
          <Plus className="h-6 w-6" />
          <span className="text-[9px] mt-0.5 font-medium">Create</span>
        </Link>
      </div>
    </aside>
  );
}

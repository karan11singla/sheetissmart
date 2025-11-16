import { Link, useLocation } from 'react-router-dom';
import { Home, FileText, Settings } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { sheetApi } from '../services/api';

export default function Sidebar() {
  const location = useLocation();

  const { data: sheets = [] } = useQuery({
    queryKey: ['sheets'],
    queryFn: sheetApi.getAll,
  });

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <Link
          to="/"
          className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
            location.pathname === '/'
              ? 'bg-blue-50 text-blue-700'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <Home className="h-5 w-5 mr-3" />
          Home
        </Link>

        <Link
          to="/account"
          className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
            location.pathname === '/account'
              ? 'bg-blue-50 text-blue-700'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <Settings className="h-5 w-5 mr-3" />
          Account
        </Link>

        {/* Divider */}
        <div className="pt-4 pb-2">
          <div className="flex items-center justify-between px-3 mb-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              My Sheets
            </span>
          </div>
        </div>

        {/* Sheet List */}
        <div className="space-y-0.5">
          {sheets.length === 0 ? (
            <div className="px-3 py-2 text-xs text-gray-400">
              No sheets yet
            </div>
          ) : (
            sheets.map((sheet: any) => (
              <Link
                key={sheet.id}
                to={`/sheet/${sheet.id}`}
                className={`flex items-center px-3 py-2 text-sm rounded-lg transition-colors group ${
                  location.pathname === `/sheet/${sheet.id}`
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <FileText className="h-4 w-4 mr-3 flex-shrink-0" />
                <span className="truncate flex-1">{sheet.name}</span>
                {sheet.isShared && (
                  <span className="text-xs text-gray-400 ml-2">
                    {sheet.sharedPermission === 'VIEWER' ? 'View' : 'Edit'}
                  </span>
                )}
              </Link>
            ))
          )}
        </div>
      </nav>
    </aside>
  );
}

import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import Sidebar from './Sidebar';
import GlobalSearch from './GlobalSearch';
import RightSidebar from './RightSidebar';
import NotificationsPanel from './NotificationsPanel';

export default function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <div className="min-h-screen bg-white flex">
      {/* Mobile hamburger menu button */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-slate-800 text-white rounded-lg shadow-lg hover:bg-slate-700 transition-colors"
        aria-label="Toggle menu"
      >
        {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-40
        transform transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <Sidebar
          onNavigate={() => setIsSidebarOpen(false)}
          onOpenSearch={() => setShowSearch(true)}
          onOpenNotifications={() => setShowNotifications(true)}
        />
      </div>

      {/* Main Content - overflow-hidden so each page controls its own scroll */}
      <main className="flex-1 overflow-hidden bg-gray-50 w-full lg:w-auto">
        <Outlet />
      </main>

      {/* Global Search Modal - Rendered at layout level */}
      <GlobalSearch isOpen={showSearch} onClose={() => setShowSearch(false)} />

      {/* Notifications Panel */}
      <RightSidebar
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        title="Notifications"
      >
        <NotificationsPanel onClose={() => setShowNotifications(false)} />
      </RightSidebar>
    </div>
  );
}

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
    <div className="h-screen overflow-hidden bg-neutral-50 flex">
      {/* Mobile hamburger menu button */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="lg:hidden fixed top-3 left-3 z-50 p-2 bg-white text-neutral-700 rounded-lg shadow-md border border-neutral-200 hover:bg-neutral-50 transition-colors"
        aria-label="Toggle menu"
      >
        {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-neutral-900/20 backdrop-blur-sm z-30"
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

      {/* Main Content */}
      <main className="flex-1 overflow-hidden w-full lg:w-auto">
        <Outlet />
      </main>

      {/* Global Search Modal */}
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

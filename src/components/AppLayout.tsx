import React from 'react';
import Topbar from './Topbar';
import MobileBottomNav from './MobileBottomNav';
import ClientErrorBoundary from './ClientErrorBoundary';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Topbar />
      {/* min-w-0 on the flex/main containers stops a runaway child (a
          long URL, a wide image, etc.) from forcing horizontal scroll
          on phones. The page wrapper is already overflow-x-hidden as a
          safety net. */}
      <main className="max-w-screen-2xl mx-auto px-3 sm:px-4 lg:px-8 xl:px-10 2xl:px-16 py-4 sm:py-6 min-w-0">
        {children}
      </main>
      {/* Errors inside the realtime-subscribed bottom nav shouldn't kill
          the rest of the page. Fallback to nothing — the desktop topbar
          still has full navigation. */}
      <ClientErrorBoundary>
        <MobileBottomNav />
      </ClientErrorBoundary>
    </div>
  );
}
import React from 'react';
import Topbar from './Topbar';
import MobileBottomNav from './MobileBottomNav';
import ClientErrorBoundary from './ClientErrorBoundary';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Topbar />
      <main className="max-w-screen-2xl mx-auto px-4 lg:px-8 xl:px-10 2xl:px-16 py-6">
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
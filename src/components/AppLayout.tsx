import React from 'react';
import Topbar from './Topbar';
import MobileBottomNav from './MobileBottomNav';
import ClientErrorBoundary from './ClientErrorBoundary';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div
      className="
        min-h-screen md:min-h-screen
        bg-background overflow-x-hidden
      "
      // dvh on mobile excludes the collapsible browser URL bar so the
      // bottom nav doesn't jump up/down as you scroll. Desktop keeps
      // min-h-screen behavior (vh-equivalent).
      style={{ minHeight: '100dvh' }}
    >
      <Topbar />
      {/* main content
          - min-w-0 lets long children (URLs, wide images) shrink
            instead of forcing horizontal scroll
          - The pb-app-shell utility below adds bottom-nav clearance
            on mobile only (md:pb-6 resets to normal padding on desktop) */}
      <main className="max-w-screen-2xl mx-auto px-3 sm:px-4 lg:px-8 xl:px-10 2xl:px-16 py-4 sm:py-6 min-w-0 pb-app-shell md:pb-6">
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
import React from 'react';
import Topbar from './Topbar';
import MobileBottomNav from './MobileBottomNav';

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
      <MobileBottomNav />
    </div>
  );
}
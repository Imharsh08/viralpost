import React from 'react';
import AppLayout from '@/components/AppLayout';
import FeedTabs from './components/FeedTabs';
import FeedSidebar from './components/FeedSidebar';
import FeedHeader from './components/FeedHeader';

export default function PublicFeedPage() {
  return (
    <AppLayout>
      <div className="flex gap-6 lg:gap-8 xl:gap-10">
        {/* Main feed column */}
        <div className="flex-1 min-w-0">
          <FeedHeader />
          <FeedTabs />
        </div>

        {/* Sidebar */}
        <aside className="hidden lg:block w-72 xl:w-80 shrink-0">
          <FeedSidebar />
        </aside>
      </div>
    </AppLayout>
  );
}
'use client';

import React, { useState } from 'react';
import { TrendingUp, Clock, Users } from 'lucide-react';
import PostCard from './PostCard';
import AdSlotCard from './AdSlotCard';
import FeedSkeleton from './FeedSkeleton';
import { mockPosts } from '@/lib/mockData';

const tabs = [
  { id: 'trending', label: 'Trending', icon: TrendingUp },
  { id: 'latest', label: 'Latest', icon: Clock },
  { id: 'following', label: 'Following', icon: Users },
];

export default function FeedTabs() {
  const [activeTab, setActiveTab] = useState('trending');
  const [loading, setLoading] = useState(false);

  const handleTabChange = (tabId: string) => {
    if (tabId === activeTab) return;
    setLoading(true);
    setActiveTab(tabId);
    // Backend: fetch feed with ?tab=tabId&cursor=null
    setTimeout(() => setLoading(false), 600);
  };

  const posts = activeTab === 'following'
    ? mockPosts.filter((_, i) => i < 3)
    : mockPosts;

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-muted rounded-xl mb-5 w-fit">
        {tabs.map((tab) => (
          <button
            key={`tab-${tab.id}`}
            onClick={() => handleTabChange(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Feed list */}
      {loading ? (
        <FeedSkeleton />
      ) : activeTab === 'following' && posts.length < 4 ? (
        <FollowingEmptyState />
      ) : (
        <div className="flex flex-col gap-4">
          {posts.map((post, index) => (
            <React.Fragment key={`feed-item-${post.id}`}>
              <PostCard post={post} />
              {/* Ad slot every 5th post */}
              {(index + 1) % 5 === 0 && index < posts.length - 1 && (
                <AdSlotCard key={`ad-slot-${index}`} />
              )}
            </React.Fragment>
          ))}

          {/* Load more */}
          <button className="btn-ghost w-full py-3 text-sm font-semibold border border-border rounded-xl hover:bg-muted mt-2">
            Load more posts
          </button>
        </div>
      )}
    </div>
  );
}

function FollowingEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center card p-8">
      <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mb-4">
        <Users size={26} className="text-primary" />
      </div>
      <h3 className="text-base font-bold text-foreground mb-2">No posts from people you follow yet</h3>
      <p className="text-sm text-muted-foreground max-w-xs mb-5">
        Follow creators you enjoy to see their latest posts here. Browse Trending to find great writers.
      </p>
      <button
        onClick={() => {}}
        className="btn-primary"
      >
        <TrendingUp size={15} />
        Explore Trending
      </button>
    </div>
  );
}
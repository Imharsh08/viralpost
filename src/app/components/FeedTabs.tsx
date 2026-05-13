'use client';

import React, { useState, useEffect } from 'react';
import { TrendingUp, Clock, Users } from 'lucide-react';
import PostCard from './PostCard';
import AdSlotCard from './AdSlotCard';
import FeedSkeleton from './FeedSkeleton';
import { mockPosts, type MockPost } from '@/lib/mockData';

const tabs = [
  { id: 'trending', label: 'Trending', icon: TrendingUp },
  { id: 'latest', label: 'Latest', icon: Clock },
  { id: 'following', label: 'Following', icon: Users },
];

function dbPostToMockPost(p: any): MockPost {
  return {
    id: p.id,
    title: p.title || '',
    excerpt: p.excerpt || p.content?.slice(0, 300) || '',
    author: {
      id: p.users?.id || '',
      username: p.users?.username || 'unknown',
      displayName: p.users?.display_name || 'Unknown',
      avatarUrl: p.users?.avatar_url || '',
      isVerified: p.users?.is_verified || false,
    },
    tags: p.tags || [],
    likes: p.likes_count || 0,
    comments: p.comments_count || 0,
    shares: p.shares_count || 0,
    views: p.views_count || 0,
    pointsEarned: p.points_earned || 0,
    timeAgo: '',
    publishedAt: p.published_at || p.created_at,
    isLiked: false,
    isTrending: p.is_trending || false,
    isAiEnhanced: p.is_ai_enhanced || false,
  };
}

export default function FeedTabs() {
  const [activeTab, setActiveTab] = useState('trending');
  const [loading, setLoading] = useState(true);
  const [dbPosts, setDbPosts] = useState<MockPost[]>([]);

  useEffect(() => {
    async function loadPosts() {
      setLoading(true);
      try {
        const res = await fetch('/api/posts');
        if (res.ok) {
          const data = await res.json();
          if (data.posts && data.posts.length > 0) {
            setDbPosts(data.posts.map(dbPostToMockPost));
          }
        }
      } catch {
        // silently fall back to mock posts
      } finally {
        setLoading(false);
      }
    }
    loadPosts();
  }, []);

  const handleTabChange = (tabId: string) => {
    if (tabId === activeTab) return;
    setActiveTab(tabId);
  };

  // Merge real posts (newest first) with mock posts as fallback content
  const allPosts = dbPosts.length > 0 ? [...dbPosts, ...mockPosts] : mockPosts;
  const posts = activeTab === 'following'
    ? allPosts.filter((_, i) => i < 3)
    : activeTab === 'trending'
    ? allPosts.filter((p) => p.isTrending || dbPosts.some((d) => d.id === p.id))
    : allPosts;

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
'use client';

import React, { useEffect, useState } from 'react';
import { TrendingUp, Users, FileText } from 'lucide-react';
import { formatCount } from '@/lib/formatCount';

interface Stats {
  activeCreators: number;
  postsThisWeek: number;
  trendingNow: number;
}

export default function FeedHeader() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch('/api/stats')
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) setStats(data);
      })
      .catch(() => {});
  }, []);

  const statItems = [
    {
      id: 'stat-creators',
      label: 'Active Creators',
      value: stats ? formatCount(stats.activeCreators) : '—',
      icon: Users,
      color: 'text-primary bg-secondary',
    },
    {
      id: 'stat-posts',
      label: 'Posts This Week',
      value: stats ? formatCount(stats.postsThisWeek) : '—',
      icon: FileText,
      color: 'text-amber-700 bg-amber-50',
    },
    {
      id: 'stat-trending',
      label: 'Trending Now',
      value: stats ? `${formatCount(stats.trendingNow)} posts` : '—',
      icon: TrendingUp,
      color: 'text-positive bg-positive-bg',
    },
  ];

  return (
    <div className="mb-4 sm:mb-6">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Discover Posts</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Content from creators earning from their writing
          </p>
        </div>
      </div>
      {/* Stats strip:
          - on mobile we use a 3-col grid so all three cards fit on a single
            row without sideways scroll, and labels shrink to xs/no-padding
          - on sm+ we restore the horizontal-scroll chip layout */}
      <div className="grid grid-cols-3 gap-2 sm:flex sm:gap-3 sm:overflow-x-auto scrollbar-hide pb-1">
        {statItems.map((stat) => (
          <div
            key={stat.id}
            className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-card border border-border min-w-0 sm:shrink-0"
          >
            <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center shrink-0 ${stat.color}`}>
              <stat.icon size={12} className="sm:hidden" />
              <stat.icon size={14} className="hidden sm:block" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs text-muted-foreground leading-none truncate">{stat.label}</p>
              <p className="text-xs sm:text-sm font-bold text-foreground font-mono tabular-nums mt-0.5 truncate">
                {stat.value}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

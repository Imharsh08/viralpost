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
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Discover Posts</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Content from creators earning from their writing
          </p>
        </div>
      </div>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
        {statItems.map((stat) => (
          <div
            key={stat.id}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-card border border-border shrink-0"
          >
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${stat.color}`}>
              <stat.icon size={14} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground leading-none">{stat.label}</p>
              <p className="text-sm font-bold text-foreground font-mono tabular-nums mt-0.5">
                {stat.value}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

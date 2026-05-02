import React from 'react';
import { TrendingUp, Users, FileText } from 'lucide-react';

const stats = [
  { id: 'stat-creators', label: 'Active Creators', value: '24,891', icon: Users, color: 'text-primary bg-secondary' },
  { id: 'stat-posts', label: 'Posts This Week', value: '138,204', icon: FileText, color: 'text-amber-700 bg-amber-50' },
  { id: 'stat-trending', label: 'Trending Now', value: '412 posts', icon: TrendingUp, color: 'text-positive bg-positive-bg' },
];

export default function FeedHeader() {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Discover Posts</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            AI-enhanced content from creators earning from their writing
          </p>
        </div>
      </div>
      {/* Quick stats strip */}
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
        {stats?.map((stat) => (
          <div
            key={stat?.id}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-card border border-border shrink-0"
          >
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${stat?.color}`}>
              <stat.icon size={14} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground leading-none">{stat?.label}</p>
              <p className="text-sm font-bold text-foreground font-mono tabular-nums mt-0.5">{stat?.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
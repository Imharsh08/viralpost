'use client';

import React from 'react';
import { TrendingUp, Zap, Hash } from 'lucide-react';
import Link from 'next/link';
import AppImage from '@/components/ui/AppImage';
import { trendingTags, topCreators } from '@/lib/mockData';
import FollowButton from './FollowButton';
import { formatCount } from '@/lib/formatCount';

export default function FeedSidebar() {
  return (
    <div className="sticky top-24 flex flex-col gap-5">
      {/* Points earning info */}
      <div className="card p-4 bg-gradient-to-br from-violet-50 to-purple-50 border-purple-100">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Zap size={15} className="text-primary fill-primary/30" />
          </div>
          <h3 className="text-sm font-bold text-foreground">Earn from Writing</h3>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed mb-3">
          Every verified ad view on your post earns you <strong className="text-amber-600">+1 point</strong>. Post goes viral? Earn up to <strong className="text-amber-600">+100 pts</strong> milestone bonus.
        </p>
        <Link href="/write-editor-page" className="btn-primary w-full justify-center text-xs py-2">
          Start Writing
        </Link>
      </div>
      {/* Trending tags */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Hash size={15} className="text-primary" />
          <h3 className="text-sm font-bold text-foreground">Trending Tags</h3>
        </div>
        <div className="flex flex-col gap-2">
          {trendingTags?.map((tag, i) => (
            <Link
              key={`sidebar-tag-${tag?.name}`}
              href={`/tag/${encodeURIComponent(tag?.name ?? '')}`}
              className="flex items-center justify-between py-1.5 hover:bg-muted rounded-lg px-1.5 transition-colors group"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-muted-foreground w-4 text-right">{i + 1}</span>
                <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                  #{tag?.name}
                </span>
              </div>
              <span className="text-xs text-muted-foreground font-mono tabular-nums">
                {formatCount(tag?.postCount)} posts
              </span>
            </Link>
          ))}
        </div>
      </div>
      {/* Top creators */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={15} className="text-primary" />
          <h3 className="text-sm font-bold text-foreground">Top Creators This Week</h3>
        </div>
        <div className="flex flex-col gap-3">
          {topCreators?.map((creator) => (
            <div key={`sidebar-creator-${creator?.id}`} className="flex items-center gap-3">
              <AppImage
                src={creator?.avatarUrl}
                alt={`${creator?.displayName} creator profile`}
                width={36}
                height={36}
                className="w-9 h-9 rounded-full object-cover border border-border shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground truncate">{creator?.displayName}</p>
                <p className="text-xs text-muted-foreground font-mono tabular-nums">
                  {formatCount(creator?.weeklyViews)} views
                </p>
              </div>
              <FollowButton
                targetUserId={creator?.id}
                targetDisplayName={creator?.displayName}
                variant="compact"
              />
            </div>
          ))}
        </div>
      </div>
      {/* Points earning rules summary */}
      <div className="card p-4 bg-amber-50/50 border-amber-100">
        <h3 className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-3">How Points Work</h3>
        <div className="flex flex-col gap-2">
          {[
            { event: 'Ad view on your post', pts: '+1 pt', cap: '1/user/day' },
            { event: 'Ad click on your post', pts: '+3 pts', cap: '1/user/day' },
            { event: 'Post receives a like', pts: '+1 pt', cap: 'Uncapped' },
            { event: 'New follower', pts: '+5 pts', cap: 'Uncapped' },
            { event: 'Post hits 1k views', pts: '+100 pts', cap: 'Once/post' },
          ]?.map((rule) => (
            <div key={`rule-${rule?.event}`} className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground leading-tight flex-1 pr-2">{rule?.event}</span>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-xs font-bold text-amber-700 font-mono">{rule?.pts}</span>
              </div>
            </div>
          ))}
        </div>
        <Link href="/rewards" className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
          <Zap size={11} />
          View Rewards Catalog →
        </Link>
      </div>
    </div>
  );
}
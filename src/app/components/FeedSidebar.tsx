'use client';

import React, { useEffect, useState } from 'react';
import { Sparkles, Zap, Hash, BadgeCheck } from 'lucide-react';
import Link from 'next/link';
import AppImage from '@/components/ui/AppImage';
import { trendingTags, topCreators } from '@/lib/mockData';
import FollowButton from './FollowButton';
import { formatCount } from '@/lib/formatCount';
import { useAuth } from '@/contexts/AuthContext';

interface SuggestedCreator {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  is_verified: boolean;
  follower_count: number | null;
  niche_tags: string[] | null;
  shared_niche_count: number;
}

export default function FeedSidebar() {
  const { session } = useAuth();
  const [suggested, setSuggested] = useState<SuggestedCreator[] | null>(null);

  // Load suggested creators on mount. Auth header is optional — the API
  // returns niche-aware suggestions for signed-in viewers and a popularity
  // fallback for anonymous viewers. We cache nothing client-side; the list
  // is cheap to recompute and updates whenever the viewer follows someone.
  useEffect(() => {
    let cancelled = false;
    const headers: Record<string, string> = {};
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
    fetch('/api/suggested-creators?limit=5', { headers })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setSuggested(Array.isArray(data.creators) ? data.creators : []);
      })
      .catch(() => !cancelled && setSuggested([]));
    return () => { cancelled = true; };
  }, [session?.access_token]);

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
      {/* Suggested creators — live from /api/suggested-creators, falls back
          to the mock topCreators if the API has no results yet (e.g. empty
          database in dev or new account with no niche overlap). */}
      <SuggestedCreatorsCard suggested={suggested} signedIn={!!session} />
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

/* ── Suggested creators ── */

function SuggestedCreatorsCard({
  suggested,
  signedIn,
}: {
  suggested: SuggestedCreator[] | null;
  signedIn: boolean;
}) {
  // suggested === null → still loading. Show a skeleton so the sidebar
  // doesn't visibly shift when the live data arrives.
  if (suggested === null) {
    return (
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={15} className="text-primary" />
          <h3 className="text-sm font-bold text-foreground">Suggested for You</h3>
        </div>
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div key={`sk-${i}`} className="flex items-center gap-3 animate-pulse">
              <div className="w-9 h-9 rounded-full bg-muted shrink-0" />
              <div className="flex-1">
                <div className="h-3 bg-muted rounded w-2/3 mb-1.5" />
                <div className="h-2.5 bg-muted rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Empty result → fall back to the seeded topCreators mock so the
  // sidebar isn't empty for a brand-new database / fresh account.
  if (suggested.length === 0) {
    return (
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={15} className="text-primary" />
          <h3 className="text-sm font-bold text-foreground">Suggested for You</h3>
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
    );
  }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles size={15} className="text-primary" />
          <h3 className="text-sm font-bold text-foreground">Suggested for You</h3>
        </div>
        {signedIn && suggested.some((c) => c.shared_niche_count > 0) && (
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Niche match
          </span>
        )}
      </div>
      <div className="flex flex-col gap-3">
        {suggested.map((creator) => {
          const initials = creator.display_name?.slice(0, 2).toUpperCase() ?? '??';
          return (
            <div key={`sg-${creator.id}`} className="flex items-center gap-3">
              <Link href={`/u/${creator.username}`} className="shrink-0">
                {creator.avatar_url ? (
                  <AppImage
                    src={creator.avatar_url}
                    alt={`${creator.display_name} creator profile`}
                    width={36}
                    height={36}
                    className="w-9 h-9 rounded-full object-cover border border-border"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                    {initials}
                  </div>
                )}
              </Link>
              <Link href={`/u/${creator.username}`} className="flex-1 min-w-0 group">
                <div className="flex items-center gap-1">
                  <p className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">
                    {creator.display_name}
                  </p>
                  {creator.is_verified && (
                    <BadgeCheck size={11} className="text-primary fill-primary/20 shrink-0" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground font-mono tabular-nums">
                  {creator.shared_niche_count > 0
                    ? `${creator.shared_niche_count} shared ${
                        creator.shared_niche_count === 1 ? 'niche' : 'niches'
                      } · ${formatCount(creator.follower_count)} followers`
                    : `${formatCount(creator.follower_count)} followers`}
                </p>
              </Link>
              <FollowButton
                targetUserId={creator.id}
                targetDisplayName={creator.display_name}
                variant="compact"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
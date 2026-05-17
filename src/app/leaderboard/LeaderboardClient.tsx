'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Trophy, Zap, Flame, BarChart2, Loader2, BadgeCheck, Eye, Heart, MessageCircle, Crown, Star, Award,
} from 'lucide-react';
import AppImage from '@/components/ui/AppImage';
import { formatCount } from '@/lib/formatCount';

type Board = 'earners' | 'viral' | 'engaging';
type Window = 'week' | 'all';

interface EarnerRow {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  is_verified: boolean | null;
  follower_count: number | null;
  points_earned: number | null;
}

interface ViralRow {
  post_id: string;
  title: string | null;
  excerpt: string | null;
  views_count: number | null;
  likes_count: number | null;
  comments_count: number | null;
  published_at: string;
  author_id: string;
  author_username: string | null;
  author_display_name: string | null;
  author_avatar_url: string | null;
  author_is_verified: boolean | null;
}

interface EngagingRow {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  is_verified: boolean | null;
  follower_count: number | null;
  total_views: number | null;
  total_engagement: number | null;
  engagement_rate: number | string | null;
}

// Defensive count formatter — Supabase RPCs can return null or string for
// some numeric/bigint columns. formatCount handles those plus the K/M/B
// abbreviation expected across the app.
const fmt = formatCount;

const BOARDS: { id: Board; label: string; icon: any; supportsWindow: boolean }[] = [
  { id: 'earners', label: 'Top Earners', icon: Zap, supportsWindow: true },
  { id: 'viral', label: 'Most Viral', icon: Flame, supportsWindow: true },
  { id: 'engaging', label: 'Most Engaging', icon: BarChart2, supportsWindow: false },
];

export default function LeaderboardClient() {
  const [board, setBoard] = useState<Board>('earners');
  const [windowSel, setWindowSel] = useState<Window>('week');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/leaderboard?board=${board}&window=${windowSel}`)
      .then((r) => r.json())
      .then((data) => !cancelled && setResults(data.results ?? []))
      .catch(() => !cancelled && setResults([]))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [board, windowSel]);

  const activeBoard = BOARDS.find((b) => b.id === board)!;
  const supportsWindow = activeBoard.supportsWindow;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Hero */}
      <div className="card p-6 mb-5 bg-gradient-to-r from-amber-50 via-orange-50 to-rose-50 border-amber-200">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md shrink-0">
            <Trophy size={28} className="text-white drop-shadow" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Leaderboard</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Top creators by points earned, posts that went viral, and writers driving the most engagement.
            </p>
          </div>
        </div>
      </div>

      {/* Board tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-xl mb-3 w-fit max-w-full overflow-x-auto scrollbar-hide">
        {BOARDS.map((b) => (
          <button
            key={b.id}
            onClick={() => setBoard(b.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 whitespace-nowrap shrink-0 ${
              board === b.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <b.icon size={14} />
            {b.label}
          </button>
        ))}
      </div>

      {/* Window switch */}
      {supportsWindow && (
        <div className="flex items-center gap-1.5 mb-5 text-xs">
          <span className="text-muted-foreground">Window:</span>
          <button
            onClick={() => setWindowSel('week')}
            className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
              windowSel === 'week' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            This week
          </button>
          <button
            onClick={() => setWindowSel('all')}
            className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
              windowSel === 'all' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            All-time
          </button>
        </div>
      )}

      {/* Results */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={28} className="animate-spin text-muted-foreground" />
        </div>
      ) : results.length === 0 ? (
        <EmptyState board={board} />
      ) : board === 'earners' ? (
        <EarnersList rows={results as EarnerRow[]} />
      ) : board === 'viral' ? (
        <ViralList rows={results as ViralRow[]} />
      ) : (
        <EngagingList rows={results as EngagingRow[]} />
      )}
    </div>
  );
}

function EmptyState({ board }: { board: Board }) {
  const msg =
    board === 'earners'
      ? 'No points earned yet. As creators publish posts and get likes, this board fills up.'
      : board === 'viral'
      ? 'No viral posts yet. Write something readers can\'t stop talking about.'
      : 'Not enough data yet — posts need 100+ views to rank here.';
  return (
    <div className="card p-10 text-center">
      <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-3">
        <Trophy size={26} className="text-primary" />
      </div>
      <h3 className="text-base font-bold text-foreground mb-1">Leaderboard is empty</h3>
      <p className="text-sm text-muted-foreground max-w-xs mx-auto">{msg}</p>
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-md shrink-0" title="#1">
        <Crown size={16} className="text-white drop-shadow" />
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center shadow-sm shrink-0" title="#2">
        <Award size={16} className="text-white" />
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center shadow-sm shrink-0" title="#3">
        <Award size={16} className="text-white" />
      </div>
    );
  }
  if (rank <= 10) {
    return (
      <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center shrink-0" title={`#${rank}`}>
        <Star size={14} className="text-primary" />
      </div>
    );
  }
  return (
    <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground font-mono shrink-0">
      {rank}
    </div>
  );
}

function Avatar({ url, name }: { url: string | null; name: string }) {
  const initials = name?.slice(0, 2).toUpperCase() ?? '??';
  if (url) {
    return (
      <AppImage
        src={url}
        alt={name}
        width={40}
        height={40}
        className="w-10 h-10 rounded-full object-cover border border-border shrink-0"
      />
    );
  }
  return (
    <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
      {initials}
    </div>
  );
}

function EarnersList({ rows }: { rows: EarnerRow[] }) {
  return (
    <div className="flex flex-col gap-2">
      {rows.map((row, idx) => (
        <Link
          key={row.user_id}
          href={`/u/${row.username ?? ''}`}
          className="card p-3 hover:shadow-md transition-shadow flex items-center gap-3"
        >
          <RankBadge rank={idx + 1} />
          <Avatar url={row.avatar_url} name={row.display_name ?? ''} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-bold text-foreground truncate">{row.display_name ?? 'Unknown'}</span>
              {row.is_verified && <BadgeCheck size={13} className="text-primary fill-primary/20 shrink-0" />}
            </div>
            <p className="text-xs text-muted-foreground truncate">
              @{row.username ?? '—'} · {fmt(row.follower_count)} followers
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className="flex items-center gap-1 text-amber-600">
              <Zap size={13} className="fill-amber-500 text-amber-500" />
              <span className="text-base font-bold font-mono tabular-nums">
                {fmt(row.points_earned)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">pts</p>
          </div>
        </Link>
      ))}
    </div>
  );
}

function ViralList({ rows }: { rows: ViralRow[] }) {
  return (
    <div className="flex flex-col gap-2">
      {rows.map((row, idx) => (
        <div key={row.post_id} className="card p-3 hover:shadow-md transition-shadow flex items-start gap-3">
          <RankBadge rank={idx + 1} />
          <div className="flex-1 min-w-0">
            <Link href={`/post/${row.post_id}`} className="block group">
              {row.title && (
                <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                  {row.title}
                </h3>
              )}
              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{row.excerpt}</p>
            </Link>
            <Link href={`/u/${row.author_username ?? ''}`} className="flex items-center gap-1.5 mt-2 hover:text-primary transition-colors w-fit">
              <Avatar url={row.author_avatar_url} name={row.author_display_name ?? ''} />
              <span className="text-xs font-semibold text-foreground">{row.author_display_name ?? 'Unknown'}</span>
              {row.author_is_verified && <BadgeCheck size={11} className="text-primary fill-primary/20" />}
            </Link>
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Eye size={11} />
                <span className="font-mono tabular-nums">{fmt(row.views_count)}</span>
              </span>
              <span className="flex items-center gap-1">
                <Heart size={11} />
                <span className="font-mono tabular-nums">{fmt(row.likes_count)}</span>
              </span>
              <span className="flex items-center gap-1">
                <MessageCircle size={11} />
                <span className="font-mono tabular-nums">{fmt(row.comments_count)}</span>
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EngagingList({ rows }: { rows: EngagingRow[] }) {
  return (
    <div className="flex flex-col gap-2">
      {rows.map((row, idx) => (
        <Link
          key={row.user_id}
          href={`/u/${row.username ?? ''}`}
          className="card p-3 hover:shadow-md transition-shadow flex items-center gap-3"
        >
          <RankBadge rank={idx + 1} />
          <Avatar url={row.avatar_url} name={row.display_name ?? ''} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-bold text-foreground truncate">{row.display_name ?? 'Unknown'}</span>
              {row.is_verified && <BadgeCheck size={13} className="text-primary fill-primary/20 shrink-0" />}
            </div>
            <p className="text-xs text-muted-foreground truncate">
              @{row.username ?? '—'} · {fmt(row.total_views)} views · {fmt(row.total_engagement)} engagements
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-base font-bold text-emerald-600 font-mono tabular-nums">
              {Number(row.engagement_rate ?? 0).toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground">engagement</p>
          </div>
        </Link>
      ))}
    </div>
  );
}

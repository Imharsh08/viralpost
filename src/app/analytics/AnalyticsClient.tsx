'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  BarChart2, Eye, Heart, MessageCircle, Zap, TrendingUp,
  Sparkles, Users, PenSquare, FileText,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Post {
  id: string;
  title: string;
  tags: string[];
  likes_count: number;
  comments_count: number;
  shares_count: number;
  views_count: number;
  points_earned: number;
  is_ai_enhanced: boolean;
  is_trending: boolean;
  published_at: string | null;
  created_at: string;
}

interface ProfileStats {
  totalViews: number;
  totalLikes: number;
  totalPoints: number;
  totalPublished: number;
  totalDrafts: number;
}

interface PointsSummary {
  total_lifetime: number;
  total_this_week: number;
  pts_from_likes: number;
  pts_from_follows: number;
  pts_from_milestones: number;
  pts_from_bonus: number;
}

interface LedgerEntry {
  id: string;
  event_type: string;
  points: number;
  post_id: string | null;
  metadata: any;
  created_at: string;
}

export default function AnalyticsClient() {
  const router = useRouter();
  const { user, session } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [followerCount, setFollowerCount] = useState(0);
  const [balance, setBalance] = useState(0);
  const [pointsSummary, setPointsSummary] = useState<PointsSummary | null>(null);
  const [recentLedger, setRecentLedger] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'views' | 'likes' | 'points' | 'date'>('views');

  const authHeader = session ? `Bearer ${session.access_token}` : '';

  useEffect(() => {
    if (!user && !loading) router.push('/sign-up-login-screen');
  }, [user, loading]);

  useEffect(() => {
    if (!session) return;
    setLoading(true);

    Promise.all([
      fetch('/api/user/profile', { headers: { Authorization: authHeader } }).then((r) => r.json()),
      fetch('/api/user/posts?filter=published', { headers: { Authorization: authHeader } }).then((r) => r.json()),
      fetch('/api/points', { headers: { Authorization: authHeader } }).then((r) => r.json()),
    ])
      .then(([profileData, postsData, pointsData]) => {
        setStats(profileData.stats);
        setFollowerCount(profileData.profile?.follower_count ?? 0);
        setPosts(postsData.posts ?? []);
        setBalance(pointsData.balance ?? 0);
        setPointsSummary(pointsData.summary ?? null);
        setRecentLedger(pointsData.recent ?? []);
      })
      .catch(() => toast.error('Failed to load analytics'))
      .finally(() => setLoading(false));
  }, [session]);

  const sorted = [...posts].sort((a, b) => {
    if (sortBy === 'views') return (b.views_count ?? 0) - (a.views_count ?? 0);
    if (sortBy === 'likes') return (b.likes_count ?? 0) - (a.likes_count ?? 0);
    if (sortBy === 'points') return (b.points_earned ?? 0) - (a.points_earned ?? 0);
    return new Date(b.published_at ?? b.created_at).getTime() - new Date(a.published_at ?? a.created_at).getTime();
  });

  const topPost = sorted[0];
  const avgViews = posts.length ? Math.round((stats?.totalViews ?? 0) / posts.length) : 0;
  const avgLikes = posts.length ? Math.round((stats?.totalLikes ?? 0) / posts.length) : 0;
  const engagementRate = stats?.totalViews
    ? (((stats.totalLikes) / stats.totalViews) * 100).toFixed(1)
    : '0.0';

  if (loading) return <AnalyticsSkeleton />;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Your writing performance at a glance
          </p>
        </div>
        <Link href="/write-editor-page" className="btn-primary">
          <PenSquare size={15} />
          Write a Post
        </Link>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <SummaryCard
          icon={Eye}
          label="Total Views"
          value={stats?.totalViews ?? 0}
          iconColor="text-primary"
          bgColor="bg-primary/5"
          sub={`~${avgViews.toLocaleString()} per post`}
        />
        <SummaryCard
          icon={Heart}
          label="Total Likes"
          value={stats?.totalLikes ?? 0}
          iconColor="text-negative"
          bgColor="bg-negative-bg"
          sub={`~${avgLikes.toLocaleString()} per post`}
        />
        <SummaryCard
          icon={Users}
          label="Followers"
          value={followerCount}
          iconColor="text-positive"
          bgColor="bg-positive-bg"
          sub="total followers"
        />
        <SummaryCard
          icon={Zap}
          label="Available Points"
          value={balance}
          iconColor="text-amber-500"
          bgColor="bg-amber-50"
          sub={`+${(pointsSummary?.total_this_week ?? 0).toLocaleString()} this week`}
          highlight
        />
      </div>

      {/* Secondary metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <MetricCard label="Engagement Rate" value={`${engagementRate}%`} desc="likes / views" />
        <MetricCard label="Avg. Views / Post" value={avgViews.toLocaleString()} desc="across all posts" />
        <MetricCard label="Published Posts" value={(stats?.totalPublished ?? 0).toString()} desc={`${stats?.totalDrafts ?? 0} drafts saved`} />
      </div>

      {/* Top performing post highlight */}
      {topPost && (
        <div className="card p-5 mb-6 bg-gradient-to-r from-violet-50/60 to-purple-50/60 border-purple-100">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={15} className="text-primary" />
            <h2 className="text-sm font-bold text-foreground">Top Performing Post</h2>
          </div>
          <h3 className="text-base font-bold text-foreground line-clamp-1 mb-1">
            {topPost.title || '(Untitled)'}
          </h3>
          <div className="flex items-center gap-5 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1"><Eye size={11} />{(topPost.views_count ?? 0).toLocaleString()} views</span>
            <span className="flex items-center gap-1"><Heart size={11} />{(topPost.likes_count ?? 0).toLocaleString()} likes</span>
            <span className="flex items-center gap-1"><MessageCircle size={11} />{(topPost.comments_count ?? 0).toLocaleString()} comments</span>
            <span className="flex items-center gap-1 text-amber-600 font-semibold">
              <Zap size={11} className="fill-amber-400" />+{topPost.points_earned ?? 0} pts
            </span>
          </div>
        </div>
      )}

      {/* Per-post breakdown */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <BarChart2 size={15} className="text-primary" />
            <h2 className="text-sm font-bold text-foreground">Post Breakdown</h2>
          </div>
          {/* Sort */}
          <div className="flex items-center gap-1 p-1 bg-muted rounded-xl">
            {(['views', 'likes', 'points', 'date'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSortBy(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                  sortBy === s ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {sorted.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mb-3">
              <FileText size={22} className="text-muted-foreground" />
            </div>
            <h3 className="text-sm font-bold text-foreground mb-1">No published posts yet</h3>
            <p className="text-xs text-muted-foreground mb-4">Publish your first post to see analytics here.</p>
            <Link href="/write-editor-page" className="btn-primary text-sm">
              <PenSquare size={14} />
              Write a Post
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-semibold text-muted-foreground py-2 pr-4">Post</th>
                  <th className="text-right text-xs font-semibold text-muted-foreground py-2 px-3">Views</th>
                  <th className="text-right text-xs font-semibold text-muted-foreground py-2 px-3">Likes</th>
                  <th className="text-right text-xs font-semibold text-muted-foreground py-2 px-3">Comments</th>
                  <th className="text-right text-xs font-semibold text-muted-foreground py-2 px-3">Points</th>
                  <th className="text-right text-xs font-semibold text-muted-foreground py-2 pl-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((post, idx) => {
                  const engRate = post.views_count ? ((post.likes_count / post.views_count) * 100).toFixed(1) : '0.0';
                  return (
                    <tr key={post.id} className={`border-b border-border/50 hover:bg-muted/40 transition-colors ${idx === 0 ? 'bg-violet-50/30' : ''}`}>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground font-mono w-5 shrink-0">{idx + 1}</span>
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground text-xs line-clamp-1">
                              {post.title || '(Untitled)'}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {post.is_ai_enhanced && <span className="badge-ai text-[10px]"><Sparkles size={8} />AI</span>}
                              {post.is_trending && <span className="badge-trending text-[10px]"><TrendingUp size={8} />Trending</span>}
                              <span className="text-[10px] text-muted-foreground">{engRate}% engagement</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className="font-mono tabular-nums text-xs font-semibold text-foreground">
                          {(post.views_count ?? 0).toLocaleString()}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className="font-mono tabular-nums text-xs text-negative font-semibold">
                          {(post.likes_count ?? 0).toLocaleString()}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className="font-mono tabular-nums text-xs text-foreground">
                          {(post.comments_count ?? 0).toLocaleString()}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className="font-mono tabular-nums text-xs text-amber-600 font-bold">
                          +{post.points_earned ?? 0}
                        </span>
                      </td>
                      <td className="py-3 pl-3 text-right whitespace-nowrap">
                        <span className="text-xs text-muted-foreground">
                          {post.published_at
                            ? new Date(post.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                            : '—'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Points breakdown + recent activity */}
      {pointsSummary && (pointsSummary.total_lifetime > 0 || recentLedger.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Zap size={15} className="text-amber-500 fill-amber-400" />
              <h2 className="text-sm font-bold text-foreground">Points Breakdown</h2>
              <span className="text-xs text-muted-foreground ml-auto">
                {pointsSummary.total_lifetime.toLocaleString()} lifetime
              </span>
            </div>
            <BreakdownBar
              segments={[
                { label: 'Likes', value: pointsSummary.pts_from_likes, color: 'bg-rose-400' },
                { label: 'Followers', value: pointsSummary.pts_from_follows, color: 'bg-emerald-400' },
                { label: 'Milestones', value: pointsSummary.pts_from_milestones, color: 'bg-violet-400' },
                { label: 'Bonus', value: pointsSummary.pts_from_bonus, color: 'bg-amber-400' },
              ]}
            />
          </div>

          <div className="card p-5">
            <div className="flex items-center gap-2 mb-3">
              <BarChart2 size={15} className="text-primary" />
              <h2 className="text-sm font-bold text-foreground">Recent Activity</h2>
            </div>
            {recentLedger.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">
                No points activity yet. Publish your first post to start earning.
              </p>
            ) : (
              <ul className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
                {recentLedger.map((entry) => (
                  <li key={entry.id} className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-muted-foreground">{ledgerEventLabel(entry.event_type)}</span>
                      <span className="text-muted-foreground/60">·</span>
                      <span className="text-muted-foreground/70">{relTime(entry.created_at)}</span>
                    </div>
                    <span className={`font-mono tabular-nums font-bold shrink-0 ${entry.points > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                      {entry.points > 0 ? '+' : ''}{entry.points}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Points info */}
      <div className="card p-5 mt-4 bg-amber-50/50 border-amber-100">
        <div className="flex items-center gap-2 mb-3">
          <Zap size={15} className="text-amber-500 fill-amber-400" />
          <h2 className="text-sm font-bold text-amber-800">How You Earn Points</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            { event: 'Ad view on your post', pts: '+1 pt', cap: 'per user/day' },
            { event: 'Ad click on your post', pts: '+3 pts', cap: 'per user/day' },
            { event: 'Post receives a like', pts: '+1 pt', cap: 'uncapped' },
            { event: 'New follower', pts: '+5 pts', cap: 'uncapped' },
            { event: 'Post hits 1,000 views', pts: '+100 pts', cap: 'once per post' },
            { event: 'First published post', pts: '+50 pts', cap: 'one time' },
          ].map((rule) => (
            <div key={rule.event} className="flex items-center justify-between bg-white/60 rounded-xl px-3 py-2">
              <span className="text-xs text-amber-800">{rule.event}</span>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                <span className="text-xs font-bold text-amber-700 font-mono">{rule.pts}</span>
                <span className="text-[10px] text-amber-500">{rule.cap}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ── */

function SummaryCard({
  icon: Icon, label, value, iconColor, bgColor, sub, highlight = false,
}: {
  icon: any; label: string; value: number; iconColor: string; bgColor: string; sub: string; highlight?: boolean;
}) {
  return (
    <div className={`card p-4 ${highlight ? 'border-amber-200 bg-amber-50/40' : ''}`}>
      <div className={`w-9 h-9 rounded-xl ${bgColor} flex items-center justify-center mb-3`}>
        <Icon size={17} className={iconColor} />
      </div>
      <p className="text-2xl font-extrabold text-foreground font-mono tabular-nums">
        {value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value.toLocaleString()}
      </p>
      <p className="text-sm font-semibold text-foreground mt-0.5">{label}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
    </div>
  );
}

function MetricCard({ label, value, desc }: { label: string; value: string; desc: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      <p className="text-xl font-extrabold text-foreground font-mono tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
    </div>
  );
}

function BreakdownBar({ segments }: { segments: { label: string; value: number; color: string }[] }) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  if (total === 0) {
    return (
      <p className="text-xs text-muted-foreground text-center py-4">
        No points earned yet. Like, follow, and write to start your breakdown.
      </p>
    );
  }
  return (
    <>
      <div className="flex h-2.5 w-full rounded-full overflow-hidden bg-muted mb-3">
        {segments.map((seg) => {
          const pct = (seg.value / total) * 100;
          if (pct === 0) return null;
          return <div key={seg.label} className={seg.color} style={{ width: `${pct}%` }} />;
        })}
      </div>
      <ul className="flex flex-col gap-1.5">
        {segments.map((seg) => {
          const pct = total ? Math.round((seg.value / total) * 100) : 0;
          return (
            <li key={seg.label} className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 text-foreground">
                <span className={`w-2.5 h-2.5 rounded-full ${seg.color}`} />
                {seg.label}
              </span>
              <span className="font-mono tabular-nums text-muted-foreground">
                <span className="font-bold text-foreground">{seg.value.toLocaleString()}</span> · {pct}%
              </span>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function ledgerEventLabel(type: string): string {
  switch (type) {
    case 'like': return 'Like on your post';
    case 'follow': return 'New follower';
    case 'milestone': return 'View milestone';
    case 'first_post_bonus': return 'First post bonus';
    case 'profile_completeness': return 'Profile complete';
    case 'ad_view': return 'Ad view';
    case 'ad_click': return 'Ad click';
    default: return type.replace(/_/g, ' ');
  }
}

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function AnalyticsSkeleton() {
  return (
    <div className="max-w-4xl mx-auto animate-pulse">
      <div className="h-8 bg-muted rounded w-48 mb-6" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => <div key={i} className="card p-4 h-28" />)}
      </div>
      <div className="card p-5 h-64" />
    </div>
  );
}

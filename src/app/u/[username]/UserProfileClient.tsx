'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, BadgeCheck, Calendar, Eye, Heart, MessageCircle,
  Zap, Sparkles, Flame, FileText,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import AppImage from '@/components/ui/AppImage';
import Skeleton from '@/components/ui/Skeleton';
import FollowButton from '@/app/components/FollowButton';
import { useUserRealtime } from '@/lib/hooks/useUserRealtime';
import { formatCount } from '@/lib/formatCount';

interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  headline: string | null;
  niche_tags: string[] | null;
  is_verified: boolean;
  follower_count: number;
  following_count: number;
  created_at: string;
}

interface ProfilePost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  tags: string[];
  likes_count: number;
  comments_count: number;
  views_count: number;
  points_earned: number;
  is_trending: boolean;
  is_ai_enhanced: boolean;
  published_at: string;
}

function joinedDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function UserProfileClient({ username }: { username: string }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<ProfilePost[]>([]);
  const [stats, setStats] = useState({ post_count: 0, total_views: 0, total_points_earned: 0 });
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);

  const liveFollowerCount = useUserRealtime(profile?.id ?? null, followerCount);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/user/by-username/${encodeURIComponent(username)}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error || !data.profile) {
          setNotFound(true);
        } else {
          setProfile(data.profile);
          setPosts(data.posts ?? []);
          setStats(data.stats ?? { post_count: 0, total_views: 0, total_points_earned: 0 });
          setFollowerCount(data.profile.follower_count ?? 0);
        }
      })
      .catch(() => !cancelled && setNotFound(true))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [username]);

  if (loading) {
    return <PublicProfileSkeleton />;
  }

  if (notFound || !profile) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <h1 className="text-2xl font-bold text-foreground mb-2">User not found</h1>
        <p className="text-sm text-muted-foreground mb-5">
          No creator with the username @{username}.
        </p>
        <Link href="/" className="btn-primary">
          <ArrowLeft size={15} />
          Back to Feed
        </Link>
      </div>
    );
  }

  const isOwnProfile = user?.id === profile.id;
  const initials = profile.display_name?.slice(0, 2).toUpperCase() ?? '??';

  return (
    <div className="max-w-3xl mx-auto">
      <Link
        href="/"
        className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground mb-4 transition-colors w-fit"
      >
        <ArrowLeft size={15} />
        Back to feed
      </Link>

      {/* Profile header */}
      <div className="card overflow-hidden mb-5">
        <div className="h-20 sm:h-24 bg-gradient-to-r from-violet-400 via-fuchsia-400 to-amber-300" />
        <div className="px-4 sm:px-6 pb-5 -mt-10 sm:-mt-12">
          {/* Avatar + inline stats — Instagram-style on mobile so the
              stat triplet doesn't push the action button off-screen.
              At sm+ the action button moves back into a separate row. */}
          <div className="flex items-end gap-3 sm:gap-5">
            {profile.avatar_url ? (
              <AppImage
                src={profile.avatar_url}
                alt={profile.display_name}
                width={96}
                height={96}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-4 border-card shadow-sm shrink-0"
              />
            ) : (
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-primary/10 border-4 border-card flex items-center justify-center text-xl sm:text-2xl font-bold text-primary shadow-sm shrink-0">
                {initials}
              </div>
            )}

            {/* Inline 3-stat row beside the avatar */}
            <div className="flex-1 grid grid-cols-3 gap-1 sm:gap-3 pb-1 sm:pb-2 min-w-0">
              <CompactStat label="Posts" value={stats.post_count} />
              <CompactStat label="Followers" value={liveFollowerCount} />
              <CompactStat label="Following" value={profile.following_count ?? 0} />
            </div>
          </div>

          {/* Name + handle */}
          <div className="mt-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground break-words">{profile.display_name}</h1>
              {profile.is_verified && <BadgeCheck size={18} className="text-primary fill-primary/20 shrink-0" />}
            </div>
            <p className="text-sm text-muted-foreground truncate">@{profile.username}</p>

            {profile.headline && (
              <p className="text-sm font-semibold text-primary mt-2 break-words">{profile.headline}</p>
            )}

            {profile.bio && (
              <p className="text-sm text-foreground/90 mt-2 leading-relaxed whitespace-pre-wrap break-words">
                {profile.bio}
              </p>
            )}

            {profile.niche_tags && profile.niche_tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {profile.niche_tags.map((t) => (
                  <Link
                    key={t}
                    href={`/tag/${encodeURIComponent(t)}`}
                    className="text-xs font-semibold text-primary bg-secondary px-2.5 py-1 rounded-full hover:bg-primary/15 transition-colors"
                  >
                    #{t}
                  </Link>
                ))}
              </div>
            )}

            <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <Eye size={11} />
                {formatCount(stats.total_views)} views
              </span>
              <span className="flex items-center gap-1">
                <Calendar size={11} />
                Joined {joinedDate(profile.created_at)}
              </span>
            </div>

            {/* Action row — full width on mobile so it's thumb-friendly */}
            <div className="mt-4 pt-4 border-t border-border flex gap-2">
              {isOwnProfile ? (
                <Link href="/profile" className="btn-secondary flex-1 justify-center">
                  Edit Profile
                </Link>
              ) : (
                <div className="flex-1 [&>button]:w-full">
                  <FollowButton
                    targetUserId={profile.id}
                    targetDisplayName={profile.display_name}
                    variant="primary"
                    onFollowChange={(_, newCount) => setFollowerCount(newCount)}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Posts */}
      <h2 className="text-base font-bold text-foreground mb-3">
        Posts ({formatCount(stats.post_count)})
      </h2>

      {posts.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
            <FileText size={26} className="text-primary" />
          </div>
          <h3 className="text-base font-bold text-foreground mb-1">No posts yet</h3>
          <p className="text-sm text-muted-foreground">
            {isOwnProfile ? "You haven't published any posts yet." : `${profile.display_name} hasn't published anything yet.`}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/post/${post.id}`}
              className="card p-4 hover:shadow-md transition-shadow group"
            >
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                {post.is_trending && (
                  <span className="flex items-center gap-1 text-xs font-bold text-negative bg-negative-bg px-2 py-0.5 rounded-full">
                    <Flame size={10} />
                    Trending
                  </span>
                )}
                {post.is_ai_enhanced && (
                  <span className="flex items-center gap-1 text-xs font-bold text-primary bg-secondary px-2 py-0.5 rounded-full">
                    <Sparkles size={10} />
                    Viral
                  </span>
                )}
                <span className="text-xs text-muted-foreground ml-auto">{timeAgo(post.published_at)}</span>
              </div>

              {post.title && (
                <h3 className="text-base font-bold text-foreground mb-1 group-hover:text-primary transition-colors">
                  {post.title}
                </h3>
              )}
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
                {post.excerpt || post.content?.slice(0, 200)}
              </p>

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Heart size={12} />
                  <span className="font-mono tabular-nums">{formatCount(post.likes_count)}</span>
                </span>
                <span className="flex items-center gap-1">
                  <MessageCircle size={12} />
                  <span className="font-mono tabular-nums">{formatCount(post.comments_count)}</span>
                </span>
                <span className="flex items-center gap-1">
                  <Eye size={12} />
                  <span className="font-mono tabular-nums">{formatCount(post.views_count)}</span>
                </span>
                {post.points_earned > 0 && (
                  <span className="flex items-center gap-1 text-amber-600 font-semibold ml-auto">
                    <Zap size={12} className="fill-amber-500 text-amber-500" />
                    <span className="font-mono tabular-nums">{formatCount(post.points_earned)} pts</span>
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/* Inline compact stat (value above label) — sits beside the avatar so
   Posts / Followers / Following fit on one row even at 360px. */
function CompactStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center justify-center text-center min-w-0">
      <span className="text-base sm:text-lg font-extrabold text-foreground font-mono tabular-nums leading-tight truncate max-w-full">
        {formatCount(value)}
      </span>
      <span className="text-[11px] sm:text-xs text-muted-foreground leading-tight truncate max-w-full">
        {label}
      </span>
    </div>
  );
}

/* Skeleton shown while the profile loads — matches the final layout so
   content arriving doesn't shift the page (no CLS). */
function PublicProfileSkeleton() {
  return (
    <div className="max-w-3xl mx-auto">
      <Skeleton className="h-4 w-24 mb-4 rounded" />
      <div className="card overflow-hidden mb-5">
        <Skeleton className="h-20 sm:h-24 w-full" />
        <div className="px-4 sm:px-6 pb-5 -mt-10 sm:-mt-12">
          <div className="flex items-end gap-3 sm:gap-5">
            <Skeleton className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-card shrink-0" />
            <div className="flex-1 grid grid-cols-3 gap-1 sm:gap-3 pb-1 sm:pb-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <Skeleton className="h-5 w-10 rounded" />
                  <Skeleton className="h-3 w-14 rounded" />
                </div>
              ))}
            </div>
          </div>
          <div className="mt-3 flex flex-col gap-2">
            <Skeleton className="h-6 w-1/2 rounded" />
            <Skeleton className="h-4 w-1/3 rounded" />
            <Skeleton className="h-4 w-2/3 rounded mt-2" />
            <Skeleton className="h-4 w-3/4 rounded" />
          </div>
          <div className="mt-4 pt-4 border-t border-border">
            <Skeleton className="h-9 w-full rounded-xl" />
          </div>
        </div>
      </div>
      <Skeleton className="h-5 w-28 rounded mb-3" />
      <div className="flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-28 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

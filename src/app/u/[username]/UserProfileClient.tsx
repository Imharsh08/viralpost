'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, BadgeCheck, Calendar, Eye, Heart, MessageCircle, Loader2,
  Zap, Sparkles, Flame, FileText, Users,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import AppImage from '@/components/ui/AppImage';
import FollowButton from '@/app/components/FollowButton';
import { useUserRealtime } from '@/lib/hooks/useUserRealtime';

interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
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
    return (
      <div className="max-w-3xl mx-auto py-16 flex justify-center">
        <Loader2 size={28} className="animate-spin text-muted-foreground" />
      </div>
    );
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
        <div className="h-24 bg-gradient-to-r from-violet-400 via-fuchsia-400 to-amber-300" />
        <div className="px-5 sm:px-6 pb-5 -mt-12">
          <div className="flex items-end justify-between flex-wrap gap-3">
            {profile.avatar_url ? (
              <AppImage
                src={profile.avatar_url}
                alt={profile.display_name}
                width={96}
                height={96}
                className="w-24 h-24 rounded-full object-cover border-4 border-card shadow-sm"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-primary/10 border-4 border-card flex items-center justify-center text-2xl font-bold text-primary shadow-sm">
                {initials}
              </div>
            )}

            <div className="flex items-center gap-2 mb-1">
              {isOwnProfile ? (
                <Link href="/profile" className="btn-secondary">
                  Edit Profile
                </Link>
              ) : (
                <FollowButton
                  targetUserId={profile.id}
                  targetDisplayName={profile.display_name}
                  variant="primary"
                  onFollowChange={(_, newCount) => setFollowerCount(newCount)}
                />
              )}
            </div>
          </div>

          <div className="mt-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h1 className="text-2xl font-bold text-foreground">{profile.display_name}</h1>
              {profile.is_verified && <BadgeCheck size={18} className="text-primary fill-primary/20" />}
            </div>
            <p className="text-sm text-muted-foreground">@{profile.username}</p>

            {profile.bio && (
              <p className="text-sm text-foreground/90 mt-3 leading-relaxed whitespace-pre-wrap">
                {profile.bio}
              </p>
            )}

            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <Calendar size={12} />
                Member since {joinedDate(profile.created_at)}
              </span>
            </div>

            {/* Stat row */}
            <div className="flex gap-6 mt-4 pt-4 border-t border-border">
              <StatPill label="Posts" value={stats.post_count} icon={FileText} />
              <StatPill label="Followers" value={liveFollowerCount} icon={Users} />
              <StatPill label="Following" value={profile.following_count ?? 0} icon={Users} />
              <StatPill label="Views" value={stats.total_views} icon={Eye} />
            </div>
          </div>
        </div>
      </div>

      {/* Posts */}
      <h2 className="text-base font-bold text-foreground mb-3">
        Posts ({stats.post_count.toLocaleString()})
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
                  <span className="font-mono tabular-nums">{post.likes_count.toLocaleString()}</span>
                </span>
                <span className="flex items-center gap-1">
                  <MessageCircle size={12} />
                  <span className="font-mono tabular-nums">{post.comments_count.toLocaleString()}</span>
                </span>
                <span className="flex items-center gap-1">
                  <Eye size={12} />
                  <span className="font-mono tabular-nums">{post.views_count.toLocaleString()}</span>
                </span>
                {post.points_earned > 0 && (
                  <span className="flex items-center gap-1 text-amber-600 font-semibold ml-auto">
                    <Zap size={12} className="fill-amber-500 text-amber-500" />
                    <span className="font-mono tabular-nums">{post.points_earned.toLocaleString()} pts</span>
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

function StatPill({ label, value, icon: Icon }: { label: string; value: number; icon: any }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-muted-foreground flex items-center gap-1">
        <Icon size={11} />
        {label}
      </span>
      <span className="text-sm font-bold text-foreground font-mono tabular-nums">
        {value.toLocaleString()}
      </span>
    </div>
  );
}

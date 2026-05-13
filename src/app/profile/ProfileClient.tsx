'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  User, FileText, BarChart2, Eye, Heart, Zap, Users, Edit3,
  PenSquare, Sparkles, TrendingUp, Trash2, Loader2, CheckCircle2,
  AlertCircle, Globe, Lock, Calendar,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import AppImage from '@/components/ui/AppImage';
import { toast } from 'sonner';

type Tab = 'posts' | 'drafts' | 'about';

interface Post {
  id: string;
  title: string;
  excerpt: string;
  tags: string[];
  likes_count: number;
  comments_count: number;
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

export default function ProfileClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, session } = useAuth();

  const [tab, setTab] = useState<Tab>((searchParams.get('tab') as Tab) ?? 'posts');
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [drafts, setDrafts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({ display_name: '', bio: '' });

  const authHeader = session ? `Bearer ${session.access_token}` : '';

  useEffect(() => {
    if (!user && !loading) {
      router.push('/sign-up-login-screen');
    }
  }, [user, loading]);

  // Load profile + stats
  useEffect(() => {
    if (!session) return;
    setLoading(true);
    fetch('/api/user/profile', { headers: { Authorization: authHeader } })
      .then((r) => r.json())
      .then(({ profile, stats }) => {
        setProfile(profile);
        setStats(stats);
        setEditForm({ display_name: profile?.display_name ?? '', bio: profile?.bio ?? '' });
      })
      .catch(() => toast.error('Failed to load profile'))
      .finally(() => setLoading(false));
  }, [session]);

  // Load posts / drafts when tab changes
  useEffect(() => {
    if (!session) return;
    setPostsLoading(true);
    const filter = tab === 'drafts' ? 'drafts' : 'published';
    if (tab === 'about') { setPostsLoading(false); return; }
    fetch(`/api/user/posts?filter=${filter}`, { headers: { Authorization: authHeader } })
      .then((r) => r.json())
      .then(({ posts: data }) => {
        if (tab === 'drafts') setDrafts(data ?? []);
        else setPosts(data ?? []);
      })
      .catch(() => {})
      .finally(() => setPostsLoading(false));
  }, [tab, session]);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: authHeader },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setProfile(data.profile);
      setEditMode(false);
      toast.success('Profile updated');
    } catch (e: any) {
      toast.error(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Delete this post? This cannot be undone.')) return;
    try {
      const res = await fetch('/api/user/posts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: authHeader },
        body: JSON.stringify({ id: postId }),
      });
      if (!res.ok) throw new Error();
      setPosts((p) => p.filter((x) => x.id !== postId));
      setDrafts((p) => p.filter((x) => x.id !== postId));
      toast.success('Post deleted');
    } catch {
      toast.error('Failed to delete post');
    }
  };

  if (loading) return <ProfileSkeleton />;

  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'You';
  const username = profile?.username || '';
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url || '';
  const initials = displayName.slice(0, 2).toUpperCase();
  const joinedDate = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : '';

  const tabItems: { id: Tab; label: string; icon: any; count?: number }[] = [
    { id: 'posts', label: 'Posts', icon: Globe, count: stats?.totalPublished },
    { id: 'drafts', label: 'Drafts', icon: Lock, count: stats?.totalDrafts },
    { id: 'about', label: 'About', icon: User },
  ];

  return (
    <div className="max-w-3xl mx-auto">
      {/* Profile header card */}
      <div className="card p-6 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="relative shrink-0">
              {avatarUrl ? (
                <AppImage src={avatarUrl} alt={displayName} width={80} height={80}
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-border" />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-2xl font-extrabold text-primary">
                  {initials}
                </div>
              )}
              {profile?.is_verified && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center border-2 border-card">
                  <Sparkles size={11} className="text-white" />
                </div>
              )}
            </div>

            {/* Name / username / bio */}
            <div>
              {editMode ? (
                <div className="flex flex-col gap-2">
                  <input
                    value={editForm.display_name}
                    onChange={(e) => setEditForm((f) => ({ ...f, display_name: e.target.value }))}
                    placeholder="Display name"
                    className="input-field text-lg font-bold py-1.5 h-auto w-64"
                    maxLength={50}
                  />
                  <textarea
                    value={editForm.bio}
                    onChange={(e) => setEditForm((f) => ({ ...f, bio: e.target.value }))}
                    placeholder="Tell people about yourself..."
                    className="input-field text-sm py-1.5 h-auto resize-none w-64"
                    rows={2}
                    maxLength={200}
                  />
                </div>
              ) : (
                <>
                  <h1 className="text-xl font-extrabold text-foreground">{displayName}</h1>
                  {username && <p className="text-sm text-muted-foreground">@{username}</p>}
                  {profile?.bio && (
                    <p className="text-sm text-foreground/80 mt-1 max-w-sm">{profile.bio}</p>
                  )}
                  {joinedDate && (
                    <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
                      <Calendar size={11} />
                      Joined {joinedDate}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Edit / Save buttons */}
          <div className="flex items-center gap-2">
            {editMode ? (
              <>
                <button onClick={() => setEditMode(false)} className="btn-ghost text-sm px-4 py-2">
                  Cancel
                </button>
                <button onClick={handleSaveProfile} disabled={saving} className="btn-primary text-sm px-4 py-2">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  Save
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setEditMode(true)} className="btn-ghost text-sm px-4 py-2">
                  <Edit3 size={14} />
                  Edit Profile
                </button>
                <Link href="/analytics" className="btn-secondary text-sm px-4 py-2">
                  <BarChart2 size={14} />
                  Analytics
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6 pt-5 border-t border-border">
          <StatPill icon={Globe} label="Published" value={stats?.totalPublished ?? 0} color="text-primary" />
          <StatPill icon={Eye} label="Total Views" value={stats?.totalViews ?? 0} color="text-primary" />
          <StatPill icon={Heart} label="Total Likes" value={stats?.totalLikes ?? 0} color="text-negative" />
          <StatPill icon={Users} label="Followers" value={profile?.follower_count ?? 0} color="text-positive" />
          <StatPill icon={Zap} label="Points Earned" value={stats?.totalPoints ?? 0} color="text-amber-500" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-xl mb-5 w-fit">
        {tabItems.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
              tab === t.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <t.icon size={14} />
            {t.label}
            {t.count !== undefined && (
              <span className={`text-xs font-mono px-1.5 py-0.5 rounded-full ${
                tab === t.id ? 'bg-primary/10 text-primary' : 'bg-border text-muted-foreground'
              }`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'posts' && (
        <PostList
          posts={posts}
          loading={postsLoading}
          emptyIcon={<Globe size={28} className="text-primary" />}
          emptyTitle="No published posts yet"
          emptyDesc="Write and publish your first post to see it here."
          emptyAction={<Link href="/write-editor-page" className="btn-primary"><PenSquare size={15} />Write a Post</Link>}
          onDelete={handleDeletePost}
        />
      )}

      {tab === 'drafts' && (
        <PostList
          posts={drafts}
          loading={postsLoading}
          emptyIcon={<Lock size={28} className="text-muted-foreground" />}
          emptyTitle="No drafts saved"
          emptyDesc="Start writing and save a draft to continue later."
          emptyAction={<Link href="/write-editor-page" className="btn-primary"><PenSquare size={15} />Start Writing</Link>}
          onDelete={handleDeletePost}
          isDraft
        />
      )}

      {tab === 'about' && (
        <div className="card p-6 flex flex-col gap-4">
          <AboutRow label="Display Name" value={profile?.display_name} />
          <AboutRow label="Username" value={username ? `@${username}` : undefined} />
          <AboutRow label="Email" value={profile?.email} />
          <AboutRow label="Bio" value={profile?.bio} />
          <AboutRow label="Member Since" value={joinedDate} />
          <AboutRow label="Followers" value={profile?.follower_count?.toLocaleString()} />
          <AboutRow label="Following" value={profile?.following_count?.toLocaleString()} />
        </div>
      )}
    </div>
  );
}

/* ── Sub-components ── */

function StatPill({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <div className="flex flex-col items-center gap-1 py-2">
      <Icon size={16} className={color} />
      <span className="text-lg font-extrabold text-foreground font-mono tabular-nums">
        {value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value.toLocaleString()}
      </span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

function AboutRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-4">
      <span className="text-sm font-semibold text-muted-foreground w-32 shrink-0">{label}</span>
      <span className="text-sm text-foreground">{value}</span>
    </div>
  );
}

function PostList({
  posts, loading, emptyIcon, emptyTitle, emptyDesc, emptyAction, onDelete, isDraft = false,
}: {
  posts: Post[];
  loading: boolean;
  emptyIcon: React.ReactNode;
  emptyTitle: string;
  emptyDesc: string;
  emptyAction: React.ReactNode;
  onDelete: (id: string) => void;
  isDraft?: boolean;
}) {
  if (loading) return (
    <div className="flex flex-col gap-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="card p-4 animate-pulse">
          <div className="h-4 bg-muted rounded w-3/4 mb-2" />
          <div className="h-3 bg-muted rounded w-full mb-1" />
          <div className="h-3 bg-muted rounded w-2/3" />
        </div>
      ))}
    </div>
  );

  if (!posts.length) return (
    <div className="card p-10 flex flex-col items-center text-center gap-3">
      <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-1">{emptyIcon}</div>
      <h3 className="text-base font-bold text-foreground">{emptyTitle}</h3>
      <p className="text-sm text-muted-foreground max-w-xs">{emptyDesc}</p>
      {emptyAction}
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      {posts.map((post) => (
        <div key={post.id} className="card p-4 hover:shadow-card-hover transition-all duration-200 group">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              {/* Badges */}
              <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                {post.is_ai_enhanced && (
                  <span className="badge-ai"><Sparkles size={9} />AI Enhanced</span>
                )}
                {post.is_trending && (
                  <span className="badge-trending"><TrendingUp size={9} />Trending</span>
                )}
                {isDraft && (
                  <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    <Lock size={9} />Draft
                  </span>
                )}
              </div>

              <h3 className="text-sm font-bold text-foreground leading-snug line-clamp-1 mb-1">
                {post.title || '(Untitled post)'}
              </h3>
              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{post.excerpt}</p>

              {/* Tags */}
              {post.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {post.tags.slice(0, 4).map((tag) => (
                    <span key={tag} className="badge-tag text-xs">#{tag.replace(/^#+/, '')}</span>
                  ))}
                </div>
              )}

              {/* Micro stats */}
              <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Eye size={11} />{(post.views_count ?? 0).toLocaleString()}</span>
                <span className="flex items-center gap-1"><Heart size={11} />{(post.likes_count ?? 0).toLocaleString()}</span>
                <span className="flex items-center gap-1 text-amber-600 font-semibold">
                  <Zap size={11} className="fill-amber-400" />+{post.points_earned ?? 0}
                </span>
                <span className="ml-auto text-xs">
                  {post.published_at
                    ? new Date(post.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : `Draft · ${new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <Link
                href="/write-editor-page"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-secondary transition-colors"
                title="Edit post"
              >
                <Edit3 size={14} />
              </Link>
              <button
                onClick={() => onDelete(post.id)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-negative hover:bg-negative-bg transition-colors"
                title="Delete post"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="max-w-3xl mx-auto animate-pulse">
      <div className="card p-6 mb-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-20 h-20 rounded-2xl bg-muted shrink-0" />
          <div className="flex-1">
            <div className="h-5 bg-muted rounded w-40 mb-2" />
            <div className="h-3 bg-muted rounded w-24 mb-2" />
            <div className="h-3 bg-muted rounded w-64" />
          </div>
        </div>
        <div className="grid grid-cols-5 gap-3 pt-5 border-t border-border">
          {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-16 bg-muted rounded-xl" />)}
        </div>
      </div>
    </div>
  );
}

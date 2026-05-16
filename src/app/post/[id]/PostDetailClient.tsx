'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Heart, MessageCircle, Share2, Eye, Zap, Sparkles, ArrowLeft, Loader2, BadgeCheck, Flame,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import AppImage from '@/components/ui/AppImage';
import CommentSection from '@/app/components/CommentSection';
import FollowButton from '@/app/components/FollowButton';
import { usePostRealtime } from '@/lib/hooks/usePostRealtime';

interface PostDetail {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  tags: string[];
  likes_count: number;
  comments_count: number;
  shares_count: number;
  views_count: number;
  points_earned: number;
  is_trending: boolean;
  is_ai_enhanced: boolean;
  featured_image_url: string | null;
  published_at: string;
  users: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string;
    is_verified: boolean;
    bio: string | null;
    follower_count: number;
  };
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function PostDetailClient({ postId }: { postId: string }) {
  const router = useRouter();
  const { user, session } = useAuth();
  const [post, setPost] = useState<PostDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [commentsOpen, setCommentsOpen] = useState(true);
  const [liking, setLiking] = useState(false);

  const rt = usePostRealtime(
    post?.id ?? '',
    {
      likes_count: post?.likes_count ?? 0,
      comments_count: post?.comments_count ?? 0,
      views_count: post?.views_count ?? 0,
    },
    !post,
  );

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/posts/${postId}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error || !data.post) {
          setNotFound(true);
        } else {
          setPost(data.post);
          setLikeCount(data.post.likes_count ?? 0);
          setCommentCount(data.post.comments_count ?? 0);
        }
      })
      .catch(() => !cancelled && setNotFound(true))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [postId]);

  // Track view (fire-and-forget)
  useEffect(() => {
    if (!post) return;
    fetch(`/api/posts/${post.id}/view`, { method: 'POST' }).catch(() => {});
  }, [post?.id]);

  // Sync realtime likes/comments
  useEffect(() => {
    if (!liking) setLikeCount(rt.likes_count);
  }, [rt.likes_count, liking]);

  // Check liked status
  useEffect(() => {
    if (!post || !session) return;
    fetch(`/api/posts/${post.id}/like`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then((r) => r.json())
      .then((data) => setIsLiked(!!data.is_liked))
      .catch(() => {});
  }, [post?.id, session]);

  const handleLike = async () => {
    if (!session) {
      toast.error('Sign in to like posts');
      return;
    }
    if (!post) return;
    setLiking(true);
    const willLike = !isLiked;
    setIsLiked(willLike);
    setLikeCount((n) => n + (willLike ? 1 : -1));
    try {
      const res = await fetch(`/api/posts/${post.id}/like`, {
        method: willLike ? 'POST' : 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error();
    } catch {
      setIsLiked(!willLike);
      setLikeCount((n) => n + (willLike ? -1 : 1));
      toast.error('Failed to update like');
    } finally {
      setLiking(false);
    }
  };

  const handleShare = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    if (navigator.share) {
      try {
        await navigator.share({ title: post?.title || 'ViralPost', url });
        return;
      } catch {
        // fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard');
    } catch {
      toast.error('Could not copy link');
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-12 flex justify-center">
        <Loader2 size={28} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <h1 className="text-2xl font-bold text-foreground mb-2">Post not found</h1>
        <p className="text-sm text-muted-foreground mb-5">
          This post may have been deleted or never published.
        </p>
        <Link href="/" className="btn-primary">
          <ArrowLeft size={15} />
          Back to Feed
        </Link>
      </div>
    );
  }

  const author = post.users;
  const initials = author.display_name?.slice(0, 2).toUpperCase() || '??';

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back link */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground mb-4 transition-colors"
      >
        <ArrowLeft size={15} />
        Back
      </button>

      <article className="card overflow-hidden">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-border">
          <div className="flex items-start gap-3 mb-4">
            <Link href={`/u/${author.username}`} className="shrink-0">
              {author.avatar_url ? (
                <AppImage
                  src={author.avatar_url}
                  alt={author.display_name}
                  width={48}
                  height={48}
                  className="w-12 h-12 rounded-full object-cover border border-border"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                  {initials}
                </div>
              )}
            </Link>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Link href={`/u/${author.username}`} className="font-bold text-foreground hover:text-primary transition-colors">
                  {author.display_name}
                </Link>
                {author.is_verified && <BadgeCheck size={15} className="text-primary fill-primary/20" />}
              </div>
              <p className="text-xs text-muted-foreground">
                @{author.username} · {timeAgo(post.published_at)}
              </p>
            </div>
            {user?.id !== author.id && (
              <FollowButton
                targetUserId={author.id}
                targetDisplayName={author.display_name}
                variant="compact"
              />
            )}
          </div>

          {/* Badges */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
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
            {post.points_earned > 0 && (
              <span className="flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                <Zap size={10} className="fill-amber-500 text-amber-500" />
                {post.points_earned} pts earned
              </span>
            )}
          </div>

          {/* Title */}
          {post.title && (
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground leading-tight mb-2">
              {post.title}
            </h1>
          )}
        </div>

        {/* Cover image */}
        {post.featured_image_url && (
          <div className="w-full max-h-[420px] overflow-hidden bg-muted">
            <AppImage
              src={post.featured_image_url}
              alt={post.title || 'Post cover image'}
              width={1200}
              height={630}
              className="w-full max-h-[420px] object-cover"
            />
          </div>
        )}

        {/* Body */}
        <div className="p-5 sm:p-6">
          <div className="text-base text-foreground leading-relaxed whitespace-pre-wrap break-words">
            {post.content}
          </div>

          {/* Tags */}
          {post.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-5">
              {post.tags.map((tag) => {
                const clean = tag.startsWith('#') ? tag.slice(1) : tag;
                return (
                  <Link
                    key={`tag-${tag}`}
                    href={`/tag/${encodeURIComponent(clean)}`}
                    className="text-xs font-semibold text-primary bg-secondary hover:bg-primary/15 transition-colors px-3 py-1 rounded-full"
                  >
                    #{clean}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Engagement bar */}
        <div className="px-5 sm:px-6 py-3 border-t border-border bg-muted/30">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1">
              <button
                onClick={handleLike}
                disabled={liking}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all duration-150 active:scale-95 ${
                  isLiked
                    ? 'text-negative bg-negative-bg'
                    : 'text-muted-foreground hover:text-negative hover:bg-negative-bg'
                }`}
              >
                <Heart size={16} className={isLiked ? 'fill-negative' : ''} />
                <span className="font-mono tabular-nums">{likeCount.toLocaleString()}</span>
              </button>

              <CommentSection
                postId={post.id}
                commentCount={commentCount}
                onCountChange={setCommentCount}
                open={commentsOpen}
                onToggle={() => setCommentsOpen((o) => !o)}
                renderPanelOnly={false}
              />

              <button
                onClick={handleShare}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-muted-foreground hover:text-primary hover:bg-secondary transition-all duration-150 active:scale-95"
              >
                <Share2 size={16} />
                Share
              </button>
            </div>

            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Eye size={13} />
              <span className="font-mono tabular-nums">{rt.views_count.toLocaleString()}</span>
              <span>views</span>
            </div>
          </div>

          {/* Comments panel */}
          <CommentSection
            postId={post.id}
            commentCount={commentCount}
            onCountChange={setCommentCount}
            open={commentsOpen}
            onToggle={() => setCommentsOpen((o) => !o)}
            renderPanelOnly
          />
        </div>
      </article>

      {/* Author footer card */}
      <div className="card p-5 mt-4 bg-gradient-to-br from-violet-50/40 to-purple-50/40 border-purple-100">
        <div className="flex items-start gap-3">
          <Link href={`/u/${author.username}`} className="shrink-0">
            {author.avatar_url ? (
              <AppImage
                src={author.avatar_url}
                alt={author.display_name}
                width={56}
                height={56}
                className="w-14 h-14 rounded-full object-cover border-2 border-card"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-primary/10 border-2 border-card flex items-center justify-center text-base font-bold text-primary">
                {initials}
              </div>
            )}
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <Link href={`/u/${author.username}`} className="font-bold text-foreground hover:text-primary transition-colors">
                {author.display_name}
              </Link>
              {author.is_verified && <BadgeCheck size={14} className="text-primary fill-primary/20" />}
            </div>
            <p className="text-xs text-muted-foreground mb-1">
              @{author.username} · {(author.follower_count ?? 0).toLocaleString()} followers
            </p>
            {author.bio && <p className="text-sm text-muted-foreground leading-relaxed">{author.bio}</p>}
          </div>
          {user?.id !== author.id && (
            <FollowButton
              targetUserId={author.id}
              targetDisplayName={author.display_name}
              variant="primary"
            />
          )}
        </div>
      </div>
    </div>
  );
}

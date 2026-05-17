'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Heart, Share2, Zap, TrendingUp, Sparkles, Bookmark, Eye } from 'lucide-react';
import PostMenu from './PostMenu';
import AppImage from '@/components/ui/AppImage';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { MockPost } from '@/lib/mockData';
import CommentSection from './CommentSection';
import FollowButton from './FollowButton';
import { usePostRealtime } from '@/lib/hooks/usePostRealtime';
import { formatCount } from '@/lib/formatCount';

interface PostCardProps {
  post: MockPost;
}

function formatPostDate(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(date.getFullYear() !== now.getFullYear() && { year: 'numeric' }),
  });
}

const MOCK_IDS = new Set([
  'post-001','post-002','post-003','post-004','post-005',
  'post-006','post-007','post-008','post-009','post-010',
]);

export default function PostCard({ post }: PostCardProps) {
  const { session } = useAuth();
  const [liked, setLiked] = useState(post.isLiked);
  const [commentCount, setCommentCount] = useState(post.comments);
  const [bookmarked, setBookmarked] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const viewFired = useRef(false);
  const mutatingRef = useRef(false);
  const isMock = MOCK_IDS.has(post.id);

  const rtCounts = usePostRealtime(
    post.id,
    { likes_count: post.likes, comments_count: post.comments, views_count: post.views },
    isMock
  );

  const [likeCount, setLikeCount] = useState(post.likes);
  const viewCount = rtCounts.views_count;

  // Sync realtime likes only when no mutation is in flight
  useEffect(() => {
    if (!mutatingRef.current) setLikeCount(rtCounts.likes_count);
  }, [rtCounts.likes_count]);

  // Sync the heart's filled state when the parent updates post.isLiked
  // (e.g. after the feed's bulk-like lookup resolves). Skip during a
  // local mutation so optimistic state isn't overwritten.
  useEffect(() => {
    if (!mutatingRef.current) setLiked(post.isLiked);
  }, [post.isLiked]);

  useEffect(() => {
    if (isMock || viewFired.current) return;
    viewFired.current = true;
    fetch(`/api/posts/${post.id}/view`, { method: 'POST' }).catch(() => {});
  }, [post.id, isMock]);

  const handleLike = async () => {
    if (isMock) { setLiked(!liked); setLikeCount(liked ? likeCount - 1 : likeCount + 1); return; }
    if (!session) { toast.error('Sign in to like posts'); return; }
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount(wasLiked ? likeCount - 1 : likeCount + 1);
    mutatingRef.current = true;
    try {
      const res = await fetch(`/api/posts/${post.id}/like`, {
        method: wasLiked ? 'DELETE' : 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLikeCount(data.likes_count);
      }
    } catch {
      setLiked(wasLiked);
      setLikeCount(wasLiked ? likeCount + 1 : likeCount - 1);
    } finally {
      mutatingRef.current = false;
    }
  };

  // Native share with clipboard fallback. Opens the OS share sheet on
  // mobile (WhatsApp, Messages, IG, etc.); on desktop where the Web
  // Share API is unsupported or refused, copies the URL to clipboard.
  const handleShare = async () => {
    const url = `${window.location.origin}/post/${post.id}`;
    const shareData = {
      title: post.title || `${post.author.displayName} on ViralPost`,
      text: post.excerpt?.slice(0, 120) ?? '',
      url,
    };

    if (typeof navigator !== 'undefined' && (navigator as any).canShare?.(shareData)) {
      try {
        await (navigator as any).share(shareData);
        return; // user completed or cancelled — either way we're done
      } catch (err: any) {
        // AbortError = user dismissed the sheet. Anything else falls
        // through to the clipboard path.
        if (err?.name === 'AbortError') return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied');
    } catch {
      toast.error('Could not share — try copying the URL manually');
    }
  };

  return (
    <article className="card p-3 sm:p-5 hover:shadow-card-hover transition-all duration-200 group animate-fade-in overflow-hidden">
      {/* Author row. min-w-0 on flex children lets long names truncate
          instead of pushing the layout sideways on phones. */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <Link href={isMock ? '#' : `/u/${post.author.username}`} className="relative shrink-0">
            <AppImage
              src={post.author.avatarUrl}
              alt={`${post.author.displayName} profile photo`}
              width={40} height={40}
              className="w-10 h-10 rounded-full object-cover border-2 border-border"
            />
            {post.author.isVerified && (
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-primary rounded-full flex items-center justify-center border border-card">
                <Sparkles size={8} className="text-white" />
              </div>
            )}
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Link
                href={isMock ? '#' : `/u/${post.author.username}`}
                className="text-sm font-bold text-foreground hover:text-primary transition-colors truncate max-w-full"
              >
                {post.author.displayName}
              </Link>
              {/* Badges shrink to icon-only on mobile so the author row
                  stays single-line. Full label returns at sm+ widths. */}
              {post.isTrending && (
                <span className="badge-trending" title="Trending">
                  <TrendingUp size={9} />
                  <span className="hidden sm:inline">Trending</span>
                </span>
              )}
              {post.isAiEnhanced && (
                <span className="badge-ai" title="AI Enhanced">
                  <Sparkles size={9} />
                  <span className="hidden sm:inline">AI Enhanced</span>
                </span>
              )}
              {!isMock && post.author.id && (
                <FollowButton
                  targetUserId={post.author.id}
                  targetDisplayName={post.author.displayName}
                  variant="compact"
                />
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5 min-w-0">
              <span className="text-xs text-muted-foreground truncate">@{post.author.username}</span>
              <span className="text-xs text-muted-foreground shrink-0">·</span>
              <span className="text-xs text-muted-foreground shrink-0">{formatPostDate(post.publishedAt)}</span>
            </div>
          </div>
        </div>
        {!isMock && (
          <div className="shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            <PostMenu
              postId={post.id}
              isOwn={!!session?.user && session.user.id === post.author.id}
              authToken={session?.access_token ?? null}
            />
          </div>
        )}
      </div>

      {/* Cover image */}
      {post.coverImageUrl && (
        <Link
          href={isMock ? '#' : `/post/${post.id}`}
          className="block mb-3 rounded-xl overflow-hidden border border-border"
        >
          <AppImage
            src={post.coverImageUrl}
            alt={post.title || 'Post cover image'}
            width={1200}
            height={630}
            className="w-full max-h-72 object-cover"
          />
        </Link>
      )}

      {/* Content. For reshares with no commentary (empty excerpt), we
          skip this block entirely and let the embedded original card
          carry the post — like a clean retweet. */}
      {(post.excerpt?.trim() || post.title) && (
        <Link href={isMock ? '#' : `/post/${post.id}`} className="block mb-3 group/content">
          {post.title && (
            <h2 className="text-base font-bold text-foreground mb-1.5 leading-snug group-hover/content:text-primary transition-colors break-words">
              {post.title}
            </h2>
          )}
          {post.excerpt && (
            <p className="text-sm text-foreground/80 leading-relaxed line-clamp-3 break-words">{post.excerpt}</p>
          )}
        </Link>
      )}

      {/* Reshare embed — the quoted original lives inside its own
          mini-card with reduced padding + a left accent stripe so it
          reads as "this is someone else's content." */}
      {post.parentPost && (
        <Link
          href={`/post/${post.parentPost.id}`}
          className="block mb-3 rounded-xl border border-border bg-muted/30 hover:bg-muted/50 transition-colors p-3 group/quote"
        >
          <div className="flex items-center gap-2 mb-1.5 min-w-0">
            {post.parentPost.author.avatarUrl ? (
              <AppImage
                src={post.parentPost.author.avatarUrl}
                alt={post.parentPost.author.displayName}
                width={20}
                height={20}
                className="w-5 h-5 rounded-full object-cover border border-border shrink-0"
              />
            ) : (
              <div className="w-5 h-5 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[8px] font-bold text-primary shrink-0">
                {post.parentPost.author.displayName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <span className="text-xs font-bold text-foreground truncate">{post.parentPost.author.displayName}</span>
            <span className="text-xs text-muted-foreground shrink-0">@{post.parentPost.author.username}</span>
          </div>
          {post.parentPost.title && (
            <h3 className="text-sm font-bold text-foreground line-clamp-1 mb-0.5 break-words group-hover/quote:text-primary transition-colors">
              {post.parentPost.title}
            </h3>
          )}
          {post.parentPost.excerpt && (
            <p className="text-xs text-muted-foreground line-clamp-2 break-words">{post.parentPost.excerpt}</p>
          )}
          {post.parentPost.coverImageUrl && (
            <div className="mt-2 rounded-lg overflow-hidden border border-border max-h-40">
              <AppImage
                src={post.parentPost.coverImageUrl}
                alt={post.parentPost.title || 'Quoted post cover'}
                width={800}
                height={420}
                className="w-full object-cover max-h-40"
              />
            </div>
          )}
        </Link>
      )}

      {/* Tags */}
      {post.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {post.tags.map((tag) => {
            const clean = tag.replace(/^#+/, '');
            return (
              <Link
                key={`${post.id}-tag-${tag}`}
                href={`/tag/${encodeURIComponent(clean)}`}
                className="badge-tag text-xs hover:bg-primary/15 transition-colors max-w-full truncate"
              >
                #{clean}
              </Link>
            );
          })}
        </div>
      )}

      {/* Engagement row */}
      <div className="pt-3 border-t border-border">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {/* Left actions */}
          <div className="flex items-center gap-0.5 sm:gap-1 flex-wrap">
            {/* Like */}
            <button
              onClick={handleLike}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 active:scale-95 ${
                liked ? 'text-negative bg-negative-bg hover:bg-red-100' : 'text-muted-foreground hover:text-negative hover:bg-negative-bg'
              }`}
            >
              <Heart size={14} className={liked ? 'fill-negative text-negative' : ''} />
              <span className="font-mono tabular-nums">{formatCount(likeCount)}</span>
            </button>

            {/* Comment toggle */}
            <CommentSection
              postId={post.id}
              commentCount={commentCount}
              onCountChange={setCommentCount}
              open={commentsOpen}
              onToggle={() => setCommentsOpen((v) => !v)}
              renderPanelOnly={false}
            />

            {/* Share — opens the native device share sheet on mobile;
                falls back to copying the URL on desktop / unsupported
                browsers. No more useless "Share on X / LinkedIn" stubs. */}
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-positive hover:bg-positive-bg transition-all duration-150 active:scale-95"
              aria-label="Share post"
            >
              <Share2 size={14} />
              <span className="font-mono tabular-nums">{formatCount(post.shares)}</span>
            </button>
          </div>

          {/* Right stats */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Eye size={12} />
              <span className="font-mono tabular-nums">{formatCount(viewCount)}</span>
            </div>
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-50 border border-amber-100">
              <Zap size={10} className="text-amber-500 fill-amber-400" />
              <span className="text-xs font-bold text-amber-700 font-mono tabular-nums">+{post.pointsEarned}</span>
            </div>
            <button
              onClick={() => setBookmarked(!bookmarked)}
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150 active:scale-95 ${
                bookmarked ? 'text-primary bg-secondary' : 'text-muted-foreground hover:text-primary hover:bg-secondary'
              }`}
            >
              <Bookmark size={13} className={bookmarked ? 'fill-primary' : ''} />
            </button>
          </div>
        </div>

        {/* Comment panel below engagement row */}
        <CommentSection
          postId={post.id}
          commentCount={commentCount}
          onCountChange={setCommentCount}
          open={commentsOpen}
          onToggle={() => setCommentsOpen((v) => !v)}
          renderPanelOnly
        />
      </div>
    </article>
  );
}

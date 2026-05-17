'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Heart, Share2, Zap, TrendingUp, Sparkles, MoreHorizontal, Bookmark, Eye } from 'lucide-react';
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
  const [showShareMenu, setShowShareMenu] = useState(false);
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

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`).catch(() => {});
    toast.success('Link copied!');
    setShowShareMenu(false);
  };

  return (
    <article className="card p-5 hover:shadow-card-hover transition-all duration-200 group animate-fade-in">
      {/* Author row */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
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
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Link
                href={isMock ? '#' : `/u/${post.author.username}`}
                className="text-sm font-bold text-foreground hover:text-primary transition-colors"
              >
                {post.author.displayName}
              </Link>
              {post.isTrending && <span className="badge-trending"><TrendingUp size={9} />Trending</span>}
              {post.isAiEnhanced && <span className="badge-ai"><Sparkles size={9} />AI Enhanced</span>}
              {!isMock && post.author.id && (
                <FollowButton
                  targetUserId={post.author.id}
                  targetDisplayName={post.author.displayName}
                  variant="compact"
                />
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-muted-foreground">@{post.author.username}</span>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">{formatPostDate(post.publishedAt)}</span>
            </div>
          </div>
        </div>
        <button className="btn-ghost w-8 h-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <MoreHorizontal size={16} />
        </button>
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

      {/* Content */}
      <Link href={isMock ? '#' : `/post/${post.id}`} className="block mb-3 group/content">
        {post.title && (
          <h2 className="text-base font-bold text-foreground mb-1.5 leading-snug group-hover/content:text-primary transition-colors">
            {post.title}
          </h2>
        )}
        <p className="text-sm text-foreground/80 leading-relaxed line-clamp-3">{post.excerpt}</p>
      </Link>

      {/* Tags */}
      {post.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {post.tags.map((tag) => {
            const clean = tag.replace(/^#+/, '');
            return (
              <Link
                key={`${post.id}-tag-${tag}`}
                href={`/tag/${encodeURIComponent(clean)}`}
                className="badge-tag text-xs hover:bg-primary/15 transition-colors"
              >
                #{clean}
              </Link>
            );
          })}
        </div>
      )}

      {/* Engagement row */}
      <div className="pt-3 border-t border-border">
        <div className="flex items-center justify-between">
          {/* Left actions */}
          <div className="flex items-center gap-1">
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

            {/* Share */}
            <div className="relative">
              <button
                onClick={() => setShowShareMenu(!showShareMenu)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-positive hover:bg-positive-bg transition-all duration-150 active:scale-95"
              >
                <Share2 size={14} />
                <span className="font-mono tabular-nums">{formatCount(post.shares)}</span>
              </button>
              {showShareMenu && (
                <div className="absolute bottom-full left-0 mb-2 bg-card border border-border rounded-xl shadow-modal p-1 min-w-[140px] animate-scale-in z-10">
                  <button onClick={handleCopyLink} className="w-full text-left px-3 py-2 text-xs font-medium text-foreground hover:bg-muted rounded-lg transition-colors">Copy link</button>
                  <button onClick={() => setShowShareMenu(false)} className="w-full text-left px-3 py-2 text-xs font-medium text-foreground hover:bg-muted rounded-lg transition-colors">Share on X</button>
                  <button onClick={() => setShowShareMenu(false)} className="w-full text-left px-3 py-2 text-xs font-medium text-foreground hover:bg-muted rounded-lg transition-colors">Share on LinkedIn</button>
                </div>
              )}
            </div>
          </div>

          {/* Right stats */}
          <div className="flex items-center gap-3">
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

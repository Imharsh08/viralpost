'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Heart, MessageCircle, Share2, Zap, TrendingUp, Sparkles, MoreHorizontal, Bookmark, Eye } from 'lucide-react';
import AppImage from '@/components/ui/AppImage';
import type { MockPost } from '@/lib/mockData';

interface PostCardProps {
  post: MockPost;
}

export default function PostCard({ post }: PostCardProps) {
  const [liked, setLiked] = useState(post.isLiked);
  const [likeCount, setLikeCount] = useState(post.likes);
  const [bookmarked, setBookmarked] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);

  const handleLike = () => {
    setLiked(!liked);
    setLikeCount(liked ? likeCount - 1 : likeCount + 1);
    // Backend: POST /api/posts/${post.id}/like or DELETE /api/posts/${post.id}/like
  };

  const handleShare = () => {
    setShowShareMenu(!showShareMenu);
    // Backend: POST /api/posts/${post.id}/share
  };

  return (
    <article className="card p-5 hover:shadow-card-hover transition-all duration-200 group animate-fade-in">
      {/* Author row */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <AppImage
              src={post.author.avatarUrl}
              alt={`${post.author.displayName} profile photo`}
              width={40}
              height={40}
              className="w-10 h-10 rounded-full object-cover border-2 border-border"
            />
            {post.author.isVerified && (
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-primary rounded-full flex items-center justify-center border border-card">
                <Sparkles size={8} className="text-white" />
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <Link
                href="#"
                className="text-sm font-bold text-foreground hover:text-primary transition-colors"
              >
                {post.author.displayName}
              </Link>
              {post.isTrending && (
                <span className="badge-trending">
                  <TrendingUp size={9} />
                  Trending
                </span>
              )}
              {post.isAiEnhanced && (
                <span className="badge-ai">
                  <Sparkles size={9} />
                  AI Enhanced
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-muted-foreground">@{post.author.username}</span>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">{post.timeAgo}</span>
            </div>
          </div>
        </div>

        {/* More menu */}
        <button className="btn-ghost w-8 h-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <MoreHorizontal size={16} />
        </button>
      </div>

      {/* Post content */}
      <div className="mb-3">
        {post.title && (
          <h2 className="text-base font-bold text-foreground mb-1.5 leading-snug">
            {post.title}
          </h2>
        )}
        <p className="text-sm text-foreground/80 leading-relaxed line-clamp-3">
          {post.excerpt}
        </p>
      </div>

      {/* Tags */}
      {post.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {post.tags.map((tag) => (
            <span key={`${post.id}-tag-${tag}`} className="badge-tag text-xs">
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Engagement row */}
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <div className="flex items-center gap-1">
          {/* Like */}
          <button
            onClick={handleLike}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 active:scale-95 ${
              liked
                ? 'text-negative bg-negative-bg hover:bg-red-100' :'text-muted-foreground hover:text-negative hover:bg-negative-bg'
            }`}
          >
            <Heart
              size={14}
              className={liked ? 'fill-negative text-negative' : ''}
            />
            <span className="font-mono tabular-nums">{likeCount.toLocaleString()}</span>
          </button>

          {/* Comments */}
          <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-primary hover:bg-secondary transition-all duration-150 active:scale-95">
            <MessageCircle size={14} />
            <span className="font-mono tabular-nums">{post.comments.toLocaleString()}</span>
          </button>

          {/* Share */}
          <div className="relative">
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-positive hover:bg-positive-bg transition-all duration-150 active:scale-95"
            >
              <Share2 size={14} />
              <span className="font-mono tabular-nums">{post.shares.toLocaleString()}</span>
            </button>
            {showShareMenu && (
              <div className="absolute bottom-full left-0 mb-2 bg-card border border-border rounded-xl shadow-modal p-1 min-w-[140px] animate-scale-in z-10">
                <button
                  onClick={() => { setShowShareMenu(false); }}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-foreground hover:bg-muted rounded-lg transition-colors"
                >
                  Copy link
                </button>
                <button
                  onClick={() => { setShowShareMenu(false); }}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-foreground hover:bg-muted rounded-lg transition-colors"
                >
                  Share on X
                </button>
                <button
                  onClick={() => { setShowShareMenu(false); }}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-foreground hover:bg-muted rounded-lg transition-colors"
                >
                  Share on LinkedIn
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Views */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Eye size={12} />
            <span className="font-mono tabular-nums">{post.views.toLocaleString()}</span>
          </div>

          {/* Points earned indicator */}
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-50 border border-amber-100">
            <Zap size={10} className="text-amber-500 fill-amber-400" />
            <span className="text-xs font-bold text-amber-700 font-mono tabular-nums">+{post.pointsEarned}</span>
          </div>

          {/* Bookmark */}
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
    </article>
  );
}
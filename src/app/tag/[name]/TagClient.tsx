'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Hash, TrendingUp, Clock, Loader2, Heart, MessageCircle, Eye, ArrowLeft } from 'lucide-react';
import AppImage from '@/components/ui/AppImage';

interface TagPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  tags: string[];
  likes_count: number;
  comments_count: number;
  views_count: number;
  published_at: string;
  users: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string;
    is_verified: boolean;
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

export default function TagClient({ tagName }: { tagName: string }) {
  const [posts, setPosts] = useState<TagPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<'trending' | 'recent'>('trending');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/tag/${encodeURIComponent(tagName)}?sort=${sort}`)
      .then((r) => r.json())
      .then((data) => !cancelled && setPosts(data.posts ?? []))
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [tagName, sort]);

  return (
    <div className="max-w-3xl mx-auto">
      <Link
        href="/"
        className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground mb-4 transition-colors w-fit"
      >
        <ArrowLeft size={15} />
        Back to feed
      </Link>

      {/* Hashtag hero */}
      <div className="card p-6 mb-5 bg-gradient-to-br from-violet-50 via-purple-50 to-amber-50 border-purple-200">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-md shrink-0">
            <Hash size={32} className="text-white" strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground break-words">
              #{tagName}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {loading ? 'Loading…' : `${posts.length.toLocaleString()} ${posts.length === 1 ? 'post' : 'posts'} with this tag`}
            </p>
          </div>
        </div>
      </div>

      {/* Sort tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-xl mb-5 w-fit">
        <button
          onClick={() => setSort('trending')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
            sort === 'trending' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <TrendingUp size={14} />
          Trending
        </button>
        <button
          onClick={() => setSort('recent')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
            sort === 'recent' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Clock size={14} />
          Recent
        </button>
      </div>

      {/* Posts */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={28} className="animate-spin text-muted-foreground" />
        </div>
      ) : posts.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
            <Hash size={26} className="text-primary" />
          </div>
          <h3 className="text-base font-bold text-foreground mb-1">No posts with #{tagName} yet</h3>
          <p className="text-sm text-muted-foreground mb-5">
            Be the first to write a post tagged with this hashtag.
          </p>
          <Link href="/write-editor-page" className="btn-primary">
            Write the first post
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {posts.map((post) => {
            const author = post.users;
            const initials = author?.display_name?.slice(0, 2).toUpperCase() || '??';
            return (
              <Link
                key={post.id}
                href={`/post/${post.id}`}
                className="card p-4 hover:shadow-md transition-shadow group"
              >
                <div className="flex items-center gap-2.5 mb-2">
                  {author?.avatar_url ? (
                    <AppImage
                      src={author.avatar_url}
                      alt={author.display_name}
                      width={28}
                      height={28}
                      className="w-7 h-7 rounded-full object-cover border border-border"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                      {initials}
                    </div>
                  )}
                  <span className="text-xs font-bold text-foreground">{author?.display_name}</span>
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className="text-xs text-muted-foreground">{timeAgo(post.published_at)}</span>
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
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

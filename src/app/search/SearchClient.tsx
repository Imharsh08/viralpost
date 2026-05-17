'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Search as SearchIcon, FileText, Users, Hash, Loader2, Heart, MessageCircle, Eye, BadgeCheck,
} from 'lucide-react';
import AppImage from '@/components/ui/AppImage';
import FollowButton from '@/app/components/FollowButton';
import { formatCount } from '@/lib/formatCount';

interface SearchPost {
  id: string;
  title: string;
  excerpt: string;
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

interface SearchCreator {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  is_verified: boolean;
  follower_count: number;
}

type Tab = 'all' | 'posts' | 'creators' | 'tags';

export default function SearchClient() {
  const router = useRouter();
  const params = useSearchParams();
  const initialQ = params.get('q') ?? '';

  const [query, setQuery] = useState(initialQ);
  const [debounced, setDebounced] = useState(initialQ);
  const [tab, setTab] = useState<Tab>('all');
  const [posts, setPosts] = useState<SearchPost[]>([]);
  const [creators, setCreators] = useState<SearchCreator[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Debounce input → debounced
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  // Sync to URL
  useEffect(() => {
    if (!debounced) {
      router.replace('/search');
      return;
    }
    router.replace(`/search?q=${encodeURIComponent(debounced)}`);
  }, [debounced]);

  // Fetch
  useEffect(() => {
    if (debounced.length < 2) {
      setPosts([]);
      setCreators([]);
      setTags([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(debounced)}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setPosts(data.posts ?? []);
        setCreators(data.creators ?? []);
        setTags(data.tags ?? []);
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  const showPosts = tab === 'all' || tab === 'posts';
  const showCreators = tab === 'all' || tab === 'creators';
  const showTags = tab === 'all' || tab === 'tags';
  const totalResults = posts.length + creators.length + tags.length;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Search input */}
      <div className="card p-4 mb-5">
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border bg-muted focus-within:border-primary focus-within:bg-card transition-colors">
          <SearchIcon size={17} className="text-muted-foreground shrink-0" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search posts, creators, hashtags…"
            className="bg-transparent text-base outline-none w-full text-foreground placeholder:text-muted-foreground"
          />
          {loading && <Loader2 size={15} className="animate-spin text-muted-foreground shrink-0" />}
        </div>
      </div>

      {/* Empty / hint state */}
      {debounced.length < 2 ? (
        <div className="card p-10 text-center">
          <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
            <SearchIcon size={26} className="text-primary" />
          </div>
          <h3 className="text-base font-bold text-foreground mb-1">Search ViralPost</h3>
          <p className="text-sm text-muted-foreground">
            Type at least 2 characters to find posts, creators, and hashtags.
          </p>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-muted rounded-xl mb-4 w-fit">
            <TabBtn id="all" current={tab} setTab={setTab} label="All" count={totalResults} />
            <TabBtn id="posts" current={tab} setTab={setTab} label="Posts" count={posts.length} icon={FileText} />
            <TabBtn id="creators" current={tab} setTab={setTab} label="Creators" count={creators.length} icon={Users} />
            <TabBtn id="tags" current={tab} setTab={setTab} label="Tags" count={tags.length} icon={Hash} />
          </div>

          {!loading && totalResults === 0 ? (
            <div className="card p-10 text-center">
              <h3 className="text-base font-bold text-foreground mb-1">No results for "{debounced}"</h3>
              <p className="text-sm text-muted-foreground">Try a different spelling, fewer words, or check the hashtag spelling.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {showTags && tags.length > 0 && (
                <section>
                  <SectionHeader icon={Hash} label="Hashtags" count={tags.length} />
                  <div className="flex flex-wrap gap-2">
                    {tags.map((t) => (
                      <Link
                        key={`tag-${t}`}
                        href={`/tag/${encodeURIComponent(t)}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-secondary text-primary border border-primary/20 hover:bg-primary/15 transition-colors"
                      >
                        <Hash size={12} />
                        {t}
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {showCreators && creators.length > 0 && (
                <section>
                  <SectionHeader icon={Users} label="Creators" count={creators.length} />
                  <div className="flex flex-col gap-2">
                    {creators.map((c) => (
                      <CreatorRow key={c.id} creator={c} />
                    ))}
                  </div>
                </section>
              )}

              {showPosts && posts.length > 0 && (
                <section>
                  <SectionHeader icon={FileText} label="Posts" count={posts.length} />
                  <div className="flex flex-col gap-3">
                    {posts.map((p) => (
                      <PostResult key={p.id} post={p} />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function TabBtn({
  id, current, setTab, label, count, icon: Icon,
}: { id: Tab; current: Tab; setTab: (t: Tab) => void; label: string; count: number; icon?: any }) {
  return (
    <button
      onClick={() => setTab(id)}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
        current === id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      {Icon && <Icon size={13} />}
      {label}
      <span className="text-xs text-muted-foreground font-mono">{count}</span>
    </button>
  );
}

function SectionHeader({ icon: Icon, label, count }: { icon: any; label: string; count: number }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <Icon size={14} className="text-primary" />
      <h2 className="text-xs font-bold text-foreground uppercase tracking-wider">{label}</h2>
      <span className="text-xs text-muted-foreground font-mono">{count}</span>
    </div>
  );
}

function CreatorRow({ creator }: { creator: SearchCreator }) {
  const initials = creator.display_name?.slice(0, 2).toUpperCase() ?? '??';
  return (
    <div className="card p-3 flex items-center gap-3 hover:shadow-md transition-shadow">
      <Link href={`/u/${creator.username}`} className="shrink-0">
        {creator.avatar_url ? (
          <AppImage
            src={creator.avatar_url}
            alt={creator.display_name}
            width={44}
            height={44}
            className="w-11 h-11 rounded-full object-cover border border-border"
          />
        ) : (
          <div className="w-11 h-11 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-sm font-bold text-primary">
            {initials}
          </div>
        )}
      </Link>
      <Link href={`/u/${creator.username}`} className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-bold text-foreground truncate">{creator.display_name}</span>
          {creator.is_verified && <BadgeCheck size={13} className="text-primary fill-primary/20 shrink-0" />}
        </div>
        <p className="text-xs text-muted-foreground truncate">
          @{creator.username} · {formatCount(creator.follower_count)} followers
        </p>
        {creator.bio && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{creator.bio}</p>}
      </Link>
      <FollowButton targetUserId={creator.id} targetDisplayName={creator.display_name} variant="compact" />
    </div>
  );
}

function PostResult({ post }: { post: SearchPost }) {
  const author = post.users;
  const initials = author?.display_name?.slice(0, 2).toUpperCase() ?? '??';
  return (
    <Link href={`/post/${post.id}`} className="card p-4 hover:shadow-md transition-shadow group">
      <div className="flex items-center gap-2 mb-2">
        {author?.avatar_url ? (
          <AppImage
            src={author.avatar_url}
            alt={author.display_name}
            width={24}
            height={24}
            className="w-6 h-6 rounded-full object-cover border border-border"
          />
        ) : (
          <div className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
            {initials}
          </div>
        )}
        <span className="text-xs font-bold text-foreground">{author?.display_name}</span>
      </div>
      {post.title && (
        <h3 className="text-base font-bold text-foreground mb-1 group-hover:text-primary transition-colors">
          {post.title}
        </h3>
      )}
      <p className="text-sm text-muted-foreground line-clamp-2 mb-2 leading-relaxed">{post.excerpt}</p>
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><Heart size={11} /><span className="font-mono">{formatCount(post.likes_count)}</span></span>
        <span className="flex items-center gap-1"><MessageCircle size={11} /><span className="font-mono">{formatCount(post.comments_count)}</span></span>
        <span className="flex items-center gap-1"><Eye size={11} /><span className="font-mono">{formatCount(post.views_count)}</span></span>
      </div>
    </Link>
  );
}

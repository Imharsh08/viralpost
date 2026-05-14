'use client';

import { useState, useEffect } from 'react';
import { createClient, RealtimeChannel } from '@supabase/supabase-js';

export interface PostCounts {
  likes_count: number;
  comments_count: number;
  views_count: number;
}

type CountSetter = (counts: PostCounts) => void;

// Module-level singleton — ONE channel shared across all mounted PostCards
let channel: RealtimeChannel | null = null;
let rebuildTimer: ReturnType<typeof setTimeout> | null = null;
const subscribedIds = new Set<string>();
const listeners = new Map<string, Set<CountSetter>>();

function rebuildChannel() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

  if (channel) {
    channel.unsubscribe();
    channel = null;
  }

  if (subscribedIds.size === 0 || !supabaseUrl || !supabaseAnonKey) return;

  const idList = Array.from(subscribedIds).join(',');
  const client = createClient(supabaseUrl, supabaseAnonKey);

  channel = client
    .channel('feed-posts-realtime')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'posts',
        filter: `id=in.(${idList})`,
      },
      (payload) => {
        const row = payload.new as any;
        const postListeners = listeners.get(row.id);
        if (!postListeners) return;
        const counts: PostCounts = {
          likes_count: row.likes_count ?? 0,
          comments_count: row.comments_count ?? 0,
          views_count: row.views_count ?? 0,
        };
        postListeners.forEach((setter) => setter(counts));
      }
    )
    .subscribe();
}

// Debounced rebuild — lets all PostCards mount in one tick before building the channel
function scheduleRebuild() {
  if (rebuildTimer) clearTimeout(rebuildTimer);
  rebuildTimer = setTimeout(rebuildChannel, 50);
}

export function usePostRealtime(
  postId: string,
  initialCounts: PostCounts,
  skip = false
): PostCounts {
  const [counts, setCounts] = useState<PostCounts>(initialCounts);

  useEffect(() => {
    if (skip || !postId) return;

    // Register this card's setter
    if (!listeners.has(postId)) listeners.set(postId, new Set());
    listeners.get(postId)!.add(setCounts);
    subscribedIds.add(postId);
    scheduleRebuild();

    return () => {
      // Deregister on unmount
      const setters = listeners.get(postId);
      if (setters) {
        setters.delete(setCounts);
        if (setters.size === 0) {
          listeners.delete(postId);
          subscribedIds.delete(postId);
          scheduleRebuild();
        }
      }
    };
  }, [postId, skip]);

  return counts;
}

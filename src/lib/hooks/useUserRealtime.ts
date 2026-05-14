'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

export function useUserRealtime(
  userId: string | null,
  initialFollowerCount: number
): number {
  const [followerCount, setFollowerCount] = useState(initialFollowerCount);

  // Sync when parent updates the initial value (e.g. after FollowButton.onFollowChange)
  useEffect(() => {
    setFollowerCount(initialFollowerCount);
  }, [initialFollowerCount]);

  useEffect(() => {
    if (!userId) return;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
    if (!supabaseUrl || !supabaseAnonKey) return;

    const client = createClient(supabaseUrl, supabaseAnonKey);
    const ch = client
      .channel(`user-realtime-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as any;
          if (typeof row.follower_count === 'number') {
            setFollowerCount(row.follower_count);
          }
        }
      )
      .subscribe();

    return () => { ch.unsubscribe(); };
  }, [userId]);

  return followerCount;
}

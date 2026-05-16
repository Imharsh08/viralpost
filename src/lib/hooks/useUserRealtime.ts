'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';

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

    const ch = supabase
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

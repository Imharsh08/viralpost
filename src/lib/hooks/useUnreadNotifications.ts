'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';

/**
 * Shared hook for the unread notification count.
 * Subscribes to realtime INSERTs on the `notifications` table filtered to
 * the current user. Increments locally so the badge updates within ~200ms
 * of the trigger firing — no polling.
 *
 * Used by both the desktop NotificationBell and the mobile bottom nav,
 * so both surfaces stay in sync via the same module-level realtime
 * channel (Supabase JS dedupes by channel name).
 */
export function useUnreadNotifications(): { unreadCount: number; reset: () => void } {
  const { user, session } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  // Initial fetch + refetch on session change
  useEffect(() => {
    if (!session) {
      setUnreadCount(0);
      return;
    }
    let cancelled = false;
    fetch('/api/notifications', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setUnreadCount(data.unread_count ?? 0);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [session?.access_token]);

  // Realtime: increment on every INSERT for this user
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`notifications-unread:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => setUnreadCount((n) => n + 1),
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  return {
    unreadCount,
    reset: () => setUnreadCount(0),
  };
}

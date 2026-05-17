'use client';

import { useEffect, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';

/**
 * Shared hook for the unread notification count.
 *
 * Multiple components can call this (e.g. desktop NotificationBell AND
 * mobile bottom nav). To avoid double-subscribing to the same channel
 * name (which can throw on some Supabase JS versions), we keep a
 * module-level singleton channel + a Set of listener setters. The first
 * caller creates the channel; subsequent callers just register their
 * setter; the last to unmount tears down the channel.
 */

type Setter = (updater: (n: number) => number) => void;

let channel: RealtimeChannel | null = null;
let channelUserId: string | null = null;
const listeners = new Set<Setter>();

function ensureChannel(userId: string) {
  if (channel && channelUserId === userId) return;
  // Tear down old channel for a different user (sign-out / switch).
  if (channel) {
    try { supabase.removeChannel(channel); } catch {}
    channel = null;
    channelUserId = null;
  }
  channel = supabase
    .channel(`notifications-unread:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      () => {
        listeners.forEach((setter) => setter((n) => n + 1));
      },
    )
    .subscribe();
  channelUserId = userId;
}

function teardownIfIdle() {
  if (listeners.size === 0 && channel) {
    try { supabase.removeChannel(channel); } catch {}
    channel = null;
    channelUserId = null;
  }
}

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

  // Register this component's setter on the singleton channel
  useEffect(() => {
    if (!user?.id) return;
    ensureChannel(user.id);
    const setter: Setter = (fn) => setUnreadCount(fn);
    listeners.add(setter);
    return () => {
      listeners.delete(setter);
      teardownIfIdle();
    };
  }, [user?.id]);

  return {
    unreadCount,
    reset: () => setUnreadCount(0),
  };
}

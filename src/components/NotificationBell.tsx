'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell, Heart, MessageCircle, UserPlus, Zap, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import AppImage from '@/components/ui/AppImage';

interface Notification {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'points' | 'milestone';
  message: string;
  post_id: string | null;
  comment_id: string | null;
  is_read: boolean;
  created_at: string;
  actor: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string;
    is_verified: boolean;
  } | null;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d`;
  return new Date(iso).toLocaleDateString();
}

const ICON_MAP = {
  like: Heart,
  comment: MessageCircle,
  follow: UserPlus,
  points: Zap,
  milestone: Zap,
};

const COLOR_MAP = {
  like: 'text-rose-500 bg-rose-50',
  comment: 'text-blue-500 bg-blue-50',
  follow: 'text-emerald-500 bg-emerald-50',
  points: 'text-amber-500 bg-amber-50',
  milestone: 'text-violet-500 bg-violet-50',
};

export default function NotificationBell() {
  const { user, session } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const authHeader = session ? `Bearer ${session.access_token}` : '';

  const load = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const res = await fetch('/api/notifications', { headers: { Authorization: authHeader } });
      const data = await res.json();
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unread_count ?? 0);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    if (user) load();
  }, [user?.id]);

  // Realtime subscription for new notifications
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          load();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Click outside to close
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const handleToggle = async () => {
    const willOpen = !open;
    setOpen(willOpen);
    if (willOpen) {
      await load();
      // Mark all as read on open
      if (unreadCount > 0 && session) {
        fetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: authHeader },
          body: JSON.stringify({}),
        }).catch(() => {});
        setUnreadCount(0);
      }
    }
  };

  if (!user) return null;

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={handleToggle}
        className="btn-ghost w-9 h-9 p-0 relative"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-negative text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-card">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 w-[360px] max-w-[calc(100vw-2rem)] bg-card border border-border rounded-2xl shadow-modal animate-scale-in z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">Notifications</h3>
            {notifications.length > 0 && (
              <span className="text-xs text-muted-foreground">{notifications.length} recent</span>
            )}
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center text-sm text-muted-foreground">Loading…</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
                  <Bell size={20} className="text-muted-foreground" />
                </div>
                <p className="text-sm font-semibold text-foreground mb-1">All caught up</p>
                <p className="text-xs text-muted-foreground">
                  We'll let you know when something happens.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {notifications.map((n) => {
                  const Icon = ICON_MAP[n.type] ?? Bell;
                  const colorClass = COLOR_MAP[n.type] ?? 'text-muted-foreground bg-muted';
                  const href = n.post_id ? `/post/${n.post_id}` : n.actor ? `/u/${n.actor.username}` : '#';
                  return (
                    <li key={n.id}>
                      <Link
                        href={href}
                        onClick={() => setOpen(false)}
                        className={`flex items-start gap-3 px-4 py-3 hover:bg-muted transition-colors ${
                          !n.is_read ? 'bg-secondary/30' : ''
                        }`}
                      >
                        <div className="relative shrink-0">
                          {n.actor?.avatar_url ? (
                            <AppImage
                              src={n.actor.avatar_url}
                              alt={n.actor.display_name}
                              width={36}
                              height={36}
                              className="w-9 h-9 rounded-full object-cover border border-border"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                              {n.actor?.display_name?.slice(0, 2).toUpperCase() ?? '??'}
                            </div>
                          )}
                          <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border-2 border-card ${colorClass}`}>
                            <Icon size={10} className={n.type === 'like' ? 'fill-current' : ''} />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground leading-snug">
                            <span className="font-bold">
                              {n.actor?.display_name ?? 'Someone'}
                            </span>{' '}
                            <span className="text-muted-foreground">{n.message}</span>
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">{timeAgo(n.created_at)}</p>
                        </div>
                        {!n.is_read && (
                          <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {notifications.length > 0 && (
            <div className="px-4 py-2.5 border-t border-border bg-muted/30 text-center">
              <span className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <Check size={11} />
                All marked as read
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

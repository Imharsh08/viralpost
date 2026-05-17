'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, Heart, MessageCircle, UserPlus, Zap, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import AppImage from '@/components/ui/AppImage';
import { useUnreadNotifications } from '@/lib/hooks/useUnreadNotifications';

interface Notification {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'points' | 'milestone' | 'comment_like' | 'reply';
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

const ICON_MAP = {
  like: Heart,
  comment: MessageCircle,
  comment_like: Heart,
  reply: MessageCircle,
  follow: UserPlus,
  points: Zap,
  milestone: Zap,
};

const COLOR_MAP = {
  like: 'text-rose-500 bg-rose-50',
  comment: 'text-blue-500 bg-blue-50',
  comment_like: 'text-rose-500 bg-rose-50',
  reply: 'text-blue-500 bg-blue-50',
  follow: 'text-emerald-500 bg-emerald-50',
  points: 'text-amber-500 bg-amber-50',
  milestone: 'text-violet-500 bg-violet-50',
};

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

export default function NotificationsClient() {
  const router = useRouter();
  const { user, session } = useAuth();
  const { reset: resetUnread } = useUnreadNotifications();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.replace('/sign-up-login-screen');
      return;
    }
    if (!session) return;

    fetch('/api/notifications', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then((r) => r.json())
      .then((data) => setNotifications(data.notifications ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, session, router]);

  // Mark all read when the page mounts (Instagram-style: opening the
  // Activity tab implicitly acknowledges everything).
  useEffect(() => {
    if (!session) return;
    fetch('/api/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({}),
    }).catch(() => {});
    resetUnread();
  }, [session]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-16 flex justify-center">
        <Loader2 size={28} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-foreground mb-1">Activity</h1>
      <p className="text-sm text-muted-foreground mb-5">
        {notifications.length === 0
          ? 'No activity yet — your first like, follow, and comment will show up here.'
          : `${notifications.length} recent ${notifications.length === 1 ? 'event' : 'events'}`}
      </p>

      {notifications.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-3">
            <Bell size={26} className="text-primary" />
          </div>
          <h3 className="text-base font-bold text-foreground mb-1">You're all caught up</h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            We'll let you know the moment something happens on your posts.
          </p>
        </div>
      ) : (
        <ul className="card divide-y divide-border overflow-hidden">
          {notifications.map((n) => {
            const Icon = ICON_MAP[n.type] ?? Bell;
            const colorClass = COLOR_MAP[n.type] ?? 'text-muted-foreground bg-muted';
            const href = n.post_id ? `/post/${n.post_id}` : n.actor ? `/u/${n.actor.username}` : '#';
            return (
              <li key={n.id}>
                <Link
                  href={href}
                  className={`flex items-start gap-3 px-4 py-3 hover:bg-muted transition-colors ${
                    !n.is_read ? 'bg-secondary/30' : ''
                  }`}
                >
                  <div className="relative shrink-0">
                    {n.actor?.avatar_url ? (
                      <AppImage
                        src={n.actor.avatar_url}
                        alt={n.actor.display_name}
                        width={40}
                        height={40}
                        className="w-10 h-10 rounded-full object-cover border border-border"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                        {n.actor?.display_name?.slice(0, 2).toUpperCase() ?? '??'}
                      </div>
                    )}
                    <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border-2 border-card ${colorClass}`}>
                      <Icon size={10} className={n.type === 'like' || n.type === 'comment_like' ? 'fill-current' : ''} />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground leading-snug">
                      <span className="font-bold">{n.actor?.display_name ?? 'Someone'}</span>{' '}
                      <span className="text-muted-foreground">{n.message}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{timeAgo(n.created_at)}</p>
                  </div>
                  {!n.is_read && (
                    <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-3" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

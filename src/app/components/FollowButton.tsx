'use client';

import React, { useState, useEffect } from 'react';
import { UserPlus, UserCheck, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface FollowButtonProps {
  targetUserId: string;
  targetDisplayName?: string;
  variant?: 'compact' | 'primary';
  onFollowChange?: (isFollowing: boolean, newFollowerCount: number) => void;
  className?: string;
}

export default function FollowButton({
  targetUserId,
  targetDisplayName,
  variant = 'compact',
  onFollowChange,
  className = '',
}: FollowButtonProps) {
  const { user, session } = useAuth();
  const [isFollowing, setIsFollowing] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  // Don't render for own profile or invalid IDs
  if (user?.id === targetUserId) return null;

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (!session || !targetUserId) { setIsFollowing(false); return; }

    // Non-UUID IDs (mock data) — skip API call, show as not-following
    if (!UUID_RE.test(targetUserId)) { setIsFollowing(false); return; }

    fetch(`/api/follow?following_id=${targetUserId}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then((r) => r.json())
      .then((data) => setIsFollowing(data.is_following ?? false))
      .catch(() => setIsFollowing(false));
  }, [targetUserId, session]);

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!session) { toast.error('Sign in to follow creators'); return; }
    if (!UUID_RE.test(targetUserId)) { toast.error('Cannot follow this creator'); return; }
    if (loading || isFollowing === null) return;

    const wasFollowing = isFollowing;
    setIsFollowing(!wasFollowing);
    setLoading(true);

    try {
      const res = await fetch('/api/follow', {
        method: wasFollowing ? 'DELETE' : 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ following_id: targetUserId }),
      });

      const data = await res.json();

      if (!res.ok && res.status !== 409) {
        throw new Error(data.error || 'Failed');
      }

      onFollowChange?.(!wasFollowing, data.follower_count ?? 0);

      if (!wasFollowing) {
        toast.success(`Following ${targetDisplayName || 'creator'}`);
      }
    } catch {
      setIsFollowing(wasFollowing);
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  // Loading skeleton
  if (isFollowing === null) {
    return (
      <div
        className={`${
          variant === 'primary'
            ? 'h-9 w-28 rounded-xl'
            : 'h-6 w-16 rounded-full'
        } bg-muted animate-pulse ${className}`}
      />
    );
  }

  if (variant === 'primary') {
    return (
      <button
        onClick={handleToggle}
        disabled={loading}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-150 active:scale-95 disabled:opacity-60 ${
          isFollowing
            ? 'btn-secondary border border-border'
            : 'btn-primary'
        } ${className}`}
      >
        {loading ? (
          <Loader2 size={14} className="animate-spin" />
        ) : isFollowing ? (
          <UserCheck size={14} />
        ) : (
          <UserPlus size={14} />
        )}
        {isFollowing ? 'Following' : 'Follow'}
      </button>
    );
  }

  // compact pill
  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-semibold transition-all duration-150 active:scale-95 disabled:opacity-60 ${
        isFollowing
          ? 'border-primary text-primary bg-secondary'
          : 'border-border text-muted-foreground hover:border-primary hover:text-primary hover:bg-secondary'
      } ${className}`}
    >
      {loading ? (
        <Loader2 size={10} className="animate-spin" />
      ) : isFollowing ? (
        <UserCheck size={10} />
      ) : (
        <UserPlus size={10} />
      )}
      {isFollowing ? 'Following' : 'Follow'}
    </button>
  );
}

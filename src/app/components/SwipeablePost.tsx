'use client';

import React, { useState } from 'react';
import { Repeat2, MessageSquareQuote } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useDragToReshare } from '@/lib/hooks/useDragToReshare';
import ReshareSheet from './ReshareSheet';
import type { MockPost } from '@/lib/mockData';

interface SwipeablePostProps {
  post: MockPost;
  /** When true, swipe is disabled (used for mock posts that have no
   *  real DB row to reshare against). */
  disabled?: boolean;
  children: React.ReactNode;
}

/**
 * Wrapper that adds swipe-to-reshare gestures around a PostCard.
 *
 *   Swipe RIGHT  → quick reshare (no commentary)
 *   Swipe LEFT   → open ReshareSheet to add commentary
 *
 * Vertical scroll is preserved — the hook releases the card as soon as
 * the user moves more on the Y axis than X.
 *
 * Disabled when:
 *   - Signed out (reshare requires auth)
 *   - Post is a seed/mock post with no DB row
 *   - You're already on a post you authored (can't reshare your own)
 *
 * The wrapper is purely visual: it renders side-reveal hints behind the
 * card. The post still posts in feed scrolling order; we don't reorder.
 */
export default function SwipeablePost({ post, disabled, children }: SwipeablePostProps) {
  const { session, user } = useAuth();
  const [sheetOpen, setSheetOpen] = useState(false);

  // Don't allow swiping if signed-out, mock data, or own post (the API
  // would reject anyway — surface this client-side to avoid wasted toast
  // flashes).
  const swipeDisabled =
    disabled ||
    !session ||
    user?.id === post.author.id;

  const handleQuickReshare = async () => {
    if (!session) return;
    try {
      const res = await fetch(`/api/posts/${post.id}/reshare`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ thought: '' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to reshare');
      if (data.status === 'already-reshared') {
        toast.message('You already reshared this');
      } else {
        toast.success('Reshared to your feed');
      }
    } catch (err: any) {
      toast.error(err?.message ?? 'Could not reshare');
    }
  };

  const handleSubmitWithThought = async (thought: string) => {
    if (!session) return;
    try {
      const res = await fetch(`/api/posts/${post.id}/reshare`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ thought }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to reshare');
      if (data.status === 'already-reshared') {
        toast.message('You already reshared this');
      } else {
        toast.success(thought ? 'Reshared with your thoughts' : 'Reshared to your feed');
      }
      setSheetOpen(false);
    } catch (err: any) {
      toast.error(err?.message ?? 'Could not reshare');
    }
  };

  const { dragX, dragging, handlers } = useDragToReshare({
    disabled: swipeDisabled,
    onSwipeRight: handleQuickReshare,
    onSwipeLeft: () => setSheetOpen(true),
  });

  const direction: 'left' | 'right' | null =
    dragX > 0 ? 'right' : dragX < 0 ? 'left' : null;
  const progress = Math.min(Math.abs(dragX) / 80, 1);
  const triggered = Math.abs(dragX) >= 80;

  return (
    <>
      <div
        className="relative overflow-hidden rounded-2xl"
        // pan-y lets the page scroll vertically while we capture
        // horizontal pointer events. Without this, mobile Safari ignores
        // our preventDefault for horizontal drags.
        style={{ touchAction: swipeDisabled ? 'auto' : 'pan-y' }}
        {...(swipeDisabled ? {} : handlers)}
      >
        {/* Right-side hint: revealed when swiping LEFT (card moves left
            exposes the right edge). Shows the "add thoughts" affordance. */}
        <div
          aria-hidden
          className="absolute inset-y-0 right-0 w-24 flex flex-col items-center justify-center gap-1 pointer-events-none bg-gradient-to-l from-secondary/80 to-transparent"
          style={{ opacity: direction === 'left' ? progress : 0 }}
        >
          <MessageSquareQuote
            size={22}
            className={triggered ? 'text-primary' : 'text-muted-foreground'}
            style={{ transform: `scale(${0.7 + progress * 0.4})` }}
          />
          <span className={`text-[10px] font-bold leading-tight text-center whitespace-pre-line ${triggered ? 'text-primary' : 'text-muted-foreground'}`}>
            {triggered ? 'Release!' : 'With\nthoughts'}
          </span>
        </div>

        {/* Left-side hint: revealed when swiping RIGHT. Quick reshare. */}
        <div
          aria-hidden
          className="absolute inset-y-0 left-0 w-24 flex flex-col items-center justify-center gap-1 pointer-events-none bg-gradient-to-r from-positive-bg to-transparent"
          style={{ opacity: direction === 'right' ? progress : 0 }}
        >
          <Repeat2
            size={22}
            className={triggered ? 'text-positive' : 'text-muted-foreground'}
            style={{ transform: `scale(${0.7 + progress * 0.4})` }}
          />
          <span className={`text-[10px] font-bold leading-tight text-center whitespace-pre-line ${triggered ? 'text-positive' : 'text-muted-foreground'}`}>
            {triggered ? 'Release!' : 'Quick\nreshare'}
          </span>
        </div>

        {/* The card itself — translates with the drag */}
        <div
          className="relative z-10 bg-background"
          style={{
            transform: `translateX(${dragX}px)`,
            transition: dragging ? 'none' : 'transform 0.35s cubic-bezier(0.25, 1, 0.5, 1)',
          }}
        >
          {children}
        </div>
      </div>

      <ReshareSheet
        post={post}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSubmit={handleSubmitWithThought}
      />
    </>
  );
}

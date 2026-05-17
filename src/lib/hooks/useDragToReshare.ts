'use client';

import { useCallback, useRef, useState } from 'react';

const THRESHOLD = 80;    // px drag needed to fire an action
const MAX_DRAG = 120;    // px max visual travel after rubber-banding
const RESIST = 0.4;      // beyond threshold, motion is dampened
const AXIS_LOCK_TOL = 6; // px on either axis before we commit to direction

interface UseDragToReshareOpts {
  onSwipeRight?: () => void;
  onSwipeLeft?: () => void;
  /** When true, hook becomes a no-op (used to disable for mock posts /
   *  signed-out viewers). */
  disabled?: boolean;
}

interface DragHandlers {
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onPointerCancel: (e: React.PointerEvent) => void;
}

/**
 * Touch + pointer drag tracker for horizontal swipes on a card.
 * Returns the current pixel offset (signed) and a `dragging` flag so the
 * consumer can decide when to disable scroll-snap, animate the slide,
 * or trigger an action at release.
 *
 * Vertical drags release the card and let the page scroll — no axis
 * hijack. Horizontal drags call preventDefault on the underlying touch
 * events so the OS doesn't try to scroll horizontally at the same time.
 *
 * Action fires only on release past THRESHOLD; the card animates back
 * to zero a moment later so the consumer can render a confirmation
 * before reset (this is the `settled` window, ~600ms).
 */
export function useDragToReshare({
  onSwipeRight,
  onSwipeLeft,
  disabled,
}: UseDragToReshareOpts): { dragX: number; dragging: boolean; handlers: DragHandlers } {
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);

  const startX = useRef(0);
  const startY = useRef(0);
  const locked = useRef<'x' | 'y' | null>(null);
  const settled = useRef(false);
  // Avoid double-firing if the user lifts and quickly puts down again
  // while we're still in the post-release settle window.
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reset = useCallback(() => {
    setDragX(0);
    setDragging(false);
    locked.current = null;
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (disabled || settled.current) return;
    startX.current = e.clientX;
    startY.current = e.clientY;
    locked.current = null;
    setDragging(true);
  }, [disabled]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (disabled || !dragging || settled.current) return;
    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;

    // Lock the axis on the first non-trivial movement.
    if (!locked.current) {
      if (Math.abs(dx) > AXIS_LOCK_TOL || Math.abs(dy) > AXIS_LOCK_TOL) {
        locked.current = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      }
      return;
    }

    // Vertical lock — release the card and let the page scroll normally.
    if (locked.current === 'y') {
      setDragging(false);
      setDragX(0);
      return;
    }

    // Horizontal lock — rubber-band past THRESHOLD so the card doesn't
    // fly off-screen during slow drags.
    let travel = dx;
    if (Math.abs(dx) > THRESHOLD) {
      const excess = Math.abs(dx) - THRESHOLD;
      travel = (dx > 0 ? 1 : -1) * (THRESHOLD + excess * RESIST);
    }
    travel = Math.max(-MAX_DRAG, Math.min(MAX_DRAG, travel));
    setDragX(travel);
  }, [dragging, disabled]);

  const onPointerUp = useCallback(() => {
    if (disabled || !dragging) {
      setDragging(false);
      return;
    }
    setDragging(false);

    if (dragX >= THRESHOLD) {
      settled.current = true;
      onSwipeRight?.();
      settleTimer.current = setTimeout(() => { settled.current = false; reset(); }, 600);
    } else if (dragX <= -THRESHOLD) {
      settled.current = true;
      onSwipeLeft?.();
      settleTimer.current = setTimeout(() => { settled.current = false; reset(); }, 600);
    } else {
      reset();
    }
  }, [dragging, dragX, disabled, onSwipeLeft, onSwipeRight, reset]);

  const onPointerCancel = useCallback(() => {
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settled.current = false;
    reset();
  }, [reset]);

  return {
    dragX,
    dragging,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel },
  };
}

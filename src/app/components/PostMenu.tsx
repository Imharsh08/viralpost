'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal, Link as LinkIcon, EyeOff, Flag, Trash2, Edit3 } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface PostMenuProps {
  postId: string;
  /** When true, render owner actions (Edit / Delete) instead of viewer
   *  actions (Hide / Report). */
  isOwn: boolean;
  /** Called after a Delete succeeds so the parent can remove the card
   *  from its local list. */
  onDeleted?: (postId: string) => void;
  /** Auth bearer for the Delete request. Omit for anon viewers. */
  authToken?: string | null;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  danger?: boolean;
  ownerOnly?: boolean;
  viewerOnly?: boolean;
}

const ITEMS: MenuItem[] = [
  { id: 'copy-link', label: 'Copy link',    icon: LinkIcon },
  { id: 'edit',      label: 'Edit post',    icon: Edit3,    ownerOnly: true },
  { id: 'delete',    label: 'Delete',       icon: Trash2,   danger: true, ownerOnly: true },
  { id: 'hide',      label: 'Hide',         icon: EyeOff,                viewerOnly: true },
  { id: 'report',    label: 'Report',       icon: Flag,     danger: true, viewerOnly: true },
];

/**
 * Three-dot post menu. Renders via React Portal so it escapes any
 * ancestor `overflow: hidden` (the cause of the original "menu doesn't
 * appear" bug). Position is calculated from the trigger button's bounding
 * rect each time the menu opens, anchored top-right of the button.
 *
 * Closing rules:
 *   - Click outside the dropdown
 *   - Click a menu item (after the action runs)
 *   - Press Escape
 *   - Page scrolls (so the menu doesn't float over the wrong card)
 */
export default function PostMenu({ postId, isOwn, onDeleted, authToken }: PostMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; right: number }>({ top: 0, right: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  // SSR guard — createPortal requires document.body, which doesn't
  // exist during server render. Flip to true after mount.
  const [canPortal, setCanPortal] = useState(false);
  useEffect(() => { setCanPortal(true); }, []);

  const openMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const rect = btnRef.current?.getBoundingClientRect();
    if (!rect) return;
    setCoords({
      top: rect.bottom + 4,
      right: Math.max(8, window.innerWidth - rect.right),
    });
    setOpen(true);
  };

  // Close on outside pointerdown / Escape / scroll
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t?.closest('.post-menu-dropdown') && !t?.closest('.post-menu-trigger')) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    const onScroll = () => setOpen(false);
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open]);

  const handleAction = async (id: string) => {
    setOpen(false);
    switch (id) {
      case 'copy-link': {
        const url = `${window.location.origin}/post/${postId}`;
        try {
          await navigator.clipboard.writeText(url);
          toast.success('Link copied');
        } catch {
          toast.error('Could not copy link');
        }
        break;
      }
      case 'edit':
        router.push(`/write-editor-page?post=${postId}`);
        break;
      case 'delete': {
        if (!confirm('Delete this post? This cannot be undone.')) return;
        try {
          const res = await fetch('/api/user/posts', {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
            },
            body: JSON.stringify({ id: postId }),
          });
          if (!res.ok) throw new Error();
          toast.success('Post deleted');
          onDeleted?.(postId);
        } catch {
          toast.error('Failed to delete post');
        }
        break;
      }
      case 'hide':
        toast.success("OK, we'll show you fewer posts like this");
        // TODO: persist a "hidden_post" row when that table exists
        break;
      case 'report':
        toast.success('Thanks for reporting. We\'ll review this post.');
        // TODO: write to a moderation queue table when that exists
        break;
    }
  };

  const visibleItems = ITEMS.filter((i) => {
    if (i.ownerOnly && !isOwn) return false;
    if (i.viewerOnly && isOwn) return false;
    return true;
  });

  return (
    <>
      <button
        ref={btnRef}
        onClick={openMenu}
        className="post-menu-trigger btn-ghost w-8 h-8 p-0"
        aria-label="Post options"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <MoreHorizontal size={16} />
      </button>

      {open && canPortal && createPortal(
        <>
          {/* Invisible full-screen layer catches outside taps even where
              the page content has its own pointer handlers. */}
          <div
            className="fixed inset-0 z-[9998]"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div
            role="menu"
            className="post-menu-dropdown fixed z-[9999] bg-card border border-border rounded-xl shadow-modal py-1 min-w-[180px] animate-scale-in"
            style={{ top: coords.top, right: coords.right }}
          >
            {visibleItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  role="menuitem"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAction(item.id);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-semibold text-left transition-colors hover:bg-muted ${
                    item.danger ? 'text-negative hover:bg-negative-bg' : 'text-foreground'
                  }`}
                >
                  <Icon size={15} className={item.danger ? 'text-negative' : 'text-muted-foreground'} />
                  {item.label}
                </button>
              );
            })}
          </div>
        </>,
        document.body,
      )}
    </>
  );
}

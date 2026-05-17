'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X, Repeat2, Loader2 } from 'lucide-react';
import AppImage from '@/components/ui/AppImage';
import type { MockPost } from '@/lib/mockData';

interface ReshareSheetProps {
  /** The post being reshared (the embedded preview source). */
  post: MockPost;
  open: boolean;
  onClose: () => void;
  /** Async submitter — should resolve once the server has confirmed the
   *  reshare. The sheet stays open with a spinner until this resolves. */
  onSubmit: (thought: string) => Promise<void> | void;
}

const MAX_THOUGHT = 500;

/**
 * Bottom sheet that opens after a left-swipe-to-reshare. The author types
 * an optional commentary; pressing Post sends it through onSubmit. An
 * empty thought is allowed — that's a "quick reshare" with no quote.
 */
export default function ReshareSheet({ post, open, onClose, onSubmit }: ReshareSheetProps) {
  const [thought, setThought] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus the textarea on open so the mobile keyboard pops up immediately
  useEffect(() => {
    if (open) {
      setThought('');
      // small delay so the slide-in animation finishes before keyboard
      // tries to grab focus (avoids jank on iOS)
      const t = setTimeout(() => textareaRef.current?.focus(), 120);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Close on Escape; lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(thought.trim());
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60] bg-foreground/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal
        aria-label="Reshare with thoughts"
        className="fixed inset-x-0 bottom-0 z-[61] bg-card rounded-t-2xl shadow-modal animate-slide-up"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 1rem)' }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-2.5 pb-1.5">
          <div className="w-9 h-1 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-2">
          <div className="flex items-center gap-2">
            <Repeat2 size={16} className="text-primary" />
            <h2 className="text-sm font-bold text-foreground">Reshare with thoughts</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Composer */}
        <div className="px-4 pb-3">
          <textarea
            ref={textareaRef}
            value={thought}
            onChange={(e) => setThought(e.target.value.slice(0, MAX_THOUGHT))}
            placeholder="Add your take… (optional)"
            rows={3}
            className="input-field w-full resize-none text-sm"
          />
          <p className="text-[11px] text-muted-foreground text-right mt-1">
            {thought.length} / {MAX_THOUGHT}
          </p>
        </div>

        {/* Quoted original */}
        <div className="mx-4 mb-4 p-3 rounded-xl border border-border bg-muted/40">
          <div className="flex items-center gap-2 mb-1.5">
            {post.author.avatarUrl ? (
              <AppImage
                src={post.author.avatarUrl}
                alt={post.author.displayName}
                width={20}
                height={20}
                className="w-5 h-5 rounded-full object-cover border border-border"
              />
            ) : (
              <div className="w-5 h-5 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[8px] font-bold text-primary">
                {post.author.displayName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <span className="text-xs font-bold text-foreground truncate">{post.author.displayName}</span>
            <span className="text-xs text-muted-foreground shrink-0">@{post.author.username}</span>
          </div>
          {post.title && (
            <p className="text-xs font-bold text-foreground line-clamp-1 mb-0.5">{post.title}</p>
          )}
          <p className="text-xs text-muted-foreground line-clamp-2">{post.excerpt}</p>
        </div>

        {/* Submit */}
        <div className="px-4">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="btn-primary w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Sharing…
              </>
            ) : (
              <>
                <Repeat2 size={14} />
                {thought.trim() ? 'Reshare with thoughts' : 'Quick reshare'}
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}

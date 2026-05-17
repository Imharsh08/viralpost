'use client';

import React, { useState, useRef } from 'react';
import { MessageCircle, Send, Trash2, Loader2, Sparkles, Heart, CornerDownRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import AppImage from '@/components/ui/AppImage';
import { toast } from 'sonner';
import Link from 'next/link';
import { formatCount } from '@/lib/formatCount';

interface CommentUser {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  is_verified: boolean;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  likes_count: number;
  parent_comment_id: string | null;
  is_liked?: boolean;
  users: CommentUser;
  replies?: Comment[];
}

interface CommentSectionProps {
  postId: string;
  commentCount: number;
  onCountChange?: (count: number) => void;
  /** Controlled open state */
  open: boolean;
  onToggle: () => void;
  /** true = render only the expanded panel (no button), false = render only the button */
  renderPanelOnly: boolean;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function CommentSection({
  postId, commentCount, onCountChange, open, onToggle, renderPanelOnly,
}: CommentSectionProps) {
  const { user, session } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [text, setText] = useState('');
  const [count, setCount] = useState(commentCount);
  // The id of the comment being replied to (null = no reply form open)
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);
  // True when the server returned 401 — viewer must sign in before the
  // comment thread is loaded. Counts stay visible regardless.
  const [gated, setGated] = useState(false);
  const loadedRef = useRef(false);

  const authHeader = session ? `Bearer ${session.access_token}` : '';

  const loadComments = async () => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    setLoading(true);
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        // Auth lets the server fill in `is_liked` per comment AND is now
        // required for the server to return any comments at all.
        headers: session ? { Authorization: authHeader } : {},
      });
      if (res.status === 401) {
        // Anonymous viewer — show sign-in CTA in place of the thread.
        // We DON'T reset loadedRef here so the panel stays in gated state
        // until the page reloads (after sign-in). Once they refresh, the
        // session is present and the thread loads.
        setGated(true);
        setComments([]);
        return;
      }
      const data = await res.json();
      setComments(data.comments ?? []);
      setGated(false);
    } catch {
      toast.error('Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = () => {
    if (!open) loadComments();
    onToggle();
  };

  const bumpCount = (delta: number) => {
    const next = Math.max(0, count + delta);
    setCount(next);
    onCountChange?.(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    if (!session) { toast.error('Sign in to comment'); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: authHeader },
        body: JSON.stringify({ content: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setComments((prev) => [...prev, { ...data.comment, replies: [] }]);
      bumpCount(1);
      setText('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReplySubmit = async (parentId: string) => {
    if (!replyText.trim()) return;
    if (!session) { toast.error('Sign in to reply'); return; }
    setReplySubmitting(true);
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: authHeader },
        body: JSON.stringify({ content: replyText, parent_comment_id: parentId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      // Append the new reply under its parent
      setComments((prev) => prev.map((c) =>
        c.id === parentId ? { ...c, replies: [...(c.replies ?? []), data.comment] } : c
      ));
      bumpCount(1);
      setReplyText('');
      setReplyingTo(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to post reply');
    } finally {
      setReplySubmitting(false);
    }
  };

  const handleDelete = async (commentId: string, parentId: string | null) => {
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: authHeader },
        body: JSON.stringify({ commentId }),
      });
      if (!res.ok) throw new Error();
      if (parentId) {
        // Reply deletion: remove just the one reply
        setComments((prev) => prev.map((c) =>
          c.id === parentId
            ? { ...c, replies: (c.replies ?? []).filter((r) => r.id !== commentId) }
            : c
        ));
        bumpCount(-1);
      } else {
        // Top-level deletion: also removes all replies (cascade in DB),
        // adjust the count accordingly.
        const removed = comments.find((c) => c.id === commentId);
        const replyCount = removed?.replies?.length ?? 0;
        setComments((prev) => prev.filter((c) => c.id !== commentId));
        bumpCount(-(1 + replyCount));
      }
    } catch {
      toast.error('Failed to delete comment');
    }
  };

  const handleLikeToggle = async (commentId: string, parentId: string | null, currentlyLiked: boolean) => {
    if (!session) { toast.error('Sign in to like comments'); return; }
    const optimisticDelta = currentlyLiked ? -1 : 1;
    // Optimistic UI: flip immediately
    setComments((prev) => prev.map((c) => {
      if (parentId == null && c.id === commentId) {
        return { ...c, is_liked: !currentlyLiked, likes_count: Math.max(0, c.likes_count + optimisticDelta) };
      }
      if (parentId && c.id === parentId) {
        return {
          ...c,
          replies: (c.replies ?? []).map((r) =>
            r.id === commentId
              ? { ...r, is_liked: !currentlyLiked, likes_count: Math.max(0, r.likes_count + optimisticDelta) }
              : r
          ),
        };
      }
      return c;
    }));

    try {
      const res = await fetch(`/api/comments/${commentId}/like`, {
        method: currentlyLiked ? 'DELETE' : 'POST',
        headers: { Authorization: authHeader },
      });
      if (!res.ok) throw new Error();
    } catch {
      // Rollback
      setComments((prev) => prev.map((c) => {
        if (parentId == null && c.id === commentId) {
          return { ...c, is_liked: currentlyLiked, likes_count: Math.max(0, c.likes_count - optimisticDelta) };
        }
        if (parentId && c.id === parentId) {
          return {
            ...c,
            replies: (c.replies ?? []).map((r) =>
              r.id === commentId
                ? { ...r, is_liked: currentlyLiked, likes_count: Math.max(0, r.likes_count - optimisticDelta) }
                : r
            ),
          };
        }
        return c;
      }));
      toast.error('Failed to update like');
    }
  };

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || '';
  const avatarUrl = user?.user_metadata?.avatar_url || '';
  const initials = displayName.slice(0, 2).toUpperCase();

  // Button-only mode (sits in the engagement row)
  if (!renderPanelOnly) {
    return (
      <button
        onClick={handleToggle}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 active:scale-95 ${
          open ? 'text-primary bg-secondary' : 'text-muted-foreground hover:text-primary hover:bg-secondary'
        }`}
      >
        <MessageCircle size={14} className={open ? 'fill-primary/20' : ''} />
        <span className="font-mono tabular-nums">{formatCount(count)}</span>
      </button>
    );
  }

  // Panel-only mode (renders below the engagement row)
  if (!open) return null;

  // Anonymous / gated state: the comments list is private to signed-in
  // viewers. Show a single CTA panel — no composer, no skeleton, no list.
  // The count badge on the toggle button stays accurate because it comes
  // from the `commentCount` prop, not from list length.
  if (!session || gated) {
    return (
      <div className="mt-3 pt-3 border-t border-border">
        <div className="flex flex-col items-center text-center py-6 px-4 rounded-xl bg-muted/40 border border-dashed border-border">
          <div className="w-10 h-10 rounded-2xl bg-secondary flex items-center justify-center mb-2.5">
            <MessageCircle size={18} className="text-primary" />
          </div>
          <p className="text-sm font-bold text-foreground mb-1">
            {count > 0
              ? `Sign in to see what ${count.toLocaleString()} ${count === 1 ? 'person is' : 'people are'} saying`
              : 'Sign in to join the conversation'}
          </p>
          <p className="text-xs text-muted-foreground mb-3 max-w-xs">
            Comments are visible to signed-in members only.
          </p>
          <Link
            href="/sign-up-login-screen"
            className="btn-primary text-sm px-4 py-2"
          >
            Sign in to view
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 pt-3 border-t border-border">
      {/* Comment input */}
      {session ? (
        <form onSubmit={handleSubmit} className="flex gap-2.5 mb-4">
          <div className="shrink-0">
            {avatarUrl ? (
              <AppImage src={avatarUrl} alt={displayName} width={32} height={32}
                className="w-8 h-8 rounded-full object-cover border border-border" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                {initials}
              </div>
            )}
          </div>
          <div className="flex-1 flex gap-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e as any); } }}
              placeholder="Write a comment… (Enter to post)"
              rows={1}
              maxLength={500}
              className="input-field flex-1 resize-none py-2 text-sm min-h-[38px]"
            />
            <button
              type="submit"
              disabled={submitting || !text.trim()}
              className="btn-primary px-3 py-2 shrink-0 self-end disabled:opacity-50"
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </div>
        </form>
      ) : (
        <div className="mb-4 px-3 py-2.5 rounded-xl bg-muted text-sm text-muted-foreground flex items-center justify-between">
          <span>Sign in to join the conversation</span>
          <Link href="/sign-up-login-screen" className="text-primary font-semibold hover:underline text-xs">Sign in →</Link>
        </div>
      )}

      {/* Comments list */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2].map((i) => (
            <div key={i} className="flex gap-2.5 animate-pulse">
              <div className="w-8 h-8 rounded-full bg-muted shrink-0" />
              <div className="flex-1"><div className="h-3 bg-muted rounded w-24 mb-1.5" /><div className="h-3 bg-muted rounded w-full" /></div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">No comments yet — be the first!</p>
      ) : (
        <div className="flex flex-col gap-3">
          {comments.map((comment) => (
            <CommentRow
              key={comment.id}
              comment={comment}
              parentId={null}
              currentUserId={user?.id}
              isReplying={replyingTo === comment.id}
              replyText={replyText}
              setReplyText={setReplyText}
              replySubmitting={replySubmitting}
              onStartReply={() => {
                if (!session) { toast.error('Sign in to reply'); return; }
                setReplyingTo(comment.id);
                setReplyText('');
              }}
              onCancelReply={() => { setReplyingTo(null); setReplyText(''); }}
              onSubmitReply={() => handleReplySubmit(comment.id)}
              onDelete={() => handleDelete(comment.id, null)}
              onLikeToggle={() => handleLikeToggle(comment.id, null, !!comment.is_liked)}
              onReplyDelete={(replyId) => handleDelete(replyId, comment.id)}
              onReplyLikeToggle={(replyId, liked) => handleLikeToggle(replyId, comment.id, liked)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── A single top-level comment + its replies ── */

interface CommentRowProps {
  comment: Comment;
  parentId: string | null;
  currentUserId: string | undefined;
  isReplying: boolean;
  replyText: string;
  setReplyText: (s: string) => void;
  replySubmitting: boolean;
  onStartReply: () => void;
  onCancelReply: () => void;
  onSubmitReply: () => void;
  onDelete: () => void;
  onLikeToggle: () => void;
  onReplyDelete?: (replyId: string) => void;
  onReplyLikeToggle?: (replyId: string, liked: boolean) => void;
}

function CommentRow({
  comment, currentUserId,
  isReplying, replyText, setReplyText, replySubmitting,
  onStartReply, onCancelReply, onSubmitReply,
  onDelete, onLikeToggle, onReplyDelete, onReplyLikeToggle,
}: CommentRowProps) {
  return (
    <div className="flex flex-col">
      <CommentBody
        comment={comment}
        currentUserId={currentUserId}
        canReply
        onReply={onStartReply}
        onDelete={onDelete}
        onLikeToggle={onLikeToggle}
      />

      {/* Reply composer (inline) */}
      {isReplying && (
        <div className="ml-10 mt-2 flex gap-2">
          <textarea
            value={replyText}
            autoFocus
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (replyText.trim() && !replySubmitting) onSubmitReply();
              }
              if (e.key === 'Escape') onCancelReply();
            }}
            placeholder={`Reply to @${comment.users?.username ?? 'them'}…`}
            rows={1}
            maxLength={500}
            className="input-field flex-1 resize-none py-2 text-sm min-h-[36px]"
          />
          <div className="flex gap-1 self-end">
            <button
              onClick={onSubmitReply}
              disabled={replySubmitting || !replyText.trim()}
              className="btn-primary px-3 py-1.5 text-xs disabled:opacity-50"
            >
              {replySubmitting ? <Loader2 size={12} className="animate-spin" /> : 'Reply'}
            </button>
            <button
              onClick={onCancelReply}
              className="btn-ghost px-3 py-1.5 text-xs text-muted-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Replies — indented 1 level (PRD §6.8 CM-02) */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="ml-10 mt-3 flex flex-col gap-3 border-l border-border pl-3">
          {comment.replies.map((reply) => (
            <div key={reply.id} className="flex gap-1.5">
              <CornerDownRight size={11} className="text-muted-foreground mt-2 shrink-0" />
              <div className="flex-1">
                <CommentBody
                  comment={reply}
                  currentUserId={currentUserId}
                  canReply={false}
                  onDelete={() => onReplyDelete?.(reply.id)}
                  onLikeToggle={() => onReplyLikeToggle?.(reply.id, !!reply.is_liked)}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── The actual rendered card for one comment (no nesting logic) ── */

interface CommentBodyProps {
  comment: Comment;
  currentUserId: string | undefined;
  canReply: boolean;
  onReply?: () => void;
  onDelete: () => void;
  onLikeToggle: () => void;
}

function CommentBody({ comment, currentUserId, canReply, onReply, onDelete, onLikeToggle }: CommentBodyProps) {
  return (
    <div className="flex gap-2.5 group/comment">
      <div className="shrink-0">
        {comment.users?.avatar_url ? (
          <AppImage src={comment.users.avatar_url} alt={comment.users.display_name} width={32} height={32}
            className="w-8 h-8 rounded-full object-cover border border-border" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary">
            {comment.users?.display_name?.slice(0, 2).toUpperCase()}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <Link
            href={`/u/${comment.users?.username ?? ''}`}
            className="text-xs font-bold text-foreground hover:text-primary transition-colors"
          >
            {comment.users?.display_name}
          </Link>
          {comment.users?.is_verified && <Sparkles size={10} className="text-primary fill-primary/30" />}
          <span className="text-xs text-muted-foreground">·</span>
          <span className="text-xs text-muted-foreground">{timeAgo(comment.created_at)}</span>
          {currentUserId === comment.users?.id && (
            <button
              onClick={onDelete}
              className="ml-auto opacity-0 group-hover/comment:opacity-100 transition-opacity text-muted-foreground hover:text-negative p-0.5 rounded"
              aria-label="Delete comment"
            >
              <Trash2 size={11} />
            </button>
          )}
        </div>
        <p className="text-sm text-foreground/90 leading-relaxed break-words">{comment.content}</p>

        {/* Action row: like + reply */}
        <div className="flex items-center gap-1 mt-1">
          <button
            onClick={onLikeToggle}
            className={`flex items-center gap-1 px-1.5 py-1 rounded-md text-xs font-semibold transition-all duration-150 active:scale-95 ${
              comment.is_liked
                ? 'text-negative bg-negative-bg'
                : 'text-muted-foreground hover:text-negative hover:bg-negative-bg'
            }`}
          >
            <Heart size={11} className={comment.is_liked ? 'fill-negative' : ''} />
            <span className="font-mono tabular-nums">{(comment.likes_count ?? 0) > 0 ? formatCount(comment.likes_count) : ''}</span>
          </button>
          {canReply && onReply && (
            <button
              onClick={onReply}
              className="px-1.5 py-1 rounded-md text-xs font-semibold text-muted-foreground hover:text-primary hover:bg-secondary transition-colors"
            >
              Reply
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

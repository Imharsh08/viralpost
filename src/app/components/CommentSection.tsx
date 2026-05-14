'use client';

import React, { useState, useRef } from 'react';
import { MessageCircle, Send, Trash2, Loader2, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import AppImage from '@/components/ui/AppImage';
import { toast } from 'sonner';
import Link from 'next/link';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  likes_count: number;
  users: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string;
    is_verified: boolean;
  };
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
  const loadedRef = useRef(false);

  const authHeader = session ? `Bearer ${session.access_token}` : '';

  const loadComments = async () => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    setLoading(true);
    try {
      const res = await fetch(`/api/posts/${postId}/comments`);
      const data = await res.json();
      setComments(data.comments ?? []);
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
      setComments((prev) => [...prev, data.comment]);
      const newCount = count + 1;
      setCount(newCount);
      onCountChange?.(newCount);
      setText('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: authHeader },
        body: JSON.stringify({ commentId }),
      });
      if (!res.ok) throw new Error();
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      const newCount = Math.max(0, count - 1);
      setCount(newCount);
      onCountChange?.(newCount);
    } catch {
      toast.error('Failed to delete comment');
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
        <span className="font-mono tabular-nums">{count.toLocaleString()}</span>
      </button>
    );
  }

  // Panel-only mode (renders below the engagement row)
  if (!open) return null;

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
            <div key={comment.id} className="flex gap-2.5 group/comment">
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
                  <span className="text-xs font-bold text-foreground">{comment.users?.display_name}</span>
                  {comment.users?.is_verified && <Sparkles size={10} className="text-primary fill-primary/30" />}
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className="text-xs text-muted-foreground">{timeAgo(comment.created_at)}</span>
                  {user?.id === comment.users?.id && (
                    <button
                      onClick={() => handleDelete(comment.id)}
                      className="ml-auto opacity-0 group-hover/comment:opacity-100 transition-opacity text-muted-foreground hover:text-negative p-0.5 rounded"
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
                <p className="text-sm text-foreground/90 leading-relaxed break-words">{comment.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FileText, Loader2, PenSquare, Trash2, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Draft {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  tags: string[];
  created_at: string;
}

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

export default function DraftsClient() {
  const router = useRouter();
  const { user, session } = useAuth();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      router.push('/sign-up-login-screen');
      return;
    }
    if (!session) return;

    fetch('/api/user/posts?filter=drafts', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then((r) => r.json())
      .then((data) => setDrafts(data.posts ?? []))
      .catch(() => toast.error('Failed to load drafts'))
      .finally(() => setLoading(false));
  }, [user, session]);

  const handleDelete = async (id: string) => {
    if (!session) return;
    setDeleting(id);
    try {
      const res = await fetch('/api/user/posts', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error();
      setDrafts((prev) => prev.filter((d) => d.id !== id));
      toast.success('Draft deleted');
    } catch {
      toast.error('Failed to delete draft');
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-16 flex justify-center">
        <Loader2 size={28} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Drafts</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {drafts.length === 0 ? 'No drafts yet' : `${drafts.length} unpublished ${drafts.length === 1 ? 'post' : 'posts'}`}
          </p>
        </div>
        <Link href="/write-editor-page" className="btn-primary">
          <PenSquare size={15} />
          New Post
        </Link>
      </div>

      {drafts.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
            <FileText size={26} className="text-primary" />
          </div>
          <h3 className="text-base font-bold text-foreground mb-1">No drafts saved</h3>
          <p className="text-sm text-muted-foreground mb-5">
            Drafts auto-save every 30 seconds while you write. Start a post and we'll keep it safe.
          </p>
          <Link href="/write-editor-page" className="btn-primary">
            <PenSquare size={15} />
            Start writing
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {drafts.map((d) => (
            <div key={d.id} className="card p-4 hover:shadow-md transition-shadow group">
              <div className="flex items-start justify-between gap-3">
                <Link
                  href={`/write-editor-page?draft=${d.id}`}
                  className="flex-1 min-w-0"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                      Draft
                    </span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock size={11} />
                      Edited {timeAgo(d.created_at)}
                    </span>
                  </div>
                  {d.title && (
                    <h3 className="text-base font-bold text-foreground mb-1 group-hover:text-primary transition-colors line-clamp-1">
                      {d.title}
                    </h3>
                  )}
                  <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                    {d.excerpt || d.content?.slice(0, 200) || '(empty draft)'}
                  </p>
                  {d.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {d.tags.slice(0, 3).map((t) => (
                        <span key={t} className="text-xs text-muted-foreground">
                          #{t.replace(/^#+/, '')}
                        </span>
                      ))}
                    </div>
                  )}
                </Link>

                <button
                  onClick={() => handleDelete(d.id)}
                  disabled={deleting === d.id}
                  className="btn-ghost w-9 h-9 p-0 text-muted-foreground hover:text-negative shrink-0"
                  aria-label="Delete draft"
                >
                  {deleting === d.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

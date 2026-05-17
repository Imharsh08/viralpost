'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import EditorToolbar from './EditorToolbar';
import EditorTextarea from './EditorTextarea';
import AiEnhancementPanel from './AiEnhancementPanel';
import EditorSidebar from './EditorSidebar';
import PublishBar from './PublishBar';
import CoverImageUpload from './CoverImageUpload';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { FileText, Check, Loader2 } from 'lucide-react';

export type EditorMode = 'draft' | 'ai-loading' | 'ai-result' | 'publishing';

export interface AiResult {
  enhanced_text: string;
  hashtags: string[];
  /** True when the server fell back to the rule-based mock because no
      ANTHROPIC_API_KEY is set or Claude returned invalid JSON. The UI
      uses this to warn the user that they didn't get the real rewrite. */
  mock?: boolean;
}

export default function WriteEditorClient() {
  const { session } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  // ?post=ID loads any existing post (draft or published). ?draft=ID is
  // the legacy alias from before published-edit was supported.
  const editPostId = searchParams.get('post') ?? searchParams.get('draft');

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mode, setMode] = useState<EditorMode>('draft');
  const [aiResult, setAiResult] = useState<AiResult | null>(null);
  const [selectedHashtags, setSelectedHashtags] = useState<string[]>([]);
  const [activeContent, setActiveContent] = useState<'original' | 'enhanced'>('original');
  const [coverImage, setCoverImage] = useState<string | null>(null);
  // Existing post being edited. Holds the row id whether it's still a draft
  // or already published. isPublished tracks the source state so we don't
  // accidentally unpublish on autosave.
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [isPublished, setIsPublished] = useState(false);
  const [autosaveState, setAutosaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  // Load an existing post (draft OR published) if ?post=ID or ?draft=ID is set
  useEffect(() => {
    if (!editPostId || !session) return;
    fetch(`/api/posts/${editPostId}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (!data.post) {
          toast.error('Post not found');
          return;
        }
        setEditingPostId(data.post.id);
        setIsPublished(!!data.post.published_at);
        setTitle(data.post.title ?? '');
        setContent(data.post.content ?? '');
        setSelectedHashtags(data.post.tags ?? []);
        setCoverImage(data.post.featured_image_url ?? null);
        toast.success(data.post.published_at ? 'Editing published post' : 'Draft loaded');
      })
      .catch(() => toast.error('Could not load post'));
  }, [editPostId, session]);

  // Auto-save every 30s while editing (PRD §6.3). For published posts we
  // autosave with status='published' so the post stays live; for drafts
  // we save as 'draft'.
  const autosaveLatest = useRef({ title, content, selectedHashtags, coverImage, editingPostId, isPublished, session });
  useEffect(() => {
    autosaveLatest.current = { title, content, selectedHashtags, coverImage, editingPostId, isPublished, session };
  });

  useEffect(() => {
    const interval = setInterval(async () => {
      const cur = autosaveLatest.current;
      if (!cur.session) return;
      if (!cur.content || cur.content.trim().length < 1) return;
      // Only autosave while actively drafting — skip while AI is running or publishing
      if (mode !== 'draft') return;

      setAutosaveState('saving');
      try {
        const res = await fetch('/api/posts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${cur.session.access_token}`,
          },
          body: JSON.stringify({
            id: cur.editingPostId,
            title: cur.title,
            content: cur.content,
            tags: cur.selectedHashtags,
            featured_image_url: cur.coverImage,
            status: cur.isPublished ? 'published' : 'draft',
          }),
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!cur.editingPostId && data.id) setEditingPostId(data.id);
        setAutosaveState('saved');
        setLastSavedAt(new Date());
      } catch {
        setAutosaveState('idle');
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [mode]);

  const charCount = content.length;
  const maxChars = 2000;
  const isOverLimit = charCount > maxChars;
  const isTooShort = charCount < 50;

  const handleEnhance = useCallback(async () => {
    if (isTooShort) {
      toast.error('Write at least 50 characters before enhancing');
      return;
    }
    if (isOverLimit) {
      toast.error('Your post exceeds the 2,000 character limit');
      return;
    }

    setMode('ai-loading');

    try {
      const res = await fetch('/api/ai/enhance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Optional auth: lets the server look up the user's niche tags
          // to tailor tone/hashtags. Anonymous users still work fine.
          ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ text: content, title }),
      });

      if (!res.ok) throw new Error('Enhancement request failed');

      const result: AiResult = await res.json();
      setAiResult(result);
      setSelectedHashtags(result.hashtags);
      setActiveContent('enhanced');
      setMode('ai-result');
      // If the server fell back to the mock, warn the user — they probably
      // expected the real Claude rewrite and the output will look basic.
      if (result.mock) {
        toast.warning(
          'AI service unavailable — used a basic format instead. Try again in a moment.',
          { duration: 6000 },
        );
      } else {
        toast.success('AI enhancement complete! Review and publish when ready.');
      }
    } catch {
      setMode('draft');
      toast.error('Enhancement failed. Please try again.');
    }
  }, [content, title, session, isTooShort, isOverLimit]);

  const handlePublish = async (status: 'published' | 'draft') => {
    if (!session) {
      toast.error('You must be signed in to publish');
      router.push('/sign-up-login-screen');
      return;
    }
    setMode('publishing');

    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          id: editingPostId,
          title,
          content,
          ai_enhanced_text: aiResult?.enhanced_text,
          is_ai_enhanced: !!aiResult,
          tags: selectedHashtags,
          featured_image_url: coverImage,
          status,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save post');
      }

      // Reset editor
      setTitle('');
      setContent('');
      setAiResult(null);
      setSelectedHashtags([]);
      setActiveContent('original');
      setCoverImage(null);
      setEditingPostId(null);
      setIsPublished(false);
      setMode('draft');

      if (status === 'published') {
        const msg = isPublished ? 'Post updated' : 'Post published! You earned +50 bonus points';
        toast.success(msg);
        router.push('/');
      } else {
        toast.success('Draft saved successfully');
      }
    } catch (error: any) {
      setMode('draft');
      toast.error(error.message || 'Failed to save post. Please try again.');
    }
  };

  const handleResetToOriginal = () => {
    setActiveContent('original');
  };

  const handleUseEnhanced = () => {
    setContent(aiResult?.enhanced_text || content);
    setMode('draft');
    setAiResult(null);
    toast.success('Enhanced content applied to your editor');
  };

  return (
    // On mobile, the PublishBar lives at the bottom of the viewport
    // (fixed). Pad the bottom of the editor so the editor textarea isn't
    // hidden beneath it. The bottom-nav itself already adds h-16 spacer,
    // so we only need to clear the publish-bar's height (~64px).
    <div className="max-w-screen-2xl mx-auto pb-24 sm:pb-0">
      {/* Page header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {isPublished ? 'Edit Published Post' : editingPostId ? 'Continue Draft' : 'Write a Post'}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isPublished
              ? 'Changes go live as soon as you save'
              : 'Draft your content, enhance with AI, and earn from every view'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {autosaveState !== 'idle' && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {autosaveState === 'saving' ? (
                <>
                  <Loader2 size={11} className="animate-spin" />
                  Saving draft…
                </>
              ) : (
                <>
                  <Check size={11} className="text-positive" />
                  Saved{lastSavedAt ? ` ${lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                </>
              )}
            </span>
          )}
          {session && (
            <Link href="/drafts" className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-primary transition-colors">
              <FileText size={14} />
              My Drafts
            </Link>
          )}
        </div>
      </div>

      {/* Sticky action bar — stays visible while you scroll */}
      <PublishBar
        mode={mode}
        isTooShort={isTooShort}
        isOverLimit={isOverLimit}
        hasContent={charCount > 0}
        charCount={charCount}
        maxChars={maxChars}
        onEnhance={handleEnhance}
        onPublish={handlePublish}
        onUseEnhanced={handleUseEnhanced}
        onKeepOriginal={handleResetToOriginal}
        selectedHashtags={selectedHashtags}
      />

      <div className="flex gap-6 xl:gap-8 items-start mt-4">
        {/* Main editor column */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          {/* Title input */}
          <div className="card p-4">
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
              Post Title <span className="text-muted-foreground/60 font-normal normal-case">(optional)</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Add a compelling title to boost discoverability..."
              className="w-full text-lg font-bold text-foreground bg-transparent border-none outline-none placeholder:text-muted-foreground/50 placeholder:font-normal placeholder:text-base"
              maxLength={120}
            />
          </div>

          {/* Cover image */}
          <CoverImageUpload value={coverImage} onChange={setCoverImage} />

          {/* Toolbar */}
          <EditorToolbar />

          {/* Editor / AI result area */}
          {mode === 'ai-result' && aiResult ? (
            <AiEnhancementPanel
              originalContent={content}
              aiResult={aiResult}
              activeContent={activeContent}
              selectedHashtags={selectedHashtags}
              onToggleHashtag={(tag) => {
                setSelectedHashtags((prev) =>
                  prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
                );
              }}
              onUseEnhanced={handleUseEnhanced}
              onResetToOriginal={handleResetToOriginal}
              onReEnhance={handleEnhance}
              onEditEnhanced={(text) => setAiResult({ ...aiResult, enhanced_text: text })}
            />
          ) : (
            <EditorTextarea
              content={content}
              onChange={setContent}
              charCount={charCount}
              maxChars={maxChars}
              isOverLimit={isOverLimit}
              mode={mode}
            />
          )}

        </div>

        {/* Sidebar */}
        <aside className="hidden xl:block w-72 2xl:w-80 shrink-0">
          <EditorSidebar
            charCount={charCount}
            maxChars={maxChars}
            mode={mode}
            content={mode === 'ai-result' && aiResult ? aiResult.enhanced_text : content}
            hashtagCount={selectedHashtags.length}
          />
        </aside>
      </div>
    </div>
  );
}
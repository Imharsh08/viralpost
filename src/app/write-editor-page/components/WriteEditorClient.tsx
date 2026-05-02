'use client';

import React, { useState, useCallback } from 'react';
import EditorToolbar from './EditorToolbar';
import EditorTextarea from './EditorTextarea';
import AiEnhancementPanel from './AiEnhancementPanel';
import EditorSidebar from './EditorSidebar';
import PublishBar from './PublishBar';
import { toast } from 'sonner';

export type EditorMode = 'draft' | 'ai-loading' | 'ai-result' | 'publishing';

export interface AiResult {
  enhanced_text: string;
  hashtags: string[];
}

export default function WriteEditorClient() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mode, setMode] = useState<EditorMode>('draft');
  const [aiResult, setAiResult] = useState<AiResult | null>(null);
  const [selectedHashtags, setSelectedHashtags] = useState<string[]>([]);
  const [activeContent, setActiveContent] = useState<'original' | 'enhanced'>('original');

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

    // Backend: POST /api/ai/enhance with { text: content } — calls Gemini 1.5 Flash
    await new Promise((r) => setTimeout(r, 2200));

    const mockResult: AiResult = {
      enhanced_text: `Is your content getting ignored? Here's why — and how to fix it in 5 minutes.\n\n${content.substring(0, 120)}...\n\nMost creators make 3 critical mistakes:\n\n→ They bury the hook in paragraph 3\n→ They write for themselves, not their reader\n→ They forget to end with a question\n\nHere's the framework that changed everything for me:\n\n**A**ttention → Lead with a bold claim or surprising stat\n**I**nterest → Share the problem your reader recognizes\n**D**esire → Paint the outcome they want\n**A**ction → Ask a question that demands a reply\n\nI've used this on 47 posts. Average engagement rate? 8.3% — 4x the platform average.\n\nWhich mistake are you making right now?`,
      hashtags: ['#ContentStrategy', '#ViralContent', '#CreatorEconomy', '#Writing', '#PersonalBranding'],
    };

    setAiResult(mockResult);
    setSelectedHashtags(mockResult.hashtags);
    setActiveContent('enhanced');
    setMode('ai-result');
    toast.success('AI enhancement complete! Review and publish when ready.');
  }, [content, isTooShort, isOverLimit]);

  const handlePublish = async (status: 'published' | 'draft') => {
    setMode('publishing');
    // Backend: POST /api/posts with { title, original_text: content, ai_enhanced_text: aiResult?.enhanced_text, is_ai_enhanced: !!aiResult, tags: selectedHashtags, status }
    await new Promise((r) => setTimeout(r, 1400));
    setMode('draft');
    if (status === 'published') {
      toast.success('Post published! You earned +50 bonus points 🎉');
    } else {
      toast.success('Draft saved successfully');
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
    <div className="max-w-screen-2xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Write a Post</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Draft your content, enhance with AI, and earn from every view
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-mono tabular-nums font-semibold ${
            isOverLimit ? 'text-negative' : charCount > 1600 ? 'text-warning' : 'text-muted-foreground'
          }`}>
            {charCount.toLocaleString()} / {maxChars.toLocaleString()}
          </span>
        </div>
      </div>

      <div className="flex gap-6 xl:gap-8 items-start">
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

          {/* Publish bar */}
          <PublishBar
            mode={mode}
            isTooShort={isTooShort}
            isOverLimit={isOverLimit}
            hasContent={charCount > 0}
            onEnhance={handleEnhance}
            onPublish={handlePublish}
            selectedHashtags={selectedHashtags}
          />
        </div>

        {/* Sidebar */}
        <aside className="hidden xl:block w-72 2xl:w-80 shrink-0">
          <EditorSidebar
            charCount={charCount}
            maxChars={maxChars}
            mode={mode}
          />
        </aside>
      </div>
    </div>
  );
}
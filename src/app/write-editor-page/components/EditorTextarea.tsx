'use client';

import React from 'react';
import type { EditorMode } from './WriteEditorClient';

interface EditorTextareaProps {
  content: string;
  onChange: (value: string) => void;
  charCount: number;
  maxChars: number;
  isOverLimit: boolean;
  mode: EditorMode;
}

export default function EditorTextarea({
  content,
  onChange,
  charCount,
  maxChars,
  isOverLimit,
  mode,
}: EditorTextareaProps) {
  const progressPct = Math.min((charCount / maxChars) * 100, 100);

  return (
    <div className={`card flex flex-col transition-all duration-200 ${
      isOverLimit ? 'border-negative/60 shadow-[0_0_0_3px_rgba(220,38,38,0.08)]' : ''
    }`}>
      <textarea
        value={content}
        onChange={(e) => onChange(e.target.value)}
        disabled={mode === 'ai-loading' || mode === 'publishing'}
        placeholder={`What's on your mind? Share your insight, story, or hot take...\n\nTips for virality:\n→ Start with a bold claim or surprising stat\n→ Use short paragraphs (2–3 lines max)\n→ End with a question to drive comments\n\nHit "Make it Viral ✨" when you're ready for AI to supercharge your draft.`}
        className="w-full min-h-[320px] p-5 text-sm leading-relaxed text-foreground bg-transparent border-none outline-none resize-none placeholder:text-muted-foreground/50 disabled:opacity-60 disabled:cursor-not-allowed font-sans"
        style={{ fontFamily: 'var(--font-sans)' }}
        aria-label="Post content editor"
      />

      {/* Character progress bar */}
      <div className="px-5 pb-4 pt-2 border-t border-border">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-muted-foreground">
            {charCount < 50 && charCount > 0 && (
              <span className="text-warning font-medium">
                Write {50 - charCount} more characters to enable AI enhancement
              </span>
            )}
            {charCount >= 50 && !isOverLimit && (
              <span className="text-positive font-medium">✓ Ready for AI enhancement</span>
            )}
            {isOverLimit && (
              <span className="text-negative font-medium">
                {charCount - maxChars} characters over limit — trim your post
              </span>
            )}
          </span>
          <span className={`text-xs font-mono tabular-nums font-semibold ${
            isOverLimit ? 'text-negative' : charCount > 1600 ? 'text-warning' : 'text-muted-foreground'
          }`}>
            {charCount} / {maxChars}
          </span>
        </div>
        <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              isOverLimit ? 'bg-negative' : charCount > 1600 ? 'bg-warning' : charCount >= 50 ? 'bg-positive' : 'bg-primary'
            }`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
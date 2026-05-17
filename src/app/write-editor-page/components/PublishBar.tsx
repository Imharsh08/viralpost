'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, Send, FileText, Loader2, ChevronDown, Zap, Check, RotateCcw } from 'lucide-react';
import type { EditorMode } from './WriteEditorClient';

interface PublishBarProps {
  mode: EditorMode;
  isTooShort: boolean;
  isOverLimit: boolean;
  hasContent: boolean;
  charCount: number;
  maxChars: number;
  onEnhance: () => void;
  onPublish: (status: 'published' | 'draft') => void;
  onUseEnhanced?: () => void;
  onKeepOriginal?: () => void;
  selectedHashtags: string[];
}

export default function PublishBar({
  mode,
  isTooShort,
  isOverLimit,
  hasContent,
  charCount,
  maxChars,
  onEnhance,
  onPublish,
  onUseEnhanced,
  onKeepOriginal,
  selectedHashtags,
}: PublishBarProps) {
  const [showPublishMenu, setShowPublishMenu] = useState(false);
  const [showViralHint, setShowViralHint] = useState(false);
  const isEnhancing = mode === 'ai-loading';
  const isPublishing = mode === 'publishing';
  const canEnhance = !isTooShort && !isOverLimit && hasContent && mode === 'draft';
  const canPublish = hasContent && !isOverLimit && (mode === 'draft' || mode === 'ai-result');
  const enhanced = mode === 'ai-result';

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const seen = window.localStorage.getItem('vp_viral_hint_seen');
    if (!seen) {
      setShowViralHint(true);
      window.localStorage.setItem('vp_viral_hint_seen', '1');
      const t = setTimeout(() => setShowViralHint(false), 6000);
      return () => clearTimeout(t);
    }
  }, []);

  // Why the actions are disabled — shown as native browser tooltips
  const enhanceDisabledReason = !hasContent
    ? 'Write something first'
    : isTooShort
    ? `Need ${50 - charCount} more character${50 - charCount === 1 ? '' : 's'}`
    : isOverLimit
    ? `Over the ${maxChars.toLocaleString()}-character limit`
    : '';
  const publishDisabledReason = !hasContent
    ? 'Write something first'
    : isOverLimit
    ? `Over the ${maxChars.toLocaleString()}-character limit`
    : '';

  // Progress bar: counts the journey from 0 → 50 (unlock) → 2000 (max)
  const progressPct = Math.min(100, (charCount / maxChars) * 100);
  const progressColor = isOverLimit
    ? 'bg-negative'
    : charCount > 1600
    ? 'bg-warning'
    : charCount >= 50
    ? 'bg-positive'
    : 'bg-primary/50';

  return (
    // On mobile: stick to the BOTTOM (just above the mobile bottom nav), so
    // thumb-reachable actions stay accessible without competing with editor
    // content above. On sm+ screens: revert to the top-sticky tray that
    // sits below the global topbar.
    <div
      className="
        fixed bottom-14 inset-x-0 z-30 px-3 pt-2 pb-2 bg-background/95 backdrop-blur-md border-t border-border
        sm:static sm:bottom-auto sm:inset-x-auto sm:-mx-4 sm:px-4 sm:pt-2 sm:pb-3 sm:border-t-0 sm:border-b
        sm:sticky sm:top-16
      "
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.5rem)' }}
    >
      <div className="card p-2.5 sm:p-3 bg-gradient-to-r from-violet-50 via-purple-50 to-amber-50 border-purple-200 shadow-sm">
        <div className="flex items-center justify-between gap-2 sm:gap-3 flex-wrap">
          {/* Left: status + tags. min-w-0 lets it shrink past its content size
              so the right-side action buttons never get pushed off-screen. */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0 flex-1 basis-full sm:basis-0">
            <span
              className={`text-[11px] sm:text-xs font-mono tabular-nums font-bold shrink-0 ${
                isOverLimit
                  ? 'text-negative'
                  : charCount > 1600
                  ? 'text-warning'
                  : charCount >= 50
                  ? 'text-positive'
                  : 'text-muted-foreground'
              }`}
              aria-label={`${charCount} of ${maxChars} characters used`}
            >
              {charCount.toLocaleString()} / {maxChars.toLocaleString()}
            </span>

            {/* Slim progress bar — visual companion to the char count */}
            <div
              className="h-1 flex-1 sm:flex-none sm:w-28 min-w-[60px] max-w-[120px] sm:max-w-none rounded-full bg-muted overflow-hidden"
              role="progressbar"
              aria-valuenow={charCount}
              aria-valuemin={0}
              aria-valuemax={maxChars}
            >
              <div
                className={`h-full transition-all duration-200 ${progressColor}`}
                style={{ width: `${progressPct}%` }}
              />
            </div>

            {/* Hide the separator + status hints on mobile to free up space.
                On sm+ we restore the original look. */}
            <span className="hidden sm:inline text-muted-foreground/40">·</span>
            {selectedHashtags.length > 0 ? (
              <div className="hidden sm:flex items-center gap-1.5 flex-wrap min-w-0">
                {selectedHashtags.slice(0, 3).map((tag) => (
                  <span key={`bar-tag-${tag}`} className="badge-tag text-xs">{tag}</span>
                ))}
                {selectedHashtags.length > 3 && (
                  <span className="text-xs text-muted-foreground">+{selectedHashtags.length - 3}</span>
                )}
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
                <Zap size={12} className="text-amber-500 fill-amber-300" />
                <span className="hidden sm:inline">
                  {hasContent ? 'Earn points from every view' : 'Start writing to earn points'}
                </span>
              </div>
            )}
          </div>

          {/* Right: dominant actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 flex-wrap justify-end w-full sm:w-auto">
            {/* Use Enhanced / Keep Original — shown when AI result is ready.
                On mobile each takes equal share of the row (flex-1) and
                shows only icon + short label so both fit at 360px. */}
            {enhanced && (
              <>
                <button
                  onClick={onKeepOriginal}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-border text-xs sm:text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-150 active:scale-95"
                >
                  <RotateCcw size={14} />
                  <span>Keep <span className="hidden sm:inline">Original</span></span>
                </button>
                <button
                  onClick={onUseEnhanced}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-positive text-white text-xs sm:text-sm font-bold shadow-sm hover:opacity-90 transition-all duration-150 active:scale-95"
                >
                  <Check size={14} />
                  <span>Use <span className="hidden sm:inline">Enhanced</span></span>
                </button>
              </>
            )}

            {!enhanced && (
              <div className="relative flex-1 sm:flex-none">
                <button
                  onClick={onEnhance}
                  disabled={!canEnhance || isEnhancing}
                  title={enhanceDisabledReason || 'AI rewrite your post with a proven viral framework'}
                  className={`relative w-full sm:w-auto flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-extrabold transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-md ${
                    canEnhance
                      ? 'bg-gradient-to-r from-violet-600 via-fuchsia-600 to-amber-500 text-white hover:shadow-lg hover:scale-[1.02]'
                      : 'bg-muted text-muted-foreground'
                  } ${canEnhance && !isEnhancing ? 'animate-viral-pulse' : ''}`}
                >
                  {isEnhancing ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span className="whitespace-nowrap">Going Viral…</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} className={canEnhance ? 'fill-yellow-300 text-yellow-300' : ''} />
                      <span className="whitespace-nowrap">Make it Viral</span>
                      <span aria-hidden className="hidden sm:inline">✨</span>
                    </>
                  )}
                </button>

                {showViralHint && canEnhance && (
                  <div className="absolute bottom-full sm:bottom-auto sm:top-full right-0 mb-2 sm:mb-0 sm:mt-2 w-56 bg-foreground text-background text-xs font-medium rounded-xl px-3 py-2 shadow-modal animate-fade-in z-40">
                    <div className="absolute -bottom-1.5 sm:-top-1.5 sm:bottom-auto right-8 w-3 h-3 rotate-45 bg-foreground" />
                    Tap here — AI rewrites your post using a proven viral framework.
                  </div>
                )}
              </div>
            )}

            <div className="relative flex-1 sm:flex-none">
              <div className={`flex w-full sm:w-auto rounded-xl shadow-md transition-all duration-200 ${
                canPublish && !isPublishing
                  ? enhanced
                    ? 'shadow-primary/30 hover:shadow-lg hover:shadow-primary/40'
                    : 'shadow-emerald-500/25 hover:shadow-lg hover:shadow-emerald-500/40'
                  : ''
              }`}>
                <button
                  onClick={() => !isPublishing && canPublish && onPublish('published')}
                  disabled={!canPublish || isPublishing}
                  title={publishDisabledReason || (enhanced ? 'Publish your enhanced post' : 'Publish to the feed')}
                  className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2.5 sm:py-3 rounded-l-xl text-xs sm:text-sm font-extrabold transition-all duration-150 active:scale-95 disabled:cursor-not-allowed ${
                    !canPublish || isPublishing
                      ? 'bg-muted text-muted-foreground'
                      : enhanced
                      ? 'bg-gradient-to-r from-primary to-fuchsia-600 text-primary-foreground hover:scale-[1.02]'
                      : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:scale-[1.02]'
                  }`}
                >
                  {isPublishing ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span className="whitespace-nowrap">Publishing…</span>
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      <span>Publish</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowPublishMenu(!showPublishMenu)}
                  disabled={!canPublish || isPublishing}
                  title="More publish options"
                  className={`flex items-center justify-center w-8 sm:w-9 rounded-r-xl border-l transition-all duration-150 disabled:cursor-not-allowed active:scale-95 ${
                    !canPublish || isPublishing
                      ? 'bg-muted text-muted-foreground border-border'
                      : enhanced
                      ? 'bg-gradient-to-r from-primary to-fuchsia-600 text-primary-foreground border-white/25 hover:brightness-110'
                      : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-white/25 hover:brightness-110'
                  }`}
                  aria-label="More publish options"
                  aria-expanded={showPublishMenu}
                >
                  <ChevronDown size={14} className={`transition-transform duration-200 ${showPublishMenu ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {showPublishMenu && (
                /* On mobile the bar lives at the bottom of the screen, so
                   the menu opens UPWARD; on sm+ it opens downward as before. */
                <div className="absolute bottom-full sm:bottom-auto sm:top-full right-0 mb-2 sm:mb-0 sm:mt-2 bg-card border border-border rounded-xl shadow-modal p-1 min-w-[180px] animate-scale-in z-40">
                  <button
                    onClick={() => { onPublish('published'); setShowPublishMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-semibold text-foreground hover:bg-muted rounded-lg transition-colors text-left"
                  >
                    <Send size={14} className="text-primary" />
                    Publish now
                  </button>
                  <button
                    onClick={() => { onPublish('draft'); setShowPublishMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-muted rounded-lg transition-colors text-left"
                  >
                    <FileText size={14} />
                    Save as draft
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {isTooShort && hasContent && !isEnhancing && (
          <p className="mt-2 text-xs text-muted-foreground">
            Write {50 - charCount} more characters to unlock <span className="font-bold text-primary">Make it Viral</span>.
          </p>
        )}
        {isEnhancing && (
          <div className="mt-2 flex items-center gap-2">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={`loading-dot-${i}`}
                  className="w-1.5 h-1.5 rounded-full bg-primary"
                  style={{ animation: `bounce 1.4s ease-in-out ${i * 0.16}s infinite` }}
                />
              ))}
            </div>
            <p className="text-xs text-primary font-medium">
              Claude is rewriting your post with the AIDA viral framework…
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

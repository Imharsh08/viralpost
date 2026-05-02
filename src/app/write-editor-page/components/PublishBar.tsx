'use client';

import React, { useState } from 'react';
import { Sparkles, Send, FileText, Loader2, ChevronDown, Zap } from 'lucide-react';
import type { EditorMode } from './WriteEditorClient';

interface PublishBarProps {
  mode: EditorMode;
  isTooShort: boolean;
  isOverLimit: boolean;
  hasContent: boolean;
  onEnhance: () => void;
  onPublish: (status: 'published' | 'draft') => void;
  selectedHashtags: string[];
}

export default function PublishBar({
  mode,
  isTooShort,
  isOverLimit,
  hasContent,
  onEnhance,
  onPublish,
  selectedHashtags,
}: PublishBarProps) {
  const [showPublishMenu, setShowPublishMenu] = useState(false);
  const isEnhancing = mode === 'ai-loading';
  const isPublishing = mode === 'publishing';
  const canEnhance = !isTooShort && !isOverLimit && hasContent && mode === 'draft';
  const canPublish = hasContent && !isOverLimit && (mode === 'draft' || mode === 'ai-result');

  return (
    <div className="card p-4 bg-gradient-to-r from-violet-50/50 to-purple-50/50 border-purple-100">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Left: hashtags preview */}
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          {selectedHashtags.length > 0 ? (
            <>
              <span className="text-xs text-muted-foreground shrink-0">Tags:</span>
              {selectedHashtags.slice(0, 3).map((tag) => (
                <span key={`bar-tag-${tag}`} className="badge-tag text-xs">
                  {tag}
                </span>
              ))}
              {selectedHashtags.length > 3 && (
                <span className="text-xs text-muted-foreground">+{selectedHashtags.length - 3} more</span>
              )}
            </>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Zap size={12} className="text-amber-500" />
              <span>Publish to start earning points from ad impressions</span>
            </div>
          )}
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Make it Viral button */}
          {mode !== 'ai-result' && (
            <button
              onClick={onEnhance}
              disabled={!canEnhance || isEnhancing}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                canEnhance
                  ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-700 hover:to-purple-700 shadow-sm hover:shadow-card'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {isEnhancing ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Enhancing with AI...
                </>
              ) : (
                <>
                  <Sparkles size={15} className={canEnhance ? 'fill-yellow-300 text-yellow-300' : ''} />
                  Make it Viral ✨
                </>
              )}
            </button>
          )}

          {/* Publish dropdown */}
          <div className="relative">
            <div className="flex">
              <button
                onClick={() => !isPublishing && canPublish && onPublish('published')}
                disabled={!canPublish || isPublishing}
                className="flex items-center gap-2 px-4 py-2.5 rounded-l-xl bg-primary text-primary-foreground text-sm font-bold transition-all duration-150 hover:bg-primary/90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPublishing ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <Send size={15} />
                    Publish
                  </>
                )}
              </button>
              <button
                onClick={() => setShowPublishMenu(!showPublishMenu)}
                disabled={!canPublish || isPublishing}
                className="flex items-center justify-center w-9 rounded-r-xl bg-primary text-primary-foreground border-l border-primary-foreground/20 hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="More publish options"
              >
                <ChevronDown size={14} />
              </button>
            </div>

            {showPublishMenu && (
              <div className="absolute bottom-full right-0 mb-2 bg-card border border-border rounded-xl shadow-modal p-1 min-w-[160px] animate-scale-in z-20">
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

      {/* AI loading state overlay hint */}
      {isEnhancing && (
        <div className="mt-3 pt-3 border-t border-purple-200">
          <div className="flex items-center gap-2">
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
              Gemini AI is analyzing your content and applying AIDA framework...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
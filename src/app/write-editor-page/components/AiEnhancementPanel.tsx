'use client';

import React, { useState } from 'react';
import { Sparkles, RotateCcw, Edit3, X, Check, Plus } from 'lucide-react';
import type { AiResult } from './WriteEditorClient';

interface AiEnhancementPanelProps {
  originalContent: string;
  aiResult: AiResult;
  activeContent: 'original' | 'enhanced';
  selectedHashtags: string[];
  onToggleHashtag: (tag: string) => void;
  onUseEnhanced: () => void;
  onResetToOriginal: () => void;
  onReEnhance: () => void;
  onEditEnhanced: (text: string) => void;
}

export default function AiEnhancementPanel({
  originalContent,
  aiResult,
  activeContent,
  selectedHashtags,
  onToggleHashtag,
  onUseEnhanced,
  onResetToOriginal,
  onReEnhance,
  onEditEnhanced,
}: AiEnhancementPanelProps) {
  const [editingEnhanced, setEditingEnhanced] = useState(false);
  const [editBuffer, setEditBuffer] = useState(aiResult.enhanced_text);

  const handleSaveEdit = () => {
    onEditEnhanced(editBuffer);
    setEditingEnhanced(false);
  };

  return (
    <div className="flex flex-col gap-4 animate-slide-up">
      {/* AI result banner */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-violet-50 to-purple-50 border border-purple-200">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Sparkles size={16} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground">AI Enhancement Ready</p>
          <p className="text-xs text-muted-foreground">Review the enhanced version, edit if needed, then publish</p>
        </div>
        <button
          onClick={onReEnhance}
          className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:bg-primary/10 px-2.5 py-1.5 rounded-lg transition-colors active:scale-95"
        >
          <RotateCcw size={12} />
          Re-enhance
        </button>
      </div>

      {/* Side-by-side comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Original */}
        <div className="card flex flex-col">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
            <div className="w-2 h-2 rounded-full bg-muted-foreground/40" />
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Your Original Draft</span>
          </div>
          <div className="p-4 flex-1">
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {originalContent}
            </p>
          </div>
        </div>

        {/* Enhanced */}
        <div className="card flex flex-col border-primary/30 shadow-[0_0_0_2px_rgba(124,58,237,0.12)]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-violet-50/50">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-xs font-bold text-primary uppercase tracking-wider">AI Enhanced</span>
              <span className="badge-ai text-[10px]">
                <Sparkles size={8} />
                Viral
              </span>
            </div>
            <button
              onClick={() => {
                setEditingEnhanced(!editingEnhanced);
                setEditBuffer(aiResult.enhanced_text);
              }}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <Edit3 size={12} />
              Edit
            </button>
          </div>
          <div className="p-4 flex-1">
            {editingEnhanced ? (
              <div className="flex flex-col gap-2">
                <textarea
                  value={editBuffer}
                  onChange={(e) => setEditBuffer(e.target.value)}
                  className="w-full min-h-[240px] text-sm leading-relaxed text-foreground bg-transparent border border-border rounded-xl p-3 outline-none focus:border-primary resize-none"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveEdit}
                    className="flex items-center gap-1.5 text-xs font-semibold text-positive bg-positive-bg px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors active:scale-95"
                  >
                    <Check size={12} />
                    Save edits
                  </button>
                  <button
                    onClick={() => setEditingEnhanced(false)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-muted transition-colors active:scale-95"
                  >
                    <X size={12} />
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                {aiResult.enhanced_text}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Hashtag suggestions */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">AI Suggested Hashtags</span>
          <span className="text-xs text-muted-foreground">— click to toggle</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {aiResult.hashtags.map((tag) => {
            const isSelected = selectedHashtags.includes(tag);
            return (
              <button
                key={`hashtag-${tag}`}
                onClick={() => onToggleHashtag(tag)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 active:scale-95 ${
                  isSelected
                    ? 'bg-secondary border-primary/30 text-primary' :'bg-muted border-border text-muted-foreground hover:border-primary/30 hover:text-primary'
                }`}
              >
                {isSelected ? (
                  <Check size={10} />
                ) : (
                  <Plus size={10} />
                )}
                {tag}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {selectedHashtags.length} of {aiResult.hashtags.length} hashtags selected
        </p>
      </div>

      {/* Hint: action buttons are in the top bar */}
      <p className="text-xs text-muted-foreground text-center pb-1">
        Use the <span className="font-semibold text-positive">Use Enhanced</span> or <span className="font-semibold">Keep Original</span> buttons above to proceed.
      </p>
    </div>
  );
}
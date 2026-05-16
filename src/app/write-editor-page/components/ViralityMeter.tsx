'use client';

import React, { useMemo, useState } from 'react';
import { TrendingUp, Check, AlertCircle, X, ChevronDown, Lightbulb } from 'lucide-react';
import { computeViralityScore } from './viralityScore';

interface ViralityMeterProps {
  text: string;
  hashtagCount: number;
}

const STATUS_STYLES = {
  pass: { Icon: Check, color: 'text-positive', bg: 'bg-positive-bg', ring: 'border-emerald-200' },
  warn: { Icon: AlertCircle, color: 'text-warning', bg: 'bg-amber-50', ring: 'border-amber-200' },
  fail: { Icon: X, color: 'text-negative', bg: 'bg-negative-bg', ring: 'border-rose-200' },
};

function gradeRingColor(grade: string): string {
  if (grade === 'A+' || grade === 'A') return 'stroke-emerald-500';
  if (grade === 'B') return 'stroke-primary';
  if (grade === 'C') return 'stroke-amber-500';
  if (grade === 'D') return 'stroke-orange-500';
  return 'stroke-muted-foreground/40';
}

export default function ViralityMeter({ text, hashtagCount }: ViralityMeterProps) {
  const [expanded, setExpanded] = useState(false);

  // Recompute on every keystroke; cheap pure function
  const result = useMemo(() => computeViralityScore(text, hashtagCount), [text, hashtagCount]);

  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - result.score / 100);

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <TrendingUp size={14} className="text-primary" />
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Virality Score
          </h3>
        </div>
        {result.breakdown.length > 0 && (
          <button
            onClick={() => setExpanded((e) => !e)}
            className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            {expanded ? 'Hide tips' : 'View tips'}
            <ChevronDown size={11} className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>

      {/* Ring + verdict */}
      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          <svg width="72" height="72" viewBox="0 0 72 72">
            {/* Track */}
            <circle
              cx="36" cy="36" r={radius}
              className="stroke-muted"
              strokeWidth="6"
              fill="none"
            />
            {/* Progress */}
            <circle
              cx="36" cy="36" r={radius}
              className={`${gradeRingColor(result.grade)} transition-all duration-500`}
              strokeWidth="6"
              strokeLinecap="round"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              transform="rotate(-90 36 36)"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-extrabold text-foreground font-mono tabular-nums leading-none">
              {result.score}
            </span>
            <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">
              / 100
            </span>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-extrabold font-mono px-1.5 py-0.5 rounded ${
              result.grade === 'A+' || result.grade === 'A' ? 'bg-emerald-100 text-emerald-700'
                : result.grade === 'B' ? 'bg-secondary text-primary'
                : result.grade === 'C' ? 'bg-amber-100 text-amber-700'
                : result.grade === 'D' ? 'bg-orange-100 text-orange-700'
                : 'bg-muted text-muted-foreground'
            }`}>
              {result.grade}
            </span>
            <span className="text-sm font-bold text-foreground">{result.verdict}</span>
          </div>
          {result.breakdown.length === 0 ? (
            <p className="text-xs text-muted-foreground mt-1">
              We score your post in real-time as you write.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-1">
              {result.breakdown.filter((c) => c.status === 'pass').length} of {result.breakdown.length} criteria passing
            </p>
          )}
        </div>
      </div>

      {/* Breakdown — collapsible */}
      {expanded && result.breakdown.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border flex flex-col gap-2 animate-fade-in">
          {result.breakdown.map((c) => {
            const styles = STATUS_STYLES[c.status];
            const Icon = styles.Icon;
            return (
              <div key={c.id} className={`flex items-start gap-2 p-2 rounded-lg border ${styles.bg} ${styles.ring}`}>
                <div className={`w-5 h-5 rounded-full ${styles.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                  <Icon size={11} className={styles.color} strokeWidth={3} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-foreground">{c.label}</span>
                    <span className="text-[10px] font-mono text-muted-foreground tabular-nums shrink-0">
                      {c.score} / {c.maxScore}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-snug mt-0.5">{c.tip}</p>
                </div>
              </div>
            );
          })}

          <div className="flex items-start gap-2 mt-1 px-2 py-1.5 rounded-lg bg-violet-50/50 border border-purple-100">
            <Lightbulb size={11} className="text-primary shrink-0 mt-0.5" />
            <p className="text-[11px] text-muted-foreground leading-snug">
              Stuck below 70? Hit <strong className="text-primary">Make it Viral</strong> — AI rewrites
              your draft with hooks, paragraph rhythm, and a closing question.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

import React from 'react';
import { Zap, TrendingUp, Lightbulb, Target, BarChart2, Award } from 'lucide-react';
import type { EditorMode } from './WriteEditorClient';

interface EditorSidebarProps {
  charCount: number;
  maxChars: number;
  mode: EditorMode;
}

const viralityTips = [
  {
    id: 'tip-hook',
    icon: Target,
    title: 'Lead with a hook',
    desc: 'First 2 lines determine if readers stop scrolling. Start with a bold claim, stat, or question.',
    color: 'text-primary bg-secondary',
  },
  {
    id: 'tip-paragraphs',
    icon: BarChart2,
    title: 'Short paragraphs win',
    desc: 'Max 2–3 sentences per paragraph. White space increases read-through rate by 58%.',
    color: 'text-amber-700 bg-amber-50',
  },
  {
    id: 'tip-cta',
    icon: TrendingUp,
    title: 'End with a question',
    desc: 'Posts ending with a question get 3x more comments — comments boost algorithmic reach.',
    color: 'text-positive bg-positive-bg',
  },
  {
    id: 'tip-bullets',
    icon: Lightbulb,
    title: 'Use bullet points',
    desc: 'Lists are 40% more likely to be shared. Break complex ideas into scannable bullets.',
    color: 'text-pink-700 bg-pink-50',
  },
];

const pointsPreview = [
  { id: 'pts-first', event: 'First post bonus', pts: '+50', note: 'One-time' },
  { id: 'pts-view', event: 'Per ad view', pts: '+1', note: 'Per user/day' },
  { id: 'pts-like', event: 'Per like received', pts: '+1', note: 'Uncapped' },
  { id: 'pts-milestone', event: '1k views milestone', pts: '+100', note: 'Per post' },
];

export default function EditorSidebar({ charCount, maxChars, mode }: EditorSidebarProps) {
  const progressPct = Math.min((charCount / maxChars) * 100, 100);

  return (
    <div className="flex flex-col gap-5">
      {/* Writing progress */}
      <div className="card p-4">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
          Writing Progress
        </h3>
        <div className="flex flex-col gap-3">
          {[
            { id: 'prog-chars', label: 'Characters written', value: charCount, max: maxChars, pct: progressPct },
            { id: 'prog-words', label: 'Approx. words', value: Math.ceil(charCount / 5), max: 400, pct: Math.min((Math.ceil(charCount / 5) / 400) * 100, 100) },
          ].map((item) => (
            <div key={item.id}>
              <div className="flex justify-between mb-1">
                <span className="text-xs text-muted-foreground">{item.label}</span>
                <span className="text-xs font-mono font-semibold text-foreground tabular-nums">
                  {item.value.toLocaleString()}
                </span>
              </div>
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${item.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Status indicator */}
        <div className={`mt-3 px-3 py-2 rounded-lg text-xs font-medium ${
          mode === 'ai-loading' ?'bg-violet-50 text-primary border border-purple-200'
            : mode === 'ai-result' ?'bg-positive-bg text-positive border border-emerald-200'
            : charCount >= 50
            ? 'bg-positive-bg text-positive border border-emerald-200' :'bg-muted text-muted-foreground border border-border'
        }`}>
          {mode === 'ai-loading' && '✨ AI is enhancing your post...'}
          {mode === 'ai-result' && '✓ AI enhancement ready to use'}
          {mode === 'draft' && charCount >= 50 && '✓ Ready for AI enhancement'}
          {mode === 'draft' && charCount < 50 && charCount > 0 && `Write ${50 - charCount} more characters`}
          {charCount === 0 && 'Start writing your post...'}
        </div>
      </div>

      {/* Points preview */}
      <div className="card p-4 bg-gradient-to-br from-amber-50/60 to-orange-50/40 border-amber-100">
        <div className="flex items-center gap-2 mb-3">
          <Zap size={14} className="text-amber-500 fill-amber-400" />
          <h3 className="text-xs font-bold text-amber-700 uppercase tracking-wider">
            Points You Can Earn
          </h3>
        </div>
        <div className="flex flex-col gap-2">
          {pointsPreview.map((item) => (
            <div key={item.id} className="flex items-center justify-between">
              <div className="flex-1 min-w-0 pr-2">
                <span className="text-xs text-foreground/80 leading-tight">{item.event}</span>
                <span className="text-[10px] text-muted-foreground block">{item.note}</span>
              </div>
              <span className="text-xs font-bold text-amber-700 font-mono tabular-nums shrink-0">
                {item.pts}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-amber-200">
          <div className="flex items-center gap-1.5">
            <Award size={13} className="text-amber-600" />
            <span className="text-xs text-amber-700 font-medium">
              Redeem points for real gifts
            </span>
          </div>
        </div>
      </div>

      {/* Virality tips */}
      <div className="card p-4">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
          Virality Playbook
        </h3>
        <div className="flex flex-col gap-3">
          {viralityTips.map((tip) => (
            <div key={tip.id} className="flex items-start gap-2.5">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${tip.color}`}>
                <tip.icon size={13} />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground leading-tight">{tip.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{tip.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AIDA framework reference */}
      <div className="card p-4 bg-violet-50/50 border-purple-100">
        <h3 className="text-xs font-bold text-primary uppercase tracking-wider mb-3">
          AIDA Framework
        </h3>
        {[
          { id: 'aida-a', letter: 'A', label: 'Attention', desc: 'Hook that stops the scroll' },
          { id: 'aida-i', letter: 'I', label: 'Interest', desc: 'Problem your reader feels' },
          { id: 'aida-d', letter: 'D', label: 'Desire', desc: 'Outcome they want' },
          { id: 'aida-a2', letter: 'A', label: 'Action', desc: 'Question or CTA' },
        ].map((item) => (
          <div key={item.id} className="flex items-start gap-2.5 mb-2.5 last:mb-0">
            <div className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-[10px] font-black text-primary">{item.letter}</span>
            </div>
            <div>
              <span className="text-xs font-bold text-foreground">{item.label}</span>
              <span className="text-xs text-muted-foreground ml-1">— {item.desc}</span>
            </div>
          </div>
        ))}
        <p className="text-[10px] text-muted-foreground mt-3 pt-2 border-t border-purple-200">
          AI Enhancement uses AIDA automatically. Click &quot;Make it Viral&quot; to apply.
        </p>
      </div>
    </div>
  );
}
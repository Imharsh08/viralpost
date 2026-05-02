'use client';

import React, { useEffect, useRef } from 'react';
import { Zap } from 'lucide-react';

export default function AdSlotCard() {
  const ref = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firedRef = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          timerRef.current = setTimeout(async () => {
            if (firedRef.current) return;
            firedRef.current = true;
            // Backend: POST /api/impressions/log with postId to award points to post author
          }, 3000);
        } else {
          if (timerRef.current) clearTimeout(timerRef.current);
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => {
      observer.disconnect();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div
      ref={ref}
      className="card p-4 border-dashed border-border/60 bg-gradient-to-r from-amber-50/50 to-violet-50/50"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sponsored</span>
        <div className="flex items-center gap-1 text-xs text-amber-600">
          <Zap size={10} className="fill-amber-400" />
          <span className="font-mono">Viewing earns creators +1 pt</span>
        </div>
      </div>

      {/* Mock ad content */}
      <div className="flex gap-4 items-center">
        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-violet-200 to-purple-300 flex items-center justify-center shrink-0">
          <span className="text-2xl">🚀</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground mb-1">
            Launch your newsletter in 10 minutes
          </p>
          <p className="text-xs text-muted-foreground line-clamp-2">
            Beehiiv is the newsletter platform built for growth. Used by 10,000+ creators.
          </p>
          <button className="mt-2 text-xs font-bold text-primary hover:underline">
            Start free → beehiiv.com
          </button>
        </div>
      </div>
    </div>
  );
}
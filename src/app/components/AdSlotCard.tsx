'use client';

import React, { useEffect, useId, useRef } from 'react';

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

const ADSENSE_CLIENT = 'ca-pub-6613650835809676';
const ADSENSE_SLOT = '1915047628';
const ADSENSE_LAYOUT_KEY = '-g3-1v-1o-cn+1bc';

// Tracks which <ins> nodes we've already pushed in the current page session.
// Survives StrictMode double-effects; reset on page reload.
const pushedNodes = new WeakSet<Element>();

export default function AdSlotCard() {
  const insRef = useRef<HTMLModElement | null>(null);
  // useId gives this slot a unique id across the page, so multiple AdSlotCards
  // don't collide if React reuses elements during reconciliation.
  const id = useId();

  useEffect(() => {
    const el = insRef.current;
    if (!el) return;

    // If this exact <ins> already has an ad rendered (data-adsbygoogle-status="done"),
    // skip the push to avoid the "already have ads in them" TagError that
    // leaves slots blank.
    if (el.getAttribute('data-adsbygoogle-status') === 'done') return;
    if (pushedNodes.has(el)) return;
    pushedNodes.add(el);

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (err) {
      // AdSense script not yet loaded, blocked by adblocker, or running on
      // a non-approved domain. Leaves slot blank — expected.
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[AdSlotCard] adsbygoogle push failed:', err);
      }
    }
  }, []);

  return (
    <div className="card p-2 border-dashed border-border/60" data-ad-slot-id={id}>
      <div className="flex items-center justify-between px-2 pt-1 pb-2">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Sponsored
        </span>
        <span className="text-[10px] text-muted-foreground">Ads keep ViralPost free</span>
      </div>
      <ins
        ref={insRef as any}
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-format="fluid"
        data-ad-layout-key={ADSENSE_LAYOUT_KEY}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={ADSENSE_SLOT}
      />
    </div>
  );
}

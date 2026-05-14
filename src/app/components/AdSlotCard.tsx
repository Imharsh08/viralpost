'use client';

import React, { useEffect, useRef } from 'react';

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

const ADSENSE_CLIENT = 'ca-pub-6613650835809676';
const ADSENSE_SLOT = '1915047628';
const ADSENSE_LAYOUT_KEY = '-g3-1v-1o-cn+1bc';

export default function AdSlotCard() {
  const pushedRef = useRef(false);

  useEffect(() => {
    if (pushedRef.current) return;
    pushedRef.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // AdSense not yet loaded or blocked — silently ignore
    }
  }, []);

  return (
    <div className="card p-2 border-dashed border-border/60">
      <div className="flex items-center justify-between px-2 pt-1 pb-2">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Sponsored
        </span>
        <span className="text-[10px] text-muted-foreground">Ads keep ViralPost free</span>
      </div>
      <ins
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

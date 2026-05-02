import React from 'react';
import Link from 'next/link';
import AppLogo from '@/components/ui/AppLogo';
import TopbarClient from './TopbarClient';

export default function Topbar() {
  return (
    <header className="sticky top-0 z-50 w-full bg-card/80 backdrop-blur-md border-b border-border">
      <div className="max-w-screen-2xl mx-auto px-4 lg:px-8 xl:px-10 2xl:px-16 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
          <AppLogo size={36} />
          <span className="font-extrabold text-xl tracking-tight text-foreground group-hover:text-primary transition-colors">
            ViralPost
          </span>
        </Link>

        {/* Desktop Nav + Actions */}
        <TopbarClient />
      </div>
    </header>
  );
}
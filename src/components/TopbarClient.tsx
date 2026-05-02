'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Search, PenSquare, Zap, Bell, Menu, X, Home, LogIn, Award
} from 'lucide-react';

const navItems = [
  { label: 'Feed', href: '/', icon: Home },
  { label: 'Write', href: '/write-editor-page', icon: PenSquare },
  { label: 'Rewards', href: '#', icon: Award },
];

export default function TopbarClient() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <>
      {/* Desktop nav */}
      <nav className="hidden md:flex items-center gap-1">
        {navItems?.map((item) => {
          const active = pathname === item?.href;
          return (
            <Link
              key={`nav-${item?.label}`}
              href={item?.href}
              className={active ? 'nav-link-active' : 'nav-link'}
            >
              <item.icon size={16} />
              {item?.label}
            </Link>
          );
        })}
      </nav>
      {/* Desktop actions */}
      <div className="hidden md:flex items-center gap-2">
        {/* Search */}
        <div className={`relative transition-all duration-300 ${searchOpen ? 'w-64' : 'w-9'}`}>
          {searchOpen ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-muted animate-fade-in">
              <Search size={15} className="text-muted-foreground shrink-0" />
              <input
                autoFocus
                type="text"
                placeholder="Search posts, creators..."
                className="bg-transparent text-sm outline-none w-full text-foreground placeholder:text-muted-foreground"
                onBlur={() => setSearchOpen(false)}
              />
            </div>
          ) : (
            <button
              onClick={() => setSearchOpen(true)}
              className="btn-ghost w-9 h-9 p-0"
              aria-label="Open search"
            >
              <Search size={18} />
            </button>
          )}
        </div>

        {/* Points balance pill */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700">
          <Zap size={13} className="fill-amber-500 text-amber-500" />
          <span className="text-xs font-bold font-mono tabular-nums">2,840 pts</span>
        </div>

        {/* Notifications */}
        <button className="btn-ghost w-9 h-9 p-0 relative" aria-label="Notifications">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-negative rounded-full border border-card" />
        </button>

        {/* Write CTA */}
        <Link href="/write-editor-page" className="btn-primary">
          <PenSquare size={15} />
          Write a Post
        </Link>

        {/* Auth */}
        <Link href="/sign-up-login-screen" className="btn-secondary">
          <LogIn size={15} />
          Sign In
        </Link>
      </div>
      {/* Mobile hamburger */}
      <button
        className="md:hidden btn-ghost w-9 h-9 p-0"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle mobile menu"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>
      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="absolute top-16 left-0 right-0 bg-card border-b border-border shadow-modal animate-slide-up md:hidden z-50">
          <div className="p-4 flex flex-col gap-2">
            {navItems?.map((item) => {
              const active = pathname === item?.href;
              return (
                <Link
                  key={`mobile-nav-${item?.label}`}
                  href={item?.href}
                  onClick={() => setMobileOpen(false)}
                  className={active ? 'nav-link-active' : 'nav-link'}
                >
                  <item.icon size={16} />
                  {item?.label}
                </Link>
              );
            })}
            <hr className="border-border my-1" />
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-amber-50 border border-amber-200 text-amber-700 w-fit">
              <Zap size={13} className="fill-amber-500 text-amber-500" />
              <span className="text-xs font-bold font-mono tabular-nums">2,840 pts</span>
            </div>
            <Link
              href="/write-editor-page"
              onClick={() => setMobileOpen(false)}
              className="btn-primary justify-center"
            >
              <PenSquare size={15} />
              Write a Post
            </Link>
            <Link
              href="/sign-up-login-screen"
              onClick={() => setMobileOpen(false)}
              className="btn-secondary justify-center"
            >
              <LogIn size={15} />
              Sign In
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
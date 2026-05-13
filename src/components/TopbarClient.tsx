'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Search, PenSquare, Zap, Bell, Menu, X, Home, LogIn, Award,
  User, BarChart2, LogOut, ChevronDown, FileText, Settings
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import AppImage from '@/components/ui/AppImage';

const navItems = [
  { label: 'Feed', href: '/', icon: Home },
  { label: 'Write', href: '/write-editor-page', icon: PenSquare },
  { label: 'Rewards', href: '#', icon: Award },
];

export default function TopbarClient() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut, getUserProfile } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      getUserProfile().then((p: any) => setProfile(p)).catch(() => {});
    } else {
      setProfile(null);
    }
  }, [user]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    setDropdownOpen(false);
    await signOut();
    router.push('/');
  };

  const displayName = profile?.display_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'You';
  const username = profile?.username || '';
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url || '';
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <>
      {/* Desktop nav */}
      <nav className="hidden md:flex items-center gap-1">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link key={`nav-${item.label}`} href={item.href} className={active ? 'nav-link-active' : 'nav-link'}>
              <item.icon size={16} />
              {item.label}
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
            <button onClick={() => setSearchOpen(true)} className="btn-ghost w-9 h-9 p-0" aria-label="Open search">
              <Search size={18} />
            </button>
          )}
        </div>

        {user ? (
          <>
            {/* Points balance */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700">
              <Zap size={13} className="fill-amber-500 text-amber-500" />
              <span className="text-xs font-bold font-mono tabular-nums">
                {(profile?.points_balance ?? 0).toLocaleString()} pts
              </span>
            </div>

            {/* Notifications */}
            <button className="btn-ghost w-9 h-9 p-0 relative" aria-label="Notifications">
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-negative rounded-full border border-card" />
            </button>

            {/* Write CTA */}
            <Link href="/write-editor-page" className="btn-primary">
              <PenSquare size={15} />
              Write
            </Link>

            {/* Avatar dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl hover:bg-muted transition-colors"
              >
                <AvatarOrInitials avatarUrl={avatarUrl} initials={initials} size="sm" />
                <span className="text-sm font-semibold text-foreground max-w-[80px] truncate hidden lg:block">
                  {displayName}
                </span>
                <ChevronDown size={14} className={`text-muted-foreground transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {dropdownOpen && (
                <div className="absolute top-full right-0 mt-2 w-56 bg-card border border-border rounded-2xl shadow-modal p-1.5 animate-scale-in z-50">
                  {/* User info header */}
                  <div className="px-3 py-2.5 mb-1">
                    <p className="text-sm font-bold text-foreground truncate">{displayName}</p>
                    {username && <p className="text-xs text-muted-foreground">@{username}</p>}
                  </div>
                  <hr className="border-border mb-1" />

                  <DropdownLink href="/profile" icon={User} label="My Profile" onClick={() => setDropdownOpen(false)} />
                  <DropdownLink href="/profile?tab=posts" icon={FileText} label="My Posts" onClick={() => setDropdownOpen(false)} />
                  <DropdownLink href="/analytics" icon={BarChart2} label="Analytics" onClick={() => setDropdownOpen(false)} />

                  <hr className="border-border my-1" />
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold text-negative hover:bg-negative-bg transition-colors text-left"
                  >
                    <LogOut size={15} />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Points balance pill (static when not logged in) */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700">
              <Zap size={13} className="fill-amber-500 text-amber-500" />
              <span className="text-xs font-bold font-mono tabular-nums">Earn pts</span>
            </div>

            <Link href="/write-editor-page" className="btn-primary">
              <PenSquare size={15} />
              Write a Post
            </Link>

            <Link href="/sign-up-login-screen" className="btn-secondary">
              <LogIn size={15} />
              Sign In
            </Link>
          </>
        )}
      </div>

      {/* Mobile hamburger */}
      <button className="md:hidden btn-ghost w-9 h-9 p-0" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle mobile menu">
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="absolute top-16 left-0 right-0 bg-card border-b border-border shadow-modal animate-slide-up md:hidden z-50">
          <div className="p-4 flex flex-col gap-2">
            {user && (
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-muted mb-1">
                <AvatarOrInitials avatarUrl={avatarUrl} initials={initials} size="md" />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">{displayName}</p>
                  {username && <p className="text-xs text-muted-foreground">@{username}</p>}
                </div>
              </div>
            )}

            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link key={`mobile-nav-${item.label}`} href={item.href} onClick={() => setMobileOpen(false)} className={active ? 'nav-link-active' : 'nav-link'}>
                  <item.icon size={16} />
                  {item.label}
                </Link>
              );
            })}

            {user && (
              <>
                <Link href="/profile" onClick={() => setMobileOpen(false)} className="nav-link">
                  <User size={16} />
                  My Profile
                </Link>
                <Link href="/analytics" onClick={() => setMobileOpen(false)} className="nav-link">
                  <BarChart2 size={16} />
                  Analytics
                </Link>
              </>
            )}

            <hr className="border-border my-1" />

            {user ? (
              <>
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-amber-50 border border-amber-200 text-amber-700 w-fit">
                  <Zap size={13} className="fill-amber-500 text-amber-500" />
                  <span className="text-xs font-bold font-mono tabular-nums">{(profile?.points_balance ?? 0).toLocaleString()} pts</span>
                </div>
                <Link href="/write-editor-page" onClick={() => setMobileOpen(false)} className="btn-primary justify-center">
                  <PenSquare size={15} />
                  Write a Post
                </Link>
                <button onClick={handleSignOut} className="btn-ghost justify-center text-negative border border-border rounded-xl py-2.5">
                  <LogOut size={15} />
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link href="/write-editor-page" onClick={() => setMobileOpen(false)} className="btn-primary justify-center">
                  <PenSquare size={15} />
                  Write a Post
                </Link>
                <Link href="/sign-up-login-screen" onClick={() => setMobileOpen(false)} className="btn-secondary justify-center">
                  <LogIn size={15} />
                  Sign In
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function DropdownLink({ href, icon: Icon, label, onClick }: { href: string; icon: any; label: string; onClick: () => void }) {
  return (
    <Link href={href} onClick={onClick} className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold text-foreground hover:bg-muted transition-colors">
      <Icon size={15} className="text-muted-foreground" />
      {label}
    </Link>
  );
}

function AvatarOrInitials({ avatarUrl, initials, size }: { avatarUrl: string; initials: string; size: 'sm' | 'md' }) {
  const dim = size === 'sm' ? 'w-7 h-7 text-xs' : 'w-9 h-9 text-sm';
  if (avatarUrl) {
    return (
      <AppImage
        src={avatarUrl}
        alt="Profile"
        width={size === 'sm' ? 28 : 36}
        height={size === 'sm' ? 28 : 36}
        className={`${dim} rounded-full object-cover border border-border shrink-0`}
      />
    );
  }
  return (
    <div className={`${dim} rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary shrink-0`}>
      {initials}
    </div>
  );
}

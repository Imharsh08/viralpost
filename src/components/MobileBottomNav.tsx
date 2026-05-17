'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, PenSquare, Bell, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import AppImage from '@/components/ui/AppImage';
import { useUnreadNotifications } from '@/lib/hooks/useUnreadNotifications';

/**
 * Instagram-style bottom navigation for mobile. Five tabs with a raised
 * center Write button. Hidden on screens >= md (the desktop topbar
 * handles navigation there). Safe-area inset padding so it doesn't get
 * eaten by iOS gesture bar.
 *
 * Tabs:
 *   1. Home          → /
 *   2. Search        → /search
 *   3. Write (FAB)   → /write-editor-page
 *   4. Notifications → /notifications  (badge with unread count)
 *   5. Profile       → /profile or /sign-up-login-screen if signed out
 */
export default function MobileBottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { unreadCount } = useUnreadNotifications();

  // Hide the bottom nav entirely on auth flows and onboarding so it
  // doesn't compete with form CTAs.
  if (
    pathname === '/sign-up-login-screen' ||
    pathname === '/onboarding' ||
    pathname?.startsWith('/auth/')
  ) {
    return null;
  }

  const profileHref = user ? '/profile' : '/sign-up-login-screen';
  const avatarUrl = user?.user_metadata?.avatar_url ?? '';

  return (
    // The bottom-nav clearance for page content is handled by the
    // `pb-app-shell` utility on <main> in AppLayout — no in-component
    // spacer needed here.
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur-md border-t border-border"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0px)' }}
      aria-label="Primary navigation"
    >
        <ul className="flex items-stretch justify-around h-14 px-1">
          <TabItem
            href="/"
            icon={Home}
            label="Home"
            active={pathname === '/'}
          />
          <TabItem
            href="/search"
            icon={Search}
            label="Search"
            active={pathname?.startsWith('/search') ?? false}
          />
          <li className="flex-1 flex items-center justify-center">
            <Link
              href="/write-editor-page"
              aria-label="Write a post"
              className="-mt-5 w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 via-fuchsia-600 to-amber-500 text-white shadow-md flex items-center justify-center active:scale-95 transition-transform"
            >
              <PenSquare size={20} />
            </Link>
          </li>
          <TabItem
            href="/notifications"
            icon={Bell}
            label="Activity"
            active={pathname?.startsWith('/notifications') ?? false}
            badge={user ? unreadCount : 0}
          />
          <TabItem
            href={profileHref}
            icon={User}
            label={user ? 'Profile' : 'Sign in'}
            active={pathname?.startsWith('/profile') ?? false}
            avatarUrl={avatarUrl}
          />
      </ul>
    </nav>
  );
}

function TabItem({
  href,
  icon: Icon,
  label,
  active,
  badge,
  avatarUrl,
}: {
  href: string;
  icon: any;
  label: string;
  active: boolean;
  badge?: number;
  avatarUrl?: string;
}) {
  return (
    <li className="flex-1">
      <Link
        href={href}
        className={`relative h-full w-full flex flex-col items-center justify-center gap-0.5 transition-colors ${
          active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <div className="relative">
          {avatarUrl ? (
            <AppImage
              src={avatarUrl}
              alt="Profile"
              width={22}
              height={22}
              className={`w-[22px] h-[22px] rounded-full object-cover border ${active ? 'border-primary' : 'border-border'}`}
            />
          ) : (
            <Icon size={22} strokeWidth={active ? 2.4 : 2} className={active && Icon === Home ? 'fill-primary/15' : ''} />
          )}
          {badge !== undefined && badge > 0 && (
            <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 bg-negative text-white text-[9px] font-bold rounded-full flex items-center justify-center border border-background">
              {badge > 9 ? '9+' : badge}
            </span>
          )}
        </div>
        <span className="text-[10px] font-semibold leading-none">{label}</span>
      </Link>
    </li>
  );
}

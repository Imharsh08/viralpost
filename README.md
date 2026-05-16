# ViralPost

Write once. Go viral. Earn real rewards.

ViralPost is a content publishing and creator-rewards platform. Creators
write posts, get AI-powered enhancement (the "Make it Viral" rewrite),
publish to a live feed, and earn redeemable points from likes, followers,
view milestones, and verified ad impressions.

Live: https://viralposts.pages.dev

---

## Features

- **AI post enhancement** — Claude rewrites your draft using an
  audience-aware viral framework based on your chosen niches.
- **Live virality score** — real-time 0-100 score on the editor with
  per-criterion tips (hook strength, readability, paragraphs, ending
  question, bullet usage, hashtag count).
- **Points engine** — every like, follower, and view milestone credits
  points to the author. 500 pts/day safety cap.
- **Rewards catalog** — redeem points for gift cards, vouchers, gadgets,
  and curated hampers.
- **Realtime feed** — like, comment, and view counts update live across
  browsers without reload.
- **Follow system** — creator-style one-way follow, Following feed,
  follower notifications.
- **Public creator profiles** at /u/[username] with niches, headline,
  bio, posts grid, and follower count.
- **Hashtag pages** at /tag/[name] with Trending and Recent tabs.
- **Search** across posts, creators, and hashtags.
- **Leaderboard** — Top Earners (weekly + all-time), Most Viral posts,
  Most Engaging creators.
- **Notifications** — bell with realtime panel; auto-fires on every
  like, comment, and new follower.
- **Onboarding** — 3-step flow with niche selection, profile setup,
  and +25 points completeness bonus.
- **Draft auto-save** every 30s plus a Drafts manager.
- **Cover image upload** to Supabase Storage (max 5MB).
- **Google AdSense** in-feed fluid units between posts.

---

## Stack

- Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS
- Supabase: Postgres, Auth (Google OAuth + Email/Password), RLS,
  Storage, Realtime
- Anthropic Claude (claude-haiku-4-5) for the "Make it Viral" rewrite
- Google AdSense (in-feed fluid)
- Cloudflare Pages via @cloudflare/next-on-pages

---

## Local development

```
npm install
npm run dev          # http://localhost:4028
npm run build        # production build
npm run lint         # ESLint
npm run format       # Prettier
```

Required environment variables in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
ANTHROPIC_API_KEY=...            # optional - falls back to mock enhancement
```

---

## Database setup

Run the SQL migrations in `supabase/migrations/` in order via the
Supabase SQL Editor:

```
001_initial_schema.sql            - tables, RLS, count triggers
002_add_points_balance.sql        - points_balance column on users
003_add_increment_views_function  - view counter RPC
004_enable_realtime.sql           - realtime publication + follow feed RPC
005_notification_triggers.sql     - auto-notify on like/comment/follow
006_points_ledger.sql             - ledger + credit triggers + daily cap
007_user_onboarding.sql           - niche_tags, headline, onboarded_at
008_storage_post_images.sql       - post-images bucket + RLS
009_leaderboard_rpcs.sql          - top_earners, most_viral, most_engaging
```

---

## Project structure

```
viralpost/
  public/                       Static assets, ads.txt, favicon
  src/
    app/                        Next.js App Router pages and API routes
      api/                      Edge runtime API routes
      analytics/                /analytics — creator dashboard
      auth/callback/            OAuth callback
      drafts/                   /drafts — your saved drafts
      leaderboard/              /leaderboard — three boards
      onboarding/               /onboarding — first-run flow
      post/[id]/                /post/[id] — public post detail
      profile/                  /profile — own profile + edit
      rewards/                  /rewards — catalog + redemption
      search/                   /search — posts + creators + tags
      sign-up-login-screen/     Auth screens
      tag/[name]/               /tag/[name] — hashtag discovery
      u/[username]/             /u/[username] — public creator profile
      write-editor-page/        /write-editor-page — AI editor
      components/               Feed, PostCard, FollowButton, etc.
      layout.tsx                Root layout (AdSense + Toaster)
      page.tsx                  / — Home feed
    components/                 AppLayout, Topbar, NotificationBell
    contexts/                   AuthContext (session state)
    lib/
      hooks/                    usePostRealtime, useUserRealtime
      mockData.ts               Seed posts and creators for empty DB
      supabase/client.ts        Singleton browser client
    styles/tailwind.css         Tailwind v4 entry + custom utilities
  supabase/migrations/          SQL migrations (run in order)
  next.config.mjs               Edge build config
  wrangler.toml                 Cloudflare Pages config
```

---

## Conventions

- **Edge runtime** — every dynamic route exports
  `export const runtime = 'edge'`. Pages using `useSearchParams()` also
  set `export const dynamic = 'force-dynamic'` to skip static prerender.
- **Auth pattern** — API routes JWT-decode the `Authorization` header
  via `atob()` to extract the user ID without a network call.
  `supabase.auth.getSession()` is only used in browser-side React.
- **Realtime singleton** — all visible PostCards share one Supabase
  channel via an `id=in.(...)` filter; debounced 50ms rebuild on mount
  to stay under the 200-channel free-tier cap.
- **Optimistic UI with rollback** — likes and follows update local
  state first, then reconcile with the server; a `mutating` ref guard
  stops Realtime events from overwriting in-flight optimistic state.
- **Mock data isolation** — a `MOCK_IDS` Set on PostCard skips real
  API calls for seed posts so Follow/Like/Realtime stay no-ops on
  demo data.
- **Defensive number formatting** — RPC numeric fields can come back
  null or string; use the `fmt()` helper, not raw `.toLocaleString()`.
- **AdSense** — script loaded via `next/script` with
  `strategy="afterInteractive"` in `<body>`, never in `<head>`.
  Never re-add `@dhiwise/component-tagger` or `static.rocket.new`
  scripts; they strip and hook adsbygoogle.js loading.

---

## Available scripts

```
npm run dev      Start dev server on port 4028
npm run build    Build for production
npm run start    Start production server
npm run serve    Alias for production server
npm run lint     Run ESLint
npm run format   Format with Prettier
```

---

## Deployment

The app is deployed to Cloudflare Pages. Builds run on push to `main`
via `npx @cloudflare/next-on-pages@1`. Every dynamic route must
declare edge runtime or the build fails.

---

## Acknowledgments

Built by Harsh Kashyap. Powered by Next.js, Supabase, Anthropic Claude,
and Cloudflare Pages.

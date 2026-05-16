# ViralPost

## Project Name & Objective
ViralPost is a content publishing and creator-rewards platform. Creators
write posts, get AI enhancement (the "Make it Viral" rewrite), publish to a
live feed, and earn redeemable points from likes, followers, view
milestones, and ad impressions. Built on Next.js 15 (App Router) deployed
to Cloudflare Pages, with Supabase for auth, Postgres, RLS, Storage, and
Realtime.

Live: https://viralposts.pages.dev

## Current Status
- Progress: [==================               ] 58%
- Update: 2026-05-17

## Recent Changes
* Added /leaderboard page with Top Earners, Most Viral, Most Engaging boards.
* Added migration 009 with get_top_earners, get_most_viral_posts,
  get_most_engaging RPCs (SECURITY DEFINER, week + all-time windows).
* Added /api/leaderboard edge endpoint dispatching by board + window.
* Added Leaderboard to top-nav between Write and Rewards.
* Restructured README to ASCII-only roadmap format.

## Roadmap

### Wave 0 - P0 Fixes
- [x] Fix Rewards 404 (catalog + redemption + balance card)
- [x] Build post detail page /post/[id]
- [x] Build hashtag page /tag/[name]
- [x] Notifications system (DB triggers + bell + realtime panel)

### Wave 1 - Core V1
- [x] Public creator profile /u/[username]
- [x] Follow / Unfollow system + Following feed
- [x] Realtime like/comment/view counts (Supabase Realtime)
- [x] Live Points Engine (ledger + DB triggers + daily cap)
- [x] Onboarding flow (niche pick + profile setup + +25 bonus)
- [x] Analytics wired to live points + breakdown + recent activity
- [x] Working search /search (posts, creators, tags)
- [x] Draft auto-save + draft manager + cover image upload
- [x] Profile editing (headline, niche tags, username, bio)
- [x] Leaderboard (top earners, most viral, most engaging)
- [ ] Virality score meter on editor (0-100 + improvement tips)
- [ ] Comment replies (1-level nesting) + comment likes
- [ ] Suggested creators sidebar (by niche overlap)
- [ ] Follow a hashtag (tagged posts in Following feed)

### Wave 2 - Growth
- [ ] @mentions in posts and comments
- [ ] Direct messages (1:1 text, share-to-DM)
- [ ] Trending tags hourly recompute job
- [ ] Weekly digest email ("Your posts earned X pts this week")

### Wave 3 - Monetisation
- [ ] Premium plan + paywall logic
- [ ] Direct brand ads (sponsored feed cards)
- [ ] Creator payouts (Razorpay or similar)

### Wave 4 - Scale
- [ ] Mobile app (React Native)
- [ ] Brand pages
- [ ] Creator marketplace / API

## Notes

### Stack
- Next.js 15 App Router, React 19, TypeScript, Tailwind CSS.
- Supabase: Postgres, Auth (Google OAuth + Email/Password), RLS, Storage,
  Realtime.
- Cloudflare Pages via @cloudflare/next-on-pages. Every dynamic route
  must export `runtime = 'edge'`. Pages using `useSearchParams()` must
  also set `dynamic = 'force-dynamic'` to skip prerender.
- Anthropic Claude (claude-haiku-4-5) for "Make it Viral" rewrite.
- Google AdSense (in-feed fluid units, slot 1915047628).

### Required Supabase Migrations (run in order)
001_initial_schema.sql            - tables, RLS, count triggers
002_add_points_balance.sql        - points_balance column on users
003_add_increment_views_function  - view counter RPC
004_enable_realtime.sql           - realtime publication + follow feed RPC
005_notification_triggers.sql     - auto-notify on like/comment/follow
006_points_ledger.sql             - ledger + credit triggers + daily cap
007_user_onboarding.sql           - niche_tags, headline, onboarded_at
008_storage_post_images.sql       - post-images bucket + RLS
009_leaderboard_rpcs.sql          - top_earners, most_viral, most_engaging

### Architectural Conventions
- JWT-decode via atob() to extract user_id without supabase.auth.getUser()
  network call. All edge routes use this pattern, not getSession().
- Module-level singleton Realtime channel for PostCards (one channel for
  N visible posts via id=in.(...) filter) to stay under the 200-channel
  Supabase free-tier limit.
- Optimistic UI with rollback for likes and follows; mutating ref guard
  prevents Realtime from overwriting in-flight optimistic state.
- MOCK_IDS Set on PostCard skips real API calls for seed/mock posts so
  FollowButton, view counters, and Realtime stay no-ops on demo data.
- AdSense script loaded via next/script strategy="afterInteractive" in
  body, NOT in head, to avoid Next.js injecting data-component-id.

### Known Constraints
- Free-tier Cloudflare Pages build is ~2-3 minutes (npm install + next
  build + edge build); not optimizable in app code.
- Supabase Realtime free tier caps at 200 concurrent channels;
  the singleton channel pattern is what makes this work at scale.
- Daily points cap is 500 pts/user/day enforced in credit_points().
- Username regex: ^[a-z0-9_]{3,30}$ (lowercase, no spaces).
- Cover images: max 5MB, JPEG/PNG/WEBP/GIF only, stored at
  post-images/{user_id}/{timestamp}.{ext}.

### Local Development
```
npm install
npm run dev          # http://localhost:4028
npm run build        # production build
```

Environment variables required in .env.local:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- ANTHROPIC_API_KEY      (optional - falls back to mock enhancement)

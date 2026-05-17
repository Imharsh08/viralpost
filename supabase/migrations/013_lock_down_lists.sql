-- Migration 013: Lock down liker lists + anonymous comment access
-- Safe to re-run.
--
-- Background
--   Migrations 001 and 011 each created `SELECT USING (true)` policies on
--   post_likes, comment_likes, and comments. That means anyone with the
--   public anon key can query the full liker tables and full comment tree
--   via direct Supabase calls — even though our UI never renders these
--   lists. The denormalized count columns (posts.likes_count, .comments_count
--   and comments.likes_count) remain on the parent rows and are fed by
--   SECURITY DEFINER triggers, so locking down the lists does not affect
--   the counts that drive engagement badges.
--
-- Privacy goal
--   - Likers (post_likes + comment_likes): nobody can read another user's
--     rows. Each user can see only their own rows (needed so the UI can
--     show "I liked this" state without a server round-trip per item).
--   - Comments: only signed-in users see content. Anonymous viewers get
--     count-only views.

-- 1. post_likes — replace open SELECT with own-rows-only
DROP POLICY IF EXISTS "Anyone can view likes" ON post_likes;
DROP POLICY IF EXISTS "Users can only see their own post likes" ON post_likes;
CREATE POLICY "Users can only see their own post likes"
  ON post_likes FOR SELECT
  USING (user_id = auth.uid());

-- 2. comment_likes — same shape
DROP POLICY IF EXISTS "Anyone can view comment likes" ON comment_likes;
DROP POLICY IF EXISTS "Users can only see their own comment likes" ON comment_likes;
CREATE POLICY "Users can only see their own comment likes"
  ON comment_likes FOR SELECT
  USING (user_id = auth.uid());

-- 3. comments — gate full reads to authenticated viewers.
--    INSERT/UPDATE/DELETE policies (migration 001) remain untouched, so
--    posting + deleting comments continues to work for signed-in users.
DROP POLICY IF EXISTS "Anyone can view comments" ON comments;
DROP POLICY IF EXISTS "Authenticated users can view comments" ON comments;
CREATE POLICY "Authenticated users can view comments"
  ON comments FOR SELECT
  USING (auth.uid() IS NOT NULL);

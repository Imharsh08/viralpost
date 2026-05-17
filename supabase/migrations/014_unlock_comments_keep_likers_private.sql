-- Migration 014: Make comments public again (Instagram-style)
-- Safe to re-run.
--
-- Migration 013 gated the `comments` table to authenticated viewers only.
-- That broke the Instagram-like experience where everyone — including
-- logged-out visitors — can read public post comments. This restores the
-- public-read policy. Liker lists (post_likes, comment_likes) stay locked
-- to own-rows-only from migration 013, since those reveal identity-level
-- engagement and are not displayed in any UI anyway.

DROP POLICY IF EXISTS "Authenticated users can view comments" ON comments;
DROP POLICY IF EXISTS "Anyone can view comments" ON comments;
CREATE POLICY "Anyone can view comments"
  ON comments FOR SELECT USING (true);

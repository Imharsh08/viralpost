-- Migration 015: Make all denormalized-count triggers SECURITY DEFINER
-- Safe to re-run.
--
-- Background
--   Migration 001 created count triggers on post_likes, comments,
--   post_shares, and follows. Migration 011 added the same pattern for
--   comment_likes. NONE of them are marked SECURITY DEFINER, which means
--   the UPDATE statement inside each trigger runs as the calling user.
--
--   That breaks the moment RLS on the parent table restricts UPDATE to
--   the owner. For example:
--
--     User A likes a post created by User B.
--     → INSERT into post_likes (User A's own row — INSERT policy OK)
--     → trigger fires: UPDATE posts SET likes_count = likes_count + 1
--                      WHERE id = NEW.post_id
--     → posts UPDATE policy: user_id = auth.uid() → BLOCKED (User A is
--       not the post owner) → counter does NOT increment.
--
--   Result: every like, comment, share, follow on someone-else's content
--   silently fails to update the count. The join-table row exists; the
--   denormalized count just goes stale. The UI shows the hover state
--   briefly via optimistic update, then snaps back when the server
--   returns the unchanged count.
--
--   The fix: mark all five trigger functions SECURITY DEFINER so they
--   run as the function owner (postgres role) and bypass RLS for the
--   parent-table UPDATE.

-- 1. posts.likes_count from post_likes
CREATE OR REPLACE FUNCTION update_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET likes_count = COALESCE(likes_count, 0) + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET likes_count = GREATEST(COALESCE(likes_count, 0) - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. posts.comments_count from comments
CREATE OR REPLACE FUNCTION update_post_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET comments_count = COALESCE(comments_count, 0) + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET comments_count = GREATEST(COALESCE(comments_count, 0) - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. posts.shares_count from post_shares
CREATE OR REPLACE FUNCTION update_post_shares_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET shares_count = COALESCE(shares_count, 0) + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET shares_count = GREATEST(COALESCE(shares_count, 0) - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. users.follower_count + users.following_count from follows
CREATE OR REPLACE FUNCTION update_follower_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE users SET follower_count = COALESCE(follower_count, 0) + 1 WHERE id = NEW.following_id;
    UPDATE users SET following_count = COALESCE(following_count, 0) + 1 WHERE id = NEW.follower_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE users SET follower_count = GREATEST(COALESCE(follower_count, 0) - 1, 0) WHERE id = OLD.following_id;
    UPDATE users SET following_count = GREATEST(COALESCE(following_count, 0) - 1, 0) WHERE id = OLD.follower_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. comments.likes_count from comment_likes (originally in migration 011)
CREATE OR REPLACE FUNCTION update_comment_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE comments SET likes_count = COALESCE(likes_count, 0) + 1 WHERE id = NEW.comment_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE comments SET likes_count = GREATEST(COALESCE(likes_count, 0) - 1, 0) WHERE id = OLD.comment_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- One-time reconcile so existing rows aren't stuck at the wrong count.
-- Recomputes each denormalized count from its source table.
UPDATE posts p
SET likes_count = COALESCE((SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id), 0);

UPDATE posts p
SET comments_count = COALESCE((SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id), 0);

UPDATE posts p
SET shares_count = COALESCE((SELECT COUNT(*) FROM post_shares ps WHERE ps.post_id = p.id), 0);

UPDATE comments c
SET likes_count = COALESCE((SELECT COUNT(*) FROM comment_likes cl WHERE cl.comment_id = c.id), 0);

UPDATE users u
SET follower_count = COALESCE((SELECT COUNT(*) FROM follows f WHERE f.following_id = u.id), 0),
    following_count = COALESCE((SELECT COUNT(*) FROM follows f WHERE f.follower_id = u.id), 0);

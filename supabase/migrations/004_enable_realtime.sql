-- Migration 004: Enable Realtime + follow feed indexes + helper RPCs
-- Safe to re-run — all statements are guarded with IF NOT EXISTS or OR REPLACE

-- 1. Add posts to Realtime publication (skip if already a member)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'posts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE posts;
  END IF;
END $$;

-- 2. Add users to Realtime publication (skip if already a member)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'users'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE users;
  END IF;
END $$;

-- 3. REPLICA IDENTITY FULL — Realtime payloads include all columns, not just PK
--    Required so payload.new.likes_count / follower_count are present in events
ALTER TABLE posts REPLICA IDENTITY FULL;
ALTER TABLE users REPLICA IDENTITY FULL;

-- 4. Indexes for follow feed query performance
CREATE INDEX IF NOT EXISTS idx_follows_follower_following
  ON follows(follower_id, following_id);

CREATE INDEX IF NOT EXISTS idx_posts_user_published
  ON posts(user_id, published_at DESC)
  WHERE published_at IS NOT NULL;

-- 5. RPC: get following feed in one DB round-trip
--    Returns flat columns (author_* prefix) so no nested join needed
CREATE OR REPLACE FUNCTION get_following_feed(viewer_id UUID, page_limit INT DEFAULT 20)
RETURNS TABLE (
  id UUID,
  title VARCHAR,
  excerpt TEXT,
  content TEXT,
  tags TEXT[],
  likes_count INT,
  comments_count INT,
  shares_count INT,
  views_count INT,
  points_earned INT,
  is_trending BOOLEAN,
  is_ai_enhanced BOOLEAN,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  author_id UUID,
  author_username VARCHAR,
  author_display_name VARCHAR,
  author_avatar_url TEXT,
  author_is_verified BOOLEAN
) AS $$
  SELECT
    p.id, p.title, p.excerpt, p.content, p.tags,
    p.likes_count, p.comments_count, p.shares_count, p.views_count,
    p.points_earned, p.is_trending, p.is_ai_enhanced,
    p.published_at, p.created_at,
    u.id, u.username, u.display_name, u.avatar_url, u.is_verified
  FROM posts p
  INNER JOIN follows f ON f.following_id = p.user_id
  INNER JOIN users u ON u.id = p.user_id
  WHERE f.follower_id = viewer_id
    AND p.published_at IS NOT NULL
  ORDER BY p.published_at DESC
  LIMIT page_limit;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_following_feed(UUID, INT) TO authenticated;

-- 6. RPC: check follow status in one round-trip
CREATE OR REPLACE FUNCTION is_following(viewer_id UUID, target_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM follows
    WHERE follower_id = viewer_id AND following_id = target_id
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION is_following(UUID, UUID) TO authenticated;

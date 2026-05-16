-- Migration 009: Leaderboard RPCs
-- Safe to re-run

-- 1. Top Earners — sum points_ledger over a time window
CREATE OR REPLACE FUNCTION get_top_earners(window_days INT DEFAULT 7, result_limit INT DEFAULT 20)
RETURNS TABLE (
  user_id UUID,
  username VARCHAR,
  display_name VARCHAR,
  avatar_url TEXT,
  is_verified BOOLEAN,
  follower_count INT,
  points_earned INT
) AS $$
  SELECT
    u.id AS user_id,
    u.username,
    u.display_name,
    u.avatar_url,
    u.is_verified,
    u.follower_count,
    COALESCE(SUM(l.points), 0)::INT AS points_earned
  FROM users u
  INNER JOIN points_ledger l ON l.user_id = u.id
  WHERE l.points > 0
    AND (window_days IS NULL OR l.created_at >= NOW() - (window_days || ' days')::INTERVAL)
  GROUP BY u.id, u.username, u.display_name, u.avatar_url, u.is_verified, u.follower_count
  HAVING SUM(l.points) > 0
  ORDER BY points_earned DESC, u.follower_count DESC
  LIMIT result_limit;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_top_earners(INT, INT) TO anon, authenticated;

-- 2. Most Viral Posts — highest views in a window
CREATE OR REPLACE FUNCTION get_most_viral_posts(window_days INT DEFAULT 7, result_limit INT DEFAULT 10)
RETURNS TABLE (
  post_id UUID,
  title VARCHAR,
  excerpt TEXT,
  views_count INT,
  likes_count INT,
  comments_count INT,
  published_at TIMESTAMPTZ,
  author_id UUID,
  author_username VARCHAR,
  author_display_name VARCHAR,
  author_avatar_url TEXT,
  author_is_verified BOOLEAN
) AS $$
  SELECT
    p.id AS post_id,
    p.title,
    p.excerpt,
    p.views_count,
    p.likes_count,
    p.comments_count,
    p.published_at,
    u.id AS author_id,
    u.username AS author_username,
    u.display_name AS author_display_name,
    u.avatar_url AS author_avatar_url,
    u.is_verified AS author_is_verified
  FROM posts p
  INNER JOIN users u ON u.id = p.user_id
  WHERE p.published_at IS NOT NULL
    AND (window_days IS NULL OR p.published_at >= NOW() - (window_days || ' days')::INTERVAL)
  ORDER BY p.views_count DESC, p.likes_count DESC
  LIMIT result_limit;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_most_viral_posts(INT, INT) TO anon, authenticated;

-- 3. Most Engaging — highest engagement rate (likes+comments)/views, min 100 views
CREATE OR REPLACE FUNCTION get_most_engaging(result_limit INT DEFAULT 10)
RETURNS TABLE (
  user_id UUID,
  username VARCHAR,
  display_name VARCHAR,
  avatar_url TEXT,
  is_verified BOOLEAN,
  follower_count INT,
  total_views INT,
  total_engagement INT,
  engagement_rate NUMERIC
) AS $$
  SELECT
    u.id AS user_id,
    u.username,
    u.display_name,
    u.avatar_url,
    u.is_verified,
    u.follower_count,
    SUM(p.views_count)::INT AS total_views,
    SUM(p.likes_count + p.comments_count)::INT AS total_engagement,
    ROUND(
      (SUM(p.likes_count + p.comments_count)::NUMERIC / NULLIF(SUM(p.views_count), 0)) * 100,
      2
    ) AS engagement_rate
  FROM users u
  INNER JOIN posts p ON p.user_id = u.id
  WHERE p.published_at IS NOT NULL
  GROUP BY u.id, u.username, u.display_name, u.avatar_url, u.is_verified, u.follower_count
  HAVING SUM(p.views_count) >= 100
  ORDER BY engagement_rate DESC NULLS LAST
  LIMIT result_limit;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_most_engaging(INT) TO anon, authenticated;

-- Migration 012: Suggested Creators by niche overlap (PRD §6.13 FN-06)
-- Safe to re-run.
--
-- Returns top creators a viewer might want to follow, ranked by how many of
-- the viewer's niche_tags they share (then by follower_count). Excludes the
-- viewer themselves and anyone the viewer already follows.
--
-- Anonymous fallback: if viewer_id is NULL or the viewer has no niche_tags
-- set, return the most-followed creators with at least one published post.

CREATE OR REPLACE FUNCTION get_suggested_creators(
  viewer_id UUID DEFAULT NULL,
  result_limit INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  username VARCHAR,
  display_name VARCHAR,
  avatar_url TEXT,
  is_verified BOOLEAN,
  follower_count INT,
  niche_tags TEXT[],
  shared_niche_count INT
) AS $$
DECLARE
  viewer_niches TEXT[];
BEGIN
  IF viewer_id IS NOT NULL THEN
    SELECT u.niche_tags INTO viewer_niches FROM users u WHERE u.id = viewer_id;
  END IF;

  -- Anonymous / no-niches viewer → popularity fallback
  IF viewer_niches IS NULL OR array_length(viewer_niches, 1) IS NULL THEN
    RETURN QUERY
    SELECT
      u.id, u.username, u.display_name, u.avatar_url, u.is_verified,
      u.follower_count, u.niche_tags,
      0 AS shared_niche_count
    FROM users u
    WHERE
      -- Has at least one published post
      EXISTS (
        SELECT 1 FROM posts p
        WHERE p.user_id = u.id AND p.published_at IS NOT NULL
      )
      AND (viewer_id IS NULL OR u.id <> viewer_id)
      -- Skip anyone the viewer already follows
      AND (viewer_id IS NULL OR NOT EXISTS (
        SELECT 1 FROM follows f
        WHERE f.follower_id = viewer_id AND f.following_id = u.id
      ))
    ORDER BY u.follower_count DESC NULLS LAST
    LIMIT result_limit;
    RETURN;
  END IF;

  -- Niche-aware ranking
  RETURN QUERY
  SELECT
    u.id, u.username, u.display_name, u.avatar_url, u.is_verified,
    u.follower_count, u.niche_tags,
    COALESCE(cardinality(ARRAY(
      SELECT UNNEST(u.niche_tags) INTERSECT SELECT UNNEST(viewer_niches)
    )), 0) AS shared_niche_count
  FROM users u
  WHERE
    u.id <> viewer_id
    -- Skip already-followed creators
    AND NOT EXISTS (
      SELECT 1 FROM follows f
      WHERE f.follower_id = viewer_id AND f.following_id = u.id
    )
    -- Must overlap on at least one niche
    AND u.niche_tags && viewer_niches
    -- Must have published at least one post
    AND EXISTS (
      SELECT 1 FROM posts p
      WHERE p.user_id = u.id AND p.published_at IS NOT NULL
    )
  ORDER BY shared_niche_count DESC, u.follower_count DESC NULLS LAST
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_suggested_creators(UUID, INT) TO anon, authenticated;

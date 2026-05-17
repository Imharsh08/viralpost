-- Migration 016: Fix get_post_comments RPC column-name shadowing
-- Safe to re-run.
--
-- Background
--   Migration 014 created get_post_comments() with a RETURNS TABLE clause
--   whose output column names match the source columns: id, content,
--   created_at, likes_count, parent_comment_id. In PostgreSQL plpgsql /
--   SQL functions, RETURNS TABLE column names are treated as variables
--   inside the function body. When the SELECT body references the same
--   unqualified names (or even qualified ones like c.content), the column
--   resolution can pick the RETURNS TABLE variable instead of the table
--   column — which is uninitialized (NULL).
--
--   Result: rows return with NULL content/created_at/etc. Counts are
--   served from posts.comments_count (a separate denormalized column)
--   and continue to look correct, hiding the bug.
--
--   The fix: rename the output columns so they cannot shadow source
--   columns. Output columns now prefixed with `c_` (comment fields) and
--   `author_` (already prefixed; kept). The API reshape adapter is
--   updated in the same change to read the new names.

-- Drop first to avoid signature-mismatch on CREATE OR REPLACE
DROP FUNCTION IF EXISTS get_post_comments(UUID);

CREATE FUNCTION get_post_comments(p_post_id UUID)
RETURNS TABLE (
  c_id UUID,
  c_content TEXT,
  c_created_at TIMESTAMPTZ,
  c_likes_count INT,
  c_parent_comment_id UUID,
  author_id UUID,
  author_username VARCHAR,
  author_display_name VARCHAR,
  author_avatar_url TEXT,
  author_is_verified BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id              AS c_id,
    c.content         AS c_content,
    c.created_at      AS c_created_at,
    c.likes_count     AS c_likes_count,
    c.parent_comment_id AS c_parent_comment_id,
    u.id              AS author_id,
    u.username        AS author_username,
    u.display_name    AS author_display_name,
    u.avatar_url      AS author_avatar_url,
    u.is_verified     AS author_is_verified
  FROM comments c
  INNER JOIN users u ON u.id = c.user_id
  WHERE c.post_id = p_post_id
  ORDER BY c.created_at ASC;
$$;

GRANT EXECUTE ON FUNCTION get_post_comments(UUID) TO anon, authenticated;

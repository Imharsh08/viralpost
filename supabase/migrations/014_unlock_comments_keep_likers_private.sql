-- Migration 014: Make comments public again (Instagram-style)
-- Safe to re-run.
--
-- Migration 013 gated the `comments` table to authenticated viewers only.
-- That broke the Instagram-like experience where everyone — including
-- logged-out visitors — can read public post comments. This restores the
-- public-read policy. Liker lists (post_likes, comment_likes) stay locked
-- to own-rows-only from migration 013, since those reveal identity-level
-- engagement and are not displayed in any UI anyway.

-- Defensively drop EVERY known SELECT policy variant on `comments` so we
-- end up with exactly one open-read policy, no matter what state previous
-- migrations left things in.
DROP POLICY IF EXISTS "Authenticated users can view comments" ON comments;
DROP POLICY IF EXISTS "Anyone can view comments" ON comments;
DROP POLICY IF EXISTS "Users can view comments" ON comments;
DROP POLICY IF EXISTS "Comments are public" ON comments;

CREATE POLICY "Anyone can view comments"
  ON comments FOR SELECT
  USING (true);

-- Sanity check: log how many SELECT policies exist on comments after the
-- migration. Running this in psql / SQL editor should print exactly 1.
DO $$
DECLARE
  cnt INTEGER;
BEGIN
  SELECT count(*) INTO cnt FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'comments' AND cmd = 'SELECT';
  RAISE NOTICE 'Migration 014: % SELECT policy(ies) on public.comments', cnt;
  IF cnt <> 1 THEN
    RAISE WARNING 'Migration 014: expected exactly 1 SELECT policy on comments, found %', cnt;
  END IF;
END $$;

-- Belt-and-suspenders: a SECURITY DEFINER RPC that bypasses RLS entirely
-- for the comment read path. The API uses this so a future RLS misconfig
-- can never silently empty the comment thread again. Returns the full
-- tree shape the UI expects (one row per comment; client groups replies).
CREATE OR REPLACE FUNCTION get_post_comments(p_post_id UUID)
RETURNS TABLE (
  id UUID,
  content TEXT,
  created_at TIMESTAMPTZ,
  likes_count INT,
  parent_comment_id UUID,
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
    c.id,
    c.content,
    c.created_at,
    c.likes_count,
    c.parent_comment_id,
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

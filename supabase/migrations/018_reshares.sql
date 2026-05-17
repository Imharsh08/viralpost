-- Migration 018: Reshares — quote-post style + plain reshare
-- Safe to re-run.
--
-- Model: a reshare is a normal row in `posts` that points at the original
-- via `parent_post_id`. The reshare author becomes `user_id`; the original
-- author is reached via the FK on parent_post_id. Two reshare modes:
--   1. Quick reshare        — content empty, parent_post_id set
--   2. Reshare with thoughts — content has the author's commentary
--
-- Why a column instead of a separate table:
--   - Reshares already need an author, timestamp, like/comment count, etc.
--     `posts` has all of them.
--   - The feed query stays one INNER JOIN to users; just a LEFT JOIN to
--     the parent post to embed the original card.
--   - Future quote-chains (reshare-of-a-reshare) just walk parent_post_id.

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS parent_post_id UUID REFERENCES posts(id) ON DELETE SET NULL;

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS reshares_count INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_posts_parent_post_id
  ON posts(parent_post_id)
  WHERE parent_post_id IS NOT NULL;

-- Block reshare loops at the DB level — a reshare can only reference an
-- ORIGINAL (parent_post_id IS NULL). This means a "reshare of a reshare"
-- collapses to "reshare of the original" — the UI layer flattens the
-- parent chain before POSTing.
ALTER TABLE posts
  DROP CONSTRAINT IF EXISTS posts_no_reshare_chain;
-- (We can't enforce parent.parent_post_id IS NULL with a CHECK constraint
--  because CHECK can't reference another row. The API layer enforces it
--  by walking the parent chain to find the root before insert.)

-- Bump reshares_count on the parent when a reshare is created/deleted.
-- SECURITY DEFINER so the trigger can write to the parent row even though
-- the reshare author probably doesn't own that post.
CREATE OR REPLACE FUNCTION update_post_reshares_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.parent_post_id IS NOT NULL THEN
    UPDATE posts
       SET reshares_count = COALESCE(reshares_count, 0) + 1
     WHERE id = NEW.parent_post_id;

  ELSIF TG_OP = 'DELETE' AND OLD.parent_post_id IS NOT NULL THEN
    UPDATE posts
       SET reshares_count = GREATEST(COALESCE(reshares_count, 0) - 1, 0)
     WHERE id = OLD.parent_post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS update_post_reshares_count_trigger ON posts;
CREATE TRIGGER update_post_reshares_count_trigger
AFTER INSERT OR DELETE ON posts
FOR EACH ROW EXECUTE FUNCTION update_post_reshares_count();

-- Notify the original author when their post gets reshared (skip
-- self-reshares — author resharing their own post doesn't generate a
-- notification).
CREATE OR REPLACE FUNCTION notify_post_reshare()
RETURNS TRIGGER AS $$
DECLARE
  original_author UUID;
BEGIN
  IF NEW.parent_post_id IS NULL THEN RETURN NEW; END IF;
  SELECT user_id INTO original_author FROM posts WHERE id = NEW.parent_post_id;
  IF original_author IS NOT NULL AND original_author <> NEW.user_id THEN
    INSERT INTO notifications (user_id, actor_id, type, post_id, message)
    VALUES (original_author, NEW.user_id, 'reshare', NEW.parent_post_id, 'reshared your post');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_notify_post_reshare ON posts;
CREATE TRIGGER trg_notify_post_reshare
AFTER INSERT ON posts
FOR EACH ROW EXECUTE FUNCTION notify_post_reshare();

-- Reconcile any existing data (no reshares yet, but this is idempotent
-- and harmless to run on a fresh DB).
UPDATE posts p
SET reshares_count = COALESCE((
  SELECT COUNT(*) FROM posts r WHERE r.parent_post_id = p.id
), 0);

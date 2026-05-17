-- Migration 011: Comment likes + reply notifications
-- Safe to re-run
--
-- The comments table already has parent_comment_id (from migration 001) and
-- a likes_count column, but there's no comment_likes join table yet and no
-- triggers to maintain the count. This adds:
--   1. comment_likes table with RLS
--   2. count trigger so comments.likes_count stays accurate
--   3. notification trigger so the comment author gets pinged on likes
--   4. notification trigger so a parent-comment author gets pinged on replies

-- 1. comment_likes join table
CREATE TABLE IF NOT EXISTS comment_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(comment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user_id ON comment_likes(user_id);

ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view comment likes" ON comment_likes;
CREATE POLICY "Anyone can view comment likes"
  ON comment_likes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can like comments" ON comment_likes;
CREATE POLICY "Users can like comments"
  ON comment_likes FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can unlike comments" ON comment_likes;
CREATE POLICY "Users can unlike comments"
  ON comment_likes FOR DELETE USING (user_id = auth.uid());

-- 2. Maintain comments.likes_count via trigger
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
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_comment_likes_count_trigger ON comment_likes;
CREATE TRIGGER update_comment_likes_count_trigger
AFTER INSERT OR DELETE ON comment_likes
FOR EACH ROW EXECUTE FUNCTION update_comment_likes_count();

-- 3. Notify the comment author on like (skip self-likes)
CREATE OR REPLACE FUNCTION notify_comment_like()
RETURNS TRIGGER AS $$
DECLARE
  comment_author UUID;
  parent_post UUID;
BEGIN
  SELECT user_id, post_id INTO comment_author, parent_post
  FROM comments WHERE id = NEW.comment_id;

  IF comment_author IS NOT NULL AND comment_author <> NEW.user_id THEN
    INSERT INTO notifications (user_id, actor_id, type, post_id, comment_id, message)
    VALUES (comment_author, NEW.user_id, 'comment_like', parent_post, NEW.comment_id, 'liked your comment');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_comment_like ON comment_likes;
CREATE TRIGGER trg_notify_comment_like
AFTER INSERT ON comment_likes
FOR EACH ROW EXECUTE FUNCTION notify_comment_like();

-- 4. Notify the parent-comment author when someone replies (skip self-replies)
-- The existing notify_post_comment trigger (migration 005) handles top-level
-- comments. This handles the reply case — when parent_comment_id is set.
CREATE OR REPLACE FUNCTION notify_comment_reply()
RETURNS TRIGGER AS $$
DECLARE
  parent_author UUID;
BEGIN
  IF NEW.parent_comment_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT user_id INTO parent_author FROM comments WHERE id = NEW.parent_comment_id;

  IF parent_author IS NOT NULL AND parent_author <> NEW.user_id THEN
    INSERT INTO notifications (user_id, actor_id, type, post_id, comment_id, message)
    VALUES (parent_author, NEW.user_id, 'reply', NEW.post_id, NEW.id, 'replied to your comment');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_comment_reply ON comments;
CREATE TRIGGER trg_notify_comment_reply
AFTER INSERT ON comments
FOR EACH ROW EXECUTE FUNCTION notify_comment_reply();

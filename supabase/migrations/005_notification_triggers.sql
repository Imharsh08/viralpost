-- Migration 005: Auto-create notifications for likes, comments, follows
-- Safe to re-run — uses CREATE OR REPLACE + DROP TRIGGER IF EXISTS

-- 1. Trigger: notify post author when someone likes their post
CREATE OR REPLACE FUNCTION notify_post_like()
RETURNS TRIGGER AS $$
DECLARE
  post_author UUID;
BEGIN
  SELECT user_id INTO post_author FROM posts WHERE id = NEW.post_id;
  -- Don't notify self-likes
  IF post_author IS NOT NULL AND post_author <> NEW.user_id THEN
    INSERT INTO notifications (user_id, actor_id, type, post_id, message)
    VALUES (post_author, NEW.user_id, 'like', NEW.post_id, 'liked your post');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_post_like ON post_likes;
CREATE TRIGGER trg_notify_post_like
AFTER INSERT ON post_likes
FOR EACH ROW EXECUTE FUNCTION notify_post_like();

-- 2. Trigger: notify post author when someone comments on their post
CREATE OR REPLACE FUNCTION notify_post_comment()
RETURNS TRIGGER AS $$
DECLARE
  post_author UUID;
BEGIN
  SELECT user_id INTO post_author FROM posts WHERE id = NEW.post_id;
  IF post_author IS NOT NULL AND post_author <> NEW.user_id THEN
    INSERT INTO notifications (user_id, actor_id, type, post_id, comment_id, message)
    VALUES (post_author, NEW.user_id, 'comment', NEW.post_id, NEW.id, 'commented on your post');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_post_comment ON comments;
CREATE TRIGGER trg_notify_post_comment
AFTER INSERT ON comments
FOR EACH ROW EXECUTE FUNCTION notify_post_comment();

-- 3. Trigger: notify when someone follows you
CREATE OR REPLACE FUNCTION notify_new_follower()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, actor_id, type, message)
  VALUES (NEW.following_id, NEW.follower_id, 'follow', 'started following you');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_new_follower ON follows;
CREATE TRIGGER trg_notify_new_follower
AFTER INSERT ON follows
FOR EACH ROW EXECUTE FUNCTION notify_new_follower();

-- 4. Add notifications to Realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;
END $$;

ALTER TABLE notifications REPLICA IDENTITY FULL;

-- 5. Index for unread count + recency
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications(user_id, is_read, created_at DESC);

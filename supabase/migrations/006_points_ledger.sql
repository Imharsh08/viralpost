-- Migration 006: Live Points Engine
-- Adds points_ledger table + auto-crediting triggers per PRD §6.5
-- Safe to re-run

-- 1. Ledger table — append-only history of every points event
CREATE TABLE IF NOT EXISTS points_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  event_type VARCHAR(50) NOT NULL,
  points INTEGER NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_points_ledger_user_created
  ON points_ledger(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_points_ledger_event_type
  ON points_ledger(event_type);

ALTER TABLE points_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own ledger" ON points_ledger;
CREATE POLICY "Users can view own ledger"
  ON points_ledger FOR SELECT USING (user_id = auth.uid());

-- 2. Helper: credit points and write ledger entry (with daily cap)
CREATE OR REPLACE FUNCTION credit_points(
  p_user_id UUID,
  p_post_id UUID,
  p_event_type VARCHAR,
  p_points INTEGER,
  p_metadata JSONB DEFAULT '{}'
) RETURNS VOID AS $$
DECLARE
  today_total INTEGER;
  DAILY_CAP CONSTANT INTEGER := 500;
BEGIN
  -- PRD anti-fraud: 500 pts/day cap
  SELECT COALESCE(SUM(points), 0) INTO today_total
  FROM points_ledger
  WHERE user_id = p_user_id
    AND points > 0
    AND created_at >= date_trunc('day', NOW());

  IF today_total >= DAILY_CAP THEN
    RETURN;
  END IF;

  -- Trim points to fit under cap
  IF today_total + p_points > DAILY_CAP THEN
    p_points := DAILY_CAP - today_total;
  END IF;

  INSERT INTO points_ledger (user_id, post_id, event_type, points, metadata)
  VALUES (p_user_id, p_post_id, p_event_type, p_points, p_metadata);

  UPDATE users
  SET points_balance = COALESCE(points_balance, 0) + p_points
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Trigger: +1 pt to post author when their post is liked (skip self-likes)
CREATE OR REPLACE FUNCTION credit_points_on_like()
RETURNS TRIGGER AS $$
DECLARE
  post_author UUID;
BEGIN
  SELECT user_id INTO post_author FROM posts WHERE id = NEW.post_id;
  IF post_author IS NOT NULL AND post_author <> NEW.user_id THEN
    PERFORM credit_points(post_author, NEW.post_id, 'like', 1,
      jsonb_build_object('liked_by', NEW.user_id));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_credit_points_on_like ON post_likes;
CREATE TRIGGER trg_credit_points_on_like
AFTER INSERT ON post_likes
FOR EACH ROW EXECUTE FUNCTION credit_points_on_like();

-- 4. Trigger: +5 pts to creator when they gain a follower
CREATE OR REPLACE FUNCTION credit_points_on_follow()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM credit_points(NEW.following_id, NULL, 'follow', 5,
    jsonb_build_object('follower_id', NEW.follower_id));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_credit_points_on_follow ON follows;
CREATE TRIGGER trg_credit_points_on_follow
AFTER INSERT ON follows
FOR EACH ROW EXECUTE FUNCTION credit_points_on_follow();

-- 5. Trigger: +50 pts first-post bonus (per user, lifetime)
CREATE OR REPLACE FUNCTION credit_first_post_bonus()
RETURNS TRIGGER AS $$
DECLARE
  prior_published INTEGER;
BEGIN
  -- Only on transition from draft → published
  IF NEW.published_at IS NOT NULL AND (OLD.published_at IS NULL OR TG_OP = 'INSERT') THEN
    SELECT COUNT(*) INTO prior_published
    FROM posts
    WHERE user_id = NEW.user_id
      AND id <> NEW.id
      AND published_at IS NOT NULL;

    IF prior_published = 0 THEN
      PERFORM credit_points(NEW.user_id, NEW.id, 'first_post_bonus', 50,
        jsonb_build_object('post_id', NEW.id));
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_credit_first_post_bonus ON posts;
CREATE TRIGGER trg_credit_first_post_bonus
AFTER INSERT OR UPDATE OF published_at ON posts
FOR EACH ROW EXECUTE FUNCTION credit_first_post_bonus();

-- 6. Trigger: view milestones (+100 at 1K, +500 at 5K, +1000 at 10K)
-- Idempotent — checks ledger to ensure each milestone fires once per post
CREATE OR REPLACE FUNCTION credit_view_milestones()
RETURNS TRIGGER AS $$
DECLARE
  milestone INTEGER;
  reward INTEGER;
  already_credited BOOLEAN;
BEGIN
  IF NEW.views_count = OLD.views_count THEN
    RETURN NEW;
  END IF;

  FOR milestone, reward IN
    SELECT * FROM (VALUES (1000, 100), (5000, 500), (10000, 1000)) AS m(views, pts)
  LOOP
    IF NEW.views_count >= milestone AND OLD.views_count < milestone THEN
      SELECT EXISTS (
        SELECT 1 FROM points_ledger
        WHERE post_id = NEW.id
          AND event_type = 'milestone'
          AND (metadata->>'milestone')::INTEGER = milestone
      ) INTO already_credited;

      IF NOT already_credited THEN
        PERFORM credit_points(NEW.user_id, NEW.id, 'milestone', reward,
          jsonb_build_object('milestone', milestone, 'views', NEW.views_count));

        UPDATE posts SET points_earned = COALESCE(points_earned, 0) + reward
        WHERE id = NEW.id;

        -- Mark trending at first milestone
        IF milestone = 1000 AND NOT NEW.is_trending THEN
          UPDATE posts SET is_trending = TRUE WHERE id = NEW.id;
        END IF;
      END IF;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_credit_view_milestones ON posts;
CREATE TRIGGER trg_credit_view_milestones
AFTER UPDATE OF views_count ON posts
FOR EACH ROW EXECUTE FUNCTION credit_view_milestones();

-- 7. Helper RPC: get ledger summary for a user (for analytics page)
CREATE OR REPLACE FUNCTION get_points_summary(p_user_id UUID)
RETURNS TABLE (
  total_lifetime INTEGER,
  total_this_week INTEGER,
  pts_from_likes INTEGER,
  pts_from_follows INTEGER,
  pts_from_milestones INTEGER,
  pts_from_bonus INTEGER
) AS $$
  SELECT
    COALESCE(SUM(points), 0)::INTEGER AS total_lifetime,
    COALESCE(SUM(points) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days'), 0)::INTEGER AS total_this_week,
    COALESCE(SUM(points) FILTER (WHERE event_type = 'like'), 0)::INTEGER AS pts_from_likes,
    COALESCE(SUM(points) FILTER (WHERE event_type = 'follow'), 0)::INTEGER AS pts_from_follows,
    COALESCE(SUM(points) FILTER (WHERE event_type = 'milestone'), 0)::INTEGER AS pts_from_milestones,
    COALESCE(SUM(points) FILTER (WHERE event_type IN ('first_post_bonus', 'profile_completeness')), 0)::INTEGER AS pts_from_bonus
  FROM points_ledger
  WHERE user_id = p_user_id AND points > 0;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_points_summary(UUID) TO authenticated;

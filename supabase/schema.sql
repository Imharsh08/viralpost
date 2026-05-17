-- ============================================================================
-- ViralPost — Consolidated Schema (final state of migrations 001-016)
-- ============================================================================
--
-- Use this file when seeding a BRAND NEW Supabase project. It applies the same
-- final schema state as running migrations 001 through 016 in order, but in
-- one transaction, faster, and without the historical noise.
--
-- DO NOT run this on a database that already has the per-file migrations
-- applied — use the migrations/ directory for incremental updates instead.
-- This file drops and recreates everything.
--
-- After running this, the database has:
--   • Tables: users, posts, post_likes, comments, comment_likes,
--     post_shares, follows, uploads, trending_tags, user_stats,
--     post_views, notifications, points_ledger
--   • Storage bucket: post-images (public, 5MB cap, own-folder RLS)
--   • Triggers: count maintenance (SECURITY DEFINER), notifications,
--     points crediting, profile-completeness bonus
--   • RPCs: get_following_feed, is_following, get_top_earners,
--     get_most_viral_posts, get_most_engaging, get_suggested_creators,
--     get_post_comments, get_points_summary, credit_points,
--     increment_views, credit_view_milestones
--   • Realtime publication: posts, users, notifications
--   • RLS: enabled on every table with final-state policies (e.g.
--     own-rows-only on post_likes / comment_likes; public read on comments)
-- ============================================================================

-- ============================================================================
-- 0. CLEAN SLATE
-- ============================================================================
DROP TABLE IF EXISTS points_ledger CASCADE;
DROP TABLE IF EXISTS comment_likes CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS post_views CASCADE;
DROP TABLE IF EXISTS user_stats CASCADE;
DROP TABLE IF EXISTS trending_tags CASCADE;
DROP TABLE IF EXISTS uploads CASCADE;
DROP TABLE IF EXISTS follows CASCADE;
DROP TABLE IF EXISTS post_shares CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS post_likes CASCADE;
DROP TABLE IF EXISTS posts CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================================================
-- 1. TABLES
-- ============================================================================

-- users.id IS the Supabase auth UUID — no separate auth_id needed
CREATE TABLE users (
  id                 UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username           VARCHAR(50) NOT NULL UNIQUE,
  display_name       VARCHAR(255) NOT NULL,
  avatar_url         TEXT,
  bio                TEXT,
  is_verified        BOOLEAN DEFAULT FALSE,
  email              VARCHAR(255) NOT NULL UNIQUE,
  follower_count     INTEGER DEFAULT 0,
  following_count    INTEGER DEFAULT 0,
  points_balance     INTEGER DEFAULT 0,                  -- from 002
  niche_tags         TEXT[] DEFAULT '{}',                -- from 007
  headline           VARCHAR(160),                       -- from 007
  onboarded_at       TIMESTAMPTZ,                        -- from 007
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE posts (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title              VARCHAR(500) NOT NULL,
  excerpt            TEXT,
  content            TEXT NOT NULL,
  tags               TEXT[] DEFAULT '{}',
  likes_count        INTEGER DEFAULT 0,
  comments_count     INTEGER DEFAULT 0,
  shares_count       INTEGER DEFAULT 0,
  views_count        INTEGER DEFAULT 0,
  points_earned      INTEGER DEFAULT 0,
  is_trending        BOOLEAN DEFAULT FALSE,
  is_ai_enhanced     BOOLEAN DEFAULT FALSE,
  featured_image_url TEXT,
  published_at       TIMESTAMPTZ,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE post_likes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

CREATE TABLE comments (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id            UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_comment_id  UUID REFERENCES comments(id) ON DELETE CASCADE,
  content            TEXT NOT NULL,
  likes_count        INTEGER DEFAULT 0,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

-- from 011
CREATE TABLE comment_likes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id  UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(comment_id, user_id)
);

CREATE TABLE post_shares (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform    VARCHAR(50) NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE follows (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id <> following_id)
);

CREATE TABLE uploads (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_name   VARCHAR(255) NOT NULL,
  file_size   INTEGER NOT NULL,
  file_type   VARCHAR(50) NOT NULL,
  file_url    TEXT NOT NULL,
  bucket_path TEXT NOT NULL,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE trending_tags (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(100) NOT NULL UNIQUE,
  post_count   INTEGER DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_stats (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  weekly_views      INTEGER DEFAULT 0,
  total_followers   INTEGER DEFAULT 0,
  total_posts       INTEGER DEFAULT 0,
  total_engagement  INTEGER DEFAULT 0,
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE post_views (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  viewer_ip   TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  type        VARCHAR(50) NOT NULL,
  post_id     UUID REFERENCES posts(id) ON DELETE CASCADE,
  comment_id  UUID REFERENCES comments(id) ON DELETE CASCADE,
  message     TEXT,
  is_read     BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- from 006 — append-only ledger of every points event
CREATE TABLE points_ledger (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id     UUID REFERENCES posts(id) ON DELETE SET NULL,
  event_type  VARCHAR(50) NOT NULL,
  points      INTEGER NOT NULL,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2. INDEXES
-- ============================================================================
CREATE INDEX idx_posts_user_id              ON posts(user_id);
CREATE INDEX idx_posts_created_at           ON posts(created_at DESC);
CREATE INDEX idx_posts_is_trending          ON posts(is_trending);
CREATE INDEX idx_posts_user_published       ON posts(user_id, published_at DESC) WHERE published_at IS NOT NULL;
CREATE INDEX idx_post_likes_post_id         ON post_likes(post_id);
CREATE INDEX idx_post_likes_user_id         ON post_likes(user_id);
CREATE INDEX idx_comments_post_id           ON comments(post_id);
CREATE INDEX idx_comments_user_id           ON comments(user_id);
CREATE INDEX idx_comment_likes_comment_id   ON comment_likes(comment_id);
CREATE INDEX idx_comment_likes_user_id      ON comment_likes(user_id);
CREATE INDEX idx_follows_follower_id        ON follows(follower_id);
CREATE INDEX idx_follows_following_id       ON follows(following_id);
CREATE INDEX idx_follows_follower_following ON follows(follower_id, following_id);
CREATE INDEX idx_uploads_user_id            ON uploads(user_id);
CREATE INDEX idx_notifications_user_id      ON notifications(user_id);
CREATE INDEX idx_notifications_is_read      ON notifications(is_read);
CREATE INDEX idx_notifications_user_unread  ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_post_views_post_id         ON post_views(post_id);
CREATE INDEX idx_points_ledger_user_created ON points_ledger(user_id, created_at DESC);
CREATE INDEX idx_points_ledger_event_type   ON points_ledger(event_type);

-- ============================================================================
-- 3. ROW LEVEL SECURITY — enable on every table, then declare final policies
-- ============================================================================
ALTER TABLE users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_likes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_shares    ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows        ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploads        ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats     ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_views     ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications  ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_ledger  ENABLE ROW LEVEL SECURITY;

-- users: public profiles
CREATE POLICY "Users can view all profiles" ON users FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

-- posts: public reads of published; full CRUD on own rows
CREATE POLICY "Anyone can view published posts" ON posts FOR SELECT
  USING (published_at IS NOT NULL OR user_id = auth.uid());
CREATE POLICY "Users can insert own posts" ON posts FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own posts" ON posts FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own posts" ON posts FOR DELETE USING (user_id = auth.uid());

-- post_likes: own-rows only (migration 013) — counts are denormalized
CREATE POLICY "Users can only see their own post likes" ON post_likes FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "Users can like posts" ON post_likes FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can unlike posts" ON post_likes FOR DELETE USING (user_id = auth.uid());

-- comments: public reads (Instagram-style) — content is part of the post
CREATE POLICY "Anyone can view comments" ON comments FOR SELECT USING (true);
CREATE POLICY "Users can insert comments" ON comments FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own comments" ON comments FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own comments" ON comments FOR DELETE USING (user_id = auth.uid());

-- comment_likes: own-rows only
CREATE POLICY "Users can only see their own comment likes" ON comment_likes FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "Users can like comments" ON comment_likes FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can unlike comments" ON comment_likes FOR DELETE USING (user_id = auth.uid());

-- post_shares: public reads, own inserts
CREATE POLICY "Anyone can view shares" ON post_shares FOR SELECT USING (true);
CREATE POLICY "Users can share posts" ON post_shares FOR INSERT WITH CHECK (user_id = auth.uid());

-- follows: public reads, own writes
CREATE POLICY "Anyone can view follows" ON follows FOR SELECT USING (true);
CREATE POLICY "Users can follow others" ON follows FOR INSERT WITH CHECK (follower_id = auth.uid());
CREATE POLICY "Users can unfollow" ON follows FOR DELETE USING (follower_id = auth.uid());

-- uploads: own-rows only
CREATE POLICY "Users can view own uploads" ON uploads FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can upload files" ON uploads FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own uploads" ON uploads FOR DELETE USING (user_id = auth.uid());

-- user_stats: own-rows only
CREATE POLICY "Users can view own stats" ON user_stats FOR SELECT USING (user_id = auth.uid());

-- notifications: own-rows only
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (user_id = auth.uid());

-- points_ledger: own-rows only
CREATE POLICY "Users can view own ledger" ON points_ledger FOR SELECT USING (user_id = auth.uid());

-- ============================================================================
-- 4. REPLICA IDENTITY + REALTIME PUBLICATION (migration 004)
-- ============================================================================
ALTER TABLE posts         REPLICA IDENTITY FULL;
ALTER TABLE users         REPLICA IDENTITY FULL;
ALTER TABLE notifications REPLICA IDENTITY FULL;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='posts')
    THEN ALTER PUBLICATION supabase_realtime ADD TABLE posts; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='users')
    THEN ALTER PUBLICATION supabase_realtime ADD TABLE users; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='notifications')
    THEN ALTER PUBLICATION supabase_realtime ADD TABLE notifications; END IF;
END $$;

-- ============================================================================
-- 5. TRIGGER FUNCTIONS — denormalized count maintenance
--    All SECURITY DEFINER (migration 015) so they bypass RLS on parent
--    tables when a user acts on someone else's content.
-- ============================================================================

-- 5a. updated_at touch
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at    BEFORE UPDATE ON users    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_posts_updated_at    BEFORE UPDATE ON posts    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5b. posts.likes_count
CREATE OR REPLACE FUNCTION update_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    UPDATE posts SET likes_count = COALESCE(likes_count,0)+1 WHERE id = NEW.post_id;
  ELSIF TG_OP='DELETE' THEN
    UPDATE posts SET likes_count = GREATEST(COALESCE(likes_count,0)-1,0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_post_likes_count_trigger
AFTER INSERT OR DELETE ON post_likes
FOR EACH ROW EXECUTE FUNCTION update_post_likes_count();

-- 5c. posts.comments_count
CREATE OR REPLACE FUNCTION update_post_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    UPDATE posts SET comments_count = COALESCE(comments_count,0)+1 WHERE id = NEW.post_id;
  ELSIF TG_OP='DELETE' THEN
    UPDATE posts SET comments_count = GREATEST(COALESCE(comments_count,0)-1,0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_post_comments_count_trigger
AFTER INSERT OR DELETE ON comments
FOR EACH ROW EXECUTE FUNCTION update_post_comments_count();

-- 5d. posts.shares_count
CREATE OR REPLACE FUNCTION update_post_shares_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    UPDATE posts SET shares_count = COALESCE(shares_count,0)+1 WHERE id = NEW.post_id;
  ELSIF TG_OP='DELETE' THEN
    UPDATE posts SET shares_count = GREATEST(COALESCE(shares_count,0)-1,0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_post_shares_count_trigger
AFTER INSERT OR DELETE ON post_shares
FOR EACH ROW EXECUTE FUNCTION update_post_shares_count();

-- 5e. users.follower_count + following_count
CREATE OR REPLACE FUNCTION update_follower_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    UPDATE users SET follower_count  = COALESCE(follower_count, 0)+1 WHERE id = NEW.following_id;
    UPDATE users SET following_count = COALESCE(following_count,0)+1 WHERE id = NEW.follower_id;
  ELSIF TG_OP='DELETE' THEN
    UPDATE users SET follower_count  = GREATEST(COALESCE(follower_count, 0)-1,0) WHERE id = OLD.following_id;
    UPDATE users SET following_count = GREATEST(COALESCE(following_count,0)-1,0) WHERE id = OLD.follower_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_follower_count_trigger
AFTER INSERT OR DELETE ON follows
FOR EACH ROW EXECUTE FUNCTION update_follower_count();

-- 5f. comments.likes_count (from comment_likes)
CREATE OR REPLACE FUNCTION update_comment_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    UPDATE comments SET likes_count = COALESCE(likes_count,0)+1 WHERE id = NEW.comment_id;
  ELSIF TG_OP='DELETE' THEN
    UPDATE comments SET likes_count = GREATEST(COALESCE(likes_count,0)-1,0) WHERE id = OLD.comment_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_comment_likes_count_trigger
AFTER INSERT OR DELETE ON comment_likes
FOR EACH ROW EXECUTE FUNCTION update_comment_likes_count();

-- ============================================================================
-- 6. TRIGGER FUNCTIONS — notifications + points crediting
-- ============================================================================

-- 6a. notify on post like (skip self)
CREATE OR REPLACE FUNCTION notify_post_like()
RETURNS TRIGGER AS $$
DECLARE post_author UUID;
BEGIN
  SELECT user_id INTO post_author FROM posts WHERE id = NEW.post_id;
  IF post_author IS NOT NULL AND post_author <> NEW.user_id THEN
    INSERT INTO notifications (user_id, actor_id, type, post_id, message)
    VALUES (post_author, NEW.user_id, 'like', NEW.post_id, 'liked your post');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_notify_post_like AFTER INSERT ON post_likes
FOR EACH ROW EXECUTE FUNCTION notify_post_like();

-- 6b. notify on post comment (skip self)
CREATE OR REPLACE FUNCTION notify_post_comment()
RETURNS TRIGGER AS $$
DECLARE post_author UUID;
BEGIN
  SELECT user_id INTO post_author FROM posts WHERE id = NEW.post_id;
  IF post_author IS NOT NULL AND post_author <> NEW.user_id THEN
    INSERT INTO notifications (user_id, actor_id, type, post_id, comment_id, message)
    VALUES (post_author, NEW.user_id, 'comment', NEW.post_id, NEW.id, 'commented on your post');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_notify_post_comment AFTER INSERT ON comments
FOR EACH ROW EXECUTE FUNCTION notify_post_comment();

-- 6c. notify on new follower
CREATE OR REPLACE FUNCTION notify_new_follower()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, actor_id, type, message)
  VALUES (NEW.following_id, NEW.follower_id, 'follow', 'started following you');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_notify_new_follower AFTER INSERT ON follows
FOR EACH ROW EXECUTE FUNCTION notify_new_follower();

-- 6d. notify on comment like
CREATE OR REPLACE FUNCTION notify_comment_like()
RETURNS TRIGGER AS $$
DECLARE comment_author UUID; parent_post UUID;
BEGIN
  SELECT user_id, post_id INTO comment_author, parent_post FROM comments WHERE id = NEW.comment_id;
  IF comment_author IS NOT NULL AND comment_author <> NEW.user_id THEN
    INSERT INTO notifications (user_id, actor_id, type, post_id, comment_id, message)
    VALUES (comment_author, NEW.user_id, 'comment_like', parent_post, NEW.comment_id, 'liked your comment');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_notify_comment_like AFTER INSERT ON comment_likes
FOR EACH ROW EXECUTE FUNCTION notify_comment_like();

-- 6e. notify on comment reply (parent_comment_id set)
CREATE OR REPLACE FUNCTION notify_comment_reply()
RETURNS TRIGGER AS $$
DECLARE parent_author UUID;
BEGIN
  IF NEW.parent_comment_id IS NULL THEN RETURN NEW; END IF;
  SELECT user_id INTO parent_author FROM comments WHERE id = NEW.parent_comment_id;
  IF parent_author IS NOT NULL AND parent_author <> NEW.user_id THEN
    INSERT INTO notifications (user_id, actor_id, type, post_id, comment_id, message)
    VALUES (parent_author, NEW.user_id, 'reply', NEW.post_id, NEW.id, 'replied to your comment');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_notify_comment_reply AFTER INSERT ON comments
FOR EACH ROW EXECUTE FUNCTION notify_comment_reply();

-- ============================================================================
-- 7. POINTS ENGINE (migration 006) — ledger writer + crediting triggers
-- ============================================================================

-- credit helper with 500 pts/day cap
CREATE OR REPLACE FUNCTION credit_points(
  p_user_id    UUID,
  p_post_id    UUID,
  p_event_type VARCHAR,
  p_points     INTEGER,
  p_metadata   JSONB DEFAULT '{}'
) RETURNS VOID AS $$
DECLARE
  today_total INTEGER;
  DAILY_CAP CONSTANT INTEGER := 500;
BEGIN
  SELECT COALESCE(SUM(points), 0) INTO today_total
  FROM points_ledger
  WHERE user_id = p_user_id AND points > 0 AND created_at >= date_trunc('day', NOW());

  IF today_total >= DAILY_CAP THEN RETURN; END IF;
  IF today_total + p_points > DAILY_CAP THEN p_points := DAILY_CAP - today_total; END IF;

  INSERT INTO points_ledger (user_id, post_id, event_type, points, metadata)
  VALUES (p_user_id, p_post_id, p_event_type, p_points, p_metadata);

  UPDATE users SET points_balance = COALESCE(points_balance,0) + p_points WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- +1 pt on like (skip self)
CREATE OR REPLACE FUNCTION credit_points_on_like()
RETURNS TRIGGER AS $$
DECLARE post_author UUID;
BEGIN
  SELECT user_id INTO post_author FROM posts WHERE id = NEW.post_id;
  IF post_author IS NOT NULL AND post_author <> NEW.user_id THEN
    PERFORM credit_points(post_author, NEW.post_id, 'like', 1, jsonb_build_object('liked_by', NEW.user_id));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_credit_points_on_like AFTER INSERT ON post_likes
FOR EACH ROW EXECUTE FUNCTION credit_points_on_like();

-- +5 pts on new follower
CREATE OR REPLACE FUNCTION credit_points_on_follow()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM credit_points(NEW.following_id, NULL, 'follow', 5, jsonb_build_object('follower_id', NEW.follower_id));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_credit_points_on_follow AFTER INSERT ON follows
FOR EACH ROW EXECUTE FUNCTION credit_points_on_follow();

-- +50 first-post bonus
CREATE OR REPLACE FUNCTION credit_first_post_bonus()
RETURNS TRIGGER AS $$
DECLARE prior_published INTEGER;
BEGIN
  IF NEW.published_at IS NOT NULL AND (OLD.published_at IS NULL OR TG_OP='INSERT') THEN
    SELECT COUNT(*) INTO prior_published FROM posts
    WHERE user_id = NEW.user_id AND id <> NEW.id AND published_at IS NOT NULL;
    IF prior_published = 0 THEN
      PERFORM credit_points(NEW.user_id, NEW.id, 'first_post_bonus', 50, jsonb_build_object('post_id', NEW.id));
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_credit_first_post_bonus
AFTER INSERT OR UPDATE OF published_at ON posts
FOR EACH ROW EXECUTE FUNCTION credit_first_post_bonus();

-- view milestones (+100 / +500 / +1000)
CREATE OR REPLACE FUNCTION credit_view_milestones()
RETURNS TRIGGER AS $$
DECLARE
  milestone INTEGER; reward INTEGER; already_credited BOOLEAN;
BEGIN
  IF NEW.views_count = OLD.views_count THEN RETURN NEW; END IF;
  FOR milestone, reward IN
    SELECT * FROM (VALUES (1000,100),(5000,500),(10000,1000)) AS m(views,pts)
  LOOP
    IF NEW.views_count >= milestone AND OLD.views_count < milestone THEN
      SELECT EXISTS (
        SELECT 1 FROM points_ledger
        WHERE post_id = NEW.id AND event_type = 'milestone'
          AND (metadata->>'milestone')::INTEGER = milestone
      ) INTO already_credited;
      IF NOT already_credited THEN
        PERFORM credit_points(NEW.user_id, NEW.id, 'milestone', reward,
                              jsonb_build_object('milestone', milestone, 'views', NEW.views_count));
        UPDATE posts SET points_earned = COALESCE(points_earned,0) + reward WHERE id = NEW.id;
        IF milestone = 1000 AND NOT NEW.is_trending THEN
          UPDATE posts SET is_trending = TRUE WHERE id = NEW.id;
        END IF;
      END IF;
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_credit_view_milestones AFTER UPDATE OF views_count ON posts
FOR EACH ROW EXECUTE FUNCTION credit_view_milestones();

-- +25 profile-completeness bonus (when onboarded_at first set)
CREATE OR REPLACE FUNCTION credit_profile_completeness()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.onboarded_at IS NOT NULL AND OLD.onboarded_at IS NULL THEN
    PERFORM credit_points(NEW.id, NULL, 'profile_completeness', 25,
                          jsonb_build_object('niche_count', array_length(NEW.niche_tags, 1)));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_credit_profile_completeness AFTER UPDATE OF onboarded_at ON users
FOR EACH ROW EXECUTE FUNCTION credit_profile_completeness();

-- ============================================================================
-- 8. RPCs (publicly-callable helper functions)
-- ============================================================================

-- 8a. increment_views (003) — anonymous view counter
CREATE OR REPLACE FUNCTION increment_views(post_id UUID)
RETURNS VOID AS $$
BEGIN UPDATE posts SET views_count = views_count + 1 WHERE id = post_id; END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION increment_views(UUID) TO anon, authenticated;

-- 8b. get_following_feed (004) — flat-columned feed RPC
CREATE OR REPLACE FUNCTION get_following_feed(viewer_id UUID, page_limit INT DEFAULT 20)
RETURNS TABLE (
  id UUID, title VARCHAR, excerpt TEXT, content TEXT, tags TEXT[],
  likes_count INT, comments_count INT, shares_count INT, views_count INT,
  points_earned INT, is_trending BOOLEAN, is_ai_enhanced BOOLEAN,
  published_at TIMESTAMPTZ, created_at TIMESTAMPTZ,
  author_id UUID, author_username VARCHAR, author_display_name VARCHAR,
  author_avatar_url TEXT, author_is_verified BOOLEAN
) AS $$
  SELECT
    p.id, p.title, p.excerpt, p.content, p.tags,
    p.likes_count, p.comments_count, p.shares_count, p.views_count,
    p.points_earned, p.is_trending, p.is_ai_enhanced,
    p.published_at, p.created_at,
    u.id, u.username, u.display_name, u.avatar_url, u.is_verified
  FROM posts p
  INNER JOIN follows f ON f.following_id = p.user_id
  INNER JOIN users u   ON u.id = p.user_id
  WHERE f.follower_id = viewer_id AND p.published_at IS NOT NULL
  ORDER BY p.published_at DESC
  LIMIT page_limit;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_following_feed(UUID, INT) TO authenticated;

-- 8c. is_following (004)
CREATE OR REPLACE FUNCTION is_following(viewer_id UUID, target_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM follows WHERE follower_id = viewer_id AND following_id = target_id);
$$ LANGUAGE sql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION is_following(UUID, UUID) TO authenticated;

-- 8d. get_points_summary (006)
CREATE OR REPLACE FUNCTION get_points_summary(p_user_id UUID)
RETURNS TABLE (
  total_lifetime INT, total_this_week INT,
  pts_from_likes INT, pts_from_follows INT,
  pts_from_milestones INT, pts_from_bonus INT
) AS $$
  SELECT
    COALESCE(SUM(points), 0)::INT,
    COALESCE(SUM(points) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days'), 0)::INT,
    COALESCE(SUM(points) FILTER (WHERE event_type='like'), 0)::INT,
    COALESCE(SUM(points) FILTER (WHERE event_type='follow'), 0)::INT,
    COALESCE(SUM(points) FILTER (WHERE event_type='milestone'), 0)::INT,
    COALESCE(SUM(points) FILTER (WHERE event_type IN ('first_post_bonus','profile_completeness')), 0)::INT
  FROM points_ledger
  WHERE user_id = p_user_id AND points > 0;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_points_summary(UUID) TO authenticated;

-- 8e. get_top_earners (009)
CREATE OR REPLACE FUNCTION get_top_earners(window_days INT DEFAULT 7, result_limit INT DEFAULT 20)
RETURNS TABLE (
  user_id UUID, username VARCHAR, display_name VARCHAR,
  avatar_url TEXT, is_verified BOOLEAN, follower_count INT, points_earned INT
) AS $$
  SELECT u.id, u.username, u.display_name, u.avatar_url, u.is_verified, u.follower_count,
         COALESCE(SUM(l.points),0)::INT
  FROM users u
  INNER JOIN points_ledger l ON l.user_id = u.id
  WHERE l.points > 0
    AND (window_days IS NULL OR l.created_at >= NOW() - (window_days || ' days')::INTERVAL)
  GROUP BY u.id, u.username, u.display_name, u.avatar_url, u.is_verified, u.follower_count
  HAVING SUM(l.points) > 0
  ORDER BY 7 DESC, u.follower_count DESC
  LIMIT result_limit;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_top_earners(INT, INT) TO anon, authenticated;

-- 8f. get_most_viral_posts (009)
CREATE OR REPLACE FUNCTION get_most_viral_posts(window_days INT DEFAULT 7, result_limit INT DEFAULT 10)
RETURNS TABLE (
  post_id UUID, title VARCHAR, excerpt TEXT,
  views_count INT, likes_count INT, comments_count INT, published_at TIMESTAMPTZ,
  author_id UUID, author_username VARCHAR, author_display_name VARCHAR,
  author_avatar_url TEXT, author_is_verified BOOLEAN
) AS $$
  SELECT p.id, p.title, p.excerpt, p.views_count, p.likes_count, p.comments_count,
         p.published_at, u.id, u.username, u.display_name, u.avatar_url, u.is_verified
  FROM posts p INNER JOIN users u ON u.id = p.user_id
  WHERE p.published_at IS NOT NULL
    AND (window_days IS NULL OR p.published_at >= NOW() - (window_days || ' days')::INTERVAL)
  ORDER BY p.views_count DESC, p.likes_count DESC
  LIMIT result_limit;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_most_viral_posts(INT, INT) TO anon, authenticated;

-- 8g. get_most_engaging (009)
CREATE OR REPLACE FUNCTION get_most_engaging(result_limit INT DEFAULT 10)
RETURNS TABLE (
  user_id UUID, username VARCHAR, display_name VARCHAR,
  avatar_url TEXT, is_verified BOOLEAN, follower_count INT,
  total_views INT, total_engagement INT, engagement_rate NUMERIC
) AS $$
  SELECT
    u.id, u.username, u.display_name, u.avatar_url, u.is_verified, u.follower_count,
    SUM(p.views_count)::INT,
    SUM(p.likes_count + p.comments_count)::INT,
    ROUND((SUM(p.likes_count + p.comments_count)::NUMERIC / NULLIF(SUM(p.views_count),0))*100, 2)
  FROM users u INNER JOIN posts p ON p.user_id = u.id
  WHERE p.published_at IS NOT NULL
  GROUP BY u.id, u.username, u.display_name, u.avatar_url, u.is_verified, u.follower_count
  HAVING SUM(p.views_count) >= 100
  ORDER BY 9 DESC NULLS LAST
  LIMIT result_limit;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_most_engaging(INT) TO anon, authenticated;

-- 8h. get_suggested_creators (012) — niche-overlap recommendation
CREATE OR REPLACE FUNCTION get_suggested_creators(
  viewer_id UUID DEFAULT NULL,
  result_limit INT DEFAULT 5
)
RETURNS TABLE (
  id UUID, username VARCHAR, display_name VARCHAR,
  avatar_url TEXT, is_verified BOOLEAN, follower_count INT,
  niche_tags TEXT[], shared_niche_count INT
) AS $$
DECLARE viewer_niches TEXT[];
BEGIN
  IF viewer_id IS NOT NULL THEN
    SELECT u.niche_tags INTO viewer_niches FROM users u WHERE u.id = viewer_id;
  END IF;

  IF viewer_niches IS NULL OR array_length(viewer_niches,1) IS NULL THEN
    RETURN QUERY
    SELECT u.id, u.username, u.display_name, u.avatar_url, u.is_verified,
           u.follower_count, u.niche_tags, 0
    FROM users u
    WHERE EXISTS (SELECT 1 FROM posts p WHERE p.user_id = u.id AND p.published_at IS NOT NULL)
      AND (viewer_id IS NULL OR u.id <> viewer_id)
      AND (viewer_id IS NULL OR NOT EXISTS (
            SELECT 1 FROM follows f WHERE f.follower_id = viewer_id AND f.following_id = u.id))
    ORDER BY u.follower_count DESC NULLS LAST
    LIMIT result_limit;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT u.id, u.username, u.display_name, u.avatar_url, u.is_verified,
         u.follower_count, u.niche_tags,
         COALESCE(cardinality(ARRAY(
           SELECT UNNEST(u.niche_tags) INTERSECT SELECT UNNEST(viewer_niches)
         )),0)
  FROM users u
  WHERE u.id <> viewer_id
    AND NOT EXISTS (SELECT 1 FROM follows f WHERE f.follower_id = viewer_id AND f.following_id = u.id)
    AND u.niche_tags && viewer_niches
    AND EXISTS (SELECT 1 FROM posts p WHERE p.user_id = u.id AND p.published_at IS NOT NULL)
  ORDER BY 8 DESC, u.follower_count DESC NULLS LAST
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_suggested_creators(UUID, INT) TO anon, authenticated;

-- 8i. get_post_comments (014 + 016) — bypasses RLS, uses c_*/author_* output
--     column names so RETURNS TABLE variables don't shadow source columns
--     (which caused content/created_at to come back NULL).
CREATE OR REPLACE FUNCTION get_post_comments(p_post_id UUID)
RETURNS TABLE (
  c_id UUID, c_content TEXT, c_created_at TIMESTAMPTZ,
  c_likes_count INT, c_parent_comment_id UUID,
  author_id UUID, author_username VARCHAR, author_display_name VARCHAR,
  author_avatar_url TEXT, author_is_verified BOOLEAN
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
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

-- ============================================================================
-- 9. STORAGE (migrations 008 + 010)
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('post-images', 'post-images', true, 5242880,
        ARRAY['image/jpeg','image/png','image/webp','image/gif'])
ON CONFLICT (id) DO UPDATE
  SET public             = EXCLUDED.public,
      file_size_limit    = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Listing tightened to own-folder only; direct-URL GETs work because the
-- bucket is `public = true` (Supabase's REST handler short-circuits RLS).
DROP POLICY IF EXISTS "Anyone can view post images" ON storage.objects;
DROP POLICY IF EXISTS "Users can only list their own post images" ON storage.objects;
CREATE POLICY "Users can only list their own post images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'post-images' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Authenticated users can upload to own folder" ON storage.objects;
CREATE POLICY "Authenticated users can upload to own folder"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'post-images' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can update own post images" ON storage.objects;
CREATE POLICY "Users can update own post images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'post-images' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete own post images" ON storage.objects;
CREATE POLICY "Users can delete own post images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'post-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Migration 017: Re-reconcile denormalized counts
-- Safe to re-run.
--
-- Background
--   Migration 015 added SECURITY DEFINER to all count triggers so they
--   bypass parent-table RLS. It also did a one-time reconcile of all
--   denormalized counts at the bottom. But any time a comment / like /
--   share / follow was deleted BEFORE migration 015 ran (or before its
--   reconcile statement), the corresponding count was left stale —
--   because the old non-SECURITY-DEFINER DELETE trigger could not
--   write to the parent row owned by another user.
--
--   Observed symptom: a post's button shows "2 comments" while the
--   comment list is empty. The two original comment rows were deleted;
--   the rows are gone but posts.comments_count is still 2.
--
--   Migration 015 already fixed this for posts at the time it ran. This
--   migration re-runs the same reconcile so any drift accumulated since
--   then is corrected. The triggers themselves are correct now; this is
--   a one-shot cleanup.

UPDATE posts p
SET likes_count = COALESCE((SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id), 0)
WHERE likes_count <> COALESCE((SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id), 0);

UPDATE posts p
SET comments_count = COALESCE((SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id), 0)
WHERE comments_count <> COALESCE((SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id), 0);

UPDATE posts p
SET shares_count = COALESCE((SELECT COUNT(*) FROM post_shares ps WHERE ps.post_id = p.id), 0)
WHERE shares_count <> COALESCE((SELECT COUNT(*) FROM post_shares ps WHERE ps.post_id = p.id), 0);

UPDATE comments c
SET likes_count = COALESCE((SELECT COUNT(*) FROM comment_likes cl WHERE cl.comment_id = c.id), 0)
WHERE likes_count <> COALESCE((SELECT COUNT(*) FROM comment_likes cl WHERE cl.comment_id = c.id), 0);

UPDATE users u
SET follower_count  = COALESCE((SELECT COUNT(*) FROM follows f WHERE f.following_id = u.id), 0),
    following_count = COALESCE((SELECT COUNT(*) FROM follows f WHERE f.follower_id  = u.id), 0)
WHERE follower_count  <> COALESCE((SELECT COUNT(*) FROM follows f WHERE f.following_id = u.id), 0)
   OR following_count <> COALESCE((SELECT COUNT(*) FROM follows f WHERE f.follower_id  = u.id), 0);

-- Diagnostic: report how many rows were affected (you'll see this in the
-- "Messages" pane of the Supabase SQL editor).
DO $$
DECLARE
  drift_posts_likes    INT;
  drift_posts_comments INT;
  drift_posts_shares   INT;
  drift_comment_likes  INT;
  drift_user_follows   INT;
BEGIN
  SELECT COUNT(*) INTO drift_posts_likes FROM posts p
  WHERE p.likes_count <> COALESCE((SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id), 0);

  SELECT COUNT(*) INTO drift_posts_comments FROM posts p
  WHERE p.comments_count <> COALESCE((SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id), 0);

  SELECT COUNT(*) INTO drift_posts_shares FROM posts p
  WHERE p.shares_count <> COALESCE((SELECT COUNT(*) FROM post_shares ps WHERE ps.post_id = p.id), 0);

  SELECT COUNT(*) INTO drift_comment_likes FROM comments c
  WHERE c.likes_count <> COALESCE((SELECT COUNT(*) FROM comment_likes cl WHERE cl.comment_id = c.id), 0);

  SELECT COUNT(*) INTO drift_user_follows FROM users u
  WHERE u.follower_count  <> COALESCE((SELECT COUNT(*) FROM follows f WHERE f.following_id = u.id), 0)
     OR u.following_count <> COALESCE((SELECT COUNT(*) FROM follows f WHERE f.follower_id  = u.id), 0);

  RAISE NOTICE 'After reconcile: drift rows remaining — posts.likes=%, posts.comments=%, posts.shares=%, comments.likes=%, users.follow=%',
    drift_posts_likes, drift_posts_comments, drift_posts_shares, drift_comment_likes, drift_user_follows;
END $$;

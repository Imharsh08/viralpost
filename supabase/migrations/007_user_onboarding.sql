-- Migration 007: Add onboarding fields to users
-- Safe to re-run

ALTER TABLE users ADD COLUMN IF NOT EXISTS niche_tags TEXT[] DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS headline VARCHAR(160);
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarded_at TIMESTAMPTZ;

-- Credit profile-completeness bonus once per user
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

DROP TRIGGER IF EXISTS trg_credit_profile_completeness ON users;
CREATE TRIGGER trg_credit_profile_completeness
AFTER UPDATE OF onboarded_at ON users
FOR EACH ROW EXECUTE FUNCTION credit_profile_completeness();

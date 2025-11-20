-- Fix achievement rate constraints and date fields
-- This migration allows achievement rates > 100% and handles empty dates

-- 1. Remove achievement rate constraints from daily_reports
ALTER TABLE daily_reports
DROP CONSTRAINT IF EXISTS daily_reports_achievement_rate_check;

-- Add new constraint allowing up to 999%
ALTER TABLE daily_reports
ADD CONSTRAINT daily_reports_achievement_rate_check
CHECK (achievement_rate >= 0 AND achievement_rate <= 999);

-- 2. Remove achievement rate constraint from projects
ALTER TABLE projects
DROP CONSTRAINT IF EXISTS projects_progress_rate_check;

-- Add new constraint allowing up to 999%
ALTER TABLE projects
ADD CONSTRAINT projects_progress_rate_check
CHECK (progress_rate >= 0 AND progress_rate <= 999);

-- 3. Make date fields nullable in projects to handle empty dates
ALTER TABLE projects
ALTER COLUMN target_end_date DROP NOT NULL;

ALTER TABLE projects
ALTER COLUMN revised_end_date DROP NOT NULL;

-- 4. Add comment for documentation
COMMENT ON COLUMN daily_reports.achievement_rate IS 'Achievement rate percentage (0-999%). Values > 100% indicate over-achievement.';
COMMENT ON COLUMN projects.progress_rate IS 'Progress rate percentage (0-999%). Values > 100% indicate over-achievement.';

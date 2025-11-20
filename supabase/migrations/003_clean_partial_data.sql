-- Clean up partial migration data before re-running migration

-- Delete all data from tables (keeps table structure)
TRUNCATE TABLE daily_reports CASCADE;
TRUNCATE TABLE employees CASCADE;
TRUNCATE TABLE projects CASCADE;
TRUNCATE TABLE daily_summaries CASCADE;
TRUNCATE TABLE personal_reports CASCADE;
TRUNCATE TABLE stats_dashboard CASCADE;

-- Reset sequences if any
-- (PostgreSQL will handle UUID generation automatically)

SELECT 'All tables cleaned. Ready for fresh migration.' AS status;

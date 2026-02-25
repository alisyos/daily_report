-- Migration 009: Add employee_id FK to daily_reports and personal_reports
-- Fixes: 동명이인(same-name employees) causing report mix-up

-- 1. Add employee_id column to daily_reports
ALTER TABLE daily_reports
  ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES employees(id);

-- 2. Backfill employee_id using (employee_name, company_id) match
UPDATE daily_reports dr
SET employee_id = e.id
FROM employees e
WHERE dr.employee_id IS NULL
  AND dr.employee_name = e.employee_name
  AND dr.company_id = e.company_id;

-- 3. Backfill remaining rows using employee_name only (unique name across all companies)
UPDATE daily_reports dr
SET employee_id = sub.emp_id
FROM (
  SELECT employee_name, MIN(id::text)::uuid AS emp_id
  FROM employees
  GROUP BY employee_name
  HAVING COUNT(*) = 1
) sub
WHERE dr.employee_id IS NULL
  AND dr.employee_name = sub.employee_name;

-- 4. Create indexes for employee_id lookups
CREATE INDEX IF NOT EXISTS idx_daily_reports_employee_id
  ON daily_reports(employee_id);

CREATE INDEX IF NOT EXISTS idx_daily_reports_date_employee_id
  ON daily_reports(date, employee_id);

-- 5. Add employee_id column to personal_reports (for future use)
ALTER TABLE personal_reports
  ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES employees(id);

-- Backfill personal_reports employee_id
UPDATE personal_reports pr
SET employee_id = sub.emp_id
FROM (
  SELECT employee_name, MIN(id::text)::uuid AS emp_id
  FROM employees
  GROUP BY employee_name
  HAVING COUNT(*) = 1
) sub
WHERE pr.employee_id IS NULL
  AND pr.employee_name = sub.employee_name;

CREATE INDEX IF NOT EXISTS idx_personal_reports_employee_id
  ON personal_reports(employee_id);

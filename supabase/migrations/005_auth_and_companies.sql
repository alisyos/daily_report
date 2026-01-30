-- Migration 005: Authentication and Companies
-- Adds companies table, auth columns to employees, company_id to reports/projects

-- 1. Enable uuid extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create companies table
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name VARCHAR(200) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_companies_company_name ON companies(company_name);

-- Trigger for updated_at
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations on companies" ON companies FOR ALL USING (true) WITH CHECK (true);

-- 3. Add columns to employees table
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id),
  ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE,
  ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255),
  ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('operator', 'manager', 'user'));

CREATE INDEX IF NOT EXISTS idx_employees_company_id ON employees(company_id);
CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);
CREATE INDEX IF NOT EXISTS idx_employees_role ON employees(role);

-- 4. Add company_id to daily_reports (denormalized for query performance)
ALTER TABLE daily_reports
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);

CREATE INDEX IF NOT EXISTS idx_daily_reports_company_id ON daily_reports(company_id);

-- 5. Add company_id to projects (denormalized for query performance)
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);

CREATE INDEX IF NOT EXISTS idx_projects_company_id ON projects(company_id);

-- 6. Insert default company and assign to existing data
DO $$
DECLARE
  default_company_id UUID;
BEGIN
  -- Create default company
  INSERT INTO companies (company_name)
  VALUES ('GPT코리아')
  ON CONFLICT (company_name) DO NOTHING;

  SELECT id INTO default_company_id FROM companies WHERE company_name = 'GPT코리아';

  -- Assign default company to existing employees
  UPDATE employees SET company_id = default_company_id WHERE company_id IS NULL;

  -- Assign default company to existing daily_reports
  UPDATE daily_reports SET company_id = default_company_id WHERE company_id IS NULL;

  -- Assign default company to existing projects
  UPDATE projects SET company_id = default_company_id WHERE company_id IS NULL;
END $$;

-- Migration: 007_departments_table.sql
-- Description: Create departments table for centralized department management

-- Create departments table
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_name VARCHAR(100) NOT NULL,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, department_name)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_departments_company_id ON departments(company_id);
CREATE INDEX IF NOT EXISTS idx_departments_department_name ON departments(department_name);

-- Migrate existing departments from employees table
INSERT INTO departments (department_name, company_id)
SELECT DISTINCT department, company_id
FROM employees
WHERE department IS NOT NULL AND department != '' AND company_id IS NOT NULL
ON CONFLICT (company_id, department_name) DO NOTHING;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_departments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_departments_updated_at ON departments;
CREATE TRIGGER trigger_departments_updated_at
  BEFORE UPDATE ON departments
  FOR EACH ROW
  EXECUTE FUNCTION update_departments_updated_at();

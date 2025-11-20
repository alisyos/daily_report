-- Daily Report System - Supabase Migration
-- Migration from Google Sheets to Supabase PostgreSQL

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Employees Table (사원마스터)
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_code VARCHAR(50) UNIQUE NOT NULL,
  employee_name VARCHAR(100) NOT NULL,
  position VARCHAR(50),
  department VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX idx_employees_department ON employees(department);
CREATE INDEX idx_employees_name ON employees(employee_name);

-- 2. Daily Reports Table (일일업무관리)
CREATE TABLE daily_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  employee_name VARCHAR(100) NOT NULL,
  department VARCHAR(100),
  work_overview TEXT,
  progress_goal TEXT,
  achievement_rate INTEGER DEFAULT 0 CHECK (achievement_rate >= 0 AND achievement_rate <= 100),
  manager_evaluation TEXT,
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX idx_daily_reports_date ON daily_reports(date DESC);
CREATE INDEX idx_daily_reports_employee ON daily_reports(employee_name);
CREATE INDEX idx_daily_reports_department ON daily_reports(department);
CREATE INDEX idx_daily_reports_date_employee ON daily_reports(date, employee_name);

-- 3. Projects Table (프로젝트관리)
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_name VARCHAR(200) NOT NULL,
  department VARCHAR(100) NOT NULL,
  manager VARCHAR(100) NOT NULL,
  target_end_date DATE,
  revised_end_date DATE,
  status VARCHAR(50) DEFAULT '진행중' CHECK (status IN ('진행중', '완료', '대기', '보류', '취소')),
  progress_rate INTEGER DEFAULT 0 CHECK (progress_rate >= 0 AND progress_rate <= 100),
  main_issues TEXT,
  detailed_progress TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_projects_department ON projects(department);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_manager ON projects(manager);

-- 4. Daily Summaries Table (일일보고요약)
CREATE TABLE daily_summaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE UNIQUE NOT NULL,
  summary TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index
CREATE INDEX idx_daily_summaries_date ON daily_summaries(date DESC);

-- 5. Personal Reports Table (개인보고서)
CREATE TABLE personal_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_name VARCHAR(100) NOT NULL,
  period VARCHAR(100),
  total_reports INTEGER DEFAULT 0,
  average_achievement_rate DECIMAL(5,2),
  main_achievements TEXT,
  improvements TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_personal_reports_employee ON personal_reports(employee_name);
CREATE INDEX idx_personal_reports_period ON personal_reports(period);

-- 6. Stats Dashboard Table (통계대시보드)
CREATE TABLE stats_dashboard (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  monthly_average_rate DECIMAL(5,2),
  weekly_average_rate DECIMAL(5,2),
  department_stats JSONB,
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index
CREATE INDEX idx_stats_dashboard_calculated ON stats_dashboard(calculated_at DESC);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_reports_updated_at
  BEFORE UPDATE ON daily_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_summaries_updated_at
  BEFORE UPDATE ON daily_summaries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_personal_reports_updated_at
  BEFORE UPDATE ON personal_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
-- Enable RLS on all tables
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE stats_dashboard ENABLE ROW LEVEL SECURITY;

-- Create policies (allowing all operations for now - adjust based on your authentication needs)
CREATE POLICY "Enable all operations for all users" ON employees FOR ALL USING (true);
CREATE POLICY "Enable all operations for all users" ON daily_reports FOR ALL USING (true);
CREATE POLICY "Enable all operations for all users" ON projects FOR ALL USING (true);
CREATE POLICY "Enable all operations for all users" ON daily_summaries FOR ALL USING (true);
CREATE POLICY "Enable all operations for all users" ON personal_reports FOR ALL USING (true);
CREATE POLICY "Enable all operations for all users" ON stats_dashboard FOR ALL USING (true);

-- Create views for easier querying
CREATE OR REPLACE VIEW daily_reports_with_employee_info AS
SELECT
  dr.id,
  dr.date,
  dr.employee_name,
  dr.department,
  e.employee_code,
  e.position,
  dr.work_overview,
  dr.progress_goal,
  dr.achievement_rate,
  dr.manager_evaluation,
  dr.remarks,
  dr.created_at,
  dr.updated_at
FROM daily_reports dr
LEFT JOIN employees e ON dr.employee_name = e.employee_name;

-- Grant permissions on the view
GRANT SELECT ON daily_reports_with_employee_info TO authenticated;
GRANT SELECT ON daily_reports_with_employee_info TO anon;

-- 008_missions_kpi.sql
-- 업무 미션 & KPI 관리 테이블

-- missions 테이블
CREATE TABLE IF NOT EXISTS missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_name VARCHAR(200) NOT NULL,
  description TEXT,
  assignee VARCHAR(100) NOT NULL,
  department VARCHAR(100),
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT '대기' CHECK (status IN ('대기', '진행중', '완료')),
  progress_rate INTEGER DEFAULT 0 CHECK (progress_rate >= 0 AND progress_rate <= 100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- missions 인덱스
CREATE INDEX IF NOT EXISTS idx_missions_company_id ON missions(company_id);
CREATE INDEX IF NOT EXISTS idx_missions_assignee ON missions(assignee);
CREATE INDEX IF NOT EXISTS idx_missions_department ON missions(department);
CREATE INDEX IF NOT EXISTS idx_missions_status ON missions(status);

-- mission_kpis 테이블
CREATE TABLE IF NOT EXISTS mission_kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  kpi_name VARCHAR(200) NOT NULL,
  target_value DECIMAL(15,2) NOT NULL,
  current_value DECIMAL(15,2) DEFAULT 0,
  unit VARCHAR(20) NOT NULL DEFAULT '%',
  achievement_rate DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- mission_kpis 인덱스
CREATE INDEX IF NOT EXISTS idx_mission_kpis_mission_id ON mission_kpis(mission_id);

-- achievement_rate 자동계산 트리거
CREATE OR REPLACE FUNCTION calculate_kpi_achievement_rate()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.target_value = 0 THEN
    NEW.achievement_rate := 0;
  ELSE
    NEW.achievement_rate := ROUND((NEW.current_value / NEW.target_value) * 100, 2);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_kpi_achievement
  BEFORE INSERT OR UPDATE ON mission_kpis
  FOR EACH ROW
  EXECUTE FUNCTION calculate_kpi_achievement_rate();

-- updated_at 트리거 (update_updated_at_column 함수가 이미 존재한다고 가정)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    CREATE TRIGGER trigger_missions_updated_at
      BEFORE UPDATE ON missions
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER trigger_mission_kpis_updated_at
      BEFORE UPDATE ON mission_kpis
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- RLS 정책 (API 레벨에서 인증/인가 처리)
ALTER TABLE missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mission_kpis ENABLE ROW LEVEL SECURITY;

CREATE POLICY missions_policy ON missions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY mission_kpis_policy ON mission_kpis FOR ALL USING (true) WITH CHECK (true);

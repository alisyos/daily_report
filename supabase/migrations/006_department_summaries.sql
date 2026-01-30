-- daily_summaries에 department 컬럼 추가
ALTER TABLE daily_summaries ADD COLUMN IF NOT EXISTS department VARCHAR(200);

-- 기존 UNIQUE(date) 제약조건을 동적으로 찾아서 제거
-- (자동생성된 제약조건 이름이 다를 수 있으므로 동적 SQL 사용)
DO $$
DECLARE
    constraint_name text;
BEGIN
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'daily_summaries'::regclass
      AND contype = 'u'
      AND array_length(conkey, 1) = 1
      AND conkey[1] = (
          SELECT attnum FROM pg_attribute
          WHERE attrelid = 'daily_summaries'::regclass
            AND attname = 'date'
      );

    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE daily_summaries DROP CONSTRAINT %I', constraint_name);
        RAISE NOTICE 'Dropped UNIQUE constraint: %', constraint_name;
    ELSE
        RAISE NOTICE 'No single-column UNIQUE constraint found on date column';
    END IF;
END $$;

-- 새 UNIQUE(date, department) 제약조건 추가
-- NULLS NOT DISTINCT로 NULL department도 유니크하게 처리
ALTER TABLE daily_summaries DROP CONSTRAINT IF EXISTS daily_summaries_date_department_key;
ALTER TABLE daily_summaries ADD CONSTRAINT daily_summaries_date_department_key
  UNIQUE (date, department);

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_daily_summaries_department ON daily_summaries(department);

-- Migration 011: employee_code 중복 제약조건을 전역 UNIQUE → (employee_code, company_id) 복합 UNIQUE로 변경
-- 업체가 다른 경우 동일한 사원 코드를 허용하기 위함

DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  -- employee_code 단일 컬럼 UNIQUE 제약조건 이름을 동적으로 탐색
  SELECT tc.constraint_name
    INTO constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_name = ccu.constraint_name
     AND tc.table_schema = ccu.table_schema
   WHERE tc.table_name = 'employees'
     AND tc.constraint_type = 'UNIQUE'
     AND ccu.column_name = 'employee_code'
     AND tc.table_schema = 'public'
   ORDER BY tc.constraint_name
   LIMIT 1;

  IF constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE employees DROP CONSTRAINT ' || quote_ident(constraint_name);
    RAISE NOTICE 'Dropped UNIQUE constraint: %', constraint_name;
  ELSE
    RAISE NOTICE 'No single-column UNIQUE constraint found on employee_code column';
  END IF;
END $$;

-- 업체별 사원 코드 복합 UNIQUE 제약조건 추가 (company_id가 NULL인 경우도 허용)
ALTER TABLE employees
  ADD CONSTRAINT employees_employee_code_company_unique
  UNIQUE (employee_code, company_id);

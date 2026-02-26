-- 010: company_manager 역할 추가
-- 기존 employees 테이블의 role 체크 제약조건을 확장하여 company_manager 역할 추가

ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_role_check;
ALTER TABLE employees ADD CONSTRAINT employees_role_check
  CHECK (role IN ('operator', 'company_manager', 'manager', 'user'));

# Google Sheets → Supabase 마이그레이션 가이드

이 문서는 Google Sheets 기반 시스템을 Supabase PostgreSQL로 마이그레이션하는 전체 과정을 안내합니다.

## 목차
1. [왜 Supabase로 마이그레이션하나요?](#왜-supabase로-마이그레이션하나요)
2. [사전 준비사항](#사전-준비사항)
3. [Supabase 프로젝트 설정](#supabase-프로젝트-설정)
4. [데이터베이스 스키마 생성](#데이터베이스-스키마-생성)
5. [환경 변수 설정](#환경-변수-설정)
6. [데이터 마이그레이션](#데이터-마이그레이션)
7. [테스트 및 검증](#테스트-및-검증)
8. [프로덕션 배포](#프로덕션-배포)
9. [문제 해결](#문제-해결)

## 왜 Supabase로 마이그레이션하나요?

### Google Sheets의 한계
- **성능**: 대용량 데이터 처리 시 느린 응답 속도
- **동시성**: 다수의 동시 접근 시 API 제한
- **확장성**: 데이터 증가에 따른 관리 어려움
- **쿼리**: 복잡한 쿼리 및 집계 기능 제한

### Supabase의 장점
- **성능**: PostgreSQL 기반의 빠른 쿼리 속도
- **확장성**: 대용량 데이터 및 트래픽 처리
- **관계형 DB**: 정규화된 데이터 구조와 강력한 쿼리
- **실시간**: 실시간 데이터 동기화 지원
- **보안**: Row Level Security (RLS) 기반 권한 관리
- **무료 티어**: 충분한 무료 사용량 제공

## 사전 준비사항

### 1. 필수 계정
- Supabase 계정 (https://supabase.com)
- 기존 Google Sheets API 접근 권한

### 2. 로컬 개발 환경
```bash
Node.js 18 이상
npm 또는 yarn
```

### 3. 백업
⚠️ **중요**: 마이그레이션 전 Google Sheets 데이터를 백업하세요!

## Supabase 프로젝트 설정

### 1. Supabase 프로젝트 생성
1. [Supabase Dashboard](https://app.supabase.com) 접속
2. "New Project" 클릭
3. 프로젝트 정보 입력:
   - Project Name: daily-report-system
   - Database Password: 안전한 비밀번호 생성 (저장 필수!)
   - Region: Northeast Asia (Seoul) 권장
4. "Create new project" 클릭

### 2. API Keys 확인
프로젝트 생성 후 Settings > API에서 다음 정보 확인:
- Project URL: `https://xxxxx.supabase.co`
- Anon public key: `eyJhbGc...` (공개 키)
- Service role key: `eyJhbGc...` (서비스 키, 비밀!)

## 데이터베이스 스키마 생성

### 1. SQL Editor 열기
Supabase Dashboard > SQL Editor 이동

### 2. 마이그레이션 SQL 실행
`supabase/migrations/001_initial_schema.sql` 파일의 내용을 복사하여 실행:

```sql
-- 파일 내용 전체를 SQL Editor에 붙여넣고 RUN 클릭
```

### 3. 테이블 확인
Table Editor에서 다음 테이블들이 생성되었는지 확인:
- employees (사원마스터)
- daily_reports (일일업무관리)
- projects (프로젝트관리)
- daily_summaries (일일보고요약)
- personal_reports (개인보고서)
- stats_dashboard (통계대시보드)

## 환경 변수 설정

### 1. .env.local 파일 생성
`.env.local.example`을 복사하여 `.env.local` 생성:

```bash
cp .env.local.example .env.local
```

### 2. Supabase 환경 변수 설정
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI API (기존과 동일)
OPENAI_API_KEY=your-openai-api-key

# Google Sheets (마이그레이션용, 임시 유지)
GOOGLE_SHEETS_ID=your_sheets_id
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="..."
GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL=your-email
```

## 데이터 마이그레이션

### 1. 의존성 설치
```bash
npm install
```

### 2. 마이그레이션 스크립트 실행
```bash
npm run migrate
```

### 3. 마이그레이션 과정
스크립트는 다음 순서로 데이터를 마이그레이션합니다:
1. **Employees** (사원 마스터)
2. **Daily Reports** (일일 업무 보고서)
3. **Projects** (프로젝트)
4. **Daily Summaries** (일일 요약)
5. **Stats Dashboard** (통계)

### 4. 진행 상황 모니터링
```
🚀 Starting data migration...

📊 Migrating Employees...
   Found 25 employees
   ✅ Migrated: 홍길동 (E001)
   ✅ Migrated: 김철수 (E002)
   ...

📊 Migrating Daily Reports...
   Found 1500 daily reports
   ✅ Migrated batch 1 (100 reports)
   ✅ Migrated batch 2 (100 reports)
   ...

✅ Migration Summary
Total Successful: 1625
Total Errors: 0

🎉 Data migration completed!
```

## 테스트 및 검증

### 1. 로컬 서버 실행
```bash
npm run dev
```

### 2. 기능 테스트 체크리스트
- [ ] 일일 보고서 목록 조회
- [ ] 일일 보고서 작성
- [ ] 일일 보고서 수정/삭제
- [ ] 프로젝트 관리 (조회/추가/수정/삭제)
- [ ] 사원 목록 조회
- [ ] 부서별 필터링
- [ ] AI 요약 생성
- [ ] 개인 리포트 생성

### 3. 데이터 검증
Supabase Dashboard > Table Editor에서:
- 모든 사원 데이터가 이관되었는지 확인
- 일일 보고서 개수 확인
- 프로젝트 데이터 확인
- 날짜 형식이 올바른지 확인

### 4. 성능 테스트
- 대량 데이터 조회 속도 확인
- 필터링 성능 확인
- 페이지네이션 동작 확인

## 프로덕션 배포

### 1. Vercel 환경 변수 설정
Vercel Dashboard > Project Settings > Environment Variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=your-openai-key
```

### 2. Google Sheets 변수 제거
마이그레이션 완료 후 Google Sheets 관련 환경 변수 삭제:
- ~~GOOGLE_SHEETS_ID~~
- ~~GOOGLE_SERVICE_ACCOUNT_*~~

### 3. 배포
```bash
vercel --prod
```

### 4. 프로덕션 테스트
배포된 URL에서 모든 기능 재확인

## 문제 해결

### 1. 마이그레이션 실패
**증상**: 스크립트 실행 중 에러 발생

**해결책**:
```bash
# 1. Supabase 연결 확인
# Dashboard > Settings > API 에서 URL과 키 재확인

# 2. 환경 변수 확인
cat .env.local

# 3. 개별 테이블 확인
# Supabase Dashboard > Table Editor에서 수동 확인

# 4. 에러 로그 확인
# 터미널 출력에서 구체적인 에러 메시지 확인
```

### 2. 데이터 타입 불일치
**증상**: 날짜나 숫자 필드 에러

**해결책**:
- Google Sheets에서 데이터 형식 확인
- 빈 셀이나 잘못된 형식 수정
- 마이그레이션 스크립트에서 데이터 변환 추가

### 3. 성능 문제
**증상**: 쿼리가 느림

**해결책**:
```sql
-- Supabase SQL Editor에서 인덱스 추가
CREATE INDEX idx_daily_reports_date ON daily_reports(date DESC);
CREATE INDEX idx_daily_reports_employee ON daily_reports(employee_name);
```

### 4. RLS 정책 문제
**증상**: 데이터 조회 불가

**해결책**:
```sql
-- 임시로 모든 접근 허용 (개발용)
ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;

-- 또는 정책 수정
DROP POLICY IF EXISTS "policy_name" ON table_name;
CREATE POLICY "new_policy" ON table_name FOR ALL USING (true);
```

### 5. 환경 변수 인식 안됨
**증상**: "Missing Supabase environment variables" 에러

**해결책**:
```bash
# 1. .env.local 파일 위치 확인 (프로젝트 루트에 있어야 함)
ls -la .env.local

# 2. 개발 서버 재시작
# Ctrl+C 후 다시 npm run dev

# 3. 환경 변수 로드 확인
node -e "require('dotenv').config({path:'.env.local'}); console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)"
```

## 롤백 절차

마이그레이션 후 문제 발생 시 Google Sheets로 롤백:

### 1. 코드 롤백
```bash
git checkout main  # 또는 마이그레이션 이전 커밋
```

### 2. 환경 변수 복원
`.env.local`에서 Google Sheets 변수 활성화:
```env
GOOGLE_SHEETS_ID=your_sheets_id
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="..."
```

### 3. 의존성 재설치
```bash
npm install
```

### 4. 서버 재시작
```bash
npm run dev
```

## 추가 리소스

- [Supabase 공식 문서](https://supabase.com/docs)
- [PostgreSQL 튜토리얼](https://www.postgresql.org/docs/)
- [Next.js + Supabase 가이드](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
- [프로젝트 CLAUDE.md](./CLAUDE.md)

## 지원

문제가 발생하면 다음을 포함하여 문의하세요:
1. 에러 메시지 전체
2. 실행한 명령어
3. 환경 정보 (OS, Node 버전)
4. Supabase 프로젝트 설정 스크린샷 (민감 정보 제외)

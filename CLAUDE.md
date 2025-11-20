# 일일 업무 보고 시스템 (Daily Report System)

## 프로젝트 개요
Supabase PostgreSQL을 데이터베이스로 활용하는 종합 업무 관리 시스템입니다. Next.js 기반의 웹 애플리케이션으로 Vercel에 배포할 수 있도록 구성되어 있습니다.

> **📢 v4.0 업데이트**: Google Sheets에서 Supabase로 마이그레이션되었습니다. 자세한 내용은 [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)를 참고하세요.

## 기술 스택
- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Vercel
- **Date Utils**: date-fns
- **Legacy**: Google Sheets API (v3.0 이하)

## 주요 기능
1. **일일 업무 보고서 작성**: 사원들이 매일 업무 내용을 기록
2. **보고서 목록 조회**: 날짜별, 부서별, 사원별 필터링 및 상세 보기
3. **프로젝트 관리**: 프로젝트 등록, 수정, 삭제 및 진행률 관리
4. **개인 업무 리포트**: 개인별 업무 성과 분석 및 리포트 생성
5. **AI 자동 요약**: OpenAI API를 활용한 일일보고서 자동 요약 생성
6. **PDF 내보내기**: 보고서를 PDF 형태로 내보내기 기능
7. **페이지네이션**: 대용량 데이터 효율적 표시

## 시스템 구조

### Supabase 데이터베이스 구조
시스템은 6개의 PostgreSQL 테이블로 구성됩니다:

1. **employees** (사원마스터)
   - id (UUID), employee_code, employee_name, position, department
   - 인덱스: department, employee_name

2. **daily_reports** (일일업무관리)
   - id (UUID), date, employee_name, department, work_overview, progress_goal
   - achievement_rate, manager_evaluation, remarks
   - 인덱스: date, employee_name, department

3. **projects** (프로젝트관리)
   - id (UUID), project_name, department, manager, target_end_date, revised_end_date
   - status, progress_rate, main_issues, detailed_progress
   - 인덱스: department, status, manager

4. **daily_summaries** (일일보고요약)
   - id (UUID), date (UNIQUE), summary
   - 인덱스: date

5. **personal_reports** (개인보고서)
   - id (UUID), employee_name, period, total_reports, average_achievement_rate
   - main_achievements, improvements
   - 인덱스: employee_name, period

6. **stats_dashboard** (통계대시보드)
   - id (UUID), monthly_average_rate, weekly_average_rate, department_stats (JSONB)
   - calculated_at
   - 인덱스: calculated_at

### 레거시 Google Sheets 구조 (v3.0 이하)
<details>
<summary>펼치기</summary>

시스템은 6개의 시트로 구성됩니다:

1. **일일업무관리**: 날짜, 사원명, 업무개요, 진행목표, 달성율(%), 팀장평가, 비고
2. **사원마스터**: 사원코드, 사원명, 직책, 부서
3. **통계대시보드**: 월별평균달성률, 주별평균달성률, 부서별통계
4. **일일보고요약**: 날짜, 요약내용
5. **프로젝트관리**: 프로젝트명, 부서, 담당자, 목표종료일, 수정종료일, 상태, 진행률(%), 주요이슈, 세부진행상황
6. **개인보고서**: 사원명, 기간, 총보고서수, 평균달성률, 주요성과, 개선사항
</details>

### 프로젝트 구조
```
daily-report-system/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── reports/route.ts           # 일일 보고서 API
│   │   │   ├── employees/
│   │   │   │   ├── route.ts              # 사원 목록 API
│   │   │   │   └── [department]/route.ts  # 부서별 사원 API
│   │   │   ├── departments/route.ts       # 부서 목록 API
│   │   │   ├── projects/route.ts          # 프로젝트 관리 API
│   │   │   ├── stats/route.ts             # 통계 API
│   │   │   ├── summary/
│   │   │   │   ├── route.ts              # 일일 요약 API
│   │   │   │   └── generate/route.ts      # AI 요약 생성 API
│   │   │   └── personal-summary/
│   │   │       └── generate/route.ts      # 개인 리포트 생성 API
│   │   ├── create/page.tsx            # 보고서 작성 페이지
│   │   ├── reports/page.tsx           # 보고서 목록 페이지
│   │   ├── projects/page.tsx          # 프로젝트 관리 페이지
│   │   ├── personal/page.tsx          # 개인 리포트 페이지
│   │   ├── layout.tsx
│   │   └── page.tsx                   # 메인 페이지
│   ├── components/
│   │   ├── ClientLayout.tsx           # 클라이언트 레이아웃
│   │   ├── Login.tsx                  # 로그인 컴포넌트
│   │   ├── DailyReportForm.tsx        # 보고서 작성 폼
│   │   ├── ReportList.tsx            # 보고서 목록
│   │   ├── ProjectList.tsx           # 프로젝트 목록
│   │   ├── PersonalReportList.tsx    # 개인 리포트 목록
│   │   ├── SummaryModal.tsx          # 기본 요약 모달
│   │   └── SummaryModalAI.tsx        # AI 구조화 요약 모달
│   └── lib/
│       ├── supabase.ts               # Supabase 서비스 (v4.0+)
│       └── google-sheets.ts          # Google Sheets 서비스 (레거시)
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql    # 데이터베이스 스키마
├── scripts/
│   └── migrate-data.ts               # 데이터 마이그레이션 스크립트
├── .env.local.example                # 환경변수 예시
├── vercel.json                       # Vercel 배포 설정
├── MIGRATION_GUIDE.md                # 마이그레이션 가이드
├── CLAUDE.md                         # 개발 문서
├── README.md                         # 프로젝트 설명서
└── package.json
```

## 설치 및 실행

### 1. 프로젝트 설치
```bash
npm install
```

### 2. 환경 변수 설정
`.env.local.example`을 참조하여 `.env.local` 파일을 생성하고 다음 변수들을 설정합니다:

```env
GOOGLE_SHEETS_ID=your_google_sheets_id
GOOGLE_SERVICE_ACCOUNT_PROJECT_ID=your_project_id
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_ID=your_private_key_id
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour_private_key\n-----END PRIVATE KEY-----"
GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL=your_service_account@your_project.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_CLIENT_ID=your_client_id
```

### 3. 로컬 실행
```bash
npm run dev
```

### 4. 빌드 및 타입 체크
```bash
npm run build
npm run type-check
```

## Google Sheets 설정

### 1. Google Cloud Console 설정
1. Google Cloud Console에서 프로젝트 생성
2. Google Sheets API 활성화
3. 서비스 계정 생성 및 키 다운로드
4. 서비스 계정에 Google Sheets 편집 권한 부여

### 2. Google Sheets 준비
1. 새 스프레드시트 생성
2. 다음 6개 시트 생성:
   - **일일업무관리**: 헤더 행에 "날짜, 사원명, 업무개요, 진행목표, 달성율(%), 팀장평가, 비고"
   - **사원마스터**: 헤더 행에 "사원코드, 사원명, 직책, 부서"
   - **통계대시보드**: 헤더 행에 "월별평균달성률, 주별평균달성률, 부서별통계"
   - **일일보고요약**: 헤더 행에 "날짜, 요약내용"
   - **프로젝트관리**: 헤더 행에 "프로젝트명, 부서, 담당자, 목표종료일, 수정종료일, 상태, 진행률(%), 주요이슈, 세부진행상황"
   - **개인보고서**: 헤더 행에 "사원명, 기간, 총보고서수, 평균달성률, 주요성과, 개선사항"
3. 서비스 계정 이메일에 시트 편집 권한 부여

## Vercel 배포

### 1. Vercel 프로젝트 연결
```bash
vercel --prod
```

### 2. 환경 변수 설정
Vercel 대시보드에서 다음 환경 변수들을 설정:
- `GOOGLE_SHEETS_ID`
- `GOOGLE_SERVICE_ACCOUNT_PROJECT_ID`
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_ID`
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`
- `GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL`
- `GOOGLE_SERVICE_ACCOUNT_CLIENT_ID`

### 3. 배포 확인
배포 후 각 기능이 정상 작동하는지 확인:
- 보고서 작성 기능
- 보고서 목록 조회
- 통계 대시보드

## API 엔드포인트

### Reports API (`/api/reports`)
- `GET`: 모든 보고서 조회
- `POST`: 새 보고서 등록
- `PUT`: 기존 보고서 수정
- `DELETE`: 보고서 삭제

### Employees API (`/api/employees`)
- `GET`: 사원 목록 조회
- `/api/employees/[department]`: 부서별 사원 조회

### Departments API (`/api/departments`)
- `GET`: 부서 목록 조회

### Projects API (`/api/projects`)
- `GET`: 프로젝트 목록 조회
- `POST`: 새 프로젝트 등록
- `PUT`: 프로젝트 수정
- `DELETE`: 프로젝트 삭제

### Summary API (`/api/summary`)
- `GET`: 일일 요약 조회
- `POST`: 일일 요약 저장/수정
- `/api/summary/generate`: AI 자동 요약 생성

### Personal Summary API (`/api/personal-summary`)
- `/api/personal-summary/generate`: 기본 개인 리포트 생성
- `/api/personal-summary/generate-ai`: GPT-4.1 기반 구조화된 AI 요약 생성

### Stats API (`/api/stats`)
- `GET`: 통계 데이터 조회

## 데이터 구조

### DailyReport
```typescript
interface DailyReport {
  date: string;
  employeeName: string;
  workOverview: string;
  progressGoal: string;
  achievementRate: number;
  managerEvaluation: 'excellent' | 'good' | 'needs_improvement';
  remarks: string;
}
```

### Employee
```typescript
interface Employee {
  employeeCode: string;
  employeeName: string;
  position: string;
  department: string;
}
```

### Project
```typescript
interface Project {
  id: string;
  projectName: string;
  department: string;
  manager: string;
  targetEndDate: string;
  revisedEndDate: string;
  status: string; // '진행중' | '완료' | '대기' | '보류' | '취소'
  progressRate: number;
  mainIssues: string;
  detailedProgress: string;
}
```

### DailySummary
```typescript
interface DailySummary {
  date: string;
  summary: string;
}
```

### StatsDashboard
```typescript
interface StatsDashboard {
  monthlyAverageRate: number;
  weeklyAverageRate: number;
  departmentStats: { [key: string]: number };
}
```

## 주요 특징

### 1. 종합 업무 관리
- 일일 업무 보고서 작성 및 관리
- 프로젝트 진행 상황 추적
- 개인별 성과 분석 리포트

### 2. AI 기반 자동화
- GPT-4.1 모델을 활용한 고도화된 요약 생성
- JSON 구조화 응답으로 체계적인 데이터 처리
- 프로젝트/업무 단위 자동 분류 및 그룹화
- 구조화된 UI로 시각적 요약 결과 제공
- 개인별 성과 분석 및 맞춤형 제안

### 3. 실시간 동기화
- Google Sheets API를 통한 실시간 데이터 동기화
- 여러 사용자가 동시에 접근 가능
- 데이터 일관성 보장

### 4. 반응형 디자인
- 모바일 및 데스크톱 환경 모두 지원
- Tailwind CSS를 활용한 현대적 UI
- 직관적인 사용자 인터페이스

### 5. 고급 기능
- 페이지네이션으로 대용량 데이터 효율적 처리
- 다양한 필터링 및 검색 옵션
- PDF 내보내기 기능
- 로딩 상태 표시 및 중복 작업 방지

### 6. 데이터 검증 및 보안
- 클라이언트 및 서버 측 데이터 검증
- 달성률 범위 제한 (0-100%)
- 필수 필드 검증
- 안전한 데이터 처리

## 개발 지침

### 1. 코드 스타일
- TypeScript 사용 필수
- ESLint 규칙 준수
- 함수형 컴포넌트 사용

### 2. 상태 관리
- React Hooks 사용
- 로컬 상태 관리 (useState, useEffect)

### 3. 에러 처리
- try-catch 블록을 통한 에러 처리
- 사용자 친화적 에러 메시지

### 4. 성능 최적화
- 컴포넌트 메모화 고려
- API 호출 최적화

## 문제 해결

### 1. Google Sheets API 인증 오류
- 서비스 계정 키 파일 확인
- 환경 변수 설정 검증
- Google Sheets 권한 확인

### 2. Vercel 배포 오류
- 환경 변수 설정 확인
- 빌드 에러 로그 확인
- API 함수 타임아웃 설정

### 3. 데이터 동기화 문제
- Google Sheets 구조 확인
- 시트 이름 및 범위 검증
- 네트워크 연결 상태 확인

## 새로운 기능 및 개선사항

### 최근 업데이트 (v3.0)
1. **고도화된 AI 요약 시스템**
   - GPT-4.1 모델 적용으로 성능 향상
   - JSON 구조화 응답으로 체계적 데이터 처리
   - 프로젝트/업무 단위 자동 그룹화 및 분류
   - 구조화된 UI로 요약 결과 시각화

2. **향상된 개인 업무 보고 페이지**
   - 프로젝트별 카드 형태 요약 표시
   - 인원별 성과 그리드 레이아웃
   - 종합 정리 테이블과 상태별 색상 뱃지
   - JSON 다운로드 기능

3. **필터링 시스템 개선**
   - 부서 변경 시 사원명 필터 자동 초기화
   - 부서별 사원 목록 정확한 필터링
   - useEffect를 활용한 실시간 유효성 검사

4. **UI/UX 개선**
   - 그라데이션 헤더와 모던한 모달 디자인  
   - 태그 스타일 필터 정보 표시
   - 반응형 레이아웃과 부드러운 애니메이션
   - 로딩 상태와 에러 처리 강화

### 이전 업데이트 (v2.0)
1. **프로젝트 관리 시스템**
   - 프로젝트 등록, 수정, 삭제 기능
   - 진행률 추적 및 상태 관리 (진행중, 완료, 대기, 보류, 취소)
   - 페이지네이션 지원 (20/50/100개 단위)
   - 로딩 상태 표시 및 중복 작업 방지

2. **기본 AI 자동 요약 시스템**
   - OpenAI API 연동으로 일일보고서 자동 요약
   - 개인별 성과 리포트 자동 생성
   - 맞춤형 분석 및 개선 제안

3. **향상된 사용자 경험**
   - 부서별 사원 자동 정렬 (사원코드 기준)
   - 달성률 입력 필드 개선 (0 삭제 문제 해결)
   - PDF 내보내기 기능 강화
   - 반응형 페이지네이션 UI

4. **데이터 무결성 강화**
   - 프로젝트 삭제 로직 수정
   - 상태 관리 최적화
   - 에러 처리 개선

## 확장 가능성

### 1. 추가 기능
- 실시간 알림 시스템
- 파일 첨부 및 문서 관리
- 고급 차트 및 대시보드
- 모바일 앱 개발

### 2. 보안 강화
- OAuth 2.0 인증 시스템
- 역할 기반 접근 제어 (RBAC)
- 데이터 암호화 및 백업
- 감사 로그 시스템

### 3. 성능 개선
- Redis 캐싱 시스템
- 무한 스크롤 구현
- 실시간 WebSocket 연결
- CDN 및 이미지 최적화

### 4. 통합 기능
- Slack/Teams 연동
- 이메일 자동 발송
- 캘린더 통합
- 다국어 지원

## 라이센스
이 프로젝트는 MIT 라이센스를 따릅니다.

## 지원 및 문의
시스템 사용 중 문제가 발생하거나 개선 사항이 있으시면 개발팀에 문의해 주세요.
# 일일 업무 보고 시스템 (Daily Report System)

## 프로젝트 개요
Google Sheets를 데이터베이스로 활용하는 일일 업무 보고 관리 시스템입니다. Next.js 기반의 웹 애플리케이션으로 Vercel에 배포할 수 있도록 구성되어 있습니다.

## 기술 스택
- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS
- **Database**: Google Sheets API
- **Deployment**: Vercel
- **Date Utils**: date-fns

## 주요 기능
1. **일일 업무 보고서 작성**: 사원들이 매일 업무 내용을 기록
2. **보고서 목록 조회**: 날짜별, 사원별 필터링 및 상세 보기
3. **통계 대시보드**: 월별/주별 달성률 및 부서별 성과 분석
4. **팀장 평가 시스템**: 우수/보통/미흡 평가 기능

## 시스템 구조

### Google Sheets 구조
시스템은 3개의 시트로 구성됩니다:

1. **일일업무관리** (메인 데이터)
   - 열 구조: 날짜, 사원명, 업무개요, 진행목표, 달성율(%), 팀장평가, 비고
   - 범위: A2:G (헤더 제외)

2. **사원마스터**
   - 열 구조: 사원코드, 사원명, 직책, 부서
   - 범위: A2:D (헤더 제외)

3. **통계대시보드**
   - 열 구조: 월별평균달성률, 주별평균달성률, 부서별통계
   - 범위: A2:C (헤더 제외)

### 프로젝트 구조
```
daily-report-system/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── reports/route.ts      # 보고서 API
│   │   │   ├── employees/route.ts    # 사원 API
│   │   │   └── stats/route.ts        # 통계 API
│   │   ├── layout.tsx
│   │   └── page.tsx                  # 메인 페이지
│   ├── components/
│   │   ├── DailyReportForm.tsx       # 보고서 작성 폼
│   │   ├── ReportList.tsx           # 보고서 목록
│   │   └── StatsDashboard.tsx       # 통계 대시보드
│   └── lib/
│       └── google-sheets.ts         # Google Sheets 서비스
├── .env.local.example               # 환경변수 예시
├── vercel.json                      # Vercel 배포 설정
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
2. 다음 3개 시트 생성:
   - **일일업무관리**: 헤더 행에 "날짜, 사원명, 업무개요, 진행목표, 달성율(%), 팀장평가, 비고"
   - **사원마스터**: 헤더 행에 "사원코드, 사원명, 직책, 부서"
   - **통계대시보드**: 헤더 행에 "월별평균달성률, 주별평균달성률, 부서별통계"
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

### Employees API (`/api/employees`)
- `GET`: 사원 목록 조회

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

### StatsDashboard
```typescript
interface StatsDashboard {
  monthlyAverageRate: number;
  weeklyAverageRate: number;
  departmentStats: { [key: string]: number };
}
```

## 주요 특징

### 1. 실시간 동기화
- Google Sheets API를 통한 실시간 데이터 동기화
- 여러 사용자가 동시에 접근 가능

### 2. 반응형 디자인
- 모바일 및 데스크톱 환경 모두 지원
- Tailwind CSS를 활용한 현대적 UI

### 3. 데이터 검증
- 클라이언트 및 서버 측 데이터 검증
- 달성률 범위 제한 (0-100%)
- 필수 필드 검증

### 4. 사용자 경험
- 직관적인 탭 기반 네비게이션
- 필터링 및 검색 기능
- 상세보기 모달

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

## 확장 가능성

### 1. 추가 기능
- 이메일 알림 시스템
- 파일 첨부 기능
- 고급 통계 분석

### 2. 보안 강화
- 사용자 인증 시스템
- 권한 기반 접근 제어
- 데이터 암호화

### 3. 성능 개선
- 캐싱 시스템
- 페이지네이션
- 실시간 업데이트

## 라이센스
이 프로젝트는 MIT 라이센스를 따릅니다.

## 지원 및 문의
시스템 사용 중 문제가 발생하거나 개선 사항이 있으시면 개발팀에 문의해 주세요.
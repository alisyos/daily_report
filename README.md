# 일일 업무 보고 시스템 (Daily Report System)

![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)
![React](https://img.shields.io/badge/React-18-blue?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-teal?style=for-the-badge&logo=tailwindcss)

## 📋 프로젝트 소개

Supabase PostgreSQL을 데이터베이스로 활용하는 **종합 업무 관리 시스템**입니다. 일일 업무 보고서 작성부터 프로젝트 관리, AI 기반 성과 분석까지 원스톱으로 제공하는 웹 애플리케이션입니다.

> **📢 Important**: v4.0부터 Google Sheets에서 Supabase로 마이그레이션되었습니다. 기존 사용자는 [마이그레이션 가이드](./MIGRATION_GUIDE.md)를 참고하세요.

## ✨ 주요 기능

### 📊 일일 업무 보고
- **보고서 작성**: 직관적인 폼으로 간편한 일일 업무 작성
- **실시간 조회**: 날짜별, 부서별, 사원별 다양한 필터링
- **AI 자동 요약**: GPT-4.1 기반 구조화된 업무 요약 생성
- **PDF 내보내기**: 보고서를 PDF 형태로 내보내기

### 🚀 프로젝트 관리
- **프로젝트 추적**: 프로젝트 등록, 수정, 삭제 및 진행률 관리
- **상태 관리**: 진행중, 완료, 대기, 보류, 취소 상태별 분류
- **페이지네이션**: 20/50/100개 단위로 효율적인 데이터 표시
- **실시간 업데이트**: 로딩 상태 표시 및 중복 작업 방지

### 📈 개인 리포트
- **성과 분석**: 개인별 업무 성과 및 달성률 분석
- **구조화된 AI 요약**: 프로젝트/업무 단위로 체계적인 요약 제공
- **시각화된 결과**: 카드 형태와 테이블로 직관적 표시
- **JSON 다운로드**: 구조화된 데이터 추출 기능

### 🎨 사용자 경험
- **반응형 디자인**: 모바일과 데스크톱 모두 지원
- **모던한 UI**: 그라데이션 헤더와 카드 기반 레이아웃
- **스마트 필터링**: 부서 변경 시 사원명 자동 초기화
- **시각적 피드백**: 로딩 상태와 상태별 색상 뱃지

## 🛠 기술 스택

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **AI Integration**: OpenAI GPT-4.1 API
- **Deployment**: Vercel
- **Legacy**: Google Sheets API (v3.0 이하)

## 🚀 빠른 시작

### 1. 프로젝트 설치

```bash
git clone <repository-url>
cd daily-report-system
npm install
```

### 2. Supabase 프로젝트 설정

1. [Supabase](https://supabase.com)에서 새 프로젝트 생성
2. SQL Editor에서 `supabase/migrations/001_initial_schema.sql` 실행
3. Settings > API에서 프로젝트 URL과 키 확인

### 3. 환경 변수 설정

`.env.local` 파일을 생성하고 다음 변수들을 설정하세요:

```env
# Supabase 설정
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# OpenAI API (필수 - AI 요약 기능용)
OPENAI_API_KEY=your_openai_api_key
```

자세한 설정 방법은 [마이그레이션 가이드](./MIGRATION_GUIDE.md)를 참고하세요.

### 4. 로컬 실행

```bash
npm run dev
```

브라우저에서 `http://localhost:3000`으로 접속하세요.

### 5. 빌드 및 배포

```bash
npm run build
npm run start
```

## 📱 페이지 구성

- **메인 페이지** (`/`): 대시보드 및 전체 개요
- **보고서 작성** (`/create`): 일일 업무 보고서 작성
- **보고서 목록** (`/reports`): 보고서 조회 및 관리
- **프로젝트 관리** (`/projects`): 프로젝트 추적 및 관리
- **개인 리포트** (`/personal`): 개인 성과 분석

## 🔧 개발 명령어

```bash
# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build

# 타입 체크
npm run type-check

# 린트 실행
npm run lint

# 데이터 마이그레이션 (Google Sheets → Supabase)
npm run migrate
```

## 📊 데이터 구조

### DailyReport
```typescript
interface DailyReport {
  date: string;
  employeeName: string;
  department: string;
  workOverview: string;
  progressGoal: string;
  achievementRate: number;
  managerEvaluation: string;
  remarks: string;
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
  status: '진행중' | '완료' | '대기' | '보류' | '취소';
  progressRate: number;
  mainIssues: string;
  detailedProgress: string;
}
```

## 🎯 주요 특징

### 🤖 AI 기반 자동화
- GPT-4.1 모델을 활용한 고도화된 요약 생성
- JSON 구조화 응답으로 체계적인 데이터 처리
- 프로젝트/업무 단위 자동 분류 및 그룹화
- 구조화된 UI로 시각적 요약 결과 제공

### ⚡ 성능 최적화
- 페이지네이션으로 대용량 데이터 효율적 처리
- 로딩 상태 표시 및 중복 작업 방지
- 반응형 디자인으로 모든 디바이스 지원

### 🔒 데이터 무결성
- 클라이언트 및 서버 측 데이터 검증
- PostgreSQL 트랜잭션 기반 데이터 일관성
- Row Level Security (RLS)를 통한 접근 제어
- 안전한 데이터 처리 및 에러 핸들링

## 🔄 최근 업데이트

### 🚀 v4.0 (최신) - Supabase 마이그레이션
- ✅ **데이터베이스 마이그레이션**: Google Sheets → Supabase PostgreSQL
- ✅ **성능 향상**: 대용량 데이터 처리 속도 대폭 개선
- ✅ **확장성**: 관계형 데이터베이스의 강력한 쿼리 기능
- ✅ **실시간 동기화**: Supabase 실시간 기능 지원 준비
- ✅ **Row Level Security**: 데이터 보안 강화
- ✅ **자동 마이그레이션 스크립트**: 원클릭 데이터 이전
- 📖 [마이그레이션 가이드](./MIGRATION_GUIDE.md) 참고

### 📦 v3.0 - AI 고도화
- ✅ **고도화된 AI 요약**: GPT-4.1 기반 구조화된 요약 생성
- ✅ **JSON 응답 구조**: 체계적인 데이터 처리 및 분석
- ✅ **프로젝트별 분류**: 업무를 자동으로 프로젝트 단위로 그룹화
- ✅ **시각화된 UI**: 카드 형태와 테이블로 직관적 표시

### 🗂️ v2.0 - 프로젝트 관리
- ✅ 프로젝트 관리 시스템 추가
- ✅ 기본 AI 자동 요약 기능
- ✅ 페이지네이션 지원

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 라이센스

이 프로젝트는 MIT 라이센스를 따릅니다. 자세한 내용은 `LICENSE` 파일을 참고하세요.

## 🆘 지원 및 문의

- 📧 이메일: [support@company.com](mailto:support@company.com)
- 📖 문서: [개발 문서 (CLAUDE.md)](./CLAUDE.md)
- 🐛 버그 리포트: GitHub Issues

---

<div align="center">
  <p>Made with ❤️ for better workplace productivity</p>
  <p>© 2024 Daily Report System. All rights reserved.</p>
</div>
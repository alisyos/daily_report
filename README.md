# 일일 업무 보고 시스템 (Daily Report System)

Google Sheets를 데이터베이스로 활용하는 일일 업무 보고 관리 시스템입니다.

## 주요 기능

- 📝 **일일 업무 보고서 작성**: 사원들의 매일 업무 내용 기록
- 📊 **보고서 목록 조회**: 날짜별, 사원별 필터링 및 상세 보기
- 📈 **통계 대시보드**: 월별/주별 달성률 및 부서별 성과 분석
- ⭐ **팀장 평가 시스템**: 우수/보통/미흡 평가 기능

## 기술 스택

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS
- **Database**: Google Sheets API
- **Deployment**: Vercel

## 빠른 시작

### 1. 프로젝트 설치
```bash
npm install
```

### 2. 환경 변수 설정
`.env.local.example`을 참조하여 `.env.local` 파일을 생성하고 Google Sheets API 정보를 설정합니다.

### 3. 개발 서버 실행
```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인합니다.

### 4. 빌드 및 배포
```bash
npm run build
npm run start
```

## Google Sheets 설정

1. Google Cloud Console에서 프로젝트 생성
2. Google Sheets API 활성화
3. 서비스 계정 생성 및 키 다운로드
4. 다음 3개 시트가 있는 스프레드시트 생성:
   - **일일업무관리**: 메인 데이터
   - **사원마스터**: 사원 정보
   - **통계대시보드**: 통계 데이터

자세한 설정 방법은 [CLAUDE.md](./CLAUDE.md)를 참조하세요.

## Vercel 배포

1. Vercel 프로젝트 연결
2. 환경 변수 설정
3. 배포 확인

```bash
vercel --prod
```

## 프로젝트 구조

```
src/
├── app/
│   ├── api/          # API 라우트
│   └── page.tsx      # 메인 페이지
├── components/       # React 컴포넌트
└── lib/             # 유틸리티 함수
```

## 문서

- [CLAUDE.md](./CLAUDE.md) - 상세한 프로젝트 문서
- [환경 변수 설정](./.env.local.example) - 환경 변수 예시

## 라이센스

MIT License

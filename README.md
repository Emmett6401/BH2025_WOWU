# 학급 관리 시스템

## 프로젝트 개요
- **이름**: 학급 관리 시스템
- **목표**: 교사가 학급, 학생, 수업 내용, 상담 내용을 체계적으로 관리할 수 있는 웹 애플리케이션
- **주요 기능**: 
  - 학급(반) 생성 및 관리
  - 학생 정보 데이터베이스 관리
  - 수업 내용 기록 및 조회
  - 학생 상담 내용 기록 및 관리

## URL
- **개발 서버**: https://3000-i3oloko346uog7d7oo8v5-3844e1b6.sandbox.novita.ai
- **로컬**: http://localhost:3000

## 데이터 아키텍처

### 데이터 모델
1. **학급(Classes)**
   - 학급명, 학년, 담임교사, 설명
   
2. **학생(Students)**
   - 학번, 이름, 연락처, 이메일, 학부모 정보, 주소, 비고
   - 소속 학급과 연결
   
3. **수업(Lessons)**
   - 제목, 과목, 수업 날짜, 수업 내용, 숙제
   - 학급과 연결
   
4. **상담(Counselings)**
   - 상담 날짜, 상담 유형(학업/생활/진로/기타), 주제, 상담 내용, 후속 조치, 완료 여부
   - 학생과 연결

### 저장소 서비스
- **Cloudflare D1**: SQLite 기반 분산 데이터베이스
- **로컬 개발**: `.wrangler/state/v3/d1` 디렉토리에 로컬 SQLite 데이터베이스 자동 생성

### 데이터 플로우
```
프론트엔드 (TailwindCSS + Vanilla JS)
    ↓ (REST API 호출)
백엔드 API (Hono Framework)
    ↓ (SQL 쿼리)
D1 데이터베이스 (SQLite)
```

## 기능 가이드

### 1. 학급 관리
- **학급 추가**: "학급 추가" 버튼을 클릭하여 학년, 반 이름, 담임교사 정보 입력
- **학급 수정**: 각 학급 카드의 연필 아이콘 클릭
- **학급 삭제**: 각 학급 카드의 휴지통 아이콘 클릭

### 2. 학생 관리
- **학생 추가**: "학생 추가" 버튼을 클릭하여 학생 정보 입력
  - 필수: 학급, 학번, 이름
  - 선택: 연락처, 학부모 정보, 주소, 비고
- **학생 수정/삭제**: 테이블의 각 행에서 작업 버튼 사용

### 3. 수업 관리
- **수업 추가**: "수업 추가" 버튼을 클릭하여 수업 정보 기록
  - 학급, 과목, 제목, 수업 날짜 선택
  - 수업 내용, 숙제 입력
- **수업 조회**: 최근 수업이 위에 표시됨
- **수업 수정/삭제**: 각 수업 카드에서 작업 버튼 사용

### 4. 상담 관리
- **상담 추가**: "상담 추가" 버튼을 클릭하여 상담 기록
  - 학생 선택, 상담 날짜, 상담 유형 선택
  - 주제, 상담 내용, 후속 조치 입력
  - 완료 여부 체크
- **상담 조회**: 
  - 완료된 상담은 초록색 배경으로 표시
  - 상담 유형별 색상 구분 (학업: 파랑, 생활: 초록, 진로: 보라)
- **상담 수정/삭제**: 각 상담 카드에서 작업 버튼 사용

## API 엔드포인트

### 학급 API
- `GET /api/classes` - 모든 학급 조회
- `GET /api/classes/:id` - 특정 학급 조회
- `POST /api/classes` - 학급 생성
- `PUT /api/classes/:id` - 학급 수정
- `DELETE /api/classes/:id` - 학급 삭제

### 학생 API
- `GET /api/students?class_id=<id>` - 학생 조회 (학급별 필터 가능)
- `GET /api/students/:id` - 특정 학생 조회
- `POST /api/students` - 학생 생성
- `PUT /api/students/:id` - 학생 수정
- `DELETE /api/students/:id` - 학생 삭제

### 수업 API
- `GET /api/lessons?class_id=<id>` - 수업 조회 (학급별 필터 가능)
- `GET /api/lessons/:id` - 특정 수업 조회
- `POST /api/lessons` - 수업 생성
- `PUT /api/lessons/:id` - 수업 수정
- `DELETE /api/lessons/:id` - 수업 삭제

### 상담 API
- `GET /api/counselings?student_id=<id>` - 상담 조회 (학생별 필터 가능)
- `GET /api/counselings/:id` - 특정 상담 조회
- `POST /api/counselings` - 상담 생성
- `PUT /api/counselings/:id` - 상담 수정
- `DELETE /api/counselings/:id` - 상담 삭제

## 완료된 기능
- ✅ 학급 생성, 조회, 수정, 삭제 (CRUD)
- ✅ 학생 데이터베이스 관리 (CRUD)
- ✅ 수업 내용 기록 및 관리 (CRUD)
- ✅ 상담 내용 기록 및 관리 (CRUD)
- ✅ 반응형 웹 UI (TailwindCSS)
- ✅ 관계형 데이터 모델 (학급-학생-수업-상담)
- ✅ 로컬 개발 환경 구성 (D1 로컬 모드)

## 미구현 기능
- 사용자 인증 및 권한 관리
- 학생별 성적 관리 기능
- 출석 관리 기능
- 파일 첨부 기능 (수업 자료, 상담 기록)
- 보고서 생성 및 내보내기
- 학부모 포털
- 알림 및 공지사항 기능

## 권장 다음 단계
1. **사용자 인증 추가**: Cloudflare Access 또는 타사 인증 서비스 통합
2. **파일 저장소**: R2 버킷을 사용한 파일 업로드 기능
3. **출석 관리**: 일별 출석 체크 및 통계 기능
4. **성적 관리**: 시험, 과제 점수 입력 및 통계
5. **Cloudflare Pages 배포**: 프로덕션 환경 구축
6. **모바일 앱**: PWA 또는 네이티브 앱으로 확장

## 배포 상태
- **플랫폼**: Cloudflare Pages (준비 완료)
- **상태**: 🟡 로컬 개발 중
- **기술 스택**: 
  - 프론트엔드: Vanilla JavaScript + TailwindCSS + Axios
  - 백엔드: Hono Framework + TypeScript
  - 데이터베이스: Cloudflare D1 (SQLite)
  - 배포: Wrangler + PM2
- **마지막 업데이트**: 2025-11-10

## 개발 명령어

### 데이터베이스
```bash
npm run db:migrate:local  # 로컬 DB 마이그레이션
npm run db:seed           # 샘플 데이터 삽입
npm run db:reset          # DB 초기화 및 재생성
```

### 개발 서버
```bash
npm run build             # 프로젝트 빌드
npm run dev:sandbox       # 로컬 개발 서버 시작
pm2 start ecosystem.config.cjs  # PM2로 서버 시작
pm2 logs webapp --nostream      # 로그 확인
pm2 restart webapp              # 서버 재시작
pm2 delete webapp               # 서버 중지
```

### 배포
```bash
npm run deploy            # Cloudflare Pages 배포
```

## 프로젝트 구조
```
webapp/
├── src/
│   └── index.tsx              # Hono 백엔드 API
├── public/
│   └── static/
│       └── app.js             # 프론트엔드 JavaScript
├── migrations/
│   └── 0001_initial_schema.sql # DB 스키마
├── seed.sql                   # 샘플 데이터
├── ecosystem.config.cjs       # PM2 설정
├── wrangler.jsonc             # Cloudflare 설정
└── package.json               # 의존성 및 스크립트
```

## 라이선스
MIT License

## 개발자
GenSpark AI Assistant

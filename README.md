# KDT교육관리시스템 v3.2

## 프로젝트 개요
- **이름**: KDT교육관리시스템 v3.2 - 우송대학교 바이오헬스아카데미
- **목표**: 보건복지부(한국보건산업진흥원), KDT, 우송대학교산학협력단 바이오헬스아카데미 올인원테크 이노베이터 교육과정 통합 관리
- **주요 기능**: 강사/학생/상담/훈련일지/팀프로젝트 관리 + AI 생활기록부 자동 생성

## 🌐 접속 URL

### 🚀 개발 서버 (Sandbox)
- **프론트엔드**: https://3000-i3oloko346uog7d7oo8v5-3844e1b6.sandbox.novita.ai
- **백엔드 API**: https://8000-i3oloko346uog7d7oo8v5-3844e1b6.sandbox.novita.ai
- **API 문서 (Swagger)**: https://8000-i3oloko346uog7d7oo8v5-3844e1b6.sandbox.novita.ai/docs

### 📂 GitHub 저장소
- **Repository**: https://github.com/Emmett6401/BH2025_WOWU
- **Branch**: main (프로덕션), temp (개발)

## ✅ 완료된 주요 기능

### 1. 🔐 로그인 시스템
- 강사 인증 기능
- 주강사 / 보조강사 권한 구분
- 비밀번호 변경 및 초기화 (주강사 전용)
- 기본 비밀번호: `kdt2025`

### 2. 👨‍🏫 강사 관리 (Instructors)
- **완전한 CRUD 기능** (생성, 조회, 수정, 삭제)
- **강사코드 관리 시스템** (IC-001, IC-002...)
- **강사 유형 분류**:
  - 주강사 (MAIN_INSTRUCTOR)
  - 보조강사 (SUB_INSTRUCTOR)
  - 멘토 (MENTOR)
  - 외부강사 등
- **필터 및 검색 기능**:
  - 강사구분 필터 (드롭다운)
  - 정렬 옵션 (이름순 / 강사코드순)
  - 검색 (이름, 전공)
- **사진 첨부 기능** (FTP 업로드)
- **비밀번호 관리** (주강사 전용)
- 총 33명 강사 등록

### 3. 👨‍🎓 학생 관리 (Students)
- **완전한 CRUD 기능**
- **Excel 일괄 등록**:
  - 템플릿 다운로드 기능
  - 11개 컬럼 양식 지원
  - 자동 학생코드 생성 (S001, S002...)
- **필터 및 검색 기능**:
  - 정렬 옵션 (이름순/과정순/캠퍼스순/최종학교순/생년월일순)
  - 과정 필터 (드롭다운)
  - 검색 (이름, 학생코드)
- **사진 첨부 기능** (FTP 업로드)
- **학생 정보 표시**:
  - 이름, 코드, 생년월일
  - 성별, 과정, 캠퍼스
  - 최종학교, 연락처
- 총 24명 학생 등록

### 4. 💬 상담 관리 (Counselings)
- **완전한 CRUD 기능**
- **학생별 상담 이력 관리**
- **필터 기능**:
  - 학생 선택 드롭다운
  - 월별 조회 (YYYY-MM)
  - 과정별 조회
- **상담 유형 분류**:
  - 정기상담 (파란색)
  - 수시상담 (노란색)
  - 긴급상담 (빨간색)
  - 학부모상담 (보라색)
- **상태 관리**:
  - 예정 / 완료 / 취소
  - 완료 상담 녹색 배경 표시
- **사진 첨부 기능** (FTP 업로드)
- 총 16건 상담 기록

### 5. 📝 훈련일지 관리 (Training Logs)
- **완전한 CRUD 기능**
- **일별 훈련 내용 기록**
- **필터 기능**:
  - 과정 선택 드롭다운
  - 월별 조회 (YYYY-MM)
- **훈련 정보**:
  - 훈련일자, 과정명
  - 교과목명, 강사명
  - 훈련내용, 특이사항
- **사진 첨부 기능** (FTP 업로드)

### 6. 👥 팀프로젝트 관리 (Team Projects)
- **완전한 CRUD 기능**
- **팀원 관리** (최대 5명)
- **학생 선택 드롭다운**:
  - 상세 정보 표시: `이름(코드) - 과정명 - 생년월일 - 최종학교`
  - 과정별 필터링 기능
- **팀 정보**:
  - 팀명, 팀장
  - 팀원1~5 (이름, 학생코드)
  - 과정명, 프로젝트명
  - 시작일, 종료일
- **사진 첨부 기능** (팀 활동 사진)

### 7. 🤖 AI 생활기록부 작성
- **OpenAI GPT-4o-mini 활용**
- **워크플로우**:
  1. 학생 선택 드롭다운
  2. 해당 학생의 모든 상담 기록 리스트업
  3. 회차별 상담 내용 시각화
  4. "AI 생기부 생성" 버튼 클릭
  5. 종합 의견 자동 생성
  6. 복사/다운로드 기능
- **생성 품질**:
  - 긍정적 표현 강조
  - 성장 가능성 중점
  - 전문적인 교육 평가 용어
- 로딩 스피너 (10-20초)

## 🎨 v3.2 주요 개선사항 (2025-11-17)

### ✨ 새로운 기능

#### 1. 우송대학교 공식 로고 적용
- **기존**: 텍스트 기반 로고 ("우송대학교 WOOSONG")
- **변경**: 공식 로고 이미지 (616x295 PNG)
- **위치**: 헤더 좌측 상단
- **효과**: 전문성 및 브랜드 일관성 강화

#### 2. 강사관리 필터 및 정렬 개선
- **정렬 옵션 추가**:
  - 이름순 (기본값, 한글 가나다 순서)
  - 강사코드순
- **검색 필드 개선**:
  - 브라우저 자동완성 완전 차단
  - 여러 기법 적용 (autocomplete, readonly, 강제 초기화)
- **초기 로딩 정렬**: 페이지 로딩 시 자동으로 이름순 정렬

#### 3. 학생관리 필터 강화
- **5가지 정렬 옵션**:
  - 이름순 (기본값)
  - 과정순
  - 캠퍼스순
  - 최종학교순
  - 생년월일순
- **과정 필터**: 드롭다운으로 과정별 학생 조회
- **통합 검색**: 이름, 학생코드로 실시간 검색

#### 4. 학생 선택 드롭다운 정보 강화
- **기존**: 이름 (코드)만 표시
- **변경**: `이름(코드) - 과정명 - 생년월일 - 최종학교`
- **적용 범위**:
  - 팀프로젝트 관리 (팀원 선택)
  - 상담관리 (학생 선택)
- **과정 필터링**: 선택한 과정의 학생만 표시

#### 5. 사진 아이콘 위치 통일
- **모든 테이블 첫 번째 컬럼에 사진 아이콘 배치**:
  - 학생 관리
  - 강사 관리
  - 상담 관리
  - 훈련일지 관리
  - 팀프로젝트 관리
- **아이콘 표시**:
  - 🟢 녹색: 사진 있음 (개수 표시)
  - ⚪ 회색: 사진 없음
- **일관된 UX**: 한눈에 사진 유무 확인 가능

#### 6. 알림 메시지 자동 숨김
- **자동 사라지는 알림**: 모든 Alert 메시지 3초 후 자동 닫힘
- **사용자 편의성 향상**: 확인 버튼 클릭 불필요
- **적용 범위**: 성공/오류/정보 메시지 전체

### 🐛 버그 수정
- ✅ 강사관리 초기 로딩 시 정렬 순서 불일치 해결
- ✅ 강사 검색 필드 브라우저 자동완성 문제 해결
- ✅ 필터링된 상담 목록에 사진 아이콘 누락 수정

### 📈 UI/UX 개선
- ✅ 일관된 필터 레이아웃 (3컬럼 그리드)
- ✅ 한글 로케일 정렬 (`.localeCompare('ko')`)
- ✅ 드롭다운 옵션 정렬 (가나다순)
- ✅ 검색 필드 플레이스홀더 개선
- ✅ 사진 아이콘 위치 및 색상 통일

## 📊 데이터 아키텍처

### 외부 MySQL 데이터베이스
```
호스트: bitnmeta2.synology.me:3307
데이터베이스: bh2025
사용자: iyrc
인코딩: UTF-8 (한글 지원)
```

### 주요 테이블 구조

#### instructor_codes (강사코드)
```sql
- code: VARCHAR(10) PK
- name: VARCHAR(50)
- type: ENUM (12가지 강사 유형)
```

#### instructors (강사)
```sql
- code: VARCHAR(10) PK
- name, phone, major, email
- instructor_type: FK -> instructor_codes.code
- photo_urls: TEXT (JSON 배열)
- password: VARCHAR(255)
```

#### students (학생)
```sql
- id: INT PK AUTO_INCREMENT
- code: VARCHAR(10) (S001, S002...)
- name, birth_date, gender
- course_code: FK -> courses.code
- campus, final_school
- phone, email
- photo_urls: TEXT (JSON 배열)
```

#### consultations (상담)
```sql
- id: INT PK AUTO_INCREMENT
- student_id: FK -> students.id
- consultation_date, counseling_type
- topic, content, follow_up
- is_completed: TINYINT
- photo_urls: TEXT (JSON 배열)
```

#### training_logs (훈련일지)
```sql
- id: INT PK AUTO_INCREMENT
- course_code: FK -> courses.code
- training_date, subject_name
- instructor_name, content
- notes, photo_urls: TEXT
```

#### team_projects (팀프로젝트)
```sql
- id: INT PK AUTO_INCREMENT
- team_name, team_leader
- member1_name ~ member5_name
- member1_code ~ member5_code
- course_code, project_name
- start_date, end_date
- photo_urls: TEXT (JSON 배열)
```

### 사진 저장 구조

#### FTP 서버 경로
```
서버: bitnmeta2.synology.me:2121
경로 구조:
/homes/ha/camFTP/BH2025/
  ├── guidance/      # 상담일지 사진
  ├── train/         # 훈련일지 사진
  ├── student/       # 학생관리 사진
  ├── teacher/       # 강사관리 사진
  └── team/          # 팀프로젝트 사진
```

#### 사진 URL 저장 형식
```json
["ftp://server:2121/path/file1.jpg", "ftp://server:2121/path/file2.jpg"]
```

## 📡 API 엔드포인트

### 인증 API
- `POST /api/login` - 강사 로그인
- `POST /api/change-password` - 비밀번호 변경
- `POST /api/reset-password` - 비밀번호 초기화

### 강사 API
- `GET /api/instructors?search={query}` - 목록 조회 (검색)
- `GET /api/instructors/{code}` - 상세 조회
- `POST /api/instructors` - 생성
- `PUT /api/instructors/{code}` - 수정
- `DELETE /api/instructors/{code}` - 삭제

### 학생 API
- `GET /api/students?course_code={code}&search={query}` - 목록 조회
- `GET /api/students/{id}` - 상세 조회
- `POST /api/students` - 생성
- `PUT /api/students/{id}` - 수정
- `DELETE /api/students/{id}` - 삭제
- `POST /api/students/upload-excel` - Excel 일괄 업로드
- `GET /api/students/download-template` - Excel 템플릿 다운로드

### 상담 API
- `GET /api/counselings?student_id={id}&month={YYYY-MM}` - 목록 조회
- `GET /api/counselings/{id}` - 상세 조회
- `POST /api/counselings` - 생성
- `PUT /api/counselings/{id}` - 수정
- `DELETE /api/counselings/{id}` - 삭제

### 훈련일지 API
- `GET /api/training-logs?course_code={code}&month={YYYY-MM}` - 목록 조회
- `GET /api/training-logs/{id}` - 상세 조회
- `POST /api/training-logs` - 생성
- `PUT /api/training-logs/{id}` - 수정
- `DELETE /api/training-logs/{id}` - 삭제

### 팀프로젝트 API
- `GET /api/team-projects?course_code={code}` - 목록 조회
- `GET /api/team-projects/{id}` - 상세 조회
- `POST /api/team-projects` - 생성
- `PUT /api/team-projects/{id}` - 수정
- `DELETE /api/team-projects/{id}` - 삭제

### 사진 업로드 API
- `POST /api/upload-photo` - 사진 업로드 (FTP)
- `GET /api/download-image` - 사진 다운로드 (프록시)
- `GET /api/thumbnail` - 썸네일 생성 (200x200)

### AI API
- `POST /api/ai/generate-report` - AI 생활기록부 생성

## 🎯 사용 가이드

### 로그인
1. 강사코드와 비밀번호 입력
2. 기본 비밀번호: `kdt2025`
3. 주강사는 다른 강사 비밀번호 변경 가능

### 강사 관리
1. "강사관리" 탭 클릭
2. **필터 사용**:
   - 강사구분 필터 (드롭다운)
   - 정렬: 이름순 (기본) / 강사코드순
   - 검색: 이름, 전공
3. "강사 추가" 버튼으로 신규 등록
4. 사진 업로드: "파일 선택" 또는 "사진 촬영"

### 학생 관리
1. "학생관리" 탭 클릭
2. **필터 사용**:
   - 정렬: 이름순/과정순/캠퍼스순/최종학교순/생년월일순
   - 과정 필터 (드롭다운)
   - 검색: 이름, 학생코드
3. **개별 등록**: "학생 추가" 버튼
4. **일괄 등록**:
   - "Excel 템플릿" 다운로드
   - 11개 컬럼 작성
   - "Excel 업로드" 버튼
   - 자동 학생코드 생성 (S001, S002...)

### 상담 관리
1. "상담관리" 탭 클릭
2. **필터 사용**:
   - 학생 선택 (드롭다운)
   - 월 선택 (YYYY-MM)
   - 과정 선택 (드롭다운)
3. "상담 추가"로 새 상담 기록
4. 상담 유형 선택 (정기/수시/긴급/학부모)
5. 완료된 상담은 초록색 배경
6. 사진 첨부 가능

### 훈련일지 관리
1. "훈련일지" 탭 클릭
2. **필터 사용**:
   - 과정 선택 (드롭다운)
   - 월 선택 (YYYY-MM)
3. "일지 추가"로 새 일지 작성
4. 훈련 내용 및 특이사항 입력
5. 사진 첨부 가능

### 팀프로젝트 관리
1. "팀관리" 탭 클릭
2. "팀 추가" 버튼
3. **팀원 선택** (최대 5명):
   - 드롭다운에서 학생 선택
   - 상세 정보 표시: `이름(코드) - 과정명 - 생년월일 - 최종학교`
   - 과정 필터로 학생 범위 좁히기
4. 프로젝트 기간 설정
5. 팀 활동 사진 첨부

### AI 생기부 작성
1. "AI생기부" 탭 클릭
2. 드롭다운에서 학생 선택
3. 해당 학생의 모든 상담 기록 자동 표시
4. "AI 생기부 생성" 버튼 클릭
5. 10-20초 대기 (AI 생성 중)
6. 생성된 종합 의견 확인
7. "복사" 또는 "다운로드" 버튼으로 활용

## 🚀 개발 환경 설정

### 필요 패키지 설치
```bash
# Python 패키지
pip install fastapi uvicorn pymysql pandas openpyxl python-multipart openai python-dotenv pillow

# Node.js (프록시 서버용)
npm install
```

### 환경 변수 설정
```bash
# backend/.env 파일 생성 (예시는 .env.example 참조)
cd backend
cp .env.example .env

# .env 파일 편집 (실제 값으로 변경)
nano .env
```

**backend/.env 파일 내용:**
```bash
# 데이터베이스 설정
DB_HOST=your_database_host
DB_PORT=3307
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_NAME=your_database_name

# FTP 서버 설정
FTP_HOST=your_ftp_host
FTP_PORT=2121
FTP_USER=your_ftp_user
FTP_PASSWORD=your_ftp_password

# OpenAI API 설정
OPENAI_API_KEY=your_openai_api_key_here
```

**⚠️ 보안 주의사항:**
- `.env` 파일은 절대 Git에 커밋하지 마세요 (`.gitignore`에 포함됨)
- 실제 프로덕션 환경에서는 환경 변수를 서버에 직접 설정하세요
- API 키와 비밀번호는 안전하게 보관하세요

### PM2로 서비스 시작
```bash
# 전체 서비스 시작 (프론트엔드 + 백엔드)
pm2 start ecosystem.config.cjs

# 상태 확인
pm2 list

# 로그 확인 (non-blocking)
pm2 logs --nostream

# 재시작
pm2 restart all

# 중지
pm2 delete all
```

### 포트 설정
- **프론트엔드**: 3000 (Node.js 프록시 서버)
- **백엔드 API**: 8000 (FastAPI)

## 📁 프로젝트 구조
```
webapp/
├── backend/
│   ├── main.py                    # FastAPI 통합 API
│   ├── thumbnails/                # 썸네일 캐시 디렉토리
│   ├── .env                       # 환경 변수 (Git 제외)
│   └── .env.example               # 환경 변수 예시 템플릿
├── frontend/
│   ├── index.html                 # HTML (7개 탭)
│   ├── app.js                     # Vanilla JS (메인 로직)
│   ├── proxy-server.cjs           # Node.js 프록시 서버
│   ├── woosong-logo.png           # 우송대학교 로고 (v3.2 추가)
│   └── pwa-styles.css             # PWA 스타일
├── ecosystem.config.cjs            # PM2 설정
├── student_template.xlsx           # Excel 템플릿
├── .gitignore                      # Git 제외 파일 (.env 포함)
└── README.md                       # 이 파일
```

## 🛠 기술 스택
- **프론트엔드**: Vanilla JavaScript, TailwindCSS, Axios, FontAwesome
- **백엔드**: FastAPI, Python 3.x, PyMySQL, Pandas, Pillow
- **데이터베이스**: MySQL 8.x (외부 서버)
- **AI**: OpenAI GPT-4o-mini
- **파일 저장**: FTP 서버 (bitnmeta2.synology.me)
- **프로세스 관리**: PM2
- **기타**: openpyxl (Excel), python-dotenv

## 📊 데이터 현황

| 모듈 | 등록 데이터 수 | CRUD 상태 |
|------|---------------|-----------|
| 강사 | 33명 | ✅ 완전 구현 |
| 학생 | 24명 | ✅ 완전 구현 |
| 상담 | 16건 | ✅ 완전 구현 |
| 훈련일지 | - | ✅ 완전 구현 |
| 팀프로젝트 | - | ✅ 완전 구현 |
| AI생기부 | - | ✅ 완전 구현 |

## 🔒 보안 고려사항
1. **.env 파일**: OpenAI API 키는 절대 공개 저장소에 커밋 금지
2. **데이터베이스**: 외부 접근 시 VPN 사용 권장
3. **비밀번호**: bcrypt 해싱 (향후 구현 예정)
4. **FTP 인증**: 안전한 자격증명 관리

## 🎓 미구현 기능 (향후 개발)
- [ ] 출석 관리 시스템
- [ ] 성적 관리 시스템
- [ ] 이메일/SMS 알림
- [ ] 대시보드 통계 차트
- [ ] 보고서 PDF 생성
- [ ] 모바일 앱 (React Native)

## 📝 버전 히스토리

### v3.2 (2025-11-17) - UI/UX 대폭 개선 🎨
- ✅ 우송대학교 공식 로고 적용
- ✅ 강사관리 필터 및 정렬 개선
- ✅ 학생관리 필터 강화 (5가지 정렬 옵션)
- ✅ 학생 선택 드롭다운 정보 강화
- ✅ 사진 아이콘 위치 통일 (모든 테이블)
- ✅ 알림 메시지 자동 숨김 (3초)
- ✅ 검색 필드 자동완성 차단
- ✅ 초기 로딩 정렬 순서 수정

### v3.1 (2025-11-16) - 사진 첨부 기능 완전 구현
- ✅ FTP 서버 통합 (4개 영역)
- ✅ 썸네일 시스템 (200x200px)
- ✅ 다중 업로드 방식 지원
- ✅ 실시간 업로드 진도 표시
- ✅ 그리드 카메라 아이콘

### v3.0 (2025-11-15) - 로그인 시스템 구현
- ✅ 강사 인증 기능
- ✅ 비밀번호 관리 (주강사 전용)
- ✅ 권한 구분 (주강사/보조강사)

## 📞 지원 및 문의
- **API 문서**: `/docs` 엔드포인트에서 Swagger UI 확인
- **GitHub**: https://github.com/Emmett6401/BH2025_WOWU
- **개발자**: GenSpark AI Assistant

---

**마지막 업데이트**: 2025-11-17  
**버전**: 3.2 🎉  
**상태**: ✅ **6개 핵심 모듈 완전 구현** + 📸 **사진 첨부 시스템** + 🔐 **로그인 시스템** + 🎨 **UI/UX 대폭 개선**

# KDT교육관리시스템 v3.2

## 프로젝트 개요
- **이름**: KDT교육관리시스템 v3.2 - 우송대학교 바이오헬스아카데미
- **목표**: 보건복지부(한국보건산업진흥원), KDT, 우송대학교산학협력단 바이오헬스아카데미 올인원테크 이노베이터 교육과정 통합 관리
- **주요 기능**: 강사/학생/상담/훈련일지/팀프로젝트 관리 + AI 생활기록부 자동 생성

## 🌐 배포 환경

### 🏢 프로덕션 서버 (Cafe24)
- **위치**: `/root/BH2025_WOWU/`
- **프론트엔드**: Port 3000 (bhhs-frontend)
- **백엔드 API**: Port 8000 (bhhs-backend)
- **PM2 관리**: `pm2 list`로 상태 확인

### 🧪 개발 서버 (Sandbox)
- **위치**: `/home/user/webapp/`
- **용도**: 개발 및 테스트 전용
- **프론트엔드**: https://3000-i3oloko346uog7d7oo8v5-3844e1b6.sandbox.novita.ai
- **백엔드 API**: https://8000-i3oloko346uog7d7oo8v5-3844e1b6.sandbox.novita.ai

### 📂 GitHub 저장소
- **Repository**: https://github.com/Emmett6401/BH2025_WOWU
- **Branch**: main (프로덕션), temp (개발)

---

## ⚙️ 환경 변수 설정 (.env)

### 🚨 **중요: 환경별 .env 파일 차이**

#### **Cafe24 프로덕션 서버** (`/root/BH2025_WOWU/backend/.env`)
```bash
# 데이터베이스 설정 (실제 운영 DB)
DB_HOST=bitnmeta2.synology.me
DB_PORT=3307
DB_USER=iyrc
DB_PASSWORD=Dodan1004!
DB_NAME=bh2025

# FTP 서버 설정
FTP_HOST=bitnmeta2.synology.me
FTP_PORT=2121
FTP_USER=ha
FTP_PASSWORD=dodan1004~

# OpenAI API 설정
OPENAI_API_KEY=your_openai_api_key_here
```

#### **샌드박스 개발 서버** (`/home/user/webapp/backend/.env`)
```bash
# 데이터베이스 설정 (동일한 DB 사용, 테스트 전용)
DB_HOST=bitnmeta2.synology.me
DB_PORT=3307
DB_USER=iyrc
DB_PASSWORD=Dodan1004!
DB_NAME=bh2025

# FTP 서버 설정 (동일)
FTP_HOST=bitnmeta2.synology.me
FTP_PORT=2121
FTP_USER=ha
FTP_PASSWORD=dodan1004~

# OpenAI API 설정
OPENAI_API_KEY=your_openai_api_key_here
```

### ⚠️ **.env 파일 관리 규칙**

1. **절대 Git에 커밋하지 마세요**
   - `.gitignore`에 `.env` 포함되어 있음
   - 민감한 정보(비밀번호, API 키) 보호

2. **환경별 독립 관리**
   - Cafe24 `.env`: 실제 운영 환경 설정 (절대 건드리지 않음)
   - 샌드박스 `.env`: 개발/테스트 전용 설정

3. **변경 시 재시작 필수**
   ```bash
   # .env 파일 수정 후 반드시 재시작
   pm2 restart all --update-env
   ```

4. **백업 권장**
   ```bash
   # Cafe24 서버에서 .env 백업
   cp /root/BH2025_WOWU/backend/.env /root/BH2025_WOWU/backend/.env.backup
   ```

---

## 🔄 Git 작업 흐름

### 1️⃣ **샌드박스에서 개발**
```bash
# 샌드박스 환경에서 코드 수정 및 테스트
cd /home/user/webapp

# 변경 사항 커밋
git add .
git commit -m "feat: 새로운 기능 추가"

# GitHub에 푸시
git push origin main
```

### 2️⃣ **Cafe24에 배포**
```bash
# Cafe24 서버에 SSH 접속
ssh iyrc@bitnmeta2.synology.me

# 프로젝트 디렉토리 이동
cd /root/BH2025_WOWU/

# 최신 코드 받기
git pull origin main

# 서비스 재시작 (.env 변경 없으면 --update-env 생략 가능)
pm2 restart all

# 또는 .env 변경 시
pm2 restart all --update-env
```

### 3️⃣ **Cafe24에서 수정한 경우**
```bash
# Cafe24 서버에서 수정 후
cd /root/BH2025_WOWU/

# 변경 사항 확인
git status

# 커밋
git add .
git commit -m "fix: 버그 수정"

# GitHub에 푸시
git push origin main

# 샌드박스에서 동기화 (필요 시)
# (샌드박스에서 실행)
cd /home/user/webapp
git pull origin main
```

---

## 🚀 배포 및 실행

### PM2로 서비스 관리

#### **서비스 시작**
```bash
cd /root/BH2025_WOWU/
pm2 start ecosystem.config.cjs
```

#### **서비스 상태 확인**
```bash
pm2 list
pm2 status
```

#### **서비스 재시작**
```bash
# 전체 재시작
pm2 restart all

# 특정 서비스만 재시작
pm2 restart bhhs-frontend
pm2 restart bhhs-backend

# 환경 변수 업데이트하며 재시작
pm2 restart all --update-env
```

#### **로그 확인**
```bash
# 실시간 로그 (non-blocking)
pm2 logs --nostream

# 특정 서비스 로그
pm2 logs bhhs-backend --lines 50
pm2 logs bhhs-frontend --lines 50

# 에러 로그만 확인
pm2 logs --err
```

#### **서비스 중지**
```bash
pm2 stop all
pm2 delete all
```

### 포트 관리
```bash
# 포트 사용 확인
lsof -i :3000
lsof -i :8000

# 포트 강제 종료
fuser -k 3000/tcp
fuser -k 8000/tcp
```

---

## 📊 데이터베이스

### 연결 정보
```
호스트: bitnmeta2.synology.me:3307
데이터베이스: bh2025
사용자: iyrc
비밀번호: Dodan1004!
인코딩: UTF-8 (한글 지원)
```

### 접속 방법
```bash
# MySQL CLI 접속
mysql -h bitnmeta2.synology.me -P 3307 -u iyrc -pDodan1004! bh2025

# 테이블 확인
SHOW TABLES;

# 강사 목록 확인
SELECT code, name, instructor_type FROM instructors LIMIT 5;
```

### 주요 테이블
- `instructor_codes` - 강사코드 마스터 (menu_permissions 배열 포함)
- `instructors` - 강사 정보 (instructor_type_name JOIN)
- `students` - 학생 정보
- `consultations` - 상담 기록
- `training_logs` - 훈련일지
- `team_projects` - 팀 프로젝트
- `team_activity_logs` - 팀 활동일지
- `class_notes` - SSIRN메모장 (학생용/강사용)
- `notices` - 공지사항

---

## 🎯 주요 기능

### ✅ 완료된 기능

#### 1. 🔐 로그인 시스템
- 강사 인증 기능
- 주강사 / 보조강사 권한 구분
- 비밀번호 변경 및 초기화 (주강사 전용)

#### 2. 👨‍🏫 강사 관리
- CRUD 기능 완전 구현
- 강사 유형별 필터링 (instructor_type_name)
- 이름순/코드순 정렬
- 사진 업로드 (FTP)

#### 3. 👨‍🎓 학생 관리
- CRUD 기능 완전 구현
- Excel 일괄 업로드
- 5가지 정렬 옵션
- 사진 업로드 (FTP)

#### 4. 💬 상담 관리
- CRUD 기능 완전 구현
- 강사 필터: **"이름-역할"** 형식 (instructor_type_name)
- 상담 유형별 분류
- 사진 업로드 (FTP)

#### 5. 📝 훈련일지 관리
- CRUD 기능 완전 구현
- 강사 필터: **"이름-역할"** 형식 (instructor_type_name)
- 과정별/월별 조회
- 사진 업로드 (FTP)

#### 6. 👥 팀 활동일지
- CRUD 기능 완전 구현
- 작성자 필터: **"이름-역할"** 형식 (instructor_type_name)
- 팀별 필터링
- 필터 상태 유지 (저장 후에도 유지)
- 사진 업로드 (FTP)

#### 7. 🤖 AI 생활기록부
- OpenAI GPT-4o-mini 활용
- 상담 기록 기반 자동 생성

#### 8. 📝 SSIRN메모장
- **학생용**: 본인의 수업 메모 관리 (student.html)
  - 마크다운 지원, 사진 첨부
  - 상담 신청 기능 통합
  - 그리드 뷰 카드 레이아웃
- **강사용**: 본인의 업무 메모 관리 (내 정보 탭)
  - 마크다운 지원, 사진 첨부
  - 검색 및 날짜 필터링
  - 그리드 뷰 카드 레이아웃

#### 9. 📢 공지사항 시스템
- CRUD 기능 완전 구현
- 마크다운 렌더링 (marked.js + DOMPurify)
- 게시 기간 설정 및 자동 노출 제어
- 활성 공지사항 필터링

### 🎨 최신 개선사항 (v3.3)

#### 📝 강사 마이페이지 (내 정보)
- ✅ 강사 본인의 SSIRN메모장 관리 시스템 추가
- ✅ SSIRN메모장을 기본 탭으로 설정
- ✅ 그리드 뷰로 메모 카드 표시
- ✅ 마크다운 문법 지원 (실시간 미리보기)
- ✅ 사진 첨부 기능 (다중 업로드)
- ✅ 검색 및 날짜 필터링
- ✅ 메모 CRUD 기능 (생성/조회/수정/삭제)

#### 🎨 UI/UX 개선 (v3.2)
- ✅ 대시보드 차트 높이 축소 (180px → 120px)
- ✅ 메뉴명 변경: "시간표" → "강의", "강사" → "시스템관리", "강사코드" → "강사코드/권한"
- ✅ 모든 강사 드롭다운을 실제 역할로 표시
  - `role` (존재하지 않음) → `instructor_type_name` (실제 컬럼)
  - 형식: **"이름-역할"** (예: "홍길동-책임강사")
- ✅ 예쁜 모달 알림 시스템 구현
- ✅ 모달 폼 열릴 때 필터 자동 비활성화

#### 🐛 버그 수정
- ✅ 팀활동일지 작성자 자동 선택 (접속자)
- ✅ 팀활동일지 저장 후 필터 유지
- ✅ 훈련일지 관리 초기 로드 시 자동 조회
- ✅ 팀활동일지 currentUser 에러 수정
- ✅ 상담관리 필터 강사 드롭다운 문법 오류 수정
- ✅ 메뉴 권한 시스템 수정 (menu_permissions 배열 방식)
- ✅ 파일 업로드 413 에러 해결 (uvicorn 제한 증가)

#### 🖼️ 이미지 처리 개선
- ✅ 20MB 이상 이미지 자동 압축 (83%+ 용량 감소)
- ✅ 크기별 차등 압축 (20MB+: 1280px/60%, 10-20MB: 1600px/70%)
- ✅ Canvas API 활용 클라이언트 사이드 압축

#### 📢 공지사항 시스템
- ✅ 공지사항 CRUD 완전 구현
- ✅ 마크다운 문법 지원 (실시간 미리보기)
- ✅ 게시 기간 설정 (시작일/종료일)
- ✅ 게시 상태 표시 (게시중/게시 예정/종료)
- ✅ 활성 공지사항 필터링

---

## 🛠 기술 스택
- **프론트엔드**: Vanilla JavaScript, TailwindCSS, Axios, FontAwesome
- **백엔드**: FastAPI, Python 3.x, PyMySQL, Pandas, Pillow
- **데이터베이스**: MySQL 8.x (외부 서버)
- **AI**: OpenAI GPT-4o-mini
- **파일 저장**: FTP 서버
- **프로세스 관리**: PM2
- **버전 관리**: Git, GitHub

---

## 📁 프로젝트 구조
```
BH2025_WOWU/
├── backend/
│   ├── main.py                    # FastAPI 통합 API
│   ├── .env                       # 환경 변수 (Git 제외)
│   ├── .env.backup                # 환경 변수 백업
│   └── thumbnails/                # 썸네일 캐시
├── frontend/
│   ├── index.html                 # HTML
│   ├── login.html                 # 로그인 페이지
│   ├── app.js                     # 메인 로직 (5000+ lines)
│   ├── proxy-server.cjs           # Node.js 프록시
│   ├── woosong-logo.png           # 우송대학교 로고
│   └── pwa-styles.css             # PWA 스타일
├── ecosystem.config.cjs           # PM2 설정
├── .gitignore                     # Git 제외 파일 (.env 포함)
└── README.md                      # 이 파일
```

---

## 🔒 보안 고려사항

1. **.env 파일 관리**
   - 절대 Git에 커밋 금지
   - 환경별 독립 관리
   - 정기적으로 백업

2. **데이터베이스 접근**
   - VPN 사용 권장
   - 외부 접근 제한

3. **API 키 보호**
   - OpenAI API 키 노출 금지
   - 환경 변수로만 관리

4. **FTP 자격증명**
   - 안전한 비밀번호 사용
   - 주기적 변경 권장

---

## 📝 버전 히스토리

### v3.3 (2025-11-24) - 강사 마이페이지 추가 🎉
- ✅ 강사 본인의 SSIRN메모장 시스템 구현
- ✅ 내 정보 메뉴 추가 (SSIRN메모장 기본 탭)
- ✅ 강사/학생 메모 분리 (instructor_id/student_id)
- ✅ 그리드 뷰 카드 레이아웃
- ✅ 마크다운 실시간 미리보기
- ✅ 사진 다중 첨부 기능
- ✅ 백엔드 API 개선 (GET /api/class-notes, PUT /api/class-notes/{id})

### v3.2 (2025-11-19) - 강사 역할 표시 개선 ✨
- ✅ 모든 강사 드롭다운을 instructor_type_name으로 변경
- ✅ 상담관리 필터: 강사 이름-역할 표시
- ✅ 훈련일지 관리 필터: 강사 이름-역할 표시
- ✅ 팀 활동일지 작성자: 강사 이름-역할 표시
- ✅ 대시보드 차트 높이 축소
- ✅ 메뉴명 변경 (시간표 → 강의)
- ✅ 팀활동일지 필터 유지 기능
- ✅ 공지사항 시스템 추가
- ✅ 예쁜 모달 알림 시스템
- ✅ 이미지 자동 압축 기능
- ✅ 메뉴 권한 시스템 수정

### v3.1 (2025-11-16) - 사진 첨부 기능
- ✅ FTP 서버 통합
- ✅ 썸네일 시스템
- ✅ 다중 업로드 지원

### v3.0 (2025-11-15) - 로그인 시스템
- ✅ 강사 인증 기능
- ✅ 비밀번호 관리
- ✅ 권한 구분

---

## 📞 지원 및 문의
- **GitHub**: https://github.com/Emmett6401/BH2025_WOWU
- **API 문서**: `http://server:8000/docs` (Swagger UI)

---

**마지막 업데이트**: 2025-11-24  
**버전**: 3.3 🎉  
**상태**: ✅ **프로덕션 배포 완료** + 🔐 **환경 변수 관리** + 🎨 **UI/UX 개선** + 📝 **강사 마이페이지 추가**

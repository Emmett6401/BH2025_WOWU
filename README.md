# 학급 관리 시스템 v2.0

## 프로젝트 개요
- **이름**: 학급 관리 시스템 v2.0 (MySQL + FastAPI + AI)
- **목표**: 교육 기관의 학생, 과목, 상담 정보를 체계적으로 관리하고 AI를 활용한 생활기록부 자동 생성
- **주요 기능**:
  - ✅ MySQL 데이터베이스 연동 (외부 DB)
  - ✅ Excel 파일 일괄 업로드로 학생 대량 등록
  - ✅ 과목 관리 (교수, 강의요일, 매주/격주, 강의시수)
  - ✅ 상담 관리 (학생별/월별/학급별 조회 및 필터)
  - ✅ AI 생활기록부 자동 생성 (OpenAI GPT-4 활용)

## URL
- **프론트엔드**: https://3000-i3oloko346uog7d7oo8v5-3844e1b6.sandbox.novita.ai
- **백엔드 API**: https://8000-i3oloko346uog7d7oo8v5-3844e1b6.sandbox.novita.ai
- **API 문서**: https://8000-i3oloko346uog7d7oo8v5-3844e1b6.sandbox.novita.ai/docs

## 데이터 아키텍처

### 외부 MySQL 데이터베이스
```
호스트: bitnmeta2.synology.me:3307
데이터베이스: bh2025
사용자: iyrc
```

### 데이터 모델

#### 1. **학생(students)**
```sql
- id: 고유 ID
- code: 학생 코드 (S001, S002...)
- name: 이름
- birth_date: 생년월일
- gender: 성별
- phone: 연락처
- email: 이메일
- address: 주소
- interests: 관심 분야
- education: 학력
- introduction: 자기소개
- campus: 캠퍼스
- course_code: 과정 코드
- notes: 비고
```

#### 2. **과목(subjects)**
```sql
- id: 고유 ID
- code: 과목 코드
- name: 과목명
- instructor_id: 강사 ID
- lecture_days: 강의요일 (월,수,금)
- frequency: 빈도 (매주/격주)
- lecture_hours: 강의시수
- description: 설명
```

#### 3. **강사(instructors)**
```sql
- id: 고유 ID
- name: 강사명
- phone: 연락처
- email: 이메일
```

#### 4. **상담(consultations)**
```sql
- id: 고유 ID
- student_id: 학생 ID
- counseling_date: 상담 날짜
- counseling_type: 상담 유형 (학업/생활/진로/기타)
- topic: 주제
- content: 상담 내용
- follow_up: 후속 조치
- is_completed: 완료 여부
```

### 데이터 플로우
```
프론트엔드 (HTML + TailwindCSS + Vanilla JS)
    ↓ (REST API 호출)
백엔드 API (FastAPI + Python)
    ↓ (SQL 쿼리 with PyMySQL)
MySQL 데이터베이스 (외부 서버: bitnmeta2.synology.me)
    ↓ (AI 생성 시)
OpenAI GPT-4 API
```

## 기능 가이드

### 1. 학생 관리
- **학생 추가**: 개별 학생 정보 입력
- **Excel 일괄 등록**:
  1. "Excel 템플릿" 버튼으로 양식 다운로드
  2. Excel 파일에 학생 정보 입력 (첨부한 양식과 동일)
  3. "Excel 업로드" 버튼으로 파일 업로드
  4. 자동으로 학생 코드(S001, S002...) 생성 및 일괄 등록
- **학생 조회**: 전체 학생 목록 테이블 형식으로 표시
- **학생 수정/삭제**: 각 학생별 작업 버튼 사용

### 2. 과목 관리
- **과목 추가**:
  - 과목명, 담당 강사 선택
  - 강의요일: 월/화/수/목/금 중 복수 선택 가능
  - 빈도: 매주 또는 격주 선택
  - 강의시수: 숫자로 입력
- **과목 조회**: 카드 형식으로 과목 정보 표시
- **과목 수정/삭제**: 각 과목 카드의 작업 버튼 사용

### 3. 상담 관리
- **상담 추가**:
  - 학생 선택 (드롭다운)
  - 상담 날짜, 상담 유형(학업/생활/진로/기타)
  - 주제, 상담 내용, 후속 조치 입력
  - 완료 여부 체크
- **상담 조회 및 필터링**:
  - 월별 필터: 특정 월의 상담만 조회
  - 학생별 필터: 특정 학생의 상담만 조회
  - 학급별 필터: API 레벨에서 course_code로 필터 가능
- **상담 현황**:
  - 완료된 상담은 초록색 배경으로 표시
  - 상담 유형별 색상 구분

### 4. AI 생활기록부 작성
- **사용 방법**:
  1. 학생 선택
  2. 맞춤형 지시사항 입력 (선택)
     - 예: "긍정적이고 따뜻한 톤으로 작성", "학생의 성장 가능성 강조"
  3. "AI 생기부 작성" 버튼 클릭
- **AI 처리 과정**:
  1. 선택한 학생의 모든 상담 기록 수집
  2. 학생 정보(이름, 관심분야, 학력 등)와 함께 OpenAI GPT-4에 전송
  3. AI가 상담 내용을 분석하고 통합하여 생활기록부 작성
  4. 학생의 특성, 성장 과정, 발달사항을 체계적으로 기술
- **결과 활용**:
  - 생성된 생활기록부를 화면에 표시
  - "복사하기" 버튼으로 클립보드에 복사
  - 필요시 수정하여 사용

## API 엔드포인트

### 학생 API
- `GET /api/students` - 학생 목록 조회 (course_code, search 필터 지원)
- `GET /api/students/{id}` - 특정 학생 조회
- `POST /api/students` - 학생 생성 (자동 코드 생성)
- `PUT /api/students/{id}` - 학생 수정
- `DELETE /api/students/{id}` - 학생 삭제
- `POST /api/students/upload-excel` - Excel 일괄 업로드
- `GET /api/students/download-template` - Excel 템플릿 다운로드

### 과목 API
- `GET /api/subjects` - 과목 목록 조회
- `GET /api/subjects/{id}` - 특정 과목 조회
- `POST /api/subjects` - 과목 생성
- `PUT /api/subjects/{id}` - 과목 수정
- `DELETE /api/subjects/{id}` - 과목 삭제

### 강사 API
- `GET /api/instructors` - 강사 목록 조회

### 상담 API
- `GET /api/counselings` - 상담 목록 조회 (student_id, month, course_code 필터 지원)
- `GET /api/counselings/{id}` - 특정 상담 조회
- `POST /api/counselings` - 상담 생성
- `PUT /api/counselings/{id}` - 상담 수정
- `DELETE /api/counselings/{id}` - 상담 삭제

### AI API
- `POST /api/ai/generate-report` - AI 생활기록부 생성
  ```json
  {
    "student_id": 1,
    "custom_instructions": "긍정적인 톤으로 작성"
  }
  ```

## 완료된 기능
- ✅ MySQL 외부 데이터베이스 연동
- ✅ 기존 students 테이블 활용
- ✅ Excel 파일 업로드 및 학생 일괄 등록
- ✅ 과목 관리 시스템 (교수, 강의요일, 매주/격주, 강의시수)
- ✅ 상담 관리 시스템 (학생별/월별/학급별 조회)
- ✅ AI 생활기록부 자동 생성 (OpenAI GPT-4)
- ✅ 반응형 웹 UI (TailwindCSS)
- ✅ FastAPI 백엔드 + Python http.server 프론트엔드

## 미구현 기능
- 사용자 인증 및 권한 관리
- 출석 관리 기능
- 성적 관리 기능
- 파일 첨부 기능 (R2 또는 로컬 스토리지)
- 이메일 알림 기능
- 학부모 포털
- 모바일 앱

## 권장 다음 단계
1. **OpenAI API 키 설정**: `.env` 파일에 `OPENAI_API_KEY` 설정하여 AI 생기부 기능 활성화
2. **사용자 인증**: JWT 기반 로그인 시스템 추가
3. **출석 관리**: 일별 출석 체크 및 통계 기능
4. **성적 관리**: 시험, 과제 점수 입력 및 분석
5. **보고서 내보내기**: PDF, Excel 형식으로 보고서 생성
6. **프로덕션 배포**: AWS, Azure, 또는 전용 서버에 배포

## 배포 상태
- **플랫폼**: FastAPI (Python) + HTTP Server
- **상태**: 🟢 개발 완료 및 운영 중
- **기술 스택**:
  - 프론트엔드: Vanilla JavaScript + TailwindCSS + Axios
  - 백엔드: FastAPI + Python 3.x + PyMySQL
  - 데이터베이스: MySQL 8.x (외부 서버)
  - AI: OpenAI GPT-4o-mini
  - 배포: PM2 프로세스 관리
- **마지막 업데이트**: 2025-11-10

## 개발 명령어

### 환경 설정
```bash
# Python 라이브러리 설치
pip install fastapi uvicorn pymysql pandas openpyxl python-multipart openai python-dotenv

# .env 파일에 OpenAI API 키 설정
echo "OPENAI_API_KEY=your_api_key_here" > .env
```

### 개발 서버
```bash
# PM2로 전체 서비스 시작 (백엔드 + 프론트엔드)
pm2 start ecosystem_all.config.cjs

# 백엔드만 시작
pm2 start ecosystem_fastapi.config.cjs

# 프론트엔드만 시작 (포트 3000)
python3 -m http.server 3000 --directory frontend

# PM2 상태 확인
pm2 list

# 로그 확인
pm2 logs fastapi-backend --nostream
pm2 logs frontend-server --nostream

# 서비스 재시작
pm2 restart all

# 서비스 중지
pm2 delete all
```

### 데이터베이스
```bash
# 스키마 업데이트 (컬럼 추가)
python update_schema.py

# Excel 파일 분석
python analyze_excel.py

# 데이터베이스 연결 테스트
python check_db.py
```

### API 테스트
```bash
# 헬스 체크
curl http://localhost:8000/health

# 학생 목록 조회
curl http://localhost:8000/api/students

# 과목 목록 조회
curl http://localhost:8000/api/subjects

# API 문서 (브라우저에서 열기)
http://localhost:8000/docs
```

## Excel 업로드 양식

Excel 파일은 다음 컬럼을 포함해야 합니다:
1. 타임스탬프 (선택)
2. 이름 (필수)
3. 생년월일(78.01.12) - 형식: YY.MM.DD
4. 성별(선택) - 남자/여자
5. 휴대폰번호
6. 이메일
7. 주소
8. 관심 있는 분야(2개)
9. 최종 학교/학년(졸업)
10. 자기소개 (200자 내외)
11. 지원하고자 하는 캠퍼스를 선택하세요

템플릿 파일은 시스템에서 다운로드 가능합니다.

## 프로젝트 구조
```
webapp/
├── backend/
│   └── main.py                # FastAPI 백엔드 API
├── frontend/
│   └── index.html             # 프론트엔드 UI (SPA)
├── .env                        # 환경 변수 (OpenAI API 키)
├── ecosystem_all.config.cjs    # PM2 전체 서비스 설정
├── ecosystem_fastapi.config.cjs # PM2 백엔드 설정
├── student_template.xlsx       # Excel 템플릿
├── analyze_excel.py            # Excel 분석 도구
├── check_db.py                 # DB 연결 테스트
├── update_schema.py            # DB 스키마 업데이트
└── README.md                   # 이 파일
```

## 보안 고려사항
1. **.env 파일 보호**: OpenAI API 키는 절대 공개 저장소에 커밋하지 마세요
2. **데이터베이스 접근**: 프로덕션 환경에서는 방화벽 및 VPN 사용 권장
3. **SQL 인젝션 방지**: 모든 쿼리는 파라미터화된 쿼리 사용
4. **CORS 설정**: 프로덕션 환경에서는 특정 도메인만 허용하도록 변경 필요

## 라이선스
MIT License

## 개발자
GenSpark AI Assistant

## 지원 및 문의
- API 문서: `/docs` 엔드포인트에서 자동 생성된 Swagger UI 확인
- 데이터베이스 이슈: `update_schema.py` 실행하여 스키마 동기화
- AI 기능 이슈: OpenAI API 키가 `.env`에 올바르게 설정되었는지 확인

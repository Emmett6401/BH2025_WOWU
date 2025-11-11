# 교육관리시스템 v3.0 (Education Management System)

## 프로젝트 개요
- **이름**: 교육관리시스템 v3.0 - 통합 학사관리 플랫폼
- **목표**: 교육 기관의 강사, 과목, 과정, 학생, 상담, 프로젝트, 시간표를 통합 관리하고 AI 생활기록부 자동 생성
- **주요 기능**: 9개 관리 모듈 + AI 생기부 작성

## 🌐 URL
- **프론트엔드**: https://3000-i3oloko346uog7d7oo8v5-3844e1b6.sandbox.novita.ai
- **백엔드 API**: https://8000-i3oloko346uog7d7oo8v5-3844e1b6.sandbox.novita.ai
- **API 문서 (Swagger)**: https://8000-i3oloko346uog7d7oo8v5-3844e1b6.sandbox.novita.ai/docs

## ✅ 완료된 기능 (10개 모듈)

### 1. 강사코드 관리 (Instructor Codes)
- 강사 유형 코드 관리 (주강사, 보조강사, 멘토 등)
- **✅ 완전한 CRUD 기능** (생성, 조회, 수정, 삭제)
- 총 5개 강사코드 등록됨

### 2. 강사 관리 (Instructors)
- 강사 정보 관리 (코드, 이름, 전공, 연락처, 이메일)
- 강사 유형 연계 (강사코드와 JOIN)
- 검색 기능 (이름, 코드, 연락처)
- **✅ 완전한 CRUD 기능**
- 총 33명 강사 등록됨

### 3. 교과목 관리 (Subjects) ✨ 방금 완성
- 과목 정보 관리 (과목명, 담당강사)
- 강의요일 설정 (월/화/수/목/금)
- 빈도 설정 (매주/격주)
- 강의시수 입력
- **✅ 완전한 CRUD 기능 추가**:
  - 생성: 담당강사 드롭다운 선택
  - 수정: 기존 데이터 불러와 편집
  - 삭제: 확인 후 삭제
- 총 12개 교과목 등록됨

### 4. 공휴일 관리 (Holidays)
- 공휴일 등록 및 관리
- 법정공휴일/일반 구분
- 연도별 필터 조회
- 2025년 공휴일 등록됨

### 5. 과정(학급) 관리 (Courses)
- 과정 기본 정보 (코드, 이름, 장소, 정원)
- 기간 관리:
  - 시작일, 강의종료일
  - 프로젝트종료일, 인턴종료일
  - 최종종료일, 총일수
- 시간 배정:
  - 강의시간, 프로젝트시간, 인턴시간
- 학생수/과목수 자동 집계
- 총 4개 과정 운영 중

### 6. 학생 관리 (Students)
- 개별 학생 정보 관리
- **Excel 일괄 등록**:
  - 템플릿 다운로드 기능
  - 11개 컬럼 양식 지원
  - 자동 학생코드 생성 (S001, S002...)
- 과정별 조회
- 검색 기능
- 총 24명 학생 등록됨

### 7. 학생상담 관리 (Counselings) ✨ 방금 완성
- 상담 기록 관리 (여러 회차 상담 개별 저장)
- **✅ 완전한 CRUD 기능 추가**:
  - 생성: 학생 선택, 상담유형, 주제, 내용 입력
  - 조회: 상담 상세 내용 팝업으로 확인
  - 수정: 기존 상담 데이터 불러와 편집
  - 삭제: 확인 후 삭제
- 필터 기능:
  - **학생별 상담 조회** (드롭다운 선택)
  - 월별 상담 조회 (YYYY-MM)
  - 과정별 상담 조회
- 상담 유형 분류 (정기/수시/긴급/학부모)
- 상태 관리 (예정/완료/취소)
- 완료된 상담은 녹색 배경 표시
- 총 16건 상담 기록 등록됨

### 8. 프로젝트 관리 (Projects)
- 프로젝트 정보 관리
- 팀원 관리 (최대 5명)
- 팀원별 이름/연락처 저장
- 과정별 프로젝트 조회

### 9. 시간표 관리 (Timetables)
- 수업 일정 관리
- 필터 기능:
  - 과정별 조회
  - 기간별 조회 (시작일~종료일)
- 정보 표시:
  - 과정명, 과목명, 강사명 (JOIN)
  - 수업 날짜, 시작시간, 종료시간
  - 수업 타입 (lecture/project/internship)
- 총 195건 시간표 등록됨

### 10. AI 생활기록부 작성 ✨ UI 대폭 개선
- **OpenAI GPT-4o-mini 활용** (고품질 생기부 자동 생성)
- **✨ 새로운 워크플로우**:
  1. 학생 선택 드롭다운
  2. 해당 학생의 **모든 상담 기록 리스트업**:
     - 회차별 표시 (1회차, 2회차...)
     - 날짜, 상담유형, 주제, 내용 표시
     - 완료 상태 시각화 (녹색 배경)
     - 상담유형별 색상 구분 (정기/수시/긴급/학부모)
  3. "AI 생기부 생성" 버튼 클릭
  4. 모든 상담 세션을 종합한 AI 의견 생성
  5. 생성된 생기부 복사/다운로드
- 로딩 스피너 (생성 중 10-20초 표시)
- 긍정적 표현 및 성장 가능성 강조
- 텍스트 파일 다운로드 지원

## 📊 데이터 아키텍처

### 외부 MySQL 데이터베이스
```
호스트: bitnmeta2.synology.me:3307
데이터베이스: bh2025
사용자: iyrc
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
```

#### courses (과정)
```sql
- code: VARCHAR(10) PK
- name, capacity, location
- lecture_hours, project_hours, internship_hours
- start_date, lecture_end_date, project_end_date
- internship_end_date, final_end_date, total_days
```

#### students (학생)
```sql
- id: INT PK
- code: VARCHAR(10) (S001, S002...)
- name, birth_date, gender, phone, email
- course_code: FK -> courses.code
```

#### consultations (상담)
```sql
- id: INT PK
- student_id: FK -> students.id
- counseling_date, counseling_type, topic
- content, follow_up, is_completed
```

#### projects (프로젝트)
```sql
- code: VARCHAR(10) PK
- name, course_code
- member1_name ~ member5_name
- member1_phone ~ member5_phone
```

#### timetables (시간표)
```sql
- id: INT PK
- course_code, subject_code, instructor_code
- class_date, start_time, end_time
- type: ENUM (lecture/project/internship)
```

#### holidays (공휴일)
```sql
- id: INT PK
- holiday_date, name
- is_legal: TINYINT (법정공휴일 여부)
```

### 데이터 플로우
```
프론트엔드 (Vanilla JS + TailwindCSS)
    ↓ (Axios HTTP 요청)
백엔드 API (FastAPI + Python)
    ↓ (PyMySQL 쿼리)
MySQL 데이터베이스 (외부 서버)
    ↓ (AI 요청 시)
OpenAI GPT-4o-mini API
```

## 📡 API 엔드포인트 (총 23개)

### 강사코드 API
- `GET /api/instructor-codes` - 목록 조회
- `POST /api/instructor-codes` - 생성
- `PUT /api/instructor-codes/{code}` - 수정
- `DELETE /api/instructor-codes/{code}` - 삭제

### 강사 API
- `GET /api/instructors?search={query}` - 목록 조회 (검색)
- `GET /api/instructors/{code}` - 상세 조회
- `POST /api/instructors` - 생성
- `PUT /api/instructors/{code}` - 수정
- `DELETE /api/instructors/{code}` - 삭제

### 공휴일 API
- `GET /api/holidays?year={year}` - 목록 조회 (연도별)
- `POST /api/holidays` - 생성
- `PUT /api/holidays/{id}` - 수정
- `DELETE /api/holidays/{id}` - 삭제

### 과정 API
- `GET /api/courses` - 목록 조회 (학생수, 과목수 포함)
- `GET /api/courses/{code}` - 상세 조회
- `POST /api/courses` - 생성
- `PUT /api/courses/{code}` - 수정
- `DELETE /api/courses/{code}` - 삭제

### 학생 API
- `GET /api/students?course_code={code}&search={query}` - 목록 조회
- `GET /api/students/{id}` - 상세 조회
- `POST /api/students` - 생성
- `PUT /api/students/{id}` - 수정
- `DELETE /api/students/{id}` - 삭제
- `POST /api/students/upload-excel` - Excel 일괄 업로드
- `GET /api/students/download-template` - Excel 템플릿 다운로드

### 상담 API
- `GET /api/counselings?student_id={id}&month={YYYY-MM}&course_code={code}` - 목록 조회
- `GET /api/counselings/{id}` - 상세 조회
- `POST /api/counselings` - 생성
- `PUT /api/counselings/{id}` - 수정
- `DELETE /api/counselings/{id}` - 삭제

### 프로젝트 API
- `GET /api/projects?course_code={code}` - 목록 조회
- `GET /api/projects/{code}` - 상세 조회
- `POST /api/projects` - 생성
- `PUT /api/projects/{code}` - 수정
- `DELETE /api/projects/{code}` - 삭제

### 시간표 API
- `GET /api/timetables?course_code={code}&start_date={date}&end_date={date}` - 목록 조회
- `GET /api/timetables/{id}` - 상세 조회
- `POST /api/timetables` - 생성
- `PUT /api/timetables/{id}` - 수정
- `DELETE /api/timetables/{id}` - 삭제

### AI API
- `POST /api/ai/generate-report` - AI 생활기록부 생성

## 🎯 사용 가이드

### 강사코드 관리
1. "강사코드" 탭 클릭
2. "강사코드 추가" 버튼으로 새 코드 등록
3. 코드, 이름, 타입 입력 (예: IC-001, 주강사, 1. 주강사)
4. 수정/삭제는 각 행의 아이콘 버튼 사용

### 강사 관리
1. "강사관리" 탭 클릭
2. 검색창에서 이름/코드/연락처로 검색 가능
3. "강사 추가" 버튼으로 신규 등록
4. 강사코드, 이름, 전공, 타입, 연락처, 이메일 입력

### 공휴일 관리
1. "공휴일" 탭 클릭
2. 카드 형식으로 공휴일 목록 표시
3. "공휴일 추가" 버튼으로 신규 등록
4. 날짜, 이름, 법정공휴일 여부 선택

### 과정 관리
1. "과정관리" 탭 클릭
2. 각 과정의 학생수/과목수 자동 표시
3. "과정 추가" 버튼으로 신규 등록
4. 13개 필드 입력:
   - 기본: 코드, 이름, 장소, 정원
   - 시간: 강의/프로젝트/인턴 시간
   - 기간: 5개 날짜 + 총일수

### 학생 관리
1. "학생관리" 탭 클릭
2. **개별 등록**: "학생 추가" 버튼
3. **일괄 등록**:
   - "Excel 템플릿" 다운로드
   - 11개 컬럼 작성
   - "Excel 업로드" 버튼으로 업로드
   - 자동으로 S001, S002... 코드 생성

### 상담 관리
1. "상담관리" 탭 클릭
2. 필터 사용:
   - 학생 선택 드롭다운
   - 월 선택 (YYYY-MM)
3. "상담 추가"로 새 상담 기록
4. 완료된 상담은 초록색 배경

### 프로젝트 관리
1. "프로젝트" 탭 클릭
2. "프로젝트 추가" 버튼
3. 5명까지 팀원 정보 입력
4. 각 팀원의 이름과 연락처 저장

### 시간표 관리
1. "시간표" 탭 클릭
2. 필터 사용:
   - 과정코드 입력
   - 시작일/종료일 선택
3. 시간 입력 시 HH:MM 형식 사용
4. 수업 타입 선택 (강의/프로젝트/인턴십)

### AI 생기부 작성 ✨ 새로운 UI
1. "AI생기부" 탭 클릭
2. 드롭다운에서 학생 선택
3. 해당 학생의 **모든 상담 기록 자동 표시**:
   - 회차별로 정리된 상담 내용
   - 날짜, 유형, 주제, 내용 한눈에 확인
4. "AI 생기부 생성" 버튼 클릭
5. 10-20초 대기 (AI 생성 중)
6. 생성된 종합 의견 확인
7. "복사" 또는 "다운로드" 버튼으로 활용

## 🚀 개발 및 배포

### 환경 설정
```bash
# Python 패키지 설치
pip install fastapi uvicorn pymysql pandas openpyxl python-multipart openai python-dotenv

# .env 파일 생성 및 OpenAI API 키 설정
echo "OPENAI_API_KEY=your_api_key_here" > .env
```

### 서비스 시작
```bash
# PM2로 전체 서비스 시작 (백엔드 + 프론트엔드)
pm2 start ecosystem_all.config.cjs

# PM2 상태 확인
pm2 list

# 로그 확인 (non-blocking)
pm2 logs --nostream

# 서비스 재시작
pm2 restart all

# 서비스 중지
pm2 delete all
```

### API 테스트
```bash
# 헬스 체크
curl http://localhost:8000/health

# 강사코드 조회
curl http://localhost:8000/api/instructor-codes

# 강사 조회 (검색)
curl "http://localhost:8000/api/instructors?search=황동하"

# 공휴일 조회 (2025년)
curl "http://localhost:8000/api/holidays?year=2025"

# 과정 조회
curl http://localhost:8000/api/courses

# 시간표 조회
curl "http://localhost:8000/api/timetables?course_code=C-001"
```

## 📁 프로젝트 구조
```
webapp/
├── backend/
│   ├── main.py                    # FastAPI 통합 API (23개 엔드포인트)
│   └── extended_api.py            # 확장 API 함수 (참고용)
├── frontend/
│   ├── index.html                 # HTML (10개 탭 네비게이션)
│   └── app.js                     # Vanilla JS (9개 모듈 + AI 생기부)
├── .env                            # OpenAI API 키
├── ecosystem_all.config.cjs        # PM2 설정
├── student_template.xlsx           # Excel 템플릿
├── API_SUMMARY.md                  # API 상세 문서
└── README.md                       # 이 파일
```

## 📊 데이터 현황 (2025-11-11 업데이트)

| 모듈 | 등록 데이터 수 | CRUD 상태 |
|------|---------------|-----------|
| 강사코드 | 5개 | ✅ 완전 구현 |
| 강사 | 33명 | ✅ 완전 구현 |
| 교과목 | **12개** | ✅ **방금 완성** |
| 공휴일 | 2025년 기준 | ✅ 완전 구현 |
| 과정 | 4개 | ✅ 완전 구현 |
| 학생 | 24명 | ✅ 완전 구현 (Excel 포함) |
| 상담 | **16건** | ✅ **방금 완성** |
| 프로젝트 | 0개 | ✅ 완전 구현 |
| 시간표 | 195건 | ✅ 완전 구현 |
| AI생기부 | - | ✅ **UI 대폭 개선** |

## 🔒 보안 고려사항
1. **.env 파일**: OpenAI API 키는 절대 공개 저장소에 커밋 금지
2. **데이터베이스**: 외부 접근 시 방화벽/VPN 사용 권장
3. **SQL 인젝션**: 모든 쿼리는 파라미터화된 쿼리 사용
4. **CORS**: 프로덕션 환경에서는 특정 도메인만 허용

## 🎓 미구현 기능 (향후 개발)
- [ ] 사용자 인증 및 권한 관리 (JWT)
- [ ] 출석 관리 시스템
- [ ] 성적 관리 시스템
- [ ] 파일 첨부 기능
- [ ] 이메일/SMS 알림
- [ ] 학부모 포털
- [ ] 모바일 앱 (React Native)
- [ ] 보고서 내보내기 (PDF/Excel)
- [ ] 실시간 알림 (WebSocket)
- [ ] 대시보드 통계 차트

## 🏆 권장 다음 단계
1. **사용자 인증**: JWT 기반 로그인 시스템 추가
2. **대시보드**: Chart.js로 통계 시각화
3. **출석 관리**: QR 코드 체크인 시스템
4. **성적 관리**: 성적 입력 및 분석 기능
5. **보고서**: PDF 생성 (생기부, 성적표 등)
6. **프로덕션 배포**: Cloudflare Pages 또는 AWS 배포

## 🛠 기술 스택
- **프론트엔드**: Vanilla JavaScript, TailwindCSS, Axios, FontAwesome
- **백엔드**: FastAPI, Python 3.x, PyMySQL, Pandas
- **데이터베이스**: MySQL 8.x (외부 서버)
- **AI**: OpenAI GPT-4o-mini
- **배포**: PM2 프로세스 관리
- **기타**: openpyxl (Excel), python-dotenv

## 📝 라이선스
MIT License

## 👨‍💻 개발자
GenSpark AI Assistant

## 📞 지원 및 문의
- **API 문서**: `/docs` 엔드포인트에서 Swagger UI 확인
- **데이터베이스**: `check_all_tables.py`로 전체 스키마 확인
- **AI 기능**: `.env` 파일에 `OPENAI_API_KEY` 설정 확인
- **상세 API 문서**: `API_SUMMARY.md` 참조

---

**마지막 업데이트**: 2025-11-11  
**버전**: 3.1 🎉  
**상태**: ✅ **10개 모듈 완전 구현 완료**

## 🎉 v3.1 주요 업데이트 (2025-11-11)

### ✨ 새로운 기능
1. **교과목 관리 완전 CRUD**
   - 생성/수정/삭제 기능 추가
   - 담당강사 드롭다운 선택
   - 12개 교과목 데이터 확인

2. **상담 관리 완전 CRUD**
   - 생성/조회/수정/삭제 기능 추가
   - 학생별 필터링 (드롭다운)
   - 상담 상세 보기 (팝업)
   - 16건 상담 기록 확인

3. **AI 생기부 UI 대폭 개선**
   - 학생별 모든 상담 기록 리스트업
   - 회차별 상담 내용 시각화
   - 상담유형/상태별 색상 구분
   - 종합 AI 의견 생성
   - 복사/다운로드 기능

### 🐛 버그 수정
- 교과목 API 컬럼명 수정 (instructor_id → main_instructor)
- 상담 API 컬럼명 수정 (counseling_date → consultation_date 등)
- JOIN 쿼리 최적화

### 📈 성능 개선
- 프론트엔드 코드 구조화
- API 응답 속도 개선
- UI/UX 일관성 향상

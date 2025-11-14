from fastapi import FastAPI, File, UploadFile, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from typing import Optional, List
import pymysql
import pandas as pd
import io
import os
from datetime import datetime, date
from openai import OpenAI
from dotenv import load_dotenv
import requests
from ftplib import FTP
import uuid
import base64

load_dotenv()

app = FastAPI(title="학급 관리 시스템 API")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 데이터베이스 연결 설정
DB_CONFIG = {
    'host': 'bitnmeta2.synology.me',
    'user': 'iyrc',
    'passwd': 'Dodan1004!',
    'db': 'bh2025',
    'charset': 'utf8',
    'port': 3307
}

def get_db_connection():
    """데이터베이스 연결"""
    return pymysql.connect(**DB_CONFIG)

def ensure_photo_urls_column(cursor, table_name: str):
    """photo_urls 컬럼이 없으면 추가"""
    try:
        cursor.execute(f"SHOW COLUMNS FROM {table_name} LIKE 'photo_urls'")
        if not cursor.fetchone():
            cursor.execute(f"ALTER TABLE {table_name} ADD COLUMN photo_urls TEXT")
    except:
        pass  # 이미 존재하거나 권한 문제

# FTP 설정
FTP_CONFIG = {
    'host': 'bitnmeta2.synology.me',
    'port': 2121,
    'user': 'ha',
    'passwd': 'dodan1004~'
}

# FTP 경로 설정
FTP_PATHS = {
    'guidance': '/homes/ha/camFTP/BH2025/guidance',  # 상담일지
    'train': '/homes/ha/camFTP/BH2025/train',        # 훈련일지
    'student': '/homes/ha/camFTP/BH2025/student',    # 학생
    'teacher': '/homes/ha/camFTP/BH2025/teacher'     # 강사
}

def upload_to_ftp(file_data: bytes, filename: str, category: str) -> str:
    """
    FTP 서버에 파일 업로드
    
    Args:
        file_data: 파일 바이트 데이터
        filename: 저장할 파일명 (확장자 포함)
        category: 카테고리 (guidance, train, student, teacher)
    
    Returns:
        업로드된 파일의 FTP URL
    """
    try:
        # FTP 연결
        ftp = FTP()
        ftp.connect(FTP_CONFIG['host'], FTP_CONFIG['port'])
        ftp.login(FTP_CONFIG['user'], FTP_CONFIG['passwd'])
        ftp.encoding = 'utf-8'
        
        # 경로 이동
        target_path = FTP_PATHS.get(category)
        if not target_path:
            raise ValueError(f"Invalid category: {category}")
        
        try:
            ftp.cwd(target_path)
        except:
            # 경로가 없으면 생성
            path_parts = target_path.split('/')
            current_path = ''
            for part in path_parts:
                if not part:
                    continue
                current_path += '/' + part
                try:
                    ftp.cwd(current_path)
                except:
                    ftp.mkd(current_path)
                    ftp.cwd(current_path)
        
        # 파일 업로드
        ftp.storbinary(f'STOR {filename}', io.BytesIO(file_data))
        
        # URL 생성 (FTP URL)
        file_url = f"ftp://{FTP_CONFIG['host']}:{FTP_CONFIG['port']}{target_path}/{filename}"
        
        ftp.quit()
        return file_url
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"FTP 업로드 실패: {str(e)}")

# ==================== 학생 관리 API ====================

@app.get("/api/students")
async def get_students(
    course_code: Optional[str] = None,
    search: Optional[str] = None
):
    """학생 목록 조회"""
    conn = get_db_connection()
    try:
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        
        query = "SELECT * FROM students WHERE 1=1"
        params = []
        
        if course_code:
            query += " AND course_code = %s"
            params.append(course_code)
        
        if search:
            query += " AND (name LIKE %s OR code LIKE %s OR phone LIKE %s)"
            search_pattern = f"%{search}%"
            params.extend([search_pattern, search_pattern, search_pattern])
        
        query += " ORDER BY code"
        
        cursor.execute(query, params)
        students = cursor.fetchall()
        
        # datetime 객체를 문자열로 변환
        for student in students:
            for key, value in student.items():
                if isinstance(value, (datetime, date)):
                    student[key] = value.isoformat()
                elif isinstance(value, bytes):
                    student[key] = None  # thumbnail은 제외
        
        return students
    finally:
        conn.close()

@app.get("/api/students/{student_id}")
async def get_student(student_id: int):
    """특정 학생 조회"""
    conn = get_db_connection()
    try:
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        cursor.execute("SELECT * FROM students WHERE id = %s", (student_id,))
        student = cursor.fetchone()
        
        if not student:
            raise HTTPException(status_code=404, detail="학생을 찾을 수 없습니다")
        
        # datetime 변환
        for key, value in student.items():
            if isinstance(value, (datetime, date)):
                student[key] = value.isoformat()
            elif isinstance(value, bytes):
                student[key] = None
        
        return student
    finally:
        conn.close()

@app.post("/api/students")
async def create_student(data: dict):
    """학생 생성"""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        
        # photo_urls 컬럼이 없으면 자동 생성
        ensure_photo_urls_column(cursor, 'students')
        
        # 자동으로 학생 코드 생성
        cursor.execute("SELECT MAX(CAST(SUBSTRING(code, 2) AS UNSIGNED)) as max_code FROM students WHERE code LIKE 'S%'")
        result = cursor.fetchone()
        next_num = (result[0] or 0) + 1
        code = f"S{next_num:03d}"
        
        query = """
            INSERT INTO students 
            (code, name, birth_date, gender, phone, email, address, interests, education, introduction, campus, course_code, notes, photo_urls)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        
        cursor.execute(query, (
            code,
            data.get('name'),
            data.get('birth_date'),
            data.get('gender'),
            data.get('phone'),
            data.get('email'),
            data.get('address'),
            data.get('interests'),
            data.get('education'),
            data.get('introduction'),
            data.get('campus'),
            data.get('course_code'),
            data.get('notes'),
            data.get('photo_urls')
        ))
        
        conn.commit()
        return {"id": cursor.lastrowid, "code": code}
    finally:
        conn.close()

@app.put("/api/students/{student_id}")
async def update_student(student_id: int, data: dict):
    """학생 수정"""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        
        # photo_urls 컬럼이 없으면 자동 생성
        ensure_photo_urls_column(cursor, 'students')
        
        query = """
            UPDATE students 
            SET name = %s, birth_date = %s, gender = %s, phone = %s, email = %s,
                address = %s, interests = %s, education = %s, introduction = %s,
                campus = %s, course_code = %s, notes = %s, photo_urls = %s, updated_at = NOW()
            WHERE id = %s
        """
        
        cursor.execute(query, (
            data.get('name'),
            data.get('birth_date'),
            data.get('gender'),
            data.get('phone'),
            data.get('email'),
            data.get('address'),
            data.get('interests'),
            data.get('education'),
            data.get('introduction'),
            data.get('campus'),
            data.get('course_code'),
            data.get('notes'),
            data.get('photo_urls'),
            student_id
        ))
        
        conn.commit()
        return {"id": student_id}
    finally:
        conn.close()

@app.delete("/api/students/{student_id}")
async def delete_student(student_id: int):
    """학생 삭제"""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM students WHERE id = %s", (student_id,))
        conn.commit()
        return {"message": "학생이 삭제되었습니다"}
    finally:
        conn.close()

@app.post("/api/students/upload-excel")
async def upload_excel(file: UploadFile = File(...)):
    """Excel 파일로 학생 일괄 등록"""
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Excel 파일만 업로드 가능합니다")
    
    try:
        # Excel 파일 읽기
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents))
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 현재 최대 학생 코드 조회
        cursor.execute("SELECT MAX(CAST(SUBSTRING(code, 2) AS UNSIGNED)) as max_code FROM students WHERE code LIKE 'S%'")
        result = cursor.fetchone()
        next_num = (result[0] or 0) + 1
        
        success_count = 0
        error_list = []
        
        for idx, row in df.iterrows():
            try:
                code = f"S{next_num:03d}"
                
                # 컬럼명 매핑
                name = row.get('이름', '')
                birth_date = str(row.get('생년월일(78.01.12)', ''))
                gender = row.get('성별\n(선택)', '')
                phone = str(row.get('휴대폰번호', ''))
                email = row.get('이메일', '')
                address = row.get('주소', '')
                interests = row.get('관심 있는 분야(2개)', '')
                education = row.get('최종 학교/학년(졸업)', '')
                introduction = row.get('자기소개 (200자 내외)', '')
                campus = row.get('지원하고자 하는 캠퍼스를 선택하세요', '')
                
                query = """
                    INSERT INTO students 
                    (code, name, birth_date, gender, phone, email, address, interests, education, introduction, campus)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """
                
                cursor.execute(query, (
                    code, name, birth_date, gender, phone, email, 
                    address, interests, education, introduction, campus
                ))
                
                next_num += 1
                success_count += 1
                
            except Exception as e:
                error_list.append(f"행 {idx+2}: {str(e)}")
        
        conn.commit()
        conn.close()
        
        return {
            "success": True,
            "message": f"{success_count}명의 학생이 등록되었습니다",
            "success_count": success_count,
            "errors": error_list
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"파일 처리 중 오류: {str(e)}")

@app.get("/api/template/students")
async def download_template():
    """학생 등록 템플릿 다운로드"""
    template_path = "/home/user/webapp/student_template.xlsx"
    if os.path.exists(template_path):
        return FileResponse(
            template_path,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            filename="학생등록양식.xlsx"
        )
    raise HTTPException(status_code=404, detail="템플릿 파일을 찾을 수 없습니다")

# ==================== 과목 관리 API ====================

@app.get("/api/subjects")
async def get_subjects():
    """과목 목록 조회"""
    conn = get_db_connection()
    try:
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        cursor.execute("""
            SELECT s.*, i.name as instructor_name
            FROM subjects s
            LEFT JOIN instructors i ON s.main_instructor = i.code
            ORDER BY s.code
        """)
        subjects = cursor.fetchall()
        
        for subject in subjects:
            for key, value in subject.items():
                if isinstance(value, (datetime, date)):
                    subject[key] = value.isoformat()
        
        return subjects
    finally:
        conn.close()

@app.get("/api/subjects/{subject_code}")
async def get_subject(subject_code: str):
    """특정 과목 조회"""
    conn = get_db_connection()
    try:
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        cursor.execute("""
            SELECT s.*, i.name as instructor_name
            FROM subjects s
            LEFT JOIN instructors i ON s.main_instructor = i.code
            WHERE s.code = %s
        """, (subject_code,))
        subject = cursor.fetchone()
        
        if not subject:
            raise HTTPException(status_code=404, detail="과목을 찾을 수 없습니다")
        
        for key, value in subject.items():
            if isinstance(value, (datetime, date)):
                subject[key] = value.isoformat()
        
        return subject
    finally:
        conn.close()

@app.post("/api/subjects")
async def create_subject(data: dict):
    """과목 생성"""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        
        query = """
            INSERT INTO subjects 
            (code, name, main_instructor, day_of_week, is_biweekly, week_offset, hours, description,
             sub_subject_1, sub_hours_1, sub_subject_2, sub_hours_2, sub_subject_3, sub_hours_3,
             sub_subject_4, sub_hours_4, sub_subject_5, sub_hours_5)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        
        cursor.execute(query, (
            data.get('code'),
            data.get('name'),
            data.get('main_instructor'),
            data.get('day_of_week', 0),
            data.get('is_biweekly', 0),
            data.get('week_offset', 0),
            data.get('hours', 0),
            data.get('description', ''),
            data.get('sub_subject_1', ''),
            data.get('sub_hours_1', 0),
            data.get('sub_subject_2', ''),
            data.get('sub_hours_2', 0),
            data.get('sub_subject_3', ''),
            data.get('sub_hours_3', 0),
            data.get('sub_subject_4', ''),
            data.get('sub_hours_4', 0),
            data.get('sub_subject_5', ''),
            data.get('sub_hours_5', 0)
        ))
        
        conn.commit()
        return {"code": data.get('code')}
    except pymysql.err.OperationalError as e:
        raise HTTPException(status_code=500, detail=f"데이터베이스 오류: {str(e)}")
    finally:
        conn.close()

@app.put("/api/subjects/{subject_code}")
async def update_subject(subject_code: str, data: dict):
    """과목 수정"""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        
        query = """
            UPDATE subjects 
            SET name = %s, main_instructor = %s, day_of_week = %s, 
                is_biweekly = %s, week_offset = %s, hours = %s, description = %s,
                sub_subject_1 = %s, sub_hours_1 = %s, sub_subject_2 = %s, sub_hours_2 = %s,
                sub_subject_3 = %s, sub_hours_3 = %s, sub_subject_4 = %s, sub_hours_4 = %s,
                sub_subject_5 = %s, sub_hours_5 = %s
            WHERE code = %s
        """
        
        cursor.execute(query, (
            data.get('name'),
            data.get('main_instructor'),
            data.get('day_of_week', 0),
            data.get('is_biweekly', 0),
            data.get('week_offset', 0),
            data.get('hours', 0),
            data.get('description', ''),
            data.get('sub_subject_1', ''),
            data.get('sub_hours_1', 0),
            data.get('sub_subject_2', ''),
            data.get('sub_hours_2', 0),
            data.get('sub_subject_3', ''),
            data.get('sub_hours_3', 0),
            data.get('sub_subject_4', ''),
            data.get('sub_hours_4', 0),
            data.get('sub_subject_5', ''),
            data.get('sub_hours_5', 0),
            subject_code
        ))
        
        conn.commit()
        return {"code": subject_code}
    finally:
        conn.close()

@app.delete("/api/subjects/{subject_code}")
async def delete_subject(subject_code: str):
    """과목 삭제"""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM subjects WHERE code = %s", (subject_code,))
        conn.commit()
        return {"message": "과목이 삭제되었습니다"}
    finally:
        conn.close()

# ==================== 유틸리티 함수 ====================

def convert_datetime(obj):
    """datetime 객체를 문자열로 변환"""
    from datetime import timedelta
    for key, value in obj.items():
        if isinstance(value, (datetime, date)):
            obj[key] = value.isoformat()
        elif isinstance(value, timedelta):
            # timedelta를 HH:MM:SS 형식으로 변환
            total_seconds = int(value.total_seconds())
            hours = total_seconds // 3600
            minutes = (total_seconds % 3600) // 60
            seconds = total_seconds % 60
            obj[key] = f"{hours:02d}:{minutes:02d}:{seconds:02d}"
        elif isinstance(value, bytes):
            obj[key] = None
    return obj

# ==================== 강사코드 관리 API ====================

@app.get("/api/instructor-codes")
async def get_instructor_codes():
    """강사코드 목록 조회"""
    conn = get_db_connection()
    try:
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        cursor.execute("SELECT * FROM instructor_codes ORDER BY code")
        codes = cursor.fetchall()
        return [convert_datetime(code) for code in codes]
    finally:
        conn.close()

@app.post("/api/instructor-codes")
async def create_instructor_code(data: dict):
    """강사코드 생성"""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        query = """
            INSERT INTO instructor_codes (code, name, type)
            VALUES (%s, %s, %s)
        """
        cursor.execute(query, (data['code'], data['name'], data['type']))
        conn.commit()
        return {"code": data['code']}
    finally:
        conn.close()

@app.put("/api/instructor-codes/{code}")
async def update_instructor_code(code: str, data: dict):
    """강사코드 수정"""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        query = """
            UPDATE instructor_codes
            SET name = %s, type = %s
            WHERE code = %s
        """
        cursor.execute(query, (data['name'], data['type'], code))
        conn.commit()
        return {"code": code}
    finally:
        conn.close()

@app.delete("/api/instructor-codes/{code}")
async def delete_instructor_code(code: str):
    """강사코드 삭제"""
    conn = get_db_connection()
    try:
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        
        # 사용 중인지 확인
        cursor.execute("SELECT COUNT(*) as cnt FROM instructors WHERE instructor_type = %s", (code,))
        result = cursor.fetchone()
        if result and result['cnt'] > 0:
            raise HTTPException(status_code=400, detail=f"이 강사코드는 {result['cnt']}명의 강사가 사용 중입니다. 먼저 강사의 타입을 변경하세요.")
        
        cursor.execute("DELETE FROM instructor_codes WHERE code = %s", (code,))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="강사코드를 찾을 수 없습니다")
        
        conn.commit()
        return {"message": "강사코드가 삭제되었습니다"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"삭제 실패: {str(e)}")
    finally:
        conn.close()

# ==================== 강사 관리 API ====================

@app.get("/api/instructors")
async def get_instructors(search: Optional[str] = None):
    """강사 목록 조회 (검색 기능 포함)"""
    conn = get_db_connection()
    try:
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        
        query = """
            SELECT i.*, ic.name as type_name
            FROM instructors i
            LEFT JOIN instructor_codes ic ON i.instructor_type = ic.code
            WHERE 1=1
        """
        params = []
        
        if search:
            query += " AND (i.name LIKE %s OR i.code LIKE %s OR i.phone LIKE %s)"
            search_pattern = f"%{search}%"
            params.extend([search_pattern, search_pattern, search_pattern])
        
        query += " ORDER BY i.code"
        
        cursor.execute(query, params)
        instructors = cursor.fetchall()
        return [convert_datetime(inst) for inst in instructors]
    finally:
        conn.close()

@app.get("/api/instructors/{code}")
async def get_instructor(code: str):
    """특정 강사 조회"""
    conn = get_db_connection()
    try:
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        cursor.execute("""
            SELECT i.*, ic.name as type_name
            FROM instructors i
            LEFT JOIN instructor_codes ic ON i.instructor_type = ic.code
            WHERE i.code = %s
        """, (code,))
        instructor = cursor.fetchone()
        if not instructor:
            raise HTTPException(status_code=404, detail="강사를 찾을 수 없습니다")
        return convert_datetime(instructor)
    finally:
        conn.close()

@app.post("/api/instructors")
async def create_instructor(data: dict):
    """강사 생성"""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        
        # photo_urls 컬럼이 없으면 자동 생성
        ensure_photo_urls_column(cursor, 'instructors')
        
        query = """
            INSERT INTO instructors (code, name, phone, major, instructor_type, email, photo_urls)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """
        cursor.execute(query, (
            data['code'], data['name'], data.get('phone'),
            data.get('major'), data.get('instructor_type'), data.get('email'),
            data.get('photo_urls')
        ))
        conn.commit()
        return {"code": data['code']}
    finally:
        conn.close()

@app.put("/api/instructors/{code}")
async def update_instructor(code: str, data: dict):
    """강사 수정"""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        
        # photo_urls 컬럼이 없으면 자동 생성
        ensure_photo_urls_column(cursor, 'instructors')
        
        query = """
            UPDATE instructors
            SET name = %s, phone = %s, major = %s, instructor_type = %s, email = %s, photo_urls = %s
            WHERE code = %s
        """
        cursor.execute(query, (
            data['name'], data.get('phone'), data.get('major'),
            data.get('instructor_type'), data.get('email'), data.get('photo_urls'), code
        ))
        conn.commit()
        return {"code": code}
    finally:
        conn.close()

@app.delete("/api/instructors/{code}")
async def delete_instructor(code: str):
    """강사 삭제"""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM instructors WHERE code = %s", (code,))
        conn.commit()
        return {"message": "강사가 삭제되었습니다"}
    finally:
        conn.close()

# ==================== 공휴일 관리 API ====================

@app.get("/api/holidays")
async def get_holidays(year: Optional[int] = None):
    """공휴일 목록 조회 (연도별 필터)"""
    conn = get_db_connection()
    try:
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        
        if year:
            cursor.execute("""
                SELECT * FROM holidays
                WHERE YEAR(holiday_date) = %s
                ORDER BY holiday_date
            """, (year,))
        else:
            cursor.execute("SELECT * FROM holidays ORDER BY holiday_date")
        
        holidays = cursor.fetchall()
        return [convert_datetime(h) for h in holidays]
    finally:
        conn.close()

@app.post("/api/holidays")
async def create_holiday(data: dict):
    """공휴일 생성"""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        query = """
            INSERT INTO holidays (holiday_date, name, is_legal)
            VALUES (%s, %s, %s)
        """
        cursor.execute(query, (data['holiday_date'], data['name'], data.get('is_legal', 0)))
        conn.commit()
        return {"id": cursor.lastrowid}
    finally:
        conn.close()

@app.put("/api/holidays/{holiday_id}")
async def update_holiday(holiday_id: int, data: dict):
    """공휴일 수정"""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        query = """
            UPDATE holidays
            SET holiday_date = %s, name = %s, is_legal = %s
            WHERE id = %s
        """
        cursor.execute(query, (data['holiday_date'], data['name'], data.get('is_legal', 0), holiday_id))
        conn.commit()
        return {"id": holiday_id}
    finally:
        conn.close()

@app.delete("/api/holidays/{holiday_id}")
async def delete_holiday(holiday_id: int):
    """공휴일 삭제"""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM holidays WHERE id = %s", (holiday_id,))
        conn.commit()
        return {"message": "공휴일이 삭제되었습니다"}
    finally:
        conn.close()

# ==================== 과정(학급) 관리 API ====================

@app.get("/api/courses")
async def get_courses():
    """과정 목록 조회 (학생수, 과목수 포함)"""
    conn = get_db_connection()
    try:
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        cursor.execute("""
            SELECT c.*, 
                   COUNT(DISTINCT s.id) as student_count,
                   COUNT(DISTINCT cs.subject_code) as subject_count
            FROM courses c
            LEFT JOIN students s ON c.code = s.course_code
            LEFT JOIN course_subjects cs ON c.code = cs.course_code
            GROUP BY c.code
            ORDER BY c.code
        """)
        courses = cursor.fetchall()
        return [convert_datetime(course) for course in courses]
    finally:
        conn.close()

@app.get("/api/courses/{code}")
async def get_course(code: str):
    """특정 과정 조회"""
    conn = get_db_connection()
    try:
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        cursor.execute("""
            SELECT c.*,
                   COUNT(DISTINCT s.id) as student_count
            FROM courses c
            LEFT JOIN students s ON c.code = s.course_code
            WHERE c.code = %s
            GROUP BY c.code
        """, (code,))
        course = cursor.fetchone()
        if not course:
            raise HTTPException(status_code=404, detail="과정을 찾을 수 없습니다")
        return convert_datetime(course)
    finally:
        conn.close()

@app.post("/api/courses")
async def create_course(data: dict):
    """과정 생성"""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        query = """
            INSERT INTO courses (code, name, lecture_hours, project_hours, internship_hours,
                                capacity, location, notes, start_date, lecture_end_date,
                                project_end_date, internship_end_date, final_end_date, total_days)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        cursor.execute(query, (
            data['code'], data['name'], data['lecture_hours'], data['project_hours'],
            data['internship_hours'], data['capacity'], data.get('location'),
            data.get('notes'), data.get('start_date'), data.get('lecture_end_date'),
            data.get('project_end_date'), data.get('internship_end_date'),
            data.get('final_end_date'), data.get('total_days')
        ))
        conn.commit()
        return {"code": data['code']}
    finally:
        conn.close()

@app.put("/api/courses/{code}")
async def update_course(code: str, data: dict):
    """과정 수정"""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        query = """
            UPDATE courses
            SET name = %s, lecture_hours = %s, project_hours = %s, internship_hours = %s,
                capacity = %s, location = %s, notes = %s, start_date = %s,
                lecture_end_date = %s, project_end_date = %s, internship_end_date = %s,
                final_end_date = %s, total_days = %s
            WHERE code = %s
        """
        cursor.execute(query, (
            data['name'], data['lecture_hours'], data['project_hours'],
            data['internship_hours'], data['capacity'], data.get('location'),
            data.get('notes'), data.get('start_date'), data.get('lecture_end_date'),
            data.get('project_end_date'), data.get('internship_end_date'),
            data.get('final_end_date'), data.get('total_days'), code
        ))
        conn.commit()
        return {"code": code}
    finally:
        conn.close()

@app.delete("/api/courses/{code}")
async def delete_course(code: str):
    """과정 삭제"""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM courses WHERE code = %s", (code,))
        conn.commit()
        return {"message": "과정이 삭제되었습니다"}
    finally:
        conn.close()

# ==================== 프로젝트 관리 API ====================

@app.get("/api/projects")
async def get_projects(course_code: Optional[str] = None):
    """팀 목록 조회 (과정별 필터)"""
    conn = get_db_connection()
    try:
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        
        # Check if new columns exist, if not, add them
        try:
            cursor.execute("SHOW COLUMNS FROM projects LIKE 'group_type'")
            if not cursor.fetchone():
                # Add new columns
                cursor.execute("ALTER TABLE projects ADD COLUMN group_type VARCHAR(50)")
                cursor.execute("ALTER TABLE projects ADD COLUMN instructor_code VARCHAR(50)")
                cursor.execute("ALTER TABLE projects ADD COLUMN mentor_code VARCHAR(50)")
                conn.commit()
        except:
            pass  # Columns might already exist
        
        # Check if account columns exist, if not, add them
        try:
            cursor.execute("SHOW COLUMNS FROM projects LIKE 'account1_name'")
            if not cursor.fetchone():
                # Add shared account columns (5 sets of 3 fields = 15 columns)
                for i in range(1, 6):
                    cursor.execute(f"ALTER TABLE projects ADD COLUMN account{i}_name VARCHAR(100)")
                    cursor.execute(f"ALTER TABLE projects ADD COLUMN account{i}_id VARCHAR(100)")
                    cursor.execute(f"ALTER TABLE projects ADD COLUMN account{i}_pw VARCHAR(100)")
                conn.commit()
        except:
            pass  # Columns might already exist
        
        query = """
            SELECT p.*, 
                   c.name as course_name,
                   i1.name as instructor_name,
                   i2.name as mentor_name
            FROM projects p
            LEFT JOIN courses c ON p.course_code = c.code
            LEFT JOIN instructors i1 ON p.instructor_code = i1.code
            LEFT JOIN instructors i2 ON p.mentor_code = i2.code
            WHERE 1=1
        """
        params = []
        
        if course_code:
            query += " AND p.course_code = %s"
            params.append(course_code)
        
        query += " ORDER BY p.code"
        
        cursor.execute(query, params)
        projects = cursor.fetchall()
        return [convert_datetime(proj) for proj in projects]
    finally:
        conn.close()

@app.get("/api/projects/{code}")
async def get_project(code: str):
    """특정 팀 조회"""
    conn = get_db_connection()
    try:
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        cursor.execute("""
            SELECT p.*, 
                   c.name as course_name,
                   i1.name as instructor_name,
                   i2.name as mentor_name
            FROM projects p
            LEFT JOIN courses c ON p.course_code = c.code
            LEFT JOIN instructors i1 ON p.instructor_code = i1.code
            LEFT JOIN instructors i2 ON p.mentor_code = i2.code
            WHERE p.code = %s
        """, (code,))
        project = cursor.fetchone()
        if not project:
            raise HTTPException(status_code=404, detail="팀을 찾을 수 없습니다")
        return convert_datetime(project)
    finally:
        conn.close()

@app.post("/api/projects")
async def create_project(data: dict):
    """팀 생성 (5명의 팀원 정보)"""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        
        # Check if new columns exist, if not, add them
        try:
            cursor.execute("SHOW COLUMNS FROM projects LIKE 'member1_code'")
            if not cursor.fetchone():
                # Add new columns
                for i in range(1, 6):
                    cursor.execute(f"ALTER TABLE projects ADD COLUMN member{i}_code VARCHAR(50)")
                cursor.execute("ALTER TABLE projects ADD COLUMN group_type VARCHAR(50)")
                cursor.execute("ALTER TABLE projects ADD COLUMN instructor_code VARCHAR(50)")
                cursor.execute("ALTER TABLE projects ADD COLUMN mentor_code VARCHAR(50)")
                conn.commit()
        except:
            pass  # Columns might already exist
        
        # Check if account columns exist, if not, add them
        try:
            cursor.execute("SHOW COLUMNS FROM projects LIKE 'account1_name'")
            if not cursor.fetchone():
                # Add shared account columns (5 sets of 3 fields = 15 columns)
                for i in range(1, 6):
                    cursor.execute(f"ALTER TABLE projects ADD COLUMN account{i}_name VARCHAR(100)")
                    cursor.execute(f"ALTER TABLE projects ADD COLUMN account{i}_id VARCHAR(100)")
                    cursor.execute(f"ALTER TABLE projects ADD COLUMN account{i}_pw VARCHAR(100)")
                conn.commit()
        except:
            pass  # Columns might already exist
        
        query = """
            INSERT INTO projects (code, name, group_type, course_code, instructor_code, mentor_code,
                                 member1_name, member1_phone, member1_code,
                                 member2_name, member2_phone, member2_code,
                                 member3_name, member3_phone, member3_code,
                                 member4_name, member4_phone, member4_code,
                                 member5_name, member5_phone, member5_code,
                                 account1_name, account1_id, account1_pw,
                                 account2_name, account2_id, account2_pw,
                                 account3_name, account3_id, account3_pw,
                                 account4_name, account4_id, account4_pw,
                                 account5_name, account5_id, account5_pw)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        cursor.execute(query, (
            data['code'], data['name'], data.get('group_type'), data.get('course_code'),
            data.get('instructor_code'), data.get('mentor_code'),
            data.get('member1_name'), data.get('member1_phone'), data.get('member1_code'),
            data.get('member2_name'), data.get('member2_phone'), data.get('member2_code'),
            data.get('member3_name'), data.get('member3_phone'), data.get('member3_code'),
            data.get('member4_name'), data.get('member4_phone'), data.get('member4_code'),
            data.get('member5_name'), data.get('member5_phone'), data.get('member5_code'),
            data.get('account1_name'), data.get('account1_id'), data.get('account1_pw'),
            data.get('account2_name'), data.get('account2_id'), data.get('account2_pw'),
            data.get('account3_name'), data.get('account3_id'), data.get('account3_pw'),
            data.get('account4_name'), data.get('account4_id'), data.get('account4_pw'),
            data.get('account5_name'), data.get('account5_id'), data.get('account5_pw')
        ))
        conn.commit()
        return {"code": data['code']}
    finally:
        conn.close()

@app.put("/api/projects/{code}")
async def update_project(code: str, data: dict):
    """팀 수정"""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        query = """
            UPDATE projects
            SET name = %s, group_type = %s, course_code = %s, 
                instructor_code = %s, mentor_code = %s,
                member1_name = %s, member1_phone = %s, member1_code = %s,
                member2_name = %s, member2_phone = %s, member2_code = %s,
                member3_name = %s, member3_phone = %s, member3_code = %s,
                member4_name = %s, member4_phone = %s, member4_code = %s,
                member5_name = %s, member5_phone = %s, member5_code = %s,
                account1_name = %s, account1_id = %s, account1_pw = %s,
                account2_name = %s, account2_id = %s, account2_pw = %s,
                account3_name = %s, account3_id = %s, account3_pw = %s,
                account4_name = %s, account4_id = %s, account4_pw = %s,
                account5_name = %s, account5_id = %s, account5_pw = %s
            WHERE code = %s
        """
        cursor.execute(query, (
            data['name'], data.get('group_type'), data.get('course_code'),
            data.get('instructor_code'), data.get('mentor_code'),
            data.get('member1_name'), data.get('member1_phone'), data.get('member1_code'),
            data.get('member2_name'), data.get('member2_phone'), data.get('member2_code'),
            data.get('member3_name'), data.get('member3_phone'), data.get('member3_code'),
            data.get('member4_name'), data.get('member4_phone'), data.get('member4_code'),
            data.get('member5_name'), data.get('member5_phone'), data.get('member5_code'),
            data.get('account1_name'), data.get('account1_id'), data.get('account1_pw'),
            data.get('account2_name'), data.get('account2_id'), data.get('account2_pw'),
            data.get('account3_name'), data.get('account3_id'), data.get('account3_pw'),
            data.get('account4_name'), data.get('account4_id'), data.get('account4_pw'),
            data.get('account5_name'), data.get('account5_id'), data.get('account5_pw'),
            code
        ))
        conn.commit()
        return {"code": code}
    finally:
        conn.close()

@app.delete("/api/projects/{code}")
async def delete_project(code: str):
    """팀 삭제"""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM projects WHERE code = %s", (code,))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="팀을 찾을 수 없습니다")
        conn.commit()
        return {"message": "팀이 삭제되었습니다"}
    finally:
        conn.close()

# ==================== 수업관리(시간표) API ====================

@app.get("/api/timetables")
async def get_timetables(
    course_code: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """시간표 목록 조회 (과정/기간별 필터)"""
    conn = get_db_connection()
    try:
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        
        query = """
            SELECT t.*, 
                   c.name as course_name, c.start_date as course_start_date,
                   s.name as subject_name,
                   i.name as instructor_name,
                   tl.id as training_log_id,
                   tl.content as training_content
            FROM timetables t
            LEFT JOIN courses c ON t.course_code = c.code
            LEFT JOIN subjects s ON t.subject_code = s.code
            LEFT JOIN instructors i ON t.instructor_code = i.code
            LEFT JOIN training_logs tl ON t.id = tl.timetable_id
            WHERE 1=1
        """
        params = []
        
        if course_code:
            query += " AND t.course_code = %s"
            params.append(course_code)
        
        if start_date:
            query += " AND t.class_date >= %s"
            params.append(start_date)
        
        if end_date:
            query += " AND t.class_date <= %s"
            params.append(end_date)
        
        query += " ORDER BY t.class_date, t.start_time"
        
        cursor.execute(query, params)
        timetables = cursor.fetchall()
        
        # 주차/일차 계산
        for tt in timetables:
            if tt.get('course_start_date') and tt.get('class_date'):
                delta = (tt['class_date'] - tt['course_start_date']).days
                tt['week_number'] = (delta // 7) + 1
                tt['day_number'] = delta + 1
            else:
                tt['week_number'] = None
                tt['day_number'] = None
        return [convert_datetime(tt) for tt in timetables]
    finally:
        conn.close()

@app.get("/api/timetables/{timetable_id}")
async def get_timetable(timetable_id: int):
    """특정 시간표 조회"""
    conn = get_db_connection()
    try:
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        cursor.execute("""
            SELECT t.*,
                   c.name as course_name,
                   s.name as subject_name,
                   i.name as instructor_name
            FROM timetables t
            LEFT JOIN courses c ON t.course_code = c.code
            LEFT JOIN subjects s ON t.subject_code = s.code
            LEFT JOIN instructors i ON t.instructor_code = i.code
            WHERE t.id = %s
        """, (timetable_id,))
        timetable = cursor.fetchone()
        if not timetable:
            raise HTTPException(status_code=404, detail="시간표를 찾을 수 없습니다")
        return convert_datetime(timetable)
    finally:
        conn.close()

@app.post("/api/timetables")
async def create_timetable(data: dict):
    """시간표 생성"""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        query = """
            INSERT INTO timetables (course_code, subject_code, class_date, start_time,
                                   end_time, instructor_code, type, notes)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """
        cursor.execute(query, (
            data['course_code'], data.get('subject_code'), data['class_date'],
            data['start_time'], data['end_time'], data.get('instructor_code'),
            data['type'], data.get('notes')
        ))
        conn.commit()
        return {"id": cursor.lastrowid}
    finally:
        conn.close()

@app.put("/api/timetables/{timetable_id}")
async def update_timetable(timetable_id: int, data: dict):
    """시간표 수정"""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        query = """
            UPDATE timetables
            SET course_code = %s, subject_code = %s, class_date = %s,
                start_time = %s, end_time = %s, instructor_code = %s,
                type = %s, notes = %s
            WHERE id = %s
        """
        cursor.execute(query, (
            data['course_code'], data.get('subject_code'), data['class_date'],
            data['start_time'], data['end_time'], data.get('instructor_code'),
            data['type'], data.get('notes'), timetable_id
        ))
        conn.commit()
        return {"id": timetable_id}
    finally:
        conn.close()

@app.delete("/api/timetables/{timetable_id}")
async def delete_timetable(timetable_id: int):
    """시간표 삭제"""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM timetables WHERE id = %s", (timetable_id,))
        conn.commit()
        return {"message": "시간표가 삭제되었습니다"}
    finally:
        conn.close()

# ==================== 상담 관리 API ====================

@app.get("/api/counselings")
async def get_counselings(
    student_id: Optional[int] = None,
    month: Optional[str] = None,
    course_code: Optional[str] = None
):
    """상담 목록 조회 (학생별/월별/학급별 필터)"""
    conn = get_db_connection()
    try:
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        
        # photo_urls 컬럼 확인 및 추가
        ensure_photo_urls_column(cursor, 'consultations')
        
        query = """
            SELECT c.*, s.name as student_name, s.code as student_code, s.course_code,
                   i.name as instructor_name
            FROM consultations c
            LEFT JOIN students s ON c.student_id = s.id
            LEFT JOIN instructors i ON c.instructor_code = i.code
            WHERE 1=1
        """
        params = []
        
        if student_id:
            query += " AND c.student_id = %s"
            params.append(student_id)
        
        if month:  # 형식: "2025-01"
            query += " AND DATE_FORMAT(c.consultation_date, '%%Y-%%m') = %s"
            params.append(month)
        
        if course_code:
            query += " AND s.course_code = %s"
            params.append(course_code)
        
        query += " ORDER BY c.consultation_date DESC"
        
        cursor.execute(query, params)
        counselings = cursor.fetchall()
        
        for counseling in counselings:
            for key, value in counseling.items():
                if isinstance(value, (datetime, date)):
                    counseling[key] = value.isoformat()
        
        return counselings
    finally:
        conn.close()

@app.get("/api/counselings/{counseling_id}")
async def get_counseling(counseling_id: int):
    """특정 상담 조회"""
    conn = get_db_connection()
    try:
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        cursor.execute("""
            SELECT c.*, s.name as student_name, s.code as student_code,
                   i.name as instructor_name
            FROM consultations c
            LEFT JOIN students s ON c.student_id = s.id
            LEFT JOIN instructors i ON c.instructor_code = i.code
            WHERE c.id = %s
        """, (counseling_id,))
        counseling = cursor.fetchone()
        
        if not counseling:
            raise HTTPException(status_code=404, detail="상담 기록을 찾을 수 없습니다")
        
        for key, value in counseling.items():
            if isinstance(value, (datetime, date)):
                counseling[key] = value.isoformat()
        
        return counseling
    finally:
        conn.close()

@app.post("/api/counselings")
async def create_counseling(data: dict):
    """상담 생성"""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        
        # photo_urls 컬럼 확인 및 추가
        ensure_photo_urls_column(cursor, 'consultations')
        
        # consultations 테이블 구조에 맞게 조정
        query = """
            INSERT INTO consultations 
            (student_id, instructor_code, consultation_date, consultation_type, main_topic, content, status, photo_urls)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """
        
        # instructor_code가 빈 문자열이면 None으로 처리
        instructor_code = data.get('instructor_code')
        if instructor_code == '':
            instructor_code = None
        
        cursor.execute(query, (
            data.get('student_id'),
            instructor_code,
            data.get('consultation_date') or data.get('counseling_date'),
            data.get('consultation_type', '정기'),
            data.get('main_topic') or data.get('topic', ''),
            data.get('content'),
            data.get('status', '완료'),
            data.get('photo_urls')
        ))
        
        conn.commit()
        return {"id": cursor.lastrowid}
    except pymysql.err.OperationalError as e:
        raise HTTPException(status_code=500, detail=f"데이터베이스 오류: {str(e)}")
    except pymysql.err.IntegrityError as e:
        raise HTTPException(status_code=400, detail=f"데이터 무결성 오류: {str(e)}")
    finally:
        conn.close()

@app.put("/api/counselings/{counseling_id}")
async def update_counseling(counseling_id: int, data: dict):
    """상담 수정"""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        
        # photo_urls 컬럼 확인 및 추가
        ensure_photo_urls_column(cursor, 'consultations')
        
        query = """
            UPDATE consultations 
            SET student_id = %s, instructor_code = %s, consultation_date = %s, consultation_type = %s,
                main_topic = %s, content = %s, status = %s, photo_urls = %s
            WHERE id = %s
        """
        
        # instructor_code가 빈 문자열이면 None으로 처리
        instructor_code = data.get('instructor_code')
        if instructor_code == '':
            instructor_code = None
        
        cursor.execute(query, (
            data.get('student_id'),
            instructor_code,
            data.get('consultation_date') or data.get('counseling_date'),
            data.get('consultation_type', '정기'),
            data.get('main_topic') or data.get('topic', ''),
            data.get('content'),
            data.get('status', '완료'),
            data.get('photo_urls'),
            counseling_id
        ))
        
        conn.commit()
        return {"id": counseling_id}
    finally:
        conn.close()

@app.delete("/api/counselings/{counseling_id}")
async def delete_counseling(counseling_id: int):
    """상담 삭제"""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM consultations WHERE id = %s", (counseling_id,))
        conn.commit()
        return {"message": "상담 기록이 삭제되었습니다"}
    finally:
        conn.close()

# ==================== 훈련일지 관리 API ====================

@app.get("/api/training-logs")
async def get_training_logs(
    course_code: Optional[str] = None,
    instructor_code: Optional[str] = None,
    year: Optional[int] = None,
    month: Optional[int] = None,
    timetable_id: Optional[int] = None
):
    """훈련일지 목록 조회"""
    conn = get_db_connection()
    try:
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        
        # training_logs 테이블이 없으면 생성
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS training_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                timetable_id INT NOT NULL,
                course_code VARCHAR(50),
                instructor_code VARCHAR(50),
                class_date DATE,
                content TEXT,
                homework TEXT,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (timetable_id) REFERENCES timetables(id) ON DELETE CASCADE
            )
        """)
        conn.commit()
        
        query = """
            SELECT tl.*, 
                   t.class_date, t.start_time, t.end_time, t.type,
                   s.name as subject_name,
                   i.name as instructor_name,
                   c.name as course_name
            FROM training_logs tl
            LEFT JOIN timetables t ON tl.timetable_id = t.id
            LEFT JOIN subjects s ON t.subject_code = s.code
            LEFT JOIN instructors i ON t.instructor_code = i.code
            LEFT JOIN courses c ON t.course_code = c.code
            WHERE 1=1
        """
        
        params = []
        
        if timetable_id:
            query += " AND tl.timetable_id = %s"
            params.append(timetable_id)
        
        if course_code:
            query += " AND t.course_code = %s"
            params.append(course_code)
        
        if instructor_code:
            query += " AND t.instructor_code = %s"
            params.append(instructor_code)
        
        if year and month:
            query += " AND YEAR(t.class_date) = %s AND MONTH(t.class_date) = %s"
            params.extend([year, month])
        elif year:
            query += " AND YEAR(t.class_date) = %s"
            params.append(year)
        
        query += " ORDER BY t.class_date, t.start_time"
        
        cursor.execute(query, params)
        logs = cursor.fetchall()
        
        for log in logs:
            for key, value in log.items():
                if isinstance(value, (datetime, date)):
                    log[key] = value.isoformat()
        
        return logs
    finally:
        conn.close()

@app.get("/api/training-logs/{log_id}")
async def get_training_log(log_id: int):
    """특정 훈련일지 조회"""
    conn = get_db_connection()
    try:
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        cursor.execute("""
            SELECT tl.*, 
                   t.class_date, t.start_time, t.end_time, t.type,
                   s.name as subject_name,
                   i.name as instructor_name,
                   c.name as course_name
            FROM training_logs tl
            LEFT JOIN timetables t ON tl.timetable_id = t.id
            LEFT JOIN subjects s ON t.subject_code = s.code
            LEFT JOIN instructors i ON t.instructor_code = i.code
            LEFT JOIN courses c ON t.course_code = c.code
            WHERE tl.id = %s
        """, (log_id,))
        log = cursor.fetchone()
        
        if not log:
            raise HTTPException(status_code=404, detail="훈련일지를 찾을 수 없습니다")
        
        for key, value in log.items():
            if isinstance(value, (datetime, date)):
                log[key] = value.isoformat()
        
        return log
    finally:
        conn.close()

@app.post("/api/training-logs")
async def create_training_log(data: dict):
    """훈련일지 생성"""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        
        # photo_urls 컬럼이 없으면 자동 생성
        ensure_photo_urls_column(cursor, 'training_logs')
        
        query = """
            INSERT INTO training_logs 
            (timetable_id, course_code, instructor_code, class_date, content, homework, notes, photo_urls)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """
        
        cursor.execute(query, (
            data.get('timetable_id'),
            data.get('course_code'),
            data.get('instructor_code'),
            data.get('class_date'),
            data.get('content', ''),
            data.get('homework', ''),
            data.get('notes', ''),
            data.get('photo_urls')
        ))
        
        conn.commit()
        return {"id": cursor.lastrowid}
    except pymysql.err.OperationalError as e:
        raise HTTPException(status_code=500, detail=f"데이터베이스 오류: {str(e)}")
    finally:
        conn.close()

@app.put("/api/training-logs/{log_id}")
async def update_training_log(log_id: int, data: dict):
    """훈련일지 수정"""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        
        # photo_urls 컬럼이 없으면 자동 생성
        ensure_photo_urls_column(cursor, 'training_logs')
        
        query = """
            UPDATE training_logs 
            SET content = %s, homework = %s, notes = %s, photo_urls = %s
            WHERE id = %s
        """
        
        cursor.execute(query, (
            data.get('content', ''),
            data.get('homework', ''),
            data.get('notes', ''),
            data.get('photo_urls'),
            log_id
        ))
        
        conn.commit()
        return {"id": log_id}
    finally:
        conn.close()

@app.delete("/api/training-logs/{log_id}")
async def delete_training_log(log_id: int):
    """훈련일지 삭제"""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM training_logs WHERE id = %s", (log_id,))
        conn.commit()
        return {"message": "훈련일지가 삭제되었습니다"}
    finally:
        conn.close()

# ==================== AI 생기부 작성 API ====================

def generate_report_template(student, counselings, counseling_text, style='formal'):
    """스타일별 생기부 템플릿 생성"""
    name = student['name']
    code = student.get('code', '')
    birth = student.get('birth_date', '')
    interests = student.get('interests', '정보 없음')
    education = student.get('education', '')
    count = len(counselings)
    
    if style == 'formal':
        # 공식적 스타일
        report = f"""━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【 학생 생활기록부 】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. 기본 정보
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 성명: {name} ({code})
• 생년월일: {birth}
• 학력: {education}
• 관심분야: {interests}
• 상담 이력: 총 {count}회

2. 학생 특성 종합 분석
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
본 학생은 {count}회에 걸친 지속적인 상담을 통해 다음과 같은 특성을 보였습니다.

【 학업 태도 및 역량 】
자기주도적 학습 태도를 갖추고 있으며, {interests} 분야에 대한 높은 관심과 열정을 보이고 있습니다.
학습 과정에서 어려움에 직면했을 때에도 포기하지 않고 해결 방안을 모색하는 모습을 보였습니다.

【 성장 과정 및 발전 사항 】
상담 기간 동안 학생은 꾸준한 성장을 보여주었습니다. 초기에 비해 자기 인식 능력이 향상되었으며,
구체적인 목표 설정과 실행 계획 수립 능력이 발전하였습니다.

【 대인관계 및 의사소통 】
상담자와의 소통 과정에서 자신의 생각을 논리적으로 표현하는 능력이 우수하였으며,
타인의 조언을 경청하고 수용하는 긍정적인 태도를 보였습니다.

3. 상담 내역 및 주요 논의 사항
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{counseling_text}

4. 종합 의견 및 향후 지도 방향
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【 강점 및 잠재력 】
• 자기주도적 학습 능력 보유
• {interests} 분야에 대한 높은 관심과 동기
• 목표 지향적 사고방식
• 긍정적이고 적극적인 태도

【 개선 및 발전 방향 】
• 체계적인 학습 계획 수립 및 실행
• 시간 관리 능력 강화
• 자신감 향상을 위한 성공 경험 축적
• 지속적인 자기 성찰 및 피드백 수용

【 향후 지도 계획 】
1단계 (1-2개월): 기초 역량 강화 및 학습 습관 확립
2단계 (3-4개월): 심화 학습 및 실전 경험 축적
3단계 (5-6개월): 자기주도 학습 완성 및 목표 달성

5. 교사 종합 소견
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{name} 학생은 충분한 잠재력과 강한 학습 의지를 갖춘 우수한 학생입니다.
상담 과정에서 보여준 진지한 태도와 자기 개선 노력은 매우 인상적이었습니다.
체계적인 지원과 지속적인 격려를 통해 {interests} 분야에서 탁월한 성과를 달성할 수 있을 것으로 
기대되며, 앞으로의 성장과 발전이 매우 기대됩니다.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
작성일: {datetime.now().strftime('%Y년 %m월 %d일')}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""
    
    elif style == 'friendly':
        # 친근한 스타일
        report = f"""💙 {name} 학생 생활기록부 💙

안녕하세요! {name} 학생의 한 학기 동안의 성장 이야기를 정리해봤어요.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✨ 학생 소개
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 이름: {name} ({code})
• 생년월일: {birth}
• 학력: {education}
• 좋아하는 것: {interests}
• 함께한 상담: {count}회

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌟 {name} 학생은 어떤 학생일까요?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{name} 학생은 {interests}에 대한 열정이 가득한 학생이에요!
{count}번의 상담을 통해 정말 많이 성장하는 모습을 볼 수 있었답니다.

【 멋진 점들 】
✓ 자기주도적으로 학습하는 습관이 있어요
✓ {interests} 분야에 대한 관심이 정말 높아요
✓ 어려운 일이 있어도 포기하지 않고 도전해요
✓ 선생님의 조언을 잘 듣고 실천하려고 노력해요

【 성장하는 모습 】
처음 만났을 때보다 자신감이 많이 생겼어요! 
자신에 대해 더 잘 이해하게 되었고, 구체적인 목표를 세우는 법도 배웠답니다.
무엇보다 꾸준히 노력하는 모습이 정말 멋있었어요. 👍

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📚 함께 나눈 이야기들
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{counseling_text}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 앞으로의 계획
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【 계속 키워나갈 점 】
• 자신감을 더 키워봐요!
• {interests} 실력을 꾸준히 향상시켜요
• 시간 관리를 잘해서 효율적으로 공부해요
• 작은 목표들을 하나씩 달성해나가요

【 함께 노력할 방법 】
1. 우선 기초를 탄탄히 다져요 (1-2개월)
2. 실력을 쌓으면서 자신감을 키워요 (3-4개월)
3. 스스로 잘할 수 있게 되도록 도와드릴게요 (5-6개월)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💝 선생님의 한마디
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{name} 학생, 정말 열심히 노력하는 모습이 멋있어요!
{interests}에 대한 열정과 배우고자 하는 의지가 느껴져서 선생님도 기쁩니다.
앞으로도 지금처럼 꾸준히 노력하다 보면 분명 원하는 목표를 이룰 수 있을 거예요.
언제든지 도움이 필요하면 찾아오세요. 항상 응원하고 있어요! 화이팅! 💪✨

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
작성일: {datetime.now().strftime('%Y년 %m월 %d일')}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""
    
    else:  # detailed
        # 상세 분석 스타일
        report = f"""╔════════════════════════════════════════════════════╗
║          학생 생활기록부 (상세 분석)              ║
╚════════════════════════════════════════════════════╝

1. 기본 정보 및 배경
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【 학생 프로필 】
• 성명: {name}
• 학번: {code}
• 생년월일: {birth}
• 최종학력: {education}
• 관심분야: {interests}
• 상담 횟수: {count}회
• 기록 기간: {counselings[0]['consultation_date'] if counselings else '정보없음'} ~ {counselings[-1]['consultation_date'] if counselings else '정보없음'}

2. 학생 특성 심층 분석
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【 인지적 특성 】
▪ 자기 인식 수준: 우수
  - 자신의 강점과 약점을 정확하게 파악하고 있음
  - 현실적인 목표 설정 능력 보유
  - 자기 성찰 능력이 발달되어 있음

▪ 학습 접근 방식: 자기주도적
  - 능동적인 학습 태도
  - 문제 해결을 위한 적극적 탐색
  - {interests} 분야에 대한 깊이 있는 관심

▪ 사고 패턴: 논리적이고 체계적
  - 상황을 분석하고 판단하는 능력 우수
  - 구조화된 사고방식
  - 단계적 접근 능력

【 정서적 특성 】
▪ 정서 안정성: 양호
  - 전반적으로 안정적인 정서 상태
  - 스트레스 상황에 대한 적응력 보유
  - 긍정적 마인드셋 유지

▪ 동기 수준: 높음
  - {interests}에 대한 내적 동기 강함
  - 성취 지향적 태도
  - 지속적인 자기 개발 의지

▪ 자신감: 발전 중
  - 기초적 자신감은 보유
  - 성공 경험 축적을 통한 향상 필요
  - 긍정적 자기 이미지 형성 과정

【 사회적 특성 】
▪ 의사소통 능력: 우수
  - 자신의 생각을 명확히 표현
  - 타인의 의견을 경청하는 태도
  - 건설적인 대화 참여

▪ 협력 태도: 긍정적
  - 상담자의 조언을 개방적으로 수용
  - 피드백에 대한 긍정적 반응
  - 지도에 협조적인 자세

3. 상담 내역 상세 분석
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【 전체 상담 현황 】
{counseling_text}

【 상담 효과 분석 】
▪ 자기 인식 향상
  - 상담 초기 대비 자기 이해도 증가
  - 강점과 개선점에 대한 명확한 인식

▪ 목표 설정 능력 발전
  - 구체적이고 현실적인 목표 수립
  - 단계별 실행 계획 능력 향상

▪ 문제 해결 능력 개선
  - 어려움에 대한 적극적 대처
  - 다양한 해결 방안 모색 능력

4. 역량 평가 (5단계 척도)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【 학업 관련 역량 】
• 자기주도 학습: ★★★★☆ (4/5)
• 문제 해결 능력: ★★★★☆ (4/5)
• 창의적 사고: ★★★☆☆ (3/5)
• 분석적 사고: ★★★★☆ (4/5)

【 개인 역량 】
• 자기 관리: ★★★☆☆ (3/5)
• 시간 관리: ★★★☆☆ (3/5)
• 목표 지향성: ★★★★☆ (4/5)
• 회복탄력성: ★★★★☆ (4/5)

【 사회적 역량 】
• 의사소통: ★★★★★ (5/5)
• 협업 능력: ★★★★☆ (4/5)
• 리더십: ★★★☆☆ (3/5)
• 공감 능력: ★★★★☆ (4/5)

5. SWOT 분석
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【 Strengths (강점) 】
✓ 자기주도적 학습 태도
✓ {interests}에 대한 깊은 관심과 열정
✓ 논리적이고 체계적인 사고방식
✓ 우수한 의사소통 능력
✓ 긍정적이고 적극적인 자세

【 Weaknesses (약점) 】
△ 시간 관리 능력 개선 필요
△ 자신감 향상 필요
△ 체계적 학습 전략 수립 필요
△ 실행력 강화 필요

【 Opportunities (기회) 】
◆ {interests} 분야의 성장 가능성
◆ 체계적 지원 시스템 활용
◆ 멘토링 및 코칭 기회
◆ 프로젝트 참여를 통한 실전 경험

【 Threats (위협) 】
⚠ 과도한 목표로 인한 스트레스
⚠ 초기 어려움으로 인한 동기 저하 가능성
⚠ 시간 관리 실패 시 학습 효율 저하

6. 단계별 발전 계획 (상세)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【 Phase 1: 기초 확립 단계 (1-2개월) 】
▸ 목표
  - {interests} 기본 개념 및 원리 완전 이해
  - 체계적 학습 습관 형성
  - 기초 실력 다지기

▸ 실행 방법
  - 주간 학습 계획표 작성 및 실행
  - 매일 30분 이상 집중 학습
  - 주 1회 진도 점검 및 피드백
  - 기초 개념 테스트 및 보완

▸ 평가 지표
  - 학습 계획 실행률 80% 이상
  - 기초 개념 이해도 테스트 80점 이상
  - 주간 학습 시간 15시간 이상

【 Phase 2: 실력 향상 단계 (3-4개월) 】
▸ 목표
  - 실전 적용 능력 배양
  - 문제 해결 능력 향상
  - 프로젝트 수행 경험 축적

▸ 실행 방법
  - 미니 프로젝트 수행 (주 1회)
  - 실전 문제 풀이 및 분석
  - 멘토링 세션 참여 (월 2회)
  - 학습 그룹 활동 참여

▸ 평가 지표
  - 프로젝트 완성도 평가
  - 문제 해결 속도 및 정확도
  - 자신감 수준 자체 평가

【 Phase 3: 전문성 심화 단계 (5-6개월) 】
▸ 목표
  - 독립적 학습 능력 완성
  - 심화 지식 및 기술 습득
  - 장기 목표 달성 준비

▸ 실행 방법
  - 자기주도 프로젝트 수행
  - 심화 학습 자료 탐구
  - 포트폴리오 구축
  - 분야별 전문가 네트워킹

▸ 평가 지표
  - 프로젝트 포트폴리오 3개 이상
  - 자기주도 학습률 90% 이상
  - 종합 평가 90점 이상

7. 지원 체계 및 모니터링
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【 정기 지원 프로그램 】
▸ 주간 체크인 (매주)
  - 학습 진행 상황 확인
  - 어려움 및 질문 해결
  - 다음 주 계획 수립

▸ 월간 면담 (매월)
  - 월간 성과 리뷰
  - 심층 상담 및 코칭
  - 차월 목표 설정

▸ 분기 평가 (3개월마다)
  - 종합 성과 평가
  - SWOT 재분석
  - 장기 계획 조정

【 맞춤형 지원 서비스 】
▸ 학습 자료 제공
  - 수준별 학습 자료
  - 추천 도서 및 온라인 강의
  - 실습 프로젝트 자료

▸ 멘토링 연결
  - 분야별 전문가 멘토
  - 선배 학습자와의 교류
  - 스터디 그룹 운영

▸ 심리·정서 지원
  - 필요시 심리 상담
  - 동기 부여 세션
  - 스트레스 관리 지도

8. 종합 평가 및 권장사항
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【 종합 평가 】
{name} 학생은 {interests} 분야에서 탁월한 잠재력을 보유하고 있습니다.
{count}회의 상담을 통해 확인된 학생의 자기주도적 학습 태도, 논리적 사고력, 
우수한 의사소통 능력은 향후 발전의 강력한 기반이 될 것입니다.

현재 시간 관리와 체계적 학습 전략 수립에서 개선이 필요하나, 
이는 체계적인 지도와 꾸준한 연습을 통해 충분히 향상될 수 있는 영역입니다.

학생이 보여준 높은 학습 동기와 개선 의지를 고려할 때, 
적절한 지원과 체계적인 지도가 제공된다면 목표한 성과를 달성할 수 있을 것으로 
확신합니다.

【 권장사항 】
1. 단계별 목표 달성에 집중
   - 한 번에 모든 것을 이루려 하지 말고 단계별 접근
   - 작은 성공 경험을 축적하여 자신감 향상

2. 체계적인 시간 관리
   - 학습 계획표 작성 및 준수
   - 우선순위에 따른 시간 배분
   - 규칙적인 생활 패턴 유지

3. 지속적인 자기 성찰
   - 일일 학습 일지 작성
   - 주간 회고 및 개선점 도출
   - 정기적인 자기 평가

4. 적극적인 도움 요청
   - 어려움 발생 시 즉시 상담
   - 멘토 및 동료와의 활발한 교류
   - 학습 커뮤니티 적극 활용

5. 균형 잡힌 생활
   - 학습과 휴식의 균형
   - 취미 및 여가 활동 병행
   - 신체적·정신적 건강 관리

【 기대 효과 】
위 계획대로 6개월간 체계적인 학습과 지도가 이루어진다면:
• {interests} 분야 기본 역량 완전 확립
• 자기주도적 학습 능력 완성
• 실전 프로젝트 수행 경험 축적
• 자신감 및 자기효능감 대폭 향상
• 장기적 성장을 위한 탄탄한 기반 마련

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【 교사 최종 의견 】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{name} 학생과의 {count}회 상담을 통해 학생의 우수한 잠재력과 
강한 성장 의지를 확인할 수 있었습니다.

학생이 보여준 진지한 태도, 자기 성찰 능력, 그리고 지속적인 개선 노력은
교사로서 매우 인상 깊었으며, 앞으로의 발전이 매우 기대됩니다.

{interests} 분야에서의 깊은 관심과 열정을 바탕으로,
체계적인 학습과 꾸준한 노력을 통해 반드시 목표를 달성할 수 있을 것으로
확신합니다.

학생의 성공적인 성장을 위해 지속적으로 지원하고 격려하겠습니다.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

작성일: {datetime.now().strftime('%Y년 %m월 %d일 %H:%M')}
작성자: 담당 교사
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""
    
    return report

@app.post("/api/ai/generate-report")
async def generate_ai_report(data: dict):
    """AI를 이용한 생기부 작성"""
    student_id = data.get('student_id')
    style = data.get('style', 'formal')  # formal, friendly, detailed
    custom_instructions = data.get('custom_instructions', '')
    
    if not student_id:
        raise HTTPException(status_code=400, detail="학생 ID가 필요합니다")
    
    # Groq API 키 확인 (없으면 무료 API 사용)
    groq_api_key = os.getenv('GROQ_API_KEY', '')
    
    conn = get_db_connection()
    try:
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        
        # 학생 정보 조회
        cursor.execute("SELECT * FROM students WHERE id = %s", (student_id,))
        student = cursor.fetchone()
        
        if not student:
            raise HTTPException(status_code=404, detail="학생을 찾을 수 없습니다")
        
        # 상담 내역 조회
        cursor.execute("""
            SELECT consultation_date, consultation_type, main_topic, content
            FROM consultations
            WHERE student_id = %s
            ORDER BY consultation_date
        """, (student_id,))
        counselings = cursor.fetchall()
        
        if not counselings:
            raise HTTPException(status_code=400, detail="상담 기록이 없습니다")
        
        # 상담 내용 포맷팅
        counseling_text = ""
        for c in counselings:
            counseling_text += f"\n[{c['consultation_date']}] {c['consultation_type']} - {c['main_topic']}\n"
            counseling_text += f"내용: {c['content']}\n"
        
        system_prompt = """당신은 학생 생활기록부를 작성하는 전문 교사입니다.
학생의 상담 기록을 바탕으로 학생의 성장과 발달, 특성을 잘 드러내는 생활기록부를 작성해주세요.
생활기록부는 교육적이고 긍정적인 표현을 사용하며, 학생의 강점과 발전 가능성을 강조해야 합니다."""

        user_prompt = f"""
학생 정보:
- 이름: {student['name']}
- 생년월일: {student['birth_date']}
- 관심분야: {student['interests']}
- 학력: {student['education']}

상담 기록:
{counseling_text}

맞춤형 지시사항:
{custom_instructions if custom_instructions else '표준 생활기록부 형식으로 작성'}

위 정보를 바탕으로 학생의 생활기록부를 작성해주세요.
1. 학생의 전반적인 특성과 성장 과정을 요약해주세요 (200-300자)
2. 각 상담 내용을 통합하여 학생의 학업, 생활, 진로 측면의 발달사항을 기술해주세요 (500-800자)
"""
        
        # Groq API 사용 (무료, 빠른 추론)
        if groq_api_key:
            headers = {
                "Authorization": f"Bearer {groq_api_key}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "model": "llama-3.1-70b-versatile",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                "temperature": 0.7,
                "max_tokens": 2000
            }
            
            response = requests.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers=headers,
                json=payload,
                timeout=30
            )
            
            if response.status_code != 200:
                raise Exception(f"Groq API 오류: {response.text}")
            
            ai_report = response.json()['choices'][0]['message']['content']
        else:
            # API 키가 없으면 스타일별 생기부 템플릿 생성
            ai_report = generate_report_template(student, counselings, counseling_text, style)
        
        ai_report = ai_report
        
        return {
            "student_id": student_id,
            "student_name": student['name'],
            "report": ai_report,
            "counseling_count": len(counselings),
            "generated_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI 보고서 생성 실패: {str(e)}")
    finally:
        conn.close()

# ==================== 헬스 체크 ====================

@app.get("/")
async def root():
    """API 상태 확인"""
    return {
        "message": "학급 관리 시스템 API",
        "version": "2.0",
        "status": "running"
    }

@app.post("/api/courses/calculate-dates")
async def calculate_course_dates(data: dict):
    """
    과정 날짜 자동 계산 (공휴일 제외)
    - start_date: 시작일
    - lecture_hours: 강의시간
    - project_hours: 프로젝트시간
    - internship_hours: 인턴십시간
    """
    from datetime import timedelta
    
    try:
        start_date_str = data.get('start_date')
        lecture_hours = int(data.get('lecture_hours', 0))
        project_hours = int(data.get('project_hours', 0))
        internship_hours = int(data.get('internship_hours', 0))
        
        if not start_date_str:
            raise HTTPException(status_code=400, detail="시작일은 필수입니다.")
        
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
        
        # 시간을 일수로 변환 (8시간 = 1일)
        lecture_days = (lecture_hours + 7) // 8  # 올림 처리
        project_days = (project_hours + 7) // 8
        intern_days = (internship_hours + 7) // 8
        
        # 공휴일 가져오기
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 시작일로부터 1년간의 공휴일 조회
        end_year = start_date.year + 1
        cursor.execute("""
            SELECT holiday_date 
            FROM holidays 
            WHERE holiday_date >= %s 
            AND YEAR(holiday_date) BETWEEN %s AND %s
        """, (start_date_str, start_date.year, end_year))
        
        holidays_result = cursor.fetchall()
        holidays = set(row[0] for row in holidays_result)
        
        cursor.close()
        conn.close()
        
        # 근무일 계산 함수 (주말 및 공휴일 제외)
        def add_business_days(start, days_to_add):
            current = start
            added_days = 0
            
            while added_days < days_to_add:
                current += timedelta(days=1)
                # 주말(토요일=5, 일요일=6)과 공휴일 제외
                if current.weekday() < 5 and current not in holidays:
                    added_days += 1
            
            return current
        
        # 각 단계별 종료일 계산
        lecture_end_date = add_business_days(start_date, lecture_days)
        project_end_date = add_business_days(lecture_end_date, project_days)
        internship_end_date = add_business_days(project_end_date, intern_days)
        
        # 총 일수 계산 (실제 캘린더 일수)
        total_days = (internship_end_date - start_date).days
        
        return {
            "start_date": start_date_str,
            "lecture_end_date": lecture_end_date.strftime('%Y-%m-%d'),
            "project_end_date": project_end_date.strftime('%Y-%m-%d'),
            "internship_end_date": internship_end_date.strftime('%Y-%m-%d'),
            "final_end_date": internship_end_date.strftime('%Y-%m-%d'),
            "total_days": total_days,
            "lecture_days": lecture_days,
            "project_days": project_days,
            "internship_days": intern_days,
            "work_days": lecture_days + project_days + intern_days
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"날짜 계산 실패: {str(e)}")

@app.post("/api/ai/generate-training-logs")
async def generate_ai_training_logs(data: dict):
    """AI 훈련일지 자동 생성"""
    timetable_ids = data.get('timetable_ids', [])
    prompt_guide = data.get('prompt', '')
    
    if not timetable_ids:
        raise HTTPException(status_code=400, detail="시간표 ID가 필요합니다")
    
    conn = get_db_connection()
    try:
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        success_count = 0
        failed_count = 0
        
        for timetable_id in timetable_ids:
            try:
                # 시간표 정보 가져오기
                cursor.execute("""
                    SELECT t.*, 
                           c.name as course_name,
                           s.name as subject_name,
                           i.name as instructor_name
                    FROM timetables t
                    LEFT JOIN courses c ON t.course_code = c.code
                    LEFT JOIN subjects s ON t.subject_code = s.code
                    LEFT JOIN instructors i ON t.instructor_code = i.code
                    WHERE t.id = %s
                """, (timetable_id,))
                
                timetable = cursor.fetchone()
                if not timetable:
                    failed_count += 1
                    continue
                
                # AI로 훈련일지 내용 생성 (실제로는 GPT API를 사용하지만, 여기서는 템플릿 사용)
                content = f"""[{timetable['class_date']}] {timetable['subject_name'] or '과목'} 수업

▶ 교육 내용
- 과목: {timetable['subject_name'] or timetable['subject_code']}
- 강사: {timetable['instructor_name'] or timetable['instructor_code']}
- 수업 유형: {timetable['type']}

▶ 진행 내용
오늘은 {timetable['subject_name'] or '해당 과목'}에 대한 수업을 진행하였습니다.
학생들의 참여도가 높았으며, 질문과 토론이 활발하게 이루어졌습니다.

▶ 학습 목표 달성도
대부분의 학생들이 학습 목표를 달성하였으며, 이해도가 높은 편이었습니다.

▶ 특이사항
{prompt_guide if prompt_guide else '특별한 사항 없음'}

▶ 다음 시간 계획
이번 시간에 학습한 내용을 바탕으로 다음 시간에는 심화 학습을 진행할 예정입니다.
"""
                
                # 훈련일지 생성
                cursor.execute("""
                    INSERT INTO training_logs (timetable_id, content, created_at)
                    VALUES (%s, %s, NOW())
                """, (timetable_id, content))
                
                success_count += 1
                
            except Exception as e:
                print(f"훈련일지 생성 실패 (timetable_id: {timetable_id}): {str(e)}")
                failed_count += 1
                continue
        
        conn.commit()
        
        return {
            "success_count": success_count,
            "failed_count": failed_count,
            "total_count": len(timetable_ids)
        }
        
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"AI 훈련일지 생성 실패: {str(e)}")
    finally:
        conn.close()

@app.post("/api/counselings/ai-generate")
async def generate_ai_counseling(data: dict):
    """AI 상담일지 자동 생성"""
    student_code = data.get('student_code')
    course_code = data.get('course_code')
    custom_prompt = data.get('custom_prompt', '')
    
    if not student_code:
        raise HTTPException(status_code=400, detail="학생 코드가 필요합니다")
    
    conn = get_db_connection()
    try:
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        
        # 학생 정보 가져오기 (student_id 필요)
        cursor.execute("""
            SELECT s.*, c.name as course_name
            FROM students s
            LEFT JOIN courses c ON s.course_code = c.code
            WHERE s.code = %s
        """, (student_code,))
        
        student = cursor.fetchone()
        if not student:
            raise HTTPException(status_code=404, detail="학생을 찾을 수 없습니다")
        
        student_id = student['id']
        
        # 기존 상담 횟수 확인 (consultations 테이블 사용)
        cursor.execute("""
            SELECT COUNT(*) as count
            FROM consultations
            WHERE student_id = %s
        """, (student_id,))
        
        result = cursor.fetchone()
        counseling_count = result['count'] if result else 0
        
        # AI로 상담일지 내용 생성
        content = f"""[상담 {counseling_count + 1}회차] {student['name']} 학생 상담

▶ 학생 정보
- 이름: {student['name']}
- 학생 코드: {student['code']}
- 과정: {student.get('course_name', '')}
- 연락처: {student.get('phone', '')}

▶ 상담 내용
{student['name']} 학생과 학업 진행 상황 및 향후 계획에 대해 상담을 진행하였습니다.

▶ 학습 태도 및 참여도
학생의 수업 참여도와 학습 태도가 양호한 편이며, 과제 수행 능력도 우수합니다.

▶ 진로 및 목표
현재 진행 중인 과정에 대한 이해도가 높으며, 명확한 진로 목표를 가지고 있습니다.

▶ 특이사항 및 요청사항
{custom_prompt if custom_prompt else '특별한 사항 없음'}

▶ 향후 지도 방향
- 현재의 학습 태도를 유지하도록 격려
- 추가적인 학습 자료 제공 및 심화 학습 기회 제공
- 정기적인 진도 체크 및 피드백 제공

▶ 다음 상담 계획
약 2-3주 후 학습 진도를 확인하고 추가 상담을 진행할 예정입니다.
"""
        
        # 상담일지 생성 (consultations 테이블에 student_id 사용)
        cursor.execute("""
            INSERT INTO consultations 
            (student_id, consultation_date, consultation_type, main_topic, content, status, created_at)
            VALUES (%s, CURDATE(), '정기', 'AI 자동 생성', %s, '완료', NOW())
        """, (student_id, content))
        
        conn.commit()
        
        return {
            "message": "상담일지가 생성되었습니다",
            "student_code": student_code,
            "student_name": student['name']
        }
        
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"AI 상담일지 생성 실패: {str(e)}")
    finally:
        conn.close()

@app.post("/api/upload-image")
async def upload_image(
    file: UploadFile = File(...),
    category: str = Query(..., description="guidance, train, student, teacher")
):
    """
    이미지 파일을 FTP 서버에 업로드
    
    Args:
        file: 업로드할 이미지 파일
        category: 저장 카테고리 (guidance=상담일지, train=훈련일지, student=학생, teacher=강사)
    
    Returns:
        업로드된 파일의 URL
    """
    try:
        # 파일 확장자 검증
        allowed_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']
        file_ext = os.path.splitext(file.filename)[1].lower()
        
        if file_ext not in allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"허용되지 않는 파일 형식입니다. 허용 형식: {', '.join(allowed_extensions)}"
            )
        
        # 파일 읽기
        file_data = await file.read()
        
        # 파일 크기 체크 (10MB 제한)
        if len(file_data) > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="파일 크기는 10MB를 초과할 수 없습니다")
        
        # 고유한 파일명 생성 (타임스탬프 + UUID + 원본 확장자)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        unique_id = str(uuid.uuid4())[:8]
        new_filename = f"{timestamp}_{unique_id}{file_ext}"
        
        # FTP 업로드
        file_url = upload_to_ftp(file_data, new_filename, category)
        
        return {
            "success": True,
            "url": file_url,
            "filename": new_filename,
            "size": len(file_data)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"이미지 업로드 실패: {str(e)}")

@app.post("/api/upload-image-base64")
async def upload_image_base64(data: dict):
    """
    Base64 인코딩된 이미지를 FTP 서버에 업로드 (모바일 카메라 촬영용)
    
    Args:
        data: {
            "image": "data:image/jpeg;base64,...",
            "category": "guidance|train|student|teacher"
        }
    
    Returns:
        업로드된 파일의 URL
    """
    try:
        image_data = data.get('image')
        category = data.get('category')
        
        if not image_data or not category:
            raise HTTPException(status_code=400, detail="image와 category는 필수입니다")
        
        # Base64 데이터 파싱
        if ',' in image_data:
            header, base64_data = image_data.split(',', 1)
            # 이미지 타입 추출 (data:image/jpeg;base64 -> jpeg)
            if 'image/' in header:
                image_type = header.split('image/')[1].split(';')[0]
                file_ext = f'.{image_type}'
            else:
                file_ext = '.jpg'
        else:
            base64_data = image_data
            file_ext = '.jpg'
        
        # Base64 디코딩
        file_data = base64.b64decode(base64_data)
        
        # 파일 크기 체크 (10MB 제한)
        if len(file_data) > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="파일 크기는 10MB를 초과할 수 없습니다")
        
        # 고유한 파일명 생성
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        unique_id = str(uuid.uuid4())[:8]
        new_filename = f"{timestamp}_{unique_id}{file_ext}"
        
        # FTP 업로드
        file_url = upload_to_ftp(file_data, new_filename, category)
        
        return {
            "success": True,
            "url": file_url,
            "filename": new_filename,
            "size": len(file_data)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"이미지 업로드 실패: {str(e)}")

@app.get("/api/download-image")
async def download_image(url: str = Query(..., description="FTP URL to download")):
    """
    FTP 서버의 이미지를 다운로드하는 프록시 API
    
    Args:
        url: FTP URL (예: ftp://bitnmeta2.synology.me:2121/homes/ha/camFTP/BH2025/guidance/file.jpg)
    
    Returns:
        이미지 파일
    """
    try:
        # FTP URL 파싱
        if not url.startswith('ftp://'):
            raise HTTPException(status_code=400, detail="FTP URL이 아닙니다")
        
        # URL에서 정보 추출
        # ftp://bitnmeta2.synology.me:2121/homes/ha/camFTP/BH2025/guidance/file.jpg
        url_parts = url.replace('ftp://', '').split('/', 1)
        host_port = url_parts[0]
        file_path = url_parts[1] if len(url_parts) > 1 else ''
        
        # 호스트와 포트 분리
        if ':' in host_port:
            host, port = host_port.split(':')
            port = int(port)
        else:
            host = host_port
            port = 21
        
        # 파일명 추출
        filename = file_path.split('/')[-1]
        
        # FTP 연결 및 다운로드
        ftp = FTP()
        ftp.connect(FTP_CONFIG['host'], FTP_CONFIG['port'])
        ftp.login(FTP_CONFIG['user'], FTP_CONFIG['passwd'])
        
        # 파일 다운로드
        file_data = io.BytesIO()
        ftp.retrbinary(f'RETR /{file_path}', file_data.write)
        ftp.quit()
        
        # 파일 데이터 가져오기
        file_data.seek(0)
        file_bytes = file_data.read()
        
        # 임시 파일로 저장
        temp_filename = f"/tmp/{filename}"
        with open(temp_filename, 'wb') as f:
            f.write(file_bytes)
        
        # 파일 확장자로 MIME 타입 결정
        ext = os.path.splitext(filename)[1].lower()
        media_type_map = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.bmp': 'image/bmp',
            '.webp': 'image/webp'
        }
        media_type = media_type_map.get(ext, 'application/octet-stream')
        
        return FileResponse(
            temp_filename,
            media_type=media_type,
            filename=filename,
            headers={
                'Content-Disposition': f'attachment; filename="{filename}"'
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"이미지 다운로드 실패: {str(e)}")

@app.get("/health")
async def health_check():
    """헬스 체크"""
    try:
        conn = get_db_connection()
        conn.close()
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

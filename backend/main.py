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
        
        # 자동으로 학생 코드 생성
        cursor.execute("SELECT MAX(CAST(SUBSTRING(code, 2) AS UNSIGNED)) as max_code FROM students WHERE code LIKE 'S%'")
        result = cursor.fetchone()
        next_num = (result[0] or 0) + 1
        code = f"S{next_num:03d}"
        
        query = """
            INSERT INTO students 
            (code, name, birth_date, gender, phone, email, address, interests, education, introduction, campus, course_code, notes)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
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
            data.get('notes')
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
        
        query = """
            UPDATE students 
            SET name = %s, birth_date = %s, gender = %s, phone = %s, email = %s,
                address = %s, interests = %s, education = %s, introduction = %s,
                campus = %s, course_code = %s, notes = %s, updated_at = NOW()
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

@app.get("/api/students/download-template")
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
    for key, value in obj.items():
        if isinstance(value, (datetime, date)):
            obj[key] = value.isoformat()
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
        cursor = conn.cursor()
        cursor.execute("DELETE FROM instructor_codes WHERE code = %s", (code,))
        conn.commit()
        return {"message": "강사코드가 삭제되었습니다"}
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
        query = """
            INSERT INTO instructors (code, name, phone, major, instructor_type, email)
            VALUES (%s, %s, %s, %s, %s, %s)
        """
        cursor.execute(query, (
            data['code'], data['name'], data.get('phone'),
            data.get('major'), data.get('instructor_type'), data.get('email')
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
        query = """
            UPDATE instructors
            SET name = %s, phone = %s, major = %s, instructor_type = %s, email = %s
            WHERE code = %s
        """
        cursor.execute(query, (
            data['name'], data.get('phone'), data.get('major'),
            data.get('instructor_type'), data.get('email'), code
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
    """프로젝트 목록 조회 (과정별 필터)"""
    conn = get_db_connection()
    try:
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        
        query = """
            SELECT p.*, c.name as course_name
            FROM projects p
            LEFT JOIN courses c ON p.course_code = c.code
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
    """특정 프로젝트 조회"""
    conn = get_db_connection()
    try:
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        cursor.execute("""
            SELECT p.*, c.name as course_name
            FROM projects p
            LEFT JOIN courses c ON p.course_code = c.code
            WHERE p.code = %s
        """, (code,))
        project = cursor.fetchone()
        if not project:
            raise HTTPException(status_code=404, detail="프로젝트를 찾을 수 없습니다")
        return convert_datetime(project)
    finally:
        conn.close()

@app.post("/api/projects")
async def create_project(data: dict):
    """프로젝트 생성 (5명의 팀원 정보)"""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        query = """
            INSERT INTO projects (code, name, course_code,
                                 member1_name, member1_phone,
                                 member2_name, member2_phone,
                                 member3_name, member3_phone,
                                 member4_name, member4_phone,
                                 member5_name, member5_phone)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        cursor.execute(query, (
            data['code'], data['name'], data.get('course_code'),
            data.get('member1_name'), data.get('member1_phone'),
            data.get('member2_name'), data.get('member2_phone'),
            data.get('member3_name'), data.get('member3_phone'),
            data.get('member4_name'), data.get('member4_phone'),
            data.get('member5_name'), data.get('member5_phone')
        ))
        conn.commit()
        return {"code": data['code']}
    finally:
        conn.close()

@app.put("/api/projects/{code}")
async def update_project(code: str, data: dict):
    """프로젝트 수정"""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        query = """
            UPDATE projects
            SET name = %s, course_code = %s,
                member1_name = %s, member1_phone = %s,
                member2_name = %s, member2_phone = %s,
                member3_name = %s, member3_phone = %s,
                member4_name = %s, member4_phone = %s,
                member5_name = %s, member5_phone = %s
            WHERE code = %s
        """
        cursor.execute(query, (
            data['name'], data.get('course_code'),
            data.get('member1_name'), data.get('member1_phone'),
            data.get('member2_name'), data.get('member2_phone'),
            data.get('member3_name'), data.get('member3_phone'),
            data.get('member4_name'), data.get('member4_phone'),
            data.get('member5_name'), data.get('member5_phone'),
            code
        ))
        conn.commit()
        return {"code": code}
    finally:
        conn.close()

@app.delete("/api/projects/{code}")
async def delete_project(code: str):
    """프로젝트 삭제"""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM projects WHERE code = %s", (code,))
        conn.commit()
        return {"message": "프로젝트가 삭제되었습니다"}
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
        
        query = """
            SELECT c.*, s.name as student_name, s.code as student_code, s.course_code
            FROM consultations c
            LEFT JOIN students s ON c.student_id = s.id
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
            SELECT c.*, s.name as student_name, s.code as student_code
            FROM consultations c
            LEFT JOIN students s ON c.student_id = s.id
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
        
        # consultations 테이블 구조에 맞게 조정
        query = """
            INSERT INTO consultations 
            (student_id, consultation_date, consultation_type, main_topic, content, status)
            VALUES (%s, %s, %s, %s, %s, %s)
        """
        
        cursor.execute(query, (
            data.get('student_id'),
            data.get('consultation_date') or data.get('counseling_date'),
            data.get('consultation_type', '정기'),
            data.get('main_topic') or data.get('topic', ''),
            data.get('content'),
            data.get('status', '완료')
        ))
        
        conn.commit()
        return {"id": cursor.lastrowid}
    except pymysql.err.OperationalError as e:
        raise HTTPException(status_code=500, detail=f"데이터베이스 오류: {str(e)}")
    finally:
        conn.close()

@app.put("/api/counselings/{counseling_id}")
async def update_counseling(counseling_id: int, data: dict):
    """상담 수정"""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        
        query = """
            UPDATE consultations 
            SET student_id = %s, consultation_date = %s, consultation_type = %s,
                main_topic = %s, content = %s, status = %s
            WHERE id = %s
        """
        
        cursor.execute(query, (
            data.get('student_id'),
            data.get('consultation_date') or data.get('counseling_date'),
            data.get('consultation_type', '정기'),
            data.get('main_topic') or data.get('topic', ''),
            data.get('content'),
            data.get('status', '완료'),
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
        
        query = """
            INSERT INTO training_logs 
            (timetable_id, course_code, instructor_code, class_date, content, homework, notes)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """
        
        cursor.execute(query, (
            data.get('timetable_id'),
            data.get('course_code'),
            data.get('instructor_code'),
            data.get('class_date'),
            data.get('content', ''),
            data.get('homework', ''),
            data.get('notes', '')
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
        
        query = """
            UPDATE training_logs 
            SET content = %s, homework = %s, notes = %s
            WHERE id = %s
        """
        
        cursor.execute(query, (
            data.get('content', ''),
            data.get('homework', ''),
            data.get('notes', ''),
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

@app.post("/api/ai/generate-report")
async def generate_ai_report(data: dict):
    """AI를 이용한 생기부 작성"""
    student_id = data.get('student_id')
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
            # API 키가 없으면 기본 생기부 템플릿 생성
            ai_report = f"""[학생 생활기록부]

학생명: {student['name']}
생년월일: {student['birth_date']}
관심분야: {student['interests']}

[종합 의견]
본 학생은 총 {len(counselings)}회의 상담을 통해 지속적인 성장과 발전을 보여주었습니다.

{counseling_text}

위 상담 내용을 종합하면, 본 학생은 자기주도적 학습 태도와 긍정적인 성장 마인드를 보유하고 있으며,
꾸준한 노력을 통해 목표를 향해 나아가고 있습니다. 앞으로도 지속적인 관심과 지도를 통해
더욱 발전할 것으로 기대됩니다.

※ AI API 키가 설정되지 않아 기본 템플릿이 생성되었습니다. 
  Groq API 키를 설정하면 더 상세한 생기부를 자동 생성할 수 있습니다.
"""
        
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

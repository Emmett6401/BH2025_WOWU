// API 베이스 URL
const API_BASE_URL = 'https://8000-i3oloko346uog7d7oo8v5-3844e1b6.sandbox.novita.ai';

// 전역 상태
let currentTab = 'students';
let students = [];
let subjects = [];
let instructors = [];
let counselings = [];

// 초기화
document.addEventListener('DOMContentLoaded', () => {
    console.log('App initialized');
    loadStudents();
    showTab('students');
});

// 탭 전환
window.showTab = function(tab) {
    console.log('Switching to tab:', tab);
    currentTab = tab;
    
    // 탭 버튼 활성화 상태 변경
    document.querySelectorAll('.tab-btn').forEach(btn => {
        const isActive = btn.getAttribute('data-tab') === tab;
        if (isActive) {
            btn.className = 'tab-btn px-4 py-3 text-sm font-semibold text-blue-600 bg-blue-50 border-b-2 border-blue-600 rounded';
        } else {
            btn.className = 'tab-btn px-4 py-3 text-sm font-semibold text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded';
        }
    });
    
    // 해당 탭 콘텐츠 로드
    switch(tab) {
        case 'instructor-codes':
            loadInstructorCodes();
            break;
        case 'instructors':
            loadInstructors();
            break;
        case 'subjects':
            loadSubjects();
            break;
        case 'holidays':
            loadHolidays();
            break;
        case 'courses':
            loadCourses();
            break;
        case 'students':
            loadStudents();
            break;
        case 'counselings':
            loadCounselings();
            break;
        case 'projects':
            loadProjects();
            break;
        case 'timetables':
            loadTimetables();
            break;
        case 'ai-report':
            renderAIReport();
            break;
    }
}

// ==================== 학생 관리 ====================
async function loadStudents() {
    try {
        console.log('Loading students...');
        const response = await axios.get(`${API_BASE_URL}/api/students`);
        students = response.data;
        console.log('Students loaded:', students.length);
        renderStudents();
    } catch (error) {
        console.error('학생 목록 로드 실패:', error);
        document.getElementById('app').innerHTML = '<div class="text-red-600 p-4">학생 목록을 불러오는데 실패했습니다: ' + error.message + '</div>';
    }
}

function renderStudents() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="bg-white rounded-lg shadow-md p-6">
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-2xl font-bold text-gray-800">
                    <i class="fas fa-user-graduate mr-2"></i>학생 목록 (총 ${students.length}명)
                </h2>
                <div class="space-x-2">
                    <button onclick="window.showStudentForm()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
                        <i class="fas fa-plus mr-2"></i>학생 추가
                    </button>
                    <button onclick="window.downloadTemplate()" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg">
                        <i class="fas fa-download mr-2"></i>Excel 템플릿
                    </button>
                    <button onclick="window.showExcelUpload()" class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg">
                        <i class="fas fa-file-excel mr-2"></i>Excel 업로드
                    </button>
                </div>
            </div>
            
            <div id="student-form" class="hidden mb-6 p-4 bg-gray-50 rounded-lg"></div>
            <div id="excel-upload" class="hidden mb-6 p-4 bg-purple-50 rounded-lg"></div>
            
            <div class="overflow-x-auto">
                <table class="min-w-full bg-white">
                    <thead class="bg-gray-100">
                        <tr>
                            <th class="px-4 py-2 text-left">학생코드</th>
                            <th class="px-4 py-2 text-left">이름</th>
                            <th class="px-4 py-2 text-left">생년월일</th>
                            <th class="px-4 py-2 text-left">성별</th>
                            <th class="px-4 py-2 text-left">연락처</th>
                            <th class="px-4 py-2 text-left">이메일</th>
                            <th class="px-4 py-2 text-left">캠퍼스</th>
                            <th class="px-4 py-2 text-left">작업</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${students.map(student => `
                            <tr class="border-b hover:bg-gray-50">
                                <td class="px-4 py-2 font-mono">${student.code}</td>
                                <td class="px-4 py-2 font-semibold">${student.name}</td>
                                <td class="px-4 py-2">${student.birth_date || '-'}</td>
                                <td class="px-4 py-2">${student.gender || '-'}</td>
                                <td class="px-4 py-2">${student.phone || '-'}</td>
                                <td class="px-4 py-2">${student.email || '-'}</td>
                                <td class="px-4 py-2">${student.campus || '-'}</td>
                                <td class="px-4 py-2">
                                    <button onclick="window.viewStudent(${student.id})" class="text-blue-600 hover:text-blue-800 mr-2" title="상세보기">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                    <button onclick="window.editStudent(${student.id})" class="text-green-600 hover:text-green-800 mr-2" title="수정">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button onclick="window.deleteStudent(${student.id})" class="text-red-600 hover:text-red-800" title="삭제">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

window.downloadTemplate = async function() {
    window.open(`${API_BASE_URL}/api/students/download-template`, '_blank');
}

window.showExcelUpload = function() {
    const div = document.getElementById('excel-upload');
    div.innerHTML = `
        <h3 class="text-lg font-bold mb-4">Excel 파일 일괄 업로드</h3>
        <div class="space-y-4">
            <div>
                <label class="block text-gray-700 mb-2">Excel 파일 선택</label>
                <input type="file" id="excel-file" accept=".xlsx,.xls" class="w-full px-3 py-2 border rounded-lg">
            </div>
            <div class="space-x-2">
                <button onclick="window.uploadExcel()" class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg">
                    <i class="fas fa-upload mr-2"></i>업로드
                </button>
                <button onclick="window.hideExcelUpload()" class="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded-lg">
                    취소
                </button>
            </div>
        </div>
    `;
    div.classList.remove('hidden');
}

window.hideExcelUpload = function() {
    document.getElementById('excel-upload').classList.add('hidden');
}

window.uploadExcel = async function() {
    const fileInput = document.getElementById('excel-file');
    if (!fileInput.files[0]) {
        alert('파일을 선택해주세요');
        return;
    }
    
    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    
    try {
        const response = await axios.post(`${API_BASE_URL}/api/students/upload-excel`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        
        alert(response.data.message);
        if (response.data.errors.length > 0) {
            console.log('업로드 오류:', response.data.errors);
        }
        window.hideExcelUpload();
        loadStudents();
    } catch (error) {
        console.error('Excel 업로드 실패:', error);
        alert('Excel 파일 업로드에 실패했습니다: ' + (error.response?.data?.detail || error.message));
    }
}

window.showStudentForm = function(studentId = null) {
    const student = studentId ? students.find(s => s.id === studentId) : null;
    const formDiv = document.getElementById('student-form');
    
    formDiv.innerHTML = `
        <h3 class="text-lg font-bold mb-4">${student ? '학생 정보 수정' : '새 학생 추가'}</h3>
        <form id="student-save-form">
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-gray-700 mb-2">이름</label>
                    <input type="text" name="name" value="${student?.name || ''}" required 
                           class="w-full px-3 py-2 border rounded-lg">
                </div>
                <div>
                    <label class="block text-gray-700 mb-2">생년월일 (YY.MM.DD)</label>
                    <input type="text" name="birth_date" value="${student?.birth_date || ''}" 
                           placeholder="99.02.25"
                           class="w-full px-3 py-2 border rounded-lg">
                </div>
                <div>
                    <label class="block text-gray-700 mb-2">성별</label>
                    <select name="gender" class="w-full px-3 py-2 border rounded-lg">
                        <option value="">선택</option>
                        <option value="남자" ${student?.gender === '남자' ? 'selected' : ''}>남자</option>
                        <option value="여자" ${student?.gender === '여자' ? 'selected' : ''}>여자</option>
                    </select>
                </div>
                <div>
                    <label class="block text-gray-700 mb-2">연락처</label>
                    <input type="tel" name="phone" value="${student?.phone || ''}" required 
                           class="w-full px-3 py-2 border rounded-lg">
                </div>
                <div class="col-span-2">
                    <label class="block text-gray-700 mb-2">이메일</label>
                    <input type="email" name="email" value="${student?.email || ''}" 
                           class="w-full px-3 py-2 border rounded-lg">
                </div>
                <div class="col-span-2">
                    <label class="block text-gray-700 mb-2">주소</label>
                    <input type="text" name="address" value="${student?.address || ''}" 
                           class="w-full px-3 py-2 border rounded-lg">
                </div>
                <div>
                    <label class="block text-gray-700 mb-2">관심분야</label>
                    <input type="text" name="interests" value="${student?.interests || ''}" 
                           placeholder="로봇, AI"
                           class="w-full px-3 py-2 border rounded-lg">
                </div>
                <div>
                    <label class="block text-gray-700 mb-2">캠퍼스</label>
                    <input type="text" name="campus" value="${student?.campus || ''}" 
                           class="w-full px-3 py-2 border rounded-lg">
                </div>
                <div class="col-span-2">
                    <label class="block text-gray-700 mb-2">학력</label>
                    <input type="text" name="education" value="${student?.education || ''}" 
                           placeholder="대학교/학년/학과"
                           class="w-full px-3 py-2 border rounded-lg">
                </div>
                <div class="col-span-2">
                    <label class="block text-gray-700 mb-2">자기소개</label>
                    <textarea name="introduction" rows="3" class="w-full px-3 py-2 border rounded-lg">${student?.introduction || ''}</textarea>
                </div>
                <div class="col-span-2">
                    <label class="block text-gray-700 mb-2">비고</label>
                    <textarea name="notes" rows="2" class="w-full px-3 py-2 border rounded-lg">${student?.notes || ''}</textarea>
                </div>
            </div>
            <div class="mt-4 space-x-2">
                <button type="button" onclick="window.saveStudent(${studentId})" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
                    <i class="fas fa-save mr-2"></i>저장
                </button>
                <button type="button" onclick="window.hideStudentForm()" class="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded-lg">
                    취소
                </button>
            </div>
        </form>
    `;
    
    formDiv.classList.remove('hidden');
}

window.hideStudentForm = function() {
    document.getElementById('student-form').classList.add('hidden');
}

window.saveStudent = async function(studentId) {
    const form = document.getElementById('student-save-form');
    const formData = new FormData(form);
    const data = {
        name: formData.get('name'),
        birth_date: formData.get('birth_date'),
        gender: formData.get('gender'),
        phone: formData.get('phone'),
        email: formData.get('email'),
        address: formData.get('address'),
        interests: formData.get('interests'),
        education: formData.get('education'),
        introduction: formData.get('introduction'),
        campus: formData.get('campus'),
        notes: formData.get('notes')
    };
    
    try {
        if (studentId) {
            await axios.put(`${API_BASE_URL}/api/students/${studentId}`, data);
        } else {
            await axios.post(`${API_BASE_URL}/api/students`, data);
        }
        window.hideStudentForm();
        loadStudents();
    } catch (error) {
        console.error('학생 저장 실패:', error);
        alert('학생 저장에 실패했습니다: ' + (error.response?.data?.detail || error.message));
    }
}

window.editStudent = function(id) {
    window.showStudentForm(id);
}

window.viewStudent = async function(id) {
    try {
        const response = await axios.get(`${API_BASE_URL}/api/students/${id}`);
        const student = response.data;
        
        const info = '학생 정보\n\n' +
            '이름: ' + student.name + '\n' +
            '생년월일: ' + student.birth_date + '\n' +
            '성별: ' + student.gender + '\n' +
            '연락처: ' + student.phone + '\n' +
            '이메일: ' + student.email + '\n' +
            '주소: ' + (student.address || '-') + '\n' +
            '관심분야: ' + (student.interests || '-') + '\n' +
            '학력: ' + (student.education || '-') + '\n' +
            '자기소개: ' + (student.introduction || '-') + '\n' +
            '캠퍼스: ' + (student.campus || '-') + '\n' +
            '비고: ' + (student.notes || '-');
        
        alert(info);
    } catch (error) {
        alert('학생 정보를 불러오는데 실패했습니다');
    }
}

window.deleteStudent = async function(id) {
    if (!confirm('정말 이 학생을 삭제하시겠습니까?')) return;
    
    try {
        await axios.delete(`${API_BASE_URL}/api/students/${id}`);
        loadStudents();
    } catch (error) {
        alert('학생 삭제에 실패했습니다');
    }
}

// ==================== 과목 관리 ====================
async function loadSubjects() {
    try {
        const [subjectsRes, instructorsRes] = await Promise.all([
            axios.get(`${API_BASE_URL}/api/subjects`),
            axios.get(`${API_BASE_URL}/api/instructors`)
        ]);
        subjects = subjectsRes.data;
        instructors = instructorsRes.data;
        renderSubjects();
    } catch (error) {
        console.error('과목 목록 로드 실패:', error);
        document.getElementById('app').innerHTML = '<div class="text-red-600 p-4">과목 목록을 불러오는데 실패했습니다.</div>';
    }
}

function renderSubjects() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="bg-white rounded-lg shadow-md p-6">
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-2xl font-bold text-gray-800">
                    <i class="fas fa-book mr-2"></i>과목 목록 (총 ${subjects.length}개)
                </h2>
                <button onclick="alert('과목 추가 기능 준비 중')" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
                    <i class="fas fa-plus mr-2"></i>과목 추가
                </button>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                ${subjects.map(subject => `
                    <div class="border rounded-lg p-4 hover:shadow-lg transition-shadow">
                        <h3 class="text-xl font-bold text-blue-600">${subject.name}</h3>
                        <p class="text-gray-600 text-sm mt-1">
                            <i class="fas fa-user-tie mr-1"></i>${subject.instructor_name || '미정'}
                        </p>
                        <div class="text-sm text-gray-600 space-y-1 mt-2">
                            <p><i class="fas fa-calendar mr-2"></i>강의요일: ${subject.lecture_days || '미정'}</p>
                            <p><i class="fas fa-repeat mr-2"></i>빈도: ${subject.frequency || '매주'}</p>
                            <p><i class="fas fa-clock mr-2"></i>강의시수: ${subject.lecture_hours || 0}시간</p>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// ==================== 상담 관리 ====================
async function loadCounselings() {
    try {
        const [counselingsRes, studentsRes] = await Promise.all([
            axios.get(`${API_BASE_URL}/api/counselings`),
            axios.get(`${API_BASE_URL}/api/students`)
        ]);
        counselings = counselingsRes.data;
        students = studentsRes.data;
        renderCounselings();
    } catch (error) {
        console.error('상담 목록 로드 실패:', error);
        document.getElementById('app').innerHTML = '<div class="text-red-600 p-4">상담 목록을 불러오는데 실패했습니다.</div>';
    }
}

function renderCounselings() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="bg-white rounded-lg shadow-md p-6">
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-2xl font-bold text-gray-800">
                    <i class="fas fa-comments mr-2"></i>상담 목록 (총 ${counselings.length}건)
                </h2>
                <button onclick="alert('상담 추가 기능 준비 중')" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
                    <i class="fas fa-plus mr-2"></i>상담 추가
                </button>
            </div>
            
            <div class="space-y-4">
                ${counselings.map(counseling => `
                    <div class="border rounded-lg p-4 hover:shadow-lg transition-shadow">
                        <h3 class="text-xl font-bold text-blue-600">${counseling.topic || counseling.main_topic || '상담'}</h3>
                        <p class="text-gray-600">
                            <i class="fas fa-user mr-2"></i>${counseling.student_name} (${counseling.student_code}) | 
                            ${counseling.counseling_date?.substring(0, 10) || counseling.consultation_date?.substring(0, 10)}
                        </p>
                        <div class="text-gray-700 mt-2">
                            <p><strong>상담 내용:</strong> ${counseling.content || '-'}</p>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// ==================== AI 생기부 ====================
function renderAIReport() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="bg-white rounded-lg shadow-md p-6">
            <h2 class="text-2xl font-bold text-gray-800 mb-6">
                <i class="fas fa-robot mr-2"></i>AI 생활기록부 작성
            </h2>
            
            <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
                <p class="text-yellow-700">
                    <i class="fas fa-exclamation-triangle mr-2"></i>
                    OpenAI API 키가 필요합니다. .env 파일에 OPENAI_API_KEY를 설정해주세요.
                </p>
            </div>
            
            <p class="text-gray-600">AI 생기부 작성 기능 준비 중입니다.</p>
        </div>
    `;
}

// ==================== 강사코드 관리 ====================
let instructorCodes = [];

async function loadInstructorCodes() {
    try {
        const response = await axios.get(`${API_BASE_URL}/api/instructor-codes`);
        instructorCodes = response.data;
        renderInstructorCodes();
    } catch (error) {
        console.error('강사코드 목록 로드 실패:', error);
        document.getElementById('app').innerHTML = '<div class="text-red-600 p-4">강사코드 목록을 불러오는데 실패했습니다.</div>';
    }
}

function renderInstructorCodes() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="bg-white rounded-lg shadow-md p-6">
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-2xl font-bold text-gray-800">
                    <i class="fas fa-code mr-2"></i>강사코드 관리 (총 ${instructorCodes.length}개)
                </h2>
                <button onclick="window.showInstructorCodeForm()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
                    <i class="fas fa-plus mr-2"></i>강사코드 추가
                </button>
            </div>
            
            <div id="instructor-code-form" class="hidden mb-6 p-4 bg-gray-50 rounded-lg"></div>
            
            <div class="overflow-x-auto">
                <table class="min-w-full bg-white">
                    <thead class="bg-gray-100">
                        <tr>
                            <th class="px-4 py-2 text-left">코드</th>
                            <th class="px-4 py-2 text-left">이름</th>
                            <th class="px-4 py-2 text-left">타입</th>
                            <th class="px-4 py-2 text-left">작업</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${instructorCodes.map(code => `
                            <tr class="border-t hover:bg-gray-50">
                                <td class="px-4 py-2">${code.code}</td>
                                <td class="px-4 py-2">${code.name}</td>
                                <td class="px-4 py-2">${code.type}</td>
                                <td class="px-4 py-2">
                                    <button onclick="window.editInstructorCode('${code.code}')" class="text-blue-600 hover:text-blue-800 mr-2">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button onclick="window.deleteInstructorCode('${code.code}')" class="text-red-600 hover:text-red-800">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

window.showInstructorCodeForm = function(code = null) {
    const formDiv = document.getElementById('instructor-code-form');
    formDiv.classList.remove('hidden');
    
    const existingCode = code ? instructorCodes.find(c => c.code === code) : null;
    
    formDiv.innerHTML = `
        <h3 class="text-lg font-semibold mb-4">${code ? '강사코드 수정' : '강사코드 추가'}</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input type="text" id="code" placeholder="코드 (예: IC-001)" value="${existingCode ? existingCode.code : ''}" ${code ? 'readonly' : ''} class="border rounded px-3 py-2">
            <input type="text" id="name" placeholder="이름" value="${existingCode ? existingCode.name : ''}" class="border rounded px-3 py-2">
            <input type="text" id="type" placeholder="타입 (예: 1. 주강사)" value="${existingCode ? existingCode.type : ''}" class="border rounded px-3 py-2">
        </div>
        <div class="mt-4 space-x-2">
            <button onclick="window.saveInstructorCode('${code || ''}')" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
                <i class="fas fa-save mr-2"></i>저장
            </button>
            <button onclick="window.hideInstructorCodeForm()" class="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded">
                취소
            </button>
        </div>
    `;
}

window.hideInstructorCodeForm = function() {
    document.getElementById('instructor-code-form').classList.add('hidden');
}

window.saveInstructorCode = async function(existingCode) {
    const data = {
        code: document.getElementById('code').value,
        name: document.getElementById('name').value,
        type: document.getElementById('type').value
    };
    
    try {
        if (existingCode) {
            await axios.put(`${API_BASE_URL}/api/instructor-codes/${existingCode}`, data);
            alert('강사코드가 수정되었습니다.');
        } else {
            await axios.post(`${API_BASE_URL}/api/instructor-codes`, data);
            alert('강사코드가 추가되었습니다.');
        }
        window.hideInstructorCodeForm();
        loadInstructorCodes();
    } catch (error) {
        alert('저장 실패: ' + error.response?.data?.detail || error.message);
    }
}

window.editInstructorCode = function(code) {
    window.showInstructorCodeForm(code);
}

window.deleteInstructorCode = async function(code) {
    if (!confirm('이 강사코드를 삭제하시겠습니까?')) return;
    
    try {
        await axios.delete(`${API_BASE_URL}/api/instructor-codes/${code}`);
        alert('강사코드가 삭제되었습니다.');
        loadInstructorCodes();
    } catch (error) {
        alert('삭제 실패: ' + error.response?.data?.detail || error.message);
    }
}

// ==================== 강사 관리 (확장) ====================
async function loadInstructors() {
    try {
        const response = await axios.get(`${API_BASE_URL}/api/instructors`);
        instructors = response.data;
        renderInstructors();
    } catch (error) {
        console.error('강사 목록 로드 실패:', error);
        document.getElementById('app').innerHTML = '<div class="text-red-600 p-4">강사 목록을 불러오는데 실패했습니다.</div>';
    }
}

function renderInstructors() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="bg-white rounded-lg shadow-md p-6">
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-2xl font-bold text-gray-800">
                    <i class="fas fa-chalkboard-teacher mr-2"></i>강사 관리 (총 ${instructors.length}명)
                </h2>
                <div class="space-x-2">
                    <input type="text" id="instructor-search" placeholder="검색..." class="border rounded px-3 py-2" onkeyup="window.searchInstructors()">
                    <button onclick="window.showInstructorForm()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
                        <i class="fas fa-plus mr-2"></i>강사 추가
                    </button>
                </div>
            </div>
            
            <div id="instructor-form" class="hidden mb-6 p-4 bg-gray-50 rounded-lg"></div>
            
            <div class="overflow-x-auto">
                <table class="min-w-full bg-white">
                    <thead class="bg-gray-100">
                        <tr>
                            <th class="px-4 py-2 text-left">강사코드</th>
                            <th class="px-4 py-2 text-left">이름</th>
                            <th class="px-4 py-2 text-left">전공</th>
                            <th class="px-4 py-2 text-left">타입</th>
                            <th class="px-4 py-2 text-left">연락처</th>
                            <th class="px-4 py-2 text-left">이메일</th>
                            <th class="px-4 py-2 text-left">작업</th>
                        </tr>
                    </thead>
                    <tbody id="instructor-list">
                        ${instructors.map(inst => `
                            <tr class="border-t hover:bg-gray-50">
                                <td class="px-4 py-2">${inst.code}</td>
                                <td class="px-4 py-2">${inst.name}</td>
                                <td class="px-4 py-2">${inst.major || ''}</td>
                                <td class="px-4 py-2">${inst.type_name || ''}</td>
                                <td class="px-4 py-2">${inst.phone || ''}</td>
                                <td class="px-4 py-2">${inst.email || ''}</td>
                                <td class="px-4 py-2">
                                    <button onclick="window.editInstructor('${inst.code}')" class="text-blue-600 hover:text-blue-800 mr-2">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button onclick="window.deleteInstructor('${inst.code}')" class="text-red-600 hover:text-red-800">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

window.searchInstructors = async function() {
    const search = document.getElementById('instructor-search').value;
    try {
        const response = await axios.get(`${API_BASE_URL}/api/instructors?search=${search}`);
        instructors = response.data;
        
        const tbody = document.getElementById('instructor-list');
        tbody.innerHTML = instructors.map(inst => `
            <tr class="border-t hover:bg-gray-50">
                <td class="px-4 py-2">${inst.code}</td>
                <td class="px-4 py-2">${inst.name}</td>
                <td class="px-4 py-2">${inst.major || ''}</td>
                <td class="px-4 py-2">${inst.type_name || ''}</td>
                <td class="px-4 py-2">${inst.phone || ''}</td>
                <td class="px-4 py-2">${inst.email || ''}</td>
                <td class="px-4 py-2">
                    <button onclick="window.editInstructor('${inst.code}')" class="text-blue-600 hover:text-blue-800 mr-2">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="window.deleteInstructor('${inst.code}')" class="text-red-600 hover:text-red-800">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('검색 실패:', error);
    }
}

window.showInstructorForm = function(code = null) {
    const formDiv = document.getElementById('instructor-form');
    formDiv.classList.remove('hidden');
    
    const existingInst = code ? instructors.find(i => i.code === code) : null;
    
    formDiv.innerHTML = `
        <h3 class="text-lg font-semibold mb-4">${code ? '강사 수정' : '강사 추가'}</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input type="text" id="inst-code" placeholder="강사코드" value="${existingInst ? existingInst.code : ''}" ${code ? 'readonly' : ''} class="border rounded px-3 py-2">
            <input type="text" id="inst-name" placeholder="이름" value="${existingInst ? existingInst.name : ''}" class="border rounded px-3 py-2">
            <input type="text" id="inst-major" placeholder="전공" value="${existingInst ? existingInst.major || '' : ''}" class="border rounded px-3 py-2">
            <input type="text" id="inst-type" placeholder="강사타입 코드" value="${existingInst ? existingInst.instructor_type || '' : ''}" class="border rounded px-3 py-2">
            <input type="text" id="inst-phone" placeholder="연락처" value="${existingInst ? existingInst.phone || '' : ''}" class="border rounded px-3 py-2">
            <input type="email" id="inst-email" placeholder="이메일" value="${existingInst ? existingInst.email || '' : ''}" class="border rounded px-3 py-2">
        </div>
        <div class="mt-4 space-x-2">
            <button onclick="window.saveInstructor('${code || ''}')" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
                <i class="fas fa-save mr-2"></i>저장
            </button>
            <button onclick="window.hideInstructorForm()" class="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded">
                취소
            </button>
        </div>
    `;
}

window.hideInstructorForm = function() {
    document.getElementById('instructor-form').classList.add('hidden');
}

window.saveInstructor = async function(existingCode) {
    const data = {
        code: document.getElementById('inst-code').value,
        name: document.getElementById('inst-name').value,
        major: document.getElementById('inst-major').value,
        instructor_type: document.getElementById('inst-type').value,
        phone: document.getElementById('inst-phone').value,
        email: document.getElementById('inst-email').value
    };
    
    try {
        if (existingCode) {
            await axios.put(`${API_BASE_URL}/api/instructors/${existingCode}`, data);
            alert('강사 정보가 수정되었습니다.');
        } else {
            await axios.post(`${API_BASE_URL}/api/instructors`, data);
            alert('강사가 추가되었습니다.');
        }
        window.hideInstructorForm();
        loadInstructors();
    } catch (error) {
        alert('저장 실패: ' + error.response?.data?.detail || error.message);
    }
}

window.editInstructor = function(code) {
    window.showInstructorForm(code);
}

window.deleteInstructor = async function(code) {
    if (!confirm('이 강사를 삭제하시겠습니까?')) return;
    
    try {
        await axios.delete(`${API_BASE_URL}/api/instructors/${code}`);
        alert('강사가 삭제되었습니다.');
        loadInstructors();
    } catch (error) {
        alert('삭제 실패: ' + error.response?.data?.detail || error.message);
    }
}

// ==================== 공휴일 관리 ====================
let holidays = [];

async function loadHolidays() {
    try {
        const year = new Date().getFullYear();
        const response = await axios.get(`${API_BASE_URL}/api/holidays?year=${year}`);
        holidays = response.data;
        renderHolidays();
    } catch (error) {
        console.error('공휴일 목록 로드 실패:', error);
        document.getElementById('app').innerHTML = '<div class="text-red-600 p-4">공휴일 목록을 불러오는데 실패했습니다.</div>';
    }
}

function renderHolidays() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="bg-white rounded-lg shadow-md p-6">
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-2xl font-bold text-gray-800">
                    <i class="fas fa-calendar-alt mr-2"></i>공휴일 관리 (총 ${holidays.length}일)
                </h2>
                <button onclick="window.showHolidayForm()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
                    <i class="fas fa-plus mr-2"></i>공휴일 추가
                </button>
            </div>
            
            <div id="holiday-form" class="hidden mb-6 p-4 bg-gray-50 rounded-lg"></div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                ${holidays.map(h => `
                    <div class="border rounded-lg p-4 hover:shadow-md">
                        <div class="flex justify-between items-start mb-2">
                            <h3 class="font-semibold text-lg">${h.name}</h3>
                            <span class="text-xs ${h.is_legal ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'} px-2 py-1 rounded">
                                ${h.is_legal ? '법정공휴일' : '일반'}
                            </span>
                        </div>
                        <p class="text-gray-600 mb-3">${h.holiday_date}</p>
                        <div class="flex space-x-2">
                            <button onclick="window.editHoliday(${h.id})" class="text-blue-600 hover:text-blue-800">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button onclick="window.deleteHoliday(${h.id})" class="text-red-600 hover:text-red-800">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

window.showHolidayForm = function(id = null) {
    const formDiv = document.getElementById('holiday-form');
    formDiv.classList.remove('hidden');
    
    const existingHoliday = id ? holidays.find(h => h.id === id) : null;
    
    formDiv.innerHTML = `
        <h3 class="text-lg font-semibold mb-4">${id ? '공휴일 수정' : '공휴일 추가'}</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input type="date" id="holiday-date" value="${existingHoliday ? existingHoliday.holiday_date : ''}" class="border rounded px-3 py-2">
            <input type="text" id="holiday-name" placeholder="공휴일명" value="${existingHoliday ? existingHoliday.name : ''}" class="border rounded px-3 py-2">
            <select id="holiday-legal" class="border rounded px-3 py-2">
                <option value="1" ${existingHoliday && existingHoliday.is_legal ? 'selected' : ''}>법정공휴일</option>
                <option value="0" ${existingHoliday && !existingHoliday.is_legal ? 'selected' : ''}>일반</option>
            </select>
        </div>
        <div class="mt-4 space-x-2">
            <button onclick="window.saveHoliday(${id || 'null'})" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
                <i class="fas fa-save mr-2"></i>저장
            </button>
            <button onclick="window.hideHolidayForm()" class="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded">
                취소
            </button>
        </div>
    `;
}

window.hideHolidayForm = function() {
    document.getElementById('holiday-form').classList.add('hidden');
}

window.saveHoliday = async function(id) {
    const data = {
        holiday_date: document.getElementById('holiday-date').value,
        name: document.getElementById('holiday-name').value,
        is_legal: parseInt(document.getElementById('holiday-legal').value)
    };
    
    try {
        if (id) {
            await axios.put(`${API_BASE_URL}/api/holidays/${id}`, data);
            alert('공휴일이 수정되었습니다.');
        } else {
            await axios.post(`${API_BASE_URL}/api/holidays`, data);
            alert('공휴일이 추가되었습니다.');
        }
        window.hideHolidayForm();
        loadHolidays();
    } catch (error) {
        alert('저장 실패: ' + error.response?.data?.detail || error.message);
    }
}

window.editHoliday = function(id) {
    window.showHolidayForm(id);
}

window.deleteHoliday = async function(id) {
    if (!confirm('이 공휴일을 삭제하시겠습니까?')) return;
    
    try {
        await axios.delete(`${API_BASE_URL}/api/holidays/${id}`);
        alert('공휴일이 삭제되었습니다.');
        loadHolidays();
    } catch (error) {
        alert('삭제 실패: ' + error.response?.data?.detail || error.message);
    }
}

// ==================== 과정 관리 ====================
let courses = [];

async function loadCourses() {
    try {
        const response = await axios.get(`${API_BASE_URL}/api/courses`);
        courses = response.data;
        renderCourses();
    } catch (error) {
        console.error('과정 목록 로드 실패:', error);
        document.getElementById('app').innerHTML = '<div class="text-red-600 p-4">과정 목록을 불러오는데 실패했습니다.</div>';
    }
}

function renderCourses() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="bg-white rounded-lg shadow-md p-6">
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-2xl font-bold text-gray-800">
                    <i class="fas fa-school mr-2"></i>과정(학급) 관리 (총 ${courses.length}개)
                </h2>
                <button onclick="window.showCourseForm()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
                    <i class="fas fa-plus mr-2"></i>과정 추가
                </button>
            </div>
            
            <div id="course-form" class="hidden mb-6 p-4 bg-gray-50 rounded-lg"></div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                ${courses.map(c => `
                    <div class="border rounded-lg p-4 hover:shadow-md">
                        <div class="flex justify-between items-start mb-2">
                            <h3 class="font-semibold text-lg">${c.name}</h3>
                            <span class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                ${c.code}
                            </span>
                        </div>
                        <div class="text-sm text-gray-600 space-y-1">
                            <p><i class="fas fa-map-marker-alt mr-2"></i>${c.location || '-'}</p>
                            <p><i class="fas fa-users mr-2"></i>학생: ${c.student_count}/${c.capacity}명</p>
                            <p><i class="fas fa-book mr-2"></i>과목: ${c.subject_count}개</p>
                            <p><i class="fas fa-calendar mr-2"></i>${c.start_date} ~ ${c.final_end_date}</p>
                            <p><i class="fas fa-clock mr-2"></i>강의: ${c.lecture_hours}h / 프로젝트: ${c.project_hours}h / 인턴: ${c.internship_hours}h</p>
                        </div>
                        <div class="mt-3 flex space-x-2">
                            <button onclick="window.editCourse('${c.code}')" class="text-blue-600 hover:text-blue-800">
                                <i class="fas fa-edit"></i> 수정
                            </button>
                            <button onclick="window.deleteCourse('${c.code}')" class="text-red-600 hover:text-red-800">
                                <i class="fas fa-trash"></i> 삭제
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

window.showCourseForm = function(code = null) {
    const formDiv = document.getElementById('course-form');
    formDiv.classList.remove('hidden');
    
    const existing = code ? courses.find(c => c.code === code) : null;
    
    formDiv.innerHTML = `
        <h3 class="text-lg font-semibold mb-4">${code ? '과정 수정' : '과정 추가'}</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input type="text" id="course-code" placeholder="과정코드" value="${existing ? existing.code : ''}" ${code ? 'readonly' : ''} class="border rounded px-3 py-2">
            <input type="text" id="course-name" placeholder="과정명" value="${existing ? existing.name : ''}" class="border rounded px-3 py-2">
            <input type="text" id="course-location" placeholder="장소" value="${existing ? existing.location || '' : ''}" class="border rounded px-3 py-2">
            <input type="number" id="course-capacity" placeholder="정원" value="${existing ? existing.capacity : ''}" class="border rounded px-3 py-2">
            <input type="number" id="course-lecture-hours" placeholder="강의시간" value="${existing ? existing.lecture_hours : ''}" class="border rounded px-3 py-2">
            <input type="number" id="course-project-hours" placeholder="프로젝트시간" value="${existing ? existing.project_hours : ''}" class="border rounded px-3 py-2">
            <input type="number" id="course-internship-hours" placeholder="인턴시간" value="${existing ? existing.internship_hours : ''}" class="border rounded px-3 py-2">
            <input type="date" id="course-start-date" placeholder="시작일" value="${existing ? existing.start_date : ''}" class="border rounded px-3 py-2">
            <input type="date" id="course-lecture-end" placeholder="강의종료일" value="${existing ? existing.lecture_end_date : ''}" class="border rounded px-3 py-2">
            <input type="date" id="course-project-end" placeholder="프로젝트종료일" value="${existing ? existing.project_end_date : ''}" class="border rounded px-3 py-2">
            <input type="date" id="course-internship-end" placeholder="인턴종료일" value="${existing ? existing.internship_end_date : ''}" class="border rounded px-3 py-2">
            <input type="date" id="course-final-end" placeholder="최종종료일" value="${existing ? existing.final_end_date : ''}" class="border rounded px-3 py-2">
            <input type="number" id="course-total-days" placeholder="총일수" value="${existing ? existing.total_days : ''}" class="border rounded px-3 py-2">
        </div>
        <div class="mt-4">
            <textarea id="course-notes" placeholder="비고" rows="3" class="w-full border rounded px-3 py-2">${existing ? existing.notes || '' : ''}</textarea>
        </div>
        <div class="mt-4 space-x-2">
            <button onclick="window.saveCourse('${code || ''}')" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
                <i class="fas fa-save mr-2"></i>저장
            </button>
            <button onclick="window.hideCourseForm()" class="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded">
                취소
            </button>
        </div>
    `;
}

window.hideCourseForm = function() {
    document.getElementById('course-form').classList.add('hidden');
}

window.saveCourse = async function(existingCode) {
    const data = {
        code: document.getElementById('course-code').value,
        name: document.getElementById('course-name').value,
        location: document.getElementById('course-location').value,
        capacity: parseInt(document.getElementById('course-capacity').value),
        lecture_hours: parseInt(document.getElementById('course-lecture-hours').value),
        project_hours: parseInt(document.getElementById('course-project-hours').value),
        internship_hours: parseInt(document.getElementById('course-internship-hours').value),
        start_date: document.getElementById('course-start-date').value,
        lecture_end_date: document.getElementById('course-lecture-end').value,
        project_end_date: document.getElementById('course-project-end').value,
        internship_end_date: document.getElementById('course-internship-end').value,
        final_end_date: document.getElementById('course-final-end').value,
        total_days: parseInt(document.getElementById('course-total-days').value),
        notes: document.getElementById('course-notes').value
    };
    
    try {
        if (existingCode) {
            await axios.put(`${API_BASE_URL}/api/courses/${existingCode}`, data);
            alert('과정이 수정되었습니다.');
        } else {
            await axios.post(`${API_BASE_URL}/api/courses`, data);
            alert('과정이 추가되었습니다.');
        }
        window.hideCourseForm();
        loadCourses();
    } catch (error) {
        alert('저장 실패: ' + error.response?.data?.detail || error.message);
    }
}

window.editCourse = function(code) {
    window.showCourseForm(code);
}

window.deleteCourse = async function(code) {
    if (!confirm('이 과정을 삭제하시겠습니까?')) return;
    
    try {
        await axios.delete(`${API_BASE_URL}/api/courses/${code}`);
        alert('과정이 삭제되었습니다.');
        loadCourses();
    } catch (error) {
        alert('삭제 실패: ' + error.response?.data?.detail || error.message);
    }
}

// ==================== 프로젝트 관리 ====================
let projects = [];

async function loadProjects() {
    try {
        const response = await axios.get(`${API_BASE_URL}/api/projects`);
        projects = response.data;
        renderProjects();
    } catch (error) {
        console.error('프로젝트 목록 로드 실패:', error);
        document.getElementById('app').innerHTML = '<div class="text-red-600 p-4">프로젝트 목록을 불러오는데 실패했습니다.</div>';
    }
}

function renderProjects() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="bg-white rounded-lg shadow-md p-6">
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-2xl font-bold text-gray-800">
                    <i class="fas fa-project-diagram mr-2"></i>프로젝트 관리 (총 ${projects.length}개)
                </h2>
                <button onclick="window.showProjectForm()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
                    <i class="fas fa-plus mr-2"></i>프로젝트 추가
                </button>
            </div>
            
            <div id="project-form" class="hidden mb-6 p-4 bg-gray-50 rounded-lg"></div>
            
            ${projects.length === 0 ? '<p class="text-gray-500 text-center py-8">등록된 프로젝트가 없습니다.</p>' : ''}
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                ${projects.map(p => `
                    <div class="border rounded-lg p-4 hover:shadow-md">
                        <div class="flex justify-between items-start mb-2">
                            <h3 class="font-semibold text-lg">${p.name}</h3>
                            <span class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                ${p.code}
                            </span>
                        </div>
                        <p class="text-sm text-gray-600 mb-2">과정: ${p.course_name || p.course_code}</p>
                        <div class="text-sm text-gray-600">
                            <p class="font-semibold mb-1">팀원:</p>
                            <ul class="list-disc list-inside">
                                ${p.member1_name ? `<li>${p.member1_name} (${p.member1_phone || '-'})</li>` : ''}
                                ${p.member2_name ? `<li>${p.member2_name} (${p.member2_phone || '-'})</li>` : ''}
                                ${p.member3_name ? `<li>${p.member3_name} (${p.member3_phone || '-'})</li>` : ''}
                                ${p.member4_name ? `<li>${p.member4_name} (${p.member4_phone || '-'})</li>` : ''}
                                ${p.member5_name ? `<li>${p.member5_name} (${p.member5_phone || '-'})</li>` : ''}
                            </ul>
                        </div>
                        <div class="mt-3 flex space-x-2">
                            <button onclick="window.editProject('${p.code}')" class="text-blue-600 hover:text-blue-800">
                                <i class="fas fa-edit"></i> 수정
                            </button>
                            <button onclick="window.deleteProject('${p.code}')" class="text-red-600 hover:text-red-800">
                                <i class="fas fa-trash"></i> 삭제
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

window.showProjectForm = function(code = null) {
    const formDiv = document.getElementById('project-form');
    formDiv.classList.remove('hidden');
    
    const existing = code ? projects.find(p => p.code === code) : null;
    
    formDiv.innerHTML = `
        <h3 class="text-lg font-semibold mb-4">${code ? '프로젝트 수정' : '프로젝트 추가'}</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <input type="text" id="proj-code" placeholder="프로젝트코드" value="${existing ? existing.code : ''}" ${code ? 'readonly' : ''} class="border rounded px-3 py-2">
            <input type="text" id="proj-name" placeholder="프로젝트명" value="${existing ? existing.name : ''}" class="border rounded px-3 py-2">
            <input type="text" id="proj-course" placeholder="과정코드" value="${existing ? existing.course_code || '' : ''}" class="border rounded px-3 py-2">
        </div>
        <h4 class="font-semibold mb-2">팀원 정보 (최대 5명)</h4>
        <div class="space-y-2">
            ${[1, 2, 3, 4, 5].map(i => `
                <div class="grid grid-cols-2 gap-4">
                    <input type="text" id="member${i}-name" placeholder="팀원${i} 이름" value="${existing ? existing[`member${i}_name`] || '' : ''}" class="border rounded px-3 py-2">
                    <input type="text" id="member${i}-phone" placeholder="팀원${i} 연락처" value="${existing ? existing[`member${i}_phone`] || '' : ''}" class="border rounded px-3 py-2">
                </div>
            `).join('')}
        </div>
        <div class="mt-4 space-x-2">
            <button onclick="window.saveProject('${code || ''}')" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
                <i class="fas fa-save mr-2"></i>저장
            </button>
            <button onclick="window.hideProjectForm()" class="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded">
                취소
            </button>
        </div>
    `;
}

window.hideProjectForm = function() {
    document.getElementById('project-form').classList.add('hidden');
}

window.saveProject = async function(existingCode) {
    const data = {
        code: document.getElementById('proj-code').value,
        name: document.getElementById('proj-name').value,
        course_code: document.getElementById('proj-course').value,
        member1_name: document.getElementById('member1-name').value,
        member1_phone: document.getElementById('member1-phone').value,
        member2_name: document.getElementById('member2-name').value,
        member2_phone: document.getElementById('member2-phone').value,
        member3_name: document.getElementById('member3-name').value,
        member3_phone: document.getElementById('member3-phone').value,
        member4_name: document.getElementById('member4-name').value,
        member4_phone: document.getElementById('member4-phone').value,
        member5_name: document.getElementById('member5-name').value,
        member5_phone: document.getElementById('member5-phone').value
    };
    
    try {
        if (existingCode) {
            await axios.put(`${API_BASE_URL}/api/projects/${existingCode}`, data);
            alert('프로젝트가 수정되었습니다.');
        } else {
            await axios.post(`${API_BASE_URL}/api/projects`, data);
            alert('프로젝트가 추가되었습니다.');
        }
        window.hideProjectForm();
        loadProjects();
    } catch (error) {
        alert('저장 실패: ' + error.response?.data?.detail || error.message);
    }
}

window.editProject = function(code) {
    window.showProjectForm(code);
}

window.deleteProject = async function(code) {
    if (!confirm('이 프로젝트를 삭제하시겠습니까?')) return;
    
    try {
        await axios.delete(`${API_BASE_URL}/api/projects/${code}`);
        alert('프로젝트가 삭제되었습니다.');
        loadProjects();
    } catch (error) {
        alert('삭제 실패: ' + error.response?.data?.detail || error.message);
    }
}

// ==================== 시간표 관리 ====================
let timetables = [];

async function loadTimetables() {
    try {
        const response = await axios.get(`${API_BASE_URL}/api/timetables`);
        timetables = response.data;
        renderTimetables();
    } catch (error) {
        console.error('시간표 목록 로드 실패:', error);
        document.getElementById('app').innerHTML = '<div class="text-red-600 p-4">시간표 목록을 불러오는데 실패했습니다.</div>';
    }
}

function renderTimetables() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="bg-white rounded-lg shadow-md p-6">
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-2xl font-bold text-gray-800">
                    <i class="fas fa-clock mr-2"></i>시간표 관리 (총 ${timetables.length}건)
                </h2>
                <div class="space-x-2">
                    <input type="date" id="tt-start-date" class="border rounded px-3 py-2" onchange="window.filterTimetables()">
                    <input type="date" id="tt-end-date" class="border rounded px-3 py-2" onchange="window.filterTimetables()">
                    <input type="text" id="tt-course" placeholder="과정코드" class="border rounded px-3 py-2" onkeyup="window.filterTimetables()">
                    <button onclick="window.showTimetableForm()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
                        <i class="fas fa-plus mr-2"></i>시간표 추가
                    </button>
                </div>
            </div>
            
            <div id="timetable-form" class="hidden mb-6 p-4 bg-gray-50 rounded-lg"></div>
            
            <div class="overflow-x-auto">
                <table class="min-w-full bg-white" id="timetable-list">
                    <thead class="bg-gray-100">
                        <tr>
                            <th class="px-4 py-2 text-left">날짜</th>
                            <th class="px-4 py-2 text-left">과정</th>
                            <th class="px-4 py-2 text-left">과목</th>
                            <th class="px-4 py-2 text-left">강사</th>
                            <th class="px-4 py-2 text-left">시간</th>
                            <th class="px-4 py-2 text-left">타입</th>
                            <th class="px-4 py-2 text-left">작업</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${timetables.slice(0, 50).map(tt => `
                            <tr class="border-t hover:bg-gray-50">
                                <td class="px-4 py-2">${tt.class_date}</td>
                                <td class="px-4 py-2">${tt.course_name || tt.course_code}</td>
                                <td class="px-4 py-2">${tt.subject_name || tt.subject_code || '-'}</td>
                                <td class="px-4 py-2">${tt.instructor_name || tt.instructor_code || '-'}</td>
                                <td class="px-4 py-2">${formatTime(tt.start_time)} - ${formatTime(tt.end_time)}</td>
                                <td class="px-4 py-2">
                                    <span class="text-xs ${tt.type === 'lecture' ? 'bg-blue-100 text-blue-800' : tt.type === 'project' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'} px-2 py-1 rounded">
                                        ${tt.type}
                                    </span>
                                </td>
                                <td class="px-4 py-2">
                                    <button onclick="window.editTimetable(${tt.id})" class="text-blue-600 hover:text-blue-800 mr-2">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button onclick="window.deleteTimetable(${tt.id})" class="text-red-600 hover:text-red-800">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                        ${timetables.length > 50 ? `<tr><td colspan="7" class="px-4 py-2 text-center text-gray-500">처음 50개만 표시됩니다 (전체: ${timetables.length})</td></tr>` : ''}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function formatTime(seconds) {
    if (!seconds) return '-';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

function timeToSeconds(timeStr) {
    const [hours, minutes] = timeStr.split(':');
    return parseInt(hours) * 3600 + parseInt(minutes) * 60;
}

window.filterTimetables = async function() {
    const courseCode = document.getElementById('tt-course').value;
    const startDate = document.getElementById('tt-start-date').value;
    const endDate = document.getElementById('tt-end-date').value;
    
    let url = `${API_BASE_URL}/api/timetables?`;
    if (courseCode) url += `course_code=${courseCode}&`;
    if (startDate) url += `start_date=${startDate}&`;
    if (endDate) url += `end_date=${endDate}&`;
    
    try {
        const response = await axios.get(url);
        timetables = response.data;
        
        const tbody = document.querySelector('#timetable-list tbody');
        tbody.innerHTML = timetables.slice(0, 50).map(tt => `
            <tr class="border-t hover:bg-gray-50">
                <td class="px-4 py-2">${tt.class_date}</td>
                <td class="px-4 py-2">${tt.course_name || tt.course_code}</td>
                <td class="px-4 py-2">${tt.subject_name || tt.subject_code || '-'}</td>
                <td class="px-4 py-2">${tt.instructor_name || tt.instructor_code || '-'}</td>
                <td class="px-4 py-2">${formatTime(tt.start_time)} - ${formatTime(tt.end_time)}</td>
                <td class="px-4 py-2">
                    <span class="text-xs ${tt.type === 'lecture' ? 'bg-blue-100 text-blue-800' : tt.type === 'project' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'} px-2 py-1 rounded">
                        ${tt.type}
                    </span>
                </td>
                <td class="px-4 py-2">
                    <button onclick="window.editTimetable(${tt.id})" class="text-blue-600 hover:text-blue-800 mr-2">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="window.deleteTimetable(${tt.id})" class="text-red-600 hover:text-red-800">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
        
        if (timetables.length > 50) {
            tbody.innerHTML += `<tr><td colspan="7" class="px-4 py-2 text-center text-gray-500">처음 50개만 표시됩니다 (전체: ${timetables.length})</td></tr>`;
        }
    } catch (error) {
        console.error('필터링 실패:', error);
    }
}

window.showTimetableForm = function(id = null) {
    const formDiv = document.getElementById('timetable-form');
    formDiv.classList.remove('hidden');
    
    const existing = id ? timetables.find(tt => tt.id === id) : null;
    
    formDiv.innerHTML = `
        <h3 class="text-lg font-semibold mb-4">${id ? '시간표 수정' : '시간표 추가'}</h3>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input type="text" id="tt-course-code" placeholder="과정코드" value="${existing ? existing.course_code : ''}" class="border rounded px-3 py-2">
            <input type="text" id="tt-subject-code" placeholder="과목코드" value="${existing ? existing.subject_code || '' : ''}" class="border rounded px-3 py-2">
            <input type="text" id="tt-instructor-code" placeholder="강사코드" value="${existing ? existing.instructor_code || '' : ''}" class="border rounded px-3 py-2">
            <input type="date" id="tt-class-date" value="${existing ? existing.class_date : ''}" class="border rounded px-3 py-2">
            <input type="time" id="tt-start-time" value="${existing ? formatTime(existing.start_time) : ''}" class="border rounded px-3 py-2">
            <input type="time" id="tt-end-time" value="${existing ? formatTime(existing.end_time) : ''}" class="border rounded px-3 py-2">
            <select id="tt-type" class="border rounded px-3 py-2">
                <option value="lecture" ${existing && existing.type === 'lecture' ? 'selected' : ''}>강의</option>
                <option value="project" ${existing && existing.type === 'project' ? 'selected' : ''}>프로젝트</option>
                <option value="internship" ${existing && existing.type === 'internship' ? 'selected' : ''}>인턴십</option>
            </select>
            <input type="text" id="tt-notes" placeholder="비고" value="${existing ? existing.notes || '' : ''}" class="border rounded px-3 py-2">
        </div>
        <div class="mt-4 space-x-2">
            <button onclick="window.saveTimetable(${id || 'null'})" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
                <i class="fas fa-save mr-2"></i>저장
            </button>
            <button onclick="window.hideTimetableForm()" class="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded">
                취소
            </button>
        </div>
    `;
}

window.hideTimetableForm = function() {
    document.getElementById('timetable-form').classList.add('hidden');
}

window.saveTimetable = async function(id) {
    const data = {
        course_code: document.getElementById('tt-course-code').value,
        subject_code: document.getElementById('tt-subject-code').value,
        instructor_code: document.getElementById('tt-instructor-code').value,
        class_date: document.getElementById('tt-class-date').value,
        start_time: timeToSeconds(document.getElementById('tt-start-time').value),
        end_time: timeToSeconds(document.getElementById('tt-end-time').value),
        type: document.getElementById('tt-type').value,
        notes: document.getElementById('tt-notes').value
    };
    
    try {
        if (id) {
            await axios.put(`${API_BASE_URL}/api/timetables/${id}`, data);
            alert('시간표가 수정되었습니다.');
        } else {
            await axios.post(`${API_BASE_URL}/api/timetables`, data);
            alert('시간표가 추가되었습니다.');
        }
        window.hideTimetableForm();
        loadTimetables();
    } catch (error) {
        alert('저장 실패: ' + error.response?.data?.detail || error.message);
    }
}

window.editTimetable = function(id) {
    window.showTimetableForm(id);
}

window.deleteTimetable = async function(id) {
    if (!confirm('이 시간표를 삭제하시겠습니까?')) return;
    
    try {
        await axios.delete(`${API_BASE_URL}/api/timetables/${id}`);
        alert('시간표가 삭제되었습니다.');
        loadTimetables();
    } catch (error) {
        alert('삭제 실패: ' + error.response?.data?.detail || error.message);
    }
}

console.log('App script loaded successfully');

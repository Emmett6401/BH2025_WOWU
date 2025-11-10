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
        btn.className = isActive 
            ? 'tab-btn px-6 py-4 font-semibold text-blue-600 border-b-2 border-blue-600'
            : 'tab-btn px-6 py-4 font-semibold text-gray-600 hover:text-blue-600';
    });
    
    // 해당 탭 콘텐츠 로드
    switch(tab) {
        case 'students':
            loadStudents();
            break;
        case 'subjects':
            loadSubjects();
            break;
        case 'counselings':
            loadCounselings();
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

console.log('App script loaded successfully');

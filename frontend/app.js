// API 베이스 URL
const API_BASE_URL = 'https://8000-i3oloko346uog7d7oo8v5-3844e1b6.sandbox.novita.ai';

// 전역 상태
let currentTab = 'students';
let students = [];
let subjects = [];
let instructors = [];
let instructorTypes = []; // 강사구분 목록
let counselings = [];
let courses = [];

// 페이지네이션 상태
let pagination = {
    timetables: { currentPage: 1, itemsPerPage: 50, totalItems: 0 },
    trainingLogs: { currentPage: 1, itemsPerPage: 50, totalItems: 0 },
    students: { currentPage: 1, itemsPerPage: 50, totalItems: 0 },
    counselings: { currentPage: 1, itemsPerPage: 50, totalItems: 0 },
    instructors: { currentPage: 1, itemsPerPage: 50, totalItems: 0 }
};

// ==================== 커스텀 알림 모달 ====================
window.showAlert = function(message) {
    const alertModal = document.getElementById('custom-alert');
    const alertMessage = document.getElementById('alert-message');
    alertMessage.textContent = message;
    alertModal.classList.remove('hidden');
};

window.hideAlert = function() {
    const alertModal = document.getElementById('custom-alert');
    alertModal.classList.add('hidden');
};

// 확인 모달용 콜백 저장
let confirmCallback = null;

window.showConfirm = function(message) {
    return new Promise((resolve) => {
        const confirmModal = document.getElementById('custom-confirm');
        const confirmMessage = document.getElementById('confirm-message');
        confirmMessage.textContent = message;
        confirmModal.classList.remove('hidden');
        confirmCallback = resolve;
    });
};

window.handleConfirm = function(result) {
    const confirmModal = document.getElementById('custom-confirm');
    confirmModal.classList.add('hidden');
    if (confirmCallback) {
        confirmCallback(result);
        confirmCallback = null;
    }
};

// ==================== 페이지네이션 헬퍼 ====================
function createPaginationHTML(page, itemsPerPage, totalItems, onPageChange, onItemsPerPageChange) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startItem = (page - 1) * itemsPerPage + 1;
    const endItem = Math.min(page * itemsPerPage, totalItems);
    
    let paginationHTML = `
        <div class="flex justify-between items-center mt-4 pt-4 border-t">
            <div class="flex items-center space-x-2">
                <span class="text-sm text-gray-600">페이지당 항목:</span>
                <select onchange="${onItemsPerPageChange}" class="border rounded px-2 py-1 text-sm">
                    <option value="25" ${itemsPerPage === 25 ? 'selected' : ''}>25개</option>
                    <option value="50" ${itemsPerPage === 50 ? 'selected' : ''}>50개</option>
                    <option value="100" ${itemsPerPage === 100 ? 'selected' : ''}>100개</option>
                    <option value="200" ${itemsPerPage === 200 ? 'selected' : ''}>200개</option>
                </select>
                <span class="text-sm text-gray-600 ml-4">
                    ${startItem}-${endItem} / 총 ${totalItems}개
                </span>
            </div>
            
            <div class="flex items-center space-x-1">
                <button onclick="${onPageChange}(1)" 
                        ${page === 1 ? 'disabled' : ''} 
                        class="px-2 py-1 border rounded text-sm ${page === 1 ? 'bg-gray-100 text-gray-400' : 'hover:bg-gray-100'}">
                    <i class="fas fa-angle-double-left"></i>
                </button>
                <button onclick="${onPageChange}(${page - 1})" 
                        ${page === 1 ? 'disabled' : ''} 
                        class="px-2 py-1 border rounded text-sm ${page === 1 ? 'bg-gray-100 text-gray-400' : 'hover:bg-gray-100'}">
                    <i class="fas fa-angle-left"></i>
                </button>
                
                ${generatePageButtons(page, totalPages, onPageChange)}
                
                <button onclick="${onPageChange}(${page + 1})" 
                        ${page === totalPages ? 'disabled' : ''} 
                        class="px-2 py-1 border rounded text-sm ${page === totalPages ? 'bg-gray-100 text-gray-400' : 'hover:bg-gray-100'}">
                    <i class="fas fa-angle-right"></i>
                </button>
                <button onclick="${onPageChange}(${totalPages})" 
                        ${page === totalPages ? 'disabled' : ''} 
                        class="px-2 py-1 border rounded text-sm ${page === totalPages ? 'bg-gray-100 text-gray-400' : 'hover:bg-gray-100'}">
                    <i class="fas fa-angle-double-right"></i>
                </button>
            </div>
        </div>
    `;
    
    return paginationHTML;
}

function generatePageButtons(currentPage, totalPages, onPageChange) {
    let buttons = '';
    const maxButtons = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);
    
    if (endPage - startPage < maxButtons - 1) {
        startPage = Math.max(1, endPage - maxButtons + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        buttons += `
            <button onclick="${onPageChange}(${i})" 
                    class="px-3 py-1 border rounded text-sm ${i === currentPage ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'}">
                ${i}
            </button>
        `;
    }
    
    return buttons;
}

function paginateArray(array, page, itemsPerPage) {
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return array.slice(startIndex, endIndex);
}

// ==================== Debounce 헬퍼 ====================
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 디바운스된 상담 필터링 (500ms 대기)
window.debouncedFilterCounselings = debounce(() => {
    window.filterCounselings();
}, 500);

// ==================== 로딩 오버레이 ====================
window.showLoading = function(message = '데이터를 불러오는 중...') {
    const overlay = document.getElementById('loading-overlay');
    const messageEl = document.getElementById('loading-message');
    const progressEl = document.getElementById('loading-progress');
    
    messageEl.textContent = message;
    progressEl.style.width = '0%';
    overlay.classList.remove('hidden');
    
    // 프로그레스 바 애니메이션
    let progress = 0;
    const interval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress > 90) progress = 90;
        progressEl.style.width = progress + '%';
    }, 200);
    
    // interval ID 저장
    overlay.dataset.intervalId = interval;
};

window.hideLoading = function() {
    const overlay = document.getElementById('loading-overlay');
    const progressEl = document.getElementById('loading-progress');
    
    // interval 정리
    if (overlay.dataset.intervalId) {
        clearInterval(overlay.dataset.intervalId);
        delete overlay.dataset.intervalId;
    }
    
    // 100%로 완료 표시
    progressEl.style.width = '100%';
    
    // 짧은 딜레이 후 숨김
    setTimeout(() => {
        overlay.classList.add('hidden');
        progressEl.style.width = '0%';
    }, 300);
};

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
        case 'training-logs':
            loadTrainingLogs();
            break;
        case 'ai-report':
            renderAIReport();
            break;
        case 'ai-training-log':
            loadAITrainingLog();
            break;
        case 'ai-counseling':
            loadAICounseling();
            break;
    }
}

// ==================== 학생 관리 ====================
async function loadStudents() {
    try {
        window.showLoading('학생 데이터를 불러오는 중...');
        console.log('Loading students...');
        const [studentsRes, coursesRes] = await Promise.all([
            axios.get(`${API_BASE_URL}/api/students`),
            axios.get(`${API_BASE_URL}/api/courses`)
        ]);
        students = studentsRes.data;
        courses = coursesRes.data;
        console.log('Students loaded:', students.length);
        renderStudents();
        window.hideLoading();
    } catch (error) {
        window.hideLoading();
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
                            <th class="px-4 py-2 text-left">과정</th>
                            <th class="px-4 py-2 text-left">캠퍼스</th>
                            <th class="px-4 py-2 text-left">작업</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${students.map(student => {
                            // 과정 정보 찾기
                            const course = courses.find(c => c.code === student.course_code);
                            const courseDisplay = course ? `${course.code} - ${course.name || course.code}` : (student.course_code || '-');
                            
                            return `
                            <tr class="border-b hover:bg-gray-50">
                                <td class="px-4 py-2 font-mono">${student.code}</td>
                                <td class="px-4 py-2 font-semibold">${student.name}</td>
                                <td class="px-4 py-2">${student.birth_date ? formatDateWithDay(student.birth_date) : '-'}</td>
                                <td class="px-4 py-2">${student.gender || '-'}</td>
                                <td class="px-4 py-2">${student.phone || '-'}</td>
                                <td class="px-4 py-2">${student.email || '-'}</td>
                                <td class="px-4 py-2 text-sm text-blue-600">${courseDisplay}</td>
                                <td class="px-4 py-2">${student.campus || '-'}</td>
                                <td class="px-4 py-2">
                                    ${student.photo_urls && JSON.parse(student.photo_urls || '[]').length > 0 ? `
                                        <i class="fas fa-camera text-green-600 mr-2" title="${JSON.parse(student.photo_urls).length}개 사진"></i>
                                    ` : ''}
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
                        `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

window.downloadTemplate = async function() {
    window.open(`${API_BASE_URL}/api/template/students`, '_blank');
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
    
    // 학생 코드 자동 생성 (S001, S002...)
    let autoCode = '';
    if (!studentId) {
        const maxCode = students.reduce((max, s) => {
            const match = s.code.match(/^S(\d+)$/);
            if (match) {
                const num = parseInt(match[1]);
                return num > max ? num : max;
            }
            return max;
        }, 0);
        autoCode = `S${String(maxCode + 1).padStart(3, '0')}`;
    }
    
    formDiv.innerHTML = `
        <h3 class="text-lg font-bold mb-4">${student ? '학생 정보 수정' : '새 학생 추가'}</h3>
        <form id="student-save-form">
            <input type="hidden" id="student-id" value="${studentId || ''}">
            <div class="grid grid-cols-2 gap-4">
                ${!student ? `
                <div>
                    <label class="block text-gray-700 mb-2">학생 코드</label>
                    <input type="text" value="${autoCode}" readonly 
                           class="w-full px-3 py-2 border rounded-lg bg-gray-100 font-mono">
                    <input type="hidden" name="code" value="${autoCode}">
                </div>
                ` : ''}
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
                <div>
                    <label class="block text-gray-700 mb-2">과정 선택</label>
                    <select name="course_code" class="w-full px-3 py-2 border rounded-lg">
                        <option value="">선택</option>
                        ${courses.map(c => `
                            <option value="${c.code}" ${student?.course_code === c.code ? 'selected' : ''}>
                                ${c.code} - ${c.name || c.code}
                            </option>
                        `).join('')}
                    </select>
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
                
                <!-- 사진 업로드 -->
                <div class="col-span-2">
                    <label class="block text-gray-700 mb-2">
                        <i class="fas fa-camera mr-2"></i>사진 첨부
                    </label>
                    <div class="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
                        <div class="flex flex-wrap gap-2 mb-3">
                            <button type="button" onclick="document.getElementById('student-file-input').click()" 
                                    class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm">
                                <i class="fas fa-folder-open mr-2"></i>파일 선택
                            </button>
                            <button type="button" onclick="document.getElementById('student-camera-input').click()" 
                                    class="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm">
                                <i class="fas fa-camera mr-2"></i>사진 촬영
                            </button>
                        </div>
                        <input type="file" id="student-file-input" accept="image/*" multiple 
                               onchange="window.handleStudentImageUpload(event)" class="hidden">
                        <input type="file" id="student-camera-input" accept="image/*"  
                               onchange="window.handleStudentImageUpload(event)" class="hidden">
                        <div id="student-upload-progress" class="hidden mb-3">
                            <div class="bg-blue-50 border border-blue-200 rounded p-3">
                                <p class="text-sm text-blue-800 mb-2">
                                    <i class="fas fa-cloud-upload-alt mr-2"></i>
                                    서버에 업로드 후 자동 저장됩니다. 잠시만 기다리세요...
                                </p>
                                <div class="w-full bg-blue-200 rounded-full h-2">
                                    <div id="student-progress-bar" class="bg-blue-600 h-2 rounded-full transition-all duration-300" style="width: 0%"></div>
                                </div>
                            </div>
                        </div>
                        <div id="student-photos-preview" class="flex flex-col gap-2 mt-2"></div>
                        <input type="hidden" id="student-photo-urls" value='${student && student.photo_urls ? student.photo_urls : "[]"}'>
                    </div>
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
    
    // 기존 사진 미리보기 표시
    if (student?.photo_urls) {
        try {
            const photoUrls = typeof student.photo_urls === 'string' 
                ? JSON.parse(student.photo_urls) 
                : student.photo_urls;
            updateStudentPhotoPreview(photoUrls);
        } catch (e) {
            console.error('사진 URL 파싱 오류:', e);
        }
    }
}

window.hideStudentForm = function() {
    document.getElementById('student-form').classList.add('hidden');
}

window.saveStudent = async function(studentId, autoSave = false) {
    const form = document.getElementById('student-save-form');
    const formData = new FormData(form);
    
    // 사진 URL 가져오기
    const photoUrlsInput = document.getElementById('student-photo-urls');
    const photoUrls = photoUrlsInput ? JSON.parse(photoUrlsInput.value || '[]') : [];
    
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
        course_code: formData.get('course_code'),
        notes: formData.get('notes'),
        photo_urls: JSON.stringify(photoUrls)
    };
    
    try {
        if (studentId) {
            await axios.put(`${API_BASE_URL}/api/students/${studentId}`, data);
        } else {
            await axios.post(`${API_BASE_URL}/api/students`, data);
        }
        if (!autoSave) {
            window.hideStudentForm();
            loadStudents();
        }
    } catch (error) {
        console.error('학생 저장 실패:', error);
        alert('학생 저장에 실패했습니다: ' + (error.response?.data?.detail || error.message));
    }
}

// 학생 사진 업로드 핸들러
window.handleStudentImageUpload = async function(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    // 프로그레스 바 표시
    const progressDiv = document.getElementById('student-upload-progress');
    const progressBar = document.getElementById('student-progress-bar');
    if (progressDiv) {
        progressDiv.classList.remove('hidden');
        progressBar.style.width = '0%';
    }
    
    try {
        const photoUrlsInput = document.getElementById('student-photo-urls');
        const photoUrls = JSON.parse(photoUrlsInput.value || '[]');
        const totalFiles = files.length;
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const formData = new FormData();
            formData.append('file', file);
            
            // 프로그레스 업데이트
            const progress = ((i + 0.5) / totalFiles) * 100;
            if (progressBar) progressBar.style.width = `${progress}%`;
            
            const response = await axios.post(
                `${API_BASE_URL}/api/upload-image?category=student`,
                formData,
                { headers: { 'Content-Type': 'multipart/form-data' } }
            );
            
            if (response.data.success) {
                photoUrls.push(response.data.url);
            }
            
            // 완료 프로그레스
            const completeProgress = ((i + 1) / totalFiles) * 100;
            if (progressBar) progressBar.style.width = `${completeProgress}%`;
        }
        
        photoUrlsInput.value = JSON.stringify(photoUrls);
        updateStudentPhotoPreview(photoUrls);
        
        // 자동 저장 (화면 유지)
        const studentIdInput = document.getElementById('student-id');
        const studentId = studentIdInput ? studentIdInput.value : null;
        if (studentId) {
            await window.saveStudent(parseInt(studentId), true);
        }
        
        // 프로그레스 바 숨기기
        if (progressDiv) {
            setTimeout(() => {
                progressDiv.classList.add('hidden');
            }, 1000);
        }
        
        // 학생 이름 가져오기
        const studentNameInput = document.querySelector('input[name="name"]');
        const studentName = studentNameInput ? studentNameInput.value : '';
        const contextMsg = studentName ? `${studentName} 학생에게 ` : '학생에게 ';
        window.showAlert(`${contextMsg}${files.length}개 사진이 업로드되고 자동 저장되었습니다.`);
        
    } catch (error) {
        // 프로그레스 바 숨기기
        if (progressDiv) progressDiv.classList.add('hidden');
        
        console.error('사진 업로드 실패:', error);
        window.showAlert('사진 업로드 실패: ' + (error.response?.data?.detail || error.message));
    }
    
    // 파일 입력 초기화
    event.target.value = '';
}

// 학생 사진 삭제
window.removeStudentPhoto = async function(index) {
    const photoUrlsInput = document.getElementById('student-photo-urls');
    const photoUrls = JSON.parse(photoUrlsInput.value || '[]');
    
    photoUrls.splice(index, 1);
    photoUrlsInput.value = JSON.stringify(photoUrls);
    updateStudentPhotoPreview(photoUrls);
    
    // 자동 저장
    const studentIdInput = document.getElementById('student-id');
    const studentId = studentIdInput ? studentIdInput.value : null;
    if (studentId) {
        await window.saveStudent(parseInt(studentId), true);
        
        // 학생 이름 가져오기
        const studentNameInput = document.querySelector('input[name="name"]');
        const studentName = studentNameInput ? studentNameInput.value : '';
        const contextMsg = studentName ? `${studentName} 학생에게서 ` : '학생에게서 ';
        window.showAlert(`${contextMsg}사진이 삭제되고 자동 저장되었습니다.`);
    }
}

// 학생 사진 미리보기 업데이트
function updateStudentPhotoPreview(photoUrls) {
    const previewDiv = document.getElementById('student-photos-preview');
    if (!previewDiv) return;
    
    if (!photoUrls || photoUrls.length === 0) {
        previewDiv.innerHTML = '<p class="text-gray-400 text-sm">첨부된 사진이 없습니다</p>';
        return;
    }
    
    previewDiv.innerHTML = photoUrls.map((url, index) => `
        <div class="flex items-center gap-3 bg-white border rounded p-2 hover:bg-gray-50">
            <a href="${API_BASE_URL}/api/download-image?url=${encodeURIComponent(url)}" download class="flex-shrink-0">
                <img src="${API_BASE_URL}/api/thumbnail?url=${encodeURIComponent(url)}" 
                     alt="사진 ${index + 1}"
                     class="w-16 h-16 object-cover rounded border cursor-pointer hover:opacity-80"
                     onerror="this.onerror=null; this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Crect fill=%22%23e5e7eb%22 width=%22100%22 height=%22100%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%239ca3af%22 font-size=%2240%22%3E📷%3C/text%3E%3C/svg%3E';">
            </a>
            <div class="flex-1">
                <a href="${API_BASE_URL}/api/download-image?url=${encodeURIComponent(url)}" download 
                   class="text-blue-600 hover:underline text-sm block">
                    사진 ${index + 1} 다운로드
                </a>
                <p class="text-xs text-gray-500 mt-1">클릭하여 다운로드</p>
            </div>
            <button type="button" onclick="window.removeStudentPhoto(${index})" 
                    class="text-red-500 hover:text-red-700 px-2">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');
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
        const [subjectsRes, instructorsRes, instructorTypesRes] = await Promise.all([
            axios.get(`${API_BASE_URL}/api/subjects`),
            axios.get(`${API_BASE_URL}/api/instructors`),
            axios.get(`${API_BASE_URL}/api/instructor-codes`)
        ]);
        subjects = subjectsRes.data;
        instructors = instructorsRes.data;
        instructorTypes = instructorTypesRes.data;
        renderSubjects();
    } catch (error) {
        console.error('과목 목록 로드 실패:', error);
        document.getElementById('app').innerHTML = '<div class="text-red-600 p-4">과목 목록을 불러오는데 실패했습니다.</div>';
    }
}

// 요일 변환 헬퍼 함수
function getDayName(dayOfWeek) {
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    return days[dayOfWeek] || '미정';
}

// 격주 정보 표시 함수
function getBiweeklyInfo(isBiweekly, weekOffset) {
    if (isBiweekly === 0) return '매주';
    return weekOffset === 0 ? '격주(1주차)' : '격주(2주차)';
}

function renderSubjects() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="bg-white rounded-lg shadow-md p-6">
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-2xl font-bold text-gray-800">
                    <i class="fas fa-book mr-2"></i>과목 목록 (총 ${subjects.length}개)
                </h2>
                <button onclick="window.showSubjectForm()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
                    <i class="fas fa-plus mr-2"></i>과목 추가
                </button>
            </div>
            
            <div id="subject-form" class="hidden mb-6 p-4 bg-gray-50 rounded-lg"></div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                ${subjects.map(subject => `
                    <div class="border rounded-lg p-4 hover:shadow-lg transition-shadow">
                        <div class="flex justify-between items-start mb-2">
                            <h3 class="text-xl font-bold text-blue-600">${subject.name}</h3>
                            <span class="text-xs bg-gray-100 px-2 py-1 rounded">${subject.code}</span>
                        </div>
                        <p class="text-gray-600 text-sm mt-1">
                            <i class="fas fa-user-tie mr-1"></i>${subject.instructor_name || '미정'}
                        </p>
                        <div class="text-sm text-gray-600 space-y-1 mt-2">
                            <p><i class="fas fa-calendar mr-2"></i>강의요일: ${getDayName(subject.day_of_week)}요일</p>
                            <p><i class="fas fa-repeat mr-2"></i>빈도: ${getBiweeklyInfo(subject.is_biweekly, subject.week_offset)}</p>
                            <p><i class="fas fa-clock mr-2"></i>강의시수: ${subject.hours || 0}시간</p>
                        </div>
                        ${subject.description ? `<p class="text-sm text-gray-500 mt-2"><i class="fas fa-briefcase mr-1"></i>직무분야: ${subject.description}</p>` : ''}
                        ${(() => {
                            const subs = [1, 2, 3, 4, 5]
                                .filter(i => subject[`sub_subject_${i}`] && subject[`sub_subject_${i}`].trim())
                                .map(i => `${subject[`sub_subject_${i}`]} (${subject[`sub_hours_${i}`] || 0}h)`);
                            return subs.length > 0 ? `
                                <div class="mt-2 pt-2 border-t">
                                    <p class="text-xs font-semibold text-gray-700 mb-1">교과목 주제:</p>
                                    <div class="text-xs text-gray-600 space-y-0.5">
                                        ${subs.map(s => `<p>• ${s}</p>`).join('')}
                                    </div>
                                </div>
                            ` : '';
                        })()}
                        <div class="mt-3 flex space-x-2">
                            <button onclick="window.editSubject('${subject.code}')" class="text-blue-600 hover:text-blue-800">
                                <i class="fas fa-edit"></i> 수정
                            </button>
                            <button onclick="window.deleteSubject('${subject.code}')" class="text-red-600 hover:text-red-800">
                                <i class="fas fa-trash"></i> 삭제
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

window.showSubjectForm = function(subjectCode = null) {
    const formDiv = document.getElementById('subject-form');
    const existingSubject = subjectCode ? subjects.find(s => s.code === subjectCode) : null;
    
    // 과목 코드 자동 생성 (G-001, G-002...)
    let autoCode = '';
    if (!subjectCode) {
        const maxCode = subjects.reduce((max, subj) => {
            const match = subj.code.match(/^G-(\d+)$/);
            if (match) {
                const num = parseInt(match[1]);
                return num > max ? num : max;
            }
            return max;
        }, 0);
        autoCode = `G-${String(maxCode + 1).padStart(3, '0')}`;
    }
    
    formDiv.innerHTML = `
        <h3 class="text-lg font-semibold mb-4">${subjectCode ? '과목 수정' : '과목 추가'}</h3>
        <form id="subject-save-form">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label class="block text-gray-700 mb-2">과목 코드 *</label>
                    <input type="text" name="code" value="${existingSubject?.code || autoCode}" 
                           ${subjectCode ? 'readonly' : 'readonly'} required
                           placeholder="G-001"
                           class="w-full px-3 py-2 border rounded-lg bg-gray-100">
                </div>
                <div>
                    <label class="block text-gray-700 mb-2">과목명 *</label>
                    <input type="text" name="name" value="${existingSubject?.name || ''}" required
                           class="w-full px-3 py-2 border rounded-lg">
                </div>
                <div>
                    <label class="block text-gray-700 mb-2">담당 강사 (주강사만)</label>
                    <select name="main_instructor" class="w-full px-3 py-2 border rounded-lg">
                        <option value="">선택</option>
                        ${instructors.filter(inst => {
                            const typeInfo = instructorTypes.find(t => t.code === inst.instructor_type);
                            return typeInfo && typeInfo.type === '1. 주강사';
                        }).map(inst => {
                            const typeInfo = instructorTypes.find(t => t.code === inst.instructor_type);
                            const typeName = typeInfo ? typeInfo.name : '';
                            const typeType = typeInfo ? typeInfo.type : '';
                            return `
                                <option value="${inst.code}" ${existingSubject?.main_instructor === inst.code ? 'selected' : ''}>
                                    ${inst.name} - ${inst.code} - ${typeName} - ${typeType}
                                </option>
                            `;
                        }).join('')}
                    </select>
                </div>
                <div>
                    <label class="block text-gray-700 mb-2">강의 요일 *</label>
                    <select name="day_of_week" class="w-full px-3 py-2 border rounded-lg" required>
                        <option value="">선택</option>
                        <option value="0" ${existingSubject?.day_of_week === 0 ? 'selected' : ''}>일요일</option>
                        <option value="1" ${existingSubject?.day_of_week === 1 ? 'selected' : ''}>월요일</option>
                        <option value="2" ${existingSubject?.day_of_week === 2 ? 'selected' : ''}>화요일</option>
                        <option value="3" ${existingSubject?.day_of_week === 3 ? 'selected' : ''}>수요일</option>
                        <option value="4" ${existingSubject?.day_of_week === 4 ? 'selected' : ''}>목요일</option>
                        <option value="5" ${existingSubject?.day_of_week === 5 ? 'selected' : ''}>금요일</option>
                        <option value="6" ${existingSubject?.day_of_week === 6 ? 'selected' : ''}>토요일</option>
                    </select>
                </div>
                <div>
                    <label class="block text-gray-700 mb-2">격주 여부</label>
                    <select name="is_biweekly" id="is-biweekly" class="w-full px-3 py-2 border rounded-lg" onchange="window.toggleWeekOffset()">
                        <option value="0" ${existingSubject?.is_biweekly === 0 ? 'selected' : ''}>매주</option>
                        <option value="1" ${existingSubject?.is_biweekly === 1 ? 'selected' : ''}>격주</option>
                    </select>
                </div>
                <div id="week-offset-div" class="${existingSubject?.is_biweekly === 1 ? '' : 'hidden'}">
                    <label class="block text-gray-700 mb-2">주차 선택</label>
                    <select name="week_offset" class="w-full px-3 py-2 border rounded-lg">
                        <option value="0" ${existingSubject?.week_offset === 0 ? 'selected' : ''}>1주차</option>
                        <option value="1" ${existingSubject?.week_offset === 1 ? 'selected' : ''}>2주차</option>
                    </select>
                </div>
                <div>
                    <label class="block text-gray-700 mb-2">강의 시수 (시간) *</label>
                    <input type="number" name="hours" value="${existingSubject?.hours || 0}" required
                           class="w-full px-3 py-2 border rounded-lg">
                </div>
                
                <!-- 교과목 주제 5개 -->
                <div class="col-span-2">
                    <label class="block text-gray-700 font-semibold mb-3">
                        <i class="fas fa-list mr-2"></i>교과목 주제 (최대 5개)
                    </label>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3 bg-blue-50 p-4 rounded-lg">
                        ${[1, 2, 3, 4, 5].map(i => `
                            <div class="flex items-center space-x-2">
                                <span class="text-sm font-semibold text-gray-600 w-12">${i}.</span>
                                <input type="text" name="sub_subject_${i}" 
                                       value="${existingSubject?.[`sub_subject_${i}`] || ''}"
                                       placeholder="교과목 주제 ${i}"
                                       class="flex-1 px-2 py-1 border rounded text-sm">
                                <input type="number" name="sub_hours_${i}" 
                                       value="${existingSubject?.[`sub_hours_${i}`] || 0}"
                                       placeholder="시수"
                                       class="w-16 px-2 py-1 border rounded text-sm">
                                <span class="text-xs text-gray-500">h</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="col-span-2">
                    <label class="block text-gray-700 mb-2">직무분야</label>
                    <textarea name="description" rows="3" placeholder="예: 웹 개발, 데이터 분석, AI 엔지니어링 등" class="w-full px-3 py-2 border rounded-lg">${existingSubject?.description || ''}</textarea>
                </div>
            </div>
            <div class="mt-4 space-x-2">
                <button type="button" onclick="window.saveSubject('${subjectCode || ''}')" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
                    <i class="fas fa-save mr-2"></i>저장
                </button>
                <button type="button" onclick="window.hideSubjectForm()" class="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded-lg">
                    취소
                </button>
            </div>
        </form>
    `;
    
    formDiv.classList.remove('hidden');
}

// 격주 선택 시 주차 선택 표시/숨김
window.toggleWeekOffset = function() {
    const isBiweekly = document.getElementById('is-biweekly').value;
    const weekOffsetDiv = document.getElementById('week-offset-div');
    if (isBiweekly === '1') {
        weekOffsetDiv.classList.remove('hidden');
    } else {
        weekOffsetDiv.classList.add('hidden');
    }
}

window.hideSubjectForm = function() {
    document.getElementById('subject-form').classList.add('hidden');
}

window.saveSubject = async function(subjectCode) {
    const form = document.getElementById('subject-save-form');
    const formData = new FormData(form);
    const data = {
        code: formData.get('code'),
        name: formData.get('name'),
        main_instructor: formData.get('main_instructor'),
        day_of_week: parseInt(formData.get('day_of_week')),
        is_biweekly: parseInt(formData.get('is_biweekly')),
        week_offset: parseInt(formData.get('week_offset')) || 0,
        hours: parseInt(formData.get('hours')) || 0,
        description: formData.get('description'),
        // 세부 교과목 5개
        sub_subject_1: formData.get('sub_subject_1') || '',
        sub_hours_1: parseInt(formData.get('sub_hours_1')) || 0,
        sub_subject_2: formData.get('sub_subject_2') || '',
        sub_hours_2: parseInt(formData.get('sub_hours_2')) || 0,
        sub_subject_3: formData.get('sub_subject_3') || '',
        sub_hours_3: parseInt(formData.get('sub_hours_3')) || 0,
        sub_subject_4: formData.get('sub_subject_4') || '',
        sub_hours_4: parseInt(formData.get('sub_hours_4')) || 0,
        sub_subject_5: formData.get('sub_subject_5') || '',
        sub_hours_5: parseInt(formData.get('sub_hours_5')) || 0
    };
    
    try {
        if (subjectCode) {
            await axios.put(`${API_BASE_URL}/api/subjects/${subjectCode}`, data);
            window.showAlert('과목이 수정되었습니다.');
        } else {
            await axios.post(`${API_BASE_URL}/api/subjects`, data);
            window.showAlert('과목이 추가되었습니다.');
        }
        window.hideSubjectForm();
        loadSubjects();
    } catch (error) {
        console.error('과목 저장 실패:', error);
        window.showAlert('저장 실패: ' + (error.response?.data?.detail || error.message));
    }
}

window.editSubject = function(subjectCode) {
    window.showSubjectForm(subjectCode);
}

window.deleteSubject = async function(subjectCode) {
    const confirmed = await window.showConfirm('이 과목을 삭제하시겠습니까?');
    if (!confirmed) return;
    
    try {
        await axios.delete(`${API_BASE_URL}/api/subjects/${subjectCode}`);
        window.showAlert('과목이 삭제되었습니다.');
        loadSubjects();
    } catch (error) {
        console.error('과목 삭제 실패:', error);
        window.showAlert('삭제 실패: ' + (error.response?.data?.detail || error.message));
    }
}

// ==================== 상담 관리 ====================
async function loadCounselings() {
    try {
        window.showLoading('상담 데이터를 불러오는 중...');
        const [counselingsRes, studentsRes, instructorsRes, coursesRes] = await Promise.all([
            axios.get(`${API_BASE_URL}/api/counselings`),
            axios.get(`${API_BASE_URL}/api/students`),
            axios.get(`${API_BASE_URL}/api/instructors`),
            axios.get(`${API_BASE_URL}/api/courses`)
        ]);
        counselings = counselingsRes.data;
        students = studentsRes.data;
        instructors = instructorsRes.data;
        courses = coursesRes.data;
        renderCounselings();
        window.hideLoading();
    } catch (error) {
        window.hideLoading();
        console.error('상담 목록 로드 실패:', error);
        document.getElementById('app').innerHTML = '<div class="text-red-600 p-4">상담 목록을 불러오는데 실패했습니다.</div>';
    }
}

function renderCounselings() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="bg-white rounded-lg shadow-md p-6">
            <h2 class="text-2xl font-bold text-gray-800 mb-6">
                <i class="fas fa-comments mr-2"></i>상담 관리
            </h2>
            
            <!-- 검색 및 필터 -->
            <div class="bg-gray-50 p-4 rounded-lg mb-6">
                <div class="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
                    <div>
                        <label class="block text-sm text-gray-700 mb-1">과정 선택</label>
                        <select id="filter-course" class="w-full border rounded px-3 py-2" onchange="window.updateStudentsByCourse(); window.filterCounselings();">
                            <option value="">전체 과정</option>
                            ${courses.map(c => `<option value="${c.code}">${c.name || c.code}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm text-gray-700 mb-1">학생 선택</label>
                        <select id="filter-student" class="w-full border rounded px-3 py-2" onchange="window.filterCounselings()">
                            <option value="">전체 학생</option>
                            ${students.map(s => `<option value="${s.id}">${s.name} (${s.code})</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm text-gray-700 mb-1">상담 선생님</label>
                        <select id="filter-instructor" class="w-full border rounded px-3 py-2" onchange="window.filterCounselings()">
                            <option value="">전체</option>
                            ${instructors.map(i => `<option value="${i.code}">${i.name}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm text-gray-700 mb-1">시작 날짜</label>
                        <input type="date" id="filter-start-date" class="w-full border rounded px-3 py-2" onchange="window.filterCounselings()">
                    </div>
                    <div>
                        <label class="block text-sm text-gray-700 mb-1">종료 날짜</label>
                        <input type="date" id="filter-end-date" class="w-full border rounded px-3 py-2" onchange="window.filterCounselings()">
                    </div>
                </div>
                <div class="flex gap-2">
                    <input type="text" id="filter-content" placeholder="상담 내용 검색..." 
                           class="flex-1 border rounded px-3 py-2"
                           onkeyup="window.debouncedFilterCounselings()">
                    <button onclick="window.filterCounselings()" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded">
                        <i class="fas fa-search mr-2"></i>검색
                    </button>
                    <button onclick="window.resetCounselingFilters()" class="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded">
                        <i class="fas fa-redo mr-2"></i>초기화
                    </button>
                    <button onclick="window.showCounselingForm()" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded">
                        <i class="fas fa-plus mr-2"></i>상담 추가
                    </button>
                </div>
            </div>
            
            <div id="student-detail" class="hidden mb-6 p-4 bg-green-50 rounded-lg"></div>
            <div id="counseling-form" class="hidden mb-6 p-4 bg-blue-50 rounded-lg"></div>
            
            <!-- 상담 목록 그리드 -->
            <div id="counseling-list">
                <p class="text-sm text-gray-600 mb-4">총 ${counselings.length}건의 상담</p>
                <div class="overflow-x-auto">
                    <table class="min-w-full bg-white border">
                        <thead class="bg-gray-100">
                            <tr>
                                <th class="px-3 py-2 text-left text-xs">날짜</th>
                                <th class="px-3 py-2 text-left text-xs">학생</th>
                                <th class="px-3 py-2 text-left text-xs">상담선생님</th>
                                <th class="px-3 py-2 text-left text-xs">유형</th>
                                <th class="px-3 py-2 text-left text-xs">상담내용</th>
                                <th class="px-3 py-2 text-left text-xs">상태</th>
                                <th class="px-3 py-2 text-left text-xs">작업</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${counselings.map(c => `
                                <tr class="border-t hover:bg-gray-50">
                                    <td class="px-3 py-2 text-xs">${formatDateWithDay(c.consultation_date)}</td>
                                    <td class="px-3 py-2 text-xs">
                                        <button onclick="window.showStudentDetail(${c.student_id})" 
                                                class="text-blue-600 hover:underline">
                                            ${c.student_name} (${c.student_code})
                                        </button>
                                    </td>
                                    <td class="px-3 py-2 text-xs">${c.instructor_name || '-'}</td>
                                    <td class="px-3 py-2 text-xs">
                                        <span class="px-2 py-1 rounded text-xs ${
                                            c.consultation_type === '긴급' ? 'bg-red-100 text-red-800' :
                                            c.consultation_type === '정기' ? 'bg-blue-100 text-blue-800' :
                                            c.consultation_type === '학생요청' ? 'bg-purple-100 text-purple-800' :
                                            'bg-gray-100 text-gray-800'
                                        }">
                                            ${c.consultation_type || '정기'}
                                        </span>
                                    </td>
                                    <td class="px-3 py-2 text-xs max-w-xs truncate">${c.content || '-'}</td>
                                    <td class="px-3 py-2 text-xs">
                                        <span class="px-2 py-1 rounded text-xs ${
                                            c.status === '완료' ? 'bg-green-100 text-green-800' :
                                            c.status === '취소' ? 'bg-gray-100 text-gray-800' :
                                            'bg-yellow-100 text-yellow-800'
                                        }">
                                            ${c.status || '완료'}
                                        </span>
                                    </td>
                                    <td class="px-3 py-2 text-xs">
                                        ${c.photo_urls && JSON.parse(c.photo_urls || '[]').length > 0 ? `
                                            <i class="fas fa-camera text-green-600 mr-2" title="${JSON.parse(c.photo_urls).length}개 사진"></i>
                                        ` : ''}
                                        <button onclick="window.editCounseling(${c.id})" class="text-blue-600 hover:text-blue-800 mr-2">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        <button onclick="window.deleteCounseling(${c.id})" class="text-red-600 hover:text-red-800">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

window.filterCounselings = async function() {
    // 학생 상세정보와 상담 수정창 닫기
    window.hideStudentDetail();
    window.hideCounselingForm();
    
    const courseCode = document.getElementById('filter-course').value;
    const studentId = document.getElementById('filter-student').value;
    const instructorCode = document.getElementById('filter-instructor').value;
    const startDate = document.getElementById('filter-start-date').value;
    const endDate = document.getElementById('filter-end-date').value;
    const contentSearch = document.getElementById('filter-content').value;
    
    try {
        let url = `${API_BASE_URL}/api/counselings?`;
        if (studentId) url += `student_id=${studentId}&`;
        if (courseCode) url += `course_code=${courseCode}&`;
        
        const response = await axios.get(url);
        let filtered = response.data;
        
        // 프론트엔드에서 추가 필터링
        if (instructorCode) {
            filtered = filtered.filter(c => c.instructor_code === instructorCode);
        }
        if (startDate) {
            filtered = filtered.filter(c => c.consultation_date >= startDate);
        }
        if (endDate) {
            filtered = filtered.filter(c => c.consultation_date <= endDate);
        }
        if (contentSearch) {
            const search = contentSearch.toLowerCase();
            filtered = filtered.filter(c => 
                (c.content && c.content.toLowerCase().includes(search)) ||
                (c.main_topic && c.main_topic.toLowerCase().includes(search))
            );
        }
        
        counselings = filtered;
        
        // 목록만 다시 렌더링
        const listDiv = document.getElementById('counseling-list');
        listDiv.innerHTML = `
            <p class="text-sm text-gray-600 mb-4">총 ${counselings.length}건의 상담</p>
            <div class="overflow-x-auto">
                <table class="min-w-full bg-white border">
                    <thead class="bg-gray-100">
                        <tr>
                            <th class="px-3 py-2 text-left text-xs">날짜</th>
                            <th class="px-3 py-2 text-left text-xs">학생</th>
                            <th class="px-3 py-2 text-left text-xs">상담선생님</th>
                            <th class="px-3 py-2 text-left text-xs">유형</th>
                            <th class="px-3 py-2 text-left text-xs">상담내용</th>
                            <th class="px-3 py-2 text-left text-xs">상태</th>
                            <th class="px-3 py-2 text-left text-xs">작업</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${counselings.map(c => `
                            <tr class="border-t hover:bg-gray-50">
                                <td class="px-3 py-2 text-xs">${formatDateWithDay(c.consultation_date)}</td>
                                <td class="px-3 py-2 text-xs">
                                    <button onclick="window.showStudentDetail(${c.student_id})" 
                                            class="text-blue-600 hover:underline">
                                        ${c.student_name} (${c.student_code})
                                    </button>
                                </td>
                                <td class="px-3 py-2 text-xs">${c.instructor_name || '-'}</td>
                                <td class="px-3 py-2 text-xs">
                                    <span class="px-2 py-1 rounded text-xs ${
                                        c.consultation_type === '긴급' ? 'bg-red-100 text-red-800' :
                                        c.consultation_type === '정기' ? 'bg-blue-100 text-blue-800' :
                                        c.consultation_type === '학생요청' ? 'bg-purple-100 text-purple-800' :
                                        'bg-gray-100 text-gray-800'
                                    }">
                                        ${c.consultation_type || '정기'}
                                    </span>
                                </td>
                                <td class="px-3 py-2 text-xs max-w-xs truncate">${c.content || '-'}</td>
                                <td class="px-3 py-2 text-xs">
                                    <span class="px-2 py-1 rounded text-xs ${
                                        c.status === '완료' ? 'bg-green-100 text-green-800' :
                                        c.status === '취소' ? 'bg-gray-100 text-gray-800' :
                                        'bg-yellow-100 text-yellow-800'
                                    }">
                                        ${c.status || '완료'}
                                    </span>
                                </td>
                                <td class="px-3 py-2 text-xs">
                                    <button onclick="window.editCounseling(${c.id})" class="text-blue-600 hover:text-blue-800 mr-2">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button onclick="window.deleteCounseling(${c.id})" class="text-red-600 hover:text-red-800">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (error) {
        console.error('상담 필터링 실패:', error);
    }
}

window.resetCounselingFilters = function() {
    // 학생 상세정보와 상담 수정창 닫기
    window.hideStudentDetail();
    window.hideCounselingForm();
    
    document.getElementById('filter-course').value = '';
    document.getElementById('filter-student').value = '';
    document.getElementById('filter-instructor').value = '';
    document.getElementById('filter-start-date').value = '';
    document.getElementById('filter-end-date').value = '';
    document.getElementById('filter-content').value = '';
    window.updateStudentsByCourse();
    loadCounselings();
}

window.updateStudentsByCourse = function() {
    const courseCode = document.getElementById('filter-course').value;
    const studentSelect = document.getElementById('filter-student');
    
    // 학생 목록 필터링
    const filteredStudents = courseCode 
        ? students.filter(s => s.course_code === courseCode)
        : students;
    
    // 학생 드롭다운 업데이트
    studentSelect.innerHTML = `
        <option value="">전체 학생</option>
        ${filteredStudents.map(s => `<option value="${s.id}">${s.name} (${s.code})</option>`).join('')}
    `;
}

window.showStudentDetail = async function(studentId) {
    try {
        // 상담 수정창 닫기
        window.hideCounselingForm();
        
        // 기존 상세 정보 초기화
        const detailDiv = document.getElementById('student-detail');
        detailDiv.innerHTML = '<div class="p-4 text-center"><i class="fas fa-spinner fa-spin mr-2"></i>로딩 중...</div>';
        detailDiv.classList.remove('hidden');
        
        // 학생 정보 조회
        const studentRes = await axios.get(`${API_BASE_URL}/api/students/${studentId}`);
        const student = studentRes.data;
        
        // 해당 학생의 상담 이력 조회
        const counselingRes = await axios.get(`${API_BASE_URL}/api/counselings?student_id=${studentId}`);
        const studentCounselings = counselingRes.data;
        
        // 과정 정보 조회
        let courseInfo = '';
        if (student.course_code) {
            try {
                const courseRes = await axios.get(`${API_BASE_URL}/api/courses`);
                const course = courseRes.data.find(c => c.code === student.course_code);
                if (course) {
                    courseInfo = `${course.code} - ${course.name || course.code}`;
                } else {
                    courseInfo = student.course_code;
                }
            } catch (e) {
                courseInfo = student.course_code;
            }
        }
        
        // detailDiv는 함수 시작 부분에서 이미 선언됨
        detailDiv.innerHTML = `
            <div class="flex justify-between items-start mb-4">
                <h3 class="text-xl font-bold text-gray-800">
                    <i class="fas fa-user-circle mr-2"></i>학생 상세 정보
                </h3>
                <button onclick="window.hideStudentDetail()" class="text-gray-600 hover:text-gray-800">
                    <i class="fas fa-times text-xl"></i>
                </button>
            </div>
            
            <div class="flex gap-6 mb-6">
                <!-- 사진 영역 -->
                ${student.photo_path || student.thumbnail ? `
                    <div class="flex-shrink-0">
                        <img src="${student.thumbnail || student.photo_path}" 
                             alt="${student.name}" 
                             class="w-32 h-32 object-cover rounded-lg shadow-md"
                             onerror="this.style.display='none'">
                    </div>
                ` : ''}
                
                <!-- 기본 정보 -->
                <div class="flex-1">
                    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div class="bg-white p-4 rounded shadow-sm">
                            <p class="text-xs text-gray-500 mb-1">학생코드</p>
                            <p class="text-lg font-bold">${student.code}</p>
                        </div>
                        <div class="bg-white p-4 rounded shadow-sm">
                            <p class="text-xs text-gray-500 mb-1">이름</p>
                            <p class="text-lg font-bold">${student.name}</p>
                        </div>
                        <div class="bg-white p-4 rounded shadow-sm">
                            <p class="text-xs text-gray-500 mb-1">생년월일</p>
                            <p class="text-lg font-bold">${student.birth_date ? formatDateWithDay(student.birth_date) : '-'}</p>
                        </div>
                        <div class="bg-white p-4 rounded shadow-sm">
                            <p class="text-xs text-gray-500 mb-1">성별</p>
                            <p class="text-lg font-bold">${student.gender || '-'}</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- 연락처 및 학적 정보 -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div class="bg-white p-4 rounded shadow-sm">
                    <p class="text-xs text-gray-500 mb-1">연락처</p>
                    <p class="text-sm font-semibold">${student.phone || '-'}</p>
                </div>
                <div class="bg-white p-4 rounded shadow-sm col-span-2">
                    <p class="text-xs text-gray-500 mb-1">이메일</p>
                    <p class="text-sm font-semibold">${student.email || '-'}</p>
                </div>
                <div class="bg-white p-4 rounded shadow-sm">
                    <p class="text-xs text-gray-500 mb-1">캠퍼스</p>
                    <p class="text-sm font-semibold">${student.campus || '-'}</p>
                </div>
                <div class="bg-white p-4 rounded shadow-sm col-span-2">
                    <p class="text-xs text-gray-500 mb-1">학력</p>
                    <p class="text-sm font-semibold">${student.education || '-'}</p>
                </div>
                <div class="bg-white p-4 rounded shadow-sm col-span-2">
                    <p class="text-xs text-gray-500 mb-1">과정</p>
                    <p class="text-sm font-semibold text-blue-600">${courseInfo || '-'}</p>
                </div>
                <div class="bg-white p-4 rounded shadow-sm col-span-2">
                    <p class="text-xs text-gray-500 mb-1">관심분야</p>
                    <p class="text-sm font-semibold">${student.interests || '-'}</p>
                </div>
                <div class="bg-white p-4 rounded shadow-sm col-span-2">
                    <p class="text-xs text-gray-500 mb-1">주소</p>
                    <p class="text-sm font-semibold">${student.address || '-'}</p>
                </div>
                <div class="bg-white p-4 rounded shadow-sm">
                    <p class="text-xs text-gray-500 mb-1">등록일</p>
                    <p class="text-sm font-semibold">${student.registered_at ? formatDateWithDay(student.registered_at.split('T')[0]) : '-'}</p>
                </div>
            </div>
            
            <!-- 자기소개 -->
            ${student.introduction || student.self_introduction ? `
                <div class="bg-white p-4 rounded shadow-sm mb-6">
                    <h4 class="font-bold text-lg mb-2">
                        <i class="fas fa-file-alt mr-2"></i>자기소개
                    </h4>
                    <p class="text-gray-700 whitespace-pre-wrap">${student.introduction || student.self_introduction}</p>
                </div>
            ` : ''}
            
            <!-- 비고 -->
            ${student.notes ? `
                <div class="bg-white p-4 rounded shadow-sm mb-6">
                    <h4 class="font-bold text-lg mb-2">
                        <i class="fas fa-sticky-note mr-2"></i>비고
                    </h4>
                    <p class="text-gray-700 whitespace-pre-wrap">${student.notes}</p>
                </div>
            ` : ''}
        `;
        
        // detailDiv는 이미 함수 시작 부분에서 표시됨
        detailDiv.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        console.error('학생 정보 조회 실패:', error);
        const detailDiv = document.getElementById('student-detail');
        detailDiv.innerHTML = '<div class="p-4 text-center text-red-600"><i class="fas fa-exclamation-triangle mr-2"></i>학생 정보를 불러오는데 실패했습니다.</div>';
    }
}

window.hideStudentDetail = function() {
    document.getElementById('student-detail').classList.add('hidden');
}

window.showCounselingForm = function(counselingId = null) {
    const formDiv = document.getElementById('counseling-form');
    const existingCounseling = counselingId ? counselings.find(c => c.id === counselingId) : null;
    
    // 기존 데이터에 main_topic이 있으면 content와 합침
    let mergedContent = existingCounseling?.content || '';
    if (existingCounseling?.main_topic && !mergedContent.includes(existingCounseling.main_topic)) {
        mergedContent = `[${existingCounseling.main_topic}]\n\n${mergedContent}`;
    }
    
    formDiv.innerHTML = `
        <div class="flex justify-between items-start mb-4">
            <h3 class="text-lg font-semibold">${counselingId ? '상담 수정' : '상담 추가'}</h3>
            <button onclick="window.hideCounselingForm()" class="text-gray-600 hover:text-gray-800">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <form id="counseling-save-form">
            <input type="hidden" id="counseling-id" value="${counselingId || ''}">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label class="block text-gray-700 mb-2">학생 선택 *</label>
                    <select name="student_id" required class="w-full px-3 py-2 border rounded-lg">
                        <option value="">선택하세요</option>
                        ${students.map(s => `
                            <option value="${s.id}" ${existingCounseling?.student_id === s.id ? 'selected' : ''}>
                                ${s.name} (${s.code})
                            </option>
                        `).join('')}
                    </select>
                </div>
                <div>
                    <label class="block text-gray-700 mb-2">상담 선생님 *</label>
                    <select name="instructor_code" required class="w-full px-3 py-2 border rounded-lg">
                        <option value="">선택하세요</option>
                        ${instructors.map(i => `
                            <option value="${i.code}" ${existingCounseling?.instructor_code === i.code ? 'selected' : ''}>
                                ${i.name}
                            </option>
                        `).join('')}
                    </select>
                </div>
                <div>
                    <label class="block text-gray-700 mb-2">상담 날짜 *</label>
                    <input type="date" name="consultation_date" 
                           value="${existingCounseling?.consultation_date?.substring(0, 10) || ''}" 
                           required class="w-full px-3 py-2 border rounded-lg">
                </div>
                <div>
                    <label class="block text-gray-700 mb-2">상담 유형</label>
                    <select name="consultation_type" class="w-full px-3 py-2 border rounded-lg">
                        <option value="정기" ${existingCounseling?.consultation_type === '정기' ? 'selected' : ''}>정기</option>
                        <option value="수시" ${existingCounseling?.consultation_type === '수시' ? 'selected' : ''}>수시</option>
                        <option value="긴급" ${existingCounseling?.consultation_type === '긴급' ? 'selected' : ''}>긴급</option>
                        <option value="학부모" ${existingCounseling?.consultation_type === '학부모' ? 'selected' : ''}>학부모</option>
                        <option value="학생요청" ${existingCounseling?.consultation_type === '학생요청' ? 'selected' : ''}>학생요청</option>
                    </select>
                </div>
                <div>
                    <label class="block text-gray-700 mb-2">상태</label>
                    <select name="status" class="w-full px-3 py-2 border rounded-lg">
                        <option value="예정" ${existingCounseling?.status === '예정' ? 'selected' : ''}>예정</option>
                        <option value="완료" ${existingCounseling?.status === '완료' ? 'selected' : ''}>완료</option>
                        <option value="취소" ${existingCounseling?.status === '취소' ? 'selected' : ''}>취소</option>
                    </select>
                </div>
                <div class="col-span-2">
                    <label class="block text-gray-700 mb-2">상담 내용 *</label>
                    <textarea name="content" rows="6" required placeholder="상담 내용을 상세히 작성하세요..." 
                              class="w-full px-3 py-2 border rounded-lg">${mergedContent}</textarea>
                </div>
                
                <!-- 사진 업로드 -->
                <div class="col-span-2">
                    <label class="block text-gray-700 mb-2">
                        <i class="fas fa-camera mr-2"></i>사진 첨부
                    </label>
                    <div class="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
                        <div class="flex flex-wrap gap-2 mb-3">
                            <button type="button" onclick="document.getElementById('counseling-file-input').click()" 
                                    class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
                                <i class="fas fa-folder-open mr-2"></i>파일 선택
                            </button>
                            <button type="button" onclick="document.getElementById('counseling-camera-input').click()" 
                                    class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded">
                                <i class="fas fa-camera mr-2"></i>사진 촬영
                            </button>
                        </div>
                        <div id="counseling-upload-progress" class="hidden mb-3">
                            <div class="bg-blue-50 border border-blue-200 rounded p-3">
                                <p class="text-sm text-blue-800 mb-2">
                                    <i class="fas fa-cloud-upload-alt mr-2"></i>
                                    서버에 업로드 후 자동 저장됩니다. 잠시만 기다리세요...
                                </p>
                                <div class="w-full bg-blue-200 rounded-full h-2">
                                    <div id="counseling-progress-bar" class="bg-blue-600 h-2 rounded-full transition-all duration-300" style="width: 0%"></div>
                                </div>
                            </div>
                        </div>
                        <input type="file" id="counseling-file-input" accept="image/*" multiple 
                               onchange="window.handleCounselingImageUpload(event)" class="hidden">
                        <input type="file" id="counseling-camera-input" accept="image/*"  
                               onchange="window.handleCounselingImageUpload(event)" class="hidden">
                        <div id="counseling-photos-preview" class="flex flex-col gap-2 mt-2">
                            ${existingCounseling?.photo_urls ? JSON.parse(existingCounseling.photo_urls).map((url, idx) => `
                                <div class="relative group">
                                    <img src="${url}" class="w-full h-24 object-cover rounded border">
                                    <button type="button" onclick="window.removeCounselingPhoto(${idx})" 
                                            class="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                                        <i class="fas fa-times text-xs"></i>
                                    </button>
                                </div>
                            `).join('') : ''}
                        </div>
                        <input type="hidden" id="counseling-photo-urls" value='${existingCounseling?.photo_urls || "[]"}'>
                        <p class="text-sm text-gray-500 mt-2">
                            <i class="fas fa-info-circle mr-1"></i>
                            최대 10MB, JPG/PNG/GIF 형식
                        </p>
                    </div>
                </div>
            </div>
            <div class="mt-4 space-x-2">
                <button type="button" onclick="window.saveCounseling(${counselingId || 'null'})" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
                    <i class="fas fa-save mr-2"></i>저장
                </button>
                <button type="button" onclick="window.hideCounselingForm()" class="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded-lg">
                    취소
                </button>
            </div>
        </form>
    `;
    
    formDiv.classList.remove('hidden');
    formDiv.scrollIntoView({ behavior: 'smooth' });
    
    // 기존 사진 미리보기 표시
    if (existingCounseling && existingCounseling.photo_urls) {
        try {
            const photoUrls = typeof existingCounseling.photo_urls === 'string' 
                ? JSON.parse(existingCounseling.photo_urls) 
                : existingCounseling.photo_urls;
            updateCounselingPhotoPreview(photoUrls);
        } catch (e) {
            console.error('사진 URL 파싱 오류:', e);
        }
    }
}

window.hideCounselingForm = function() {
    document.getElementById('counseling-form').classList.add('hidden');
}

window.saveCounseling = async function(counselingId, autoSave = false) {
    const form = document.getElementById('counseling-save-form');
    const formData = new FormData(form);
    const photoUrls = document.getElementById('counseling-photo-urls').value || '[]';
    
    const data = {
        student_id: parseInt(formData.get('student_id')),
        instructor_code: formData.get('instructor_code'),
        consultation_date: formData.get('consultation_date'),
        consultation_type: formData.get('consultation_type'),
        main_topic: '', // 주제는 더 이상 사용하지 않음
        content: formData.get('content'),
        status: formData.get('status'),
        photo_urls: photoUrls  // 사진 URL 추가
    };
    
    try {
        if (counselingId) {
            await axios.put(`${API_BASE_URL}/api/counselings/${counselingId}`, data);
            if (!autoSave) {
                window.showAlert('상담이 수정되었습니다.');
            }
        } else {
            await axios.post(`${API_BASE_URL}/api/counselings`, data);
            if (!autoSave) {
                window.showAlert('상담이 추가되었습니다.');
            }
        }
        if (!autoSave) {
            window.hideCounselingForm();
            loadCounselings();
        }
    } catch (error) {
        console.error('상담 저장 실패:', error);
        window.showAlert('저장 실패: ' + (error.response?.data?.detail || error.message));
    }
}

// 상담일지 사진 업로드 처리
window.handleCounselingImageUpload = async function(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    // 프로그레스 바 표시
    const progressDiv = document.getElementById('counseling-upload-progress');
    const progressBar = document.getElementById('counseling-progress-bar');
    if (progressDiv) {
        progressDiv.classList.remove('hidden');
        progressBar.style.width = '0%';
    }
    
    try {
        const photoUrls = JSON.parse(document.getElementById('counseling-photo-urls').value || '[]');
        const totalFiles = files.length;
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const formData = new FormData();
            formData.append('file', file);
            
            // 프로그레스 업데이트
            const progress = ((i + 0.5) / totalFiles) * 100;
            if (progressBar) progressBar.style.width = `${progress}%`;
            
            const response = await axios.post(
                `${API_BASE_URL}/api/upload-image?category=guidance`,
                formData,
                {
                    headers: { 'Content-Type': 'multipart/form-data' }
                }
            );
            
            if (response.data.success) {
                photoUrls.push(response.data.url);
            }
            
            // 완료 프로그레스
            const completeProgress = ((i + 1) / totalFiles) * 100;
            if (progressBar) progressBar.style.width = `${completeProgress}%`;
        }
        
        // hidden input 업데이트
        document.getElementById('counseling-photo-urls').value = JSON.stringify(photoUrls);
        
        // 미리보기 업데이트
        updateCounselingPhotoPreview(photoUrls);
        
        // 자동 저장 (화면 유지)
        const counselingIdInput = document.getElementById('counseling-id');
        const counselingId = counselingIdInput ? counselingIdInput.value : null;
        if (counselingId) {
            // 기존 상담일지 업데이트
            await window.saveCounseling(parseInt(counselingId), true);
        }
        
        // 프로그레스 바 숨기기
        if (progressDiv) {
            setTimeout(() => {
                progressDiv.classList.add('hidden');
            }, 1000);
        }
        
        // 학생 이름 가져오기
        const studentSelect = document.querySelector('#counseling-save-form select[name="student_id"]');
        const studentName = studentSelect ? studentSelect.options[studentSelect.selectedIndex].text : '';
        const contextMsg = studentName ? `${studentName} 학생의 상담일지에 ` : '';
        window.showAlert(`${contextMsg}${files.length}개 사진이 업로드되고 자동 저장되었습니다.`);
        
    } catch (error) {
        // 프로그레스 바 숨기기
        if (progressDiv) progressDiv.classList.add('hidden');
        
        console.error('사진 업로드 실패:', error);
        window.showAlert('사진 업로드 실패: ' + (error.response?.data?.detail || error.message));
    }
    
    // input 초기화
    event.target.value = '';
}

window.removeCounselingPhoto = async function(index) {
    const photoUrls = JSON.parse(document.getElementById('counseling-photo-urls').value || '[]');
    photoUrls.splice(index, 1);
    document.getElementById('counseling-photo-urls').value = JSON.stringify(photoUrls);
    updateCounselingPhotoPreview(photoUrls);
    
    // 자동 저장 (화면 유지)
    const counselingIdInput = document.getElementById('counseling-id');
    const counselingId = counselingIdInput ? counselingIdInput.value : null;
    if (counselingId) {
        await window.saveCounseling(parseInt(counselingId), true);
        
        // 학생 이름 가져오기
        const studentSelect = document.querySelector('#counseling-save-form select[name="student_id"]');
        const studentName = studentSelect ? studentSelect.options[studentSelect.selectedIndex].text : '';
        const contextMsg = studentName ? `${studentName} 학생의 상담일지에서 ` : '';
        window.showAlert(`${contextMsg}사진이 삭제되고 자동 저장되었습니다.`);
    }
}

function updateCounselingPhotoPreview(photoUrls) {
    const previewDiv = document.getElementById('counseling-photos-preview');
    if (!photoUrls || photoUrls.length === 0) {
        previewDiv.innerHTML = '<p class="text-gray-400 text-sm">첨부된 사진이 없습니다</p>';
        return;
    }
    
    previewDiv.innerHTML = photoUrls.map((url, idx) => `
        <div class="flex items-center gap-3 bg-white border rounded p-2 hover:bg-gray-50">
            <a href="${API_BASE_URL}/api/download-image?url=${encodeURIComponent(url)}" download class="flex-shrink-0">
                <img src="${API_BASE_URL}/api/thumbnail?url=${encodeURIComponent(url)}" 
                     alt="사진 ${idx + 1}"
                     class="w-16 h-16 object-cover rounded border cursor-pointer hover:opacity-80"
                     onerror="this.onerror=null; this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Crect fill=%22%23e5e7eb%22 width=%22100%22 height=%22100%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%239ca3af%22 font-size=%2240%22%3E📷%3C/text%3E%3C/svg%3E';">
            </a>
            <div class="flex-1">
                <a href="${API_BASE_URL}/api/download-image?url=${encodeURIComponent(url)}" download 
                   class="text-blue-600 hover:underline text-sm block">
                    사진 ${idx + 1} 다운로드
                </a>
                <p class="text-xs text-gray-500 mt-1">클릭하여 다운로드</p>
            </div>
            <button type="button" onclick="window.removeCounselingPhoto(${idx})" 
                    class="text-red-500 hover:text-red-700 px-2">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');
}

window.editCounseling = function(counselingId) {
    window.showCounselingForm(counselingId);
}

window.deleteCounseling = async function(counselingId) {
    const confirmed = await window.showConfirm('이 상담 기록을 삭제하시겠습니까?');
    if (!confirmed) return;
    
    try {
        await axios.delete(`${API_BASE_URL}/api/counselings/${counselingId}`);
        window.showAlert('상담이 삭제되었습니다.');
        loadCounselings();
    } catch (error) {
        console.error('상담 삭제 실패:', error);
        window.showAlert('삭제 실패: ' + (error.response?.data?.detail || error.message));
    }
}

// ==================== AI 생기부 ====================
let selectedStudentForAI = null;
let studentCounselings = [];
let generatedReport = null;

function renderAIReport() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="bg-white rounded-lg shadow-md p-6">
            <h2 class="text-2xl font-bold text-gray-800 mb-6">
                <i class="fas fa-robot mr-2"></i>AI 생활기록부 작성
            </h2>
            
            <div class="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
                <p class="text-blue-700">
                    <i class="fas fa-info-circle mr-2"></i>
                    학생을 선택하면 모든 상담 기록을 기반으로 종합 의견을 AI가 생성합니다.
                </p>
            </div>
            
            <!-- 학생 선택 및 스타일 옵션 -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">학생 선택</label>
                    <select id="ai-student-select" onchange="window.loadStudentCounselings()" class="w-full border rounded px-3 py-2">
                        <option value="">-- 학생을 선택하세요 --</option>
                        ${students.map(s => `
                            <option value="${s.id}">${s.name} (${s.code})</option>
                        `).join('')}
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">작성 스타일</label>
                    <select id="ai-report-style" class="w-full border rounded px-3 py-2">
                        <option value="formal">공식적 (정식 생활기록부 양식)</option>
                        <option value="friendly">친근한 (따뜻하고 격려적인 톤)</option>
                        <option value="detailed">상세 분석 (심층 평가 및 분석)</option>
                    </select>
                </div>
            </div>
            
            <!-- 상담 기록 리스트 -->
            <div id="counseling-records-section" class="hidden">
                <h3 class="text-lg font-semibold text-gray-800 mb-4">
                    <i class="fas fa-list mr-2"></i>상담 기록 (총 <span id="counseling-count">0</span>건)
                </h3>
                <div id="counseling-records-list" class="space-y-3 mb-6">
                    <!-- 상담 기록이 여기에 표시됩니다 -->
                </div>
                
                <button onclick="window.generateAIReport()" class="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6 py-3 rounded-lg shadow-lg transform transition hover:scale-105">
                    <i class="fas fa-magic mr-2"></i>AI 생기부 생성
                </button>
            </div>
            
            <!-- AI 생성 결과 -->
            <div id="ai-report-result" class="hidden mt-8">
                <h3 class="text-lg font-semibold text-gray-800 mb-4">
                    <i class="fas fa-file-alt mr-2"></i>생성된 AI 생활기록부
                </h3>
                <div id="ai-report-content" class="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6 whitespace-pre-wrap">
                    <!-- AI 생성 내용이 여기에 표시됩니다 -->
                </div>
                
                <div class="mt-4 space-x-2">
                    <button onclick="window.copyAIReport()" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded">
                        <i class="fas fa-copy mr-2"></i>복사
                    </button>
                    <button onclick="window.downloadAIReport()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
                        <i class="fas fa-download mr-2"></i>다운로드
                    </button>
                </div>
            </div>
            
            <!-- 로딩 스피너 -->
            <div id="ai-loading" class="hidden mt-6 text-center">
                <i class="fas fa-spinner fa-spin text-4xl text-purple-600 mb-4"></i>
                <p class="text-gray-600">AI가 생기부를 작성하고 있습니다... (약 10-20초 소요)</p>
            </div>
        </div>
    `;
}

window.loadStudentCounselings = async function() {
    const studentId = document.getElementById('ai-student-select').value;
    
    if (!studentId) {
        document.getElementById('counseling-records-section').classList.add('hidden');
        document.getElementById('ai-report-result').classList.add('hidden');
        return;
    }
    
    selectedStudentForAI = parseInt(studentId);
    
    try {
        // 학생의 모든 상담 기록 가져오기
        const response = await axios.get(`${API_BASE_URL}/api/counselings?student_id=${studentId}`);
        studentCounselings = response.data;
        
        // 상담 기록 표시
        const recordsList = document.getElementById('counseling-records-list');
        const counselingCount = document.getElementById('counseling-count');
        
        counselingCount.textContent = studentCounselings.length;
        
        if (studentCounselings.length === 0) {
            recordsList.innerHTML = `
                <div class="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center text-gray-500">
                    <i class="fas fa-inbox mr-2"></i>상담 기록이 없습니다.
                </div>
            `;
            document.getElementById('counseling-records-section').classList.remove('hidden');
            return;
        }
        
        recordsList.innerHTML = studentCounselings.map((c, index) => `
            <div class="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition ${c.status === '완료' ? 'bg-green-50 border-green-200' : ''}">
                <div class="flex justify-between items-start mb-2">
                    <div class="flex items-center space-x-2">
                        <span class="bg-purple-100 text-purple-800 text-xs font-semibold px-2 py-1 rounded">
                            ${index + 1}회차
                        </span>
                        <span class="text-sm font-medium text-gray-700">
                            ${c.consultation_date ? new Date(c.consultation_date).toLocaleDateString('ko-KR') : '-'}
                        </span>
                        <span class="text-xs px-2 py-1 rounded ${
                            c.consultation_type === '정기' ? 'bg-blue-100 text-blue-800' :
                            c.consultation_type === '수시' ? 'bg-green-100 text-green-800' :
                            c.consultation_type === '긴급' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                        }">
                            ${c.consultation_type}
                        </span>
                        <span class="text-xs px-2 py-1 rounded ${
                            c.status === '완료' ? 'bg-green-100 text-green-800' :
                            c.status === '예정' ? 'bg-gray-100 text-gray-800' :
                            'bg-red-100 text-red-800'
                        }">
                            ${c.status}
                        </span>
                    </div>
                </div>
                <div class="text-sm">
                    <p class="font-semibold text-gray-800 mb-1">
                        <i class="fas fa-comment-dots mr-2 text-purple-600"></i>${c.main_topic || '(주제 없음)'}
                    </p>
                    <p class="text-gray-600 ml-6 whitespace-pre-wrap">${c.content || '(내용 없음)'}</p>
                </div>
            </div>
        `).join('');
        
        document.getElementById('counseling-records-section').classList.remove('hidden');
        document.getElementById('ai-report-result').classList.add('hidden');
        generatedReport = null;
        
    } catch (error) {
        console.error('상담 기록 로드 실패:', error);
        alert('상담 기록을 불러오는데 실패했습니다.');
    }
}

window.generateAIReport = async function() {
    if (!selectedStudentForAI) {
        alert('학생을 먼저 선택해주세요.');
        return;
    }
    
    if (studentCounselings.length === 0) {
        alert('상담 기록이 없어 생기부를 생성할 수 없습니다.');
        return;
    }
    
    // 로딩 표시
    document.getElementById('ai-loading').classList.remove('hidden');
    document.getElementById('ai-report-result').classList.add('hidden');
    
    try {
        const student = students.find(s => s.id === selectedStudentForAI);
        const style = document.getElementById('ai-report-style').value;
        
        const response = await axios.post(`${API_BASE_URL}/api/ai/generate-report`, {
            student_id: selectedStudentForAI,
            student_name: student ? student.name : '알 수 없음',
            student_code: student ? student.code : '알 수 없음',
            style: style
        });
        
        generatedReport = response.data.report;
        
        // 결과 표시
        document.getElementById('ai-report-content').textContent = generatedReport;
        document.getElementById('ai-report-result').classList.remove('hidden');
        document.getElementById('ai-loading').classList.add('hidden');
        
        // 결과로 스크롤
        document.getElementById('ai-report-result').scrollIntoView({ behavior: 'smooth', block: 'start' });
        
    } catch (error) {
        console.error('AI 생기부 생성 실패:', error);
        alert('AI 생기부 생성에 실패했습니다: ' + (error.response?.data?.detail || error.message));
        document.getElementById('ai-loading').classList.add('hidden');
    }
}

window.copyAIReport = function() {
    if (!generatedReport) return;
    
    navigator.clipboard.writeText(generatedReport).then(() => {
        alert('AI 생기부가 클립보드에 복사되었습니다.');
    }).catch(err => {
        console.error('복사 실패:', err);
        alert('복사에 실패했습니다.');
    });
}

window.downloadAIReport = function() {
    if (!generatedReport) return;
    
    const student = students.find(s => s.id === selectedStudentForAI);
    const filename = `AI생기부_${student ? student.name : 'student'}_${new Date().toISOString().split('T')[0]}.txt`;
    
    const blob = new Blob([generatedReport], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
                            <th class="px-4 py-2 text-left">강사역할</th>
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
    
    // 강사코드 자동 생성 (IC-001, IC-002...)
    let autoCode = '';
    if (!code) {
        const maxCode = instructorCodes.reduce((max, ic) => {
            const match = ic.code.match(/^IC-(\d+)$/);
            if (match) {
                const num = parseInt(match[1]);
                return num > max ? num : max;
            }
            return max;
        }, 0);
        autoCode = `IC-${String(maxCode + 1).padStart(3, '0')}`;
    }
    
    formDiv.innerHTML = `
        <h3 class="text-lg font-semibold mb-4">${code ? '강사코드 수정' : '강사코드 추가'}</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">코드 *</label>
                <input type="text" id="code" placeholder="코드 (예: IC-001)" value="${existingCode ? existingCode.code : autoCode}" ${code ? 'readonly' : 'readonly'} class="w-full border rounded px-3 py-2 bg-gray-100">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">강사역할 *</label>
                <input type="text" id="name" placeholder="강사역할" value="${existingCode ? existingCode.name : ''}" class="w-full border rounded px-3 py-2">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">타입 *</label>
                <select id="type" class="w-full border rounded px-3 py-2">
                    <option value="">타입 선택</option>
                    <option value="1. 주강사" ${existingCode && existingCode.type === '1. 주강사' ? 'selected' : ''}>1. 주강사</option>
                    <option value="2. 보조강사" ${existingCode && existingCode.type === '2. 보조강사' ? 'selected' : ''}>2. 보조강사</option>
                    <option value="3. 멘토" ${existingCode && existingCode.type === '3. 멘토' ? 'selected' : ''}>3. 멘토</option>
                    <option value="4. 행정지원" ${existingCode && existingCode.type === '4. 행정지원' ? 'selected' : ''}>4. 행정지원</option>
                </select>
            </div>
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
    const code = document.getElementById('code').value;
    const name = document.getElementById('name').value;
    const type = document.getElementById('type').value;
    
    // 유효성 검사
    if (!code) {
        window.showAlert('코드를 입력하세요.');
        return;
    }
    if (!name) {
        window.showAlert('강사역할을 입력하세요.');
        return;
    }
    if (!type) {
        window.showAlert('타입을 선택하세요.');
        return;
    }
    
    const data = {
        code: code,
        name: name,
        type: type
    };
    
    try {
        if (existingCode) {
            await axios.put(`${API_BASE_URL}/api/instructor-codes/${existingCode}`, data);
            window.showAlert('강사코드가 수정되었습니다.');
        } else {
            await axios.post(`${API_BASE_URL}/api/instructor-codes`, data);
            window.showAlert('강사코드가 추가되었습니다.');
        }
        window.hideInstructorCodeForm();
        loadInstructorCodes();
    } catch (error) {
        window.showAlert('저장 실패: ' + (error.response?.data?.detail || error.message));
    }
}

window.editInstructorCode = function(code) {
    window.showInstructorCodeForm(code);
}

window.deleteInstructorCode = async function(code) {
    const confirmed = await window.showConfirm('이 강사코드를 삭제하시겠습니까?\\n\\n삭제하면 복구할 수 없습니다.');
    if (!confirmed) return;
    
    try {
        window.showLoading('강사코드 삭제 중...');
        await axios.delete(`${API_BASE_URL}/api/instructor-codes/${code}`);
        window.hideLoading();
        window.showAlert('강사코드가 삭제되었습니다.');
        loadInstructorCodes();
    } catch (error) {
        window.hideLoading();
        window.showAlert('삭제 실패: ' + (error.response?.data?.detail || error.message));
    }
}

// ==================== 강사 관리 (확장) ====================
async function loadInstructors() {
    try {
        window.showLoading('강사 데이터를 불러오는 중...');
        const [instructorsRes, typesRes] = await Promise.all([
            axios.get(`${API_BASE_URL}/api/instructors`),
            axios.get(`${API_BASE_URL}/api/instructor-codes`)
        ]);
        instructors = instructorsRes.data;
        instructorTypes = typesRes.data;
        renderInstructors();
        window.hideLoading();
    } catch (error) {
        window.hideLoading();
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
                <button onclick="window.showInstructorForm()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
                    <i class="fas fa-plus mr-2"></i>강사 추가
                </button>
            </div>
            
            <!-- 필터 영역 -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                    <label class="block text-gray-700 mb-2">강사구분 필터</label>
                    <select id="instructor-type-filter" class="w-full border rounded px-3 py-2" onchange="window.filterInstructors()">
                        <option value="">-- 전체 강사구분 --</option>
                        ${instructorTypes.map(type => `
                            <option value="${type.code}">${type.name}</option>
                        `).join('')}
                    </select>
                </div>
                <div>
                    <label class="block text-gray-700 mb-2">검색 (이름, 전공)</label>
                    <input type="text" id="instructor-search" placeholder="검색어 입력..." class="w-full border rounded px-3 py-2" onkeyup="window.filterInstructors()">
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
                            <th class="px-4 py-2 text-left">강사역할</th>
                            <th class="px-4 py-2 text-left">강사타입</th>
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
                                <td class="px-4 py-2">${(() => {
                                    const typeInfo = instructorTypes.find(t => t.code === inst.instructor_type);
                                    return typeInfo ? typeInfo.name : '';
                                })()}</td>
                                <td class="px-4 py-2">${(() => {
                                    const typeInfo = instructorTypes.find(t => t.code === inst.instructor_type);
                                    return typeInfo ? typeInfo.type : '';
                                })()}</td>
                                <td class="px-4 py-2">${inst.phone || ''}</td>
                                <td class="px-4 py-2">${inst.email || ''}</td>
                                <td class="px-4 py-2">
                                    ${inst.photo_urls && JSON.parse(inst.photo_urls || '[]').length > 0 ? `
                                        <i class="fas fa-camera text-green-600 mr-2" title="${JSON.parse(inst.photo_urls).length}개 사진"></i>
                                    ` : ''}
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

window.filterInstructors = async function() {
    const search = document.getElementById('instructor-search').value.toLowerCase();
    const typeFilter = document.getElementById('instructor-type-filter').value;
    
    try {
        // 서버에서 전체 강사 목록 가져오기
        const response = await axios.get(`${API_BASE_URL}/api/instructors`);
        let filteredInstructors = response.data;
        
        // 강사구분 필터 적용
        if (typeFilter) {
            filteredInstructors = filteredInstructors.filter(inst => 
                inst.instructor_type === typeFilter
            );
        }
        
        // 검색어 필터 적용 (이름, 전공)
        if (search) {
            filteredInstructors = filteredInstructors.filter(inst => 
                (inst.name && inst.name.toLowerCase().includes(search)) ||
                (inst.major && inst.major.toLowerCase().includes(search))
            );
        }
        
        const tbody = document.getElementById('instructor-list');
        if (filteredInstructors.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="px-4 py-8 text-center text-gray-500">
                        <i class="fas fa-search mr-2"></i>
                        조건에 맞는 강사가 없습니다
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = filteredInstructors.map(inst => `
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
        console.error('필터링 실패:', error);
    }
}

window.showInstructorForm = function(code = null) {
    const formDiv = document.getElementById('instructor-form');
    formDiv.classList.remove('hidden');
    
    const existingInst = code ? instructors.find(i => i.code === code) : null;
    
    // 강사 코드 자동 생성 (T-001, T-002...)
    let autoCode = '';
    if (!code) {
        const maxCode = instructors.reduce((max, inst) => {
            const match = inst.code.match(/^T-(\d+)$/);
            if (match) {
                const num = parseInt(match[1]);
                return num > max ? num : max;
            }
            return max;
        }, 0);
        autoCode = `T-${String(maxCode + 1).padStart(3, '0')}`;
    }
    
    formDiv.innerHTML = `
        <h3 class="text-lg font-semibold mb-4">${code ? '강사 수정' : '강사 추가'}</h3>
        <input type="hidden" id="instructor-code" value="${code || ''}">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
                <label class="block text-gray-700 mb-1">강사코드 *</label>
                <input type="text" id="inst-code" placeholder="T-001" value="${existingInst ? existingInst.code : autoCode}" ${code ? 'readonly' : 'readonly'} class="w-full border rounded px-3 py-2 bg-gray-100">
            </div>
            <div>
                <label class="block text-gray-700 mb-1">이름 *</label>
                <input type="text" id="inst-name" placeholder="홍길동" value="${existingInst ? existingInst.name : ''}" class="w-full border rounded px-3 py-2">
            </div>
            <div>
                <label class="block text-gray-700 mb-1">전공</label>
                <input type="text" id="inst-major" placeholder="컴퓨터공학" value="${existingInst ? existingInst.major || '' : ''}" class="w-full border rounded px-3 py-2">
            </div>
            <div>
                <label class="block text-gray-700 mb-1">강사구분</label>
                <select id="inst-type" class="w-full border rounded px-3 py-2">
                    <option value="">선택하세요</option>
                    ${instructorTypes.map(type => `
                        <option value="${type.code}" ${existingInst && existingInst.instructor_type === type.code ? 'selected' : ''}>
                            ${type.name} (${type.code})
                        </option>
                    `).join('')}
                </select>
            </div>
            <div>
                <label class="block text-gray-700 mb-1">연락처</label>
                <input type="text" id="inst-phone" placeholder="010-1234-5678" value="${existingInst ? existingInst.phone || '' : ''}" class="w-full border rounded px-3 py-2">
            </div>
            <div>
                <label class="block text-gray-700 mb-1">이메일</label>
                <input type="email" id="inst-email" placeholder="email@example.com" value="${existingInst ? existingInst.email || '' : ''}" class="w-full border rounded px-3 py-2">
            </div>
        </div>
        
        <!-- 사진 업로드 -->
        <div class="mt-4">
            <label class="block text-gray-700 mb-2">
                <i class="fas fa-camera mr-2"></i>사진 첨부
            </label>
            <div class="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
                <div class="flex flex-wrap gap-2 mb-3">
                    <button type="button" onclick="document.getElementById('instructor-file-input').click()" 
                            class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm">
                        <i class="fas fa-folder-open mr-2"></i>파일 선택
                    </button>
                    <button type="button" onclick="document.getElementById('instructor-camera-input').click()" 
                            class="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm">
                        <i class="fas fa-camera mr-2"></i>사진 촬영
                    </button>
                </div>
                <input type="file" id="instructor-file-input" accept="image/*" multiple 
                       onchange="window.handleInstructorImageUpload(event)" class="hidden">
                <input type="file" id="instructor-camera-input" accept="image/*"  
                       onchange="window.handleInstructorImageUpload(event)" class="hidden">
                <div id="instructor-upload-progress" class="hidden mb-3">
                    <div class="bg-blue-50 border border-blue-200 rounded p-3">
                        <p class="text-sm text-blue-800 mb-2">
                            <i class="fas fa-cloud-upload-alt mr-2"></i>
                            서버에 업로드 후 자동 저장됩니다. 잠시만 기다리세요...
                        </p>
                        <div class="w-full bg-blue-200 rounded-full h-2">
                            <div id="instructor-progress-bar" class="bg-blue-600 h-2 rounded-full transition-all duration-300" style="width: 0%"></div>
                        </div>
                    </div>
                </div>
                <div id="instructor-photos-preview" class="flex flex-col gap-2 mt-2"></div>
                <input type="hidden" id="instructor-photo-urls" value='${existingInst && existingInst.photo_urls ? existingInst.photo_urls : "[]"}'>
            </div>
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
    
    // 기존 사진 미리보기 표시
    if (existingInst?.photo_urls) {
        try {
            const photoUrls = typeof existingInst.photo_urls === 'string' 
                ? JSON.parse(existingInst.photo_urls) 
                : existingInst.photo_urls;
            updateInstructorPhotoPreview(photoUrls);
        } catch (e) {
            console.error('사진 URL 파싱 오류:', e);
        }
    }
}

window.hideInstructorForm = function() {
    document.getElementById('instructor-form').classList.add('hidden');
}

window.saveInstructor = async function(existingCode, autoSave = false) {
    // 사진 URL 가져오기
    const photoUrlsInput = document.getElementById('instructor-photo-urls');
    const photoUrls = photoUrlsInput ? JSON.parse(photoUrlsInput.value || '[]') : [];
    
    const data = {
        code: document.getElementById('inst-code').value,
        name: document.getElementById('inst-name').value,
        major: document.getElementById('inst-major').value,
        instructor_type: document.getElementById('inst-type').value,
        phone: document.getElementById('inst-phone').value,
        email: document.getElementById('inst-email').value,
        photo_urls: JSON.stringify(photoUrls)
    };
    
    try {
        if (existingCode) {
            await axios.put(`${API_BASE_URL}/api/instructors/${existingCode}`, data);
            if (!autoSave) {
                alert('강사 정보가 수정되었습니다.');
            }
        } else {
            await axios.post(`${API_BASE_URL}/api/instructors`, data);
            if (!autoSave) {
                alert('강사가 추가되었습니다.');
            }
        }
        if (!autoSave) {
            window.hideInstructorForm();
            loadInstructors();
        }
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

// 강사 사진 업로드 핸들러
window.handleInstructorImageUpload = async function(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    // 프로그레스 바 표시
    const progressDiv = document.getElementById('instructor-upload-progress');
    const progressBar = document.getElementById('instructor-progress-bar');
    if (progressDiv) {
        progressDiv.classList.remove('hidden');
        progressBar.style.width = '0%';
    }
    
    try {
        const photoUrlsInput = document.getElementById('instructor-photo-urls');
        const photoUrls = JSON.parse(photoUrlsInput.value || '[]');
        const totalFiles = files.length;
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const formData = new FormData();
            formData.append('file', file);
            
            // 프로그레스 업데이트
            const progress = ((i + 0.5) / totalFiles) * 100;
            if (progressBar) progressBar.style.width = `${progress}%`;
            
            const response = await axios.post(
                `${API_BASE_URL}/api/upload-image?category=teacher`,
                formData,
                { headers: { 'Content-Type': 'multipart/form-data' } }
            );
            
            if (response.data.success) {
                photoUrls.push(response.data.url);
            }
            
            // 완료 프로그레스
            const completeProgress = ((i + 1) / totalFiles) * 100;
            if (progressBar) progressBar.style.width = `${completeProgress}%`;
        }
        
        photoUrlsInput.value = JSON.stringify(photoUrls);
        updateInstructorPhotoPreview(photoUrls);
        
        // 자동 저장 (화면 유지)
        const instructorCodeInput = document.getElementById('instructor-code');
        const existingCode = instructorCodeInput ? instructorCodeInput.value : null;
        if (existingCode) {
            await window.saveInstructor(existingCode, true);
        }
        
        // 프로그레스 바 숨기기
        if (progressDiv) {
            setTimeout(() => {
                progressDiv.classList.add('hidden');
            }, 1000);
        }
        
        // 강사 이름 가져오기
        const instructorNameInput = document.querySelector('input[name="name"]');
        const instructorName = instructorNameInput ? instructorNameInput.value : '';
        const contextMsg = instructorName ? `${instructorName} 강사에게 ` : '강사에게 ';
        window.showAlert(`${contextMsg}${files.length}개 사진이 업로드되고 자동 저장되었습니다.`);
        
    } catch (error) {
        // 프로그레스 바 숨기기
        if (progressDiv) progressDiv.classList.add('hidden');
        
        console.error('사진 업로드 실패:', error);
        window.showAlert('사진 업로드 실패: ' + (error.response?.data?.detail || error.message));
    }
    
    // 파일 입력 초기화
    event.target.value = '';
}

// 강사 사진 삭제
window.removeInstructorPhoto = async function(index) {
    const photoUrlsInput = document.getElementById('instructor-photo-urls');
    const photoUrls = JSON.parse(photoUrlsInput.value || '[]');
    
    photoUrls.splice(index, 1);
    photoUrlsInput.value = JSON.stringify(photoUrls);
    updateInstructorPhotoPreview(photoUrls);
    
    // 자동 저장 (화면 유지)
    const instructorCodeInput = document.getElementById('instructor-code');
    const existingCode = instructorCodeInput ? instructorCodeInput.value : null;
    if (existingCode) {
        await window.saveInstructor(existingCode, true);
        
        // 강사 이름 가져오기
        const instructorNameInput = document.querySelector('input[name="name"]');
        const instructorName = instructorNameInput ? instructorNameInput.value : '';
        const contextMsg = instructorName ? `${instructorName} 강사에게서 ` : '강사에게서 ';
        window.showAlert(`${contextMsg}사진이 삭제되고 자동 저장되었습니다.`);
    }
}

// 강사 사진 미리보기 업데이트
function updateInstructorPhotoPreview(photoUrls) {
    const previewDiv = document.getElementById('instructor-photos-preview');
    if (!previewDiv) return;
    
    if (!photoUrls || photoUrls.length === 0) {
        previewDiv.innerHTML = '<p class="text-gray-400 text-sm">첨부된 사진이 없습니다</p>';
        return;
    }
    
    previewDiv.innerHTML = photoUrls.map((url, index) => `
        <div class="flex items-center gap-3 bg-white border rounded p-2 hover:bg-gray-50">
            <a href="${API_BASE_URL}/api/download-image?url=${encodeURIComponent(url)}" download class="flex-shrink-0">
                <img src="${API_BASE_URL}/api/thumbnail?url=${encodeURIComponent(url)}" 
                     alt="사진 ${index + 1}"
                     class="w-16 h-16 object-cover rounded border cursor-pointer hover:opacity-80"
                     onerror="this.onerror=null; this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Crect fill=%22%23e5e7eb%22 width=%22100%22 height=%22100%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%239ca3af%22 font-size=%2240%22%3E📷%3C/text%3E%3C/svg%3E';">
            </a>
            <div class="flex-1">
                <a href="${API_BASE_URL}/api/download-image?url=${encodeURIComponent(url)}" download 
                   class="text-blue-600 hover:underline text-sm block">
                    사진 ${index + 1} 다운로드
                </a>
                <p class="text-xs text-gray-500 mt-1">클릭하여 다운로드</p>
            </div>
            <button type="button" onclick="window.removeInstructorPhoto(${index})" 
                    class="text-red-500 hover:text-red-700 px-2">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');
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
            
            <div class="overflow-x-auto">
                <table class="min-w-full bg-white border">
                    <thead class="bg-gray-100">
                        <tr>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-700">날짜</th>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-700">공휴일명</th>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-700">구분</th>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-700">작업</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${holidays.map(h => `
                            <tr class="border-t hover:bg-gray-50">
                                <td class="px-4 py-2 text-xs">${h.holiday_date}</td>
                                <td class="px-4 py-2 text-xs font-semibold">${h.name}</td>
                                <td class="px-4 py-2 text-xs">
                                    <span class="${h.is_legal ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'} px-2 py-1 rounded text-xs">
                                        ${h.is_legal ? '법정공휴일' : '일반'}
                                    </span>
                                </td>
                                <td class="px-4 py-2 text-xs">
                                    <button onclick="window.editHoliday(${h.id})" class="text-blue-600 hover:text-blue-800 mr-2">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button onclick="window.deleteHoliday(${h.id})" class="text-red-600 hover:text-red-800">
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
let courseSubjects = {}; // 과정별 선택된 교과목 저장

async function loadCourses() {
    try {
        window.showLoading('과정 데이터를 불러오는 중...');
        const response = await axios.get(`${API_BASE_URL}/api/courses`);
        courses = response.data;
        
        // 각 과정별 선택된 과목 초기화 (임시로 G-001~G-006)
        courses.forEach(course => {
            if (!courseSubjects[course.code]) {
                courseSubjects[course.code] = ['G-001', 'G-002', 'G-003', 'G-004', 'G-005', 'G-006'];
            }
        });
        
        renderCourses();
        window.hideLoading();
    } catch (error) {
        window.hideLoading();
        console.error('과정 목록 로드 실패:', error);
        document.getElementById('app').innerHTML = '<div class="text-red-600 p-4">과정 목록을 불러오는데 실패했습니다.</div>';
    }
}

function renderCourseDetail(course) {
    // 날짜 계산 헬퍼 함수
    const addDays = (dateStr, days) => {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        date.setDate(date.getDate() + days);
        const month = date.getMonth() + 1;
        const day = date.getDate();
        return `${month}월 ${day}일`;
    };
    
    // 총 기간 계산
    const totalDays = course.total_days || 113;
    const lectureDays = course.lecture_hours ? Math.ceil(course.lecture_hours / 8) : 33;
    const projectDays = course.project_hours ? Math.ceil(course.project_hours / 8) : 28;
    const internDays = course.internship_hours ? Math.ceil(course.internship_hours / 8) : 15;
    
    // 퍼센트 계산
    const lecturePercent = Math.floor((lectureDays / totalDays) * 100);
    const projectPercent = Math.floor((projectDays / totalDays) * 100);
    const internPercent = Math.floor((internDays / totalDays) * 100);
    
    // 각 단계별 종료일 계산 (시작일 기준)
    const lectureEndDate = addDays(course.start_date, lectureDays - 1);
    const projectEndDate = addDays(course.start_date, lectureDays + projectDays - 1);
    const internEndDate = addDays(course.start_date, lectureDays + projectDays + internDays - 1);
    
    // 근무일 합계
    const workDays = lectureDays + projectDays + internDays;
    
    // 제외일 계산
    const excludedDays = totalDays - workDays;
    const weekends = Math.floor(totalDays / 7) * 2;
    const holidays = excludedDays - weekends;
    
    return `
        <div class="p-6">
            <!-- 과정 시작일 -->
            <div class="mb-6 bg-blue-50 border-l-4 border-blue-500 p-4">
                <label class="block text-sm font-semibold text-gray-700 mb-2">
                    <i class="fas fa-calendar-alt mr-2"></i>과정 시작일
                </label>
                <input type="date" id="course-start-date" value="${course.start_date || ''}" 
                       class="px-3 py-2 border rounded" onchange="window.updateCourseDate('${course.code}')">
            </div>
            
            <!-- 과정 개요 (총 600시간) -->
            <div class="mb-6 bg-gray-50 p-4 rounded">
                <h3 class="font-bold text-lg mb-3">
                    <i class="fas fa-clock mr-2"></i>과정 개요 (총 600시간)
                </h3>
                <div class="grid grid-cols-3 gap-4">
                    <div class="bg-blue-100 p-3 rounded">
                        <label class="block text-xs text-gray-600 mb-2">이론</label>
                        <div class="flex items-center mb-2">
                            <input type="number" id="theory-hours" value="${course.lecture_hours || 260}" 
                                   class="w-20 px-2 py-1 border rounded text-sm" onchange="window.updateCourseHours('${course.code}')">
                            <span class="ml-2 text-sm font-semibold">h</span>
                        </div>
                        <div class="text-xs text-blue-700 font-semibold">
                            약 ${lectureDays}일 (${lecturePercent}%)
                        </div>
                        <div class="text-xs text-blue-600 mt-1">
                            ${lectureEndDate}까지
                        </div>
                    </div>
                    <div class="bg-green-100 p-3 rounded">
                        <label class="block text-xs text-gray-600 mb-2">프로젝트</label>
                        <div class="flex items-center mb-2">
                            <input type="number" id="project-hours" value="${course.project_hours || 220}" 
                                   class="w-20 px-2 py-1 border rounded text-sm" onchange="window.updateCourseHours('${course.code}')">
                            <span class="ml-2 text-sm font-semibold">h</span>
                        </div>
                        <div class="text-xs text-green-700 font-semibold">
                            약 ${projectDays}일 (${projectPercent}%)
                        </div>
                        <div class="text-xs text-green-600 mt-1">
                            ${projectEndDate}까지
                        </div>
                    </div>
                    <div class="bg-red-100 p-3 rounded">
                        <label class="block text-xs text-gray-600 mb-2">인턴십</label>
                        <div class="flex items-center mb-2">
                            <input type="number" id="intern-hours" value="${course.internship_hours || 120}" 
                                   class="w-20 px-2 py-1 border rounded text-sm" onchange="window.updateCourseHours('${course.code}')">
                            <span class="ml-2 text-sm font-semibold">h</span>
                        </div>
                        <div class="text-xs text-red-700 font-semibold">
                            약 ${internDays}일 (${internPercent}%)
                        </div>
                        <div class="text-xs text-red-600 mt-1">
                            ${internEndDate}까지
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- 교육 일정 계산 결과 -->
            <div class="mb-6 bg-green-50 p-4 rounded">
                <h3 class="font-bold text-lg mb-3">
                    <i class="fas fa-calendar-check mr-2"></i>교육 일정 계산 결과
                </h3>
                <div class="grid grid-cols-3 gap-4">
                    <div class="text-center p-3 bg-white rounded shadow-sm">
                        <div class="text-xs text-gray-500 mb-1">총 기간</div>
                        <div class="text-2xl font-bold text-blue-600">${totalDays}일</div>
                    </div>
                    <div class="text-center p-3 bg-white rounded shadow-sm">
                        <div class="text-xs text-gray-500 mb-1">근무일</div>
                        <div class="text-xl font-bold text-green-600">${workDays}일</div>
                        <div class="text-xs text-gray-600 mt-1">= 이론(${lectureDays}) + 프로젝트(${projectDays}) + 인턴십(${internDays})</div>
                    </div>
                    <div class="text-center p-3 bg-white rounded shadow-sm">
                        <div class="text-xs text-gray-500 mb-1">제외일</div>
                        <div class="text-xl font-bold text-red-600">${excludedDays}일</div>
                        <div class="text-xs text-gray-600 mt-1">= 주말(${weekends}) + 공휴일(${holidays})</div>
                    </div>
                </div>
            </div>
            
            <!-- 과정 기간 내 공휴일 -->
            <div class="mb-6 bg-red-50 p-4 rounded">
                <h3 class="font-bold text-lg mb-2">
                    <i class="fas fa-calendar-times mr-2 text-red-600"></i>과정 기간 내 공휴일
                </h3>
                <div class="text-sm text-red-600">
                    12-25(성탄절), 01-01(신정), 02-16(설날 연휴), 02-17(설날), 02-18(설날 연휴)
                </div>
            </div>
            
            <!-- 기본 정보 -->
            <div class="mb-6 bg-gray-50 p-4 rounded">
                <h3 class="font-bold text-lg mb-4">
                    <i class="fas fa-info-circle mr-2"></i>기본 정보
                </h3>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm text-gray-600 mb-1">코드:</label>
                        <input type="text" id="course-code" value="${course.code}" readonly
                               class="w-full px-3 py-2 border rounded bg-gray-100">
                    </div>
                    <div>
                        <label class="block text-sm text-gray-600 mb-1">인원수:</label>
                        <input type="number" id="course-capacity" value="${course.capacity || 24}" 
                               class="w-full px-3 py-2 border rounded" onchange="window.updateCourseInfo('${course.code}')">
                    </div>
                    <div class="col-span-2">
                        <label class="block text-sm text-gray-600 mb-1">반명칭:</label>
                        <input type="text" id="course-name" value="${course.name || ''}" 
                               class="w-full px-3 py-2 border rounded" onchange="window.updateCourseInfo('${course.code}')">
                    </div>
                    <div class="col-span-2">
                        <label class="block text-sm text-gray-600 mb-1">강의장소:</label>
                        <input type="text" id="course-location" value="${course.location || ''}" 
                               class="w-full px-3 py-2 border rounded" onchange="window.updateCourseInfo('${course.code}')">
                    </div>
                    <div>
                        <label class="block text-sm text-gray-600 mb-1">특이 사항:</label>
                        <textarea id="course-notes" rows="3" class="w-full px-3 py-2 border rounded" 
                                  onchange="window.updateCourseInfo('${course.code}')">${course.notes || ''}</textarea>
                    </div>
                    <div class="bg-green-100 p-3 rounded" id="subject-area-${course.code}">
                        <!-- 내용은 JavaScript로 동적 생성 -->
                    </div>
                </div>
            </div>
            
            <!-- 버튼 -->
            <div class="flex space-x-2">
                <button onclick="window.editCourse('${course.code}')" 
                        class="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded">
                    <i class="fas fa-edit mr-2"></i>수정
                </button>
                <button onclick="window.showCourseForm()" 
                        class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded">
                    <i class="fas fa-plus mr-2"></i>추가
                </button>
                <button onclick="window.deleteCourse('${course.code}')" 
                        class="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded">
                    <i class="fas fa-trash mr-2"></i>삭제
                </button>
            </div>
            
            <!-- 과정 목록 테이블 -->
            <div class="mt-8">
                <h3 class="font-bold text-lg mb-4">
                    <i class="fas fa-list mr-2"></i>등록된 과정 목록
                </h3>
                <div class="overflow-x-auto">
                    <table class="min-w-full bg-white border">
                        <thead class="bg-gray-100">
                            <tr>
                                <th class="px-3 py-2 text-left text-xs">코드</th>
                                <th class="px-3 py-2 text-left text-xs">반명칭</th>
                                <th class="px-3 py-2 text-left text-xs">시작일</th>
                                <th class="px-3 py-2 text-left text-xs">강의종료</th>
                                <th class="px-3 py-2 text-left text-xs">프로젝트종료</th>
                                <th class="px-3 py-2 text-left text-xs">인턴십종료</th>
                                <th class="px-3 py-2 text-left text-xs">종기간</th>
                                <th class="px-3 py-2 text-left text-xs">인원</th>
                                <th class="px-3 py-2 text-left text-xs">장소</th>
                                <th class="px-3 py-2 text-left text-xs">비고</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${courses.map((c, idx) => `
                                <tr onclick="window.selectCourse('${c.code}')" 
                                    class="border-t hover:bg-blue-50 cursor-pointer ${c.code === selectedCourseCode ? 'bg-blue-100' : (idx % 2 === 0 ? 'bg-white' : 'bg-gray-50')}">
                                    <td class="px-3 py-2 text-xs font-semibold">${c.code}</td>
                                    <td class="px-3 py-2 text-xs">${c.name || '-'}</td>
                                    <td class="px-3 py-2 text-xs">${c.start_date ? formatDateWithDay(c.start_date) : '-'}</td>
                                    <td class="px-3 py-2 text-xs">${c.lecture_end_date ? formatDateWithDay(c.lecture_end_date) : '-'}</td>
                                    <td class="px-3 py-2 text-xs">${c.project_end_date ? formatDateWithDay(c.project_end_date) : '-'}</td>
                                    <td class="px-3 py-2 text-xs">${c.internship_end_date ? formatDateWithDay(c.internship_end_date) : '-'}</td>
                                    <td class="px-3 py-2 text-xs">${c.total_days || 113}일</td>
                                    <td class="px-3 py-2 text-xs">${c.capacity || 24}</td>
                                    <td class="px-3 py-2 text-xs">${c.location || '-'}</td>
                                    <td class="px-3 py-2 text-xs">${(c.notes || '').substring(0, 20)}${c.notes && c.notes.length > 20 ? '...' : ''}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
    
    // 과목 영역 업데이트 (DOM이 생성된 후)
    setTimeout(() => {
        updateSubjectArea(course.code);
    }, 0);
}

// 과목 영역 업데이트 함수
async function updateSubjectArea(courseCode) {
    const subjectArea = document.getElementById(`subject-area-${courseCode}`);
    if (!subjectArea) return;
    
    const selectedSubjects = courseSubjects[courseCode] || [];
    const hasSubjects = selectedSubjects.length > 0;
    
    if (hasSubjects) {
        // 교과목 정보 가져오기
        try {
            const response = await axios.get(`${API_BASE_URL}/api/subjects`);
            const allSubjects = response.data;
            
            // 선택된 과목이 있는 경우
            subjectArea.innerHTML = `
                <div class="flex items-center justify-between mb-2">
                    <div class="text-sm font-semibold">선택된 과목: <span id="subject-count-${courseCode}" class="text-green-700">(${selectedSubjects.length}개)</span></div>
                    <button onclick="window.showSubjectSelector('${courseCode}')" 
                            class="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs">
                        <i class="fas fa-list mr-1"></i>교과목 선택
                    </button>
                </div>
                <ul class="text-xs space-y-1" id="selected-subjects-${courseCode}">
                    ${selectedSubjects.map(code => {
                        const subject = allSubjects.find(s => s.code === code);
                        const name = subject ? subject.name : '과목명';
                        return `<li>• ${code}: ${name}</li>`;
                    }).join('')}
                </ul>
            `;
        } catch (error) {
            console.error('교과목 정보 로드 실패:', error);
        }
    } else {
        // 선택된 과목이 없는 경우
        subjectArea.innerHTML = `
            <div class="flex items-center justify-between mb-2">
                <div class="text-sm font-semibold text-gray-600">선택된 과목: <span class="text-gray-500">(0개)</span></div>
                <button onclick="window.showSubjectSelector('${courseCode}')" 
                        class="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs">
                    <i class="fas fa-list mr-1"></i>교과목 선택
                </button>
            </div>
            <p class="text-xs text-gray-500 italic">교과목 선택 버튼을 클릭하여 과목을 추가하세요.</p>
        `;
    }
}

// ==================== 새로운 과정 관리 UI 인터랙티브 함수 ====================
let selectedCourseCode = null;

// 과정 탭 선택
window.selectCourse = function(courseCode) {
    selectedCourseCode = courseCode;
    renderCourses();
}

// 과정 시작일 업데이트
window.updateCourseDate = async function(courseCode) {
    const newDate = document.getElementById('course-start-date').value;
    if (!newDate) return;
    
    try {
        const course = courses.find(c => c.code === courseCode);
        if (!course) return;
        
        await axios.put(`${API_BASE_URL}/api/courses/${courseCode}`, {
            ...course,
            start_date: newDate
        });
        
        // 재로드
        await loadCourses();
        selectedCourseCode = courseCode;
        renderCourses();
        
        window.showAlert('과정 시작일이 업데이트되었습니다.');
    } catch (error) {
        console.error('날짜 업데이트 실패:', error);
        window.showAlert('날짜 업데이트에 실패했습니다.');
    }
}

// 시간 입력 변경 시 실시간 재계산
window.updateCourseHours = function(courseCode) {
    const theoryHours = parseInt(document.getElementById('theory-hours').value) || 0;
    const projectHours = parseInt(document.getElementById('project-hours').value) || 0;
    const internHours = parseInt(document.getElementById('intern-hours').value) || 0;
    
    // 재렌더링 (UI만 업데이트, 저장은 별도)
    const course = courses.find(c => c.code === courseCode);
    if (course) {
        course.lecture_hours = theoryHours;
        course.project_hours = projectHours;
        course.internship_hours = internHours;
        renderCourses();
    }
}

// 기본 정보 변경
window.updateCourseInfo = function(courseCode) {
    // 실시간 업데이트는 하지 않고, 저장 버튼 클릭 시 반영
    // UI 피드백만 제공
}

// 모든 변경사항 저장
window.saveCourseChanges = async function(courseCode) {
    const course = courses.find(c => c.code === courseCode);
    if (!course) return;
    
    const data = {
        code: courseCode,
        name: document.getElementById('course-name').value,
        location: document.getElementById('course-location').value,
        capacity: parseInt(document.getElementById('course-capacity').value) || 24,
        lecture_hours: parseInt(document.getElementById('theory-hours').value) || 260,
        project_hours: parseInt(document.getElementById('project-hours').value) || 220,
        internship_hours: parseInt(document.getElementById('intern-hours').value) || 120,
        start_date: document.getElementById('course-start-date').value,
        notes: document.getElementById('course-notes').value,
        // 기존 필드 유지
        lecture_end_date: course.lecture_end_date,
        project_end_date: course.project_end_date,
        internship_end_date: course.internship_end_date,
        final_end_date: course.final_end_date,
        total_days: course.total_days
    };
    
    try {
        await axios.put(`${API_BASE_URL}/api/courses/${courseCode}`, data);
        alert('과정 정보가 저장되었습니다.');
        await loadCourses();
        selectedCourseCode = courseCode;
        renderCourses();
    } catch (error) {
        console.error('저장 실패:', error);
        alert('저장에 실패했습니다: ' + (error.response?.data?.detail || error.message));
    }
}

// 자동계산 버튼 클릭 시 날짜 자동 계산
window.autoCalculateDates = async function() {
    const startDate = document.getElementById('form-course-start-date').value;
    const lectureHours = parseInt(document.getElementById('form-course-lecture-hours').value) || 0;
    const projectHours = parseInt(document.getElementById('form-course-project-hours').value) || 0;
    const internshipHours = parseInt(document.getElementById('form-course-internship-hours').value) || 0;
    
    if (!startDate) {
        alert('시작일을 먼저 입력해주세요.');
        return;
    }
    
    if (lectureHours === 0 && projectHours === 0 && internshipHours === 0) {
        alert('강의시간, 프로젝트시간, 인턴시간 중 하나 이상을 입력해주세요.');
        return;
    }
    
    try {
        // 계산 중 표시
        const button = event.target.closest('button');
        const originalHTML = button.innerHTML;
        button.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>계산중...';
        button.disabled = true;
        
        const response = await axios.post(`${API_BASE_URL}/api/courses/calculate-dates`, {
            start_date: startDate,
            lecture_hours: lectureHours,
            project_hours: projectHours,
            internship_hours: internshipHours
        });
        
        const result = response.data;
        
        // 계산된 날짜들을 폼에 입력
        document.getElementById('form-course-lecture-end').value = result.lecture_end_date;
        document.getElementById('form-course-project-end').value = result.project_end_date;
        document.getElementById('form-course-internship-end').value = result.internship_end_date;
        document.getElementById('form-course-final-end').value = result.final_end_date;
        document.getElementById('form-course-total-days').value = result.total_days;
        
        // 버튼 원상복구
        button.innerHTML = originalHTML;
        button.disabled = false;
        
        alert(`자동계산 완료!\n총 ${result.total_days}일 (근무일: ${result.work_days}일)`);
    } catch (error) {
        console.error('자동계산 실패:', error);
        alert('자동계산에 실패했습니다: ' + (error.response?.data?.detail || error.message));
        
        // 버튼 원상복구
        const button = event.target.closest('button');
        button.innerHTML = '<i class="fas fa-calculator mr-2"></i>자동계산';
        button.disabled = false;
    }
}

// 교과목 선택 모달 표시
window.showSubjectSelector = async function(courseCode) {
    const modal = document.getElementById('subject-selector');
    const content = modal.querySelector('div');
    
    try {
        // 교과목 목록 가져오기
        const response = await axios.get(`${API_BASE_URL}/api/subjects`);
        const allSubjects = response.data;
        
        // 현재 과정에 선택된 과목 목록
        const selectedSubjects = courseSubjects[courseCode] || [];
        
        content.innerHTML = `
            <h3 class="text-xl font-bold mb-4 text-gray-800">
                <i class="fas fa-list mr-2"></i>교과목 선택 - ${courseCode}
            </h3>
            <p class="text-sm text-gray-600 mb-4">
                과정에 포함할 교과목을 선택하세요. (체크박스를 클릭하여 선택/해제)
            </p>
            <div class="max-h-96 overflow-y-auto border rounded p-4">
                <table class="min-w-full">
                    <thead class="bg-gray-100 sticky top-0">
                        <tr>
                            <th class="px-3 py-2 text-left text-xs">선택</th>
                            <th class="px-3 py-2 text-left text-xs">과목코드</th>
                            <th class="px-3 py-2 text-left text-xs">과목명</th>
                            <th class="px-3 py-2 text-left text-xs">시수</th>
                            <th class="px-3 py-2 text-left text-xs">요일</th>
                            <th class="px-3 py-2 text-left text-xs">격주</th>
                            <th class="px-3 py-2 text-left text-xs">담당강사</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${allSubjects.map(s => {
                            const isSelected = selectedSubjects.includes(s.code);
                            return `
                            <tr class="border-t hover:bg-gray-50">
                                <td class="px-3 py-2">
                                    <input type="checkbox" class="subject-checkbox" value="${s.code}" 
                                           id="subject-${s.code}" ${isSelected ? 'checked' : ''}>
                                </td>
                                <td class="px-3 py-2 text-xs">${s.code}</td>
                                <td class="px-3 py-2 text-xs">${s.name}</td>
                                <td class="px-3 py-2 text-xs">${s.hours || '-'}시간</td>
                                <td class="px-3 py-2 text-xs">${s.day_of_week || '-'}</td>
                                <td class="px-3 py-2 text-xs">${s.is_biweekly ? '격주' : '매주'}</td>
                                <td class="px-3 py-2 text-xs">${s.instructor_name || '-'}</td>
                            </tr>
                        `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
            <div class="mt-6 flex justify-end space-x-2">
                <button onclick="window.hideSubjectSelector()" class="bg-gray-300 hover:bg-gray-400 text-gray-800 px-6 py-2 rounded">
                    <i class="fas fa-times mr-2"></i>취소
                </button>
                <button onclick="window.saveSelectedSubjects('${courseCode}')" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded">
                    <i class="fas fa-check mr-2"></i>적용
                </button>
            </div>
        `;
        
        modal.classList.remove('hidden');
    } catch (error) {
        console.error('교과목 로드 실패:', error);
        window.showAlert('교과목 목록을 불러오는데 실패했습니다.');
    }
}

// 교과목 선택 모달 닫기
window.hideSubjectSelector = function() {
    document.getElementById('subject-selector').classList.add('hidden');
}

// 선택된 교과목 저장
window.saveSelectedSubjects = function(courseCode) {
    const checkboxes = document.querySelectorAll('.subject-checkbox:checked');
    const selectedSubjects = Array.from(checkboxes).map(cb => cb.value);
    
    if (selectedSubjects.length === 0) {
        window.showAlert('하나 이상의 교과목을 선택해주세요.');
        return;
    }
    
    // courseSubjects에 저장
    courseSubjects[courseCode] = selectedSubjects;
    
    // TODO: 실제로는 course_subjects 테이블에 저장해야 함
    console.log(`과정 ${courseCode}에 선택된 교과목:`, selectedSubjects);
    
    window.hideSubjectSelector();
    window.showAlert(`${selectedSubjects.length}개의 교과목이 선택되었습니다.`);
    
    // 과목 영역 업데이트
    updateSubjectArea(courseCode);
}

// renderCourses를 selectedCourseCode를 고려하도록 수정
function renderCourses() {
    const app = document.getElementById('app');
    
    // 선택된 과정이 없으면 첫 번째 과정 선택
    if (!selectedCourseCode && courses.length > 0) {
        selectedCourseCode = courses[0].code;
    }
    
    const selectedCourse = courses.find(c => c.code === selectedCourseCode);
    
    app.innerHTML = `
        <div class="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 mb-6 rounded-t-lg">
            <h1 class="text-2xl font-bold">
                <i class="fas fa-school mr-2"></i>바이오헬스 훈련컨텍 이노베이터
            </h1>
            <p class="text-blue-100 mt-1">for KDT - 교육 관리 시스템</p>
        </div>
        
        <div class="bg-white rounded-lg shadow-md">
            <!-- 과정 선택 탭 -->
            <div class="bg-gray-100 px-4 py-2 flex space-x-2 overflow-x-auto border-b">
                ${courses.map((c) => `
                    <button onclick="window.selectCourse('${c.code}')" 
                            class="course-tab px-4 py-2 rounded-t ${c.code === selectedCourseCode ? 'bg-white font-semibold border-t-2 border-blue-600' : 'bg-gray-200 hover:bg-gray-300'}" 
                            data-code="${c.code}">
                        <i class="fas fa-home mr-1"></i>${c.name || c.code}
                        <button onclick="event.stopPropagation(); window.deleteCourse('${c.code}')" class="ml-2 text-red-600 hover:text-red-800">
                            <i class="fas fa-times text-xs"></i>
                        </button>
                    </button>
                `).join('')}
                <button onclick="window.showCourseForm()" class="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-t">
                    <i class="fas fa-plus mr-1"></i>과정 추가
                </button>
            </div>
            
            ${selectedCourse ? renderCourseDetail(selectedCourse) : `
                <div class="p-8 text-center text-gray-500">
                    <i class="fas fa-folder-open text-4xl mb-4"></i>
                    <p>등록된 과정이 없습니다. "과정 추가" 버튼을 클릭하여 새 과정을 만드세요.</p>
                </div>
            `}
        </div>
    `;
}

// 과정코드 자동생성
function generateCourseCode() {
    if (courses.length === 0) return 'C-001';
    
    // 기존 과정 코드에서 숫자 추출
    const numbers = courses
        .map(c => {
            const match = c.code.match(/C-(\d+)/);
            return match ? parseInt(match[1]) : 0;
        })
        .filter(n => n > 0);
    
    const maxNumber = Math.max(...numbers, 0);
    const newNumber = maxNumber + 1;
    return `C-${String(newNumber).padStart(3, '0')}`;
}

window.showCourseForm = function(code = null) {
    const formDiv = document.getElementById('course-form');
    const formContent = formDiv.querySelector('div');
    formDiv.classList.remove('hidden');
    
    const existing = code ? courses.find(c => c.code === code) : null;
    const autoCode = existing ? existing.code : generateCourseCode();
    
    formContent.innerHTML = `
        <h3 class="text-xl font-bold mb-4 text-gray-800">
            <i class="fas fa-${code ? 'edit' : 'plus-circle'} mr-2"></i>
            ${code ? '과정 수정' : '과정 추가'}
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1">과정코드 * (자동생성)</label>
                <input type="text" id="form-course-code" value="${autoCode}" readonly 
                       class="w-full border rounded px-3 py-2 bg-gray-100 cursor-not-allowed">
            </div>
            <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1">과정명 *</label>
                <input type="text" id="form-course-name" placeholder="과정명 입력" value="${existing ? existing.name : ''}" 
                       class="w-full border rounded px-3 py-2">
            </div>
            <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1">강의장소</label>
                <input type="text" id="form-course-location" placeholder="장소 입력" value="${existing ? existing.location || '' : ''}" 
                       class="w-full border rounded px-3 py-2">
            </div>
            <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1">정원</label>
                <input type="number" id="form-course-capacity" placeholder="24" value="${existing ? existing.capacity : ''}" 
                       class="w-full border rounded px-3 py-2"
                       onkeydown="if(event.key==='Tab' && !this.value) {event.preventDefault(); this.value=this.placeholder; this.nextElementSibling ? this.parentElement.nextElementSibling.querySelector('input').focus() : null;}">
            </div>
            <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1">강의시간(h)</label>
                <input type="number" id="form-course-lecture-hours" placeholder="260" value="${existing ? existing.lecture_hours : ''}" 
                       class="w-full border rounded px-3 py-2"
                       onkeydown="if(event.key==='Tab' && !this.value) {event.preventDefault(); this.value=this.placeholder; this.parentElement.nextElementSibling.querySelector('input').focus();}">
            </div>
            <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1">프로젝트시간(h)</label>
                <input type="number" id="form-course-project-hours" placeholder="220" value="${existing ? existing.project_hours : ''}" 
                       class="w-full border rounded px-3 py-2"
                       onkeydown="if(event.key==='Tab' && !this.value) {event.preventDefault(); this.value=this.placeholder; this.parentElement.nextElementSibling.querySelector('input').focus();}">
            </div>
            <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1">인턴시간(h)</label>
                <input type="number" id="form-course-internship-hours" placeholder="120" value="${existing ? existing.internship_hours : ''}" 
                       class="w-full border rounded px-3 py-2"
                       onkeydown="if(event.key==='Tab' && !this.value) {event.preventDefault(); this.value=this.placeholder;}">
            </div>
            <div class="col-span-3">
                <div class="flex items-center gap-2">
                    <div class="flex-1">
                        <label class="block text-sm font-semibold text-gray-700 mb-1">시작일 *</label>
                        <input type="date" id="form-course-start-date" value="${existing ? existing.start_date : ''}" 
                               class="w-full border rounded px-3 py-2">
                    </div>
                    <button type="button" onclick="window.autoCalculateDates()" 
                            class="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded self-end">
                        <i class="fas fa-calculator mr-2"></i>자동계산
                    </button>
                </div>
            </div>
            <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1">강의종료일</label>
                <input type="date" id="form-course-lecture-end" value="${existing ? existing.lecture_end_date : ''}" 
                       class="w-full border rounded px-3 py-2 bg-gray-50" readonly>
            </div>
            <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1">프로젝트종료일</label>
                <input type="date" id="form-course-project-end" value="${existing ? existing.project_end_date : ''}" 
                       class="w-full border rounded px-3 py-2 bg-gray-50" readonly>
            </div>
            <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1">인턴종료일</label>
                <input type="date" id="form-course-internship-end" value="${existing ? existing.internship_end_date : ''}" 
                       class="w-full border rounded px-3 py-2 bg-gray-50" readonly>
            </div>
            <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1">최종종료일</label>
                <input type="date" id="form-course-final-end" value="${existing ? existing.final_end_date : ''}" 
                       class="w-full border rounded px-3 py-2 bg-gray-50" readonly>
            </div>
            <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1">총일수</label>
                <input type="number" id="form-course-total-days" placeholder="113" value="${existing ? existing.total_days : ''}" 
                       class="w-full border rounded px-3 py-2 bg-gray-50" readonly>
            </div>
        </div>
        <div class="mt-4">
            <label class="block text-sm font-semibold text-gray-700 mb-1">비고</label>
            <textarea id="form-course-notes" placeholder="특이사항 입력" rows="3" 
                      class="w-full border rounded px-3 py-2">${existing ? existing.notes || '' : ''}</textarea>
        </div>
        <div class="mt-6 flex justify-end space-x-2">
            <button type="button" onclick="window.hideCourseForm()" class="bg-gray-300 hover:bg-gray-400 text-gray-800 px-6 py-2 rounded">
                <i class="fas fa-times mr-2"></i>취소
            </button>
            <button type="button" onclick="window.saveCourse('${code || ''}')" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded">
                <i class="fas fa-save mr-2"></i>${code ? '수정' : '추가'}
            </button>
        </div>
    `;
}

window.hideCourseForm = function() {
    document.getElementById('course-form').classList.add('hidden');
}

window.saveCourse = async function(existingCode) {
    const data = {
        code: document.getElementById('form-course-code').value,
        name: document.getElementById('form-course-name').value,
        location: document.getElementById('form-course-location').value,
        capacity: parseInt(document.getElementById('form-course-capacity').value) || 24,
        lecture_hours: parseInt(document.getElementById('form-course-lecture-hours').value) || 0,
        project_hours: parseInt(document.getElementById('form-course-project-hours').value) || 0,
        internship_hours: parseInt(document.getElementById('form-course-internship-hours').value) || 0,
        start_date: document.getElementById('form-course-start-date').value,
        lecture_end_date: document.getElementById('form-course-lecture-end').value,
        project_end_date: document.getElementById('form-course-project-end').value,
        internship_end_date: document.getElementById('form-course-internship-end').value,
        final_end_date: document.getElementById('form-course-final-end').value,
        total_days: parseInt(document.getElementById('form-course-total-days').value) || 113,
        notes: document.getElementById('form-course-notes').value
    };
    
    // 유효성 검사
    if (!data.code || !data.name) {
        alert('과정코드와 과정명은 필수 입력 항목입니다.');
        return;
    }
    
    try {
        if (existingCode) {
            await axios.put(`${API_BASE_URL}/api/courses/${existingCode}`, data);
            alert('과정이 수정되었습니다.');
            selectedCourseCode = data.code;
        } else {
            await axios.post(`${API_BASE_URL}/api/courses`, data);
            alert('과정이 추가되었습니다.');
            selectedCourseCode = data.code;
            // 새 과정 추가 시 빈 교과목 배열로 초기화
            courseSubjects[data.code] = [];
        }
        window.hideCourseForm();
        await loadCourses();
    } catch (error) {
        console.error('저장 실패:', error);
        alert('저장 실패: ' + (error.response?.data?.detail || error.message));
    }
}

window.editCourse = function(code) {
    window.showCourseForm(code);
}

window.deleteCourse = async function(code) {
    if (!confirm('이 과정을 삭제하시겠습니까?\n삭제하면 복구할 수 없습니다.')) return;
    
    try {
        await axios.delete(`${API_BASE_URL}/api/courses/${code}`);
        alert('과정이 삭제되었습니다.');
        
        // 선택된 과정 코드 초기화
        selectedCourseCode = null;
        
        await loadCourses();
    } catch (error) {
        console.error('삭제 실패:', error);
        alert('삭제 실패: ' + (error.response?.data?.detail || error.message));
    }
}

// ==================== 팀 관리 ====================
let projects = [];

async function loadProjects() {
    try {
        window.showLoading('팀 데이터를 불러오는 중...');
        const [projectsRes, coursesRes, studentsRes, instructorsRes, instructorTypesRes] = await Promise.all([
            axios.get(`${API_BASE_URL}/api/projects`),
            axios.get(`${API_BASE_URL}/api/courses`),
            axios.get(`${API_BASE_URL}/api/students`),
            axios.get(`${API_BASE_URL}/api/instructors`),
            axios.get(`${API_BASE_URL}/api/instructor-codes`)
        ]);
        projects = projectsRes.data;
        courses = coursesRes.data;
        students = studentsRes.data;
        instructors = instructorsRes.data;
        instructorTypes = instructorTypesRes.data;
        renderProjects();
        window.hideLoading();
    } catch (error) {
        window.hideLoading();
        console.error('팀 목록 로드 실패:', error);
        document.getElementById('app').innerHTML = '<div class="text-red-600 p-4">팀 목록을 불러오는데 실패했습니다.</div>';
    }
}

let projectsFilterCourse = '';
let projectsFilterGroup = '';
let projectsFilterStudent = '';
let projectsSearchQuery = '';

function renderProjects() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="bg-white rounded-lg shadow-md p-6">
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-2xl font-bold text-gray-800">
                    <i class="fas fa-users mr-2"></i>팀 관리 (총 ${projects.length}개)
                </h2>
                <button onclick="window.showProjectForm()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
                    <i class="fas fa-plus mr-2"></i>팀 추가
                </button>
            </div>
            
            <!-- 필터 및 검색 -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">과정 필터</label>
                    <select id="projects-course-filter" onchange="window.filterProjects()" class="w-full border rounded px-3 py-2">
                        <option value="">전체 과정</option>
                        ${courses.map(c => `<option value="${c.code}">${c.name || c.code}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">그룹 구분</label>
                    <select id="projects-group-filter" onchange="window.filterProjects()" class="w-full border rounded px-3 py-2">
                        <option value="">전체 그룹</option>
                        <option value="1. 스터디그룹">1. 스터디그룹</option>
                        <option value="2. 프로젝트그룹">2. 프로젝트그룹</option>
                        <option value="3. 인턴그룹">3. 인턴그룹</option>
                        <option value="4. 기타그룹">4. 기타그룹</option>
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">학생 필터</label>
                    <select id="projects-student-filter" onchange="window.filterProjects()" class="w-full border rounded px-3 py-2">
                        <option value="">전체 학생</option>
                        ${students.map(s => `<option value="${s.code}">${s.name} (${s.code})</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">검색 (팀명 또는 팀원)</label>
                    <input type="text" id="projects-search" oninput="window.searchProjects()" placeholder="검색어를 입력하세요..." class="w-full border rounded px-3 py-2">
                </div>
            </div>
            
            <div id="project-form" class="hidden mb-6 p-4 bg-gray-50 rounded-lg"></div>
            
            <div id="projects-list"></div>
        </div>
    `;
    
    window.filterProjects();
}

window.filterProjects = function() {
    const courseFilter = document.getElementById('projects-course-filter');
    const groupFilter = document.getElementById('projects-group-filter');
    const studentFilter = document.getElementById('projects-student-filter');
    projectsFilterCourse = courseFilter ? courseFilter.value : '';
    projectsFilterGroup = groupFilter ? groupFilter.value : '';
    projectsFilterStudent = studentFilter ? studentFilter.value : '';
    window.renderProjectsList();
}

window.searchProjects = function() {
    const searchInput = document.getElementById('projects-search');
    projectsSearchQuery = searchInput ? searchInput.value.toLowerCase() : '';
    window.renderProjectsList();
}

window.renderProjectsList = function() {
    let filteredProjects = projects;
    
    // 과정 필터
    if (projectsFilterCourse) {
        filteredProjects = filteredProjects.filter(p => p.course_code === projectsFilterCourse);
    }
    
    // 그룹 구분 필터
    if (projectsFilterGroup) {
        filteredProjects = filteredProjects.filter(p => p.group_type === projectsFilterGroup);
    }
    
    // 학생 필터 (팀원 중 한 명이라도 해당 학생이 있으면)
    if (projectsFilterStudent) {
        filteredProjects = filteredProjects.filter(p => {
            return p.member1_code === projectsFilterStudent ||
                   p.member2_code === projectsFilterStudent ||
                   p.member3_code === projectsFilterStudent ||
                   p.member4_code === projectsFilterStudent ||
                   p.member5_code === projectsFilterStudent;
        });
    }
    
    // 검색 필터 (팀명 또는 팀원 이름)
    if (projectsSearchQuery) {
        filteredProjects = filteredProjects.filter(p => {
            const matchName = (p.name || '').toLowerCase().includes(projectsSearchQuery);
            const matchMember1 = (p.member1_name || '').toLowerCase().includes(projectsSearchQuery);
            const matchMember2 = (p.member2_name || '').toLowerCase().includes(projectsSearchQuery);
            const matchMember3 = (p.member3_name || '').toLowerCase().includes(projectsSearchQuery);
            const matchMember4 = (p.member4_name || '').toLowerCase().includes(projectsSearchQuery);
            const matchMember5 = (p.member5_name || '').toLowerCase().includes(projectsSearchQuery);
            return matchName || matchMember1 || matchMember2 || matchMember3 || matchMember4 || matchMember5;
        });
    }
    
    const listDiv = document.getElementById('projects-list');
    
    if (filteredProjects.length === 0) {
        listDiv.innerHTML = '<p class="text-gray-500 text-center py-8">조건에 맞는 팀이 없습니다.</p>';
        return;
    }
    
    listDiv.innerHTML = `
        <div class="overflow-x-auto">
            <table class="min-w-full bg-white border">
                <thead class="bg-gray-100">
                    <tr>
                        <th class="px-4 py-2 text-left text-xs font-medium text-gray-700">팀 코드</th>
                        <th class="px-4 py-2 text-left text-xs font-medium text-gray-700">팀명</th>
                        <th class="px-4 py-2 text-left text-xs font-medium text-gray-700">그룹구분</th>
                        <th class="px-4 py-2 text-left text-xs font-medium text-gray-700">과정</th>
                        <th class="px-4 py-2 text-left text-xs font-medium text-gray-700">주강사</th>
                        <th class="px-4 py-2 text-left text-xs font-medium text-gray-700">멘토</th>
                        <th class="px-4 py-2 text-left text-xs font-medium text-gray-700">팀원1</th>
                        <th class="px-4 py-2 text-left text-xs font-medium text-gray-700">팀원2</th>
                        <th class="px-4 py-2 text-left text-xs font-medium text-gray-700">팀원3</th>
                        <th class="px-4 py-2 text-left text-xs font-medium text-gray-700">팀원4</th>
                        <th class="px-4 py-2 text-left text-xs font-medium text-gray-700">팀원5</th>
                        <th class="px-4 py-2 text-left text-xs font-medium text-gray-700">작업</th>
                    </tr>
                </thead>
                <tbody>
                    ${filteredProjects.map(p => {
                        const photoUrls = p.photo_urls ? (typeof p.photo_urls === 'string' ? JSON.parse(p.photo_urls) : p.photo_urls) : [];
                        return `
                        <tr class="border-t hover:bg-gray-50">
                            <td class="px-4 py-2 text-xs font-mono">${p.code}</td>
                            <td class="px-4 py-2 text-xs font-semibold">${p.name}</td>
                            <td class="px-4 py-2 text-xs">${p.group_type || '-'}</td>
                            <td class="px-4 py-2 text-xs text-blue-600">${p.course_name || p.course_code || '-'}</td>
                            <td class="px-4 py-2 text-xs">${p.instructor_name || '-'}</td>
                            <td class="px-4 py-2 text-xs">${p.mentor_name || '-'}</td>
                            <td class="px-4 py-2 text-xs">${p.member1_name || '-'}</td>
                            <td class="px-4 py-2 text-xs">${p.member2_name || '-'}</td>
                            <td class="px-4 py-2 text-xs">${p.member3_name || '-'}</td>
                            <td class="px-4 py-2 text-xs">${p.member4_name || '-'}</td>
                            <td class="px-4 py-2 text-xs">${p.member5_name || '-'}</td>
                            <td class="px-4 py-2 text-xs">
                                ${photoUrls.length > 0 ? `
                                    <i class="fas fa-camera text-green-600 mr-2" title="${photoUrls.length}개 사진"></i>
                                ` : ''}
                                <button onclick="window.editProject('${p.code}')" class="text-blue-600 hover:text-blue-800 mr-2">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button onclick="window.deleteProject('${p.code}')" class="text-red-600 hover:text-red-800">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

window.showProjectForm = function(code = null) {
    const formDiv = document.getElementById('project-form');
    formDiv.classList.remove('hidden');
    
    const existing = code ? projects.find(p => p.code === code) : null;
    
    // 팀 코드 자동 생성 (TEAM001, TEAM002...)
    let autoCode = '';
    if (!code) {
        const maxCode = projects.reduce((max, p) => {
            const match = p.code.match(/^TEAM(\d+)$/);
            if (match) {
                const num = parseInt(match[1]);
                return num > max ? num : max;
            }
            return max;
        }, 0);
        autoCode = `TEAM${String(maxCode + 1).padStart(3, '0')}`;
    }
    
    formDiv.innerHTML = `
        <h3 class="text-lg font-semibold mb-4">${code ? '팀 수정' : '팀 추가'}</h3>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">팀 코드</label>
                <input type="text" id="proj-code" placeholder="팀코드" value="${existing ? existing.code : autoCode}" ${code ? 'readonly' : 'readonly'} class="border rounded px-3 py-2 w-full bg-gray-100">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">팀명 *</label>
                <input type="text" id="proj-name" placeholder="팀명" value="${existing ? existing.name : ''}" class="border rounded px-3 py-2 w-full">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">그룹 구분 *</label>
                <select id="proj-group" class="border rounded px-3 py-2 w-full">
                    <option value="">그룹 선택</option>
                    <option value="1. 스터디그룹" ${existing && existing.group_type === '1. 스터디그룹' ? 'selected' : ''}>1. 스터디그룹</option>
                    <option value="2. 프로젝트그룹" ${existing && existing.group_type === '2. 프로젝트그룹' ? 'selected' : ''}>2. 프로젝트그룹</option>
                    <option value="3. 인턴그룹" ${existing && existing.group_type === '3. 인턴그룹' ? 'selected' : ''}>3. 인턴그룹</option>
                    <option value="4. 기타그룹" ${existing && existing.group_type === '4. 기타그룹' ? 'selected' : ''}>4. 기타그룹</option>
                </select>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">과정 *</label>
                <select id="proj-course" onchange="window.updateProjectStudentList()" class="border rounded px-3 py-2 w-full">
                    <option value="">과정 선택</option>
                    ${courses.map(c => `<option value="${c.code}" ${existing && existing.course_code === c.code ? 'selected' : ''}>${c.name || c.code}</option>`).join('')}
                </select>
            </div>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">주강사</label>
                <select id="proj-instructor" class="border rounded px-3 py-2 w-full">
                    <option value="">선택 안함</option>
                    ${instructors.filter(inst => {
                        const typeInfo = instructorTypes.find(t => t.code === inst.instructor_type);
                        return typeInfo && typeInfo.type === '1. 주강사';
                    }).map(inst => {
                        const typeInfo = instructorTypes.find(t => t.code === inst.instructor_type);
                        return `<option value="${inst.code}" ${existing && existing.instructor_code === inst.code ? 'selected' : ''}>${inst.name} - ${inst.code} - ${typeInfo.name} - ${typeInfo.type}</option>`;
                    }).join('')}
                </select>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">멘토</label>
                <select id="proj-mentor" class="border rounded px-3 py-2 w-full">
                    <option value="">선택 안함</option>
                    ${instructors.filter(inst => {
                        const typeInfo = instructorTypes.find(t => t.code === inst.instructor_type);
                        return typeInfo && typeInfo.type === '3. 멘토';
                    }).map(inst => {
                        const typeInfo = instructorTypes.find(t => t.code === inst.instructor_type);
                        return `<option value="${inst.code}" ${existing && existing.mentor_code === inst.code ? 'selected' : ''}>${inst.name} - ${inst.code} - ${typeInfo.name} - ${typeInfo.type}</option>`;
                    }).join('')}
                </select>
            </div>
        </div>
        
        <h4 class="font-semibold mb-2">공유계정 (최대 5개)</h4>
        <div class="space-y-2 mb-4">
            ${[1, 2, 3, 4, 5].map(i => `
                <div class="grid grid-cols-3 gap-2">
                    <input type="text" id="account${i}-name" placeholder="계정명칭 ${i}" value="${existing ? existing[`account${i}_name`] || '' : ''}" class="border rounded px-3 py-2">
                    <input type="text" id="account${i}-id" placeholder="계정 ID" value="${existing ? existing[`account${i}_id`] || '' : ''}" class="border rounded px-3 py-2">
                    <input type="text" id="account${i}-pw" placeholder="비밀번호" value="${existing ? existing[`account${i}_pw`] || '' : ''}" class="border rounded px-3 py-2">
                </div>
            `).join('')}
        </div>
        
        <h4 class="font-semibold mb-2">팀원 정보 (최대 5명)</h4>
        <div class="space-y-2">
            ${[1, 2, 3, 4, 5].map(i => `
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">팀원${i}</label>
                    <select id="member${i}-select" onchange="window.selectProjectMember(${i})" class="border rounded px-3 py-2 w-full">
                        <option value="">선택 안함</option>
                    </select>
                    <input type="hidden" id="member${i}-name" value="${existing ? existing[`member${i}_name`] || '' : ''}">
                    <input type="hidden" id="member${i}-phone" value="${existing ? existing[`member${i}_phone`] || '' : ''}">
                    <input type="hidden" id="member${i}-code" value="${existing ? existing[`member${i}_code`] || '' : ''}">
                </div>
            `).join('')}
        </div>
        
        <!-- 사진 업로드 섹션 -->
        <div class="mt-6">
            <h4 class="font-semibold mb-2">
                <i class="fas fa-camera mr-2"></i>사진 첨부
            </h4>
            <div class="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
                <div class="flex flex-wrap gap-2 mb-3">
                    <button type="button" onclick="document.getElementById('project-file-input').click()" 
                            class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
                        <i class="fas fa-folder-open mr-2"></i>파일 선택
                    </button>
                    <button type="button" onclick="document.getElementById('project-camera-input').click()" 
                            class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded">
                        <i class="fas fa-camera mr-2"></i>사진 촬영
                    </button>
                </div>
                <div id="project-upload-progress" class="hidden mb-3">
                    <div class="bg-blue-50 border border-blue-200 rounded p-3">
                        <p class="text-sm text-blue-800 mb-2">
                            <i class="fas fa-cloud-upload-alt mr-2"></i>
                            서버에 업로드 후 자동 저장됩니다. 잠시만 기다리세요...
                        </p>
                        <div class="w-full bg-blue-200 rounded-full h-2">
                            <div id="project-progress-bar" class="bg-blue-600 h-2 rounded-full transition-all duration-300" style="width: 0%"></div>
                        </div>
                    </div>
                </div>
                <input type="file" id="project-file-input" accept="image/*" multiple 
                       onchange="window.handleProjectImageUpload(event)" class="hidden">
                <input type="file" id="project-camera-input" accept="image/*" 
                       onchange="window.handleProjectImageUpload(event)" class="hidden">
                <div id="project-photos-preview" class="flex flex-col gap-2 mt-2"></div>
                <input type="hidden" id="project-photo-urls" value='${existing && existing.photo_urls ? existing.photo_urls : "[]"}'>
                <input type="hidden" id="project-code" value="${code || ''}">
                <p class="text-sm text-gray-500 mt-2">
                    <i class="fas fa-info-circle mr-1"></i>
                    최대 10MB, JPG/PNG/GIF 형식
                </p>
            </div>
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
    
    // 초기 학생 목록 업데이트
    window.updateProjectStudentList();
    
    // 기존 사진 미리보기 표시
    if (existing && existing.photo_urls) {
        try {
            const photoUrls = typeof existing.photo_urls === 'string' 
                ? JSON.parse(existing.photo_urls) 
                : existing.photo_urls;
            updateProjectPhotoPreview(photoUrls);
        } catch (e) {
            console.error('사진 URL 파싱 오류:', e);
        }
    }
}

window.updateProjectStudentList = function() {
    const courseSelect = document.getElementById('proj-course');
    const selectedCourse = courseSelect ? courseSelect.value : '';
    
    // 선택된 과정의 학생들만 필터링
    const filteredStudents = selectedCourse 
        ? students.filter(s => s.course_code === selectedCourse)
        : students;
    
    // 각 팀원 선택 드롭다운 업데이트
    for (let i = 1; i <= 5; i++) {
        const select = document.getElementById(`member${i}-select`);
        const nameInput = document.getElementById(`member${i}-name`);
        const codeInput = document.getElementById(`member${i}-code`);
        
        if (select) {
            const currentValue = codeInput ? codeInput.value : '';
            select.innerHTML = `
                <option value="">선택 안함</option>
                ${filteredStudents.map(s => `
                    <option value="${s.code}" ${s.code === currentValue ? 'selected' : ''}>
                        ${s.name} (${s.code})
                    </option>
                `).join('')}
            `;
            
            // 기존 값이 있으면 표시 업데이트
            if (currentValue) {
                const student = students.find(s => s.code === currentValue);
                if (student && select.value) {
                    select.value = currentValue;
                }
            }
        }
    }
}

window.selectProjectMember = function(memberIndex) {
    const select = document.getElementById(`member${memberIndex}-select`);
    const studentCode = select ? select.value : '';
    
    const nameInput = document.getElementById(`member${memberIndex}-name`);
    const phoneInput = document.getElementById(`member${memberIndex}-phone`);
    const codeInput = document.getElementById(`member${memberIndex}-code`);
    
    if (studentCode) {
        const student = students.find(s => s.code === studentCode);
        if (student) {
            if (nameInput) nameInput.value = student.name;
            if (phoneInput) phoneInput.value = student.phone || '';
            if (codeInput) codeInput.value = student.code;
        }
    } else {
        if (nameInput) nameInput.value = '';
        if (phoneInput) phoneInput.value = '';
        if (codeInput) codeInput.value = '';
    }
}

window.hideProjectForm = function() {
    document.getElementById('project-form').classList.add('hidden');
}

window.saveProject = async function(existingCode, autoSave = false) {
    const code = document.getElementById('proj-code').value;
    const name = document.getElementById('proj-name').value;
    const groupType = document.getElementById('proj-group').value;
    const courseCode = document.getElementById('proj-course').value;
    const instructorCode = document.getElementById('proj-instructor').value;
    const mentorCode = document.getElementById('proj-mentor').value;
    
    // 유효성 검사
    if (!code) {
        window.showAlert('팀 코드를 입력하세요.');
        return;
    }
    if (!name) {
        window.showAlert('팀명을 입력하세요.');
        return;
    }
    if (!groupType) {
        window.showAlert('그룹 구분을 선택하세요.');
        return;
    }
    if (!courseCode) {
        window.showAlert('과정을 선택하세요.');
        return;
    }
    
    // 사진 URL 가져오기
    const photoUrlsInput = document.getElementById('project-photo-urls');
    const photoUrls = photoUrlsInput ? photoUrlsInput.value : '[]';
    
    const data = {
        code: code,
        name: name,
        group_type: groupType,
        course_code: courseCode,
        instructor_code: instructorCode || null,
        mentor_code: mentorCode || null,
        member1_name: document.getElementById('member1-name').value,
        member1_phone: document.getElementById('member1-phone').value,
        member1_code: document.getElementById('member1-code').value,
        member2_name: document.getElementById('member2-name').value,
        member2_phone: document.getElementById('member2-phone').value,
        member2_code: document.getElementById('member2-code').value,
        member3_name: document.getElementById('member3-name').value,
        member3_phone: document.getElementById('member3-phone').value,
        member3_code: document.getElementById('member3-code').value,
        member4_name: document.getElementById('member4-name').value,
        member4_phone: document.getElementById('member4-phone').value,
        member4_code: document.getElementById('member4-code').value,
        member5_name: document.getElementById('member5-name').value,
        member5_phone: document.getElementById('member5-phone').value,
        member5_code: document.getElementById('member5-code').value,
        // 공유계정 필드 추가
        account1_name: document.getElementById('account1-name').value || null,
        account1_id: document.getElementById('account1-id').value || null,
        account1_pw: document.getElementById('account1-pw').value || null,
        account2_name: document.getElementById('account2-name').value || null,
        account2_id: document.getElementById('account2-id').value || null,
        account2_pw: document.getElementById('account2-pw').value || null,
        account3_name: document.getElementById('account3-name').value || null,
        account3_id: document.getElementById('account3-id').value || null,
        account3_pw: document.getElementById('account3-pw').value || null,
        account4_name: document.getElementById('account4-name').value || null,
        account4_id: document.getElementById('account4-id').value || null,
        account4_pw: document.getElementById('account4-pw').value || null,
        account5_name: document.getElementById('account5-name').value || null,
        account5_id: document.getElementById('account5-id').value || null,
        account5_pw: document.getElementById('account5-pw').value || null,
        photo_urls: photoUrls
    };
    
    try {
        if (existingCode) {
            await axios.put(`${API_BASE_URL}/api/projects/${existingCode}`, data);
            if (!autoSave) {
                window.showAlert('팀이 수정되었습니다.');
            }
        } else {
            await axios.post(`${API_BASE_URL}/api/projects`, data);
            if (!autoSave) {
                window.showAlert('팀이 추가되었습니다.');
            }
        }
        if (!autoSave) {
            window.hideProjectForm();
            loadProjects();
        }
    } catch (error) {
        window.showAlert('저장 실패: ' + (error.response?.data?.detail || error.message));
    }
}

window.editProject = function(code) {
    window.showProjectForm(code);
}

window.deleteProject = async function(code) {
    const confirmed = await window.showConfirm('이 팀을 삭제하시겠습니까?\n\n삭제하면 복구할 수 없습니다.');
    if (!confirmed) return;
    
    try {
        window.showLoading('팀 삭제 중...');
        await axios.delete(`${API_BASE_URL}/api/projects/${code}`);
        window.hideLoading();
        window.showAlert('팀이 삭제되었습니다.');
        loadProjects();
    } catch (error) {
        window.hideLoading();
        window.showAlert('삭제 실패: ' + (error.response?.data?.detail || error.message));
    }
}

// 팀 사진 업로드 핸들러
window.handleProjectImageUpload = async function(event) {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    const progressDiv = document.getElementById('project-upload-progress');
    const progressBar = document.getElementById('project-progress-bar');
    progressDiv?.classList.remove('hidden');
    if (progressBar) progressBar.style.width = '0%';

    const projectCode = document.getElementById('project-code')?.value || '';
    const projectName = document.getElementById('project-name')?.value || '이름 미지정';

    try {
        let photoUrls = [];
        const existingUrlsInput = document.getElementById('project-photo-urls');
        if (existingUrlsInput && existingUrlsInput.value) {
            try {
                photoUrls = JSON.parse(existingUrlsInput.value);
            } catch (e) {
                console.error('기존 URL 파싱 오류:', e);
            }
        }

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const formData = new FormData();
            formData.append('file', file);
            formData.append('category', 'team');
            formData.append('record_id', projectCode || 'temp');

            const response = await axios.post(`${API_BASE_URL}/api/upload-image`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    const totalPercent = Math.round(((i + percentCompleted / 100) / files.length) * 100);
                    if (progressBar) progressBar.style.width = totalPercent + '%';
                }
            });

            if (response.data.url) {
                photoUrls.push(response.data.url);
            }
        }

        if (existingUrlsInput) {
            existingUrlsInput.value = JSON.stringify(photoUrls);
        }

        updateProjectPhotoPreview(photoUrls);

        // Auto-save
        await window.saveProject(projectCode, true);

        window.showAlert(`사진 ${files.length}개가 업로드되고 팀(${projectName})에 자동 저장되었습니다.`);
    } catch (error) {
        console.error('업로드 오류:', error);
        window.showAlert('업로드 실패: ' + (error.response?.data?.detail || error.message));
    } finally {
        progressDiv?.classList.add('hidden');
        if (progressBar) progressBar.style.width = '0%';
        event.target.value = '';
    }
}

// 팀 사진 삭제 핸들러
window.removeProjectPhoto = async function(index) {
    if (!confirm('이 사진을 삭제하시겠습니까?')) return;

    const photoUrlsInput = document.getElementById('project-photo-urls');
    const projectCode = document.getElementById('project-code')?.value || '';
    const projectName = document.getElementById('project-name')?.value || '이름 미지정';

    if (!photoUrlsInput) return;

    try {
        let photoUrls = JSON.parse(photoUrlsInput.value);
        photoUrls.splice(index, 1);
        photoUrlsInput.value = JSON.stringify(photoUrls);

        updateProjectPhotoPreview(photoUrls);

        // Auto-save
        await window.saveProject(projectCode, true);

        window.showAlert(`사진이 삭제되고 팀(${projectName})에 자동 저장되었습니다.`);
    } catch (error) {
        console.error('삭제 오류:', error);
        window.showAlert('삭제 실패: ' + (error.response?.data?.detail || error.message));
    }
}

// 팀 사진 미리보기 업데이트
function updateProjectPhotoPreview(photoUrls) {
    const previewDiv = document.getElementById('project-photos-preview');
    if (!previewDiv) return;

    if (!photoUrls || photoUrls.length === 0) {
        previewDiv.innerHTML = '<p class="text-gray-400 text-sm">첨부된 사진이 없습니다</p>';
        return;
    }

    previewDiv.innerHTML = photoUrls.map((url, idx) => `
        <div class="flex items-center gap-3 bg-white border rounded p-2 hover:bg-gray-50">
            <a href="${API_BASE_URL}/api/download-image?url=${encodeURIComponent(url)}" download class="flex-shrink-0">
                <img src="${API_BASE_URL}/api/thumbnail?url=${encodeURIComponent(url)}" 
                     alt="사진 ${idx + 1}"
                     class="w-16 h-16 object-cover rounded border cursor-pointer hover:opacity-80"
                     onerror="this.onerror=null; this.src='data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27100%27 height=%27100%27%3E%3Crect fill=%27%23ddd%27 width=%27100%27 height=%27100%27/%3E%3Ctext x=%2750%25%27 y=%2750%25%27 text-anchor=%27middle%27 dy=%27.3em%27 fill=%27%23999%27%3E이미지 없음%3C/text%3E%3C/svg%3E';">
            </a>
            <div class="flex-1">
                <a href="${API_BASE_URL}/api/download-image?url=${encodeURIComponent(url)}" download 
                   class="text-blue-600 hover:underline text-sm block">
                    사진 ${idx + 1} 다운로드
                </a>
                <p class="text-xs text-gray-500 mt-1">클릭하여 다운로드</p>
            </div>
            <button type="button" onclick="window.removeProjectPhoto(${idx})" 
                    class="text-red-500 hover:text-red-700 px-2">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');
}

// ==================== 시간표 관리 ====================
let timetables = [];
let filteredTimetables = []; // 필터링된 시간표 저장

// 시간표 페이지 변경
window.changeTimetablePage = function(page) {
    pagination.timetables.currentPage = page;
    renderTimetableList();
};

// 시간표 페이지당 항목 수 변경
window.changeTimetableItemsPerPage = function(event) {
    pagination.timetables.itemsPerPage = parseInt(event.target.value);
    pagination.timetables.currentPage = 1;
    renderTimetableList();
};

// 시간표 목록만 다시 렌더링
function renderTimetableList() {
    const { currentPage, itemsPerPage } = pagination.timetables;
    const paginatedData = paginateArray(filteredTimetables, currentPage, itemsPerPage);
    
    const tbody = document.querySelector('#timetable-list tbody');
    if (filteredTimetables.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="11" class="px-4 py-8 text-center text-gray-500">
                    <i class="fas fa-search mr-2"></i>
                    필터 조건에 맞는 시간표가 없습니다
                </td>
            </tr>
        `;
        document.getElementById('timetable-pagination').innerHTML = '';
        return;
    }
    
    tbody.innerHTML = paginatedData.map(tt => {
        const duration = calculateDuration(tt.start_time, tt.end_time);
        const subject = subjects.find(s => s.code === tt.subject_code);
        const totalHours = subject ? subject.hours : 0;
        
        return `
        <tr class="border-t hover:bg-gray-50">
            <td class="px-3 py-2 text-xs">${tt.class_date}</td>
            <td class="px-3 py-2 text-xs">${tt.week_number || '-'}주차</td>
            <td class="px-3 py-2 text-xs">${tt.day_number || '-'}일차</td>
            <td class="px-3 py-2 text-xs">${tt.subject_name || tt.subject_code || '-'}</td>
            <td class="px-3 py-2 text-xs">${tt.instructor_name || tt.instructor_code || '-'}</td>
            <td class="px-3 py-2 text-xs">${formatTime(tt.start_time)} - ${formatTime(tt.end_time)}</td>
            <td class="px-3 py-2 text-xs font-semibold text-blue-600">${duration}h</td>
            <td class="px-3 py-2 text-xs font-bold text-purple-600">${totalHours}h</td>
            <td class="px-3 py-2 text-xs">
                <span class="text-xs ${tt.type === 'lecture' ? 'bg-blue-100 text-blue-800' : tt.type === 'project' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'} px-2 py-1 rounded">
                    ${tt.type}
                </span>
            </td>
            <td class="px-3 py-2 text-xs">
                ${tt.training_log_id ? `
                    <a href="#" onclick="showTab('training-logs'); return false;" class="text-green-600">
                        <i class="fas fa-check-circle"></i> 작성됨
                    </a>
                ` : '<span class="text-gray-400">-</span>'}
            </td>
            <td class="px-3 py-2 text-xs">
                <button onclick="window.editTimetable(${tt.id})" class="text-blue-600 hover:text-blue-800 mr-2">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="window.deleteTimetable(${tt.id})" class="text-red-600 hover:text-red-800">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
        `;
    }).join('');
    
    // 페이지네이션 렌더링
    const paginationHTML = createPaginationHTML(
        currentPage,
        itemsPerPage,
        filteredTimetables.length,
        'window.changeTimetablePage',
        'window.changeTimetableItemsPerPage(event)'
    );
    document.getElementById('timetable-pagination').innerHTML = paginationHTML;
}

async function loadTimetables() {
    try {
        window.showLoading('시간표 데이터를 불러오는 중...');
        // 과정, 과목, 강사 목록도 함께 로드
        const [ttRes, coursesRes, subjectsRes, instructorsRes, instructorTypesRes] = await Promise.all([
            axios.get(`${API_BASE_URL}/api/timetables`),
            axios.get(`${API_BASE_URL}/api/courses`),
            axios.get(`${API_BASE_URL}/api/subjects`),
            axios.get(`${API_BASE_URL}/api/instructors`),
            axios.get(`${API_BASE_URL}/api/instructor-codes`)
        ]);
        timetables = ttRes.data;
        courses = coursesRes.data;
        subjects = subjectsRes.data;
        instructors = instructorsRes.data;
        instructorTypes = instructorTypesRes.data;
        renderTimetables();
        window.hideLoading();
    } catch (error) {
        window.hideLoading();
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
                <button onclick="window.showTimetableForm()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
                    <i class="fas fa-plus mr-2"></i>시간표 추가
                </button>
            </div>
            
            <div class="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
                <p class="text-blue-700">
                    <i class="fas fa-info-circle mr-2"></i>
                    과정, 월, 강사, 과목별로 시간표를 필터링할 수 있습니다 (복수 선택 가능)
                </p>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div>
                    <label class="block text-gray-700 mb-2">과정 선택</label>
                    <select id="tt-course" class="w-full border rounded px-3 py-2" onchange="window.filterTimetables()">
                        <option value="">-- 전체 과정 --</option>
                        ${courses.map(c => `<option value="${c.code}">${c.name} (${c.code})</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="block text-gray-700 mb-2">월별 선택</label>
                    <input type="month" id="tt-month" class="w-full border rounded px-3 py-2" onchange="window.filterTimetables()">
                </div>
                <div>
                    <label class="block text-gray-700 mb-2">강사 선택</label>
                    <select id="tt-instructor" class="w-full border rounded px-3 py-2" onchange="window.filterTimetables()">
                        <option value="">-- 전체 강사 --</option>
                        ${instructors.map(i => `<option value="${i.code}">${i.name} (${i.code})</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="block text-gray-700 mb-2">과목 선택</label>
                    <select id="tt-subject" class="w-full border rounded px-3 py-2" onchange="window.filterTimetables()">
                        <option value="">-- 전체 과목 --</option>
                        ${subjects.map(s => `<option value="${s.code}">${s.name} (${s.code})</option>`).join('')}
                    </select>
                </div>
            </div>
            
            <div id="timetable-form" class="hidden mb-6 p-4 bg-gray-50 rounded-lg"></div>
            
            <div class="overflow-x-auto">
                <table class="min-w-full bg-white" id="timetable-list">
                    <thead class="bg-gray-100">
                        <tr>
                            <th class="px-3 py-2 text-left text-xs">날짜</th>
                            <th class="px-3 py-2 text-left text-xs">주차</th>
                            <th class="px-3 py-2 text-left text-xs">일차</th>
                            <th class="px-3 py-2 text-left text-xs">과목</th>
                            <th class="px-3 py-2 text-left text-xs">강사</th>
                            <th class="px-3 py-2 text-left text-xs">시간</th>
                            <th class="px-3 py-2 text-left text-xs">해당일 시수</th>
                            <th class="px-3 py-2 text-left text-xs">총 시수</th>
                            <th class="px-3 py-2 text-left text-xs">타입</th>
                            <th class="px-3 py-2 text-left text-xs">훈련일지</th>
                            <th class="px-3 py-2 text-left text-xs">작업</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${timetables.length === 0 ? `
                            <tr>
                                <td colspan="9" class="px-4 py-8 text-center text-gray-500">
                                    과정을 선택하여 시간표를 조회하세요
                                </td>
                            </tr>
                        ` : timetables.slice(0, 100).map(tt => `
                            <tr class="border-t hover:bg-gray-50">
                                <td class="px-3 py-2 text-xs">${tt.class_date}</td>
                                <td class="px-3 py-2 text-xs">${tt.week_number || '-'}주차</td>
                                <td class="px-3 py-2 text-xs">${tt.day_number || '-'}일차</td>
                                <td class="px-3 py-2 text-xs">${tt.subject_name || tt.subject_code || '-'}</td>
                                <td class="px-3 py-2 text-xs">${tt.instructor_name || tt.instructor_code || '-'}</td>
                                <td class="px-3 py-2 text-xs">${formatTime(tt.start_time)} - ${formatTime(tt.end_time)}</td>
                                <td class="px-3 py-2 text-xs">
                                    <span class="px-2 py-1 rounded text-xs ${tt.type === 'lecture' ? 'bg-blue-100 text-blue-800' : tt.type === 'project' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">
                                        ${tt.type}
                                    </span>
                                </td>
                                <td class="px-3 py-2 text-xs">
                                    ${tt.training_log_id ? `
                                        <span class="text-green-600">
                                            <i class="fas fa-check-circle"></i> 완료
                                        </span>
                                    ` : `
                                        <span class="text-gray-400">
                                            <i class="fas fa-times-circle"></i> 미작성
                                        </span>
                                    `}
                                </td>
                                <td class="px-3 py-2 text-xs">
                                    <button onclick="window.editTimetable(${tt.id})" class="text-blue-600 hover:text-blue-800 mr-2" title="수정">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button onclick="window.deleteTimetable(${tt.id})" class="text-red-600 hover:text-red-800" title="삭제">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                        ${timetables.length > 100 ? `<tr><td colspan="9" class="px-4 py-2 text-center text-gray-500">처음 100개만 표시됩니다 (전체: ${timetables.length})</td></tr>` : ''}
                    </tbody>
                </table>
            </div>
            
            <!-- 페이지네이션 -->
            <div id="timetable-pagination"></div>
        </div>
    `;
    
    // 초기 필터링된 데이터 설정 (전체 표시)
    filteredTimetables = timetables;
    pagination.timetables.totalItems = timetables.length;
    pagination.timetables.currentPage = 1;
    renderTimetableList();
}

function formatTime(timeValue) {
    if (!timeValue) return '-';
    
    // 문자열인 경우 (HH:MM:SS 형식)
    if (typeof timeValue === 'string') {
        // HH:MM:SS에서 HH:MM만 추출
        return timeValue.substring(0, 5);
    }
    
    // 숫자인 경우 (초 단위)
    const hours = Math.floor(timeValue / 3600);
    const minutes = Math.floor((timeValue % 3600) / 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

function timeToSeconds(timeStr) {
    const [hours, minutes] = timeStr.split(':');
    return parseInt(hours) * 3600 + parseInt(minutes) * 60;
}

function calculateDuration(startSeconds, endSeconds) {
    if (!startSeconds || !endSeconds) return 0;
    const durationSeconds = endSeconds - startSeconds;
    return Math.round(durationSeconds / 3600); // 시간 단위로 반환
}

// 날짜에 요일 추가하는 헬퍼 함수
function formatDateWithDay(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const dayOfWeek = dayNames[date.getDay()];
    return `${dateStr.substring(0, 10)} (${dayOfWeek})`;
}

window.filterTimetables = function() {
    const courseCode = document.getElementById('tt-course').value;
    const month = document.getElementById('tt-month').value; // YYYY-MM 형식
    const instructorCode = document.getElementById('tt-instructor').value;
    const subjectCode = document.getElementById('tt-subject').value;
    
    // 모든 시간표에서 필터링
    filteredTimetables = timetables.filter(tt => {
        // 과정 필터
        if (courseCode && tt.course_code !== courseCode) {
            return false;
        }
        
        // 월별 필터 (YYYY-MM 형식)
        if (month && tt.class_date) {
            const ttMonth = tt.class_date.substring(0, 7); // "2025-01-15" -> "2025-01"
            if (ttMonth !== month) {
                return false;
            }
        }
        
        // 강사 필터
        if (instructorCode && tt.instructor_code !== instructorCode) {
            return false;
        }
        
        // 과목 필터
        if (subjectCode && tt.subject_code !== subjectCode) {
            return false;
        }
        
        return true;
    });
    
    pagination.timetables.totalItems = filteredTimetables.length;
    pagination.timetables.currentPage = 1;
    renderTimetableList();
}

window.showTimetableForm = function(id = null) {
    const formDiv = document.getElementById('timetable-form');
    formDiv.classList.remove('hidden');
    
    const existing = id ? timetables.find(tt => tt.id === id) : null;
    
    formDiv.innerHTML = `
        <div class="flex justify-between items-start mb-4">
            <h3 class="text-lg font-semibold">${id ? '시간표 수정' : '시간표 추가'}</h3>
            <button onclick="window.hideTimetableForm()" class="text-gray-600 hover:text-gray-800">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
                <label class="block text-sm text-gray-700 mb-1">과정 *</label>
                <select id="tt-course-code" class="w-full border rounded px-3 py-2" required>
                    <option value="">선택하세요</option>
                    ${courses.map(c => `
                        <option value="${c.code}" ${existing && existing.course_code === c.code ? 'selected' : ''}>
                            ${c.code} - ${c.name || c.code}
                        </option>
                    `).join('')}
                </select>
            </div>
            <div>
                <label class="block text-sm text-gray-700 mb-1">과목</label>
                <select id="tt-subject-code" class="w-full border rounded px-3 py-2">
                    <option value="">선택하세요</option>
                    ${subjects.map(s => `
                        <option value="${s.code}" ${existing && existing.subject_code === s.code ? 'selected' : ''}>
                            ${s.code} - ${s.name || s.code}
                        </option>
                    `).join('')}
                </select>
            </div>
            <div>
                <label class="block text-sm text-gray-700 mb-1">강사</label>
                <select id="tt-instructor-code" class="w-full border rounded px-3 py-2">
                    <option value="">선택하세요</option>
                    ${instructors.map(i => {
                        const typeInfo = instructorTypes.find(t => t.code === i.instructor_type);
                        const typeName = typeInfo ? typeInfo.name : '';
                        const typeType = typeInfo ? typeInfo.type : '';
                        return `
                            <option value="${i.code}" ${existing && existing.instructor_code === i.code ? 'selected' : ''}>
                                ${i.name} - ${i.code} - ${typeName} - ${typeType}
                            </option>
                        `;
                    }).join('')}
                </select>
            </div>
            <div>
                <label class="block text-sm text-gray-700 mb-1">날짜 *</label>
                <input type="date" id="tt-class-date" value="${existing ? existing.class_date : ''}" class="w-full border rounded px-3 py-2" required>
            </div>
            <div>
                <label class="block text-sm text-gray-700 mb-1">시작 시간 *</label>
                <input type="time" id="tt-start-time" value="${existing ? formatTime(existing.start_time) : ''}" class="w-full border rounded px-3 py-2" required>
            </div>
            <div>
                <label class="block text-sm text-gray-700 mb-1">종료 시간 *</label>
                <input type="time" id="tt-end-time" value="${existing ? formatTime(existing.end_time) : ''}" class="w-full border rounded px-3 py-2" required>
            </div>
            <div>
                <label class="block text-sm text-gray-700 mb-1">타입 *</label>
                <select id="tt-type" class="w-full border rounded px-3 py-2" required>
                    <option value="lecture" ${existing && existing.type === 'lecture' ? 'selected' : ''}>강의</option>
                    <option value="project" ${existing && existing.type === 'project' ? 'selected' : ''}>프로젝트</option>
                    <option value="internship" ${existing && existing.type === 'internship' ? 'selected' : ''}>인턴십</option>
                </select>
            </div>
            <div>
                <label class="block text-sm text-gray-700 mb-1">비고</label>
                <input type="text" id="tt-notes" placeholder="비고" value="${existing ? existing.notes || '' : ''}" class="w-full border rounded px-3 py-2">
            </div>
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
    // 시간 입력값을 HH:MM:SS 형식으로 변환
    const startTimeValue = document.getElementById('tt-start-time').value;
    const endTimeValue = document.getElementById('tt-end-time').value;
    
    const data = {
        course_code: document.getElementById('tt-course-code').value,
        subject_code: document.getElementById('tt-subject-code').value,
        instructor_code: document.getElementById('tt-instructor-code').value,
        class_date: document.getElementById('tt-class-date').value,
        start_time: startTimeValue + ':00',  // "HH:MM" -> "HH:MM:SS" 형식으로 변환
        end_time: endTimeValue + ':00',      // "HH:MM" -> "HH:MM:SS" 형식으로 변환
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

// ==================== 훈련일지 관리 ====================
let trainingLogs = [];
let selectedCourseForLogs = null;

async function loadTrainingLogs() {
    try {
        window.showLoading('훈련일지 데이터를 불러오는 중...');
        // 먼저 과정 목록 로드
        const coursesRes = await axios.get(`${API_BASE_URL}/api/courses`);
        const courses = coursesRes.data;
        
        // 강사 목록 로드
        const instructorsRes = await axios.get(`${API_BASE_URL}/api/instructors`);
        instructors = instructorsRes.data;
        
        renderTrainingLogsSelection(courses);
        window.hideLoading();
    } catch (error) {
        window.hideLoading();
        console.error('훈련일지 초기화 실패:', error);
        document.getElementById('app').innerHTML = '<div class="text-red-600 p-4">훈련일지를 불러오는데 실패했습니다.</div>';
    }
}

function renderTrainingLogsSelection(courses) {
    const app = document.getElementById('app');
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    
    app.innerHTML = `
        <div class="bg-white rounded-lg shadow-md p-6">
            <h2 class="text-2xl font-bold text-gray-800 mb-6">
                <i class="fas fa-clipboard-list mr-2"></i>훈련일지 관리
            </h2>
            
            <div class="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
                <p class="text-blue-700">
                    <i class="fas fa-info-circle mr-2"></i>
                    과정, 강사, 기간을 선택하여 훈련일지를 조회하세요
                </p>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div>
                    <label class="block text-gray-700 mb-2">과정 선택</label>
                    <select id="log-course" class="w-full border rounded px-3 py-2" onchange="window.filterTrainingLogs()">
                        <option value="">-- 과정 선택 --</option>
                        ${courses.map(c => `<option value="${c.code}">${c.name} (${c.code})</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="block text-gray-700 mb-2">강사 선택</label>
                    <select id="log-instructor" class="w-full border rounded px-3 py-2" onchange="window.filterTrainingLogs()">
                        <option value="">전체 강사</option>
                        ${instructors.map(i => `<option value="${i.code}">${i.name} (${i.code})</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="block text-gray-700 mb-2">년도</label>
                    <select id="log-year" class="w-full border rounded px-3 py-2" onchange="window.filterTrainingLogs()">
                        <option value="">전체</option>
                        <option value="${currentYear}" selected>${currentYear}</option>
                        <option value="${currentYear - 1}">${currentYear - 1}</option>
                    </select>
                </div>
                <div>
                    <label class="block text-gray-700 mb-2">월</label>
                    <select id="log-month" class="w-full border rounded px-3 py-2" onchange="window.filterTrainingLogs()">
                        <option value="">전체</option>
                        ${Array.from({length: 12}, (_, i) => i + 1).map(m => 
                            `<option value="${m}" ${m === currentMonth ? 'selected' : ''}>${m}월</option>`
                        ).join('')}
                    </select>
                </div>
            </div>
            
            <div id="training-logs-list">
                <p class="text-gray-500 text-center py-8">과정을 선택하여 시간표와 훈련일지를 조회하세요</p>
            </div>
        </div>
    `;
}

window.filterTrainingLogs = async function() {
    const courseCode = document.getElementById('log-course').value;
    const instructorCode = document.getElementById('log-instructor').value;
    const year = document.getElementById('log-year').value;
    const month = document.getElementById('log-month').value;
    
    if (!courseCode) {
        document.getElementById('training-logs-list').innerHTML = `
            <p class="text-gray-500 text-center py-8">과정을 먼저 선택해주세요</p>
        `;
        return;
    }
    
    selectedCourseForLogs = courseCode;
    
    try {
        // 시간표와 훈련일지를 함께 조회
        let url = `${API_BASE_URL}/api/timetables?course_code=${courseCode}`;
        
        const response = await axios.get(url);
        const timetables = response.data;
        
        // 필터링
        let filteredTimetables = timetables;
        
        if (instructorCode) {
            filteredTimetables = filteredTimetables.filter(tt => tt.instructor_code === instructorCode);
        }
        
        if (year && month) {
            filteredTimetables = filteredTimetables.filter(tt => {
                const date = new Date(tt.class_date);
                return date.getFullYear() === parseInt(year) && date.getMonth() + 1 === parseInt(month);
            });
        } else if (year) {
            filteredTimetables = filteredTimetables.filter(tt => {
                const date = new Date(tt.class_date);
                return date.getFullYear() === parseInt(year);
            });
        }
        
        renderTrainingLogsTable(filteredTimetables);
    } catch (error) {
        console.error('훈련일지 조회 실패:', error);
        document.getElementById('training-logs-list').innerHTML = `
            <p class="text-red-600 text-center py-8">훈련일지를 불러오는데 실패했습니다</p>
        `;
    }
}

function renderTrainingLogsTable(timetables) {
    const listDiv = document.getElementById('training-logs-list');
    
    if (timetables.length === 0) {
        listDiv.innerHTML = `
            <p class="text-gray-500 text-center py-8">조회된 시간표가 없습니다</p>
        `;
        return;
    }
    
    // 과정 시작일 (2024-11-07)
    const courseStartDate = new Date('2024-11-07');
    
    // 과목별 총 시수 계산 (같은 과목 코드로 그룹핑)
    const subjectHoursMap = {};
    const subjectCurrentHoursMap = {};
    
    timetables.forEach((tt, index) => {
        if (tt.subject_code) {
            if (!subjectHoursMap[tt.subject_code]) {
                subjectHoursMap[tt.subject_code] = 0;
                subjectCurrentHoursMap[tt.subject_code] = 0;
            }
            
            // 총 시수 계산 (모든 시간표 항목)
            const duration = calculateDuration(tt.start_time, tt.end_time);
            subjectHoursMap[tt.subject_code] += duration;
            
            // 현재 시수 계산 (현재 항목까지)
            subjectCurrentHoursMap[tt.subject_code] += duration;
        }
    });
    
    listDiv.innerHTML = `
        <div id="training-log-form" class="hidden mb-6 p-4 bg-blue-50 rounded-lg"></div>
        
        <div class="mb-4">
            <p class="text-sm text-gray-600">총 ${timetables.length}건의 시간표</p>
        </div>
        <div class="overflow-x-auto">
            <table class="min-w-full bg-white border">
                <thead class="bg-gray-100">
                    <tr>
                        <th class="px-3 py-2 text-left text-xs">날짜</th>
                        <th class="px-3 py-2 text-left text-xs">주차</th>
                        <th class="px-3 py-2 text-left text-xs">일차</th>
                        <th class="px-3 py-2 text-left text-xs">강의시수</th>
                        <th class="px-3 py-2 text-left text-xs">과목</th>
                        <th class="px-3 py-2 text-left text-xs">강사</th>
                        <th class="px-3 py-2 text-left text-xs">시간</th>
                        <th class="px-3 py-2 text-left text-xs">타입</th>
                        <th class="px-3 py-2 text-left text-xs">훈련일지</th>
                        <th class="px-3 py-2 text-left text-xs">작업</th>
                    </tr>
                </thead>
                <tbody>
                    ${timetables.map((tt, index) => {
                        const hasLog = tt.training_log_id != null;
                        const logContent = tt.training_content ? tt.training_content.substring(0, 30) + '...' : '';
                        
                        // 날짜에서 요일 계산
                        const classDate = new Date(tt.class_date);
                        const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
                        const dayOfWeek = dayNames[classDate.getDay()];
                        
                        // 주차 계산 (2024-11-07 기준)
                        const diffTime = classDate - courseStartDate;
                        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                        const weekNumber = Math.floor(diffDays / 7) + 1;
                        
                        // 강의시수 계산 (현재시수/총시수)
                        let hoursDisplay = '-';
                        if (tt.subject_code) {
                            // 현재 항목까지의 누적 시수 계산
                            let currentHours = 0;
                            for (let i = 0; i <= index; i++) {
                                if (timetables[i].subject_code === tt.subject_code) {
                                    currentHours += calculateDuration(timetables[i].start_time, timetables[i].end_time);
                                }
                            }
                            const totalHours = subjectHoursMap[tt.subject_code];
                            hoursDisplay = `${currentHours}h / ${totalHours}h`;
                        }
                        
                        return `
                            <tr class="border-b hover:bg-gray-50">
                                <td class="px-3 py-2 text-xs">${tt.class_date} (${dayOfWeek})</td>
                                <td class="px-3 py-2 text-xs">${weekNumber}주차</td>
                                <td class="px-3 py-2 text-xs">${tt.day_number || '-'}일차</td>
                                <td class="px-3 py-2 text-xs font-semibold text-blue-600">${hoursDisplay}</td>
                                <td class="px-3 py-2 text-xs">${tt.subject_name || '-'}</td>
                                <td class="px-3 py-2 text-xs">${tt.instructor_name || '-'}</td>
                                <td class="px-3 py-2 text-xs">${formatTime(tt.start_time)} - ${formatTime(tt.end_time)}</td>
                                <td class="px-3 py-2 text-xs">
                                    <span class="px-2 py-1 rounded text-xs ${
                                        tt.type === 'lecture' ? 'bg-blue-100 text-blue-800' :
                                        tt.type === 'project' ? 'bg-green-100 text-green-800' :
                                        'bg-yellow-100 text-yellow-800'
                                    }">
                                        ${tt.type}
                                    </span>
                                </td>
                                <td class="px-3 py-2 text-xs">
                                    ${hasLog ? `
                                        <span class="text-green-600">
                                            <i class="fas fa-check-circle mr-1"></i>작성완료
                                        </span>
                                        <div class="text-gray-500 text-xs mt-1">${logContent}</div>
                                    ` : `
                                        <span class="text-gray-400">
                                            <i class="fas fa-times-circle mr-1"></i>미작성
                                        </span>
                                    `}
                                </td>
                                <td class="px-3 py-2 text-xs">
                                    ${hasLog && tt.training_log_photo_urls && JSON.parse(tt.training_log_photo_urls || '[]').length > 0 ? `
                                        <i class="fas fa-camera text-green-600 mr-2" title="${JSON.parse(tt.training_log_photo_urls).length}개 사진"></i>
                                    ` : ''}
                                    ${hasLog ? `
                                        <button onclick="window.editTrainingLog(${tt.training_log_id}, ${tt.id})" class="text-blue-600 hover:text-blue-800 mr-2">
                                            <i class="fas fa-edit"></i> 수정
                                        </button>
                                    ` : `
                                        <button onclick="window.showTrainingLogForm(${tt.id})" class="text-green-600 hover:text-green-800">
                                            <i class="fas fa-plus"></i> 작성
                                        </button>
                                    `}
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

window.showTrainingLogForm = async function(timetableId) {
    try {
        // 시간표 정보 조회
        const response = await axios.get(`${API_BASE_URL}/api/timetables/${timetableId}`);
        const tt = response.data;
        
        // 과목의 세부 교과목 정보 조회
        let subSubjectsHTML = '';
        if (tt.subject_code) {
            try {
                const subjectRes = await axios.get(`${API_BASE_URL}/api/subjects/${tt.subject_code}`);
                const subject = subjectRes.data;
                const subs = [1, 2, 3, 4, 5]
                    .filter(i => subject[`sub_subject_${i}`] && subject[`sub_subject_${i}`].trim())
                    .map(i => `<li class="text-xs">• ${subject[`sub_subject_${i}`]} (${subject[`sub_hours_${i}`] || 0}시간)</li>`);
                
                if (subs.length > 0) {
                    subSubjectsHTML = `
                        <div class="mt-2 pt-2 border-t">
                            <p class="text-sm font-semibold mb-1">세부 교과목:</p>
                            <ul class="text-gray-600">${subs.join('')}</ul>
                        </div>
                    `;
                }
            } catch (error) {
                console.error('과목 정보 조회 실패:', error);
            }
        }
        
        const formDiv = document.getElementById('training-log-form');
        formDiv.innerHTML = `
            <h3 class="text-lg font-bold mb-4">
                <i class="fas fa-clipboard-list mr-2"></i>훈련일지 작성
            </h3>
            <div class="bg-white p-4 rounded mb-4">
                <p class="text-sm"><strong>날짜:</strong> ${tt.class_date}</p>
                <p class="text-sm"><strong>과목:</strong> ${tt.subject_name || '-'}</p>
                <p class="text-sm"><strong>강사:</strong> ${tt.instructor_name || '-'}</p>
                <p class="text-sm"><strong>시간:</strong> ${formatTime(tt.start_time)} - ${formatTime(tt.end_time)}</p>
                ${subSubjectsHTML}
            </div>
            <form id="training-log-save-form">
                <input type="hidden" id="training-log-id" value="">
                <input type="hidden" id="training-timetable-id" value="${timetableId}">
                <input type="hidden" id="training-course-code" value="${tt.course_code}">
                <input type="hidden" id="training-instructor-code" value="${tt.instructor_code}">
                <input type="hidden" id="training-class-date" value="${tt.class_date}">
                <div class="space-y-4">
                    <div>
                        <label class="block text-gray-700 mb-2">수업 내용 *</label>
                        <textarea name="content" rows="6" required class="w-full px-3 py-2 border rounded-lg" 
                                  placeholder="오늘 수업에서 다룬 내용을 자세히 작성해주세요..."></textarea>
                    </div>
                    <div>
                        <label class="block text-gray-700 mb-2">과제</label>
                        <textarea name="homework" rows="3" class="w-full px-3 py-2 border rounded-lg" 
                                  placeholder="학생들에게 부여한 과제가 있다면 작성해주세요..."></textarea>
                    </div>
                    <div>
                        <label class="block text-gray-700 mb-2">비고</label>
                        <textarea name="notes" rows="2" class="w-full px-3 py-2 border rounded-lg" 
                                  placeholder="기타 특이사항이나 참고사항을 작성해주세요..."></textarea>
                    </div>
                    
                    <!-- 사진 업로드 -->
                    <div>
                        <label class="block text-gray-700 mb-2">
                            <i class="fas fa-camera mr-2"></i>사진 첨부
                        </label>
                        <div class="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
                            <div class="flex flex-wrap gap-2 mb-3">
                                <button type="button" onclick="document.getElementById('training-file-input').click()" 
                                        class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
                                    <i class="fas fa-folder-open mr-2"></i>파일 선택
                                </button>
                                <button type="button" onclick="document.getElementById('training-camera-input').click()" 
                                        class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded">
                                    <i class="fas fa-camera mr-2"></i>사진 촬영
                                </button>
                            </div>
                            <input type="file" id="training-file-input" accept="image/*" multiple 
                                   onchange="window.handleTrainingImageUpload(event)" class="hidden">
                            <input type="file" id="training-camera-input" accept="image/*"  
                                   onchange="window.handleTrainingImageUpload(event)" class="hidden">
                            <div id="training-upload-progress" class="hidden mb-3">
                                <div class="bg-blue-50 border border-blue-200 rounded p-3">
                                    <p class="text-sm text-blue-800 mb-2">
                                        <i class="fas fa-cloud-upload-alt mr-2"></i>
                                        서버에 업로드 후 자동 저장됩니다. 잠시만 기다리세요...
                                    </p>
                                    <div class="w-full bg-blue-200 rounded-full h-2">
                                        <div id="training-progress-bar" class="bg-blue-600 h-2 rounded-full transition-all duration-300" style="width: 0%"></div>
                                    </div>
                                </div>
                            </div>
                            <div id="training-photos-preview" class="flex flex-col gap-2 mt-2"></div>
                            <input type="hidden" id="training-photo-urls" value="[]">
                            <p class="text-sm text-gray-500 mt-2">
                                <i class="fas fa-info-circle mr-1"></i>
                                최대 10MB, JPG/PNG/GIF 형식
                            </p>
                        </div>
                    </div>
                </div>
                <div class="mt-4 space-x-2">
                    <button type="button" onclick="window.saveTrainingLog(${timetableId}, '${tt.course_code}', '${tt.instructor_code}', '${tt.class_date}')" 
                            class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
                        <i class="fas fa-save mr-2"></i>저장
                    </button>
                    <button type="button" onclick="window.hideTrainingLogForm()" 
                            class="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded-lg">
                        취소
                    </button>
                </div>
            </form>
        `;
        
        formDiv.classList.remove('hidden');
        formDiv.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        console.error('시간표 정보 조회 실패:', error);
        window.showAlert('시간표 정보를 불러오는데 실패했습니다');
    }
}

window.editTrainingLog = async function(logId, timetableId) {
    try {
        const [logRes, ttRes] = await Promise.all([
            axios.get(`${API_BASE_URL}/api/training-logs/${logId}`),
            axios.get(`${API_BASE_URL}/api/timetables/${timetableId}`)
        ]);
        
        const log = logRes.data;
        const tt = ttRes.data;
        
        // 과목의 세부 교과목 정보 조회
        let subSubjectsHTML = '';
        if (tt.subject_code) {
            try {
                const subjectRes = await axios.get(`${API_BASE_URL}/api/subjects/${tt.subject_code}`);
                const subject = subjectRes.data;
                const subs = [1, 2, 3, 4, 5]
                    .filter(i => subject[`sub_subject_${i}`] && subject[`sub_subject_${i}`].trim())
                    .map(i => `<li class="text-xs">• ${subject[`sub_subject_${i}`]} (${subject[`sub_hours_${i}`] || 0}시간)</li>`);
                
                if (subs.length > 0) {
                    subSubjectsHTML = `
                        <div class="mt-2 pt-2 border-t">
                            <p class="text-sm font-semibold mb-1">세부 교과목:</p>
                            <ul class="text-gray-600">${subs.join('')}</ul>
                        </div>
                    `;
                }
            } catch (error) {
                console.error('과목 정보 조회 실패:', error);
            }
        }
        
        const formDiv = document.getElementById('training-log-form');
        formDiv.innerHTML = `
            <h3 class="text-lg font-bold mb-4">
                <i class="fas fa-edit mr-2"></i>훈련일지 수정
            </h3>
            <div class="bg-white p-4 rounded mb-4">
                <p class="text-sm"><strong>날짜:</strong> ${tt.class_date}</p>
                <p class="text-sm"><strong>과목:</strong> ${tt.subject_name || '-'}</p>
                <p class="text-sm"><strong>강사:</strong> ${tt.instructor_name || '-'}</p>
                <p class="text-sm"><strong>시간:</strong> ${formatTime(tt.start_time)} - ${formatTime(tt.end_time)}</p>
                ${subSubjectsHTML}
            </div>
            <form id="training-log-save-form">
                <input type="hidden" id="training-log-id" value="${logId}">
                <input type="hidden" id="training-timetable-id" value="${timetableId}">
                <input type="hidden" id="training-course-code" value="${tt.course_code}">
                <input type="hidden" id="training-instructor-code" value="${tt.instructor_code}">
                <input type="hidden" id="training-class-date" value="${tt.class_date}">
                <div class="space-y-4">
                    <div>
                        <label class="block text-gray-700 mb-2">수업 내용 *</label>
                        <textarea name="content" rows="6" required class="w-full px-3 py-2 border rounded-lg">${log.content || ''}</textarea>
                    </div>
                    <div>
                        <label class="block text-gray-700 mb-2">과제</label>
                        <textarea name="homework" rows="3" class="w-full px-3 py-2 border rounded-lg">${log.homework || ''}</textarea>
                    </div>
                    <div>
                        <label class="block text-gray-700 mb-2">비고</label>
                        <textarea name="notes" rows="2" class="w-full px-3 py-2 border rounded-lg">${log.notes || ''}</textarea>
                    </div>
                    
                    <!-- 사진 업로드 -->
                    <div>
                        <label class="block text-gray-700 mb-2">
                            <i class="fas fa-camera mr-2"></i>사진 첨부
                        </label>
                        <div class="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
                            <div class="flex flex-wrap gap-2 mb-3">
                                <button type="button" onclick="document.getElementById('training-file-input').click()" 
                                        class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
                                    <i class="fas fa-folder-open mr-2"></i>파일 선택
                                </button>
                                <button type="button" onclick="document.getElementById('training-camera-input').click()" 
                                        class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded">
                                    <i class="fas fa-camera mr-2"></i>사진 촬영
                                </button>
                            </div>
                            <input type="file" id="training-file-input" accept="image/*" multiple 
                                   onchange="window.handleTrainingImageUpload(event)" class="hidden">
                            <input type="file" id="training-camera-input" accept="image/*"  
                                   onchange="window.handleTrainingImageUpload(event)" class="hidden">
                            <div id="training-upload-progress" class="hidden mb-3">
                                <div class="bg-blue-50 border border-blue-200 rounded p-3">
                                    <p class="text-sm text-blue-800 mb-2">
                                        <i class="fas fa-cloud-upload-alt mr-2"></i>
                                        서버에 업로드 후 자동 저장됩니다. 잠시만 기다리세요...
                                    </p>
                                    <div class="w-full bg-blue-200 rounded-full h-2">
                                        <div id="training-progress-bar" class="bg-blue-600 h-2 rounded-full transition-all duration-300" style="width: 0%"></div>
                                    </div>
                                </div>
                            </div>
                            <div id="training-photos-preview" class="flex flex-col gap-2 mt-2"></div>
                            <input type="hidden" id="training-photo-urls" value='${log && log.photo_urls ? log.photo_urls : "[]"}'>
                        </div>
                    </div>
                </div>
                <div class="mt-4 space-x-2">
                    <button type="button" onclick="window.updateTrainingLog(${logId})" 
                            class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
                        <i class="fas fa-save mr-2"></i>저장
                    </button>
                    <button type="button" onclick="window.deleteTrainingLog(${logId})" 
                            class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg">
                        <i class="fas fa-trash mr-2"></i>삭제
                    </button>
                    <button type="button" onclick="window.hideTrainingLogForm()" 
                            class="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded-lg">
                        취소
                    </button>
                </div>
            </form>
        `;
        
        formDiv.classList.remove('hidden');
        formDiv.scrollIntoView({ behavior: 'smooth' });
        
        // 기존 사진 미리보기 표시
        if (log.photo_urls) {
            try {
                const photoUrls = typeof log.photo_urls === 'string' 
                    ? JSON.parse(log.photo_urls) 
                    : log.photo_urls;
                updateTrainingPhotoPreview(photoUrls);
            } catch (e) {
                console.error('사진 URL 파싱 오류:', e);
            }
        }
    } catch (error) {
        console.error('훈련일지 조회 실패:', error);
        window.showAlert('훈련일지를 불러오는데 실패했습니다');
    }
}

// 훈련일지 사진 업로드 처리
window.handleTrainingImageUpload = async function(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    // 프로그레스 바 표시
    const progressDiv = document.getElementById('training-upload-progress');
    const progressBar = document.getElementById('training-progress-bar');
    if (progressDiv) {
        progressDiv.classList.remove('hidden');
        progressBar.style.width = '0%';
    }
    
    try {
        const photoUrls = JSON.parse(document.getElementById('training-photo-urls').value || '[]');
        const totalFiles = files.length;
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const formData = new FormData();
            formData.append('file', file);
            
            // 프로그레스 업데이트
            const progress = ((i + 0.5) / totalFiles) * 100;
            if (progressBar) progressBar.style.width = `${progress}%`;
            
            const response = await axios.post(
                `${API_BASE_URL}/api/upload-image?category=train`,
                formData,
                {
                    headers: { 'Content-Type': 'multipart/form-data' }
                }
            );
            
            if (response.data.success) {
                photoUrls.push(response.data.url);
            }
            
            // 완료 프로그레스
            const completeProgress = ((i + 1) / totalFiles) * 100;
            if (progressBar) progressBar.style.width = `${completeProgress}%`;
        }
        
        document.getElementById('training-photo-urls').value = JSON.stringify(photoUrls);
        updateTrainingPhotoPreview(photoUrls);
        
        // 자동 저장
        const logIdInput = document.getElementById('training-log-id');
        const logId = logIdInput ? logIdInput.value : null;
        
        if (logId) {
            // 기존 훈련일지 수정 (화면 유지)
            await window.updateTrainingLog(parseInt(logId), true);
        } else {
            // 새 훈련일지 - hidden input에서 정보 가져오기 (화면 유지)
            const timetableId = document.getElementById('training-timetable-id')?.value;
            const courseCode = document.getElementById('training-course-code')?.value;
            const instructorCode = document.getElementById('training-instructor-code')?.value;
            const classDate = document.getElementById('training-class-date')?.value;
            
            if (timetableId && courseCode && instructorCode && classDate) {
                await window.saveTrainingLog(parseInt(timetableId), courseCode, instructorCode, classDate, true);
            }
        }
        
        // 프로그레스 바 숨기기
        if (progressDiv) {
            setTimeout(() => {
                progressDiv.classList.add('hidden');
            }, 1000);
        }
        
        // 과정명과 날짜 정보 가져오기
        const courseCodeInput = document.getElementById('training-course-code');
        const classDateInput = document.getElementById('training-class-date');
        const courseName = courseCodeInput?.dataset?.courseName || '';
        const classDate = classDateInput?.value || '';
        const contextMsg = courseName && classDate ? `${courseName} (${classDate}) 훈련일지에 ` : '훈련일지에 ';
        window.showAlert(`${contextMsg}${files.length}개 사진이 업로드되고 자동 저장되었습니다.`);
        
    } catch (error) {
        // 프로그레스 바 숨기기
        if (progressDiv) progressDiv.classList.add('hidden');
        
        console.error('사진 업로드 실패:', error);
        window.showAlert('사진 업로드 실패: ' + (error.response?.data?.detail || error.message));
    }
    
    event.target.value = '';
}

window.removeTrainingPhoto = async function(index) {
    const photoUrls = JSON.parse(document.getElementById('training-photo-urls').value || '[]');
    photoUrls.splice(index, 1);
    document.getElementById('training-photo-urls').value = JSON.stringify(photoUrls);
    updateTrainingPhotoPreview(photoUrls);
    
    // 자동 저장
    const logIdInput = document.getElementById('training-log-id');
    const logId = logIdInput ? logIdInput.value : null;
    
    if (logId) {
        await window.updateTrainingLog(parseInt(logId), true);
        
        // 과정명과 날짜 정보 가져오기
        const courseCodeInput = document.getElementById('training-course-code');
        const classDateInput = document.getElementById('training-class-date');
        const courseName = courseCodeInput?.dataset?.courseName || '';
        const classDate = classDateInput?.value || '';
        const contextMsg = courseName && classDate ? `${courseName} (${classDate}) 훈련일지에서 ` : '훈련일지에서 ';
        window.showAlert(`${contextMsg}사진이 삭제되고 자동 저장되었습니다.`);
    }
}

function updateTrainingPhotoPreview(photoUrls) {
    const previewDiv = document.getElementById('training-photos-preview');
    if (!previewDiv) return;
    
    if (!photoUrls || photoUrls.length === 0) {
        previewDiv.innerHTML = '<p class="text-gray-400 text-sm">첨부된 사진이 없습니다</p>';
        return;
    }
    
    previewDiv.innerHTML = photoUrls.map((url, idx) => `
        <div class="flex items-center gap-3 bg-white border rounded p-2 hover:bg-gray-50">
            <a href="${API_BASE_URL}/api/download-image?url=${encodeURIComponent(url)}" download class="flex-shrink-0">
                <img src="${API_BASE_URL}/api/thumbnail?url=${encodeURIComponent(url)}" 
                     alt="사진 ${idx + 1}"
                     class="w-16 h-16 object-cover rounded border cursor-pointer hover:opacity-80"
                     onerror="this.onerror=null; this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Crect fill=%22%23e5e7eb%22 width=%22100%22 height=%22100%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%239ca3af%22 font-size=%2240%22%3E📷%3C/text%3E%3C/svg%3E';">
            </a>
            <div class="flex-1">
                <a href="${API_BASE_URL}/api/download-image?url=${encodeURIComponent(url)}" download 
                   class="text-blue-600 hover:underline text-sm block">
                    사진 ${idx + 1} 다운로드
                </a>
                <p class="text-xs text-gray-500 mt-1">클릭하여 다운로드</p>
            </div>
            <button type="button" onclick="window.removeTrainingPhoto(${idx})" 
                    class="text-red-500 hover:text-red-700 px-2">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');
}

window.saveTrainingLog = async function(timetableId, courseCode, instructorCode, classDate, autoSave = false) {
    const form = document.getElementById('training-log-save-form');
    const formData = new FormData(form);
    const photoUrls = document.getElementById('training-photo-urls').value || '[]';
    
    const data = {
        timetable_id: timetableId,
        course_code: courseCode,
        instructor_code: instructorCode,
        class_date: classDate,
        content: formData.get('content'),
        homework: formData.get('homework'),
        notes: formData.get('notes'),
        photo_urls: photoUrls
    };
    
    try {
        await axios.post(`${API_BASE_URL}/api/training-logs`, data);
        if (!autoSave) {
            window.showAlert('훈련일지가 저장되었습니다.');
            window.hideTrainingLogForm();
            window.filterTrainingLogs();
        }
    } catch (error) {
        console.error('훈련일지 저장 실패:', error);
        window.showAlert('저장 실패: ' + (error.response?.data?.detail || error.message));
    }
}

window.updateTrainingLog = async function(logId, autoSave = false) {
    const form = document.getElementById('training-log-save-form');
    const formData = new FormData(form);
    const photoUrls = document.getElementById('training-photo-urls').value || '[]';
    
    const data = {
        content: formData.get('content'),
        homework: formData.get('homework'),
        notes: formData.get('notes'),
        photo_urls: photoUrls
    };
    
    try {
        await axios.put(`${API_BASE_URL}/api/training-logs/${logId}`, data);
        if (!autoSave) {
            window.showAlert('훈련일지가 수정되었습니다.');
            window.hideTrainingLogForm();
            window.filterTrainingLogs();
        }
    } catch (error) {
        console.error('훈련일지 수정 실패:', error);
        window.showAlert('수정 실패: ' + (error.response?.data?.detail || error.message));
    }
}

window.deleteTrainingLog = async function(logId) {
    const confirmed = await window.showConfirm('이 훈련일지를 삭제하시겠습니까?');
    if (!confirmed) return;
    
    try {
        await axios.delete(`${API_BASE_URL}/api/training-logs/${logId}`);
        window.showAlert('훈련일지가 삭제되었습니다.');
        window.hideTrainingLogForm();
        window.filterTrainingLogs();
    } catch (error) {
        console.error('훈련일지 삭제 실패:', error);
        window.showAlert('삭제 실패: ' + (error.response?.data?.detail || error.message));
    }
}

window.hideTrainingLogForm = function() {
    const formDiv = document.getElementById('training-log-form');
    if (formDiv) {
        formDiv.classList.add('hidden');
    }
}

// ==================== AI 훈련일지 ====================
let aiTrainingTimetables = []; // AI 훈련일지용 시간표 목록
let selectedAITimetables = []; // 선택된 시간표들

async function loadAITrainingLog() {
    try {
        window.showLoading('데이터를 불러오는 중...');
        const [coursesRes, subjectsRes, instructorsRes, instructorTypesRes] = await Promise.all([
            axios.get(`${API_BASE_URL}/api/courses`),
            axios.get(`${API_BASE_URL}/api/subjects`),
            axios.get(`${API_BASE_URL}/api/instructors`),
            axios.get(`${API_BASE_URL}/api/instructor-codes`)
        ]);
        courses = coursesRes.data;
        subjects = subjectsRes.data;
        instructors = instructorsRes.data;
        instructorTypes = instructorTypesRes.data;
        renderAITrainingLog();
        window.hideLoading();
    } catch (error) {
        window.hideLoading();
        console.error('AI 훈련일지 로드 실패:', error);
        document.getElementById('app').innerHTML = '<div class="text-red-600 p-4">데이터를 불러오는데 실패했습니다.</div>';
    }
}

function renderAITrainingLog() {
    const today = new Date().toISOString().split('T')[0];
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="bg-white rounded-lg shadow-md p-6">
            <div class="mb-6">
                <h2 class="text-2xl font-bold text-gray-800 mb-2">
                    <i class="fas fa-brain mr-2 text-purple-600"></i>AI 훈련일지 자동 작성
                </h2>
                <p class="text-gray-600">미작성된 훈련일지를 AI가 자동으로 작성해드립니다.</p>
            </div>
            
            <!-- 필터 영역 -->
            <div class="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
                <p class="text-blue-700 mb-4">
                    <i class="fas fa-info-circle mr-2"></i>
                    필터 조건을 선택하고 기간을 지정하여 미작성된 훈련일지를 조회하세요
                </p>
                
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                        <label class="block text-gray-700 mb-2">과정 선택</label>
                        <select id="ai-course" class="w-full border rounded px-3 py-2">
                            <option value="">-- 전체 과정 --</option>
                            ${courses.map(c => `<option value="${c.code}">${c.name} (${c.code})</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="block text-gray-700 mb-2">과목 선택</label>
                        <select id="ai-subject" class="w-full border rounded px-3 py-2">
                            <option value="">-- 전체 과목 --</option>
                            ${subjects.map(s => `<option value="${s.code}">${s.name} (${s.code})</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="block text-gray-700 mb-2">강사 선택</label>
                        <select id="ai-instructor" class="w-full border rounded px-3 py-2">
                            <option value="">-- 전체 강사 --</option>
                            ${instructors.map(i => {
                                const typeInfo = instructorTypes.find(t => t.code === i.instructor_type);
                                const typeName = typeInfo ? typeInfo.name : '';
                                const typeType = typeInfo ? typeInfo.type : '';
                                return `<option value="${i.code}">${i.name} - ${i.code} - ${typeName} - ${typeType}</option>`;
                            }).join('')}
                        </select>
                    </div>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-gray-700 mb-2">시작날짜 *</label>
                        <input type="date" id="ai-start-date" max="${today}" class="w-full border rounded px-3 py-2" required>
                    </div>
                    <div>
                        <label class="block text-gray-700 mb-2">종료날짜 *</label>
                        <input type="date" id="ai-end-date" max="${today}" class="w-full border rounded px-3 py-2" required>
                    </div>
                </div>
                
                <div class="mt-4">
                    <button onclick="window.searchAITimetables()" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg">
                        <i class="fas fa-search mr-2"></i>미작성 훈련일지 조회
                    </button>
                </div>
            </div>
            
            <!-- 미작성 훈련일지 목록 -->
            <div id="ai-timetable-list" class="mb-6"></div>
            
            <!-- AI 프롬프트 가이드 -->
            <div id="ai-prompt-section" class="hidden mb-6">
                <h3 class="text-lg font-semibold text-gray-800 mb-3">
                    <i class="fas fa-magic mr-2 text-purple-600"></i>AI 작성 가이드
                </h3>
                <div class="bg-gray-50 p-4 rounded-lg">
                    <label class="block text-gray-700 mb-2">프롬프트 (선택사항)</label>
                    <textarea id="ai-prompt" rows="4" class="w-full border rounded px-3 py-2" placeholder="예시:
- 학생들의 적극적인 참여도를 강조해주세요
- 실습 중심의 내용으로 작성해주세요
- 학생들의 이해도가 높았다는 점을 포함해주세요
- 프로젝트 진행 상황을 중점적으로 작성해주세요"></textarea>
                    <p class="text-sm text-gray-500 mt-2">
                        <i class="fas fa-lightbulb mr-1"></i>
                        AI가 훈련일지를 작성할 때 참고할 가이드를 입력하세요 (비워두면 기본 형식으로 작성됩니다)
                    </p>
                </div>
                
                <div class="mt-4 flex space-x-2">
                    <button onclick="window.generateAITrainingLogs()" class="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg">
                        <i class="fas fa-robot mr-2"></i>선택된 훈련일지 AI 작성 (<span id="selected-count">0</span>건)
                    </button>
                    <button onclick="window.selectAllAITimetables()" class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-3 rounded-lg">
                        <i class="fas fa-check-square mr-2"></i>전체 선택
                    </button>
                    <button onclick="window.deselectAllAITimetables()" class="bg-gray-400 hover:bg-gray-500 text-white px-4 py-3 rounded-lg">
                        <i class="fas fa-square mr-2"></i>전체 해제
                    </button>
                </div>
            </div>
            
            <!-- AI 작성 결과 -->
            <div id="ai-result-section" class="hidden">
                <h3 class="text-lg font-semibold text-gray-800 mb-3">
                    <i class="fas fa-check-circle mr-2 text-green-600"></i>작성 완료
                </h3>
                <div id="ai-result-content" class="bg-green-50 border-l-4 border-green-400 p-4 rounded"></div>
            </div>
        </div>
    `;
}

window.searchAITimetables = async function() {
    const courseCode = document.getElementById('ai-course').value;
    const subjectCode = document.getElementById('ai-subject').value;
    const instructorCode = document.getElementById('ai-instructor').value;
    const startDate = document.getElementById('ai-start-date').value;
    const endDate = document.getElementById('ai-end-date').value;
    
    if (!startDate || !endDate) {
        window.showAlert('시작날짜와 종료날짜는 필수 항목입니다.');
        return;
    }
    
    if (startDate > endDate) {
        window.showAlert('시작날짜는 종료날짜보다 이전이어야 합니다.');
        return;
    }
    
    try {
        window.showLoading('미작성 훈련일지를 조회하는 중...');
        
        let url = `${API_BASE_URL}/api/timetables?start_date=${startDate}&end_date=${endDate}`;
        if (courseCode) url += `&course_code=${courseCode}`;
        
        const response = await axios.get(url);
        let timetables = response.data;
        
        // 과목 필터
        if (subjectCode) {
            timetables = timetables.filter(tt => tt.subject_code === subjectCode);
        }
        
        // 강사 필터
        if (instructorCode) {
            timetables = timetables.filter(tt => tt.instructor_code === instructorCode);
        }
        
        // 훈련일지가 없는 항목만 필터링
        aiTrainingTimetables = timetables.filter(tt => !tt.training_log_id);
        selectedAITimetables = [];
        
        window.hideLoading();
        renderAITimetableList();
        
    } catch (error) {
        window.hideLoading();
        console.error('조회 실패:', error);
        window.showAlert('조회 실패: ' + (error.response?.data?.detail || error.message));
    }
}

function renderAITimetableList() {
    const listDiv = document.getElementById('ai-timetable-list');
    const promptSection = document.getElementById('ai-prompt-section');
    
    if (aiTrainingTimetables.length === 0) {
        listDiv.innerHTML = `
            <div class="bg-green-50 border-l-4 border-green-400 p-4 rounded">
                <p class="text-green-700">
                    <i class="fas fa-check-circle mr-2"></i>
                    해당 기간에 미작성된 훈련일지가 없습니다. 모든 훈련일지가 작성되었습니다!
                </p>
            </div>
        `;
        promptSection.classList.remove('hidden');
        return;
    }
    
    // 과목별로 그룹화하고 총 시수 계산
    const subjectGroups = {};
    aiTrainingTimetables.forEach(tt => {
        const subjectKey = tt.subject_code || 'unknown';
        if (!subjectGroups[subjectKey]) {
            subjectGroups[subjectKey] = {
                subject_name: tt.subject_name || tt.subject_code || '미정',
                subject_code: tt.subject_code,
                total_hours: 0,
                timetables: []
            };
        }
        
        // 해당 시간표의 시수 계산 (시간 차이)
        const duration = calculateDuration(tt.start_time, tt.end_time);
        subjectGroups[subjectKey].timetables.push({
            ...tt,
            duration: duration
        });
        subjectGroups[subjectKey].total_hours += duration;
    });
    
    // 총 시수를 위한 과목 정보 가져오기
    const subjectTotalHours = {};
    subjects.forEach(s => {
        subjectTotalHours[s.code] = s.hours || 0;
    });
    
    listDiv.innerHTML = `
        <h3 class="text-lg font-semibold text-gray-800 mb-3">
            <i class="fas fa-list mr-2"></i>미작성 훈련일지 목록 (총 ${aiTrainingTimetables.length}건)
        </h3>
        <div class="overflow-x-auto">
            <table class="min-w-full bg-white border">
                <thead class="bg-gray-100">
                    <tr>
                        <th class="px-4 py-2 text-left">
                            <input type="checkbox" id="select-all-checkbox" onchange="window.toggleAllAITimetables(this.checked)">
                        </th>
                        <th class="px-4 py-2 text-left">날짜</th>
                        <th class="px-4 py-2 text-left">과정</th>
                        <th class="px-4 py-2 text-left">과목</th>
                        <th class="px-4 py-2 text-left">강사</th>
                        <th class="px-4 py-2 text-left">시간</th>
                        <th class="px-4 py-2 text-left">해당일 시수</th>
                        <th class="px-4 py-2 text-left">총 시수</th>
                    </tr>
                </thead>
                <tbody>
                    ${Object.keys(subjectGroups).map(subjectKey => {
                        const group = subjectGroups[subjectKey];
                        const totalHours = subjectTotalHours[subjectKey] || 0;
                        
                        return group.timetables.map((tt, idx) => {
                            const isFirstRow = idx === 0;
                            const rowspan = group.timetables.length;
                            
                            return `
                                <tr class="border-t hover:bg-gray-50">
                                    <td class="px-4 py-2">
                                        <input type="checkbox" class="ai-timetable-checkbox" data-id="${tt.id}" onchange="window.updateSelectedCount()">
                                    </td>
                                    <td class="px-4 py-2 text-sm">${tt.class_date}</td>
                                    <td class="px-4 py-2 text-sm">${tt.course_name || tt.course_code || '-'}</td>
                                    ${isFirstRow ? `
                                        <td class="px-4 py-2 text-sm font-semibold" rowspan="${rowspan}">
                                            ${group.subject_name}
                                        </td>
                                    ` : ''}
                                    <td class="px-4 py-2 text-sm">${tt.instructor_name || tt.instructor_code || '-'}</td>
                                    <td class="px-4 py-2 text-xs">${formatTime(tt.start_time)} - ${formatTime(tt.end_time)}</td>
                                    <td class="px-4 py-2 text-sm font-semibold text-blue-600">${tt.duration}h</td>
                                    ${isFirstRow ? `
                                        <td class="px-4 py-2 text-sm font-bold text-purple-600" rowspan="${rowspan}">
                                            ${totalHours}h
                                        </td>
                                    ` : ''}
                                </tr>
                            `;
                        }).join('');
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
    
    promptSection.classList.remove('hidden');
    updateSelectedCount();
}

// 교과목 주제 가져오기
function getSubSubjects(subjectCode) {
    const subject = subjects.find(s => s.code === subjectCode);
    if (!subject) return '-';
    
    const subs = [1, 2, 3, 4, 5]
        .filter(i => subject[`sub_subject_${i}`] && subject[`sub_subject_${i}`].trim())
        .map(i => subject[`sub_subject_${i}`]);
    
    return subs.length > 0 ? subs.join(', ') : '-';
}

window.toggleAllAITimetables = function(checked) {
    const checkboxes = document.querySelectorAll('.ai-timetable-checkbox');
    checkboxes.forEach(cb => cb.checked = checked);
    updateSelectedCount();
}

window.selectAllAITimetables = function() {
    document.getElementById('select-all-checkbox').checked = true;
    window.toggleAllAITimetables(true);
}

window.deselectAllAITimetables = function() {
    document.getElementById('select-all-checkbox').checked = false;
    window.toggleAllAITimetables(false);
}

window.updateSelectedCount = function() {
    const checkboxes = document.querySelectorAll('.ai-timetable-checkbox:checked');
    selectedAITimetables = Array.from(checkboxes).map(cb => parseInt(cb.dataset.id));
    document.getElementById('selected-count').textContent = selectedAITimetables.length;
}

window.generateAITrainingLogs = async function() {
    if (selectedAITimetables.length === 0) {
        window.showAlert('작성할 훈련일지를 선택해주세요.');
        return;
    }
    
    const prompt = document.getElementById('ai-prompt').value.trim();
    
    const confirmed = await window.showConfirm(
        `선택된 ${selectedAITimetables.length}건의 훈련일지를 AI로 작성하시겠습니까?\n\n` +
        `이 작업은 몇 분이 소요될 수 있습니다.`
    );
    
    if (!confirmed) return;
    
    try {
        window.showLoading(`AI가 훈련일지를 작성하는 중... (${selectedAITimetables.length}건)`);
        
        const response = await axios.post(`${API_BASE_URL}/api/ai/generate-training-logs`, {
            timetable_ids: selectedAITimetables,
            prompt: prompt || null
        });
        
        window.hideLoading();
        
        const resultSection = document.getElementById('ai-result-section');
        const resultContent = document.getElementById('ai-result-content');
        
        resultContent.innerHTML = `
            <p class="text-green-700 mb-2">
                <i class="fas fa-check-circle mr-2"></i>
                <strong>${response.data.success_count}건</strong>의 훈련일지가 성공적으로 작성되었습니다.
            </p>
            ${response.data.failed_count > 0 ? `
                <p class="text-red-700">
                    <i class="fas fa-exclamation-triangle mr-2"></i>
                    ${response.data.failed_count}건의 훈련일지 작성에 실패했습니다.
                </p>
            ` : ''}
            <div class="mt-4">
                <button onclick="showTab('training-logs')" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
                    훈련일지 목록으로 이동
                </button>
            </div>
        `;
        
        resultSection.classList.remove('hidden');
        
        // 다시 조회
        window.searchAITimetables();
        
    } catch (error) {
        window.hideLoading();
        console.error('AI 훈련일지 작성 실패:', error);
        window.showAlert('AI 훈련일지 작성 실패: ' + (error.response?.data?.detail || error.message));
    }
}

// ==================== AI 상담일지 자동 작성 ====================
async function loadAICounseling() {
    try {
        window.showLoading('데이터를 불러오는 중...');
        const [coursesRes, studentsRes] = await Promise.all([
            axios.get(`${API_BASE_URL}/api/courses`),
            axios.get(`${API_BASE_URL}/api/students`)
        ]);
        courses = coursesRes.data;
        students = studentsRes.data;
        renderAICounseling();
        window.hideLoading();
    } catch (error) {
        window.hideLoading();
        console.error('AI 상담일지 로드 실패:', error);
        document.getElementById('app').innerHTML = '<div class="text-red-600 p-4">데이터를 불러오는데 실패했습니다.</div>';
    }
}

function renderAICounseling() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="bg-white rounded-lg shadow-md p-6">
            <div class="mb-6">
                <h2 class="text-2xl font-bold text-gray-800 mb-2">
                    <i class="fas fa-comments mr-2 text-purple-600"></i>AI 상담일지 자동 작성
                </h2>
                <p class="text-gray-600">미상담 학생을 조회하고 AI가 상담일지를 자동으로 작성해드립니다.</p>
            </div>
            
            <!-- 필터 영역 -->
            <div class="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
                <p class="text-blue-700 mb-4">
                    <i class="fas fa-info-circle mr-2"></i>
                    과정을 선택하고 회차 조건을 지정하여 미상담 학생을 조회하세요
                </p>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label class="block text-gray-700 mb-2">과정 선택 *</label>
                        <select id="ai-counseling-course" class="w-full border rounded px-3 py-2">
                            <option value="">-- 과정 선택 --</option>
                            ${courses.map(c => `<option value="${c.code}">${c.name} (${c.code})</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="block text-gray-700 mb-2">상담 회차 필터</label>
                        <div class="flex items-center space-x-2">
                            <input type="number" id="ai-counseling-count" min="0" value="3" class="w-24 border rounded px-3 py-2">
                            <span class="text-gray-700">회 이하</span>
                        </div>
                        <p class="text-sm text-gray-500 mt-1">예: 3회 이하 = 0~3회 상담한 학생 조회</p>
                    </div>
                </div>
                
                <div class="mt-4">
                    <button onclick="window.searchUncounseledStudents()" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg">
                        <i class="fas fa-search mr-2"></i>미상담 학생 조회
                    </button>
                </div>
            </div>
            
            <!-- 미상담 학생 목록 -->
            <div id="ai-counseling-list" class="mb-6"></div>
            
            <!-- AI 프롬프트 가이드 -->
            <div id="ai-counseling-prompt-section" class="hidden mb-6">
                <h3 class="text-lg font-semibold text-gray-800 mb-3">
                    <i class="fas fa-magic mr-2 text-purple-600"></i>AI 작성 가이드
                </h3>
                <div class="bg-gray-50 p-4 rounded-lg">
                    <label class="block text-gray-700 mb-2">프롬프트 (선택사항)</label>
                    <textarea id="ai-counseling-prompt" rows="4" class="w-full border rounded px-3 py-2" placeholder="예시:
- 학생의 학습 태도와 참여도를 중점적으로 작성해주세요
- 진로 상담 내용을 포함해주세요
- 학생의 강점을 구체적으로 언급해주세요
- 향후 개선 방향을 제시해주세요"></textarea>
                    <p class="text-sm text-gray-500 mt-2">
                        <i class="fas fa-lightbulb mr-1"></i>
                        AI가 상담일지를 작성할 때 참고할 가이드를 입력하세요 (비워두면 기본 형식으로 작성됩니다)
                    </p>
                </div>
                
                <div class="mt-4 flex space-x-2">
                    <button onclick="window.generateAICounselingLogs()" class="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg">
                        <i class="fas fa-robot mr-2"></i>선택된 학생 상담일지 AI 작성 (<span id="counseling-selected-count">0</span>건)
                    </button>
                    <button onclick="window.selectAllCounselingStudents()" class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-3 rounded-lg">
                        <i class="fas fa-check-square mr-2"></i>전체 선택
                    </button>
                    <button onclick="window.deselectAllCounselingStudents()" class="bg-gray-400 hover:bg-gray-500 text-white px-4 py-3 rounded-lg">
                        <i class="fas fa-square mr-2"></i>전체 해제
                    </button>
                </div>
            </div>
            
            <!-- AI 작성 결과 -->
            <div id="ai-counseling-result-section" class="hidden">
                <h3 class="text-lg font-semibold text-gray-800 mb-3">
                    <i class="fas fa-check-circle mr-2 text-green-600"></i>작성 완료
                </h3>
                <div id="ai-counseling-result-content" class="bg-green-50 border-l-4 border-green-400 p-4 rounded"></div>
            </div>
        </div>
    `;
}

let selectedCounselingStudents = [];

window.searchUncounseledStudents = async function() {
    const courseCode = document.getElementById('ai-counseling-course').value;
    const maxCount = parseInt(document.getElementById('ai-counseling-count').value);
    
    if (!courseCode) {
        window.showAlert('과정을 선택해주세요.');
        return;
    }
    
    if (isNaN(maxCount) || maxCount < 0) {
        window.showAlert('올바른 회차를 입력해주세요.');
        return;
    }
    
    try {
        window.showLoading('미상담 학생을 조회하는 중...');
        
        // 선택된 과정의 모든 학생 조회
        const studentsRes = await axios.get(`${API_BASE_URL}/api/students`);
        const allStudents = studentsRes.data.filter(s => s.course_code === courseCode);
        
        // 각 학생의 상담 기록 조회
        const counselingsRes = await axios.get(`${API_BASE_URL}/api/counselings`);
        const allCounselings = counselingsRes.data;
        
        // 학생별 상담 횟수 계산 (student_id 기준)
        const studentCounselingCount = {};
        allStudents.forEach(student => {
            const count = allCounselings.filter(c => c.student_id === student.id).length;
            studentCounselingCount[student.code] = count;
        });
        
        // 필터링: maxCount 이하인 학생들
        const uncounseledStudents = allStudents.filter(student => 
            studentCounselingCount[student.code] <= maxCount
        );
        
        window.hideLoading();
        
        if (uncounseledStudents.length === 0) {
            document.getElementById('ai-counseling-list').innerHTML = `
                <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                    <p class="text-yellow-700">
                        <i class="fas fa-info-circle mr-2"></i>
                        상담 ${maxCount}회 이하인 학생이 없습니다.
                    </p>
                </div>
            `;
            document.getElementById('ai-counseling-prompt-section').classList.add('hidden');
            return;
        }
        
        // 미상담 학생 목록 표시
        document.getElementById('ai-counseling-list').innerHTML = `
            <div class="bg-white border rounded-lg">
                <div class="bg-gray-50 px-4 py-3 border-b flex justify-between items-center">
                    <h3 class="font-semibold text-gray-800">
                        <i class="fas fa-users mr-2"></i>미상담 학생 목록 (총 ${uncounseledStudents.length}명)
                    </h3>
                    <label class="flex items-center space-x-2 cursor-pointer">
                        <input type="checkbox" id="select-all-counseling-checkbox" 
                               onchange="window.toggleAllCounselingStudents(this.checked)" 
                               class="w-4 h-4">
                        <span class="text-sm text-gray-600">전체 선택</span>
                    </label>
                </div>
                <div class="divide-y max-h-96 overflow-y-auto">
                    ${uncounseledStudents.map(student => `
                        <div class="px-4 py-3 hover:bg-gray-50 flex items-center justify-between">
                            <label class="flex items-center space-x-3 cursor-pointer flex-1">
                                <input type="checkbox" class="ai-counseling-checkbox w-4 h-4" 
                                       data-code="${student.code}"
                                       onchange="window.updateCounselingSelectedCount()">
                                <div>
                                    <p class="font-medium">${student.name} (${student.code})</p>
                                    <p class="text-sm text-gray-600">
                                        연락처: ${student.phone || '-'} | 
                                        상담 횟수: ${studentCounselingCount[student.code]}회
                                    </p>
                                </div>
                            </label>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        document.getElementById('ai-counseling-prompt-section').classList.remove('hidden');
        selectedCounselingStudents = [];
        updateCounselingSelectedCount();
        
    } catch (error) {
        window.hideLoading();
        console.error('미상담 학생 조회 실패:', error);
        window.showAlert('미상담 학생 조회 실패: ' + (error.response?.data?.detail || error.message));
    }
}

window.toggleAllCounselingStudents = function(checked) {
    const checkboxes = document.querySelectorAll('.ai-counseling-checkbox');
    checkboxes.forEach(cb => cb.checked = checked);
    updateCounselingSelectedCount();
}

window.selectAllCounselingStudents = function() {
    document.getElementById('select-all-counseling-checkbox').checked = true;
    window.toggleAllCounselingStudents(true);
}

window.deselectAllCounselingStudents = function() {
    document.getElementById('select-all-counseling-checkbox').checked = false;
    window.toggleAllCounselingStudents(false);
}

window.updateCounselingSelectedCount = function() {
    const checkboxes = document.querySelectorAll('.ai-counseling-checkbox:checked');
    selectedCounselingStudents = Array.from(checkboxes).map(cb => cb.dataset.code);
    document.getElementById('counseling-selected-count').textContent = selectedCounselingStudents.length;
}

window.generateAICounselingLogs = async function() {
    if (selectedCounselingStudents.length === 0) {
        window.showAlert('상담일지를 작성할 학생을 선택해주세요.');
        return;
    }
    
    const prompt = document.getElementById('ai-counseling-prompt').value.trim();
    const courseCode = document.getElementById('ai-counseling-course').value;
    
    const confirmed = await window.showConfirm(
        `선택된 ${selectedCounselingStudents.length}명의 학생에 대한 상담일지를 AI로 작성하시겠습니까?\n\n` +
        `이 작업은 몇 분이 소요될 수 있습니다.`
    );
    
    if (!confirmed) return;
    
    try {
        window.showLoading(`AI 상담일지 작성 중... (0/${selectedCounselingStudents.length})`);
        
        let successCount = 0;
        let failCount = 0;
        const errors = [];
        
        for (let i = 0; i < selectedCounselingStudents.length; i++) {
            const studentCode = selectedCounselingStudents[i];
            const student = students.find(s => s.code === studentCode);
            
            window.showLoading(`AI 상담일지 작성 중... (${i + 1}/${selectedCounselingStudents.length}) - ${student.name}`);
            
            try {
                await axios.post(`${API_BASE_URL}/api/counselings/ai-generate`, {
                    student_code: studentCode,
                    course_code: courseCode,
                    custom_prompt: prompt
                });
                successCount++;
            } catch (error) {
                console.error(`${student.name} 상담일지 작성 실패:`, error);
                failCount++;
                errors.push(`${student.name}: ${error.response?.data?.detail || error.message}`);
            }
        }
        
        window.hideLoading();
        
        // 최근 생성된 상담일지 조회
        let generatedCounselingsHTML = '';
        if (successCount > 0) {
            try {
                const counselingsRes = await axios.get(`${API_BASE_URL}/api/counselings`);
                const recentCounselings = counselingsRes.data
                    .filter(c => selectedCounselingStudents.includes(c.student_code))
                    .slice(0, successCount);
                
                generatedCounselingsHTML = `
                    <div class="mt-4 space-y-4">
                        <h4 class="font-semibold text-gray-800">생성된 상담일지:</h4>
                        ${recentCounselings.map(c => `
                            <details class="bg-white border rounded-lg p-4">
                                <summary class="cursor-pointer font-medium text-blue-600 hover:text-blue-800">
                                    ${c.student_name} (${c.student_code}) - ${c.consultation_date?.split('T')[0]}
                                    <i class="fas fa-chevron-down ml-2 text-sm"></i>
                                </summary>
                                <div class="mt-3 p-3 bg-gray-50 rounded border-l-4 border-blue-400">
                                    <pre class="whitespace-pre-wrap text-sm text-gray-700">${c.content}</pre>
                                </div>
                            </details>
                        `).join('')}
                    </div>
                `;
            } catch (error) {
                console.error('상담일지 조회 실패:', error);
            }
        }
        
        const resultSection = document.getElementById('ai-counseling-result-section');
        const resultContent = document.getElementById('ai-counseling-result-content');
        
        resultContent.innerHTML = `
            <p class="font-semibold mb-2">작성 완료!</p>
            <p class="mb-2">✅ 성공: ${successCount}건</p>
            ${failCount > 0 ? `
                <p class="mb-2">❌ 실패: ${failCount}건</p>
                <details class="mt-2">
                    <summary class="cursor-pointer text-red-600">실패 상세 보기</summary>
                    <ul class="mt-2 text-sm text-red-600">
                        ${errors.map(err => `<li>• ${err}</li>`).join('')}
                    </ul>
                </details>
            ` : ''}
            ${generatedCounselingsHTML}
        `;
        
        resultSection.classList.remove('hidden');
        
        // 결과 섹션으로 스크롤
        resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        // 다시 조회
        window.searchUncounseledStudents();
        
    } catch (error) {
        window.hideLoading();
        console.error('AI 상담일지 작성 실패:', error);
        window.showAlert('AI 상담일지 작성 실패: ' + (error.response?.data?.detail || error.message));
    }
}

console.log('App script loaded successfully');

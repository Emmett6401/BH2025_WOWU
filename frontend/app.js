// API 베이스 URL - 프록시 사용으로 상대 경로
const API_BASE_URL = '';

// ==================== 로컬 캐싱 유틸리티 ====================
const CACHE_VERSION = '2.0.0'; // 캐시 버전 (업데이트 시 증가)
const CACHE_DURATION = 5 * 60 * 1000; // 5분 캐시

// 캐시 버전 체크 및 초기화
(function checkCacheVersion() {
    const currentVersion = localStorage.getItem('cache_version');
    if (currentVersion !== CACHE_VERSION) {
        console.log(`🔄 캐시 버전 업데이트: ${currentVersion} → ${CACHE_VERSION}`);
        // 전체 캐시 삭제
        Object.keys(localStorage).forEach(k => {
            if (k.startsWith('cache_')) {
                localStorage.removeItem(k);
            }
        });
        localStorage.setItem('cache_version', CACHE_VERSION);
        console.log('✅ 캐시 초기화 완료');
    }
})();

window.getCachedData = async function(key, fetchFunction) {
    const cacheKey = `cache_${key}`;
    const timestampKey = `cache_${key}_timestamp`;
    
    const cached = localStorage.getItem(cacheKey);
    const timestamp = localStorage.getItem(timestampKey);
    
    // 캐시가 유효한 경우
    if (cached && timestamp && (Date.now() - parseInt(timestamp)) < CACHE_DURATION) {
        console.log(`✅ 캐시 사용: ${key} (${((Date.now() - parseInt(timestamp)) / 1000).toFixed(1)}초 전)`);
        
        // 백그라운드에서 최신 데이터 업데이트
        fetchFunction().then(data => {
            localStorage.setItem(cacheKey, JSON.stringify(data));
            localStorage.setItem(timestampKey, Date.now().toString());
            console.log(`🔄 백그라운드 업데이트 완료: ${key}`);
        }).catch(err => {
            console.error(`❌ 백그라운드 업데이트 실패: ${key}`, err);
        });
        
        return JSON.parse(cached);
    }
    
    // 캐시 없음 또는 만료됨
    console.log(`📡 새로 로드: ${key}`);
    const data = await fetchFunction();
    localStorage.setItem(cacheKey, JSON.stringify(data));
    localStorage.setItem(timestampKey, Date.now().toString());
    return data;
}

// 캐시 초기화 함수
window.clearCache = function(key) {
    if (key) {
        localStorage.removeItem(`cache_${key}`);
        localStorage.removeItem(`cache_${key}_timestamp`);
        console.log(`🗑️ 캐시 삭제: ${key}`);
    } else {
        // 전체 캐시 삭제
        Object.keys(localStorage).forEach(k => {
            if (k.startsWith('cache_')) {
                localStorage.removeItem(k);
            }
        });
        console.log('🗑️ 전체 캐시 삭제');
    }
}

// ==================== 로그인 체크 ====================
function checkLogin() {
    const loggedIn = localStorage.getItem('logged_in');
    const instructor = localStorage.getItem('instructor');
    
    if (!loggedIn || !instructor) {
        // 로그인되지 않았으면 로그인 페이지로 리다이렉트
        window.location.href = '/login.html';
        return false;
    }
    
    // 강사 정보 표시
    try {
        const instructorData = JSON.parse(instructor);
        document.getElementById('instructorName').textContent = instructorData.name || '강사';
        document.getElementById('instructorType').textContent = instructorData.instructor_type_name || '';
    } catch (e) {
        console.error('강사 정보 파싱 오류:', e);
    }
    
    return true;
}

// 주강사 권한 체크 함수
function isMainInstructor() {
    try {
        const instructor = localStorage.getItem('instructor');
        if (!instructor) return false;
        const instructorData = JSON.parse(instructor);
        return instructorData.instructor_type_type === '1. 주강사';
    } catch (e) {
        return false;
    }
}

// 공통 스크롤 함수
window.scrollToForm = function(formId) {
    const formDiv = document.getElementById(formId);
    if (formDiv) {
        formDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// 파일 검증 함수
window.validateFile = function(file) {
    const maxSize = 20 * 1024 * 1024; // 20MB
    const allowedExtensions = [
        'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp',  // 이미지
        'pdf',  // PDF
        'ppt', 'pptx',  // PowerPoint
        'xls', 'xlsx',  // Excel
        'doc', 'docx',  // Word
        'txt',  // 텍스트
        'hwp'  // 한글
    ];
    
    // 파일 크기 검증
    if (file.size > maxSize) {
        const sizeMB = (file.size / 1024 / 1024).toFixed(1);
        return {
            valid: false,
            message: `"${file.name}"의 크기가 20MB를 초과합니다. (현재: ${sizeMB}MB)\n\n최대 업로드 가능 크기: 20MB`
        };
    }
    
    // 파일 확장자 검증
    const ext = file.name.split('.').pop().toLowerCase();
    if (!allowedExtensions.includes(ext)) {
        return {
            valid: false,
            message: `"${file.name}"은(는) 지원하지 않는 파일 형식입니다.\n\n지원 형식:\n• 이미지: JPG, PNG, GIF, BMP, WebP\n• 문서: PDF, TXT\n• Office: PPT, PPTX, XLS, XLSX, DOC, DOCX\n• 한글: HWP`
        };
    }
    
    return { valid: true };
}

// 이미지 자동 압축 함수
window.compressImage = function(file, maxWidth = 1920, quality = 0.85) {
    return new Promise((resolve, reject) => {
        // PDF나 이미지가 아닌 파일은 그대로 반환
        if (file.type === 'application/pdf' || !file.type.startsWith('image/')) {
            resolve(file);
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                // 최대 너비 제한
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }
                
                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                // Canvas를 Blob으로 변환
                canvas.toBlob(function(blob) {
                    if (blob) {
                        // 압축된 파일이 원본보다 크면 원본 사용
                        if (blob.size > file.size) {
                            resolve(file);
                        } else {
                            // Blob을 File 객체로 변환
                            const compressedFile = new File([blob], file.name, {
                                type: 'image/jpeg',
                                lastModified: Date.now()
                            });
                            resolve(compressedFile);
                        }
                    } else {
                        resolve(file);
                    }
                }, 'image/jpeg', quality);
            };
            img.onerror = function() {
                reject(new Error('이미지 로드 실패'));
            };
            img.src = e.target.result;
        };
        reader.onerror = function() {
            reject(new Error('파일 읽기 실패'));
        };
        reader.readAsDataURL(file);
    });
}

// 파일 타입 확인 함수
window.getFileExtension = function(url) {
    if (!url) return '';
    const cleanUrl = url.split('#')[0].split('?')[0];
    const match = cleanUrl.match(/\.([^.]+)$/);
    return match ? match[1].toLowerCase() : '';
}

window.isPDF = function(url) {
    const ext = window.getFileExtension(url);
    return ext === 'pdf';
}

window.isPowerPoint = function(url) {
    const ext = window.getFileExtension(url);
    return ['ppt', 'pptx'].includes(ext);
}

window.isExcel = function(url) {
    const ext = window.getFileExtension(url);
    return ['xls', 'xlsx'].includes(ext);
}

window.isWord = function(url) {
    const ext = window.getFileExtension(url);
    return ['doc', 'docx'].includes(ext);
}

window.isText = function(url) {
    const ext = window.getFileExtension(url);
    return ext === 'txt';
}

window.isHWP = function(url) {
    const ext = window.getFileExtension(url);
    return ext === 'hwp';
}

window.isImage = function(url) {
    const ext = window.getFileExtension(url);
    return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext);
}

window.isViewableInBrowser = function(url) {
    // 브라우저에서 직접 볼 수 있는 파일 타입
    return window.isPDF(url) || window.isImage(url) || window.isText(url);
}

// URL에서 원본 파일명 제거 (실제 다운로드용)
window.getCleanUrl = function(url) {
    if (!url) return '';
    // URL#원본파일명 형식에서 # 이후 제거
    return url.split('#')[0];
}

// URL에서 파일명 추출 함수
window.getFilenameFromUrl = function(url) {
    if (!url) return 'unknown';
    try {
        // URL#원본파일명 형식에서 원본 파일명 추출
        if (url.includes('#')) {
            const parts = url.split('#');
            if (parts.length > 1 && parts[1]) {
                return decodeURIComponent(parts[1]);
            }
        }
        
        // FTP URL에서 파일명 추출
        const parts = url.split('/');
        let filename = parts[parts.length - 1];
        
        // 쿼리 파라미터 제거
        if (filename.includes('?')) {
            filename = filename.split('?')[0];
        }
        
        // 디코딩
        filename = decodeURIComponent(filename);
        
        return filename;
    } catch (e) {
        return 'unknown';
    }
}

// 공통 파일 미리보기 아이템 생성 함수
window.createFilePreviewItem = function(url, index, removeCallback) {
    const cleanUrl = window.getCleanUrl(url);  // # 제거한 실제 URL
    const filename = window.getFilenameFromUrl(url);
    
    // 파일 타입에 따른 아이콘 및 색상 결정
    let icon = 'fa-file';
    let bgColor = 'bg-gray-50';
    let borderColor = 'border-gray-200';
    let iconColor = 'text-gray-600';
    let previewAction = null;
    
    if (window.isPDF(url)) {
        icon = 'fa-file-pdf';
        bgColor = 'bg-red-50';
        borderColor = 'border-red-200';
        iconColor = 'text-red-600';
        previewAction = `window.showFilePreview('${cleanUrl}', 'pdf')`;
    } else if (window.isImage(url)) {
        // 이미지는 별도 처리
        return `
            <div class="flex items-center gap-3 bg-white border rounded p-2 hover:bg-gray-50">
                <div class="flex-shrink-0 cursor-pointer" onclick="window.showFilePreview('${cleanUrl}', 'image')">
                    <img src="${API_BASE_URL}/api/thumbnail?url=${encodeURIComponent(cleanUrl)}" 
                         alt="파일 ${index + 1}"
                         class="w-16 h-16 object-cover rounded border hover:opacity-80"
                         onerror="this.onerror=null; this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Crect fill=%22%23e5e7eb%22 width=%22100%22 height=%22100%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%239ca3af%22 font-size=%2240%22%3E📷%3C/text%3E%3C/svg%3E';">
                </div>
                <div class="flex-1 min-w-0">
                    <button onclick="window.showFilePreview('${cleanUrl}', 'image')" 
                            class="text-blue-600 hover:underline text-sm block text-left truncate w-full" title="${filename}">
                        <i class="fas fa-eye mr-1"></i>${filename}
                    </button>
                    <a href="${API_BASE_URL}/api/download-image?url=${encodeURIComponent(cleanUrl)}" download="${filename}"
                       class="text-gray-600 hover:underline text-xs block mt-1">
                        <i class="fas fa-download mr-1"></i>다운로드
                    </a>
                </div>
                <button type="button" onclick="${removeCallback}(${index})" 
                        class="text-red-500 hover:text-red-700 px-2 flex-shrink-0">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
    } else if (window.isPowerPoint(url)) {
        icon = 'fa-file-powerpoint';
        bgColor = 'bg-orange-50';
        borderColor = 'border-orange-200';
        iconColor = 'text-orange-600';
        previewAction = `window.showFilePreview('${cleanUrl}', 'office')`;
    } else if (window.isExcel(url)) {
        icon = 'fa-file-excel';
        bgColor = 'bg-green-50';
        borderColor = 'border-green-200';
        iconColor = 'text-green-600';
        previewAction = `window.showFilePreview('${cleanUrl}', 'office')`;
    } else if (window.isWord(url)) {
        icon = 'fa-file-word';
        bgColor = 'bg-blue-50';
        borderColor = 'border-blue-200';
        iconColor = 'text-blue-600';
        previewAction = `window.showFilePreview('${cleanUrl}', 'office')`;
    } else if (window.isText(url)) {
        icon = 'fa-file-alt';
        bgColor = 'bg-gray-50';
        borderColor = 'border-gray-200';
        iconColor = 'text-gray-600';
        previewAction = `window.showFilePreview('${cleanUrl}', 'text')`;
    } else if (window.isHWP(url)) {
        icon = 'fa-file-alt';
        bgColor = 'bg-indigo-50';
        borderColor = 'border-indigo-200';
        iconColor = 'text-indigo-600';
        previewAction = `window.showFilePreview('${cleanUrl}', 'hwp')`;
    }
    
    // 공통 파일 미리보기 HTML
    return `
        <div class="flex items-center gap-3 bg-white border rounded p-2 hover:bg-gray-50">
            <div class="flex-shrink-0 w-16 h-16 ${bgColor} border ${borderColor} rounded flex items-center justify-center cursor-pointer hover:opacity-80"
                 ${previewAction ? `onclick="${previewAction}"` : ''}>
                <i class="fas ${icon} text-3xl ${iconColor}"></i>
            </div>
            <div class="flex-1 min-w-0">
                ${previewAction ? `
                    <button onclick="${previewAction}" 
                            class="text-blue-600 hover:underline text-sm block text-left truncate w-full" title="${filename}">
                        <i class="fas fa-eye mr-1"></i>${filename}
                    </button>
                ` : `
                    <p class="text-sm truncate w-full" title="${filename}">${filename}</p>
                `}
                <a href="${API_BASE_URL}/api/download-image?url=${encodeURIComponent(cleanUrl)}" download="${filename}"
                   class="text-gray-600 hover:underline text-xs block mt-1">
                    <i class="fas fa-download mr-1"></i>다운로드
                </a>
            </div>
            <button type="button" onclick="${removeCallback}(${index})" 
                    class="text-red-500 hover:text-red-700 px-2 flex-shrink-0">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
}

// PDF 미리보기 모달
// 통합 파일 미리보기 함수
window.showFilePreview = function(url, type) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50';
    
    let title = '파일 미리보기';
    let icon = 'fa-file';
    let iconColor = 'text-gray-600';
    let content = '';
    
    if (type === 'pdf') {
        title = 'PDF 미리보기';
        icon = 'fa-file-pdf';
        iconColor = 'text-red-600';
        content = `
            <div class="bg-white rounded-lg shadow-xl w-11/12 h-5/6 flex flex-col">
                <div class="flex justify-between items-center p-4 border-b">
                    <h3 class="text-lg font-bold">
                        <i class="fas ${icon} mr-2 ${iconColor}"></i>${title}
                    </h3>
                    <button onclick="this.closest('.fixed').remove()" class="text-gray-500 hover:text-gray-700">
                        <i class="fas fa-times text-2xl"></i>
                    </button>
                </div>
                <div class="flex-1 p-4 overflow-hidden">
                    <iframe src="${API_BASE_URL}/api/download-image?url=${encodeURIComponent(url)}" 
                            class="w-full h-full border rounded"
                            frameborder="0">
                    </iframe>
                </div>
                <div class="p-4 border-t flex justify-end space-x-2">
                    <a href="${API_BASE_URL}/api/download-image?url=${encodeURIComponent(url)}" 
                       download 
                       class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
                        <i class="fas fa-download mr-2"></i>다운로드
                    </a>
                    <button onclick="this.closest('.fixed').remove()" 
                            class="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded">
                        닫기
                    </button>
                </div>
            </div>
        `;
    } else if (type === 'image') {
        title = '이미지 미리보기';
        icon = 'fa-image';
        iconColor = 'text-blue-600';
        content = `
            <div class="relative max-w-7xl max-h-screen w-full h-full flex flex-col p-4">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-bold text-white">
                        <i class="fas ${icon} mr-2"></i>${title}
                    </h3>
                    <button onclick="this.closest('.fixed').remove()" class="text-white hover:text-gray-300">
                        <i class="fas fa-times text-3xl"></i>
                    </button>
                </div>
                <div class="flex-1 flex items-center justify-center overflow-auto">
                    <img src="${API_BASE_URL}/api/proxy-image?url=${encodeURIComponent(url)}" 
                         class="max-w-full max-h-full object-contain rounded shadow-2xl"
                         alt="미리보기"
                         onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22%3E%3Crect fill=%22%23e5e7eb%22 width=%22200%22 height=%22200%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%239ca3af%22 font-size=%2240%22%3E이미지 로드 실패%3C/text%3E%3C/svg%3E';">
                </div>
                <div class="mt-4 flex justify-end space-x-2">
                    <a href="${API_BASE_URL}/api/download-image?url=${encodeURIComponent(url)}" 
                       download 
                       class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
                        <i class="fas fa-download mr-2"></i>다운로드
                    </a>
                    <button onclick="this.closest('.fixed').remove()" 
                            class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded">
                        닫기
                    </button>
                </div>
            </div>
        `;
    } else if (type === 'text') {
        title = '텍스트 파일 미리보기';
        icon = 'fa-file-alt';
        iconColor = 'text-gray-600';
        content = `
            <div class="bg-white rounded-lg shadow-xl w-11/12 h-5/6 flex flex-col">
                <div class="flex justify-between items-center p-4 border-b">
                    <h3 class="text-lg font-bold">
                        <i class="fas ${icon} mr-2 ${iconColor}"></i>${title}
                    </h3>
                    <button onclick="this.closest('.fixed').remove()" class="text-gray-500 hover:text-gray-700">
                        <i class="fas fa-times text-2xl"></i>
                    </button>
                </div>
                <div class="flex-1 p-4 overflow-hidden">
                    <iframe src="${API_BASE_URL}/api/download-image?url=${encodeURIComponent(url)}" 
                            class="w-full h-full border rounded bg-white"
                            frameborder="0">
                    </iframe>
                </div>
                <div class="p-4 border-t flex justify-end space-x-2">
                    <a href="${API_BASE_URL}/api/download-image?url=${encodeURIComponent(url)}" 
                       download 
                       class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
                        <i class="fas fa-download mr-2"></i>다운로드
                    </a>
                    <button onclick="this.closest('.fixed').remove()" 
                            class="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded">
                        닫기
                    </button>
                </div>
            </div>
        `;
    } else if (type === 'office') {
        // Office 파일은 Microsoft Office Online 뷰어 사용
        const viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(API_BASE_URL + '/api/download-image?url=' + encodeURIComponent(url))}`;
        title = 'Office 문서 미리보기';
        icon = 'fa-file-alt';
        iconColor = 'text-blue-600';
        content = `
            <div class="bg-white rounded-lg shadow-xl w-11/12 h-5/6 flex flex-col">
                <div class="flex justify-between items-center p-4 border-b">
                    <h3 class="text-lg font-bold">
                        <i class="fas ${icon} mr-2 ${iconColor}"></i>${title}
                    </h3>
                    <button onclick="this.closest('.fixed').remove()" class="text-gray-500 hover:text-gray-700">
                        <i class="fas fa-times text-2xl"></i>
                    </button>
                </div>
                <div class="flex-1 p-4 overflow-hidden">
                    <iframe src="${viewerUrl}" 
                            class="w-full h-full border rounded"
                            frameborder="0">
                    </iframe>
                </div>
                <div class="p-4 border-t flex justify-end space-x-2">
                    <a href="${API_BASE_URL}/api/download-image?url=${encodeURIComponent(url)}" 
                       download 
                       class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
                        <i class="fas fa-download mr-2"></i>다운로드
                    </a>
                    <button onclick="this.closest('.fixed').remove()" 
                            class="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded">
                        닫기
                    </button>
                </div>
            </div>
        `;
    } else if (type === 'hwp') {
        title = '한글 문서';
        icon = 'fa-file-alt';
        iconColor = 'text-indigo-600';
        content = `
            <div class="bg-white rounded-lg shadow-xl w-11/12 max-w-2xl p-6">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-bold">
                        <i class="fas ${icon} mr-2 ${iconColor}"></i>${title}
                    </h3>
                    <button onclick="this.closest('.fixed').remove()" class="text-gray-500 hover:text-gray-700">
                        <i class="fas fa-times text-2xl"></i>
                    </button>
                </div>
                <div class="text-center py-8">
                    <i class="fas fa-file-alt text-6xl text-indigo-600 mb-4"></i>
                    <p class="text-gray-700 mb-4">한글(HWP) 파일은 브라우저에서 직접 미리보기를 지원하지 않습니다.</p>
                    <p class="text-gray-600 mb-6">파일을 다운로드하여 한글 프로그램에서 열어주세요.</p>
                    <a href="${API_BASE_URL}/api/download-image?url=${encodeURIComponent(url)}" 
                       download 
                       class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded inline-block">
                        <i class="fas fa-download mr-2"></i>다운로드
                    </a>
                </div>
            </div>
        `;
    }
    
    modal.innerHTML = content;
    
    // 모달 외부 클릭 시 닫기 (이미지 타입만)
    if (type === 'image') {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
    
    document.body.appendChild(modal);
}

// 하위 호환성을 위한 래퍼 함수들
window.showPDFPreview = function(url) {
    window.showFilePreview(url, 'pdf');
}

window.showImagePreview = function(url) {
    window.showFilePreview(url, 'image');
}

// 공통 파일 업로드 함수 (이미지 자동 압축 + PDF 지원)
window.uploadFilesWithCompression = async function(files, category, progressBar) {
    const maxSize = 20 * 1024 * 1024; // 20MB
    const uploadedUrls = [];
    
    // 파일 크기 체크
    for (let file of files) {
        if (file.size > maxSize) {
            throw new Error(`파일 "${file.name}"의 크기가 20MB를 초과합니다.`);
        }
    }
    
    const totalFiles = files.length;
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // 이미지 자동 압축 (PDF는 그대로)
        let processedFile = file;
        if (file.type.startsWith('image/')) {
            try {
                processedFile = await window.compressImage(file);
                console.log(`이미지 압축: ${(file.size / 1024).toFixed(1)}KB → ${(processedFile.size / 1024).toFixed(1)}KB`);
            } catch (error) {
                console.error('이미지 압축 실패, 원본 사용:', error);
                processedFile = file;
            }
        }
        
        const formData = new FormData();
        formData.append('file', processedFile);
        
        // 프로그레스 업데이트
        if (progressBar) {
            const progress = ((i + 0.5) / totalFiles) * 100;
            progressBar.style.width = `${progress}%`;
        }
        
        const response = await axios.post(
            `${API_BASE_URL}/api/upload-image?category=${category}`,
            formData,
            { headers: { 'Content-Type': 'multipart/form-data' } }
        );
        
        if (response.data.success) {
            uploadedUrls.push(response.data.url);
        }
        
        // 완료 프로그레스
        if (progressBar) {
            const completeProgress = ((i + 1) / totalFiles) * 100;
            progressBar.style.width = `${completeProgress}%`;
        }
    }
    
    return uploadedUrls;
}

// 로그아웃 함수
function logout() {
    if (confirm('로그아웃 하시겠습니까?')) {
        // 로컬 스토리지에서 로그인 정보 삭제
        localStorage.removeItem('logged_in');
        localStorage.removeItem('instructor');
        
        // 캐시도 전체 삭제
        window.clearCache();
        
        // 로그인 페이지로 이동
        window.location.href = '/login.html';
    }
}

// 페이지 로드 시 로그인 체크 (제거 - 아래 994번째 줄과 통합)

// 전역 상태
let currentTab = 'dashboard';
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
// 알림 타이머 저장
let alertTimer = null;

window.showAlert = function(message) {
    const alertModal = document.getElementById('custom-alert');
    const alertMessage = document.getElementById('alert-message');
    alertMessage.textContent = message;
    alertModal.classList.remove('hidden');
    
    // 기존 타이머가 있으면 취소
    if (alertTimer) {
        clearTimeout(alertTimer);
    }
    
    // 3초 후 자동으로 사라지게
    alertTimer = setTimeout(() => {
        window.hideAlert();
    }, 3000);
};

window.hideAlert = function() {
    const alertModal = document.getElementById('custom-alert');
    alertModal.classList.add('hidden');
    
    // 타이머 취소
    if (alertTimer) {
        clearTimeout(alertTimer);
        alertTimer = null;
    }
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

// ==================== 사진 뷰어 ====================
window.showPhotoViewer = function(photos, startIndex = 0) {
    // photos는 URL 배열 또는 문자열 (JSON 배열)
    let photoUrls = [];
    if (typeof photos === 'string') {
        try {
            photoUrls = JSON.parse(photos);
        } catch (e) {
            photoUrls = [photos];
        }
    } else if (Array.isArray(photos)) {
        photoUrls = photos;
    } else {
        photoUrls = [photos];
    }
    
    if (photoUrls.length === 0) return;
    
    // 이미지가 아닌 파일이 포함되어 있는지 확인
    const hasNonImageFiles = photoUrls.some(url => !window.isImage(url));
    if (hasNonImageFiles) {
        window.showAlert('이 항목에는 이미지 외의 파일(PDF, Office 문서 등)이 포함되어 있습니다.\n\n수정 버튼을 눌러서 상세보기에서 조회가 가능합니다.');
        return;
    }
    
    let currentIndex = startIndex;
    
    const viewerHtml = `
        <div id="photo-viewer" class="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-[100]">
            <button onclick="window.closePhotoViewer()" class="absolute top-4 right-4 text-white text-3xl hover:text-gray-300 z-10">
                <i class="fas fa-times"></i>
            </button>
            
            ${photoUrls.length > 1 ? `
                <button onclick="window.prevPhoto()" class="absolute left-4 top-1/2 -translate-y-1/2 text-white text-5xl hover:text-gray-300 z-10">
                    <i class="fas fa-chevron-left"></i>
                </button>
                <button onclick="window.nextPhoto()" class="absolute right-4 top-1/2 -translate-y-1/2 text-white text-5xl hover:text-gray-300 z-10">
                    <i class="fas fa-chevron-right"></i>
                </button>
            ` : ''}
            
            <div class="flex flex-col items-center justify-center w-full h-full px-16 py-8">
                <img id="viewer-image" src="${API_BASE_URL}/api/proxy-image?url=${encodeURIComponent(photoUrls[currentIndex])}" 
                     class="w-auto h-auto max-w-full max-h-full object-contain" 
                     style="max-width: 90vw; max-height: 85vh;"
                     onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22300%22%3E%3Crect fill=%22%23ddd%22 width=%22400%22 height=%22300%22/%3E%3Ctext fill=%22%23666%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 font-size=%2220%22%3E이미지를 불러올 수 없습니다%3C/text%3E%3C/svg%3E'"
                     alt="사진">
                ${photoUrls.length > 1 ? `
                    <div class="text-white mt-4 text-xl font-bold">
                        <span id="photo-counter">${currentIndex + 1}</span> / ${photoUrls.length}
                    </div>
                ` : ''}
                <div class="text-white mt-2 text-sm opacity-75" id="photo-url-info">
                    원본: ${photoUrls[currentIndex]}
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', viewerHtml);
    
    // 전역 변수로 현재 사진 정보 저장
    window.currentPhotoIndex = currentIndex;
    window.photoUrlsList = photoUrls;
    
    // ESC 키로 닫기
    window.photoViewerKeyHandler = function(e) {
        if (e.key === 'Escape') {
            window.closePhotoViewer();
        } else if (e.key === 'ArrowLeft') {
            window.prevPhoto();
        } else if (e.key === 'ArrowRight') {
            window.nextPhoto();
        }
    };
    document.addEventListener('keydown', window.photoViewerKeyHandler);
};

window.closePhotoViewer = function() {
    const viewer = document.getElementById('photo-viewer');
    if (viewer) viewer.remove();
    if (window.photoViewerKeyHandler) {
        document.removeEventListener('keydown', window.photoViewerKeyHandler);
    }
};

window.prevPhoto = function() {
    if (!window.photoUrlsList || window.photoUrlsList.length <= 1) return;
    window.currentPhotoIndex = (window.currentPhotoIndex - 1 + window.photoUrlsList.length) % window.photoUrlsList.length;
    const url = window.photoUrlsList[window.currentPhotoIndex];
    document.getElementById('viewer-image').src = `${API_BASE_URL}/api/proxy-image?url=${encodeURIComponent(url)}`;
    const counter = document.getElementById('photo-counter');
    if (counter) counter.textContent = window.currentPhotoIndex + 1;
    const urlInfo = document.getElementById('photo-url-info');
    if (urlInfo) urlInfo.textContent = '원본: ' + url;
};

window.nextPhoto = function() {
    if (!window.photoUrlsList || window.photoUrlsList.length <= 1) return;
    window.currentPhotoIndex = (window.currentPhotoIndex + 1) % window.photoUrlsList.length;
    const url = window.photoUrlsList[window.currentPhotoIndex];
    document.getElementById('viewer-image').src = `${API_BASE_URL}/api/proxy-image?url=${encodeURIComponent(url)}`;
    const counter = document.getElementById('photo-counter');
    if (counter) counter.textContent = window.currentPhotoIndex + 1;
    const urlInfo = document.getElementById('photo-url-info');
    if (urlInfo) urlInfo.textContent = '원본: ' + url;
};

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

// ==================== 대시보드 ====================
async function loadDashboard() {
    window.showLoading('대시보드 데이터를 불러오는 중...');
    
    try {
        console.log('🚀 대시보드 로딩 시작...');
        
        // 모든 데이터를 캐싱과 함께 병렬로 가져오기
        const [
            studentsData,
            instructorsData,
            coursesData,
            counselingsData,
            timetablesData,
            projectsData,
            trainingLogsData,
            teamActivityLogsData
        ] = await Promise.all([
            window.getCachedData('students', () => axios.get(`${API_BASE_URL}/api/students`).then(r => r.data)),
            window.getCachedData('instructors', () => axios.get(`${API_BASE_URL}/api/instructors`).then(r => r.data)),
            window.getCachedData('courses', () => axios.get(`${API_BASE_URL}/api/courses`).then(r => r.data)),
            window.getCachedData('counselings', () => axios.get(`${API_BASE_URL}/api/counselings`).then(r => r.data)),
            window.getCachedData('timetables', () => axios.get(`${API_BASE_URL}/api/timetables`).then(r => r.data)),
            window.getCachedData('projects', () => axios.get(`${API_BASE_URL}/api/projects`).then(r => r.data)),
            window.getCachedData('training-logs', () => axios.get(`${API_BASE_URL}/api/training-logs`).then(r => r.data)),
            window.getCachedData('team-activity-logs', () => axios.get(`${API_BASE_URL}/api/team-activity-logs`).then(r => r.data))
        ]);
        
        console.log('✅ 데이터 로딩 완료:', {
            students: studentsData.length,
            instructors: instructorsData.length,
            courses: coursesData.length,
            counselings: counselingsData.length
        });
        
        // 최근 상담 (최근 5건)
        const recentCounselings = counselingsData
            .sort((a, b) => new Date(b.consultation_date) - new Date(a.consultation_date))
            .slice(0, 5);
        
        // 오늘 시간표 (추가 정보와 함께) - 한국 시간 기준
        const today = new Date(new Date().getTime() + (9 * 60 * 60 * 1000)).toISOString().split('T')[0];
        const todayTimetables = timetablesData
            .filter(t => t.class_date === today)
            .map(t => {
                // 해당 과정 찾기
                const course = coursesData.find(c => c.code === t.course_code);
                
                // 과정 시작일부터 오늘까지 일수 계산
                let daysFromStart = 0;
                if (course && course.start_date) {
                    const startDate = new Date(course.start_date);
                    const currentDate = new Date(today);
                    const diffTime = currentDate - startDate;
                    daysFromStart = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1은 시작일을 1일로 계산
                }
                
                // 해당 과정의 시간표 중 오늘까지의 총 시수 계산
                const courseTimetables = timetablesData.filter(tt => 
                    tt.course_code === t.course_code && 
                    tt.class_date <= today
                );
                const totalHours = courseTimetables.length;
                
                // 오늘 몇 번째 시간인지 계산 (같은 날짜 내에서)
                const todayCourseTimetables = timetablesData
                    .filter(tt => tt.course_code === t.course_code && tt.class_date === today)
                    .sort((a, b) => a.start_time.localeCompare(b.start_time));
                const todayHourIndex = todayCourseTimetables.findIndex(tt => tt.id === t.id) + 1;
                const todayTotalHours = todayCourseTimetables.length;
                
                return {
                    ...t,
                    daysFromStart,
                    totalHours,
                    todayHourIndex,
                    todayTotalHours
                };
            });
        
        // 최근 훈련일지 (최근 5건)
        const recentTrainingLogs = trainingLogsData
            .sort((a, b) => {
                const dateA = new Date(a['t.class_date'] || a.class_date || 0);
                const dateB = new Date(b['t.class_date'] || b.class_date || 0);
                return dateB - dateA;
            })
            .slice(0, 5);
        
        // 최근 팀 활동일지 (최근 5건)
        const recentTeamActivityLogs = teamActivityLogsData
            .sort((a, b) => new Date(b.activity_date) - new Date(a.activity_date))
            .slice(0, 5)
            .map(log => {
                const project = projectsData.find(p => p.id === log.project_id);
                return {
                    ...log,
                    project_name: project?.name || '프로젝트명 없음',
                    project_code: project?.code || ''
                };
            });
        
        // 추가 통계 계산 - 한국 시간 기준
        const todayDate = new Date(new Date().getTime() + (9 * 60 * 60 * 1000)).toISOString().split('T')[0];
        const thisWeekStart = new Date();
        thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay());
        const thisWeekStartStr = thisWeekStart.toISOString().split('T')[0];
        
        const todayCounselings = counselingsData.filter(c => c.consultation_date === todayDate).length;
        const thisWeekCounselings = counselingsData.filter(c => c.consultation_date >= thisWeekStartStr).length;
        const todayTrainingLogs = trainingLogsData.filter(t => (t['t.class_date'] || t.class_date) === todayDate).length;
        
        // 과정별 학생 수 계산
        const studentsByCourse = {};
        coursesData.forEach(c => {
            studentsByCourse[c.code] = studentsData.filter(s => s.course_code === c.code).length;
        });
        
        // 최근 7일 상담 추이
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            last7Days.push({
                date: dateStr,
                count: counselingsData.filter(c => {
                    // consultation_date는 "2025-11-17T00:00:00" 형식이므로 날짜 부분만 추출하여 비교
                    const consultDate = c.consultation_date ? c.consultation_date.split('T')[0] : '';
                    return consultDate === dateStr;
                }).length
            });
        }
        
        // 진로 결정 현황 계산 (학생별 마지막 상담의 career_decision 기반)
        const careerCounts = { study: 0, employed: 0, startup: 0, undecided: 0, other: 0 };
        
        studentsData.forEach(student => {
            // 해당 학생의 모든 상담 찾기
            const studentCounselings = counselingsData.filter(c => c.student_id === student.id);
            
            if (studentCounselings.length > 0) {
                // 날짜순 정렬하여 마지막 상담 찾기
                studentCounselings.sort((a, b) => new Date(b.consultation_date) - new Date(a.consultation_date));
                const lastCounseling = studentCounselings[0];
                
                // career_decision이 있으면 집계
                if (lastCounseling.career_decision) {
                    if (lastCounseling.career_decision === '1. 학업') careerCounts.study++;
                    else if (lastCounseling.career_decision === '2. 취업') careerCounts.employed++;
                    else if (lastCounseling.career_decision === '3. 창업') careerCounts.startup++;
                    else if (lastCounseling.career_decision === '4. 미정') careerCounts.undecided++;
                    else if (lastCounseling.career_decision === '5. 기타') careerCounts.other++;
                } else {
                    // career_decision이 없으면 미정으로 처리
                    careerCounts.undecided++;
                }
            } else {
                // 상담 기록이 없으면 미정으로 처리
                careerCounts.undecided++;
            }
        });
        
        const careerStudy = careerCounts.study;
        const careerEmployed = careerCounts.employed;
        const careerStartup = careerCounts.startup;
        const careerUndecided = careerCounts.undecided;
        const careerOther = careerCounts.other;
        
        // 강사 유형별 통계
        const instructorsByType = {};
        instructorsData.forEach(i => {
            const typeName = i.instructor_type_name || '미분류';
            instructorsByType[typeName] = (instructorsByType[typeName] || 0) + 1;
        });
        
        // 진도율 계산 함수 (과정별)
        window.calculateProgress = function(courseCode) {
            const course = coursesData.find(c => c.code === courseCode);
            if (!course) return { lecture: 0, project: 0, internship: 0, total: 0, trainingLogRate: 0 };
            
            const lectureTotal = course.lecture_hours || 0;
            const projectTotal = course.project_hours || 0;
            const internshipTotal = course.internship_hours || 0;
            const totalHours = lectureTotal + projectTotal + internshipTotal;
            
            let lectureCompleted = 0;
            let projectCompleted = 0;
            let internshipCompleted = 0;
            
            // 오늘까지의 시간표 필터링
            const completedTimetables = timetablesData.filter(tt => 
                tt.course_code === courseCode && 
                tt.class_date <= todayDate
            );
            
            // 시간 계산 함수
            const calcHours = (tt) => {
                if (!tt.start_time || !tt.end_time) return 0;
                const startHour = parseInt(tt.start_time.split(':')[0]);
                const startMinute = parseInt(tt.start_time.split(':')[1] || 0);
                const endHour = parseInt(tt.end_time.split(':')[0]);
                const endMinute = parseInt(tt.end_time.split(':')[1] || 0);
                return (endHour * 60 + endMinute - startHour * 60 - startMinute) / 60;
            };
            
            // 유형별 시수 계산
            completedTimetables.forEach(tt => {
                const hours = calcHours(tt);
                if (tt.type === 'lecture') lectureCompleted += hours;
                else if (tt.type === 'project') projectCompleted += hours;
                else if (tt.type === 'internship') internshipCompleted += hours;
            });
            
            // 훈련일지 작성률 계산 (오늘 이전까지)
            const pastTimetables = timetablesData.filter(tt => 
                tt.course_code === courseCode && 
                tt.class_date < todayDate
            );
            const trainingLogCount = trainingLogsData.filter(log => {
                const logTimetable = timetablesData.find(tt => tt.id === log.timetable_id);
                return logTimetable && logTimetable.course_code === courseCode && logTimetable.class_date < todayDate;
            }).length;
            const trainingLogRate = pastTimetables.length > 0 ? Math.round((trainingLogCount / pastTimetables.length) * 100) : 0;
            
            return {
                lecture: lectureTotal > 0 ? Math.round((lectureCompleted / lectureTotal) * 100) : 0,
                project: projectTotal > 0 ? Math.round((projectCompleted / projectTotal) * 100) : 0,
                internship: internshipTotal > 0 ? Math.round((internshipCompleted / internshipTotal) * 100) : 0,
                total: totalHours > 0 ? Math.round(((lectureCompleted + projectCompleted + internshipCompleted) / totalHours) * 100) : 0,
                lectureCompleted: Math.round(lectureCompleted),
                projectCompleted: Math.round(projectCompleted),
                internshipCompleted: Math.round(internshipCompleted),
                lectureTotal,
                projectTotal,
                internshipTotal,
                trainingLogRate,
                trainingLogCount,
                pastTimetablesCount: pastTimetables.length
            };
        };
        
        // 기본 과정 (2025-우송1반)
        const mainCourse = coursesData.find(c => c.name === '2025-우송1반') || coursesData[0];
        const progress = window.calculateProgress(mainCourse.code);
        
        // 대시보드 렌더링
        const app = document.getElementById('app');
        app.innerHTML = `
            <div class="p-3">
                <div class="flex justify-between items-center mb-3">
                    <h2 class="text-2xl font-bold text-gray-800">
                        <i class="fas fa-tachometer-alt mr-2"></i>대시보드
                    </h2>
                    <div class="flex items-center gap-3">
                        <select id="dashboard-course-filter" class="px-3 py-1 border rounded text-sm" onchange="window.filterDashboard(this.value)">
                            ${coursesData.map(c => `
                                <option value="${c.code}" ${c.code === mainCourse.code ? 'selected' : ''}>
                                    ${c.name || c.code}
                                </option>
                            `).join('')}
                        </select>
                        <div class="text-sm text-gray-600">
                            <i class="fas fa-calendar-day mr-1"></i>${formatDateWithDay(todayDate)}
                        </div>
                    </div>
                </div>
                
                <!-- 상단 통계 카드 (6개 컴팩트) -->
                <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 mb-3">
                    <!-- 학생 -->
                    <div class="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow p-3 text-white cursor-pointer hover:shadow-lg transition" onclick="showTab('students')">
                        <div class="flex items-center justify-between mb-1">
                            <i class="fas fa-user-graduate text-xl"></i>
                            <p class="text-2xl font-bold">${studentsData.length}</p>
                        </div>
                        <p class="text-xs text-blue-100">전체 학생</p>
                    </div>
                    
                    <!-- 강사 -->
                    <div class="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow p-3 text-white cursor-pointer hover:shadow-lg transition" onclick="showTab('instructors')">
                        <div class="flex items-center justify-between mb-1">
                            <i class="fas fa-chalkboard-teacher text-xl"></i>
                            <p class="text-2xl font-bold">${instructorsData.length}</p>
                        </div>
                        <p class="text-xs text-green-100">전체 강사</p>
                    </div>
                    
                    <!-- 과정 -->
                    <div class="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow p-3 text-white cursor-pointer hover:shadow-lg transition" onclick="showTab('courses')">
                        <div class="flex items-center justify-between mb-1">
                            <i class="fas fa-school text-xl"></i>
                            <p class="text-2xl font-bold">${coursesData.length}</p>
                        </div>
                        <p class="text-xs text-purple-100">운영 과정</p>
                    </div>
                    
                    <!-- 오늘 수업 -->
                    <div class="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg shadow p-3 text-white cursor-pointer hover:shadow-lg transition" onclick="showTab('timetables')">
                        <div class="flex items-center justify-between mb-1">
                            <i class="fas fa-calendar-day text-xl"></i>
                            <p class="text-2xl font-bold">${todayTimetables.length}</p>
                        </div>
                        <p class="text-xs text-indigo-100">오늘 수업</p>
                    </div>
                    
                    <!-- 상담 -->
                    <div class="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow p-3 text-white cursor-pointer hover:shadow-lg transition" onclick="showTab('counselings')">
                        <div class="flex items-center justify-between mb-1">
                            <i class="fas fa-comments text-xl"></i>
                            <p class="text-2xl font-bold">${todayCounselings}</p>
                        </div>
                        <p class="text-xs text-orange-100">오늘 상담 (총 ${counselingsData.length})</p>
                    </div>
                    
                    <!-- 팀 구성원 수 -->
                    <div class="bg-gradient-to-br from-pink-500 to-pink-600 rounded-lg shadow p-3 text-white cursor-pointer hover:shadow-lg transition" onclick="showTab('projects')">
                        <div class="flex items-center justify-between mb-1">
                            <i class="fas fa-users text-xl"></i>
                            <p class="text-2xl font-bold">${projectsData.length}</p>
                        </div>
                        <p class="text-xs text-pink-100">활동팀</p>
                    </div>
                </div>
                
                <!-- 차트 섹션 (3개 차트) -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                    <!-- 진로 결정 현황 (도넛 차트) -->
                    <div class="bg-white rounded-lg shadow p-3">
                        <h3 class="text-sm font-bold text-gray-800 mb-2 flex items-center">
                            <i class="fas fa-chart-pie mr-2 text-blue-600"></i>진로 결정 현황
                        </h3>
                        <canvas id="careerChart" class="w-full" style="max-height: 120px;"></canvas>
                        <div class="mt-2 grid grid-cols-5 gap-1 text-xs">
                            <div class="text-center">
                                <div class="w-3 h-3 bg-blue-500 rounded-full mx-auto mb-1"></div>
                                <p class="font-bold text-blue-600">${careerStudy}</p>
                                <p class="text-gray-600">학업</p>
                            </div>
                            <div class="text-center">
                                <div class="w-3 h-3 bg-green-500 rounded-full mx-auto mb-1"></div>
                                <p class="font-bold text-green-600">${careerEmployed}</p>
                                <p class="text-gray-600">취업</p>
                            </div>
                            <div class="text-center">
                                <div class="w-3 h-3 bg-yellow-500 rounded-full mx-auto mb-1"></div>
                                <p class="font-bold text-yellow-600">${careerStartup}</p>
                                <p class="text-gray-600">창업</p>
                            </div>
                            <div class="text-center">
                                <div class="w-3 h-3 bg-gray-400 rounded-full mx-auto mb-1"></div>
                                <p class="font-bold text-gray-600">${careerUndecided}</p>
                                <p class="text-gray-600">미정</p>
                            </div>
                            <div class="text-center">
                                <div class="w-3 h-3 bg-purple-500 rounded-full mx-auto mb-1"></div>
                                <p class="font-bold text-purple-600">${careerOther}</p>
                                <p class="text-gray-600">기타</p>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 강사 유형별 분포 (파이 차트) -->
                    <div class="bg-white rounded-lg shadow p-3">
                        <h3 class="text-sm font-bold text-gray-800 mb-2 flex items-center">
                            <i class="fas fa-user-tie mr-2 text-green-600"></i>강사 유형별 분포
                        </h3>
                        <canvas id="instructorChart" class="w-full" style="max-height: 120px;"></canvas>
                        <div class="mt-2 text-xs text-gray-600">
                            ${Object.entries(instructorsByType).slice(0, 4).map(([type, count], idx) => `
                                <div class="flex items-center justify-between py-0.5">
                                    <span class="flex items-center">
                                        <span class="w-2 h-2 rounded-full mr-1" style="background-color: ${['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'][idx]}"></span>
                                        ${type}
                                    </span>
                                    <span class="font-semibold">${count}명</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <!-- 최근 7일 상담 추이 (라인 차트) -->
                    <div class="bg-white rounded-lg shadow p-3">
                        <h3 class="text-sm font-bold text-gray-800 mb-2 flex items-center">
                            <i class="fas fa-chart-line mr-2 text-orange-600"></i>최근 7일 상담 추이
                        </h3>
                        <canvas id="counselingTrendChart" class="w-full" style="max-height: 120px;"></canvas>
                        <div class="mt-2 flex justify-between text-xs text-gray-600">
                            <div>
                                <span class="text-gray-500">오늘:</span>
                                <span class="font-bold text-orange-600">${todayCounselings}건</span>
                            </div>
                            <div>
                                <span class="text-gray-500">이번 주:</span>
                                <span class="font-bold text-blue-600">${thisWeekCounselings}건</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- 진도율 가로 막대 그래프 -->
                <div class="bg-white rounded-lg shadow p-3 mb-3">
                    <h3 class="text-sm font-bold text-gray-800 mb-3">
                        <i class="fas fa-chart-bar mr-2 text-blue-600"></i>${mainCourse ? mainCourse.name : '과정'} 진도율
                    </h3>
                    
                    <!-- 강의 진도율 -->
                    <div class="mb-3">
                        <div class="flex justify-between items-center mb-1">
                            <span class="text-xs font-semibold text-gray-700">강의 (${mainCourse?.start_date?.substring(0, 10) || '-'} ~ ${mainCourse?.lecture_end_date?.substring(0, 10) || '-'})</span>
                            <span class="text-xs text-gray-600">${progress.lectureCompleted}h / ${progress.lectureTotal}h (${progress.lecture}%)</span>
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-6 relative overflow-hidden">
                            <div class="bg-gradient-to-r from-blue-500 to-blue-600 h-6 rounded-full flex items-center justify-end pr-2 transition-all duration-500" 
                                 style="width: ${progress.lecture}%">
                                <span class="text-xs font-bold text-white">${progress.lecture}%</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 프로젝트 진도율 -->
                    <div class="mb-3">
                        <div class="flex justify-between items-center mb-1">
                            <span class="text-xs font-semibold text-gray-700">프로젝트 (${mainCourse?.lecture_end_date?.substring(0, 10) || '-'} ~ ${mainCourse?.project_end_date?.substring(0, 10) || '-'})</span>
                            <span class="text-xs text-gray-600">${progress.projectCompleted}h / ${progress.projectTotal}h (${progress.project}%)</span>
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-6 relative overflow-hidden">
                            <div class="bg-gradient-to-r from-green-500 to-green-600 h-6 rounded-full flex items-center justify-end pr-2 transition-all duration-500" 
                                 style="width: ${progress.project}%">
                                <span class="text-xs font-bold text-white">${progress.project}%</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 현장실습 진도율 -->
                    <div class="mb-3">
                        <div class="flex justify-between items-center mb-1">
                            <span class="text-xs font-semibold text-gray-700">현장실습 (${mainCourse?.project_end_date?.substring(0, 10) || '-'} ~ ${mainCourse?.internship_end_date?.substring(0, 10) || '-'})</span>
                            <span class="text-xs text-gray-600">${progress.internshipCompleted}h / ${progress.internshipTotal}h (${progress.internship}%)</span>
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-6 relative overflow-hidden">
                            <div class="bg-gradient-to-r from-purple-500 to-purple-600 h-6 rounded-full flex items-center justify-end pr-2 transition-all duration-500" 
                                 style="width: ${progress.internship}%">
                                <span class="text-xs font-bold text-white">${progress.internship}%</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 훈련일지 작성률 -->
                    <div>
                        <div class="flex justify-between items-center mb-1">
                            <span class="text-xs font-semibold text-gray-700">훈련일지 작성률</span>
                            <span class="text-xs text-gray-600">${progress.trainingLogCount}개 / ${progress.pastTimetablesCount}개 (${progress.trainingLogRate}%)</span>
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-6 relative overflow-hidden">
                            <div class="bg-gradient-to-r from-indigo-500 to-indigo-600 h-6 rounded-full flex items-center justify-end pr-2 transition-all duration-500" 
                                 style="width: ${progress.trainingLogRate}%">
                                <span class="text-xs font-bold text-white">${progress.trainingLogRate}%</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- 2열 그리드 (컴팩트) -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">
                    <!-- 오늘의 시간표 -->
                    <div class="bg-white rounded-lg shadow p-3">
                        <div class="flex items-center justify-between mb-2">
                            <h3 class="text-sm font-bold text-gray-800">
                                <i class="fas fa-calendar-day mr-2 text-blue-600"></i>오늘 시간표
                            </h3>
                            <button onclick="showTab('timetables')" class="text-blue-600 hover:text-blue-700 text-xs font-semibold">
                                전체 <i class="fas fa-arrow-right ml-1"></i>
                            </button>
                        </div>
                        <div class="space-y-1.5">
                            ${todayTimetables.length > 0 ? todayTimetables.slice(0, 5).map(t => `
                                <div class="border-l-3 ${
                                    t.type === 'lecture' ? 'border-blue-500' : 
                                    t.type === 'project' ? 'border-green-500' : 
                                    'border-purple-500'
                                } bg-gray-50 rounded p-2 hover:bg-gray-100 transition">
                                    <div class="flex items-start justify-between">
                                        <div class="flex-1 min-w-0">
                                            <div class="flex items-center gap-1 mb-0.5">
                                                <h4 class="font-bold text-gray-800 text-xs truncate">${t.subject_name || '과목명 없음'}</h4>
                                                <span class="text-xs px-1 py-0.5 rounded flex-shrink-0 ${
                                                    t.type === 'lecture' ? 'bg-blue-100 text-blue-700' : 
                                                    t.type === 'project' ? 'bg-green-100 text-green-700' : 
                                                    'bg-purple-100 text-purple-700'
                                                }">
                                                    ${t.type === 'lecture' ? '강의' : t.type === 'project' ? '프로젝트' : '실습'}
                                                </span>
                                            </div>
                                            <p class="text-xs text-gray-600 truncate">
                                                <i class="fas fa-chalkboard-teacher mr-1"></i>${t.instructor_name || '미정'}
                                            </p>
                                        </div>
                                        <div class="text-right ml-2 flex-shrink-0">
                                            <p class="text-xs font-bold text-blue-600">${t.start_time.substring(0,5)}</p>
                                            <p class="text-xs text-gray-500">${t.end_time.substring(0,5)}</p>
                                        </div>
                                    </div>
                                </div>
                            `).join('') : `
                                <div class="text-center py-4 text-gray-400">
                                    <i class="fas fa-calendar-times text-2xl mb-1"></i>
                                    <p class="text-xs">오늘 수업 없음</p>
                                </div>
                            `}
                        </div>
                    </div>
                    
                    <!-- 최근 상담 -->
                    <div class="bg-white rounded-lg shadow p-3">
                        <div class="flex items-center justify-between mb-2">
                            <h3 class="text-sm font-bold text-gray-800">
                                <i class="fas fa-comments mr-2 text-green-600"></i>최근 상담
                            </h3>
                            <button onclick="showTab('counselings')" class="text-green-600 hover:text-green-700 text-xs font-semibold">
                                전체 <i class="fas fa-arrow-right ml-1"></i>
                            </button>
                        </div>
                        <div class="space-y-1.5">
                            ${recentCounselings.length > 0 ? recentCounselings.slice(0, 2).map(c => `
                                <div class="flex items-start justify-between p-2 bg-gray-50 rounded hover:bg-gray-100 transition">
                                    <div class="flex-1 min-w-0">
                                        <p class="font-semibold text-xs text-gray-800 truncate">${c.student_name} (${c.student_code})</p>
                                        <p class="text-xs text-gray-600 truncate">
                                            <i class="fas fa-user-tie mr-1"></i>${c.instructor_name || '미정'}
                                        </p>
                                        <p class="text-xs text-gray-500 truncate mt-0.5">
                                            ${c.content ? (c.content.length > 30 ? c.content.substring(0, 30) + '...' : c.content) : '내용 없음'}
                                        </p>
                                    </div>
                                    <div class="text-right ml-2 flex-shrink-0">
                                        <p class="text-xs font-semibold text-gray-700">${new Date(c.consultation_date).getMonth()+1}/${new Date(c.consultation_date).getDate()}</p>
                                        <span class="text-xs px-1 py-0.5 rounded mt-1 inline-block ${
                                            c.consultation_type === '긴급' ? 'bg-red-100 text-red-800' :
                                            c.consultation_type === '정기' ? 'bg-blue-100 text-blue-800' :
                                            'bg-purple-100 text-purple-800'
                                        }">
                                            ${c.consultation_type || '정기'}
                                        </span>
                                    </div>
                                </div>
                            `).join('') : `
                                <div class="text-center py-4 text-gray-400">
                                    <i class="fas fa-comment-slash text-2xl mb-1"></i>
                                    <p class="text-xs">상담 기록 없음</p>
                                </div>
                            `}
                        </div>
                    </div>
                </div>
                
                <!-- 3열 그리드 (컴팩트) -->
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-3">
                    <!-- 최근 훈련일지 -->
                    <div class="bg-white rounded-lg shadow p-3">
                        <div class="flex items-center justify-between mb-2">
                            <h3 class="text-sm font-bold text-gray-800">
                                <i class="fas fa-clipboard-list mr-2 text-indigo-600"></i>훈련일지
                            </h3>
                            <button onclick="showTab('training-logs')" class="text-indigo-600 hover:text-indigo-700 text-xs font-semibold">
                                전체 <i class="fas fa-arrow-right ml-1"></i>
                            </button>
                        </div>
                        <div class="space-y-1.5">
                            ${recentTrainingLogs.length > 0 ? recentTrainingLogs.slice(0, 4).map(t => `
                                <div class="p-2 bg-gray-50 rounded hover:bg-gray-100 transition">
                                    <div class="flex items-start justify-between mb-0.5">
                                        <p class="text-xs font-semibold text-gray-800">${new Date(t['t.class_date'] || t.class_date).getMonth()+1}/${new Date(t['t.class_date'] || t.class_date).getDate()}</p>
                                        <span class="text-xs text-gray-500 truncate ml-2">${(t.subject_name || t.timetable_subject_name || '').substring(0, 8)}</span>
                                    </div>
                                    <p class="text-xs text-green-600 truncate">
                                        <i class="fas fa-chalkboard-teacher mr-1"></i>${t.instructor_name || '미정'}
                                    </p>
                                    <p class="text-xs text-gray-600 truncate mt-0.5">
                                        ${t.content ? (t.content.length > 35 ? t.content.substring(0, 35) + '...' : t.content) : '내용 없음'}
                                    </p>
                                </div>
                            `).join('') : `
                                <div class="text-center py-4 text-gray-400">
                                    <p class="text-xs">훈련일지 없음</p>
                                </div>
                            `}
                        </div>
                    </div>
                    
                    <!-- 최근 팀 활동일지 -->
                    <div class="bg-white rounded-lg shadow p-3">
                        <div class="flex items-center justify-between mb-2">
                            <h3 class="text-sm font-bold text-gray-800">
                                <i class="fas fa-users mr-2 text-pink-600"></i>최근 팀 활동
                            </h3>
                            <button onclick="showTab('projects')" class="text-pink-600 hover:text-pink-700 text-xs font-semibold">
                                전체 <i class="fas fa-arrow-right ml-1"></i>
                            </button>
                        </div>
                        <div class="space-y-1.5">
                            ${recentTeamActivityLogs.length > 0 ? recentTeamActivityLogs.slice(0, 4).map(log => `
                                <div class="p-2 bg-gray-50 rounded hover:bg-gray-100 transition">
                                    <div class="flex items-start justify-between mb-0.5">
                                        <p class="text-xs font-semibold text-gray-800 truncate flex-1">${log.project_name}</p>
                                        <p class="text-xs font-semibold text-gray-700 ml-2">${new Date(log.activity_date).getMonth()+1}/${new Date(log.activity_date).getDate()}</p>
                                    </div>
                                    <p class="text-xs text-pink-600 truncate">
                                        <i class="fas fa-tag mr-1"></i>${log.activity_type || '팀 활동'}
                                    </p>
                                    <p class="text-xs text-gray-600 truncate mt-0.5">
                                        ${log.content ? (log.content.length > 35 ? log.content.substring(0, 35) + '...' : log.content) : '내용 없음'}
                                    </p>
                                </div>
                            `).join('') : `
                                <div class="text-center py-4 text-gray-400">
                                    <p class="text-xs">팀 활동일지 없음</p>
                                </div>
                            `}
                        </div>
                    </div>
                    
                    <!-- 빠른 액션 (컴팩트) -->
                    <div class="bg-white rounded-lg shadow p-3">
                        <h3 class="text-sm font-bold text-gray-800 mb-2">
                            <i class="fas fa-bolt mr-2 text-yellow-600"></i>빠른 액션
                        </h3>
                        <div class="grid grid-cols-2 gap-2">
                            <button onclick="showTab('students')" class="bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold py-2 px-2 rounded text-xs transition">
                                <i class="fas fa-user-plus mr-1"></i>학생
                            </button>
                            <button onclick="showTab('counselings')" class="bg-green-50 hover:bg-green-100 text-green-700 font-semibold py-2 px-2 rounded text-xs transition">
                                <i class="fas fa-comment-medical mr-1"></i>상담
                            </button>
                            <button onclick="showTab('timetables')" class="bg-purple-50 hover:bg-purple-100 text-purple-700 font-semibold py-2 px-2 rounded text-xs transition">
                                <i class="fas fa-calendar-plus mr-1"></i>시간표
                            </button>
                            <button onclick="showTab('training-logs')" class="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold py-2 px-2 rounded text-xs transition">
                                <i class="fas fa-clipboard-check mr-1"></i>일지
                            </button>
                            <button onclick="showTab('projects')" class="bg-pink-50 hover:bg-pink-100 text-pink-700 font-semibold py-2 px-2 rounded text-xs transition">
                                <i class="fas fa-users mr-1"></i>팀
                            </button>
                            <button onclick="showTab('instructors')" class="bg-orange-50 hover:bg-orange-100 text-orange-700 font-semibold py-2 px-2 rounded text-xs transition">
                                <i class="fas fa-chalkboard-teacher mr-1"></i>강사
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // 차트 그리기
        setTimeout(() => {
            console.log('📊 차트 렌더링 시작...', { last7Days });
            
            // 진로 결정 현황 도넛 차트 (5가지 옵션)
            const careerCtx = document.getElementById('careerChart');
            if (careerCtx) {
                new Chart(careerCtx, {
                    type: 'doughnut',
                    data: {
                        labels: ['학업', '취업', '창업', '미정', '기타'],
                        datasets: [{
                            data: [careerStudy, careerEmployed, careerStartup, careerUndecided, careerOther],
                            backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#9CA3AF', '#8B5CF6'],
                            borderWidth: 2,
                            borderColor: '#fff'
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                display: false
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        const total = careerStudy + careerEmployed + careerStartup + careerUndecided + careerOther;
                                        const percentage = total > 0 ? ((context.parsed / total) * 100).toFixed(1) : 0;
                                        return context.label + ': ' + context.parsed + '명 (' + percentage + '%)';
                                    }
                                }
                            }
                        },
                        cutout: '65%'
                    }
                });
            }
            
            // 강사 유형별 분포 파이 차트
            const instructorCtx = document.getElementById('instructorChart');
            if (instructorCtx) {
                const instructorTypes = Object.keys(instructorsByType);
                const instructorCounts = Object.values(instructorsByType);
                const colors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#6366F1'];
                
                new Chart(instructorCtx, {
                    type: 'pie',
                    data: {
                        labels: instructorTypes,
                        datasets: [{
                            data: instructorCounts,
                            backgroundColor: colors.slice(0, instructorTypes.length),
                            borderWidth: 2,
                            borderColor: '#fff'
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                display: false
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        const total = instructorCounts.reduce((a, b) => a + b, 0);
                                        const percentage = total > 0 ? ((context.parsed / total) * 100).toFixed(1) : 0;
                                        return context.label + ': ' + context.parsed + '명 (' + percentage + '%)';
                                    }
                                }
                            }
                        }
                    }
                });
            }
            
            // 최근 7일 상담 추이 라인 차트
            const counselingTrendCtx = document.getElementById('counselingTrendChart');
            console.log('counselingTrendChart 캔버스:', counselingTrendCtx);
            console.log('last7Days 데이터:', last7Days);
            if (counselingTrendCtx) {
                console.log('✅ counselingTrendChart 렌더링 시작');
                new Chart(counselingTrendCtx, {
                    type: 'line',
                    data: {
                        labels: last7Days.map(d => {
                            const date = new Date(d.date);
                            const days = ['일', '월', '화', '수', '목', '금', '토'];
                            const dayName = days[date.getDay()];
                            return (date.getMonth() + 1) + '/' + date.getDate() + ' (' + dayName + ')';
                        }),
                        datasets: [{
                            label: '상담 건수',
                            data: last7Days.map(d => d.count),
                            borderColor: '#F59E0B',
                            backgroundColor: 'rgba(245, 158, 11, 0.1)',
                            tension: 0.4,
                            fill: true,
                            pointRadius: 4,
                            pointHoverRadius: 6,
                            pointBackgroundColor: '#F59E0B',
                            pointBorderColor: '#fff',
                            pointBorderWidth: 2
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                display: false
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        return '상담: ' + context.parsed.y + '건';
                                    }
                                }
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    stepSize: 1,
                                    font: {
                                        size: 10
                                    }
                                },
                                grid: {
                                    color: 'rgba(0, 0, 0, 0.05)'
                                }
                            },
                            x: {
                                ticks: {
                                    font: {
                                        size: 10
                                    }
                                },
                                grid: {
                                    display: false
                                }
                            }
                        }
                    }
                });
            }
        }, 100);
        
        // 과정 필터 함수
        window.filterDashboard = function(courseCode) {
            window.showLoading();
            setTimeout(() => {
                window.showDashboard();
            }, 100);
        };
        
        window.hideLoading();
        console.log('✅ 대시보드 렌더링 완료');
    } catch (error) {
        window.hideLoading();
        console.error('❌ 대시보드 로드 실패:', error);
        console.error('에러 상세:', {
            message: error.message,
            stack: error.stack,
            response: error.response
        });
        
        // 캐시 삭제 후 재시도 버튼 제공
        document.getElementById('app').innerHTML = `
            <div class="p-6">
                <div class="bg-red-50 border border-red-200 rounded-lg p-6 max-w-2xl mx-auto">
                    <div class="flex items-center mb-4">
                        <i class="fas fa-exclamation-triangle text-red-600 text-3xl mr-3"></i>
                        <h3 class="text-xl font-bold text-red-800">대시보드를 불러오는데 실패했습니다</h3>
                    </div>
                    <p class="text-red-700 mb-4">
                        ${error.message || '알 수 없는 오류가 발생했습니다.'}
                    </p>
                    <div class="space-x-2">
                        <button onclick="location.reload()" class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded">
                            <i class="fas fa-sync mr-2"></i>새로고침
                        </button>
                        <button onclick="window.clearCache(); location.reload();" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
                            <i class="fas fa-trash mr-2"></i>캐시 삭제 후 새로고침
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
}

// 초기화
document.addEventListener('DOMContentLoaded', () => {
    console.log('App initialized');
    
    // 로그인 체크
    if (!checkLogin()) {
        return; // 로그인 안 되어 있으면 여기서 중단
    }
    
    // 로그인 되어 있으면 대시보드 표시
    showTab('dashboard');
    
    // 브라우저 뒤로가기/앞으로가기 처리
    window.addEventListener('popstate', (event) => {
        if (event.state && event.state.tab) {
            // 히스토리에 저장된 탭으로 이동 (히스토리 추가 안 함)
            showTab(event.state.tab, false);
        } else {
            // 히스토리가 없으면 대시보드로
            showTab('dashboard', false);
        }
    });
    
    // 초기 히스토리 상태 설정
    history.replaceState({ tab: 'dashboard' }, '', '');
});

// 탭 전환
window.showTab = function(tab, addToHistory = true) {
    console.log('Switching to tab:', tab);
    currentTab = tab;
    
    // 히스토리에 추가 (뒤로가기 지원)
    if (addToHistory && history.state?.tab !== tab) {
        history.pushState({ tab: tab }, '', '');
    }
    
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
        case 'dashboard':
            // 대시보드는 항상 최신 데이터 로드 (캐시 무효화)
            localStorage.removeItem('cache_students');
            localStorage.removeItem('cache_instructors');
            localStorage.removeItem('cache_courses');
            localStorage.removeItem('cache_counselings');
            localStorage.removeItem('cache_timetables');
            localStorage.removeItem('cache_projects');
            localStorage.removeItem('cache_training-logs');
            localStorage.removeItem('cache_team-activity-logs');
            loadDashboard();
            break;
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
        case 'team-activity-logs':
            loadTeamActivityLogs();
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
        case 'system-settings':
            loadSystemSettings();
            break;
    }
}

// ==================== 학생 관리 ====================
async function loadStudents() {
    try {
        window.showLoading('학생 데이터를 불러오는 중...');
        console.log('Loading students...');
        const [studentsData, coursesData] = await Promise.all([
            window.getCachedData('students', () => axios.get(`${API_BASE_URL}/api/students`).then(r => r.data)),
            window.getCachedData('courses', () => axios.get(`${API_BASE_URL}/api/courses`).then(r => r.data))
        ]);
        students = studentsData;
        courses = coursesData;
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
    // 현재 필터 상태 저장
    const previousCourseFilter = document.getElementById('student-course-filter')?.value || '';
    const previousSort = document.getElementById('student-sort')?.value || 'name';
    const previousSearch = document.getElementById('student-search')?.value || '';
    
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
            
            <!-- 필터 영역 -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                    <label class="block text-gray-700 mb-2">정렬</label>
                    <select id="student-sort" class="w-full border rounded px-3 py-2" onchange="window.renderStudents()">
                        <option value="name" ${previousSort === 'name' ? 'selected' : ''}>이름순</option>
                        <option value="course" ${previousSort === 'course' ? 'selected' : ''}>과정순</option>
                        <option value="campus" ${previousSort === 'campus' ? 'selected' : ''}>캠퍼스순</option>
                        <option value="final_school" ${previousSort === 'final_school' ? 'selected' : ''}>학력순</option>
                        <option value="birth_date" ${previousSort === 'birth_date' ? 'selected' : ''}>생년월일순</option>
                    </select>
                </div>
                <div>
                    <label class="block text-gray-700 mb-2">과정 필터</label>
                    <select id="student-course-filter" class="w-full border rounded px-3 py-2" onchange="window.renderStudents()">
                        <option value="">-- 전체 과정 --</option>
                        ${courses.sort((a, b) => (a.name || a.code).localeCompare(b.name || b.code, 'ko')).map(c => `
                            <option value="${c.code}" ${previousCourseFilter === c.code ? 'selected' : ''}>${c.name || c.code}</option>
                        `).join('')}
                    </select>
                </div>
                <div>
                    <label class="block text-gray-700 mb-2">검색 (이름, 학생코드)</label>
                    <input type="text" id="student-search" placeholder="검색어 입력..." value="${previousSearch}" class="w-full border rounded px-3 py-2" onkeyup="window.renderStudents()">
                </div>
            </div>
            
            <div id="student-form" class="hidden mb-6 p-4 bg-gray-50 rounded-lg"></div>
            <div id="excel-upload" class="hidden mb-6 p-4 bg-purple-50 rounded-lg"></div>
            
            <div class="overflow-x-auto">
                <table class="min-w-full bg-white">
                    <thead class="bg-gray-100">
                        <tr>
                            <th class="px-2 py-2 text-center w-12">사진</th>
                            <th class="px-4 py-2 text-left">학생코드</th>
                            <th class="px-4 py-2 text-left">이름</th>
                            <th class="px-4 py-2 text-left">생년월일</th>
                            <th class="px-4 py-2 text-left">성별</th>
                            <th class="px-4 py-2 text-left">연락처</th>
                            <th class="px-4 py-2 text-left">학력사항</th>
                            <th class="px-4 py-2 text-left">관심분야</th>
                            <th class="px-4 py-2 text-left">작업</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${(() => {
                            // 필터와 정렬 적용
                            let filteredStudents = [...students];
                            
                            // 과정 필터
                            const courseFilter = document.getElementById('student-course-filter')?.value;
                            if (courseFilter) {
                                filteredStudents = filteredStudents.filter(s => s.course_code === courseFilter);
                            }
                            
                            // 검색 필터
                            const searchText = document.getElementById('student-search')?.value.toLowerCase();
                            if (searchText) {
                                filteredStudents = filteredStudents.filter(s => 
                                    (s.name && s.name.toLowerCase().includes(searchText)) ||
                                    (s.code && s.code.toLowerCase().includes(searchText))
                                );
                            }
                            
                            // 정렬
                            const sortBy = document.getElementById('student-sort')?.value || 'name';
                            if (sortBy === 'name') {
                                filteredStudents.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ko'));
                            } else if (sortBy === 'course') {
                                filteredStudents.sort((a, b) => (a.course_code || '').localeCompare(b.course_code || ''));
                            } else if (sortBy === 'campus') {
                                filteredStudents.sort((a, b) => (a.campus || '').localeCompare(b.campus || '', 'ko'));
                            } else if (sortBy === 'final_school') {
                                filteredStudents.sort((a, b) => (a.final_school || '').localeCompare(b.final_school || '', 'ko'));
                            } else if (sortBy === 'birth_date') {
                                filteredStudents.sort((a, b) => (a.birth_date || '').localeCompare(b.birth_date || ''));
                            }
                            
                            return filteredStudents.map(student => {
                                // 관심분야 짧게 (30자까지만)
                                const shortInterest = student.interest_area || student.interests
                                    ? ((student.interest_area || student.interests).length > 30 
                                        ? (student.interest_area || student.interests).substring(0, 30) + '...' 
                                        : (student.interest_area || student.interests))
                                    : '-';
                                
                                // 학력사항 요약 (15자까지만)
                                const educationText = student.education || student.final_school || '-';
                                const shortEducation = educationText.length > 15 
                                    ? educationText.substring(0, 15) + '...' 
                                    : educationText;
                                
                                // 성별 짧게 (남/여)
                                let shortGender = '-';
                                if (student.gender) {
                                    if (student.gender.includes('남') || student.gender === 'M' || student.gender === 'male') {
                                        shortGender = '남';
                                    } else if (student.gender.includes('여') || student.gender === 'F' || student.gender === 'female') {
                                        shortGender = '여';
                                    } else {
                                        shortGender = student.gender;
                                    }
                                }
                                
                                // 전화번호 포맷팅 (010-0000-0000)
                                const formattedPhone = normalizePhone(student.phone) || '-';
                                
                                return `
                            <tr class="border-b hover:bg-gray-50">
                                <td class="px-2 py-2 text-center">
                                    ${student.photo_urls && JSON.parse(student.photo_urls || '[]').length > 0 ? `
                                        <button onclick='window.showPhotoViewer(${JSON.stringify(student.photo_urls)}, 0)' 
                                                class="text-green-600 hover:text-green-700" 
                                                title="${JSON.parse(student.photo_urls).length}개 사진">
                                            <i class="fas fa-camera"></i>
                                        </button>
                                    ` : `
                                        <i class="fas fa-camera text-gray-300" title="사진 없음"></i>
                                    `}
                                </td>
                                <td class="px-4 py-2 font-mono">${student.code}</td>
                                <td class="px-4 py-2 font-semibold">${student.name}</td>
                                <td class="px-3 py-2">${student.birth_date ? formatDateWithDay(student.birth_date) : '-'}</td>
                                <td class="px-2 py-2 text-center">${shortGender}</td>
                                <td class="px-3 py-2 text-sm">${formattedPhone}</td>
                                <td class="px-2 py-2 text-sm" title="${educationText}">${shortEducation}</td>
                                <td class="px-4 py-2 text-sm text-gray-600">${shortInterest}</td>
                                <td class="px-2 py-2 whitespace-nowrap">
                                    <button onclick="window.viewStudent(${student.id})" class="text-blue-600 hover:text-blue-800 mr-1" title="상세보기">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                    <button onclick="window.editStudent(${student.id})" class="text-green-600 hover:text-green-800 mr-1" title="수정">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button onclick="window.deleteStudent(${student.id})" class="text-red-600 hover:text-red-800" title="삭제">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </td>
                            </tr>
                        `;
                            }).join('');
                        })()}
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

window.showStudentForm = async function(studentId = null) {
    // courses 배열이 없으면 먼저 로드
    if (!courses || courses.length === 0) {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/courses`);
            courses = response.data;
        } catch (error) {
            console.error('과정 로드 실패:', error);
            courses = [];
        }
    }
    
    const student = studentId ? students.find(s => s.id === studentId) : null;
    
    // 새 학생 추가 시: 필터에서 선택된 과정을 기본값으로 사용
    let defaultCourseCode = '';
    if (!studentId) {
        const courseFilter = document.getElementById('student-course-filter');
        defaultCourseCode = courseFilter ? courseFilter.value : '';
    }
    
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
                    <input type="text" name="birth_date" value="${student?.birth_date ? formatDateWithDay(student.birth_date) : ''}" 
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
                    <input type="tel" name="phone" value="${student?.phone ? normalizePhone(student.phone) : ''}" required 
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
                        ${courses.sort((a, b) => (a.name || a.code).localeCompare(b.name || b.code, 'ko')).map(c => `
                            <option value="${c.code}" ${(student?.course_code === c.code || (!student && defaultCourseCode === c.code)) ? 'selected' : ''}>
                                ${c.code} - ${c.name || c.code}
                            </option>
                        `).join('')}
                    </select>
                </div>
                <div>
                    <label class="block text-gray-700 mb-2">진로 분야</label>
                    <select name="career_path" class="w-full px-3 py-2 border rounded-lg">
                        <option value="1. 학업" ${student?.career_path === '1. 학업' ? 'selected' : ''}>1. 학업</option>
                        <option value="2. 취업" ${student?.career_path === '2. 취업' ? 'selected' : ''}>2. 취업</option>
                        <option value="3. 창업" ${student?.career_path === '3. 창업' ? 'selected' : ''}>3. 창업</option>
                        <option value="4. 미정" ${student?.career_path === '4. 미정' || !student?.career_path ? 'selected' : ''}>4. 미정</option>
                        <option value="5. 기타" ${student?.career_path === '5. 기타' ? 'selected' : ''}>5. 기타</option>
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
                        <i class="fas fa-paperclip mr-2"></i>사진 및 파일 첨부 (그림파일, PDF, HWP, PPT, Excel, Word, TXT 등)
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
                        <input type="file" id="student-file-input" accept="image/*,.pdf,.ppt,.pptx,.xls,.xlsx,.doc,.docx,.txt,.hwp" multiple 
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
    
    // 폼으로 스크롤
    formDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
    
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
        birth_date: normalizeBirthDate(formData.get('birth_date')),
        gender: formData.get('gender'),
        phone: normalizePhone(formData.get('phone')),
        email: formData.get('email'),
        address: formData.get('address'),
        interests: formData.get('interests'),
        education: formData.get('education'),
        introduction: formData.get('introduction'),
        campus: formData.get('campus'),
        course_code: formData.get('course_code'),
        notes: formData.get('notes'),
        photo_urls: JSON.stringify(photoUrls),
        career_path: formData.get('career_path') || '4. 미정'
    };
    
    try {
        if (studentId) {
            await axios.put(`${API_BASE_URL}/api/students/${studentId}`, data);
        } else {
            await axios.post(`${API_BASE_URL}/api/students`, data);
        }
        
        // 캐시 삭제 (학생 데이터가 변경되었으므로)
        window.clearCache('students');
        
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
    
    // 파일 검증
    for (let file of files) {
        const validation = window.validateFile(file);
        if (!validation.valid) {
            window.showAlert(validation.message);
            event.target.value = '';
            return;
        }
    }
    
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
            
            // 이미지 자동 압축 (PDF는 그대로)
            let processedFile = file;
            if (file.type.startsWith('image/')) {
                try {
                    processedFile = await window.compressImage(file);
                    console.log(`이미지 압축: ${(file.size / 1024).toFixed(1)}KB → ${(processedFile.size / 1024).toFixed(1)}KB`);
                } catch (error) {
                    console.error('이미지 압축 실패, 원본 사용:', error);
                    processedFile = file;
                }
            }
            
            const formData = new FormData();
            formData.append('file', processedFile);
            
            // 프로그레스 업데이트
            const progress = ((i + 0.5) / totalFiles) * 100;
            if (progressBar) progressBar.style.width = `${progress}%`;
            
            const response = await axios.post(
                `${API_BASE_URL}/api/upload-image?category=student`,
                formData,
                { headers: { 'Content-Type': 'multipart/form-data' } }
            );
            
            if (response.data.success) {
                // URL과 원본 파일명을 함께 저장 (URL#원본파일명 형식)
                const urlWithOriginalName = response.data.original_filename 
                    ? `${response.data.url}#${encodeURIComponent(response.data.original_filename)}`
                    : response.data.url;
                photoUrls.push(urlWithOriginalName);
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
    
    previewDiv.innerHTML = photoUrls.map((url, index) => 
        window.createFilePreviewItem(url, index, 'window.removeStudentPhoto')
    ).join('');
}

window.editStudent = function(id) {
    window.showStudentForm(id);
}

window.viewStudent = async function(id) {
    // 새로운 상세보기 모달 호출
    window.showStudentDetail(id);
}

window.deleteStudent = async function(id) {
    const student = students.find(s => s.id === id);
    if (!student) return;
    
    // 상단으로 스크롤하여 상세 정보 보여주기
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    const message = `❗ 학생 삭제 확인\n\n이름: ${student.name}\n학생코드: ${student.code}\n연락처: ${student.phone || '없음'}\n\n정말 삭제하시겠습니까?`;
    if (!confirm(message)) return;
    
    try {
        await axios.delete(`${API_BASE_URL}/api/students/${id}`);
        window.clearCache('students');
        window.showAlert('✅ 학생이 삭제되었습니다.');
        loadStudents();
    } catch (error) {
        window.showAlert('❌ 학생 삭제에 실패했습니다: ' + error.message);
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
                        }).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ko'))
                        .map(inst => {
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
    const subject = subjects.find(s => s.code === subjectCode);
    if (!subject) return;
    
    // 상단으로 스크롤
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    const message = `❗ 과목 삭제 확인\n\n과목명: ${subject.name}\n과목코드: ${subject.code}\n담당강사: ${subject.instructor_name || '미정'}\n\n정말 삭제하시겠습니까?`;
    const confirmed = await window.showConfirm(message);
    if (!confirmed) return;
    
    try {
        await axios.delete(`${API_BASE_URL}/api/subjects/${subjectCode}`);
        window.showAlert('✅ 과목이 삭제되었습니다.');
        loadSubjects();
    } catch (error) {
        console.error('과목 삭제 실패:', error);
        window.showAlert('❌ 삭제 실패: ' + (error.response?.data?.detail || error.message));
    }
}

// ==================== 상담 관리 ====================
async function loadCounselings() {
    try {
        window.showLoading('상담 데이터를 불러오는 중...');
        const [counselingsData, studentsData, instructorsData, coursesData] = await Promise.all([
            window.getCachedData('counselings', () => axios.get(`${API_BASE_URL}/api/counselings`).then(r => r.data)),
            window.getCachedData('students', () => axios.get(`${API_BASE_URL}/api/students`).then(r => r.data)),
            window.getCachedData('instructors', () => axios.get(`${API_BASE_URL}/api/instructors`).then(r => r.data)),
            window.getCachedData('courses', () => axios.get(`${API_BASE_URL}/api/courses`).then(r => r.data))
        ]);
        counselings = counselingsData;
        students = studentsData;
        instructors = instructorsData;
        courses = coursesData;
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
                <div class="grid grid-cols-1 md:grid-cols-6 gap-4 mb-4">
                    <div>
                        <label class="block text-sm text-gray-700 mb-1">과정 선택</label>
                        <select id="filter-course" class="w-full border rounded px-3 py-2" onchange="window.updateStudentsByCourse(); window.filterCounselings();">
                            <option value="">전체 과정</option>
                            ${courses.sort((a, b) => (a.name || a.code).localeCompare(b.name || b.code, 'ko')).map(c => `<option value="${c.code}">${c.name || c.code}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm text-gray-700 mb-1">학생 선택</label>
                        <select id="filter-student" class="w-full border rounded px-3 py-2" onchange="window.filterCounselings()">
                            <option value="">전체 학생</option>
                            ${students.sort((a, b) => a.name.localeCompare(b.name, 'ko')).map(s => {
                                const counselingCount = counselings.filter(c => c.student_id === s.id).length;
                                return `<option value="${s.id}">${s.name} (${s.code}) - ${counselingCount}회</option>`;
                            }).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm text-gray-700 mb-1">상담 선생님</label>
                        <select id="filter-instructor" class="w-full border rounded px-3 py-2" onchange="window.filterCounselings()">
                            <option value="">전체</option>
                            ${instructors.sort((a, b) => a.name.localeCompare(b.name, 'ko')).map(i => `<option value="${i.code}">${i.name}-${i.instructor_type_name || '강사'}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm text-gray-700 mb-1">정렬</label>
                        <select id="filter-sort" class="w-full border rounded px-3 py-2" onchange="window.filterCounselings()">
                            <option value="date-desc">최신순</option>
                            <option value="date-asc">오래된순</option>
                            <option value="counseling-count-desc">상담많은순</option>
                            <option value="counseling-count-asc">상담적은순</option>
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
                                <th class="px-2 py-2 text-center text-xs w-12">사진</th>
                                <th class="px-3 py-2 text-left text-xs">날짜</th>
                                <th class="px-3 py-2 text-left text-xs">학생 (상담횟수)</th>
                                <th class="px-3 py-2 text-left text-xs">상담선생님</th>
                                <th class="px-3 py-2 text-left text-xs">유형</th>
                                <th class="px-3 py-2 text-left text-xs">상담내용</th>
                                <th class="px-3 py-2 text-left text-xs">상태</th>
                                <th class="px-3 py-2 text-left text-xs">작업</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${counselings.map(c => {
                                const studentCounselingCount = counselings.filter(item => item.student_id === c.student_id).length;
                                return `
                                <tr class="border-t hover:bg-gray-50">
                                    <td class="px-2 py-2 text-center text-xs">
                                        ${c.photo_urls && JSON.parse(c.photo_urls || '[]').length > 0 ? `
                                            <button onclick='window.showPhotoViewer(${JSON.stringify(c.photo_urls)}, 0)' 
                                                    class="text-green-600 hover:text-green-700" 
                                                    title="${JSON.parse(c.photo_urls).length}개 사진">
                                                <i class="fas fa-camera"></i>
                                            </button>
                                        ` : `
                                            <i class="fas fa-camera text-gray-300" title="사진 없음"></i>
                                        `}
                                    </td>
                                    <td class="px-3 py-2 text-xs">${formatDateWithDay(c.consultation_date)}</td>
                                    <td class="px-3 py-2 text-xs">
                                        <button onclick="window.showStudentDetail(${c.student_id})" 
                                                class="text-blue-600 hover:underline">
                                            ${c.student_name} (${c.student_code})
                                        </button>
                                        <span class="ml-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                                            ${studentCounselingCount}회
                                        </span>
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
                            `;
                            }).join('')}
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
        
        // 정렬 처리
        const sortType = document.getElementById('filter-sort').value;
        
        if (sortType === 'date-desc') {
            // 최신순 (기본)
            filtered.sort((a, b) => new Date(b.consultation_date) - new Date(a.consultation_date));
        } else if (sortType === 'date-asc') {
            // 오래된순
            filtered.sort((a, b) => new Date(a.consultation_date) - new Date(b.consultation_date));
        } else if (sortType === 'counseling-count-desc') {
            // 상담많은순 - 학생별 상담 횟수로 정렬
            const counselingCounts = {};
            filtered.forEach(c => {
                counselingCounts[c.student_id] = (counselingCounts[c.student_id] || 0) + 1;
            });
            filtered.sort((a, b) => {
                const countA = counselingCounts[a.student_id] || 0;
                const countB = counselingCounts[b.student_id] || 0;
                if (countB !== countA) {
                    return countB - countA; // 상담 횟수 많은순
                }
                // 같으면 최신순
                return new Date(b.consultation_date) - new Date(a.consultation_date);
            });
        } else if (sortType === 'counseling-count-asc') {
            // 상담적은순 - 학생별 상담 횟수로 정렬
            const counselingCounts = {};
            filtered.forEach(c => {
                counselingCounts[c.student_id] = (counselingCounts[c.student_id] || 0) + 1;
            });
            filtered.sort((a, b) => {
                const countA = counselingCounts[a.student_id] || 0;
                const countB = counselingCounts[b.student_id] || 0;
                if (countA !== countB) {
                    return countA - countB; // 상담 횟수 적은순
                }
                // 같으면 최신순
                return new Date(b.consultation_date) - new Date(a.consultation_date);
            });
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
                            <th class="px-2 py-2 text-center text-xs w-12">사진</th>
                            <th class="px-3 py-2 text-left text-xs">날짜</th>
                            <th class="px-3 py-2 text-left text-xs">학생 (상담횟수)</th>
                            <th class="px-3 py-2 text-left text-xs">상담선생님</th>
                            <th class="px-3 py-2 text-left text-xs">유형</th>
                            <th class="px-3 py-2 text-left text-xs">상담내용</th>
                            <th class="px-3 py-2 text-left text-xs">상태</th>
                            <th class="px-3 py-2 text-left text-xs">작업</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${counselings.map(c => {
                            const studentCounselingCount = counselings.filter(item => item.student_id === c.student_id).length;
                            return `
                            <tr class="border-t hover:bg-gray-50">
                                <td class="px-2 py-2 text-center text-xs">
                                    ${c.photo_urls && JSON.parse(c.photo_urls || '[]').length > 0 ? `
                                        <i class="fas fa-camera text-green-600" title="${JSON.parse(c.photo_urls).length}개 사진"></i>
                                    ` : `
                                        <i class="fas fa-camera text-gray-300" title="사진 없음"></i>
                                    `}
                                </td>
                                <td class="px-3 py-2 text-xs">${formatDateWithDay(c.consultation_date)}</td>
                                <td class="px-3 py-2 text-xs">
                                    <button onclick="window.showStudentDetail(${c.student_id})" 
                                            class="text-blue-600 hover:underline">
                                        ${c.student_name} (${c.student_code})
                                    </button>
                                    <span class="ml-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                                        ${studentCounselingCount}회
                                    </span>
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
                            `;
                        }).join('')}
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
        detailDiv.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
        detailDiv.innerHTML = `
            <div class="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
                <div class="text-center">
                    <div class="mb-4">
                        <i class="fas fa-user-circle text-6xl text-blue-500 animate-pulse"></i>
                    </div>
                    <h3 class="text-xl font-bold text-gray-800 mb-2">학생 정보 불러오는 중...</h3>
                    <p class="text-gray-600 mb-4">잠시만 기다려주세요</p>
                    
                    <!-- 프로그레스바 -->
                    <div class="w-full bg-gray-200 rounded-full h-2.5 mb-4 overflow-hidden">
                        <div class="bg-gradient-to-r from-blue-500 to-indigo-600 h-2.5 rounded-full animate-progress"></div>
                    </div>
                    
                    <style>
                        @keyframes progress {
                            0% { width: 0%; }
                            50% { width: 70%; }
                            100% { width: 100%; }
                        }
                        .animate-progress {
                            animation: progress 2s ease-in-out infinite;
                        }
                    </style>
                </div>
            </div>
        `;
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
        
        // 성별에 따른 기본 프로필 이미지
        const getDefaultProfileImage = (gender) => {
            if (gender === '남' || gender === '남자' || gender === 'M' || gender === 'male') {
                return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"%3E%3Cdefs%3E%3ClinearGradient id="grad1" x1="0%25" y1="0%25" x2="100%25" y2="100%25"%3E%3Cstop offset="0%25" style="stop-color:%234A90E2;stop-opacity:1" /%3E%3Cstop offset="100%25" style="stop-color:%2367B8E3;stop-opacity:1" /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width="200" height="200" fill="url(%23grad1)"/%3E%3Ccircle cx="100" cy="70" r="35" fill="white" opacity="0.9"/%3E%3Cpath d="M 100 110 Q 70 110 60 140 L 60 200 L 140 200 L 140 140 Q 130 110 100 110 Z" fill="white" opacity="0.9"/%3E%3C/svg%3E';
            } else if (gender === '여' || gender === '여자' || gender === 'F' || gender === 'female') {
                return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"%3E%3Cdefs%3E%3ClinearGradient id="grad2" x1="0%25" y1="0%25" x2="100%25" y2="100%25"%3E%3Cstop offset="0%25" style="stop-color:%23EC4899;stop-opacity:1" /%3E%3Cstop offset="100%25" style="stop-color:%23F472B6;stop-opacity:1" /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width="200" height="200" fill="url(%23grad2)"/%3E%3Ccircle cx="100" cy="70" r="35" fill="white" opacity="0.9"/%3E%3Cpath d="M 100 110 Q 70 110 60 140 L 60 200 L 140 200 L 140 140 Q 130 110 100 110 Z" fill="white" opacity="0.9"/%3E%3C/svg%3E';
            }
            return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"%3E%3Cdefs%3E%3ClinearGradient id="grad3" x1="0%25" y1="0%25" x2="100%25" y2="100%25"%3E%3Cstop offset="0%25" style="stop-color:%236B7280;stop-opacity:1" /%3E%3Cstop offset="100%25" style="stop-color:%239CA3AF;stop-opacity:1" /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width="200" height="200" fill="url(%23grad3)"/%3E%3Ccircle cx="100" cy="70" r="35" fill="white" opacity="0.9"/%3E%3Cpath d="M 100 110 Q 70 110 60 140 L 60 200 L 140 200 L 140 140 Q 130 110 100 110 Z" fill="white" opacity="0.9"/%3E%3C/svg%3E';
        };
        
        // detailDiv는 함수 시작 부분에서 이미 선언됨
        detailDiv.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
        detailDiv.innerHTML = `
            <div class="bg-white rounded-2xl shadow-2xl w-full max-w-7xl max-h-[95vh] overflow-y-auto">
                <!-- 헤더 -->
                <div class="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-5 rounded-t-2xl flex justify-between items-center sticky top-0 z-10 shadow-lg">
                    <div class="flex items-center gap-4">
                        <i class="fas fa-id-card text-3xl"></i>
                        <div>
                            <h3 class="text-2xl font-bold">학생 상세보기</h3>
                            <p class="text-sm text-blue-100 mt-1">${student.name} (${student.code})</p>
                        </div>
                    </div>
                    <button onclick="window.hideStudentDetail()" class="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-3 transition-all transform hover:scale-110">
                        <i class="fas fa-times text-2xl"></i>
                    </button>
                </div>
                
                <div class="p-8">
                    <!-- 최상단: 프로필 카드 -->
                    <div class="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-2xl p-8 mb-6 shadow-md border border-blue-100">
                        <div class="flex gap-8">
                            <!-- 프로필 사진 -->
                            <div class="flex-shrink-0">
                                <div class="relative">
                                    ${(() => {
                                        let photoUrl = getDefaultProfileImage(student.gender);
                                        if (student.photo_urls) {
                                            try {
                                                const urls = typeof student.photo_urls === 'string' ? JSON.parse(student.photo_urls) : student.photo_urls;
                                                if (urls && urls.length > 0) {
                                                    const firstUrl = urls[0];
                                                    const cleanUrl = firstUrl.split('#')[0];
                                                    // 이미지 파일인지 확인
                                                    const ext = cleanUrl.split('.').pop().toLowerCase().split('?')[0];
                                                    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext)) {
                                                        photoUrl = API_BASE_URL + '/api/thumbnail?url=' + encodeURIComponent(cleanUrl);
                                                    }
                                                }
                                            } catch (e) {
                                                console.error('Photo URL parsing error:', e);
                                            }
                                        }
                                        return `<img src="${photoUrl}" 
                                                     alt="${student.name}" 
                                                     class="w-48 h-48 object-cover rounded-2xl shadow-2xl border-4 border-white"
                                                     onerror="this.src='${getDefaultProfileImage(student.gender)}'">`;
                                    })()}
                                    <div class="absolute -bottom-3 -right-3 bg-white rounded-full p-3 shadow-lg">
                                        <i class="fas ${student.gender === '남' || student.gender === '남자' ? 'fa-mars text-blue-500' : student.gender === '여' || student.gender === '여자' ? 'fa-venus text-pink-500' : 'fa-user text-gray-500'} text-2xl"></i>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- 기본 정보 -->
                            <div class="flex-1">
                                <div class="mb-6">
                                    <h4 class="text-3xl font-bold text-gray-800 mb-2">
                                        ${student.name}
                                        <span class="text-xl text-gray-500 font-normal ml-3">${student.code}</span>
                                    </h4>
                                    <div class="flex gap-3 mt-3">
                                        <span class="px-4 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
                                            <i class="fas fa-venus-mars mr-1"></i>${student.gender || '미등록'}
                                        </span>
                                        <span class="px-4 py-1.5 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold">
                                            <i class="fas fa-university mr-1"></i>${student.campus || '미정'}
                                        </span>
                                    </div>
                                </div>
                                
                                <div class="grid grid-cols-3 gap-4">
                                    <div class="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                                        <p class="text-xs text-gray-500 mb-1 flex items-center">
                                            <i class="fas fa-birthday-cake mr-2 text-blue-500"></i>생년월일
                                        </p>
                                        <p class="font-bold text-gray-800 text-lg">${student.birth_date ? formatDateWithDay(student.birth_date) : '-'}</p>
                                    </div>
                                    <div class="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                                        <p class="text-xs text-gray-500 mb-1 flex items-center">
                                            <i class="fas fa-graduation-cap mr-2 text-green-500"></i>학력
                                        </p>
                                        <p class="font-bold text-gray-800 text-lg">${student.education || '-'}</p>
                                    </div>
                                    <div class="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                                        <p class="text-xs text-gray-500 mb-1 flex items-center">
                                            <i class="fas fa-calendar-check mr-2 text-orange-500"></i>등록일
                                        </p>
                                        <p class="font-bold text-gray-800 text-lg">${student.registered_at ? formatDateWithDay(student.registered_at.split('T')[0]) : '-'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 2단: 과정 정보 & 연락처 -->
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        <!-- 과정 정보 -->
                        <div class="bg-white rounded-xl shadow-md p-6 border border-gray-200">
                            <h4 class="text-xl font-bold text-gray-800 mb-5 flex items-center border-b pb-3">
                                <div class="bg-blue-500 rounded-lg p-2 mr-3">
                                    <i class="fas fa-book-reader text-white"></i>
                                </div>
                                과정 정보
                            </h4>
                            <div class="space-y-4">
                                <div class="bg-gradient-to-r from-blue-50 to-indigo-50 p-5 rounded-xl border-l-4 border-blue-500">
                                    <p class="text-sm text-gray-600 mb-2 font-semibold">수강 과정</p>
                                    <p class="font-bold text-blue-700 text-xl">${courseInfo || '-'}</p>
                                </div>
                                <div class="bg-gray-50 p-5 rounded-xl">
                                    <p class="text-sm text-gray-600 mb-2 font-semibold flex items-center">
                                        <i class="fas fa-heart text-pink-500 mr-2"></i>관심분야
                                    </p>
                                    <p class="font-semibold text-gray-800 text-lg">${student.interests || '-'}</p>
                                </div>
                            </div>
                        </div>
                        
                        <!-- 연락처 정보 -->
                        <div class="bg-white rounded-xl shadow-md p-6 border border-gray-200">
                            <h4 class="text-xl font-bold text-gray-800 mb-5 flex items-center border-b pb-3">
                                <div class="bg-green-500 rounded-lg p-2 mr-3">
                                    <i class="fas fa-address-book text-white"></i>
                                </div>
                                연락처 정보
                            </h4>
                            <div class="space-y-4">
                                <div class="bg-green-50 p-5 rounded-xl border-l-4 border-green-500">
                                    <p class="text-sm text-gray-600 mb-2 font-semibold flex items-center">
                                        <i class="fas fa-phone text-green-600 mr-2"></i>전화번호
                                    </p>
                                    <p class="font-bold text-gray-800 text-xl">${student.phone ? normalizePhone(student.phone) : '-'}</p>
                                </div>
                                <div class="bg-blue-50 p-5 rounded-xl border-l-4 border-blue-500">
                                    <p class="text-sm text-gray-600 mb-2 font-semibold flex items-center">
                                        <i class="fas fa-envelope text-blue-600 mr-2"></i>이메일
                                    </p>
                                    <p class="font-semibold text-gray-800 text-lg break-all">${student.email || '-'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 3단: 주소 -->
                    <div class="bg-white rounded-xl shadow-md p-6 mb-6 border border-gray-200">
                        <h4 class="text-xl font-bold text-gray-800 mb-5 flex items-center border-b pb-3">
                            <div class="bg-orange-500 rounded-lg p-2 mr-3">
                                <i class="fas fa-map-marker-alt text-white"></i>
                            </div>
                            주소
                        </h4>
                        <div class="bg-orange-50 p-5 rounded-xl border-l-4 border-orange-500 mb-4">
                            <p class="font-semibold text-gray-800 text-lg">${student.address || '주소 정보가 없습니다'}</p>
                        </div>
                        ${student.address ? `
                            <!-- 구글 지도 -->
                            <div class="rounded-xl overflow-hidden shadow-md border-2 border-gray-200">
                                <iframe
                                    width="100%"
                                    height="300"
                                    style="border:0"
                                    loading="lazy"
                                    allowfullscreen
                                    referrerpolicy="no-referrer-when-downgrade"
                                    src="https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${encodeURIComponent(student.address)}&zoom=15&language=ko">
                                </iframe>
                            </div>
                        ` : ''}
                    </div>
                    
                    <!-- 4단: 자기소개 & 비고 -->
                    <div class="grid grid-cols-1 ${student.introduction || student.self_introduction ? 'lg:grid-cols-2' : ''} gap-6">
                        ${student.introduction || student.self_introduction ? `
                            <div class="bg-white rounded-xl shadow-md p-6 border border-gray-200">
                                <h4 class="text-xl font-bold text-gray-800 mb-5 flex items-center border-b pb-3">
                                    <div class="bg-purple-500 rounded-lg p-2 mr-3">
                                        <i class="fas fa-user-edit text-white"></i>
                                    </div>
                                    자기소개
                                </h4>
                                <div class="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-xl border-l-4 border-purple-500 min-h-[150px]">
                                    <p class="text-gray-700 whitespace-pre-wrap leading-relaxed text-base">${student.introduction || student.self_introduction}</p>
                                </div>
                            </div>
                        ` : ''}
                        
                        ${student.notes ? `
                            <div class="bg-white rounded-xl shadow-md p-6 border border-gray-200">
                                <h4 class="text-xl font-bold text-gray-800 mb-5 flex items-center border-b pb-3">
                                    <div class="bg-yellow-500 rounded-lg p-2 mr-3">
                                        <i class="fas fa-sticky-note text-white"></i>
                                    </div>
                                    비고 및 특이사항
                                </h4>
                                <div class="bg-yellow-50 p-6 rounded-xl border-l-4 border-yellow-500 min-h-[150px]">
                                    <p class="text-gray-700 whitespace-pre-wrap leading-relaxed text-base">${student.notes}</p>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
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
                        ${(() => {
                            // 현재 선택된 과정 필터 가져오기
                            const courseFilter = document.getElementById('filter-course')?.value || '';
                            let filteredStudents = students;
                            
                            // 과정 필터 적용
                            if (courseFilter) {
                                filteredStudents = students.filter(s => s.course_code === courseFilter);
                            }
                            
                            // 이름순 정렬
                            return filteredStudents.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ko')).map(s => {
                                const course = courses.find(c => c.code === s.course_code);
                                const courseName = course ? course.name || course.code : '-';
                                return `
                                    <option value="${s.id}" ${existingCounseling?.student_id === s.id ? 'selected' : ''}>
                                        ${s.name}(${s.code}) - ${courseName} - ${s.birth_date ? s.birth_date.split('T')[0] : '-'} - ${s.final_school || '-'}
                                    </option>
                                `;
                            }).join('');
                        })()}
                    </select>
                </div>
                <div>
                    <label class="block text-gray-700 mb-2">상담 선생님 *</label>
                    <select name="instructor_code" required class="w-full px-3 py-2 border rounded-lg">
                        <option value="">선택하세요</option>
                        ${[...instructors].sort((a, b) => a.name.localeCompare(b.name, 'ko')).map(i => {
                            const loggedInInstructor = JSON.parse(localStorage.getItem('instructor') || '{}');
                            const isLoggedInInstructor = i.code === loggedInInstructor.code;
                            const isSelected = existingCounseling?.instructor_code === i.code || (!existingCounseling && isLoggedInInstructor);
                            return `
                            <option value="${i.code}" ${isSelected ? 'selected' : ''}>
                                ${i.name}-${i.instructor_type_name || '강사'}${isLoggedInInstructor ? ' (나)' : ''}
                            </option>
                        `}).join('')}
                    </select>
                </div>
                <div>
                    <label class="block text-gray-700 mb-2">상담 날짜 *</label>
                    <input type="date" name="consultation_date" 
                           value="${existingCounseling?.consultation_date?.substring(0, 10) || new Date().toISOString().split('T')[0]}" 
                           placeholder="${new Date().toISOString().split('T')[0]}"
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
                <div>
                    <label class="block text-gray-700 mb-2">진로결정</label>
                    <select name="career_decision" class="w-full px-3 py-2 border rounded-lg">
                        <option value="">-- 선택 안 함 --</option>
                        <option value="1. 학업" ${existingCounseling?.career_decision === '1. 학업' ? 'selected' : ''}>1. 학업</option>
                        <option value="2. 취업" ${existingCounseling?.career_decision === '2. 취업' ? 'selected' : ''}>2. 취업</option>
                        <option value="3. 창업" ${existingCounseling?.career_decision === '3. 창업' ? 'selected' : ''}>3. 창업</option>
                        <option value="4. 미정" ${existingCounseling?.career_decision === '4. 미정' ? 'selected' : ''}>4. 미정</option>
                        <option value="5. 기타" ${existingCounseling?.career_decision === '5. 기타' ? 'selected' : ''}>5. 기타</option>
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
                        <i class="fas fa-paperclip mr-2"></i>사진 및 파일 첨부 (그림파일, PDF, HWP, PPT, Excel, Word, TXT 등)
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
                        <input type="file" id="counseling-file-input" accept="image/*,.pdf,.ppt,.pptx,.xls,.xlsx,.doc,.docx,.txt,.hwp" multiple 
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
                            최대 20MB, 이미지/PDF 형식 (이미지는 자동 압축)
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
    const formDiv = document.getElementById('counseling-form');
    if (formDiv) {
        formDiv.classList.add('hidden');
    }
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
        photo_urls: photoUrls,  // 사진 URL 추가
        career_decision: formData.get('career_decision') || null  // 진로결정 추가
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
        
        // 캐시 삭제
        window.clearCache('counselings');
        
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
    
    // 파일 검증
    for (let file of files) {
        const validation = window.validateFile(file);
        if (!validation.valid) {
            window.showAlert(validation.message);
            event.target.value = '';
            return;
        }
    }
    
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
            
            // 이미지 자동 압축 (PDF는 그대로)
            let processedFile = file;
            if (file.type.startsWith('image/')) {
                try {
                    processedFile = await window.compressImage(file);
                    console.log(`이미지 압축: ${(file.size / 1024).toFixed(1)}KB → ${(processedFile.size / 1024).toFixed(1)}KB`);
                } catch (error) {
                    console.error('이미지 압축 실패, 원본 사용:', error);
                    processedFile = file;
                }
            }
            
            const formData = new FormData();
            formData.append('file', processedFile);
            
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
                // URL과 원본 파일명을 함께 저장 (URL#원본파일명 형식)
                const urlWithOriginalName = response.data.original_filename 
                    ? `${response.data.url}#${encodeURIComponent(response.data.original_filename)}`
                    : response.data.url;
                photoUrls.push(urlWithOriginalName);
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
    
    previewDiv.innerHTML = photoUrls.map((url, idx) => 
        window.createFilePreviewItem(url, idx, 'window.removeCounselingPhoto')
    ).join('');
}

window.editCounseling = function(counselingId) {
    window.showCounselingForm(counselingId);
}

window.deleteCounseling = async function(counselingId) {
    const counseling = counselings.find(c => c.id === counselingId);
    if (!counseling) return;
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    const message = `❗ 상담 기록 삭제 확인\n\n학생: ${counseling.student_name}\n상담일: ${counseling.counseling_date}\n상담선생님: ${counseling.instructor_name || '미정'}\n\n정말 삭제하시겠습니까?`;
    const confirmed = await window.showConfirm(message);
    if (!confirmed) return;
    
    try {
        await axios.delete(`${API_BASE_URL}/api/counselings/${counselingId}`);
        window.clearCache('counselings');
        window.showAlert('✅ 상담이 삭제되었습니다.');
        loadCounselings();
    } catch (error) {
        console.error('상담 삭제 실패:', error);
        window.showAlert('❌ 삭제 실패: ' + (error.response?.data?.detail || error.message));
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
                    <option value="5. 가디언" ${existingCode && existingCode.type === '5. 가디언' ? 'selected' : ''}>5. 가디언</option>
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
        console.log('🚀 강사 데이터 로딩 시작...');
        window.showLoading('강사 데이터를 불러오는 중...');
        const [instructorsData, typesData] = await Promise.all([
            window.getCachedData('instructors', () => axios.get(`${API_BASE_URL}/api/instructors`).then(r => r.data)),
            window.getCachedData('instructor-codes', () => axios.get(`${API_BASE_URL}/api/instructor-codes`).then(r => r.data))
        ]);
        instructors = instructorsData;
        instructorTypes = typesData;
        console.log('✅ 강사 데이터 로드 완료:', { instructors: instructors.length, types: instructorTypes.length });
        renderInstructors();
        window.hideLoading();
    } catch (error) {
        window.hideLoading();
        console.error('❌ 강사 목록 로드 실패:', error);
        document.getElementById('app').innerHTML = `
            <div class="p-6">
                <div class="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p class="text-red-600 mb-3">강사 목록을 불러오는데 실패했습니다: ${error.message}</p>
                    <button onclick="location.reload()" class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded">
                        <i class="fas fa-sync mr-2"></i>새로고침
                    </button>
                </div>
            </div>
        `;
    }
}

function renderInstructors() {
    // 초기 로딩 시 이름순으로 정렬
    const sortedInstructors = [...instructors].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ko'));
    
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
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                    <label class="block text-gray-700 mb-2">강사구분 필터</label>
                    <select id="instructor-type-filter" class="w-full border rounded px-3 py-2" onchange="window.filterInstructors()">
                        <option value="" selected>-- 전체 강사구분 --</option>
                        ${instructorTypes
                            .sort((a, b) => a.name.localeCompare(b.name, 'ko'))
                            .map(type => `
                            <option value="${type.code}">${type.name}</option>
                        `).join('')}
                    </select>
                </div>
                <div>
                    <label class="block text-gray-700 mb-2">정렬</label>
                    <select id="instructor-sort" class="w-full border rounded px-3 py-2" onchange="window.filterInstructors()">
                        <option value="name" selected>이름순</option>
                        <option value="code">강사코드순</option>
                    </select>
                </div>
                <div>
                    <label class="block text-gray-700 mb-2">검색 (이름, 전공)</label>
                    <input type="text" id="instructor-search" placeholder="검색어 입력..." class="w-full border rounded px-3 py-2" onkeyup="window.filterInstructors()" autocomplete="off" autocomplete="new-password" readonly onfocus="this.removeAttribute('readonly');">
                </div>
            </div>
            
            <div id="instructor-form" class="hidden mb-6 p-4 bg-gray-50 rounded-lg"></div>
            
            <!-- 비밀번호 변경 모달 (주강사 전용) -->
            ${isMainInstructor() ? `
                <div id="password-change-modal" class="hidden mb-6">
                    <div class="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
                        <div class="flex justify-between items-start mb-4">
                            <h3 class="text-lg font-bold text-gray-800">
                                <i class="fas fa-key mr-2 text-blue-600"></i>비밀번호 변경 (주강사 전용)
                            </h3>
                            <button onclick="window.hidePasswordChangeModal()" class="text-gray-600 hover:text-gray-800">
                                <i class="fas fa-times text-xl"></i>
                            </button>
                        </div>
                        
                        <div class="bg-white rounded p-4 mb-4">
                            <p class="text-sm text-blue-800 mb-2">
                                <i class="fas fa-info-circle mr-2"></i>
                                <strong>대상 강사:</strong> <span id="pwd-target-instructor" class="font-bold"></span>
                            </p>
                            <p class="text-xs text-gray-600">
                                기본 비밀번호는 <code class="bg-gray-100 px-2 py-0.5 rounded">kdt2025</code>입니다.
                            </p>
                        </div>
                        
                        <input type="hidden" id="pwd-instructor-code-modal">
                        
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">
                                    새 비밀번호 *
                                </label>
                                <input type="password" id="pwd-new-password-modal" 
                                       placeholder="새 비밀번호 입력" 
                                       class="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500">
                                <p class="text-xs text-gray-500 mt-1">
                                    <i class="fas fa-lock mr-1"></i>영문, 숫자 조합 4자 이상
                                </p>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">
                                    비밀번호 확인 *
                                </label>
                                <input type="password" id="pwd-confirm-password-modal" 
                                       placeholder="비밀번호 재입력" 
                                       class="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500">
                            </div>
                        </div>
                        
                        <div class="mt-4 flex space-x-2">
                            <button onclick="window.changePasswordFromModal()" 
                                    class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition">
                                <i class="fas fa-save mr-2"></i>변경
                            </button>
                            <button onclick="window.resetPasswordFromModal()" 
                                    class="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition">
                                <i class="fas fa-redo mr-2"></i>기본값으로 초기화
                            </button>
                            <button onclick="window.hidePasswordChangeModal()" 
                                    class="bg-gray-300 hover:bg-gray-400 text-gray-800 px-6 py-2 rounded-lg transition">
                                취소
                            </button>
                        </div>
                    </div>
                </div>
            ` : ''}
            
            <div class="overflow-x-auto">
                <table class="min-w-full bg-white">
                    <thead class="bg-gray-100">
                        <tr>
                            <th class="px-2 py-2 text-center w-12">사진</th>
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
                        ${sortedInstructors.map(inst => `
                            <tr class="border-t hover:bg-gray-50">
                                <td class="px-2 py-2 text-center">
                                    ${inst.photo_urls && JSON.parse(inst.photo_urls || '[]').length > 0 ? `
                                        <button onclick='window.showPhotoViewer(${JSON.stringify(inst.photo_urls)}, 0)' 
                                                class="text-green-600 hover:text-green-700" 
                                                title="${JSON.parse(inst.photo_urls).length}개 사진">
                                            <i class="fas fa-camera"></i>
                                        </button>
                                    ` : `
                                        <i class="fas fa-camera text-gray-300" title="사진 없음"></i>
                                    `}
                                </td>
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
                                    <button onclick="window.editInstructor('${inst.code}')" class="text-blue-600 hover:text-blue-800 mr-2" title="수정">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    ${isMainInstructor() ? `
                                        <button onclick="window.showPasswordChangeModal('${inst.code}', '${inst.name}')" class="text-green-600 hover:text-green-800 mr-2" title="비밀번호 변경">
                                            <i class="fas fa-key"></i>
                                        </button>
                                    ` : ''}
                                    <button onclick="window.deleteInstructor('${inst.code}')" class="text-red-600 hover:text-red-800" title="삭제">
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
    
    // 검색 필드 강제 초기화 (여러 번 시도)
    const clearSearchField = () => {
        const searchInput = document.getElementById('instructor-search');
        if (searchInput) {
            searchInput.value = '';
            searchInput.defaultValue = '';
            // 입력 이벤트 강제 발생하여 브라우저 캐시 무효화
            searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
    };
    
    // 즉시 실행
    clearSearchField();
    // 약간의 지연 후 다시 실행
    setTimeout(clearSearchField, 0);
    setTimeout(clearSearchField, 50);
    setTimeout(clearSearchField, 100);
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
        
        // 정렬 적용
        const sortBy = document.getElementById('instructor-sort').value;
        if (sortBy === 'name') {
            filteredInstructors.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ko'));
        } else if (sortBy === 'code') {
            filteredInstructors.sort((a, b) => (a.code || '').localeCompare(b.code || ''));
        }
        
        const tbody = document.getElementById('instructor-list');
        if (filteredInstructors.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" class="px-4 py-8 text-center text-gray-500">
                        <i class="fas fa-search mr-2"></i>
                        조건에 맞는 강사가 없습니다
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = filteredInstructors.map(inst => `
            <tr class="border-t hover:bg-gray-50">
                <td class="px-2 py-2 text-center">
                    ${inst.photo_urls && JSON.parse(inst.photo_urls || '[]').length > 0 ? `
                        <i class="fas fa-camera text-green-600" title="${JSON.parse(inst.photo_urls).length}개 사진"></i>
                    ` : `
                        <i class="fas fa-camera text-gray-300" title="사진 없음"></i>
                    `}
                </td>
                <td class="px-4 py-2">${inst.code}</td>
                <td class="px-4 py-2">${inst.name}</td>
                <td class="px-4 py-2">${inst.major || ''}</td>
                <td class="px-4 py-2">${inst.instructor_type_name || inst.type_name || ''}</td>
                <td class="px-4 py-2">${inst.instructor_type_type || ''}</td>
                <td class="px-4 py-2">${inst.phone || ''}</td>
                <td class="px-4 py-2">${inst.email || ''}</td>
                <td class="px-4 py-2">
                    <button onclick="window.editInstructor('${inst.code}')" class="text-blue-600 hover:text-blue-800 mr-2" title="수정">
                        <i class="fas fa-edit"></i>
                    </button>
                    ${isMainInstructor() ? `
                        <button onclick="window.showPasswordChangeModal('${inst.code}', '${inst.name}')" class="text-green-600 hover:text-green-800 mr-2" title="비밀번호 변경">
                            <i class="fas fa-key"></i>
                        </button>
                    ` : ''}
                    <button onclick="window.deleteInstructor('${inst.code}')" class="text-red-600 hover:text-red-800" title="삭제">
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
                <i class="fas fa-paperclip mr-2"></i>사진 및 파일 첨부 (그림파일, PDF, HWP, PPT, Excel, Word, TXT 등)
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
                <input type="file" id="instructor-file-input" accept="image/*,.pdf,.ppt,.pptx,.xls,.xlsx,.doc,.docx,.txt,.hwp" multiple 
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
    
    // 폼으로 스크롤
    formDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
    
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (!confirm('이 강사를 삭제하시겠습니까?')) return;
    
    try {
        await axios.delete(`${API_BASE_URL}/api/instructors/${code}`);
        alert('강사가 삭제되었습니다.');
        loadInstructors();
    } catch (error) {
        alert('삭제 실패: ' + error.response?.data?.detail || error.message);
    }
}

// ==================== 비밀번호 관리 (주강사 전용) ====================

window.showPasswordChangeModal = function(code, name) {
    const modal = document.getElementById('password-change-modal');
    if (!modal) return;
    
    document.getElementById('pwd-instructor-code-modal').value = code;
    document.getElementById('pwd-target-instructor').textContent = `${name} (${code})`;
    document.getElementById('pwd-new-password-modal').value = '';
    document.getElementById('pwd-confirm-password-modal').value = '';
    modal.classList.remove('hidden');
    
    // 스크롤을 모달 위치로 이동
    modal.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

window.hidePasswordChangeModal = function() {
    const modal = document.getElementById('password-change-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

window.changePasswordFromModal = async function() {
    const instructorCode = document.getElementById('pwd-instructor-code-modal').value;
    const newPassword = document.getElementById('pwd-new-password-modal').value;
    const confirmPassword = document.getElementById('pwd-confirm-password-modal').value;
    
    if (!newPassword || !confirmPassword) {
        alert('새 비밀번호를 입력해주세요.');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        alert('비밀번호가 일치하지 않습니다.');
        return;
    }
    
    if (newPassword.length < 4) {
        alert('비밀번호는 최소 4자 이상이어야 합니다.');
        return;
    }
    
    try {
        await axios.post(`${API_BASE_URL}/api/auth/change-password`, {
            instructor_code: instructorCode,
            new_password: newPassword
        });
        
        alert('비밀번호가 변경되었습니다.');
        window.hidePasswordChangeModal();
    } catch (error) {
        alert('비밀번호 변경 실패: ' + (error.response?.data?.detail || error.message));
    }
}

window.resetPasswordFromModal = async function() {
    const instructorCode = document.getElementById('pwd-instructor-code-modal').value;
    const targetName = document.getElementById('pwd-target-instructor').textContent;
    
    if (!confirm(`${targetName}의 비밀번호를 기본값(kdt2025)으로 초기화하시겠습니까?`)) {
        return;
    }
    
    try {
        await axios.post(`${API_BASE_URL}/api/auth/change-password`, {
            instructor_code: instructorCode,
            new_password: 'kdt2025'
        });
        
        alert('비밀번호가 초기화되었습니다. (기본값: kdt2025)');
        window.hidePasswordChangeModal();
    } catch (error) {
        alert('비밀번호 초기화 실패: ' + (error.response?.data?.detail || error.message));
    }
}

// 강사 사진 업로드 핸들러
window.handleInstructorImageUpload = async function(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    // 파일 검증
    for (let file of files) {
        const validation = window.validateFile(file);
        if (!validation.valid) {
            window.showAlert(validation.message);
            event.target.value = '';
            return;
        }
    }
    
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
                // URL과 원본 파일명을 함께 저장 (URL#원본파일명 형식)
                const urlWithOriginalName = response.data.original_filename 
                    ? `${response.data.url}#${encodeURIComponent(response.data.original_filename)}`
                    : response.data.url;
                photoUrls.push(urlWithOriginalName);
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
    
    previewDiv.innerHTML = photoUrls.map((url, index) => 
        window.createFilePreviewItem(url, index, 'window.removeInstructorPhoto')
    ).join('');
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
                        <label class="block text-xs text-gray-600 mb-2">현장실습</label>
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
                        <div class="text-xs text-gray-600 mt-1">= 이론(${lectureDays}) + 프로젝트(${projectDays}) + 현장실습(${internDays})</div>
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
                                <th class="px-3 py-2 text-left text-xs">현장실습종료</th>
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
                    <label class="block text-sm font-medium text-gray-700 mb-2">정렬</label>
                    <select id="projects-sort-filter" onchange="window.filterProjects()" class="w-full border rounded px-3 py-2">
                        <option value="">기본 순서</option>
                        <option value="name-asc">팀명 (가나다순)</option>
                        <option value="name-desc">팀명 (역순)</option>
                        <option value="member-name-asc">팀원1 이름순</option>
                        <option value="member-code-asc">팀원1 코드순</option>
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
                   p.member5_code === projectsFilterStudent ||
                   p.member6_code === projectsFilterStudent;
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
            const matchMember6 = (p.member6_name || '').toLowerCase().includes(projectsSearchQuery);
            return matchName || matchMember1 || matchMember2 || matchMember3 || matchMember4 || matchMember5 || matchMember6;
        });
    }
    
    // 정렬
    const sortFilter = document.getElementById('projects-sort-filter');
    const sortType = sortFilter ? sortFilter.value : '';
    
    if (sortType === 'name-asc') {
        filteredProjects.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ko'));
    } else if (sortType === 'name-desc') {
        filteredProjects.sort((a, b) => (b.name || '').localeCompare(a.name || '', 'ko'));
    } else if (sortType === 'member-name-asc') {
        filteredProjects.sort((a, b) => (a.member1_name || '').localeCompare(b.member1_name || '', 'ko'));
    } else if (sortType === 'member-code-asc') {
        filteredProjects.sort((a, b) => (a.member1_code || '').localeCompare(b.member1_code || ''));
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
                        <th class="px-2 py-2 text-center text-xs font-medium text-gray-700 w-12">사진</th>
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
                        <th class="px-4 py-2 text-left text-xs font-medium text-gray-700">팀원6</th>
                        <th class="px-4 py-2 text-left text-xs font-medium text-gray-700">작업</th>
                    </tr>
                </thead>
                <tbody>
                    ${filteredProjects.map(p => {
                        const photoUrls = p.photo_urls ? (typeof p.photo_urls === 'string' ? JSON.parse(p.photo_urls) : p.photo_urls) : [];
                        return `
                        <tr class="border-t hover:bg-gray-50">
                            <td class="px-2 py-2 text-center text-xs">
                                ${photoUrls.length > 0 ? `
                                    <i class="fas fa-camera text-green-600" title="${photoUrls.length}개 사진"></i>
                                ` : `
                                    <i class="fas fa-camera text-gray-300" title="사진 없음"></i>
                                `}
                            </td>
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
                            <td class="px-4 py-2 text-xs">${p.member6_name || '-'}</td>
                            <td class="px-4 py-2 text-xs">
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
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">팀 코드</label>
                <input type="text" id="proj-code" placeholder="팀코드" value="${existing ? existing.code : autoCode}" ${code ? 'readonly' : 'readonly'} class="border rounded px-3 py-2 w-full bg-gray-100">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">팀명 *</label>
                <input type="text" id="proj-name" placeholder="팀명" value="${existing ? existing.name : ''}" class="border rounded px-3 py-2 w-full">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">설명</label>
                <input type="text" id="proj-description" placeholder="프로젝트 설명" value="${existing ? existing.description || '' : ''}" class="border rounded px-3 py-2 w-full">
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
        
        <h4 class="font-semibold mb-2">팀원 정보 (최대 6명)</h4>
        <div class="space-y-2">
            ${[1, 2, 3, 4, 5, 6].map(i => `
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
                <i class="fas fa-paperclip mr-2"></i>사진 및 파일 첨부 (그림파일, PDF, HWP, PPT, Excel, Word, TXT 등)
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
                <input type="file" id="project-file-input" accept="image/*,.pdf,.ppt,.pptx,.xls,.xlsx,.doc,.docx,.txt,.hwp" multiple 
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
    
    // 폼으로 스크롤
    formDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
    
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
    
    // 학생 목록을 이름순으로 정렬
    const sortedStudents = filteredStudents.sort((a, b) => 
        (a.name || '').localeCompare(b.name || '', 'ko')
    );
    
    // 각 팀원 선택 드롭다운 업데이트 (member6 포함)
    for (let i = 1; i <= 6; i++) {
        const select = document.getElementById(`member${i}-select`);
        const nameInput = document.getElementById(`member${i}-name`);
        const codeInput = document.getElementById(`member${i}-code`);
        
        if (select) {
            const currentValue = codeInput ? codeInput.value : '';
            select.innerHTML = `
                <option value="">선택 안함</option>
                ${sortedStudents.map(s => {
                    const course = courses.find(c => c.code === s.course_code);
                    const courseName = course ? course.name || course.code : '-';
                    return `
                        <option value="${s.code}" ${s.code === currentValue ? 'selected' : ''}>
                            ${s.name}(${s.code}) - ${courseName} - ${s.birth_date ? s.birth_date.split('T')[0] : '-'} - ${s.final_school || '-'}
                        </option>
                    `;
                }).join('')}
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
    const description = document.getElementById('proj-description').value;
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
        description: description || null,
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
        member6_name: document.getElementById('member6-name').value,
        member6_phone: document.getElementById('member6-phone').value,
        member6_code: document.getElementById('member6-code').value,
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
                window.showAlert('팀 정보가 수정되었습니다.');
                window.hideProjectForm();
                await loadProjects();
            }
        } else {
            await axios.post(`${API_BASE_URL}/api/projects`, data);
            if (!autoSave) {
                window.showAlert('팀이 추가되었습니다.');
                window.hideProjectForm();
                await loadProjects();
            }
        }
    } catch (error) {
        window.showAlert('저장 실패: ' + (error.response?.data?.detail || error.message));
    }
}

window.editProject = function(code) {
    window.showProjectForm(code);
}

window.deleteProject = async function(code) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

    // 파일 검증
    for (let file of files) {
        const validation = window.validateFile(file);
        if (!validation.valid) {
            window.showAlert(validation.message);
            event.target.value = '';
            return;
        }
    }

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

            const response = await axios.post(`${API_BASE_URL}/api/upload-image?category=team`, formData, {
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

    previewDiv.innerHTML = photoUrls.map((url, idx) => 
        window.createFilePreviewItem(url, idx, 'window.removeProjectPhoto')
    ).join('');
}

// ==================== 팀 활동일지 관리 ====================
let teamActivityLogs = [];
let selectedProjectForLogs = null;

async function loadTeamActivityLogs() {
    try {
        window.showLoading('팀 활동일지 데이터를 불러오는 중...');
        const [projectsRes, logsRes, instructorsRes] = await Promise.all([
            axios.get(`${API_BASE_URL}/api/projects`),
            axios.get(`${API_BASE_URL}/api/team-activity-logs`),
            axios.get(`${API_BASE_URL}/api/instructors`)
        ]);
        projects = projectsRes.data;
        teamActivityLogs = logsRes.data;
        instructors = instructorsRes.data;
        renderTeamActivityLogs();
        window.hideLoading();
    } catch (error) {
        window.hideLoading();
        console.error('팀 활동일지 로드 실패:', error);
        document.getElementById('app').innerHTML = '<div class="text-red-600 p-4">팀 활동일지를 불러오는데 실패했습니다.</div>';
    }
}

function renderTeamActivityLogs() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="bg-white rounded-lg shadow-md p-6">
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-2xl font-bold text-gray-800">
                    <i class="fas fa-clipboard-list mr-2"></i>팀 활동일지 관리
                </h2>
                <button onclick="window.showTeamActivityLogForm()" class="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg">
                    <i class="fas fa-plus mr-2"></i>활동일지 추가
                </button>
            </div>
            
            <div class="mb-6">
                <label class="block text-gray-700 mb-2">팀 선택 (필터링)</label>
                <select id="team-select" class="w-full border rounded px-3 py-2" onchange="window.filterTeamActivityLogs()">
                    <option value="">전체 팀</option>
                    ${projects.map(p => `<option value="${p.id}">${p.name} (${p.code})</option>`).join('')}
                </select>
            </div>
            
            <div id="team-activity-logs-list">
                <p class="text-gray-500 text-center py-8">팀을 선택하여 활동일지를 조회하세요</p>
            </div>
        </div>
    `;
    
    // 초기 로딩 시 전체 팀 활동일지 표시
    window.filterTeamActivityLogs();
}

window.filterTeamActivityLogs = function() {
    const projectId = document.getElementById('team-select').value;
    
    let filteredLogs;
    if (!projectId) {
        // 전체 팀의 활동일지 표시
        filteredLogs = teamActivityLogs
            .sort((a, b) => new Date(b.activity_date) - new Date(a.activity_date))
            .map(log => {
                const project = projects.find(p => p.id === log.project_id);
                return { ...log, project_name: project?.name || '팀명 없음' };
            });
        selectedProjectForLogs = null;
    } else {
        // 특정 팀의 활동일지 표시
        selectedProjectForLogs = parseInt(projectId);
        filteredLogs = teamActivityLogs.filter(log => log.project_id === selectedProjectForLogs)
            .sort((a, b) => new Date(b.activity_date) - new Date(a.activity_date));
        const project = projects.find(p => p.id === selectedProjectForLogs);
        filteredLogs = filteredLogs.map(log => ({
            ...log,
            project_name: project?.name || '팀명 없음'
        }));
    }
    
    const title = selectedProjectForLogs 
        ? `${filteredLogs[0]?.project_name || '팀'} 활동일지` 
        : '전체 팀 활동일지';
    
    document.getElementById('team-activity-logs-list').innerHTML = `
        <h3 class="text-lg font-semibold mb-4">${title} (${filteredLogs.length}건)</h3>
        ${filteredLogs.length > 0 ? `
            <div class="overflow-x-auto">
                <table class="min-w-full bg-white border">
                    <thead class="bg-gray-100">
                        <tr>
                            <th class="px-3 py-2 text-left text-xs border">사진</th>
                            ${!selectedProjectForLogs ? '<th class="px-3 py-2 text-left text-xs border">팀명</th>' : ''}
                            <th class="px-3 py-2 text-left text-xs border">날짜</th>
                            <th class="px-3 py-2 text-left text-xs border">유형</th>
                            <th class="px-3 py-2 text-left text-xs border">작성자</th>
                            <th class="px-3 py-2 text-left text-xs border">활동내용</th>
                            <th class="px-3 py-2 text-left text-xs border">성과</th>
                            <th class="px-3 py-2 text-left text-xs border">다음계획</th>
                            <th class="px-3 py-2 text-left text-xs border">작업</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filteredLogs.map(log => `
                            <tr class="border-t hover:bg-gray-50">
                                <td class="px-2 py-2 text-center text-xs border">
                                    ${log.photo_urls && JSON.parse(log.photo_urls || '[]').length > 0 ? `
                                        <button onclick='window.showPhotoViewer(${JSON.stringify(log.photo_urls)}, 0)' 
                                                class="text-green-600 hover:text-green-700" 
                                                title="${JSON.parse(log.photo_urls).length}개 사진">
                                            <i class="fas fa-camera"></i>
                                        </button>
                                    ` : `
                                        <i class="fas fa-camera text-gray-300"></i>
                                    `}
                                </td>
                                ${!selectedProjectForLogs ? `<td class="px-3 py-2 text-xs border"><span class="font-semibold text-pink-600">${log.project_name}</span></td>` : ''}
                                <td class="px-3 py-2 text-xs border">${log.activity_date}</td>
                                <td class="px-3 py-2 text-xs border">
                                    <span class="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">${log.activity_type || '팀 활동'}</span>
                                </td>
                                <td class="px-3 py-2 text-xs border">${log.instructor_code ? (instructors.find(i => i.code === log.instructor_code)?.name || log.instructor_code) : '-'}</td>
                                <td class="px-3 py-2 text-xs border max-w-xs">
                                    <div class="truncate" title="${(log.content || '-').replace(/"/g, '&quot;')}">${log.content || '-'}</div>
                                </td>
                                <td class="px-3 py-2 text-xs border max-w-xs">
                                    <div class="truncate" title="${(log.achievements || '-').replace(/"/g, '&quot;')}">${log.achievements || '-'}</div>
                                </td>
                                <td class="px-3 py-2 text-xs border max-w-xs">
                                    <div class="truncate" title="${(log.next_plan || '-').replace(/"/g, '&quot;')}">${log.next_plan || '-'}</div>
                                </td>
                                <td class="px-3 py-2 text-xs border">
                                    <button onclick="window.editTeamActivityLog(${log.id})" class="text-blue-600 hover:text-blue-800 mr-2" title="수정">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button onclick="window.deleteTeamActivityLog(${log.id})" class="text-red-600 hover:text-red-800" title="삭제">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        ` : `
            <p class="text-gray-500 text-center py-8">작성된 활동일지가 없습니다</p>
        `}
    `;
}

window.showTeamActivityLogForm = function(logId = null) {
    const log = logId ? teamActivityLogs.find(l => l.id === logId) : null;
    const preselectedProjectId = log?.project_id || selectedProjectForLogs || '';
    
    const formHtml = `
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" id="team-log-modal">
            <div class="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <h3 class="text-xl font-bold mb-4">
                    ${logId ? '활동일지 수정' : '활동일지 추가'}
                </h3>
                <form id="team-log-form">
                    <input type="hidden" id="log-id" value="${logId || ''}">
                    
                    <div class="mb-4">
                        <label class="block text-gray-700 mb-2">팀 선택 *</label>
                        <select id="log-project-id" required class="w-full border rounded px-3 py-2">
                            <option value="">팀을 선택하세요</option>
                            ${projects.map(p => `<option value="${p.id}" ${p.id == preselectedProjectId ? 'selected' : ''}>${p.name} (${p.code})</option>`).join('')}
                        </select>
                    </div>
                    
                    <div class="mb-4">
                        <label class="block text-gray-700 mb-2">작성자 *</label>
                        <select id="log-instructor-code" required class="w-full border rounded px-3 py-2">
                            <option value="">작성자를 선택하세요</option>
                            ${(() => {
                                const loggedInInstructor = JSON.parse(localStorage.getItem('instructor') || '{}');
                                return [...instructors].sort((a, b) => a.name.localeCompare(b.name, 'ko')).map(inst => {
                                    const isCurrentUser = inst.code === loggedInInstructor.code;
                                    // 항상 접속자를 기본 선택 (추가 모드와 수정 모드 모두)
                                    const isSelected = isCurrentUser;
                                    return `<option value="${inst.code}" ${isSelected ? 'selected' : ''}>${inst.name}-${inst.instructor_type_name || '강사'}${isCurrentUser ? ' (나)' : ''}</option>`;
                                }).join('');
                            })()}
                        </select>
                    </div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label class="block text-gray-700 mb-2">활동일자 *</label>
                            <input type="date" id="log-date" value="${log?.activity_date || new Date(new Date().getTime() + (9 * 60 * 60 * 1000)).toISOString().split('T')[0]}" required class="w-full border rounded px-3 py-2">
                        </div>
                        <div>
                            <label class="block text-gray-700 mb-2">활동유형</label>
                            <select id="log-type" class="w-full border rounded px-3 py-2">
                                <option value="팀 활동" ${log?.activity_type === '팀 활동' ? 'selected' : ''}>팀 활동</option>
                                <option value="회의" ${log?.activity_type === '회의' ? 'selected' : ''}>회의</option>
                                <option value="프로젝트" ${log?.activity_type === '프로젝트' ? 'selected' : ''}>프로젝트</option>
                                <option value="발표" ${log?.activity_type === '발표' ? 'selected' : ''}>발표</option>
                                <option value="기타" ${log?.activity_type === '기타' ? 'selected' : ''}>기타</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="mb-4">
                        <label class="block text-gray-700 mb-2">활동내용 *</label>
                        <textarea id="log-content" rows="4" required class="w-full border rounded px-3 py-2">${log?.content || ''}</textarea>
                    </div>
                    
                    <div class="mb-4">
                        <label class="block text-gray-700 mb-2">성과</label>
                        <textarea id="log-achievements" rows="3" class="w-full border rounded px-3 py-2">${log?.achievements || ''}</textarea>
                    </div>
                    
                    <div class="mb-4">
                        <label class="block text-gray-700 mb-2">다음계획</label>
                        <textarea id="log-next-plan" rows="3" class="w-full border rounded px-3 py-2">${log?.next_plan || ''}</textarea>
                    </div>
                    
                    <div class="mb-4">
                        <label class="block text-gray-700 mb-2">비고</label>
                        <textarea id="log-notes" rows="2" class="w-full border rounded px-3 py-2">${log?.notes || ''}</textarea>
                    </div>
                    
                    <!-- 사진 업로드 -->
                    <div class="mb-4">
                        <label class="block text-gray-700 mb-2">
                            <i class="fas fa-paperclip mr-2"></i>사진 및 파일 첨부 (그림파일, PDF, HWP, PPT, Excel, Word, TXT 등)
                        </label>
                        <div class="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
                            <div class="flex flex-wrap gap-2 mb-3">
                                <button type="button" onclick="document.getElementById('team-log-file-input').click()" 
                                        class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
                                    <i class="fas fa-folder-open mr-2"></i>파일 선택
                                </button>
                                <button type="button" onclick="document.getElementById('team-log-camera-input').click()" 
                                        class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded">
                                    <i class="fas fa-camera mr-2"></i>사진 촬영
                                </button>
                            </div>
                            <div id="team-log-upload-progress" class="hidden mb-3">
                                <div class="bg-blue-50 border border-blue-200 rounded p-3">
                                    <p class="text-sm text-blue-800 mb-2">
                                        <i class="fas fa-cloud-upload-alt mr-2"></i>
                                        서버에 업로드 후 자동 저장됩니다. 잠시만 기다리세요...
                                    </p>
                                    <div class="w-full bg-blue-200 rounded-full h-2">
                                        <div id="team-log-progress-bar" class="bg-blue-600 h-2 rounded-full transition-all duration-300" style="width: 0%"></div>
                                    </div>
                                </div>
                            </div>
                            <input type="file" id="team-log-file-input" accept="image/*,.pdf,.ppt,.pptx,.xls,.xlsx,.doc,.docx,.txt,.hwp" multiple 
                                   onchange="window.handleTeamLogImageUpload(event)" class="hidden">
                            <input type="file" id="team-log-camera-input" accept="image/*" capture="environment" 
                                   onchange="window.handleTeamLogImageUpload(event)" class="hidden">
                            <div id="team-log-photos-preview" class="flex flex-col gap-2 mt-2">
                                ${log?.photo_urls ? JSON.parse(log.photo_urls).map((url, idx) => `
                                    <div class="relative group">
                                        <img src="${url}" class="w-full h-24 object-cover rounded border">
                                        <button type="button" onclick="window.removeTeamLogPhoto(${idx})" 
                                                class="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                                            <i class="fas fa-times text-xs"></i>
                                        </button>
                                    </div>
                                `).join('') : ''}
                            </div>
                            <input type="hidden" id="team-log-photo-urls" value='${log?.photo_urls || "[]"}'>
                            <p class="text-sm text-gray-500 mt-2">
                                <i class="fas fa-info-circle mr-1"></i>
                                최대 10MB, JPG/PNG/GIF 형식
                            </p>
                        </div>
                    </div>
                    
                    <div class="flex justify-end space-x-2">
                        <button type="button" onclick="window.closeTeamActivityLogForm()" class="bg-gray-400 hover:bg-gray-500 text-white px-6 py-2 rounded-lg">
                            취소
                        </button>
                        <button type="submit" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg">
                            <i class="fas fa-save mr-2"></i>저장
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', formHtml);
    
    document.getElementById('team-log-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await window.saveTeamActivityLog();
    });
}

window.closeTeamActivityLogForm = function() {
    const modal = document.getElementById('team-log-modal');
    if (modal) modal.remove();
}

window.saveTeamActivityLog = async function() {
    console.log('💾 saveTeamActivityLog 함수 호출됨');
    
    try {
        const logId = document.getElementById('log-id')?.value;
        const projectId = document.getElementById('log-project-id')?.value;
        
        console.log('📝 팀 활동일지 저장 시작:', { logId, projectId });
        
        if (!document.getElementById('log-project-id')) {
            console.error('❌ log-project-id 요소를 찾을 수 없습니다!');
            window.showAlert('폼 요소를 찾을 수 없습니다. 페이지를 새로고침해주세요.');
            return;
        }
        
        // 팀 선택 필수 검증
        if (!projectId) {
            window.showAlert('팀을 선택해주세요');
            return;
        }
        
        const instructorCode = document.getElementById('log-instructor-code').value;
        
        console.log('작성자 코드:', instructorCode);
        
        // 작성자 선택 필수 검증
        if (!instructorCode) {
            window.showAlert('작성자를 선택해주세요');
            return;
        }
        
        const content = document.getElementById('log-content').value;
        
        // 활동내용 필수 검증
        if (!content || content.trim() === '') {
            window.showAlert('활동내용을 입력해주세요');
            return;
        }
        
        // 저장 전 현재 선택된 팀 필터 값을 저장
        const currentTeamFilter = document.getElementById('team-select')?.value || '';
        console.log('💡 현재 팀 필터:', currentTeamFilter);
        
        const data = {
            project_id: parseInt(projectId),
            instructor_code: instructorCode,
            activity_date: document.getElementById('log-date').value,
            activity_type: document.getElementById('log-type').value,
            content: document.getElementById('log-content').value,
            achievements: document.getElementById('log-achievements').value,
            next_plan: document.getElementById('log-next-plan').value,
            notes: document.getElementById('log-notes').value,
            photo_urls: document.getElementById('team-log-photo-urls').value
        };
        
        console.log('저장 데이터:', data);
        
        if (logId) {
            console.log('수정 요청 시작...');
            await axios.put(`${API_BASE_URL}/api/team-activity-logs/${logId}`, data);
        } else {
            console.log('추가 요청 시작...');
            const response = await axios.post(`${API_BASE_URL}/api/team-activity-logs`, data);
            console.log('추가 응답:', response.data);
        }
        
        // 성공 메시지를 먼저 표시
        window.showAlert(logId ? '활동일지가 수정되었습니다' : '활동일지가 추가되었습니다');
        
        // 모달 닫고 데이터 새로고침
        window.closeTeamActivityLogForm();
        await loadTeamActivityLogs();
        
        // 이전에 선택했던 팀 필터 값으로 복원 (DOM이 다시 렌더링된 후)
        setTimeout(() => {
            const teamSelect = document.getElementById('team-select');
            if (teamSelect) {
                teamSelect.value = currentTeamFilter;
                window.filterTeamActivityLogs();
                console.log('✅ 팀 필터 복원됨:', currentTeamFilter);
            }
        }, 100);
    } catch (error) {
        console.error('저장 실패 - 전체 에러:', error);
        console.error('저장 실패 - 응답:', error.response);
        console.error('저장 실패 - 응답 데이터:', error.response?.data);
        window.showAlert('저장 실패: ' + (error.response?.data?.detail || error.message));
    }
}

window.editTeamActivityLog = function(logId) {
    const log = teamActivityLogs.find(l => l.id === logId);
    if (log) {
        selectedProjectForLogs = log.project_id;
        window.showTeamActivityLogForm(logId);
        setTimeout(() => window.scrollToForm('team-activity-log-form'), 100);
    }
}

window.deleteTeamActivityLog = async function(logId) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (!confirm('정말 삭제하시겠습니까?')) return;
    
    try {
        await axios.delete(`${API_BASE_URL}/api/team-activity-logs/${logId}`);
        window.showAlert('활동일지가 삭제되었습니다');
        await loadTeamActivityLogs();
        if (selectedProjectForLogs) {
            document.getElementById('team-select').value = selectedProjectForLogs;
            window.filterTeamActivityLogs();
        }
    } catch (error) {
        console.error('삭제 실패:', error);
        window.showAlert('삭제 실패: ' + (error.response?.data?.detail || error.message));
    }
}

// 팀 활동일지 사진 업로드 처리
window.handleTeamLogImageUpload = async function(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    // 파일 검증
    for (let file of files) {
        const validation = window.validateFile(file);
        if (!validation.valid) {
            window.showAlert(validation.message);
            event.target.value = '';
            return;
        }
    }
    
    const progressDiv = document.getElementById('team-log-upload-progress');
    const progressBar = document.getElementById('team-log-progress-bar');
    progressDiv.classList.remove('hidden');
    
    try {
        const currentPhotos = JSON.parse(document.getElementById('team-log-photo-urls').value || '[]');
        let uploadedCount = 0;
        
        for (let file of files) {
            // 이미지 압축 (PDF와 문서 파일은 압축 안 함)
            const compressedFile = await window.compressImage(file);
            
            const formData = new FormData();
            formData.append('file', compressedFile);
            
            const response = await axios.post(`${API_BASE_URL}/api/upload-image?category=team-log`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (e) => {
                    const percent = Math.round((e.loaded * 100) / e.total);
                    progressBar.style.width = percent + '%';
                }
            });
            
            if (response.data.success) {
                // URL과 원본 파일명을 함께 저장 (URL#원본파일명 형식)
                const urlWithOriginalName = response.data.original_filename 
                    ? `${response.data.url}#${encodeURIComponent(response.data.original_filename)}`
                    : response.data.url;
                currentPhotos.push(urlWithOriginalName);
                uploadedCount++;
            }
        }
        
        document.getElementById('team-log-photo-urls').value = JSON.stringify(currentPhotos);
        renderTeamLogPhotos();
        
        progressDiv.classList.add('hidden');
        progressBar.style.width = '0%';
        
        if (uploadedCount > 0) {
            window.showAlert(`${uploadedCount}개 사진이 업로드되었습니다`);
        }
    } catch (error) {
        progressDiv.classList.add('hidden');
        console.error('사진 업로드 실패:', error);
        window.showAlert('사진 업로드 실패: ' + (error.response?.data?.detail || error.message));
    }
    
    event.target.value = '';
}

window.removeTeamLogPhoto = function(index) {
    const photos = JSON.parse(document.getElementById('team-log-photo-urls').value || '[]');
    photos.splice(index, 1);
    document.getElementById('team-log-photo-urls').value = JSON.stringify(photos);
    renderTeamLogPhotos();
}

function renderTeamLogPhotos() {
    const photos = JSON.parse(document.getElementById('team-log-photo-urls').value || '[]');
    const previewDiv = document.getElementById('team-log-photos-preview');
    
    previewDiv.innerHTML = photos.map((url, idx) => 
        window.createFilePreviewItem(url, idx, 'window.removeTeamLogPhoto')
    ).join('');
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
    
    // 오늘 날짜 계산 (한국 시간 기준)
    const today = new Date(new Date().getTime() + (9 * 60 * 60 * 1000)).toISOString().split('T')[0];
    
    tbody.innerHTML = paginatedData.map(tt => {
        const duration = calculateDuration(tt.start_time, tt.end_time);
        const subject = subjects.find(s => s.code === tt.subject_code);
        const totalHours = subject ? subject.hours : 0;
        const isToday = tt.class_date === today;
        
        return `
        <tr class="border-t hover:bg-gray-50 ${isToday ? 'bg-yellow-100 border-l-4 border-yellow-500' : ''}" ${isToday ? 'id="today-timetable-row"' : ''}>
            <td class="px-3 py-2 text-xs ${isToday ? 'font-bold text-yellow-900' : ''}">${tt.class_date}${isToday ? ' <span class="text-yellow-600">(오늘)</span>' : ''}</td>
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
    
    // 오늘 날짜 행으로 자동 스크롤
    setTimeout(() => {
        const todayRow = document.getElementById('today-timetable-row');
        if (todayRow) {
            todayRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, 100);
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
                        ` : timetables.slice(0, 100).map(tt => {
                            // 오늘 날짜 계산 (한국 시간 기준)
                            const today = new Date(new Date().getTime() + (9 * 60 * 60 * 1000)).toISOString().split('T')[0];
                            const isToday = tt.class_date === today;
                            return `
                            <tr class="border-t hover:bg-gray-50 ${isToday ? 'bg-yellow-100 border-l-4 border-yellow-500' : ''}" ${isToday ? 'id="today-timetable-row"' : ''}>
                                <td class="px-3 py-2 text-xs ${isToday ? 'font-bold text-yellow-900' : ''}">${tt.class_date}${isToday ? ' <span class="text-yellow-600">(오늘)</span>' : ''}</td>
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
                        `;
                        }).join('')}
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
    
    // 오늘 날짜 행으로 자동 스크롤
    setTimeout(() => {
        const todayRow = document.getElementById('today-timetable-row');
        if (todayRow) {
            todayRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, 100);
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
    if (!timeStr) return 0;
    const parts = timeStr.split(':');
    const hours = parseInt(parts[0]) || 0;
    const minutes = parseInt(parts[1]) || 0;
    return hours * 3600 + minutes * 60;
}

function calculateDuration(startTime, endTime) {
    // startTime과 endTime이 문자열(HH:MM:SS 또는 HH:MM)인 경우
    if (typeof startTime === 'string' && typeof endTime === 'string') {
        const startSeconds = timeToSeconds(startTime);
        const endSeconds = timeToSeconds(endTime);
        const durationSeconds = endSeconds - startSeconds;
        return Math.round(durationSeconds / 3600 * 10) / 10; // 소수점 1자리 (예: 2.5시간)
    }
    
    // startTime과 endTime이 숫자(초)인 경우
    if (typeof startTime === 'number' && typeof endTime === 'number') {
        const durationSeconds = endTime - startTime;
        return Math.round(durationSeconds / 3600 * 10) / 10;
    }
    
    return 0;
}

// 날짜에 요일 추가하는 헬퍼 함수
function formatDateWithDay(dateStr) {
    if (!dateStr) return '-';
    
    // 이미 00.00.00 형식인 경우 그대로 반환
    if (/^\d{2}\.\d{2}\.\d{2}$/.test(dateStr)) {
        return dateStr;
    }
    
    // YYYY-MM-DD 형식인 경우 00.00.00으로 변환
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const parts = dateStr.split('-');
        return `${parts[0].substring(2)}.${parts[1]}.${parts[2]}`;
    }
    
    // 그 외의 경우 그대로 반환
    return dateStr;
}

// 생년월일을 표준 형식(YYYY-MM-DD)으로 변환하는 함수
function normalizeBirthDate(dateStr) {
    if (!dateStr) return null;
    
    // 이미 YYYY-MM-DD 형식인 경우
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return dateStr;
    }
    
    // 00.00.00 형식인 경우 20YY-MM-DD로 변환
    if (/^\d{2}\.\d{2}\.\d{2}$/.test(dateStr)) {
        const parts = dateStr.split('.');
        const year = parseInt(parts[0]);
        const fullYear = year >= 0 && year <= 30 ? `20${parts[0]}` : `19${parts[0]}`;
        return `${fullYear}-${parts[1]}-${parts[2]}`;
    }
    
    return dateStr;
}

// 전화번호를 표준 형식(010-0000-0000)으로 변환하는 함수
function normalizePhone(phone) {
    if (!phone) return null;
    
    // 숫자만 추출
    const numbers = phone.replace(/[^0-9]/g, '');
    
    // 010-0000-0000 형식으로 변환
    if (numbers.length === 11 && numbers.startsWith('010')) {
        return `${numbers.substring(0, 3)}-${numbers.substring(3, 7)}-${numbers.substring(7)}`;
    } else if (numbers.length === 10) {
        return `${numbers.substring(0, 3)}-${numbers.substring(3, 6)}-${numbers.substring(6)}`;
    }
    
    return phone;
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
                    <option value="internship" ${existing && existing.type === 'internship' ? 'selected' : ''}>현장실습</option>
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
                        ${courses.map(c => `<option value="${c.code}" ${c.code === 'C-001' ? 'selected' : ''}>${c.name} (${c.code})</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="block text-gray-700 mb-2">강사 선택</label>
                    <select id="log-instructor" class="w-full border rounded px-3 py-2" onchange="window.filterTrainingLogs()">
                        <option value="">전체 강사</option>
                        ${(() => {
                            const loggedInInstructor = JSON.parse(localStorage.getItem('instructor') || '{}');
                            const sortedInstructors = [...instructors].sort((a, b) => a.name.localeCompare(b.name, 'ko'));
                            return sortedInstructors.map(i => {
                                const isSelected = i.code === loggedInInstructor.code;
                                const displayMark = isSelected ? ' (나)' : '';
                                return `<option value="${i.code}" ${isSelected ? 'selected' : ''}>${i.name}-${i.instructor_type_name || '강사'}${displayMark}</option>`;
                            }).join('');
                        })()}
                    </select>
                </div>
                <div>
                    <label class="block text-gray-700 mb-2">년도</label>
                    <select id="log-year" class="w-full border rounded px-3 py-2" onchange="window.filterTrainingLogs()">
                        <option value="" selected>전체</option>
                        <option value="${currentYear}">${currentYear}</option>
                        <option value="${currentYear - 1}">${currentYear - 1}</option>
                    </select>
                </div>
                <div>
                    <label class="block text-gray-700 mb-2">월</label>
                    <select id="log-month" class="w-full border rounded px-3 py-2" onchange="window.filterTrainingLogs()">
                        <option value="" selected>전체</option>
                        ${Array.from({length: 12}, (_, i) => i + 1).map(m => 
                            `<option value="${m}">${m}월</option>`
                        ).join('')}
                    </select>
                </div>
            </div>
            
            <div id="training-logs-list">
                <p class="text-gray-500 text-center py-8">과정을 선택하여 시간표와 훈련일지를 조회하세요</p>
            </div>
        </div>
    `;
    
    // 최초 로드 시 자동으로 목록 조회
    setTimeout(() => {
        window.filterTrainingLogs();
    }, 100);
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
                        <th class="px-2 py-2 text-center text-xs w-12">사진</th>
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
                                <td class="px-2 py-2 text-center text-xs">
                                    ${hasLog && tt.training_log_photo_urls && JSON.parse(tt.training_log_photo_urls || '[]').length > 0 ? `
                                        <button onclick='window.showPhotoViewer(${JSON.stringify(tt.training_log_photo_urls)}, 0)' 
                                                class="text-green-600 hover:text-green-700" 
                                                title="${JSON.parse(tt.training_log_photo_urls).length}개 사진">
                                            <i class="fas fa-camera"></i>
                                        </button>
                                    ` : `
                                        <i class="fas fa-camera text-gray-300" title="사진 없음"></i>
                                    `}
                                </td>
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
                                    ${(() => {
                                        const isFuture = new Date(tt.class_date).setHours(0,0,0,0) > new Date().setHours(0,0,0,0);
                                        if (hasLog) {
                                            return `
                                                <button onclick="window.editTrainingLog(${tt.training_log_id}, ${tt.id})" class="text-blue-600 hover:text-blue-800 mr-2">
                                                    <i class="fas fa-edit"></i> 수정
                                                </button>
                                            `;
                                        } else if (isFuture) {
                                            return `
                                                <button disabled class="text-gray-300 cursor-not-allowed" title="미래 날짜는 작성할 수 없습니다">
                                                    <i class="fas fa-lock"></i> 작성불가
                                                </button>
                                            `;
                                        } else {
                                            return `
                                                <button onclick="window.showTrainingLogForm(${tt.id})" class="text-green-600 hover:text-green-800">
                                                    <i class="fas fa-plus"></i> 작성
                                                </button>
                                            `;
                                        }
                                    })()}
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
        
        // 미래 날짜 체크
        const classDate = new Date(tt.class_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);  // 시간을 00:00:00으로 설정하여 날짜만 비교
        classDate.setHours(0, 0, 0, 0);
        
        if (classDate > today) {
            alert('⚠️ 미래 날짜의 훈련일지는 작성할 수 없습니다.\n\n수업이 진행된 후에 작성해주세요.');
            return;
        }
        
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
                        <label class="block text-gray-700 mb-2 flex items-center justify-between">
                            <span>수업 내용 *</span>
                            <div class="relative inline-block">
                                <button type="button" 
                                        id="ai-generate-btn"
                                        class="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
                                        onclick="document.getElementById('ai-dropdown').classList.toggle('hidden')">
                                    <i class="fas fa-magic"></i>
                                    <span>AI 확장하기</span>
                                    <i class="fas fa-chevron-down ml-1"></i>
                                </button>
                                <div id="ai-dropdown" class="hidden absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-10">
                                    <div class="p-3 border-b bg-gray-50 rounded-t-lg">
                                        <p class="text-xs text-gray-600">
                                            <i class="fas fa-info-circle mr-1"></i>
                                            수업 내용을 몇 단어라도 입력한 후<br/>원하는 상세도를 선택하세요
                                        </p>
                                    </div>
                                    <button type="button" 
                                            onclick="window.generateAIContent(${timetableId}, '${tt.subject_name || ''}', '${tt.subject_code || ''}', '${tt.class_date}', '${tt.instructor_name || ''}', 'summary')"
                                            class="w-full text-left px-4 py-3 hover:bg-blue-50 transition flex items-center gap-3 border-b">
                                        <i class="fas fa-compress-alt text-blue-500"></i>
                                        <div>
                                            <div class="font-semibold text-sm">요약</div>
                                            <div class="text-xs text-gray-500">간결한 핵심 내용 (200-300자)</div>
                                        </div>
                                    </button>
                                    <button type="button" 
                                            onclick="window.generateAIContent(${timetableId}, '${tt.subject_name || ''}', '${tt.subject_code || ''}', '${tt.class_date}', '${tt.instructor_name || ''}', 'normal')"
                                            class="w-full text-left px-4 py-3 hover:bg-green-50 transition flex items-center gap-3 border-b">
                                        <i class="fas fa-align-left text-green-500"></i>
                                        <div>
                                            <div class="font-semibold text-sm">보통</div>
                                            <div class="text-xs text-gray-500">적절한 상세도 (400-600자)</div>
                                        </div>
                                    </button>
                                    <button type="button" 
                                            onclick="window.generateAIContent(${timetableId}, '${tt.subject_name || ''}', '${tt.subject_code || ''}', '${tt.class_date}', '${tt.instructor_name || ''}', 'detailed')"
                                            class="w-full text-left px-4 py-3 hover:bg-purple-50 transition flex items-center gap-3 rounded-b-lg">
                                        <i class="fas fa-align-justify text-purple-500"></i>
                                        <div>
                                            <div class="font-semibold text-sm">상세</div>
                                            <div class="text-xs text-gray-500">매우 구체적인 내용 (800-1200자)</div>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        </label>
                        <textarea id="training-content-textarea" name="content" rows="6" required class="w-full px-3 py-2 border rounded-lg" 
                                  placeholder="수업에서 다룬 내용을 간단히 입력하세요 (예: HTML, CSS 기초, 레이아웃 실습)&#10;&#10;입력 후 'AI 확장하기' 버튼을 눌러 요약/보통/상세 중 선택하면&#10;AI가 입력한 내용을 바탕으로 전문적인 훈련일지로 확장해드립니다!"></textarea>
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
                            <i class="fas fa-paperclip mr-2"></i>사진 및 파일 첨부 (그림파일, PDF, HWP, PPT, Excel, Word, TXT 등)
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
                            <input type="file" id="training-file-input" accept="image/*,.pdf,.ppt,.pptx,.xls,.xlsx,.doc,.docx,.txt,.hwp" multiple 
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
                        <label class="block text-gray-700 mb-2 flex items-center justify-between">
                            <span>수업 내용 *</span>
                            <div class="relative inline-block">
                                <button type="button" 
                                        id="ai-generate-btn-edit"
                                        class="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
                                        onclick="document.getElementById('ai-dropdown-edit').classList.toggle('hidden')">
                                    <i class="fas fa-magic"></i>
                                    <span>AI 확장하기</span>
                                    <i class="fas fa-chevron-down ml-1"></i>
                                </button>
                                <div id="ai-dropdown-edit" class="hidden absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-10">
                                    <div class="p-3 border-b bg-gray-50 rounded-t-lg">
                                        <p class="text-xs text-gray-600">
                                            <i class="fas fa-info-circle mr-1"></i>
                                            수업 내용을 수정한 후<br/>원하는 상세도를 선택하세요
                                        </p>
                                    </div>
                                    <button type="button" 
                                            onclick="window.generateAIContent(${timetableId}, '${tt.subject_name || ''}', '${tt.subject_code || ''}', '${tt.class_date}', '${tt.instructor_name || ''}', 'summary')"
                                            class="w-full text-left px-4 py-3 hover:bg-blue-50 transition flex items-center gap-3 border-b">
                                        <i class="fas fa-compress-alt text-blue-500"></i>
                                        <div>
                                            <div class="font-semibold text-sm">요약</div>
                                            <div class="text-xs text-gray-500">간결한 핵심 내용 (200-300자)</div>
                                        </div>
                                    </button>
                                    <button type="button" 
                                            onclick="window.generateAIContent(${timetableId}, '${tt.subject_name || ''}', '${tt.subject_code || ''}', '${tt.class_date}', '${tt.instructor_name || ''}', 'normal')"
                                            class="w-full text-left px-4 py-3 hover:bg-green-50 transition flex items-center gap-3 border-b">
                                        <i class="fas fa-align-left text-green-500"></i>
                                        <div>
                                            <div class="font-semibold text-sm">보통</div>
                                            <div class="text-xs text-gray-500">적절한 상세도 (400-600자)</div>
                                        </div>
                                    </button>
                                    <button type="button" 
                                            onclick="window.generateAIContent(${timetableId}, '${tt.subject_name || ''}', '${tt.subject_code || ''}', '${tt.class_date}', '${tt.instructor_name || ''}', 'detailed')"
                                            class="w-full text-left px-4 py-3 hover:bg-purple-50 transition flex items-center gap-3 rounded-b-lg">
                                        <i class="fas fa-align-justify text-purple-500"></i>
                                        <div>
                                            <div class="font-semibold text-sm">상세</div>
                                            <div class="text-xs text-gray-500">매우 구체적인 내용 (800-1200자)</div>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        </label>
                        <textarea id="training-content-textarea" name="content" rows="6" required class="w-full px-3 py-2 border rounded-lg">${log.content || ''}</textarea>
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
                            <i class="fas fa-paperclip mr-2"></i>사진 및 파일 첨부 (그림파일, PDF, HWP, PPT, Excel, Word, TXT 등)
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
                            <input type="file" id="training-file-input" accept="image/*,.pdf,.ppt,.pptx,.xls,.xlsx,.doc,.docx,.txt,.hwp" multiple 
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
    
    // 파일 검증
    for (let file of files) {
        const validation = window.validateFile(file);
        if (!validation.valid) {
            window.showAlert(validation.message);
            event.target.value = '';
            return;
        }
    }
    
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
                // URL과 원본 파일명을 함께 저장 (URL#원본파일명 형식)
                const urlWithOriginalName = response.data.original_filename 
                    ? `${response.data.url}#${encodeURIComponent(response.data.original_filename)}`
                    : response.data.url;
                photoUrls.push(urlWithOriginalName);
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
    
    previewDiv.innerHTML = photoUrls.map((url, idx) => 
        window.createFilePreviewItem(url, idx, 'window.removeTrainingPhoto')
    ).join('');
}

window.generateAIContent = async function(timetableId, subjectName, subjectCode, classDate, instructorName, detailLevel = 'normal') {
    const contentTextarea = document.getElementById('training-content-textarea');
    const userInput = contentTextarea.value.trim();
    
    // 드롭다운 닫기
    const dropdown = document.getElementById('ai-dropdown') || document.getElementById('ai-dropdown-edit');
    if (dropdown) dropdown.classList.add('hidden');
    
    // 사용자 입력 체크
    if (!userInput) {
        window.showAlert('⚠️ 수업 내용을 먼저 입력해주세요!\n\n예시: "HTML, CSS 기초, 레이아웃 실습"');
        contentTextarea.focus();
        return;
    }
    
    // 로딩 표시
    const originalValue = contentTextarea.value;
    const originalPlaceholder = contentTextarea.placeholder;
    contentTextarea.placeholder = '🤖 AI가 입력하신 내용을 바탕으로 훈련일지를 작성하고 있습니다... 잠시만 기다려주세요...';
    contentTextarea.disabled = true;
    
    // 상세도 레벨 한글 표시
    const levelText = {
        'summary': '요약',
        'normal': '보통',
        'detailed': '상세'
    };
    
    try {
        // 세부 교과목 정보 조회
        let subSubjects = [];
        if (subjectCode) {
            try {
                const subjectRes = await axios.get(`${API_BASE_URL}/api/subjects/${subjectCode}`);
                const subject = subjectRes.data;
                subSubjects = [1, 2, 3, 4, 5]
                    .filter(i => subject[`sub_subject_${i}`] && subject[`sub_subject_${i}`].trim())
                    .map(i => ({
                        name: subject[`sub_subject_${i}`],
                        hours: subject[`sub_hours_${i}`] || 0
                    }));
            } catch (error) {
                console.error('과목 정보 조회 실패:', error);
            }
        }
        
        // AI 수업 내용 생성 API 호출
        const response = await axios.post(`${API_BASE_URL}/api/training-logs/generate-content`, {
            subject_name: subjectName,
            sub_subjects: subSubjects,
            class_date: classDate,
            instructor_name: instructorName,
            user_input: userInput,
            detail_level: detailLevel
        });
        
        // 생성된 내용을 textarea에 채우기
        contentTextarea.value = response.data.content;
        contentTextarea.disabled = false;
        contentTextarea.placeholder = originalPlaceholder;
        
        // 성공 메시지
        window.showAlert(`✨ AI가 ${levelText[detailLevel]} 스타일로 훈련일지를 작성했습니다!\n필요하면 수정해주세요.`);
        
        // textarea에 포커스
        contentTextarea.focus();
    } catch (error) {
        console.error('AI 생성 실패:', error);
        contentTextarea.value = originalValue;  // 원래 내용 복원
        contentTextarea.disabled = false;
        contentTextarea.placeholder = originalPlaceholder;
        
        const errorMsg = error.response?.data?.detail || error.message || 'AI 생성에 실패했습니다';
        window.showAlert('❌ ' + errorMsg + '\n\n원래 입력하신 내용은 그대로 유지됩니다.');
    }
};

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
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
                            ${courses.map(c => `<option value="${c.code}" ${c.code === 'C-001' ? 'selected' : ''}>${c.name} (${c.code})</option>`).join('')}
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
                            ${(() => {
                                const loggedInInstructor = JSON.parse(localStorage.getItem('instructor') || '{}');
                                return instructors.map(i => {
                                    const typeInfo = instructorTypes.find(t => t.code === i.instructor_type);
                                    const typeName = typeInfo ? typeInfo.name : '';
                                    const typeType = typeInfo ? typeInfo.type : '';
                                    const isSelected = i.code === loggedInInstructor.code;
                                    const displayMark = isSelected ? ' (나)' : '';
                                    return `<option value="${i.code}" ${isSelected ? 'selected' : ''}>${i.name}${displayMark} - ${i.code} - ${typeName} - ${typeType}</option>`;
                                }).join('');
                            })()}
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

// ==================== PWA 기능: 오프라인 감지 ====================

// 오프라인 인디케이터 생성
function createOfflineIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'offline-indicator';
    indicator.className = 'offline-indicator';
    indicator.innerHTML = '<i class="fas fa-wifi-slash mr-2"></i>오프라인 모드 - 인터넷 연결을 확인해주세요';
    document.body.insertBefore(indicator, document.body.firstChild);
    return indicator;
}

// 오프라인/온라인 상태 감지
window.addEventListener('online', () => {
    console.log('✅ 온라인 상태');
    const indicator = document.getElementById('offline-indicator');
    if (indicator) {
        indicator.classList.remove('show');
        setTimeout(() => indicator.remove(), 300);
    }
    
    // 온라인 복구 알림
    if (typeof showAlert === 'function') {
        showAlert('인터넷 연결이 복구되었습니다.', 'success');
    }
});

window.addEventListener('offline', () => {
    console.log('❌ 오프라인 상태');
    let indicator = document.getElementById('offline-indicator');
    if (!indicator) {
        indicator = createOfflineIndicator();
    }
    indicator.classList.add('show');
    
    // 오프라인 알림
    if (typeof showAlert === 'function') {
        showAlert('오프라인 상태입니다. 일부 기능이 제한될 수 있습니다.', 'warning');
    }
});

// 초기 오프라인 상태 확인
if (!navigator.onLine) {
    const indicator = createOfflineIndicator();
    indicator.classList.add('show');
}

// ==================== PWA 기능: 앱 업데이트 감지 ====================

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('🔄 Service Worker 업데이트 감지');
        if (typeof showAlert === 'function') {
            showAlert('앱이 업데이트되었습니다.', 'info');
        }
    });
}

// ==================== PWA 기능: 백그라운드 동기화 (미래 확장용) ====================

// 오프라인에서 작성한 데이터를 저장
window.saveOfflineData = function(type, data) {
    const offlineData = JSON.parse(localStorage.getItem('offline_data') || '[]');
    offlineData.push({
        type,
        data,
        timestamp: Date.now()
    });
    localStorage.setItem('offline_data', JSON.stringify(offlineData));
    console.log('💾 오프라인 데이터 저장:', type);
};

// 온라인 복구 시 오프라인 데이터 동기화
window.syncOfflineData = async function() {
    const offlineData = JSON.parse(localStorage.getItem('offline_data') || '[]');
    
    if (offlineData.length === 0) {
        return;
    }
    
    console.log(`🔄 ${offlineData.length}개 오프라인 데이터 동기화 시작...`);
    
    for (const item of offlineData) {
        try {
            // 각 데이터 타입에 맞는 API 호출
            if (item.type === 'counseling') {
                await axios.post(`${API_BASE_URL}/api/counselings`, item.data);
            } else if (item.type === 'training-log') {
                await axios.post(`${API_BASE_URL}/api/training-logs`, item.data);
            }
            console.log('✅ 동기화 성공:', item.type);
        } catch (error) {
            console.error('❌ 동기화 실패:', item.type, error);
        }
    }
    
    // 동기화 완료 후 오프라인 데이터 삭제
    localStorage.removeItem('offline_data');
    console.log('✨ 오프라인 데이터 동기화 완료');
};

// 온라인 복구 시 자동 동기화
window.addEventListener('online', () => {
    setTimeout(() => {
        window.syncOfflineData();
    }, 1000);
});

console.log('✅ PWA 기능 초기화 완료');

// ==================== 로그인 관리 (주강사 전용) ====================
async function loadLoginManagement() {
    // 주강사 권한 체크
    if (!isMainInstructor()) {
        document.getElementById('app').innerHTML = `
            <div class="bg-white rounded-lg shadow-md p-6">
                <div class="text-center text-red-600">
                    <i class="fas fa-lock text-6xl mb-4"></i>
                    <h2 class="text-2xl font-bold mb-2">접근 권한 없음</h2>
                    <p>이 메뉴는 주강사만 접근할 수 있습니다.</p>
                </div>
            </div>
        `;
        return;
    }
    
    try {
        window.showLoading('로그인 정보를 불러오는 중...');
        
        // 모든 강사 정보 조회
        const instructorsRes = await axios.get(`${API_BASE_URL}/api/instructors`);
        const instructors = instructorsRes.data;
        
        window.hideLoading();
        
        const app = document.getElementById('app');
        app.innerHTML = `
            <div class="bg-white rounded-lg shadow-md p-6">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold text-gray-800">
                        <i class="fas fa-key mr-2"></i>로그인 관리 (주강사 전용)
                    </h2>
                    <div class="text-sm text-gray-600">
                        <i class="fas fa-info-circle mr-1"></i>
                        강사별 로그인 비밀번호를 관리할 수 있습니다
                    </div>
                </div>
                
                <div class="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p class="text-sm text-blue-800">
                        <i class="fas fa-shield-alt mr-2"></i>
                        <strong>보안 안내:</strong> 비밀번호는 안전하게 암호화되어 저장됩니다. 
                        기본 비밀번호는 <code class="bg-blue-100 px-2 py-1 rounded">kdt2025</code>입니다.
                    </p>
                </div>
                
                <div class="overflow-x-auto">
                    <table class="min-w-full bg-white border">
                        <thead class="bg-gray-100">
                            <tr>
                                <th class="px-4 py-3 text-left text-sm font-semibold">강사코드</th>
                                <th class="px-4 py-3 text-left text-sm font-semibold">이름</th>
                                <th class="px-4 py-3 text-left text-sm font-semibold">구분</th>
                                <th class="px-4 py-3 text-left text-sm font-semibold">타입</th>
                                <th class="px-4 py-3 text-left text-sm font-semibold">현재 비밀번호</th>
                                <th class="px-4 py-3 text-left text-sm font-semibold">작업</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${instructors.map(inst => `
                                <tr class="border-t hover:bg-gray-50">
                                    <td class="px-4 py-3 text-sm font-mono">${inst.code}</td>
                                    <td class="px-4 py-3 text-sm font-semibold">${inst.name}</td>
                                    <td class="px-4 py-3 text-sm">${inst.instructor_type_name || '-'}</td>
                                    <td class="px-4 py-3 text-sm">
                                        <span class="px-2 py-1 rounded text-xs ${
                                            inst.instructor_type_type === '1. 주강사' ? 'bg-blue-100 text-blue-800' :
                                            inst.instructor_type_type === '2. 보조강사' ? 'bg-green-100 text-green-800' :
                                            inst.instructor_type_type === '3. 멘토' ? 'bg-purple-100 text-purple-800' :
                                            inst.instructor_type_type === '4. 행정지원' ? 'bg-yellow-100 text-yellow-800' :
                                            inst.instructor_type_type === '5. 가디언' ? 'bg-pink-100 text-pink-800' :
                                            'bg-gray-100 text-gray-800'
                                        }">
                                            ${inst.instructor_type_type || '-'}
                                        </span>
                                    </td>
                                    <td class="px-4 py-3 text-sm">
                                        <span class="text-gray-500">
                                            <i class="fas fa-lock mr-1"></i>
                                            ${inst.password === 'kdt2025' ? '기본 비밀번호' : '변경됨'}
                                        </span>
                                    </td>
                                    <td class="px-4 py-3 text-sm">
                                        <button onclick="window.showPasswordChangeForm('${inst.code}', '${inst.name}')" 
                                                class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs mr-2">
                                            <i class="fas fa-key mr-1"></i>비밀번호 변경
                                        </button>
                                        <button onclick="window.resetPassword('${inst.code}', '${inst.name}')" 
                                                class="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-xs">
                                            <i class="fas fa-redo mr-1"></i>초기화
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                
                <!-- 비밀번호 변경 폼 -->
                <div id="password-change-form" class="hidden mt-6 p-6 bg-gray-50 rounded-lg border border-gray-200">
                    <h3 class="text-lg font-bold mb-4">비밀번호 변경</h3>
                    <div class="grid grid-cols-1 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">강사</label>
                            <input type="text" id="pwd-instructor-name" readonly 
                                   class="w-full px-3 py-2 border rounded bg-gray-100">
                            <input type="hidden" id="pwd-instructor-code">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">새 비밀번호 *</label>
                            <input type="password" id="pwd-new-password" placeholder="새 비밀번호 입력" 
                                   class="w-full px-3 py-2 border rounded">
                            <p class="text-xs text-gray-500 mt-1">
                                <i class="fas fa-info-circle mr-1"></i>
                                영문, 숫자 조합 4자 이상
                            </p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">비밀번호 확인 *</label>
                            <input type="password" id="pwd-confirm-password" placeholder="비밀번호 재입력" 
                                   class="w-full px-3 py-2 border rounded">
                        </div>
                    </div>
                    <div class="mt-4 space-x-2">
                        <button onclick="window.changePassword()" 
                                class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
                            <i class="fas fa-save mr-2"></i>변경
                        </button>
                        <button onclick="window.hidePasswordChangeForm()" 
                                class="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded">
                            취소
                        </button>
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        window.hideLoading();
        console.error('로그인 관리 로드 실패:', error);
        document.getElementById('app').innerHTML = '<div class="text-red-600 p-4">로그인 관리를 불러오는데 실패했습니다.</div>';
    }
}

// 비밀번호 변경 폼 표시
window.showPasswordChangeForm = function(code, name) {
    const formDiv = document.getElementById('password-change-form');
    document.getElementById('pwd-instructor-code').value = code;
    document.getElementById('pwd-instructor-name').value = `${name} (${code})`;
    document.getElementById('pwd-new-password').value = '';
    document.getElementById('pwd-confirm-password').value = '';
    formDiv.classList.remove('hidden');
    formDiv.scrollIntoView({ behavior: 'smooth' });
}

// 비밀번호 변경 폼 숨기기
window.hidePasswordChangeForm = function() {
    document.getElementById('password-change-form').classList.add('hidden');
}

// 비밀번호 변경
window.changePassword = async function() {
    const code = document.getElementById('pwd-instructor-code').value;
    const newPassword = document.getElementById('pwd-new-password').value;
    const confirmPassword = document.getElementById('pwd-confirm-password').value;
    
    // 유효성 검사
    if (!newPassword) {
        window.showAlert('새 비밀번호를 입력하세요.');
        return;
    }
    
    if (newPassword.length < 4) {
        window.showAlert('비밀번호는 최소 4자 이상이어야 합니다.');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        window.showAlert('비밀번호가 일치하지 않습니다.');
        return;
    }
    
    try {
        await axios.post(`${API_BASE_URL}/api/auth/change-password`, {
            instructor_code: code,
            new_password: newPassword
        });
        
        window.showAlert('비밀번호가 변경되었습니다.');
        window.hidePasswordChangeForm();
        loadLoginManagement(); // 목록 새로고침
    } catch (error) {
        console.error('비밀번호 변경 실패:', error);
        window.showAlert('비밀번호 변경에 실패했습니다: ' + (error.response?.data?.detail || error.message));
    }
}

// 비밀번호 초기화
window.resetPassword = async function(code, name) {
    const confirmed = await window.showConfirm(`${name} 강사의 비밀번호를 기본값(kdt2025)으로 초기화하시겠습니까?`);
    if (!confirmed) return;
    
    try {
        await axios.post(`${API_BASE_URL}/api/auth/change-password`, {
            instructor_code: code,
            new_password: 'kdt2025'
        });
        
        window.showAlert('비밀번호가 초기화되었습니다. (기본값: kdt2025)');
        loadLoginManagement(); // 목록 새로고침
    } catch (error) {
        console.error('비밀번호 초기화 실패:', error);
        window.showAlert('비밀번호 초기화에 실패했습니다: ' + (error.response?.data?.detail || error.message));
    }
}

// ==================== 시스템 설정 ====================
async function loadSystemSettings() {
    try {
        const response = await axios.get(`${API_BASE_URL}/api/system-settings`);
        const settings = response.data;
        renderSystemSettings(settings);
    } catch (error) {
        console.error('시스템 설정 로드 실패:', error);
        document.getElementById('app').innerHTML = '<div class="text-red-600 p-4">시스템 설정을 불러오는데 실패했습니다.</div>';
    }
}

function renderSystemSettings(settings) {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="bg-white rounded-lg shadow-md p-6">
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-2xl font-bold text-gray-800">
                    <i class="fas fa-cog mr-2"></i>시스템 등록
                </h2>
            </div>
            
            <div class="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 mb-6 border-l-4 border-blue-500">
                <p class="text-gray-700 mb-2">
                    <i class="fas fa-info-circle mr-2 text-blue-500"></i>
                    시스템 제목, 부제목, 로고를 설정할 수 있습니다.
                </p>
                <p class="text-sm text-gray-600">
                    설정한 내용은 헤더에 즉시 반영됩니다.
                </p>
            </div>
            
            <form id="system-settings-form" class="space-y-6">
                <!-- 큰 제목 -->
                <div>
                    <label class="block text-gray-700 font-semibold mb-2">
                        <i class="fas fa-heading mr-2 text-blue-500"></i>큰 제목 (시스템 이름)
                    </label>
                    <input type="text" id="system-title" value="${settings.system_title || 'KDT교육관리시스템 v3.2'}" 
                           class="w-full px-4 py-3 border rounded-lg text-lg focus:ring-2 focus:ring-blue-500"
                           placeholder="예: KDT교육관리시스템 v3.2">
                    <p class="text-sm text-gray-500 mt-1">헤더 상단에 표시되는 메인 제목입니다</p>
                </div>
                
                <!-- 작은 제목 1줄 -->
                <div>
                    <label class="block text-gray-700 font-semibold mb-2">
                        <i class="fas fa-align-left mr-2 text-green-500"></i>작은 제목 (1줄)
                    </label>
                    <input type="text" id="system-subtitle1" value="${settings.system_subtitle1 || '보건복지부(한국보건산업진흥원), KDT, 우송대학교산학협력단'}" 
                           class="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                           placeholder="예: 보건복지부(한국보건산업진흥원), KDT, 우송대학교산학협력단">
                    <p class="text-sm text-gray-500 mt-1">헤더 하단 첫 번째 줄에 표시됩니다</p>
                </div>
                
                <!-- 작은 제목 2줄 -->
                <div>
                    <label class="block text-gray-700 font-semibold mb-2">
                        <i class="fas fa-align-left mr-2 text-green-500"></i>작은 제목 (2줄)
                    </label>
                    <input type="text" id="system-subtitle2" value="${settings.system_subtitle2 || '바이오헬스아카데미 올인원테크 이노베이터'}" 
                           class="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                           placeholder="예: 바이오헬스아카데미 올인원테크 이노베이터">
                    <p class="text-sm text-gray-500 mt-1">헤더 하단 두 번째 줄에 표시됩니다</p>
                </div>
                
                <!-- 로고 이미지 -->
                <div>
                    <label class="block text-gray-700 font-semibold mb-2">
                        <i class="fas fa-image mr-2 text-purple-500"></i>로고 이미지
                    </label>
                    
                    <!-- 현재 로고 미리보기 -->
                    <div class="mb-4 p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                        <p class="text-sm text-gray-600 mb-2">현재 로고:</p>
                        <img id="current-logo" src="${settings.logo_url || '/woosong-logo.png'}" 
                             alt="현재 로고" class="h-20 object-contain bg-white p-2 rounded shadow-sm"
                             onerror="this.style.display='none'">
                    </div>
                    
                    <!-- 로고 업로드 -->
                    <div class="space-y-3">
                        <input type="file" id="logo-file" accept="image/*" 
                               onchange="window.handleLogoUpload(event)"
                               class="w-full px-3 py-2 border rounded-lg">
                        <p class="text-sm text-gray-500">
                            <i class="fas fa-info-circle mr-1"></i>
                            권장: PNG, 투명 배경, 가로 300px 이상
                        </p>
                    </div>
                    
                    <input type="hidden" id="logo-url" value="${settings.logo_url || '/woosong-logo.png'}">
                </div>
                
                <!-- 저장 버튼 -->
                <div class="flex gap-3 pt-4 border-t">
                    <button type="button" onclick="window.saveSystemSettings()" 
                            class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold flex-1">
                        <i class="fas fa-save mr-2"></i>저장
                    </button>
                    <button type="button" onclick="window.resetSystemSettings()" 
                            class="bg-gray-400 hover:bg-gray-500 text-white px-6 py-3 rounded-lg font-semibold">
                        <i class="fas fa-undo mr-2"></i>기본값으로 초기화
                    </button>
                </div>
            </form>
        </div>
    `;
}

// 로고 업로드 처리
window.handleLogoUpload = async function(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // 파일 형식 검증
    if (!file.type.startsWith('image/')) {
        window.showAlert('이미지 파일만 업로드 가능합니다.');
        return;
    }
    
    // 파일 크기 검증 (5MB)
    if (file.size > 5 * 1024 * 1024) {
        window.showAlert('파일 크기는 5MB 이하여야 합니다.');
        return;
    }
    
    try {
        const formData = new FormData();
        formData.append('file', file);
        
        // teacher 카테고리로 업로드 (로고는 teacher 폴더에 저장)
        const response = await axios.post(`${API_BASE_URL}/api/upload-image?category=teacher`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        
        const logoUrl = response.data.url;
        document.getElementById('logo-url').value = logoUrl;
        document.getElementById('current-logo').src = API_BASE_URL + '/api/download-image?file_path=' + encodeURIComponent(logoUrl);
        document.getElementById('current-logo').style.display = 'block';
        
        window.showAlert('✅ 로고가 업로드되었습니다! 저장 버튼을 눌러 적용하세요.');
    } catch (error) {
        console.error('❌ 로고 업로드 실패:', error);
        const errorMsg = error.response?.data?.detail || error.message;
        window.showAlert('로고 업로드에 실패했습니다: ' + errorMsg);
    }
}

// 시스템 설정 저장
window.saveSystemSettings = async function() {
    const formData = new FormData();
    formData.append('system_title', document.getElementById('system-title').value);
    formData.append('system_subtitle1', document.getElementById('system-subtitle1').value);
    formData.append('system_subtitle2', document.getElementById('system-subtitle2').value);
    formData.append('logo_url', document.getElementById('logo-url').value);
    
    try {
        console.log('시스템 설정 저장 시작...');
        await axios.post(`${API_BASE_URL}/api/system-settings`, formData);
        console.log('✅ 시스템 설정 저장 완료');
        
        // 헤더 즉시 업데이트
        await updateHeader();
        
        window.showAlert('✅ 시스템 설정이 저장되고 헤더가 업데이트되었습니다!');
    } catch (error) {
        console.error('❌ 시스템 설정 저장 실패:', error);
        window.showAlert('시스템 설정 저장에 실패했습니다: ' + error.message);
    }
}

// 헤더 업데이트
async function updateHeader() {
    try {
        const response = await axios.get(`${API_BASE_URL}/api/system-settings`);
        const settings = response.data;
        
        console.log('헤더 업데이트:', settings);
        
        // 제목 업데이트
        const titleElement = document.getElementById('system-title-header');
        if (titleElement) {
            titleElement.innerHTML = `<i class="fas fa-school mr-3"></i>${settings.system_title || 'KDT교육관리시스템 v3.2'}`;
            console.log('제목 업데이트 완료');
        }
        
        // 부제목 1 업데이트
        const subtitle1Element = document.getElementById('system-subtitle1-header');
        if (subtitle1Element) {
            subtitle1Element.textContent = settings.system_subtitle1 || '보건복지부(한국보건산업진흥원), KDT, 우송대학교산학협력단';
            console.log('부제목1 업데이트 완료');
        }
        
        // 부제목 2 업데이트
        const subtitle2Element = document.getElementById('system-subtitle2-header');
        if (subtitle2Element) {
            subtitle2Element.textContent = settings.system_subtitle2 || '바이오헬스아카데미 올인원테크 이노베이터';
            console.log('부제목2 업데이트 완료');
        }
        
        // 로고 업데이트
        const logoElement = document.querySelector('header img[alt*="로고"]');
        if (logoElement && settings.logo_url) {
            if (settings.logo_url.startsWith('ftp://')) {
                logoElement.src = API_BASE_URL + '/api/download-image?file_path=' + encodeURIComponent(settings.logo_url);
            } else {
                logoElement.src = settings.logo_url;
            }
            console.log('로고 업데이트 완료');
        }
        
        console.log('✅ 헤더 업데이트 완료');
    } catch (error) {
        console.error('❌ 헤더 업데이트 실패:', error);
    }
}

// 기본값으로 초기화
window.resetSystemSettings = async function() {
    const confirmed = await window.showConfirm('시스템 설정을 기본값으로 초기화하시겠습니까?');
    if (!confirmed) return;
    
    try {
        const formData = new FormData();
        formData.append('system_title', 'KDT교육관리시스템 v3.2');
        formData.append('system_subtitle1', '보건복지부(한국보건산업진흥원), KDT, 우송대학교산학협력단');
        formData.append('system_subtitle2', '바이오헬스아카데미 올인원테크 이노베이터');
        formData.append('logo_url', '/woosong-logo.png');
        
        await axios.post(`${API_BASE_URL}/api/system-settings`, formData);
        window.showAlert('시스템 설정이 기본값으로 초기화되었습니다.');
        
        // 화면 새로고침
        loadSystemSettings();
        updateHeader();
    } catch (error) {
        console.error('시스템 설정 초기화 실패:', error);
        window.showAlert('시스템 설정 초기화에 실패했습니다: ' + error.message);
    }
}

// ==================== 페이지 로드 시 헤더 업데이트 ====================
// 페이지가 완전히 로드된 후 헤더 업데이트 실행
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateHeader);
} else {
    // 이미 로드된 경우 즉시 실행
    updateHeader();
}

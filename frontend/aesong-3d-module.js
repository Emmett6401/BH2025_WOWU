import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// 전역 변수
let aesongScene, aesongCamera, aesongRenderer, aesongModel, aesongAnimationId, aesongMixer;
let isRecording = false;
let recognition = null;
let synthesis = window.speechSynthesis;
let currentCharacter = 'aesong'; // 기본 캐릭터 (애송이)
let currentCharacterName = '애송이'; // 현재 캐릭터 이름
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };

// Three.js 3D 씬 초기화
export function initAesong3DScene() {
    const container = document.getElementById('aesong-3d-container');
    const canvas = document.getElementById('aesong-canvas');
    
    if (!canvas) {
        console.error('Canvas not found!');
        return;
    }
    
    console.log('🎨 3D 씬 초기화 시작...');
    
    // Three.js 씬 설정
    aesongScene = new THREE.Scene();
    aesongScene.background = new THREE.Color(0x667eea);
    
    // 카메라 설정 (정면에서 보기)
    aesongCamera = new THREE.PerspectiveCamera(
        50,
        container.clientWidth / container.clientHeight,
        0.1,
        1000
    );
    aesongCamera.position.set(0, 0.5, 2.5); // 정면 중앙에서 보기
    aesongCamera.lookAt(0, 0, 0); // 원점을 바라보기
    
    // 렌더러 설정
    aesongRenderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    aesongRenderer.setSize(container.clientWidth, container.clientHeight);
    aesongRenderer.setPixelRatio(window.devicePixelRatio);
    aesongRenderer.shadowMap.enabled = true;
    
    // 조명 설정
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    aesongScene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    aesongScene.add(directionalLight);
    
    const pointLight1 = new THREE.PointLight(0xff69b4, 1, 100);
    pointLight1.position.set(-3, 3, 3);
    aesongScene.add(pointLight1);
    
    const pointLight2 = new THREE.PointLight(0x87ceeb, 1, 100);
    pointLight2.position.set(3, 3, -3);
    aesongScene.add(pointLight2);
    
    // 초기 캐릭터 로드
    loadCharacter(currentCharacter);
    
    // 마우스 컨트롤
    canvas.addEventListener('mousedown', () => { isDragging = true; });
    canvas.addEventListener('mouseup', () => { isDragging = false; });
    canvas.addEventListener('mouseleave', () => { isDragging = false; });
    
    canvas.addEventListener('mousemove', (e) => {
        if (isDragging && aesongModel) {
            const deltaX = e.offsetX - previousMousePosition.x;
            aesongModel.rotation.y += deltaX * 0.01;
        }
        previousMousePosition = { x: e.offsetX, y: e.offsetY };
    });
    
    // 애니메이션 루프
    const clock = new THREE.Clock();
    function animate() {
        aesongAnimationId = requestAnimationFrame(animate);
        
        const delta = clock.getDelta();
        
        // 애니메이션 믹서 업데이트
        if (aesongMixer) {
            aesongMixer.update(delta);
        }
        
        // 자연스러운 대화 동작 (고개 좌우로 살짝 움직임)
        if (aesongModel && !isDragging) {
            const time = Date.now() * 0.001; // 시간 기반 애니메이션
            
            // 좌우로 살짝 고개 돌리기 (±15도)
            aesongModel.rotation.y = Math.sin(time * 0.5) * 0.15;
            
            // 위아래로 살짝 고개 끄덕이기 (±5도)
            aesongModel.rotation.x = Math.sin(time * 0.7) * 0.08;
            
            // 좌우로 살짝 기울이기 (±3도) - 더 자연스럽게
            aesongModel.rotation.z = Math.sin(time * 0.3) * 0.05;
        }
        
        aesongRenderer.render(aesongScene, aesongCamera);
    }
    animate();
    
    // 리사이즈 핸들러
    function onWindowResize() {
        if (aesongCamera && aesongRenderer && container) {
            aesongCamera.aspect = container.clientWidth / container.clientHeight;
            aesongCamera.updateProjectionMatrix();
            aesongRenderer.setSize(container.clientWidth, container.clientHeight);
        }
    }
    window.addEventListener('resize', onWindowResize);
    
    // 음성 인식 초기화
    initSpeechRecognition();
}

// 음성 인식 초기화
function initSpeechRecognition() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        updateStatusText('❌ 이 브라우저는 음성 인식을 지원하지 않습니다');
        return;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.lang = 'ko-KR';
    recognition.continuous = false;
    recognition.interimResults = false;
    
    recognition.onresult = async function(event) {
        const transcript = event.results[0][0].transcript;
        console.log('인식된 텍스트:', transcript);
        
        updateStatusText(`🤔 ${currentCharacterName}가 생각 중...`);
        
        // 서버에 메시지 전송
        try {
            const API_BASE_URL = window.API_BASE_URL || 'http://localhost:8000';
            const response = await fetch(`${API_BASE_URL}/api/aesong-chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    message: transcript,
                    character: currentCharacterName // 캐릭터 이름 전달
                })
            });
            
            const data = await response.json();
            const aiResponse = data.response;
            
            console.log(`💬 ${currentCharacterName}: ${aiResponse}`);
            
            // TTS로 음성 출력
            speakText(aiResponse);
            
        } catch (error) {
            console.error('채팅 오류:', error);
            updateStatusText(`❌ ${currentCharacterName}와 연결할 수 없어요`);
            speakText(`죄송해요, 지금은 대답하기 어려워요`);
        }
    };
    
    recognition.onerror = function(event) {
        console.error('음성 인식 오류:', event.error);
        updateStatusText('❌ 음성 인식 오류: ' + event.error);
        isRecording = false;
        const btn = document.getElementById('voice-btn');
        if (btn) btn.classList.remove('recording');
    };
    
    recognition.onend = function() {
        isRecording = false;
        const btn = document.getElementById('voice-btn');
        if (btn) btn.classList.remove('recording');
        const statusText = document.getElementById('status-text');
        if (statusText && statusText.textContent.includes('말씀하세요')) {
            updateStatusText('🎤 마이크 버튼을 눌러서 말해보세요!');
        }
    };
}

// 음성 녹음 토글
export function toggleVoiceRecording() {
    if (!recognition) {
        if (window.showAlert) {
            window.showAlert('음성 인식이 지원되지 않습니다', 'error');
        } else {
            alert('음성 인식이 지원되지 않습니다');
        }
        return;
    }
    
    const btn = document.getElementById('voice-btn');
    
    if (isRecording) {
        recognition.stop();
        isRecording = false;
        if (btn) btn.classList.remove('recording');
        updateStatusText('⏹️ 녹음 중지');
    } else {
        recognition.start();
        isRecording = true;
        if (btn) btn.classList.add('recording');
        updateStatusText('🎤 말씀하세요...');
    }
}

// TTS 음성 출력
function speakText(text) {
    if (!synthesis) {
        console.error('TTS not supported');
        return;
    }
    
    // 기존 음성 중지
    synthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    utterance.rate = 1.0;
    
    // 캐릭터에 따라 음성 설정
    if (currentCharacterName === '데이빗') {
        utterance.pitch = 0.8; // 남성 낮은 톤
        // 남성 음성 선택 시도
        const voices = synthesis.getVoices();
        const maleVoice = voices.find(voice => 
            voice.lang.startsWith('ko') && 
            (voice.name.includes('Male') || voice.name.includes('남성'))
        );
        if (maleVoice) {
            utterance.voice = maleVoice;
        }
    } else {
        utterance.pitch = 1.2; // 애송이 - 약간 높은 톤 (여성/귀여운 톤)
    }
    
    utterance.onstart = function() {
        updateStatusText(`🔊 ${currentCharacterName}가 말하는 중...`);
    };
    
    utterance.onend = function() {
        updateStatusText('🎤 마이크 버튼을 눌러서 말해보세요!');
    };
    
    synthesis.speak(utterance);
}

// 상태 텍스트 업데이트
function updateStatusText(text) {
    const statusElement = document.getElementById('status-text');
    if (statusElement) {
        statusElement.textContent = text;
    }
}

// 채팅 메시지 추가 (대화창 제거로 비활성화)
function addChatMessage(sender, message) {
    // 콘솔에만 로그 출력
    console.log(`💬 ${sender}: ${message}`);
}

// 캐릭터 로드 함수
function loadCharacter(characterType) {
    // 기존 모델 제거
    if (aesongModel) {
        aesongScene.remove(aesongModel);
        aesongModel = null;
        if (aesongMixer) {
            aesongMixer.stopAllAction();
            aesongMixer = null;
        }
    }
    
    currentCharacter = characterType;
    const loader = new GLTFLoader();
    
    let modelPath = '';
    let modelName = '';
    let scale = 1.0;
    let positionY = 0;
    
    if (characterType === 'aesong') {
        modelPath = '/AEsong.glb';
        modelName = '애송이';
        scale = 1.5; // 적당한 크기
        positionY = -0.2; // 가운데 위치
    } else if (characterType === 'david') {
        modelPath = '/David.glb';
        modelName = '데이빗';
        scale = 1.5; // 적당한 크기
        positionY = -0.8; // 키가 크니까 아래로 (얼굴이 보이도록)
    } else {
        console.error('❌ 알 수 없는 캐릭터 타입:', characterType);
        return;
    }
    
    // 현재 캐릭터 이름 저장
    currentCharacterName = modelName;
    
    updateStatusText(`📦 ${modelName} 로딩 중...`);
    
    loader.load(
        modelPath,
        function(gltf) {
            aesongModel = gltf.scene;
            aesongModel.position.set(0, positionY, 0);
            aesongModel.scale.set(scale, scale, scale);
            
            // 데이빗은 정면을 보도록 머리를 위로 살짝 들어 올림
            if (characterType === 'david') {
                aesongModel.rotation.x = -0.2; // 머리를 위로 (음수값 = 위로)
            }
            
            aesongScene.add(aesongModel);
            
            console.log(`✅ ${modelName} 3D 모델 로드 완료!`);
            updateStatusText(`✅ ${modelName}가 준비되었어요!`);
            
            // 애니메이션 설정
            if (gltf.animations && gltf.animations.length > 0) {
                aesongMixer = new THREE.AnimationMixer(aesongModel);
                gltf.animations.forEach((clip) => {
                    const action = aesongMixer.clipAction(clip);
                    action.play();
                });
                console.log(`🎬 ${modelName} 애니메이션 ${gltf.animations.length}개 재생 중`);
            }
        },
        function(xhr) {
            const percent = (xhr.loaded / xhr.total * 100).toFixed(0);
            console.log(`📦 ${modelName} 로딩: ${percent}%`);
            updateStatusText(`📦 ${modelName} 로딩 중... ${percent}%`);
        },
        function(error) {
            console.error(`❌ ${modelName} 모델 로드 실패:`, error);
            updateStatusText(`❌ ${modelName}를 불러오는데 실패했어요`);
        }
    );
}

// 캐릭터 전환 함수
export function switchCharacter(characterType) {
    console.log('🔄 캐릭터 전환:', characterType);
    
    // UI 업데이트
    document.querySelectorAll('.character-option').forEach(option => {
        option.classList.remove('active');
    });
    document.querySelector(`[data-character="${characterType}"]`).classList.add('active');
    
    // 캐릭터 로드
    loadCharacter(characterType);
}

// 전역에 함수 노출
window.initAesong3DScene = initAesong3DScene;
window.toggleVoiceRecording = toggleVoiceRecording;
window.switchCharacter = switchCharacter;

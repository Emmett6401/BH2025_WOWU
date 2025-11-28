// Three.js 3D 화면보호기
let scene, camera, renderer, model, mixer, clock;
let isAnimating = false;

async function init3DScreensaver() {
    const canvas = document.getElementById('threejs-canvas');
    if (!canvas) return;

    // Scene 설정
    scene = new THREE.Scene();
    
    // Camera 설정
    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 2, 5);
    camera.lookAt(0, 1, 0);
    
    // Renderer 설정
    renderer = new THREE.WebGLRenderer({ 
        canvas: canvas, 
        alpha: true, 
        antialias: true 
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // 조명 설정 (화려하게!)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
    
    // 핑크 포인트 라이트 (귀여운 효과)
    const pointLight1 = new THREE.PointLight(0xff69b4, 1, 100);
    pointLight1.position.set(-3, 3, 3);
    scene.add(pointLight1);
    
    const pointLight2 = new THREE.PointLight(0xffb6c1, 1, 100);
    pointLight2.position.set(3, 3, -3);
    scene.add(pointLight2);
    
    // 블루 백라이트
    const backLight = new THREE.PointLight(0x87ceeb, 0.5, 100);
    backLight.position.set(0, 3, -5);
    scene.add(backLight);
    
    // GLB 모델 로드
    const loader = new THREE.GLTFLoader();
    try {
        const gltf = await new Promise((resolve, reject) => {
            loader.load(
                '/aesong-bunny.glb',
                resolve,
                (progress) => {
                    console.log('Loading 3D model...', (progress.loaded / progress.total * 100).toFixed(0) + '%');
                },
                reject
            );
        });
        
        model = gltf.scene;
        model.position.set(0, 0, 0);
        model.scale.set(2, 2, 2);
        
        // 그림자 설정
        model.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        
        scene.add(model);
        
        // 애니메이션이 있으면 재생
        if (gltf.animations && gltf.animations.length > 0) {
            mixer = new THREE.AnimationMixer(model);
            gltf.animations.forEach((clip) => {
                mixer.clipAction(clip).play();
            });
        }
        
        console.log('✅ 3D Model loaded successfully!');
        
    } catch (error) {
        console.error('❌ Error loading 3D model:', error);
    }
    
    clock = new THREE.Clock();
    
    // 리사이즈 핸들러
    window.addEventListener('resize', onWindowResize, false);
    
    // 애니메이션 시작
    isAnimating = true;
    animate();
}

function animate() {
    if (!isAnimating) return;
    
    requestAnimationFrame(animate);
    
    const delta = clock.getDelta();
    const time = clock.getElapsedTime();
    
    if (model) {
        // 부드러운 회전
        model.rotation.y = time * 0.5;
        
        // 위아래로 떠다니는 효과
        model.position.y = Math.sin(time * 0.8) * 0.3;
        
        // 좌우로 흔들리는 효과
        model.position.x = Math.sin(time * 0.5) * 1;
        model.position.z = Math.cos(time * 0.5) * 0.5;
        
        // 약간의 기울임 효과
        model.rotation.x = Math.sin(time * 0.3) * 0.1;
        model.rotation.z = Math.cos(time * 0.4) * 0.1;
    }
    
    // 조명 애니메이션 (반짝임)
    if (scene.children.length > 3) {
        const pointLight1 = scene.children[3];
        const pointLight2 = scene.children[4];
        
        if (pointLight1 && pointLight1.isLight) {
            pointLight1.intensity = 1 + Math.sin(time * 2) * 0.3;
        }
        if (pointLight2 && pointLight2.isLight) {
            pointLight2.intensity = 1 + Math.cos(time * 2) * 0.3;
        }
    }
    
    // 믹서 업데이트 (내장 애니메이션)
    if (mixer) {
        mixer.update(delta);
    }
    
    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function stop3DScreensaver() {
    isAnimating = false;
    if (renderer) {
        renderer.dispose();
    }
}

// Export functions
window.init3DScreensaver = init3DScreensaver;
window.stop3DScreensaver = stop3DScreensaver;

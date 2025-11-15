# Cafe24 서버 업데이트 가이드

## 🚀 서버에서 실행할 명령어

```bash
# 1. 서버 접속
ssh root@114.202.247.97

# 2. 프로젝트 디렉토리로 이동
cd /var/www/webapp

# 3. GitHub에서 최신 코드 가져오기
git pull origin main

# 4. Frontend 재시작 (포트 3000)
# 현재 실행 중인 프로세스 확인
ps aux | grep python

# Python SimpleHTTP 종료
pkill -f "python.*3000"

# Frontend 재시작 (백그라운드)
cd /var/www/webapp/frontend
nohup python3 -m http.server 3000 --bind 0.0.0.0 > /tmp/frontend.log 2>&1 &

# 또는 PM2 사용 시
pm2 restart frontend-server

# 5. 확인
curl http://localhost/manifest.json
curl -I http://localhost/icon-192x192.png
```

## ✅ 업데이트 후 확인 사항

1. **PWA Manifest**: http://114.202.247.97/manifest.json
2. **Service Worker**: http://114.202.247.97/service-worker.js
3. **아이콘**: http://114.202.247.97/icon-192x192.png (19KB 정도)
4. **메인 페이지**: http://114.202.247.97/

## 📱 PWA 설치 테스트

### Android Chrome:
1. http://114.202.247.97/ 접속
2. 주소창 옆의 "+" 버튼 또는 메뉴 → "홈 화면에 추가"
3. "KDT교육관리시스템 v3.0" 앱 아이콘 확인

### iOS Safari:
1. http://114.202.247.97/ 접속
2. 공유 버튼 (⬆️) → "홈 화면에 추가"
3. "BH2025" 앱 아이콘 확인

### Desktop Chrome:
1. http://114.202.247.97/ 접속
2. 주소창 오른쪽 "설치" 버튼 클릭
3. 데스크톱 앱으로 설치

## 🔍 PWA 작동 확인

### Chrome DevTools:
1. F12 → Application 탭
2. **Manifest**: 좌측 "Manifest" 클릭 → 아이콘 8개 확인
3. **Service Workers**: 좌측 "Service Workers" 클릭 → 등록 확인
4. **Install prompt**: Console에서 설치 프롬프트 확인

### Lighthouse:
1. F12 → Lighthouse 탭
2. "Progressive Web App" 체크
3. "Analyze page load" 실행
4. PWA 점수 확인 (목표: 80점 이상)

## 🛠️ 문제 해결

### 아이콘이 업데이트 안 되면:
```bash
# 브라우저 캐시 강제 새로고침
# Chrome: Ctrl + Shift + R (Windows/Linux)
# Chrome: Cmd + Shift + R (Mac)

# 또는 서비스 워커 삭제
# F12 → Application → Service Workers → Unregister
```

### Service Worker 등록 실패 시:
```bash
# Console 확인
# F12 → Console 탭에서 에러 메시지 확인

# HTTPS 필요 (localhost는 예외)
# 실제 배포 시 SSL 인증서 필요
```

## 📊 업데이트 내용

- ✅ PWA Manifest 설정
- ✅ Service Worker (오프라인 지원)
- ✅ 8가지 크기의 아이콘 (72x72 ~ 512x512)
- ✅ Apple Touch Icon
- ✅ Favicon
- ✅ 반응형 디자인 (모바일 최적화)
- ✅ 설치 프롬프트
- ✅ 앱 단축키 (대시보드, 학생, 상담, 일지)

## 🎯 현재 상태

- **Frontend**: http://114.202.247.97/ (포트 80, Nginx)
- **Backend**: http://114.202.247.97/api/ (포트 8000, Uvicorn)
- **GitHub**: https://github.com/Emmett6401/BH2025_WOWU
- **Branch**: main
- **Latest Commit**: d1521e7 (PWA icons added)

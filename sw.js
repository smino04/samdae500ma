/* 삼대오백마 서비스 워커
   목적: iOS 홈 화면(설치형) 앱이 옛 HTML을 캐싱해 업데이트가 안 보이는 문제 해결.
   HTML(내비게이션) 요청은 항상 네트워크에서 새로 받아온다(network-first). */
const CACHE = 'obaengma-shell-v1';

self.addEventListener('install', (e) => {
  self.skipWaiting();   // 새 워커 즉시 대기 해제
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    // 옛 캐시 정리
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();   // 열려있는 페이지 즉시 제어
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const accept = req.headers.get('accept') || '';
  const isHTML = req.mode === 'navigate' || accept.includes('text/html');
  const isVersion = req.url.includes('version.json');
  // HTML과 version.json은 항상 네트워크 우선 → 최신 화면 보장
  if (isHTML || isVersion) {
    e.respondWith((async () => {
      try {
        const fresh = await fetch(req, { cache: 'no-store' });
        // 오프라인 대비로 HTML만 캐시에 백업
        if (isHTML) { try { const c = await caches.open(CACHE); c.put('./', fresh.clone()); } catch (_) {} }
        return fresh;
      } catch (err) {
        // 네트워크 실패 시(오프라인) 캐시 백업 사용
        const cached = await caches.match('./');
        return cached || Response.error();
      }
    })());
  }
  // 그 외(폰트·CDN 스크립트 등)는 브라우저 기본 처리
});

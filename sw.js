/* 오프라인에서도 열리게 한다.
 * - 화면·내용 파일: 항상 서버에 새것이 있는지 확인하고(브라우저 임시 저장을 믿지 않는다), 인터넷이 없을 때만 저장본을 쓴다.
 *   깃허브 페이지는 파일을 10분간 예전 것으로 내줄 수 있어서, 확인 없이 받으면 새 단원이 늦게 보인다.
 * - 음성 파일: 이름이 내용에 따라 정해지므로 한 번 받으면 바뀌지 않는다. 저장본을 먼저 쓴다. */
const CACHE = 'bn-v8';
const FILES = ['./', 'index.html', 'style.css', 'ver.js', 'data.js', 'app.js', 'audio/index.js', 'manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => Promise.all(FILES.map(f => fetch(f, { cache: 'no-cache' }).then(r => c.put(f, r)))))
    .then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  if (url.pathname.endsWith('version.json')) return;            // 최신 번호 확인은 늘 서버에 직접
  const keep = r => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); } return r; };
  if (url.pathname.endsWith('.mp3')) {
    e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(keep)));
    return;
  }
  e.respondWith(
    fetch(e.request.url, { cache: 'no-cache' }).then(keep)
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});

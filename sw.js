const CACHE_NAME='kartavya-static-v12';
const ASSETS=[
  './',
  './index.html',
  './styles.css',
  './manifest.webmanifest',
  './sw.js',
  './icon-192.png',
  './icon-512.png',
  './js/01-config-state.js',
  './js/02-formatting.js',
  './js/03-task-rules.js',
  './js/04-integrations.js',
  './js/05-storage.js',
  './js/06-task-actions.js',
  './js/07-view.js',
  './js/08-events.js'
];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then(keys =>
        Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))
      )
    ])
  );
});

self.addEventListener('fetch',event=>{
  if(event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Always try network first for the main HTML
  if(url.pathname.endsWith('/') || url.pathname.endsWith('/index.html')){
    event.respondWith(
      fetch(event.request)
        .then(resp=>{
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(cache=>cache.put('./index.html', clone));
          return resp;
        })
        .catch(()=>caches.match('./index.html'))
    );
    return;
  }

  // Cache first for static assets
  event.respondWith(
    caches.match(event.request).then(cached =>
      cached || fetch(event.request).then(resp=>{
        const clone = resp.clone();
        caches.open(CACHE_NAME).then(cache=>cache.put(event.request, clone));
        return resp;
      }).catch(()=>caches.match('./index.html'))
    )
  );
});

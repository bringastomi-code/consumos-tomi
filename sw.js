// Consumos Tomi -- service worker
// App-shell caching only: makes the page open even with no connection, and lets
// it be installed to the home screen. Firebase/Firestore requests (cross-origin)
// are never intercepted here, so sync always uses live data.
const CACHE_NAME = 'consumos-tomi-v1';
const APP_SHELL = ['./', './index.html', './manifest.json'];

self.addEventListener('install', function(event){
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(APP_SHELL).catch(function(){ /* ignore individual failures */ });
    })
  );
});

self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== CACHE_NAME; }).map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(event){
  var req = event.request;
  if(req.method !== 'GET') return;
  var url = new URL(req.url);
  if(url.origin !== self.location.origin) return; // let Firebase/CDN requests hit the network directly

  event.respondWith(
    caches.match(req).then(function(cached){
      var fetchPromise = fetch(req).then(function(res){
        if(res && res.status === 200){
          var resClone = res.clone();
          caches.open(CACHE_NAME).then(function(cache){ cache.put(req, resClone); });
        }
        return res;
      }).catch(function(){ return cached; });
      return cached || fetchPromise;
    })
  );
});

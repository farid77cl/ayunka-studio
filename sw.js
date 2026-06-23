const CACHE='ayunka-studio-v22';
const ASSETS=['./','./index.html','./css/styles.css','./js/plan-data.js','./js/store.js','./js/idb.js','./js/calc.js','./js/filament-colors.js','./js/designs.js','./js/sync.js','./js/viewer.js','./js/app.js','./js/pdf.js','./img/logo.png','./favicon.ico','./favicon.png','./manifest.webmanifest'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(u.origin===location.origin){e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(resp=>{const c=resp.clone();caches.open(CACHE).then(ca=>ca.put(e.request,c));return resp;}).catch(()=>caches.match('./index.html'))));}});

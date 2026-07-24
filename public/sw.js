// Solo Leveling System — Service Worker v11
const CACHE_NAME = 'solo-leveling-system-v11'
const APP_SHELL = ['/', '/manifest.json', '/icon.svg']

self.addEventListener('install', (event) => { event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))); self.skipWaiting() })
self.addEventListener('activate', (event) => { event.waitUntil(caches.keys().then((names) => Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))))); self.clients.claim() })
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  if (event.request.mode === 'navigate') { event.respondWith(fetch(event.request).then((response) => { const clone = response.clone(); caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone)); return response }).catch(() => caches.match(event.request).then((r) => r || caches.match('/')))) }
  else { event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => { if (response.ok && response.type === 'basic') { const clone = response.clone(); caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone)) } return response }))) }
})

self.addEventListener('push', (event) => {
  let data = { title: '◆ THE SYSTEM', body: 'A notification has been issued.', icon: '/icon.svg', badge: '/icon.svg', url: '/', tag: 'system-notification', requireInteraction: false, silent: false }
  try { if (event.data) { const parsed = event.data.json(); data = { ...data, ...parsed } } } catch { if (event.data) data.body = event.data.text() }
  const options = { body: data.body, icon: data.icon, badge: data.badge, tag: data.tag, requireInteraction: data.requireInteraction, silent: data.silent, data: { url: data.url }, vibrate: [200, 100, 200, 100, 200], actions: [{ action: 'open', title: '◆ OPEN' }, { action: 'dismiss', title: '✕ DISMISS' }] }
  event.waitUntil(self.registration.showNotification(data.title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  if (event.action === 'dismiss') return
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => { for (const client of clientList) { if (client.url.includes(self.location.origin) && 'focus' in client) return client.focus() } if (self.clients.openWindow) return self.clients.openWindow('/') }))
})

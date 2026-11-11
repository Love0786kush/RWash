// apps/client/public/firebase-messaging-sw.js
// Background Web Push Notification Handler

importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: 'AIzaSyCr3yvn545KJwZh6zkAzHoakbbHC9k3J9g',
  authDomain: 'carwash-7c308.firebaseapp.com',
  projectId: 'carwash-7c308',
  storageBucket: 'carwash-7c308.firebasestorage.app',
  messagingSenderId: '531658229291',
  appId: '1:531658229291:web:e553c36c9942bac1764c6e',
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Background notification received:', payload)

  const { title, body, image } = payload.notification ?? {}
  const { deepLink } = payload.data ?? {}

  self.registration.showNotification(title || 'RWash', {
    body: body || 'New update from RWash',
    icon: '/favicon.svg',
    image: image,
    badge: '/favicon.svg',
    data: { deepLink },
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  })
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const deepLink = event.notification.data?.deepLink || '/'

  if (event.action === 'open' || event.action === '') {
    event.waitUntil(
      clients
        .matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          for (const client of clientList) {
            if (client.url.includes(self.location.origin) && 'focus' in client) {
              client.navigate(deepLink)
              return client.focus()
            }
          }
          if (clients.openWindow) {
            return clients.openWindow(deepLink)
          }
        })
    )
  }
})


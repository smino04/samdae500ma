/* 삼대오백마 — FCM 백그라운드 메시지 서비스워커 */
importScripts('https://www.gstatic.com/firebasejs/11.0.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.0.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAHO7dPueyJL-4wEDQwqmWgMp7zzJLoGO4",
  authDomain: "obaengma.firebaseapp.com",
  projectId: "obaengma",
  storageBucket: "obaengma.firebasestorage.app",
  messagingSenderId: "735708832846",
  appId: "1:735708832846:web:287dd6dedcf554aa054f1f",
  measurementId: "G-GS92TRPC2X"
});

const messaging = firebase.messaging();

// 앱이 백그라운드/종료 상태일 때 데이터 메시지를 받아 알림 표시
messaging.onBackgroundMessage((payload) => {
  const d = payload.data || {};
  const title = d.title || '삼대오백마';
  const options = {
    body: d.body || '오늘 운동 기록했나요? 💪',
    icon: 'icon-192.png',
    badge: 'icon-192.png',
    tag: 'daily-reminder',
    data: { url: './' }
  };
  return self.registration.showNotification(title, options);
});

// 알림 클릭 시 앱 열기
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) { if ('focus' in c) return c.focus(); }
      if (clients.openWindow) return clients.openWindow('./');
    })
  );
});

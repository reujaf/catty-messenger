importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Firebase yapılandırmasını başlat
firebase.initializeApp({
    apiKey: "AIzaSyCyUfIEyDGmwGZJU-VTbifk8ZhAStYRn24",
    authDomain: "catty-message.firebaseapp.com",
    databaseURL: "https://catty-message-default-rtdb.firebaseio.com",
    projectId: "catty-message",
    storageBucket: "catty-message.firebasestorage.app",
    messagingSenderId: "762334512293",
    appId: "1:762334512293:web:d3edbbb5de41c29c43f94c",
    measurementId: "G-F4YVW57WKW"
});

// Firebase Messaging örneğini al
const messaging = firebase.messaging();

// Service worker'ın kurulduğunu logla
self.addEventListener('install', (event) => {
  console.log('Service Worker kuruldu (v2)');
  // Hemen devralma stratejisi - özellikle mobile için önemli
  event.waitUntil(self.skipWaiting());
});

// Service worker aktifleştiğinde
self.addEventListener('activate', (event) => {
  console.log('Service Worker aktifleşti');
  // Tüm sekmeleri hemen kontrol etmeye başla - mobile için önemli
  event.waitUntil(self.clients.claim());
});

// Bildirim izni kontrolü
const checkNotificationPermission = () => {
  if (!('Notification' in self)) {
    console.log('Bu tarayıcı Web Notifications API desteklemiyor.');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  console.log('Bildirim izni verilmedi:', Notification.permission);
  return false;
};

// Web push mesajlarını yakala - Özellikle FCM dışı bildirimler için
self.addEventListener('push', (event) => {
  console.log('Push mesajı alındı:', event.data?.text());
  
  if (event.data) {
    try {
      const data = event.data.json();
      console.log('Push veri içeriği:', data);
      
      // Bildirim gösterimi
      const showNotification = () => {
        const title = data.notification?.title || 'Yeni bildirim';
        const options = {
          body: data.notification?.body || 'Yeni bir mesajınız var',
          icon: data.notification?.icon || '/icon.png',
          badge: data.notification?.badge || '/badge.png',
          tag: data.notification?.tag || `message-${Date.now()}`,
          data: data.data || {},
          renotify: true,
          requireInteraction: true,
          vibrate: [200, 100, 200],
          actions: [
            {
              action: 'open',
              title: 'Görüntüle'
            }
          ]
        };
        
        return self.registration.showNotification(title, options);
      };
      
      event.waitUntil(showNotification());
    } catch (error) {
      console.error('Push event işleme hatası:', error);
      
      // JSON parse hatası durumunda basit bildirim göster
      const title = 'Yeni bildirim';
      const options = {
        body: event.data.text(),
        icon: '/icon.png',
        badge: '/badge.png',
        tag: `message-fallback-${Date.now()}`,
        renotify: true
      };
      
      event.waitUntil(self.registration.showNotification(title, options));
    }
  }
});

// Arka planda bildirim geldiğinde
messaging.onBackgroundMessage((payload) => {
  console.log('Arka planda bildirim alındı:', payload);
  
  if (!payload.notification) {
    console.log('Bildirim içeriği yok, işlem yapılmadı');
    return;
  }
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon.png',
    badge: '/badge.png',
    data: payload.data || {}, // Ek veri varsa
    tag: `message-${Date.now()}`, // Her bildirim için benzersiz tag
    renotify: true, // Tekrar ses çıkar
    requireInteraction: true, // Kullanıcı etkileşimi gerektir
    vibrate: [200, 100, 200], // Titreşim deseni
    actions: [
      {
        action: 'open',
        title: 'Görüntüle'
      }
    ]
  };

  // Bildirim göster
  self.registration.showNotification(notificationTitle, notificationOptions)
    .then(() => {
      console.log('Bildirim başarıyla gösterildi');
      // Tüm istemcilere bildirim alındı mesajı gönder
      self.clients.matchAll({type: 'window'})
        .then(clients => {
          if (clients.length > 0) {
            clients.forEach(client => {
              client.postMessage({
                type: 'NOTIFICATION_RECEIVED',
                payload: payload
              });
            });
          } else {
            console.log('Açık pencere bulunamadı');
          }
        });
    })
    .catch(error => {
      console.error('Bildirim gösterme hatası:', error);
    });
});

// Bildirime tıklandığında
self.addEventListener('notificationclick', (event) => {
  console.log('Bildirime tıklandı', event.notification);
  
  // Bildirimi kapat
  event.notification.close();
  
  // Data bilgisini al
  const data = event.notification.data || {};
  console.log('Bildirim verileri:', data);
  
  // Web uygulamasını açacak URL
  let urlToOpen = new URL('/', self.location.origin).href;
  
  // Eğer spesifik chat ID varsa, o sohbet sayfasını aç
  if (data.chatId) {
    urlToOpen = new URL(`/?chatId=${data.chatId}`, self.location.origin).href;
  } else if (data.url) {
    urlToOpen = data.url;
  }
  
  const promiseChain = self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  })
  .then((windowClients) => {
    // Açık pencere var mı kontrol et
    let matchingClient = null;
    
    for (let i = 0; i < windowClients.length; i++) {
      const client = windowClients[i];
      
      // Eğer aynı domain'de bir sayfa zaten açıksa
      if (new URL(client.url).origin === new URL(urlToOpen).origin) {
        matchingClient = client;
        break;
      }
    }
    
    if (matchingClient) {
      // Açık sayfayı öne getir
      return matchingClient.focus().then(client => {
        // Açılan sayfaya mesaj gönder
        return client.postMessage({
          type: 'NOTIFICATION_CLICKED',
          data: data
        });
      });
    } else {
      // Yeni sayfa aç
      return self.clients.openWindow(urlToOpen).then(windowClient => {
        // Bazen null dönebilir, o yüzden kontrol et
        if (windowClient) {
          return windowClient.focus();
        }
      });
    }
  });
  
  event.waitUntil(promiseChain);
}); 
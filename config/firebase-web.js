import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
    apiKey: "AIzaSyCyUfIEyDGmwGZJU-VTbifk8ZhAStYRn24",
    authDomain: "catty-message.firebaseapp.com",
    databaseURL: "https://catty-message-default-rtdb.firebaseio.com",
    projectId: "catty-message",
    storageBucket: "catty-message.firebasestorage.app",
    messagingSenderId: "762334512293",
    appId: "1:762334512293:web:d3edbbb5de41c29c43f94c",
    measurementId: "G-F4YVW57WKW"
};

// VAPID anahtarı - Firebase Console > Project Settings > Cloud Messaging > Web Push certificates
const VAPID_KEY = "BGYiqKyl_5og4vKmlsCTDdWzrrppkdJ4mQNSQEtnStBPFab33zBDkw0yaCOcKkA4Hn3FlbScgkFvNd6NNR75_o8";

let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

export const auth = getAuth(app);
export const database = getDatabase(app);
let messaging = null;

// Tarayıcı desteğini kontrol et
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  messaging = getMessaging(app);
}

// Service worker'ı kaydet
let serviceWorkerRegistration = null;
let notificationPermissionRequested = false; // Bildirimin bir kez istenmesini sağlamak için

if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  try {
    window.addEventListener('load', async () => {
      try {
        serviceWorkerRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
          scope: '/'
        });
        console.log('Service Worker başarıyla kaydedildi:', serviceWorkerRegistration.scope);
        
        // SW kaydından sonra otomatik olarak bildirim izni iste (eğer daha önce istenmemişse)
        if (!notificationPermissionRequested) {
          notificationPermissionRequested = true;
          const token = await requestNotificationPermission();
          if (token) {
            console.log('FCM Token otomatik olarak alındı:', token);
          }
        }
      } catch (error) {
        console.error('Service Worker kaydı başarısız oldu:', error);
      }
    });
  } catch (error) {
    console.error('Service Worker hatası:', error);
  }
}

export const requestNotificationPermission = async () => {
  try {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      console.log('Bu tarayıcı bildirim desteği sunmuyor');
      return null;
    }

    const permission = await Notification.requestPermission();
    console.log('Bildirim izni durumu:', permission);
    
    if (permission === 'granted') {
      if (!messaging) {
        console.error('Messaging servisi başlatılamadı');
        return null;
      }
      
      try {
        // Service worker kaydını yenile
        if (!serviceWorkerRegistration) {
          serviceWorkerRegistration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
        }
        
        // Service worker'ı kullanarak token al
        const tokenOptions = {
          vapidKey: VAPID_KEY
        };

        // Eğer service worker kaydı varsa ekle
        if (serviceWorkerRegistration) {
          tokenOptions.serviceWorkerRegistration = serviceWorkerRegistration;
        }

        const token = await getToken(messaging, tokenOptions);
        console.log('FCM Token alındı:', token);
        
        // Test bildirimini kaldırıyoruz
        // Sadece kullanıcı istediğinde (ChatListScreen'deki bildirim butonuna tıkladığında) gösterelim
        
        return token;
      } catch (tokenError) {
        console.error('Token alma hatası:', tokenError);
        return null;
      }
    }
    return null;
  } catch (error) {
    console.error('Bildirim izni hatası:', error);
    return null;
  }
};

export const onMessageListener = () =>
  new Promise((resolve) => {
    if (!messaging) {
      console.error('Messaging servisi başlatılamadı, bildirimler çalışmayacak');
      resolve(null);
      return;
    }
    
    onMessage(messaging, (payload) => {
      console.log('Ön planda yeni mesaj alındı:', payload);
      
      // Bildirim göster (uygulama açıkken)
      if (payload.notification) {
        try {
          // Özellikle mobil web için, bildirim verileri ve izni doğrula
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(payload.notification.title, {
              body: payload.notification.body,
              icon: payload.notification.icon || '/favicon.ico',
              tag: `message-${Date.now()}`,
              renotify: true
            });
            console.log('Bildirim gösterildi');
          }
          
          // Eğer AudioContext kullanılabilirse ses çal
          if ('AudioContext' in window || 'webkitAudioContext' in window) {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            
            oscillator.type = 'sine';
            oscillator.frequency.value = 800;
            gainNode.gain.value = 0.1;
            
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            
            oscillator.start();
            
            setTimeout(() => {
              oscillator.stop();
            }, 200);
          }
        } catch (error) {
          console.error('Bildirim gösterme hatası:', error);
        }
      }
      
      resolve(payload);
    });
  });

export { messaging }; 
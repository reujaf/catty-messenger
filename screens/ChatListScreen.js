import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Image,
  Platform,
  Alert,
} from 'react-native';
import { ref, get, query, orderByChild, limitToLast, onValue, off, update } from 'firebase/database';
import { database, auth } from '../config/firebase-web';
import { requestNotificationPermission, onMessageListener } from '../config/firebase-web';

const ChatListScreen = ({ navigation }) => {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unsubscribers, setUnsubscribers] = useState({});
  const [notificationToken, setNotificationToken] = useState(null);

  useEffect(() => {
    let isMounted = true;
    let chatUnsubscriber = null;
    
    // Kullanıcı FCM token'ını izlemek için
    let messagingUnsubscriber = null;

    const setupNotifications = async () => {
      if (Platform.OS === 'web') {
        try {
          // Platform bilgisini tespit et
          const isMobileWeb = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
            typeof navigator !== 'undefined' ? navigator.userAgent : ''
          );
          const platformInfo = isMobileWeb ? 'mobile-web' : 'web';
          console.log(`Bildirim kurulumu başlatılıyor. Platform: ${platformInfo}, UA: ${navigator.userAgent.substring(0, 50)}...`);

          // Bildirim izni iste ve token al
          const token = await requestNotificationPermission();
          if (token) {
            setNotificationToken(token);
            
            // Token'ı kullanıcı verilerine kaydet
            const currentUser = auth.currentUser;
            if (currentUser) {
              // Platform bilgisini tespit et
              const isMobileWeb = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
                typeof navigator !== 'undefined' ? navigator.userAgent : ''
              );
              const platformInfo = isMobileWeb ? 'mobile-web' : 'web';
              
              const userRef = ref(database, `users/${currentUser.uid}`);
              await update(userRef, {
                fcmToken: token,
                platform: platformInfo,
                lastTokenUpdate: new Date().toISOString(),
                lastLoginAt: new Date().toISOString(),
                userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
              });
              console.log(`Bildirim token kullanıcı profiline kaydedildi. Platform: ${platformInfo}`);
            }
          }

          // Mesaj dinleyicisini başlat
          console.log('Ön plan bildirim dinleyicisi başlatılıyor...');
          onMessageListener()
            .then(payload => {
              // Yeni mesaj geldiğinde işle
              if (payload) {
                const { title, body } = payload.notification || {};
                console.log('Web Push bildirimi alındı:', { title, body });
                
                // Mesaj ses efekti oynat
                try {
                  // Basit bir bip sesi çal
                  const beep = () => {
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
                  };
                  
                  beep();
                  
                  // Özellikle Chrome Mobile için doğrudan bildirim göster
                  if (isMobileWeb && 'Notification' in window && Notification.permission === 'granted') {
                    setTimeout(() => {
                      new Notification(title || 'Yeni mesaj', {
                        body: body || 'Yeni bir mesaj aldınız',
                        icon: '/favicon.ico',
                        tag: `direct-message-${Date.now()}`,
                        renotify: true
                      });
                    }, 100);
                  }
                } catch (soundError) {
                  console.error('Bildirim sesi çalınamadı:', soundError);
                }
                
                // Sohbetleri yeniden yükle
                loadChats();
              }
            })
            .catch(err => console.error('Bildirim alınamadı:', err));
            
          // Service worker olaylarını dinle
          if ('serviceWorker' in navigator) {
            console.log('Service worker olay dinleyicisi ekleniyor');
            
            // Önceki dinleyicileri temizle (varsa)
            navigator.serviceWorker.onmessage = null;
            
            // Yeni dinleyici ekle
            navigator.serviceWorker.onmessage = (event) => {
              console.log('Service worker mesajı alındı:', event.data);
              if (event.data && (event.data.type === 'NOTIFICATION_RECEIVED' || event.data.type === 'NOTIFICATION_CLICKED')) {
                // Sohbetleri yeniden yükle
                loadChats();
              }
            };
            
            // Kayıtlı service worker'a ulaşma girişimi
            navigator.serviceWorker.ready.then(registration => {
              console.log('Service worker hazır:', registration.scope);
            }).catch(err => {
              console.error('Service worker erişim hatası:', err);
            });
          }
        } catch (error) {
          console.error('Bildirim kurulumu hatası:', error);
        }
      } else {
        // Mobil platformlar için burada FCM yapılandırması ve token kaydı yapılabilir
        console.log('Mobil platform için bildirim kurulumu yapılacak');
      }
    };

    const loadChats = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          navigation.replace('Login');
          setLoading(false);
          return;
        }

        const chatsRef = ref(database, 'privateChats');
        
        chatUnsubscriber = onValue(chatsRef, async (snapshot) => {
          if (!isMounted) return;

          try {
            if (!snapshot.exists()) {
              setChats([]);
              setLoading(false);
              return;
            }

            const chatsData = snapshot.val();
            const newChats = [];
            const newUnsubscribers = {};
            
            for (const chatId in chatsData) {
              if (chatId.includes(currentUser.uid)) {
                try {
                  const otherUserId = chatId.split('_').find(id => id !== currentUser.uid);
                  const userRef = ref(database, `users/${otherUserId}`);
                  const userSnapshot = await get(userRef);
                  
                  if (userSnapshot.exists()) {
                    const otherUser = {
                      uid: otherUserId,
                      ...userSnapshot.val()
                    };
                    
                    const messagesRef = ref(database, `privateChats/${chatId}/messages`);
                    const messagesSnapshot = await get(query(messagesRef, limitToLast(1)));
                    
                    if (messagesSnapshot.exists()) {
                      const messages = messagesSnapshot.val();
                      const lastMessage = Object.values(messages)[0];
                      
                      newChats.push({
                        chatId,
                        otherUserId: otherUser.uid,
                        otherUserEmail: otherUser.email,
                        otherUserProfileImage: otherUser.profileImage,
                        lastMessage: lastMessage.text,
                        timestamp: lastMessage.timestamp,
                        isCurrentUser: lastMessage.senderId === currentUser.uid
                      });
                    }
                  }
                } catch (error) {
                  console.error('Sohbet işleme hatası:', error);
                }
              }
            }

            if (isMounted) {
              setChats(newChats.sort((a, b) => b.timestamp - a.timestamp));
              setUnsubscribers(newUnsubscribers);
            }
          } catch (error) {
            console.error('Sohbet listener hatası:', error);
          } finally {
            if (isMounted) {
              setLoading(false);
            }
          }
        });
      } catch (error) {
        console.error('Başlangıç kurulum hatası:', error);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    // Önce loadChats çağrılsın, sonra setupNotifications
    loadChats().then(() => {
      if (Platform.OS === 'web') {
        setupNotifications();
      }
    });

    return () => {
      isMounted = false;
      if (chatUnsubscriber) {
        chatUnsubscriber();
      }
      if (messagingUnsubscriber) {
        messagingUnsubscriber();
      }
      Object.values(unsubscribers).forEach(unsubscribe => unsubscribe());
    };
  }, [navigation]);

  const handleChatPress = useCallback((chat) => {
    navigation.navigate('Chat', {
      currentUserId: auth.currentUser.uid,
      otherUserId: chat.otherUserId,
      chatId: chat.chatId,
      otherUserEmail: chat.otherUserEmail
    });
  }, [navigation]);

  const handleNewChat = useCallback(() => {
    navigation.navigate('Users');
  }, [navigation]);
  
  // Bildirim izni istemek için ayrı bir işlev
  const handleRequestNotification = useCallback(async () => {
    if (Platform.OS !== 'web') {
      Alert.alert('Bilgi', 'Bildirim izni istemek sadece web platformunda gereklidir');
      return;
    }
    
    try {
      console.log('Bildirim izni isteniyor...');
      const token = await requestNotificationPermission();
      if (token) {
        setNotificationToken(token);
        
        // Test bildirimi göster
        try {
          new Notification('Bildirimler Etkin', {
            body: 'Artık Catty Message bildirimleri alacaksınız',
            icon: '/favicon.ico'
          });
        } catch (notifError) {
          console.error('Test bildirimi gösterme hatası:', notifError);
        }
        
        Alert.alert('Başarılı', 'Bildirim izni verildi. Artık mesaj bildirimleri alacaksınız.');
        
        // Token'ı kullanıcı verilerine kaydet
        const currentUser = auth.currentUser;
        if (currentUser) {
          // Platform bilgisini tespit et
          const isMobileWeb = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
            typeof navigator !== 'undefined' ? navigator.userAgent : ''
          );
          const platformInfo = isMobileWeb ? 'mobile-web' : 'web';
          
          const userRef = ref(database, `users/${currentUser.uid}`);
          await update(userRef, {
            fcmToken: token,
            platform: platformInfo,
            lastTokenUpdate: new Date().toISOString(),
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
          });
          console.log(`Bildirim token kullanıcı profiline kaydedildi. Platform: ${platformInfo}`);
        }
      } else {
        Alert.alert('Bildirim İzni', 'Bildirim izni verilmedi. Mesaj bildirimleri almak için izin vermeniz gerekiyor.');
      }
    } catch (error) {
      console.error('Bildirim izni hatası:', error);
      Alert.alert('Hata', 'Bildirim izni istenirken bir hata oluştu.');
    }
  }, []);

  const renderChatItem = useCallback(({ item }) => (
    <TouchableOpacity
      style={styles.chatItem}
      onPress={() => handleChatPress(item)}
    >
      <View style={styles.avatarContainer}>
        {item.otherUserProfileImage ? (
          <Image
            source={{ uri: item.otherUserProfileImage }}
            style={styles.avatar}
            onError={(e) => console.log('Resim yükleme hatası:', e.nativeEvent.error)}
          />
        ) : (
          <View style={[styles.avatar, styles.placeholderAvatar]}>
            <Text style={styles.placeholderText}>
              {item.otherUserEmail?.charAt(0)?.toUpperCase() || '?'}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.chatInfo}>
        <Text style={styles.userEmail}>{item.otherUserEmail}</Text>
        <Text style={styles.lastMessage} numberOfLines={1}>
          {item.isCurrentUser ? 'Siz: ' : ''}{item.lastMessage}
        </Text>
      </View>
      <Text style={styles.timestamp}>
        {new Date(item.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </TouchableOpacity>
  ), [handleChatPress]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Sohbetler yükleniyor...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Sohbetler</Text>
        <View style={styles.headerButtons}>
          {Platform.OS === 'web' && !notificationToken && (
            <TouchableOpacity 
              style={styles.notificationButton} 
              onPress={handleRequestNotification}
            >
              <Text style={styles.notificationButtonText}>Bildirimleri Aç</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            style={styles.newChatButton} 
            onPress={handleNewChat}
          >
            <Text style={styles.newChatButtonText}>Yeni Sohbet</Text>
          </TouchableOpacity>
        </View>
      </View>
      {chats.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Henüz mesajınız yok</Text>
          <TouchableOpacity 
            style={styles.startChatButton}
            onPress={handleNewChat}
          >
            <Text style={styles.startChatButtonText}>Yeni Sohbet Başlat</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={chats}
          renderItem={renderChatItem}
          keyExtractor={(item) => item.chatId}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  headerButtons: {
    flexDirection: 'row',
  },
  newChatButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  newChatButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  notificationButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  notificationButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  listContainer: {
    padding: 16,
  },
  chatItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 8,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  placeholderAvatar: {
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#9ca3af',
  },
  chatInfo: {
    flex: 1,
    marginRight: 12,
  },
  userEmail: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  lastMessage: {
    fontSize: 14,
    color: '#6b7280',
  },
  timestamp: {
    fontSize: 12,
    color: '#9ca3af',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  emptyText: {
    fontSize: 18,
    color: '#6b7280',
    marginBottom: 16,
  },
  startChatButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  startChatButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  }
});

export default ChatListScreen; 
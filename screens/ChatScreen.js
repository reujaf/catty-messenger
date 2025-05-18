import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Animated,
  Alert,
} from 'react-native';
import { ref, push, onValue, off, set, get } from 'firebase/database';
import { database, auth } from '../config/firebase-web';

const ChatScreen = ({ route }) => {
  const { currentUserId, otherUserId, chatId, otherUserEmail } = route.params;
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const flatListRef = useRef(null);
  const inputHeight = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const messagesRef = ref(database, `privateChats/${chatId}/messages`);
    
    const handleData = (snapshot) => {
      const data = snapshot.val();
      
      if (data) {
        const messagesArray = Object.entries(data).map(([id, message]) => ({
          id,
          ...message,
        }));
        setMessages(messagesArray);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } else {
        setMessages([]);
      }
    };

    onValue(messagesRef, handleData);

    return () => {
      off(messagesRef);
    };
  }, [chatId]);

  const sendMessage = () => {
    if (newMessage.trim()) {
      const messagesRef = ref(database, `privateChats/${chatId}/messages`);
      const newMessageRef = push(messagesRef);
      
      const messageData = {
        senderId: currentUserId,
        text: newMessage,
        timestamp: Date.now()
      };
      
      // Animasyonu başlat
      Animated.sequence([
        Animated.timing(inputHeight, {
          toValue: 1,
          duration: 200,
          useNativeDriver: false,
        }),
        Animated.timing(inputHeight, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        })
      ]).start();
      
      set(newMessageRef, messageData)
        .then(() => {
          setNewMessage('');
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
          
          // Bildirim gönder
          sendNotificationToReceiver(otherUserId, messageData);
        })
        .catch((error) => {
          Alert.alert('Hata', 'Mesaj gönderilirken bir hata oluştu.');
        });
    }
  };

  // Alıcıya bildirim gönder
  const sendNotificationToReceiver = async (receiverId, messageData) => {
    try {
      // Alıcının FCM token'ını al
      const userRef = ref(database, `users/${receiverId}`);
      const userSnapshot = await get(userRef);
      
      if (userSnapshot.exists()) {
        const userData = userSnapshot.val();
        const fcmToken = userData.fcmToken;

        // Gönderen kullanıcı bilgilerini al
        const currentUser = auth.currentUser;
        const senderEmail = currentUser.email;
        
        // ÖNEMLİ: Eğer alıcı ID'si gönderen ID ile aynıysa bildirim gönderme
        // Bu, kullanıcının kendi mesajı için bildirim almasını engeller
        if (receiverId === currentUserId) {
          console.log('Kendi mesajını gönderen kullanıcıya bildirim gönderilmiyor');
          return;
        }
        
        console.log(`Alıcı bilgileri: ${receiverId}, FCM Token: ${fcmToken?.substring(0, 15)}... Platform: ${userData.platform || 'bilinmiyor'}`);
        
        // Kullanıcının FCM token'ı varsa
        if (fcmToken) {
          // FCM bildirimini hazırla
          console.log(`${Platform.OS} platformundan bildirim gönderiliyor`);
          
          // FCM'ye gönderilecek veri - Mobil için de çalışacak şekilde ayarla
          const notificationData = {
            to: fcmToken,
            notification: {
              title: `Yeni mesaj: ${senderEmail}`,
              body: messageData.text,
              icon: '/favicon.ico',
              badge: '/badge.png',
              tag: `message-${Date.now()}`,
              sound: 'default'
            },
            data: {
              type: 'NEW_MESSAGE',
              chatId: chatId,
              senderId: currentUserId,
              senderEmail: senderEmail,
              otherUserId: otherUserId,
              otherUserEmail: otherUserEmail,
              messageText: messageData.text,
              timestamp: messageData.timestamp,
              url: typeof window !== 'undefined' ? window.location.origin : ''
            },
            priority: 'high',
            content_available: true
          };
          
          // Mobile Chrome için FCM bildirimlerini iyileştiren ayarlar
          if (userData.platform === 'mobile-web' || userData.userAgent?.includes('Mobile')) {
            // Mobile tarayıcılara özel ek ayarlar
            notificationData.webpush = {
              headers: {
                TTL: '86400',
                Urgency: 'high'
              },
              notification: {
                requireInteraction: true,
                vibrate: [200, 100, 200]
              },
              fcm_options: {
                link: typeof window !== 'undefined' ? window.location.origin : ''
              }
            };
          }
          
          // FCM API'sine doğrudan istek gönder (hangi platformdan olursa olsun)
          const serverKey = 'AAAAsZ-Vz2w:APA91bG_zBWyqJZMbpZqZ8O00Tk8RR3-5CxjFEWQNZAKpQ6KcBnVVKhvxUMmrNtFLQzdpfXHTLbCnx4eHbHn5P2qpujmuxJUzf54ByQ-vQrDcTxhHJAHZFqVMH47fFxIvS0fzUoDPFGo';
          
          // FCM API'sine POST isteği gönder - Tüm platformlarda çalışacak
          // Global fetch kullan, her platform için aynı şekilde çalışacak
          global.fetch('https://fcm.googleapis.com/fcm/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `key=${serverKey}`
            },
            body: JSON.stringify(notificationData)
          })
          .then(response => {
            console.log(`FCM API yanıtı status: ${response.status}`);
            if (!response.ok) {
              throw new Error(`HTTP hata, durum: ${response.status}`);
            }
            return response.json();
          })
          .then(data => {
            console.log('Bildirim başarıyla gönderildi:', data);
            
            // Web platformu için ek kontrol - özellikle Chrome Mobile için fallback çözüm
            if (Platform.OS === 'web' && typeof window !== 'undefined' && 
                'Notification' in window && Notification.permission === 'granted' &&
                (userData.platform === 'mobile-web' || userData.userAgent?.includes('Mobile'))) {
              
              setTimeout(() => {
                try {
                  // Bildirim göstermeden önce bir süre bekle - mobil chrome için daha güvenilir
                  new Notification(`Yeni mesaj: ${senderEmail}`, {
                    body: messageData.text,
                    icon: '/favicon.ico',
                    tag: `direct-message-${Date.now()}`,
                    renotify: true,
                    vibrate: [200, 100, 200],
                    requireInteraction: true
                  });
                  console.log('Mobil web için ek bildirim gösterildi');
                } catch (notifError) {
                  console.error('Browser bildirimi gösterme hatası:', notifError);
                }
              }, 300);
            }
          })
          .catch(error => {
            console.error('FCM bildirim hatası:', error);
            
            // Sadece Web platformu için yedek bildirim
            if (Platform.OS === 'web' && typeof window !== 'undefined' && 
                'Notification' in window && Notification.permission === 'granted') {
              try {
                new Notification(`Yeni mesaj: ${senderEmail}`, {
                  body: messageData.text,
                  icon: '/favicon.ico',
                  tag: `direct-message-fallback-${Date.now()}`,
                  renotify: true,
                  vibrate: [200, 100, 200]
                });
                console.log('FCM hatası - Doğrudan tarayıcı bildirimi gönderildi');
              } catch (notifError) {
                console.error('Yedek bildirim hatası:', notifError);
              }
            }
          });
        } else {
          console.log(`Alıcının (${receiverId}) FCM token'ı bulunmuyor`);
        }
      } else {
        console.log(`Alıcı kullanıcı bulunamadı: ${receiverId}`);
      }
    } catch (error) {
      console.error('Bildirim gönderme hatası:', error);
    }
  };

  const renderMessage = ({ item }) => {
    const isCurrentUser = item.senderId === currentUserId;
    return (
      <Animated.View
        style={[
          styles.messageContainer,
          isCurrentUser ? styles.currentUserMessage : styles.otherUserMessage,
          {
            transform: [{
              translateY: inputHeight.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -10]
              })
            }]
          }
        ]}
      >
        <Text style={styles.senderName}>
          {isCurrentUser ? 'Siz' : otherUserEmail}
        </Text>
        <Text style={[
          styles.messageText,
          isCurrentUser ? styles.currentUserText : styles.otherUserText
        ]}>
          {item.text}
        </Text>
        <Text style={[
          styles.timestamp,
          isCurrentUser ? styles.currentUserTimestamp : styles.otherUserTimestamp
        ]}>
          {new Date(item.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>
          {otherUserEmail} ile Sohbet
        </Text>
      </View>
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        style={styles.messageList}
        contentContainerStyle={styles.messageListContent}
        inverted={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inputContainer}
      >
        <TextInput
          style={styles.input}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Mesaj yazın..."
          multiline
        />
        <TouchableOpacity 
          style={styles.sendButton}
          onPress={sendMessage}
        >
          <Text style={styles.sendButtonText}>Gönder</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
    backgroundColor: '#fff',
  },
  headerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  messageList: {
    flex: 1,
    padding: 16,
  },
  messageListContent: {
    flexGrow: 1,
  },
  messageContainer: {
    maxWidth: '80%',
    marginVertical: 8,
    padding: 12,
    borderRadius: 16,
  },
  currentUserMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
  },
  otherUserMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#f3f4f6',
  },
  senderName: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 16,
  },
  currentUserText: {
    color: '#fff',
  },
  otherUserText: {
    color: '#000',
  },
  timestamp: {
    fontSize: 12,
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  currentUserTimestamp: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  otherUserTimestamp: {
    color: '#6b7280',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    maxHeight: 100,
    backgroundColor: '#fff',
  },
  sendButton: {
    backgroundColor: '#007AFF',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default ChatScreen; 
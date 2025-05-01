import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { ref, get, query, orderByChild, limitToLast, onValue, off, onChildAdded, onChildChanged } from 'firebase/database';
import { database, auth } from '../config/firebase';

const ChatListScreen = ({ navigation }) => {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeChats = null;
    let unsubscribeMessages = {};

    const loadChats = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          Alert.alert('Debug', 'No authenticated user found');
          setLoading(false);
          return;
        }

        Alert.alert('Debug', `Current user: ${currentUser.uid}`);

        // Realtime güncelleme için privateChats'i dinle
        const chatsRef = ref(database, 'privateChats');
        
        unsubscribeChats = onValue(chatsRef, async (snapshot) => {
          try {
            if (!snapshot.exists()) {
              Alert.alert('Debug', 'No chats found in database');
              setChats([]);
              setLoading(false);
              return;
            }

            const chatsData = snapshot.val();
            Alert.alert('Debug', `Found chats: ${Object.keys(chatsData).join(', ')}`);
            
            // Her sohbeti kontrol et
            for (const chatId in chatsData) {
              if (chatId.includes(currentUser.uid)) {
                Alert.alert('Debug', `Processing chat: ${chatId}`);
                
                try {
                  // Diğer kullanıcının ID'sini bul
                  const otherUserId = chatId.split('_').find(id => id !== currentUser.uid);
                  Alert.alert('Debug', `Other user ID: ${otherUserId}`);
                  
                  // Diğer kullanıcının bilgilerini al
                  const userRef = ref(database, `users/${otherUserId}`);
                  const userSnapshot = await get(userRef);
                  
                  if (userSnapshot.exists()) {
                    const otherUser = {
                      uid: otherUserId,
                      ...userSnapshot.val()
                    };
                    Alert.alert('Debug', `Found other user: ${otherUser.email}`);
                    
                    // Mesajları dinle
                    const messagesRef = ref(database, `privateChats/${chatId}/messages`);
                    
                    // Eğer bu chat için zaten bir dinleyici varsa, onu kaldır
                    if (unsubscribeMessages[chatId]) {
                      Alert.alert('Debug', `Removing old listener for chat: ${chatId}`);
                      unsubscribeMessages[chatId]();
                    }

                    // Yeni mesaj geldiğinde
                    const addedUnsubscribe = onChildAdded(messagesRef, (messageSnapshot) => {
                      const message = messageSnapshot.val();
                      Alert.alert('Debug', `New message received: ${JSON.stringify(message)}`);
                      updateChatList(chatId, otherUser, message);
                    });

                    // Mesaj değiştiğinde
                    const changedUnsubscribe = onChildChanged(messagesRef, (messageSnapshot) => {
                      const message = messageSnapshot.val();
                      Alert.alert('Debug', `Message changed: ${JSON.stringify(message)}`);
                      updateChatList(chatId, otherUser, message);
                    });

                    // Unsubscribe fonksiyonlarını sakla
                    unsubscribeMessages[chatId] = () => {
                      addedUnsubscribe();
                      changedUnsubscribe();
                    };

                    // Mevcut son mesajı al
                    const messagesSnapshot = await get(query(messagesRef, limitToLast(1)));
                    if (messagesSnapshot.exists()) {
                      const messages = messagesSnapshot.val();
                      const lastMessage = Object.values(messages)[0];
                      Alert.alert('Debug', `Last message: ${JSON.stringify(lastMessage)}`);
                      updateChatList(chatId, otherUser, lastMessage);
                    } else {
                      Alert.alert('Debug', `No messages found for chat: ${chatId}`);
                    }
                  } else {
                    Alert.alert('Debug', `User not found: ${otherUserId}`);
                  }
                } catch (error) {
                  Alert.alert('Error', `Error processing chat: ${error.message}`);
                }
              }
            }
          } catch (error) {
            Alert.alert('Error', `Error in chat listener: ${error.message}`);
          } finally {
            setLoading(false);
          }
        });

      } catch (error) {
        Alert.alert('Error', `Initial setup error: ${error.message}`);
        setLoading(false);
      }
    };

    const updateChatList = (chatId, otherUser, message) => {
      Alert.alert('Debug', `Updating chat list with: ${JSON.stringify({ chatId, otherUser, message })}`);
      setChats(prevChats => {
        const newChats = prevChats.filter(chat => chat.chatId !== chatId);
        const updatedChat = {
          chatId,
          otherUserId: otherUser.uid,
          otherUserEmail: otherUser.email,
          lastMessage: message.text,
          timestamp: message.timestamp,
          isCurrentUser: message.senderId === auth.currentUser.uid
        };
        Alert.alert('Debug', `Adding chat: ${JSON.stringify(updatedChat)}`);
        newChats.push(updatedChat);
        
        // Sohbetleri son mesaj zamanına göre sırala
        const sortedChats = newChats.sort((a, b) => b.timestamp - a.timestamp);
        Alert.alert('Debug', `Sorted chats: ${JSON.stringify(sortedChats)}`);
        return sortedChats;
      });
    };

    loadChats();

    return () => {
      if (unsubscribeChats) {
        unsubscribeChats();
      }
      // Tüm mesaj dinleyicilerini temizle
      Object.values(unsubscribeMessages).forEach(unsubscribe => unsubscribe());
    };
  }, []);

  const handleChatPress = (chat) => {
    console.warn('Navigating to chat:', JSON.stringify(chat, null, 2));
    navigation.navigate('Chat', {
      currentUserId: auth.currentUser.uid,
      otherUserId: chat.otherUserId,
      chatId: chat.chatId,
      otherUserEmail: chat.otherUserEmail
    });
  };

  const handleNewChat = () => {
    console.warn('Navigating to New Chat screen');
    navigation.navigate('New Chat');
  };

  const renderChatItem = ({ item }) => (
    <TouchableOpacity
      style={styles.chatItem}
      onPress={() => handleChatPress(item)}
    >
      <View style={styles.chatInfo}>
        <Text style={styles.userEmail}>{item.otherUserEmail}</Text>
        <Text style={styles.lastMessage} numberOfLines={1}>
          {item.isCurrentUser ? 'You: ' : ''}{item.lastMessage}
        </Text>
      </View>
      <Text style={styles.timestamp}>
        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading chats...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity style={styles.newChatButton} onPress={handleNewChat}>
          <Text style={styles.newChatButtonText}>New Chat</Text>
        </TouchableOpacity>
      </View>
      {chats.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No messages yet</Text>
          <TouchableOpacity 
            style={styles.startChatButton}
            onPress={handleNewChat}
          >
            <Text style={styles.startChatButtonText}>Start a New Chat</Text>
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
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    backgroundColor: '#f8f8f8',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  newChatButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  newChatButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  listContainer: {
    padding: 10,
  },
  chatItem: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatInfo: {
    flex: 1,
    marginRight: 10,
  },
  userEmail: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  startChatButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  startChatButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ChatListScreen; 
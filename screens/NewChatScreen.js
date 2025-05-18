import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import { getDatabase, ref, onValue, push, set, get } from 'firebase/database';
import { getAuth } from 'firebase/auth';
import { database } from '../config/firebase-web';

const NewChatScreen = ({ navigation }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const auth = getAuth();
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      navigation.navigate('Login');
      return;
    }

    const usersRef = ref(database, 'users');
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const userList = Object.entries(data)
          .filter(([uid]) => uid !== currentUser.uid)
          .map(([uid, user]) => ({
            uid,
            ...user,
          }));
        setUsers(userList);
      } else {
        setUsers([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [navigation]);

  const filteredUsers = users.filter(user => 
    user.email && 
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const startNewChat = async (otherUser) => {
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      // Önce bu iki kullanıcı arasında bir sohbet var mı kontrol et
      const existingChatsRef = ref(database, 'privateChats');
      const existingChatsSnapshot = await get(existingChatsRef);
      
      if (existingChatsSnapshot.exists()) {
        const existingChats = existingChatsSnapshot.val();
        const existingChat = Object.entries(existingChats).find(([chatId]) => {
          return chatId.includes(currentUser.uid) && chatId.includes(otherUser.uid);
        });

        if (existingChat) {
          // Eğer sohbet zaten varsa, o sohbete yönlendir
          navigation.navigate('Chat', {
            currentUserId: currentUser.uid,
            otherUserId: otherUser.uid,
            chatId: existingChat[0],
            otherUserEmail: otherUser.email
          });
          return;
        }
      }

      // Yeni sohbet oluştur
      const chatId = `${currentUser.uid}_${otherUser.uid}`;
      const chatRef = ref(database, `privateChats/${chatId}`);
      
      const chatData = {
        participants: {
          [currentUser.uid]: currentUser.email,
          [otherUser.uid]: otherUser.email
        },
        lastMessage: '',
        lastMessageTime: new Date().toISOString(),
        deletedBy: {
          [currentUser.uid]: false,
          [otherUser.uid]: false
        }
      };
      
      await set(chatRef, chatData);
      
      navigation.navigate('Chat', {
        currentUserId: currentUser.uid,
        otherUserId: otherUser.uid,
        chatId: chatId,
        otherUserEmail: otherUser.email
      });
    } catch (error) {
      console.error('Yeni sohbet başlatma hatası:', error);
      Alert.alert('Hata', 'Yeni sohbet başlatılırken bir hata oluştu');
    }
  };

  const renderUserItem = ({ item }) => (
    <TouchableOpacity
      style={styles.userItem}
      onPress={() => startNewChat(item)}
    >
      <View style={styles.userInfo}>
        <Text style={styles.userEmail}>{item.email}</Text>
        {item.username && (
          <Text style={styles.username}>{item.username}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Kullanıcı Ara..."
          placeholderTextColor="#9ca3af"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      
      <FlatList
        data={filteredUsers}
        renderItem={renderUserItem}
        keyExtractor={item => item.uid}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchQuery ? 'Sonuç bulunamadı' : 'Kullanıcı bulunamadı'}
            </Text>
          </View>
        }
      />
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
    backgroundColor: '#fff',
  },
  searchContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  searchInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#1f2937',
  },
  listContainer: {
    padding: 16,
  },
  userItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  userInfo: {
    flex: 1,
  },
  userEmail: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  username: {
    fontSize: 14,
    color: '#6b7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
});

export default NewChatScreen; 
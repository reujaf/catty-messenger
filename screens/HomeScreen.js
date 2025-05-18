import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { getDatabase, ref, onValue, push, set } from 'firebase/database';
import { getAuth } from 'firebase/auth';
import { database } from '../config/firebase-web';

const HomeScreen = ({ navigation }) => {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const auth = getAuth();
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      navigation.navigate('Login');
      return;
    }

    const chatsRef = ref(database, 'chats');
    const unsubscribe = onValue(chatsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const chatList = Object.entries(data)
          .filter(([_, chat]) => chat.participants && chat.participants[currentUser.uid])
          .map(([id, chat]) => ({
            id,
            ...chat,
            lastMessage: chat.messages ? Object.values(chat.messages).pop() : null,
          }))
          .sort((a, b) => {
            if (!a.lastMessage || !b.lastMessage) return 0;
            return b.lastMessage.timestamp - a.lastMessage.timestamp;
          });
        setChats(chatList);
      } else {
        setChats([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [navigation]);

  const filteredChats = chats.filter(chat => 
    chat.participants && 
    Object.values(chat.participants)
      .some(user => 
        user.email && 
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
      )
  );

  const renderChatItem = ({ item }) => {
    const auth = getAuth();
    const currentUser = auth.currentUser;
    const otherUser = Object.values(item.participants).find(
      user => user.uid !== currentUser.uid
    );

    return (
      <TouchableOpacity
        className="bg-surface border-b border-gray-200 p-4"
        onPress={() => navigation.navigate('Chat', { chatId: item.id, otherUser })}
      >
        <View className="flex-row justify-between items-center">
          <View className="flex-1">
            <Text className="text-lg font-semibold text-gray-900">
              {otherUser?.email || 'Unknown User'}
            </Text>
            {item.lastMessage && (
              <Text className="text-gray-600 mt-1">
                {item.lastMessage.text}
              </Text>
            )}
          </View>
          {item.lastMessage && (
            <Text className="text-gray-400 text-sm">
              {new Date(item.lastMessage.timestamp).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-surface">
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-surface">
      <View className="p-4">
        <TextInput
          className="bg-background border border-gray-300 rounded-lg px-4 py-3"
          placeholder="Sohbet Ara..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      
      <FlatList
        data={filteredChats}
        renderItem={renderChatItem}
        keyExtractor={item => item.id}
        ListEmptyComponent={
          <View className="flex-1 justify-center items-center p-4">
            <Text className="text-gray-500 text-center">
              {searchQuery ? 'Sonuç bulunamadı' : 'Henüz sohbet yok'}
            </Text>
          </View>
        }
      />
    </View>
  );
};

export default HomeScreen; 
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from 'react-native';
import { ref, push, onValue, off, set } from 'firebase/database';
import { database, auth } from '../config/firebase';

const ChatScreen = ({ route }) => {
  const { currentUserId, otherUserId, chatId, otherUserEmail } = route.params;
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    console.log('Chat screen mounted with params:', { currentUserId, otherUserId, chatId, otherUserEmail });
    
    const messagesRef = ref(database, `privateChats/${chatId}/messages`);
    console.log('Messages reference path:', messagesRef.toString());
    
    const handleData = (snapshot) => {
      const data = snapshot.val();
      console.log('Received messages data:', data);
      
      if (data) {
        const messagesArray = Object.entries(data).map(([id, message]) => ({
          id,
          ...message,
        }));
        console.log('Processed messages array:', messagesArray);
        setMessages(messagesArray);
      } else {
        console.log('No messages found for this chat');
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
      console.log('Sending message:', newMessage);
      console.log('Chat ID:', chatId);
      console.log('Current user ID:', currentUserId);
      
      const messagesRef = ref(database, `privateChats/${chatId}/messages`);
      const newMessageRef = push(messagesRef);
      
      const messageData = {
        senderId: currentUserId,
        text: newMessage,
        timestamp: Date.now()
      };
      
      console.log('Message data:', messageData);
      
      set(newMessageRef, messageData)
        .then(() => {
          console.log('Message sent successfully');
          setNewMessage('');
        })
        .catch((error) => {
          console.error('Error sending message:', error);
        });
    }
  };

  const renderMessage = ({ item }) => {
    const isCurrentUser = item.senderId === currentUserId;
    return (
      <View
        style={[
          styles.messageContainer,
          isCurrentUser ? styles.myMessage : styles.otherMessage,
        ]}
      >
        <Text style={styles.senderText}>{isCurrentUser ? 'You' : otherUserEmail}</Text>
        <Text style={styles.messageText}>{item.text}</Text>
        <Text style={styles.messageTime}>
          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chat with {otherUserEmail}</Text>
      </View>
      <FlatList
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        inverted={false}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inputContainer}
      >
        <TextInput
          style={styles.input}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Type a message..."
          multiline
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
          <Text style={styles.sendButtonText}>Send</Text>
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
  messagesList: {
    padding: 10,
  },
  messageContainer: {
    maxWidth: '80%',
    marginVertical: 5,
    padding: 10,
    borderRadius: 10,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#E9E9EB',
  },
  senderText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  messageText: {
    fontSize: 16,
    color: '#000',
  },
  messageTime: {
    fontSize: 12,
    color: '#666',
    alignSelf: 'flex-end',
    marginTop: 5,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
    maxHeight: 100,
    backgroundColor: '#f8f8f8',
  },
  sendButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ChatScreen; 
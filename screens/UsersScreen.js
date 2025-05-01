import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { ref, get } from 'firebase/database';
import { database, auth } from '../config/firebase';

const UsersScreen = ({ navigation, route }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const currentUser = auth.currentUser;
        if (!currentUser) {
          throw new Error('No authenticated user found');
        }

        console.log('Fetching users from database...');
        const usersRef = ref(database, 'users');
        const snapshot = await get(usersRef);
        
        if (!snapshot.exists()) {
          console.log('No users found in database');
          setUsers([]);
          return;
        }

        const usersData = snapshot.val();
        console.log('Users data from database:', usersData);
        
        const usersArray = Object.entries(usersData)
          .map(([uid, userData]) => ({
            uid,
            ...userData,
          }))
          .filter(user => user.uid !== currentUser.uid);

        console.log('Filtered users:', usersArray);
        setUsers(usersArray);
      } catch (error) {
        console.error('Error fetching users:', error);
        setError(error.message);
        Alert.alert('Error', 'Failed to fetch users. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const handleUserPress = (user) => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.log('No authenticated user found');
      return;
    }

    console.log('Selected user:', user);
    console.log('Current user:', currentUser);

    // Chat ID'yi UID'leri kullanarak oluştur
    const chatId = [currentUser.uid, user.uid].sort().join('_');
    console.log('Created chatId:', chatId);

    // Chat ekranına yönlendir
    console.log('Navigating to Chat screen with:', {
      currentUserId: currentUser.uid,
      otherUserId: user.uid,
      chatId: chatId,
      otherUserEmail: user.email
    });

    navigation.navigate('Chat', { 
      currentUserId: currentUser.uid,
      otherUserId: user.uid,
      chatId: chatId,
      otherUserEmail: user.email
    });
  };

  const renderUserItem = ({ item }) => (
    <TouchableOpacity
      style={styles.userItem}
      onPress={() => handleUserPress(item)}
    >
      <View style={styles.userInfo}>
        <Text style={styles.userEmail}>{item.email}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading users...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => setLoading(true)}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Select a User to Chat</Text>
      </View>
      {users.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No users available</Text>
        </View>
      ) : (
        <FlatList
          data={users}
          renderItem={renderUserItem}
          keyExtractor={(item) => item.uid}
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#ff3b30',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
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
  listContainer: {
    padding: 10,
  },
  userItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userEmail: {
    fontSize: 16,
    color: '#333',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
});

export default UsersScreen; 
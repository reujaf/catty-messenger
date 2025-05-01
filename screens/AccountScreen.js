import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { auth, database } from '../config/firebase';
import { ref, get, update } from 'firebase/database';
import { signOut, updatePassword } from 'firebase/auth';

const AccountScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [username, setUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        navigation.navigate('Login');
        return;
      }

      const userRef = ref(database, `users/${currentUser.uid}`);
      const snapshot = await get(userRef);
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        setUserData(data);
        setUsername(data.username);
      }
      
      setLoading(false);
    } catch (error) {
      Alert.alert('Hata', 'Kullanıcı bilgileri yüklenirken bir hata oluştu.');
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      // Kullanıcı adının benzersiz olduğunu kontrol et
      if (username !== userData.username) {
        const usersRef = ref(database, 'users');
        const usersSnapshot = await get(usersRef);
        const users = usersSnapshot.val() || {};
        
        const isUsernameTaken = Object.values(users).some(
          user => user.username === username && user.email !== userData.email
        );
        
        if (isUsernameTaken) {
          Alert.alert('Hata', 'Bu kullanıcı adı zaten kullanılıyor.');
          return;
        }
      }

      const updates = {
        username: username,
      };

      await update(ref(database, `users/${currentUser.uid}`), updates);

      if (newPassword) {
        await updatePassword(currentUser, newPassword);
      }

      Alert.alert('Başarılı', 'Hesap bilgileriniz güncellendi.');
      setIsEditing(false);
      setNewPassword('');
      loadUserData();
    } catch (error) {
      let errorMessage = 'Bilgiler güncellenirken bir hata oluştu.';
      if (error.code === 'auth/weak-password') {
        errorMessage = 'Şifre en az 6 karakter olmalıdır.';
      }
      Alert.alert('Hata', errorMessage);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigation.navigate('Login');
    } catch (error) {
      Alert.alert('Hata', 'Çıkış yapılırken bir hata oluştu.');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Hesap Ayarları</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.infoContainer}>
          <Text style={styles.label}>E-posta</Text>
          <Text style={styles.value}>{userData?.email}</Text>
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.label}>Kullanıcı Adı</Text>
          {isEditing ? (
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
          ) : (
            <Text style={styles.value}>{userData?.username}</Text>
          )}
        </View>

        {isEditing && (
          <View style={styles.infoContainer}>
            <Text style={styles.label}>Yeni Şifre (İsteğe bağlı)</Text>
            <TextInput
              style={styles.input}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              placeholder="Yeni şifre girin"
            />
          </View>
        )}

        <TouchableOpacity
          style={[styles.button, isEditing ? styles.saveButton : styles.editButton]}
          onPress={isEditing ? handleSave : () => setIsEditing(true)}
        >
          <Text style={styles.buttonText}>
            {isEditing ? 'Kaydet' : 'Düzenle'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.logoutButton]}
          onPress={handleLogout}
        >
          <Text style={[styles.buttonText, styles.logoutButtonText]}>
            Çıkış Yap
          </Text>
        </TouchableOpacity>
      </View>
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
  content: {
    padding: 20,
  },
  infoContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  value: {
    fontSize: 16,
    color: '#333',
  },
  input: {
    backgroundColor: '#f8f8f8',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  button: {
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginBottom: 15,
  },
  editButton: {
    backgroundColor: '#007AFF',
  },
  saveButton: {
    backgroundColor: '#34C759',
  },
  logoutButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButtonText: {
    color: '#FF3B30',
  },
});

export default AccountScreen; 
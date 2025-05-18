import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  Image,
  Modal,
} from 'react-native';
import { getAuth, updatePassword, signOut } from 'firebase/auth';
import { getDatabase, ref, get, set } from 'firebase/database';
import { database } from '../config/firebase-web';

const AccountScreen = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [imageUrl, setImageUrl] = useState('');

  useEffect(() => {
    const auth = getAuth();
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      navigation.navigate('Login');
      return;
    }

    const userRef = ref(database, `users/${currentUser.uid}`);
    get(userRef).then((snapshot) => {
      if (snapshot.exists()) {
        setUsername(snapshot.val().username || '');
        setProfileImage(snapshot.val().profileImage);
      }
      setLoading(false);
    });
  }, [navigation]);

  const handleUpdateProfile = async () => {
    try {
      setUpdating(true);
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (newPassword && confirmPassword) {
        if (newPassword !== confirmPassword) {
          Alert.alert('Hata', 'Şifreler eşleşmiyor');
          return;
        }
        if (newPassword.length < 6) {
          Alert.alert('Hata', 'Şifre en az 6 karakter olmalıdır');
          return;
        }
        await updatePassword(currentUser, newPassword);
      }

      const userRef = ref(database, `users/${currentUser.uid}`);
      await set(userRef, {
        email: currentUser.email,
        username: username,
        profileImage: profileImage,
      });

      Alert.alert('Başarılı', 'Profil güncellendi');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      Alert.alert('Hata', error.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleLogout = async () => {
    try {
      const auth = getAuth();
      await signOut(auth);
      navigation.navigate('Login');
    } catch (error) {
      Alert.alert('Hata', error.message);
    }
  };

  const handleProfileImageUpdate = () => {
    setModalVisible(true);
  };

  const handleSaveImageUrl = async () => {
    if (!imageUrl) {
      Alert.alert('Hata', 'Geçerli bir URL girmelisiniz');
      return;
    }

    try {
      // URL'in geçerli olup olmadığını kontrol et
      const response = await fetch(imageUrl);
      if (!response.ok || !response.headers.get('content-type')?.includes('image')) {
        throw new Error('Geçersiz resim URL\'i');
      }

      const auth = getAuth();
      const currentUser = auth.currentUser;
      const userRef = ref(database, `users/${currentUser.uid}`);
      await set(userRef, {
        email: currentUser.email,
        username: username,
        profileImage: imageUrl,
      });

      setProfileImage(imageUrl);
      setModalVisible(false);
      setImageUrl('');
      Alert.alert('Başarılı', 'Profil fotoğrafı güncellendi');
    } catch (error) {
      Alert.alert('Hata', 'Geçersiz resim URL\'i. Lütfen başka bir URL deneyin.');
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
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Profil Fotoğrafı URL</Text>
            <TextInput
              style={styles.modalInput}
              value={imageUrl}
              onChangeText={setImageUrl}
              placeholder="Resim URL'ini girin"
              placeholderTextColor="#9ca3af"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setModalVisible(false);
                  setImageUrl('');
                }}
              >
                <Text style={styles.modalButtonText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveImageUrl}
              >
                <Text style={styles.modalButtonText}>Kaydet</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={styles.content}>
        <Text style={styles.title}>Hesap Ayarları</Text>
        
        <View style={styles.profileSection}>
          <TouchableOpacity 
            style={styles.imageContainer} 
            onPress={handleProfileImageUpdate}
          >
            {profileImage ? (
              <Image
                source={{ uri: profileImage }}
                style={styles.profileImage}
                onError={() => {
                  Alert.alert('Hata', 'Fotoğraf yüklenirken bir hata oluştu.');
                  setProfileImage(null);
                }}
              />
            ) : (
              <View style={styles.placeholderImage}>
                <Text style={styles.placeholderText}>
                  {username?.charAt(0)?.toUpperCase() || '?'}
                </Text>
              </View>
            )}
            <View style={styles.editBadge}>
              <Text style={styles.editBadgeText}>Düzenle</Text>
            </View>
          </TouchableOpacity>

          <Text style={styles.email}>{username}</Text>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Kullanıcı Adı</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            placeholder="Kullanıcı adınızı girin"
            placeholderTextColor="#9ca3af"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Yeni Şifre</Text>
          <TextInput
            style={styles.input}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="Yeni şifrenizi girin"
            placeholderTextColor="#9ca3af"
            secureTextEntry
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Şifre Tekrar</Text>
          <TextInput
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Şifrenizi tekrar girin"
            placeholderTextColor="#9ca3af"
            secureTextEntry
          />
        </View>

        <TouchableOpacity
          style={[styles.button, styles.updateButton]}
          onPress={handleUpdateProfile}
          disabled={updating}
        >
          {updating ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>Profili Güncelle</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.logoutButton]}
          onPress={handleLogout}
        >
          <Text style={styles.buttonText}>Çıkış Yap</Text>
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
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#1f2937',
  },
  button: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  updateButton: {
    backgroundColor: '#007AFF',
  },
  logoutButton: {
    backgroundColor: '#ef4444',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  profileSection: {
    alignItems: 'center',
    marginVertical: 32,
  },
  imageContainer: {
    width: 150,
    height: 150,
    borderRadius: 75,
    marginBottom: 16,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 75,
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    borderRadius: 75,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#9ca3af',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  editBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  email: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#1f2937',
  },
  modalInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#1f2937',
    marginBottom: 15,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginLeft: 10,
  },
  cancelButton: {
    backgroundColor: '#ef4444',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  modalButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default AccountScreen; 
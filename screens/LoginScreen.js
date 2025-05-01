import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  KeyboardAvoidingView,
  Platform,
  Alert
} from 'react-native';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { ref, set, get } from 'firebase/database';
import { auth, database } from '../config/firebase';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isLogin, setIsLogin] = useState(true);

  const handleAuth = async () => {
    if (!email || !password || (!isLogin && !username)) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurun.');
      return;
    }

    try {
      let userCredential;
      if (isLogin) {
        console.log('Giriş denemesi:', email);
        userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log('Giriş başarılı, kullanıcı:', userCredential.user);
      } else {
        // Kullanıcı adının benzersiz olduğunu kontrol et
        const usersRef = ref(database, 'users');
        const usersSnapshot = await get(usersRef);
        const users = usersSnapshot.val() || {};
        
        const isUsernameTaken = Object.values(users).some(user => user.username === username);
        if (isUsernameTaken) {
          Alert.alert('Hata', 'Bu kullanıcı adı zaten kullanılıyor.');
          return;
        }

        console.log('Kayıt denemesi:', email);
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
        console.log('Kayıt başarılı, kullanıcı:', userCredential.user);
        
        // Kullanıcı bilgilerini veritabanına kaydet
        const userRef = ref(database, `users/${userCredential.user.uid}`);
        const userData = {
          email: email,
          username: username,
          createdAt: new Date().toISOString()
        };
        console.log('Kullanıcı verileri kaydediliyor:', userData);
        await set(userRef, userData);
        console.log('Kullanıcı verileri başarıyla kaydedildi');

        // Kaydedilen veriyi kontrol et
        const savedData = await get(userRef);
        console.log('Kaydedilen veri kontrolü:', savedData.val());
      }
      
      // Ana ekrana yönlendir
      console.log('Ana ekrana yönlendiriliyor');
      navigation.navigate('Main');
    } catch (error) {
      console.error('Kimlik doğrulama hatası:', error);
      let errorMessage = 'Bir hata oluştu.';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Bu e-posta adresi zaten kullanılıyor.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Geçersiz e-posta adresi.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Şifre en az 6 karakter olmalıdır.';
      } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMessage = 'E-posta veya şifre hatalı.';
      }
      Alert.alert('Hata', errorMessage);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.logoContainer}>
        <Text style={styles.logoText}>CATTY</Text>
      </View>
      
      <View style={styles.formContainer}>
        {!isLogin && (
          <TextInput
            style={styles.input}
            placeholder="Kullanıcı Adı"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
        )}

        <TextInput
          style={styles.input}
          placeholder="E-posta"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        
        <TextInput
          style={styles.input}
          placeholder="Şifre"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        
        <TouchableOpacity 
          style={styles.authButton}
          onPress={handleAuth}
        >
          <Text style={styles.authButtonText}>
            {isLogin ? 'Giriş Yap' : 'Kayıt Ol'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.switchButton}
          onPress={() => setIsLogin(!isLogin)}
        >
          <Text style={styles.switchButtonText}>
            {isLogin ? 'Hesabınız yok mu? Kayıt Olun' : 'Zaten hesabınız var mı? Giriş Yapın'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 100,
    marginBottom: 50,
  },
  logoText: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  formContainer: {
    paddingHorizontal: 20,
  },
  input: {
    backgroundColor: '#f8f8f8',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  authButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginBottom: 15,
  },
  authButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  switchButton: {
    alignItems: 'center',
  },
  switchButtonText: {
    color: '#007AFF',
    fontSize: 16,
  },
});

export default LoginScreen; 
import { Platform } from 'react-native';
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase, ref, set } from 'firebase/database';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCyUfIEyDGmwGZJU-VTbifk8ZhAStYRn24",
  authDomain: "catty-message.firebaseapp.com",
  databaseURL: "https://catty-message-default-rtdb.firebaseio.com",
  projectId: "catty-message",
  storageBucket: "catty-message.firebasestorage.app",
  messagingSenderId: "762334512293",
  appId: "1:762334512293:web:d3edbbb5de41c29c43f94c"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get Auth instance
const auth = getAuth(app);

// Get Database instance
const database = getDatabase(app);

// Get Storage instance with CORS configuration
const storage = getStorage(app);

// Configure CORS for web platform
if (Platform.OS === 'web') {
  // Import web-specific persistence
  import('firebase/auth').then(({ setPersistence, browserLocalPersistence }) => {
    setPersistence(auth, browserLocalPersistence)
      .catch((error) => {
        console.error('Error setting auth persistence:', error);
      });
  });
}

// Test database connection
const testConnection = async () => {
  try {
    const testRef = ref(database, 'test');
    await set(testRef, { timestamp: new Date().toISOString() });
    console.log('Database connection successful');
  } catch (error) {
    console.error('Database connection error:', error);
  }
};

// Run test on initialization
testConnection();

export { auth, database, storage }; 
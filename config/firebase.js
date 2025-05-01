import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth';
import { ref, set } from 'firebase/database';

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

// Get database instance
const database = getDatabase(app);

// Get auth instance
const auth = getAuth(app);

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

export { auth, database }; 
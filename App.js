import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import LoginScreen from './screens/LoginScreen';
import ChatScreen from './screens/ChatScreen';
import UsersScreen from './screens/UsersScreen';
import ChatListScreen from './screens/ChatListScreen';
import AccountScreen from './screens/AccountScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Mesajlar') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'Yeni Sohbet') {
            iconName = focused ? 'add-circle' : 'add-circle-outline';
          } else if (route.name === 'Hesabım') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Mesajlar" component={ChatListScreen} />
      <Tab.Screen name="Yeni Sohbet" component={UsersScreen} />
      <Tab.Screen name="Hesabım" component={AccountScreen} />
    </Tab.Navigator>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerStyle: {
              backgroundColor: '#f8f8f8',
            },
            headerTintColor: '#000',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        >
          <Stack.Screen 
            name="Login" 
            component={LoginScreen} 
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="Main" 
            component={MainTabs} 
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="Chat" 
            component={ChatScreen} 
            options={({ route }) => ({
              title: `${route.params?.otherUserEmail || 'Kullanıcı'} ile Sohbet`,
              headerBackTitle: 'Geri'
            })}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
} 
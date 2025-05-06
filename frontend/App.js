import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

// Import i18n
import './i18n';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';

// Import screens
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import HomeScreen from './screens/HomeScreen';
import LoadingScreen from './screens/LoadingScreen';
import EditProfileScreen from './screens/EditProfileScreen';

// Import contacts screens
import ContactsScreen from './screens/ContactsScreen';
import AddContactScreen from './screens/AddContactScreen';
import ContactDetailScreen from './screens/ContactDetailScreen';

// Import messages screens
import ConversationsScreen from './screens/ConversationsScreen';
import ConversationScreen from './screens/ConversationScreen';

// Import providers
import { AuthProvider, useAuth } from './context/AuthContext';
import { ContactsProvider } from './context/ContactsContext';
import { MessagesProvider } from './context/MessagesContext';
import { ThemeProvider } from './context/ThemeContext';

// Import custom header
import GlobalHeader from './components/GlobalHeader';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Custom screen options to hide default header
const screenOptions = {
  headerShown: false, // Hide default navigation header
};

// Auth stack for unauthenticated users
const AuthStack = () => {
  const { t } = useTranslation();
  
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
};

// Home stack
const HomeStack = () => {
  const { t } = useTranslation();
  
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="Profile" component={HomeScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
    </Stack.Navigator>
  );
};

// Contacts stack
const ContactsStack = () => {
  const { t } = useTranslation();
  
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="ContactsList" component={ContactsScreen} />
      <Stack.Screen name="AddContact" component={AddContactScreen} />
      <Stack.Screen name="ContactDetail" component={ContactDetailScreen} />
    </Stack.Navigator>
  );
};

// Messages stack within tabs - only shows conversations list
const TabMessagesStack = () => {
  const { t } = useTranslation();
  
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="ConversationsList" component={ConversationsScreen} />
    </Stack.Navigator>
  );
};

// Main messages stack for both tabbed and non-tabbed navigation
const MessagesStack = () => {
  const { t } = useTranslation();
  
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="ConversationsList" component={ConversationsScreen} />
      <Stack.Screen name="Conversation" component={ConversationScreen} />
    </Stack.Navigator>
  );
};

// App tabs for authenticated users
const AppTabs = () => {
  const { t } = useTranslation();
  
  return (
    <Tab.Navigator
      initialRouteName="Contacts"
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'person' : 'person-outline';
          } else if (route.name === 'Contacts') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Messages') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#3498db',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Contacts" component={ContactsStack} />
      <Tab.Screen name="Messages" component={TabMessagesStack} />
      <Tab.Screen name="Home" component={HomeStack} />
    </Tab.Navigator>
  );
};

// Root stack navigator that contains both the tabs and full-screen screens
const RootStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, presentation: 'card' }}>
      <Stack.Screen name="Tabs" component={AppTabs} />
      <Stack.Screen 
        name="MessagesStack" 
        component={MessagesStack}
        options={{ 
          presentation: 'card',
          animationEnabled: true
        }}
      />
    </Stack.Navigator>
  );
};

// Main navigator that switches between auth and app stacks
const RootNavigator = () => {
  const { isLoading, authState } = useAuth();

  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      {isLoading ? (
        <Stack.Navigator screenOptions={screenOptions}>
          <Stack.Screen name="Loading" component={LoadingScreen} />
        </Stack.Navigator>
      ) : (
        authState.token ? <RootStack /> : <AuthStack />
      )}
    </NavigationContainer>
  );
};

// Main App component wrapped with providers
export default function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <AuthProvider>
        <ContactsProvider>
          <MessagesProvider>
            <ThemeProvider>
              <RootNavigator />
            </ThemeProvider>
          </MessagesProvider>
        </ContactsProvider>
      </AuthProvider>
    </I18nextProvider>
  );
}

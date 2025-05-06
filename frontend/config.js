import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Application Configuration
 * 
 * This file contains environment-specific configuration for the app.
 * It automatically detects the running environment and sets appropriate values.
 */

// Determine if running in Expo Go
const isExpoGo = Constants.executionEnvironment === 'storeClient';

// Configure API URL based on platform and environment
let apiBaseUrl;

if (Platform.OS === 'android') {
  // Android emulator uses 10.0.2.2 to access host machine
  apiBaseUrl = isExpoGo ? 'http://192.168.1.10:5000/api' : 'http://10.0.2.2:5000/api';
} else if (Platform.OS === 'ios') {
  // iOS simulator can use localhost directly
  apiBaseUrl = isExpoGo ? 'http://192.168.1.10:5000/api' : 'http://localhost:5000/api';
} else {
  // Web or other platforms
  apiBaseUrl = 'http://localhost:5000/api';
}

// Export configuration constants
export const API_URL = apiBaseUrl;

// For development: uncomment to override with a specific URL
// export const API_URL = 'http://your-custom-ip:5000/api'; 
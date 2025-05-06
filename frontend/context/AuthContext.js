import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';
import { Alert } from 'react-native';

// Create auth context
const AuthContext = createContext();

/**
 * Hook to use the auth context
 */
export const useAuth = () => {
  return useContext(AuthContext);
};

/**
 * Provider component that handles authentication state
 */
export const AuthProvider = ({ children }) => {
  // State
  const [isLoading, setIsLoading] = useState(true);
  const [userToken, setUserToken] = useState(null);
  const [userData, setUserData] = useState(null);
  const [error, setError] = useState(null);
  const [sessionExpired, setSessionExpired] = useState(false);

  // Aggregated auth state for consumers
  const authState = {
    token: userToken,
    user: userData,
    userId: userData?.id,
    isAuthenticated: !!userToken,
    sessionExpired
  };

  /**
   * Clear session expired flag
   */
  const clearSessionExpired = () => {
    setSessionExpired(false);
  };

  /**
   * Handle unauthorized responses (token expired or invalid)
   */
  const handleUnauthorized = async (errorMessage) => {
    console.log('Session expired or unauthorized:', errorMessage);
    setSessionExpired(true);
    await logout();
  };

  /**
   * Fetch user data from API
   */
  const fetchUserData = async (token) => {
    try {
      const response = await fetch(`${API_URL}/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 401) {
          await handleUnauthorized(data.message || 'Session expired');
          return false;
        }
        throw new Error(data.message || 'Failed to fetch user data');
      }
      
      setUserData(data.user);
      return true;
    } catch (error) {
      console.error('Error fetching user data:', error);
      
      if (error.message && (
          error.message.includes('token') || 
          error.message.includes('unauthorized') || 
          error.message.includes('expired') ||
          error.message.includes('Invalid') ||
          error.message.includes('User not found')
        )) {
        await handleUnauthorized(error.message);
        return false;
      }
      
      return false;
    }
  };

  /**
   * Check if user is logged in on app load
   */
  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
          setUserToken(token);
          await fetchUserData(token);
        }
      } catch (e) {
        console.error('Failed to load token', e);
      } finally {
        setIsLoading(false);
      }
    };

    bootstrapAsync();
  }, []);

  /**
   * Login with username and password
   */
  const login = async (username, password) => {
    setIsLoading(true);
    setError(null);
    setSessionExpired(false);

    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // Save auth data
      await AsyncStorage.setItem('userToken', data.token);
      await AsyncStorage.setItem('userId', data.user.id.toString());
      await AsyncStorage.setItem('username', data.user.username);

      setUserToken(data.token);
      setUserData(data.user);
      
      return { success: true };
    } catch (error) {
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Register a new user account
   */
  const register = async (username, email, password, phoneNumber, avatarUri) => {
    setIsLoading(true);
    setError(null);

    try {
      let response;

      if (avatarUri) {
        const formData = new FormData();
        
        const uriParts = avatarUri.split('.');
        const fileType = uriParts[uriParts.length - 1];
        
        formData.append('username', username);
        formData.append('email', email);
        formData.append('password', password);
        if (phoneNumber) {
          formData.append('phone_number', phoneNumber);
        }
        
        formData.append('avatar', {
          uri: avatarUri,
          name: `avatar.${fileType}`,
          type: `image/${fileType}`
        });
        
        response = await fetch(`${API_URL}/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          body: formData,
        });
      } else {
        response = await fetch(`${API_URL}/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            username, 
            email, 
            password, 
            phone_number: phoneNumber || null
          }),
        });
      }

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Registration failed');
        return { success: false, error: data.message || 'Registration failed' };
      }

      // Save auth data
      await AsyncStorage.setItem('userToken', data.token);
      await AsyncStorage.setItem('userId', data.user.id.toString());
      await AsyncStorage.setItem('username', data.user.username);

      setUserToken(data.token);
      setUserData(data.user);
      
      return { success: true };
    } catch (error) {
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Logout the current user
   */
  const logout = async () => {
    setIsLoading(true);
    try {
      await AsyncStorage.multiRemove(['userToken', 'userId', 'username']);
      setUserToken(null);
      setUserData(null);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Update user profile 
   */
  const updateProfile = async (username, email, phoneNumber, avatarUri) => {
    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      
      formData.append('username', username);
      formData.append('email', email);
      if (phoneNumber) {
        formData.append('phone_number', phoneNumber);
      }
      
      if (avatarUri && !avatarUri.startsWith('data:image')) {
        const uriParts = avatarUri.split('.');
        const fileType = uriParts[uriParts.length - 1];
        
        formData.append('avatar', {
          uri: avatarUri,
          name: `avatar.${fileType}`,
          type: `image/${fileType}`
        });
      }
      
      const response = await fetch(`${API_URL}/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${authState.token}`,
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          await handleUnauthorized(data.message || 'Session expired');
          return { success: false, error: 'Session expired' };
        }
        throw new Error(data.message || 'Profile update failed');
      }

      setUserData(data.user);
      
      return { success: true };
    } catch (error) {
      setError(error.message);
      
      if (error.message && (
          error.message.includes('token') || 
          error.message.includes('unauthorized') || 
          error.message.includes('expired')
        )) {
        await handleUnauthorized(error.message);
        return { success: false, error: 'Session expired' };
      }
      
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Check if phone number exists
   */
  const checkPhoneNumberExists = async (phoneNumber) => {
    try {
      const response = await fetch(`${API_URL}/check-phone?phone_number=${encodeURIComponent(phoneNumber)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();
      
      return { 
        exists: response.status === 409, 
        message: data.message || 'An error occurred'
      };
    } catch (error) {
      console.error('Error checking phone number:', error);
      return { exists: false, message: 'Network error' };
    }
  };

  /**
   * Check if username exists
   */
  const checkUsernameExists = async (username) => {
    try {
      const response = await fetch(`${API_URL}/check-username?username=${encodeURIComponent(username)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();
      
      return { 
        exists: response.status === 409, 
        message: data.message || 'An error occurred'
      };
    } catch (error) {
      console.error('Error checking username:', error);
      return { exists: false, message: 'Network error' };
    }
  };

  /**
   * Check if email exists
   */
  const checkEmailExists = async (email) => {
    try {
      const response = await fetch(`${API_URL}/check-email?email=${encodeURIComponent(email)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();
      
      return { 
        exists: response.status === 409, 
        message: data.message || 'An error occurred'
      };
    } catch (error) {
      console.error('Error checking email:', error);
      return { exists: false, message: 'Network error' };
    }
  };

  /**
   * Utility to handle API responses with potential authorization errors
   */
  const handleApiResponse = async (response) => {
    if (response.status === 401) {
      const data = await response.json().catch(() => ({}));
      await handleUnauthorized(data.message || 'Session expired');
      return { success: false, error: 'Session expired', unauthorized: true };
    }
    return null; // No auth error detected
  };

  // Context value
  const contextValue = {
    isLoading,
    error,
    authState,
    userToken,
    userData,
    login,
    register,
    logout,
    updateProfile,
    checkPhoneNumberExists,
    checkUsernameExists,
    checkEmailExists,
    handleApiResponse,
    handleUnauthorized,
    clearSessionExpired
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}; 
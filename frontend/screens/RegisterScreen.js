import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert,
  ActivityIndicator,
  ScrollView,
  Image,
  Platform,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  SafeAreaView
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import GlobalHeader from '../components/GlobalHeader';

const RegisterScreen = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [avatar, setAvatar] = useState(null);
  const [isCheckingPhone, setIsCheckingPhone] = useState(false);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const { register, isLoading, checkPhoneNumberExists, checkUsernameExists, checkEmailExists } = useAuth();
  const phoneNumberTimeoutRef = useRef(null);
  const usernameTimeoutRef = useRef(null);
  const emailTimeoutRef = useRef(null);
  const { t, i18n } = useTranslation();
  
  // Use error keys instead of directly translated strings
  const [errorKeys, setErrorKeys] = useState({
    username: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
    general: ''
  });
  
  // Create local errors object for display
  const errors = {
    username: errorKeys.username ? t(errorKeys.username) : '',
    email: errorKeys.email ? t(errorKeys.email) : '',
    phoneNumber: errorKeys.phoneNumber ? t(errorKeys.phoneNumber) : '',
    password: errorKeys.password ? t(errorKeys.password) : '',
    confirmPassword: errorKeys.confirmPassword ? t(errorKeys.confirmPassword) : '',
    general: errorKeys.general ? t(errorKeys.general) : ''
  };

  // Handle username input with validation
  const handleUsernameChange = (text) => {
    // Store the raw input
    setUsername(text);
    
    // Clear error when user types
    setErrorKeys({...errorKeys, username: ''});
    
    // Clear any existing timeout
    if (usernameTimeoutRef.current) {
      clearTimeout(usernameTimeoutRef.current);
    }
    
    // Skip checking if username is too short
    if (text.length < 3) {
      return;
    }
    
    // Set a new timeout for the check
    usernameTimeoutRef.current = setTimeout(() => {
      validateUsername(text);
    }, 500); // 500ms debounce
  };
  
  // Validate username with backend check
  const validateUsername = async (username) => {
    // Skip validation if empty
    if (!username || username.length < 3) {
      return;
    }
    
    // Check with the backend
    setIsCheckingUsername(true);
    const result = await checkUsernameExists(username);
    setIsCheckingUsername(false);
    
    if (result.exists) {
      setErrorKeys({
        ...errorKeys, 
        username: 'auth.usernameTaken'
      });
    }
  };
  
  // Handle email input with validation
  const handleEmailChange = (text) => {
    // Store the raw input
    setEmail(text);
    
    // Clear error when user types
    setErrorKeys({...errorKeys, email: ''});
    
    // Clear any existing timeout
    if (emailTimeoutRef.current) {
      clearTimeout(emailTimeoutRef.current);
    }
    
    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(text)) {
      return;
    }
    
    // Set a new timeout for the check
    emailTimeoutRef.current = setTimeout(() => {
      validateEmail(text);
    }, 500); // 500ms debounce
  };
  
  // Validate email with backend check
  const validateEmail = async (email) => {
    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return;
    }
    
    // Check with the backend
    setIsCheckingEmail(true);
    const result = await checkEmailExists(email);
    setIsCheckingEmail(false);
    
    if (result.exists) {
      setErrorKeys({
        ...errorKeys, 
        email: 'auth.emailRegistered'
      });
    }
  };

  // Clean phone number by removing spaces
  const cleanPhoneNumber = (number) => {
    return number.replace(/\s+/g, '');
  };

  // Check if the phone number is valid format
  const isValidPhoneFormat = (number) => {
    const frenchPhoneRegex = /^(\+33[1-9][0-9]{8}|0[1-9][0-9]{8})$/;
    return frenchPhoneRegex.test(number);
  };

  // Handle phone number input with validation
  const handlePhoneNumberChange = (text) => {
    // Store the raw input
    setPhoneNumber(text);
    
    // Clear error when user types
    setErrorKeys({...errorKeys, phoneNumber: ''});
    
    // Clear any existing timeout
    if (phoneNumberTimeoutRef.current) {
      clearTimeout(phoneNumberTimeoutRef.current);
    }
    
    // Set a new timeout for the check
    phoneNumberTimeoutRef.current = setTimeout(() => {
      validatePhoneNumber(text);
    }, 500); // 500ms debounce
  };

  // Validate phone number with backend check
  const validatePhoneNumber = async (text) => {
    const cleanedNumber = cleanPhoneNumber(text);
    
    // Skip validation if empty or too short
    if (!cleanedNumber || cleanedNumber.length < 10) {
      return;
    }
    
    // Skip validation if invalid format
    if (!isValidPhoneFormat(cleanedNumber)) {
      setErrorKeys({
        ...errorKeys, 
        phoneNumber: 'auth.phoneNumberFormat'
      });
      return;
    }
    
    // Check with the backend
    setIsCheckingPhone(true);
    const result = await checkPhoneNumberExists(cleanedNumber);
    setIsCheckingPhone(false);
    
    if (result.exists) {
      setErrorKeys({
        ...errorKeys, 
        phoneNumber: 'auth.phoneRegistered'
      });
    }
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (phoneNumberTimeoutRef.current) {
        clearTimeout(phoneNumberTimeoutRef.current);
      }
      if (usernameTimeoutRef.current) {
        clearTimeout(usernameTimeoutRef.current);
      }
      if (emailTimeoutRef.current) {
        clearTimeout(emailTimeoutRef.current);
      }
    };
  }, []);

  // Request permissions and pick image
  const pickImage = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('profile.permissionNeeded'), t('profile.cameraPermission'));
        return;
      }
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.cancelled && result.assets && result.assets.length > 0) {
      setAvatar(result.assets[0].uri);
    }
  };

  const handleRegister = async () => {
    // Reset all errors
    setErrorKeys({
      username: '',
      email: '',
      phoneNumber: '',
      password: '',
      confirmPassword: '',
      general: ''
    });

    // Form validation
    let hasErrors = false;
    const newErrorKeys = {...errorKeys};
    
    if (!username) {
      newErrorKeys.username = 'auth.usernameRequired';
      hasErrors = true;
    }
    
    if (!email) {
      newErrorKeys.email = 'auth.emailRequired';
      hasErrors = true;
    } else {
      // Simple email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        newErrorKeys.email = 'auth.invalidEmail';
        hasErrors = true;
      }
    }
    
    if (!password) {
      newErrorKeys.password = 'auth.passwordRequired';
      hasErrors = true;
    }
    
    if (!confirmPassword) {
      newErrorKeys.confirmPassword = 'auth.confirmPassword';
      hasErrors = true;
    } else if (password !== confirmPassword) {
      newErrorKeys.confirmPassword = 'auth.passwordsDoNotMatch';
      hasErrors = true;
    }

    // Phone number validation (optional field)
    let cleanedPhoneNumber = null;
    if (phoneNumber) {
      // Clean the phone number before validation
      cleanedPhoneNumber = cleanPhoneNumber(phoneNumber);
      
      if (!isValidPhoneFormat(cleanedPhoneNumber)) {
        newErrorKeys.phoneNumber = 'auth.phoneNumberFormat';
        hasErrors = true;
      }
    }
    
    // Final checks for existing values
    const usernameCheckPromise = username ? checkUsernameExists(username) : Promise.resolve({ exists: false });
    const emailCheckPromise = email ? checkEmailExists(email) : Promise.resolve({ exists: false });
    const phoneCheckPromise = cleanedPhoneNumber ? checkPhoneNumberExists(cleanedPhoneNumber) : Promise.resolve({ exists: false });
    
    setIsCheckingUsername(true);
    setIsCheckingEmail(true);
    setIsCheckingPhone(true);
    
    const [usernameResult, emailResult, phoneResult] = await Promise.all([
      usernameCheckPromise, 
      emailCheckPromise, 
      phoneCheckPromise
    ]);
    
    setIsCheckingUsername(false);
    setIsCheckingEmail(false);
    setIsCheckingPhone(false);
    
    if (usernameResult.exists) {
      newErrorKeys.username = 'auth.usernameTaken';
      hasErrors = true;
    }
    
    if (emailResult.exists) {
      newErrorKeys.email = 'auth.emailRegistered';
      hasErrors = true;
    }
    
    if (phoneResult.exists) {
      newErrorKeys.phoneNumber = 'auth.phoneRegistered';
      hasErrors = true;
    }
    
    // Update errors state if we found any issues
    if (hasErrors) {
      setErrorKeys(newErrorKeys);
      return;
    }

    // All validation passed, attempt registration
    const result = await register(username, email, password, cleanedPhoneNumber, avatar);
    
    if (!result.success) {
      // Check for specific error messages and set the appropriate field error
      if (result.error.includes('Username already taken')) {
        setErrorKeys({...newErrorKeys, username: 'auth.usernameTaken'});
      } else if (result.error.includes('Email already registered')) {
        setErrorKeys({...newErrorKeys, email: 'auth.emailRegistered'});
      } else if (result.error.includes('Phone number already registered')) {
        setErrorKeys({...newErrorKeys, phoneNumber: 'auth.phoneRegistered'});
      } else {
        setErrorKeys({...newErrorKeys, general: result.error});
      }
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <GlobalHeader
          title={t('auth.register')}
          showBackButton
        />
        
        <KeyboardAvoidingView
          style={styles.keyboardAvoidContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : null}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 50 : 0}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.content}>
              <View style={styles.formContainer}>
                {/* Display general error if any */}
                {errors.general ? (
                  <Text style={styles.errorText}>{errors.general}</Text>
                ) : null}
                
                {/* Avatar selection */}
                <View style={styles.avatarContainer}>
                  <TouchableOpacity onPress={pickImage}>
                    {avatar ? (
                      <Image source={{ uri: avatar }} style={styles.avatar} />
                    ) : (
                      <View style={styles.avatarPlaceholder}>
                        <Text style={styles.avatarPlaceholderText}>{t('auth.addPhoto')}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
                
                <View style={styles.inputContainer}>
                  <View style={styles.inputWithIndicator}>
                    <TextInput
                      style={[
                        styles.input, 
                        errors.username ? styles.inputError : null,
                        isCheckingUsername ? styles.inputChecking : null
                      ]}
                      placeholder={`${t('auth.username')} *`}
                      value={username}
                      onChangeText={handleUsernameChange}
                      autoCapitalize="none"
                    />
                    {isCheckingUsername && (
                      <ActivityIndicator 
                        size="small" 
                        color="#3498db" 
                        style={styles.checkingIndicator} 
                      />
                    )}
                  </View>
                  {errors.username ? (
                    <Text style={styles.errorText}>{errors.username}</Text>
                  ) : null}
                </View>
                
                <View style={styles.inputContainer}>
                  <View style={styles.inputWithIndicator}>
                    <TextInput
                      style={[
                        styles.input, 
                        errors.email ? styles.inputError : null,
                        isCheckingEmail ? styles.inputChecking : null
                      ]}
                      placeholder={`${t('auth.email')} *`}
                      value={email}
                      onChangeText={handleEmailChange}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                    {isCheckingEmail && (
                      <ActivityIndicator 
                        size="small" 
                        color="#3498db" 
                        style={styles.checkingIndicator} 
                      />
                    )}
                  </View>
                  {errors.email ? (
                    <Text style={styles.errorText}>{errors.email}</Text>
                  ) : null}
                </View>
                
                <View style={styles.inputContainer}>
                  <View style={styles.phoneInputContainer}>
                    <TextInput
                      style={[
                        styles.input, 
                        errors.phoneNumber ? styles.inputError : null,
                        isCheckingPhone ? styles.inputChecking : null
                      ]}
                      placeholder={t('hints.phoneHint')}
                      value={phoneNumber}
                      onChangeText={handlePhoneNumberChange}
                      keyboardType="phone-pad"
                    />
                    {isCheckingPhone && (
                      <ActivityIndicator 
                        size="small" 
                        color="#3498db" 
                        style={styles.checkingIndicator} 
                      />
                    )}
                  </View>
                  {errors.phoneNumber ? (
                    <Text style={styles.errorText}>{errors.phoneNumber}</Text>
                  ) : null}
                </View>
                
                <View style={styles.inputContainer}>
                  <TextInput
                    style={[styles.input, errors.password ? styles.inputError : null]}
                    placeholder={`${t('auth.password')} *`}
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      setErrorKeys({...errorKeys, password: ''});
                    }}
                    secureTextEntry
                  />
                  {errors.password ? (
                    <Text style={styles.errorText}>{errors.password}</Text>
                  ) : null}
                </View>
                
                <View style={styles.inputContainer}>
                  <TextInput
                    style={[styles.input, errors.confirmPassword ? styles.inputError : null]}
                    placeholder={`${t('auth.confirmPassword')} *`}
                    value={confirmPassword}
                    onChangeText={(text) => {
                      setConfirmPassword(text);
                      setErrorKeys({...errorKeys, confirmPassword: ''});
                    }}
                    secureTextEntry
                  />
                  {errors.confirmPassword ? (
                    <Text style={styles.errorText}>{errors.confirmPassword}</Text>
                  ) : null}
                </View>
                
                <Text style={styles.requiredNote}>{t('common.required')}</Text>
                
                <TouchableOpacity 
                  style={styles.button}
                  onPress={handleRegister}
                  disabled={isLoading || isCheckingPhone}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>{t('auth.register')}</Text>
                  )}
                </TouchableOpacity>
                
                <View style={styles.loginContainer}>
                  <Text style={styles.loginText}>{t('auth.alreadyHaveAccount')}</Text>
                  <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                    <Text style={styles.loginLink}>{t('auth.signIn')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  keyboardAvoidContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    backgroundColor: '#F7F9FC',
    padding: 30,
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    padding: 30,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#E0E7FF',
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E9EEF4',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D9E6',
  },
  avatarPlaceholderText: {
    color: '#6B7280',
    textAlign: 'center',
    fontSize: 14,
  },
  inputContainer: {
    marginBottom: 15,
  },
  phoneInputContainer: {
    position: 'relative',
  },
  inputWithIndicator: {
    position: 'relative',
    justifyContent: 'center',
  },
  checkingIndicator: {
    position: 'absolute',
    right: 15,
  },
  input: {
    height: 55,
    borderWidth: 1,
    borderColor: '#D1D9E6',
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    color: '#4A4A4A',
  },
  inputError: {
    borderColor: '#e74c3c',
  },
  inputChecking: {
    borderColor: '#3498db',
    borderWidth: 1.5,
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 13,
    marginTop: 6,
    marginLeft: 5,
  },
  requiredNote: {
    color: '#6B7280',
    fontSize: 12,
    textAlign: 'right',
    marginVertical: 15,
  },
  button: {
    backgroundColor: '#3498db',
    height: 55,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
    shadowColor: '#3498db',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 25,
  },
  loginText: {
    color: '#6B7280',
    fontSize: 14,
    marginRight: 5,
  },
  loginLink: {
    color: '#3498db',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default RegisterScreen; 
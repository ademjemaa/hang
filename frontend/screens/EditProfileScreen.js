import React, { useState, useEffect } from 'react';
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
import { useAuth } from '../context/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import GlobalHeader from '../components/GlobalHeader';
import { CommonActions } from '@react-navigation/native';

const EditProfileScreen = ({ navigation }) => {
  const { userData, updateProfile, isLoading } = useAuth();
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [avatar, setAvatar] = useState(null);
  const [isChanged, setIsChanged] = useState(false);

  // Initialize form data from userData
  useEffect(() => {
    if (userData) {
      setUsername(userData.username || '');
      setEmail(userData.email || '');
      setPhoneNumber(userData.phone_number || '');
      setAvatar(userData.avatar || null);
    }
  }, [userData]);

  // Track if any field has changed
  useEffect(() => {
    if (userData) {
      const hasChanged = 
        username !== userData.username ||
        email !== userData.email ||
        phoneNumber !== (userData.phone_number || '') ||
        (avatar && avatar !== userData.avatar);
      
      setIsChanged(hasChanged);
    }
  }, [username, email, phoneNumber, avatar, userData]);

  // Clean phone number by removing spaces
  const cleanPhoneNumber = (number) => {
    return number.replace(/\s+/g, '');
  };

  // Handle phone number input with formatting
  const handlePhoneNumberChange = (text) => {
    setPhoneNumber(text);
  };

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

  // Navigate to the Home/Profile screen
  const navigateToProfile = () => {
    // First navigate back to root tabs 
    navigation.getParent()?.navigate('Home');
    
    setTimeout(() => {
      // Then reset the Home stack to show the Profile screen
      const homeParent = navigation.getParent();
      if (homeParent) {
        homeParent.navigate('Home', {
          screen: 'Profile'
        });
      }
    }, 100);
  };

  const handleUpdateProfile = async () => {
    // Form validation
    if (!username || !email) {
      Alert.alert(t('common.error'), t('auth.fillAllFields'));
      return;
    }

    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert(t('common.error'), t('auth.invalidEmail'));
      return;
    }

    // Phone number validation (optional field)
    if (phoneNumber) {
      // Clean the phone number before validation
      const cleanedPhoneNumber = cleanPhoneNumber(phoneNumber);
      
      // Check for French phone number formats:
      // 1. +33 followed by 9 digits (e.g., +33612345678)
      // 2. 0 followed by 9 digits (e.g., 0612345678)
      const frenchPhoneRegex = /^(\+33[1-9][0-9]{8}|0[1-9][0-9]{8})$/;
      
      if (!frenchPhoneRegex.test(cleanedPhoneNumber)) {
        Alert.alert(
          t('common.error'), 
          t('auth.phoneNumberFormat')
        );
        return;
      }
    }

    const result = await updateProfile(username, email, phoneNumber, avatar);
    
    if (result.success) {
      Alert.alert(
        t('common.success'), 
        t('profile.updateSuccess'),
        [
          {
            text: 'OK',
            onPress: navigateToProfile
          }
        ]
      );
    } else {
      Alert.alert(t('profile.updateFailed'), result.error);
    }
  };

  if (!userData) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3498db" />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <GlobalHeader
          title={t('profile.editProfile')}
          showBackButton
        />
        
        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : null}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 50 : 0}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <ScrollView contentContainerStyle={styles.scrollContainer}>
              <View style={styles.formContainer}>
                {/* Avatar selection */}
                <View style={styles.avatarContainer}>
                  <TouchableOpacity onPress={pickImage}>
                    {avatar ? (
                      <Image source={{ uri: avatar }} style={styles.avatar} />
                    ) : (
                      <View style={styles.avatarPlaceholder}>
                        <Text style={styles.avatarPlaceholderText}>
                          {username ? username.charAt(0).toUpperCase() : 'A'}
                        </Text>
                      </View>
                    )}
                    <Text style={styles.changePhotoText}>{t('auth.changePhoto')}</Text>
                  </TouchableOpacity>
                </View>
                
                <TextInput
                  style={styles.input}
                  placeholder={`${t('auth.username')} *`}
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                />
                
                <TextInput
                  style={styles.input}
                  placeholder={`${t('auth.email')} *`}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                
                <TextInput
                  style={styles.input}
                  placeholder={t('auth.phoneNumber')}
                  value={phoneNumber}
                  onChangeText={handlePhoneNumberChange}
                  keyboardType="phone-pad"
                />
                
                <Text style={styles.requiredNote}>{t('common.required')}</Text>
                <Text style={styles.lastSeenText}>
                  {t('profile.lastSeen')} {userData.last_seen ? new Date(userData.last_seen).toLocaleString() : t('common.never')}
                </Text>
                
                <TouchableOpacity 
                  style={[styles.button, !isChanged && styles.buttonDisabled]}
                  onPress={handleUpdateProfile}
                  disabled={isLoading || !isChanged}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>{t('common.update')}</Text>
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => navigation.goBack()}
                  disabled={isLoading}
                >
                  <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </TouchableWithoutFeedback>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderText: {
    color: 'white',
    fontSize: 36,
    fontWeight: 'bold',
  },
  changePhotoText: {
    marginTop: 10,
    color: '#3498db',
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#f9f9f9',
    height: 50,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  requiredNote: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
    textAlign: 'right',
  },
  lastSeenText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 15,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  button: {
    backgroundColor: '#3498db',
    height: 50,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#a0cdf3',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    height: 50,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  cancelButtonText: {
    color: '#e74c3c',
    fontSize: 16,
    fontWeight: '600',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
  },
});

export default EditProfileScreen; 
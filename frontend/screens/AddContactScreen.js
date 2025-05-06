import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
  SafeAreaView
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useContacts } from '../context/ContactsContext';
import GlobalHeader from '../components/GlobalHeader';

const AddContactScreen = ({ navigation }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [nickname, setNickname] = useState('');
  const [user, setUser] = useState(null);
  const [isValidNumber, setIsValidNumber] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const { searchUsersByPhone, addContact, isLoading } = useContacts();
  const { t } = useTranslation();

  // Validate phone number format
  useEffect(() => {
    // Accept both formats: +33XXXXXXXXX or 0XXXXXXXXX
    const frenchPhoneRegex = /^(\+33[1-9][0-9]{8}|0[1-9][0-9]{8})$/;
    const isValid = frenchPhoneRegex.test(phoneNumber.trim().replace(/\s+/g, ''));
    setIsValidNumber(isValid);
    
    // Auto-search when phone number is valid
    if (isValid && !isSearching) {
      searchUser(phoneNumber.trim());
    }
  }, [phoneNumber]);

  const searchUser = async (number) => {
    setIsSearching(true);
    const result = await searchUsersByPhone(number);
    
    if (result.success) {
      setUser(result.user);
    } else {
      setUser(null);
    }
    setIsSearching(false);
  };

  const handleAddContact = async () => {
    if (!user) {
      Alert.alert(t('common.error'), t('contacts.noValidUser'));
      return;
    }

    // Use phone number as nickname if not provided
    const contactNickname = nickname.trim() || phoneNumber.trim();
    const result = await addContact(user.id, contactNickname);
    
    if (result.success) {
      Alert.alert(t('common.success'), t('contacts.contactAdded'));
      navigation.navigate('Contacts');
    } else {
      Alert.alert(t('common.error'), result.error || t('contacts.failedToAdd'));
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <GlobalHeader 
          title={t('contacts.addContact')}
          showBackButton
        />
        
        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : null}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 50 : 0}
        >
          <ScrollView contentContainerStyle={styles.scrollContainer}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={styles.content}>
                <View style={styles.card}>
                  {/* User Card - Always shown */}
                  <View style={styles.userCard}>
                    <View style={styles.avatarContainer}>
                      {user && user.avatar ? (
                        <Image source={{ uri: user.avatar }} style={styles.avatar} />
                      ) : (
                        <View style={styles.avatarPlaceholder}>
                          <Text style={styles.avatarText}>
                            {user && user.username 
                              ? user.username.charAt(0).toUpperCase() 
                              : '?'}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                  
                  {/* Phone Number Input */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>
                      {t('auth.phoneNumber')} <Text style={styles.required}>*</Text>
                    </Text>
                    <View style={styles.phoneInputContainer}>
                      <TextInput
                        style={[
                          styles.input, 
                          isValidNumber && styles.validInput
                        ]}
                        placeholder={t('contacts.enterPhoneNumber')}
                        value={phoneNumber}
                        onChangeText={setPhoneNumber}
                        keyboardType="phone-pad"
                        autoCapitalize="none"
                      />
                      {isSearching && (
                        <ActivityIndicator 
                          style={styles.loadingIndicator} 
                          color="#3498db" 
                          size="small"
                        />
                      )}
                    </View>
                    {!isValidNumber && phoneNumber.trim() !== '' && (
                      <Text style={styles.phoneFormatHelp}>
                        {t('contacts.validPhoneFormat')}
                      </Text>
                    )}
                    {isValidNumber && user && (
                      <Text style={styles.userFound}>
                        {t('contacts.userFound')} {user.username}
                      </Text>
                    )}
                    {isValidNumber && !user && !isSearching && (
                      <Text style={styles.userNotFound}>
                        {t('contacts.noUserFound')}
                      </Text>
                    )}
                  </View>
                  
                  {/* Nickname Input */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>{t('contacts.nickname')} ({t('common.required').toLowerCase()})</Text>
                    <TextInput
                      style={styles.input}
                      placeholder={t('contacts.enterNickname')}
                      value={nickname}
                      onChangeText={setNickname}
                      autoCapitalize="words"
                    />
                    <Text style={styles.helperText}>
                      {t('contacts.usePhoneIfEmpty')}
                    </Text>
                  </View>
                  
                  {/* Action Buttons */}
                  <View style={styles.buttonContainer}>
                    <TouchableOpacity
                      style={[
                        styles.button, 
                        styles.saveButton,
                        (!isValidNumber || !user) && styles.disabledButton
                      ]}
                      onPress={handleAddContact}
                      disabled={isLoading || !isValidNumber || !user}
                    >
                      {isLoading ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text style={styles.saveButtonText}>{t('contacts.addContact')}</Text>
                      )}
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.button, styles.cancelButton]}
                      onPress={() => navigation.goBack()}
                      disabled={isLoading}
                    >
                      <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </TouchableWithoutFeedback>
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
  keyboardAvoidingView: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userCard: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    marginBottom: 8,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#E0E7FF',
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#eee',
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#999',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 8,
  },
  required: {
    color: '#e74c3c',
  },
  phoneInputContainer: {
    position: 'relative',
  },
  input: {
    height: 50,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
  },
  validInput: {
    borderColor: '#2ecc71',
    backgroundColor: '#f0fff0',
  },
  loadingIndicator: {
    position: 'absolute',
    right: 16,
    top: 15,
  },
  userFound: {
    marginTop: 6,
    fontSize: 12,
    color: '#2ecc71',
    fontWeight: '500',
  },
  userNotFound: {
    marginTop: 6,
    fontSize: 12,
    color: '#e74c3c',
    fontWeight: '500',
  },
  helperText: {
    marginTop: 6,
    fontSize: 12,
    color: '#777',
    fontStyle: 'italic',
  },
  phoneFormatHelp: {
    marginTop: 6,
    fontSize: 12,
    color: '#e74c3c',
    marginBottom: 10,
  },
  buttonContainer: {
    marginTop: 8,
  },
  button: {
    height: 54,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  saveButton: {
    backgroundColor: '#3498db',
  },
  disabledButton: {
    backgroundColor: '#95a5a6',
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: 'transparent',
  },
  cancelButtonText: {
    color: '#e74c3c',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default AddContactScreen; 
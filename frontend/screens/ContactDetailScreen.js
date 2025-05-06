import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useContacts } from '../context/ContactsContext';
import { useTheme } from '../context/ThemeContext';
import GlobalHeader from '../components/GlobalHeader';

const ContactDetailScreen = ({ route, navigation }) => {
  const { contact } = route.params;
  const [isEditing, setIsEditing] = useState(false);
  const [nickname, setNickname] = useState(contact.nickname);
  const { updateContact, deleteContact, isLoading } = useContacts();
  const { t } = useTranslation();
  const { headerColor } = useTheme();

  const handleSave = async () => {
    if (!nickname.trim()) {
      Alert.alert(t('common.error'), t('contacts.nicknameEmpty'));
      return;
    }

    const result = await updateContact(contact.id, nickname.trim());
    
    if (result.success) {
      setIsEditing(false);
      Alert.alert(t('common.success'), t('contacts.contactUpdated'));
    } else {
      Alert.alert(t('common.error'), result.error || t('contacts.failedToUpdate'));
    }
  };

  const handleDelete = () => {
    Alert.alert(
      t('common.confirm'),
      t('contacts.confirmDelete', { name: nickname }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { 
          text: t('common.delete'), 
          style: 'destructive',
          onPress: async () => {
            const result = await deleteContact(contact.id);
            
            if (result.success) {
              Alert.alert(t('common.success'), t('contacts.contactDeleted'));
              navigation.navigate('ContactsList');
            } else {
              Alert.alert(t('common.error'), result.error || t('contacts.failedToDelete'));
            }
          }
        }
      ]
    );
  };

  const handleMessage = () => {
    navigation.navigate('MessagesStack', { 
      screen: 'Conversation',
      params: { contactId: contact.contact_id, name: nickname }
    });
  };

  // Create dynamic right action buttons based on editing state
  const rightAction = isEditing ? {
    icon: 'checkmark',
    onPress: handleSave
  } : {
    icon: 'create-outline',
    onPress: () => setIsEditing(true)
  };

  // Add a delete button as second action if not editing
  const getCustomButtons = () => {
    if (!isEditing) {
      return (
        <View style={styles.buttonsContainer}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.messageButton, { backgroundColor: headerColor }]}
            onPress={handleMessage}
          >
            <Ionicons name="chatbubble-outline" size={22} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.buttonText}>{t('contacts.message')}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.deleteButton]}
            onPress={handleDelete}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="trash-outline" size={22} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.buttonText}>{t('common.delete')}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      );
    }
    return null;
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <GlobalHeader 
          title={t('contacts.contactDetails')}
          showBackButton
          rightAction={rightAction}
        />
        
        <View style={styles.contentContainer}>
          <View style={styles.contactCard}>
            <View style={styles.avatarContainer}>
              {contact.avatar ? (
                <Image source={{ uri: contact.avatar }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitial}>
                    {nickname ? nickname.charAt(0).toUpperCase() : '+'}
                  </Text>
                </View>
              )}
            </View>
            
            {isEditing ? (
              <View style={styles.editContainer}>
                <Text style={styles.label}>{t('contacts.nickname')}</Text>
                <TextInput
                  style={styles.input}
                  value={nickname}
                  onChangeText={setNickname}
                  autoCapitalize="none"
                  autoFocus
                />
              </View>
            ) : (
              <Text style={styles.contactName}>{nickname}</Text>
            )}
            
            <View style={styles.infoContainer}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>{t('contacts.username')}</Text>
                <Text style={styles.infoValue}>{contact.username}</Text>
              </View>
              
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>{t('contacts.phone')}</Text>
                <Text style={styles.infoValue}>{contact.phone_number}</Text>
              </View>
              
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>{t('common.lastSeen')}</Text>
                <Text style={styles.infoValue}>
                  {contact.last_seen ? new Date(contact.last_seen).toLocaleString() : t('common.never')}
                </Text>
              </View>
              
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>{t('contacts.addedOn')}</Text>
                <Text style={styles.infoValue}>
                  {contact.created_at ? new Date(contact.created_at).toLocaleString() : t('common.unknown')}
                </Text>
              </View>
            </View>
          </View>
        </View>
        
        {getCustomButtons()}
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
  contentContainer: {
    flex: 1,
    padding: 16,
  },
  contactCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    alignItems: 'center',
  },
  avatarContainer: {
    marginBottom: 16,
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
  avatarInitial: {
    color: 'white',
    fontSize: 40,
    fontWeight: 'bold',
  },
  contactName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  editContainer: {
    width: '100%',
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
  },
  input: {
    height: 48,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  infoContainer: {
    width: '100%',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 16,
    marginTop: 10,
  },
  infoItem: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'center',
  },
  infoLabel: {
    width: 100,
    fontWeight: 'bold',
    color: '#666',
  },
  infoValue: {
    flex: 1,
    color: '#333',
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    padding: 12,
    flex: 1,
    marginHorizontal: 6,
  },
  messageButton: {
    backgroundColor: '#3498db',
  },
  deleteButton: {
    backgroundColor: '#e74c3c',
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  }
});

export default ContactDetailScreen; 
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  Image,
  RefreshControl,
  SafeAreaView
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useContacts } from '../context/ContactsContext';
import { Ionicons } from '@expo/vector-icons';
import GlobalHeader from '../components/GlobalHeader';

const ContactsScreen = ({ navigation }) => {
  const { contacts, isLoading, fetchContacts } = useContacts();
  const { t } = useTranslation();
  const [refreshing, setRefreshing] = useState(false);
  const flatListRef = useRef(null);
  const focusListenerRef = useRef(null);

  // Handle refresh with state management
  const handleRefresh = useCallback(() => {
    if (refreshing) return; // Prevent multiple concurrent refreshes
    
    setRefreshing(true);
    fetchContacts()
      .finally(() => {
        setRefreshing(false);
      });
  }, [fetchContacts, refreshing]);

  useEffect(() => {
    // Fetch contacts when the screen is focused, but use our own state management
    focusListenerRef.current = navigation.addListener('focus', () => {
      // Only refresh if not already refreshing
      if (!refreshing && !isLoading) {
        fetchContacts();
      }
    });

    // Initial fetch - only once
    fetchContacts();

    // Cleanup
    return () => {
      if (focusListenerRef.current) {
        focusListenerRef.current();
      }
    };
  }, [navigation, fetchContacts, refreshing, isLoading]);

  const renderContactItem = useCallback(({ item }) => (
    <TouchableOpacity 
      style={styles.contactItem}
      onPress={() => navigation.navigate('ContactDetail', { contact: item })}
    >
      <View style={styles.avatarContainer}>
        {item.avatar ? (
          <Image source={{ uri: item.avatar }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitial}>
              {item.nickname ? item.nickname.charAt(0).toUpperCase() : '?'}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>{item.nickname}</Text>
        <Text style={styles.contactPhone}>{item.phone_number}</Text>
        <Text style={styles.lastSeen}>
          {t('common.lastSeen')}: {item.last_seen ? new Date(item.last_seen).toLocaleString() : t('common.never')}
        </Text>
      </View>
    </TouchableOpacity>
  ), [navigation, t]);

  const renderEmptyList = useCallback(() => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>{t('contacts.noContacts')}</Text>
      <TouchableOpacity 
        style={styles.emptyButton}
        onPress={() => navigation.navigate('AddContact')}
      >
        <Text style={styles.emptyButtonText}>{t('contacts.addContact')}</Text>
      </TouchableOpacity>
    </View>
  ), [navigation, t]);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <GlobalHeader 
          title={t('contacts.contacts')} 
          rightAction={{
            icon: 'add',
            onPress: () => navigation.navigate('AddContact')
          }}
        />

        {isLoading && contacts.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3498db" />
          </View>
        ) : contacts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{t('contacts.noContacts')}</Text>
            <TouchableOpacity 
              style={styles.emptyButton}
              onPress={() => navigation.navigate('AddContact')}
            >
              <Text style={styles.emptyButtonText}>{t('contacts.addContact')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={contacts}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderContactItem}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl 
                refreshing={refreshing} 
                onRefresh={handleRefresh}
                colors={["#3498db"]}
                progressViewOffset={10}
              />
            }
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={5}
            removeClippedSubviews={true}
            scrollEventThrottle={16}
          />
        )}
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
  },
  emptyButton: {
    backgroundColor: '#3498db',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  list: {
    padding: 16,
    paddingBottom: 20,
  },
  contactItem: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
  },
  contactInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  contactName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  contactPhone: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  lastSeen: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
  },
});

export default ContactsScreen; 
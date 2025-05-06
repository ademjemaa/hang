import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, ActivityIndicator, RefreshControl, SafeAreaView } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useMessages } from '../context/MessagesContext';
import { useContacts } from '../context/ContactsContext';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import GlobalHeader from '../components/GlobalHeader';

const ConversationsScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { conversations, isLoading, fetchConversations, formatMessageTime, socketConnected } = useMessages();
  const { contacts, fetchContacts } = useContacts();
  const { headerColor } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const flatListRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);
  
  // Auto-refresh timer (30 seconds when using sockets, 15 seconds without)
  const refreshInterval = socketConnected ? 30000 : 15000;

  // Handle manual refresh
  const handleRefresh = useCallback(() => {
    if (refreshing) return; // Prevent multiple concurrent refreshes
    
    setRefreshing(true);
    Promise.all([fetchConversations(), fetchContacts()])
      .then(() => {
        setRefreshing(false);
        setLastRefresh(Date.now());
      })
      .catch(() => {
        setRefreshing(false);
      });
  }, [fetchConversations, fetchContacts, refreshing]);

  // Use useFocusEffect to refresh data when the screen is focused
  useFocusEffect(
    React.useCallback(() => {
      setIsFocused(true);
      // Only fetch if it's been a while since last refresh
      const timeSinceLastRefresh = Date.now() - lastRefresh;
      if (timeSinceLastRefresh > 5000) { // Only refresh if last refresh was more than 5 seconds ago
        fetchConversations();
        fetchContacts();
        setLastRefresh(Date.now());
      }
      
      // Set up auto-refresh when screen is focused
      let intervalId = null;
      
      // Wait a bit before starting the interval to prevent immediate refresh
      const timeoutId = setTimeout(() => {
        intervalId = setInterval(() => {
          if (!isFocused) {
            clearInterval(intervalId);
            return;
          }
          
          const now = Date.now();
          if (now - lastRefresh > refreshInterval && !refreshing) {
            console.log('Auto-refreshing conversations');
            fetchConversations();
            setLastRefresh(now);
          }
        }, 10000); // Check every 10 seconds if we need to refresh
      }, 1000);
      
      return () => {
        setIsFocused(false);
        clearTimeout(timeoutId);
        if (intervalId) clearInterval(intervalId);
      };
    }, [
      fetchConversations, 
      fetchContacts, 
      lastRefresh, 
      refreshInterval, 
      refreshing, 
      isFocused
    ])
  );

  // Initial load - only once when component mounts
  useEffect(() => {
    handleRefresh();
    // No dependency array so this only runs once
  }, []);

  // Find the nickname for a conversation from contacts
  const getContactName = (item) => {
    const contact = contacts.find(c => c.contact_id === item.contact_id);
    if (contact) {
      return contact.nickname;
    }
    return item.name;
  };

  const navigateToConversation = (contactId, name) => {
    navigation.navigate('MessagesStack', {
      screen: 'Conversation', 
      params: { contactId, name }
    });
  };

  const renderConversationItem = ({ item }) => {
    const contactName = getContactName(item);
    
    return (
      <TouchableOpacity
        style={styles.conversationItem}
        onPress={() => navigateToConversation(item.contact_id, contactName)}
      >
        {item.avatar ? (
          <Image source={{ uri: item.avatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarText}>{contactName.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        
        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text style={styles.conversationName} numberOfLines={1}>{contactName}</Text>
            <Text style={styles.conversationTime}>{formatMessageTime(item.timestamp)}</Text>
          </View>
          
          <View style={styles.messagePreview}>
            {item.isOutgoing && <Text style={styles.messageDirection}>{t('common.you')}: </Text>}
            <Text style={styles.lastMessage} numberOfLines={1}>{item.last_message}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>{t('messages.noConversations')}</Text>
      <Text style={styles.emptySubText}>{t('messages.startConversation')}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <GlobalHeader 
          title={t('messages.conversations')}
          showBackButton={false}
          headerColor={headerColor}
          rightContent={
            socketConnected ? (
              <View style={styles.connectedIndicator}>
                <Ionicons name="wifi" size={16} color="#4CAF50" />
              </View>
            ) : (
              <View style={styles.disconnectedIndicator}>
                <Ionicons name="wifi-outline" size={16} color="#FF5722" />
              </View>
            )
          }
        />
        
        <View style={styles.contentContainer}>
          {isLoading && conversations.length === 0 ? (
            <ActivityIndicator size="large" color={headerColor} style={styles.loader} />
          ) : (
            <FlatList
              ref={flatListRef}
              data={conversations}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderConversationItem}
              ListEmptyComponent={renderEmptyList}
              refreshControl={
                <RefreshControl 
                  refreshing={refreshing} 
                  onRefresh={handleRefresh} 
                  colors={[headerColor]}
                  progressViewOffset={10}
                />
              }
              contentContainerStyle={conversations.length === 0 ? { flex: 1 } : { paddingBottom: 20 }}
              initialNumToRender={10}
              maxToRenderPerBatch={10}
              windowSize={5}
              removeClippedSubviews={true}
              scrollEventThrottle={16}
              onScrollBeginDrag={() => setIsFocused(false)}
              onMomentumScrollEnd={() => setIsFocused(true)}
            />
          )}
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  conversationItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 16,
  },
  avatarPlaceholder: {
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#757575',
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  conversationName: {
    fontWeight: 'bold',
    fontSize: 16,
    flex: 1,
    marginRight: 8,
  },
  conversationTime: {
    fontSize: 12,
    color: '#757575',
  },
  messagePreview: {
    flexDirection: 'row',
  },
  messageDirection: {
    color: '#757575',
  },
  lastMessage: {
    color: '#757575',
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
  },
  connectedIndicator: {
    padding: 4,
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderRadius: 10,
  },
  disconnectedIndicator: {
    padding: 4,
    backgroundColor: 'rgba(255, 87, 34, 0.2)',
    borderRadius: 10,
  },
});

export default ConversationsScreen; 
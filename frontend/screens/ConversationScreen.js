import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform, 
  ActivityIndicator,
  SafeAreaView,
  Alert
} from 'react-native';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useMessages } from '../context/MessagesContext';
import { useContacts } from '../context/ContactsContext';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import GlobalHeader from '../components/GlobalHeader';

/**
 * Screen for a one-to-one conversation with another user
 */
const ConversationScreen = () => {
  // Hooks
  const { t } = useTranslation();
  const route = useRoute();
  const navigation = useNavigation();
  const { contacts, fetchContacts } = useContacts();
  const { headerColor } = useTheme();
  const { 
    messages, 
    fetchMessagesWithContact, 
    sendMessage, 
    isLoading, 
    formatMessageTime,
    socketConnected
  } = useMessages();

  // Route params
  const { contactId, name: initialName } = route.params;
  
  // Component state
  const [message, setMessage] = useState('');
  const [contactName, setContactName] = useState(initialName);
  const [shouldScrollToEnd, setShouldScrollToEnd] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [socketError, setSocketError] = useState(null);
  
  // Refs
  const flatListRef = useRef(null);
  const prevMessagesLengthRef = useRef(0);
  const refreshTimerRef = useRef(null);
  
  // Derived state
  const contactMessages = messages[contactId] || [];

  /**
   * Handle back button press
   */
  const handleBackPress = useCallback(() => {
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
    }
    navigation.goBack();
    return true;
  }, [navigation]);

  /**
   * Check if we should scroll to bottom when messages change
   */
  useEffect(() => {
    const currentLength = contactMessages.length;
    if (currentLength > prevMessagesLengthRef.current) {
      setShouldScrollToEnd(true);
    }
    prevMessagesLengthRef.current = currentLength;
  }, [contactMessages]);

  /**
   * Scroll to bottom when needed
   */
  useEffect(() => {
    if (shouldScrollToEnd && flatListRef.current && contactMessages.length > 0) {
      const scrollTimeout = setTimeout(() => {
        flatListRef.current.scrollToEnd({ animated: true });
        setShouldScrollToEnd(false);
      }, 300);
      
      return () => clearTimeout(scrollTimeout);
    }
  }, [shouldScrollToEnd, contactMessages]);

  /**
   * Fetch messages when screen is focused
   */
  useFocusEffect(
    React.useCallback(() => {
      fetchMessagesWithContact(contactId);
      fetchContacts();
      
      return () => {
        if (refreshTimerRef.current) {
          clearInterval(refreshTimerRef.current);
          refreshTimerRef.current = null;
        }
      };
    }, [contactId, fetchMessagesWithContact, fetchContacts])
  );

  /**
   * Initial load and refresh timer setup
   */
  useEffect(() => {
    fetchMessagesWithContact(contactId);
    fetchContacts();
    
    // Set up periodic refresh if no socket connection
    if (!socketConnected && !refreshTimerRef.current) {
      refreshTimerRef.current = setInterval(() => {
        console.log('Socket not connected, refreshing messages via API');
        fetchMessagesWithContact(contactId);
      }, 15000);
    }
    
    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [contactId, fetchMessagesWithContact, fetchContacts, socketConnected]);

  /**
   * Manage refresh timer based on socket connection
   */
  useEffect(() => {
    if (socketConnected) {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    } else if (!refreshTimerRef.current) {
      refreshTimerRef.current = setInterval(() => {
        console.log('Socket not connected, refreshing messages via API');
        fetchMessagesWithContact(contactId);
      }, 15000);
    }
    
    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [socketConnected, contactId, fetchMessagesWithContact]);

  /**
   * Update contact name when contacts list changes
   */
  useEffect(() => {
    const contact = contacts.find(c => c.contact_id === contactId);
    if (contact && contact.nickname) {
      setContactName(contact.nickname);
    }
  }, [contacts, contactId]);

  /**
   * Update socket error message when connection changes
   */
  useEffect(() => {
    if (!socketConnected) {
      setSocketError('Socket disconnected. Messages can only be sent when connected.');
    } else {
      setSocketError(null);
    }
  }, [socketConnected]);

  /**
   * Handle sending a message
   */
  const handleSendMessage = async () => {
    if (message.trim() === '' || sendingMessage) return;
    
    if (!socketConnected) {
      Alert.alert(
        t('common.error'),
        t('messages.socketDisconnected'),
        [{ text: t('common.ok') }]
      );
      return;
    }
    
    const trimmedMessage = message.trim();
    const originalMessage = trimmedMessage;
    setMessage('');
    setSendingMessage(true);
    
    try {
      const result = await sendMessage(contactId, trimmedMessage);
      
      if (!result) {
        console.error('Failed to send message');
        setMessage(originalMessage);
        Alert.alert(
          t('common.error'),
          t('messages.sendFailed'),
          [{ text: t('common.ok') }]
        );
      } else {
        setShouldScrollToEnd(true);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessage(originalMessage);
      Alert.alert(
        t('common.error'),
        t('messages.sendFailed'),
        [{ text: t('common.ok') }]
      );
    } finally {
      setSendingMessage(false);
    }
  };

  /**
   * Render a message bubble
   */
  const renderMessageBubble = useCallback(({ item }) => {
    const isOutgoing = item.isOutgoing || item.sender_id === contacts.find(c => c.contact_id === contactId)?.user_id;
    const hasFailed = item.sendFailed === true;
    
    return (
      <View style={[
        styles.messageBubbleContainer,
        isOutgoing ? styles.outgoingContainer : styles.incomingContainer
      ]}>
        <View style={[
          styles.messageBubble,
          isOutgoing ? styles.outgoingBubble : styles.incomingBubble,
          hasFailed && styles.failedBubble
        ]}>
          <Text style={[
            styles.messageText,
            isOutgoing ? styles.outgoingText : styles.incomingText
          ]}>
            {item.content}
          </Text>
          {hasFailed && (
            <View style={styles.errorIndicator}>
              <Ionicons name="alert-circle" size={16} color="#f44336" />
            </View>
          )}
          {item.isTemp && !hasFailed && (
            <View style={styles.sendingIndicator}>
              <ActivityIndicator size="small" color="#999" />
            </View>
          )}
        </View>
        <Text style={styles.messageTime}>
          {hasFailed ? t('messages.failed') : formatMessageTime(item.timestamp)}
        </Text>
      </View>
    );
  }, [formatMessageTime, contacts, contactId, t]);

  /**
   * Render empty state when no messages
   */
  const renderEmptyList = useCallback(() => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>{t('messages.noMessages')}</Text>
    </View>
  ), [t]);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <GlobalHeader 
          title={contactName}
          showBackButton={true}
          headerColor={headerColor}
          customBackAction={handleBackPress}
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
        
        {socketError && (
          <View style={styles.socketErrorContainer}>
            <Text style={styles.socketErrorText}>{socketError}</Text>
          </View>
        )}
      
        <KeyboardAvoidingView 
          style={styles.keyboardAvoidView} 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <View style={styles.messagesContainer}>
            {isLoading && contactMessages.length === 0 ? (
              <ActivityIndicator size="large" color={headerColor} style={styles.loader} />
            ) : (
              <FlatList
                ref={flatListRef}
                data={contactMessages}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderMessageBubble}
                ListEmptyComponent={renderEmptyList}
                contentContainerStyle={contactMessages.length === 0 
                  ? styles.flatListEmptyContainer 
                  : styles.flatListContainer
                }
                initialNumToRender={15}
                maxToRenderPerBatch={10}
                windowSize={10}
                removeClippedSubviews={false}
                onContentSizeChange={() => {
                  if (shouldScrollToEnd && flatListRef.current) {
                    flatListRef.current.scrollToEnd({ animated: false });
                    setShouldScrollToEnd(false);
                  }
                }}
                onLayout={() => {
                  if (shouldScrollToEnd && flatListRef.current) {
                    flatListRef.current.scrollToEnd({ animated: false });
                    setShouldScrollToEnd(false);
                  }
                }}
                scrollEventThrottle={16}
              />
            )}
          </View>
          
          <View style={styles.inputContainerWrapper}>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder={socketConnected ? t('messages.typeMessage') : t('messages.waitingForConnection')}
                value={message}
                onChangeText={setMessage}
                multiline
                editable={socketConnected}
              />
              <TouchableOpacity 
                style={[
                  styles.sendButton, 
                  { 
                    backgroundColor: !socketConnected 
                      ? '#cccccc' 
                      : message.trim() === '' 
                        ? '#cccccc' 
                        : headerColor || '#3498db'
                  }
                ]} 
                onPress={handleSendMessage}
                disabled={message.trim() === '' || sendingMessage || !socketConnected}
              >
                {sendingMessage ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="send" size={20} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  // Layout
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  keyboardAvoidView: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  
  // Loading
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // List containers
  flatListContainer: {
    padding: 10,
    paddingBottom: 16,
  },
  flatListEmptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Message bubbles
  messageBubbleContainer: {
    marginVertical: 5,
    maxWidth: '80%',
  },
  outgoingContainer: {
    alignSelf: 'flex-end',
    marginLeft: 50,
  },
  incomingContainer: {
    alignSelf: 'flex-start',
    marginRight: 50,
  },
  messageBubble: {
    padding: 12,
    borderRadius: 18,
  },
  outgoingBubble: {
    backgroundColor: '#DCF8C6',
    borderTopRightRadius: 2,
  },
  incomingBubble: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 2,
  },
  failedBubble: {
    backgroundColor: '#ffebee',
  },
  messageText: {
    fontSize: 16,
  },
  outgoingText: {
    color: '#000',
  },
  incomingText: {
    color: '#000',
  },
  messageTime: {
    fontSize: 12,
    color: '#8F8F8F',
    alignSelf: 'flex-end',
    marginTop: 2,
    marginRight: 2,
  },
  
  // Input area
  inputContainerWrapper: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 20,
    maxHeight: 100,
  },
  sendButton: {
    marginLeft: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  
  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#757575',
  },
  
  // Header
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    height: 56,
    backgroundColor: '#3498db',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 10,
  },
  
  // Connection indicators
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
  sendingIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
  },
  errorIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
  },
  socketErrorContainer: {
    backgroundColor: 'rgba(255, 87, 34, 0.1)',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#FF5722',
  },
  socketErrorText: {
    color: '#d32f2f',
    fontSize: 13,
    textAlign: 'center',
  },
});

export default ConversationScreen; 
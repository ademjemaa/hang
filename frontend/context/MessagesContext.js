import React, { createContext, useState, useContext, useCallback, useEffect, useRef } from 'react';
import { API_URL } from '../config';
import { useAuth } from './AuthContext';
import { useContacts } from './ContactsContext';
import socketService from '../services/socketService';

// Create messages context
const MessagesContext = createContext();

/**
 * Hook to use the messages context
 */
export const useMessages = () => {
  return useContext(MessagesContext);
};

/**
 * Messages context provider component
 */
export const MessagesProvider = ({ children }) => {
  // State
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState({});
  const [currentContact, setCurrentContact] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  
  // Context hooks
  const { authState } = useAuth();
  const { fetchContacts } = useContacts();
  
  // Refs
  const socketListeners = useRef([]);
  const socketInitialized = useRef(false);

  /**
   * Initialize socket connection and set up event listeners
   */
  useEffect(() => {
    if (authState && authState.token && !socketInitialized.current) {
      socketInitialized.current = true;
      socketService.initSocket();
      socketService.connect();
      
      // Connection events
      socketListeners.current.push(socketService.subscribe('connect', () => {
        console.log('Socket connected in MessagesContext');
        setSocketConnected(true);
        socketService.authenticate(authState.token);
      }));
      
      socketListeners.current.push(socketService.subscribe('disconnect', (reason) => {
        console.log('Socket disconnected in MessagesContext, reason:', reason);
        setSocketConnected(false);
        
        if (reason === 'io server disconnect' || reason === 'transport close') {
          console.log('Server disconnected socket, attempting to reconnect in 3 seconds...');
          setTimeout(() => {
            if (authState && authState.token) {
              socketService.reconnect();
            }
          }, 3000);
        }
      }));
      
      // Reconnection events
      socketListeners.current.push(socketService.subscribe('reconnect', (attempt) => {
        console.log(`Socket reconnected after ${attempt} attempts`);
        setSocketConnected(true);
        socketService.authenticate(authState.token);
      }));
      
      socketListeners.current.push(socketService.subscribe('reconnect_failed', () => {
        console.log('Socket reconnection failed after all attempts');
        setSocketConnected(false);
        setError('Connection lost. Please refresh the app to reconnect.');
      }));
      
      // Authentication event
      socketListeners.current.push(socketService.subscribe('authenticated', () => {
        console.log('Socket authenticated in MessagesContext');
      }));

      // Message events
      socketListeners.current.push(socketService.subscribe('new_message', (message) => {
        console.log('New message received in MessagesContext:', message);
        
        setMessages(prev => {
          const contactId = message.sender_id;
          const currentMessages = prev[contactId] || [];
          
          // Check for duplicates
          const messageExists = currentMessages.some(m => 
            m.id === message.id || 
            (m.content === message.content && m.timestamp === message.timestamp)
          );
          
          if (messageExists) return prev;
          
          return {
            ...prev,
            [contactId]: [...currentMessages, message]
          };
        });
        
        fetchConversations();
      }));
      
      socketListeners.current.push(socketService.subscribe('message_sent', (message) => {
        console.log('Message sent confirmation in MessagesContext:', message);
        
        setMessages(prev => {
          const contactId = message.receiver_id;
          const currentMessages = prev[contactId] || [];
          
          if (message.temp_id) {
            // Replace temp message with confirmed message
            const updatedMessages = currentMessages.map(m => 
              (m.isTemp && m.id === message.temp_id) ? { ...message, isOutgoing: true } : m
            );
            
            // If message wasn't replaced, add it
            const wasReplaced = updatedMessages.some(m => m.id === message.id);
            if (!wasReplaced) {
              updatedMessages.push({ ...message, isOutgoing: true });
            }
            
            return {
              ...prev,
              [contactId]: updatedMessages
            };
          } else {
            // Check for duplicates
            const messageExists = currentMessages.some(m => 
              m.id === message.id || 
              (m.content === message.content && m.timestamp === message.timestamp && !m.isTemp)
            );
            
            if (messageExists) return prev;
            
            return {
              ...prev,
              [contactId]: [...currentMessages, { ...message, isOutgoing: true }]
            };
          }
        });
        
        fetchConversations();
      }));
      
      socketListeners.current.push(socketService.subscribe('message_error', (error) => {
        console.error('Message error in MessagesContext:', error);
        
        if (error.temp_id) {
          setMessages(prev => {
            const contactId = error.receiver_id;
            if (!contactId || !prev[contactId]) return prev;
            
            const currentMessages = prev[contactId];
            const updatedMessages = currentMessages.map(m => 
              (m.isTemp && m.id === error.temp_id) 
                ? { ...m, sendFailed: true } 
                : m
            );
            
            return {
              ...prev,
              [contactId]: updatedMessages
            };
          });
        }
        
        setError(error.message || 'Failed to send message');
      }));
      
      // Cleanup function
      return () => {
        socketInitialized.current = false;
        socketListeners.current.forEach(unsub => {
          if (typeof unsub === 'function') {
            unsub();
          }
        });
        socketListeners.current = [];
        socketService.disconnect();
      };
    }
  }, [authState]);

  /**
   * Fetch all conversations for current user
   */
  const fetchConversations = useCallback(async () => {
    if (!authState || !authState.token) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/messages/conversations`, {
        headers: {
          'Authorization': `Bearer ${authState.token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch conversations');
      }

      setConversations(data.conversations || []);
      fetchContacts();
    } catch (error) {
      console.error('Error fetching conversations:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [authState?.token, fetchContacts]);

  /**
   * Fetch messages with specific contact
   */
  const fetchMessagesWithContact = useCallback(async (contactId) => {
    if (!authState || !authState.token || !contactId) return;
    
    setIsLoading(true);
    setError(null);
    setCurrentContact(contactId);

    try {
      const response = await fetch(`${API_URL}/messages/${contactId}`, {
        headers: {
          'Authorization': `Bearer ${authState.token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch messages');
      }

      setMessages(prev => ({
        ...prev,
        [contactId]: data.messages || []
      }));
      
      fetchContacts();
    } catch (error) {
      console.error('Error fetching messages:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [authState?.token, fetchContacts]);

  /**
   * Send message to a contact via socket
   */
  const sendMessage = useCallback(async (receiverId, content) => {
    if (!authState || !authState.token) return null;
    
    setError(null);
    
    // Verify socket connection
    if (!socketService.isSocketConnected() || !socketService.isSocketAuthenticated()) {
      setError('Cannot send message: Socket not connected');
      return false;
    }
    
    // Create temporary message for UI feedback
    const tempId = `temp-${Date.now()}`;
    const timestamp = new Date().toISOString();
    const tempMessage = {
      id: tempId,
      sender_id: authState.user?.id,
      receiver_id: receiverId,
      content,
      timestamp,
      isOutgoing: true,
      isTemp: true
    };
    
    // Add temp message to UI
    setMessages(prev => {
      const currentMessages = prev[receiverId] || [];
      return {
        ...prev,
        [receiverId]: [...currentMessages, tempMessage]
      };
    });
    
    // Send via socket using Promise-based sendMessage
    console.log('Sending message via socket');
    try {
      const result = await socketService.sendMessage(receiverId, content, tempId);
      
      if (!result) {
        console.error('Failed to send message via socket');
        setMessages(prev => {
          const currentMessages = prev[receiverId] || [];
          return {
            ...prev,
            [receiverId]: currentMessages.map(m => 
              (m.isTemp && m.id === tempId) 
                ? { ...m, sendFailed: true } 
                : m
            )
          };
        });
        setError('Failed to send message: Server could not process message');
        return false;
      }
      
      console.log('Message sent via socket successfully', result);
      return true;
    } catch (error) {
      console.error('Socket message error:', error);
      
      setMessages(prev => {
        const currentMessages = prev[receiverId] || [];
        return {
          ...prev,
          [receiverId]: currentMessages.map(m => 
            (m.isTemp && m.id === tempId) 
              ? { ...m, sendFailed: true } 
              : m
          )
        };
      });
      
      setError(error.message || 'Failed to send message');
      return false;
    }
  }, [authState?.token, authState?.user?.id]);

  /**
   * Format timestamp to readable date/time
   */
  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const isToday = date.toDateString() === now.toDateString();
    const isYesterday = date.toDateString() === yesterday.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (isYesterday) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  // Load conversations when authenticated
  useEffect(() => {
    if (authState && authState.token) {
      fetchConversations();
    }
  }, [authState, fetchConversations]);

  // Context value
  const contextValue = {
    conversations,
    messages,
    currentContact,
    isLoading,
    error,
    socketConnected,
    fetchConversations,
    fetchMessagesWithContact,
    sendMessage,
    formatMessageTime
  };

  return (
    <MessagesContext.Provider value={contextValue}>
      {children}
    </MessagesContext.Provider>
  );
}; 
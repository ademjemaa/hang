import { io } from 'socket.io-client';
import { API_URL } from '../config';

// Extract the base URL without the /api path
const socketUrl = API_URL.replace(/\/api$/, '');

// Socket instance and state
let socket = null;
let isConnected = false;
let isAuthenticated = false;
let connectRetries = 0;
const MAX_RETRIES = 3;

// Event listeners and message tracking
const listeners = new Map();
const pendingMessages = new Set();

/**
 * Initialize socket connection with proper configuration
 */
const initSocket = () => {
  if (socket) return socket;
  
  console.log('Initializing socket connection to:', socketUrl);
  socket = io(socketUrl, {
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 10000,
    autoConnect: false,
  });
  
  // Connection events
  socket.on('connect', () => {
    console.log('Socket connected:', socket.id);
    isConnected = true;
    connectRetries = 0;
    notifyListeners('connect');
  });
  
  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected, reason:', reason);
    isConnected = false;
    isAuthenticated = false;
    notifyListeners('disconnect', reason);
    
    if (pendingMessages.size > 0) {
      console.log('Clearing pending messages due to disconnect');
      pendingMessages.clear();
    }
  });
  
  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
    connectRetries++;
    
    if (connectRetries >= MAX_RETRIES) {
      console.log(`Max connection retries (${MAX_RETRIES}) reached, stopping reconnect attempts`);
      socket.disconnect();
    }
    
    notifyListeners('connect_error', error);
  });
  
  // Authentication events
  socket.on('authenticated', () => {
    console.log('Socket authenticated');
    isAuthenticated = true;
    notifyListeners('authenticated');
  });
  
  socket.on('auth_error', (error) => {
    console.error('Socket authentication error:', error);
    isAuthenticated = false;
    notifyListeners('auth_error', error);
  });
  
  // Message events
  socket.on('new_message', (message) => {
    console.log('New message received:', message);
    notifyListeners('new_message', message);
  });
  
  socket.on('message_sent', (message) => {
    console.log('Message sent confirmation:', message);
    
    if (message.temp_id && pendingMessages.has(message.temp_id)) {
      pendingMessages.delete(message.temp_id);
    }
    
    notifyListeners('message_sent', message);
  });
  
  socket.on('message_error', (error) => {
    console.error('Message error:', error);
    
    if (error.temp_id && pendingMessages.has(error.temp_id)) {
      pendingMessages.delete(error.temp_id);
    }
    
    notifyListeners('message_error', error);
  });
  
  // Reconnection events
  socket.io.on('reconnect_attempt', (attempt) => {
    console.log(`Socket reconnect attempt ${attempt}`);
    notifyListeners('reconnect_attempt', attempt);
  });
  
  socket.io.on('reconnect', (attempt) => {
    console.log(`Socket reconnected after ${attempt} attempts`);
    isConnected = true;
    notifyListeners('reconnect', attempt);
  });
  
  socket.io.on('reconnect_error', (error) => {
    console.error('Socket reconnection error:', error);
    notifyListeners('reconnect_error', error);
  });
  
  socket.io.on('reconnect_failed', () => {
    console.error('Socket reconnection failed after all attempts');
    notifyListeners('reconnect_failed');
  });
  
  socket.io.on('error', (error) => {
    console.error('Socket IO error:', error);
  });
  
  return socket;
};

/**
 * Connect to socket server
 */
const connect = () => {
  if (!socket) initSocket();
  if (!isConnected) {
    socket.connect();
    connectRetries = 0;
  }
};

/**
 * Safely disconnect socket
 */
const disconnect = () => {
  if (socket) {
    try {
      socket.removeAllListeners();
      
      if (isConnected) {
        socket.disconnect();
      }
      
      isConnected = false;
      isAuthenticated = false;
      pendingMessages.clear();
    } catch (error) {
      console.error('Error during socket disconnect:', error);
    }
  }
};

/**
 * Authenticate with JWT
 * @param {string} token - JWT token
 * @returns {boolean} - Whether authentication was initiated
 */
const authenticate = (token) => {
  if (!socket || !isConnected) {
    console.error('Cannot authenticate: Socket not connected');
    return false;
  }
  
  socket.emit('authenticate', token);
  return true;
};

/**
 * Send a message via socket
 * @param {string} receiverId - Recipient ID
 * @param {string} content - Message content
 * @param {string} tempId - Temporary message ID for tracking
 * @returns {Promise<object|boolean>} - Promise resolving to message data or false if failed
 */
const sendMessage = (receiverId, content, tempId) => {
  return new Promise((resolve, reject) => {
    if (!socket || !isConnected || !isAuthenticated) {
      console.error('Cannot send message: Socket not ready');
      console.log('Socket state:', { socket: !!socket, isConnected, isAuthenticated, userId: socket?.userId });
      resolve(false);
      return;
    }
    
    if (tempId) {
      pendingMessages.add(tempId);
    }
    
    socket.emit('send_message', { receiverId, content, temp_id: tempId }, (response) => {
      // This is the acknowledgment callback
      if (response?.success) {
        if (tempId) {
          pendingMessages.delete(tempId);
        }
        resolve(response.messageData);
      } else {
        console.error('Message error in acknowledgment:', response?.error);
        if (tempId) {
          pendingMessages.delete(tempId);
        }
        resolve(false);
      }
    });
    
    // Fallback timeout in case the server never responds with ack
    setTimeout(() => {
      if (tempId && pendingMessages.has(tempId)) {
        console.warn('Socket message ack timeout after 10s');
        pendingMessages.delete(tempId);
        resolve(false);
      }
    }, 10000);
  });
};

/**
 * Subscribe to socket events
 * @param {string} event - Event name
 * @param {Function} callback - Event callback
 * @returns {Function} - Unsubscribe function
 */
const subscribe = (event, callback) => {
  if (!listeners.has(event)) {
    listeners.set(event, new Set());
  }
  
  listeners.get(event).add(callback);
  
  return () => {
    if (listeners.has(event)) {
      listeners.get(event).delete(callback);
    }
  };
};

/**
 * Notify all listeners of an event
 * @param {string} event - Event name
 * @param {any} data - Event data
 */
const notifyListeners = (event, data) => {
  if (listeners.has(event)) {
    listeners.get(event).forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in ${event} callback:`, error);
      }
    });
  }
};

/**
 * Check if message is still pending
 * @param {string} tempId - Temporary message ID
 * @returns {boolean} - Whether message is pending
 */
const isMessagePending = (tempId) => {
  return pendingMessages.has(tempId);
};

/**
 * Remove a message from pending tracking
 * @param {string} tempId - Temporary message ID
 * @returns {boolean} - Whether message was cleared
 */
const clearPendingMessage = (tempId) => {
  if (pendingMessages.has(tempId)) {
    pendingMessages.delete(tempId);
    return true;
  }
  return false;
};

// Status check functions
const isSocketConnected = () => isConnected;
const isSocketAuthenticated = () => isAuthenticated;

/**
 * Reset the socket connection
 */
const resetConnection = () => {
  disconnect();
  socket = null;
  connectRetries = 0;
  initSocket();
};

/**
 * Try to reconnect to the socket server
 */
const reconnect = () => {
  if (!socket) {
    initSocket();
    connect();
    return;
  }
  
  if (!isConnected) {
    console.log('Attempting to reconnect socket...');
    connectRetries = 0;
    
    try {
      if (socket.connected) {
        socket.disconnect();
      }
      socket.connect();
    } catch (error) {
      console.error('Error during reconnect:', error);
      socket = null;
      initSocket();
      connect();
    }
  }
};

// Service API
const socketService = {
  initSocket,
  connect,
  disconnect,
  authenticate,
  sendMessage,
  subscribe,
  isSocketConnected,
  isSocketAuthenticated,
  isMessagePending,
  clearPendingMessage,
  resetConnection,
  reconnect
};

export default socketService; 
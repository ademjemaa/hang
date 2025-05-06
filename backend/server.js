const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const http = require('http');
const socketIO = require('socket.io');
const config = require('./config');
const trackUserActivity = require('./middleware/userActivityMiddleware');

// Import routes
const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');
const contactsRoutes = require('./routes/contactsRoutes');
const messagesRoutes = require('./routes/messagesRoutes');

const app = express();
const PORT = config.PORT;

// Create HTTP server and attach socket.io
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Socket connections map (userId -> Set of sockets)
const userSockets = new Map();

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  // Authenticate and associate socket with user
  socket.on('authenticate', (token) => {
    try {
      // Verify token and get userId
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, config.JWT_SECRET);
      const userId = decoded.userId;
      
      // Associate socket with user - create a Set if doesn't exist
      if (!userSockets.has(userId)) {
        userSockets.set(userId, new Set());
      }
      userSockets.get(userId).add(socket);
      socket.userId = userId;
      
      console.log(`User ${userId} authenticated on socket ${socket.id}`);
      
      // Join a private room for this user
      socket.join(`user:${userId}`);
      
      // Notify client of successful authentication
      socket.emit('authenticated');
    } catch (error) {
      console.error('Socket authentication failed:', error);
      socket.emit('auth_error', { message: 'Authentication failed' });
    }
  });
  
  // Handle new message
  socket.on('send_message', async (data, ack) => {
    try {
      const { receiverId, content, temp_id } = data;
      if (!socket.userId || !receiverId || !content) {
        if (typeof ack === 'function') {
          ack({ 
            success: false, 
            error: 'Invalid message payload',
            temp_id: temp_id 
          });
        } else {
          socket.emit('message_error', { 
            message: 'Invalid message payload',
            temp_id: temp_id
          });
        }
        return;
      }
      
      // Get the database from app locals
      const db = app.locals.db;
      
      // Save message to database
      const timestamp = new Date().toISOString();
      const senderId = socket.userId;
      
      // Insert message into database
      db.run(
        `INSERT INTO messages (sender_id, receiver_id, content, timestamp) 
         VALUES (?, ?, ?, ?)`,
        [senderId, receiverId, content, timestamp],
        function(err) {
          if (err) {
            console.error('Error saving message:', err.message);
            if (typeof ack === 'function') {
              ack({ 
                success: false, 
                error: 'Failed to save message',
                temp_id: temp_id 
              });
            } else {
              socket.emit('message_error', { 
                message: 'Failed to save message',
                temp_id: temp_id
              });
            }
            return;
          }
          
          const messageId = this.lastID;
          
          // Prepare message data to send back
          const messageData = {
            id: messageId,
            sender_id: senderId,
            receiver_id: receiverId,
            content,
            timestamp,
            isOutgoing: true,
            temp_id: temp_id // Include the temp_id in response
          };
          
          // Send acknowledgement if callback provided
          if (typeof ack === 'function') {
            ack({ 
              success: true, 
              messageData: messageData 
            });
          } else {
            // Fallback to emit for older clients
            socket.emit('message_sent', messageData);
          }
          
          // Notify receiver if they're online
          io.to(`user:${receiverId}`).emit('new_message', {
            ...messageData,
            isOutgoing: false,
            temp_id: undefined // Don't send temp_id to receiver
          });
          
          console.log(`Message from ${senderId} to ${receiverId} saved with ID ${messageId}`);
        }
      );
    } catch (error) {
      console.error('Error handling send_message:', error);
      if (typeof ack === 'function') {
        ack({ 
          success: false, 
          error: 'Server error',
          temp_id: data?.temp_id 
        });
      } else {
        socket.emit('message_error', { 
          message: 'Server error',
          temp_id: data?.temp_id
        });
      }
    }
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    if (socket.userId) {
      console.log(`User ${socket.userId} disconnected from socket ${socket.id}`);
      // Remove this socket from user's set
      if (userSockets.has(socket.userId)) {
        userSockets.get(socket.userId).delete(socket);
        // If no more sockets for this user, remove the entry
        if (userSockets.get(socket.userId).size === 0) {
          userSockets.delete(socket.userId);
        }
      }
    } else {
      console.log(`Client disconnected: ${socket.id}`);
    }
  });
});

// Make socket.io instance available to routes
app.locals.io = io;
app.locals.userSockets = userSockets;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(trackUserActivity);

// Create and connect to SQLite database
const db = new sqlite3.Database(path.join(__dirname, config.DB_PATH), (err) => {
  if (err) {
    console.error('Database connection error:', err.message);
  } else {
    console.log('Connected to the SQLite database');
    initializeDatabase();
  }
});

// Make the db available to all routes
app.locals.db = db;

// Initialize database tables
function initializeDatabase() {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      phone_number TEXT UNIQUE,
      avatar BLOB,
      avatar_type TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_seen DATETIME
    )
  `, (err) => {
    if (err) {
      console.error('Error creating users table:', err.message);
    } else {
      console.log('Users table initialized');
      
      // Add last_seen column if it doesn't exist (for existing databases)
      db.all(`PRAGMA table_info(users)`, (err, rows) => {
        if (err) {
          console.error('Error checking table schema:', err.message);
          return;
        }
        
        // Check if the column exists in the result
        const hasLastSeen = rows && rows.some(row => row.name === 'last_seen');
        
        if (!hasLastSeen) {
          db.run(`ALTER TABLE users ADD COLUMN last_seen DATETIME`, (err) => {
            if (err) {
              console.error('Error adding last_seen column:', err.message);
            } else {
              console.log('Added last_seen column to users table');
            }
          });
        }
      });
    }
  });
  
  // Create contacts table
  db.run(`
    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      contact_id INTEGER NOT NULL,
      nickname TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (contact_id) REFERENCES users (id) ON DELETE CASCADE,
      UNIQUE (user_id, contact_id)
    )
  `, (err) => {
    if (err) {
      console.error('Error creating contacts table:', err.message);
    } else {
      console.log('Contacts table initialized');
    }
  });
  
  // Create messages table
  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id INTEGER NOT NULL,
      receiver_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      timestamp DATETIME NOT NULL,
      FOREIGN KEY (sender_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (receiver_id) REFERENCES users (id) ON DELETE CASCADE
    )
  `, (err) => {
    if (err) {
      console.error('Error creating messages table:', err.message);
    } else {
      console.log('Messages table initialized');
    }
  });
}

// API Routes
app.use('/api', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/contacts', contactsRoutes);
app.use('/api/messages', messagesRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  // Handle multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: 'File too large. Maximum size is 5MB.' });
  }
  
  if (err.message === 'Only image files are allowed!') {
    return res.status(400).json({ message: err.message });
  }
  
  res.status(500).json({ message: 'Something went wrong!' });
});

// Start server (using http server instead of express)
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 
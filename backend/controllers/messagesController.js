/**
 * Messages Controller
 * Handles message-related operations between users
 */

// Helper function to create a contact if it doesn't exist
const createContactIfNotExists = (db, userId, contactId, callback) => {
  // Check if contact already exists
  db.get(
    'SELECT * FROM contacts WHERE user_id = ? AND contact_id = ?',
    [userId, contactId],
    (err, existingContact) => {
      if (err) {
        console.error('Error checking contact:', err);
        return callback && callback(err);
      }
      
      // Contact already exists, no need to create
      if (existingContact) {
        return callback && callback(null, existingContact);
      }
      
      // Get user data to use for nickname
      db.get('SELECT * FROM users WHERE id = ?', [contactId], (err, user) => {
        if (err) {
          console.error('Error getting user data:', err);
          return callback && callback(err);
        }
        
        if (!user) {
          return callback && callback(new Error('User not found'));
        }
        
        // Use phone number as nickname
        const contactNickname = user.phone_number;
        
        console.log(`Creating new contact: ${userId} -> ${contactId} (${contactNickname})`);
        
        // Add the contact
        db.run(
          'INSERT INTO contacts (user_id, contact_id, nickname) VALUES (?, ?, ?)',
          [userId, contactId, contactNickname],
          function(err) {
            if (err) {
              console.error('Error adding contact:', err);
              return callback && callback(err);
            }
            
            // Return the new contact
            callback && callback(null, {
              id: this.lastID,
              contact_id: contactId,
              nickname: contactNickname
            });
          }
        );
      });
    }
  );
};

/**
 * Get all conversations for a user
 */
exports.getConversations = (req, res) => {
  const userId = req.user.id;
  const db = req.app.locals.db;

  // Query to get the latest message from each distinct conversation
  const query = `
    SELECT 
      m1.id, m1.sender_id, m1.receiver_id, m1.content, m1.timestamp,
      u.username as other_username, u.avatar, u.avatar_type,
      c.nickname
    FROM messages m1
    JOIN (
      SELECT 
        MAX(id) as max_id,
        CASE 
          WHEN sender_id = ? THEN receiver_id 
          ELSE sender_id 
        END as other_user_id
      FROM messages
      WHERE sender_id = ? OR receiver_id = ?
      GROUP BY other_user_id
    ) m2 ON m1.id = m2.max_id
    JOIN users u ON u.id = m2.other_user_id
    LEFT JOIN contacts c ON (c.contact_id = u.id AND c.user_id = ?)
    ORDER BY m1.timestamp DESC
  `;

  db.all(query, [userId, userId, userId, userId], (err, conversations) => {
    if (err) {
      return res.status(500).json({ message: 'Database error', error: err.message });
    }

    // Format conversations data
    const conversationsData = conversations.map(convo => {
      const isOutgoing = convo.sender_id === userId;
      const contactId = isOutgoing ? convo.receiver_id : convo.sender_id;
      
      // If this is an incoming message and there's no nickname, create a contact
      if (!isOutgoing && !convo.nickname) {
        createContactIfNotExists(db, userId, contactId, (err, newContact) => {
          if (err) console.error('Error creating contact:', err);
        });
      }
      
      const formattedConvo = {
        id: convo.id,
        contact_id: contactId,
        name: convo.nickname || convo.other_username,
        last_message: convo.content,
        timestamp: convo.timestamp,
        isOutgoing
      };

      // Add avatar if exists
      if (convo.avatar && convo.avatar_type) {
        formattedConvo.avatar = `data:${convo.avatar_type};base64,${Buffer.from(convo.avatar).toString('base64')}`;
      }

      return formattedConvo;
    });

    res.json({ conversations: conversationsData });
  });
};

/**
 * Get messages between the current user and another user
 */
exports.getMessagesWith = (req, res) => {
  const userId = req.user.id;
  const contactId = req.params.contactId;
  const db = req.app.locals.db;

  // Validate user exists
  db.get('SELECT id FROM users WHERE id = ?', [contactId], (err, user) => {
    if (err) {
      return res.status(500).json({ message: 'Database error', error: err.message });
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Ensure contact exists for this conversation
    createContactIfNotExists(db, userId, contactId, (err, contact) => {
      if (err) {
        console.error('Error ensuring contact exists:', err);
      }
      
      // Get messages between the two users
      const query = `
        SELECT * FROM messages
        WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
        ORDER BY timestamp ASC
      `;

      db.all(query, [userId, contactId, contactId, userId], (err, messages) => {
        if (err) {
          return res.status(500).json({ message: 'Database error', error: err.message });
        }

        // Format messages
        const formattedMessages = messages.map(msg => ({
          id: msg.id,
          content: msg.content,
          timestamp: msg.timestamp,
          isOutgoing: msg.sender_id === userId
        }));

        res.json({ messages: formattedMessages });
      });
    });
  });
};

/**
 * Send a message to another user
 */
exports.sendMessage = (req, res) => {
  const senderId = req.user.id;
  const { receiverId, content } = req.body;
  const db = req.app.locals.db;

  // Validate input
  if (!receiverId || !content || content.trim() === '') {
    return res.status(400).json({ message: 'Receiver ID and message content are required' });
  }

  // Check if receiver exists
  db.get('SELECT id FROM users WHERE id = ?', [receiverId], (err, user) => {
    if (err) {
      return res.status(500).json({ message: 'Database error', error: err.message });
    }

    if (!user) {
      return res.status(404).json({ message: 'Receiver not found' });
    }

    // Current timestamp
    const timestamp = new Date().toISOString();

    // Insert the message
    db.run(
      'INSERT INTO messages (sender_id, receiver_id, content, timestamp) VALUES (?, ?, ?, ?)',
      [senderId, receiverId, content, timestamp],
      function(err) {
        if (err) {
          return res.status(500).json({ message: 'Error sending message', error: err.message });
        }

        res.status(201).json({
          message: 'Message sent successfully',
          messageData: {
            id: this.lastID,
            content,
            timestamp,
            isOutgoing: true
          }
        });
      }
    );
  });
};

/**
 * Check for and retrieve new messages for a user
 * This endpoint also handles auto-creating contacts for new messages
 */
exports.checkNewMessages = (req, res) => {
  const userId = req.user.id;
  const db = req.app.locals.db;
  const { lastMessageId } = req.query;
  
  // Get new messages for the user
  let query = `
    SELECT m.id, m.sender_id, m.receiver_id, m.content, m.timestamp, 
           u.username, u.phone_number
    FROM messages m
    JOIN users u ON m.sender_id = u.id
    WHERE m.receiver_id = ?
  `;
  
  const params = [userId];
  
  // Filter by last seen message ID if provided
  if (lastMessageId) {
    query += ' AND m.id > ?';
    params.push(lastMessageId);
  }
  
  query += ' ORDER BY m.timestamp ASC';
  
  db.all(query, params, (err, messages) => {
    if (err) {
      return res.status(500).json({ message: 'Database error', error: err.message });
    }
    
    // Create contacts for senders if they don't exist yet
    const senderIds = [...new Set(messages.map(msg => msg.sender_id))];
    
    // Process each unique sender
    senderIds.forEach(senderId => {
      createContactIfNotExists(db, userId, senderId);
    });
    
    // Format messages for the client
    const formattedMessages = messages.map(msg => ({
      id: msg.id,
      content: msg.content,
      timestamp: msg.timestamp,
      sender_id: msg.sender_id,
      sender_name: msg.username,
      sender_phone: msg.phone_number
    }));
    
    res.json({ messages: formattedMessages });
  });
}; 
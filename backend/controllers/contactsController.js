/**
 * Search for users by phone number
 */
exports.searchUsersByPhone = (req, res) => {
  const { phoneNumber } = req.query;
  const userId = req.user.id;
  const db = req.app.locals.db;
  
  if (!phoneNumber) {
    return res.status(400).json({ message: 'Phone number is required' });
  }
  
  // Clean and normalize the phone number
  let cleanedPhoneNumber = phoneNumber.replace(/\s+/g, '');
  
  // Create both versions of the phone number for search
  let alternativeNumber;
  if (cleanedPhoneNumber.startsWith('+33')) {
    // If it's in international format, also create the local format
    alternativeNumber = '0' + cleanedPhoneNumber.substring(3);
  } else if (cleanedPhoneNumber.startsWith('0')) {
    // If it's in local format, also create the international format
    alternativeNumber = '+33' + cleanedPhoneNumber.substring(1);
  } else {
    // If it's neither format, just use what was provided
    alternativeNumber = cleanedPhoneNumber;
  }
  
  // Search for users with either phone number format (excluding the current user)
  db.get(
    'SELECT id, username, phone_number, avatar, avatar_type, last_seen FROM users WHERE (phone_number = ? OR phone_number = ?) AND id != ?',
    [cleanedPhoneNumber, alternativeNumber, userId],
    (err, user) => {
      if (err) {
        return res.status(500).json({ message: 'Database error', error: err.message });
      }
      
      if (!user) {
        return res.status(404).json({ message: 'No user found with this phone number' });
      }
      
      // Check if this user is already in the current user's contacts
      db.get(
        'SELECT id, nickname FROM contacts WHERE user_id = ? AND contact_id = ?',
        [userId, user.id],
        (contactErr, existingContact) => {
          if (contactErr) {
            return res.status(500).json({ message: 'Database error', error: contactErr.message });
          }
          
          // Format user data
          const userData = {
            id: user.id,
            username: user.username,
            phone_number: user.phone_number,
            last_seen: user.last_seen,
            // Add information about whether this user is already a contact
            is_contact: existingContact ? true : false,
            contact_id: existingContact ? existingContact.id : null,
            nickname: existingContact ? existingContact.nickname : null
          };
          
          // Add avatar if exists
          if (user.avatar && user.avatar_type) {
            userData.avatar = `data:${user.avatar_type};base64,${Buffer.from(user.avatar).toString('base64')}`;
          }
          
          res.json({ user: userData });
        }
      );
    }
  );
};

/**
 * Add a user as a contact
 */
exports.addContact = (req, res) => {
  const userId = req.user.id;
  const { contactId, nickname } = req.body;
  const db = req.app.locals.db;
  
  if (!contactId) {
    return res.status(400).json({ message: 'Contact ID is required' });
  }
  
  // First verify the contact user exists
  db.get('SELECT * FROM users WHERE id = ?', [contactId], (err, user) => {
    if (err) {
      return res.status(500).json({ message: 'Database error', error: err.message });
    }
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Use phone number as default nickname if not provided
    const contactNickname = nickname || user.phone_number;
    
    // Check if contact already exists
    db.get(
      'SELECT * FROM contacts WHERE user_id = ? AND contact_id = ?',
      [userId, contactId],
      (err, existingContact) => {
        if (err) {
          return res.status(500).json({ message: 'Database error', error: err.message });
        }
        
        if (existingContact) {
          return res.status(400).json({ message: 'Contact already exists' });
        }
        
        // Add the contact
        db.run(
          'INSERT INTO contacts (user_id, contact_id, nickname) VALUES (?, ?, ?)',
          [userId, contactId, contactNickname],
          function(err) {
            if (err) {
              return res.status(500).json({ message: 'Error adding contact', error: err.message });
            }
            
            // Format contact data
            const contactData = {
              id: this.lastID,
              contact_id: contactId,
              nickname: contactNickname,
              username: user.username,
              phone_number: user.phone_number,
              last_seen: user.last_seen
            };
            
            // Add avatar if exists
            if (user.avatar && user.avatar_type) {
              contactData.avatar = `data:${user.avatar_type};base64,${Buffer.from(user.avatar).toString('base64')}`;
            }
            
            res.status(201).json({
              message: 'Contact added successfully',
              contact: contactData
            });
          }
        );
      }
    );
  });
};

/**
 * Get all contacts for a user
 */
exports.getContacts = (req, res) => {
  const userId = req.user.id;
  const db = req.app.locals.db;
  
  // Get all contacts with their user data
  db.all(
    `SELECT c.id, c.contact_id, c.nickname, c.created_at,
            u.username, u.phone_number, u.avatar, u.avatar_type, u.last_seen 
     FROM contacts c
     JOIN users u ON c.contact_id = u.id
     WHERE c.user_id = ?
     ORDER BY c.nickname`,
    [userId],
    (err, contacts) => {
      if (err) {
        return res.status(500).json({ message: 'Database error', error: err.message });
      }
      
      // Format contacts data
      const contactsData = contacts.map(contact => {
        const formattedContact = {
          id: contact.id,
          contact_id: contact.contact_id,
          nickname: contact.nickname,
          username: contact.username,
          phone_number: contact.phone_number,
          created_at: contact.created_at,
          last_seen: contact.last_seen
        };
        
        // Add avatar if exists
        if (contact.avatar && contact.avatar_type) {
          formattedContact.avatar = `data:${contact.avatar_type};base64,${Buffer.from(contact.avatar).toString('base64')}`;
        }
        
        return formattedContact;
      });
      
      res.json({ contacts: contactsData });
    }
  );
};

/**
 * Update a contact's nickname
 */
exports.updateContact = (req, res) => {
  const userId = req.user.id;
  const contactId = req.params.id;
  const { nickname } = req.body;
  const db = req.app.locals.db;
  
  if (!nickname) {
    return res.status(400).json({ message: 'Nickname is required' });
  }
  
  // Update the contact
  db.run(
    'UPDATE contacts SET nickname = ? WHERE id = ? AND user_id = ?',
    [nickname, contactId, userId],
    function(err) {
      if (err) {
        return res.status(500).json({ message: 'Error updating contact', error: err.message });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ message: 'Contact not found or not owned by you' });
      }
      
      res.json({
        message: 'Contact updated successfully',
        contact: { id: contactId, nickname }
      });
    }
  );
};

/**
 * Delete a contact
 */
exports.deleteContact = (req, res) => {
  const userId = req.user.id;
  const contactId = req.params.id;
  const db = req.app.locals.db;
  
  // Delete the contact
  db.run(
    'DELETE FROM contacts WHERE id = ? AND user_id = ?',
    [contactId, userId],
    function(err) {
      if (err) {
        return res.status(500).json({ message: 'Error deleting contact', error: err.message });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ message: 'Contact not found or not owned by you' });
      }
      
      res.json({ message: 'Contact deleted successfully' });
    }
  );
}; 
/**
 * Get user profile
 */
exports.getProfile = (req, res) => {
  const userId = req.user.id;
  const db = req.app.locals.db;
  
  db.get('SELECT id, username, email, phone_number, avatar, avatar_type, created_at, last_seen FROM users WHERE id = ?', [userId], (err, user) => {
    if (err) {
      return res.status(500).json({ message: 'Database error' });
    }
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Prepare user data
    const userData = {
      id: user.id,
      username: user.username,
      email: user.email,
      phone_number: user.phone_number,
      created_at: user.created_at,
      last_seen: user.last_seen
    };
    
    // Add avatar data if it exists
    if (user.avatar && user.avatar_type) {
      userData.avatar = `data:${user.avatar_type};base64,${Buffer.from(user.avatar).toString('base64')}`;
    }
    
    res.json({ user: userData });
  });
};

/**
 * Update user profile
 */
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { username, email, phone_number } = req.body;
    const db = req.app.locals.db;
    
    // Validate basic inputs
    if (!username || !email) {
      return res.status(400).json({ message: 'Username and email are required' });
    }
    
    // Clean and validate phone number if provided
    let cleanedPhoneNumber = null;
    if (phone_number) {
      // Remove any spaces
      cleanedPhoneNumber = phone_number.replace(/\s+/g, '');
      
      // Validate French phone number format
      const frenchPhoneRegex = /^(\+33[1-9][0-9]{8}|0[1-9][0-9]{8})$/;
      if (!frenchPhoneRegex.test(cleanedPhoneNumber)) {
        return res.status(400).json({ message: 'Invalid phone number format. Must be a valid French phone number' });
      }
      
      // Normalize the format: if it starts with 0, convert to +33 format
      if (cleanedPhoneNumber.startsWith('0')) {
        cleanedPhoneNumber = '+33' + cleanedPhoneNumber.substring(1);
      }
    }
    
    // First get current user data
    db.get('SELECT * FROM users WHERE id = ?', [userId], async (err, currentUser) => {
      if (err) {
        return res.status(500).json({ message: 'Database error' });
      }
      
      if (!currentUser) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Check if username or email or phone number is already taken by another user
      const query = `
        SELECT * FROM users 
        WHERE (username = ? OR email = ? OR phone_number = ?) 
        AND id != ?
      `;
      
      db.get(query, [username, email, cleanedPhoneNumber, userId], async (err, existingUser) => {
        if (err) {
          return res.status(500).json({ message: 'Database error' });
        }
        
        if (existingUser) {
          // Check which field caused the conflict
          let errorMessage = 'Update failed';
          if (existingUser.username === username && username !== currentUser.username) {
            errorMessage = 'Username already taken';
          } else if (existingUser.email === email && email !== currentUser.email) {
            errorMessage = 'Email already registered';
          } else if (existingUser.phone_number === cleanedPhoneNumber && cleanedPhoneNumber !== currentUser.phone_number) {
            errorMessage = 'Phone number already registered';
          }
          
          return res.status(400).json({ message: errorMessage });
        }
        
        // Prepare update values
        let avatarBuffer = currentUser.avatar;
        let avatarType = currentUser.avatar_type;
        
        // Update avatar if a new one was uploaded
        if (req.file) {
          avatarBuffer = req.file.buffer;
          avatarType = req.file.mimetype;
        }
        
        // Build and run update query
        const updateQuery = `
          UPDATE users 
          SET username = ?, email = ?, phone_number = ?, avatar = ?, avatar_type = ?
          WHERE id = ?
        `;
        
        db.run(updateQuery, [username, email, cleanedPhoneNumber, avatarBuffer, avatarType, userId], function(err) {
          if (err) {
            return res.status(500).json({ message: 'Error updating profile', error: err.message });
          }
          
          // Prepare user data to return
          const userData = {
            id: userId,
            username,
            email,
            phone_number: cleanedPhoneNumber,
            created_at: currentUser.created_at
          };
          
          // Add avatar data if it exists
          if (avatarBuffer) {
            userData.avatar = `data:${avatarType};base64,${Buffer.from(avatarBuffer).toString('base64')}`;
          }
          
          res.json({ 
            message: 'Profile updated successfully',
            user: userData
          });
        });
      });
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
}; 
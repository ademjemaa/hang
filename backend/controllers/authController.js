const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { JWT_SECRET } = require('../config');

/**
 * Register a new user
 */
exports.register = async (req, res) => {
  try {
    const { username, email, password, phone_number } = req.body;
    const db = req.app.locals.db;
    
    // Validate request
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Please provide username, email and password' });
    }
    console.log(email);
    
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
    
    // Check if user already exists
    db.get('SELECT * FROM users WHERE username = ? OR email = ? OR (phone_number = ? AND phone_number IS NOT NULL)', 
      [username, email, cleanedPhoneNumber], async (err, user) => {
      if (err) {
        return res.status(500).json({ message: 'Database error' });
      }
      
      if (user) {
        // Check which field caused the conflict
        let errorMessage = 'User already exists';
        if (user.username === username) {
          errorMessage = 'Username already taken';
        } else if (user.email === email) {
          errorMessage = 'Email already registered';
        } else if (user.phone_number === cleanedPhoneNumber) {
          errorMessage = 'Phone number already registered';
        }
        
        return res.status(400).json({ message: errorMessage });
      }
      
      // Hash the password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      
      // Get avatar data if file was uploaded
      const avatarBuffer = req.file ? req.file.buffer : null;
      const avatarType = req.file ? req.file.mimetype : null;
      
      // Current timestamp for last_seen
      const currentTime = new Date().toISOString();
      
      // Create new user
      const query = 'INSERT INTO users (username, email, password, phone_number, avatar, avatar_type, last_seen) VALUES (?, ?, ?, ?, ?, ?, ?)';
      db.run(query, [username, email, hashedPassword, cleanedPhoneNumber, avatarBuffer, avatarType, currentTime], function(err) {
        if (err) {
          return res.status(500).json({ message: 'Error creating user', error: err.message });
        }
        
        // Generate token
        const token = jwt.sign({ id: this.lastID, username }, JWT_SECRET, { expiresIn: '1h' });
        
        // Prepare user data with base64 avatar if exists
        const userData = {
          id: this.lastID,
          username,
          email,
          phone_number: cleanedPhoneNumber,
          last_seen: currentTime
        };
        
        // Add avatar data if it exists
        if (avatarBuffer) {
          userData.avatar = `data:${avatarType};base64,${avatarBuffer.toString('base64')}`;
        }
        
        res.status(201).json({
          message: 'User registered successfully',
          token,
          user: userData
        });
      });
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Login user
 */
exports.login = (req, res) => {
  try {
    const { username, password } = req.body;
    const db = req.app.locals.db;
    
    // Validate request
    if (!username || !password) {
      return res.status(400).json({ message: 'Please provide username and password' });
    }
    
    // Find user
    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
      if (err) {
        return res.status(500).json({ message: 'Database error' });
      }
      
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      // Compare passwords
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      // Generate token
      const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '1h' });
      
      // Update last_seen timestamp
      const currentTime = new Date().toISOString();
      db.run('UPDATE users SET last_seen = ? WHERE id = ?', [currentTime, user.id], (updateErr) => {
        if (updateErr) {
          console.error('Error updating last_seen timestamp:', updateErr.message);
        }
        
        // Prepare user data
        const userData = {
          id: user.id,
          username: user.username,
          email: user.email,
          phone_number: user.phone_number,
          last_seen: currentTime
        };
        
        // Add avatar data if it exists
        if (user.avatar && user.avatar_type) {
          userData.avatar = `data:${user.avatar_type};base64,${Buffer.from(user.avatar).toString('base64')}`;
        }
        
        res.json({
          message: 'Login successful',
          token,
          user: userData
        });
      });
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Check if a phone number exists
 */
exports.checkPhoneNumberExists = (req, res) => {
  try {
    const { phone_number } = req.query;
    const db = req.app.locals.db;

    if (!phone_number) {
      return res.status(400).json({ message: 'Phone number is required' });
    }

    // Clean and normalize phone number
    let cleanedPhoneNumber = phone_number.replace(/\s+/g, '');

    // Validate French phone number format
    const frenchPhoneRegex = /^(\+33[1-9][0-9]{8}|0[1-9][0-9]{8})$/;
    if (!frenchPhoneRegex.test(cleanedPhoneNumber)) {
      return res.status(400).json({ message: 'Invalid phone number format' });
    }

    // Normalize the format: if it starts with 0, convert to +33 format
    if (cleanedPhoneNumber.startsWith('0')) {
      cleanedPhoneNumber = '+33' + cleanedPhoneNumber.substring(1);
    }

    // Check if phone number exists
    db.get('SELECT * FROM users WHERE phone_number = ?', [cleanedPhoneNumber], (err, user) => {
      if (err) {
        return res.status(500).json({ message: 'Database error' });
      }

      if (user) {
        return res.status(409).json({ message: 'Phone number already registered' });
      }

      res.status(200).json({ message: 'Phone number is available' });
    });
  } catch (error) {
    console.error('Phone check error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Check if a username exists
 */
exports.checkUsernameExists = (req, res) => {
  try {
    const { username } = req.query;
    const db = req.app.locals.db;

    if (!username) {
      return res.status(400).json({ message: 'Username is required' });
    }

    // Check if username exists
    db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
      if (err) {
        return res.status(500).json({ message: 'Database error' });
      }

      if (user) {
        return res.status(409).json({ message: 'Username already taken' });
      }

      res.status(200).json({ message: 'Username is available' });
    });
  } catch (error) {
    console.error('Username check error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Check if an email exists
 */
exports.checkEmailExists = (req, res) => {
  try {
    const { email } = req.query;
    const db = req.app.locals.db;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // Check if email exists
    db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
      if (err) {
        return res.status(500).json({ message: 'Database error' });
      }

      if (user) {
        return res.status(409).json({ message: 'Email already registered' });
      }

      res.status(200).json({ message: 'Email is available' });
    });
  } catch (error) {
    console.error('Email check error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
}; 
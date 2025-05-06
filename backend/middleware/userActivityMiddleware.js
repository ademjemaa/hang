const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');

/**
 * User activity tracking middleware
 * Updates the last_seen timestamp for authenticated users
 * Skips unauthenticated requests without throwing errors
 */
const trackUserActivity = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  // Skip if no token is provided
  if (!token) {
    return next();
  }

  // Verify token without throwing errors for invalid tokens
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      // Skip if token is invalid
      return next();
    }

    // Get user ID from token
    const userId = user.id;
    
    // Get database connection
    const db = req.app.locals.db;
    
    if (db) {
      // Update last_seen timestamp
      const currentTime = new Date().toISOString();
      db.run(
        'UPDATE users SET last_seen = ? WHERE id = ?',
        [currentTime, userId],
        (err) => {
          if (err) {
            console.error('Error updating last_seen timestamp:', err.message);
          }
        }
      );
    }
    
    // Continue to next middleware regardless of update success
    next();
  });
};

module.exports = trackUserActivity; 
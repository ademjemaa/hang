module.exports = {
  JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key', // Use environment variable in production
  DB_PATH: process.env.DB_PATH || 'users.db',
  PORT: process.env.PORT || 5000,
  MAX_FILE_SIZE: 5 * 1024 * 1024 // 5MB max file size
}; 
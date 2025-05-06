const express = require('express');
const router = express.Router();
const multer = require('multer');
const authController = require('../controllers/authController');
const config = require('../config');

// Configure multer for memory storage
const storage = multer.memoryStorage();
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: config.MAX_FILE_SIZE
  }
});

// Auth routes
router.post('/register', upload.single('avatar'), authController.register);
router.post('/login', authController.login);
router.get('/check-phone', authController.checkPhoneNumberExists);
router.get('/check-username', authController.checkUsernameExists);
router.get('/check-email', authController.checkEmailExists);

module.exports = router; 
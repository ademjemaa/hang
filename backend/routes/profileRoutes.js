const express = require('express');
const router = express.Router();
const multer = require('multer');
const profileController = require('../controllers/profileController');
const { authenticateToken } = require('../middleware/authMiddleware');
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

// Profile routes - all protected
router.get('/', authenticateToken, profileController.getProfile);
router.put('/', authenticateToken, upload.single('avatar'), profileController.updateProfile);

module.exports = router; 
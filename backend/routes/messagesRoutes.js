const express = require('express');
const router = express.Router();
const messagesController = require('../controllers/messagesController');
const { authenticateToken } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authenticateToken);

// Get all conversations for the current user
router.get('/conversations', messagesController.getConversations);

// Check for new messages (also creates contacts for new senders)
router.get('/check-new', messagesController.checkNewMessages);

// Get messages between current user and a specific contact
router.get('/:contactId', messagesController.getMessagesWith);

// Send a message
router.post('/', messagesController.sendMessage);

module.exports = router; 
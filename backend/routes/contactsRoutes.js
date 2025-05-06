const express = require('express');
const router = express.Router();
const contactsController = require('../controllers/contactsController');
const { authenticateToken } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authenticateToken);

// Search for users by phone number
router.get('/search', contactsController.searchUsersByPhone);

// Get all contacts
router.get('/', contactsController.getContacts);

// Add a new contact
router.post('/', contactsController.addContact);

// Update a contact
router.put('/:id', contactsController.updateContact);

// Delete a contact
router.delete('/:id', contactsController.deleteContact);

module.exports = router; 
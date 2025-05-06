import React, { createContext, useContext, useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { API_URL } from '../config';
import { useAuth } from './AuthContext';

// Create contacts context
const ContactsContext = createContext();

// Hook to use the contacts context
export const useContacts = () => useContext(ContactsContext);

// Provider component
export const ContactsProvider = ({ children }) => {
  const [contacts, setContacts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const { authState } = useAuth();

  // Fetch all contacts
  const fetchContacts = useCallback(async () => {
    if (!authState || !authState.token) return;
    
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/contacts`, {
        headers: {
          'Authorization': `Bearer ${authState.token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch contacts');
      }

      setContacts(data.contacts || []);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    } finally {
      setIsLoading(false);
    }
  }, [authState.token]);

  // Check if a user is already in contacts
  const isContactAdded = useCallback((userId) => {
    return contacts.some(contact => contact.contact_id === userId);
  }, [contacts]);

  // Search for users by phone number
  const searchUsersByPhone = async (phoneNumber) => {
    if (!authState || !authState.token) {
      return { 
        success: false, 
        error: 'Not authenticated'
      };
    }

    setIsLoading(true);

    try {
      // Clean the phone number - remove any spaces
      const cleanedNumber = phoneNumber.trim().replace(/\s+/g, '');
      
      const response = await fetch(`${API_URL}/contacts/search?phoneNumber=${encodeURIComponent(cleanedNumber)}`, {
        headers: {
          'Authorization': `Bearer ${authState.token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        return { 
          success: false, 
          error: data.message || 'User search failed' 
        };
      }

      return { 
        success: true, 
        user: data.user 
      };
    } catch (error) {
      console.error('Error searching users:', error);
      return { 
        success: false, 
        error: error.message || 'Network error' 
      };
    } finally {
      setIsLoading(false);
    }
  };

  // Add a contact
  const addContact = async (contactId, nickname) => {
    if (!authState || !authState.token) {
      return { 
        success: false, 
        error: 'Not authenticated'
      };
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/contacts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authState.token}`
        },
        body: JSON.stringify({ contactId, nickname })
      });

      const data = await response.json();

      if (!response.ok) {
        return { 
          success: false, 
          error: data.message || 'Failed to add contact'
        };
      }

      // Update contacts list
      await fetchContacts();

      return { 
        success: true, 
        contact: data.contact 
      };
    } catch (error) {
      console.error('Error adding contact:', error);
      return { 
        success: false, 
        error: error.message || 'Network error'
      };
    } finally {
      setIsLoading(false);
    }
  };

  // Update a contact's nickname
  const updateContact = async (contactId, nickname) => {
    if (!authState || !authState.token) {
      return { 
        success: false, 
        error: 'Not authenticated'
      };
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/contacts/${contactId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authState.token}`
        },
        body: JSON.stringify({ nickname })
      });

      const data = await response.json();

      if (!response.ok) {
        return { 
          success: false, 
          error: data.message || 'Failed to update contact'
        };
      }

      // Update the contact in the list
      setContacts(contacts.map(contact => 
        contact.id === parseInt(contactId) 
          ? {...contact, nickname} 
          : contact
      ));

      return { 
        success: true, 
        contact: data.contact 
      };
    } catch (error) {
      console.error('Error updating contact:', error);
      return { 
        success: false, 
        error: error.message || 'Network error'
      };
    } finally {
      setIsLoading(false);
    }
  };

  // Delete a contact
  const deleteContact = async (contactId) => {
    if (!authState || !authState.token) {
      return { 
        success: false, 
        error: 'Not authenticated'
      };
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/contacts/${contactId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authState.token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        return { 
          success: false, 
          error: data.message || 'Failed to delete contact'
        };
      }

      // Remove the contact from the list
      setContacts(contacts.filter(contact => contact.id !== parseInt(contactId)));

      return { 
        success: true 
      };
    } catch (error) {
      console.error('Error deleting contact:', error);
      return { 
        success: false, 
        error: error.message || 'Network error'
      };
    } finally {
      setIsLoading(false);
    }
  };

  // Context value
  const value = {
    contacts,
    isLoading,
    fetchContacts,
    searchUsersByPhone,
    addContact,
    updateContact,
    deleteContact,
    isContactAdded
  };

  return (
    <ContactsContext.Provider value={value}>
      {children}
    </ContactsContext.Provider>
  );
}; 
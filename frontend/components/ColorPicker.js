import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Modal, Pressable } from 'react-native';
import { useTheme, HEADER_COLORS } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

const ColorPicker = () => {
  const [isVisible, setIsVisible] = useState(false);
  const { headerColor, changeHeaderColor } = useTheme();
  
  const handleColorSelect = (color) => {
    changeHeaderColor(color);
    setIsVisible(false);
  };
  
  return (
    <View>
      {/* Color circle that triggers the dropdown */}
      <TouchableOpacity
        style={[
          styles.colorButton, 
          { backgroundColor: headerColor },
          headerColor === '#fff' ? { borderColor: '#ddd' } : { borderColor: 'rgba(255,255,255,0.5)' }
        ]}
        onPress={() => setIsVisible(true)}
      />
      
      {/* Color picker dropdown */}
      <Modal
        transparent={true}
        visible={isVisible}
        animationType="fade"
        onRequestClose={() => setIsVisible(false)}
      >
        <Pressable 
          style={styles.modalOverlay} 
          onPress={() => setIsVisible(false)}
        >
          <View style={styles.colorPickerContainer}>
            {Object.values(HEADER_COLORS).map((color) => (
              <TouchableOpacity
                key={color}
                style={[
                  styles.colorOption,
                  { backgroundColor: color },
                  color === '#fff' ? { borderColor: '#ddd' } : { borderColor: 'rgba(0,0,0,0.1)' }
                ]}
                onPress={() => handleColorSelect(color)}
              >
                {headerColor === color && (
                  <Ionicons 
                    name="checkmark-circle" 
                    size={22} 
                    color={color === '#fff' ? '#3498db' : 'white'} 
                  />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  colorButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginLeft: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  colorPickerContainer: {
    backgroundColor: 'white',
    marginTop: 80,
    marginRight: 16,
    padding: 12,
    borderRadius: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: 150,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  colorOption: {
    width: 38,
    height: 38,
    borderRadius: 19,
    margin: 4,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ColorPicker; 
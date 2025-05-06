import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';
import ColorPicker from './ColorPicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

const GlobalHeader = ({ title, showBackButton = false, rightAction = null }) => {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { headerColor } = useTheme();

  // Determine text and icon color based on header color
  const isDarkHeader = headerColor !== '#fff';
  const textColor = isDarkHeader ? '#fff' : '#333';
  const iconColor = isDarkHeader ? '#fff' : '#333';
  const rightIconColor = isDarkHeader ? '#fff' : '#3498db';

  return (
    <View style={[
      styles.container, 
      { 
        paddingTop: insets.top,
        backgroundColor: headerColor 
      }
    ]}>
      <View style={styles.content}>
        <View style={styles.leftContainer}>
          {showBackButton && (
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color={iconColor} />
            </TouchableOpacity>
          )}
          <Text style={[styles.title, { color: textColor }]}>{title}</Text>
        </View>
        
        <View style={styles.rightContainer}>
          <LanguageSwitcher />
          <ColorPicker />
          
          {rightAction && (
            <TouchableOpacity style={styles.rightActionButton} onPress={rightAction.onPress}>
              <Ionicons name={rightAction.icon} size={24} color={rightIconColor} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    width: '100%',
    zIndex: 10,
  },
  content: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rightActionButton: {
    marginLeft: 16,
    padding: 4,
  },
});

export default GlobalHeader; 
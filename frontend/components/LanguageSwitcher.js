import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const { headerColor } = useTheme();
  const currentLanguage = i18n.language;

  // Determine text color based on header color
  const isDarkHeader = headerColor !== '#fff';
  const textColor = isDarkHeader ? '#fff' : '#666';
  const activeTextColor = isDarkHeader ? '#fff' : '#3498db';
  const dividerColor = isDarkHeader ? 'rgba(255, 255, 255, 0.3)' : '#ddd';

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.languageButton, currentLanguage === 'en' && styles.activeLanguage]}
        onPress={() => changeLanguage('en')}
        disabled={currentLanguage === 'en'}
      >
        <Text style={[
          styles.languageText, 
          { color: textColor },
          currentLanguage === 'en' && { color: activeTextColor, fontWeight: 'bold' }
        ]}>EN</Text>
      </TouchableOpacity>
      <View style={[styles.divider, { backgroundColor: dividerColor }]} />
      <TouchableOpacity
        style={[styles.languageButton, currentLanguage === 'fr' && styles.activeLanguage]}
        onPress={() => changeLanguage('fr')}
        disabled={currentLanguage === 'fr'}
      >
        <Text style={[
          styles.languageText,
          { color: textColor },
          currentLanguage === 'fr' && { color: activeTextColor, fontWeight: 'bold' }
        ]}>FR</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  languageButton: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  activeLanguage: {
    backgroundColor: 'transparent',
  },
  languageText: {
    fontSize: 14,
  },
  divider: {
    width: 1,
    height: 16,
    marginHorizontal: 4,
  },
});

export default LanguageSwitcher; 
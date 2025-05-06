import React, { createContext, useState, useContext, useEffect } from 'react';

// Create theme context
const ThemeContext = createContext();

// Predefined header color options
export const HEADER_COLORS = {
  DEFAULT: '#fff',
  BLUE: '#3498db',
  GREEN: '#2ecc71',
  RED: '#e74c3c',
  PURPLE: '#9b59b6',
  ORANGE: '#f39c12',
};

// Hook to use the theme context
export const useTheme = () => useContext(ThemeContext);

// Provider component
export const ThemeProvider = ({ children }) => {
  const [headerColor, setHeaderColor] = useState(HEADER_COLORS.DEFAULT);

  // Function to update header color
  const changeHeaderColor = (color) => {
    if (HEADER_COLORS[color]) {
      setHeaderColor(HEADER_COLORS[color]);
    } else if (Object.values(HEADER_COLORS).includes(color)) {
      setHeaderColor(color);
    }
  };

  // Context value
  const value = {
    headerColor,
    changeHeaderColor,
    headerColors: HEADER_COLORS,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}; 
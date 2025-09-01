import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
  colors: {
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    textTertiary: string;
    border: string;
    primary: string;
    primaryLight: string;
    secondary: string;
    accent: string;
    error: string;
    success: string;
    warning: string;
  };
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Theme color schemes
const lightColors = {
  background: '#FFFFFF',
  surface: '#F3F4F6',
  text: '#374151',
  textSecondary: '#6C6C6C',
  textTertiary: '#9CA3AF',
  border: '#E5E7EB',
  primary: '#2DB6FF',
  primaryLight: '#E0F2FE',
  secondary: '#F47CC6',
  accent: '#10B981',
  error: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
};

const darkColors = {
  background: '#000000',
  surface: '#111111',
  text: '#FFFFFF',
  textSecondary: '#CCCCCC',
  textTertiary: '#9CA3AF',
  border: '#333333',
  primary: '#60A5FA',
  primaryLight: '#1E3A8A',
  secondary: '#F472B6',
  accent: '#34D399',
  error: '#F87171',
  success: '#34D399',
  warning: '#FBBF24',
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>('light');

  // Load saved theme from storage on app start
  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('app_theme');
      if (savedTheme === 'light' || savedTheme === 'dark') {
        setThemeState(savedTheme);
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    }
  };

  const setTheme = async (newTheme: Theme) => {
    try {
      await AsyncStorage.setItem('app_theme', newTheme);
      setThemeState(newTheme);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const isDark = theme === 'dark';
  const colors = isDark ? darkColors : lightColors;

  const value: ThemeContextType = {
    theme,
    setTheme,
    isDark,
    colors,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Export the context for direct use if needed
export { ThemeContext };


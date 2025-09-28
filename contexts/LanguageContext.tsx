import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import translations from '../lib/translations.json';

// Language types
export type Language = 'fr' | 'en' | 'ar' | 'ma';

// Language context type
interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, params?: Record<string, string>) => string;
  isLoading: boolean;
}

// Create context
const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// AsyncStorage key
const LANGUAGE_KEY = 'app_language';

// Language provider component
interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('fr');
  const [isLoading, setIsLoading] = useState(true);

  // Load language from storage on mount
  useEffect(() => {
    const loadLanguage = async () => {
      try {
        console.log('🔄 Loading language from storage...');
        const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
        console.log('📱 Saved language from storage:', savedLanguage);
        
        if (savedLanguage && ['fr', 'en', 'ar', 'ma'].includes(savedLanguage)) {
          console.log('✅ Setting language to:', savedLanguage);
          setLanguageState(savedLanguage as Language);
        } else {
          console.log('⚠️ No valid saved language, using default: fr');
        }
      } catch (error) {
        console.error('❌ Error loading language:', error);
      } finally {
        setIsLoading(false);
        console.log('🏁 Language loading complete');
      }
    };
    loadLanguage();
  }, []);

  // Save language to storage when changed
  const setLanguage = useCallback(async (newLanguage: Language) => {
    try {
      await AsyncStorage.setItem(LANGUAGE_KEY, newLanguage);
      setLanguageState(newLanguage);
    } catch (error) {
      console.error('Error saving language:', error);
    }
  }, []);

  // Translation function - memoized to ensure re-renders when language changes
  const t = useCallback((key: string, params?: Record<string, string>): string => {
    console.log(`🌍 Translation called for key: "${key}" with language: "${language}"`, params);
    const keys = key.split('.');
    let value: any = translations[language];
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        console.log(`❌ Translation not found for key: "${key}" in language: "${language}"`);
        return key; // Return key if translation not found
      }
    }
    
    let result = typeof value === 'string' ? value : key;
    
    // Handle placeholder substitution
    if (params && typeof result === 'string') {
      Object.entries(params).forEach(([placeholder, replacement]) => {
        result = result.replace(new RegExp(`\\{${placeholder}\\}`, 'g'), replacement);
      });
    }
    
    console.log(`✅ Translation result: "${result}"`);
    return result;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isLoading }}>
      {children}
    </LanguageContext.Provider>
  );
};

// Hook to use language context
export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

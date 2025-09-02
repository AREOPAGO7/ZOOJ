import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Language, useLanguage } from '../../contexts/LanguageContext';
import { useProfileCompletion } from '../../hooks/useProfileCompletion';
import { useAuth } from '../../lib/auth';
import AppLayout from '../app-layout';

// Language options
interface LanguageOption {
  code: Language;
  name: string;
  nativeName: string;
  flag: string;
}

const languages: LanguageOption[] = [
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
];

export default function LanguePage() {
  const { user, loading } = useAuth();
  const { isProfileComplete, isLoading: profileLoading } = useProfileCompletion();
  const { language: currentLanguage, setLanguage, t } = useLanguage();

  const [selectedLanguage, setSelectedLanguage] = useState<Language>(currentLanguage);
  const [showSaved, setShowSaved] = useState(false);

  // Update selected language when current language changes
  useEffect(() => {
    setSelectedLanguage(currentLanguage);
  }, [currentLanguage]);

  const handleLanguageSelect = useCallback((language: Language) => {
    setSelectedLanguage(language);
  }, []);

  const handleSave = useCallback(async () => {
    await setLanguage(selectedLanguage);
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2000);
  }, [selectedLanguage, setLanguage]);

  // Don't render if not authenticated or profile not completed
  if (loading || profileLoading || !user || !isProfileComplete) {
    return null;
  }



  return (
    <AppLayout>
      <View style={styles.container}>
        <View style={styles.header}>
          <MaterialCommunityIcons name="translate" size={32} color="#F47CC6" />
          <Text style={styles.headerTitle}>{t('language.title')}</Text>
          <Text style={styles.subtitle}>{t('language.subtitle')}</Text>
        </View>
        
        <View style={styles.content}>
          {/* Current Language Display */}
          <View style={styles.currentLanguageSection}>
            <Text style={styles.sectionTitle}>{t('language.currentLanguage')}</Text>
            <View style={styles.currentLanguageCard}>
              <Text style={styles.flag}>{languages.find(l => l.code === currentLanguage)?.flag}</Text>
              <View style={styles.languageInfo}>
                <Text style={styles.languageName}>
                  {languages.find(l => l.code === currentLanguage)?.nativeName}
                </Text>
                <Text style={styles.languageCode}>
                  {languages.find(l => l.code === currentLanguage)?.name}
                </Text>
              </View>
            </View>
          </View>

          {/* Language Selection */}
          <View style={styles.selectionSection}>
            <Text style={styles.sectionTitle}>{t('language.selectLanguage')}</Text>
            <View style={styles.languageList}>
              {languages.map((language) => (
                <TouchableOpacity
                  key={language.code}
                  style={[
                    styles.languageOption,
                    selectedLanguage === language.code && styles.selectedLanguageOption
                  ]}
                  onPress={() => handleLanguageSelect(language.code)}
                >
                  <Text style={styles.flag}>{language.flag}</Text>
                  <View style={styles.languageInfo}>
                    <Text style={[
                      styles.languageName,
                      selectedLanguage === language.code && styles.selectedLanguageName
                    ]}>
                      {language.nativeName}
                    </Text>
                    <Text style={[
                      styles.languageCode,
                      selectedLanguage === language.code && styles.selectedLanguageCode
                    ]}>
                      {language.name}
                    </Text>
                  </View>
                  {selectedLanguage === language.code && (
                    <MaterialCommunityIcons name="check-circle" size={24} color="#10B981" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[
              styles.saveButton,
              selectedLanguage === currentLanguage && styles.saveButtonDisabled
            ]}
            onPress={handleSave}
            disabled={selectedLanguage === currentLanguage}
          >
            <MaterialCommunityIcons name="content-save" size={20} color="#FFFFFF" />
            <Text style={styles.saveButtonText}>{t('language.save')}</Text>
          </TouchableOpacity>

          {/* Saved Message */}
          {showSaved && (
            <View style={styles.savedMessage}>
              <MaterialCommunityIcons name="check-circle" size={20} color="#10B981" />
              <Text style={styles.savedText}>{t('language.saved')}</Text>
            </View>
          )}
        </View>
      </View>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#374151',
    marginTop: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#6B7280',
  },
  currentLanguageSection: {
    marginBottom: 30,
  },
  selectionSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 15,
  },
  currentLanguageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#10B981',
  },
  languageList: {
    gap: 12,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  selectedLanguageOption: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  flag: {
    fontSize: 24,
    marginRight: 16,
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  selectedLanguageName: {
    color: '#10B981',
  },
  languageCode: {
    fontSize: 14,
    color: '#6B7280',
  },
  selectedLanguageCode: {
    color: '#059669',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  saveButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  savedMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  savedText: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
});

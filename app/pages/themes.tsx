import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useContext } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ThemeContext } from '../../contexts/ThemeContext';
import AppLayout from '../app-layout';

const BRAND_GRAY = "#6C6C6C";
const LIGHT_GRAY = "#F3F4F6";
const DARK_GRAY = "#374151";

export default function ThemesPage() {
  const router = useRouter();
  const { theme, setTheme } = useContext(ThemeContext);

  const handleBack = () => {
    router.back();
  };

  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
  };

  return (
    <AppLayout>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={handleBack}>
            <MaterialCommunityIcons name="chevron-left" size={24} color={BRAND_GRAY} />
          </Pressable>
          <Text style={styles.headerTitle}>Thème</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Main Content */}
        <View style={styles.mainContent}>
          {/* Light Mode Option */}
          <Pressable 
            style={styles.themeCard} 
            onPress={() => handleThemeChange('light')}
          >
            <View style={styles.radioContainer}>
              <View style={[
                styles.radioButton, 
                theme === 'light' && styles.radioButtonSelected
              ]}>
                {theme === 'light' && (
                  <View style={styles.radioButtonInner} />
                )}
              </View>
            </View>
            <Text style={styles.themeText}>Mode clair</Text>
          </Pressable>

          {/* Dark Mode Option */}
          <Pressable 
            style={styles.themeCard} 
            onPress={() => handleThemeChange('dark')}
          >
            <View style={styles.radioContainer}>
              <View style={[
                styles.radioButton, 
                theme === 'dark' && styles.radioButtonSelected
              ]}>
                {theme === 'dark' && (
                  <View style={styles.radioButtonInner} />
                )}
              </View>
            </View>
            <Text style={styles.themeText}>Mode sombre</Text>
          </Pressable>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: DARK_GRAY,
  },
  headerSpacer: {
    width: 40,
  },
  backButton: {
    padding: 8,
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  themeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: LIGHT_GRAY,
    borderRadius: 10,
    paddingVertical: 20,
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  radioContainer: {
    marginRight: 15,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: BRAND_GRAY,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    borderColor: '#2DB6FF',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2DB6FF',
  },
  themeText: {
    fontSize: 16,
    color: DARK_GRAY,
    fontWeight: '500',
  },
});

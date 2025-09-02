import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useProfileCompletion } from '../../hooks/useProfileCompletion';
import { useAuth } from '../../lib/auth';
import { useLanguage } from '../../contexts/LanguageContext';
import AppLayout from '../app-layout';

export default function VeriteActionPage() {
  const { user, loading } = useAuth();
  const { isProfileComplete, isLoading: profileLoading } = useProfileCompletion();
  const { t } = useLanguage();

  // Don't render if not authenticated or profile not completed
  if (loading || profileLoading || !user || !isProfileComplete) {
    return null;
  }

  return (
    <AppLayout>
      <View style={styles.container}>
        <View style={styles.header}>
          <MaterialCommunityIcons name="dice-6" size={32} color="#F47CC6" />
          <Text style={styles.headerTitle}>{t('games.truthOrDare')}</Text>
        </View>
        
        <View style={styles.content}>
          <Text style={styles.placeholderText}>{t('placeholder.title')}</Text>
          <Text style={styles.descriptionText}>{t('placeholder.description')}</Text>
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
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  placeholderText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});

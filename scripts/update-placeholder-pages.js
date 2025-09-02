const fs = require('fs');
const path = require('path');

// List of placeholder pages to update
const placeholderPages = [
  'quiz-couple.tsx',
  'verite-action.tsx', 
  'memory-couple.tsx',
  'defi-photo.tsx',
  'mots-croises.tsx',
  'jeu-roles.tsx'
];

// Template for updated placeholder pages
const template = `import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useProfileCompletion } from '../../hooks/useProfileCompletion';
import { useAuth } from '../../lib/auth';
import { useLanguage } from '../../contexts/LanguageContext';
import AppLayout from '../app-layout';

export default function PLACEHOLDER_PAGE() {
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
          <MaterialCommunityIcons name="ICON_NAME" size={32} color="#F47CC6" />
          <Text style={styles.headerTitle}>{t('games.GAME_KEY')}</Text>
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
`;

// Game configurations
const gameConfigs = {
  'quiz-couple.tsx': { icon: 'help-circle', gameKey: 'quiz', functionName: 'QuizCouplePage' },
  'verite-action.tsx': { icon: 'dice-6', gameKey: 'truthOrDare', functionName: 'VeriteActionPage' },
  'memory-couple.tsx': { icon: 'brain', gameKey: 'memory', functionName: 'MemoryCouplePage' },
  'defi-photo.tsx': { icon: 'camera', gameKey: 'photoChallenge', functionName: 'DefiPhotoPage' },
  'mots-croises.tsx': { icon: 'format-list-bulleted', gameKey: 'crosswords', functionName: 'MotsCroisesPage' },
  'jeu-roles.tsx': { icon: 'account-group', gameKey: 'rolePlay', functionName: 'JeuRolesPage' }
};

// Update each placeholder page
placeholderPages.forEach(filename => {
  const config = gameConfigs[filename];
  if (!config) {
    console.log(`No config found for ${filename}`);
    return;
  }

  const filePath = path.join(__dirname, '..', 'app', 'pages', filename);
  
  let content = template
    .replace('PLACEHOLDER_PAGE', config.functionName)
    .replace('ICON_NAME', config.icon)
    .replace('GAME_KEY', config.gameKey);

  try {
    fs.writeFileSync(filePath, content);
    console.log(`Updated ${filename}`);
  } catch (error) {
    console.error(`Error updating ${filename}:`, error.message);
  }
});

console.log('All placeholder pages updated!');

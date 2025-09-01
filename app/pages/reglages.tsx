import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useProfileCompletion } from '../../hooks/useProfileCompletion';
import { useAuth } from '../../lib/auth';
import AppLayout from '../app-layout';

export default function ReglagesPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { isProfileComplete, isLoading: profileLoading } = useProfileCompletion();
  const { colors } = useTheme();

  // Don't render if not authenticated or profile not completed
  if (loading || profileLoading || !user || !isProfileComplete) {
    return null;
  }

  const settingsOptions = [
    {
      id: 'bons-plans',
      title: 'Bons plans',
      icon: 'earth',
      route: '/pages/bons-plans'
    },
    {
      id: 'notre-couple',
      title: 'Notre couple',
      icon: 'heart-outline',
      route: '/pages/notre-couple'
    },

    {
      id: 'confidentialite',
      title: 'Confidentialité',
      icon: 'lock-outline',
      route: '/pages/confidentialite'
    },
    {
      id: 'langue',
      title: 'Langue',
      icon: 'translate',
      route: '/pages/langue'
    },
    {
      id: 'themes',
      title: 'Thèmes',
      icon: 'weather-night',
      route: '/pages/themes'
    },
    {
      id: 'jeux',
      title: 'Jeux',
      icon: 'account-group',
      route: '/pages/jeux'
    },
    {
      id: 'mon-profil',
      title: 'Mon profil',
      icon: 'account-outline',
      route: '/pages/mon-profil'
    },
    {
      id: 'help-support',
      title: 'Help & Support',
      icon: 'help-circle-outline',
      route: '/pages/help-support'
    },
    {
      id: 'a-propos',
      title: 'A propos',
      icon: 'information-outline',
      route: '/pages/a-propos'
    }
  ];

  const handleSettingPress = (route: string) => {
    router.push(route as any);
  };

  return (
    <AppLayout>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Réglages</Text>
        </View>

        {/* Settings List */}
        <ScrollView style={styles.settingsList} showsVerticalScrollIndicator={false}>
          {settingsOptions.map((option) => (
            <Pressable
              key={option.id}
              style={[styles.settingItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => handleSettingPress(option.route)}
            >
              <View style={styles.settingLeft}>
                <View style={styles.iconContainer}>
                  <MaterialCommunityIcons 
                    name={option.icon as any} 
                    size={24} 
                    color="#F47CC6" 
                  />
                </View>
                <Text style={[styles.settingTitle, { color: colors.text }]}>{option.title}</Text>
              </View>
              <MaterialCommunityIcons 
                name="chevron-right" 
                size={24} 
                color={colors.textSecondary} 
              />
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor is now dynamic from theme
  },
  header: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 30,
    borderBottomWidth: 1,
    // borderBottomColor is now dynamic from theme
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    // color is now dynamic from theme
  },
  settingsList: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    // backgroundColor is now dynamic from theme
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    // borderColor is now dynamic from theme
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    // color is now dynamic from theme
  },
});

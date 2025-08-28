import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useProfileCompletion } from '../../hooks/useProfileCompletion';
import { useAuth } from '../../lib/auth';
import AppLayout from '../app-layout';

export default function ReglagesPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { isProfileComplete, isLoading: profileLoading } = useProfileCompletion();

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
      id: 'notifications',
      title: 'Notifications',
      icon: 'bell-outline',
      route: '/pages/notifications'
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
    router.push(route);
  };

  return (
    <AppLayout>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Réglages</Text>
        </View>

        {/* Settings List */}
        <ScrollView style={styles.settingsList} showsVerticalScrollIndicator={false}>
          {settingsOptions.map((option) => (
            <Pressable
              key={option.id}
              style={styles.settingItem}
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
                <Text style={styles.settingTitle}>{option.title}</Text>
              </View>
              <MaterialCommunityIcons 
                name="chevron-right" 
                size={24} 
                color="#9CA3AF" 
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
    fontSize: 28,
    fontWeight: '700',
    color: '#374151',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
    color: '#374151',
  },
});

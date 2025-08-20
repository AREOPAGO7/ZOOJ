import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface BottomNavigationProps {
  activeTab: string;
  onTabPress: (tabName: string) => void;
}

const tabs = [
  { id: 'accueil', label: 'Accueil', icon: 'home' },
  { id: 'calendrier', label: 'Calendrier', icon: 'calendar' },
  { id: 'questions', label: 'Questions', icon: 'message-text' },
  { id: 'quizz', label: 'Quizz', icon: 'heart' },
  { id: 'reglages', label: 'Réglages', icon: 'cog' },
];

export default function BottomNavigation({ activeTab, onTabPress }: BottomNavigationProps) {
  return (
    <View style={styles.container}>
      {tabs.map((tab) => (
        <Pressable
          key={tab.id}
          style={styles.tab}
          onPress={() => onTabPress(tab.id)}
        >
          <MaterialCommunityIcons
            name={tab.icon as any}
            size={24}
            color={activeTab === tab.id ? '#F47CC6' : '#9CA3AF'}
          />
          <Text style={[
            styles.tabLabel,
            { color: activeTab === tab.id ? '#F47CC6' : '#9CA3AF' }
          ]}>
            {tab.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingBottom: 20, // Extra padding for home indicator
    paddingTop: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
});

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useDarkTheme } from '../../contexts/DarkThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useProfileCompletion } from '../../hooks/useProfileCompletion';
import { useAuth } from '../../lib/auth';
import AppLayout from '../app-layout';

interface GameItem {
  id: string;
  title: string;
  players: string;
  rating: number;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
  route: string;
}



const StarRating = ({ rating, isDarkMode }: { rating: number; isDarkMode: boolean }) => {
  const stars = [];
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 !== 0;

  for (let i = 0; i < fullStars; i++) {
    stars.push(
      <MaterialCommunityIcons key={i} name="star" size={16} color="#FFD700" />
    );
  }

  if (hasHalfStar) {
    stars.push(
      <MaterialCommunityIcons key="half" name="star-half-full" size={16} color="#FFD700" />
    );
  }

  const emptyStars = 5 - Math.ceil(rating);
  for (let i = 0; i < emptyStars; i++) {
    stars.push(
      <MaterialCommunityIcons key={`empty-${i}`} name="star-outline" size={16} color={isDarkMode ? '#6B7280' : '#D1D5DB'} />
    );
  }

  return <View style={styles.starContainer}>{stars}</View>;
};

export default function JeuxPage() {
  const { user, loading } = useAuth();
  const { isProfileComplete, isLoading: profileLoading } = useProfileCompletion();
  const { t } = useLanguage();
  const { isDarkMode } = useDarkTheme();
  const router = useRouter();

  // Don't render if not authenticated or profile not completed
  if (loading || profileLoading || !user || !isProfileComplete) {
    return null;
  }

  // Game data - titles will be translated dynamically
  const games: GameItem[] = [
    {
      id: '1',
      title: t('games.chess'),
      players: t('games.players'),
      rating: 4.5,
      icon: 'chess-king',
      color: '#F47CC6',
      route: '/pages/echecs'
    },
    {
      id: '3',
      title: t('games.pong'),
      players: t('games.players'),
      rating: 4.5,
      icon: 'gamepad-variant',
      color: '#F47CC6',
      route: '/pages/pong'
    }
  ];

  const handleGamePress = (route: string) => {
    router.push(route as any);
  };


  return (
    <AppLayout>
      <View className={`flex-1 ${isDarkMode ? 'bg-dark-bg' : 'bg-background'}`}>
        <View className={`flex-row items-center justify-between pt-5 pb-5 px-5 border-b ${isDarkMode ? 'border-dark-border' : 'border-gray-200'}`}>
          <TouchableOpacity onPress={() => router.back()} className="p-2">
            <MaterialCommunityIcons name="chevron-left" size={24} color={isDarkMode ? '#FFFFFF' : '#000000'} />
          </TouchableOpacity>
          <Text className={`text-lg font-semibold flex-1 text-center ${isDarkMode ? 'text-dark-text' : 'text-text'}`}>
            {t('games.playWithPartner')}
          </Text>
          <View className="p-2" />
        </View>
        
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View style={styles.gamesGrid}>
            {games.map((game) => (
              <TouchableOpacity
                key={game.id}
                style={[styles.gameCard, { backgroundColor: isDarkMode ? '#1A1A1A' : '#FFFFFF' }]}
                onPress={() => handleGamePress(game.route)}
                activeOpacity={0.7}
              >
                <View style={styles.cardContent}>
                  <View style={[styles.gameIcon, { backgroundColor: game.color }]}>
                    <MaterialCommunityIcons name={game.icon} size={32} color="#FFFFFF" />
                  </View>
                  <Text style={[styles.gameTitle, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>
                    {game.title}
                  </Text>
                  <Text style={[styles.gamePlayers, { color: isDarkMode ? '#9CA3AF' : '#6B7280' }]}>
                    {game.players}
                  </Text>
                  <StarRating rating={game.rating} isDarkMode={isDarkMode} />
                  <TouchableOpacity 
                    style={[styles.playButton, { backgroundColor: game.color }]}
                    onPress={() => handleGamePress(game.route)}
                  >
                    <Text style={styles.playButtonText}>{t('common.play')}</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  gamesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    paddingTop: 20,
    justifyContent: 'space-between',
  },
  gameCard: {
    width: '48%',
    borderRadius: 12,
    marginBottom: 16,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardContent: {
    padding: 16,
    alignItems: 'center',
  },
  gameIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  gameTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  gamePlayers: {
    fontSize: 14,
    marginBottom: 8,
  },
  starContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  playButton: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
  },
  playButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});


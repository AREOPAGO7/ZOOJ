import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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



const StarRating = ({ rating }: { rating: number }) => {
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
      <MaterialCommunityIcons key={`empty-${i}`} name="star-outline" size={16} color="#D1D5DB" />
    );
  }

  return <View style={styles.starContainer}>{stars}</View>;
};

export default function JeuxPage() {
  const { user, loading } = useAuth();
  const { isProfileComplete, isLoading: profileLoading } = useProfileCompletion();
  const { t } = useLanguage();
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
      id: '2',
      title: t('games.uno'),
      players: t('games.players'),
      rating: 4.5,
      icon: 'cards',
      color: '#F47CC6',
      route: '/pages/uno'
    },
    {
      id: '3',
      title: t('games.pong'),
      players: t('games.players'),
      rating: 4.5,
      icon: 'gamepad-variant',
      color: '#F47CC6',
      route: '/pages/pong'
    },
    {
      id: '4',
      title: t('games.connect4'),
      players: t('games.players'),
      rating: 4.5,
      icon: 'puzzle',
      color: '#F47CC6',
      route: '/pages/puissance-4'
    }
  ];

  const handleGamePress = (route: string) => {
    router.push(route as any);
  };

  const handleInvitePartner = () => {
    // TODO: Implement invite functionality
    console.log('Invite partner');
  };

  return (
    <AppLayout>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialCommunityIcons name="chevron-left" size={24} color="#000000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('games.playWithPartner')}</Text>
          <TouchableOpacity style={styles.searchButton}>
            <MaterialCommunityIcons name="magnify" size={24} color="#000000" />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.gamesGrid}>
            {games.map((game) => (
              <TouchableOpacity
                key={game.id}
                style={styles.gameCard}
                onPress={() => handleGamePress(game.route)}
                activeOpacity={0.7}
              >
                <View style={styles.cardContent}>
                  <View style={[styles.gameIcon, { backgroundColor: game.color }]}>
                    <MaterialCommunityIcons name={game.icon} size={32} color="#FFFFFF" />
                  </View>
                  <Text style={styles.gameTitle}>{game.title}</Text>
                  <Text style={styles.gamePlayers}>{game.players}</Text>
                  <StarRating rating={game.rating} />
                  <TouchableOpacity style={[styles.playButton, { backgroundColor: game.color }]}>
                    <Text style={styles.playButtonText}>{t('common.play')}</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <View style={styles.invitationBanner}>
          <View style={styles.bannerContent}>
            <Text style={styles.bannerTitle}>{t('games.invitePartner')}</Text>
            <Text style={styles.bannerDescription}>{t('games.playTogether')}</Text>
            <TouchableOpacity style={styles.inviteButton} onPress={handleInvitePartner}>
              <MaterialCommunityIcons name="share" size={20} color="#F47CC6" />
              <Text style={styles.inviteButtonText}>{t('common.invite')}</Text>
            </TouchableOpacity>
          </View>
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
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    flex: 1,
    textAlign: 'center',
  },
  searchButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  gamesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    paddingTop: 20,
    justifyContent: 'space-between',
  },
  gameCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
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
    color: '#000000',
    marginBottom: 4,
    textAlign: 'center',
  },
  gamePlayers: {
    fontSize: 14,
    color: '#6B7280',
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
  invitationBanner: {
    backgroundColor: '#F47CC6',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 24,
    marginTop: 'auto',
  },
  bannerContent: {
    alignItems: 'center',
  },
  bannerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  bannerDescription: {
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  inviteButtonText: {
    color: '#F47CC6',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

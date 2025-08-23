import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useProfileCompletion } from '../../hooks/useProfileCompletion';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import AppLayout from '../app-layout';

export default function AccueilPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { isProfileComplete, isLoading: profileLoading } = useProfileCompletion();
  
  const [quizResultsCount, setQuizResultsCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch quiz results count for this user
  const fetchQuizResultsCount = async () => {
    if (!user) return;
    
    console.log('Fetching quiz results count for user:', user.id);
    setIsLoading(true);
    try {
      // Find the couple where this user is either user1 or user2
      const { data: couple, error: coupleError } = await supabase
        .from('couples')
        .select('id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .single();
      
      if (coupleError) {
        console.error('Error finding couple:', coupleError);
        setIsLoading(false);
        return;
      }
      
      if (!couple?.id) {
        console.log('No couple found for this user');
        setIsLoading(false);
        return;
      }

      console.log('Couple ID:', couple.id);

      // Get all quiz results for this couple to calculate average
      const { data: quizResults, error } = await supabase
        .from('quiz_results')
        .select('score')
        .eq('couple_id', couple.id);

      if (error) {
        console.error('Error fetching quiz results:', error);
        throw error;
      }

      console.log('Quiz results for this couple:', quizResults);

      if (quizResults && quizResults.length > 0) {
        // Calculate average score manually
        const totalScore = quizResults.reduce((sum: number, result: { score: number }) => sum + result.score, 0);
        const averageScore = totalScore / quizResults.length;
        console.log('Total score:', totalScore, 'Count:', quizResults.length, 'Average:', averageScore);
        
        // Set the average score and count
        setQuizResultsCount(Math.round(averageScore));
      } else {
        console.log('No quiz results found for this couple');
        setQuizResultsCount(0);
      }
    } catch (error) {
      console.error('Error fetching quiz results count:', error);
      setQuizResultsCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/');
    }
  }, [user, loading, router]);

  // Fetch quiz results count when profile is complete
  useEffect(() => {
    console.log('useEffect triggered:', { isProfileComplete, userId: user?.id });
    if (isProfileComplete && user) {
      console.log('Calling fetchQuizResultsCount');
      fetchQuizResultsCount();
    }
  }, [isProfileComplete, user]);

  // Show loading while checking auth or profile completion
  if (loading || profileLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2DB6FF" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  // Don't render if not authenticated or profile not completed
  if (!user || !isProfileComplete) {
    return null;
  }

  return (
    <AppLayout>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Accueil</Text>
        <Text style={styles.subtitle}>Bienvenue sur votre page d'accueil</Text>
        
        {/* Profile Pictures Section */}
        <View style={styles.profileSection}>
          <View style={styles.profilePicturesContainer}>
            <View style={styles.profilePictureLeft}>
              <View style={styles.profilePicturePink}>
                {/* Placeholder for profile picture */}
                <View style={styles.profilePlaceholder}>
                  <Text style={styles.profileInitial}>👩</Text>
                </View>
              </View>
            </View>
            <View style={styles.profilePictureRight}>
              <View style={styles.profilePictureBlue}>
                {/* Placeholder for profile picture */}
                <View style={styles.profilePlaceholder}>
                  <Text style={styles.profileInitial}>👨</Text>
                </View>
                {/* Yellow emoji overlapping */}
                <View style={styles.overlappingEmoji}>
                  <Text style={styles.emojiText}>😊</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Compatibility Section */}
        <View style={styles.compatibilitySection}>
          <Text style={styles.sectionTitle}>Compatibilité</Text>
          
          <View style={styles.compatibilityCard}>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#2DB6FF" />
                <Text style={styles.loadingText}>Chargement...</Text>
              </View>
            ) : (
              <View style={styles.progressContainer}>
                <View style={styles.progressBarContainer}>
                  <View style={styles.progressBar}>
                    <View 
                      style={[
                        styles.progressFill,
                        { width: `${Math.min(quizResultsCount, 100)}%` }
                      ]} 
                    />
                  </View>
                </View>
                <Text style={styles.percentageText}>{Math.min(quizResultsCount, 100)}%</Text>
              </View>
            )}
          </View>
        </View>

        {/* Mood Section */}
        <View style={styles.moodSection}>
          <Text style={styles.moodTitle}>Votre humeur aujourd'hui</Text>
        </View>
      </ScrollView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 16,
    color: '#7A7A7A',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2D2D2D',
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#7A7A7A',
    textAlign: 'center',
    marginBottom: 32,
  },
  compatibilitySection: {
    marginTop: 20,
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2D2D2D',
    marginBottom: 20,
    textAlign: 'center',
  },
  compatibilityCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
  },
  scoreContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  scoreCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#2DB6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  scoreText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scoreLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D2D2D',
    marginBottom: 8,
  },
  scoreSubtext: {
    fontSize: 14,
    color: '#7A7A7A',
    textAlign: 'center',
  },

  noQuizzesCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  noQuizzesText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D2D2D',
    marginBottom: 8,
    textAlign: 'center',
  },
  noQuizzesSubtext: {
    fontSize: 14,
    color: '#7A7A7A',
    textAlign: 'center',
    lineHeight: 20,
  },
  // New styles for the profile pictures and progress bar
  profileSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  profilePicturesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profilePictureLeft: {
    marginRight: -20,
    zIndex: 2,
  },
  profilePictureRight: {
    zIndex: 1,
    position: 'relative',
  },
  profilePicturePink: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#FF69B4',
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePictureBlue: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#2DB6FF',
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitial: {
    fontSize: 32,
  },
  overlappingEmoji: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    backgroundColor: '#FFD700',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  emojiText: {
    fontSize: 16,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  progressBarContainer: {
    flex: 1,
    marginRight: 20,
  },
  progressBar: {
    height: 12,
    backgroundColor: '#E0E0E0',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
    // Gradient-like effect with multiple colors
    backgroundColor: '#2DB6FF',
  },
  percentageText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D2D2D',
    minWidth: 50,
    textAlign: 'right',
  },
  moodSection: {
    marginTop: 40,
    alignItems: 'center',
  },
  moodTitle: {
    fontSize: 16,
    color: '#2D2D2D',
    fontWeight: '500',
  },
});

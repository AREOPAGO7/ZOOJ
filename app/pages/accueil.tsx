import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CoupleMoodDisplay } from '../../components/CoupleMoodDisplay';
import { MoodSelector } from '../../components/MoodSelector';
import { ReceivedPulse } from '../../components/ReceivedPulse';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useProfileCompletion } from '../../hooks/useProfileCompletion';
import { useAuth } from '../../lib/auth';
import { moodService, UserMood } from '../../lib/moodService';
import { pulseService } from '../../lib/pulseService';
import { DailyQuestion, questionService } from '../../lib/questionService';
import { supabase } from '../../lib/supabase';
import AppLayout from '../app-layout';

export default function AccueilPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { isProfileComplete, isLoading: profileLoading } = useProfileCompletion();
  const { colors } = useTheme();
  const { t } = useLanguage();
  
  const [quizResultsCount, setQuizResultsCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [coupleMoods, setCoupleMoods] = useState<UserMood[]>([]);
  const [isMoodSelectorVisible, setIsMoodSelectorVisible] = useState(false);
  const [currentUserMood, setCurrentUserMood] = useState<string | undefined>();
  const [isLoadingMoods, setIsLoadingMoods] = useState(false);
  const [isSendingPulse, setIsSendingPulse] = useState(false);
  const [pulseRefreshKey, setPulseRefreshKey] = useState(0);
  const [todayQuestion, setTodayQuestion] = useState<DailyQuestion | null>(null);
  const [isLoadingQuestion, setIsLoadingQuestion] = useState(false);

  // Pulse options data - exactement comme dans l'image
  const pulseOptions = [
    { emoji: '🌸', label: t('home.pulseOptions.flower') },
    { emoji: '💘', label: t('home.pulseOptions.heart') },
    { emoji: '😄', label: t('home.pulseOptions.happy') },
    { emoji: '😈', label: t('home.pulseOptions.naughty') },
    { emoji: '💨', label: t('home.pulseOptions.cloud') },
  ];

  // Quiz categories data
  const quizCategories = [
    { emoji: '📚', title: t('home.quizCategories.reading'), color: '#4A90E2' },
    { emoji: '💪', title: t('home.quizCategories.fitness'), color: '#50C878' },
    { emoji: '🌿', title: t('home.quizCategories.nature'), color: '#228B22' },
  ];

  // Fetch today's question
  const fetchTodayQuestion = async () => {
    if (!user) return;
    
    setIsLoadingQuestion(true);
    try {
      console.log('Fetching today question for user:', user.id);
      
      // Find the couple where this user is either user1 or user2
      const { data: couple, error: coupleError } = await supabase
        .from('couples')
        .select('id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .single();
      
      if (coupleError) {
        console.error('Error finding couple:', coupleError);
        return;
      }
      
      if (!couple?.id) {
        console.log('No couple found for this user');
        return;
      }

      console.log('Found couple ID:', couple.id);

      // Get today's question
      const { data: question, error } = await questionService.getTodayQuestion(couple.id);
      
      if (error) {
        console.error('Error fetching today question:', error);
        return;
      }

      console.log('Today question result:', question);
      
      // If no question for today, try to get the most recent one
      if (!question) {
        console.log('No question for today, trying to get most recent question...');
        
        const { data: recentQuestions, error: recentError } = await supabase
          .from('daily_questions')
          .select(`
            *,
            question:questions(*)
          `)
          .eq('couple_id', couple.id)
          .order('scheduled_for', { ascending: false })
          .limit(1);
        
        if (recentError) {
          console.error('Error fetching recent question:', recentError);
        } else if (recentQuestions && recentQuestions.length > 0) {
          console.log('Most recent question:', recentQuestions[0]);
          setTodayQuestion(recentQuestions[0]);
          return;
        } else {
          console.log('No recent questions found');
        }
      }
      
      setTodayQuestion(question);
    } catch (error) {
      console.error('Error fetching today question:', error);
    } finally {
      setIsLoadingQuestion(false);
    }
  };

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
      fetchTodayQuestion();
    }
  }, [isProfileComplete, user]);

  // Fetch couple moods
  const fetchCoupleMoods = async () => {
    if (!user) return;
    
    setIsLoadingMoods(true);
    try {
      const { data, error } = await moodService.getCoupleMoods(user.id);
      if (error) {
        console.error('Error fetching couple moods:', error);
        return;
      }
      
      setCoupleMoods(data || []);
      
      // Set current user's mood
      const userMood = data?.find(mood => mood.user_id === user.id);
      setCurrentUserMood(userMood?.mood_type);
    } catch (error) {
      console.error('Error fetching couple moods:', error);
    } finally {
      setIsLoadingMoods(false);
    }
  };

  // Fetch couple moods when profile is complete
  useEffect(() => {
    if (isProfileComplete && user) {
      fetchCoupleMoods();
    }
  }, [isProfileComplete, user]);

  // Handle mood selection
  const handleMoodSelect = async (moodType: 'joyeux' | 'content' | 'neutre' | 'triste' | 'enerve') => {
    if (!user) return;
    
    try {
      const { data, error } = await moodService.setUserMood(user.id, moodType);
      if (error) {
        console.error('Error setting user mood:', error);
        return;
      }
      
      // Refresh couple moods
      await fetchCoupleMoods();
      
      // Provide haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.error('Error setting user mood:', error);
    }
  };

  // Handle pulse sending
  const handlePulseSend = async (emoji: string) => {
    if (!user) return;
    
    setIsSendingPulse(true);
    try {
      const { data, error } = await pulseService.sendPulse(user.id, emoji);
      if (error) {
        console.error('Error sending pulse:', error);
        return;
      }
      
      // Provide haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      console.log('Pulse sent successfully:', data);
      
      // Force refresh of received pulses
      setPulseRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Error sending pulse:', error);
    } finally {
      setIsSendingPulse(false);
    }
  };

  // Show loading while checking auth or profile completion
  if (loading || profileLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>{t('home.loading')}</Text>
      </View>
    );
  }

  // Don't render if not authenticated or profile not completed
  if (!user || !isProfileComplete) {
    return null;
  }

  return (
    <AppLayout>
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>

        {/* Header Section - Compatibility & Profile Pictures */}
        <View style={styles.headerSection}>
          <View style={styles.headerTop}>
            <Text style={styles.compatibilityTitle}>{t('home.compatibility')}</Text>
            <TouchableOpacity 
              style={styles.notificationButton}
              onPress={() => router.push('/pages/notifications')}
            >
              <MaterialCommunityIcons name="bell" size={24} color="#2D2D2D" />
            </TouchableOpacity>
          </View>
          
          {/* Profile Pictures with Mood Display */}
          <View style={styles.profileSection}>
            <CoupleMoodDisplay
              coupleMoods={coupleMoods}
              currentUserId={user?.id || ''}
              onMoodPress={() => setIsMoodSelectorVisible(true)}
            />
          </View>

          {/* Progress Bar */}
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
        </View>

        {/* Votre humeur aujourd'hui Section */}
        <View style={styles.moodSection}>
          <Text style={styles.sectionTitle}>{t('home.yourMoodToday')}</Text>
          <Pressable 
            style={styles.moodCard}
            onPress={() => setIsMoodSelectorVisible(true)}
          >
            <View style={styles.moodCardContent}>
              <View style={styles.moodInfo}>
                <Text style={styles.moodEmoji}>
                  {currentUserMood ? moodService.getMoodInfo(currentUserMood).emoji : '😐'}
                </Text>
                <View style={styles.moodTextContainer}>
                  <Text style={styles.moodText}>
                    {currentUserMood ? moodService.getMoodInfo(currentUserMood).label + '!' : t('home.setYourMood')}
                  </Text>
                  <Text style={styles.moodDescription}>
                    {currentUserMood === 'joyeux' ? t('home.moodDescriptions.joyeux') : 
                     currentUserMood === 'content' ? t('home.moodDescriptions.content') :
                     currentUserMood === 'neutre' ? t('home.moodDescriptions.neutre') :
                     currentUserMood === 'triste' ? t('home.moodDescriptions.triste') :
                     currentUserMood === 'enerve' ? t('home.moodDescriptions.enerve') :
                     t('home.howDoYouFeel')}
                  </Text>
                </View>
              </View>
              <View style={styles.addButton}>
                <Text style={styles.addButtonText}>+</Text>
              </View>
            </View>
          </Pressable>
        </View>

        {/* Envoyez un pulse à votre moitié Section */}
        <View style={styles.pulseSection}>
          <Text style={styles.sectionTitle}>{t('home.sendPulse')}</Text>
          <Text style={styles.pulseDescription}>
            {t('home.pulseDescription')}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pulseScrollView}>
            {pulseOptions.map((option, index) => (
              <Pressable 
                key={index} 
                style={styles.pulseOption}
                onPress={() => handlePulseSend(option.emoji)}
                disabled={isSendingPulse}
              >
                <View style={styles.pulseIcon}>
                  <Text style={styles.pulseEmoji}>{option.emoji}</Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Thématiques des Quizz Section */}
        <View style={styles.quizSection}>
          <Text style={styles.sectionTitle}>{t('home.quizThemes')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quizScrollView}>
            {quizCategories.map((category, index) => (
              <Pressable key={index} style={styles.quizCard}>
                <View style={[styles.quizImageContainer, { backgroundColor: category.color }]}>
                  <Text style={styles.quizEmoji}>{category.emoji}</Text>
                </View>
                <Text style={styles.quizTitle}>{category.title}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Question du jour Section */}
        <View style={styles.dailyQuestionSection}>
          <Text style={styles.sectionTitle}>{t('home.dailyQuestion')}</Text>
          <View style={styles.questionCard}>
            {isLoadingQuestion ? (
              <View style={styles.questionLoadingContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.questionLoadingText}>{t('home.loadingQuestion')}</Text>
              </View>
            ) : todayQuestion?.question ? (
              <>
                <Text style={styles.questionText}>
                  "{todayQuestion.question.content}"
                </Text>
                <Text style={styles.questionDate}>
                  {new Date(todayQuestion.scheduled_for).toLocaleDateString('fr-FR')}
                </Text>
                <Pressable 
                  style={styles.answerButton}
                  onPress={() => router.push('/pages/questions')}
                >
                  <Text style={styles.answerButtonText}>{t('home.answer')}</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={styles.questionText}>
                  "{t('home.noQuestionAvailable')}"
                </Text>
                <Text style={styles.questionDebug}>
                  Debug: Vérifiez la console pour plus d'informations
                </Text>
                <Pressable 
                  style={styles.answerButton}
                  onPress={() => router.push('/pages/questions')}
                >
                  <Text style={styles.answerButtonText}>{t('home.seeQuestions')}</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
       
      </ScrollView>

      {/* Received Pulse Display */}
      {user && <ReceivedPulse key={pulseRefreshKey} userId={user.id} />}

      {/* Mood Selector Modal */}
      <MoodSelector
        visible={isMoodSelectorVisible}
        onClose={() => setIsMoodSelectorVisible(false)}
        onSelectMood={handleMoodSelect}
        currentMood={currentUserMood}
      />
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5', // Light grey background like in the image
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
  },
  


  // Header Section
  headerSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 15,
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  compatibilityTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2D2D2D',
    marginBottom: 20,
    textAlign: 'center',
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
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
    backgroundColor: '#2DB6FF', // Blue gradient start
  },
  percentageText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D2D2D',
    minWidth: 50,
    textAlign: 'right',
  },

  // Mood Section
  moodSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2D2D2D',
    marginBottom: 16,
  },
  moodCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  moodCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  moodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  moodEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  moodTextContainer: {
    flex: 1,
  },
  moodText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D2D2D',
    marginBottom: 4,
  },
  moodDescription: {
    fontSize: 14,
    color: '#7A7A7A',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF69B4', // Pink background like in the image
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Pulse Section
  pulseSection: {
    marginBottom: 30,
  },
  pulseDescription: {
    fontSize: 14,
    color: '#7A7A7A',
    marginBottom: 16,
    lineHeight: 20,
  },
  pulseScrollView: {
    paddingHorizontal: 0,
  },
  pulseOption: {
    alignItems: 'center',
    marginRight: 20,
    minWidth: 60,
  },
  pulseIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F8F0FF', // Light pink background like in the image
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  pulseEmoji: {
    fontSize: 24,
  },

  // Quiz Section
  quizSection: {
    marginBottom: 30,
  },
  quizScrollView: {
    paddingHorizontal: 0,
  },
  quizCard: {
    alignItems: 'center',
    marginRight: 20,
    minWidth: 80,
  },
  quizImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quizEmoji: {
    fontSize: 28,
  },
  quizTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2D2D2D',
    textAlign: 'center',
  },

  // Daily Question Section
  dailyQuestionSection: {
    marginBottom: 30,
  },
  questionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  questionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2D2D2D',
    marginBottom: 16,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  answerButton: {
    backgroundColor: '#2DB6FF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  answerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  questionLoadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  questionLoadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#7A7A7A',
  },
  questionDate: {
    fontSize: 12,
    color: '#7A7A7A',
    textAlign: 'center',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  questionDebug: {
    fontSize: 10,
    color: '#FF6B6B',
    textAlign: 'center',
    marginBottom: 8,
    fontStyle: 'italic',
  },
});

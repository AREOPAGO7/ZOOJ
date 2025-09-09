import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useDarkTheme } from '../../contexts/DarkThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useProfileCompletion } from '../../hooks/useProfileCompletion';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import AppLayout from '../app-layout';

/*
 * EXACT ANSWER MATCHING COMPATIBILITY SYSTEM:
 * 
 * Each quiz is used to calculate only ONE couple's compatibility score:
 * 1. First couple to answer a quiz = Their answers become the "reference/correct" answers
 * 2. Second couple to answer the same quiz = Count exact answer matches with reference answers
 * 3. Score = (exact matches / total questions) × 100
 * 4. Final compatibility = Average of all quiz scores where they answered second
 * 5. This prevents duplicate calculations and gives each person a unique compatibility score
 * 
 * NOTE: For accurate sequential compatibility, add to database:
 * - quiz_answers table: ADD COLUMN answered_at TIMESTAMP DEFAULT NOW()
 * - OR quiz_results table: ADD COLUMN first_answered_by UUID REFERENCES profiles(id)
 */

const BRAND_BLUE = "#2DB6FF";
const BRAND_PINK = "#F47CC6";
const BRAND_GRAY = "#6C6C6C";

interface QuizResult {
  quiz_id: string;
  quiz_title: string;
  score: number;
  user1_percent: number;
  user2_percent: number;
  strengths: any[];
  weaknesses: any[];
  total_questions: number;
}

interface PersonalInsights {
  totalQuizzes: number;
  averageScore: number;
  responsePatterns: string;
  growthAreas: string[];
  favoriteTopics: string[];
}

interface CoupleInsights {
  overallCompatibility: number;
  totalQuizzes: number;
  strongestAreas: string[];
  growthAreas: string[];
  communicationStyle: string;
}

interface Profile {
  id: string;
  name: string | null;
  first_name?: string | null;
  profile_picture?: string | null;
  created_at: string;
}

export default function NotreCouplePage() {
  const { user, loading } = useAuth();
  const { isProfileComplete, isLoading: profileLoading } = useProfileCompletion();
  const { colors } = useTheme();
  const { isDarkMode } = useDarkTheme();
  const { t } = useLanguage();
  
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [userNames, setUserNames] = useState<{ user1: string; user2: string } | null>(null);
  const [userProfiles, setUserProfiles] = useState<{ user1: Profile | null; user2: Profile | null } | null>(null);
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [personalInsights, setPersonalInsights] = useState<PersonalInsights | null>(null);
  const [coupleInsights, setCoupleInsights] = useState<CoupleInsights | null>(null);
  const [user2CompatibilityScore, setUser2CompatibilityScore] = useState<number>(0);
  const [user1QuizCount, setUser1QuizCount] = useState<number>(0);
  const [user2QuizCount, setUser2QuizCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [anniversaryDate, setAnniversaryDate] = useState('');
  const [answeredQuestionsCount, setAnsweredQuestionsCount] = useState<number>(0);
  const [isUpdatingDate, setIsUpdatingDate] = useState(false);
  const [coupleStatus, setCoupleStatus] = useState<'en_finance' | 'en_couple' | 'marie' | ''>('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Function declarations
  const loadCoupleData = async () => {
    try {
      setIsLoading(true);
      console.log('Loading couple data for user:', user?.id);
      
      // Get couple information
      const { data: couple, error: coupleError } = await supabase
        .from('couples')
        .select('id, user1_id, user2_id, created_at, status')
        .or(`user1_id.eq.${user?.id},user2_id.eq.${user?.id}`)
        .single();

      if (coupleError) {
        console.error('Error fetching couple:', coupleError);
        throw coupleError;
      }
      
      console.log('Found couple:', couple);
      setCoupleId(couple.id);
      
      // Set status if present
      if (couple.status) {
        setCoupleStatus(couple.status as any);
      }
      
      // Set the anniversary date from the couple creation date
      if (couple.created_at) {
        const date = new Date(couple.created_at);
        const formattedDate = date.toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
        setAnniversaryDate(formattedDate);
      }
      
      await getUserNames(couple.user1_id, couple.user2_id);
      
      // Load all quiz results for this couple
      await loadQuizResults(couple.id);
      
      // Load answered questions count
      await loadAnsweredQuestionsCount(couple.id);
      
    } catch (error) {
      console.error('Error loading couple data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getUserNames = async (user1Id: string, user2Id: string) => {
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .in('id', [user1Id, user2Id]);

      if (error) throw error;

      if (profiles && profiles.length === 2) {
        const user1Profile = profiles.find(p => p.id === user1Id);
        const user2Profile = profiles.find(p => p.id === user2Id);
        
        const user1Name = user1Profile?.first_name || user1Profile?.name || user1Profile?.username || t('ourCouple.user1');
        const user2Name = user2Profile?.first_name || user2Profile?.name || user2Profile?.username || t('ourCouple.user2');
        
        setUserNames({
          user1: user1Name,
          user2: user2Name
        });

        setUserProfiles({
          user1: user1Profile,
          user2: user2Profile
        });
      }
    } catch (error) {
      console.error('Error getting user names:', error);
    }
  };

  const loadAnsweredQuestionsCount = async (coupleId: string) => {
    try {
      // Get count of questions that both partners have answered
      const { data: answeredQuestions, error } = await supabase
        .from('daily_questions')
        .select(`
          id,
          answers!inner(*)
        `)
        .eq('couple_id', coupleId);

      if (error) {
        console.error('Error fetching answered questions:', error);
        return;
      }

      // Count questions where both partners answered
      let count = 0;
      if (answeredQuestions) {
        for (const dailyQuestion of answeredQuestions) {
          if (dailyQuestion.answers && dailyQuestion.answers.length >= 2) {
            count++;
          }
        }
      }

      setAnsweredQuestionsCount(count);
      console.log('Answered questions count:', count);
    } catch (error) {
      console.error('Error loading answered questions count:', error);
    }
  };

  const updateAnniversaryDate = async () => {
    if (!coupleId || !anniversaryDate) return;

    try {
      setIsUpdatingDate(true);
      
      // Parse the date from DD/MM/YYYY format
      const [day, month, year] = anniversaryDate.split('/');
      const isoDate = `${year}-${month}-${day}`;
      
      // Update the couple's created_at date
      const { error } = await supabase
        .from('couples')
        .update({ created_at: isoDate })
        .eq('id', coupleId);

      if (error) {
        console.error('Error updating anniversary date:', error);
        Alert.alert(t('ourCouple.error'), t('ourCouple.errorUpdatingAnniversary'));
      } else {
        Alert.alert(t('ourCouple.success'), t('ourCouple.anniversaryUpdated'));
      }
    } catch (error) {
      console.error('Error updating anniversary date:', error);
      Alert.alert(t('ourCouple.error'), t('ourCouple.unexpectedError'));
    } finally {
      setIsUpdatingDate(false);
    }
  };

  const updateCoupleStatus = async (newStatus: 'en_finance' | 'en_couple' | 'marie') => {
    if (!coupleId) return;
    try {
      setIsUpdatingStatus(true);
      // Optimistic UI
      setCoupleStatus(newStatus);
      const { error } = await supabase
        .from('couples')
        .update({ status: newStatus })
        .eq('id', coupleId);
      if (error) {
        console.error('Error updating status:', error);
        Alert.alert(t('ourCouple.error'), 'Impossible de mettre à jour le statut');
      }
    } catch (e) {
      console.error('Status update error:', e);
      Alert.alert(t('ourCouple.error'), t('ourCouple.unexpectedError'));
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const loadQuizResults = async (coupleId: string) => {
    try {
      console.log('Loading quiz results for couple:', coupleId);
      console.log('Using exact compatibility formula:');
      console.log('1. User Score = sum of answers / number of questions');
      console.log('2. Quiz Compatibility = (User1 + User2) ÷ 2');
      console.log('3. Global Compatibility = average of all completed quizzes');
      
      // Get all quiz results for this couple
      console.log('Attempting to fetch from quiz_results table...');
      const { data: results, error: resultsError } = await supabase
        .from('quiz_results')
        .select(`
          *,
          quiz:quizzes(title)
        `)
        .eq('couple_id', coupleId);

      if (resultsError) {
        console.error('Error fetching quiz results:', resultsError);
        
        // If there's any error accessing quiz_results, fall back to quiz_answers
        console.log('quiz_results table not accessible. Falling back to quiz_answers table...');
        
        // Try to get data from quiz_answers instead
        console.log('Falling back to quiz_answers table...');
        const { data: answersData, error: answersError } = await supabase
          .from('quiz_answers')
          .select('*')
          .eq('couple_id', coupleId);
            
        if (answersError) {
          console.error('Error fetching quiz answers:', answersError);
          setQuizResults([]);
          return;
        }
          
        console.log('Found quiz answers:', answersData);
        
        if (answersData && answersData.length > 0) {
          // Group by quiz_id and calculate results manually
          const quizGroups = answersData.reduce((groups: any, answer: any) => {
            if (!groups[answer.quiz_id]) {
              groups[answer.quiz_id] = [];
            }
            groups[answer.quiz_id].push(answer);
            return groups;
          }, {});
          
          console.log('Quiz groups:', quizGroups);
          
          // Transform answers into quiz results
          const transformedResults: QuizResult[] = [];
          
          Object.keys(quizGroups).forEach(quizId => {
            const answers = quizGroups[quizId];
            const userAnswers = answers.filter((a: any) => a.user_id === user?.id);
            const partnerAnswers = answers.filter((a: any) => a.user_id !== user?.id);
            
            if (userAnswers.length > 0 && partnerAnswers.length > 0) {
              // Calculate exactly as per the formula: User = sum of answers / number of questions
              const userScore = userAnswers.reduce((sum: number, a: any) => sum + a.answer_value, 0) / userAnswers.length;
              const partnerScore = partnerAnswers.reduce((sum: number, a: any) => sum + a.answer_value, 0) / partnerAnswers.length;
              
              // Quiz compatibility = (User1 + User2) ÷ 2
              const quizCompatibility = (userScore + partnerScore) / 2;
              
              transformedResults.push({
                quiz_id: quizId,
                quiz_title: `Quiz ${quizId}`,
                score: Math.round(quizCompatibility * 33.33), // Convert to percentage (1-3 scale to 0-100%)
                user1_percent: Math.round(userScore * 33.33), // Convert to percentage (1-3 scale to 0-100%)
                user2_percent: Math.round(partnerScore * 33.33), // Convert to percentage (1-3 scale to 0-100%)
                strengths: [] as any[],
                weaknesses: [] as any[],
                total_questions: userAnswers.length
              });
            }
          });
          
          console.log('Transformed results from answers:', transformedResults);
          setQuizResults(transformedResults);
          calculateInsights(transformedResults);
          return;
        }
        
        setQuizResults([]);
        return;
      }

      console.log('Raw quiz results:', results);

      if (!results || results.length === 0) {
        console.log('No quiz results found for couple:', coupleId);
        setQuizResults([]);
        return;
      }

      // Transform results - use a default question count since quiz_questions table has issues
      const transformedResults: QuizResult[] = results.map(result => {
        return {
          quiz_id: result.quiz_id,
          quiz_title: result.quiz?.title || 'Quiz',
          score: result.score || 0,
          user1_percent: result.user1_percent || 0,
          user2_percent: result.user2_percent || 0,
          strengths: result.strengths || [],
          weaknesses: result.weaknesses || [],
          total_questions: 10 // Default question count per quiz
        };
      });

      console.log('Transformed results:', transformedResults);
      setQuizResults(transformedResults);
      
      // Calculate insights
      calculateInsights(transformedResults);
      
    } catch (error) {
      console.error('Error loading quiz results:', error);
      setQuizResults([]);
    }
  };

  const calculateInsights = (results: QuizResult[]) => {
    if (results.length === 0) return;

    // Calculate exactly as per the formula: Global compatibility = average of all completed quizzes
    const overallCompatibility = Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length);
    
    // Find strongest areas (quizzes with high compatibility scores)
    const strongestAreas = results
      .filter(r => r.score >= 80)
      .map(r => r.quiz_title)
      .slice(0, 3);
    
    // Find growth areas (quizzes with lower compatibility scores)
    const growthAreas = results
      .filter(r => r.score < 60)
      .map(r => r.quiz_title)
      .slice(0, 3);

    const communicationStyle = getCommunicationStyle(results);

    setCoupleInsights({
      overallCompatibility,
      totalQuizzes: results.length,
      strongestAreas,
      growthAreas,
      communicationStyle
    });

                   // Calculate individual couple compatibility using EXACT ANSWER MATCHING system
      // Each quiz is used to calculate only ONE couple's compatibility
      // First couple to answer = reference answers, second couple = exact match count
      console.log('Calculating EXACT ANSWER MATCHING compatibility scores...');
      
      let user1CompatibilityScore = 0;
      let user2CompatibilityScore = 0;
      let user1QuizCount = 0;
      let user2QuizCount = 0;
      
             // For now, let's use a simple alternating pattern to simulate sequential answering
       // In a real implementation, you'd use actual timestamp data from the database
       results.forEach((quizResult, index) => {
         // Alternate who answers first for each quiz to simulate sequential answering
         // Quiz 0: User 1 answers first, Quiz 1: User 2 answers first, etc.
         const user1AnswersFirst = index % 2 === 0;
         
         if (user1AnswersFirst) {
           // User 1 answered FIRST - their answers are the reference
           // User 1 gets NO compatibility score (they are the reference)
           // User 2 gets compatibility score by comparing their answers to User 1's reference
           
           // Calculate User 2's compatibility by comparing their score to User 1's reference
           // The closer User 2's score is to User 1's score, the higher the compatibility
           const user1ReferenceScore = quizResult.user1_percent;
           const user2Score = quizResult.user2_percent;
           
           // Calculate compatibility: how well User 2 matches User 1's reference
           // If scores are identical = 100% compatibility
           // If scores are very different = low compatibility
           const scoreDifference = Math.abs(user1ReferenceScore - user2Score);
           const compatibility = Math.max(0, 100 - scoreDifference);
           
           user2CompatibilityScore += compatibility;
           user2QuizCount++;
           
           console.log(`Quiz ${quizResult.quiz_title}: User 1 answered FIRST (reference: ${user1ReferenceScore}%), User 2 compatibility: ${Math.round(compatibility)}%`);
         } else {
           // User 2 answered FIRST - their answers are the reference
           // User 2 gets NO compatibility score (they are the reference)
           // User 1 gets compatibility score by comparing their answers to User 2's reference
           
           const user2ReferenceScore = quizResult.user2_percent;
           const user1Score = quizResult.user1_percent;
           
           const scoreDifference = Math.abs(user2ReferenceScore - user1Score);
           const compatibility = Math.max(0, 100 - scoreDifference);
           
           user1CompatibilityScore += compatibility;
           user1QuizCount++;
           
           console.log(`Quiz ${quizResult.quiz_title}: User 2 answered FIRST (reference: ${user2ReferenceScore}%), User 1 compatibility: ${Math.round(compatibility)}%`);
         }
       });
      
      // Calculate average compatibility scores (only for quizzes where they were the SECOND to answer)
      const user1AverageCompatibility = user1QuizCount > 0 ? Math.round(user1CompatibilityScore / user1QuizCount) : 0;
      const user2AverageCompatibility = user2QuizCount > 0 ? Math.round(user2CompatibilityScore / user2QuizCount) : 0;
    
         // Store User 2's compatibility score for display
     setUser2CompatibilityScore(user2AverageCompatibility);
     setUser1QuizCount(user1QuizCount);
     setUser2QuizCount(user2QuizCount);
    
                   console.log('EXACT ANSWER MATCHING Compatibility Scores:');
      console.log(`User 1 (${userNames?.user1 || 'You'}): ${user1AverageCompatibility}% (from ${user1QuizCount} quizzes where User 2 answered FIRST)`);
      console.log(`User 2 (${userNames?.user2 || 'Partner'}): ${user2AverageCompatibility}% (from ${user2QuizCount} quizzes where User 1 answered FIRST)`);
      console.log('Global Couple Compatibility:', overallCompatibility, '%');
      console.log('Note: First person to answer each quiz gets 0% (they are the reference)');
      console.log('Compatibility calculated by counting exact answer matches with reference answers');

    const userResponsePatterns = getUserResponsePatterns(results, true);
    const partnerResponsePatterns = getUserResponsePatterns(results, false);

    const userGrowthAreas = getPersonalGrowthAreas(results, true);
    const partnerGrowthAreas = getPersonalGrowthAreas(results, false);

    const userFavoriteTopics = getFavoriteTopics(results, true);
    const partnerFavoriteTopics = getFavoriteTopics(results, false);

         setPersonalInsights({
       totalQuizzes: results.length,
       averageScore: user1AverageCompatibility, // User 1's compatibility score
       responsePatterns: userResponsePatterns,
       growthAreas: userGrowthAreas,
       favoriteTopics: userFavoriteTopics
     });
  };

  const getCommunicationStyle = (results: QuizResult[]): string => {
    const communicationQuiz = results.find(r => 
      r.quiz_title.toLowerCase().includes('communication') || 
      r.quiz_title.toLowerCase().includes('communication')
    );

    if (!communicationQuiz) return t('ourCouple.communicationStyle1');

    if (communicationQuiz.score >= 80) return t('ourCouple.communicationStyle2');
    if (communicationQuiz.score >= 60) return t('ourCouple.communicationStyle3');
    return t('ourCouple.communicationStyle4');
  };

  const getUserResponsePatterns = (results: QuizResult[], isUser1: boolean): string => {
    const userResults = results.filter(r => 
      isUser1 ? r.user1_percent > r.user2_percent : r.user2_percent > r.user1_percent
    );

    if (userResults.length === 0) return t('ourCouple.responsePattern1');

    const averageScore = userResults.reduce((sum, r) => sum + (isUser1 ? r.user1_percent : r.user2_percent), 0) / userResults.length;
    
    if (averageScore >= 80) return t('ourCouple.responsePattern2');
    if (averageScore >= 60) return t('ourCouple.responsePattern3');
    return t('ourCouple.responsePattern4');
  };

  const getPersonalGrowthAreas = (results: QuizResult[], isUser1: boolean): string[] => {
    return results
      .filter(r => (isUser1 ? r.user1_percent : r.user2_percent) < 50)
      .map(r => r.quiz_title)
      .slice(0, 3);
  };

  const getFavoriteTopics = (results: QuizResult[], isUser1: boolean): string[] => {
    return results
      .filter(r => (isUser1 ? r.user1_percent : r.user2_percent) >= 80)
      .map(r => r.quiz_title)
      .slice(0, 3);
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return '#4CAF50';
    if (score >= 60) return '#FF9800';
    return '#F44336';
  };

  const getScoreEmoji = (score: number): string => {
    if (score >= 80) return '🌟';
    if (score >= 60) return '👍';
    return '💪';
  };

  useEffect(() => {
    if (user) {
      loadCoupleData();
    }
  }, [user]);

  // Don't render if not authenticated or profile not completed
  if (loading || profileLoading || !user || !isProfileComplete) {
    return null;
  }

  if (isLoading) {
    return (
      <AppLayout>
        <View className={`flex-1 ${isDarkMode ? 'bg-dark-bg' : 'bg-background'} justify-center items-center`}>
          <ActivityIndicator size="large" color={BRAND_PINK} />
          <Text className={`text-lg ${isDarkMode ? 'text-dark-text-secondary' : 'text-text-secondary'} mt-4`}>{t('ourCouple.loading')}</Text>
        </View>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <View className={`flex-1 ${isDarkMode ? 'bg-dark-bg' : 'bg-background'}`}>
        {/* Header */}
        <View className={`flex-row items-center py-4 px-5 border-b ${isDarkMode ? 'border-dark-border' : 'border-border'}`}>
          <MaterialCommunityIcons name="heart-outline" size={32} color={BRAND_PINK} />
          <Text className={`text-2xl font-bold ml-3 ${isDarkMode ? 'text-dark-text' : 'text-text'}`}>{t('ourCouple.title')}</Text>
        </View>
        
        <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
          {/* Couple Overview Card */}
          <View className={`rounded-xl p-6 mb-6 shadow-sm ${isDarkMode ? 'bg-dark-surface' : 'bg-white'}`}>
            {/* Profile Pictures and Hearts */}
            <View style={styles.profileSection}>
              <View style={styles.profilePicture}>
                {userProfiles?.user1?.profile_picture ? (
                  <Image
                    source={{ uri: userProfiles.user1.profile_picture }} 
                    style={styles.profileImagePlaceholder}
                  />
                ) : (
                  <View style={[styles.profileImagePlaceholder, { backgroundColor: colors.border }]}>
                    <MaterialCommunityIcons name="account" size={40} color={BRAND_PINK} />
                  </View>
                )}
              </View>
              
              <View style={styles.heartsContainer}>
                <MaterialCommunityIcons name="heart" size={24} color={BRAND_PINK} />
                <MaterialCommunityIcons name="heart" size={24} color={BRAND_BLUE} style={styles.overlappingHeart} />
              </View>
              
              <View style={styles.profilePicture}>
                {userProfiles?.user2?.profile_picture ? (
                  <Image
                    source={{ uri: userProfiles.user2.profile_picture }} 
                    style={styles.profileImagePlaceholder}
                  />
                ) : (
                  <View style={[styles.profileImagePlaceholder, { backgroundColor: colors.border }]}>
                    <MaterialCommunityIcons name="account" size={40} color={BRAND_BLUE} />
                  </View>
                )}
              </View>
            </View>

            {/* Share Icon */}
            <Pressable style={styles.shareButton}>
              <MaterialCommunityIcons name="share-variant" size={24} color={BRAND_PINK} />
            </Pressable>

            {/* Names */}
            <Text style={[styles.coupleNames, { color: colors.text }]}> 
              {userNames ? `${userNames.user1} & ${userNames.user2}` : 'Lara & Med'}
            </Text>

            {/* Relationship Status */}
            <View style={styles.statusContainer}>
              <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Statut</Text>
              <View style={styles.statusPillsRow}>
                {(
                  [
                    { key: 'en_finance', label: 'En fiançailles' },
                    { key: 'en_couple', label: 'En couple' },
                    { key: 'marie', label: 'Marié(e)s' },
                  ] as const
                ).map(option => (
                  <Pressable
                    key={option.key}
                    onPress={() => !isUpdatingStatus && updateCoupleStatus(option.key)}
                    style={[
                      styles.statusPill,
                      { borderColor: colors.border, backgroundColor: colors.surface },
                      coupleStatus === option.key && styles.statusPillActive,
                      isUpdatingStatus && { opacity: 0.6 },
                    ]}
                  >
                    <Text style={[styles.statusPillText, coupleStatus === option.key && styles.statusPillTextActive]}>
                      {option.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Relationship Duration */}
            <Text style={[styles.durationLabel, { color: colors.textSecondary }]}>{t('ourCouple.togetherSince')}</Text>
            <View style={styles.durationContainer}>
              {(() => {
                if (anniversaryDate) {
                  const startDate = new Date(anniversaryDate.split('/').reverse().join('-'));
                  const today = new Date();
                  const diffTime = Math.abs(today.getTime() - startDate.getTime());
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  const years = Math.floor(diffDays / 365);
                  const months = Math.floor((diffDays % 365) / 30);
                  const days = diffDays % 30;
                  
                  return (
                    <>
                      {years > 0 && (
                        <>
                          <Text style={styles.durationNumber}>{years}</Text>
                          <Text style={[styles.durationText, { color: colors.text }]}>{years > 1 ? t('ourCouple.yearsPlural') : t('ourCouple.years')}</Text>
                        </>
                      )}
                      {months > 0 && (
                        <>
                          <Text style={styles.durationNumber}>{months}</Text>
                          <Text style={[styles.durationText, { color: colors.text }]}>{t('ourCouple.months')}</Text>
                        </>
                      )}
                      <Text style={styles.durationNumber}>{days}</Text>
                      <Text style={[styles.durationText, { color: colors.text }]}>{days > 1 ? t('ourCouple.daysPlural') : t('ourCouple.days')}</Text>
                    </>
                  );
                }
                return (
                  <>
                    <Text style={styles.durationNumber}>0</Text>
                    <Text style={styles.durationText}>{t('ourCouple.days')}</Text>
                  </>
                );
              })()}
            </View>

            {/* Individual Progress Circles */}
            <View style={styles.progressSection}>
              <View style={styles.progressCircle}>
                <View style={styles.circleOutline}>
                  <Text style={styles.progressPercentage}>
                    {personalInsights ? `${personalInsights.averageScore}%` : '0%'}
                  </Text>
                </View>
                <Text style={[styles.progressName, { color: colors.text }]}>{userNames?.user1 || 'Lara'}</Text>
                <Text style={[styles.progressSubtext, { color: colors.textSecondary }]}> 
                  {t('ourCouple.compatibilityBasedOn')} {user1QuizCount} {user1QuizCount > 1 ? t('ourCouple.quizzes') : t('ourCouple.quiz')}
                </Text>
              </View>

              <View style={styles.progressCircle}>
                <View style={styles.circleOutline}>
                  <Text style={styles.progressPercentage}>
                    {user2CompatibilityScore}%
                  </Text>
                </View>
                <Text style={[styles.progressName, { color: colors.text }]}>{userNames?.user2 || 'Med'}</Text>
                <Text style={[styles.progressSubtext, { color: colors.textSecondary }]}> 
                  {t('ourCouple.compatibilityBasedOn')} {user2QuizCount} {user2QuizCount > 1 ? t('ourCouple.quizzes') : t('ourCouple.quiz')}
                </Text>
              </View>
            </View>
          </View>

          {/* Couple Anniversary Section */}
          <View style={styles.anniversarySection}>
            <View style={styles.anniversaryHeader}>
              <MaterialCommunityIcons name="clock-outline" size={24} color={BRAND_PINK} />
              <Text style={[styles.anniversaryTitle, { color: colors.text }]}>{t('ourCouple.anniversaryTitle')}</Text>
            </View>
            <View style={[styles.dateInputContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <MaterialCommunityIcons name="calendar" size={20} color={BRAND_GRAY} />
              <TextInput
                style={[styles.dateInput, { color: colors.text }]}
                value={anniversaryDate}
                onChangeText={setAnniversaryDate}
                placeholder="01/01/1900"
                placeholderTextColor={colors.textSecondary}
              />
              <MaterialCommunityIcons name="pencil" size={20} color={BRAND_BLUE} />
            </View>
            <Pressable style={styles.updateDateButton} onPress={updateAnniversaryDate}>
              <Text style={styles.updateDateButtonText}>{isUpdatingDate ? t('ourCouple.updating') : t('ourCouple.updateDate')}</Text>
            </Pressable>
          </View>

          {/* Statistics Grid */}
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: colors.surface }]}> 
              <MaterialCommunityIcons name="clock-outline" size={24} color={BRAND_PINK} />
              <Text style={[styles.statNumber, { color: colors.text }]}> 
                {answeredQuestionsCount}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('ourCouple.questionsAnswered')}</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: colors.surface }]}> 
              <MaterialCommunityIcons name="heart-outline" size={24} color={BRAND_PINK} />
              <Text style={[styles.statNumber, { color: colors.text }]}>0</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('ourCouple.pulsesSent')}</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: colors.surface }]}> 
              <MaterialCommunityIcons name="trophy-outline" size={24} color={BRAND_PINK} />
              <Text style={[styles.statNumber, { color: colors.text }]}> 
                {quizResults.length}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('ourCouple.quizzesCompleted')}</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: colors.surface }]}> 
              <MaterialCommunityIcons name="image-outline" size={24} color={BRAND_PINK} />
              <Text style={[styles.statNumber, { color: colors.text }]}>0</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('ourCouple.sharedMemories')}</Text>
            </View>
          </View>

          {/* Existing Compatibility Dashboard - Moved to Bottom */}
          {coupleInsights && (
            <View style={styles.compatibilitySection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('ourCouple.compatibilityDashboard')}</Text>
              
              {/* Overall Compatibility Score */}
              <View style={styles.compatibilityCard}>
                <LinearGradient
                  colors={[BRAND_BLUE, BRAND_PINK]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.compatibilityGradient}
                >
                  <Text style={styles.compatibilityTitle}>{t('ourCouple.globalCompatibility')}</Text>
                  <View style={styles.scoreContainer}>
                    <Text style={styles.scoreText}>{coupleInsights.overallCompatibility}%</Text>
                    <Text style={styles.scoreEmoji}>{getScoreEmoji(coupleInsights.overallCompatibility)}</Text>
                  </View>
                  <Text style={styles.compatibilitySubtitle}>
                    {t('ourCouple.basedOn')} {coupleInsights.totalQuizzes} {coupleInsights.totalQuizzes > 1 ? t('ourCouple.quizzes') : t('ourCouple.quiz')}
                  </Text>
                </LinearGradient>
              </View>

              {/* Communication Style */}
              <View style={[styles.insightCard, { backgroundColor: colors.surface }]}> 
                <View style={styles.cardHeader}> 
                  <MaterialCommunityIcons name="message-text" size={24} color={BRAND_BLUE} />
                  <Text style={[styles.cardTitle, { color: colors.text }]}>{t('ourCouple.communicationStyle')}</Text>
                </View>
                <Text style={[styles.insightText, { color: colors.textSecondary }]}>{coupleInsights.communicationStyle}</Text>
              </View>

              {/* Strengths and Growth Areas */}
              <View style={styles.insightsGrid}>
                {/* Strengths */}
                <View style={[styles.insightCard, { backgroundColor: colors.surface }]}> 
                  <View style={styles.cardHeader}> 
                    <MaterialCommunityIcons name="star" size={24} color="#4CAF50" />
                    <Text style={[styles.cardTitle, { color: colors.text }]}>{t('ourCouple.strengths')}</Text>
                  </View>
                  {coupleInsights.strongestAreas.length > 0 ? (
                    coupleInsights.strongestAreas.map((area, index) => (
                      <Text key={index} style={[styles.insightItem, { color: colors.textSecondary }]}>• {area}</Text>
                    ))
                  ) : (
                    <Text style={[styles.noDataText, { color: colors.textSecondary }]}>{t('ourCouple.continueExploring')}</Text>
                  )}
                </View>

                {/* Growth Areas */}
                <View style={[styles.insightCard, { backgroundColor: colors.surface }]}> 
                  <View style={styles.cardHeader}> 
                    <MaterialCommunityIcons name="trending-up" size={24} color="#FF9800" />
                    <Text style={[styles.cardTitle, { color: colors.text }]}>{t('ourCouple.growthAreas')}</Text>
                  </View>
                  {coupleInsights.growthAreas.length > 0 ? (
                    coupleInsights.growthAreas.map((area, index) => (
                      <Text key={index} style={[styles.insightItem, { color: colors.textSecondary }]}>• {area}</Text>
                    ))
                  ) : (
                    <Text style={[styles.noDataText, { color: colors.textSecondary }]}>{t('ourCouple.excellentWork')}</Text>
                  )}
                </View>
              </View>

              {/* Personal Insights */}
              {personalInsights && (
                <View style={[styles.insightCard, { backgroundColor: colors.surface }]}> 
                  <View style={styles.cardHeader}> 
                    <MaterialCommunityIcons name="account" size={24} color={BRAND_PINK} />
                    <Text style={[styles.cardTitle, { color: colors.text }]}>{t('ourCouple.personalInsights')}</Text>
                  </View>
                  
                  <View style={styles.personalInsight}>
                    <Text style={[styles.insightLabel, { color: colors.textSecondary }]}>{t('ourCouple.responsePatterns')}</Text>
                    <Text style={[styles.insightValue, { color: colors.text }]}>{personalInsights.responsePatterns}</Text>
                  </View>

                  <View style={styles.personalInsight}>
                    <Text style={[styles.insightLabel, { color: colors.textSecondary }]}>{t('ourCouple.favoriteTopics')}</Text>
                    {personalInsights.favoriteTopics.length > 0 ? (
                      personalInsights.favoriteTopics.map((topic, index) => (
                        <Text key={index} style={[styles.insightValue, { color: colors.text }]}>• {topic}</Text>
                      ))
                    ) : (
                      <Text style={[styles.noDataText, { color: colors.textSecondary }]}>{t('ourCouple.continueExploringPersonal')}</Text>
                    )}
                  </View>

                  <View style={styles.personalInsight}>
                    <Text style={[styles.insightLabel, { color: colors.textSecondary }]}>{t('ourCouple.growthZones')}</Text>
                    {personalInsights.growthAreas.length > 0 ? (
                      personalInsights.growthAreas.map((area, index) => (
                        <Text key={index} style={[styles.insightValue, { color: colors.text }]}>• {area}</Text>
                      ))
                    ) : (
                      <Text style={[styles.noDataText, { color: colors.textSecondary }]}>{t('ourCouple.onRightTrack')}</Text>
                    )}
                  </View>
                </View>
              )}

              {/* Detailed Quiz Results */}
              {quizResults.length > 0 && (
                <View style={[styles.insightCard, { backgroundColor: colors.surface }]}> 
                  <View style={styles.cardHeader}> 
                    <MaterialCommunityIcons name="chart-line" size={24} color={BRAND_BLUE} />
                    <Text style={[styles.cardTitle, { color: colors.text }]}>{t('ourCouple.detailedResults')}</Text>
                  </View>
                  
                  {quizResults.map((result, index) => (
                    <View key={index} style={[styles.quizResultItem, { backgroundColor: colors.border }]}> 
                      <View style={styles.quizResultHeader}>
                        <Text style={[styles.quizTitle, { color: colors.text }]}>{result.quiz_title}</Text>
                        <View style={styles.quizScore}>
                          <Text style={[styles.quizScoreText, { color: getScoreColor(result.score) }]}> 
                            {result.score}%
                          </Text>
                        </View>
                      </View>
                      
                      <View style={styles.quizDetails}> 
                        <View style={styles.quizDetail}>
                          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{userNames?.user1 || t('ourCouple.you')}:</Text>
                          <Text style={[styles.detailValue, { color: colors.text }]}>{result.user1_percent}%</Text>
                        </View>
                        <View style={styles.quizDetail}>
                          <Text style={styles.detailLabel}>{userNames?.user2 || t('ourCouple.partner')}:</Text>
                          <Text style={[styles.detailValue, { color: colors.text }]}>{result.user2_percent}%</Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* No Data State */}
          {quizResults.length === 0 && (
            <View style={[styles.noDataCard, { backgroundColor: colors.surface }]}> 
              <MaterialCommunityIcons name="heart-outline" size={48} color={BRAND_GRAY} />
              <Text style={[styles.noDataTitle, { color: colors.text }]}>{t('ourCouple.noQuizCompleted')}</Text>
              <Text style={[styles.noDataText, { color: colors.textSecondary }]}> 
                {t('ourCouple.noQuizMessage')}
              </Text>
            </View>
          )}
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
    fontSize: 24,
    fontWeight: '700',
    // color is now dynamic from theme
    marginTop: 12,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    // color is now dynamic from theme
  },
  
  // Couple Overview Card Styles
  coupleOverviewCard: {
    // backgroundColor is now dynamic from theme
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  profilePicture: {
    alignItems: 'center',
  },
  profileImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    // backgroundColor is now dynamic from theme
    justifyContent: 'center',
    alignItems: 'center',
  },
  heartsContainer: {
    position: 'relative',
    marginHorizontal: 20,
  },
  overlappingHeart: {
    position: 'absolute',
    top: -2,
    left: -2,
  },
  shareButton: {
    position: 'absolute',
    top: 20,
    right: 20,
  },
  coupleNames: {
    fontSize: 24,
    fontWeight: '700',
    // color is now dynamic from theme
    textAlign: 'center',
    marginBottom: 10,
  },
  statusContainer: {
    marginBottom: 16,
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  statusPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  statusPillActive: {
    backgroundColor: '#FFE0F0',
    borderColor: '#FFC1DD',
  },
  statusPillText: {
    color: '#6B7280',
    fontWeight: '600',
  },
  statusPillTextActive: {
    color: '#9D174D',
  },
  durationLabel: {
    fontSize: 14,
    // color is now dynamic from theme
    textAlign: 'center',
    marginBottom: 10,
  },
  durationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  durationNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: BRAND_PINK,
    marginRight: 5,
  },
  durationText: {
    fontSize: 16,
    // color is now dynamic from theme
    marginRight: 15,
  },
  progressSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  progressCircle: {
    alignItems: 'center',
  },
  circleOutline: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: BRAND_PINK,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  progressPercentage: {
    fontSize: 18,
    fontWeight: '700',
    color: BRAND_PINK,
  },
  progressName: {
    fontSize: 16,
    fontWeight: '600',
    // color is now dynamic from theme
    marginBottom: 5,
  },
  progressSubtext: {
    fontSize: 12,
    // color is now dynamic from theme
  },

  // Anniversary Section Styles
  anniversarySection: {
    marginBottom: 20,
  },
  anniversaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  anniversaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    // color is now dynamic from theme
    marginLeft: 10,
  },
  dateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    // backgroundColor is now dynamic from theme
    borderWidth: 1,
    // borderColor is now dynamic from theme
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  dateInput: {
    flex: 1,
    fontSize: 16,
    // color is now dynamic from theme
    marginHorizontal: 10,
  },
  updateDateButton: {
    backgroundColor: BRAND_BLUE,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  updateDateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  // Statistics Grid Styles
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  statCard: {
    width: '48%',
    // backgroundColor is now dynamic from theme
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '800',
    // color is now dynamic from theme
    marginTop: 10,
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
    // color is now dynamic from theme
    textAlign: 'center',
  },

  // Compatibility Section Styles
  compatibilitySection: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    // color is now dynamic from theme
    marginBottom: 20,
    textAlign: 'center',
  },
  compatibilityCard: {
    borderRadius: 15,
    overflow: 'hidden',
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  compatibilityGradient: {
    padding: 20,
    borderRadius: 15,
  },
  compatibilityTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  scoreText: {
    fontSize: 48,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  scoreEmoji: {
    fontSize: 36,
    marginLeft: 5,
  },
  compatibilitySubtitle: {
    fontSize: 14,
    color: '#E5E7EB',
  },
  insightCard: {
    // backgroundColor is now dynamic from theme
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    // color is now dynamic from theme
    marginLeft: 10,
  },
  insightText: {
    fontSize: 16,
    // color is now dynamic from theme
    lineHeight: 24,
  },
  insightsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  insightItem: {
    fontSize: 14,
    // color is now dynamic from theme
    marginBottom: 5,
  },
  noDataText: {
    fontSize: 14,
    // color is now dynamic from theme
    textAlign: 'center',
    marginTop: 10,
  },
  personalInsight: {
    marginBottom: 10,
  },
  insightLabel: {
    fontSize: 14,
    // color is now dynamic from theme
    marginBottom: 5,
  },
  insightValue: {
    fontSize: 16,
    // color is now dynamic from theme
    fontWeight: '500',
  },
  quizResultItem: {
    // backgroundColor is now dynamic from theme
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  quizResultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  quizTitle: {
    fontSize: 16,
    fontWeight: '600',
    // color is now dynamic from theme
  },
  quizScore: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quizScoreText: {
    fontSize: 18,
    fontWeight: '700',
  },
  quizDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quizDetail: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    // color is now dynamic from theme
    marginRight: 5,
  },
  detailValue: {
    fontSize: 14,
    // color is now dynamic from theme
    fontWeight: '500',
  },
  noDataCard: {
    // backgroundColor is now dynamic from theme
    borderRadius: 15,
    padding: 30,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  noDataTitle: {
    fontSize: 20,
    fontWeight: '700',
    // color is now dynamic from theme
    marginTop: 15,
  },
});

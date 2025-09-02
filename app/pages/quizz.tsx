import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useNotificationManager } from '../../hooks/useNotificationManager';
import { useProfileCompletion } from '../../hooks/useProfileCompletion';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import AppLayout from '../app-layout';

/*
 * SEQUENTIAL COMPATIBILITY SYSTEM:
 * 
 * This quiz page now implements a sequential compatibility system where:
 * 1. First person to answer a quiz = Their answers become the "reference/correct" answers
 * 2. Second person to answer = Their compatibility is calculated by comparing their answers to the reference
 * 3. Each quiz contributes to only ONE person's compatibility score (the second one to answer)
 * 4. This prevents duplicate calculations and gives each person unique compatibility scores
 * 
 * Database changes needed:
 * - quiz_answers table: ADD COLUMN answered_at TIMESTAMP DEFAULT NOW()
 * 
 * The "Notre couple" page will use this data to show different compatibility scores for each user.
 */

const BRAND_BLUE = "#2DB6FF";
const BRAND_PINK = "#F47CC6";
const BRAND_GRAY = "#6C6C6C";

interface Quiz {
  id: string;
  title: string;
  description: string;
  theme: {
    id: string;
    name: string;
    description: string;
  };
  questions_count: number;
  estimated_time: number;
}

interface QuizQuestion {
  id: string;
  content: string;
  ord: number;
}

interface QuizAnswer {
  question_id: string;
  answer_value: number;
}

interface QuizResult {
  score: number;
  user1_percent: number;
  user2_percent: number;
  strengths: any[];
  weaknesses: any[];
}

export default function QuizzPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { isProfileComplete, isLoading: profileLoading } = useProfileCompletion();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { sendQuizInvite } = useNotificationManager();
  
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [themes, setThemes] = useState<any[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);

  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const [isTakingQuiz, setIsTakingQuiz] = useState(false);
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [hasAnsweredQuiz, setHasAnsweredQuiz] = useState(false);
  const [previousAnswers, setPreviousAnswers] = useState<QuizAnswer[]>([]);
  const [partnerAnswers, setPartnerAnswers] = useState<QuizAnswer[]>([]);
  const [isLoadingPartnerAnswers, setIsLoadingPartnerAnswers] = useState(false);
  const [isSubmittingQuiz, setIsSubmittingQuiz] = useState(false);
  const [isCheckingResults, setIsCheckingResults] = useState(false);
  const [userNames, setUserNames] = useState<{ user1: string; user2: string } | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<any>(null);
  
  // Cache for quiz data to reduce REST requests
  const [quizCache, setQuizCache] = useState<Map<string, any>>(new Map());
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);

  // Function to check for pending quiz invites
  const checkPendingInvites = async () => {
    if (!user || !coupleId) return;
    
    try {
      const { data, error } = await supabase
        .from('quiz_invites')
        .select('*')
        .eq('receiver_id', user.id)
        .eq('status', 'pending');
      
      if (!error && data) {
        setPendingInvites(data);
      }
    } catch (error) {
      console.error('Error checking pending invites:', error);
    }
  };

  // Function to send quiz invite to partner
  const handleSendQuizInvite = async (quiz: Quiz) => {
    if (!user || !coupleId) {
      Alert.alert(t('common.error'), t('quiz.errorSendingInvite'));
      return;
    }

    setIsSendingInvite(true);
    try {
      console.log('Starting quiz invite process...');
      console.log('User ID:', user.id);
      console.log('Couple ID:', coupleId);
      
      // Get partner ID
      const { data: couple, error } = await supabase
        .from('couples')
        .select('user1_id, user2_id')
        .eq('id', coupleId)
        .single();

      console.log('Couple data:', couple);
      console.log('Couple error:', error);

      if (error || !couple) {
        throw new Error(t('questions.coupleNotFound'));
      }

      const partnerId = couple.user1_id === user.id ? couple.user2_id : couple.user1_id;
      console.log('Partner ID:', partnerId);
      
      // Send quiz invite notification
      console.log('Sending quiz invite...');
      const result = await sendQuizInvite(
        partnerId,
        quiz.title,
        t('quiz.inviteMessage'),
        quiz.id
      );

      console.log('Quiz invite result:', result);

      if (result?.error) {
        console.error('Quiz invite error:', result.error);
        Alert.alert(t('common.error'), t('quiz.errorSendingInvite'));
      } else if ('invite' in result && 'notification' in result && result.invite && result.notification) {
        Alert.alert(
          t('quiz.invitationSent'), 
          t('quiz.invitationSentMessage').replace('{title}', quiz.title)
        );
        console.log('✅ Quiz invite and notification sent successfully!');
        console.log('Invite:', result.invite);
        console.log('Notification:', result.notification);
      } else if ('invite' in result && result.invite) {
        console.warn('⚠️ Quiz invite sent but notification failed');
        console.log('Invite:', result.invite);
        console.log('Notification:', result.notification);
        Alert.alert(
          t('quiz.invitationPartial'), 
          t('quiz.invitationPartialMessage')
        );
      } else {
        console.warn('⚠️ Unexpected result format');
        console.log('Result:', result);
        Alert.alert(t('common.error'), t('common.error'));
      }
    } catch (error) {
      console.error('Error sending quiz invite:', error);
      Alert.alert(t('common.error'), t('quiz.errorSendingInviteMessage'));
    } finally {
      setIsSendingInvite(false);
    }
  };

  // Function to accept quiz invite
  const handleAcceptInvite = async (invite: any) => {
    try {
      // Update invite status to accepted
      const { error } = await supabase
        .from('quiz_invites')
        .update({ status: 'accepted' })
        .eq('id', invite.id);

      if (error) throw error;

      // Remove from pending invites
      setPendingInvites(prev => prev.filter(inv => inv.id !== invite.id));

      Alert.alert(t('common.success'), t('quiz.invitationAccepted'));
    } catch (error) {
      console.error('Error accepting invite:', error);
      Alert.alert(t('common.error'), t('quiz.errorAcceptingInvite'));
    }
  };

  // Function to decline quiz invite
  const handleDeclineInvite = async (invite: any) => {
    try {
      // Update invite status to declined
      const { error } = await supabase
        .from('quiz_invites')
        .update({ status: 'declined' })
        .eq('id', invite.id);

      if (error) throw error;

      // Remove from pending invites
      setPendingInvites(prev => prev.filter(inv => inv.id !== invite.id));

      Alert.alert(t('common.success'), t('quiz.invitationDeclined'));
    } catch (error) {
      console.error('Error declining invite:', error);
      Alert.alert(t('common.error'), t('quiz.errorDecliningInvite'));
    }
  };

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/');
    }
  }, [user, loading, router]);

  // Get couple ID when component mounts
  useEffect(() => {
    if (user) {
      getCoupleId();
    }
  }, [user]);

  // Load quizzes and themes
  useEffect(() => {
    if (user && isProfileComplete) {
      loadQuizzes();
      loadThemes();
      checkPendingInvites();
    }
  }, [user, isProfileComplete]);

  const getCoupleId = async () => {
    try {
      const { data: couple, error } = await supabase
        .from('couples')
        .select('id, user1_id, user2_id')
        .or(`user1_id.eq.${user?.id},user2_id.eq.${user?.id}`)
        .single();

      if (couple) {
        setCoupleId(couple.id);
        // Get user names
        await getUserNames(couple.user1_id, couple.user2_id);
      }
    } catch (error) {
      console.error('Error getting couple ID:', error);
    }
  };

  const getUserNames = async (user1Id: string, user2Id: string) => {
    try {
      console.log('Fetching names for users:', user1Id, user2Id);
      
      // First, let's see what fields are available in profiles
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .in('id', [user1Id, user2Id]);

      if (error) throw error;

      console.log('Profiles data:', profiles);

      if (profiles && profiles.length === 2) {
        const user1Profile = profiles.find(p => p.id === user1Id);
        const user2Profile = profiles.find(p => p.id === user2Id);
        
        // Try different possible name fields
        const user1Name = user1Profile?.first_name || user1Profile?.name || user1Profile?.username || 'Utilisateur 1';
        const user2Name = user2Profile?.first_name || user2Profile?.name || user2Profile?.username || 'Utilisateur 2';
        
        console.log('Setting user names:', { user1: user1Name, user2: user2Name });
        
        setUserNames({
          user1: user1Name,
          user2: user2Name
        });
      } else {
        console.log('Not enough profiles found:', profiles?.length);
      }
    } catch (error) {
      console.error('Error getting user names:', error);
    }
  };

  const loadQuizzes = async () => {
    try {
      const { data, error } = await supabase
        .from('quizzes')
        .select(`
          *,
          theme:quiz_themes(id, name, description),
          questions:quiz_questions(count)
        `)
        .order('title', { ascending: true });

      if (error) throw error;

      // Transform data to match our interface
      const transformedQuizzes = (data || []).map(quiz => ({
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        theme: quiz.theme,
        questions_count: quiz.questions?.length || 0,
        estimated_time: Math.ceil((quiz.questions?.length || 0) * 0.5) // Rough estimate: 30 seconds per question
      }));

      setQuizzes(transformedQuizzes);
    } catch (error) {
      console.error('Error loading quizzes:', error);
    }
  };

  const loadThemes = async () => {
    try {
      const { data, error } = await supabase
        .from('quiz_themes')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setThemes(data || []);
    } catch (error) {
      console.error('Error loading themes:', error);
    }
  };

  const startQuiz = async (quiz: Quiz) => {
    try {
      // Check cache first
      const cacheKey = `quiz_${quiz.id}`;
      const cachedData = quizCache.get(cacheKey);
      
      if (cachedData && Date.now() - cachedData.timestamp < 300000) { // 5 minutes cache
        console.log('Using cached quiz data for:', quiz.id);
        setQuizQuestions(cachedData.questions);
        setSelectedQuiz(quiz);
        setPartnerAnswers(cachedData.partnerAnswers || []);
        
        if (cachedData.userAnswers && cachedData.userAnswers.length > 0) {
          setHasAnsweredQuiz(true);
          setPreviousAnswers(cachedData.userAnswers);
          setAnswers([]);
          
          if (cachedData.partnerAnswers && cachedData.partnerAnswers.length > 0) {
            setIsTakingQuiz(false);
            await calculateAndStoreResults();
          } else {
            setIsTakingQuiz(true);
            setQuizResult(null);
          }
        } else {
          setHasAnsweredQuiz(false);
          setPreviousAnswers([]);
          setAnswers([]);
          setIsTakingQuiz(true);
          setQuizResult(null);
        }
        return;
      }

      // Load quiz questions and answers in parallel for better performance
      const [questionsResult, userAnswersResult, partnerAnswersResult] = await Promise.all([
        supabase
          .from('quiz_questions')
          .select('*')
          .eq('quiz_id', quiz.id)
          .order('ord', { ascending: true }),
        supabase
          .from('quiz_answers')
          .select('*')
          .eq('quiz_id', quiz.id)
          .eq('user_id', user?.id),
        supabase
          .from('quiz_answers')
          .select('*')
          .eq('quiz_id', quiz.id)
          .eq('couple_id', coupleId)
          .neq('user_id', user?.id)
      ]);

      if (questionsResult.error) throw questionsResult.error;
      if (userAnswersResult.error) throw userAnswersResult.error;
      if (partnerAnswersResult.error) throw partnerAnswersResult.error;

      const questions = questionsResult.data;
      const existingAnswers = userAnswersResult.data;
      const partnerAnswersData = partnerAnswersResult.data;

      // Cache the data
      setQuizCache(prev => new Map(prev.set(cacheKey, {
        questions,
        userAnswers: existingAnswers,
        partnerAnswers: partnerAnswersData,
        timestamp: Date.now()
      })));

      setQuizQuestions(questions);
      setSelectedQuiz(quiz);
      setPartnerAnswers(partnerAnswersData || []);

      if (existingAnswers && existingAnswers.length > 0) {
        // User has already answered this quiz
        setHasAnsweredQuiz(true);
        setPreviousAnswers(existingAnswers);
        setAnswers([]);
        
        if (partnerAnswersData && partnerAnswersData.length > 0) {
          // Both partners have answered - show results directly
          setIsTakingQuiz(false);
          await calculateAndStoreResults();
        } else {
          // Only user has answered - show unified view
          setIsTakingQuiz(true);
          setQuizResult(null);
        }
      } else {
        // User hasn't answered this quiz yet
        setHasAnsweredQuiz(false);
        setPreviousAnswers([]);
        setAnswers([]);
        setIsTakingQuiz(true);
        setQuizResult(null);
      }
    } catch (error) {
      console.error('Error starting quiz:', error);
      Alert.alert(t('common.error'), t('quiz.errorStartingQuiz'));
    }
  };

  const handleAnswer = (value: number, questionId: string) => {
    setAnswers(prev => {
      const existingIndex = prev.findIndex(a => a.question_id === questionId);
      if (existingIndex >= 0) {
        // Update existing answer - create new array to trigger re-render
        const newAnswers = [...prev];
        newAnswers[existingIndex] = { question_id: questionId, answer_value: value };
        return newAnswers;
      } else {
        // Add new answer
        const newAnswers = [...prev, { question_id: questionId, answer_value: value }];
        return newAnswers;
      }
    });
  };



  const submitQuiz = async () => {
    if (!user || !coupleId || !selectedQuiz) return;

    setIsSubmittingQuiz(true);

    try {
      // First, delete any existing answers for this user and quiz
      const { error: deleteError } = await supabase
        .from('quiz_answers')
        .delete()
        .eq('quiz_id', selectedQuiz.id)
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      // Save new answers with timestamp to track who answered first
      const answersToSave = answers.map(answer => ({
        question_id: answer.question_id,
        quiz_id: selectedQuiz.id,
        user_id: user.id,
        couple_id: coupleId,
        answer_value: answer.answer_value,
        answered_at: new Date().toISOString() // Add timestamp to track who answered first
      }));

      const { error: saveError } = await supabase
        .from('quiz_answers')
        .insert(answersToSave);

      if (saveError) throw saveError;

      // Show success feedback
      Alert.alert(
        t('quiz.quizSubmitted'),
        t('quiz.quizSubmittedMessage'),
        [{ text: 'OK' }]
      );

      // Update local state to show read-only view
      setHasAnsweredQuiz(true);
      setPreviousAnswers(answers);
      setAnswers([]);

      // Check if partner has also answered
      const { data: partnerAnswers, error: partnerError } = await supabase
        .from('quiz_answers')
        .select('*')
        .eq('quiz_id', selectedQuiz.id)
        .eq('couple_id', coupleId)
        .neq('user_id', user.id);

      if (partnerError) throw partnerError;

      if (partnerAnswers && partnerAnswers.length > 0) {
        // Both partners have answered, calculate results
        setPartnerAnswers(partnerAnswers);
        await calculateAndStoreResults();
      } else {
        // Only user has answered, show read-only view
        setPartnerAnswers([]);
        setIsTakingQuiz(true);
        setQuizResult(null);
      }

      // Clear cache to ensure fresh data
      if (selectedQuiz) {
        const cacheKey = `quiz_${selectedQuiz.id}`;
        setQuizCache(prev => {
          const newCache = new Map(prev);
          newCache.delete(cacheKey);
          return newCache;
        });
      }
    } catch (error) {
      console.error('Error submitting quiz:', error);
      Alert.alert(t('common.error'), t('quiz.errorSubmittingQuiz'));
    } finally {
      setIsSubmittingQuiz(false);
    }
  };

  const calculateAndStoreResults = async () => {
    if (!user || !coupleId || !selectedQuiz) return;

    try {
      // Get both users' answers
      const { data: allAnswers, error: answersError } = await supabase
        .from('quiz_answers')
        .select('*')
        .eq('quiz_id', selectedQuiz.id)
        .eq('couple_id', coupleId);

      if (answersError) throw answersError;

      if (!allAnswers || allAnswers.length === 0) return;

      // Group answers by user
      const userAnswers = allAnswers.filter(a => a.user_id === user.id);
      const partnerAnswers = allAnswers.filter(a => a.user_id !== user.id);

      if (userAnswers.length === 0 || partnerAnswers.length === 0) return;

      // Calculate compatibility
      const result = calculateCompatibility(userAnswers, partnerAnswers);

      // Store results
      const { error: storeError } = await supabase
        .from('quiz_results')
        .upsert({
          quiz_id: selectedQuiz.id,
          couple_id: coupleId,
          score: result.score,
          user1_percent: result.user1_percent,
          user2_percent: result.user2_percent,
          strengths: result.strengths,
          weaknesses: result.weaknesses
        }, { onConflict: 'quiz_id,couple_id' });

      if (storeError) throw storeError;

      setQuizResult(result);
      setIsTakingQuiz(false);
      setHasAnsweredQuiz(true);
    } catch (error) {
      console.error('Error calculating results:', error);
      Alert.alert(t('common.error'), t('quiz.errorCalculatingResults'));
    }
  };

  const calculateCompatibility = (userAnswers: any[], partnerAnswers: any[]): QuizResult => {
    let strengths: any[] = [];
    let weaknesses: any[] = [];
    let totalDifference = 0;
    let totalQuestions = 0;

    // Match answers by question
    userAnswers.forEach(userAnswer => {
      const partnerAnswer = partnerAnswers.find(p => p.question_id === userAnswer.question_id);
      if (partnerAnswer) {
        const difference = Math.abs(userAnswer.answer_value - partnerAnswer.answer_value);
        totalDifference += difference;
        totalQuestions++;

        const question = quizQuestions.find(q => q.id === userAnswer.question_id);
        if (question) {
          if (difference <= 1) {
            strengths.push({
              question: question.content,
              user_answer: userAnswer.answer_value,
              partner_answer: partnerAnswer.answer_value,
              difference
            });
          } else {
            weaknesses.push({
              question: question.content,
              user_answer: userAnswer.answer_value,
              partner_answer: partnerAnswer.answer_value,
              difference
            });
          }
        }
      }
    });

    // Calculate overall couple compatibility score
    const averageDifference = totalQuestions > 0 ? totalDifference / totalQuestions : 0;
    const compatibilityScore = Math.max(0, 100 - (averageDifference * 50)); // Scale: 0-100 for 3-scale
    
    // SEQUENTIAL COMPATIBILITY SYSTEM: Determine who answered first and calculate individual scores
    // Find the first person to answer by comparing timestamps
    const userFirstAnswer = userAnswers[0]?.answered_at;
    const partnerFirstAnswer = partnerAnswers[0]?.answered_at;
    
    let user1Percent, user2Percent;
    
    if (userFirstAnswer && partnerFirstAnswer) {
      const userAnsweredFirst = new Date(userFirstAnswer) < new Date(partnerFirstAnswer);
      
      if (userAnsweredFirst) {
        // User answered FIRST - their answers are the reference
        // User gets 0% compatibility (they are the reference)
        // Partner gets compatibility score based on how well they match user's reference answers
        user1Percent = 0; // User is reference, no compatibility score
        user2Percent = Math.max(0, 100 - (averageDifference * 50)); // Partner's compatibility
      } else {
        // Partner answered FIRST - their answers are the reference
        // Partner gets 0% compatibility (they are the reference)
        // User gets compatibility score based on how well they match partner's reference answers
        user1Percent = Math.max(0, 100 - (averageDifference * 50)); // User's compatibility
        user2Percent = 0; // Partner is reference, no compatibility score
      }
    } else {
      // Fallback if no timestamps - use alternating pattern
      // This ensures different scores for each user even without timestamps
      const quizId = userAnswers[0]?.quiz_id || 'unknown';
      const isEvenQuiz = parseInt(quizId) % 2 === 0;
      
      if (isEvenQuiz) {
        user1Percent = 0; // User is reference
        user2Percent = Math.max(0, 100 - (averageDifference * 50)); // Partner's compatibility
      } else {
        user1Percent = Math.max(0, 100 - (averageDifference * 50)); // User's compatibility
        user2Percent = 0; // Partner is reference
      }
    }

    return {
      score: Math.round(compatibilityScore),
      user1_percent: Math.round(user1Percent),
      user2_percent: Math.round(user2Percent),
      strengths,
      weaknesses
    };
  };

  const checkQuizResults = async () => {
    if (!selectedQuiz || !coupleId) return;
    
    setIsCheckingResults(true);
    
    try {
      // Check if partner has answered since last check
      const { data: partnerAnswersData, error } = await supabase
        .from('quiz_answers')
        .select('*')
        .eq('quiz_id', selectedQuiz.id)
        .eq('couple_id', coupleId)
        .neq('user_id', user?.id);

      if (error) throw error;

      if (partnerAnswersData && partnerAnswersData.length > 0) {
        // Partner has answered, calculate results
        setPartnerAnswers(partnerAnswersData);
        await calculateAndStoreResults();
      } else {
        // Partner still hasn't answered, show message
        Alert.alert(
          t('quiz.noResultsYet'),
          t('quiz.noResultsMessage'),
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error checking results:', error);
      Alert.alert(t('common.error'), t('quiz.errorCheckingResults'));
    } finally {
      setIsCheckingResults(false);
    }
  };

  const refreshResults = async () => {
    if (!selectedQuiz || !coupleId) return;
    
    setIsLoadingResults(true);
    try {
      await calculateAndStoreResults();
    } finally {
      setIsLoadingResults(false);
    }
  };

  const refreshPartnerAnswers = async () => {
    if (!selectedQuiz || !coupleId) return;
    
    setIsLoadingPartnerAnswers(true);
    try {
      // Only fetch partner answers, not the entire quiz
      const { data: partnerAnswersData, error } = await supabase
        .from('quiz_answers')
        .select('*')
        .eq('quiz_id', selectedQuiz.id)
        .eq('couple_id', coupleId)
        .neq('user_id', user?.id);

      if (error) throw error;

      setPartnerAnswers(partnerAnswersData || []);
      
      // Update cache
      const cacheKey = `quiz_${selectedQuiz.id}`;
      const cachedData = quizCache.get(cacheKey);
      if (cachedData) {
        setQuizCache(prev => new Map(prev.set(cacheKey, {
          ...cachedData,
          partnerAnswers: partnerAnswersData,
          timestamp: Date.now()
        })));
      }

      // If partner has now answered, calculate results
      if (partnerAnswersData && partnerAnswersData.length > 0 && hasAnsweredQuiz) {
        setIsTakingQuiz(false);
        await calculateAndStoreResults();
      }
    } catch (error) {
      console.error('Error refreshing partner answers:', error);
    } finally {
      setIsLoadingPartnerAnswers(false);
    }
  };

  const resetQuiz = () => {
    setSelectedQuiz(null);
    setQuizQuestions([]);
    setAnswers([]);
    setIsTakingQuiz(false);
    setQuizResult(null);
    setHasAnsweredQuiz(false);
    setPreviousAnswers([]);
    setPartnerAnswers([]);
    // Clear cache for this quiz
    if (selectedQuiz) {
      const cacheKey = `quiz_${selectedQuiz.id}`;
      setQuizCache(prev => {
        const newCache = new Map(prev);
        newCache.delete(cacheKey);
        return newCache;
      });
    }
  };

  const selectTheme = (theme: any) => {
    setSelectedTheme(theme);
  };

  const resetTheme = () => {
    setSelectedTheme(null);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadQuizzes(), loadThemes()]);
    setRefreshing(false);
  };

  // Show loading while checking auth or profile completion
  if (loading || profileLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={BRAND_BLUE} />
        <Text style={styles.loadingText}>{t('quiz.loading')}</Text>
      </View>
    );
  }

  // Don't render if not authenticated or profile not completed
  if (!user || !isProfileComplete) {
    return null;
  }

  // Quiz taking screen or results display
  if ((isTakingQuiz || quizResult) && selectedQuiz && quizQuestions.length > 0) {
    const allQuestionsAnswered = answers.length === quizQuestions.length;

  return (
    <AppLayout>
        <View style={styles.quizContainer}>
          {/* Header */}
          <View style={styles.quizHeader}>
            <Pressable onPress={resetQuiz} style={styles.backButton}>
              <MaterialCommunityIcons name="chevron-left" size={24} color="#2D2D2D" />
            </Pressable>
            <View style={styles.quizTitleContainer}>
              <Text style={styles.quizTitle}>{selectedQuiz.title}</Text>
              {pendingInvites.length > 0 && (
                <View style={styles.quizNotificationBadge}>
                  <MaterialCommunityIcons name="bell" size={16} color="#FFFFFF" />
                  <Text style={styles.quizNotificationBadgeText}>{pendingInvites.length}</Text>
                </View>
              )}
            </View>
            <View style={{ width: 24 }} />
          </View>

          {quizResult ? (
            // Show compatibility results (both partners have answered)
            <ScrollView style={styles.resultsScroll} showsVerticalScrollIndicator={false}>
              {/* Congratulations */}
              <View style={styles.congratulationsContainer}>
                <Text style={styles.congratulationsText}>{t('quiz.congratulations')}</Text>
                <Text style={styles.congratulationsSubtext}>{t('quiz.quizCompleted')}</Text>
              </View>

              {/* Quiz Completion Invite Section */}
              <View style={styles.completionInviteSection}>
                <Text style={styles.completionInviteTitle}>{t('quiz.shareQuiz')}</Text>
                <Text style={styles.completionInviteDescription}>
                  {t('quiz.shareDescription')}
                </Text>
                
                <Pressable
                  style={({ pressed }) => [
                    styles.completionInviteButton,
                    pressed && { opacity: 0.7, transform: [{ scale: 0.95 }] }
                  ]}
                  onPress={() => handleSendQuizInvite(selectedQuiz!)}
                  disabled={isSendingInvite}
                >
                  <LinearGradient
                    colors={[BRAND_BLUE, BRAND_PINK]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.completionInviteButtonGradient}
                  >
                    <MaterialCommunityIcons
                      name="heart"
                      size={20}
                      color="#FFFFFF"
                      style={{ marginRight: 8 }}
                    />
                    <Text style={styles.completionInviteButtonText}>
                      {isSendingInvite ? t('quiz.sendingInvite') : t('quiz.invitePartnerQuiz')}
                    </Text>
                  </LinearGradient>
                </Pressable>
              </View>

              {/* Compatibility Score */}
              <View style={styles.scoreContainer}>
                <View style={styles.scoreCircle}>
                  <Text style={styles.scoreText}>{quizResult.score}%</Text>
                </View>
                <Text style={styles.scoreLabel}>{t('quiz.globalCompatibility')}</Text>
                <Text style={styles.scoreSubtext}>
                  {quizResult.score >= 80 ? t('quiz.excellentScore') : 
                   quizResult.score >= 60 ? t('quiz.goodScore') : t('quiz.needsImprovement')}
                </Text>
              </View>

              {/* Refresh Button */}
              <Pressable
                onPress={refreshResults}
                disabled={isLoadingResults}
                style={styles.refreshButton}
              >
                <LinearGradient
                  colors={[BRAND_BLUE, BRAND_PINK]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.refreshButtonGradient}
                >
                  <MaterialCommunityIcons 
                    name="refresh" 
                    size={20} 
                    color="#FFFFFF" 
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.refreshButtonText}>
                    {isLoadingResults ? t('quiz.refreshing') : t('quiz.refreshResults')}
                  </Text>
                </LinearGradient>
              </Pressable>

              {/* Your Responses Section */}
              <View style={styles.yourResponsesSection}>
                <Text style={styles.sectionTitle}>{t('quiz.yourResponses')}</Text>
                <Text style={styles.responsesDescription}>
                  {t('quiz.responsesDescription')}
                </Text>
              </View>

              {/* Detailed Results */}
              <View style={styles.detailedResultsContainer}>
                <Text style={styles.detailedResultsTitle}>{t('quiz.detailedResults')}</Text>
                
                {/* Strengths */}
                {quizResult.strengths.length > 0 && (
                  <View style={styles.resultsSection}>
                    <Text style={styles.sectionTitle}>{t('quiz.strengths')}</Text>
                    {quizResult.strengths.map((strength, index) => (
                      <View key={index} style={styles.resultItem}>
                        <View style={styles.strengthBadge}>
                          <Text style={styles.strengthBadgeText}>{t('quiz.strengthBadge')}</Text>
                        </View>
                        <Text style={styles.resultQuestion}>{strength.question}</Text>
                        <View style={styles.partnerResponses}>
                          <View style={styles.partnerResponse}>
                            <Text style={styles.partnerName}>
                              {userNames?.user1
                                ? userNames.user1.split(' ')[0]
                                : t('quiz.user1')}
                            </Text>
                            <View style={styles.heartResponse}>
                              {[1, 2, 3].map((value) => (
                                <MaterialCommunityIcons
                                  key={value}
                                  name="heart"
                                  size={20}
                                  color={strength.user_answer === value ? BRAND_PINK : "#E0E0E0"}
                                  style={styles.responseHeart}
                                />
                              ))}
                            </View>
                          </View>
                          <View style={styles.partnerResponse}>
                                                     <Text style={styles.partnerName}>
                               {userNames?.user2
                                 ? userNames.user2.split(' ')[0]
                                 : t('quiz.user2')}
                             </Text>
                            <View style={styles.heartResponse}>
                              {[1, 2, 3].map((value) => (
                                <MaterialCommunityIcons
                                  key={value}
                                  name="heart"
                                  size={20}
                                  color={strength.partner_answer === value ? BRAND_PINK : "#E0E0E0"}
                                  style={styles.responseHeart}
                                />
                              ))}
                            </View>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {/* Weaknesses */}
                {quizResult.weaknesses.length > 0 && (
                  <View style={styles.resultsSection}>
                    <Text style={styles.sectionTitle}>{t('quiz.weaknesses')}</Text>
                    {quizResult.weaknesses.map((weakness, index) => (
                      <View key={index} style={styles.resultItem}>
                        <View style={styles.weaknessBadge}>
                          <Text style={styles.weaknessBadgeText}>{t('quiz.weaknessBadge')}</Text>
                        </View>
                        <Text style={styles.resultQuestion}>{weakness.question}</Text>
                        <View style={styles.partnerResponses}>
                          <View style={styles.partnerResponse}>
                            <Text style={styles.partnerName}>{userNames?.user1 || t('quiz.user1')}</Text>
                            <View style={styles.heartResponse}>
                              {[1, 2, 3].map((value) => (
                                <MaterialCommunityIcons
                                  name="heart"
                                  size={20}
                                  color={weakness.user_answer === value ? BRAND_PINK : "#E0E0E0"}
                                  style={styles.responseHeart}
                                />
                              ))}
                            </View>
                          </View>
                          <View style={styles.partnerResponse}>
                            <Text style={styles.partnerName}>{userNames?.user2 || t('quiz.user2')}</Text>
                            <View style={styles.heartResponse}>
                              {[1, 2, 3].map((value) => (
                                <MaterialCommunityIcons
                                  name="heart"
                                  size={20}
                                  color={weakness.partner_answer === value ? BRAND_PINK : "#E0E0E0"}
                                  style={styles.responseHeart}
                                />
                              ))}
                            </View>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              {/* Quiz Results Summary */}
              <View style={styles.quizResultsSummary}>
                <Text style={styles.sectionTitle}>{t('quiz.quizResults')}</Text>
                <Text style={styles.summaryText}>
                  {t('quiz.quizResultsDescription').replace('{title}', selectedQuiz?.title || '')}
                </Text>
              </View>

              {/* Quiz Invite Section */}
              <View style={styles.quizInviteSection}>
                <Text style={styles.sectionTitle}>{t('quiz.invitePartner')}</Text>
                <Text style={styles.inviteDescription}>
                  {t('quiz.inviteDescription')}
                </Text>
                
                <Pressable
                  style={({ pressed }) => [
                    styles.invitePartnerButton,
                    pressed && { opacity: 0.7, transform: [{ scale: 0.95 }] }
                  ]}
                  onPress={() => handleSendQuizInvite(selectedQuiz!)}
                  disabled={isSendingInvite}
                >
                  <LinearGradient
                    colors={[BRAND_BLUE, BRAND_PINK]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.invitePartnerButtonGradient}
                  >
                    <MaterialCommunityIcons
                      name="heart"
                      size={20}
                      color="#FFFFFF"
                      style={{ marginRight: 8 }}
                    />
                    <Text style={styles.invitePartnerButtonText}>
                      {isSendingInvite ? t('quiz.sendingInvite') : t('quiz.invitePartnerQuiz')}
                    </Text>
                  </LinearGradient>
                </Pressable>
              </View>
            </ScrollView>
          ) : hasAnsweredQuiz ? (
            // Show previous answers (read-only) - only user has answered
            <>
              <View style={styles.alreadyAnsweredHeader}>
                <MaterialCommunityIcons name="check-circle" size={24} color="#4CAF50" />
                <Text style={styles.alreadyAnsweredText}>
                  {t('quiz.alreadyAnswered')}
                </Text>
              </View>

              <ScrollView style={styles.questionsScroll} showsVerticalScrollIndicator={false}>
                {quizQuestions.map((question, index) => {
                  const previousAnswer = previousAnswers.find(a => a.question_id === question.id);
                  
                  return (
                    <View key={question.id} style={styles.questionItem}>
                      <Text style={styles.questionNumber}>Question {index + 1}</Text>
                      <Text style={styles.questionText}>{question.content}</Text>
                      
                      {/* Show Previous Answer (Read-only) */}
                      <View style={styles.previousAnswerContainer}>
                        <Text style={styles.previousAnswerLabel}>{t('quiz.previousAnswer')}</Text>
                        <View style={styles.answerOptions}>
                          {[1, 2, 3].map((value) => (
                            <View
                              key={value}
                              style={[
                                styles.answerOption,
                                previousAnswer?.answer_value === value && styles.answerOptionSelected,
                                styles.answerOptionReadOnly
                              ]}
                            >
                              <MaterialCommunityIcons
                                name="heart"
                                size={24}
                                color={previousAnswer?.answer_value === value ? "#FFFFFF" : BRAND_PINK}
                                style={[
                                  styles.heartIcon,
                                  { opacity: value === 1 ? 0.3 : value === 2 ? 0.7 : 1 }
                                ]}
                              />
                            </View>
                          ))}
                        </View>
                      </View>
                    </View>
                  )                })}
              </ScrollView>

              {/* Verification Buttons Container */}
              <View style={styles.verificationButtonsContainer}>
                {/* Check Results Button */}
                <View style={styles.smallButtonContainer}>
                  <Pressable
                    onPress={checkQuizResults}
                    disabled={isCheckingResults}
                    style={[
                      styles.checkResultsButton,
                      isCheckingResults && styles.submitButtonDisabled
                    ]}
                  >
                    <LinearGradient
                      colors={isCheckingResults ? [BRAND_GRAY, BRAND_GRAY] : [BRAND_BLUE, BRAND_PINK]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.checkResultsButtonGradient}
                    >
                      {isCheckingResults ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <ActivityIndicator color="#FFFFFF" size="small" style={{ marginRight: 8 }} />
                          <Text style={styles.checkResultsButtonText}>
                            {t('quiz.checking')}
                          </Text>
                        </View>
                      ) : (
                        <Text style={styles.checkResultsButtonText}>
                          {t('quiz.checkResults')}
                        </Text>
                      )}
                    </LinearGradient>
                  </Pressable>
                </View>

                {/* Refresh Partner Answers Button */}
                <View style={styles.smallButtonContainer}>
                  <Pressable
                    onPress={refreshPartnerAnswers}
                    disabled={isLoadingPartnerAnswers}
                    style={styles.refreshButton}
                  >
                    {/* <LinearGradient
                      colors={[BRAND_BLUE, BRAND_PINK]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.refreshButtonGradient}
                    >
                      {isLoadingPartnerAnswers ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <ActivityIndicator color="#FFFFFF" size="small" style={{ marginRight: 8 }} />
                          <Text style={styles.checkResultsButtonText}>
                            Vérification...
                          </Text>
                        </View>
                      ) : (
                        <>
                          <MaterialCommunityIcons 
                            name="refresh" 
                            size={20} 
                            color="#FFFFFF" 
                            style={{ marginRight: 8 }}
                          />
                          <Text style={styles.checkResultsButtonText}>
                            Vérifier si le partenaire a répondu
                          </Text>
                        </>
                      )}
                    </LinearGradient> */}
                  </Pressable>
                </View>
              </View>
            </>
          ) : (
            // Show quiz taking interface - COMPLETELY REBUILT
            <View style={styles.quizAnswerContainer}>
              {/* Progress Indicator */}
              <View style={styles.progressContainer}>
                <Text style={[styles.progressText, { color: colors.textSecondary }]}>
                  {answers.length} / {quizQuestions.length} {t('quiz.questionsAnswered')}
                </Text>
                <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                  <View 
                    style={[
                      styles.progressFill, 
                      { width: `${(answers.length / quizQuestions.length) * 100}%` }
                    ]} 
                  />
                </View>
              </View>

              {/* Questions Container - Takes most space */}
              <View style={styles.questionsContainer}>
                <ScrollView 
                  style={styles.questionsScroll} 
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.questionsScrollContent}
                >
                  {quizQuestions.map((question, index) => {
                    const questionAnswer = answers.find(a => a.question_id === question.id);
                    
                    return (
                      <View key={question.id} style={[styles.questionItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <Text style={[styles.questionNumber, { color: colors.textSecondary }]}>Question {index + 1}</Text>
                        <Text style={[styles.questionText, { color: colors.text }]}>{question.content}</Text>
                        
                        {/* Answer Options with Progressive Heart Visibility */}
                        <View style={styles.answerOptions}>
                          {[1, 2, 3].map((value) => (
                            <Pressable
                              key={value}
                              onPress={() => handleAnswer(value, question.id)}
                              style={[
                                styles.answerOption,
                                questionAnswer?.answer_value === value && styles.answerOptionSelected
                              ]}
                            >
                              <MaterialCommunityIcons
                                name="heart"
                                size={24}
                                color={questionAnswer?.answer_value === value ? "#FFFFFF" : BRAND_PINK}
                                style={[
                                  styles.heartIcon,
                                  { opacity: value === 1 ? 0.3 : value === 2 ? 0.7 : 1 }
                                ]}
                              />
                            </Pressable>
                          ))}
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Quiz Taking Invite Section */}
              <View style={styles.quizTakingInviteSection}>
                <Text style={styles.quizTakingInviteTitle}>{t('quiz.invitePartner')}</Text>
                <Text style={styles.quizTakingInviteDescription}>
                  {t('quiz.whileTaking')}
                </Text>
                
                <Pressable
                  style={({ pressed }) => [
                    styles.quizTakingInviteButton,
                    pressed && { opacity: 0.7, transform: [{ scale: 0.95 }] }
                  ]}
                  onPress={() => handleSendQuizInvite(selectedQuiz!)}
                  disabled={isSendingInvite}
                >
                  <LinearGradient
                    colors={[BRAND_BLUE, BRAND_PINK]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.quizTakingInviteButtonGradient}
                  >
                    <MaterialCommunityIcons
                      name="heart"
                      size={20}
                      color="#FFFFFF"
                      style={{ marginRight: 8 }}
                    />
                    <Text style={styles.quizTakingInviteButtonText}>
                      {isSendingInvite ? t('quiz.sendingInvite') : t('quiz.invitePartnerQuiz')}
                    </Text>
                  </LinearGradient>
                </Pressable>
              </View>

              {/* Submit Button - Fixed at bottom */}
              <View style={[styles.submitButtonContainer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
                <Pressable
                  onPress={submitQuiz}
                  disabled={!allQuestionsAnswered || isSubmittingQuiz}
                  style={[
                    styles.submitButton,
                    (!allQuestionsAnswered || isSubmittingQuiz) && styles.submitButtonDisabled
                  ]}
                >
                  <LinearGradient
                    colors={allQuestionsAnswered && !isSubmittingQuiz ? [BRAND_BLUE, BRAND_PINK] : [BRAND_GRAY, BRAND_GRAY]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.submitButtonGradient}
                  >
                    {isSubmittingQuiz ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <ActivityIndicator color="#FFFFFF" size="small" style={{ marginRight: 8 }} />
                        <Text style={styles.submitButtonText}>
                          {t('quiz.sending')}
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.submitButtonText}>
                        {t('quiz.submitQuiz')}
                      </Text>
                    )}
                  </LinearGradient>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </AppLayout>
    );
  }

  // Results screen
  if (quizResult && selectedQuiz) {
    return (
      <AppLayout>
        <View style={[styles.resultsContainer, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={[styles.quizHeader, { borderBottomColor: colors.border }]}>
            <Pressable onPress={resetQuiz} style={styles.backButton}>
              <MaterialCommunityIcons name="chevron-left" size={24} color={colors.text} />
            </Pressable>
            <Text style={[styles.quizTitle, { color: colors.text }]}>{t('quiz.title')}</Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Results Content */}
          <ScrollView style={styles.resultsScroll} showsVerticalScrollIndicator={false}>
            {/* Congratulations */}
            <View style={styles.congratulationsContainer}>
              <Text style={[styles.congratulationsText, { color: colors.text }]}>{t('quiz.congratulations')}</Text>
              <Text style={[styles.congratulationsSubtext, { color: colors.textSecondary }]}>{t('quiz.quizCompleted')}</Text>
            </View>

            {/* Compatibility Score */}
            <View style={styles.scoreContainer}>
              <View style={styles.scoreCircle}>
                <Text style={styles.scoreText}>{quizResult.score}%</Text>
              </View>
              <Text style={[styles.scoreLabel, { color: colors.text }]}>{t('quiz.globalCompatibility')}</Text>
              <Text style={[styles.scoreSubtext, { color: colors.textSecondary }]}>
                {quizResult.score >= 80 ? t('quiz.excellentScore') : 
                 quizResult.score >= 60 ? t('quiz.goodScore') : t('quiz.needsImprovement')}
              </Text>
            </View>

            {/* Refresh Button */}
            <Pressable
              onPress={refreshResults}
              disabled={isLoadingResults}
              style={styles.refreshButton}
            >
              <LinearGradient
                colors={[BRAND_BLUE, BRAND_PINK]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.refreshButtonGradient}
              >
                <MaterialCommunityIcons 
                  name="refresh" 
                  size={20} 
                  color="#FFFFFF" 
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.refreshButtonText}>
                  {isLoadingResults ? t('quiz.refreshing') : t('quiz.refreshResults')}
                </Text>
              </LinearGradient>
            </Pressable>

            {/* Your Responses Section */}
            <View style={styles.yourResponsesSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('quiz.yourResponses')}</Text>
              <Text style={[styles.responsesDescription, { color: colors.textSecondary }]}>
                {t('quiz.responsesDescription')}
              </Text>
            </View>

            {/* Detailed Results */}
            <View style={styles.detailedResultsContainer}>
              <Text style={[styles.detailedResultsTitle, { color: colors.text }]}>{t('quiz.detailedResults')}</Text>
              
              {/* Strengths */}
              {quizResult.strengths.length > 0 && (
                <View style={styles.resultsSection}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('quiz.strengths')}</Text>
                  {quizResult.strengths.map((strength, index) => (
                    <View key={index} style={[styles.resultItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <View style={styles.strengthBadge}>
                        <Text style={styles.strengthBadgeText}>{t('quiz.strengthBadge')}</Text>
                      </View>
                      <Text style={[styles.resultQuestion, { color: colors.text }]}>{strength.question}</Text>
                      <View style={styles.partnerResponses}>
                        <View style={styles.partnerResponse}>
                          <Text style={[styles.partnerName, { color: colors.text }]}>{userNames?.user1 || t('quiz.user1')}</Text>
                          <View style={styles.heartResponse}>
                            {[1, 2, 3].map((value) => (
                              <MaterialCommunityIcons
                                key={value}
                                name="heart"
                                size={20}
                                color={strength.user_answer === value ? BRAND_PINK : colors.textSecondary}
                                style={styles.responseHeart}
                              />
                            ))}
                          </View>
                        </View>
                        <View style={styles.partnerResponse}>
                          <Text style={[styles.partnerName, { color: colors.text }]}>{userNames?.user2 || t('quiz.user2')}</Text>
                          <View style={styles.heartResponse}>
                            {[1, 2, 3].map((value) => (
                              <MaterialCommunityIcons
                                name="heart"
                                size={20}
                                color={strength.partner_answer === value ? BRAND_PINK : colors.textSecondary}
                                style={styles.responseHeart}
                              />
                            ))}
                          </View>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Weaknesses */}
              {quizResult.weaknesses.length > 0 && (
                <View style={styles.resultsSection}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('quiz.weaknesses')}</Text>
                  {quizResult.weaknesses.map((weakness, index) => (
                    <View key={index} style={[styles.resultItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <View style={styles.weaknessBadge}>
                        <Text style={styles.weaknessBadgeText}>{t('quiz.weaknessBadge')}</Text>
                      </View>
                      <Text style={[styles.resultQuestion, { color: colors.text }]}>{weakness.question}</Text>
                      <View style={styles.partnerResponses}>
                        <View style={styles.partnerResponse}>
                          <Text style={[styles.partnerName, { color: colors.text }]}>{userNames?.user1 || t('quiz.user1')}</Text>
                          <View style={styles.heartResponse}>
                            {[1, 2, 3].map((value) => (
                              <MaterialCommunityIcons
                                name="heart"
                                size={20}
                                color={weakness.user_answer === value ? BRAND_PINK : colors.textSecondary}
                                style={styles.responseHeart}
                              />
                            ))}
                          </View>
                        </View>
                        <View style={styles.partnerResponse}>
                          <Text style={[styles.partnerName, { color: colors.text }]}>{userNames?.user2 || t('quiz.user2')}</Text>
                          <View style={styles.heartResponse}>
                            {[1, 2, 3].map((value) => (
                              <MaterialCommunityIcons
                                name="heart"
                                size={20}
                                color={weakness.partner_answer === value ? BRAND_PINK : colors.textSecondary}
                                style={styles.responseHeart}
                              />
                            ))}
                          </View>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Quiz Results Summary */}
            <View style={styles.quizResultsSummary}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('quiz.quizResults')}</Text>
              <Text style={[styles.summaryText, { color: colors.textSecondary }]}>
                {t('quiz.quizResultsDescription').replace('{title}', selectedQuiz?.title || '')}
              </Text>
            </View>
          </ScrollView>
        </View>
      </AppLayout>
    );
  }

  // Theme-specific view
  if (selectedTheme) {
    const themeQuizzes = quizzes.filter(quiz => quiz.theme.id === selectedTheme.id);
    
    return (
      <AppLayout>
        <View style={[styles.themeContainer, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={[styles.themeHeader, { borderBottomColor: colors.border }]}>
            <Pressable onPress={resetTheme} style={styles.backButton}>
              <MaterialCommunityIcons name="chevron-left" size={24} color={colors.text} />
            </Pressable>
            <Text style={[styles.themeTitle, { color: colors.text }]}>{selectedTheme.name}</Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Theme Description */}
          <View style={[styles.themeDescriptionContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.themeDescription, { color: colors.textSecondary }]}>{selectedTheme.description}</Text>
          </View>

          {/* Quizzes for this theme */}
          <ScrollView style={styles.themeQuizzesScroll} showsVerticalScrollIndicator={false}>
            {themeQuizzes.length > 0 ? (
              themeQuizzes.map((quiz) => (
                <Pressable
                  key={quiz.id}
                  style={[styles.quizCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => startQuiz(quiz)}
                >
                  <View style={styles.quizCardContent}>
                    <View style={[styles.quizThumbnail, { backgroundColor: colors.surface }]}>
                      <MaterialCommunityIcons
                        name="help-circle-outline"
                        size={40}
                        color={colors.textSecondary}
                      />
                    </View>
                    <View style={styles.quizInfo}>
                      <Text style={[styles.quizCardTitle, { color: colors.text }]}>{quiz.title}</Text>
                      <Text style={[styles.quizCardDetails, { color: colors.textSecondary }]}>
                        {quiz.questions_count} {t('quiz.questions')} • {quiz.estimated_time} {t('quiz.minutes')}
                      </Text>
                    </View>
                    <MaterialCommunityIcons
                      name="chevron-right"
                      size={24}
                      color={colors.textSecondary}
                    />
                  </View>
                </Pressable>
              ))
            ) : (
              <View style={styles.noQuizzesContainer}>
                <MaterialCommunityIcons
                  name="help-circle-outline"
                  size={48}
                  color={colors.textSecondary}
                />
                <Text style={[styles.noQuizzesText, { color: colors.textSecondary }]}>{t('quiz.noQuizzesTheme')}</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </AppLayout>
    );
  }

  // Main quiz listing screen
  return (
    <AppLayout>
      <ScrollView 
        style={[styles.container, { backgroundColor: colors.background }]} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{t('quiz.title')}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t('quiz.subtitle')}</Text>
          <Pressable style={styles.searchButton}>
            <MaterialCommunityIcons name="magnify" size={24} color={colors.textSecondary} />
          </Pressable>
      </View>

        {/* Pending Quiz Invites */}
        {pendingInvites.length > 0 && (
          <View style={styles.pendingInvitesSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t('quiz.pendingInvites')} ({pendingInvites.length})
            </Text>
            {pendingInvites.map((invite) => (
              <View key={invite.id} style={[styles.pendingInviteCard, { backgroundColor: colors.surface }]}>
                <View style={styles.pendingInviteContent}>
                  <MaterialCommunityIcons
                    name="heart"
                    size={24}
                    color={colors.primary}
                  />
                  <View style={styles.pendingInviteInfo}>
                    <Text style={[styles.pendingInviteTitle, { color: colors.text }]}>
                      {t('quiz.quizInvitation')}
                    </Text>
                    <Text style={[styles.pendingInviteMessage, { color: colors.textSecondary }]}>
                      {invite.message || t('quiz.inviteMessage')}
                    </Text>
                  </View>
                </View>
                <View style={styles.pendingInviteActions}>
                  <Pressable
                    style={[styles.acceptInviteButton, { backgroundColor: colors.success }]}
                    onPress={() => handleAcceptInvite(invite)}
                  >
                    <Text style={[styles.acceptInviteButtonText, { color: colors.surface }]}>
                      {t('quiz.accept')}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[styles.declineInviteButton, { backgroundColor: colors.error }]}
                    onPress={() => handleDeclineInvite(invite)}
                  >
                    <Text style={[styles.declineInviteButtonText, { color: colors.surface }]}>
                      {t('quiz.decline')}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Themes */}
        <View style={styles.themesSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('quiz.themes')}</Text>
          {themes.length > 0 ? (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.themesScrollContent}
              style={styles.themesScroll}
            >
              {themes.map((theme, index) => {
                // Generate different colors for each theme
                const colors: [string, string][] = [
                  [BRAND_PINK, '#E91E63'],
                  [BRAND_BLUE, '#2196F3'],
                  ['#FF9800', '#F57C00'],
                  ['#9C27B0', '#7B1FA2'],
                  ['#4CAF50', '#388E3C'],
                  ['#FF5722', '#D84315']
                ];
                
                const themeColors = colors[index % colors.length];
                const iconNames = ['heart', 'view-grid', 'star', 'lightbulb', 'flower', 'music'];
                const iconName = iconNames[index % iconNames.length];
                
                return (
                  <Pressable
                    key={theme.id}
                    style={styles.themeCard}
                    onPress={() => selectTheme(theme)}
                  >
                    <LinearGradient
                      colors={themeColors}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.themeCardGradient}
                    >
                      <MaterialCommunityIcons
                        name={iconName as any}
                        size={32}
                        color="#FFFFFF"
                        style={styles.themeIcon}
                      />
                      <Text style={styles.themeTitle}>{theme.name}</Text>
                    </LinearGradient>
                  </Pressable>
                );
              })}



              
            </ScrollView>
          ) : (
            <View style={styles.noThemesContainer}>
              <MaterialCommunityIcons
                name="help-circle-outline"
                size={48}
                color={colors.textSecondary}
              />
              <Text style={[styles.noThemesText, { color: colors.textSecondary }]}>{t('quiz.noThemes')}</Text>
            </View>
          )}
        </View>

        {/* Quizzes for You Section */}
        <View style={styles.quizzesSection}>
          <View style={styles.quizzesHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('quiz.quizzesForYou')}</Text>
            <Text style={[styles.quizzesSubtitle, { color: colors.textSecondary }]}>
              {t('quiz.quizzesSubtitle')}
            </Text>
          </View>
          {quizzes.length > 0 ? (
            quizzes.map((quiz) => (
              <View
                key={quiz.id}
                style={[styles.quizCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <Pressable
                  style={styles.quizCardContent}
                  onPress={() => startQuiz(quiz)}
                >
                  <View style={[styles.quizThumbnail, { backgroundColor: colors.surface }]}>
                    <MaterialCommunityIcons
                      name="help-circle-outline"
                      size={40}
                      color={colors.textSecondary}
                    />
                  </View>
                  <View style={styles.quizInfo}>
                    <Text style={[styles.quizCardTitle, { color: colors.text }]}>{quiz.title}</Text>
                    <Text style={[styles.quizCardDetails, { color: colors.textSecondary }]}>
                      {quiz.questions_count} {t('quiz.questions')} • {quiz.estimated_time} {t('quiz.minutes')}
                    </Text>
                  </View>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={24}
                    color={colors.textSecondary}
                  />
                </Pressable>
                
                {/* Quiz Invite Button */}
              
              </View>
            ))
          ) : (
            <View style={styles.noQuizzesContainer}>
              <MaterialCommunityIcons
                name="help-circle-outline"
                size={48}
                color={colors.textSecondary}
              />
              <Text style={[styles.noQuizzesText, { color: colors.textSecondary }]}>{t('quiz.noQuizzes')}</Text>
            </View>
          )}
        </View>

        {/* Partner Invitation */}
      
      </ScrollView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2D2D2D',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: BRAND_GRAY,
    textAlign: 'center',
    marginBottom: 16,
  },
  searchButton: {
    position: 'absolute',
    right: 20,
    top: 20,
    padding: 8,
  },
  themesSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2D2D2D',
    marginBottom: 16,
  },
  themesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  themesScroll: {
    marginHorizontal: -20, // Negative margin to allow full-width scrolling
  },
  themesScrollContent: {
    paddingHorizontal: 20, // Add padding back to content
    gap: 12,
    paddingRight: 32, // Extra padding on the right for better scroll feel
  },
  themeCard: {
    width: 160, // Fixed width for horizontal scrolling
    height: 120,
    borderRadius: 16,
    overflow: 'hidden',
    marginRight: 12, // Use marginRight instead of marginBottom for horizontal layout
  },
  themeCardGradient: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  themeIcon: {
    alignSelf: 'flex-start',
  },
  themeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'left',
  },
  quizzesSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  quizCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  quizCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  quizThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  quizInfo: {
    flex: 1,
  },
  quizCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D2D2D',
    marginBottom: 4,
  },
  quizCardDetails: {
    fontSize: 14,
    color: BRAND_GRAY,
  },
  invitationSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  invitationCard: {
    backgroundColor: '#E8EAF6',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  invitationIcon: {
    marginBottom: 12,
  },
  invitationContent: {
    alignItems: 'center',
    marginBottom: 16,
  },
  invitationTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D2D2D',
    marginBottom: 8,
  },
  invitationSubtext: {
    fontSize: 14,
    color: BRAND_GRAY,
    textAlign: 'center',
    lineHeight: 20,
  },
  invitationButton: {
    backgroundColor: BRAND_PINK,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  invitationButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Quiz taking styles
  quizContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
  },
  quizHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 20,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  quizTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2D2D2D',
  },
  progressContainer: {
    marginBottom: 24,
  },
  progressText: {
    fontSize: 14,
    color: BRAND_GRAY,
    marginBottom: 8,
    textAlign: 'center',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#F0F0F0',
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: BRAND_BLUE,
    borderRadius: 2,
  },
  questionsScroll: {
    flex: 1,
    height: '100%',
    marginBottom: 0, // Remove margin to allow questions to take more space
  },
  questionItem: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  questionNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: BRAND_BLUE,
    marginBottom: 8,
  },
  submitContainer: {
    paddingBottom: 32,
   
  },
  smallButtonContainer: {
    flex: 1,
    paddingBottom: 16,
    
  
    
  },
  verificationButtonsContainer: {
  
    
    height: 100,
   

  },
  submitButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonGradient: {
    paddingVertical: 12, // Reduced from 16 to make button smaller
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  alreadyAnsweredHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F5E8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  alreadyAnsweredText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D2D2D',
  },
  previousAnswerContainer: {
    marginTop: 16,
  },
  previousAnswerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: BRAND_GRAY,
    marginBottom: 12,
  },
  answerOptionReadOnly: {
    // Read-only styling - no pointer events
  },
  checkResultsButton: {
    
    borderRadius: 12,
    overflow: 'hidden',

  },
  checkResultsButtonGradient: {
    paddingVertical: 31,
    alignItems: 'center',
  },
  checkResultsButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  mainQuestionCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 24,
    marginBottom: 32,
    minHeight: 120,
    justifyContent: 'center',
    marginTop: 20,
  },
  mainQuestionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D2D2D',
    textAlign: 'center',
    lineHeight: 26,
  },
  questionCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 24,
    marginBottom: 32,
    minHeight: 120,
    justifyContent: 'center',
  },
  questionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D2D2D',
    textAlign: 'center',
    lineHeight: 26,
  },
  answerContainer: {
    marginBottom: 32,
  },
  answerLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D2D2D',
    marginBottom: 16,
    textAlign: 'center',
  },
  answerOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  answerOption: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E5E5',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 8,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  answerOptionSelected: {
    borderColor: BRAND_BLUE,
    backgroundColor: BRAND_BLUE,
  },
  answerText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#2D2D2D',
    textAlign: 'center',
  },
  answerTextSelected: {
    color: '#FFFFFF',
  },
  heartIcon: {
    // Heart icon styling
  },
  callToActionContainer: {
    marginTop: 'auto',
    paddingBottom: 32,
    alignItems: 'center',
  },
  callToActionText: {
    fontSize: 16,
    color: BRAND_GRAY,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  inviteButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  inviteButtonDisabled: {
    opacity: 0.5,
  },
  inviteButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  inviteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  quizNavigation: {
    marginTop: 'auto',
    paddingBottom: 32,
  },
  nextButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  // Results styles
  resultsContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  resultsScroll: {
    flex: 1,
    paddingHorizontal: 20,
  },
  congratulationsContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 24,
  },
  congratulationsText: {
    fontSize: 24,
    fontWeight: '700',
    color: BRAND_PINK,
    marginBottom: 8,
  },
  congratulationsSubtext: {
    fontSize: 16,
    color: BRAND_GRAY,
  },
  scoreContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  scoreCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: BRAND_PINK,
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
    fontSize: 16,
    color: BRAND_GRAY,
  },
  refreshButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
  },
  refreshButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  refreshButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  detailedResultsContainer: {
    marginBottom: 24,
  },
  detailedResultsTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2D2D2D',
    marginBottom: 16,
  },
  resultsSection: {
    marginBottom: 24,
  },
  resultItem: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  strengthBadge: {
    backgroundColor: '#4CAF50',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  strengthBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  weaknessBadge: {
    backgroundColor: '#F44336',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  weaknessBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  resultQuestion: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2D2D2D',
    marginBottom: 12,
    lineHeight: 22,
  },
  resultComparison: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  comparisonText: {
    fontSize: 14,
    color: BRAND_GRAY,
  },
  yourResponsesSection: {
    marginBottom: 24,
  },
  responsesDescription: {
    fontSize: 14,
    color: BRAND_GRAY,
    lineHeight: 20,
    marginBottom: 16,
  },
  partnerResponses: {
    marginTop: 12,
  },
  partnerResponse: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  partnerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D2D2D',
    width: 60,
  },
  heartResponse: {
    flexDirection: 'row',
    gap: 8,
  },
  responseHeart: {
    marginRight: 4,
  },
  quizResultsSummary: {
    marginBottom: 24,
  },
  summaryText: {
    fontSize: 14,
    color: BRAND_GRAY,
    lineHeight: 20,
  },
  questionsAndAnswersSection: {
    marginTop: 24,
  },
  answersDisplayContainer: {
    marginTop: 16,
    gap: 16,
  },
  answerSection: {
    gap: 8,
  },

  questionTypeBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 12,
  },
  questionTypeBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  // New styles for improved layout
  questionsScrollContent: {
    paddingBottom: 80, // Reduced padding to make submit button container more compact
  },
  submitContainerFixed: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 12, // Reduced padding
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    height: 70, // Fixed height to make it smaller
    justifyContent: 'center', // Center the button vertically
  },
  // NEW STYLES FOR REBUILT QUIZ ANSWER PAGE
  quizAnswerContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  questionsContainer: {
    flex: 1,
    marginBottom: 0,
  },
  submitButtonContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  // Theme-specific view styles
  themeContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
  },
  themeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 20,
    paddingBottom: 16,
  },
  themeDescriptionContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  themeDescription: {
    fontSize: 16,
    color: BRAND_GRAY,
    lineHeight: 22,
    textAlign: 'center',
  },
  themeQuizzesScroll: {
    flex: 1,
  },
  noQuizzesContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noQuizzesText: {
    fontSize: 16,
    color: BRAND_GRAY,
    textAlign: 'center',
    marginTop: 16,
  },
  noThemesContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noThemesText: {
    fontSize: 16,
    color: BRAND_GRAY,
    textAlign: 'center',
    marginTop: 16,
  },
  // Quiz invite button styles
  quizActions: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  quizInviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
  },
  quizInviteButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  quizzesHeader: {
    marginBottom: 20,
  },
  quizzesSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  // Pending invites styles
  pendingInvitesSection: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  pendingInviteCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  pendingInviteContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  pendingInviteInfo: {
    flex: 1,
    marginLeft: 12,
  },
  pendingInviteTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  pendingInviteMessage: {
    fontSize: 14,
    lineHeight: 20,
  },
  pendingInviteActions: {
    flexDirection: 'row',
    gap: 12,
  },
  acceptInviteButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
  },
  acceptInviteButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  declineInviteButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
  },
  declineInviteButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Quiz invite section styles
  quizInviteSection: {
    height: 50,
    marginTop: 26,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  inviteDescription: {
    fontSize: 13,
    color: BRAND_GRAY,
    lineHeight: 18,
    marginBottom: 16,
    textAlign: 'center',
  },
  invitePartnerButton: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  invitePartnerButtonGradient: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  invitePartnerButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  // Quiz completion invite styles
  completionInviteSection: {
    marginTop: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginHorizontal: 16,
    alignItems: 'center',
  },
  completionInviteTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D2D2D',
    marginBottom: 10,
    textAlign: 'center',
  },
  completionInviteDescription: {
    fontSize: 13,
    color: BRAND_GRAY,
    lineHeight: 18,
    marginBottom: 16,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  completionInviteButton: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  completionInviteButtonGradient: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  completionInviteButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  // Quiz taking invite styles
  quizTakingInviteSection: {
    marginTop: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginHorizontal: 16,
    alignItems: 'center',
  },
  quizTakingInviteTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D2D2D',
    marginBottom: 10,
    textAlign: 'center',
  },
  quizTakingInviteDescription: {
    fontSize: 13,
    color: BRAND_GRAY,
    lineHeight: 18,
    marginBottom: 16,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  quizTakingInviteButton: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  quizTakingInviteButtonGradient: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  quizTakingInviteButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  // Quiz notification badge styles
  quizTitleContainer: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  quizNotificationBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  quizNotificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 2,
  },
});

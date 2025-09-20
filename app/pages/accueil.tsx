import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, RefreshControl, ScrollView, Share, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { CoupleMoodDisplay } from '../../components/CoupleMoodDisplay';
import { MoodSelector } from '../../components/MoodSelector';
import { ReceivedPulse } from '../../components/ReceivedPulse';
import { useDarkTheme } from '../../contexts/DarkThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNotifications } from '../../contexts/NotificationContext';
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
  const { unreadCount, chatUnreadCount, chatNotificationsTableUnreadCount, dailyQuestionUnreadCount, pulseUnreadCount } = useNotifications();
  
  // Calculate total unread count from all notification types
  const totalUnreadCount = unreadCount + chatUnreadCount + chatNotificationsTableUnreadCount + dailyQuestionUnreadCount + pulseUnreadCount;
  const { isDarkMode } = useDarkTheme();
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
  const [isCheckingCouple, setIsCheckingCouple] = useState(false);
  const [isInCouple, setIsInCouple] = useState<boolean | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState<string>('');
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showJoinSection, setShowJoinSection] = useState<boolean>(false);
  const [quizThemes, setQuizThemes] = useState<any[]>([]);
  const [isLoadingThemes, setIsLoadingThemes] = useState(false);

  // Pulse options data - exactement comme dans l'image
  const pulseOptions = [
    { emoji: '🌸', label: t('home.pulseOptions.flower') },
    { emoji: '💘', label: t('home.pulseOptions.heart') },
    { emoji: '😄', label: t('home.pulseOptions.happy') },
    { emoji: '😈', label: t('home.pulseOptions.naughty') },
    { emoji: '💨', label: t('home.pulseOptions.cloud') },
  ];

  // Load quiz themes
  const loadQuizThemes = async () => {
    setIsLoadingThemes(true);
    try {
      const { data, error } = await supabase
        .from('quiz_themes')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setQuizThemes(data || []);
    } catch (error) {
      console.log('Error loading quiz themes:', error);
    } finally {
      setIsLoadingThemes(false);
    }
  };

  // Navigate to quizzes with theme selected
  const navigateToQuizTheme = (theme: any) => {
    router.push({
      pathname: '/pages/quizz',
      params: { themeId: theme.id, themeName: theme.name }
    });
  };

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
        console.log('Error finding couple:', coupleError);
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
        console.log('Error fetching today question:', error);
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
          console.log('Error fetching recent question:', recentError);
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
      console.log('Error fetching today question:', error);
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
        console.log('Error finding couple:', coupleError);
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
        console.log('Error fetching quiz results:', error);
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
      console.log('Error fetching quiz results count:', error);
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

  // Check couple membership and fetch invite code if needed
  useEffect(() => {
    const checkCoupleAndInvite = async () => {
      if (!user) return;
      setIsCheckingCouple(true);
      try {
        const { data: couple } = await supabase
          .from('couples')
          .select('id')
          .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
          .single();

        const inCouple = !!couple?.id;
        setIsInCouple(inCouple);

        if (!inCouple) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('invite_code')
            .eq('id', user.id)
            .single();
          setInviteCode(profile?.invite_code ?? null);
        }
      } catch (err) {
        console.log('Error checking couple/invite code:', err);
        setIsInCouple(false);
      } finally {
        setIsCheckingCouple(false);
      }
    };

    if (user) {
      checkCoupleAndInvite();
    }
  }, [user]);

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
        console.log('Error fetching couple moods:', error);
        return;
      }
      
      setCoupleMoods(data || []);
      
      // Set current user's mood
      const userMood = data?.find(mood => mood.user_id === user.id);
      setCurrentUserMood(userMood?.mood_type);
    } catch (error) {
      console.log('Error fetching couple moods:', error);
    } finally {
      setIsLoadingMoods(false);
    }
  };

  // Fetch couple moods when profile is complete
  useEffect(() => {
    if (isProfileComplete && user) {
      fetchCoupleMoods();
      loadQuizThemes();
    }
  }, [isProfileComplete, user]);

  // Handle mood selection
  const handleMoodSelect = async (moodType: 'joyeux' | 'content' | 'neutre' | 'triste' | 'enerve') => {
    if (!user) return;
    
    try {
      const { data, error } = await moodService.setUserMood(user.id, moodType);
      if (error) {
        console.log('Error setting user mood:', error);
        return;
      }
      
      // Refresh couple moods
      await fetchCoupleMoods();
      
      // Provide haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.log('Error setting user mood:', error);
    }
  };

  // Handle refresh
  const handleRefresh = async () => {
    if (!user) return;
    
    setIsRefreshing(true);
    try {
      // Refresh all main data
      await Promise.all([
        fetchQuizResultsCount(),
        fetchCoupleMoods(),
        fetchTodayQuestion(),
        loadQuizThemes()
      ]);
    } catch (error) {
      console.log('Error refreshing data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle pulse sending
  const handlePulseSend = async (emoji: string) => {
    if (!user) return;
    
    setIsSendingPulse(true);
    try {
      const { data, error } = await pulseService.sendPulse(user.id, emoji);
      if (error) {
        console.log('Error sending pulse:', error);
        return;
      }
      
      // Provide haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      console.log('Pulse sent successfully:', data);
      
      // Force refresh of received pulses
      setPulseRefreshKey(prev => prev + 1);
    } catch (error) {
      console.log('Error sending pulse:', error);
    } finally {
      setIsSendingPulse(false);
    }
  };

  // Show loading while checking auth or profile completion
  if (loading || profileLoading || isCheckingCouple || isInCouple === null) {
    return (
      <View className={`flex-1 ${isDarkMode ? 'bg-dark-bg' : 'bg-background'} justify-center items-center`}>
        <ActivityIndicator size="large" color="#2DB6FF" />
        <Text className={`mt-4 ${isDarkMode ? 'text-dark-text-secondary' : 'text-textSecondary'}`}>{t('home.loading')}</Text>
      </View>
    );
  }

  // Don't render if not authenticated or profile not completed
  if (!user || !isProfileComplete) {
    return null;
  }

  // If user is not in a couple, render invite page instead of the normal Accueil content
  if (isInCouple === false) {
    const handleCopy = async () => {
      if (inviteCode) {
        await Clipboard.setStringAsync(inviteCode);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    };

    const handlePaste = async () => {
      const text = await Clipboard.getStringAsync();
      setJoinCode(text.trim());
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const handleJoin = async () => {
      if (!user) return;
      const code = joinCode.trim();
      if (!code) {
        setJoinError('Code invalide');
        return;
      }
      setJoinError(null);
      setIsJoining(true);
      try {
        // Find partner profile by invite code
        const { data: partnerProfile, error: partnerErr } = await supabase
          .from('profiles')
          .select('id')
          .eq('invite_code', code)
          .single();

        if (partnerErr || !partnerProfile?.id) {
          setJoinError('Code introuvable');
          return;
        }

        if (partnerProfile.id === user.id) {
          setJoinError('Vous ne pouvez pas utiliser votre propre code');
          return;
        }

        // Ensure neither user is already in a couple
        const { data: existingForMe } = await supabase
          .from('couples')
          .select('id')
          .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
          .maybeSingle();
        if (existingForMe?.id) {
          setJoinError('Vous êtes déjà en couple');
          return;
        }

        const { data: existingForPartner } = await supabase
          .from('couples')
          .select('id')
          .or(`user1_id.eq.${partnerProfile.id},user2_id.eq.${partnerProfile.id}`)
          .maybeSingle();
        if (existingForPartner?.id) {
          setJoinError('Ce code est déjà utilisé');
          return;
        }

        // Create couple relation with partner as user1
        const { error: insertErr } = await supabase
          .from('couples')
          .insert({ user1_id: partnerProfile.id, user2_id: user.id });
        if (insertErr) {
          setJoinError('Impossible de créer le couple');
          return;
        }

        // Refresh local state
        setIsInCouple(true);
      } catch (e) {
        setJoinError('Une erreur est survenue');
      } finally {
        setIsJoining(false);
      }
    };

    return (
      <AppLayout>
        <ScrollView className={`flex-1 ${isDarkMode ? 'bg-dark-bg' : 'bg-background'} px-5`} showsVerticalScrollIndicator={false}>
          <View className="items-center mb-8">
            <Text className={`text-2xl font-bold ${isDarkMode ? 'text-dark-text' : 'text-text'} mb-2`}>Connectez votre couple</Text>
            <Text className={`text-base ${isDarkMode ? 'text-dark-text-secondary' : 'text-textSecondary'} text-center`}>Partagez votre code pour lier vos comptes</Text>
          </View>

          <View className={`${isDarkMode ? 'bg-dark-surface' : 'bg-surface'} rounded-3xl p-6 items-center mb-6`}>
            <View className="w-20 h-20 bg-gradient-to-r from-pink-100 to-blue-100 dark:from-pink-900 dark:to-blue-900 rounded-full justify-center items-center mb-4">
              <Text className="text-4xl">💞</Text>
            </View>
            <Text className={`text-lg font-semibold ${isDarkMode ? 'text-dark-text' : 'text-text'} mb-4`}>Votre code d'invitation</Text>
            <View className="flex-row items-center mb-4">
              <View className={`${isDarkMode ? 'bg-dark-border' : 'bg-gray-50'} rounded-2xl px-4 py-3 mr-3`}>
                <Text className={`text-lg font-mono ${isDarkMode ? 'text-dark-text' : 'text-text'} tracking-wider`}>{inviteCode ?? '—'}</Text>
              </View>
              <TouchableOpacity className="bg-pink-400 dark:bg-pink-600 rounded-xl px-4 py-2" onPress={handleCopy} disabled={!inviteCode}>
                <Text className="text-white font-semibold">Copier</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity 
              className="bg-blue-400 dark:bg-blue-900 rounded-xl px-6 py-3 w-full" 
              onPress={async () => {
                if (!inviteCode) return;
                
                try {
                  const shareMessage = `🔗 Code d'invitation ZOOJ\n\nMon code: ${inviteCode}\n\nRejoignez-moi sur ZOOJ pour partager nos moments précieux ! 💕\n\nTéléchargez l'app et utilisez ce code pour nous connecter.`
                  
                  const result = await Share.share({
                    message: shareMessage,
                    title: 'Code d\'invitation ZOOJ',
                    url: Platform.OS === 'ios' ? 'https://apps.apple.com/app/zooj' : 'https://play.google.com/store/apps/details?id=com.zooj.app'
                  })
                  
                  if (result.action === Share.sharedAction) {
                    console.log('Code shared successfully')
                  } else if (result.action === Share.dismissedAction) {
                    console.log('Share dismissed')
                  }
                } catch (error) {
                  console.log('Error sharing code:', error)
                  // Fallback to copy if share fails
                  await Clipboard.setStringAsync(inviteCode);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
              }} 
              disabled={!inviteCode}
            >
              <Text className="text-white font-semibold text-center">Partager le code</Text>
            </TouchableOpacity>
          </View>

          <View className="items-center mb-6">
            <TouchableOpacity onPress={() => setShowJoinSection(prev => !prev)}>
              <Text className={`${isDarkMode ? 'text-dark-text-secondary' : 'text-textSecondary'} underline font-semibold`}>{showJoinSection ? 'Masquer' : 'Déjà un code ?'}</Text>
            </TouchableOpacity>
          </View>

          {showJoinSection && (
            <View className={`${isDarkMode ? 'bg-dark-surface' : 'bg-surface'} rounded-2xl p-6 mb-6`}>
              <Text className={`text-lg font-semibold ${isDarkMode ? 'text-dark-text' : 'text-text'} mb-4`}>Entrer un code reçu</Text>
              <View className="flex-row items-center mb-4">
                <TextInput
                  value={joinCode}
                  onChangeText={setJoinCode}
                  placeholder="Code partenaire"
                  placeholderTextColor="#7A7A7A"
                  autoCapitalize="characters"
                  className={`flex-1 ${isDarkMode ? 'bg-dark-border text-dark-text' : 'bg-gray-50 text-text'} rounded-xl px-4 py-3`}
                />
                <TouchableOpacity className="ml-3 bg-pink-400 dark:bg-pink-600 rounded-xl px-4 py-3" onPress={handlePaste}>
                  <Text className="text-white dark:text-white font-semibold">Coller</Text>
                </TouchableOpacity>
              </View>
              {joinError ? <Text className="text-red-500 dark:text-red-400 mb-2">{joinError}</Text> : null}
              <TouchableOpacity className="bg-blue-400 dark:bg-blue-600 rounded-xl px-6 py-3" onPress={handleJoin} disabled={isJoining || !joinCode.trim()}>
                <Text className="text-white font-semibold text-center">{isJoining ? 'Connexion…' : 'Rejoindre le couple'}</Text>
              </TouchableOpacity>
            </View>
          )}

          <Text className={`${isDarkMode ? 'text-dark-text' : 'text-text'} text-center mb-6 text-lg font-semibold`}>Attendez votre partenaire pour rejoindre.</Text>
        </ScrollView>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <ScrollView 
        className={`flex-1 ${isDarkMode ? 'bg-dark-bg' : 'bg-background'} px-5`} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#4CAF50']}
            tintColor="#4CAF50"
          />
        }
      >

        {/* Header Section - Compatibility & Profile Pictures */}
        <View className="mb-8 mt-4">
          <View className="flex-row justify-between items-center mb-6">
            <Text className={`text-2xl font-bold ${isDarkMode ? 'text-dark-text' : 'text-text'}`}>{t('home.compatibility')}</Text>
            <TouchableOpacity 
              className={`w-10 h-10 ${isDarkMode ? 'bg-dark-surface' : 'bg-surface'} rounded-full justify-center items-center relative`}
              onPress={() => router.push('/pages/notifications')}
            >
              <MaterialCommunityIcons name="bell" size={24} color={isDarkMode ? "#FFFFFF" : "#2D2D2D"} />
              {totalUnreadCount > 0 && (
                <View className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />
              )}
            </TouchableOpacity>
          </View>
          
          {/* Profile Pictures with Mood Display */}
          <View className="mb-6">
            <CoupleMoodDisplay
              coupleMoods={coupleMoods}
              currentUserId={user?.id || ''}
              onMoodPress={() => setIsMoodSelectorVisible(true)}
            />
          </View>

          {/* Progress Bar */}
          <View className="flex-row items-center">
            <View className="flex-1 mr-4">
              <View className={`h-3 ${isDarkMode ? 'bg-dark-border' : 'bg-gray-200'} rounded-full overflow-hidden`}>
                <View 
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${Math.min(quizResultsCount, 100)}%` }}
                />
              </View>
            </View>
            <Text className={`text-lg font-semibold ${isDarkMode ? 'text-dark-text' : 'text-text'} min-w-12 text-right`}>{Math.min(quizResultsCount, 100)}%</Text>
          </View>
        </View>

        {/* Votre humeur aujourd'hui Section */}
        <View className="mb-8">
          <Text className={`text-xl font-semibold ${isDarkMode ? 'text-dark-text' : 'text-text'} mb-4`}>{t('home.yourMoodToday')}</Text>
          <Pressable 
            className={`${isDarkMode ? 'bg-dark-surface' : 'bg-surface'} rounded-2xl p-5`}
            onPress={() => setIsMoodSelectorVisible(true)}
          >
            <View className="flex-row items-center">
              <View className="flex-row items-center flex-1">
                <Text className="text-3xl mr-4">
                  {currentUserMood ? moodService.getMoodInfo(currentUserMood).emoji : '😐'}
                </Text>
                <View className="flex-1">
                  <Text className={`text-lg font-semibold ${isDarkMode ? 'text-dark-text' : 'text-text'} mb-1`}>
                    {currentUserMood ? moodService.getMoodInfo(currentUserMood).label + '!' : t('home.setYourMood')}
                  </Text>
                  <Text className={`text-sm ${isDarkMode ? 'text-dark-text-secondary' : 'text-textSecondary'}`}>
                    {currentUserMood === 'joyeux' ? t('home.moodDescriptions.joyeux') : 
                     currentUserMood === 'content' ? t('home.moodDescriptions.content') :
                     currentUserMood === 'neutre' ? t('home.moodDescriptions.neutre') :
                     currentUserMood === 'triste' ? t('home.moodDescriptions.triste') :
                     currentUserMood === 'enerve' ? t('home.moodDescriptions.enerve') :
                     t('home.howDoYouFeel')}
                  </Text>
                </View>
              </View>
              <View className="w-10 h-10 bg-secondary rounded-full justify-center items-center">
                <Text className="text-white font-semibold text-lg">+</Text>
              </View>
            </View>
          </Pressable>
        </View>

        {/* Envoyez un pulse à votre moitié Section */}
        <View className="mb-8">
          <Text className={`text-xl font-semibold ${isDarkMode ? 'text-dark-text' : 'text-text'} mb-2`}>{t('home.sendPulse')}</Text>
          <Text className={`text-sm ${isDarkMode ? 'text-dark-text-secondary' : 'text-textSecondary'} mb-4 leading-5`}>
            {t('home.pulseDescription')}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
            {pulseOptions.map((option, index) => (
              <Pressable 
                key={index} 
                className="mr-4"
                onPress={() => handlePulseSend(option.emoji)}
                disabled={isSendingPulse}
              >
                <View className={`w-16 h-16 ${isDarkMode ? 'bg-dark-border' : 'bg-gray-50'} rounded-full justify-center items-center`}>
                  <Text className="text-2xl">{option.emoji}</Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Thématiques des Quizz Section */}
        <View className="mb-8">
          <Text className={`text-xl font-semibold ${isDarkMode ? 'text-dark-text' : 'text-text'} mb-4`}>{t('home.quizThemes')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
            {isLoadingThemes ? (
              <View className="flex-row items-center">
                <ActivityIndicator size="small" color={isDarkMode ? '#CCCCCC' : '#7A7A7A'} />
                <Text className={`ml-2 text-sm ${isDarkMode ? 'text-dark-text-secondary' : 'text-text-secondary'}`}>Chargement...</Text>
              </View>
            ) : quizThemes.length > 0 ? (
              quizThemes.map((theme, index) => {
                // Generate different colors for each theme
                const colors = ['#4A90E2', '#50C878', '#228B22', '#FF6B6B', '#9B59B6', '#F39C12', '#E74C3C', '#3498DB', '#2ECC71', '#F1C40F', '#9B59B6', '#E67E22'];
                const emojis = ['📚', '💪', '🌿', '❤️', '🎯', '🌟', '🎨', '🏠', '💼', '🎵', '🍕', '✈️'];
                const themeColor = colors[index % colors.length];
                const themeEmoji = emojis[index % emojis.length];
                
                return (
                  <Pressable 
                    key={theme.id} 
                    className="mr-4 items-center"
                    onPress={() => navigateToQuizTheme(theme)}
                  >
                    <View className="w-16 h-16 rounded-full justify-center items-center mb-2" style={{ backgroundColor: themeColor }}>
                      <Text className="text-2xl">{themeEmoji}</Text>
                    </View>
                    <Text className={`text-sm font-medium ${isDarkMode ? 'text-dark-text' : 'text-text'} text-center`}>{theme.name}</Text>
                  </Pressable>
                );
              })
            ) : (
              <Text className={`text-sm ${isDarkMode ? 'text-dark-text-secondary' : 'text-text-secondary'}`}>Aucun thème disponible</Text>
            )}
          </ScrollView>
        </View>

        {/* Question du jour Section */}
        <View className="mb-8">
          <Text className={`text-xl font-semibold ${isDarkMode ? 'text-dark-text' : 'text-text'} mb-4`}>{t('home.dailyQuestion')}</Text>
          <View className={`${isDarkMode ? 'bg-dark-surface' : 'bg-surface'} rounded-2xl p-5`}>
            {isLoadingQuestion ? (
              <View className="flex-row items-center justify-center py-4">
                <ActivityIndicator size="small" color="#2DB6FF" />
                <Text className={`ml-2 text-sm ${isDarkMode ? 'text-dark-text-secondary' : 'text-textSecondary'}`}>{t('home.loadingQuestion')}</Text>
              </View>
            ) : todayQuestion?.question ? (
              <>
                <Text className={`text-base font-medium ${isDarkMode ? 'text-dark-text' : 'text-text'} mb-4 text-center leading-6`}>
                  "{todayQuestion.question.content}"
                </Text>
                <Text className={`text-xs ${isDarkMode ? 'text-dark-text-secondary' : 'text-textSecondary'} text-center mb-4`}>
                  {new Date(todayQuestion.scheduled_for).toLocaleDateString('fr-FR')}
                </Text>
                <Pressable 
                  className="bg-primary rounded-xl py-3"
                  onPress={() => router.push('/pages/questions')}
                >
                  <Text className="text-white font-semibold text-center">{t('home.answer')}</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text className={`text-base font-medium ${isDarkMode ? 'text-dark-text' : 'text-text'} mb-4 text-center leading-6`}>
                  "{t('home.noQuestionAvailable')}"
                </Text>
                <Pressable 
                  className="bg-primary rounded-xl py-3"
                  onPress={() => router.push('/pages/questions')}
                >
                  <Text className="text-white font-semibold text-center">{t('home.seeQuestions')}</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>

        {/* Games Section */}
        <View className="mb-8">
          <Text className={`text-xl font-semibold ${isDarkMode ? 'text-dark-text' : 'text-text'} mb-4`}>{t('home.games')}</Text>
          <Pressable 
            className={`${isDarkMode ? 'bg-dark-surface' : 'bg-surface'} rounded-2xl p-5`}
            onPress={() => router.push('/pages/jeux')}
          >
            <View className="flex-row items-center">
              <View className="w-12 h-12 bg-primary rounded-full justify-center items-center mr-4">
                <MaterialCommunityIcons name="gamepad-variant" size={24} color="#FFFFFF" />
              </View>
              <View className="flex-1">
                <Text className={`text-lg font-semibold ${isDarkMode ? 'text-dark-text' : 'text-text'} mb-1`}>
                  {t('home.playWithPartner')}
                </Text>
                <Text className={`text-sm ${isDarkMode ? 'text-dark-text-secondary' : 'text-textSecondary'}`}>
                  {t('home.gamesDescription')}
                </Text>
              </View>
              <MaterialCommunityIcons 
                name="chevron-right" 
                size={24} 
                color={isDarkMode ? "#CCCCCC" : "#7A7A7A"} 
              />
            </View>
          </Pressable>
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
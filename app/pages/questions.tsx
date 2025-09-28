import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useProfileCompletion } from '../../hooks/useProfileCompletion';
import { useAuth } from '../../lib/auth';
// import { dailyQuestionScheduler } from '../../lib/dailyQuestionScheduler';
import { useDarkTheme } from '../../contexts/DarkThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Answer, getQuestionContent, questionService } from '../../lib/questionService';
import { supabase } from '../../lib/supabase';
import AppLayout from '../app-layout';

export default function QuestionsPage() {
  const router = useRouter();
  const { highlightQuestionId } = useLocalSearchParams<{ highlightQuestionId?: string }>();
  const { user, loading } = useAuth();
  const { isProfileComplete, isLoading: profileLoading } = useProfileCompletion();
  const { colors } = useTheme();
  const { isDarkMode } = useDarkTheme();
  const { t, language: currentLanguage } = useLanguage();
  const [questions, setQuestions] = useState<any[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [couple, setCouple] = useState<any>(null);
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);
  const [answerTexts, setAnswerTexts] = useState<{ [key: string]: string }>({});
  const [submittingAnswers, setSubmittingAnswers] = useState<{ [key: string]: boolean }>({});
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'myTurn' | 'theirTurn'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSearchInput, setShowSearchInput] = useState<boolean>(false);
  const [allQuestions, setAllQuestions] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [highlightedQuestionId, setHighlightedQuestionId] = useState<string | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/');
    }
  }, [user, loading, router]);

  // Load questions and couple data
  useEffect(() => {
    if (user && !loading) {
      loadData();
    }
  }, [user, loading]);

  // Reload questions when language changes
  useEffect(() => {
    if (user && !loading && allQuestions.length > 0) {
      loadData();
    }
  }, [currentLanguage]);

  // Handle highlighting question from notification
  useEffect(() => {
    if (highlightQuestionId && allQuestions.length > 0) {
      setHighlightedQuestionId(highlightQuestionId);
      // Auto-expand the highlighted question
      setExpandedQuestionId(highlightQuestionId);
      
      // Clear the highlight after 5 seconds
      const timer = setTimeout(() => {
        setHighlightedQuestionId(null);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [highlightQuestionId, allQuestions]);

  const loadData = async () => {
    try {
      console.log('Loading data for user:', user!.id);
      
      // Test database connection
      const { data: testData, error: testError } = await supabase
        .from('daily_questions')
        .select('count')
        .limit(1);
      
      if (testError) {
        console.error('Database connection test failed:', testError);
      } else {
        console.log('Database connection successful');
      }

      // Get couple information
      const { data: coupleData } = await questionService.getCouple(user!.id);
      setCouple(coupleData);

      // Get ALL global questions (couple_id is NULL) - not just today's
      const { data: globalQuestionsData } = await supabase
        .from('daily_questions')
        .select(`
          *,
          question:questions(
            id,
            content,
            content_en,
            content_ar,
            content_ma,
            created_at
          )
        `)
        .is('couple_id', null)
        .order('created_at', { ascending: false }); // Most recent first
      
      // Get ALL couple-specific questions (not just today's) for chat access and history
      const { data: coupleQuestionsData } = await supabase
        .from('daily_questions')
        .select(`
          *,
          question:questions(
            id,
            content,
            content_en,
            content_ar,
            content_ma,
            created_at
          )
        `)
        .eq('couple_id', coupleData.id)
        .order('created_at', { ascending: false }); // Most recent first
      
      console.log('All global questions:', globalQuestionsData);
      console.log('All couple questions:', coupleQuestionsData);

      // Get all answers for daily questions to check if both partners answered
      const { data: allAnswers } = await supabase
        .from('answers')
        .select(`
          *,
          daily_question:daily_questions(
            id,
            question_id
          )
        `);

      // Get partner ID for accurate filtering
      const partnerId = coupleData.user1_id === user!.id ? coupleData.user2_id : coupleData.user1_id;
      
      // Get user's specific answers for accurate filtering
      const { data: userAnswers } = await supabase
        .from('answers')
        .select('daily_question_id, user_id')
        .eq('user_id', user!.id);

      // Get partner's specific answers for accurate filtering
      const { data: partnerAnswers } = await supabase
        .from('answers')
        .select('daily_question_id, user_id')
        .eq('user_id', partnerId);

      // Create Sets for quick lookup
      const userAnsweredQuestionIds = new Set(userAnswers?.map(answer => answer.daily_question_id) || []);
      const partnerAnsweredQuestionIds = new Set(partnerAnswers?.map(answer => answer.daily_question_id) || []);

      // Process couple-specific questions first (these are your answered questions and chat history)
      const coupleQuestionsWithStatus = coupleQuestionsData?.map(dailyQuestion => {
        const questionAnswers = allAnswers?.filter((answer: any) => 
          answer.daily_question_id === dailyQuestion.id
        ) || [];
        
        const userAnswered = userAnsweredQuestionIds.has(dailyQuestion.id);
        const partnerAnswered = partnerAnsweredQuestionIds.has(dailyQuestion.id);
        const bothAnswered = userAnswered && partnerAnswered;
        
        return {
          id: dailyQuestion.question.id,
          content: getQuestionContent(dailyQuestion.question, currentLanguage),
          created_at: dailyQuestion.created_at,
          daily_question_id: dailyQuestion.id,
          userAnswered,
          partnerAnswered,
          bothAnswered,
          answerCount: questionAnswers.length,
          isGlobal: false,
          isAnswered: true // Mark as answered since it's a couple-specific question
        };
      }) || [];

      // Process global questions, but exclude those that this couple has already answered
      const globalQuestionsWithStatus = globalQuestionsData?.map(dailyQuestion => {
        // Check if this couple has already answered this question (created a couple-specific record)
        const coupleHasAnswered = coupleQuestionsData?.some(cq => 
          cq.question_id === dailyQuestion.question_id
        );
        
        // If couple has already answered, skip this global question
        if (coupleHasAnswered) {
          return null;
        }
        
        // Check if this user has answered the global question
        const questionAnswers = allAnswers?.filter((answer: any) => 
          answer.daily_question_id === dailyQuestion.id
        ) || [];
        
        const userAnswered = userAnsweredQuestionIds.has(dailyQuestion.id);
        const partnerAnswered = partnerAnsweredQuestionIds.has(dailyQuestion.id);
        const bothAnswered = userAnswered && partnerAnswered;
        
        return {
          id: dailyQuestion.question.id,
          content: getQuestionContent(dailyQuestion.question, currentLanguage),
          created_at: dailyQuestion.created_at,
          daily_question_id: dailyQuestion.id,
          userAnswered,
          partnerAnswered,
          bothAnswered,
          answerCount: questionAnswers.length,
          isGlobal: true,
          isAnswered: false // Mark as unanswered since it's a new global question
        };
      }).filter(Boolean) || [];

      // Combine both types of questions
      const questionsWithAnswerStatus = [...coupleQuestionsWithStatus, ...globalQuestionsWithStatus];

      setAllQuestions(questionsWithAnswerStatus); // Store all questions for search
      setQuestions(questionsWithAnswerStatus); // Set initial display
      
    } catch (error) {
      console.error('Error loading questions:', error);
    } finally {
      setLoadingQuestions(false);
    }
  };

  // Handle refresh
  const handleRefresh = async () => {
    if (!user) return;
    
    setIsRefreshing(true);
    try {
      await loadData();
    } catch (error) {
      console.error('Error refreshing questions:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Filter and search functionality
  const applyFilters = (questionsToFilter: any[] = allQuestions, filterToUse: string = activeFilter, searchToUse: string = searchQuery) => {
    let filtered = [...questionsToFilter];
    
    // Apply search filter
    if (searchToUse.trim()) {
      filtered = filtered.filter(question => 
        question.content.toLowerCase().includes(searchToUse.toLowerCase())
      );
    }
    
    // Apply status filter based on database structure
    switch (filterToUse) {
      case 'unread':
        // Show questions where user hasn't answered
        filtered = filtered.filter(question => !question.userAnswered);
        break;
        
      case 'myTurn':
        // Show questions where: user hasn't answered yet
        // This includes: unanswered questions (answerCount = 0) OR questions where partner answered but user didn't (answerCount = 1 and !userAnswered)
        filtered = filtered.filter(question => {
          return !question.userAnswered;
        });
        break;
        
      case 'theirTurn':
        // Show questions where: partner hasn't answered yet
        // This includes: unanswered questions (answerCount = 0) OR questions where user answered but partner didn't (answerCount = 1 and userAnswered)
        filtered = filtered.filter(question => {
          return !question.partnerAnswered;
        });
        break;
        
      case 'all':
      default:
        // Show all questions
        break;
    }
    
    return filtered;
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    const filteredQuestions = applyFilters(allQuestions, activeFilter, query);
    setQuestions(filteredQuestions);
  };

  const handleFilterChange = (filter: 'all' | 'unread' | 'myTurn' | 'theirTurn') => {
    setActiveFilter(filter);
    const filteredQuestions = applyFilters(allQuestions, filter, searchQuery);
    
    // Debug logging
    console.log('=== FILTER DEBUG ===');
    console.log('Filter:', filter);
    console.log('All questions:', allQuestions.length);
    console.log('Filtered questions:', filteredQuestions.length);
    console.log('Sample question data:', allQuestions[0]);
    console.log('==================');
    
    setQuestions(filteredQuestions);
  };

  const toggleSearchInput = () => {
    setShowSearchInput(!showSearchInput);
    if (showSearchInput) {
      // If closing search, clear search and apply current filter
      setSearchQuery('');
      const filteredQuestions = applyFilters(allQuestions, activeFilter, '');
      setQuestions(filteredQuestions);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const diffTime = Math.abs(today.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (date.toDateString() === today.toDateString()) {
      return t('questions.today');
    } else if (date.toDateString() === yesterday.toDateString()) {
      return t('questions.yesterday');
    } else if (diffDays < 7) {
      return `${diffDays} ${diffDays === 1 ? t('questions.dayAgo') : t('questions.daysAgo')}`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} ${weeks === 1 ? t('questions.weekAgo') : t('questions.weeksAgo')}`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months} ${months === 1 ? t('questions.monthAgo') : t('questions.monthsAgo')}`;
    } else {
      const years = Math.floor(diffDays / 365);
      return years > 1 ? `${years} ${t('questions.yearsAgo')}` : `${years} ${t('questions.yearAgo')}`;
    }
  };

  const hasUserAnswered = (answers: Answer[], userId: string) => {
    return answers?.some(answer => answer.user_id === userId);
  };

  const bothAnswered = (answers: Answer[]) => {
    return answers?.length === 2;
  };

  const getFilteredQuestions = () => {
    // This function is now replaced by the applyFilters function
    // But we keep it for compatibility with the FlatList
    return questions;
  };

  const handleQuestionPress = async (question: any) => {
    // Toggle expansion for the question
    if (expandedQuestionId === question.id) {
      setExpandedQuestionId(null);
    } else {
      setExpandedQuestionId(question.id);
    }
  };

  const handleSubmitAnswer = async (question: any) => {
    if (!answerTexts[question.id]?.trim() || !user) return;

    setSubmittingAnswers(prev => ({ ...prev, [question.id]: true }));

    try {
      console.log('Starting answer submission for question:', question.id);
      console.log('User ID:', user!.id);
      console.log('Answer text:', answerTexts[question.id]);

      // Get couple information
      const { data: coupleData } = await questionService.getCouple(user!.id);
      if (!coupleData) {
        alert(t('questions.coupleNotFound'));
        return;
      }

      console.log('Couple data:', coupleData);
      console.log('Question data:', question);

      // Validate question ID
      if (!question.id || typeof question.id !== 'string') {
        console.error('Invalid question ID:', question.id);
        alert(t('questions.invalidQuestionId'));
        return;
      }

      // Check if this is a global question (couple_id is NULL)
      const isGlobalQuestion = question.isGlobal;
      let dailyQuestionId = question.daily_question_id;
      
      if (isGlobalQuestion) {
        // For global questions, create a couple-specific record
        console.log('This is a global question, creating couple-specific record');
        
        const today = new Date().toISOString().split('T')[0];
        
        // Create a new daily_question record for this couple
        const { data: newDailyQuestion, error: createError } = await supabase
          .from('daily_questions')
          .insert({
            couple_id: coupleData.id,
            question_id: question.id
          })
          .select()
          .single();
        
        if (createError) {
          console.error('Error creating couple-specific daily question:', createError);
          alert(t('questions.errorCreatingQuestion'));
          return;
        }
        
        dailyQuestionId = newDailyQuestion.id;
        console.log('Created couple-specific daily question:', newDailyQuestion);
      } else {
        // For couple-specific questions, use the existing daily_question_id
        if (!dailyQuestionId) {
          console.error('No daily question ID found for question:', question);
          alert(t('questions.dailyQuestionNotFound'));
          return;
        }
      }

      console.log('Using daily question ID:', dailyQuestionId);
      
      // Check if this specific question is already answered by this user
      const { data: existingAnswer } = await supabase
        .from('answers')
        .select('*')
        .eq('daily_question_id', dailyQuestionId)
        .eq('user_id', user!.id)
        .single();

      if (existingAnswer) {
        alert(t('questions.alreadyAnswered'));
        setExpandedQuestionId(null);
        return;
      }

      // Submit the answer
      console.log('Submitting answer with daily_question_id:', dailyQuestionId);
      
      const { data: answerData, error: answerError } = await supabase
        .from('answers')
        .insert({
          daily_question_id: dailyQuestionId,
          user_id: user!.id,
          answer_text: answerTexts[question.id].trim()
        })
        .select()
        .single();

      if (answerError) {
        console.error('Error submitting answer:', answerError);
        alert(t('questions.errorSubmittingAnswer'));
        return;
      }

      console.log('Answer submitted successfully:', answerData);
      
      // Clear the answer text and collapse the question
      setAnswerTexts(prev => ({ ...prev, [question.id]: '' }));
      setExpandedQuestionId(null);
      
      // Reload data to update the UI
      loadData();

    } catch (error) {
      console.error('Error submitting answer:', error);
      alert(t('questions.errorSubmittingAnswer'));
    } finally {
      setSubmittingAnswers(prev => ({ ...prev, [question.id]: false }));
    }
  };

  const handleChatPress = async (question: any) => {
    try {
      // Check if both partners have answered this question
      const { data: coupleData } = await questionService.getCouple(user!.id);
      
      if (!coupleData) {
        alert(t('questions.coupleNotFound'));
        return;
      }

      // For global questions, we need to find the couple-specific record
      let dailyQuestionId = question.daily_question_id;
      
      if (question.isGlobal) {
        // Find the couple-specific daily question record (should exist since user is trying to chat)
        const { data: coupleDailyQuestion } = await supabase
          .from('daily_questions')
          .select('*')
          .eq('couple_id', coupleData.id)
          .eq('question_id', question.id)
          .single();
        
        if (!coupleDailyQuestion) {
          alert(t('questions.questionNotFound'));
          return;
        }
        
        dailyQuestionId = coupleDailyQuestion.id;
      } else {
        if (!dailyQuestionId) {
          console.error('No daily question ID found for question:', question);
          alert(t('questions.dailyQuestionNotFound'));
          return;
        }
      }

      // Get answers for this specific daily question
      const { data: answers } = await supabase
        .from('answers')
        .select('*')
        .eq('daily_question_id', dailyQuestionId);

      // Check if both partners have answered
      if (answers && answers.length >= 2) {
        // Both answered, go to chat
        router.push(`/pages/question-chat?questionId=${question.id}`);
      } else {
        alert(t('questions.waitForPartner'));
      }
    } catch (error) {
      console.error('Error checking answers:', error);
      alert(t('questions.errorCheckingAnswers'));
    }
  };

  const renderQuestionItem = ({ item }: { item: any }) => {
    const isAnswered = item.userAnswered;
    const isExpanded = expandedQuestionId === item.id;
    const showChatButton = item.bothAnswered;
    const isHighlighted = highlightedQuestionId === item.id;

    return (
      <View style={styles.questionItemContainer}>
        <Pressable
          style={[
            styles.questionItem,
            { backgroundColor: isDarkMode ? '#1A1A1A' : colors.surface, borderColor: isDarkMode ? '#333333' : colors.border },
            !isAnswered && styles.newQuestionItem,
            isAnswered && styles.answeredQuestionItem,
            isHighlighted && styles.highlightedQuestionItem
          ]}
          onPress={() => handleQuestionPress(item)}
        >
          <View style={styles.questionIconContainer}>
            {!isAnswered && <View style={styles.newIndicator} />}
            <View style={styles.questionIcon}>
              <MaterialCommunityIcons name="message-text" size={20} color="#87CEEB" />
              <MaterialCommunityIcons 
                name="message-text" 
                size={20} 
                color="#FFB6C1" 
                style={styles.overlappingIcon} 
              />
              <MaterialCommunityIcons 
                name="heart" 
                size={8} 
                color="#FFB6C1" 
                style={styles.heartIcon} 
              />
            </View>
          </View>
          
          <View style={styles.questionContent}>
            <Text style={[styles.questionText, { color: isDarkMode ? '#FFFFFF' : colors.text }]}>
              {item.content || t('questions.questionOfDay')}
            </Text>
            <Text style={[styles.questionDate, { color: isDarkMode ? '#CCCCCC' : colors.textSecondary }]}>
              {formatDate(item.created_at)}
            </Text>
            

            
            {/* Answer Status */}
            {item.answerCount === 1 && (
              <Text style={[styles.answerStatus, { color: colors.primary }]}>
                {t('questions.partnerAnswered')}
              </Text>
            )}
            {item.answerCount === 2 && (
              <Text style={[styles.answerStatus, { color: colors.primary }]}>
                {t('questions.canDiscuss')}
              </Text>
            )}
            
            {/* Chat Button Inside Question Container */}
            {showChatButton && (
              <Pressable
                style={styles.chatButtonInline}
                onPress={() => handleChatPress(item)}
              >
                <MaterialCommunityIcons name="chat" size={16} color="#FFFFFF" />
                <Text style={styles.chatButtonInlineText}>{t('questions.discuss')}</Text>
              </Pressable>
            )}
          </View>
          
          <MaterialCommunityIcons 
            name={isExpanded ? "chevron-up" : "chevron-right"} 
            size={20} 
            color={isDarkMode ? '#CCCCCC' : colors.textSecondary} 
          />
        </Pressable>

        {/* Collapsible Answer Input */}
        {isExpanded && !isAnswered && (
          <View style={[styles.answerInputContainer, { backgroundColor: isDarkMode ? '#1A1A1A' : '#F8F9FA', borderTopColor: isDarkMode ? '#333333' : '#E5E7EB' }]}>
            <TextInput
              style={[styles.answerInput, { 
                backgroundColor: isDarkMode ? '#000000' : '#FFFFFF', 
                borderColor: isDarkMode ? '#333333' : '#E5E7EB', 
                color: isDarkMode ? '#FFFFFF' : '#2D2D2D' 
              }]}
              placeholder={t('questions.typeAnswer')}
              value={answerTexts[item.id] || ''}
              onChangeText={(text) => setAnswerTexts(prev => ({ ...prev, [item.id]: text }))}
              multiline
              placeholderTextColor={isDarkMode ? '#CCCCCC' : colors.textSecondary}
            />
            <View style={styles.answerActions}>
              <Pressable
                  style={[
                    styles.submitAnswerButton, 
                    { backgroundColor: isDarkMode ? '#2DB6FF' : '#87CEEB' },
                    !answerTexts[item.id]?.trim() && styles.submitAnswerButtonDisabled
                  ]}
                onPress={() => handleSubmitAnswer(item)}
                disabled={!answerTexts[item.id]?.trim() || submittingAnswers[item.id]}
              >
                {submittingAnswers[item.id] ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitAnswerButtonText}>{t('questions.send')}</Text>
                )}
              </Pressable>
            </View>
          </View>
        )}
      </View>
    );
  };

  // Show loading while checking auth or profile completion
  if (loading || profileLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#2DB6FF" />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>{t('questions.loading')}</Text>
      </View>
    );
  }

  // Don't render if not authenticated or profile not completed
  if (!user || !isProfileComplete) {
    return null;
  }

  return (
    <AppLayout>
      <View style={[styles.container, { backgroundColor: isDarkMode ? '#000000' : colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: isDarkMode ? '#333333' : colors.border }]}>
          <Text style={[styles.headerTitle, { color: isDarkMode ? '#FFFFFF' : colors.text }]}>{t('questions.title')}</Text>
          <Pressable style={styles.searchButton} onPress={toggleSearchInput}>
            <MaterialCommunityIcons name={showSearchInput ? "close" : "magnify"} size={24} color={isDarkMode ? '#FFFFFF' : colors.text} />
          </Pressable>
        </View>

        {/* Search Input */}
        {showSearchInput && (
          <View style={[styles.searchContainer, { backgroundColor: isDarkMode ? '#1A1A1A' : '#F8F9FA', borderBottomColor: isDarkMode ? '#333333' : '#E5E7EB' }]}>
            <TextInput
              style={[styles.searchInput, { 
                backgroundColor: isDarkMode ? '#000000' : '#FFFFFF', 
                borderColor: isDarkMode ? '#333333' : '#E5E7EB', 
                color: isDarkMode ? '#FFFFFF' : '#2D2D2D' 
              }]}
              placeholder={t('questions.search')}
              placeholderTextColor={isDarkMode ? '#CCCCCC' : '#9CA3AF'}
              value={searchQuery}
              onChangeText={handleSearch}
              autoFocus={true}
            />
          </View>
        )}

        {/* Filter Tabs */}
        <View style={[styles.filterContainer, { backgroundColor: isDarkMode ? '#1A1A1A' : colors.surface, borderBottomColor: isDarkMode ? '#333333' : colors.border }]}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScrollContent}
          >
            <Pressable
              style={[styles.filterTab, { backgroundColor: isDarkMode ? '#000000' : colors.surface, borderColor: isDarkMode ? '#333333' : colors.border }, activeFilter === 'all' && styles.filterTabActive]}
              onPress={() => handleFilterChange('all')}
            >
              <Text style={[styles.filterTabText, { color: isDarkMode ? '#CCCCCC' : colors.textSecondary }, activeFilter === 'all' && styles.filterTabTextActive]}>
                {t('questions.all')}
              </Text>
            </Pressable>
            
            <Pressable
              style={[styles.filterTab, { backgroundColor: isDarkMode ? '#000000' : colors.surface, borderColor: isDarkMode ? '#333333' : colors.border }, activeFilter === 'unread' && styles.filterTabActive]}
              onPress={() => handleFilterChange('unread')}
            >
              <Text style={[styles.filterTabText, { color: isDarkMode ? '#CCCCCC' : colors.textSecondary }, activeFilter === 'unread' && styles.filterTabTextActive]}>
                {t('questions.unread')}
              </Text>
            </Pressable>
            
            <Pressable
              style={[styles.filterTab, { backgroundColor: isDarkMode ? '#000000' : colors.surface, borderColor: isDarkMode ? '#333333' : colors.border }, activeFilter === 'myTurn' && styles.filterTabActive]}
              onPress={() => handleFilterChange('myTurn')}
            >
              <Text style={[styles.filterTabText, { color: isDarkMode ? '#CCCCCC' : colors.textSecondary }, activeFilter === 'myTurn' && styles.filterTabTextActive]}>
                {t('questions.myTurn')}
              </Text>
            </Pressable>
            
            <Pressable
              style={[styles.filterTab, { backgroundColor: isDarkMode ? '#000000' : colors.surface, borderColor: isDarkMode ? '#333333' : colors.border }, activeFilter === 'theirTurn' && styles.filterTabActive]}
              onPress={() => handleFilterChange('theirTurn')}
            >
              <Text style={[styles.filterTabText, { color: isDarkMode ? '#CCCCCC' : colors.textSecondary }, activeFilter === 'theirTurn' && styles.filterTabTextActive]}>
                {t('questions.theirTurn')}
              </Text>
            </Pressable>
          </ScrollView>
        </View>

        {/* Content */}
        {loadingQuestions ? (
          <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
            <ActivityIndicator size="large" color="#2DB6FF" />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>{t('questions.loading')}</Text>
          </View>
        ) : questions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <MaterialCommunityIcons name="message-text" size={40} color="#2DB6FF" />
              <MaterialCommunityIcons 
                name="message-text" 
                size={40} 
                color="#F47CC6" 
                style={styles.overlappingEmptyIcon} 
              />
              <MaterialCommunityIcons 
                name="heart" 
                size={16} 
                color="#2DB6FF" 
                style={styles.heartEmptyIcon} 
              />
            </View>
            <Text style={[styles.emptyText, { color: colors.text }]}>{t('questions.noItems')}</Text>
          </View>
        ) : (
          <FlatList
            data={getFilteredQuestions()}
            renderItem={renderQuestionItem}
            keyExtractor={(item) => item.id}
            style={styles.questionsList}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                colors={['#4CAF50']}
                tintColor="#4CAF50"
              />
            }
          />
        )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#374151',
  },
  searchButton: {
    padding: 8,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  searchInput: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    position: 'relative',
    marginBottom: 20,
  },
  overlappingEmptyIcon: {
    position: 'absolute',
    top: 2,
    left: 2,
  },
  heartEmptyIcon: {
    position: 'absolute',
    top: 12,
    left: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#2D2D2D',
    textAlign: 'center',
  },
  questionsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  questionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 20,
    marginVertical: 8,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  newQuestionItem: {
    borderColor: '#FFB6C1',
    borderWidth: 2,
    shadowColor: '#FFB6C1',
    shadowOpacity: 0.1,
  },
  answeredQuestionItem: {
    borderColor: '#87CEEB',
    borderWidth: 2,
    shadowColor: '#87CEEB',
    shadowOpacity: 0.1,
  },
  highlightedQuestionItem: {
    borderColor: '#FFD700',
    borderWidth: 3,
    shadowColor: '#FFD700',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  questionIconContainer: {
    position: 'relative',
    marginRight: 16,
  },
  newIndicator: {
    position: 'absolute',
    top: -2,
    left: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFB6C1',
    zIndex: 1,
  },
  questionIcon: {
    position: 'relative',
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlappingIcon: {
    position: 'absolute',
    top: 2,
    left: 2,
  },
  heartIcon: {
    position: 'absolute',
    top: 8,
    left: 8,
  },
  questionContent: {
    flex: 1,
  },
  questionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
    lineHeight: 20,
  },
  questionDate: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  questionItemContainer: {
    marginVertical: 6,
  },
  answerCount: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
    marginTop: 4,
  },
  answerInputContainer: {
    backgroundColor: '#F8F9FA',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    padding: 20,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  answerInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
    color: '#2D2D2D',
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  answerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  submitAnswerButton: {
    backgroundColor: '#87CEEB',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  submitAnswerButtonDisabled: {
    backgroundColor: '#E5E7EB',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitAnswerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2DB6FF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 12,
    alignSelf: 'center',
  },
  chatButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  readyToChatText: {
    fontSize: 12,
    color: '#2DB6FF',
    fontWeight: '600',
    marginTop: 4,
  },
  answerStatus: {
    fontSize: 12,
    color: '#87CEEB',
    fontWeight: '600',
    marginTop: 4,
  },
  chatButtonInline: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#87CEEB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 12,
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  chatButtonInlineText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  filterContainer: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    paddingTop: 10,
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterScrollContent: {
    alignItems: 'center',
  },
  filterTab: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  filterTabActive: {
    backgroundColor: '#87CEEB',
    borderColor: '#87CEEB',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },

});
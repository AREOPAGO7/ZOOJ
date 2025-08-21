import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../../lib/auth';
// import { dailyQuestionScheduler } from '../../lib/dailyQuestionScheduler';
import { Answer, questionService } from '../../lib/questionService';
import { supabase } from '../../lib/supabase';
import AppLayout from '../app-layout';

export default function QuestionsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [questions, setQuestions] = useState<any[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [couple, setCouple] = useState<any>(null);
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);
  const [answerTexts, setAnswerTexts] = useState<{ [key: string]: string }>({});
  const [submittingAnswers, setSubmittingAnswers] = useState<{ [key: string]: boolean }>({});

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

      // Get daily questions for this couple with question content
      const { data: dailyQuestionsData } = await supabase
        .from('daily_questions')
        .select(`
          *,
          question:questions(
            id,
            content,
            created_at
          )
        `)
        .eq('couple_id', coupleData.id);
      
      console.log('Daily questions for couple:', dailyQuestionsData);

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

      // Mark questions with answer status
      const questionsWithAnswerStatus = dailyQuestionsData?.map(dailyQuestion => {
        // Get answers for this specific daily question
        const questionAnswers = allAnswers?.filter((answer: any) => 
          answer.daily_question_id === dailyQuestion.id
        ) || [];
        
        const userAnswered = questionAnswers.some((answer: any) => 
          answer.user_id === user!.id
        );
        
        const bothAnswered = questionAnswers.length >= 2;
        
        return {
          id: dailyQuestion.question.id,
          content: dailyQuestion.question.content,
          created_at: dailyQuestion.question.created_at,
          daily_question_id: dailyQuestion.id,
          scheduled_for: dailyQuestion.scheduled_for,
          answered: userAnswered,
          bothAnswered,
          answerCount: questionAnswers.length
        };
      }) || [];

      setQuestions(questionsWithAnswerStatus);
      
    } catch (error) {
      console.error('Error loading questions:', error);
    } finally {
      setLoadingQuestions(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today • 23 min';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Hier';
    } else {
      const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
      return days[date.getDay()];
    }
  };

  const hasUserAnswered = (answers: Answer[], userId: string) => {
    return answers?.some(answer => answer.user_id === userId);
  };

  const bothAnswered = (answers: Answer[]) => {
    return answers?.length === 2;
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
        alert('Erreur: Couple non trouvé');
        return;
      }

      console.log('Couple data:', coupleData);
      console.log('Question data:', question);

      // Validate question ID
      if (!question.id || typeof question.id !== 'string') {
        console.error('Invalid question ID:', question.id);
        alert('Erreur: ID de question invalide');
        return;
      }

      // Use the daily_question_id from the question object
      const dailyQuestionId = question.daily_question_id;
      
      if (!dailyQuestionId) {
        console.error('No daily question ID found for question:', question);
        alert('Erreur: Question quotidienne non trouvée');
        return;
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
        alert('Vous avez déjà répondu à cette question aujourd\'hui');
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
        alert('Erreur lors de la soumission de la réponse');
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
      alert('Erreur lors de la soumission de la réponse');
    } finally {
      setSubmittingAnswers(prev => ({ ...prev, [question.id]: false }));
    }
  };

  const handleChatPress = async (question: any) => {
    try {
      // Check if both partners have answered this question
      const { data: coupleData } = await questionService.getCouple(user!.id);
      
      if (!coupleData) {
        alert('Erreur: Couple non trouvé');
        return;
      }

      // Use the daily_question_id from the question object
      const dailyQuestionId = question.daily_question_id;
      
      if (!dailyQuestionId) {
        console.error('No daily question ID found for question:', question);
        alert('Erreur: Question quotidienne non trouvée');
        return;
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
        alert('Attendez que votre partenaire réponde aussi à cette question');
      }
    } catch (error) {
      console.error('Error checking answers:', error);
      alert('Erreur lors de la vérification des réponses');
    }
  };

  const renderQuestionItem = ({ item }: { item: any }) => {
    const isAnswered = item.answered;
    const isExpanded = expandedQuestionId === item.id;
    const showChatButton = item.bothAnswered;

    return (
      <View style={styles.questionItemContainer}>
        <Pressable
          style={[
            styles.questionItem,
            !isAnswered && styles.newQuestionItem,
            isAnswered && styles.answeredQuestionItem
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
            <Text style={styles.questionText} numberOfLines={2}>
              {item.content || 'Question du jour'}
            </Text>
            <Text style={styles.questionDate}>
              {formatDate(item.created_at)}
            </Text>
            
            {/* Answer Status */}
            {item.answerCount === 1 && (
              <Text style={styles.answerStatus}>
                💬 Votre partenaire a répondu
              </Text>
            )}
            {item.answerCount === 2 && (
              <Text style={styles.answerStatus}>
                ✨ Vous pouvez maintenant discuter !
              </Text>
            )}
            
            {/* Chat Button Inside Question Container */}
            {showChatButton && (
              <Pressable
                style={styles.chatButtonInline}
                onPress={() => handleChatPress(item)}
              >
                <MaterialCommunityIcons name="chat" size={16} color="#FFFFFF" />
                <Text style={styles.chatButtonInlineText}>Discuter</Text>
              </Pressable>
            )}
          </View>
          
          <MaterialCommunityIcons 
            name={isExpanded ? "chevron-up" : "chevron-right"} 
            size={20} 
            color="#9CA3AF" 
          />
        </Pressable>

        {/* Collapsible Answer Input */}
        {isExpanded && !isAnswered && (
          <View style={styles.answerInputContainer}>
            <TextInput
              style={styles.answerInput}
              placeholder="Tapez votre réponse..."
              value={answerTexts[item.id] || ''}
              onChangeText={(text) => setAnswerTexts(prev => ({ ...prev, [item.id]: text }))}
              multiline
              placeholderTextColor="#9CA3AF"
            />
            <View style={styles.answerActions}>
              <Pressable
                style={[styles.submitAnswerButton, !answerTexts[item.id]?.trim() && styles.submitAnswerButtonDisabled]}
                onPress={() => handleSubmitAnswer(item)}
                disabled={!answerTexts[item.id]?.trim() || submittingAnswers[item.id]}
              >
                {submittingAnswers[item.id] ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitAnswerButtonText}>Envoyer</Text>
                )}
              </Pressable>
            </View>
          </View>
        )}
      </View>
    );
  };

  // Show loading while checking auth
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2DB6FF" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  // Don't render if not authenticated
  if (!user) {
    return null;
  }

  return (
    <AppLayout>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Questions & Réponses</Text>
          <Pressable style={styles.searchButton}>
            <MaterialCommunityIcons name="magnify" size={24} color="#2D2D2D" />
          </Pressable>
        </View>

        {/* Content */}
        {loadingQuestions ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2DB6FF" />
            <Text style={styles.loadingText}>Chargement...</Text>
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
            <Text style={styles.emptyText}>Aucun élément dans la liste</Text>
          </View>
        ) : (
          <FlatList
            data={questions}
            renderItem={renderQuestionItem}
            keyExtractor={(item) => item.id}
            style={styles.questionsList}
            showsVerticalScrollIndicator={false}
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
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  newQuestionItem: {
    borderColor: '#FFB6C1',
    borderWidth: 2,
  },
  answeredQuestionItem: {
    borderColor: '#87CEEB',
    borderWidth: 2,
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
    padding: 16,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  answerInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#2D2D2D',
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  answerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  submitAnswerButton: {
    backgroundColor: '#87CEEB',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  submitAnswerButtonDisabled: {
    backgroundColor: '#E5E7EB',
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  chatButtonInlineText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
});

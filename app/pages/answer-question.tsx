import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../../lib/auth';
import { questionService } from '../../lib/questionService';
import { supabase } from '../../lib/supabase';
import AppLayout from '../app-layout';

const BRAND_BLUE = "#2DB6FF";
const BRAND_PINK = "#F47CC6";

export default function AnswerQuestionPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [question, setQuestion] = useState<any>(null);
  const [answer, setAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loadingQuestion, setLoadingQuestion] = useState(true);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/');
    }
  }, [user, loading, router]);

  // Load question data
  useEffect(() => {
    if (user && !loading && id) {
      loadQuestion();
    }
  }, [user, loading, id]);

  const loadQuestion = async () => {
    try {
      // Get the question directly from the questions table
      const { data: questionData, error } = await supabase
        .from('questions')
        .select('*')
        .eq('id', id)
        .single();
      
      if (questionData) {
        setQuestion(questionData);
      }
    } catch (error) {
      console.error('Error loading question:', error);
    } finally {
      setLoadingQuestion(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!answer.trim() || !question) return;

    setSubmitting(true);
    try {
      // First, create a daily_question entry for this question and couple
      const { data: coupleData } = await questionService.getCouple(user!.id);
      
      if (!coupleData) {
        alert('Erreur: Couple non trouvé');
        return;
      }

      // Check if daily_question already exists, if not create it
      const today = new Date().toISOString().split('T')[0];
      let { data: dailyQuestion } = await supabase
        .from('daily_questions')
        .select('*')
        .eq('couple_id', coupleData.id)
        .eq('question_id', question.id)
        .eq('scheduled_for', today)
        .single();

      if (!dailyQuestion) {
        // Create daily_question entry
        const { data: newDailyQuestion, error: createError } = await supabase
          .from('daily_questions')
          .insert({
            couple_id: coupleData.id,
            question_id: question.id,
            scheduled_for: today
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating daily question:', createError);
          alert('Erreur lors de la création de la question quotidienne');
          return;
        }
        dailyQuestion = newDailyQuestion;
      }

      // Now submit the answer
      const { data: answerData, error: answerError } = await supabase
        .from('answers')
        .insert({
          daily_question_id: dailyQuestion.id,
          user_id: user!.id,
          answer_text: answer.trim()
        })
        .select()
        .single();

      if (answerError) {
        console.error('Error submitting answer:', answerError);
        alert('Erreur lors de la soumission de la réponse');
        return;
      }

      // Check if both partners have answered
      const { data: allAnswers } = await supabase
        .from('answers')
        .select('*')
        .eq('daily_question_id', dailyQuestion.id);

      if (allAnswers && allAnswers.length >= 2) {
        // Both partners answered, go to chat
        alert('Les deux partenaires ont répondu! Redirection vers le chat...');
        router.push(`/pages/question-chat?questionId=${question.id}`);
      } else {
        // Only one answered, go back to questions
        alert(`Réponse soumise avec succès!`);
        router.back();
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
      alert('Erreur lors de la soumission de la réponse');
    } finally {
      setSubmitting(false);
    }
  };

  // Show loading while checking auth
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={BRAND_BLUE} />
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
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#2D2D2D" />
          </Pressable>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Question du jour</Text>
            <Text style={styles.headerSubtitle}>Avec Christophe</Text>
          </View>
        </View>

        {/* Content */}
        {loadingQuestion ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={BRAND_BLUE} />
            <Text style={styles.loadingText}>Chargement...</Text>
          </View>
        ) : (
          <View style={styles.content}>
            {/* Question Section */}
            <View style={styles.questionSection}>
              <View style={styles.questionContainer}>
                <Text style={styles.questionText}>
                  {question?.content || 'Les couples devraient ils partager leurs mots de passe?'}
                </Text>
                
                {/* Decorative hearts */}
                <View style={styles.heart1} />
                <View style={styles.heart2} />
                <View style={styles.heart3} />
              </View>
              
              <Text style={styles.privacyText}>
                Vos réponses sont confidentielles. Consultez notre politique de Confidentialité
              </Text>
            </View>

            {/* Answer Input */}
            <View style={styles.answerSection}>
              <TextInput
                style={styles.answerInput}
                placeholder="Votre réponse..."
                value={answer}
                onChangeText={setAnswer}
                multiline
                textAlignVertical="top"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* Submit Button */}
            <Pressable
              style={[styles.submitButton, !answer.trim() && styles.submitButtonDisabled]}
              onPress={handleSubmitAnswer}
              disabled={!answer.trim() || submitting}
            >
              <LinearGradient 
                colors={answer.trim() ? [BRAND_BLUE, BRAND_PINK] : ['#E5E7EB', '#E5E7EB']} 
                start={{ x: 0, y: 0 }} 
                end={{ x: 1, y: 0 }} 
                style={styles.submitGradient}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>
                    Envoyer ma réponse
                  </Text>
                )}
              </LinearGradient>
            </Pressable>
          </View>
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
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
    marginRight: 16,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D2D2D',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 2,
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  questionSection: {
    marginBottom: 30,
  },
  questionContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    position: 'relative',
  },
  questionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D2D2D',
    lineHeight: 24,
    textAlign: 'center',
  },
  heart1: {
    position: 'absolute',
    top: -20,
    left: -20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(244, 124, 198, 0.1)',
  },
  heart2: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(45, 182, 255, 0.1)',
  },
  heart3: {
    position: 'absolute',
    bottom: -10,
    left: '50%',
    marginLeft: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(45, 182, 255, 0.1)',
  },
  privacyText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 16,
  },
  answerSection: {
    flex: 1,
    marginBottom: 20,
  },
  answerInput: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#2D2D2D',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: 120,
  },
  submitButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

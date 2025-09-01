import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../lib/auth';
import { ChatMessage, questionService } from '../../lib/questionService';
import { supabase } from '../../lib/supabase';
import AppLayout from '../app-layout';

const BRAND_BLUE = "#2DB6FF";
const BRAND_PINK = "#F47CC6";

export default function QuestionChatPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const { questionId } = useLocalSearchParams<{ questionId: string }>();
  const { colors } = useTheme();
  const [question, setQuestion] = useState<any>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingChat, setLoadingChat] = useState(true);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<any[]>([]);
  const [userAnswered, setUserAnswered] = useState(false);
  const [bothAnswered, setBothAnswered] = useState(false);
  const [answerText, setAnswerText] = useState('');
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [partnerName, setPartnerName] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [isQuestionCurrent, setIsQuestionCurrent] = useState<boolean>(false);
  const [partnerProfilePicture, setPartnerProfilePicture] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/');
    }
  }, [user, loading, router]);

  // Load chat data
  useEffect(() => {
    if (user && !loading && questionId) {
      loadChatData();
    }
  }, [user, loading, questionId]);

  // Set up real-time subscription for new messages using Supabase Realtime
  useEffect(() => {
    if (!threadId) return;

    console.log('Setting up Supabase Realtime subscription for thread:', threadId);

    // Use Supabase's built-in real-time service
    const subscription = supabase
      .channel(`chat_messages_${threadId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `thread_id=eq.${threadId}`
        },
        (payload) => {
          console.log('New message received via Realtime:', payload.new);
          const newMessage = payload.new as ChatMessage;
          
          // Only add the message if it's not from the current user (to avoid duplicates)
          if (newMessage.sender_id !== user!.id) {
            console.log('Adding new message from partner:', newMessage);
            setMessages(prev => [...prev, newMessage]);
            // Scroll to bottom for new messages
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
          } else {
            console.log('Ignoring own message in subscription');
          }
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to Supabase Realtime');
        } else if (status === 'CHANNEL_ERROR') {
          console.log('❌ Realtime channel subscription error');
        } else if (status === 'TIMED_OUT') {
          console.log('⏰ Realtime subscription timed out');
        } else if (status === 'CLOSED') {
          console.log('🔒 Realtime subscription closed');
        } 
      });

    // Cleanup subscription on unmount
    return () => {
      console.log('Cleaning up Realtime subscription for thread:', threadId);
      subscription.unsubscribe();
    };
  }, [threadId, user]);

  // Set up real-time subscription for new answers using Supabase Realtime
  useEffect(() => {
    if (!user || !questionId) return;

    console.log('Setting up Supabase Realtime answers subscription for question:', questionId);

    // We need to wait for the daily_question_id to be available
    // This subscription will be set up after loadChatData runs
    const setupAnswersSubscription = async () => {
      try {
        const { data: coupleData } = await questionService.getCouple(user!.id);
        if (!coupleData) return;

        const { data: dailyQuestionData } = await questionService.getDailyQuestionForQuestion(
          coupleData.id, 
          questionId
        );

        if (!dailyQuestionData) return;

        console.log('Setting up Realtime answers subscription for daily_question:', dailyQuestionData.id);

        // Use Supabase's built-in real-time service for answers
        const subscription = supabase
          .channel(`answers_${dailyQuestionData.id}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'answers',
              filter: `daily_question_id=eq.${dailyQuestionData.id}`
            },
            async (payload) => {
              console.log('New answer received via Realtime:', payload.new);
              
              // Reload answers to get the latest data including user names
              const { data: answersData } = await supabase
                .from('answers')
                .select(`
                  *,
                  user:profiles(name)
                `)
                .eq('daily_question_id', dailyQuestionData.id);

              setAnswers(answersData || []);
            }
          )
          .subscribe((status) => {
            console.log('Realtime answers subscription status:', status);
            if (status === 'SUBSCRIBED') {
              console.log('✅ Successfully subscribed to Supabase Realtime answers');
            } else if (status === 'CHANNEL_ERROR') {
              console.error('❌ Realtime answers channel subscription error');
            }
          });

        // Cleanup subscription on unmount
        return () => {
          console.log('Cleaning up Realtime answers subscription for daily_question:', dailyQuestionData.id);
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error('Error setting up Realtime answers subscription:', error);
      }
    };

    // Set up subscription after a short delay to ensure loadChatData has run
    const timeoutId = setTimeout(setupAnswersSubscription, 1000);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [questionId, user]);



  // Check if the question is current (today's question or not expired)
  const checkIfQuestionIsCurrent = (questionData: any, dailyQuestionData: any) => {
    if (!questionData || !dailyQuestionData) return false;
    
    const today = new Date();
    const scheduledDate = new Date(dailyQuestionData.scheduled_for);
    
    // Check if it's today's question
    const isToday = today.toDateString() === scheduledDate.toDateString();
    
    return isToday;
  };

  const loadChatData = async () => {
    try {
      // Get the question directly
      const { data: questionData, error: questionError } = await supabase
        .from('questions')
        .select('*')
        .eq('id', questionId)
        .single();

      if (questionError || !questionData) {
        console.error('Error loading question:', questionError);
        return;
      }

      setQuestion(questionData);

      // Get couple information
      const { data: coupleData } = await questionService.getCouple(user!.id);
      if (!coupleData) {
        return;
      }

      // Get names directly from couple data (which includes profile joins)
      if (coupleData.user1 && coupleData.user2) {
        if (coupleData.user1_id === user!.id) {
          setUserName(coupleData.user1.name || 'Moi');
          setPartnerName(coupleData.user2.name || 'Mon partenaire');
          setPartnerProfilePicture(coupleData.user2.profile_picture);
        } else {
          setUserName(coupleData.user2.name || 'Moi');
          setPartnerName(coupleData.user1.name || 'Mon partenaire');
          setPartnerProfilePicture(coupleData.user1.profile_picture);
        }
      }

      // First, get the daily_question entry for this question and couple
      // Try to find any existing daily question for this question/couple combination
      let { data: dailyQuestionData, error: dailyQuestionError } = await questionService.getDailyQuestionForQuestion(
        coupleData.id, 
        questionId
      );

      if (!dailyQuestionData) {
        // Create daily_question entry for today if none exists
        const today = new Date().toISOString().split('T')[0];
        const { data: newDailyQuestion, error: createError } = await supabase
          .from('daily_questions')
          .insert({
            couple_id: coupleData.id,
            question_id: questionId,
            scheduled_for: today
          })
          .select()
          .single();

        if (createError) {
          return;
        }

        dailyQuestionData = newDailyQuestion;
      } else if (dailyQuestionError) {
        return;
      }

      // Ensure we have a daily question before proceeding
      if (!dailyQuestionData) {
        return;
      }

      // Check if the question is current
      const questionIsCurrent = checkIfQuestionIsCurrent(questionData, dailyQuestionData);
      setIsQuestionCurrent(questionIsCurrent);

      // Get answers for this question
      const { data: answersData } = await supabase
        .from('answers')
        .select(`
          *,
          user:profiles(name)
        `)
        .eq('daily_question_id', dailyQuestionData.id);

      setAnswers(answersData || []);
      
      // Check if current user has answered
      const currentUserAnswer = answersData?.find(answer => answer.user_id === user!.id);
      setUserAnswered(!!currentUserAnswer);

      // Check if both partners have answered
      setBothAnswered(!!(answersData && answersData.length >= 2));

      // Get or create chat thread using the daily_question_id
      const { data: thread, error: threadError } = await questionService.getOrCreateChatThread(
        dailyQuestionData.id, 
        coupleData.id
      );

      if (threadError) {
        return;
      }

      if (thread) {
        setThreadId(thread.id);
        // Load messages
        const { data: messagesData } = await questionService.getChatMessages(thread.id);
        setMessages(messagesData || []);
      }
    } catch (error) {
      // Silent error handling
    } finally {
      setLoadingChat(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!answerText.trim() || !user || !questionId) return;

    setSubmittingAnswer(true);

    try {
      // Get couple information
      const { data: coupleData } = await questionService.getCouple(user!.id);
      if (!coupleData) {
        alert('Erreur: Couple non trouvé');
        return;
      }

      // Get or create daily_question entry
      // First try to find any existing daily question for this question/couple combination
      let { data: dailyQuestion, error: dailyQuestionError } = await questionService.getDailyQuestionForQuestion(
        coupleData.id, 
        questionId
      );

      if (!dailyQuestion) {
        // Create daily_question entry for today if none exists
        const today = new Date().toISOString().split('T')[0];
        const { data: newDailyQuestion, error: createError } = await supabase
          .from('daily_questions')
          .insert({
            couple_id: coupleData.id,
            question_id: questionId,
            scheduled_for: today
          })
          .select()
          .single();

        if (createError) {
          alert('Erreur lors de la création de la question quotidienne');
          return;
        }
        dailyQuestion = newDailyQuestion;
      }

      // Ensure we have a daily question before proceeding
      if (!dailyQuestion) {
        alert('Erreur: Impossible de créer la question quotidienne');
        return;
      }

      // Submit the answer
      const { data: answerData, error: answerError } = await supabase
        .from('answers')
        .insert({
          daily_question_id: dailyQuestion.id,
          user_id: user!.id,
          answer_text: answerText.trim()
        })
        .select()
        .single();

      if (answerError) {
        console.error('Error submitting answer:', answerError);
        alert('Erreur lors de la soumission de la réponse');
        return;
      }

      console.log('Answer submitted successfully:', answerData);
      setAnswerText('');
      setUserAnswered(true);

      // Reload data to update UI
      loadChatData();

    } catch (error) {
      console.error('Error submitting answer:', error);
      alert('Erreur lors de la soumission de la réponse');
    } finally {
      setSubmittingAnswer(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !threadId) {
      console.log('Cannot send message: missing threadId or message text');
      console.log('threadId:', threadId, 'message:', newMessage.trim());
      return;
    }

    const messageText = newMessage.trim();
    setNewMessage('');
    setSending(true);

    console.log('Sending message:', messageText, 'to thread:', threadId);

    try {
      // First, get the daily_question entry to ensure we have the correct daily_question_id
      const { data: coupleData } = await questionService.getCouple(user!.id);
      if (!coupleData) {
        console.error('No couple found for user');
        return;
      }

      // First try to find any existing daily question for this question/couple combination
      let { data: dailyQuestionData, error: dailyQuestionError } = await questionService.getDailyQuestionForQuestion(
        coupleData.id, 
        questionId
      );

      // If no daily question exists, create one for today
      if (!dailyQuestionData) {
        console.log('No daily question found, creating one for today...');
        const today = new Date().toISOString().split('T')[0];
        const { data: newDailyQuestion, error: createError } = await supabase
          .from('daily_questions')
          .insert({
            couple_id: coupleData.id,
            question_id: questionId,
            scheduled_for: today
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating daily question:', createError);
          return;
        }
        dailyQuestionData = newDailyQuestion;
      }

      // Ensure we have a daily question before proceeding
      if (!dailyQuestionData) {
        console.error('Failed to get or create daily question');
        return;
      }

      console.log('Using daily_question_id for message:', dailyQuestionData.id);

      const { data: newMsg, error } = await questionService.sendMessage(
        threadId, 
        user!.id, 
        messageText
      );

      if (error) {
        console.error('Error from sendMessage:', error);
        return;
      }

      if (newMsg) {
        console.log('Message sent successfully:', newMsg);
        setMessages(prev => [...prev, newMsg]);
        // Scroll to bottom
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } else {
        console.log('No message data returned');
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };



  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isOwnMessage = item.sender_id === user!.id;

    return (
      <View style={[
        styles.messageContainer,
        isOwnMessage ? styles.ownMessage : styles.partnerMessage
      ]}>
        {/* Profile Picture - Left for partner, Right for user */}
        {!isOwnMessage && (
          <View style={[styles.messageAvatar, { borderColor: colors.border }]}>
            {partnerProfilePicture ? (
              <Image 
                source={{ uri: partnerProfilePicture }} 
                style={styles.messageAvatarImage}
              />
            ) : (
              <Text style={styles.avatarText}>👥</Text>
            )}
          </View>
        )}
        
        <View style={[
          styles.messageBubble,
          { 
            borderColor: colors.border,
            backgroundColor: colors.surface
          },
          isOwnMessage ? styles.ownBubble : styles.partnerBubble
        ]}>
          <Text style={[
            styles.messageText,
            { color: colors.text },
            isOwnMessage ? styles.ownMessageText : styles.partnerMessageText
          ]}>
            {item.message_text}
          </Text>
        </View>

        {/* Profile Picture - Right for user */}
        {isOwnMessage && (
          <View style={[styles.messageAvatar, { borderColor: colors.border }]}>
            {profile?.profile_picture ? (
              <Image 
                source={{ uri: profile.profile_picture }} 
                style={styles.messageAvatarImage}
              />
            ) : (
              <Text style={styles.avatarText}>👤</Text>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderAnswers = () => {
    if (!answers || answers.length === 0) return null;

    return (
      <View style={styles.answersSection}>
        <Text style={[styles.answersTitle, { color: colors.textSecondary }]}>Vos réponses :</Text>
        
        {/* Show user's own answer if they have answered */}
        {userAnswered && (
          <View style={styles.answerBubble}>
            <View style={styles.answerAvatar}>
              <Text style={styles.avatarText}>👤</Text>
            </View>
            <View style={styles.answerContent}>
              <Text style={[styles.answerLabel, { color: '#000' }]}>Moi</Text>
              <Text style={[styles.answerText, { color: '#000' }]}>
                {answers.find(a => a.user_id === user!.id)?.answer_text}
              </Text>
            </View>
          </View>
        )}

        {/* Show partner's answer only if both have answered */}
        {bothAnswered && (
          <View style={styles.answerBubble}>
            <View style={styles.answerAvatar}>
              <Text style={styles.avatarText}>👥</Text>
            </View>
            <View style={[styles.answerContent, styles.partnerAnswerContent]}>
              <Text style={[styles.answerLabel, { color: '#000' }]}>Mon partenaire</Text>
              <Text style={[styles.answerText, { color: '#000' }]}>
                {answers.find(a => a.user_id !== user!.id)?.answer_text}
              </Text>
            </View>
          </View>
        )}

        {/* Show answer input if user hasn't answered AND question is current */}
        {!userAnswered && isQuestionCurrent && (
          <View style={styles.answerInputContainer}>
            <TextInput
              style={[styles.answerInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="Tapez votre réponse..."
              value={answerText}
              onChangeText={setAnswerText}
              multiline
              placeholderTextColor={colors.textSecondary}
            />
            <Pressable
              style={[styles.submitAnswerButton, { backgroundColor: colors.primary }, !answerText.trim() && styles.submitAnswerButtonDisabled]}
              onPress={handleSubmitAnswer}
              disabled={!answerText.trim() || submittingAnswer}
            >
              {submittingAnswer ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={[styles.submitAnswerButtonText, { color: '#FFFFFF' }]}>Envoyer</Text>
              )}
            </Pressable>
          </View>
        )}

      </View>
    );
  };

  // Show loading while checking auth
  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={BRAND_BLUE} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Chargement...</Text>
      </View>
    );
  }

  // Don't render if not authenticated
  if (!user) {
    return null;
  }

  return (
    <AppLayout>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
                 {/* Header */}
         <View style={[styles.header, { borderBottomColor: colors.border }]}>
           <Pressable onPress={() => router.back()} style={styles.backButton}>
             <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
           </Pressable>
           <View style={styles.headerTitleContainer}>
             <Text style={[styles.headerTitle, { color: colors.text }]}>Question du jour</Text>
           </View>
           <Pressable style={styles.menuButton}>
             <MaterialCommunityIcons name="dots-vertical" size={24} color={colors.text} />
           </Pressable>
         </View>

        {/* Content */}
        {loadingChat ? (
          <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
            <ActivityIndicator size="large" color={BRAND_BLUE} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Chargement...</Text>
          </View>
        ) : (
          <>
                         {/* Question and Answers */}
             <View style={[styles.questionSection, { borderBottomColor: colors.border }]}>
               <Text style={[styles.questionText, { color: colors.text }]}>
                 {question?.content || 'Les couples devraient-ils partager leurs mots de passe ?'}
               </Text>
               
               {/* Question Status Indicator */}
               {!isQuestionCurrent && (
                 <View style={styles.questionStatusContainer}>
                   <MaterialCommunityIcons name="clock-outline" size={16} color="#F59E0B" />
                   <Text style={styles.questionStatusText}>
                     Question fermée - Discussion terminée
                   </Text>
                 </View>
               )}
               
               {renderAnswers()}

             </View>

                         {/* Chat Messages */}
             {threadId ? (
               <View style={styles.chatSection}>
                 <Text style={[styles.chatTitle, { color: colors.text }]}>Discussion</Text>
                 <FlatList
                   ref={flatListRef}
                   data={messages}
                   renderItem={renderMessage}
                   keyExtractor={(item) => item.id}
                   style={styles.messagesList}
                   contentContainerStyle={styles.messagesContainer}
                   showsVerticalScrollIndicator={false}
                 />
               </View>
             ) : (
               <View style={styles.chatSection}>
                 <Text style={[styles.chatTitle, { color: colors.text }]}>Discussion</Text>
                 <Text style={[styles.noChatText, { color: colors.textSecondary }]}>
                   Répondez d'abord à la question pour commencer la discussion
                 </Text>
               </View>
             )}

             

                          {/* Input Bar - Only show if question is current */}
             {threadId && isQuestionCurrent && (
               <View style={[styles.inputBar, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
                 <View style={styles.inputContainer}>
                   <Pressable style={styles.attachButton}>
                     <MaterialCommunityIcons 
                       name="paperclip" 
                       size={24} 
                       color={colors.textSecondary}
                     />
                   </Pressable>
                   
                   <TextInput
                     style={[styles.messageInput, { backgroundColor: colors.background, color: colors.text }]}
                     placeholder="Message..."
                     value={newMessage}
                     onChangeText={setNewMessage}
                     multiline
                     placeholderTextColor={colors.textSecondary}
                   />
                   
                   <Pressable
                     style={[styles.sendButton, { backgroundColor: colors.primary }, !newMessage.trim() && styles.sendButtonDisabled]}
                     onPress={handleSendMessage}
                     disabled={!newMessage.trim() || sending}
                   >
                     {sending ? (
                       <ActivityIndicator size="small" color="#FFFFFF" />
                     ) : (
                       <MaterialCommunityIcons 
                         name="send" 
                         size={20} 
                         color={newMessage.trim() ? "#FFFFFF" : colors.textSecondary} 
                       />
                     )}
                   </Pressable>
                 </View>
               </View>
             )}

            
          </>
        )}
      </View>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
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
    color: '#374151',
    marginTop: 0,
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
  questionSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginTop: 8,
  },
  questionText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 24,
  },
  answersSection: {
   
  },
  answersTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  answerItem: {
    marginBottom: 8,
  },
  answerText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  answerLabel: {
    fontWeight: '600',
    color: '#2D2D2D',
  },
  messagesList: {
    flex: 1,
  },
  messagesContainer: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  ownMessage: {
    justifyContent: 'flex-end',
  },
  partnerMessage: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '70%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  ownBubble: {
    backgroundColor: '#F8E8F0',
    borderColor: '#F8E8F0',
  },
  partnerBubble: {
    backgroundColor: '#E8F0F8',
    borderColor: '#E8F0F8',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  ownMessageText: {
    color: '#374151',
  },
  partnerMessageText: {
    color: '#374151',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  attachButton: {
    padding: 8,
    marginRight: 12,
  },
  messageInput: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    color: '#2D2D2D',
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F0F8',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  sendButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },

  answerBubble: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  answerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
  },
  answerContent: {
    flex: 1,
    backgroundColor: '#F8E8F0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    maxWidth: '80%',
  },


  answerInputContainer: {
    paddingHorizontal: 20,
    marginTop: 16,
  },
  answerInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#374151',
    marginBottom: 12,
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#E8F0F8',
  },
  submitAnswerButton: {
    backgroundColor: '#E8F0F8',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    alignSelf: 'flex-end',
  },
  submitAnswerButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  submitAnswerButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  messageAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  messageAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  messageSender: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    color: '#6B7280',
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  menuButton: {
    padding: 8,
    marginLeft: 16,
  },
  partnerAnswerContent: {
    backgroundColor: '#E0F2FE',
  },
  chatSection: {
    flex: 1,
    marginTop: 12,
  },
  chatTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  noChatText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 20,
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  questionStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 16,
  },
  questionStatusText: {
    fontSize: 14,
    color: '#92400E',
    fontWeight: '500',
    marginLeft: 8,
  },
  expiredMessageContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F59E0B',
    marginTop: 16,
  },
  expiredMessageText: {
    fontSize: 16,
    color: '#92400E',
    textAlign: 'center',
    fontWeight: '500',
    marginTop: 8,
  },
  expiredChatMessage: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F59E0B',
    marginTop: 16,
    marginHorizontal: 20,
  },
  expiredChatMessageText: {
    fontSize: 16,
    color: '#92400E',
    textAlign: 'center',
    fontWeight: '500',
    marginTop: 8,
  },
});

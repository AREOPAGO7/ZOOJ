import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../../lib/auth';
import { ChatMessage, questionService } from '../../lib/questionService';
import { supabase } from '../../lib/supabase';
import AppLayout from '../app-layout';

const BRAND_BLUE = "#2DB6FF";
const BRAND_PINK = "#F47CC6";

export default function QuestionChatPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { questionId } = useLocalSearchParams<{ questionId: string }>();
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
          console.error('❌ Realtime channel subscription error');
        } else if (status === 'TIMED_OUT') {
          console.error('⏰ Realtime subscription timed out');
        } else if (status === 'CLOSED') {
          console.error('🔒 Realtime subscription closed');
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

        const { data: dailyQuestionData } = await supabase
          .from('daily_questions')
          .select('*')
          .eq('question_id', questionId)
          .eq('couple_id', coupleData.id)
          .single();

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
        console.error('Couple not found');
        return;
      }

      console.log('Couple data:', coupleData);
      console.log('Current user ID:', user!.id);
      console.log('Couple user1_id:', coupleData.user1_id);
      console.log('Couple user2_id:', coupleData.user2_id);

      // Get names directly from couple data (which includes profile joins)
      if (coupleData.user1 && coupleData.user2) {
        if (coupleData.user1_id === user!.id) {
          setUserName(coupleData.user1.name || 'Moi');
          setPartnerName(coupleData.user2.name || 'Mon partenaire');
        } else {
          setUserName(coupleData.user2.name || 'Moi');
          setPartnerName(coupleData.user1.name || 'Mon partenaire');
        }
      }

      console.log('User name from couple data:', coupleData.user1?.name || coupleData.user2?.name);
      console.log('Partner name from couple data:', coupleData.user1_id === user!.id ? coupleData.user2?.name : coupleData.user1?.name);

      // First, get the daily_question entry for this question and couple
      let { data: dailyQuestionData, error: dailyQuestionError } = await supabase
        .from('daily_questions')
        .select('*')
        .eq('question_id', questionId)
        .eq('couple_id', coupleData.id)
        .single();

      if (!dailyQuestionData) {
        console.log('No daily question found, creating one...');
        // Create daily_question entry
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

              console.log('Created new daily question:', newDailyQuestion);
      dailyQuestionData = newDailyQuestion;
    } else if (dailyQuestionError) {
      console.error('Error getting daily question:', dailyQuestionError);
      return;
    }

    console.log('Final daily question data:', dailyQuestionData);

      console.log('Daily question data:', dailyQuestionData);

      // Get answers for this question
      const { data: answersData } = await supabase
        .from('answers')
        .select(`
          *,
          user:profiles(name)
        `)
        .eq('daily_question_id', dailyQuestionData.id);

      setAnswers(answersData || []);
      console.log('Answers data:', answersData);

      // Check if current user has answered
      const currentUserAnswer = answersData?.find(answer => answer.user_id === user!.id);
      setUserAnswered(!!currentUserAnswer);

      // Check if both partners have answered
      setBothAnswered(!!(answersData && answersData.length >= 2));

      // Get or create chat thread using the daily_question_id
      console.log('Creating/getting chat thread for daily question:', dailyQuestionData.id);
      const { data: thread, error: threadError } = await questionService.getOrCreateChatThread(
        dailyQuestionData.id, 
        coupleData.id
      );

      if (threadError) {
        console.error('Error creating/getting chat thread:', threadError);
        return;
      }

      if (thread) {
        console.log('Chat thread created/found:', thread.id);
        setThreadId(thread.id);
        // Load messages
        const { data: messagesData } = await questionService.getChatMessages(thread.id);
        setMessages(messagesData || []);
        console.log('Messages loaded:', messagesData?.length || 0);
      } else {
        console.error('No chat thread created/found');
      }
    } catch (error) {
      console.error('Error loading chat:', error);
    } finally {
      setLoadingChat(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!answerText.trim() || !user || !questionId) return;

    setSubmittingAnswer(true);
    console.log('Submitting answer:', answerText);

    try {
      // Get couple information
      const { data: coupleData } = await questionService.getCouple(user!.id);
      if (!coupleData) {
        alert('Erreur: Couple non trouvé');
        return;
      }

      // Get or create daily_question entry
      const today = new Date().toISOString().split('T')[0];
      let { data: dailyQuestion } = await supabase
        .from('daily_questions')
        .select('*')
        .eq('couple_id', coupleData.id)
        .eq('question_id', questionId)
        .eq('scheduled_for', today)
        .single();

      if (!dailyQuestion) {
        // Create daily_question entry
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
          alert('Erreur lors de la création de la question quotidienne');
          return;
        }
        dailyQuestion = newDailyQuestion;
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

      const today = new Date().toISOString().split('T')[0];
      const { data: dailyQuestionData } = await supabase
        .from('daily_questions')
        .select('*')
        .eq('couple_id', coupleData.id)
        .eq('question_id', questionId)
        .eq('scheduled_for', today)
        .single();

      if (!dailyQuestionData) {
        console.error('No daily question found for message sending');
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
          <View style={styles.messageAvatar}>
            <Text style={styles.avatarText}>👥</Text>
          </View>
        )}
        
        <View style={[
          styles.messageBubble,
          isOwnMessage ? styles.ownBubble : styles.partnerBubble
        ]}>
          <Text style={[
            styles.messageText,
            isOwnMessage ? styles.ownMessageText : styles.partnerMessageText
          ]}>
            {item.message_text}
          </Text>
        </View>

        {/* Profile Picture - Right for user */}
        {isOwnMessage && (
          <View style={styles.messageAvatar}>
            <Text style={styles.avatarText}>👤</Text>
          </View>
        )}
      </View>
    );
  };

  const renderAnswers = () => {
    if (!answers || answers.length === 0) return null;

    return (
      <View style={styles.answersSection}>
        <Text style={styles.answersTitle}>Vos réponses :</Text>
        
        {/* Show user's own answer if they have answered */}
        {userAnswered && (
          <View style={styles.answerBubble}>
            <View style={styles.answerAvatar}>
              <Text style={styles.avatarText}>👤</Text>
            </View>
            <View style={styles.answerContent}>
              <Text style={styles.answerLabel}>Moi</Text>
              <Text style={styles.answerText}>
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
              <Text style={styles.answerLabel}>Mon partenaire</Text>
              <Text style={styles.answerText}>
                {answers.find(a => a.user_id !== user!.id)?.answer_text}
              </Text>
            </View>
          </View>
        )}

        {/* Show answer input if user hasn't answered */}
        {!userAnswered && (
          <View style={styles.answerInputContainer}>
            <TextInput
              style={styles.answerInput}
              placeholder="Tapez votre réponse..."
              value={answerText}
              onChangeText={setAnswerText}
              multiline
              placeholderTextColor="#9CA3AF"
            />
            <Pressable
              style={[styles.submitAnswerButton, !answerText.trim() && styles.submitAnswerButtonDisabled]}
              onPress={handleSubmitAnswer}
              disabled={!answerText.trim() || submittingAnswer}
            >
              {submittingAnswer ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.submitAnswerButtonText}>Envoyer</Text>
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
           </View>
           <Pressable style={styles.menuButton}>
             <MaterialCommunityIcons name="dots-vertical" size={24} color="#2D2D2D" />
           </Pressable>
         </View>

        {/* Content */}
        {loadingChat ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={BRAND_BLUE} />
            <Text style={styles.loadingText}>Chargement...</Text>
          </View>
        ) : (
          <>
                         {/* Question and Answers */}
             <View style={styles.questionSection}>
               <Text style={styles.questionText}>
                 {question?.content || 'Les couples devraient-ils partager leurs mots de passe ?'}
               </Text>
               {renderAnswers()}

             </View>

                         {/* Chat Messages */}
             {threadId ? (
               <View style={styles.chatSection}>
                 <Text style={styles.chatTitle}>Discussion</Text>
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
                 <Text style={styles.chatTitle}>Discussion</Text>
                 <Text style={styles.noChatText}>
                   Répondez d'abord à la question pour commencer la discussion
                 </Text>
               </View>
             )}

             

                          {/* Input Bar */}
             {threadId && (
               <View style={styles.inputBar}>
                 <Pressable style={styles.attachButton}>
                   <MaterialCommunityIcons name="paperclip" size={24} color="#9CA3AF" />
                 </Pressable>
                 
                 <TextInput
                   style={styles.messageInput}
                   placeholder="Message..."
                   value={newMessage}
                   onChangeText={setNewMessage}
                   multiline
                   placeholderTextColor="#9CA3AF"
                 />
                 
                 <Pressable
                   style={[styles.sendButton, !newMessage.trim() && styles.sendButtonDisabled]}
                   onPress={handleSendMessage}
                   disabled={!newMessage.trim() || sending}
                 >
                   {sending ? (
                     <ActivityIndicator size="small" color="#FFFFFF" />
                   ) : (
                                     <MaterialCommunityIcons 
                  name="send" 
                  size={20} 
                  color={newMessage.trim() ? "#374151" : "#9CA3AF"} 
                />
                   )}
                 </Pressable>
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
    marginTop: 8,
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
  },
  ownBubble: {
    backgroundColor: '#F8E8F0',
  },
  partnerBubble: {
    backgroundColor: '#E8F0F8',
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
});

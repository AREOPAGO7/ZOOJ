import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, FlatList, Image, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useDarkTheme } from '../../contexts/DarkThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../lib/auth';
import { ChatMessage, questionService } from '../../lib/questionService';
import { simpleChatNotificationService } from '../../lib/simpleChatNotificationService';
import { supabase } from '../../lib/supabase';
import AppLayout from '../app-layout';

const BRAND_BLUE = "#2DB6FF";
const BRAND_PINK = "#F47CC6";

const LIGHT_BRAND_BLUE = "#F0FBFF"; // Very transparent light blue
const LIGHT_BRAND_PINK = "#FFF0FB"; // Very transparent light pink

const HEART_BLUE = "#A0DFFF"; // Light blue for hearts
const HEART_PINK = "#FFB0E0"; // Light pink for hearts

export default function QuestionChatPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const { refreshNotifications } = useNotifications();
  const { questionId } = useLocalSearchParams<{ questionId: string }>();
  const { colors } = useTheme();
  const { isDarkMode } = useDarkTheme();
  const { t } = useLanguage();
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
  const [isPageVisible, setIsPageVisible] = useState(true);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/');
    }
  }, [user, loading, router]);

  // Track page visibility for notifications
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        setIsPageVisible(true);
        updateChatViewerStatus(true);
      } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        setIsPageVisible(false);
        updateChatViewerStatus(false);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [threadId, user?.id]);

  // Mark user as viewing when component mounts
  useEffect(() => {
    if (threadId && user?.id) {
      updateChatViewerStatus(true);
    }
  }, [threadId, user?.id]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (threadId && user?.id) {
        updateChatViewerStatus(false);
      }
    };
  }, [threadId, user?.id]);

  // Function to update chat viewer status in database
  const updateChatViewerStatus = async (isViewing: boolean) => {
    if (!threadId || !user?.id) {
      return;
    }
    
    try {
      if (isViewing) {
        await supabase
          .from('chat_viewers')
          .upsert({
            thread_id: threadId,
            user_id: user.id,
            is_viewing: true,
            last_seen: new Date().toISOString()
          }, {
            onConflict: 'thread_id,user_id'
          });
      } else {
        await supabase
          .from('chat_viewers')
          .update({ is_viewing: false })
          .eq('thread_id', threadId)
          .eq('user_id', user.id);
      }
    } catch (error) {
      // Silent error handling
    }
  };

  // Load chat data
  useEffect(() => {
    if (user && !loading && questionId) {
      loadChatData();
    }
  }, [user, loading, questionId]);

  // Set up real-time subscription for new messages using Supabase Realtime
  useEffect(() => {
    if (!threadId) return;

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
        async (payload) => {
          const newMessage = payload.new as ChatMessage;
          
          if (newMessage.sender_id !== user!.id) {
            setMessages(prev => [...prev, newMessage]);
            
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [threadId, user]);

  // Set up real-time subscription for new answers using Supabase Realtime
  useEffect(() => {
    if (!user || !questionId) return;

    const setupAnswersSubscription = async () => {
      try {
        const { data: coupleData } = await questionService.getCouple(user!.id);
        if (!coupleData) return;

        const { data: dailyQuestionData } = await questionService.getDailyQuestionForQuestion(
          coupleData.id, 
          questionId
        );

        if (!dailyQuestionData) return;

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
          .subscribe();

        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error('Error setting up Realtime answers subscription:', error);
      }
    };

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
    
    const isToday = today.toDateString() === scheduledDate.toDateString();
    
    return isToday;
  };

  const loadChatData = async () => {
    try {
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

      const { data: coupleData } = await questionService.getCouple(user!.id);
      if (!coupleData) {
        return;
      }

      setCoupleId(coupleData.id);

      if (coupleData.user1 && coupleData.user2) {
        if (coupleData.user1_id === user!.id) {
          setUserName(coupleData.user1.name || 'Moi');
          setPartnerName(coupleData.user2.name || 'Mon partenaire');
          setPartnerProfilePicture(coupleData.user2.profile_picture);
          setPartnerId(coupleData.user2_id);
        } else {
          setUserName(coupleData.user2.name || 'Moi');
          setPartnerName(coupleData.user1.name || 'Mon partenaire');
          setPartnerProfilePicture(coupleData.user1.profile_picture);
          setPartnerId(coupleData.user1_id);
        }
      }

      let { data: dailyQuestionData, error: dailyQuestionError } = await questionService.getDailyQuestionForQuestion(
        coupleData.id, 
        questionId
      );

      if (!dailyQuestionData) {
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

      if (!dailyQuestionData) {
        return;
      }

      const questionIsCurrent = checkIfQuestionIsCurrent(questionData, dailyQuestionData);
      setIsQuestionCurrent(questionIsCurrent);

      const { data: answersData } = await supabase
        .from('answers')
        .select(`
          *,
          user:profiles(name)
        `)
        .eq('daily_question_id', dailyQuestionData.id);

      setAnswers(answersData || []);
      
      const currentUserAnswer = answersData?.find(answer => answer.user_id === user!.id);
      setUserAnswered(!!currentUserAnswer);

      setBothAnswered(!!(answersData && answersData.length >= 2));

      const { data: thread, error: threadError } = await questionService.getOrCreateChatThread(
        dailyQuestionData.id, 
        coupleData.id
      );

      if (threadError) {
        return;
      }

      if (thread) {
        setThreadId(thread.id);
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
      const { data: coupleData } = await questionService.getCouple(user!.id);
      if (!coupleData) {
        alert(t('questionChat.coupleNotFound'));
        return;
      }

      let { data: dailyQuestion, error: dailyQuestionError } = await questionService.getDailyQuestionForQuestion(
        coupleData.id, 
        questionId
      );

      if (!dailyQuestion) {
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
          alert(t('questionChat.errorCreatingQuestion'));
          return;
        }
        dailyQuestion = newDailyQuestion;
      }

      if (!dailyQuestion) {
        alert(t('questionChat.errorCreatingDailyQuestion'));
        return;
      }

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
        alert(t('questionChat.errorSubmittingAnswer'));
        return;
      }

      setAnswerText('');
      setUserAnswered(true);
      loadChatData();

    } catch (error) {
      console.error('Error submitting answer:', error);
      alert(t('questionChat.errorSubmittingAnswer'));
    } finally {
      setSubmittingAnswer(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !threadId) {
      return;
    }

    const messageText = newMessage.trim();
    setNewMessage('');
    setSending(true);

    try {
      const { data: coupleData } = await questionService.getCouple(user!.id);
      if (!coupleData) {
        return;
      }

      let { data: dailyQuestionData, error: dailyQuestionError } = await questionService.getDailyQuestionForQuestion(
        coupleData.id, 
        questionId
      );

      if (!dailyQuestionData) {
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
      }

      if (!dailyQuestionData) {
        return;
      }

      const { data: newMsg, error } = await questionService.sendMessage(
        threadId, 
        user!.id, 
        messageText
      );

      if (error) {
        return;
      }

      if (newMsg) {
        setMessages(prev => [...prev, newMsg]);
        
        if (partnerId && coupleId) {
          try {
            const notificationData = {
              sender_id: user!.id,
              couple_id: coupleId,
              message_preview: messageText.substring(0, 100),
              question_id: questionId
            };
            
            const result = await simpleChatNotificationService.createNotification(notificationData);
            
            if (result.data && !result.error) {
              refreshNotifications();
            }
          } catch (error) {
            console.error('Error creating simple chat notification:', error);
          }
        }
        
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
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


  // Show loading while checking auth
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={BRAND_BLUE} />
        <Text style={styles.loadingText}>{t('questionChat.loading')}</Text>
      </View>
    );
  }

  // Don't render if not authenticated
  if (!user) {
    return null;
  }

  return (
    <AppLayout>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 100}
      >
        {/* Header - Exact match to image */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <MaterialCommunityIcons name="chevron-left" size={28} color="#374151" />
          </Pressable>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Question du jour</Text>
            <Text style={styles.headerSubtitle}>Avec {partnerName || 'Mon partenaire'}</Text>
          </View>
        </View>

        {/* Content */}
        {loadingChat ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={BRAND_BLUE} />
            <Text style={styles.loadingText}>{t('questionChat.loading')}</Text>
          </View>
        ) : (
          <>
            {/* Question Display - Gradient version */}
            <LinearGradient
              colors={[LIGHT_BRAND_BLUE, LIGHT_BRAND_PINK]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.questionDisplayContainer}
            >
              <View style={styles.questionContainer}>
                {/* Decorative Hearts - Custom Images */}
                <Image 
                  source={require('../../assets/images/pink-heart.png')} 
                  style={[styles.decorativeHeart, styles.topLeftHeart]} 
                />
                <Image 
                  source={require('../../assets/images/blue-heart.png')} 
                  style={[styles.decorativeHeart, styles.topRightHeart]} 
                />
                <Image 
                  source={require('../../assets/images/blue-heart.png')} 
                  style={[styles.decorativeHeart, styles.bottomLeftHeart]} 
                />
                <Image 
                  source={require('../../assets/images/pink-heart.png')} 
                  style={[styles.decorativeHeart, styles.bottomRightHeart]} 
                />
                
                {/* Main Question */}
                <Text style={styles.mainQuestionText}>
                  {question?.content || 'Les couples devraient-ils partager leurs mots de passe ?'}
                </Text>
                
                {/* Privacy Notice */}
                <Text style={styles.privacyNotice}>
                  Vos réponses sont confidentielles. Consultez notre politique de Confidentialité
                </Text>
              </View>
            </LinearGradient>

            {/* Chat Messages */}
            {threadId ? (
              <View style={styles.chatSection}>
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
                <Text style={styles.noChatText}>
                  {t('questionChat.answerFirst')}
                </Text>
              </View>
            )}

            {/* Input Bar - Clean version without attachments */}
            {threadId && (
              <View style={styles.inputBar}>
                <View style={styles.inputContainer}>
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
                        color={newMessage.trim() ? "#FFFFFF" : "#9CA3AF"} 
                      />
                    )}
                  </Pressable>
                </View>
              </View>
            )}
          </>
        )}
      </KeyboardAvoidingView>
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
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
    height: '10%',
    minHeight: 60,
  },
  backButton: {
    padding: 8,
    marginRight: 16,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6B7280',
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
  questionDisplayContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    height: '25%',
    minHeight: 160,
  },
  questionContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  decorativeHeart: {
    position: 'absolute',
    width: 60,
    height: 60,
    opacity: 0.3,
    transform: [{ rotate: '30deg' }],
  },
  topLeftHeart: {
    top: 20,
    left: 25,
  },
  topRightHeart: {
    top: 20,
    right: 25,
  },
  bottomLeftHeart: {
    bottom: 20,
    left: 25,
  },
  bottomRightHeart: {
    bottom: 20,
    right: 25,
  },
  mainQuestionText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 30,
  },
  privacyNotice: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 15,
  },
  avatarText: {
    fontSize: 20,
  },
  chatSection: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    height: '75%',
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
  },
  ownMessage: {
    justifyContent: 'flex-end',
  },
  partnerMessage: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 12,
  },
  messageAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
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
    backgroundColor: '#E0F2FE',
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
  noChatText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 20,
    fontStyle: 'italic',
    marginTop: 40,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  messageInput: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    color: '#374151',
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  sendButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
});
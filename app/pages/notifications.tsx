import { useDarkTheme } from '@/contexts/DarkThemeContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { useAuth } from '@/lib/auth';
import { dailyQuestionNotificationService } from '@/lib/dailyQuestionNotificationService';
import { notificationService } from '@/lib/notificationService';
import { useNotificationSettingsStore } from '@/lib/notificationSettingsStore';
import { simpleChatNotificationService } from '@/lib/simpleChatNotificationService';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    RefreshControl,
    ScrollView,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import AppLayout from '../app-layout';

// Combined notification type for unified display
interface CombinedNotification {
  id: string;
  type: 'notification' | 'chat' | 'daily_question' | 'simple_chat' | 'pulse' | 'upcoming_event' | 'quiz_invite';
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  data?: Record<string, any>;
  sender_name?: string;
  question_content?: string;
  message_preview?: string;
  emoji?: string;
  quiz_title?: string;
}

// Upcoming event interface
interface UpcomingEvent {
  id: string;
  title: string;
  event_date: string;
  event_time: string;
  place: string;
  description: string;
  alarmable: boolean;
  created_at: string;
}

// Grouped notifications by section
interface NotificationSection {
  title: string;
  notifications: CombinedNotification[];
  icon: string;
}

export default function NotificationsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { refreshNotifications, pulses } = useNotifications();
  const { isDarkMode } = useDarkTheme();
  const { settings: notificationSettings, initializeSettings } = useNotificationSettingsStore();
  const [notificationSections, setNotificationSections] = useState<NotificationSection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);


  // Group notifications by type and limit to 3 per section
  const groupNotificationsByType = (notifications: CombinedNotification[]): NotificationSection[] => {
    const sections: NotificationSection[] = [];

    // Upcoming events section (TOP PRIORITY) - Check settings
    const upcomingEventNotifications = notifications.filter(n => 
      n.type === 'upcoming_event'
    ).slice(0, 3);

    if (upcomingEventNotifications.length > 0 && notificationSettings?.upcoming_events !== false) {
      sections.push({
        title: 'Événements à venir',
        notifications: upcomingEventNotifications,
        icon: ''
      });
    }

    // Messages section (chat and simple_chat notifications) - Check settings
    const messageNotifications = notifications.filter(n => 
      n.type === 'chat' || n.type === 'simple_chat'
    ).slice(0, 3);
    
    if (messageNotifications.length > 0 && notificationSettings?.messages !== false) {
      sections.push({
        title: 'Messages',
        notifications: messageNotifications,
        icon: ''
      });
    }

    // Calendar section (event, todo, souvenir notifications)
    const calendarNotifications = notifications.filter(n => 
      n.type === 'notification' && n.data && (
        (typeof n.data === 'string' ? JSON.parse(n.data) : n.data).item_type === 'event' ||
        (typeof n.data === 'string' ? JSON.parse(n.data) : n.data).item_type === 'todo' ||
        (typeof n.data === 'string' ? JSON.parse(n.data) : n.data).item_type === 'souvenir' ||
        (typeof n.data === 'string' ? JSON.parse(n.data) : n.data).calendar_item_type === 'event' ||
        (typeof n.data === 'string' ? JSON.parse(n.data) : n.data).calendar_item_type === 'todo' ||
        (typeof n.data === 'string' ? JSON.parse(n.data) : n.data).calendar_item_type === 'souvenir'
      )
    ).slice(0, 3);

    if (calendarNotifications.length > 0) {
      sections.push({
        title: 'Calendrier',
        notifications: calendarNotifications,
        icon: ''
      });
    }

    // Daily Questions section - Check settings
    const dailyQuestionNotifications = notifications.filter(n => 
      n.type === 'daily_question'
    ).slice(0, 3);

    if (dailyQuestionNotifications.length > 0 && notificationSettings?.daily_questions !== false) {
      sections.push({
        title: 'Questions quotidiennes',
        notifications: dailyQuestionNotifications,
        icon: ''
      });
    }

    // Pulses section - Check settings
    const pulseNotifications = notifications.filter(n => 
      n.type === 'pulse'
    ).slice(0, 3);

    if (pulseNotifications.length > 0 && notificationSettings?.pulse !== false) {
      sections.push({
        title: 'Pulses',
        notifications: pulseNotifications,
        icon: ''
      });
    }

    // Quiz invitations section - Check settings
    const quizInviteNotifications = notifications.filter(n => 
      n.type === 'quiz_invite'
    ).slice(0, 3);

    if (quizInviteNotifications.length > 0 && notificationSettings?.quiz_invite !== false) {
      sections.push({
        title: 'Invitations au quiz',
        notifications: quizInviteNotifications,
        icon: ''
      });
    }

    // Other notifications section (general, couple_update)
    const otherNotifications = notifications.filter(n => 
      n.type === 'notification' && (!n.data || 
        !((typeof n.data === 'string' ? JSON.parse(n.data) : n.data).item_type === 'event' ||
          (typeof n.data === 'string' ? JSON.parse(n.data) : n.data).item_type === 'todo' ||
          (typeof n.data === 'string' ? JSON.parse(n.data) : n.data).item_type === 'souvenir' ||
          (typeof n.data === 'string' ? JSON.parse(n.data) : n.data).calendar_item_type === 'event' ||
          (typeof n.data === 'string' ? JSON.parse(n.data) : n.data).calendar_item_type === 'todo' ||
          (typeof n.data === 'string' ? JSON.parse(n.data) : n.data).calendar_item_type === 'souvenir'))
    ).slice(0, 3);

    if (otherNotifications.length > 0) {
      sections.push({
        title: 'Autres',
        notifications: otherNotifications,
        icon: ''
      });
    }

    return sections;
  };

  // Fetch upcoming events (happening in next 3 hours)
  const fetchUpcomingEvents = useCallback(async (): Promise<CombinedNotification[]> => {
    if (!user?.id) return [];

    try {
      const now = new Date();
      const threeHoursFromNow = new Date(now.getTime() + (3 * 60 * 60 * 1000));

      // Get user's couple_id first
      const { data: coupleData, error: coupleError } = await supabase
        .from('couples')
        .select('id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .single();

      if (coupleError || !coupleData) {
        console.log('No couple found for user');
        return [];
      }

      // Fetch events happening in the next 3 hours
      const { data: eventsData, error: eventsError } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('couple_id', coupleData.id)
        .eq('alarmable', true)
        .gte('event_date', now.toISOString().split('T')[0])
        .order('event_date', { ascending: true })
        .order('event_time', { ascending: true });

      if (eventsError) {
        console.error('Error fetching upcoming events:', eventsError);
        return [];
      }

      if (!eventsData || eventsData.length === 0) {
        return [];
      }

      // Filter events to only include those happening within the next 3 hours
      const upcomingEventNotifications: CombinedNotification[] = [];
      
      eventsData.forEach(event => {
        const eventDateTime = new Date(`${event.event_date}T${event.event_time || '00:00'}`);
        const timeUntilEvent = eventDateTime.getTime() - now.getTime();
        
        // Only include events happening within the next 3 hours (180 minutes)
        if (timeUntilEvent > 0 && timeUntilEvent <= (3 * 60 * 60 * 1000)) {
          const hoursUntilEvent = Math.floor(timeUntilEvent / (1000 * 60 * 60));
          const minutesUntilEvent = Math.floor((timeUntilEvent % (1000 * 60 * 60)) / (1000 * 60));

          let timeMessage = '';
          if (hoursUntilEvent > 0) {
            timeMessage = `dans ${hoursUntilEvent}h${minutesUntilEvent > 0 ? ` ${minutesUntilEvent}min` : ''}`;
          } else {
            timeMessage = `dans ${minutesUntilEvent}min`;
          }

          upcomingEventNotifications.push({
            id: `upcoming_event_${event.id}`,
            type: 'upcoming_event',
            title: `Événement à venir: ${event.title}`,
            message: `${event.title} ${timeMessage}${event.place ? ` à ${event.place}` : ''}`,
            created_at: event.created_at,
            is_read: false,
            priority: 'high',
            data: {
              event_id: event.id,
              event_date: event.event_date,
              event_time: event.event_time,
              place: event.place,
              description: event.description,
            },
          });
        }
      });

      console.log('Upcoming events fetched:', upcomingEventNotifications);
      return upcomingEventNotifications;

    } catch (error) {
      console.error('Error fetching upcoming events:', error);
      return [];
    }
  }, [user?.id]);

  // Fetch all notification types
  const fetchAllNotifications = useCallback(async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      setError(null);
      
      console.log('👤 Fetching notifications for user:', user.id);

      // Get couple ID for chat notifications
      const { data: coupleData } = await supabase
        .from('couples')
        .select('id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .single();

      const coupleId = coupleData?.id;

      // Fetch all notification types in parallel
      const [
        generalNotifications,
        chatNotifications,
        dailyQuestionNotifications,
        simpleChatNotifications,
        upcomingEvents,
      ] = await Promise.all([
        // Fetch ALL notifications from the notifications table without any filters
        supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        coupleId ? supabase
          .from('chat_notifications')
          .select('*')
          .eq('receiver_id', user.id)
          .eq('is_read', false)
          .order('created_at', { ascending: false })
          .limit(20) : Promise.resolve({ data: [], error: null }),
        dailyQuestionNotificationService.getDailyQuestionNotifications(user.id, 20),
        coupleId ? simpleChatNotificationService.getNotifications(user.id, coupleId, 10) : Promise.resolve({ data: [], error: null }),
        fetchUpcomingEvents(),
      ]);

      // Debug logging
      console.log('🔍 Notifications fetch results:');
      console.log('General notifications:', generalNotifications.data?.length || 0, generalNotifications.error);
      console.log('Chat notifications:', chatNotifications.data?.length || 0, chatNotifications.error);
      console.log('Daily question notifications:', dailyQuestionNotifications.data?.length || 0, dailyQuestionNotifications.error);
      console.log('Simple chat notifications:', simpleChatNotifications.data?.length || 0, simpleChatNotifications.error);
      console.log('Upcoming events:', upcomingEvents.length);
      
      if (generalNotifications.data) {
        console.log('📋 General notifications data:', generalNotifications.data);
      }

      // Combine all notifications into a unified format
      const combinedNotifications: CombinedNotification[] = [];

      // Add general notifications (from notifications table)
      if (generalNotifications.data) {
        console.log('📝 Processing general notifications:', generalNotifications.data.length);
        
        // Process quiz invitations separately to fetch quiz titles
        const quizInvitations = generalNotifications.data.filter(n => n.type === 'quiz_invite');
        const otherNotifications = generalNotifications.data.filter(n => n.type !== 'quiz_invite');
        
        // Fetch quiz titles for quiz invitations
        if (quizInvitations.length > 0) {
          console.log('🧠 Processing quiz invitations:', quizInvitations.length);
          
          // Extract quiz IDs from quiz invitations
          const quizIds = quizInvitations.map(notification => {
            try {
              const quizData = typeof notification.data === 'string' ? JSON.parse(notification.data) : notification.data || {};
              let quizId = quizData.quiz_id || quizData.id;
              
              // If no quiz ID in data, try to extract UUID from message
              if (!quizId && notification.message) {
                const uuidMatch = notification.message.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi);
                if (uuidMatch && uuidMatch.length > 0) {
                  quizId = uuidMatch[0]; // Take the first UUID found
                }
              }
              
              return quizId;
            } catch (e) {
              return null;
            }
          }).filter(id => id);
          
          // Fetch quiz titles from quizzes table
          let quizTitles = {};
          if (quizIds.length > 0) {
            const { data: quizzesData, error: quizzesError } = await supabase
              .from('quizzes')
              .select('id, title')
              .in('id', quizIds);
              
            if (!quizzesError && quizzesData) {
              quizTitles = quizzesData.reduce((acc, quiz) => {
                acc[quiz.id] = quiz.title;
                return acc;
              }, {});
              console.log('📚 Quiz titles fetched:', quizTitles);
            }
          }
          
          // Process quiz invitations with fetched titles
          quizInvitations.forEach(notification => {
            // Parse quiz data from notification.data
            let quizData: any = {};
            try {
              quizData = typeof notification.data === 'string' ? JSON.parse(notification.data) : notification.data || {};
            } catch (e) {
              console.log('Error parsing quiz notification data:', e);
            }
            
            // Get quiz ID and fetch title from our fetched data
            let quizId = quizData.quiz_id || quizData.id;
            
            // If no quiz ID in data, try to extract UUID from message
            if (!quizId && notification.message) {
              const uuidMatch = notification.message.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi);
              if (uuidMatch && uuidMatch.length > 0) {
                quizId = uuidMatch[0]; // Take the first UUID found
              }
            }
            
            const quizName = quizTitles[quizId] || 
                           quizData.quiz_title || 
                           quizData.quiz_name || 
                           quizData.title || 
                           quizData.name ||
                           'Quiz';
            
            // Extract sender name
            const senderName = quizData.sender_name || 
                             quizData.sender_first_name || 
                             quizData.sender_username || 
                             'Quelqu\'un';
            
            // Create a clean message without UUIDs
            const cleanMessage = notification.message ? 
              notification.message.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, quizName) :
              `${senderName} vous invite à participer au quiz "${quizName}"`;

            combinedNotifications.push({
              id: notification.id,
              type: 'quiz_invite',
              title: `Invitation au quiz: ${quizName}`,
              message: cleanMessage,
              is_read: notification.is_read,
              created_at: notification.created_at,
              priority: notification.priority,
              sender_name: senderName,
              quiz_title: quizName,
              data: notification.data,
            });
          });
        }
        
        // Add other notifications
        otherNotifications.forEach(notification => {
          combinedNotifications.push({
            id: notification.id,
            type: 'notification',
            title: notification.title,
            message: notification.message,
            is_read: notification.is_read,
            created_at: notification.created_at,
            priority: notification.priority,
            data: notification.data,
          });
        });
      } else {
        console.log('❌ No general notifications data found');
      }

      // Add chat notifications
      if (chatNotifications.data) {
        chatNotifications.data.forEach(notification => {
          combinedNotifications.push({
            id: notification.id,
            type: 'chat',
            title: 'Nouveau message',
            message: notification.message_preview || 'Vous avez reçu un nouveau message',
            is_read: notification.is_read,
            created_at: notification.created_at,
            sender_name: notification.sender_name,
            question_content: notification.question_content,
          });
        });
      }

      // Add daily question notifications
      if (dailyQuestionNotifications.data) {
        dailyQuestionNotifications.data.forEach(notification => {
          combinedNotifications.push({
            id: notification.id,
            type: 'daily_question',
            title: 'Question quotidienne',
            message: notification.question_content,
            is_read: notification.is_read,
            created_at: notification.created_at,
            question_content: notification.question_content,
          });
        });
      }

      // Add simple chat notifications
      if (simpleChatNotifications.data) {
        simpleChatNotifications.data.forEach(notification => {
          combinedNotifications.push({
            id: notification.id,
            type: 'simple_chat',
            title: 'Message de chat',
            message: notification.message_preview || 'Nouveau message dans le chat',
            is_read: false, // Simple chat notifications don't have is_read field
            created_at: notification.created_at,
            message_preview: notification.message_preview,
          });
        });
      }

      // Add pulses from notification context
      if (pulses) {
        pulses.forEach(pulse => {
          combinedNotifications.push({
            id: pulse.id,
            type: 'pulse',
            title: 'Pulse reçu',
            message: pulse.message || 'Vous avez reçu un pulse',
            is_read: pulse.is_read,
            created_at: pulse.created_at,
            emoji: pulse.emoji,
          });
        });
      }

      // Add upcoming events
      if (upcomingEvents && upcomingEvents.length > 0) {
        combinedNotifications.push(...upcomingEvents);
      }

      // Sort by creation date (newest first)
      combinedNotifications.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      console.log('🎯 Final combined notifications:', combinedNotifications.length);
      console.log('📊 Combined notifications details:', combinedNotifications.map(n => ({ 
        id: n.id, 
        type: n.type, 
        title: n.title, 
        created_at: n.created_at 
      })));

      // Group notifications by type and limit to 3 per section
      const groupedNotifications = groupNotificationsByType(combinedNotifications);
      setNotificationSections(groupedNotifications);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError('Erreur lors du chargement des notifications');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, fetchUpcomingEvents]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchAllNotifications();
    await refreshNotifications(); // Refresh the notification context
    setIsRefreshing(false);
  }, [fetchAllNotifications, refreshNotifications]);

  // Mark notification as read
  const markAsRead = async (notification: CombinedNotification) => {
    try {
      switch (notification.type) {
        case 'notification':
          await notificationService.markAsRead(notification.id);
          break;
        case 'chat':
          await supabase
            .from('chat_notifications')
            .update({ is_read: true })
            .eq('id', notification.id);
          break;
        case 'daily_question':
          await dailyQuestionNotificationService.markAsRead(notification.id);
          break;
        case 'simple_chat':
          await simpleChatNotificationService.deleteNotification(notification.id);
          break;
        case 'pulse':
          await supabase
            .from('pulses')
            .update({ is_read: true })
            .eq('id', notification.id);
          break;
        case 'upcoming_event':
          // Upcoming events are just visual notifications, no need to mark as read in database
          break;
        case 'quiz_invite':
          // Navigate to the quiz when clicked
          try {
            const quizData = typeof notification.data === 'string' ? JSON.parse(notification.data) : notification.data || {};
            let quizId = quizData.quiz_id || quizData.id;
            
            console.log('🧠 Quiz notification clicked, quizData:', quizData);
            console.log('🧠 Initial quizId:', quizId);
            
            // If no quiz ID in data, try to extract UUID from message
            if (!quizId && notification.message) {
              const uuidMatch = notification.message.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi);
              if (uuidMatch && uuidMatch.length > 0) {
                quizId = uuidMatch[0];
                console.log('🧠 Extracted quizId from message:', quizId);
              }
            }
            
            console.log('🧠 Final quizId:', quizId);
            
            if (quizId) {
              console.log('🧠 Navigating to quiz:', `/quizz?quizId=${quizId}`);
              router.push(`/quizz?quizId=${quizId}` as any);
            } else {
              console.log('🧠 No quizId found, cannot navigate');
            }
          } catch (error) {
            console.error('Error navigating to quiz:', error);
          }
          break;
      }

      // Update local state
      setNotificationSections(prev => 
        prev.map(section => ({
          ...section,
          notifications: section.notifications.map(n => 
            n.id === notification.id 
              ? { ...n, is_read: true }
              : n
          )
        }))
      );
    } catch (err) {
      console.error('Error marking notification as read:', err);
      Alert.alert('Erreur', 'Impossible de marquer la notification comme lue');
    }
  };

  // Delete notification
  const deleteNotification = async (notification: CombinedNotification) => {
    Alert.alert(
      'Supprimer la notification',
      'Êtes-vous sûr de vouloir supprimer cette notification ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              switch (notification.type) {
                case 'notification':
                  await notificationService.deleteNotification(notification.id);
                  break;
                case 'chat':
                  await supabase
                    .from('chat_notifications')
                    .update({ is_read: true })
                    .eq('id', notification.id);
                  break;
                case 'daily_question':
                  // Daily question notifications cannot be deleted by users
                  break;
                case 'simple_chat':
                  await simpleChatNotificationService.deleteNotification(notification.id);
                  break;
                case 'pulse':
                  await supabase
                    .from('pulses')
                    .update({ is_read: true })
                    .eq('id', notification.id);
                  break;
                case 'upcoming_event':
                  // Upcoming events are just visual notifications, no need to delete from database
                  break;
                case 'quiz_invite':
                  // Quiz invitations can be declined (which removes them from pending status)
                  await supabase
                    .from('quiz_invites')
                    .update({ status: 'declined' })
                    .eq('id', notification.id);
                  break;
              }

              // Remove from local state
              setNotificationSections(prev => 
                prev.map(section => ({
                  ...section,
                  notifications: section.notifications.filter(n => n.id !== notification.id)
                })).filter(section => section.notifications.length > 0)
              );
            } catch (err) {
              console.error('Error deleting notification:', err);
              Alert.alert('Erreur', 'Impossible de supprimer la notification');
            }
          },
        },
      ]
    );
  };

  // Mark all as read
  const markAllAsRead = async () => {
    Alert.alert(
      'Marquer tout comme lu',
      'Êtes-vous sûr de vouloir marquer toutes les notifications comme lues ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Marquer tout',
          onPress: async () => {
            try {
              if (user?.id) {
                await notificationService.markAllAsRead(user.id);
                await dailyQuestionNotificationService.markAllAsRead(user.id);
                
                // Update local state
                setNotificationSections(prev => 
                  prev.map(section => ({
                    ...section,
                    notifications: section.notifications.map(n => ({ ...n, is_read: true }))
                  }))
                );
              }
            } catch (err) {
              console.error('Error marking all as read:', err);
              Alert.alert('Erreur', 'Impossible de marquer toutes les notifications comme lues');
            }
          },
        },
      ]
    );
  };

  // Format time ago
  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'À l\'instant';
    if (diffInMinutes < 60) return `Il y a ${diffInMinutes} min`;
    if (diffInMinutes < 1440) return `Il y a ${Math.floor(diffInMinutes / 60)}h`;
    return `Il y a ${Math.floor(diffInMinutes / 1440)}j`;
  };

  // Get notification icon based on type and data
  const getNotificationIcon = (notification: CombinedNotification) => {
    // Return empty string to remove all emojis
    return '';
  };

  // Get priority color
  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'urgent':
        return '#FF4444';
      case 'high':
        return '#FF8800';
      case 'normal':
        return '#4CAF50';
      case 'low':
        return '#9E9E9E';
      default:
        return '#4CAF50';
    }
  };

  // Render notification item
  const renderNotificationItem = ({ item }: { item: CombinedNotification }) => (
    <TouchableOpacity
      className={`rounded-xl p-4 mb-3 border ${
        isDarkMode 
          ? `${item.type === 'upcoming_event' ? 'bg-red-900/20 border-red-500' : !item.is_read ? 'bg-dark-surface border-gray-600' : 'bg-dark-surface border-dark-border'}`
          : `${item.type === 'upcoming_event' ? 'bg-red-50 border-red-500' : !item.is_read ? 'bg-blue-50 border-gray-300' : 'bg-gray-50 border-gray-200'}`
      }`}
      onPress={() => markAsRead(item)}
      onLongPress={() => deleteNotification(item)}
    >
      <View className="flex-row items-start">
        <View className="flex-1 mr-3">
          <View className="flex-row items-center mb-1.5">
            {item.type === 'upcoming_event' && (
              <Text className="text-lg mr-2">🚨</Text>
            )}
            {item.type === 'quiz_invite' && (
              <Text className="text-lg mr-2">🧠</Text>
            )}
            <Text className={`text-base font-semibold ${isDarkMode ? 'text-dark-text' : 'text-text'}`}>
              {item.title}
            </Text>
          </View>
          <Text className={`text-sm leading-5 mb-2 ${isDarkMode ? 'text-dark-text-secondary' : 'text-textSecondary'}`} numberOfLines={2}>
            {item.message}
          </Text>
          {item.sender_name && item.type !== 'pulse' && (
            <Text className={`text-xs italic mt-1 ${isDarkMode ? 'text-dark-text-secondary' : 'text-textSecondary'}`}>
              De: {item.sender_name}
            </Text>
          )}
          {item.type === 'pulse' && item.emoji && (
            <View className="mt-2 items-center">
              <Text className="text-3xl">{item.emoji}</Text>
            </View>
          )}
          {/* Display additional event/todo details if available */}
          {item.type === 'notification' && item.data && (
            <View className="mt-1.5">
              {(() => {
                try {
                  const data = typeof item.data === 'string' ? JSON.parse(item.data) : item.data;
                  if (data.item_title || data.calendar_item_title) {
                    return (
                      <Text className={`text-xs mt-0.5 ${isDarkMode ? 'text-dark-text-secondary' : 'text-textSecondary'}`}>
                        📋 {data.item_title || data.calendar_item_title}
                      </Text>
                    );
                  }
                  if (data.item_date || data.calendar_item_date) {
                    const date = new Date(data.item_date || data.calendar_item_date);
                    return (
                      <Text className={`text-xs mt-0.5 ${isDarkMode ? 'text-dark-text-secondary' : 'text-textSecondary'}`}>
                        📅 {date.toLocaleDateString('fr-FR')}
                      </Text>
                    );
                  }
                  if (data.item_place || data.calendar_item_place) {
                    return (
                      <Text className={`text-xs mt-0.5 ${isDarkMode ? 'text-dark-text-secondary' : 'text-textSecondary'}`}>
                        📍 {data.item_place || data.calendar_item_place}
                      </Text>
                    );
                  }
                } catch (e) {
                  // Ignore JSON parsing errors
                }
                return null;
              })()}
            </View>
          )}
        </View>
        <View className="items-end">
          <Text className={`text-xs mb-1 ${isDarkMode ? 'text-dark-text-secondary' : 'text-textSecondary'}`}>
            {getTimeAgo(item.created_at)}
          </Text>
          {item.priority && (
            <View
              className="w-2 h-2 rounded-full mb-1"
              style={{ backgroundColor: getPriorityColor(item.priority) }}
            />
          )}
          {!item.is_read && (
            <View className="w-2 h-2 rounded-full bg-green-500" />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  // Load notifications on mount
  useEffect(() => {
    const initializeAndFetch = async () => {
      // Initialize settings from AsyncStorage first
      await initializeSettings();
      // Then fetch notifications
      await fetchAllNotifications();
    };
    
    initializeAndFetch();
  }, [fetchAllNotifications, initializeSettings]);

  if (isLoading) {
    return (
      <AppLayout>
        <View className={`flex-1 ${isDarkMode ? 'bg-dark-bg' : 'bg-background'} justify-center items-center`}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text className={`mt-4 text-base ${isDarkMode ? 'text-dark-text' : 'text-text'}`}>
            Chargement des notifications...
          </Text>
        </View>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <View className={`flex-1 ${isDarkMode ? 'bg-dark-bg' : 'bg-background'} justify-center items-center px-5`}>
          <Text className={`text-base ${isDarkMode ? 'text-red-400' : 'text-red-500'} mb-5 text-center`}>{error}</Text>
          <TouchableOpacity 
            className="bg-green-500 px-5 py-2.5 rounded-lg"
            onPress={fetchAllNotifications}
          >
            <Text className="text-white font-semibold text-center">Réessayer</Text>
          </TouchableOpacity>
        </View>
      </AppLayout>
    );
  }

  const unreadCount = notificationSections.reduce((total, section) => 
    total + section.notifications.filter(n => !n.is_read).length, 0
  );

  return (
    <AppLayout>
      <View className={`flex-1 ${isDarkMode ? 'bg-dark-bg' : 'bg-background'}`}>
        {/* Header */}
        <View className={`flex-row justify-between items-center px-5 pt-4 pb-5 ${isDarkMode ? 'bg-dark-bg' : 'bg-background'}`}>
          <View className="flex-row items-center">
            <TouchableOpacity 
              className="mr-3 p-2"
              onPress={() => router.back()}
            >
              <Text className={`text-lg ${isDarkMode ? 'text-dark-text' : 'text-text'}`}>←</Text>
            </TouchableOpacity>
            <Text className={`text-2xl font-bold ${isDarkMode ? 'text-dark-text' : 'text-text'}`}>
              Notifications
            </Text>
          </View>
          <View className="flex-row items-center">
            {unreadCount > 0 && (
              <View className="bg-red-500 rounded-full px-2 py-1">
                <Text className="text-white text-xs font-bold">{unreadCount}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Content */}
        {notificationSections.length === 0 ? (
          <View className="flex-1 justify-center items-center px-10">
            <Text className="text-6xl mb-5">🔔</Text>
            <Text className={`text-xl font-bold mb-3 ${isDarkMode ? 'text-dark-text' : 'text-text'}`}>
              Aucune notification
            </Text>
            <Text className={`text-center ${isDarkMode ? 'text-dark-text-secondary' : 'text-textSecondary'} leading-6`}>
              Vous n'avez pas de nouvelles notifications pour le moment.
            </Text>
          </View>
        ) : (
          <ScrollView
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                colors={['#4CAF50']}
                tintColor="#4CAF50"
              />
            }
            className="flex-1 px-5"
            showsVerticalScrollIndicator={false}
          >
            {notificationSections.map((section, sectionIndex) => (
              <View key={sectionIndex} className="mb-8">
                <View className="mb-4">
                  <Text className={`text-lg font-semibold ${isDarkMode ? 'text-dark-text' : 'text-text'}`}>
                    {section.title}
                  </Text>
                </View>
                {section.notifications.map((notification) => (
                  <View key={notification.id}>
                    {renderNotificationItem({ item: notification })}
                  </View>
                ))}
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </AppLayout>
  );
}


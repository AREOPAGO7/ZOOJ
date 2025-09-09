import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Pressable,
    ScrollView,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { CreateItemModal } from '../../components/CreateItemModal';
import { useDarkTheme } from '../../contexts/DarkThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useEventNotifications } from '../../hooks/useEventNotifications';
import { useProfileCompletion } from '../../hooks/useProfileCompletion';
import { useAuth } from '../../lib/auth';
import { toLocalDateString, toLocalTimeString } from '../../lib/dateUtils';
import { supabase } from '../../lib/supabase';
import AppLayout from '../app-layout';
import { BRAND_BLUE, BRAND_GRAY, BRAND_PINK, calendarStyles } from './calendrier.styles';

interface CalendarEvent {
  id: string;
  title: string;
  event_date: string;
  event_time: string;
  place: string;
  description: string;
  alarmable: boolean;
  created_at: string;
}

interface CalendarSouvenir {
  id: string;
  title: string;
  memory_date: string;
  memory_time: string;
  place: string;
  description: string;
  image_url: string;
  created_at: string;
}

interface CalendarTodo {
  id: string;
  title: string;
  description: string;
  due_date: string;
  priority: 'urgent' | 'normal' | 'peut_attendre';
  status: 'a_faire' | 'en_cours' | 'termine';
  created_at: string;
}

type CalendarItemType = 'event' | 'souvenir' | 'todo';

export default function CalendrierPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { isProfileComplete, isLoading: profileLoading } = useProfileCompletion();
  const { isDarkMode } = useDarkTheme();
  const { colors } = useTheme();
  const { t } = useLanguage();
  
  // Event notification system - automatically checks for tomorrow's events
  const {
    isChecking,
    lastCheckResult,
    upcomingEvents,
    hasUpcomingEvents,
    nextEvent,
    eventsThisWeek,
    manualCheck,
    refreshUpcomingEvents
  } = useEventNotifications();
  
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [souvenirs, setSouvenirs] = useState<CalendarSouvenir[]>([]);
  const [todos, setTodos] = useState<CalendarTodo[]>([]);
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);

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

  // Load calendar data when couple ID is available
  useEffect(() => {
    if (coupleId) {
      loadCalendarData();
    }
  }, [coupleId]);

  const getCoupleId = async () => {
    try {
      const { data: couple, error } = await supabase
        .from('couples')
        .select('id')
        .or(`user1_id.eq.${user?.id},user2_id.eq.${user?.id}`)
        .single();

      if (couple) {
        setCoupleId(couple.id);
      }
    } catch (error) {
      console.error('Error getting couple ID:', error);
      Alert.alert(t('calendar.error'), 'Impossible de récupérer les informations du couple');
    }
  };

  const loadCalendarData = async () => {
    if (!coupleId) return;
    
    try {
      // Load all calendar data in parallel
      const [eventsResult, souvenirsResult, todosResult] = await Promise.all([
        supabase
          .from('calendar_events')
          .select('*')
          .eq('couple_id', coupleId)
          .order('event_date', { ascending: true }),
        supabase
          .from('calendar_souvenirs')
          .select('*')
          .eq('couple_id', coupleId)
          .order('memory_date', { ascending: true }),
        supabase
          .from('calendar_todos')
          .select('*')
          .eq('couple_id', coupleId)
          .order('due_date', { ascending: true })
      ]);

      if (eventsResult.error) throw eventsResult.error;
      if (souvenirsResult.error) throw souvenirsResult.error;
      if (todosResult.error) throw todosResult.error;

      setEvents(eventsResult.data || []);
      setSouvenirs(souvenirsResult.data || []);
      setTodos(todosResult.data || []);
    } catch (error) {
      console.error('Error loading calendar data:', error);
      Alert.alert(t('calendar.error'), 'Impossible de charger les données du calendrier');
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    const days = [];
    
    // Add empty cells for days before the first day of the month
    const firstDayOfWeek = firstDay.getDay(); // 0 = Sunday, 1 = Monday, etc.
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null); // Empty cell
    }
    
    // Add all days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    
    // Add empty cells to fill the remaining weeks (ensure we always have 42 cells = 6 weeks)
    const totalCells = 42; // 6 weeks × 7 days
    while (days.length < totalCells) {
      days.push(null); // Empty cell
    }
    
    return days;
  };

  const getItemsForDate = (date: Date) => {
    // Format date consistently
    const dateStr = date.toISOString().split('T')[0];
    
    // Filter events for this specific date
    const dayEvents = events.filter(event => {
      const eventDate = event.event_date;
      return eventDate === dateStr;
    });
    
    const daySouvenirs = souvenirs.filter(souvenir => souvenir.memory_date === dateStr);
    const dayTodos = todos.filter(todo => todo.due_date === dateStr);
    
    return { events: dayEvents, souvenirs: daySouvenirs, todos: dayTodos };
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
  };

  const toggleTodoStatus = async (todo: CalendarTodo) => {
    try {
      const newStatus = todo.status === 'termine' ? 'a_faire' : 'termine';
      
      const { error } = await supabase
        .from('calendar_todos')
        .update({ status: newStatus })
        .eq('id', todo.id);

      if (error) throw error;

      // Update local state
      setTodos(prevTodos => 
        prevTodos.map(t => 
          t.id === todo.id ? { ...t, status: newStatus } : t
        )
      );

      Alert.alert(t('calendar.success'), t('calendar.taskUpdated'));
    } catch (error) {
      Alert.alert(t('calendar.error'), 'Impossible de mettre à jour la tâche');
    }
  };

  const openAddModal = () => {
    setShowAddModal(true);
  };

  const closeAddModal = () => {
    setShowAddModal(false);
  };

  const handleItemSaved = (item: any) => {
    // Add the new item to the appropriate list
    if (item.type === 'event') {
      setEvents(prev => [...prev, item]);
    } else if (item.type === 'souvenir') {
      setSouvenirs(prev => [...prev, item]);
    } else if (item.type === 'todo') {
      setTodos(prev => [...prev, item]);
      }

      Alert.alert(t('calendar.success'), t('calendar.itemAdded'));
    setShowAddModal(false);
  };

  const openItemDetails = (item: any, type: CalendarItemType) => {
    setSelectedItem({ ...item, type });
    // Navigate to details page instead of opening modal
    if (type === 'todo') {
      router.push({
        pathname: '/pages/todo-details',
        params: { 
          todoId: item.id
        }
      });
    } else {
      router.push({
        pathname: '/pages/item-details',
        params: { 
          itemType: type,
          itemId: item.id,
          itemData: JSON.stringify(item)
        }
      });
    }
  };

  const updateItemDate = async (item: any, newDate: Date, newTime: Date) => {
    if (!coupleId) return;

    try {
      let result;

      if (item.type === 'event') {
        const { data, error } = await supabase
          .from('calendar_events')
          .update({
            event_date: toLocalDateString(newDate),
            event_time: toLocalTimeString(newTime)
          })
          .eq('id', item.id)
          .select()
          .single();

        if (error) throw error;
        result = data;
        setEvents(prev => prev.map(e => e.id === item.id ? data : e));
      } else if (item.type === 'souvenir') {
        const { data, error } = await supabase
          .from('calendar_souvenirs')
          .update({
            memory_date: toLocalDateString(newDate),
            memory_time: toLocalTimeString(newTime)
          })
          .eq('id', item.id)
          .select()
          .single();

        if (error) throw error;
        result = data;
        setSouvenirs(prev => prev.map(s => s.id === item.id ? data : s));
      }

      Alert.alert(t('calendar.success'), t('calendar.itemUpdated'));
      setSelectedItem(null);
    } catch (error) {
      console.error('Error updating item:', error);
      Alert.alert(t('calendar.error'), 'Impossible de mettre à jour la date');
    }
  };

  // Function to update event alarmable status
  const updateEventAlarmable = async (eventId: string, alarmable: boolean) => {
    if (!coupleId) return;

    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .update({ alarmable })
        .eq('id', eventId)
        .select()
        .single();

      if (error) throw error;
      
      // Update local state
      setEvents(prev => prev.map(e => e.id === eventId ? data : e));
      
      Alert.alert(
        t('calendar.success'), 
        alarmable 
          ? t('calendar.remindersEnabled')
          : t('calendar.remindersDisabled')
      );
    } catch (error) {
      console.error('Error updating event alarmable status:', error);
      Alert.alert(t('calendar.error'), 'Impossible de mettre à jour le statut des rappels');
    }
  };

  const deleteItem = async (item: any) => {
    Alert.alert(
      t('calendar.confirmDelete'),
      '',
      [
        { text: t('calendar.cancel'), style: 'cancel' },
        {
          text: t('calendar.delete'),
          style: 'destructive',
          onPress: async () => {
            if (!coupleId) return;

            try {
              let error;

              if (item.type === 'event') {
                const { error: deleteError } = await supabase
                  .from('calendar_events')
                  .delete()
                  .eq('id', item.id);
                error = deleteError;
                if (!error) {
                  setEvents(prev => prev.filter(e => e.id !== item.id));
                }
              } else if (item.type === 'souvenir') {
                const { error: deleteError } = await supabase
                  .from('calendar_souvenirs')
                  .delete()
                  .eq('id', item.id);
                error = deleteError;
                if (!error) {
                  setSouvenirs(prev => prev.filter(s => s.id !== item.id));
                }
              } else if (item.type === 'todo') {
                const { error: deleteError } = await supabase
                  .from('calendar_todos')
                  .delete()
                  .eq('id', item.id);
                error = deleteError;
                if (!error) {
                  setTodos(prev => prev.filter(t => t.id !== item.id));
                }
              }

              if (error) throw error;
              Alert.alert(t('calendar.success'), t('calendar.itemDeleted'));
              setSelectedItem(null);
            } catch (error) {
              console.error('Error deleting item:', error);
              Alert.alert(t('calendar.error'), 'Impossible de supprimer l\'élément');
            }
          }
        }
      ]
    );
  };

  const deleteItemDirectly = async (item: any) => {
    console.log('deleteItemDirectly called with:', { item, coupleId });
    if (!coupleId) {
      console.log('No coupleId, cannot delete');
      Alert.alert(t('calendar.error'), 'Impossible de supprimer - ID du couple manquant');
      return;
    }

    try {
      console.log('Starting deletion for item type:', item.type);
      let error;

      if (item.type === 'event') {
        console.log('Deleting event with ID:', item.id);
        const { error: deleteError } = await supabase
          .from('calendar_events')
          .delete()
          .eq('id', item.id);
        error = deleteError;
        if (!error) {
          setEvents(prev => prev.filter(e => e.id !== item.id));
          console.log('Event deleted successfully');
        }
      } else if (item.type === 'souvenir') {
        console.log('Deleting souvenir with ID:', item.id);
        const { error: deleteError } = await supabase
          .from('calendar_souvenirs')
          .delete()
          .eq('id', item.id);
        error = deleteError;
        if (!error) {
          setSouvenirs(prev => prev.filter(s => s.id !== item.id));
          console.log('Souvenir deleted successfully');
        }
      } else if (item.type === 'todo') {
        console.log('Deleting todo with ID:', item.id);
        const { error: deleteError } = await supabase
          .from('calendar_todos')
          .delete()
          .eq('id', item.id);
        error = deleteError;
        if (!error) {
          setTodos(prev => prev.filter(t => t.id !== item.id));
          console.log('Todo deleted successfully');
        }
      }

      if (error) {
        console.log('Supabase error:', error);
        throw error;
      }
                    Alert.alert(t('calendar.success'), t('calendar.itemDeleted'));
              setSelectedItem(null);
    } catch (error) {
      console.error('Error deleting item:', error);
      Alert.alert(t('calendar.error'), 'Impossible de supprimer l\'élément');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return '#FF5722';
      case 'normal': return '#FF9800';
      case 'peut_attendre': return '#4CAF50';
      default: return BRAND_GRAY;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'a_faire': return BRAND_PINK;
      case 'en_cours': return BRAND_BLUE;
      case 'termine': return '#4CAF50';
      default: return BRAND_GRAY;
    }
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    return `${hours}:${minutes}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
    return `${date.getDate()} ${months[date.getMonth()]}`;
  };

  // Show loading while checking auth or profile completion
  if (loading || profileLoading) {
    return (
      <View className={`flex-1 justify-center items-center ${isDarkMode ? 'bg-dark-bg' : 'bg-background'}`}>
        <Text className={`text-lg ${isDarkMode ? 'text-dark-text-secondary' : 'text-text-secondary'}`}>{t('calendar.loading')}</Text>
      </View>
    );
  }

  // Don't render if not authenticated or profile not completed
  if (!user || !isProfileComplete) {
    return null;
  }

  const selectedDateItems = getItemsForDate(selectedDate);

  return (
    <AppLayout>
      <ScrollView 
        className={`flex-1 ${isDarkMode ? 'bg-dark-bg' : 'bg-background'}`}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={calendarStyles.scrollContent}
      >
        {/* Header */}
        <View style={calendarStyles.header}>
          <View>
            <Text className={`text-2xl font-bold ${isDarkMode ? 'text-dark-text' : 'text-text'}`}>{t('calendar.title')}</Text>
            <Text className={`text-sm ${isDarkMode ? 'text-dark-text-secondary' : 'text-text-secondary'}`}>
              {new Date().toLocaleDateString('fr-FR', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </Text>
          </View>
          <View style={calendarStyles.headerButtons}>
            <Pressable onPress={() => router.push('/pages/all-items')} style={calendarStyles.viewAllButton}>
              <MaterialCommunityIcons name="view-list" size={20} color="#007AFF" />
              <Text style={calendarStyles.viewAllButtonText}>{t('calendar.viewAll')}</Text>
            </Pressable>
            <Pressable onPress={openAddModal} style={calendarStyles.addButton}>
              <MaterialCommunityIcons name="plus" size={24} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
        
        <View style={calendarStyles.calendarContainer}>
          <View style={calendarStyles.daysOfWeek}>
            {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((day, index) => (
              <Text key={index} style={[calendarStyles.dayOfWeek, { color: isDarkMode ? '#CCCCCC' : '#000000' }]}>{day}</Text>
            ))}
          </View>
          
          <View style={calendarStyles.calendarGrid}>
            {getDaysInMonth(new Date()).map((day, index) => {
              // Handle empty cells (null values)
              if (!day) {
                return (
                  <View key={index} style={calendarStyles.calendarDay}>
                    <Text style={[calendarStyles.dayNumber, { color: 'transparent' }]}>
                      {/* Empty cell */}
                    </Text>
                  </View>
                );
              }
              
              const isSelected = day.toDateString() === selectedDate.toDateString();
              const isToday = day.toDateString() === new Date().toDateString();
              const dayEvents = getItemsForDate(day).events;
              const hasEvents = dayEvents.length > 0;

              return (
                <Pressable
                  key={index}
                  style={[
                    calendarStyles.calendarDay, 
                    isSelected && calendarStyles.selectedDay,
                    isToday && calendarStyles.todayDay
                  ]}
                  onPress={() => handleDateSelect(day)}
                >
                  <Text className={`text-center text-base font-medium ${isDarkMode ? 'text-dark-text' : 'text-text'} ${isSelected ? 'text-white' : ''} ${isToday ? 'font-bold' : ''}`}>
                    {day.getDate()}
                  </Text>
                  {hasEvents && <View style={calendarStyles.eventIndicator} />}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Events Counter */}
        <View style={calendarStyles.summaryContainer}>
          <View style={calendarStyles.summaryItem}>
            <Text className={`text-2xl font-bold ${isDarkMode ? 'text-dark-text' : 'text-text'}`}>{events.length}</Text>
            <Text className={`text-sm ${isDarkMode ? 'text-dark-text-secondary' : 'text-text-secondary'}`}>{t('calendar.events')}</Text>
          </View>
          
          <View style={calendarStyles.summaryItem}>
            <Text className={`text-2xl font-bold ${isDarkMode ? 'text-dark-text' : 'text-text'}`}>{souvenirs.length}</Text>
            <Text className={`text-sm ${isDarkMode ? 'text-dark-text-secondary' : 'text-text-secondary'}`}>{t('calendar.souvenirs')}</Text>
          </View>
          
          <View style={calendarStyles.summaryItem}>
            <Text className={`text-2xl font-bold ${isDarkMode ? 'text-dark-text' : 'text-text'}`}>{todos.filter(t => t.status !== 'termine').length}</Text>
            <Text className={`text-sm ${isDarkMode ? 'text-dark-text-secondary' : 'text-text-secondary'}`}>{t('calendar.todos')}</Text>
          </View>
        </View>

        {/* Events Section */}
        {events.length > 0 && (
          <View style={calendarStyles.section}>
            <Text className={`text-lg font-semibold mb-3 ${isDarkMode ? 'text-dark-text' : 'text-text'}`}>📅 {t('calendar.ourEvents')}</Text>
            {events
              .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())
              .map((event) => (
                <Pressable
                  key={event.id}
                  style={[calendarStyles.itemCard, { borderBottomColor: colors.border }]}
                  onPress={() => openItemDetails(event, 'event')}
                >
                  <View style={[calendarStyles.itemDateSquare, { backgroundColor: BRAND_BLUE }]}>
                    <Text style={calendarStyles.itemDateText}>{formatDate(event.event_date)}</Text>
                  </View>
                  <View style={calendarStyles.itemContent}>
                    <Text className={`text-base font-medium ${isDarkMode ? 'text-dark-text' : 'text-text'}`}>{event.title}</Text>
                    <Text className={`text-sm ${isDarkMode ? 'text-dark-text-secondary' : 'text-text-secondary'}`}>{formatTime(event.event_time)}</Text>
                    <Text className={`text-sm ${isDarkMode ? 'text-dark-text-secondary' : 'text-text-secondary'}`}>{event.place}</Text>
                  </View>
                  {/* Alarmable Status Indicator and Toggle */}
                  <View style={calendarStyles.eventAlarmableContainer}>
                    <MaterialCommunityIcons 
                      name={event.alarmable ? "bell-ring" : "bell-off"} 
                      size={16} 
                      color={event.alarmable ? BRAND_PINK : BRAND_GRAY} 
                    />
                    <Pressable
                      style={calendarStyles.alarmableToggle}
                      onPress={(e) => {
                        e.stopPropagation();
                        updateEventAlarmable(event.id, !event.alarmable);
                      }}
                    >
                      <Text style={[
                        calendarStyles.alarmableToggleText, 
                        { color: event.alarmable ? BRAND_PINK : BRAND_GRAY }
                      ]}>
                        {event.alarmable ? t('calendar.remindersOn') : t('calendar.remindersOff')}
                      </Text>
                    </Pressable>
                  </View>
                </Pressable>
              ))}
          </View>
        )}

        {/* Souvenirs Section */}
        <View style={calendarStyles.section}>
          <Text className={`text-lg font-semibold mb-3 ${isDarkMode ? 'text-dark-text' : 'text-text'}`}>📸 {t('calendar.preciousMoments')}</Text>
          {souvenirs.length > 0 ? (
            souvenirs
              .sort((a, b) => new Date(a.memory_date).getTime() - new Date(b.memory_date).getTime())
              .map((souvenir) => (
                <Pressable
                  key={souvenir.id}
                  style={[calendarStyles.itemCard, { borderBottomColor: colors.border }]}
                  onPress={() => openItemDetails(souvenir, 'souvenir')}
                >
                  <View style={[calendarStyles.itemDateSquare, { backgroundColor: BRAND_PINK }]}>
                    <Text style={calendarStyles.itemDateText}>{formatDate(souvenir.memory_date)}</Text>
                  </View>
                  <View style={calendarStyles.itemContent}>
                    <Text className={`text-base font-medium ${isDarkMode ? 'text-dark-text' : 'text-text'}`}>{souvenir.title}</Text>
                    <Text className={`text-sm ${isDarkMode ? 'text-dark-text-secondary' : 'text-text-secondary'}`}>{formatTime(souvenir.memory_time)}</Text>
                    <Text className={`text-sm ${isDarkMode ? 'text-dark-text-secondary' : 'text-text-secondary'}`}>{souvenir.place}</Text>
                  </View>
                </Pressable>
              ))
          ) : (
            <Text className={`text-center text-sm ${isDarkMode ? 'text-dark-text-secondary' : 'text-text-secondary'}`}>{t('calendar.noSouvenirs')}</Text>
          )}
        </View>

        {/* Active Todos */}
        {todos.filter(todo => todo.status !== 'termine').length > 0 && (
          <View style={calendarStyles.section}>
            <View className="flex-row items-center justify-between mb-3">
              <Text className={`text-lg font-semibold ${isDarkMode ? 'text-dark-text' : 'text-text'}`}>{t('calendar.activeTasks')}</Text>
              <TouchableOpacity
                onPress={() => router.push('/pages/todo-list')}
                className="flex-row items-center"
              >
                <Text className={`text-sm ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                  Voir tout
                </Text>
                <MaterialCommunityIcons 
                  name="chevron-right" 
                  size={16} 
                  color={isDarkMode ? '#60A5FA' : '#2563EB'} 
                />
              </TouchableOpacity>
            </View>
            {todos
              .filter(todo => todo.status !== 'termine')
              .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
              .map((todo) => (
                <Pressable
                  key={todo.id}
                  style={[calendarStyles.todoItem, { borderBottomColor: colors.border }]}
                  onPress={() => openItemDetails(todo, 'todo')}
                >
                  <Pressable
                    style={[calendarStyles.todoCheckbox, { borderColor: getStatusColor(todo.status) }]}
                    onPress={(e) => {
                      e.stopPropagation();
                      toggleTodoStatus(todo);
                    }}
                  >
                    {todo.status === 'en_cours' ? (
                      <MaterialCommunityIcons name="clock" size={16} color={getStatusColor(todo.status)} />
                    ) : todo.status === 'termine' ? (
                      <MaterialCommunityIcons name="check" size={16} color="#FFFFFF" />
                    ) : (
                      <MaterialCommunityIcons name="checkbox-blank-circle-outline" size={16} color={getStatusColor(todo.status)} />
                    )}
                  </Pressable>
                  <View style={calendarStyles.todoContent}>
                    <Text className={`text-base font-medium ${isDarkMode ? 'text-dark-text' : 'text-text'}`}>{todo.title}</Text>
                    <Text className={`text-sm ${isDarkMode ? 'text-dark-text-secondary' : 'text-text-secondary'}`}>{formatDate(todo.due_date)}</Text>
                  </View>
                  <View style={calendarStyles.todoPriority}>
                    <View style={[calendarStyles.priorityBadge, { backgroundColor: getPriorityColor(todo.priority) }]}>
                      <Text style={calendarStyles.priorityText}>{todo.priority}</Text>
                    </View>
                  </View>
                </Pressable>
              ))}
          </View>
        )}

        {/* Completed Todos */}
        {todos.filter(todo => todo.status === 'termine').length > 0 && (
          <View style={calendarStyles.section}>
            <Text className={`text-lg font-semibold mb-3 ${isDarkMode ? 'text-dark-text' : 'text-text'}`}>{t('calendar.completedTasks')}</Text>
            {todos
              .filter(todo => todo.status === 'termine')
              .sort((a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime())
              .map((todo) => (
                <Pressable
                  key={todo.id}
                  style={[calendarStyles.todoItem, calendarStyles.completedTodoItem]}
                  onPress={() => openItemDetails(todo, 'todo')}
                >
                  <Pressable
                    style={[calendarStyles.todoCheckbox, calendarStyles.todoCheckboxCompleted]}
                    onPress={(e) => {
                      e.stopPropagation();
                      toggleTodoStatus(todo);
                    }}
                  >
                    <MaterialCommunityIcons name="checkbox-marked-circle" size={16} color="#FFFFFF" />
                  </Pressable>
                  <View style={calendarStyles.todoContent}>
                    <Text className={`text-base font-medium line-through ${isDarkMode ? 'text-dark-text-secondary' : 'text-text-secondary'}`}>{todo.title}</Text>
                    <Text className={`text-sm ${isDarkMode ? 'text-dark-text-secondary' : 'text-text-secondary'}`}>{formatDate(todo.due_date)}</Text>
                  </View>
                  <View style={calendarStyles.todoPriority}>
                    <View style={[calendarStyles.priorityBadge, { backgroundColor: '#4CAF50' }]}>
                      <Text style={calendarStyles.priorityText}>{t('calendar.completed')}</Text>
                    </View>
                  </View>
                </Pressable>
              ))}
          </View>
        )}

        {/* No Items Message */}
        {events.length === 0 && souvenirs.length === 0 && todos.length === 0 && (
          <View style={calendarStyles.noItemsContainer}>
            <MaterialCommunityIcons name="calendar-blank" size={48} color={BRAND_GRAY} />
            <Text className={`text-center text-sm ${isDarkMode ? 'text-dark-text-secondary' : 'text-text-secondary'}`}>{t('calendar.noEvents')}</Text>
          </View>
        )}
      </ScrollView>

      {/* Add Item Modal */}
      <CreateItemModal
          visible={showAddModal}
        onClose={closeAddModal}
        onSave={handleItemSaved}
        userId={user!.id}
        coupleId={coupleId}
      />

      </AppLayout>
    );
}
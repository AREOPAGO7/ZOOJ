import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View
} from 'react-native';
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
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [showCustomTimePicker, setShowCustomTimePicker] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [formType, setFormType] = useState<'event' | 'souvenir' | 'todo'>('event');
  const [isLoading, setIsLoading] = useState(false);

  // Form states
  const [formTitle, setFormTitle] = useState('');
  const [formDate, setFormDate] = useState(new Date());
  const [formTime, setFormTime] = useState(new Date());
  const [formPlace, setFormPlace] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPriority, setFormPriority] = useState<'urgent' | 'normal' | 'peut_attendre'>('normal');
  const [formStatus, setFormStatus] = useState<'a_faire' | 'en_cours' | 'termine'>('a_faire');
  const [formImage, setFormImage] = useState<string | null>(null);
  const [formAlarmable, setFormAlarmable] = useState(true);
  
  // State for place suggestions
  const [placeSuggestions, setPlaceSuggestions] = useState<Array<{
    display_name: string;
    lat: string;
    lon: string;
    type: string;
  }>>([]);
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(false);

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
    
    setIsLoading(true);
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
    } finally {
      setIsLoading(false);
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    const days = [];
    
    // Add all days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
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
    
    // Debug logging for day 26
    if (date.getDate() === 26) {
      console.log('Day 26 debug:', {
        dateStr,
        dayEvents,
        allEvents: events.map(e => ({ id: e.id, date: e.event_date })),
        hasEvents: dayEvents.length > 0
      });
    }
    
    return { events: dayEvents, souvenirs: daySouvenirs, todos: dayTodos };
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    // Also update the form date and time when selecting a date from calendar
    setFormDate(date);
    setFormTime(date);
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
    // Initialize form with selected date if one was selected from calendar
    if (selectedDate) {
      setFormDate(selectedDate);
      setFormTime(selectedDate);
    } else {
      resetForm();
    }
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    resetForm();
  };

  const resetForm = () => {
    setFormTitle('');
    setFormDate(new Date());
    setFormTime(new Date());
    setFormPlace('');
    setFormDescription('');
    setFormPriority('normal');
    setFormStatus('a_faire');
    setFormImage(null);
    setFormAlarmable(true);
  };

  const handleItemTypeSelect = (type: CalendarItemType) => {
    setFormType(type);
  };

  const pickImage = async (source: 'camera' | 'gallery') => {
    try {
      let result;
      
      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Permission refusée', 'Permission d\'accès à la caméra refusée');
          return;
        }
        
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
        });
      } else {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Permission refusée', 'Permission d\'accès à la galerie refusée');
          return;
        }
        
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets[0]) {
        // Here you would upload to Cloudinary
        // For now, we'll use the local URI
        setFormImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner l\'image');
    }
  };

  const saveItem = async () => {
    if (!coupleId || !formTitle.trim()) {
      Alert.alert(t('calendar.error'), 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    setIsLoading(true);
    try {
      let result;

      if (formType === 'event') {
        const { data, error } = await supabase
          .from('calendar_events')
          .insert({
            couple_id: coupleId,
            title: formTitle.trim(),
            event_date: toLocalDateString(formDate),
            event_time: toLocalTimeString(formTime),
            place: formPlace.trim(),
            description: formDescription.trim(),
            alarmable: formAlarmable
          })
          .select()
          .single();

        if (error) throw error;
        result = data;
        setEvents(prev => [...prev, data]);
      } else if (formType === 'souvenir') {
        const { data, error } = await supabase
          .from('calendar_souvenirs')
          .insert({
            couple_id: coupleId,
            title: formTitle.trim(),
            memory_date: toLocalDateString(formDate),
            memory_time: toLocalTimeString(formTime),
            place: formPlace.trim(),
            description: formDescription.trim(),
            image_url: formImage || ''
          })
          .select()
          .single();

        if (error) throw error;
        result = data;
        setSouvenirs(prev => [...prev, data]);
      } else if (formType === 'todo') {
        const { data, error } = await supabase
          .from('calendar_todos')
          .insert({
            couple_id: coupleId,
            title: formTitle.trim(),
            description: formDescription.trim(),
            due_date: toLocalDateString(formDate),
            priority: formPriority,
            status: formStatus
          })
          .select()
          .single();

        if (error) throw error;
        result = data;
        setTodos(prev => [...prev, data]);
      }

      Alert.alert(t('calendar.success'), t('calendar.itemAdded'));
      closeAddModal();
    } catch (error) {
      console.error('Error saving item:', error);
      Alert.alert(t('calendar.error'), 'Impossible de sauvegarder l\'élément');
    } finally {
      setIsLoading(false);
    }
  };

  const openItemDetails = (item: any, type: CalendarItemType) => {
    setSelectedItem({ ...item, type });
    // Navigate to details page instead of opening modal
    router.push({
      pathname: '/pages/item-details',
      params: { 
        itemType: type,
        itemId: item.id,
        itemData: JSON.stringify(item)
      }
    });
  };



  const updateItemDate = async (item: any, newDate: Date, newTime: Date) => {
    if (!coupleId) return;

    setIsLoading(true);
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
    } finally {
      setIsLoading(false);
    }
  };

  // Function to update event alarmable status
  const updateEventAlarmable = async (eventId: string, alarmable: boolean) => {
    if (!coupleId) return;

    setIsLoading(true);
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
    } finally {
      setIsLoading(false);
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

            setIsLoading(true);
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
            } finally {
              setIsLoading(false);
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

    setIsLoading(true);
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
    } finally {
      setIsLoading(false);
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

  // Real place search using OpenStreetMap Nominatim API
  const searchPlaces = async (query: string) => {
    if (!query.trim() || query.length < 3) {
      setPlaceSuggestions([]);
      return;
    }

    setIsLoadingPlaces(true);
    try {
      // Search in Morocco with French language
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
        `q=${encodeURIComponent(query + ' Morocco')}&` +
        `format=json&` +
        `limit=8&` +
        `addressdetails=1&` +
        `accept-language=fr&` +
        `countrycodes=ma&` +
        `viewbox=-13.0,27.0,-0.5,36.0&` + // Morocco bounding box
        `bounded=1`
      );

      if (response.ok) {
        const data = await response.json();
        setPlaceSuggestions(data);
      } else {
        console.error('Place search failed:', response.status);
        setPlaceSuggestions([]);
      }
    } catch (error) {
      console.error('Error searching places:', error);
      setPlaceSuggestions([]);
    } finally {
      setIsLoadingPlaces(false);
    }
  };

  // Debounced search to avoid too many API calls
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (formPlace.length >= 3) {
        searchPlaces(formPlace);
      } else {
        setPlaceSuggestions([]);
      }
    }, 300); // 300ms delay

    return () => clearTimeout(timeoutId);
  }, [formPlace]);

  // Show loading while checking auth or profile completion
  if (loading || profileLoading) {
    return (
      <View style={[calendarStyles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={BRAND_BLUE} />
        <Text style={[calendarStyles.loadingText, { color: colors.textSecondary }]}>{t('calendar.loading')}</Text>
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
      <View style={[calendarStyles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={calendarStyles.header}>
          <View>
            <Text style={[calendarStyles.title, { color: colors.text }]}>{t('calendar.title')}</Text>
            <Text style={[calendarStyles.currentDate, { color: colors.textSecondary }]}>
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
              <Text key={index} style={[calendarStyles.dayOfWeek, { color: colors.textSecondary }]}>{day}</Text>
            ))}
          </View>

          
          <View style={calendarStyles.calendarGrid}>
            {getDaysInMonth(new Date()).map((day, index) => {
              // Ensure we have a valid day
              if (!day) {
                return null;
              }
              
              const isSelected = day.toDateString() === selectedDate.toDateString();
              const isToday = day.toDateString() === new Date().toDateString();
              const dayEvents = getItemsForDate(day).events;
              const hasEvents = dayEvents.length > 0;

              // Debug logging for day 26
              if (day.getDate() === 26) {
                console.log('Rendering day 26:', {
                  day: day.toDateString(),
                  hasEvents,
                  dayEvents: dayEvents.length
                });
              }

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
                  <Text style={[
                    calendarStyles.dayNumber, 
                    { color: colors.text },
                    isSelected && calendarStyles.selectedDayText,
                    isToday && calendarStyles.todayDayText
                  ]}>
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
            <Text style={[calendarStyles.summaryNumber, { color: colors.text }]}>{events.length}</Text>
            <Text style={[calendarStyles.summaryLabel, { color: colors.textSecondary }]}>{t('calendar.events')}</Text>
          </View>
          
          <View style={calendarStyles.summaryItem}>
            <Text style={[calendarStyles.summaryNumber, { color: colors.text }]}>{souvenirs.length}</Text>
            <Text style={[calendarStyles.summaryLabel, { color: colors.textSecondary }]}>{t('calendar.souvenirs')}</Text>
          </View>
          
          <View style={calendarStyles.summaryItem}>
            <Text style={[calendarStyles.summaryNumber, { color: colors.text }]}>{todos.filter(t => t.status !== 'termine').length}</Text>
            <Text style={[calendarStyles.summaryLabel, { color: colors.textSecondary }]}>{t('calendar.todos')}</Text>
          </View>
        </View>

        {/* Events Section */}
        {events.length > 0 && (
          <View style={calendarStyles.section}>
            <Text style={[calendarStyles.sectionTitle, { color: colors.text }]}>📅 {t('calendar.ourEvents')}</Text>
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
                    <Text style={[calendarStyles.itemTitle, { color: colors.text }]}>{event.title}</Text>
                    <Text style={[calendarStyles.itemTime, { color: colors.textSecondary }]}>{formatTime(event.event_time)}</Text>
                    <Text style={[calendarStyles.itemPlace, { color: colors.textSecondary }]}>{event.place}</Text>
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
          <Text style={[calendarStyles.sectionTitle, { color: colors.text }]}>📸 {t('calendar.preciousMoments')}</Text>
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
                    <Text style={[calendarStyles.itemTitle, { color: colors.text }]}>{souvenir.title}</Text>
                    <Text style={[calendarStyles.itemTime, { color: colors.textSecondary }]}>{formatTime(souvenir.memory_time)}</Text>
                    <Text style={[calendarStyles.itemPlace, { color: colors.textSecondary }]}>{souvenir.place}</Text>
                  </View>
                </Pressable>
              ))
          ) : (
            <Text style={[calendarStyles.noItemsText, { color: colors.textSecondary }]}>{t('calendar.noSouvenirs')}</Text>
          )}
        </View>

        {/* Active Todos */}
        {todos.filter(todo => todo.status !== 'termine').length > 0 && (
          <View style={calendarStyles.section}>
            <Text style={[calendarStyles.sectionTitle, { color: colors.text }]}>{t('calendar.activeTasks')}</Text>
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
                    <Text style={[calendarStyles.todoTitle, { color: colors.text }]}>{todo.title}</Text>
                    <Text style={[calendarStyles.todoDate, { color: colors.textSecondary }]}>{formatDate(todo.due_date)}</Text>
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
            <Text style={[calendarStyles.sectionTitle, { color: colors.text }]}>{t('calendar.completedTasks')}</Text>
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
                    <Text style={[calendarStyles.todoTitle, calendarStyles.todoTitleCompleted]}>{todo.title}</Text>
                    <Text style={[calendarStyles.todoDate, calendarStyles.pastItemText]}>{formatDate(todo.due_date)}</Text>
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
            <Text style={[calendarStyles.noItemsText, { color: colors.textSecondary }]}>{t('calendar.noEvents')}</Text>
          </View>
        )}
      </View>

      {/* Add Item Modal */}
        <Modal
          visible={showAddModal}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <View style={calendarStyles.modalContainer}>
            {/* Modal Header */}
            <View style={calendarStyles.modalHeader}>
              <Pressable onPress={closeAddModal} style={calendarStyles.closeButton}>
                <MaterialCommunityIcons name="chevron-left" size={24} color="#2D2D2D" />
              </Pressable>
              <Text style={calendarStyles.modalTitle}>{t('calendar.addToCalendar')}</Text>
              <View style={{ width: 24 }} />
            </View>

            {/* Item Type Selection */}
            <View style={calendarStyles.typeSelection}>
              <Pressable
                style={[calendarStyles.typeButton, formType === 'event' && calendarStyles.typeButtonSelected]}
                onPress={() => handleItemTypeSelect('event')}
              >
                <MaterialCommunityIcons 
                  name="calendar" 
                  size={24} 
                  color={formType === 'event' ? '#FFFFFF' : '#9E9E9E'} 
                />
                                  <Text style={[calendarStyles.typeButtonText, formType === 'event' && calendarStyles.typeButtonTextSelected]}>
                  {t('calendar.event')}
                </Text>
              </Pressable>

              <Pressable
                style={[calendarStyles.typeButton, formType === 'souvenir' && calendarStyles.typeButtonSelected]}
                onPress={() => handleItemTypeSelect('souvenir')}
              >
                <MaterialCommunityIcons 
                  name="heart" 
                  size={24} 
                  color={formType === 'souvenir' ? '#FFFFFF' : '#9E9E9E'} 
                />
                <Text style={[calendarStyles.typeButtonText, formType === 'souvenir' && calendarStyles.typeButtonTextSelected]}>
                  {t('calendar.souvenir')}
                </Text>
              </Pressable>

              <Pressable
                style={[calendarStyles.typeButton, formType === 'todo' && calendarStyles.typeButtonSelected]}
                onPress={() => handleItemTypeSelect('todo')}
              >
                <MaterialCommunityIcons 
                  name="checkbox-marked-outline" 
                  size={24} 
                  color={formType === 'todo' ? '#FFFFFF' : '#9E9E9E'} 
                />
                <Text style={[calendarStyles.typeButtonText, formType === 'todo' && calendarStyles.typeButtonTextSelected]}>
                  {t('calendar.todo')}
                </Text>
              </Pressable>
            </View>

            {/* Form Fields */}
            <ScrollView style={calendarStyles.formContainer} showsVerticalScrollIndicator={false}>
              {/* Title */}
              <View style={calendarStyles.formField}>
                <Text style={calendarStyles.formLabel}>{t('calendar.titleField')}</Text>
                <TextInput
                  style={calendarStyles.textInput}
                  value={formTitle}
                  onChangeText={setFormTitle}
                  placeholder={
                    formType === 'event' ? t('calendar.eventTitle') :
                    formType === 'souvenir' ? t('calendar.souvenirTitle') :
                    t('calendar.todoTitle')
                  }
                  placeholderTextColor={BRAND_GRAY}
                />
              </View>

              {/* Date and Time */}
              <View style={calendarStyles.formField}>
                <Text style={calendarStyles.formLabel}>{t('calendar.dateTime')}</Text>
                <View style={calendarStyles.dateTimeContainer}>
                  <Pressable
                    style={calendarStyles.dateTimeInput}
                    onPress={() => setShowCustomDatePicker(true)}
                  >
                    <MaterialCommunityIcons name="calendar" size={20} color="#9E9E9E" />
                    <Text style={calendarStyles.dateTimeText}>
                      {formDate.toLocaleDateString('fr-FR')}
                    </Text>
                    <MaterialCommunityIcons name="chevron-down" size={16} color="#9E9E9E" />
                  </Pressable>

                  <Pressable
                    style={calendarStyles.dateTimeInput}
                    onPress={() => setShowCustomTimePicker(true)}
                  >
                    <MaterialCommunityIcons name="clock" size={20} color="#9E9E9E" />
                    <Text style={calendarStyles.dateTimeText}>
                      {formTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                    <MaterialCommunityIcons name="chevron-down" size={16} color="#9E9E9E" />
                  </Pressable>
                </View>
              </View>

              {/* Place */}
              {(formType === 'event' || formType === 'souvenir') && (
                <View style={calendarStyles.formField}>
                  <Text style={calendarStyles.formLabel}>{t('calendar.place')}</Text>
                  <View style={calendarStyles.placeInputContainer}>
                    <TextInput
                      style={calendarStyles.textInput}
                      value={formPlace}
                      onChangeText={setFormPlace}
                      placeholder={t('calendar.searchPlace')}
                      placeholderTextColor={BRAND_GRAY}
                      onFocus={() => {
                        // Show place suggestions on focus
                        console.log('Place input focused - you can add place suggestions here');
                      }}
                    />
                    <MaterialCommunityIcons name="map-marker" size={20} color="#9E9E9E" />
                  </View>
                  {/* Place suggestions */}
                  {formPlace.length >= 3 && (
                    <View style={calendarStyles.placeSuggestions}>
                      <Text style={calendarStyles.placeSuggestionsTitle}>
                        {isLoadingPlaces ? t('calendar.searching') : t('calendar.placesFound')}
                      </Text>
                      {isLoadingPlaces ? (
                        <View style={calendarStyles.placeSuggestionsList}>
                          <View style={calendarStyles.placeSuggestionItem}>
                            <ActivityIndicator size="small" color={BRAND_BLUE} />
                            <Text style={calendarStyles.placeSuggestionText}>{t('calendar.searchingPlaces')}</Text>
                          </View>
                        </View>
                      ) : placeSuggestions.length > 0 ? (
                        <View style={calendarStyles.placeSuggestionsList}>
                          {placeSuggestions.map((place, index) => (
                            <Pressable
                              key={index}
                              style={calendarStyles.placeSuggestionItem}
                              onPress={() => setFormPlace(place.display_name)}
                            >
                              <MaterialCommunityIcons name="map-marker" size={16} color={BRAND_BLUE} />
                              <View style={calendarStyles.placeSuggestionContent}>
                                <Text style={calendarStyles.placeSuggestionText}>
                                  {place.display_name.split(',')[0]} {/* Show first part of address */}
                                </Text>
                                <Text style={calendarStyles.placeSuggestionSubtext}>
                                  {place.display_name.split(',').slice(1, 3).join(', ')} {/* Show city/area */}
                                </Text>
                              </View>
                            </Pressable>
                          ))}
                        </View>
                      ) : formPlace.length >= 3 ? (
                        <View style={calendarStyles.placeSuggestionsList}>
                          <Text style={calendarStyles.placeSuggestionText}>{t('calendar.noPlacesFound')}</Text>
                        </View>
                      ) : null}
                    </View>
                  )}
                </View>
              )}

              {/* Priority and Status for Todo */}
              {formType === 'todo' && (
                <>
                  <View style={calendarStyles.formField}>
                    <Text style={calendarStyles.formLabel}>{t('calendar.priority')}</Text>
                    <View style={calendarStyles.priorityContainer}>
                      {(['urgent', 'normal', 'peut_attendre'] as const).map((priority) => (
                        <Pressable
                          key={priority}
                          style={[
                            calendarStyles.priorityButton,
                            formPriority === priority && calendarStyles.priorityButtonSelected
                          ]}
                          onPress={() => setFormPriority(priority)}
                        >
                          <Text style={[
                            calendarStyles.priorityButtonText,
                            formPriority === priority && calendarStyles.priorityButtonTextSelected
                          ]}>
                            {priority === 'urgent' ? t('calendar.urgent') : 
                             priority === 'normal' ? t('calendar.normal') : t('calendar.canWait')}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  <View style={calendarStyles.formField}>
                    <Text style={calendarStyles.formLabel}>{t('calendar.status')}</Text>
                    <View style={calendarStyles.statusContainer}>
                      {(['a_faire', 'en_cours', 'termine'] as const).map((status) => (
                        <Pressable
                          key={status}
                          style={[
                            calendarStyles.statusButton,
                            formStatus === status && calendarStyles.statusButtonSelected
                          ]}
                          onPress={() => setFormStatus(status)}
                        >
                          <Text style={[
                            calendarStyles.statusButtonText,
                            formStatus === status && calendarStyles.statusButtonTextSelected
                          ]}>
                            {status === 'a_faire' ? t('calendar.toDo') : 
                             status === 'en_cours' ? t('calendar.inProgress') : t('calendar.completed')}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                </>
              )}

              {/* Image Upload for Souvenir */}
              {formType === 'souvenir' && (
                <View style={calendarStyles.formField}>
                  <Text style={calendarStyles.formLabel}>{t('calendar.photos')}</Text>
                  <View style={calendarStyles.imageUploadContainer}>
                    {formImage ? (
                      <Image source={{ uri: formImage }} style={calendarStyles.uploadedImage} />
                    ) : (
                      <>
                        <MaterialCommunityIcons name="image" size={48} color={BRAND_GRAY} />
                        <Text style={calendarStyles.imageUploadText}>
                          {t('calendar.addImage')}
                        </Text>
                      </>
                    )}
                    <View style={calendarStyles.imageButtonsContainer}>
                      <Pressable
                        style={[calendarStyles.imageButton, { backgroundColor: BRAND_PINK }]}
                        onPress={() => pickImage('camera')}
                      >
                        <MaterialCommunityIcons name="camera" size={20} color="#FFFFFF" />
                        <Text style={calendarStyles.imageButtonText}>{t('calendar.camera')}</Text>
                      </Pressable>
                      <Pressable
                        style={[calendarStyles.imageButton, { backgroundColor: BRAND_BLUE }]}
                        onPress={() => pickImage('gallery')}
                      >
                        <MaterialCommunityIcons name="image-multiple" size={20} color="#FFFFFF" />
                        <Text style={calendarStyles.imageButtonText}>{t('calendar.gallery')}</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              )}

              {/* Description */}
              <View style={calendarStyles.formField}>
                <Text style={calendarStyles.formLabel}>{t('calendar.description')}</Text>
                <TextInput
                  style={[calendarStyles.textInput, calendarStyles.textArea]}
                  value={formDescription}
                  onChangeText={setFormDescription}
                  placeholder={t('calendar.addNote')}
                  placeholderTextColor={BRAND_GRAY}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              {/* Alarmable Toggle for Events */}
              {formType === 'event' && (
                <View style={calendarStyles.formField}>
                  <View style={calendarStyles.toggleContainer}>
                    <View style={calendarStyles.toggleLabelContainer}>
                      <MaterialCommunityIcons 
                        name="bell-ring" 
                        size={20} 
                        color={formAlarmable ? BRAND_PINK : BRAND_GRAY} 
                      />
                      <Text style={[calendarStyles.formLabel, { marginLeft: 8 }]}>
                        {t('calendar.enableReminders')}
                      </Text>
                    </View>
                    <Pressable
                      style={[
                        calendarStyles.toggleSwitch,
                        formAlarmable && calendarStyles.toggleSwitchActive
                      ]}
                      onPress={() => setFormAlarmable(!formAlarmable)}
                    >
                      <View style={[
                        calendarStyles.toggleThumb,
                        formAlarmable && calendarStyles.toggleThumbActive
                      ]} />
                    </Pressable>
                  </View>
                  <Text style={[calendarStyles.toggleDescription, { color: colors.textSecondary }]}>
                    {formAlarmable 
                      ? t('calendar.reminderDescription')
                      : t('calendar.noReminderDescription')
                    }
                  </Text>
                </View>
              )}
            </ScrollView>

            {/* Save Button */}
            <View style={calendarStyles.saveButtonContainer}>
              <Pressable
                style={calendarStyles.saveButton}
                onPress={saveItem}
                disabled={isLoading}
              >
                <LinearGradient
                  colors={[BRAND_BLUE, BRAND_PINK]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={calendarStyles.saveButtonGradient}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={calendarStyles.saveButtonText}>{t('calendar.save')}</Text>
                  )}
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </Modal>

        {/* Custom Date Picker Modal */}
        <Modal
          visible={showCustomDatePicker}
          animationType="slide"
          transparent={true}
        >
          <View style={calendarStyles.customPickerOverlay}>
            <View style={calendarStyles.customPickerContainer}>
              <View style={calendarStyles.customPickerHeader}>
                <Text style={calendarStyles.customPickerTitle}>{t('calendar.selectDate')}</Text>
                <Pressable
                  style={calendarStyles.customPickerCloseButton}
                  onPress={() => setShowCustomDatePicker(false)}
                >
                  <MaterialCommunityIcons name="close" size={24} color="#2D2D2D" />
                </Pressable>
              </View>
              
              <View style={calendarStyles.customPickerContent}>
                <View style={calendarStyles.monthSelector}>
                  <Pressable
                    style={calendarStyles.monthButton}
                    onPress={() => {
                      const newDate = new Date(formDate);
                      newDate.setMonth(newDate.getMonth() - 1);
                      setFormDate(newDate);
                    }}
                  >
                    <MaterialCommunityIcons name="chevron-left" size={24} color={BRAND_BLUE} />
                  </Pressable>
                  
                  <Text style={calendarStyles.monthText}>
                    {formDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                  </Text>
                  
                  <Pressable
                    style={calendarStyles.monthButton}
                    onPress={() => {
                      const newDate = new Date(formDate);
                      newDate.setMonth(newDate.getMonth() + 1);
                      setFormDate(newDate);
                    }}
                  >
                    <MaterialCommunityIcons name="chevron-right" size={24} color={BRAND_BLUE} />
                  </Pressable>
                </View>
                
                <View style={calendarStyles.customPickerDaysOfWeek}>
                  {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((day, index) => (
                    <Text key={index} style={calendarStyles.customPickerDayOfWeek}>{day}</Text>
                  ))}
                </View>
                
                <View style={calendarStyles.customPickerGrid}>
                  {getDaysInMonth(formDate).map((day, index) => {
                    if (!day) return <View key={index} style={calendarStyles.customPickerEmptyDay} />;
                    
                    const isSelected = day.toDateString() === formDate.toDateString();
                    const isToday = day.toDateString() === new Date().toDateString();
                    
                    return (
                      <Pressable
                        key={index}
                        style={[
                          calendarStyles.customPickerDay,
                          isSelected && calendarStyles.customPickerSelectedDay,
                          isToday && calendarStyles.customPickerTodayDay
                        ]}
                        onPress={() => {
                          setFormDate(day);
                          setShowCustomDatePicker(false);
                        }}
                      >
                        <Text style={[
                          calendarStyles.customPickerDayNumber,
                          isSelected && calendarStyles.customPickerSelectedDayText,
                          isToday && calendarStyles.customPickerTodayDayText
                        ]}>
                          {day.getDate()}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>
          </View>
        </Modal>

        {/* Custom Time Picker Modal */}
        <Modal
          visible={showCustomTimePicker}
          animationType="slide"
          transparent={true}
        >
          <View style={calendarStyles.customPickerOverlay}>
            <View style={calendarStyles.customPickerContainer}>
              <View style={calendarStyles.customPickerHeader}>
                <Text style={calendarStyles.customPickerTitle}>{t('calendar.selectTime')}</Text>
                <Pressable
                  style={calendarStyles.customPickerCloseButton}
                  onPress={() => setShowCustomTimePicker(false)}
                >
                  <MaterialCommunityIcons name="close" size={24} color="#2D2D2D" />
                </Pressable>
              </View>
              
              <View style={calendarStyles.customPickerContent}>
                <View style={calendarStyles.timeSelector}>
                  <View style={calendarStyles.timeColumn}>
                    <Text style={calendarStyles.timeLabel}>{t('calendar.hours')}</Text>
                    <ScrollView style={calendarStyles.timeScrollView} showsVerticalScrollIndicator={false}>
                      {Array.from({ length: 24 }, (_, i) => (
                        <Pressable
                          key={i}
                          style={[
                            calendarStyles.timeOption,
                            formTime.getHours() === i && calendarStyles.timeOptionSelected
                          ]}
                          onPress={() => {
                            const newTime = new Date(formTime);
                            newTime.setHours(i);
                            setFormTime(newTime);
                          }}
                        >
                          <Text style={[
                            calendarStyles.timeOptionText,
                            formTime.getHours() === i && calendarStyles.timeOptionTextSelected
                          ]}>
                            {i.toString().padStart(2, '0')}
                          </Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                  
                  <View style={calendarStyles.timeColumn}>
                    <Text style={calendarStyles.timeLabel}>{t('calendar.minutes')}</Text>
                    <ScrollView style={calendarStyles.timeScrollView} showsVerticalScrollIndicator={false}>
                      {Array.from({ length: 60 }, (_, i) => (
                        <Pressable
                          key={i}
                          style={[
                            calendarStyles.timeOption,
                            formTime.getMinutes() === i && calendarStyles.timeOptionSelected
                          ]}
                          onPress={() => {
                            const newTime = new Date(formTime);
                            newTime.setMinutes(i);
                            setFormTime(newTime);
                          }}
                        >
                          <Text style={[
                            calendarStyles.timeOptionText,
                            formTime.getMinutes() === i && calendarStyles.timeOptionTextSelected
                          ]}>
                            {i.toString().padStart(2, '0')}
                          </Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                </View>
                
                <Pressable
                  style={calendarStyles.timeConfirmButton}
                  onPress={() => setShowCustomTimePicker(false)}
                >
                  <Text style={calendarStyles.timeConfirmButtonText}>{t('calendar.confirm')}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </AppLayout>
    );
}




import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { useDarkTheme } from '../../contexts/DarkThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import AppLayout from '../app-layout';

interface CalendarEvent {
  id: string;
  title: string;
  event_date: string;
  event_time: string;
  place: string;
  description: string;
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

interface ListItem {
  id: string;
  type: CalendarItemType;
  title: string;
  date: string;
  time?: string;
  place?: string;
  priority?: string;
  status?: string;
  imageUrl?: string;
  originalItem: CalendarEvent | CalendarSouvenir | CalendarTodo;
}

export default function AllItemsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { isDarkMode } = useDarkTheme();
  
  const [items, setItems] = useState<ListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'events' | 'souvenirs' | 'todos'>('all');

  // Get couple ID when component mounts
  useEffect(() => {
    if (user) {
      getCoupleId();
    }
  }, [user]);

  // Load items when couple ID is available
  useEffect(() => {
    if (coupleId) {
      loadAllItems();
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
    }
  };

  const loadAllItems = async () => {
    if (!coupleId) return;

    try {
      setIsLoading(true);
      
      // Load events
      const { data: events, error: eventsError } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('couple_id', coupleId)
        .order('event_date', { ascending: false });

      if (eventsError) throw eventsError;

      // Load souvenirs
      const { data: souvenirs, error: souvenirsError } = await supabase
        .from('calendar_souvenirs')
        .select('*')
        .eq('couple_id', coupleId)
        .order('memory_date', { ascending: false });

      if (souvenirsError) throw souvenirsError;

      // Load todos
      const { data: todos, error: todosError } = await supabase
        .from('calendar_todos')
        .select('*')
        .eq('couple_id', coupleId)
        .order('due_date', { ascending: false });

      if (todosError) throw todosError;

      // Combine and format all items
      const allItems: ListItem[] = [
        ...events.map(event => ({
          id: event.id,
          type: 'event' as CalendarItemType,
          title: event.title,
          date: event.event_date,
          time: event.event_time,
          place: event.place,
          originalItem: event
        })),
        ...souvenirs.map(souvenir => ({
          id: souvenir.id,
          type: 'souvenir' as CalendarItemType,
          title: souvenir.title,
          date: souvenir.memory_date,
          time: souvenir.memory_time,
          place: souvenir.place,
          imageUrl: souvenir.image_url,
          originalItem: souvenir
        })),
        ...todos.map(todo => ({
          id: todo.id,
          type: 'todo' as CalendarItemType,
          title: todo.title,
          date: todo.due_date,
          priority: todo.priority,
          status: todo.status,
          originalItem: todo
        }))
      ];

      // Sort by date (most recent first)
      allItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      setItems(allItems);
    } catch (error) {
      console.error('Error loading items:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getFilteredItems = () => {
    if (activeFilter === 'all') return items;
    if (activeFilter === 'events') return items.filter(item => item.type === 'event');
    if (activeFilter === 'souvenirs') return items.filter(item => item.type === 'souvenir');
    if (activeFilter === 'todos') return items.filter(item => item.type === 'todo');
    return items;
  };

  const getItemIcon = (type: CalendarItemType) => {
    switch (type) {
      case 'event':
        return 'calendar-event';
      case 'souvenir':
        return 'camera';
      case 'todo':
        return 'checkbox-marked-outline';
      default:
        return 'circle';
    }
  };

  const getItemColor = (type: CalendarItemType, priority?: string, status?: string) => {
    if (type === 'todo') {
      if (status === 'termine') return '#4CAF50';
      if (priority === 'urgent') return '#F44336';
      if (priority === 'normal') return '#2196F3';
      return '#FF9800';
    }
    
    if (type === 'event') return '#2196F3';
    if (type === 'souvenir') return '#F47CC6';
    
    return '#9E9E9E';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return t('calendar.today');
    } else if (date.toDateString() === yesterday.toDateString()) {
      return t('calendar.yesterday');
    } else {
      const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
      return `${date.getDate()} ${months[date.getMonth()]}`;
    }
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    return `${hours}:${minutes}`;
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'urgent': return t('calendar.urgent');
      case 'normal': return t('calendar.normal');
      case 'peut_attendre': return t('calendar.canWait');
      default: return priority;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'a_faire': return t('calendar.toDo');
      case 'en_cours': return t('calendar.inProgress');
      case 'termine': return t('calendar.completed');
      default: return status;
    }
  };

  const handleItemPress = (item: ListItem) => {
    if (item.type === 'todo') {
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
          itemType: item.type,
          itemId: item.id,
          itemData: JSON.stringify(item.originalItem)
        }
      });
    }
  };

  const renderItem = ({ item }: { item: ListItem }) => (
    <Pressable style={[
      styles.itemCard, 
      { 
        backgroundColor: isDarkMode ? '#1A1A1A' : '#FFFFFF',
        borderColor: isDarkMode ? '#333333' : '#F0F0F0'
      }
    ]} onPress={() => handleItemPress(item)}>
      <View style={[styles.itemIconContainer, { backgroundColor: getItemColor(item.type, item.priority, item.status) }]}>
        <MaterialCommunityIcons 
          name={getItemIcon(item.type) as any} 
          size={24} 
          color="white" 
        />
      </View>
      
      <View style={styles.itemContent}>
        <View style={styles.itemHeader}>
          <Text style={[styles.itemTitle, { color: isDarkMode ? '#FFFFFF' : '#2D2D2D' }]} numberOfLines={1}>{item.title}</Text>
          <View style={[styles.itemTypeBadge, { backgroundColor: isDarkMode ? '#333333' : '#F0F0F0' }]}>
            <Text style={[styles.itemTypeText, { color: isDarkMode ? '#CCCCCC' : '#666' }]}>
              {item.type === 'event' ? t('calendar.event') : 
               item.type === 'souvenir' ? t('calendar.souvenir') : t('calendar.todo')}
            </Text>
          </View>
        </View>
        
        <View style={styles.itemDetails}>
          <View style={styles.itemDetail}>
            <MaterialCommunityIcons name="calendar" size={16} color={isDarkMode ? '#CCCCCC' : '#666'} />
            <Text style={[styles.itemDetailText, { color: isDarkMode ? '#CCCCCC' : '#666' }]}>{formatDate(item.date)}</Text>
          </View>
          
          {item.time && (
            <View style={styles.itemDetail}>
              <MaterialCommunityIcons name="clock" size={16} color={isDarkMode ? '#CCCCCC' : '#666'} />
              <Text style={[styles.itemDetailText, { color: isDarkMode ? '#CCCCCC' : '#666' }]}>{formatTime(item.time)}</Text>
            </View>
          )}
          
          {item.place && (
            <View style={styles.itemDetail}>
              <MaterialCommunityIcons name="map-marker" size={16} color={isDarkMode ? '#CCCCCC' : '#666'} />
              <Text style={[styles.itemDetailText, { color: isDarkMode ? '#CCCCCC' : '#666' }]} numberOfLines={1}>{item.place}</Text>
            </View>
          )}
        </View>
        
        {item.type === 'todo' && (
          <View style={styles.todoStatus}>
            <View style={[styles.statusBadge, { backgroundColor: getItemColor('todo', item.priority, item.status) }]}>
              <Text style={styles.statusText}>{getStatusText(item.status!)}</Text>
            </View>
            <View style={[styles.priorityBadge, { backgroundColor: getItemColor('todo', item.priority, item.status) }]}>
              <Text style={styles.priorityText}>{getPriorityText(item.priority!)}</Text>
            </View>
          </View>
        )}
      </View>
      
      <MaterialCommunityIcons name="chevron-right" size={24} color={isDarkMode ? '#666' : '#CCC'} />
    </Pressable>
  );

  const renderFilterButton = (filter: 'all' | 'events' | 'souvenirs' | 'todos', labelKey: string, icon: string) => (
    <Pressable
      style={[
        styles.filterButton, 
        { 
          backgroundColor: isDarkMode ? '#1A1A1A' : '#F8F9FA',
          borderColor: isDarkMode ? '#333333' : '#E0E0E0'
        },
        activeFilter === filter && styles.filterButtonActive
      ]}
      onPress={() => setActiveFilter(filter)}
    >
      <MaterialCommunityIcons 
        name={icon as any} 
        size={20} 
        color={activeFilter === filter ? 'white' : (isDarkMode ? '#CCCCCC' : '#666')} 
      />
      <Text style={[
        styles.filterButtonText, 
        { color: isDarkMode ? '#CCCCCC' : '#666' },
        activeFilter === filter && styles.filterButtonTextActive
      ]}>
        {t(labelKey)}
      </Text>
    </Pressable>
  );

  if (isLoading) {
    return (
      <AppLayout>
        <View style={[styles.loadingContainer, { backgroundColor: isDarkMode ? '#000000' : '#FFFFFF' }]}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={[styles.loadingText, { color: isDarkMode ? '#CCCCCC' : '#666' }]}>{t('calendar.loading')}</Text>
        </View>
      </AppLayout>
    );
  }

  const filteredItems = getFilteredItems();

  return (
    <AppLayout>
      <View style={[styles.container, { backgroundColor: isDarkMode ? '#000000' : '#FFFFFF' }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: isDarkMode ? '#333333' : '#F0F0F0' }]}>
          <Text style={[styles.title, { color: isDarkMode ? '#FFFFFF' : '#2D2D2D' }]}>{t('calendar.allItems')}</Text>
          <Text style={[styles.subtitle, { color: isDarkMode ? '#CCCCCC' : '#666' }]}>
            {filteredItems.length} {filteredItems.length !== 1 ? t('calendar.itemsFoundPlural') : t('calendar.itemsFound')}
          </Text>
        </View>

        {/* Filter Buttons */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.filterScrollView}
          contentContainerStyle={styles.filterContainer}
        >
          {renderFilterButton('all', 'calendar.all', 'view-list')}
          {renderFilterButton('events', 'calendar.events', 'calendar-event')}
          {renderFilterButton('souvenirs', 'calendar.souvenirs', 'camera')}
          {renderFilterButton('todos', 'calendar.todos', 'checkbox-marked-outline')}
        </ScrollView>

        {/* Items List */}
        {filteredItems.length > 0 ? (
          <FlatList
            data={filteredItems}
            renderItem={renderItem}
            keyExtractor={(item) => `${item.type}-${item.id}`}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="inbox-outline" size={64} color={isDarkMode ? '#666' : '#CCC'} />
            <Text style={[styles.emptyTitle, { color: isDarkMode ? '#FFFFFF' : '#2D2D2D' }]}>
              {activeFilter === 'all' ? t('calendar.noItems') : 
               activeFilter === 'events' ? t('calendar.noEventsFilter') :
               activeFilter === 'souvenirs' ? t('calendar.noSouvenirsFilter') : t('calendar.noTodosFilter')}
            </Text>
            <Text style={[styles.emptySubtitle, { color: isDarkMode ? '#CCCCCC' : '#666' }]}>
              {t('calendar.startCreating')}
            </Text>
          </View>
        )}
      </View>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
  },
  filterScrollView: {
    maxHeight: 60,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
    alignItems: 'center',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
    minWidth: 100,
    justifyContent: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: 'white',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  itemIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  itemContent: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  itemTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  itemTypeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  itemDetails: {
    gap: 8,
  },
  itemDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemDetailText: {
    fontSize: 14,
  },
  todoStatus: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'white',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    opacity: 0.8,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'white',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
});

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View
} from 'react-native';
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
      return 'Aujourd\'hui';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Hier';
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
      case 'urgent': return 'Urgent';
      case 'normal': return 'Normal';
      case 'peut_attendre': return 'Peut attendre';
      default: return priority;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'a_faire': return 'À faire';
      case 'en_cours': return 'En cours';
      case 'termine': return 'Terminé';
      default: return status;
    }
  };

  const handleItemPress = (item: ListItem) => {
    router.push({
      pathname: '/pages/item-details',
      params: {
        itemType: item.type,
        itemId: item.id,
        itemData: JSON.stringify(item.originalItem)
      }
    });
  };

  const renderItem = ({ item }: { item: ListItem }) => (
    <Pressable style={styles.itemCard} onPress={() => handleItemPress(item)}>
      <View style={[styles.itemIconContainer, { backgroundColor: getItemColor(item.type, item.priority, item.status) }]}>
        <MaterialCommunityIcons 
          name={getItemIcon(item.type) as any} 
          size={24} 
          color="white" 
        />
      </View>
      
      <View style={styles.itemContent}>
        <View style={styles.itemHeader}>
          <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
          <View style={styles.itemTypeBadge}>
            <Text style={styles.itemTypeText}>
              {item.type === 'event' ? 'Événement' : 
               item.type === 'souvenir' ? 'Souvenir' : 'Tâche'}
            </Text>
          </View>
        </View>
        
        <View style={styles.itemDetails}>
          <View style={styles.itemDetail}>
            <MaterialCommunityIcons name="calendar" size={16} color="#666" />
            <Text style={styles.itemDetailText}>{formatDate(item.date)}</Text>
          </View>
          
          {item.time && (
            <View style={styles.itemDetail}>
              <MaterialCommunityIcons name="clock" size={16} color="#666" />
              <Text style={styles.itemDetailText}>{formatTime(item.time)}</Text>
            </View>
          )}
          
          {item.place && (
            <View style={styles.itemDetail}>
              <MaterialCommunityIcons name="map-marker" size={16} color="#666" />
              <Text style={styles.itemDetailText} numberOfLines={1}>{item.place}</Text>
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
      
      <MaterialCommunityIcons name="chevron-right" size={24} color="#CCC" />
    </Pressable>
  );

  const renderFilterButton = (filter: 'all' | 'events' | 'souvenirs' | 'todos', label: string, icon: string) => (
    <Pressable
      style={[styles.filterButton, activeFilter === filter && styles.filterButtonActive]}
      onPress={() => setActiveFilter(filter)}
    >
      <MaterialCommunityIcons 
        name={icon as any} 
        size={20} 
        color={activeFilter === filter ? 'white' : '#666'} 
      />
      <Text style={[styles.filterButtonText, activeFilter === filter && styles.filterButtonTextActive]}>
        {label}
      </Text>
    </Pressable>
  );

  if (isLoading) {
    return (
      <AppLayout>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </AppLayout>
    );
  }

  const filteredItems = getFilteredItems();

  return (
    <AppLayout>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Tous nos éléments</Text>
          <Text style={styles.subtitle}>
            {filteredItems.length} élément{filteredItems.length !== 1 ? 's' : ''} trouvé{filteredItems.length !== 1 ? 's' : ''}
          </Text>
        </View>

        {/* Filter Buttons */}
        <View style={styles.filterContainer}>
          {renderFilterButton('all', 'Tout', 'view-list')}
          {renderFilterButton('events', 'Événements', 'calendar-event')}
          {renderFilterButton('souvenirs', 'Souvenirs', 'camera')}
          {renderFilterButton('todos', 'Tâches', 'checkbox-marked-outline')}
        </View>

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
            <MaterialCommunityIcons name="inbox-outline" size={64} color="#CCC" />
            <Text style={styles.emptyTitle}>
              {activeFilter === 'all' ? 'Aucun élément trouvé' : 
               activeFilter === 'events' ? 'Aucun événement' :
               activeFilter === 'souvenirs' ? 'Aucun souvenir' : 'Aucune tâche'}
            </Text>
            <Text style={styles.emptySubtitle}>
              Commencez par créer votre premier élément dans le calendrier
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
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2D2D2D',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    gap: 8,
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  filterButtonTextActive: {
    color: 'white',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
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
    color: '#2D2D2D',
    flex: 1,
    marginRight: 8,
  },
  itemTypeBadge: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  itemTypeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
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
    color: '#666',
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
    color: '#2D2D2D',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
});

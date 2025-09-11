import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useDarkTheme } from '../../contexts/DarkThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { Todo, todoService } from '../../lib/todoService';
import AppLayout from '../app-layout';

export default function TodoListPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { isDarkMode } = useDarkTheme();
  const { t } = useLanguage();

  const [todos, setTodos] = useState<Todo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'a_faire' | 'en_cours' | 'termine'>('all');

  useEffect(() => {
    if (user) {
      fetchCoupleId();
    }
  }, [user]);

  useEffect(() => {
    if (coupleId) {
      fetchTodos();
    }
  }, [coupleId, filter]);

  const fetchCoupleId = async () => {
    try {
      const { data: coupleData, error: coupleError } = await supabase
        .from('couples')
        .select('id')
        .or(`user1_id.eq.${user!.id},user2_id.eq.${user!.id}`)
        .single();

      if (coupleError) {
        console.error('Error fetching couple:', coupleError);
        return;
      }

      if (coupleData) {
        setCoupleId(coupleData.id);
      }
    } catch (error) {
      console.error('Error fetching couple:', error);
    }
  };

  const fetchTodos = async () => {
    if (!coupleId) return;

    try {
      setIsLoading(true);
      let result;

      if (filter === 'all') {
        result = await todoService.getTodos(coupleId);
      } else {
        result = await todoService.getTodosByStatus(coupleId, filter);
      }

      if (result.error) {
        console.error('Error fetching todos:', result.error);
        Alert.alert('Erreur', 'Impossible de charger les tâches');
        return;
      }

      setTodos(result.data || []);
    } catch (error) {
      console.error('Error fetching todos:', error);
      Alert.alert('Erreur', 'Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await fetchTodos();
    setIsRefreshing(false);
  };

  const handleTodoPress = (todo: Todo) => {
    router.push({
      pathname: '/pages/todo-details',
      params: { todoId: todo.id }
    });
  };

  const handleCreateTodo = () => {
    router.push({
      pathname: '/pages/create-todo',
      params: { coupleId }
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-500';
      case 'normal':
        return 'text-yellow-500';
      case 'peut_attendre':
        return 'text-green-500';
      default:
        return 'text-gray-500';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'alert-circle';
      case 'normal':
        return 'clock';
      case 'peut_attendre':
        return 'clock-outline';
      default:
        return 'clock';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'a_faire':
        return 'text-gray-500';
      case 'en_cours':
        return 'text-blue-500';
      case 'termine':
        return 'text-green-500';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'a_faire':
        return 'checkbox-blank-circle-outline';
      case 'en_cours':
        return 'clock';
      case 'termine':
        return 'check-circle';
      default:
        return 'checkbox-blank-circle-outline';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
    });
  };

  const isOverdue = (dueDate: string, status: string) => {
    if (status === 'termine') return false;
    const today = new Date();
    const due = new Date(dueDate);
    return due < today;
  };

  if (isLoading) {
    return (
      <AppLayout>
        <View className={`flex-1 ${isDarkMode ? 'bg-dark-bg' : 'bg-background'} justify-center items-center`}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text className={`mt-4 ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
            Chargement des tâches...
          </Text>
        </View>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <ScrollView 
        className={`flex-1 ${isDarkMode ? 'bg-dark-bg' : 'bg-background'}`}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View className={`px-6 py-4 ${isDarkMode ? 'bg-dark-card' : 'bg-white'} border-b ${isDarkMode ? 'border-dark-border' : 'border-gray-200'}`}>
          <View className="flex-row items-center justify-between">
            <TouchableOpacity
              onPress={() => router.back()}
              className="flex-row items-center"
            >
              <MaterialCommunityIcons 
                name="arrow-left" 
                size={24} 
                color={isDarkMode ? '#fff' : '#000'} 
              />
              <Text className={`ml-2 text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Mes Tâches
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={handleCreateTodo}
              className="p-2 rounded-lg bg-blue-500"
            >
              <MaterialCommunityIcons name="plus" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Filter Tabs */}
        <View className={`px-6 py-4 ${isDarkMode ? 'bg-dark-card' : 'bg-white'} border-b ${isDarkMode ? 'border-dark-border' : 'border-gray-200'}`}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row space-x-2">
              {[
                { key: 'all', label: 'Toutes' },
                { key: 'a_faire', label: 'À faire' },
                { key: 'en_cours', label: 'En cours' },
                { key: 'termine', label: 'Terminées' },
              ].map((tab) => (
                <TouchableOpacity
                  key={tab.key}
                  onPress={() => setFilter(tab.key as any)}
                  className={`px-4 py-2 rounded-lg ${
                    filter === tab.key
                      ? 'bg-blue-500'
                      : isDarkMode
                      ? 'bg-dark-bg border border-dark-border'
                      : 'bg-gray-100'
                  }`}
                >
                  <Text className={`${
                    filter === tab.key
                      ? 'text-white'
                      : isDarkMode
                      ? 'text-white'
                      : 'text-gray-700'
                  }`}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Todo List */}
        <View className="p-6">
          {todos.length === 0 ? (
            <View className="items-center py-12">
              <MaterialCommunityIcons 
                name="clipboard-text-outline" 
                size={64} 
                color={isDarkMode ? '#666' : '#999'} 
              />
              <Text className={`mt-4 text-lg ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
                Aucune tâche trouvée
              </Text>
              <Text className={`mt-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {filter === 'all' ? 'Créez votre première tâche' : `Aucune tâche ${filter === 'a_faire' ? 'à faire' : filter === 'en_cours' ? 'en cours' : 'terminée'}`}
              </Text>
            </View>
          ) : (
            <View className="space-y-3">
              {todos.map((todo) => (
                <Pressable
                  key={todo.id}
                  onPress={() => handleTodoPress(todo)}
                  style={{
                    padding: 16,
                    borderRadius: 8,
                    borderWidth: 1,
                    backgroundColor: todo.status === 'termine' 
                      ? (isDarkMode ? '#1A1A1A' : '#FFFFFF')  // Dark background for completed tasks in dark mode
                      : (isDarkMode ? '#1A1A1A' : '#FFFFFF'), // Dark background for other tasks in dark mode
                    borderColor: todo.status === 'termine' 
                      ? (isDarkMode ? '#333333' : '#E5E7EB')  // Dark border for completed tasks
                      : (isDarkMode ? '#333333' : '#E5E7EB')  // Dark border for other tasks
                  }}
                >
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1">
                      <View className="flex-row items-center mb-2">
                        <MaterialCommunityIcons 
                          name={getStatusIcon(todo.status)} 
                          size={20} 
                          color={todo.status === 'termine' 
                            ? (isDarkMode ? '#FFFFFF' : '#000000')  // White icon for completed tasks in dark mode
                            : (isDarkMode ? '#FFFFFF' : '#000000')  // White icon for other tasks in dark mode
                          } 
                        />
                        <Text style={{
                          marginLeft: 8,
                          fontSize: 16,
                          fontWeight: '500',
                          color: todo.status === 'termine' 
                            ? (isDarkMode ? '#FFFFFF' : '#000000')  // White text for completed tasks in dark mode
                            : (isDarkMode ? '#FFFFFF' : '#000000')  // White text for other tasks in dark mode
                        }}>
                          {todo.title}
                        </Text>
                      </View>
                      
                      {todo.description && (
                        <Text style={{
                          fontSize: 14,
                          marginBottom: 8,
                          color: todo.status === 'termine' 
                            ? (isDarkMode ? '#CCCCCC' : '#666666')  // Light gray text for completed tasks in dark mode
                            : (isDarkMode ? '#CCCCCC' : '#666666')  // Light gray text for other tasks in dark mode
                        }} numberOfLines={2}>
                          {todo.description}
                        </Text>
                      )}
                      
                      <View className="flex-row items-center space-x-4">
                        <View className="flex-row items-center">
                          <MaterialCommunityIcons 
                            name={getPriorityIcon(todo.priority)} 
                            size={16} 
                            color={todo.status === 'termine' 
                              ? (isDarkMode ? '#FFFFFF' : '#000000')  // White icon for completed tasks in dark mode
                              : (isDarkMode ? '#FFFFFF' : '#000000')  // White icon for other tasks in dark mode
                            } 
                          />
                          <Text style={{
                            marginLeft: 4,
                            fontSize: 12,
                            color: todo.status === 'termine' 
                              ? (isDarkMode ? '#CCCCCC' : '#666666')  // Light gray text for completed tasks in dark mode
                              : (isDarkMode ? '#FFFFFF' : '#000000')  // White text for other tasks in dark mode
                          }}>
                            {todo.priority === 'urgent' ? 'Urgent' : 
                             todo.priority === 'normal' ? 'Normal' : 'Peut attendre'}
                          </Text>
                        </View>
                        
                        {todo.due_date && (
                          <View className="flex-row items-center">
                            <MaterialCommunityIcons 
                              name="calendar" 
                              size={16} 
                              color={todo.status === 'termine' 
                                ? (isDarkMode ? '#FFFFFF' : '#000000')  // White icon for completed tasks in dark mode
                                : (isDarkMode ? '#FFFFFF' : '#000000')  // White icon for other tasks in dark mode
                              } 
                            />
                            <Text style={{
                              marginLeft: 4,
                              fontSize: 12,
                              color: todo.status === 'termine' 
                                ? (isDarkMode ? '#CCCCCC' : '#666666')  // Light gray text for completed tasks in dark mode
                                : (isOverdue(todo.due_date, todo.status) 
                                    ? '#EF4444'  // Red for overdue
                                    : (isDarkMode ? '#CCCCCC' : '#666666'))  // Light gray for other tasks in dark mode
                            }}>
                              {formatDate(todo.due_date)}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                    
                    <MaterialCommunityIcons 
                      name="chevron-right" 
                      size={20} 
                      color={todo.status === 'termine' 
                        ? (isDarkMode ? '#666666' : '#999999')  // Dark gray for completed tasks
                        : (isDarkMode ? '#666666' : '#999999')  // Same for other tasks
                      } 
                    />
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </AppLayout>
  );
}

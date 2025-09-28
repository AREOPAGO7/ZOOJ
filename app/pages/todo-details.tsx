import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useDarkTheme } from '../../contexts/DarkThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../lib/auth';
import todoTranslations from '../../lib/todo-translations.json';
import { formatDateForTodo, formatTimeForTodo } from '../../lib/todoDateUtils';
import { Todo, todoService, UpdateTodoData } from '../../lib/todoService';
import AppLayout from '../app-layout';

export default function TodoDetailsPage() {
  const router = useRouter();
  const { todoId } = useLocalSearchParams();
  const { user } = useAuth();
  const { isDarkMode } = useDarkTheme();
  const { t, language } = useLanguage();
  
  // Todo-specific translation function
  const todoT = (key: string, params?: Record<string, string>): string => {
    const keys = key.split('.');
    let value: any = todoTranslations[language];
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return key;
      }
    }
    
    let result = typeof value === 'string' ? value : key;
    
    // Handle placeholder substitution
    if (params && typeof result === 'string') {
      Object.entries(params).forEach(([placeholder, replacement]) => {
        result = result.replace(new RegExp(`\\{${placeholder}\\}`, 'g'), replacement);
      });
    }
    
    return result;
  };

  const [todo, setTodo] = useState<Todo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Edit states
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDueDate, setEditDueDate] = useState(new Date());
  const [editDueTime, setEditDueTime] = useState(new Date());
  const [editPriority, setEditPriority] = useState<'urgent' | 'normal' | 'peut_attendre'>('normal');
  const [editStatus, setEditStatus] = useState<'a_faire' | 'en_cours' | 'termine'>('a_faire');

  // Date/Time picker states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => {
    if (todoId) {
      fetchTodo();
    }
  }, [todoId]);

  const fetchTodo = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await todoService.getTodo(todoId as string);
      
      if (error) {
        console.error('Error fetching todo:', error);
        Alert.alert(todoT('todoDetails.error'), todoT('todoDetails.errorLoading'));
        return;
      }

      if (data) {
        setTodo(data);
        setEditTitle(data.title);
        setEditDescription(data.description || '');
        setEditDueDate(data.due_date ? new Date(data.due_date) : new Date());
        setEditDueTime(data.time ? new Date(`2000-01-01T${data.time}`) : new Date());
        setEditPriority(data.priority);
        setEditStatus(data.status);
      }
    } catch (error) {
      console.error('Error fetching todo:', error);
      Alert.alert(todoT('todoDetails.error'), todoT('todoDetails.errorOccurred'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!todo) return;

    if (!editTitle.trim()) {
      Alert.alert(todoT('todoDetails.error'), todoT('todoDetails.titleRequired'));
      return;
    }

    try {
      setIsSaving(true);
      
      const updateData: UpdateTodoData = {
        title: editTitle.trim(),
        description: editDescription.trim() || null,
        due_date: editDueDate.toISOString().split('T')[0],
        time: editDueTime.toTimeString().split(' ')[0],
        priority: editPriority,
        status: editStatus,
      };

      const { data, error } = await todoService.updateTodo(todo.id, updateData);
      
      if (error) {
        console.error('Error updating todo:', error);
        Alert.alert(todoT('todoDetails.error'), todoT('todoDetails.errorSaving'));
        return;
      }

      if (data) {
        setTodo(data);
        setIsEditing(false);
        Alert.alert(todoT('todoDetails.messages.success'), todoT('todoDetails.messages.taskUpdated', { title: data.title }));
      }
    } catch (error) {
      console.error('Error updating todo:', error);
      Alert.alert(todoT('todoDetails.error'), todoT('todoDetails.errorOccurred'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      todoT('todoDetails.deleteTask'),
      todoT('todoDetails.messages.deleteConfirmation', { title: todo?.title || '' }),
      [
        {
          text: todoT('todoDetails.cancel'),
          style: 'cancel',
        },
        {
          text: todoT('todoDetails.delete'),
          style: 'destructive',
          onPress: confirmDelete,
        },
      ]
    );
  };

  const confirmDelete = async () => {
    if (!todo) return;

    try {
      setIsDeleting(true);
      const { error } = await todoService.deleteTodo(todo.id);
      
      if (error) {
        console.error('Error deleting todo:', error);
        Alert.alert(todoT('todoDetails.error'), todoT('todoDetails.errorDeleting'));
        return;
      }

      Alert.alert(todoT('todoDetails.messages.success'), todoT('todoDetails.messages.taskDeleted', { title: todo.title }), [
        {
          text: todoT('todoDetails.messages.ok'),
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error('Error deleting todo:', error);
      Alert.alert(todoT('todoDetails.error'), todoT('todoDetails.errorOccurred'));
    } finally {
      setIsDeleting(false);
    }
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

  const formatDate = (date: Date) => {
    return formatDateForTodo(date, language);
  };

  const formatTime = (time: Date) => {
    return formatTimeForTodo(time, language);
  };

  if (isLoading) {
    return (
      <AppLayout>
        <View className={`flex-1 ${isDarkMode ? 'bg-dark-bg' : 'bg-background'} justify-center items-center`}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text className={`mt-4 ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
            {todoT('todoDetails.loading')}
          </Text>
        </View>
      </AppLayout>
    );
  }

  if (!todo) {
    return (
      <AppLayout>
        <View className={`flex-1 ${isDarkMode ? 'bg-dark-bg' : 'bg-background'} justify-center items-center`}>
          <MaterialCommunityIcons 
            name="file-document-outline" 
            size={64} 
            color={isDarkMode ? '#666' : '#999'} 
          />
          <Text className={`mt-4 text-lg ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
            {todoT('todoDetails.errorLoading')}
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            className={`mt-4 px-6 py-3 rounded-lg ${isDarkMode ? 'bg-dark-card' : 'bg-blue-500'}`}
          >
            <Text className={`${isDarkMode ? 'text-white' : 'text-white'} font-medium`}>
              {t('common.back')}
            </Text>
          </TouchableOpacity>
        </View>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <ScrollView 
        style={{
          flex: 1,
          backgroundColor: isDarkMode ? '#1A1A1A' : '#F5F5F5'
        }}
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: 20
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header matching the exact UI from images */}
        <View style={{
          paddingHorizontal: 20,
          paddingVertical: 16,
          backgroundColor: '#FFFFFF',
          borderBottomWidth: 1,
          borderBottomColor: '#E5E5E5'
        }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative'
          }}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={{
                position: 'absolute',
                left: 0,
                padding: 8
              }}
            >
              <MaterialCommunityIcons 
                name="arrow-left" 
                size={24} 
                color="#000000" 
              />
            </TouchableOpacity>
            
            <Text style={{
              fontSize: 18,
              fontWeight: '600',
              color: '#000000'
            }}>
              {isEditing ? todoT('createTodo.title') : todoT('todoDetails.title')}
            </Text>
          </View>
        </View>

        {/* Content matching the exact UI from images */}
        <View style={{ padding: 20 }}>
          {/* Title */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{
              fontSize: 16,
              fontWeight: '600',
              color: isDarkMode ? '#FFFFFF' : '#000000',
              marginBottom: 12
            }}>
              {todoT('todoDetails.fields.title')}
            </Text>
            {isEditing ? (
              <TextInput
                value={editTitle}
                onChangeText={setEditTitle}
                placeholder={todoT('todoDetails.placeholders.title')}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: '#E5E5E5',
                  backgroundColor: '#FFFFFF',
                  fontSize: 16,
                  color: '#000000'
                }}
                placeholderTextColor="#999999"
              />
            ) : (
              <Text style={{
                fontSize: 18,
                fontWeight: '600',
                color: isDarkMode ? '#FFFFFF' : '#000000'
              }}>
                {todo.title}
              </Text>
            )}
          </View>

          {/* Description */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{
              fontSize: 16,
              fontWeight: '600',
              color: isDarkMode ? '#FFFFFF' : '#000000',
              marginBottom: 12
            }}>
              {todoT('todoDetails.fields.description')}
            </Text>
            {isEditing ? (
              <TextInput
                value={editDescription}
                onChangeText={setEditDescription}
                placeholder={todoT('todoDetails.placeholders.description')}
                multiline
                numberOfLines={4}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: '#E5E5E5',
                  backgroundColor: '#FFFFFF',
                  fontSize: 16,
                  color: '#000000',
                  textAlignVertical: 'top',
                  minHeight: 80
                }}
                placeholderTextColor="#999999"
              />
            ) : (
              <Text style={{
                fontSize: 16,
                lineHeight: 24,
                color: isDarkMode ? '#CCCCCC' : '#666666'
              }}>
                {todo.description || t('common.noDescription')}
              </Text>
            )}
          </View>

          {/* Due Date & Time */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{
              fontSize: 16,
              fontWeight: '600',
              color: isDarkMode ? '#FFFFFF' : '#000000',
              marginBottom: 12
            }}>
              {todoT('todoDetails.fields.dueDate')}
            </Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {/* Date Input */}
              <View style={{ flex: 1 }}>
                {isEditing ? (
                  <TouchableOpacity
                    onPress={() => setShowDatePicker(true)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: '#E5E5E5',
                      backgroundColor: '#FFFFFF'
                    }}
                  >
                    <MaterialCommunityIcons 
                      name="calendar" 
                      size={20} 
                      color="#999999" 
                    />
                    <Text style={{
                      marginLeft: 8,
                      fontSize: 16,
                      color: '#000000'
                    }}>
                      {editDueDate.toLocaleDateString('fr-FR')}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: '#E5E5E5',
                    backgroundColor: '#FFFFFF'
                  }}>
                    <MaterialCommunityIcons 
                      name="calendar" 
                      size={20} 
                      color="#999999" 
                    />
                    <Text style={{
                      marginLeft: 8,
                      fontSize: 16,
                      color: '#000000'
                    }}>
                      {todo.due_date ? formatDate(new Date(todo.due_date)) : 'Aucune date définie'}
                    </Text>
                  </View>
                )}
              </View>
              
              {/* Time Input */}
              <View style={{ flex: 1 }}>
                {isEditing ? (
                  <TouchableOpacity
                    onPress={() => setShowTimePicker(true)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: '#E5E5E5',
                      backgroundColor: '#FFFFFF'
                    }}
                  >
                    <MaterialCommunityIcons 
                      name="clock" 
                      size={20} 
                      color="#999999" 
                    />
                    <Text style={{
                      marginLeft: 8,
                      fontSize: 16,
                      color: '#000000'
                    }}>
                      {formatTime(editDueTime)}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: '#E5E5E5',
                    backgroundColor: '#FFFFFF'
                  }}>
                    <MaterialCommunityIcons 
                      name="clock" 
                      size={20} 
                      color="#999999" 
                    />
                    <Text style={{
                      marginLeft: 8,
                      fontSize: 16,
                      color: '#000000'
                    }}>
                      {todo.time || todoT('todoDetails.placeholders.noTimeSet')}
                    </Text>
                  </View>
                )}
              </View>
            </View>
            
            {/* Date/Time Pickers */}
            {showDatePicker && (
              <DateTimePicker
                value={editDueDate}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) {
                    setEditDueDate(selectedDate);
                  }
                }}
              />
            )}
            
            {showTimePicker && (
              <DateTimePicker
                value={editDueTime}
                mode="time"
                display="default"
                onChange={(event, selectedTime) => {
                  setShowTimePicker(false);
                  if (selectedTime) {
                    setEditDueTime(selectedTime);
                  }
                }}
              />
            )}
          </View>

          {/* Priority */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{
              fontSize: 16,
              fontWeight: '600',
              color: isDarkMode ? '#FFFFFF' : '#000000',
              marginBottom: 12
            }}>
              {todoT('todoDetails.fields.priority')}
            </Text>
            {isEditing ? (
              <View style={{ flexDirection: 'row', gap: 12 }}>
                {(['urgent', 'normal', 'peut_attendre'] as const).map((priority) => (
                  <TouchableOpacity
                    key={priority}
                    onPress={() => setEditPriority(priority)}
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: editPriority === priority ? '#87CEEB' : '#E5E5E5',
                      backgroundColor: editPriority === priority ? '#E6F3FF' : '#FFFFFF'
                    }}
                  >
                    <Text style={{
                      fontSize: 16,
                      fontWeight: '500',
                      color: editPriority === priority ? '#4682B4' : '#999999',
                      textAlign: 'center'
                    }}>
                      {todoT(`todoDetails.priorities.${priority}`)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: '#E5E5E5',
                backgroundColor: '#FFFFFF'
              }}>
                <MaterialCommunityIcons 
                  name={getPriorityIcon(todo.priority)} 
                  size={20} 
                  color="#999999" 
                />
                <Text style={{
                  marginLeft: 8,
                  fontSize: 16,
                  color: '#000000'
                }}>
                  {todoT(`todoDetails.priorities.${todo.priority}`)}
                </Text>
              </View>
            )}
          </View>

          {/* Status */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{
              fontSize: 16,
              fontWeight: '600',
              color: isDarkMode ? '#FFFFFF' : '#000000',
              marginBottom: 12
            }}>
              {todoT('todoDetails.fields.status')}
            </Text>
            {isEditing ? (
              <View style={{ flexDirection: 'row', gap: 12 }}>
                {(['a_faire', 'en_cours', 'termine'] as const).map((status) => (
                  <TouchableOpacity
                    key={status}
                    onPress={() => setEditStatus(status)}
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: editStatus === status ? '#FFB6C1' : '#E5E5E5',
                      backgroundColor: editStatus === status ? '#FFE4E1' : '#FFFFFF'
                    }}
                  >
                    <Text style={{
                      fontSize: 16,
                      fontWeight: '500',
                      color: editStatus === status ? '#DC143C' : '#999999',
                      textAlign: 'center'
                    }}>
                      {todoT(`todoDetails.statuses.${status}`)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: '#E5E5E5',
                backgroundColor: '#FFFFFF'
              }}>
                <MaterialCommunityIcons 
                  name={getStatusIcon(todo.status)} 
                  size={20} 
                  color="#999999" 
                />
                <Text style={{
                  marginLeft: 8,
                  fontSize: 16,
                  color: '#000000'
                }}>
                  {todoT(`todoDetails.statuses.${todo.status}`)}
                </Text>
              </View>
            )}
          </View>

          {/* Created Date */}
          <View>
            <Text className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              {todoT('todoDetails.fields.createdOn')}
            </Text>
            <Text className={`text-base ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              {formatDate(new Date(todo.created_at))}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        {isEditing && (
          <View style={{ padding: 20 }}>
            <TouchableOpacity
              onPress={handleSave}
              disabled={isSaving}
              style={{
                paddingVertical: 16,
                borderRadius: 12,
                backgroundColor: '#87CEEB',
                shadowColor: '#87CEEB',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 6
              }}
            >
              {isSaving ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                  <ActivityIndicator size="small" color="white" />
                  <Text style={{
                    marginLeft: 8,
                    color: 'white',
                    fontWeight: '600',
                    fontSize: 16
                  }}>{todoT('todoDetails.loading')}</Text>
                </View>
              ) : (
                <Text style={{
                  color: 'white',
                  fontWeight: '600',
                  fontSize: 16,
                  textAlign: 'center'
                }}>{todoT('todoDetails.save')}</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* View Mode Action Buttons */}
        {!isEditing && (
          <View style={{ padding: 20 }}>
            <TouchableOpacity
              onPress={() => setIsEditing(true)}
              style={{
                paddingVertical: 16,
                borderRadius: 12,
                backgroundColor: '#87CEEB',
                marginBottom: 12,
                shadowColor: '#87CEEB',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 6
              }}
            >
              <Text style={{
                color: 'white',
                fontWeight: '600',
                fontSize: 16,
                textAlign: 'center'
              }}>{todoT('todoDetails.modifyTask')}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={handleDelete}
              disabled={isDeleting}
              style={{
                paddingVertical: 16,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#FFB6C1',
                backgroundColor: '#FFFFFF'
              }}
            >
              {isDeleting ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                  <ActivityIndicator size="small" color="#DC143C" />
                  <Text style={{
                    marginLeft: 8,
                    color: '#DC143C',
                    fontWeight: '600',
                    fontSize: 16
                  }}>{todoT('todoDetails.loading')}</Text>
                </View>
              ) : (
                <Text style={{
                  color: '#DC143C',
                  fontWeight: '600',
                  fontSize: 16,
                  textAlign: 'center'
                }}>{todoT('todoDetails.deleteTask')}</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </AppLayout>
  );
}
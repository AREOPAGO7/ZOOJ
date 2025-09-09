import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useDarkTheme } from '../../contexts/DarkThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../lib/auth';
import { CreateTodoData, todoService } from '../../lib/todoService';
import AppLayout from '../app-layout';

export default function CreateTodoPage() {
  const router = useRouter();
  const { coupleId } = useLocalSearchParams();
  const { user } = useAuth();
  const { isDarkMode } = useDarkTheme();
  const { t } = useLanguage();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(new Date());
  const [priority, setPriority] = useState<'urgent' | 'normal' | 'peut_attendre'>('normal');
  const [status, setStatus] = useState<'a_faire' | 'en_cours' | 'termine'>('a_faire');
  const [isSaving, setIsSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Erreur', 'Le titre est requis');
      return;
    }

    if (!coupleId) {
      Alert.alert('Erreur', 'ID du couple manquant');
      return;
    }

    try {
      setIsSaving(true);
      
      const todoData: CreateTodoData = {
        couple_id: coupleId as string,
        title: title.trim(),
        description: description.trim() || undefined,
        due_date: dueDate.toISOString().split('T')[0],
        priority,
        status,
      };

      const { data, error } = await todoService.createTodo(todoData);
      
      if (error) {
        console.error('Error creating todo:', error);
        Alert.alert('Erreur', 'Impossible de créer la tâche');
        return;
      }

      if (data) {
        Alert.alert('Succès', 'Tâche créée avec succès', [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]);
      }
    } catch (error) {
      console.error('Error creating todo:', error);
      Alert.alert('Erreur', 'Une erreur est survenue');
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <AppLayout>
      <ScrollView className={`flex-1 ${isDarkMode ? 'bg-dark-bg' : 'bg-background'}`}>
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
                Nouvelle Tâche
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Content */}
        <View className="p-6 space-y-6">
          {/* Title */}
          <View>
            <Text className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Titre *
            </Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Entrez le titre de la tâche"
              className={`px-4 py-3 rounded-lg border ${
                isDarkMode 
                  ? 'bg-dark-card border-dark-border text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
              placeholderTextColor={isDarkMode ? '#666' : '#999'}
            />
          </View>

          {/* Description */}
          <View>
            <Text className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Description
            </Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Entrez la description de la tâche"
              multiline
              numberOfLines={4}
              className={`px-4 py-3 rounded-lg border ${
                isDarkMode 
                  ? 'bg-dark-card border-dark-border text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
              placeholderTextColor={isDarkMode ? '#666' : '#999'}
            />
          </View>

          {/* Due Date */}
          <View>
            <Text className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Date d'échéance
            </Text>
            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              className={`px-4 py-3 rounded-lg border ${
                isDarkMode 
                  ? 'bg-dark-card border-dark-border' 
                  : 'bg-white border-gray-300'
              }`}
            >
              <Text className={`${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {formatDate(dueDate)}
              </Text>
            </TouchableOpacity>
            
            {showDatePicker && (
              <DateTimePicker
                value={dueDate}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) {
                    setDueDate(selectedDate);
                  }
                }}
              />
            )}
          </View>

          {/* Priority */}
          <View>
            <Text className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Priorité
            </Text>
            <View className="flex-row space-x-2">
              {(['urgent', 'normal', 'peut_attendre'] as const).map((priorityOption) => (
                <TouchableOpacity
                  key={priorityOption}
                  onPress={() => setPriority(priorityOption)}
                  className={`px-4 py-2 rounded-lg border ${
                    priority === priorityOption
                      ? 'border-blue-500 bg-blue-50'
                      : isDarkMode
                      ? 'border-dark-border bg-dark-card'
                      : 'border-gray-300 bg-white'
                  }`}
                >
                  <Text className={`${
                    priority === priorityOption
                      ? 'text-blue-600'
                      : isDarkMode
                      ? 'text-white'
                      : 'text-gray-900'
                  }`}>
                    {priorityOption === 'urgent' ? 'Urgent' : 
                     priorityOption === 'normal' ? 'Normal' : 'Peut attendre'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Status */}
          <View>
            <Text className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Statut
            </Text>
            <View className="flex-row space-x-2">
              {(['a_faire', 'en_cours', 'termine'] as const).map((statusOption) => (
                <TouchableOpacity
                  key={statusOption}
                  onPress={() => setStatus(statusOption)}
                  className={`px-4 py-2 rounded-lg border ${
                    status === statusOption
                      ? 'border-blue-500 bg-blue-50'
                      : isDarkMode
                      ? 'border-dark-border bg-dark-card'
                      : 'border-gray-300 bg-white'
                  }`}
                >
                  <Text className={`${
                    status === statusOption
                      ? 'text-blue-600'
                      : isDarkMode
                      ? 'text-white'
                      : 'text-gray-900'
                  }`}>
                    {statusOption === 'a_faire' ? 'À faire' : 
                     statusOption === 'en_cours' ? 'En cours' : 'Terminé'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View className="p-6 space-y-3">
          <TouchableOpacity
            onPress={handleSave}
            disabled={isSaving}
            className={`py-3 rounded-lg ${isDarkMode ? 'bg-blue-600' : 'bg-blue-500'}`}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text className="text-white text-center font-medium">
                Créer la tâche
              </Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={() => router.back()}
            className={`py-3 rounded-lg border ${
              isDarkMode 
                ? 'border-dark-border bg-dark-card' 
                : 'border-gray-300 bg-white'
            }`}
          >
            <Text className={`text-center font-medium ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Annuler
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </AppLayout>
  );
}

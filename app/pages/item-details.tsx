import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View
} from 'react-native';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import AppLayout from '../app-layout';

const BRAND_BLUE = "#2DB6FF";
const BRAND_PINK = "#F47CC6";
const BRAND_GRAY = "#6C6C6C";

interface ItemDetailsProps {
  itemType: 'event' | 'souvenir' | 'todo';
  itemId: string;
  itemData: string;
}

export default function ItemDetailsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams<ItemDetailsProps>();
  
  const [item, setItem] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Edit form states
  const [editTitle, setEditTitle] = useState('');
  const [editDate, setEditDate] = useState(new Date());
  const [editTime, setEditTime] = useState(new Date());
  const [editPlace, setEditPlace] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPriority, setEditPriority] = useState<'urgent' | 'normal' | 'peut_attendre'>('normal');
  const [editStatus, setEditStatus] = useState<'a_faire' | 'en_cours' | 'termine'>('a_faire');
  
  // Date/Time picker states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'date' | 'time'>('date');

  useEffect(() => {
    if (params.itemData) {
      try {
        const parsedItem = JSON.parse(params.itemData);
        setItem(parsedItem);
        // Initialize edit form with current values
        setEditTitle(parsedItem.title || '');
        setEditDate(new Date(parsedItem.event_date || parsedItem.memory_date || parsedItem.due_date || new Date()));
        if (parsedItem.event_time || parsedItem.memory_time) {
          const timeStr = parsedItem.event_time || parsedItem.memory_time;
          const [hours, minutes] = timeStr.split(':');
          const newTime = new Date();
          newTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
          setEditTime(newTime);
        }
        setEditPlace(parsedItem.place || '');
        setEditDescription(parsedItem.description || '');
        setEditPriority(parsedItem.priority || 'normal');
        setEditStatus(parsedItem.status || 'a_faire');
      } catch (error) {
        console.error('Error parsing item data:', error);
      }
    }
    setIsLoading(false);
  }, [params.itemData]);

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

  const formatDateForDisplay = (date: Date) => {
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const formatTimeForDisplay = (date: Date) => {
    return date.toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const handleDatePickerChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      if (datePickerMode === 'date') {
        setEditDate(selectedDate);
      } else {
        setEditTime(selectedDate);
      }
    }
  };

  const showDatePickerModal = () => {
    setDatePickerMode('date');
    setShowDatePicker(true);
  };

  const showTimePickerModal = () => {
    setDatePickerMode('time');
    setShowTimePicker(true);
  };

  const saveChanges = async () => {
    if (!user || !item || !editTitle.trim()) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    console.log('Saving changes for item:', item);
    console.log('Edit data:', {
      title: editTitle,
      date: editDate,
      time: editTime,
      place: editPlace,
      description: editDescription,
      priority: editPriority,
      status: editStatus
    });

    setIsLoading(true);
    try {
      let result;

      if (item.itemType === 'event') {
        console.log('Updating event with ID:', item.id);
        const updateData = {
          title: editTitle.trim(),
          event_date: editDate.toISOString().split('T')[0],
          event_time: editTime.toTimeString().split(' ')[0],
          place: editPlace.trim(),
          description: editDescription.trim()
        };
        console.log('Event update data:', updateData);
        
        const { data, error } = await supabase
          .from('calendar_events')
          .update(updateData)
          .eq('id', item.id)
          .select()
          .single();

        if (error) {
          console.error('Event update error:', error);
          throw error;
        }
        console.log('Event updated successfully:', data);
        result = data;
      } else if (item.itemType === 'souvenir') {
        console.log('Updating souvenir with ID:', item.id);
        const updateData = {
          title: editTitle.trim(),
          memory_date: editDate.toISOString().split('T')[0],
          memory_time: editTime.toTimeString().split(' ')[0],
          place: editPlace.trim(),
          description: editDescription.trim()
        };
        console.log('Souvenir update data:', updateData);
        
        const { data, error } = await supabase
          .from('calendar_souvenirs')
          .update(updateData)
          .eq('id', item.id)
          .select()
          .single();

        if (error) {
          console.error('Souvenir update error:', error);
          throw error;
        }
        console.log('Souvenir updated successfully:', data);
        result = data;
      } else if (item.itemType === 'todo') {
        console.log('Updating todo with ID:', item.id);
        const updateData = {
          title: editTitle.trim(),
          due_date: editDate.toISOString().split('T')[0],
          description: editDescription.trim(),
          priority: editPriority,
          status: editStatus
        };
        console.log('Todo update data:', updateData);
        
        const { data, error } = await supabase
          .from('calendar_todos')
          .update(updateData)
          .eq('id', item.id)
          .select()
          .single();

        if (error) {
          console.error('Todo update error:', error);
          throw error;
        }
        console.log('Todo updated successfully:', data);
        result = data;
      }

      Alert.alert('Succès', 'Élément mis à jour avec succès');
      setIsEditing(false);
      // Update local item state
      setItem({ ...item, ...result });
    } catch (error) {
      console.error('Error updating item:', error);
      Alert.alert('Erreur', 'Impossible de mettre à jour l\'élément');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteItem = async () => {
    if (!user || !item) return;

    Alert.alert(
      'Confirmation de suppression',
      `Êtes-vous sûr de vouloir supprimer ${item.itemType === 'event' ? 'cet événement' :
       item.itemType === 'souvenir' ? 'ce souvenir' : 'cette tâche'} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Supprimer', 
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              let error;

              if (item.itemType === 'event') {
                const { error: deleteError } = await supabase
                  .from('calendar_events')
                  .delete()
                  .eq('id', item.id);
                error = deleteError;
              } else if (item.itemType === 'souvenir') {
                const { error: deleteError } = await supabase
                  .from('calendar_souvenirs')
                  .delete()
                  .eq('id', item.id);
                error = deleteError;
              } else if (item.itemType === 'todo') {
                const { error: deleteError } = await supabase
                  .from('calendar_todos')
                  .delete()
                  .eq('id', item.id);
                error = deleteError;
              }

              if (error) throw error;
              Alert.alert('Succès', 'Élément supprimé avec succès');
              router.back();
            } catch (error) {
              console.error('Error deleting item:', error);
              Alert.alert('Erreur', 'Impossible de supprimer l\'élément');
            } finally {
              setIsDeleting(false);
            }
          }
        }
      ]
    );
  };

  if (isLoading) {
    return (
      <AppLayout>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BRAND_BLUE} />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </AppLayout>
    );
  }

  if (!item) {
    return (
      <AppLayout>
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle" size={64} color={BRAND_GRAY} />
          <Text style={styles.errorText}>Élément non trouvé</Text>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Retour</Text>
          </Pressable>
        </View>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <MaterialCommunityIcons name="chevron-left" size={28} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>
            {item.itemType === 'event' ? 'Événement' :
             item.itemType === 'souvenir' ? 'Souvenir' : 'Tâche'}
          </Text>
          <Pressable 
            style={styles.editButton} 
            onPress={() => setIsEditing(!isEditing)}
          >
            <MaterialCommunityIcons 
              name={isEditing ? "check" : "pencil"} 
              size={20} 
              color="#FFFFFF" 
            />
          </Pressable>
        </View>

        {/* Item Content */}
        <View style={styles.content}>
          {/* Title */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Titre</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={editTitle}
                onChangeText={setEditTitle}
                placeholder="Titre de l'élément"
              />
            ) : (
              <Text style={styles.sectionText}>{item.title}</Text>
            )}
          </View>

          {/* Date */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Date</Text>
            {isEditing ? (
              <Pressable 
                style={styles.dateTimeButton}
                onPress={showDatePickerModal}
              >
                <Text style={styles.dateTimeButtonText}>
                  {formatDateForDisplay(editDate)}
                </Text>
                <MaterialCommunityIcons name="calendar" size={20} color={BRAND_PINK} />
              </Pressable>
            ) : (
              <Text style={styles.sectionText}>
                {item.itemType === 'event' ? item.event_date :
                 item.itemType === 'souvenir' ? item.memory_date :
                 item.due_date}
              </Text>
            )}
          </View>

          {/* Time (for events and souvenirs) */}
          {(item.itemType === 'event' || item.itemType === 'souvenir') && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Heure</Text>
              {isEditing ? (
                <Pressable 
                  style={styles.dateTimeButton}
                  onPress={showTimePickerModal}
                >
                  <Text style={styles.dateTimeButtonText}>
                    {formatTimeForDisplay(editTime)}
                  </Text>
                  <MaterialCommunityIcons name="clock" size={20} color={BRAND_BLUE} />
                </Pressable>
              ) : (
                <Text style={styles.sectionText}>
                  {formatTime(item.itemType === 'event' ? item.event_time : item.memory_time)}
                </Text>
              )}
            </View>
          )}

          {/* Place (for events and souvenirs) */}
          {(item.itemType === 'event' || item.itemType === 'souvenir') && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Lieu</Text>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={editPlace}
                  onChangeText={setEditPlace}
                  placeholder="Lieu de l'événement"
                />
              ) : (
                <Text style={styles.sectionText}>{item.place || 'Non spécifié'}</Text>
              )}
            </View>
          )}

          {/* Priority and Status for Todo */}
          {item.itemType === 'todo' && (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Priorité</Text>
                {isEditing ? (
                  <View style={styles.pickerContainer}>
                    {(['urgent', 'normal', 'peut_attendre'] as const).map((priority) => (
                      <Pressable
                        key={priority}
                        style={[
                          styles.pickerOption,
                          editPriority === priority && styles.pickerOptionSelected
                        ]}
                        onPress={() => setEditPriority(priority)}
                      >
                        <Text style={[
                          styles.pickerOptionText,
                          editPriority === priority && styles.pickerOptionTextSelected
                        ]}>
                          {priority === 'urgent' ? 'Urgent' : 
                           priority === 'normal' ? 'Normal' : 'Peut attendre'}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                ) : (
                  <View style={[styles.badge, { backgroundColor: getPriorityColor(item.priority) }]}>
                    <Text style={styles.badgeText}>
                      {item.priority === 'urgent' ? 'Urgent' : 
                       item.priority === 'normal' ? 'Normal' : 'Peut attendre'}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Statut</Text>
                {isEditing ? (
                  <View style={styles.pickerContainer}>
                    {(['a_faire', 'en_cours', 'termine'] as const).map((status) => (
                      <Pressable
                        key={status}
                        style={[
                          styles.pickerOption,
                          editStatus === status && styles.pickerOptionSelected
                        ]}
                        onPress={() => setEditStatus(status)}
                      >
                        <Text style={[
                          styles.pickerOptionText,
                          editStatus === status && styles.pickerOptionTextSelected
                        ]}>
                          {status === 'a_faire' ? 'À faire' : 
                           status === 'en_cours' ? 'En cours' : 'Terminé'}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                ) : (
                  <View style={[styles.badge, { backgroundColor: getStatusColor(item.status) }]}>
                    <Text style={styles.badgeText}>
                      {item.status === 'a_faire' ? 'À faire' : 
                       item.status === 'en_cours' ? 'En cours' : 'Terminé'}
                    </Text>
                  </View>
                )}
              </View>
            </>
          )}

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            {isEditing ? (
              <TextInput
                style={[styles.input, styles.textArea]}
                value={editDescription}
                onChangeText={setEditDescription}
                placeholder="Description de l'élément"
                multiline
                numberOfLines={4}
              />
            ) : (
              <Text style={styles.sectionText}>{item.description || 'Aucune description'}</Text>
            )}
          </View>

          {/* Image for Souvenir */}
          {item.itemType === 'souvenir' && item.image_url && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Photo</Text>
              <Image source={{ uri: item.image_url }} style={styles.itemImage} />
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          {isEditing ? (
            <>
              <Pressable
                style={styles.saveButton}
                onPress={saveChanges}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="check" size={20} color="#FFFFFF" />
                    <Text style={styles.saveButtonText}>Sauvegarder</Text>
                  </>
                )}
              </Pressable>

              <Pressable
                style={styles.cancelButton}
                onPress={() => setIsEditing(false)}
              >
                <MaterialCommunityIcons name="close" size={20} color="#FFFFFF" />
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Pressable
                style={styles.editActionButton}
                onPress={() => setIsEditing(true)}
              >
                <MaterialCommunityIcons name="pencil" size={20} color="#FFFFFF" />
                <Text style={styles.editActionButtonText}>Modifier</Text>
              </Pressable>

              <Pressable
                style={styles.deleteActionButton}
                onPress={deleteItem}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="delete" size={20} color="#FFFFFF" />
                    <Text style={styles.deleteActionButtonText}>Supprimer</Text>
                  </>
                )}
              </Pressable>
            </>
          )}
        </View>

        {/* Date Picker */}
        {showDatePicker && (
          <DateTimePicker
            value={datePickerMode === 'date' ? editDate : editTime}
            mode={datePickerMode}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDatePickerChange}
            style={Platform.OS === 'ios' ? styles.pickerOverlay : undefined}
          />
        )}

        {/* Time Picker */}
        {showTimePicker && (
          <DateTimePicker
            value={editTime}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDatePickerChange}
            style={Platform.OS === 'ios' ? styles.pickerOverlay : undefined}
          />
        )}

        {/* iOS Picker Buttons */}
        {Platform.OS === 'ios' && (showDatePicker || showTimePicker) && (
          <View style={styles.pickerButtonsContainer}>
            <Pressable
              style={styles.pickerButton}
              onPress={() => {
                setShowDatePicker(false);
                setShowTimePicker(false);
              }}
            >
              <Text style={styles.pickerButtonText}>Terminé</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </AppLayout>
  );
}

const styles = {
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 16,
    color: BRAND_GRAY,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    color: BRAND_GRAY,
    fontSize: 18,
    textAlign: 'center' as const,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700' as const,
  },
  header: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: BRAND_PINK,
  },
  backButton: {
    padding: 12,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    textAlign: 'center' as const,
    flex: 1,
  },
  editButton: {
    padding: 12,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#2D2D2D',
    marginBottom: 8,
  },
  sectionText: {
    fontSize: 16,
    color: '#424242',
    lineHeight: 22,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top' as const,
  },
  dateTimeButton: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#FFFFFF',
  },
  dateTimeButtonText: {
    fontSize: 16,
    color: '#424242',
  },
  pickerContainer: {
    flexDirection: 'row' as const,
    gap: 8,
  },
  pickerOption: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  pickerOptionSelected: {
    backgroundColor: BRAND_PINK,
    borderColor: BRAND_PINK,
  },
  pickerOptionText: {
    fontSize: 14,
    color: '#666666',
  },
  pickerOptionTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700' as const,
  },
  badge: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'flex-start' as const,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  itemImage: {
    width: '100%' as any,
    height: 200,
    borderRadius: 12,
    marginTop: 8,
  },
  actionButtonsContainer: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 20,
    paddingVertical: 30,
    gap: 16,
  },
  editActionButton: {
    backgroundColor: BRAND_PINK,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 25,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flexDirection: 'row' as const,
    flex: 1,
  },
  editActionButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    marginLeft: 8,
  },
  deleteActionButton: {
    backgroundColor: '#FF4757',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 25,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flexDirection: 'row' as const,
    flex: 1,
  },
  deleteActionButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    marginLeft: 8,
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 25,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flexDirection: 'row' as const,
    flex: 1,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    marginLeft: 8,
  },
  cancelButton: {
    backgroundColor: BRAND_GRAY,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 25,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flexDirection: 'row' as const,
    flex: 1,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    margin: 20,
    alignItems: 'center' as const,
    minWidth: 300,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#2D2D2D',
    marginBottom: 20,
    textAlign: 'center' as const,
  },
  datePickerContainer: {
    alignItems: 'center' as const,
    marginBottom: 20,
  },
  timePickerContainer: {
    alignItems: 'center' as const,
    marginBottom: 20,
  },
  datePickerText: {
    fontSize: 16,
    color: '#424242',
    marginBottom: 16,
    textAlign: 'center' as const,
  },
  timePickerText: {
    fontSize: 16,
    color: '#424242',
    marginBottom: 16,
    textAlign: 'center' as const,
  },
  timeButtonsRow: {
    flexDirection: 'row' as const,
    gap: 12,
    marginBottom: 12,
  },
  modalButton: {
    backgroundColor: BRAND_PINK,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  modalCloseButton: {
    backgroundColor: BRAND_GRAY,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
  },
  modalCloseButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  pickerOverlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  pickerButtonsContainer: {
    flexDirection: 'row' as const,
    justifyContent: 'center' as const,
    marginTop: 20,
  },
  pickerButton: {
    backgroundColor: BRAND_PINK,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
  },
  pickerButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
};

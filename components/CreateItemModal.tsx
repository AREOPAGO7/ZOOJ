import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useDarkTheme } from '../contexts/DarkThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';

// Constants
const BRAND_BLUE = '#2DB6FF';
const BRAND_PINK = '#F47CC6';
const BRAND_GRAY = '#9E9E9E';

interface CreateItemModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (item: any) => void;
  userId: string;
  coupleId: string;
}

export const CreateItemModal: React.FC<CreateItemModalProps> = ({
  visible,
  onClose,
  onSave,
  userId,
  coupleId,
}) => {
  const { t } = useLanguage();
  const { isDarkMode } = useDarkTheme();

  // Form state
  const [formType, setFormType] = useState<'event' | 'souvenir' | 'todo'>('event');
  const [formTitle, setFormTitle] = useState('');
  const [formDate, setFormDate] = useState(new Date());
  const [formTime, setFormTime] = useState(new Date());
  const [formPlace, setFormPlace] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPriority, setFormPriority] = useState<'urgent' | 'normal' | 'peut_attendre'>('normal');
  const [formStatus, setFormStatus] = useState<'a_faire' | 'en_cours' | 'termine'>('a_faire');
  const [formImage, setFormImage] = useState<string | null>(null);
  const [formAlarmable, setFormAlarmable] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Place suggestions
  const [placeSuggestions, setPlaceSuggestions] = useState<any[]>([]);
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(false);

  // Date/Time pickers
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [showCustomTimePicker, setShowCustomTimePicker] = useState(false);

  const handleItemTypeSelect = (type: 'event' | 'souvenir' | 'todo') => {
    setFormType(type);
    // Reset form when changing type
    setFormTitle('');
    setFormPlace('');
    setFormDescription('');
    setFormPriority('normal');
    setFormStatus('a_faire');
    setFormImage(null);
    setFormAlarmable(true);
  };

  const pickImage = async (source: 'camera' | 'gallery') => {
    try {
      let result;
      if (source === 'camera') {
        const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
        if (permissionResult.granted === false) {
          Alert.alert(t('calendar.permissionRequired'), t('calendar.cameraPermission'));
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
        });
      } else {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (permissionResult.granted === false) {
          Alert.alert(t('calendar.permissionRequired'), t('calendar.galleryPermission'));
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
        setFormImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert(t('calendar.error'), t('calendar.imageError'));
    }
  };

  const saveItem = async () => {
    if (!formTitle.trim()) {
      Alert.alert(t('calendar.error'), t('calendar.titleRequired'));
      return;
    }

    setIsLoading(true);
    try {
      const itemData = {
        title: formTitle.trim(),
        date: formDate.toISOString().split('T')[0],
        time: formTime.toTimeString().split(' ')[0],
        place: formPlace.trim(),
        description: formDescription.trim(),
        type: formType,
        user_id: userId,
        couple_id: coupleId,
        priority: formType === 'todo' ? formPriority : null,
        status: formType === 'todo' ? formStatus : null,
        image_url: formImage,
        alarmable: formType === 'event' ? formAlarmable : false,
      };

      const { data, error } = await supabase
        .from('calendar_items')
        .insert([itemData])
        .select()
        .single();

      if (error) throw error;

      onSave(data);
      onClose();
      
      // Reset form
      setFormTitle('');
      setFormPlace('');
      setFormDescription('');
      setFormImage(null);
      setFormAlarmable(true);
    } catch (error) {
      console.error('Error saving item:', error);
      Alert.alert(t('calendar.error'), t('calendar.saveError'));
    } finally {
      setIsLoading(false);
    }
  };

  const styles = {
    modalContainer: {
      flex: 1,
      backgroundColor: isDarkMode ? '#000000' : '#FFFFFF',
    },
    modalHeader: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      paddingHorizontal: 20,
      paddingTop: 60,
      paddingBottom: 20,
      borderBottomWidth: 1,
      borderBottomColor: isDarkMode ? '#333333' : '#E0E0E0',
    },
    closeButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: isDarkMode ? '#1A1A1A' : '#F5F5F5',
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '600' as const,
      color: isDarkMode ? '#FFFFFF' : '#2D2D2D',
    },
    typeSelection: {
      flexDirection: 'row' as const,
      paddingHorizontal: 20,
      paddingVertical: 20,
      gap: 12,
    },
    typeButton: {
      flex: 1,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      backgroundColor: isDarkMode ? '#1A1A1A' : '#FFFFFF',
      borderWidth: 1,
      borderColor: isDarkMode ? '#333333' : '#E0E0E0',
      gap: 8,
    },
    typeButtonSelected: {
      backgroundColor: BRAND_PINK,
      borderColor: BRAND_PINK,
    },
    typeButtonText: {
      fontSize: 14,
      fontWeight: '500' as const,
      color: isDarkMode ? '#CCCCCC' : '#7A7A7A',
    },
    typeButtonTextSelected: {
      color: '#FFFFFF',
    },
    formContainer: {
      flex: 1,
      paddingHorizontal: 20,
    },
    formField: {
      marginBottom: 24,
    },
    formLabel: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: isDarkMode ? '#FFFFFF' : '#2D2D2D',
      marginBottom: 8,
    },
    textInput: {
      backgroundColor: isDarkMode ? '#1A1A1A' : '#FFFFFF',
      borderWidth: 1,
      borderColor: isDarkMode ? '#333333' : '#E0E0E0',
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
      color: isDarkMode ? '#FFFFFF' : '#2D2D2D',
    },
    textArea: {
      height: 100,
      textAlignVertical: 'top' as const,
    },
    dateTimeContainer: {
      flexDirection: 'row' as const,
      gap: 12,
    },
    dateTimeInput: {
      flex: 1,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      backgroundColor: isDarkMode ? '#1A1A1A' : '#FFFFFF',
      borderWidth: 1,
      borderColor: isDarkMode ? '#333333' : '#E0E0E0',
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 8,
    },
    dateTimeText: {
      flex: 1,
      fontSize: 16,
      color: isDarkMode ? '#FFFFFF' : '#2D2D2D',
    },
    placeInputContainer: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      backgroundColor: isDarkMode ? '#1A1A1A' : '#FFFFFF',
      borderWidth: 1,
      borderColor: isDarkMode ? '#333333' : '#E0E0E0',
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 8,
    },
    priorityContainer: {
      flexDirection: 'row' as const,
      gap: 8,
    },
    priorityButton: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      backgroundColor: isDarkMode ? '#1A1A1A' : '#FFFFFF',
      borderWidth: 1,
      borderColor: isDarkMode ? '#333333' : '#E0E0E0',
      alignItems: 'center' as const,
    },
    priorityButtonSelected: {
      backgroundColor: BRAND_BLUE,
      borderColor: BRAND_BLUE,
    },
    priorityButtonText: {
      fontSize: 14,
      fontWeight: '500' as const,
      color: isDarkMode ? '#CCCCCC' : '#7A7A7A',
    },
    priorityButtonTextSelected: {
      color: '#FFFFFF',
    },
    statusContainer: {
      flexDirection: 'row' as const,
      gap: 8,
    },
    statusButton: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      backgroundColor: isDarkMode ? '#1A1A1A' : '#FFFFFF',
      borderWidth: 1,
      borderColor: isDarkMode ? '#333333' : '#E0E0E0',
      alignItems: 'center' as const,
    },
    statusButtonSelected: {
      backgroundColor: BRAND_PINK,
      borderColor: BRAND_PINK,
    },
    statusButtonText: {
      fontSize: 14,
      fontWeight: '500' as const,
      color: isDarkMode ? '#CCCCCC' : '#7A7A7A',
    },
    statusButtonTextSelected: {
      color: '#FFFFFF',
    },
    imageUploadContainer: {
      alignItems: 'center' as const,
      paddingVertical: 20,
      backgroundColor: isDarkMode ? '#1A1A1A' : '#F5F5F5',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: isDarkMode ? '#333333' : '#E0E0E0',
      borderStyle: 'dashed' as const,
    },
    uploadedImage: {
      width: 200,
      height: 150,
      borderRadius: 12,
      marginBottom: 16,
    },
    imageUploadText: {
      fontSize: 16,
      color: isDarkMode ? '#CCCCCC' : '#7A7A7A',
      marginBottom: 16,
    },
    imageButtonsContainer: {
      flexDirection: 'row' as const,
      gap: 12,
    },
    imageButton: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      gap: 8,
    },
    imageButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '500' as const,
    },
    toggleContainer: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      marginBottom: 8,
    },
    toggleLabelContainer: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
    },
    toggleSwitch: {
      width: 50,
      height: 30,
      borderRadius: 15,
      backgroundColor: isDarkMode ? '#333333' : '#E0E0E0',
      justifyContent: 'center' as const,
      paddingHorizontal: 2,
    },
    toggleSwitchActive: {
      backgroundColor: BRAND_PINK,
    },
    toggleThumb: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: '#FFFFFF',
      alignSelf: 'flex-start' as const,
    },
    toggleThumbActive: {
      alignSelf: 'flex-end' as const,
    },
    toggleDescription: {
      fontSize: 14,
      color: isDarkMode ? '#CCCCCC' : '#7A7A7A',
    },
    saveButtonContainer: {
      paddingHorizontal: 20,
      paddingVertical: 20,
      borderTopWidth: 1,
      borderTopColor: isDarkMode ? '#333333' : '#E0E0E0',
    },
    saveButton: {
      borderRadius: 12,
      overflow: 'hidden' as const,
    },
    saveButtonGradient: {
      paddingVertical: 16,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    saveButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600' as const,
    },
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.modalContainer}>
        {/* Modal Header */}
        <View style={styles.modalHeader}>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <MaterialCommunityIcons 
              name="chevron-left" 
              size={24} 
              color={isDarkMode ? '#FFFFFF' : '#2D2D2D'} 
            />
          </Pressable>
          <Text style={styles.modalTitle}>{t('calendar.addToCalendar')}</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Item Type Selection */}
        <View style={styles.typeSelection}>
          <Pressable
            style={[styles.typeButton, formType === 'event' && styles.typeButtonSelected]}
            onPress={() => handleItemTypeSelect('event')}
          >
            <MaterialCommunityIcons 
              name="calendar" 
              size={24} 
              color={formType === 'event' ? '#FFFFFF' : BRAND_GRAY} 
            />
            <Text style={[styles.typeButtonText, formType === 'event' && styles.typeButtonTextSelected]}>
              {t('calendar.event')}
            </Text>
          </Pressable>

          <Pressable
            style={[styles.typeButton, formType === 'souvenir' && styles.typeButtonSelected]}
            onPress={() => handleItemTypeSelect('souvenir')}
          >
            <MaterialCommunityIcons 
              name="heart" 
              size={24} 
              color={formType === 'souvenir' ? '#FFFFFF' : BRAND_GRAY} 
            />
            <Text style={[styles.typeButtonText, formType === 'souvenir' && styles.typeButtonTextSelected]}>
              {t('calendar.souvenir')}
            </Text>
          </Pressable>

          <Pressable
            style={[styles.typeButton, formType === 'todo' && styles.typeButtonSelected]}
            onPress={() => handleItemTypeSelect('todo')}
          >
            <MaterialCommunityIcons 
              name="checkbox-marked-outline" 
              size={24} 
              color={formType === 'todo' ? '#FFFFFF' : BRAND_GRAY} 
            />
            <Text style={[styles.typeButtonText, formType === 'todo' && styles.typeButtonTextSelected]}>
              {t('calendar.todo')}
            </Text>
          </Pressable>
        </View>

        {/* Form Fields */}
        <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
          {/* Title */}
          <View style={styles.formField}>
            <Text style={styles.formLabel}>{t('calendar.titleField')}</Text>
            <TextInput
              style={styles.textInput}
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
          <View style={styles.formField}>
            <Text style={styles.formLabel}>{t('calendar.dateTime')}</Text>
            <View style={styles.dateTimeContainer}>
              <Pressable
                style={styles.dateTimeInput}
                onPress={() => setShowCustomDatePicker(true)}
              >
                <MaterialCommunityIcons name="calendar" size={20} color={BRAND_GRAY} />
                <Text style={styles.dateTimeText}>
                  {formDate.toLocaleDateString('fr-FR')}
                </Text>
                <MaterialCommunityIcons name="chevron-down" size={16} color={BRAND_GRAY} />
              </Pressable>

              <Pressable
                style={styles.dateTimeInput}
                onPress={() => setShowCustomTimePicker(true)}
              >
                <MaterialCommunityIcons name="clock" size={20} color={BRAND_GRAY} />
                <Text style={styles.dateTimeText}>
                  {formTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </Text>
                <MaterialCommunityIcons name="chevron-down" size={16} color={BRAND_GRAY} />
              </Pressable>
            </View>
          </View>

          {/* Place */}
          {(formType === 'event' || formType === 'souvenir') && (
            <View style={styles.formField}>
              <Text style={styles.formLabel}>{t('calendar.place')}</Text>
              <View style={styles.placeInputContainer}>
                <TextInput
                  style={[styles.textInput, { borderWidth: 0, backgroundColor: 'transparent', flex: 1 }]}
                  value={formPlace}
                  onChangeText={setFormPlace}
                  placeholder={t('calendar.searchPlace')}
                  placeholderTextColor={BRAND_GRAY}
                />
                <MaterialCommunityIcons name="map-marker" size={20} color={BRAND_GRAY} />
              </View>
            </View>
          )}

          {/* Priority and Status for Todo */}
          {formType === 'todo' && (
            <>
              <View style={styles.formField}>
                <Text style={styles.formLabel}>{t('calendar.priority')}</Text>
                <View style={styles.priorityContainer}>
                  {(['urgent', 'normal', 'peut_attendre'] as const).map((priority) => (
                    <Pressable
                      key={priority}
                      style={[
                        styles.priorityButton,
                        formPriority === priority && styles.priorityButtonSelected
                      ]}
                      onPress={() => setFormPriority(priority)}
                    >
                      <Text style={[
                        styles.priorityButtonText,
                        formPriority === priority && styles.priorityButtonTextSelected
                      ]}>
                        {priority === 'urgent' ? t('calendar.urgent') : 
                         priority === 'normal' ? t('calendar.normal') : t('calendar.canWait')}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={styles.formField}>
                <Text style={styles.formLabel}>{t('calendar.status')}</Text>
                <View style={styles.statusContainer}>
                  {(['a_faire', 'en_cours', 'termine'] as const).map((status) => (
                    <Pressable
                      key={status}
                      style={[
                        styles.statusButton,
                        formStatus === status && styles.statusButtonSelected
                      ]}
                      onPress={() => setFormStatus(status)}
                    >
                      <Text style={[
                        styles.statusButtonText,
                        formStatus === status && styles.statusButtonTextSelected
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
            <View style={styles.formField}>
              <Text style={styles.formLabel}>{t('calendar.photos')}</Text>
              <View style={styles.imageUploadContainer}>
                {formImage ? (
                  <Image source={{ uri: formImage }} style={styles.uploadedImage} />
                ) : (
                  <>
                    <MaterialCommunityIcons name="image" size={48} color={BRAND_GRAY} />
                    <Text style={styles.imageUploadText}>
                      {t('calendar.addImage')}
                    </Text>
                  </>
                )}
                <View style={styles.imageButtonsContainer}>
                  <Pressable
                    style={[styles.imageButton, { backgroundColor: BRAND_PINK }]}
                    onPress={() => pickImage('camera')}
                  >
                    <MaterialCommunityIcons name="camera" size={20} color="#FFFFFF" />
                    <Text style={styles.imageButtonText}>{t('calendar.camera')}</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.imageButton, { backgroundColor: BRAND_BLUE }]}
                    onPress={() => pickImage('gallery')}
                  >
                    <MaterialCommunityIcons name="image-multiple" size={20} color="#FFFFFF" />
                    <Text style={styles.imageButtonText}>{t('calendar.gallery')}</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          )}

          {/* Description */}
          <View style={styles.formField}>
            <Text style={styles.formLabel}>{t('calendar.description')}</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
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
            <View style={styles.formField}>
              <View style={styles.toggleContainer}>
                <View style={styles.toggleLabelContainer}>
                  <MaterialCommunityIcons 
                    name="bell-ring" 
                    size={20} 
                    color={formAlarmable ? BRAND_PINK : BRAND_GRAY} 
                  />
                  <Text style={[styles.formLabel, { marginLeft: 8 }]}>
                    {t('calendar.enableReminders')}
                  </Text>
                </View>
                <Pressable
                  style={[
                    styles.toggleSwitch,
                    formAlarmable && styles.toggleSwitchActive
                  ]}
                  onPress={() => setFormAlarmable(!formAlarmable)}
                >
                  <View style={[
                    styles.toggleThumb,
                    formAlarmable && styles.toggleThumbActive
                  ]} />
                </Pressable>
              </View>
              <Text style={styles.toggleDescription}>
                {formAlarmable 
                  ? t('calendar.reminderDescription')
                  : t('calendar.noReminderDescription')
                }
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Save Button */}
        <View style={styles.saveButtonContainer}>
          <Pressable
            style={styles.saveButton}
            onPress={saveItem}
            disabled={isLoading}
          >
            <LinearGradient
              colors={[BRAND_BLUE, BRAND_PINK]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.saveButtonGradient}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.saveButtonText}>{t('calendar.save')}</Text>
              )}
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
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
import { calendarNotificationService } from '../lib/calendarNotificationService';
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
  const [placeSuggestions, setPlaceSuggestions] = useState<Array<{
    display_name: string;
    lat: string;
    lon: string;
    type: string;
  }>>([]);
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(false);
  const [showPlaceSuggestions, setShowPlaceSuggestions] = useState(false);
  const [lastSearchTime, setLastSearchTime] = useState(0);

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

  // Real place search using OpenStreetMap Nominatim API
  const searchPlaces = async (query: string) => {
    if (!query.trim() || query.length < 3) {
      setPlaceSuggestions([]);
      setShowPlaceSuggestions(false);
      return;
    }

    // Rate limiting: only search if at least 1 second has passed since last search
    const now = Date.now();
    if (now - lastSearchTime < 1000) {
      return;
    }
    setLastSearchTime(now);

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
        `bounded=1`,
        {
          method: 'GET',
          headers: {
            'User-Agent': 'ZOOJ-CoupleApp/1.0 (https://zooj.app)',
            'Accept': 'application/json',
            'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setPlaceSuggestions(data);
        setShowPlaceSuggestions(true);
      } else {
        console.error('Place search failed:', response.status, response.statusText);
        // Show a simple fallback message
        setPlaceSuggestions([{
          display_name: `"${query}" (recherche manuelle)`,
          lat: '',
          lon: '',
          type: 'fallback'
        }]);
        setShowPlaceSuggestions(true);
      }
    } catch (error) {
      console.error('Error searching places:', error);
      // Show a simple fallback message
      setPlaceSuggestions([{
        display_name: `"${query}" (recherche manuelle)`,
        lat: '',
        lon: '',
        type: 'fallback'
      }]);
      setShowPlaceSuggestions(true);
    } finally {
      setIsLoadingPlaces(false);
    } 
  };

  // Debounced search to avoid too many API calls
  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (formPlace.length >= 3) {
        searchPlaces(formPlace);
      } else {
        setPlaceSuggestions([]);
        setShowPlaceSuggestions(false);
      }
    }, 300); // 300ms delay

    return () => clearTimeout(timeoutId);
  }, [formPlace]);

  const selectPlace = (place: any) => {
    setFormPlace(place.display_name);
    setShowPlaceSuggestions(false);
    setPlaceSuggestions([]);
  };

  const saveItem = async () => {
    if (!formTitle.trim()) {
      Alert.alert(t('calendar.error'), t('calendar.titleRequired'));
      return;
    }

    setIsLoading(true);
    try {
      // Determine the correct table name based on item type
      let tableName: string;
      let itemData: any;

      switch (formType) {
        case 'event':
          tableName = 'calendar_events';
          itemData = {
            title: formTitle.trim(),
            event_date: formDate.toISOString().split('T')[0],
            event_time: formTime.toTimeString().split(' ')[0],
            place: formPlace.trim(),
            description: formDescription.trim(),
            couple_id: coupleId,
            alarmable: formAlarmable,
          };
          break;
        case 'souvenir':
          tableName = 'calendar_souvenirs';
          itemData = {
            title: formTitle.trim(),
            memory_date: formDate.toISOString().split('T')[0],
            memory_time: formTime.toTimeString().split(' ')[0],
            place: formPlace.trim(),
            description: formDescription.trim(),
            couple_id: coupleId,
            image_url: formImage,
          };
          break;
        case 'todo':
          tableName = 'calendar_todos';
          itemData = {
            title: formTitle.trim(),
            due_date: formDate.toISOString().split('T')[0],
            description: formDescription.trim(),
            couple_id: coupleId,
            priority: formPriority,
            status: formStatus,
          };
          break;
        default:
          throw new Error('Type d\'élément invalide');
      }

      const { data, error } = await supabase
        .from(tableName)
        .insert([itemData])
        .select()
        .single();

      if (error) throw error;

      // Add type to the returned data for consistency
      const itemWithType = { ...data, type: formType };
      
      // Create notification for the partner
      try {
        await calendarNotificationService.createCalendarItemNotification(
          formType,
          formTitle.trim(),
          data.id,
          coupleId,
          userId
        );
      } catch (notificationError) {
        console.error('Error creating calendar item notification:', notificationError);
        // Don't fail the entire operation if notification creation fails
      }
      
      onSave(itemWithType);
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
    // Place suggestions styles
    suggestionsContainer: {
      position: 'absolute' as const,
      top: '100%',
      left: 0,
      right: 0,
      backgroundColor: isDarkMode ? '#1A1A1A' : '#FFFFFF',
      borderWidth: 1,
      borderColor: isDarkMode ? '#333333' : '#E0E0E0',
      borderRadius: 8,
      marginTop: 4,
      maxHeight: 200,
      zIndex: 1000,
      elevation: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    suggestionItem: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: isDarkMode ? '#333333' : '#F0F0F0',
    },
    suggestionText: {
      flex: 1,
      marginLeft: 8,
      fontSize: 14,
      color: isDarkMode ? '#FFFFFF' : '#2D2D2D',
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
                  {formDate.toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                  })}
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
                  onFocus={() => {
                    if (placeSuggestions.length > 0) {
                      setShowPlaceSuggestions(true);
                    }
                  }}
                />
                {isLoadingPlaces ? (
                  <ActivityIndicator size="small" color={BRAND_GRAY} />
                ) : (
                  <MaterialCommunityIcons name="map-marker" size={20} color={BRAND_GRAY} />
                )}
              </View>
              
              {/* Place Suggestions Dropdown */}
              {showPlaceSuggestions && placeSuggestions.length > 0 && (
                <View style={styles.suggestionsContainer}>
                  {placeSuggestions.map((place, index) => (
                    <Pressable
                      key={index}
                      style={styles.suggestionItem}
                      onPress={() => selectPlace(place)}
                    >
                      <MaterialCommunityIcons name="map-marker" size={16} color={BRAND_BLUE} />
                      <Text style={styles.suggestionText} numberOfLines={2}>
                        {place.display_name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
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

      {/* Date Picker - Native Modal Only */}
      {showCustomDatePicker && (
        <DateTimePicker
          value={formDate}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowCustomDatePicker(false);
            if (selectedDate) {
              setFormDate(selectedDate);
            }
          }}
        />
      )}

      {/* Time Picker - Native Modal Only */}
      {showCustomTimePicker && (
        <DateTimePicker
          value={formTime}
          mode="time"
          display="default"
          onChange={(event, selectedTime) => {
            setShowCustomTimePicker(false);
            if (selectedTime) {
              setFormTime(selectedTime);
            }
          }}
        />
      )}
    </Modal>
  );
};

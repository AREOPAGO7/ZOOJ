import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';
import { useDarkTheme } from '../../contexts/DarkThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
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

export default function ItemDetailsPage() {
  const router = useRouter();
  const { itemType, itemId, itemData } = useLocalSearchParams();
  const { user } = useAuth();
  const { colors } = useTheme();
  const { isDarkMode } = useDarkTheme();
  const { t } = useLanguage();
  
  const [item, setItem] = useState<CalendarEvent | CalendarSouvenir | CalendarTodo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);

  // Edit form states
  const [editTitle, setEditTitle] = useState('');
  const [editDate, setEditDate] = useState(new Date());
  const [editTime, setEditTime] = useState(new Date());
  const [editPlace, setEditPlace] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPriority, setEditPriority] = useState<'urgent' | 'normal' | 'peut_attendre'>('normal');
  const [editStatus, setEditStatus] = useState<'a_faire' | 'en_cours' | 'termine'>('a_faire');
  
  // Type toggle state
  const [editItemType, setEditItemType] = useState<'event' | 'souvenir'>('event');
  
  // Image state
  const [editImage, setEditImage] = useState<string | null>(null);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // State for place suggestions
  const [placeSuggestions, setPlaceSuggestions] = useState<Array<{
    display_name: string;
    lat: string;
    lon: string;
    type: string;
  }>>([]);
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(false);

  // Get couple ID when component mounts
  useEffect(() => {
    if (user) {
      getCoupleId();
    }
  }, [user]);

  // Load item data when couple ID is available
  useEffect(() => {
    if (coupleId && itemId && itemType) {
      loadItemData();
    }
  }, [coupleId, itemId, itemType]);

  // Initialize edit form when item loads
  useEffect(() => {
    if (item) {
      initializeEditForm();
    }
  }, [item]);

  const getCoupleId = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('couples')
        .select('id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .single();

      if (error) throw error;
      setCoupleId(data.id);
    } catch (error) {
      console.error('Error getting couple ID:', error);
      Alert.alert(t('calendar.error'), 'Impossible de récupérer l\'ID du couple');
    }
  };

  const loadItemData = async () => {
    if (!coupleId || !itemId || !itemType) return;
    
    setIsLoading(true);
    try {
      let result;
      let tableName: string;

      // Determine which table to query based on item type
      switch (itemType) {
        case 'event':
          tableName = 'calendar_events';
          break;
        case 'souvenir':
          tableName = 'calendar_souvenirs';
          break;
        case 'todo':
          tableName = 'calendar_todos';
          break;
        default:
          throw new Error('Type d\'élément invalide');
      }

      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', itemId)
        .eq('couple_id', coupleId)
        .single();

      if (error) throw error;
      setItem(data);
    } catch (error) {
      console.error('Error loading item data:', error);
      Alert.alert(t('calendar.error'), 'Impossible de charger les détails de l\'élément');
    } finally {
      setIsLoading(false);
    }
  };

  const initializeEditForm = () => {
    if (!item) return;
    
    setEditTitle(item.title);
    setEditDescription('description' in item ? item.description : '');
    setEditPlace('place' in item ? item.place : '');
    
    // Set item type based on current item
    if ('event_date' in item) {
      setEditItemType('event');
    } else if ('memory_date' in item) {
      setEditItemType('souvenir');
    }
    
    // Set date and time based on item type
    if ('event_date' in item && 'event_time' in item) {
      const eventDate = new Date(item.event_date);
      setEditDate(eventDate);
      
      const [hours, minutes] = item.event_time.split(':');
      const timeDate = new Date();
      timeDate.setHours(parseInt(hours), parseInt(minutes));
      setEditTime(timeDate);
    } else if ('memory_date' in item && 'memory_time' in item) {
      const memoryDate = new Date(item.memory_date);
      setEditDate(memoryDate);
      
      const [hours, minutes] = item.memory_time.split(':');
      const timeDate = new Date();
      timeDate.setHours(parseInt(hours), parseInt(minutes));
      setEditTime(timeDate);
    } else if ('due_date' in item) {
      const dueDate = new Date(item.due_date);
      setEditDate(dueDate);
    }
    
    // Set image if it's a souvenir
    if ('image_url' in item && item.image_url) {
      setEditImage(item.image_url);
    }
    
    if ('priority' in item) {
      setEditPriority(item.priority);
    }
    if ('status' in item) {
      setEditStatus(item.status);
    }
  };

  const startEditing = () => {
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    initializeEditForm(); // Reset to original values
  };

  const saveChanges = async () => {
    if (!item || !coupleId) return;
    
    try {
      setIsSaving(true);
      
      // Handle image upload first if there's a new image and it's a souvenir
      let finalImageUrl = editImage;
      if (editItemType === 'souvenir' && editImage && !editImage.includes('cloudinary.com')) {
        console.log('Uploading image to Cloudinary...');
        const cloudinaryUrl = await uploadToCloudinary(editImage);
        if (cloudinaryUrl) {
          finalImageUrl = cloudinaryUrl;
          console.log('Image uploaded successfully:', cloudinaryUrl);
        } else {
          Alert.alert(t('calendar.error'), 'Impossible de télécharger l\'image. Veuillez réessayer.');
          setIsSaving(false);
          return;
        }
      }

      // If type has changed, we need to delete the old item and create a new one
      if (editItemType !== itemType) {
        // Delete the old item
        let oldTableName: string;
        switch (itemType) {
          case 'event':
            oldTableName = 'calendar_events';
            break;
          case 'souvenir':
            oldTableName = 'calendar_souvenirs';
            break;
          default:
            throw new Error('Type d\'élément invalide');
        }

        const { error: deleteError } = await supabase
          .from(oldTableName)
          .delete()
          .eq('id', item.id)
          .eq('couple_id', coupleId);

        if (deleteError) throw deleteError;

        // Create new item in the new table
        let newTableName: string;
        let newItemData: any = {
          title: editTitle,
          description: editDescription,
          place: editPlace,
          couple_id: coupleId,
        };

        if (editItemType === 'event') {
          newTableName = 'calendar_events';
          newItemData.event_date = editDate.toISOString().split('T')[0];
          newItemData.event_time = editTime.toTimeString().split(' ')[0];
        } else {
          newTableName = 'calendar_souvenirs';
          newItemData.memory_date = editDate.toISOString().split('T')[0];
          newItemData.memory_time = editTime.toTimeString().split(' ')[0];
          newItemData.image_url = finalImageUrl;
        }

        const { data: newItem, error: createError } = await supabase
          .from(newTableName)
          .insert(newItemData)
          .select()
          .single();

        if (createError) throw createError;

        setItem(newItem);
        setIsEditing(false);
        Alert.alert(t('calendar.success'), 'Élément converti et sauvegardé');
        return;
      }

      // Regular update if type hasn't changed
      let updateData: any = {
        title: editTitle,
        description: editDescription,
        place: editPlace,
      };

      if (editItemType === 'event') {
        updateData.event_date = editDate.toISOString().split('T')[0];
        updateData.event_time = editTime.toTimeString().split(' ')[0];
      } else {
        updateData.memory_date = editDate.toISOString().split('T')[0];
        updateData.memory_time = editTime.toTimeString().split(' ')[0];
        updateData.image_url = finalImageUrl;
      }

      let tableName: string;
      switch (editItemType) {
        case 'event':
          tableName = 'calendar_events';
          break;
        case 'souvenir':
          tableName = 'calendar_souvenirs';
          break;
        default:
          throw new Error('Type d\'élément invalide');
      }

      const { data, error } = await supabase
        .from(tableName)
        .update(updateData)
        .eq('id', item.id)
        .eq('couple_id', coupleId)
        .select()
        .single();

      if (error) throw error;
      
      setItem(data);
      setIsEditing(false);
      Alert.alert(t('calendar.success'), 'Modifications sauvegardées');
    } catch (error) {
      console.error('Error updating item:', error);
      Alert.alert(t('calendar.error'), 'Impossible de sauvegarder les modifications');
    } finally {
      setIsSaving(false);
    }
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    return date.toLocaleDateString('fr-FR', options);
  };

  // Format time for display
  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':');
    const timeDate = new Date();
    timeDate.setHours(parseInt(hours), parseInt(minutes));
    
    const timeOptions: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit'
    };
    
    return timeDate.toLocaleTimeString('fr-FR', timeOptions);
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return '#ff4444';
      case 'normal':
        return '#ffaa00';
      case 'peut_attendre':
        return '#44aa44';
      default:
        return '#666666';
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'termine':
        return '#44aa44';
      case 'en_cours':
        return '#ffaa00';
      case 'a_faire':
        return '#ff4444';
      default:
        return '#666666';
    }
  };



  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (event.type === 'dismissed') {
      setShowDatePicker(false);
      return;
    }
    
    if (selectedDate) {
      setEditDate(selectedDate);
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    if (event.type === 'dismissed') {
      setShowTimePicker(false);
      return;
    }
    
    if (selectedTime) {
      setEditTime(selectedTime);
    }
  };

  // Helper function to get days in month for custom date picker
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    const days = [];
    
    // Add empty days for padding at the start
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }
    
    // Add all days in the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  };

  // Image picker functions - store local URI first, upload later
  const pickImageFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      // Store the local URI temporarily, will upload when saving
      setEditImage(result.assets[0].uri);
    }
  };

  const takePhotoWithCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('calendar.error'), 'Permission d\'accès à la caméra refusée');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      // Store the local URI temporarily, will upload when saving
      setEditImage(result.assets[0].uri);
    }
  };

    // Upload to Cloudinary when saving
  const uploadToCloudinary = async (imageUri: string): Promise<string | null> => {
    try {
      // Check if it's already a Cloudinary URL
      if (imageUri.includes('cloudinary.com')) {
        return imageUri;
      }

      // Hardcoded values for testing
      const cloudName = 'dtivjmfgj';
      const apiKey = '579167569966336';
      const apiSecret = 'MV7tzxkgAr_xBLuLQnpPNrxuhA0';

      // Use upload preset approach (you need to create this in Cloudinary dashboard)
      const formData = new FormData();
      
      // Handle file differently for web vs native
      if (Platform.OS === 'web') {
        // For web, we need to fetch the image and create a blob
        try {
          const response = await fetch(imageUri);
          const blob = await response.blob();
          formData.append('file', blob, 'upload.jpg');
        } catch (fetchError) {
          console.error('Error fetching image for web:', fetchError);
          // Fallback to direct URI
          formData.append('file', imageUri);
        }
      } else {
        // For native platforms
        const fileData = {
          uri: imageUri,
          type: 'image/jpeg',
          name: 'upload.jpg',
        };
        formData.append('file', fileData as any);
      }
      
      console.log('File data being sent:', formData);
      console.log('Image URI:', imageUri);
      
      formData.append('cloud_name', cloudName);
      formData.append('upload_preset', 'ZOOJAPP'); // ⚠️ Use your preset name here

      console.log('Uploading to Cloudinary with:', {
        cloudName,
        apiKey
      });

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Cloudinary response error:', response.status, errorText);
        
        if (response.status === 400 && errorText.includes('Upload preset not found')) {
          throw new Error('Upload preset not found. Please create an upload preset named "zooj_uploads" in your Cloudinary dashboard.');
        }
        
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Cloudinary response:', data);
      
      if (data.secure_url) {
        return data.secure_url;
      } else {
        console.error('Cloudinary response:', data);
        throw new Error('Upload failed - no secure_url in response');
      }
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      Alert.alert(t('calendar.error'), 'Impossible de télécharger l\'image sur Cloudinary. Vérifiez votre configuration.');
      return null;
    }
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
      if (editPlace.length >= 3) {
        searchPlaces(editPlace);
      } else {
        setPlaceSuggestions([]);
      }
    }, 300); // 300ms delay

    return () => clearTimeout(timeoutId);
  }, [editPlace]);

  if (isLoading) {
    return (
      <AppLayout>
        <View className={`flex-1 ${isDarkMode ? 'bg-dark-bg' : 'bg-background'} justify-center items-center`}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>{t('calendar.loading')}</Text>
        </View>
      </AppLayout>
    );
  }

  if (!item) {
    return (
      <AppLayout>
        <View className={`flex-1 ${isDarkMode ? 'bg-dark-bg' : 'bg-background'} justify-center items-center`}>
          <Text style={[styles.errorText, { color: colors.text }]}>Élément non trouvé</Text>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Retour</Text>
          </Pressable>
        </View>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <ScrollView className={`flex-1 ${isDarkMode ? 'bg-dark-bg' : 'bg-background'}`} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <Text className={`text-2xl font-bold ${isDarkMode ? 'text-dark-text' : 'text-text'}`}>Détails</Text>
            </View>
            
            {/* Edit Button */}
            <Pressable style={styles.editButton} onPress={startEditing}>
              <MaterialCommunityIcons name="pencil" size={20} color="white" />
              <Text style={styles.editButtonText}>{t('modifier')}</Text>
            </Pressable>
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Title */}
          {isEditing ? (
            <View style={styles.editField}>
              <Text className={`text-base font-medium mb-2 ${isDarkMode ? 'text-dark-text' : 'text-text'}`}>{t('calendar.titleField')}:</Text>
              <TextInput
                className={`w-full px-4 py-3 rounded-lg border ${isDarkMode ? 'bg-dark-surface border-dark-border text-dark-text' : 'bg-white border-gray-300 text-text'}`}
                style={styles.textInput}
                value={editTitle}
                onChangeText={setEditTitle}
                placeholder="Donnez un nom à votre moment"
                placeholderTextColor={isDarkMode ? '#CCCCCC' : '#7A7A7A'}
              />
            </View>
          ) : (
            <>
              <View style={styles.formField}>
                <Text className={`text-base font-medium mb-2 ${isDarkMode ? 'text-dark-text' : 'text-text'}`}>{t('calendar.titleField')}</Text>
                <View style={[styles.infoDisplay, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text className={`text-base ${isDarkMode ? 'text-dark-text' : 'text-text'}`}>{item.title}</Text>
                </View>
              </View>
              
              {/* Image Display - Only for souvenirs in view mode */}
              {'image_url' in item && item.image_url && !isEditing && (
                <View style={styles.formField}>
                  <Text className={`text-base font-medium mb-2 ${isDarkMode ? 'text-dark-text' : 'text-text'}`}>Photos</Text>
                  <View style={styles.imageDisplayContainer}>
                    <Image 
                      source={{ uri: item.image_url }} 
                      style={styles.displayImage}
                      resizeMode="cover"
                    />
                  </View>
                </View>
              )}
            </>
          )}
           
           {/* Type Toggle - Only show in edit mode */}
           {isEditing && (
             <View style={styles.typeToggleContainer}>
               <Text className={`text-base font-medium mb-3 ${isDarkMode ? 'text-dark-text' : 'text-text'}`}>Type du moment partagé</Text>
               <View style={styles.typeToggleButtons}>
                 <Pressable
                   style={[
                     styles.typeToggleButton,
                     { backgroundColor: colors.surface, borderColor: colors.border },
                     editItemType === 'event' && styles.typeToggleButtonSelected
                   ]}
                   onPress={() => setEditItemType('event')}
                 >
                   <MaterialCommunityIcons 
                     name="calendar" 
                     size={20} 
                     color={editItemType === 'event' ? 'white' : colors.text} 
                   />
                   <Text className={`text-sm font-medium ${isDarkMode ? 'text-dark-text' : 'text-text'} ${editItemType === 'event' ? 'text-white' : ''}`}>
                     Evènement
                   </Text>
                 </Pressable>
                 
                 <Pressable
                   style={[
                     styles.typeToggleButton,
                     { backgroundColor: colors.surface, borderColor: colors.border },
                     editItemType === 'souvenir' && styles.typeToggleButtonSelected
                   ]}
                   onPress={() => setEditItemType('souvenir')}
                 >
                   <MaterialCommunityIcons 
                     name="heart" 
                     size={20} 
                     color={editItemType === 'souvenir' ? 'white' : colors.text} 
                   />
                   <Text className={`text-sm font-medium ${isDarkMode ? 'text-dark-text' : 'text-text'} ${editItemType === 'souvenir' ? 'text-white' : ''}`}>
                     Souvenir
                   </Text>
                 </Pressable>
               </View>
             </View>
           )}
           
                       {/* Date and Time */}
            {isEditing ? (
              <View style={styles.dateTimeContainer}>
                <Text className={`text-base font-medium mb-2 ${isDarkMode ? 'text-dark-text' : 'text-text'}`}>{t('calendar.dateTime')}</Text>
                <View style={styles.dateTimeRow}>
                  <View style={styles.dateTimeField}>
                    <Text className={`text-sm mb-1 ${isDarkMode ? 'text-dark-text-secondary' : 'text-text-secondary'}`}>{t('calendar.dateTime')}</Text>
                    <Pressable 
                      style={[styles.dateTimeButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                      onPress={() => setShowDatePicker(true)}
                    >
                      <Text style={[styles.dateTimeButtonText, { color: colors.text }]}>
                        {editDate.toLocaleDateString('fr-FR')}
                      </Text>
                      <MaterialCommunityIcons name="calendar" size={20} color="#2DB6FF" />
                    </Pressable>
                  </View>
                  <View style={styles.dateTimeSpacer} />
                  <View style={styles.dateTimeField}>
                    <Text style={[styles.dateTimeSubLabel, { color: colors.textSecondary }]}>Heure</Text>
                    <Pressable 
                      style={[styles.dateTimeButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                      onPress={() => setShowTimePicker(true)}
                    >
                      <Text style={[styles.dateTimeButtonText, { color: colors.text }]}>
                        {editTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                      <MaterialCommunityIcons name="clock" size={20} color="#2DB6FF" />
                    </Pressable>
                  </View>
                </View>
              </View>
           ) : (
             <View style={styles.formField}>
               <Text style={[styles.formLabel, { color: colors.text }]}>{t('calendar.dateTime')}</Text>
               <View style={styles.dateTimeContainer}>
                 {('event_date' in item && 'event_time' in item) ? (
                   <>
                     <View style={[styles.dateTimeInput, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                       <MaterialCommunityIcons name="calendar" size={20} color={colors.textSecondary} />
                       <Text style={[styles.dateTimeText, { color: colors.text }]}>
                         {formatDate(item.event_date)}
                       </Text>
                     </View>
                     <View style={[styles.dateTimeInput, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                       <MaterialCommunityIcons name="clock" size={20} color={colors.textSecondary} />
                       <Text style={[styles.dateTimeText, { color: colors.text }]}>
                         {formatTime(item.event_time)}
                       </Text>
                     </View>
                   </>
                 ) : ('memory_date' in item && 'memory_time' in item) ? (
                   <>
                     <View style={[styles.dateTimeInput, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                       <MaterialCommunityIcons name="calendar" size={20} color={colors.textSecondary} />
                       <Text style={[styles.dateTimeText, { color: colors.text }]}>
                         {formatDate(item.memory_date)}
                       </Text>
                     </View>
                     <View style={[styles.dateTimeInput, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                       <MaterialCommunityIcons name="clock" size={20} color={colors.textSecondary} />
                       <Text style={[styles.dateTimeText, { color: colors.text }]}>
                         {formatTime(item.memory_time)}
                       </Text>
                     </View>
                   </>
                 ) : null}
               </View>
             </View>
           )}

           {/* Place */}
           {isEditing ? (
             <View style={styles.editField}>
               <Text className={`text-base font-medium mb-2 ${isDarkMode ? 'text-dark-text' : 'text-text'}`}>{t('calendar.place')}:</Text>
               <View style={styles.placeInputContainer}>
                 <TextInput
                   className={`w-full px-4 py-3 rounded-lg border ${isDarkMode ? 'bg-dark-surface border-dark-border text-dark-text' : 'bg-white border-gray-300 text-text'}`}
                   style={styles.textInput}
                   value={editPlace}
                   onChangeText={setEditPlace}
                   placeholder="Rechercher un lieu (ex: Safi, Cores Safi, Hassan 2 rue...)"
                   placeholderTextColor={isDarkMode ? '#CCCCCC' : '#7A7A7A'}
                 />
                 <MaterialCommunityIcons name="map-marker" size={20} color={isDarkMode ? '#CCCCCC' : '#7A7A7A'} />
               </View>
               
               {/* Place suggestions */}
               {editPlace.length >= 3 && (
                 <View className={`${isDarkMode ? 'bg-dark-surface border-dark-border' : 'bg-white border-gray-300'}`} style={[styles.placeSuggestions]}>
                   <Text className={`px-3 py-2 text-sm font-medium border-b ${isDarkMode ? 'text-white bg-dark-bg border-dark-border' : 'text-text bg-background border-border'}`}>
                     {isLoadingPlaces ? t('calendar.searching') : t('calendar.placesFound')}
                   </Text>
                   {isLoadingPlaces ? (
                     <View style={styles.placeSuggestionsList}>
                       <View style={styles.placeSuggestionItem}>
                         <ActivityIndicator size="small" color="#007AFF" />
                         <Text style={[styles.placeSuggestionText, { color: colors.text }]}>Recherche...</Text>
                       </View>
                     </View>
                   ) : placeSuggestions.length > 0 ? (
                     <View style={styles.placeSuggestionsList}>
                       {placeSuggestions.map((place, index) => (
                         <Pressable
                           key={index}
                           style={[styles.placeSuggestionItem, { borderBottomColor: colors.border }]}
                           onPress={() => setEditPlace(place.display_name)}
                         >
                           <MaterialCommunityIcons name="map-marker" size={16} color="#007AFF" />
                           <View style={styles.placeSuggestionContent}>
                             <Text style={[styles.placeSuggestionText, { color: colors.text }]}>
                               {place.display_name.split(',')[0]} {/* Show first part of address */}
                             </Text>
                             <Text style={[styles.placeSuggestionSubtext, { color: colors.textSecondary }]}>
                               {place.display_name.split(',').slice(1, 3).join(', ')} {/* Show city/area */}
                             </Text>
                           </View>
                         </Pressable>
                       ))}
                     </View>
                   ) : editPlace.length >= 3 ? (
                     <View style={styles.placeSuggestionsList}>
                       <Text style={[styles.placeSuggestionText, { color: colors.text }]}>Aucun lieu trouvé</Text>
                     </View>
                   ) : null}
                 </View>
               )}
             </View>
           ) : (
             'place' in item && (
               <View style={styles.formField}>
                 <Text style={[styles.formLabel, { color: colors.text }]}>{t('calendar.place')}</Text>
                 <View style={styles.placeInputContainer}>
                   <View style={[styles.infoDisplay, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                     <Text style={[styles.infoText, { color: colors.text }]}>{item.place}</Text>
                   </View>
                   <MaterialCommunityIcons name="map-marker" size={20} color={colors.textSecondary} />
                 </View>
               </View>
             )
           )}

           {/* Photos - Only show for souvenirs in edit mode */}
           {isEditing && editItemType === 'souvenir' && (
             <View style={styles.editField}>
               <Text style={[styles.editLabel, { color: colors.text }]}>Photos</Text>
               <View style={styles.imageContainer}>
                 {editImage ? (
                   <Image source={{ uri: editImage }} style={styles.selectedImage} />
                 ) : (
                   <View style={[styles.imagePlaceholder, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                     <MaterialCommunityIcons name="image" size={48} color={colors.textSecondary} />
                     <Text style={[styles.imagePlaceholderText, { color: colors.textSecondary }]}>
                       Ajouter une image pour ce souvenir
                     </Text>
                   </View>
                 )}
                 <View style={styles.imageButtons}>
                   <Pressable style={styles.cameraButton} onPress={takePhotoWithCamera}>
                     <MaterialCommunityIcons name="camera" size={20} color="white" />
                     <Text style={styles.imageButtonText}>Camera</Text>
                   </Pressable>
                   <Pressable style={styles.galleryButton} onPress={pickImageFromGallery}>
                     <MaterialCommunityIcons name="image" size={20} color="white" />
                     <Text style={styles.imageButtonText}>Gallery</Text>
                   </Pressable>
                 </View>
               </View>
             </View>
           )}

           {/* Description */}
           {isEditing ? (
             <View style={styles.editField}>
               <Text className={`text-base font-medium mb-2 ${isDarkMode ? 'text-dark-text' : 'text-text'}`}>{t('calendar.description')}:</Text>
               <TextInput
                 className={`w-full px-4 py-3 rounded-lg border ${isDarkMode ? 'bg-dark-surface border-dark-border text-dark-text' : 'bg-white border-gray-300 text-text'}`}
                 style={[styles.textInput, styles.textArea]}
                 value={editDescription}
                 onChangeText={setEditDescription}
                 placeholder={t('calendar.description')}
                 placeholderTextColor={isDarkMode ? '#CCCCCC' : '#7A7A7A'}
                 multiline
                 numberOfLines={4}
               />
             </View>
           ) : (
             'description' in item && (
               <View style={styles.formField}>
                 <Text style={[styles.formLabel, { color: colors.text }]}>{t('calendar.description')}</Text>
                 <View style={[styles.infoDisplay, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                   <Text style={[styles.infoText, { color: colors.text }]}>{item.description}</Text>
                 </View>
               </View>
             )
           )}


         </View>

        {/* Edit Actions */}
        {isEditing && (
          <View style={styles.editActions}>
            <Pressable style={styles.cancelButton} onPress={cancelEditing}>
              <Text style={styles.cancelButtonText}>{t('calendar.cancel')}</Text>
            </Pressable>
                         <Pressable 
               style={[styles.saveButtonGradient, isSaving && styles.saveButtonDisabled]} 
               onPress={saveChanges}
               disabled={isSaving}
             >
               {isSaving ? (
                 <View style={styles.saveButtonLoading}>
                   <ActivityIndicator size="small" color="white" />
                   <Text style={styles.saveButtonText}>{t('calendar.save')}...</Text>
                 </View>
               ) : (
                 <Text style={styles.saveButtonText}>{t('calendar.save')}</Text>
               )}
             </Pressable>
          </View>
        )}

        {/* Back Button */}
        <View style={styles.backButtonContainer}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>← Retour au calendrier</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Custom Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.customPickerOverlay}>
          <View style={styles.customPickerContainer}>
            <View style={styles.customPickerHeader}>
              <Text style={styles.customPickerTitle}>Sélectionner une date</Text>
              <Pressable
                style={styles.customPickerCloseButton}
                onPress={() => setShowDatePicker(false)}
              >
                <MaterialCommunityIcons name="close" size={24} color="#2D2D2D" />
              </Pressable>
            </View>
            
            <View style={styles.customPickerContent}>
              <View style={styles.monthSelector}>
                <Pressable
                  style={styles.monthButton}
                  onPress={() => {
                    const newDate = new Date(editDate);
                    newDate.setMonth(newDate.getMonth() - 1);
                    setEditDate(newDate);
                  }}
                >
                  <MaterialCommunityIcons name="chevron-left" size={24} color="#2DB6FF" />
                </Pressable>
                
                <Text className={`text-lg font-semibold ${isDarkMode ? 'text-dark-text' : 'text-text'}`}>
                  {editDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                </Text>
                
                <Pressable
                  style={styles.monthButton}
                  onPress={() => {
                    const newDate = new Date(editDate);
                    newDate.setMonth(newDate.getMonth() + 1);
                    setEditDate(newDate);
                  }}
                >
                  <MaterialCommunityIcons name="chevron-right" size={24} color="#2DB6FF" />
                </Pressable>
              </View>
              
              <View style={styles.customPickerDaysOfWeek}>
                {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((day, index) => (
                  <Text key={index} style={styles.customPickerDayOfWeek}>{day}</Text>
                ))}
              </View>
              
              <View style={styles.customPickerGrid}>
                {getDaysInMonth(editDate).map((day, index) => {
                  if (!day) return <View key={index} style={styles.customPickerEmptyDay} />;
                  
                  const isSelected = day.toDateString() === editDate.toDateString();
                  const isToday = day.toDateString() === new Date().toDateString();
                  
                  return (
                    <Pressable
                      key={index}
                      style={[
                        styles.customPickerDay,
                        isSelected && styles.customPickerSelectedDay,
                        isToday && styles.customPickerTodayDay
                      ]}
                      onPress={() => {
                        setEditDate(day);
                        setShowDatePicker(false);
                      }}
                    >
                      <Text style={[
                        styles.customPickerDayNumber,
                        isSelected && styles.customPickerSelectedDayText,
                        isToday && styles.customPickerTodayDayText
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
        visible={showTimePicker}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.customPickerOverlay}>
          <View style={styles.customPickerContainer}>
            <View style={styles.customPickerHeader}>
              <Text style={styles.customPickerTitle}>Sélectionner une heure</Text>
              <Pressable
                style={styles.customPickerCloseButton}
                onPress={() => setShowTimePicker(false)}
              >
                <MaterialCommunityIcons name="close" size={24} color="#2D2D2D" />
              </Pressable>
            </View>
            
            <View style={styles.customPickerContent}>
              <View style={styles.timeSelector}>
                <View style={styles.timeColumn}>
                  <Text style={styles.timeLabel}>Heures</Text>
                  <ScrollView style={styles.timeScrollView} showsVerticalScrollIndicator={false}>
                    {Array.from({ length: 24 }, (_, i) => (
                      <Pressable
                        key={i}
                        style={[
                          styles.timeOption,
                          editTime.getHours() === i && styles.timeOptionSelected
                        ]}
                        onPress={() => {
                          const newTime = new Date(editTime);
                          newTime.setHours(i);
                          setEditTime(newTime);
                        }}
                      >
                        <Text style={[
                          styles.timeOptionText,
                          editTime.getHours() === i && styles.timeOptionTextSelected
                        ]}>
                          {i.toString().padStart(2, '0')}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
                
                <View style={styles.timeColumn}>
                  <Text style={styles.timeLabel}>Minutes</Text>
                  <ScrollView style={styles.timeScrollView} showsVerticalScrollIndicator={false}>
                    {Array.from({ length: 60 }, (_, i) => (
                      <Pressable
                        key={i}
                        style={[
                          styles.timeOption,
                          editTime.getMinutes() === i && styles.timeOptionSelected
                        ]}
                        onPress={() => {
                          const newTime = new Date(editTime);
                          newTime.setMinutes(i);
                          setEditTime(newTime);
                        }}
                      >
                        <Text style={[
                          styles.timeOptionText,
                          editTime.getMinutes() === i && styles.timeOptionTextSelected
                        ]}>
                          {i.toString().padStart(2, '0')}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              </View>
              
              <Pressable
                style={styles.timeConfirmButton}
                onPress={() => setShowTimePicker(false)}
              >
                <Text style={styles.timeConfirmButtonText}>Confirmer</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
     header: {
     marginBottom: 16,
     paddingTop: 10,
     paddingHorizontal: 20,
   },
   headerContent: {
     flexDirection: 'row',
     justifyContent: 'space-between',
     alignItems: 'center',
   },
   headerLeft: {
     alignItems: 'center',
     flex: 1,
   },
   headerTitle: {
     fontSize: 28,
     marginLeft: -170,
     fontWeight: '700',
     color: '#2D2D2D',
   },

     editButton: {
     backgroundColor: '#2DB6FF',
     flexDirection: 'row',
     alignItems: 'center',
     paddingHorizontal: 16,
     paddingVertical: 8,
     borderRadius: 20,
   },
  editButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
     itemCard: {
     backgroundColor: 'white',
     padding: 24,
     borderRadius: 20,
     marginBottom: 24,
     marginHorizontal: 16,
     shadowColor: '#000',
     shadowOffset: {
       width: 0,
       height: 4,
     },
     shadowOpacity: 0.1,
     shadowRadius: 8,
     elevation: 8,
   },
  
     dateTimeContainer: {
     marginBottom: 12,
   },

   dateTimeRow: {
     flexDirection: 'row',
     gap: 12,
   },
   dateTimeField: {
     flex: 1,
   },
   dateTimeSpacer: {
     width: 16,
   },
   dateTimeSubLabel: {
     fontSize: 14,
     fontWeight: '500',
     color: '#666',
     marginBottom: 8,
   },
  
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  infoText: {
    fontSize: 16,
    color: '#555',
    marginLeft: 12,
  },
  statusContainer: {
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  statusItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 14,
    color: '#666',
  },
  statusValue: {
    fontSize: 16,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },


  
  // Edit styles
  editField: {
    marginBottom: 16,
  },
  editLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  dateTimeButtonText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  priorityButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: 'white',
  },
  priorityButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  priorityButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  priorityButtonTextSelected: {
    color: 'white',
  },
  statusButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: 'white',
  },
  statusButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  statusButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  statusButtonTextSelected: {
    color: 'white',
  },
  editActions: {
    width: '100%',
    justifyContent: 'center',
    flexDirection: 'row',
    // justifyContent: 'space-between',
    marginBottom: 20,
    gap: 10,
  },
     cancelButton: {
     backgroundColor: '#6c757d',
     paddingVertical: 16,
     paddingHorizontal: 24,
     borderRadius: 12,
     alignItems: 'center',
     minWidth: 130,
   },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#6c757d',
     paddingVertical: 16,
     paddingHorizontal: 24,
     borderRadius: 12,
     alignItems: 'center',
     maxWidth: 200,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
          backButtonContainer: {
       paddingHorizontal: 20,
       marginTop: 16,
       marginBottom: 10,
     },
     backButton: {
       backgroundColor: '#2DB6FF',
       paddingVertical: 16,
       paddingHorizontal: 24,
       borderRadius: 12,
       alignItems: 'center',
     },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Custom Picker styles
  customPickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  customPickerContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  customPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  customPickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D2D2D',
  },
  customPickerCloseButton: {
    padding: 4,
  },
  customPickerContent: {
    padding: 20,
  },
  monthSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  monthButton: {
    padding: 8,
  },
  monthText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D2D2D',
  },
  customPickerDaysOfWeek: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  customPickerDayOfWeek: {
    width: 40,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  customPickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  customPickerDay: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 2,
    borderRadius: 20,
  },
     customPickerSelectedDay: {
     backgroundColor: '#2DB6FF',
   },
   customPickerTodayDay: {
     borderWidth: 2,
     borderColor: '#2DB6FF',
   },
  customPickerDayNumber: {
    fontSize: 16,
    color: '#2D2D2D',
  },
  customPickerSelectedDayText: {
    color: 'white',
    fontWeight: 'bold',
  },
     customPickerTodayDayText: {
     color: '#2DB6FF',
     fontWeight: 'bold',
   },
  customPickerEmptyDay: {
    width: 40,
    height: 40,
    margin: 2,
  },
  timeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  timeColumn: {
    alignItems: 'center',
    flex: 1,
  },
  timeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D2D2D',
    marginBottom: 15,
  },
  timeScrollView: {
    height: 200,
    width: 80,
  },
  timeOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginVertical: 2,
    alignItems: 'center',
  },
     timeOptionSelected: {
     backgroundColor: '#2DB6FF',
   },
  timeOptionText: {
    fontSize: 16,
    color: '#2D2D2D',
  },
  timeOptionTextSelected: {
    color: 'white',
    fontWeight: 'bold',
  },
     timeConfirmButton: {
     backgroundColor: '#2DB6FF',
     paddingVertical: 12,
     paddingHorizontal: 24,
     borderRadius: 8,
     alignItems: 'center',
   },
  timeConfirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },

  // Type toggle styles
  typeToggleContainer: {
    marginBottom: 20,
  },
  typeToggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D2D2D',
    marginBottom: 12,
  },
  typeToggleButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  typeToggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    backgroundColor: 'white',
    gap: 8,
  },
  typeToggleButtonSelected: {
    backgroundColor: '#F5F5F5',
    borderColor: '#E5E5E5',
  },
  typeToggleButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2D2D2D',
  },
  typeToggleButtonTextSelected: {
    color: '#2D2D2D',
  },

     // Form styles (matching calendrier)
   formField: {
     marginBottom: 12,
   },
   formLabel: {
     fontSize: 16,
     fontWeight: '600',
     color: '#424242',
     marginBottom: 8,
   },
   infoDisplay: {
     borderWidth: 1,
     borderColor: '#F0F0F0',
     borderRadius: 12,
     paddingHorizontal: 16,
     paddingVertical: 14,
     backgroundColor: '#FFFFFF',
     flex: 1,
   },
   placeInputContainer: {
     flexDirection: 'row',
     alignItems: 'center',
     gap: 12,
   },
   placeSuggestions: {
     marginTop: 8,
     backgroundColor: '#FFFFFF',
     borderRadius: 8,
     borderWidth: 1,
     borderColor: '#E0E0E0',
     overflow: 'hidden',
   },
   placeSuggestionsTitle: {
     fontSize: 14,
     fontWeight: '600',
     color: '#2D2D2D',
     paddingHorizontal: 12,
     paddingVertical: 8,
     backgroundColor: '#F8F9FA',
     borderBottomWidth: 1,
     borderBottomColor: '#E0E0E0',
   },
   placeSuggestionsList: {
     maxHeight: 200,
   },
   placeSuggestionItem: {
     flexDirection: 'row',
     alignItems: 'center',
     paddingHorizontal: 12,
     paddingVertical: 10,
     borderBottomWidth: 1,
     borderBottomColor: '#F0F0F0',
   },
   placeSuggestionContent: {
     flex: 1,
     marginLeft: 8,
   },
   placeSuggestionText: {
     fontSize: 14,
     color: '#2D2D2D',
     fontWeight: '500',
   },
   placeSuggestionSubtext: {
     fontSize: 12,
     color: '#666',
     marginTop: 2,
   },
   dateTimeInput: {
     flex: 1,
     flexDirection: 'row',
     alignItems: 'center',
     backgroundColor: '#FFFFFF',
     borderWidth: 1,
     borderColor: '#E0E0E0',
     borderRadius: 12,
     paddingHorizontal: 16,
     paddingVertical: 14,
     minHeight: 48,
     shadowColor: '#000',
     shadowOffset: { width: 0, height: 1 },
     shadowOpacity: 0.05,
     shadowRadius: 2,
     elevation: 1,
     justifyContent: 'space-between',
     marginBottom: 15,
   },
   dateTimeText: {
     fontSize: 16,
     color: '#2D2D2D',
     fontWeight: '500',
     flex: 1,
     marginLeft: 12,
   },
   
   // Image styles
   imageContainer: {
     marginTop: 8,
   },
   imageDisplayContainer: {
     marginTop: 20,
     marginBottom: 24,
     borderRadius: 16,
     overflow: 'hidden',
     shadowColor: '#000',
     shadowOffset: {
       width: 0,
       height: 2,
     },
     shadowOpacity: 0.1,
     shadowRadius: 4,
     elevation: 4,
   },
   displayImage: {
     width: '100%',
     height: 250,
     borderRadius: 16,
   },
  imagePlaceholder: {
    borderWidth: 2,
    borderColor: '#E5E5E5',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    marginBottom: 16,
  },
  imagePlaceholderText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
  selectedImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
  },
  imageButtons: {
    flexDirection: 'row',
    gap: 12,
  },
     cameraButton: {
     flex: 1,
     flexDirection: 'row',
     alignItems: 'center',
     justifyContent: 'center',
     backgroundColor: '#F47CC6',
     paddingVertical: 12,
     paddingHorizontal: 16,
     borderRadius: 8,
     gap: 8,
   },
   galleryButton: {
     flex: 1,
     flexDirection: 'row',
     alignItems: 'center',
     justifyContent: 'center',
     backgroundColor: '#2DB6FF',
     paddingVertical: 12,
     paddingHorizontal: 16,
     borderRadius: 8,
     gap: 8,
   },
  imageButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },

     // Gradient save button
   saveButtonGradient: {
     backgroundColor: '#2DB6FF',
     paddingVertical: 16,
     paddingHorizontal: 24,
     borderRadius: 12,
     alignItems: 'center',
     minWidth: 120,
     // Note: For true gradient, you'd need a gradient library
     // This is a solid blue that matches the design
   },
   saveButtonDisabled: {
     backgroundColor: '#ccc',
     opacity: 0.7,
   },
   saveButtonLoading: {
     flexDirection: 'row',
     alignItems: 'center',
     gap: 8,
   },
});
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useDarkTheme } from '../../contexts/DarkThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import AppLayout from '../app-layout';

interface CalendarEvent {
  id: string;
  couple_id: string;
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
  couple_id: string;
  title: string;
  memory_date: string;
  memory_time: string;
  place: string;
  description: string;
  image_url: string;
  created_at: string;
}

type CalendarItemType = 'event' | 'souvenir';

export default function ItemDetailsPage() {
  const router = useRouter();
  const { itemType, itemId, itemData } = useLocalSearchParams();
  const { user } = useAuth();
  const { isDarkMode } = useDarkTheme();
  const { t } = useLanguage();
  
  const [item, setItem] = useState<CalendarEvent | CalendarSouvenir | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Edit states
  const [editItemType, setEditItemType] = useState<'event' | 'souvenir'>('event');
  const [editTitle, setEditTitle] = useState('');
  const [editDate, setEditDate] = useState(new Date());
  const [editTime, setEditTime] = useState(new Date());
  const [editPlace, setEditPlace] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editImage, setEditImage] = useState<string | null>(null);
  const [editAlarmable, setEditAlarmable] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
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

  // Image upload states
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Cloudinary configuration
  const CLOUDINARY_CONFIG = {
    cloudName: 'dtivjmfgj',
    apiKey: '579167569966336',
    apiSecret: 'MV7tzxkgAr_xBLuLQnpPNrxuhA0',
    uploadPreset: 'ZOOJAPP'
  };

  useEffect(() => {
    if (itemId) {
      fetchItem();
    }
  }, [itemId]);

  const fetchItem = async () => {
    try {
    setIsLoading(true);
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
        default:
          throw new Error('Type d\'élément invalide - todos are handled by todo-details page');
      }

      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', itemId)
        .single();

      if (error) {
        console.error('Error fetching item:', error);
        Alert.alert(t('calendarDetails.error'), t('calendarDetails.errorLoading'));
        return;
      }

      if (data) {
      setItem(data);
        setEditItemType(itemType as 'event' | 'souvenir');
        setEditTitle(data.title);
        setEditDescription(data.description || '');
        setEditPlace(data.place || '');
        
        // Set date and time based on item type
        if (itemType === 'event') {
          setEditDate(new Date(data.event_date));
          setEditTime(new Date(`2000-01-01T${data.event_time}`));
          setEditAlarmable(data.alarmable || true);
        } else if (itemType === 'souvenir') {
          setEditDate(new Date(data.memory_date));
          setEditTime(new Date(`2000-01-01T${data.memory_time}`));
          setEditImage(data.image_url || null);
        }
      }
    } catch (error) {
      console.error('Error fetching item:', error);
      Alert.alert(t('calendarDetails.error'), t('calendarDetails.errorOccurred'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!item) return;
    
    if (!editTitle.trim()) {
      Alert.alert(t('calendarDetails.error'), t('calendarDetails.titleRequired'));
      return;
    }
    
    try {
      setIsSaving(true);
      
      const itemData = {
        couple_id: item.couple_id,
        title: editTitle.trim(),
        description: editDescription.trim(),
        place: editPlace.trim(),
      };

      // If type changed, delete from old table and insert into new table
      if (editItemType !== itemType) {
        // Delete from old table
        const oldTableName = itemType === 'event' ? 'calendar_events' : 'calendar_souvenirs';
        const { error: deleteError } = await supabase
          .from(oldTableName)
          .delete()
          .eq('id', item.id);

        if (deleteError) {
          console.error('Error deleting old item:', deleteError);
          Alert.alert(t('calendarDetails.error'), t('calendarDetails.errorDeleting'));
          return;
        }

        // Insert into new table
        const newTableName = editItemType === 'event' ? 'calendar_events' : 'calendar_souvenirs';
        let insertData: any = { ...itemData };

        if (editItemType === 'event') {
          insertData.event_date = editDate.toISOString().split('T')[0];
          insertData.event_time = editTime.toTimeString().split(' ')[0];
          insertData.alarmable = editAlarmable;
        } else {
          insertData.memory_date = editDate.toISOString().split('T')[0];
          insertData.memory_time = editTime.toTimeString().split(' ')[0];
          insertData.image_url = editImage;
        }

        const { data: newData, error: insertError } = await supabase
          .from(newTableName)
          .insert(insertData)
          .select()
          .single();

        if (insertError) {
          console.error('Error inserting new item:', insertError);
          Alert.alert(t('calendarDetails.error'), t('calendarDetails.errorSaving'));
        return;
      }

        setItem(newData);
        setIsEditing(false);
        Alert.alert(
          t('calendarDetails.messages.success'), 
          t('calendarDetails.messages.itemConverted', {
            title: newData.title,
            fromType: itemType === 'event' ? t('calendarDetails.types.event') : t('calendarDetails.types.souvenir'),
            toType: editItemType === 'event' ? t('calendarDetails.types.event') : t('calendarDetails.types.souvenir')
          }),
          [{ text: t('calendarDetails.messages.ok') }]
        );
      } else {
        // Update in same table
        let updateData: any = { ...itemData };

        if (itemType === 'event') {
        updateData.event_date = editDate.toISOString().split('T')[0];
        updateData.event_time = editTime.toTimeString().split(' ')[0];
          updateData.alarmable = editAlarmable;
        } else if (itemType === 'souvenir') {
        updateData.memory_date = editDate.toISOString().split('T')[0];
        updateData.memory_time = editTime.toTimeString().split(' ')[0];
          updateData.image_url = editImage;
        }

        const tableName = itemType === 'event' ? 'calendar_events' : 'calendar_souvenirs';
      const { data, error } = await supabase
        .from(tableName)
        .update(updateData)
        .eq('id', item.id)
        .select()
        .single();

        if (error) {
          console.error('Error updating item:', error);
          Alert.alert(t('calendarDetails.error'), t('calendarDetails.errorSaving'));
          return;
        }

        if (data) {
      setItem(data);
      setIsEditing(false);
          Alert.alert(
            t('calendarDetails.messages.success'), 
            itemType === 'event' 
              ? t('calendarDetails.messages.eventUpdated', { title: data.title })
              : t('calendarDetails.messages.souvenirUpdated', { title: data.title }),
            [{ text: t('calendarDetails.messages.ok') }]
          );
        }
      }
    } catch (error) {
      console.error('Error updating item:', error);
      Alert.alert(t('calendarDetails.error'), t('calendarDetails.errorOccurred'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      t('calendarDetails.deleteItem'),
      t('calendarDetails.messages.deleteConfirmation', {
        title: item.title,
        type: itemType === 'event' ? t('calendarDetails.types.event') : t('calendarDetails.types.souvenir')
      }),
      [
        {
          text: t('calendarDetails.cancel'),
          style: 'cancel',
        },
        {
          text: t('calendarDetails.delete'),
          style: 'destructive',
          onPress: confirmDelete,
        },
      ]
    );
  };

  const confirmDelete = async () => {
    if (!item) return;

    try {
      setIsDeleting(true);
      
      let tableName: string;
      switch (itemType) {
        case 'event':
          tableName = 'calendar_events';
          break;
        case 'souvenir':
          tableName = 'calendar_souvenirs';
          break;
      default:
          throw new Error(t('calendarDetails.messages.invalidItemType'));
      }

      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', item.id);

      if (error) {
        console.error('Error deleting item:', error);
        Alert.alert(t('calendarDetails.error'), t('calendarDetails.errorDeleting'));
      return;
    }
    
      Alert.alert(
        t('calendarDetails.messages.deleted'), 
        itemType === 'event' 
          ? t('calendarDetails.messages.eventDeleted', { title: item.title })
          : t('calendarDetails.messages.souvenirDeleted', { title: item.title }),
        [
          {
            text: t('calendarDetails.messages.ok'),
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error('Error deleting item:', error);
      Alert.alert(t('calendarDetails.error'), t('calendarDetails.errorOccurred'));
    } finally {
      setIsDeleting(false);
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

  const formatTime = (time: Date) => {
    return time.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Place search using OpenStreetMap Nominatim API
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

  const selectPlace = (place: any) => {
    setEditPlace(place.display_name);
    setShowPlaceSuggestions(false);
    setPlaceSuggestions([]);
  };

  // Image picker function
  const pickImage = async (source: 'camera' | 'gallery') => {
    try {
      let result;
      if (source === 'camera') {
        const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
        if (permissionResult.granted === false) {
          Alert.alert(t('profile.permissionDenied'), t('profile.cameraPermissionRequired'));
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
          Alert.alert(t('profile.permissionDenied'), t('profile.galleryPermissionRequired'));
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
        await uploadImageToCloudinary(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert(t('common.error'), t('profile.cannotSelectImage'));
    }
  };

  // Upload image to Cloudinary
  const uploadImageToCloudinary = async (imageUri: string) => {
    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      
      // Handle different platforms
      let fileData;
      if (Platform.OS === 'web') {
        // For web platform
          const response = await fetch(imageUri);
          const blob = await response.blob();
        fileData = new File([blob], 'souvenir.jpg', { type: 'image/jpeg' });
      } else {
        // For mobile platforms
        fileData = {
          uri: imageUri,
          type: 'image/jpeg',
          name: 'souvenir.jpg',
        };
      }
      
      formData.append('file', fileData as any);
      formData.append('cloud_name', CLOUDINARY_CONFIG.cloudName);
      formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Cloudinary response error:', response.status, errorText);
        throw new Error(`Upload failed: ${response.status}`);
      }

      const data = await response.json();
      if (data.secure_url) {
        // Fix Cloudinary URL by removing trailing slash if present
        const cleanUrl = data.secure_url.endsWith('/') 
          ? data.secure_url.slice(0, -1) 
          : data.secure_url;
        
        // Store the Cloudinary URL
        setEditImage(cleanUrl);
        Alert.alert(t('common.success'), t('profile.profilePictureUpdated'));
      } else {
        throw new Error('No secure URL returned from Cloudinary');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert(t('common.error'), t('profile.cannotUploadImage'));
    } finally {
      setIsUploadingImage(false);
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <View className={`flex-1 ${isDarkMode ? 'bg-dark-bg' : 'bg-background'} justify-center items-center`}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text className={`mt-4 ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
            {t('calendarDetails.loading')}
          </Text>
        </View>
      </AppLayout>
    );
  }

  if (!item) {
    return (
      <AppLayout>
        <View className={`flex-1 ${isDarkMode ? 'bg-dark-bg' : 'bg-background'} justify-center items-center`}>
          <MaterialCommunityIcons 
            name="file-document-outline" 
            size={64} 
            color={isDarkMode ? '#666' : '#999'} 
          />
          <Text className={`mt-4 text-lg ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
            Élément non trouvé
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            className={`mt-4 px-6 py-3 rounded-lg ${isDarkMode ? 'bg-dark-card' : 'bg-blue-500'}`}
          >
            <Text className={`${isDarkMode ? 'text-white' : 'text-white'} font-medium`}>
              Retour
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
          backgroundColor: isDarkMode ? '#000000' : '#F5F5F5'
        }}
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: 300
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header matching the exact UI from images */}
        <View style={{
          paddingHorizontal: 20,
          paddingVertical: 16,
          backgroundColor: isDarkMode ? '#000000' : '#FFFFFF',
          borderBottomWidth: 1,
          borderBottomColor: isDarkMode ? '#000000' : '#E5E5E5'
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
                color={isDarkMode ? '#FFFFFF' : '#000000'} 
              />
            </TouchableOpacity>
            
            <Text style={{
              fontSize: 18,
              fontWeight: '600',
              color: isDarkMode ? '#FFFFFF' : '#000000'
            }}>
              {isEditing ? (editItemType === 'event' ? t('calendarDetails.types.event') : t('calendarDetails.types.souvenir')) : (itemType === 'event' ? t('calendarDetails.title') : `${t('calendarDetails.title')} ${t('calendarDetails.types.souvenir')}`)}
            </Text>
                  </View>
                </View>

        {/* Content matching the exact UI from images */}
        <View style={{ padding: 20 }}>
          {/* Type Selection - Always visible */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{
              fontSize: 16,
              fontWeight: '600',
              color: isDarkMode ? '#FFFFFF' : '#000000',
              marginBottom: 12
            }}>
              {t('calendarDetails.types.sharedMoment')}
            </Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                onPress={() => {
                  if (isEditing) {
                    setEditItemType('event');
                  } else {
                    // Switch to event type
                    setEditItemType('event');
                    setIsEditing(true);
                  }
                }}
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: (isEditing ? editItemType : itemType) === 'event' ? '#87CEEB' : (isDarkMode ? '#000000' : '#E5E5E5'),
                  backgroundColor: (isEditing ? editItemType : itemType) === 'event' ? '#E6F3FF' : (isDarkMode ? '#000000' : '#FFFFFF')
                }}
                 >
                   <MaterialCommunityIcons 
                     name="calendar" 
                     size={20} 
                  color={(isEditing ? editItemType : itemType) === 'event' ? '#4682B4' : '#999999'} 
                />
                <Text style={{
                  marginLeft: 8,
                  fontSize: 16,
                  fontWeight: '500',
                  color: (isEditing ? editItemType : itemType) === 'event' ? '#4682B4' : '#999999'
                }}>
                     {t('calendarDetails.types.event')}
                   </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={() => {
                  if (isEditing) {
                    setEditItemType('souvenir');
                  } else {
                    // Switch to souvenir type
                    setEditItemType('souvenir');
                    setIsEditing(true);
                  }
                }}
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: (isEditing ? editItemType : itemType) === 'souvenir' ? '#FFB6C1' : (isDarkMode ? '#000000' : '#E5E5E5'),
                  backgroundColor: (isEditing ? editItemType : itemType) === 'souvenir' ? '#FFE4E1' : (isDarkMode ? '#000000' : '#FFFFFF')
                }}
                 >
                   <MaterialCommunityIcons 
                     name="heart" 
                     size={20} 
                  color={(isEditing ? editItemType : itemType) === 'souvenir' ? '#DC143C' : '#999999'} 
                />
                <Text style={{
                  marginLeft: 8,
                  fontSize: 16,
                  fontWeight: '500',
                  color: (isEditing ? editItemType : itemType) === 'souvenir' ? '#DC143C' : '#999999'
                }}>
                     {t('calendarDetails.types.souvenir')}
                   </Text>
              </TouchableOpacity>
               </View>
             </View>

          {/* Title */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{
              fontSize: 16,
              fontWeight: '600',
              color: isDarkMode ? '#FFFFFF' : '#000000',
              marginBottom: 12
            }}>
              {t('calendarDetails.fields.title')}
            </Text>
            {isEditing ? (
              <TextInput
                value={editTitle}
                onChangeText={setEditTitle}
                placeholder={t('calendarDetails.placeholders.title')}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: isDarkMode ? '#000000' : '#E5E5E5',
                  backgroundColor: isDarkMode ? '#000000' : '#FFFFFF',
                  fontSize: 16,
                  color: isDarkMode ? '#FFFFFF' : '#000000'
                }}
                placeholderTextColor={isDarkMode ? '#CCCCCC' : '#999999'}
              />
            ) : (
              <Text style={{
                fontSize: 18,
                fontWeight: '600',
                color: isDarkMode ? '#FFFFFF' : '#000000'
              }}>
                {item.title}
              </Text>
            )}
          </View>

          {/* Date */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{
              fontSize: 16,
              fontWeight: '600',
              color: isDarkMode ? '#FFFFFF' : '#000000',
              marginBottom: 12
            }}>
              {t('calendarDetails.fields.date')}
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
                      borderColor: isDarkMode ? '#000000' : '#E5E5E5',
                      backgroundColor: isDarkMode ? '#000000' : '#FFFFFF'
                    }}
                  >
                    <MaterialCommunityIcons 
                      name="calendar" 
                      size={20} 
                      color={isDarkMode ? '#CCCCCC' : '#999999'} 
                    />
                    <Text style={{
                      marginLeft: 8,
                      fontSize: 16,
                      color: isDarkMode ? '#FFFFFF' : '#000000'
                    }}>
                        {editDate.toLocaleDateString('fr-FR')}
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
                    borderColor: isDarkMode ? '#000000' : '#E5E5E5',
                    backgroundColor: isDarkMode ? '#000000' : '#FFFFFF'
                  }}>
                    <MaterialCommunityIcons 
                      name="calendar" 
                      size={20} 
                      color={isDarkMode ? '#CCCCCC' : '#999999'} 
                    />
                    <Text style={{
                      marginLeft: 8,
                      fontSize: 16,
                      color: isDarkMode ? '#FFFFFF' : '#000000'
                    }}>
                      {itemType === 'event' ? formatDate(new Date((item as CalendarEvent).event_date)) : formatDate(new Date((item as CalendarSouvenir).memory_date))}
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
                      borderColor: isDarkMode ? '#000000' : '#E5E5E5',
                      backgroundColor: isDarkMode ? '#000000' : '#FFFFFF'
                    }}
                  >
                    <MaterialCommunityIcons 
                      name="clock" 
                      size={20} 
                      color={isDarkMode ? '#CCCCCC' : '#999999'} 
                    />
                    <Text style={{
                      marginLeft: 8,
                      fontSize: 16,
                      color: isDarkMode ? '#FFFFFF' : '#000000'
                    }}>
                      {formatTime(editTime)}
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
                    borderColor: isDarkMode ? '#000000' : '#E5E5E5',
                    backgroundColor: isDarkMode ? '#000000' : '#FFFFFF'
                  }}>
                    <MaterialCommunityIcons 
                      name="clock" 
                      size={20} 
                      color={isDarkMode ? '#CCCCCC' : '#999999'} 
                    />
                    <Text style={{
                      marginLeft: 8,
                      fontSize: 16,
                      color: isDarkMode ? '#FFFFFF' : '#000000'
                    }}>
                      {itemType === 'event' ? (item as CalendarEvent).event_time : (item as CalendarSouvenir).memory_time}
                       </Text>
                     </View>
                )}
                     </View>
                     </View>
            
            {/* Date/Time Pickers */}
            {showDatePicker && (
              <DateTimePicker
                value={editDate}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) {
                    setEditDate(selectedDate);
                  }
                }}
              />
            )}
            
            {showTimePicker && (
              <DateTimePicker
                value={editTime}
                mode="time"
                display="default"
                onChange={(event, selectedTime) => {
                  setShowTimePicker(false);
                  if (selectedTime) {
                    setEditTime(selectedTime);
                  }
                }}
              />
            )}
                     </View>

           {/* Place */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{
              fontSize: 16,
              fontWeight: '600',
              color: isDarkMode ? '#FFFFFF' : '#000000',
              marginBottom: 12
            }}>
              {t('calendarDetails.fields.place')}
            </Text>
           {isEditing ? (
              <View>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: isDarkMode ? '#000000' : '#E5E5E5',
                  backgroundColor: isDarkMode ? '#000000' : '#FFFFFF'
                }}>
                 <TextInput
                   value={editPlace}
                    onChangeText={(text) => {
                      setEditPlace(text);
                      searchPlaces(text);
                    }}
                    placeholder={t('calendarDetails.placeholders.place')}
                    style={{
                      flex: 1,
                      fontSize: 16,
                      color: isDarkMode ? '#FFFFFF' : '#000000'
                    }}
                    placeholderTextColor="#999999"
                  />
                   {isLoadingPlaces ? (
                    <ActivityIndicator size="small" color="#999999" />
                  ) : (
                    <MaterialCommunityIcons 
                      name="map-marker" 
                      size={20} 
                      color={isDarkMode ? '#CCCCCC' : '#999999'} 
                    />
                  )}
                       </View>
                
                {/* Place Suggestions */}
                {showPlaceSuggestions && placeSuggestions.length > 0 && (
                  <View style={{
                    marginTop: 4,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: isDarkMode ? '#000000' : '#E5E5E5',
                    backgroundColor: isDarkMode ? '#000000' : '#FFFFFF',
                    maxHeight: 200,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    elevation: 3
                  }}>
                    <ScrollView style={{ maxHeight: 200 }}>
                       {placeSuggestions.map((place, index) => (
                        <TouchableOpacity
                           key={index}
                          onPress={() => selectPlace(place)}
                          style={{
                            paddingHorizontal: 16,
                            paddingVertical: 12,
                            borderBottomWidth: index < placeSuggestions.length - 1 ? 1 : 0,
                            borderBottomColor: isDarkMode ? '#000000' : '#E5E5E5'
                          }}
                        >
                          <Text style={{
                            fontSize: 14,
                            color: isDarkMode ? '#FFFFFF' : '#000000',
                            lineHeight: 18
                          }}>
                            {place.display_name}
                             </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                     </View>
                )}
                     </View>
            ) : (
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: isDarkMode ? '#000000' : '#E5E5E5',
                backgroundColor: isDarkMode ? '#000000' : '#FFFFFF'
              }}>
                <Text style={{
                  flex: 1,
                  fontSize: 16,
                  color: isDarkMode ? '#FFFFFF' : '#000000'
                }}>
                  {item.place || t('common.noPlace')}
                </Text>
                <MaterialCommunityIcons 
                  name="map-marker" 
                  size={20} 
                  color="#999999" 
                />
                 </View>
               )}
             </View>

          {/* Alarm Toggle (for events only) */}
          {editItemType === 'event' && isEditing && (
            <View style={{ marginBottom: 24 }}>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 12
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <MaterialCommunityIcons 
                    name="bell" 
                    size={20} 
                    color="#999999" 
                  />
                  <Text style={{
                    marginLeft: 8,
                    fontSize: 16,
                    color: isDarkMode ? '#FFFFFF' : '#000000'
                  }}>
                    {t('calendarDetails.fields.alarmable')}
                             </Text>
                   </View>
                <TouchableOpacity
                  onPress={() => setEditAlarmable(!editAlarmable)}
                  style={{
                    width: 50,
                    height: 30,
                    borderRadius: 15,
                    backgroundColor: editAlarmable ? '#007AFF' : (isDarkMode ? '#000000' : '#E5E5E5'),
                    justifyContent: 'center',
                    alignItems: editAlarmable ? 'flex-end' : 'flex-start',
                    paddingHorizontal: 2
                  }}
                >
                  <View style={{
                    width: 26,
                    height: 26,
                    borderRadius: 13,
                    backgroundColor: isDarkMode ? '#000000' : '#FFFFFF',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.2,
                    shadowRadius: 2,
                    elevation: 2
                  }} />
                </TouchableOpacity>
                 </View>
              <Text style={{
                fontSize: 14,
                color: '#999999',
                marginTop: 4
              }}>
                {editAlarmable 
                  ? t('calendar.reminderDescription')
                  : t('calendar.noReminderDescription')
                }
              </Text>
               </View>
          )}

          {/* Photos (for souvenirs only) */}
          {editItemType === 'souvenir' && isEditing && (
            <View style={{ marginBottom: 12 }}>
              <Text style={{
                fontSize: 16,
                fontWeight: '600',
                color: isDarkMode ? '#FFFFFF' : '#000000',
                marginBottom: 12
              }}>
                {t('calendarDetails.fields.image')}
              </Text>
              {editImage ? (
                <View style={{
                  borderRadius: 8,
                  overflow: 'hidden',
                  borderWidth: 2,
                  borderColor: '#FFB6C1',
                  backgroundColor: isDarkMode ? '#000000' : '#FFFFFF',
                  aspectRatio: 16/9,
                  maxHeight: 80
                }}>
                  <Image 
                    source={{ uri: editImage }} 
                    style={{
                      width: '100%',
                      height: '100%',
                      resizeMode: 'cover'
                    }}
                  />
                  <TouchableOpacity
                    onPress={() => setEditImage(null)}
                    style={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      backgroundColor: 'rgba(0,0,0,0.6)',
                      borderRadius: 12,
                      width: 24,
                      height: 24,
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <MaterialCommunityIcons name="close" size={12} color={isDarkMode ? '#FFFFFF' : '#FFFFFF'} />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{
                  height: 120,
                  borderRadius: 8,
                  borderWidth: 2,
                  borderColor: '#FFB6C1',
                  borderStyle: 'dashed',
                  backgroundColor: '#FFE4E1',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {isUploadingImage ? (
                    <ActivityIndicator size="large" color="#FFB6C1" />
                  ) : (
                    <>
                      <MaterialCommunityIcons 
                        name="image" 
                        size={32} 
                        color="#FFB6C1" 
                      />
                      <Text style={{
                        marginTop: 8,
                        fontSize: 14,
                        color: '#DC143C',
                        textAlign: 'center'
                      }}>
                        {t('calendar.addImage')}
                      </Text>
                      <View style={{ flexDirection: 'row', marginTop: 12, gap: 12 }}>
                        <TouchableOpacity 
                          onPress={() => pickImage('camera')}
                          disabled={isUploadingImage}
                          style={{
                            paddingHorizontal: 16,
                            paddingVertical: 8,
                            borderRadius: 20,
                            backgroundColor: '#FFB6C1',
                            borderWidth: 1,
                            borderColor: '#DC143C',
                            opacity: isUploadingImage ? 0.6 : 1
                          }}
                        >
                          <Text style={{ color: '#DC143C', fontSize: 12, fontWeight: '600' }}>
                            📷 {t('calendar.camera')}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          onPress={() => pickImage('gallery')}
                          disabled={isUploadingImage}
                          style={{
                            paddingHorizontal: 16,
                            paddingVertical: 8,
                            borderRadius: 20,
                            backgroundColor: '#87CEEB',
                            borderWidth: 1,
                            borderColor: '#4682B4',
                            opacity: isUploadingImage ? 0.6 : 1
                          }}
                        >
                          <Text style={{ color: '#4682B4', fontSize: 12, fontWeight: '600' }}>
                            🖼️ {t('calendar.gallery')}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </View>
              )}
            </View>
          )}

           {/* Description */}
          <View style={{ marginBottom: 12 }}>
            <Text style={{
              fontSize: 16,
              fontWeight: '600',
              color: isDarkMode ? '#FFFFFF' : '#000000',
              marginBottom: 12
            }}>
              {t('calendarDetails.fields.description')}
            </Text>
           {isEditing ? (
               <TextInput
                 value={editDescription}
                 onChangeText={setEditDescription}
                placeholder={t('calendarDetails.placeholders.description')}
                 multiline
                 numberOfLines={4}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: isDarkMode ? '#000000' : '#E5E5E5',
                  backgroundColor: isDarkMode ? '#000000' : '#FFFFFF',
                  fontSize: 16,
                  color: isDarkMode ? '#FFFFFF' : '#000000',
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
                {item.description || t('common.noDescription')}
              </Text>
            )}
         </View>

          {/* Image Card (for souvenirs only) */}
          {itemType === 'souvenir' && (
            <View className={`p-5 rounded-xl mb-4 ${
              isDarkMode ? 'bg-dark-card border border-dark-border' : 'bg-white border border-gray-200'
            }`}>
              <View className="flex-row items-center mb-3">
                <MaterialCommunityIcons 
                  name="image" 
                  size={20} 
                  color={isDarkMode ? '#60A5FA' : '#2563EB'} 
                />
                <Text className={`ml-2 text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  {t('calendarDetails.fields.image')}
                </Text>
              </View>
              {(item as CalendarSouvenir).image_url ? (
                <View style={{
                  width: '100%',
                  aspectRatio: 16/9,
                  maxHeight: 80,
                  borderRadius: 8,
                  overflow: 'hidden'
                }}>
                  <Image
                    source={{ uri: (item as CalendarSouvenir).image_url }}
                    style={{
                      width: '100%',
                      height: '100%',
                      resizeMode: 'cover'
                    }}
                  />
                 </View>
               ) : (
                <View style={{
                  width: '100%',
                  aspectRatio: 16/9,
                  minHeight: 120,
                  borderRadius: 8,
                  borderWidth: 2,
                  borderStyle: 'dashed',
                  borderColor: isDarkMode ? '#666' : '#999',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}>
                  <MaterialCommunityIcons 
                    name="image-outline" 
                    size={20} 
                    color={isDarkMode ? '#666' : '#999'} 
                  />
                  <Text className={`mt-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {t('calendarDetails.placeholders.noImage')}
                  </Text>
                </View>
              )}
          </View>
        )}

          {/* Metadata Card */}
        </View>
            
        {/* Action Buttons */}
        {isEditing && (
          <View style={{ padding: 20, marginBottom: 80 }}>
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
                  }}>{t('calendarDetails.save')}...</Text>
                </View>
              ) : (
                <Text style={{
    color: 'white',
    fontWeight: '600',
                  fontSize: 16,
                  textAlign: 'center'
                }}>{t('calendarDetails.save')}</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* View Mode Action Buttons */}
        {!isEditing && (
          <View style={{ padding: 20, marginBottom: 80 }}>
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
              }}>{t('calendarDetails.modifyItem')}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={handleDelete}
              disabled={isDeleting}
              style={{
                paddingVertical: 16,
     borderRadius: 12,
     borderWidth: 1,
                borderColor: '#FFB6C1',
                backgroundColor: isDarkMode ? '#000000' : '#FFFFFF'
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
                  }}>{t('calendarDetails.delete')}...</Text>
                </View>
              ) : (
                <Text style={{
                  color: '#DC143C',
                  fontWeight: '600',
     fontSize: 16,
                  textAlign: 'center'
                }}>{t('calendarDetails.deleteItem')}</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>
    </AppLayout>
  );
}
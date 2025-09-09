import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useDarkTheme } from '../../contexts/DarkThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../lib/auth';
import AppLayout from '../app-layout';

const BRAND_BLUE = "#2DB6FF";
const BRAND_PINK = "#F47CC6";
const BRAND_GRAY = "#6C6C6C";

// Cloudinary configuration (same as index.tsx)
const CLOUDINARY_CONFIG = {
  cloudName: 'dtivjmfgj',
  apiKey: '579167569966336',
  apiSecret: 'MV7tzxkgAr_xBLuLQnpPNrxuhA0',
  uploadPreset: 'ZOOJAPP'
};

export default function MonProfilPage() {
  const router = useRouter();
  const { user, profile, profileLoading, updateProfile, updatePassword, signOut } = useAuth();
  const { t } = useLanguage();
  const { isDarkMode } = useDarkTheme();
  
  const [fullName, setFullName] = useState(profile?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('........');
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [tempName, setTempName] = useState(profile?.name || '');
  const [tempPassword, setTempPassword] = useState('');
  
  // Profile picture upload state
  const [isUploadingPicture, setIsUploadingPicture] = useState(false);
  
  // Modal state for profile picture options
  const [showProfilePictureModal, setShowProfilePictureModal] = useState(false);

  // Update local state when profile changes
  React.useEffect(() => {
    if (profile) {
      setFullName(profile.name || '');
      setTempName(profile.name || '');
    }
    if (user?.email) {
      setEmail(user.email);
    }
  }, [profile, user]);

  const handleBack = () => {
    router.back();
  };

  const handleEditName = () => {
    if (isEditingName) {
      // Save changes
      handleSaveName();
    } else {
      // Start editing
      setTempName(fullName);
      setIsEditingName(true);
    }
  };

  const handleSaveName = async () => {
    if (!tempName.trim()) {
      Alert.alert(t('profile.error'), t('profile.nameCannotBeEmpty'));
      return;
    }

    try {
      const { error } = await updateProfile({ name: tempName.trim() });
      
      if (error) {
        Alert.alert(t('profile.error'), error.message || t('profile.cannotUpdateName'));
        return;
      }

      setFullName(tempName.trim());
      setIsEditingName(false);
      Alert.alert(t('profile.success'), t('profile.nameUpdated'));
    } catch (error) {
      Alert.alert(t('profile.error'), t('profile.unexpectedError'));
    }
  };

  const handleEditPassword = () => {
    if (isEditingPassword) {
      // Save password changes
      handleSavePassword();
    } else {
      // Start editing
      setIsEditingPassword(true);
      setTempPassword('');
    }
  };

  const handleSavePassword = async () => {
    if (tempPassword.length < 6) {
      Alert.alert(t('profile.error'), t('profile.passwordMinLength'));
      return;
    }

    try {
      // Update password in auth
      const { error } = await updatePassword(tempPassword);
      
      if (error) {
        Alert.alert(t('profile.error'), error.message || t('profile.cannotUpdatePassword'));
        return;
      }

      setPassword('........');
      setIsEditingPassword(false);
      setTempPassword('');
      Alert.alert(t('profile.success'), t('profile.passwordUpdated'));
    } catch (error) {
      Alert.alert(t('profile.error'), t('profile.unexpectedError'));
    }
  };

  const handleSaveChanges = () => {
    // Save all pending changes
    if (isEditingName) {
      handleSaveName();
    }
    if (isEditingPassword) {
      handleSavePassword();
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } finally {
      router.replace('/');
    }
  };

  // Profile picture functions (same as index.tsx)
  const pickImageFromGallery = async () => {
    setShowProfilePictureModal(false);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadProfilePicture(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert(t('profile.error'), t('profile.cannotSelectImage'));
    }
  };

  const takePhotoWithCamera = async () => {
    setShowProfilePictureModal(false);
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(t('profile.permissionDenied'), t('profile.cameraPermissionRequired'));
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadProfilePicture(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert(t('profile.error'), t('profile.cannotTakePhoto'));
    }
  };

  const uploadProfilePicture = async (imageUri: string) => {
    if (!imageUri) return;

    setIsUploadingPicture(true);
    try {
      const formData = new FormData();
      
      // Platform-specific file handling
      let fileData: File | any;
      
      if (Platform.OS === 'web') {
        // For web, we need to fetch the image and create a File object
        const response = await fetch(imageUri);
        const blob = await response.blob();
        fileData = new File([blob], 'profile.jpg', { type: 'image/jpeg' });
      } else {
        // For mobile platforms
        fileData = {
          uri: imageUri,
          type: 'image/jpeg',
          name: 'profile.jpg',
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
        
        // Update profile with new picture URL
        const { error } = await updateProfile({ profile_picture: cleanUrl });
        if (error) {
          Alert.alert(t('profile.error'), t('profile.cannotUpdateProfilePicture'));
        } else {
          Alert.alert(t('profile.success'), t('profile.profilePictureUpdated'));
        }
      } else {
        throw new Error('Upload failed - no secure_url in response');
      }
    } catch (error) {
      console.error('Profile picture upload error:', error);
      Alert.alert(t('profile.error'), t('profile.cannotUploadImage'));
    } finally {
      setIsUploadingPicture(false);
    }
  };

  const handleDeleteProfilePicture = async () => {
    setShowProfilePictureModal(false);
    try {
      const { error } = await updateProfile({ profile_picture: null });
      if (error) {
        Alert.alert(t('profile.error'), t('profile.cannotDeletePhoto'));
      } else {
        Alert.alert(t('profile.success'), t('profile.photoDeleted'));
      }
    } catch (error) {
      Alert.alert(t('profile.error'), t('profile.deletionError'));
    }
  };

  const handleChangeProfilePicture = () => {
    console.log('Camera button clicked!'); // Debug log
    setShowProfilePictureModal(true);
  };

  if (profileLoading) {
    return (
      <AppLayout>
        <View style={styles.container}>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>{t('profile.loading')}</Text>
          </View>
        </View>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={handleBack}>
            <MaterialCommunityIcons name="chevron-left" size={24} color={BRAND_GRAY} />
          </Pressable>
          <Text style={styles.headerTitle}>{t('profile.title')}</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Profile Picture Section */}
        <View style={styles.profilePictureSection}>
          <View style={styles.profilePictureContainer}>
            {profile?.profile_picture ? (
              <Image 
                source={{ uri: profile.profile_picture }} 
                style={styles.profilePicture}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.profilePicturePlaceholder}>
                <Text style={styles.profilePictureText}>
                  {fullName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            
            {/* Upload overlay when uploading */}
            {isUploadingPicture && (
              <View style={styles.uploadOverlay}>
                <ActivityIndicator size="large" color="#FFFFFF" />
              </View>
            )}
            
            <Pressable 
              style={[styles.cameraButton, isUploadingPicture && styles.cameraButtonDisabled]} 
              onPress={handleChangeProfilePicture}
              disabled={isUploadingPicture}
            >
              <MaterialCommunityIcons name="camera" size={20} color="#FFFFFF" />
            </Pressable>
          </View>
          <Text style={styles.profilePictureLabel}>
            {isUploadingPicture ? t('profile.uploading') : t('profile.changePhotoInstruction')}
          </Text>
        </View>

        {/* User Information Fields */}
        <View style={styles.formSection}>
          {/* Full Name Field */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('profile.fullName')}</Text>
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons name="account" size={20} color={BRAND_GRAY} style={styles.inputIcon} />
              {isEditingName ? (
                <TextInput
                  style={styles.textInput}
                  value={tempName}
                  onChangeText={setTempName}
                  placeholder={t('profile.enterFullName')}
                  autoFocus
                />
              ) : (
                <Text style={styles.inputText}>{fullName || t('profile.notDefined')}</Text>
              )}
              <Pressable style={styles.editButton} onPress={handleEditName}>
                <MaterialCommunityIcons 
                  name={isEditingName ? "check" : "pencil"} 
                  size={20} 
                  color={BRAND_BLUE} 
                />
              </Pressable>
            </View>
          </View>

          {/* Email Field */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('profile.email')}</Text>
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons name="email" size={20} color={BRAND_GRAY} style={styles.inputIcon} />
              <Text style={styles.inputText}>{email || t('profile.notDefined')}</Text>
              {/* No edit button for email as it's read-only */}
            </View>
          </View>

          {/* Password Field */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('profile.password')}</Text>
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons name="lock" size={20} color={BRAND_GRAY} style={styles.inputIcon} />
              {isEditingPassword ? (
                <TextInput
                  style={styles.textInput}
                  value={tempPassword}
                  onChangeText={setTempPassword}
                  placeholder={t('profile.enterNewPassword')}
                  secureTextEntry
                  autoFocus
                />
              ) : (
                <Text style={styles.inputText}>{password}</Text>
              )}
              <Pressable style={styles.editButton} onPress={handleEditPassword}>
                <MaterialCommunityIcons 
                  name={isEditingPassword ? "check" : "pencil"} 
                  size={20} 
                  color={BRAND_BLUE} 
                />
              </Pressable>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <Pressable style={styles.saveButton} onPress={handleSaveChanges}>
            <Text style={styles.saveButtonText}>{t('profile.saveChanges')}</Text>
          </Pressable>

          <Pressable style={styles.logoutButton} onPress={handleLogout}>
            <MaterialCommunityIcons name="logout" size={20} color={BRAND_PINK} style={styles.logoutIcon} />
            <Text style={styles.logoutButtonText}>{t('profile.logout')}</Text>
          </Pressable>
        </View>
        
        {/* Profile Picture Options Modal */}
        <Modal
          key="profile-picture-modal"
          visible={showProfilePictureModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowProfilePictureModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{t('profile.changeProfilePhoto')}</Text>
              <Text style={styles.modalSubtitle}>{t('profile.chooseOption')}</Text>
              
              <Pressable key="take-photo-option" style={styles.modalOption} onPress={takePhotoWithCamera}>
                <MaterialCommunityIcons name="camera" size={24} color={BRAND_BLUE} />
                <Text style={styles.modalOptionText}>{t('profile.takePhoto')}</Text>
              </Pressable>
              
              <Pressable key="gallery-option" style={styles.modalOption} onPress={pickImageFromGallery}>
                <MaterialCommunityIcons name="image" size={24} color={BRAND_BLUE} />
                <Text style={styles.modalOptionText}>{t('profile.chooseFromGallery')}</Text>
              </Pressable>
              
              {profile?.profile_picture && (
                <Pressable key="delete-option" style={[styles.modalOption, styles.deleteOption]} onPress={handleDeleteProfilePicture}>
                  <MaterialCommunityIcons name="delete" size={24} color="#EF4444" />
                  <Text style={[styles.modalOptionText, styles.deleteOptionText]}>{t('profile.deletePhoto')}</Text>
                </Pressable>
              )}
              
              <Pressable 
                key="cancel-option"
                style={styles.cancelButton} 
                onPress={() => setShowProfilePictureModal(false)}
              >
                <Text style={styles.cancelButtonText}>{t('profile.cancel')}</Text>
              </Pressable>
        </View>
          </View>
        </Modal>
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
    fontSize: 18,
    color: '#6C6C6C',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#374151',
  },
  headerSpacer: {
    width: 40,
  },
  backButton: {
    padding: 8,
  },
  profilePictureSection: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 40,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  profilePictureContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  profilePicture: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
  },
  profilePicturePlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePictureText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#9CA3AF',
  },
  uploadOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: BRAND_BLUE,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  cameraButtonDisabled: {
    opacity: 0.7,
  },
  profilePictureLabel: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 10,
    textAlign: 'center',
  },
  formSection: {
    paddingHorizontal: 40,
    paddingTop: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  inputIcon: {
    marginRight: 10,
  },
  inputText: {
    flex: 1,
    fontSize: 16,
    color: '#4B5563',
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#4B5563',
  },
  editButton: {
    padding: 5,
  },
  actionButtons: {
    paddingHorizontal: 40,
    paddingBottom: 30,
  },
  saveButton: {
    backgroundColor: BRAND_BLUE,
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 15,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
    paddingVertical: 15,
    justifyContent: 'center',
  },
  logoutIcon: {
    marginRight: 10,
  },
  logoutButtonText: {
    color: BRAND_PINK,
    fontSize: 18,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 25,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 10,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 25,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  modalOptionText: {
    fontSize: 16,
    color: '#374151',
    marginLeft: 15,
  },
  deleteOption: {
    backgroundColor: '#FEE2E2',
    borderColor: '#EF4444',
    borderWidth: 1,
  },
  deleteOptionText: {
    color: '#EF4444',
  },
  cancelButton: {
    backgroundColor: BRAND_GRAY,
    borderRadius: 10,
    paddingVertical: 15,
    paddingHorizontal: 30,
    width: '100%',
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
});

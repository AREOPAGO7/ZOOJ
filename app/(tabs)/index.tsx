import HeaderBar from "@/components/HeaderBar"
import { profileService } from "@/lib/profileService"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import * as Clipboard from 'expo-clipboard'
import * as ImagePicker from 'expo-image-picker'
import { LinearGradient } from "expo-linear-gradient"
import * as Linking from 'expo-linking'
import { useRouter } from 'expo-router'
import { useEffect, useState } from "react"
import { ActivityIndicator, Alert, Image, Modal, Platform, Pressable, SafeAreaView, ScrollView, Share, Text, TextInput, View } from "react-native"
import { GestureHandlerRootView, PanGestureHandler, PanGestureHandlerGestureEvent } from "react-native-gesture-handler"
import { useLanguage } from "../../contexts/LanguageContext"
import { useTheme } from "../../contexts/ThemeContext"
import { useAuth } from "../../lib/auth"
import indexTranslations from "../../lib/indexTranslations.json"
import { supabase } from "../../lib/supabase"

const BRAND_BLUE = "#2DB6FF"
const BRAND_PINK = "#F47CC6"
const BRAND_GRAY = "#6C6C6C"

// Translation helper function
const getTranslation = (key: string, language: string): string => {
  const keys = key.split('.');
  let value: any = indexTranslations[language as keyof typeof indexTranslations];
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      return key; // Return key if translation not found
    }
  }
  
  return typeof value === 'string' ? value : key;
};

// Helper function to get translated interest name
const getInterestTranslation = (interestName: string, language: string): string => {
  const translationKey = `interests.categories.${interestName}`;
  const translated = getTranslation(translationKey, language);
  // If translation not found, return original name
  return translated === translationKey ? interestName : translated;
};

export default function App() {
  const { user, signUp, signIn, createProfile, updatePassword, loading: authLoading } = useAuth()
  const { colors } = useTheme()
  const { language } = useLanguage()
  const router = useRouter()
  
  // Translation helper
  const t = (key: string) => getTranslation(key, language);
  const [screen, setScreen] = useState<"welcome" | "auth" | "signup" | "profile" | "interests" | "inviteCodes" | "newPassword">("welcome")
  const [isLoading, setIsLoading] = useState(false)

  // Auth state
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [isSignUp, setIsSignUp] = useState(false)
  
  
  // New password state
  const [newPassword, setNewPassword] = useState("")
  const [confirmNewPassword, setConfirmNewPassword] = useState("")
  const [newPasswordError, setNewPasswordError] = useState("")
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)
  const [isRecoveryMode, setIsRecoveryMode] = useState(false)
  const [recoveryTokens, setRecoveryTokens] = useState<{ access_token: string; refresh_token: string } | null>(null)

  // Profile state
  const [name, setName] = useState("")
  const [birthDate, setBirthDate] = useState<string>("")
  const [gender, setGender] = useState<"male" | "female" | "other" | null>(null)
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null)
  const [isCountryOpen, setIsCountryOpen] = useState(false)
  const [isGenderOpen, setIsGenderOpen] = useState(false)
  const [isDateOpen, setIsDateOpen] = useState(false)
  
  // Profile picture state
  const [profilePicture, setProfilePicture] = useState<string | null>(null)
  const [isUploadingPicture, setIsUploadingPicture] = useState(false)
  
  // Cloudinary configuration (hardcoded for testing)
  const CLOUDINARY_CONFIG = {
    cloudName: 'dtivjmfgj',
    apiKey: '579167569966336',
    apiSecret: 'MV7tzxkgAr_xBLuLQnpPNrxuhA0',
    uploadPreset: 'ZOOJAPP'
  }
  
  // Validation state
  const [nameError, setNameError] = useState("")
  const [genderError, setGenderError] = useState("")
  const [countryError, setCountryError] = useState("")

  const countries = [
    "France", "Belgique", "Suisse", "Canada", "Maroc", "Algérie", "Tunisie", 
    "Côte d'Ivoire", "Sénégal", "Cameroun"
  ]

  const genders = ["male", "female", "other"]
  
  // Interests data - will be fetched from quiz_themes table
  const [interests, setInterests] = useState<Array<{ id: string; label: string; icon: string }>>([])
  
  // Invite code state
  const [inviteCode, setInviteCode] = useState("")
  const [redeemError, setRedeemError] = useState("")
  const [redeemSuccess, setRedeemSuccess] = useState("")
  const [myInviteCode, setMyInviteCode] = useState("")
  const [isRedeeming, setIsRedeeming] = useState(false)
  
  // Interests state
  const [selectedInterests, setSelectedInterests] = useState<string[]>([])
  const [isInterestsLoading, setIsInterestsLoading] = useState(false)
  const [showJoinSection, setShowJoinSection] = useState(false)
  const [isLoadingInterests, setIsLoadingInterests] = useState(false)

  // Fetch interests from quiz_themes table
  const fetchInterests = async () => {
    try {
      setIsLoadingInterests(true)
      console.log("Fetching interests from quiz_themes table...")
      
      const { data: quizThemes, error } = await supabase
        .from('quiz_themes')
        .select('id, name, icon')
        .order('name', { ascending: true })
      
      console.log("Database fetch result:", { quizThemes, error })
      
      if (error) {
       console.log("Error fetching quiz themes:", error)
        console.log("Using fallback interests due to database error")
        // Fallback to all available themes if database fetch fails
        setInterests([
          { id: "Voyages & découvertes", label: "Voyages & découvertes", icon: "airplane" },
          { id: "Projets d'avenir", label: "Projets d'avenir", icon: "lightbulb" },
          { id: "Bien-être & développement personnel", label: "Bien-être & développement personnel", icon: "meditation" },
          { id: "Humour & jeux", label: "Humour & jeux", icon: "emoticon-happy" },
          { id: "Communication", label: "Communication", icon: "message-text" },
          { id: "Cinéma & séries", label: "Cinéma & séries", icon: "movie" },
          { id: "Vie de couple & romance", label: "Vie de couple & romance", icon: "heart" },
          { id: "Famille & valeurs", label: "Famille & valeurs", icon: "account-group" }
        ])
        return
      }
      
      if (quizThemes && quizThemes.length > 0) {
        // Transform quiz themes to interests format
        const transformedInterests = quizThemes.map(theme => ({
          id: theme.name, // Use theme name as ID instead of theme.id
          label: theme.name,
          icon: theme.icon || "help-circle" // Default icon if none provided
        }))
        
        setInterests(transformedInterests)
        console.log("Interests fetched successfully:", transformedInterests)
      } else {
        console.log("No quiz themes found, using fallback interests")
        // Fallback to all available themes
        setInterests([
          { id: "Voyages & découvertes", label: "Voyages & découvertes", icon: "airplane" },
          { id: "Projets d'avenir", label: "Projets d'avenir", icon: "lightbulb" },
          { id: "Bien-être & développement personnel", label: "Bien-être & développement personnel", icon: "meditation" },
          { id: "Humour & jeux", label: "Humour & jeux", icon: "emoticon-happy" },
          { id: "Communication", label: "Communication", icon: "message-text" },
          { id: "Cinéma & séries", label: "Cinéma & séries", icon: "movie" },
          { id: "Vie de couple & romance", label: "Vie de couple & romance", icon: "heart" },
          { id: "Famille & valeurs", label: "Famille & valeurs", icon: "account-group" }
        ])
      }
    } catch (error) {
     console.log("Error fetching interests:", error)
      console.log("Using fallback interests due to exception")
      // Fallback to all available themes
      setInterests([
        { id: "Voyages & découvertes", label: "Voyages & découvertes", icon: "airplane" },
        { id: "Projets d'avenir", label: "Projets d'avenir", icon: "lightbulb" },
        { id: "Bien-être & développement personnel", label: "Bien-être & développement personnel", icon: "meditation" },
        { id: "Humour & jeux", label: "Humour & jeux", icon: "emoticon-happy" },
        { id: "Communication", label: "Communication", icon: "message-text" },
        { id: "Cinéma & séries", label: "Cinéma & séries", icon: "movie" },
        { id: "Vie de couple & romance", label: "Vie de couple & romance", icon: "heart" },
        { id: "Famille & valeurs", label: "Famille & valeurs", icon: "account-group" }
      ])
    } finally {
      setIsLoadingInterests(false)
    }
  }

  // Check if user is authenticated and redirect accordingly
  useEffect(() => {
    console.log("Auth state changed - user:", user?.id, "loading:", authLoading, "screen:", screen)
    if (user && !authLoading) {
      // Check if user has a profile
      checkUserProfile()
    }
  }, [user, authLoading])

  // Handle deep linking for password reset
  useEffect(() => {
    const handleDeepLink = async (url: string) => {
      console.log("Deep link received:", url)
      
      // Check if this is a password reset link
      if (url.includes('access_token=') && url.includes('type=recovery')) {
        console.log("Password reset link detected, navigating to new password screen...")
        
        try {
          // Extract the access token from the URL
          // Handle both hash-based and query parameter-based URLs
          let accessToken: string | undefined
          let refreshToken: string | undefined
          
          if (url.includes('#')) {
            // Hash-based URL (common in mobile deep links)
            const hashPart = url.split('#')[1]
            accessToken = hashPart.split('access_token=')[1]?.split('&')[0]
            refreshToken = hashPart.split('refresh_token=')[1]?.split('&')[0]
          } else {
            // Query parameter-based URL (fallback)
            const urlObj = new URL(url)
            accessToken = urlObj.searchParams.get('access_token') || undefined
            refreshToken = urlObj.searchParams.get('refresh_token') || undefined
          }
          
          if (accessToken) {
            console.log("Access token extracted, storing for later use...")
            
            // Store the tokens for later use instead of setting session immediately
            // This prevents automatic login
            setRecoveryTokens({
              access_token: accessToken,
              refresh_token: refreshToken || ''
            })
            
            // Navigate to new password screen first
            setIsRecoveryMode(true)
            setScreen("newPassword")
          } else {
            console.log("No access token found in URL")
            setNewPasswordError("Lien de réinitialisation invalide")
          }
        } catch (error) {
          console.log("Error processing recovery link:", error)
          setNewPasswordError("Erreur lors du traitement du lien")
        }
      }
    }

    // Handle initial URL if app was opened from deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url)
      }
    })

    // Listen for incoming links when app is already running
    const subscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url)
    })

    return () => {
      subscription?.remove()
    }
  }, [])

  // Clean up recovery tokens when navigating away from new password screen
  useEffect(() => {
    if (screen !== "newPassword") {
      setRecoveryTokens(null)
      setIsRecoveryMode(false)
    }
  }, [screen])

  // Fetch interests when interests screen is shown
  useEffect(() => {
    if (screen === "interests") {
      if (interests.length === 0) {
        fetchInterests()
      }
      // Pre-populate selected interests from existing profile
      loadExistingInterests()
    }
  }, [screen])

  // Pre-populate profile form if user goes back to profile screen
  useEffect(() => {
    if (screen === "profile" && user) {
      loadExistingProfileData()
    }
  }, [screen, user])

  // Load existing profile data to pre-populate form
  const loadExistingProfileData = async () => {
    if (!user) return
    
    try {
      const { data: existingProfile, error } = await profileService.getProfile(user.id)
      
      if (error) {
        console.log("Error loading existing profile data:", error)
        // If profile doesn't exist (PGRST116), that's normal for new users
        if (error.code === 'PGRST116') {
          console.log("No existing profile found - user is creating new profile")
        }
        return
      }
      
      if (existingProfile) {
        console.log("Loading existing profile data:", existingProfile)
        
        // Pre-populate form fields with existing data
        if (existingProfile.name) setName(existingProfile.name)
        if (existingProfile.country) setSelectedCountry(existingProfile.country)
        if (existingProfile.gender) setGender(existingProfile.gender)
        if (existingProfile.birth_date) setBirthDate(existingProfile.birth_date)
        if (existingProfile.profile_picture) setProfilePicture(existingProfile.profile_picture)
      }
    } catch (error) {
      console.log("Error loading existing profile data:", error)
      // Don't show error to user, just continue with empty form
    }
  }

  // Load existing interests from profile to pre-populate interests selection
  const loadExistingInterests = async () => {
    if (!user) return
    
    try {
      const { data: existingProfile, error } = await profileService.getProfile(user.id)
      
      if (error) {
        console.log("Error loading existing interests:", error)
        // If profile doesn't exist (PGRST116), that's normal for new users
        if (error.code === 'PGRST116') {
          console.log("No existing profile found - user is selecting interests for first time")
        }
        setSelectedInterests([])
        return
      }
      
      if (existingProfile && existingProfile.interests) {
        console.log("Loading existing interests from profile:", existingProfile.interests)
        
        // Map old shortcuts to full theme names
        const shortcutToFullName: { [key: string]: string } = {
          "travel": "Voyages & découvertes",
          "humor": "Humour & jeux", 
          "cinema": "Cinéma & séries",
          "communication": "Communication",
          "family": "Famille & valeurs",
          "romance": "Vie de couple & romance",
          "future": "Projets d'avenir",
          "wellness": "Bien-être & développement personnel"
        }
        
        // Convert shortcuts to full names, or keep as-is if already full names
        const mappedInterests = existingProfile.interests.map(interest => 
          shortcutToFullName[interest] || interest
        )
        
        console.log("Mapped interests:", mappedInterests)
        setSelectedInterests(mappedInterests)
      } else {
        // Clear selected interests if no profile or no interests
        setSelectedInterests([])
      }
    } catch (error) {
      console.log("Error loading existing interests:", error)
      // Clear selected interests on error
      setSelectedInterests([])
    }
  }

  const checkUserProfile = async () => {
    if (!user) return
    
    console.log("Checking profile for user:", user.id)
    
    try {
      const { data: profile, error: profileError } = await profileService.getProfile(user.id)
      
      if (profileError) {
        console.log("Profile check error:", profileError)
        // If profile doesn't exist (PGRST116), that's normal for new users
        if (profileError.code === 'PGRST116') {
          console.log("No profile found - user needs to create one")
          setScreen("profile")
          return
        }
      }
      
      if (profile) {
        console.log("User has profile:", profile)
        // Check if user has a couple
        const { data: couple, error: coupleError } = await profileService.getCouple(user.id)
        
        if (coupleError) {
          console.log("Couple check error:", coupleError)
        }
        
        // Check if profile is completed (has couple)
        if (profile.completed) {
          console.log("User has completed profile, go directly to accueil")
          // User has completed profile, go directly to accueil page (skip welcome page)
          router.push('/pages/accueil')
        } else {
          // Check if user has interests
          if (profile.interests && profile.interests.length > 0) {
            // Check if user has a couple
            const { data: couple, error: coupleError } = await profileService.getCouple(user.id)
            
            if (coupleError) {
              console.log("Couple check error:", coupleError)
            }
            
            if (couple) {
              console.log("User has profile, interests, and couple, go to accueil")
              // User has complete profile, go to accueil page
              router.push('/pages/accueil')
            } else {
              console.log("User has profile and interests but no couple, go to invite codes")
              // User has profile and interests but no couple, go to invite codes section
              setMyInviteCode(profile.invite_code || "")
              setScreen("inviteCodes")
            }
          } else {
            console.log("User has profile but no interests, go to interests")
            // User has profile but no interests, go to interests section
            setScreen("interests")
          }
        }
      } else {
        console.log("User has no profile, redirecting to profile creation")
        // User has no profile, go to profile creation
        setScreen("profile")
      }
    } catch (error) {
      console.log("Error checking user profile:", error)
      setScreen("profile")
    }
  }

  const handleSwipeRight = ({ nativeEvent }: PanGestureHandlerGestureEvent) => {
    if (nativeEvent.translationX > 80 && Math.abs(nativeEvent.translationY) < 40) {
      if (screen === "auth") setScreen("welcome")
      else if (screen === "signup") setScreen("welcome")
      else if (screen === "profile") setScreen("signup")
      else if (screen === "interests") setScreen("profile")
      else if (screen === "inviteCodes") setScreen("interests")
      else if (screen === "newPassword") setScreen("auth")
    }
  }

  const handleAuth = async () => {
    if (!email || !password) {
      setError(t('auth.fillAllFields'))
      return
    }

    setIsLoading(true)
    setError("")

    try {
      console.log("Attempting to sign in user:", email)
      const result = await signIn(email, password)
      
      if (result.error) {
        console.log("Signin error:", result.error)
        setError(result.error.message || t('auth.connectionError'))
      } else {
        console.log("Signin successful")
        // User will be automatically redirected by the useEffect
      }
    } catch (error) {
      console.log("Signin exception:", error)
      setError(t('auth.unexpectedError'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignUp = async () => {
    if (!email || !password || !confirmPassword) {
      setError(t('auth.fillAllFields'))
      return
    }

    if (password !== confirmPassword) {
      setError(t('signup.passwordsDoNotMatch'))
      return
    }

    setIsLoading(true)
    setError("")

    try {
      console.log("Attempting to sign up user:", email)
      const result = await signUp(email, password)
      
      if (result.error) {
        console.log("Signup error:", result.error)
        setError(result.error.message || t('signup.accountCreationError'))
      } else {
        console.log("Signup successful, user should be automatically signed in")
        // The user will be automatically signed in and redirected via the useEffect
        // No need to wait or manually redirect
      }
    } catch (error) {
      console.log("Signup exception:", error)
      setError(t('auth.unexpectedError'))
    } finally {
      setIsLoading(false)
    }
  }

  const validateProfile = () => {
    let isValid = true
    
    // Clear previous errors
    setNameError("")
    setGenderError("")
    setCountryError("")
    
    // Name validation
    if (!name.trim()) {
      setNameError(t('profile.nameRequired'))
      isValid = false
    } else if (name.trim().length < 2) {
      setNameError(t('profile.nameMinLength'))
      isValid = false
    }
    
    // Gender validation
    if (!gender) {
      setGenderError(t('profile.selectGender'))
      isValid = false
    }
    
    // Country validation
    if (!selectedCountry) {
      setCountryError(t('profile.selectCountry'))
      isValid = false
    }
    
    return isValid
  }

  const pickImageFromGallery = async () => {
    console.log('pickImageFromGallery called');
    try {
      // Request media library permissions for mobile
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('profile.permissionDenied'), t('profile.galleryPermissionRequired'));
        return;
      }

      console.log('Launching image picker...');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        exif: false, // Disable EXIF data for privacy
        base64: false, // Don't include base64 to reduce memory usage
      });

      console.log('Image picker result:', result);
      if (!result.canceled && result.assets[0]) {
        console.log('Image selected, uploading...');
        await uploadProfilePicture(result.assets[0].uri);
      } else {
        console.log('Image selection cancelled or no assets');
      }
    } catch (error) {
      console.log('Error picking image:', error);
      Alert.alert(t('profile.selectImageError'), t('profile.selectImageError'));
    }
  };

  const takePhotoWithCamera = async () => {
    console.log('takePhotoWithCamera called');
    try {
      console.log('Requesting camera permissions...');
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      console.log('Camera permission status:', status);
      
      if (status !== 'granted') {
        Alert.alert(t('profile.permissionDenied'), t('profile.cameraPermissionRequired'));
        return;
      }

      console.log('Launching camera...');
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        exif: false, // Disable EXIF data for privacy
        base64: false, // Don't include base64 to reduce memory usage
      });

      console.log('Camera result:', result);
      if (!result.canceled && result.assets[0]) {
        console.log('Photo taken, uploading...');
        await uploadProfilePicture(result.assets[0].uri);
      } else {
        console.log('Camera cancelled or no assets');
      }
    } catch (error) {
      console.log('Error taking photo:', error);
      Alert.alert(t('profile.takePhotoError'), t('profile.takePhotoError'));
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
        console.log('Cloudinary response error:', response.status, errorText);
        console.log(`Upload failed: ${response.status}`);
        Alert.alert(t('profile.uploadError'), t('profile.uploadError'));
        return;
      }

      const data = await response.json();
      if (data.secure_url) {
        // Fix Cloudinary URL by removing trailing slash if present
        const cleanUrl = data.secure_url.endsWith('/') 
          ? data.secure_url.slice(0, -1) 
          : data.secure_url;
        
        // Store the Cloudinary URL
        setProfilePicture(cleanUrl);
        console.log('Profile picture uploaded successfully:', cleanUrl);
        // Show success feedback
        Alert.alert(t('profile.uploadSuccess'), t('profile.uploadSuccess'));
      } else {
        console.log('Upload failed - no secure_url in response');
        Alert.alert(t('profile.uploadError'), t('profile.uploadError'));
        return;
      }
    } catch (error) {
      console.log('Profile picture upload error:', error);
      Alert.alert(t('profile.uploadError'), t('profile.uploadError'));
    } finally {
      setIsUploadingPicture(false);
    }
  };

  const handleProfileCreation = async () => {
    if (!validateProfile()) {
      console.log("Profile validation failed")
      return
    }

    if (!user) {
      setError(t('profile.userNotConnected'))
      return
    }

    console.log("Creating/updating profile for user:", user.id, user.email)
    console.log("Profile data:", { name, selectedCountry, gender, birthDate })

    setIsLoading(true)
    setError("")

    try {
      // Check if profile already exists
      const { data: existingProfile, error: profileCheckError } = await profileService.getProfile(user.id)
      
      if (profileCheckError && profileCheckError.code !== 'PGRST116') {
        console.log("Error checking existing profile:", profileCheckError)
        setError(t('profile.profileCheckError'))
        return
      }

      if (existingProfile) {
        // Profile exists, update it
        console.log("Profile exists, updating with new data")
        
        const updateData = {
          name,
          country: selectedCountry,
          gender,
          birth_date: birthDate || null,
          profile_picture: profilePicture || existingProfile.profile_picture, // Keep existing picture if no new one
          completed: false, // Reset completion status since we're updating
        }

        console.log("Updating profile with data:", updateData)

        const { data, error } = await profileService.updateProfile(user.id, updateData)
        
        if (error) {
          console.log("Profile update error:", error)
          setError(error.message || t('profile.profileUpdateError'))
        } else {
          console.log("Profile updated successfully:", data)
          // Success! Redirect to interests section
          setScreen("interests")
        }
      } else {
        // Profile doesn't exist, create new one
        console.log("Profile doesn't exist, creating new profile")
        
        const inviteCode = await profileService.generateInviteCode()
        console.log("Generated invite code:", inviteCode)
        
        const profileData = {
          id: user.id, // Include the user ID
          name,
          country: selectedCountry,
          gender,
          birth_date: birthDate || null,
          invite_code: inviteCode,
          profile_picture: profilePicture || null,
          completed: false, // Profile not completed until interests are selected
        }

        console.log("Creating new profile with data:", profileData)

        const { data, error } = await profileService.createProfile(profileData)
        
        if (error) {
          console.log("Profile creation error:", error)
          setError(error.message || t('profile.profileCreationError'))
        } else {
          console.log("Profile created successfully:", data)
          // Success! Redirect to interests section
          setScreen("interests")
        }
      }
    } catch (error) {
      console.log("Profile creation/update exception:", error)
      setError(t('auth.unexpectedError'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleRedeemCode = async () => {
    if (!inviteCode.trim()) {
      setRedeemError(t('inviteCodes.enterInviteCode'))
      return
    }
    if (!user) {
      setRedeemError(t('profile.userNotConnected'))
      return
    }

    setIsRedeeming(true)
    setRedeemError("")
    setRedeemSuccess("")

    try {
      // Find the profile with this invite code
      const { data: partnerProfile, error: findError } = await profileService.findProfileByInviteCode(inviteCode.trim())
      
      if (findError || !partnerProfile) {
        setRedeemError(t('inviteCodes.invalidCode'))
        return
      }

      if (partnerProfile.id === user.id) {
        setRedeemError(t('inviteCodes.cannotUseOwnCode'))
        return
      }

      // Create couple relationship
      const { error: coupleError } = await profileService.createCouple(user.id, partnerProfile.id)
      
      if (coupleError) {
        setRedeemError(t('inviteCodes.relationshipCreationError'))
        return
      }

      // Mark both profiles as completed since they now have a couple
      await profileService.updateProfile(user.id, { completed: true })
      await profileService.updateProfile(partnerProfile.id, { completed: true })

      setRedeemSuccess(t('inviteCodes.relationshipCreated'))
      setTimeout(() => {
        router.push('/pages/accueil')
      }, 2000)
    } catch (error) {
      setRedeemError(t('auth.unexpectedError'))
    } finally {
      setIsRedeeming(false)
    }
  }

  const handleInterestToggle = (interestId: string) => {
    setSelectedInterests(prev => 
      prev.includes(interestId) 
        ? prev.filter(id => id !== interestId)
        : [...prev, interestId]
    )
  }

  const handleInterestsComplete = async () => {
    if (!user || selectedInterests.length === 0) return
    
    console.log("Completing interests for user:", user.id)
    console.log("Selected interests (quiz theme names):", selectedInterests)
    
    setIsInterestsLoading(true)
    try {
      // Map any remaining shortcuts to full theme names before saving
      const shortcutToFullName: { [key: string]: string } = {
        "travel": "Voyages & découvertes",
        "humor": "Humour & jeux", 
        "cinema": "Cinéma & séries",
        "communication": "Communication",
        "family": "Famille & valeurs",
        "romance": "Vie de couple & romance",
        "future": "Projets d'avenir",
        "wellness": "Bien-être & développement personnel"
      }
      
      const finalInterests = selectedInterests.map(interest => 
        shortcutToFullName[interest] || interest
      )
      
      console.log("Final interests to save:", finalInterests)
      
      // Update profile with selected quiz theme names as interests
      const { data, error } = await profileService.updateProfile(user.id, { 
        interests: finalInterests, // These are now quiz theme names from the database
        completed: false // Keep as false until couple is formed
      })
      
      if (error) {
        console.log("Error updating interests:", error)
        return
      }
      
      console.log("Interests (quiz theme names) updated successfully:", data)
      
      // Get the user's invite code and go to invite codes section
      const { data: profile } = await profileService.getProfile(user.id)
      if (profile) {
        console.log("Profile retrieved, invite code:", profile.invite_code)
        setMyInviteCode(profile.invite_code || "")
        setScreen("inviteCodes")
      } else {
        console.log("Failed to retrieve profile after interests update")
        // Fallback: try to get invite code from the update result
        if (data && data.invite_code) {
          setMyInviteCode(data.invite_code)
          setScreen("inviteCodes")
        }
      }
    } catch (error) {
      console.log("Error updating interests:", error)
      // Fallback: try to get profile again
      try {
        const { data: profile } = await profileService.getProfile(user.id)
        if (profile && profile.invite_code) {
          setMyInviteCode(profile.invite_code)
          setScreen("inviteCodes")
        }
      } catch (fallbackError) {
        console.log("Fallback profile retrieval failed:", fallbackError)
      }
    } finally {
      setIsInterestsLoading(false)
    }
  }

  const handleSkipInviteCodes = () => {
    // Mark profile as completed when skipping invite codes
    if (user) {
      profileService.updateProfile(user.id, { completed: true })
        .then(() => {
          console.log("Profile marked as completed after skipping invite codes")
          router.push('/pages/accueil')
        })
        .catch(error => {
          console.log("Error marking profile as completed:", error)
          // Still redirect even if there's an error
          router.push('/pages/accueil')
        })
    } else {
      router.push('/pages/accueil')
    }
  }


  const handleUpdatePassword = async () => {
    if (!newPassword.trim()) {
      setNewPasswordError(t('newPassword.enterPassword'))
      return
    }

    if (newPassword.length < 6) {
      setNewPasswordError(t('newPassword.passwordMinLength'))
      return
    }

    if (newPassword !== confirmNewPassword) {
      setNewPasswordError(t('newPassword.passwordsDoNotMatch'))
      return
    }

    if (!recoveryTokens) {
      setNewPasswordError(t('newPassword.invalidRecoverySession'))
      return
    }

    setIsUpdatingPassword(true)
    setNewPasswordError("")

    try {
      console.log("Establishing recovery session...")
      
      // First, establish the session using the stored recovery tokens
      const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
        access_token: recoveryTokens.access_token,
        refresh_token: recoveryTokens.refresh_token
      })
      
      if (sessionError) {
        console.log("Error establishing recovery session:", sessionError)
        setNewPasswordError(t('newPassword.sessionError'))
        return
      }
      
      if (!sessionData.session) {
        console.log("No session established from recovery tokens")
        setNewPasswordError(t('newPassword.cannotEstablishSession'))
        return
      }
      
      console.log("Recovery session established, updating password...")
      
      // Now update the password
      const { error } = await updatePassword(newPassword)
      
      if (error) {
        console.log("Password update error:", error)
        setNewPasswordError(error.message || t('newPassword.passwordUpdateError'))
        return
      }
      
      console.log("Password updated successfully")
      
      // Clear password fields and recovery tokens
      setNewPassword("")
      setConfirmNewPassword("")
      setRecoveryTokens(null)
      setIsRecoveryMode(false)
      
      // Show success and redirect to login
      Alert.alert(
        t('newPassword.passwordUpdated'), 
        t('newPassword.passwordUpdated'),
        [
          {
            text: t('newPassword.ok'),
            onPress: () => setScreen("auth")
          }
        ]
      )
      
    } catch (error) {
      console.log("Password update exception:", error)
      setNewPasswordError(t('auth.unexpectedError'))
    } finally {
      setIsUpdatingPassword(false)
    }
  }

  if (authLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center", paddingTop: '5%' }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 16, color: colors.textSecondary }}>{t('auth.loading')}</Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <PanGestureHandler onGestureEvent={handleSwipeRight}>
          <View style={{ flex: 1 }}>
      <View style={{ 
        flex: 1, 
        alignItems: "center", 
        justifyContent: (screen === "welcome" || screen === "auth" || screen === "signup") ? "center" : "space-between", 
        paddingVertical: 40, 
        paddingTop: (screen === "welcome" || screen === "auth" || screen === "signup") ? '38%' : '5%' 
      }}>
              {(screen === "welcome" || screen === "auth" || screen === "signup") && (
                <HeaderBar variant="logo" tagline={t('welcome.tagline')} taglineColor={BRAND_GRAY} />
        )}

        <View style={{ width: "100%", paddingHorizontal: 20, flex: 1 }}>
          {screen === "welcome" && (
            <>
              <Pressable onPress={() => setScreen("auth")} accessibilityRole="button" style={{ borderRadius: 12, overflow: "hidden", marginTop: 24 }}>
                <LinearGradient colors={[BRAND_BLUE, BRAND_PINK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingVertical: 16, borderRadius: 12, alignItems: "center" }}>
                        <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700" }}>{t('welcome.continue')}</Text>
                </LinearGradient>
              </Pressable>

            </>
          )}

          {screen === "auth" && (
            <>
                    <View style={{ gap: 12, marginBottom: 8, marginTop: 16 }}>
                <View style={{ backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 12 }}>
          <TextInput
            placeholder={t('auth.email')}
            value={email}
            onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    style={{ paddingHorizontal: 14, height: 50, color: colors.text, fontSize: 16 }}
                    placeholderTextColor={colors.textSecondary}
          />
                </View>
                <View style={{ backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 12 }}>
          <TextInput
                    placeholder={t('auth.password')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
                    style={{ paddingHorizontal: 14, height: 50, color: colors.text, fontSize: 16 }}
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
              </View>

                    {error ? <Text style={{ color: "#FF5A5F", textAlign: "center" }}>{error}</Text> : null}

                    <Pressable onPress={handleAuth} disabled={isLoading} accessibilityRole="button" style={{ borderRadius: 12, overflow: "hidden", marginTop: 24, opacity: isLoading ? 0.7 : 1 }}>
                <LinearGradient colors={[BRAND_BLUE, BRAND_PINK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingVertical: 16, borderRadius: 12, alignItems: "center" }}>
                        {isLoading ? (
                          <ActivityIndicator color="#FFFFFF" />
                        ) : (
                  <Text style={{ color: "#FFFFFF", fontSize: 18, fontWeight: "700" }}>{t('auth.signIn')}</Text>
                        )}
                </LinearGradient>
              </Pressable>

              <View style={{ alignItems: "center", marginTop: 12 }}>
                      <Pressable onPress={() => setScreen("signup")}>
                        <Text style={{ color: colors.primary, fontSize: 16 }}>{t('auth.createAccount')}</Text>
                </Pressable>
              </View>

              <View style={{ alignItems: "center", marginTop: 8 }}>
                <Pressable onPress={() => router.push('/pages/password-reset')}>
                  <Text style={{ color: colors.primary, fontSize: 16 }}>{t('auth.forgotPassword')}</Text>
                </Pressable>
              </View>

              <View style={{ alignItems: "center", marginTop: 8 }}>
               
              </View>
            </>
          )}

                {screen === "signup" && (
                  <>
                    <View style={{ gap: 12, marginBottom: 8, marginTop: 16 }}>
                      <View style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E5E5", borderWidth: 1, borderRadius: 12 }}>
                        <TextInput
                          placeholder={t('auth.email')}
                          value={email}
                          onChangeText={setEmail}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          style={{ paddingHorizontal: 14, height: 50, fontSize: 16 }}
                          placeholderTextColor="#9A9A9A"
                        />
                      </View>
                      <View style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E5E5", borderWidth: 1, borderRadius: 12 }}>
                        <TextInput
                          placeholder={t('auth.password')}
                          value={password}
                          onChangeText={setPassword}
                          secureTextEntry
                          style={{ paddingHorizontal: 14, height: 50, fontSize: 16 }}
                          placeholderTextColor="#9A9A9A"
                        />
                      </View>
                      <View style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E5E5", borderWidth: 1, borderRadius: 12 }}>
                        <TextInput
                          placeholder={t('signup.confirmPassword')}
                          value={confirmPassword}
                          onChangeText={setConfirmPassword}
                          secureTextEntry
                          style={{ paddingHorizontal: 14, height: 50, fontSize: 16 }}
                          placeholderTextColor="#9A9A9A"
                        />
                      </View>
                    </View>

                    {error ? <Text style={{ color: "#FF5A5F", textAlign: "center" }}>{error}</Text> : null}

                    <Pressable onPress={handleSignUp} disabled={isLoading} accessibilityRole="button" style={{ borderRadius: 12, overflow: "hidden", marginTop: 24, opacity: isLoading ? 0.7 : 1 }}>
                      <LinearGradient colors={[BRAND_BLUE, BRAND_PINK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingVertical: 16, borderRadius: 12, alignItems: "center" }}>
                        {isLoading ? (
                          <ActivityIndicator color="#FFFFFF" />
                        ) : (
                          <Text style={{ color: "#FFFFFF", fontSize: 18, fontWeight: "700" }}>{t('signup.createAccount')}</Text>
                        )}
                      </LinearGradient>
                    </Pressable>

                    <View style={{ alignItems: "center", marginTop: 12 }}>
                      <Pressable onPress={() => setScreen("auth")}>
                        <Text style={{ color: colors.primary, fontSize: 16 }}>{t('auth.alreadyHaveAccount')}</Text>
                      </Pressable>
              </View>
            </>
          )}

          {screen === "profile" && (
            <>
                <View style={{ gap: 16 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                        <Pressable onPress={() => setScreen("signup")}>
                      <MaterialCommunityIcons name="chevron-left" size={24} color={colors.text} />
                    </Pressable>
                    <Text style={{ marginLeft: 8, fontSize: 18, fontWeight: "700", color: colors.text }}>{t('profile.createProfile')}</Text>
                  </View>
                  <View style={{ height: 1, backgroundColor: colors.border, marginBottom: 8 }} />

                  <View style={{ alignItems: "center", marginTop: 8, marginBottom: 16 }}>
                    {/* Profile Picture Section - Same as mon-profil.tsx */}
                    <View style={{
                      width: 120,
                      height: 120,
                      borderRadius: 60,
                      backgroundColor: '#F3F4F6',
                      justifyContent: 'center',
                      alignItems: 'center',
                      position: 'relative',
                    }}>
                      {profilePicture ? (
                        <Image 
                          source={{ uri: profilePicture }} 
                          style={{
                            width: '100%',
                            height: '100%',
                            borderRadius: 60,
                          }}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={{
                          width: '100%',
                          height: '100%',
                          borderRadius: 60,
                          backgroundColor: '#E0E0E0',
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}>
                          <Text style={{
                            fontSize: 40,
                            fontWeight: 'bold',
                            color: '#9CA3AF',
                          }}>
                            {name.charAt(0).toUpperCase() || '?'}
                          </Text>
                        </View>
                      )}
                      
                      {/* Upload overlay when uploading */}
                      {isUploadingPicture && (
                        <View style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          backgroundColor: 'rgba(0,0,0,0.5)',
                          borderRadius: 60,
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}>
                          <ActivityIndicator size="large" color="#FFFFFF" />
                        </View>
                      )}
                      
                      <Pressable 
                        style={[
                          {
                            position: 'absolute',
                            bottom: 0,
                            right: 0,
                            backgroundColor: colors.primary,
                            width: 40,
                            height: 40,
                            borderRadius: 20,
                            justifyContent: 'center',
                            alignItems: 'center',
                            borderWidth: 2,
                            borderColor: '#FFFFFF',
                          },
                          isUploadingPicture && { opacity: 0.7 }
                        ]} 
                        onPress={() => {
                          console.log('Profile picture pressed!');
                          // Show action sheet for mobile compatibility
                          Alert.alert(
                            t('profile.profilePhoto'),
                            t('profile.profilePhoto'),
                            [
                              {
                                text: t('profile.camera'),
                                onPress: () => takePhotoWithCamera()
                              },
                              {
                                text: t('profile.gallery'),
                                onPress: () => pickImageFromGallery()
                              },
                              {
                                text: t('profile.cancel'),
                                style: 'cancel'
                              }
                            ],
                            { cancelable: true }
                          );
                        }}
                        disabled={isUploadingPicture}
                      >
                        <MaterialCommunityIcons name="camera" size={20} color="#FFFFFF" />
                      </Pressable>
                    </View>
                    
                    <Text style={{
                      fontSize: 14,
                      color: colors.textSecondary,
                      marginTop: 10,
                      textAlign: 'center',
                    }}>
                      {isUploadingPicture ? t('profile.uploading') : t('profile.changePhoto')}
                    </Text>
                  </View>

                  <View style={{ gap: 12 }}>
                    <View style={{ backgroundColor: colors.surface, borderColor: nameError ? "#FF5A5F" : colors.border, borderWidth: 1, borderRadius: 12 }}>
                      <TextInput
                            placeholder={t('profile.fullName')}
                            value={name}
                            onChangeText={(text) => { setName(text); setNameError("") }}
                        style={{ paddingHorizontal: 14, height: 50, color: colors.text }}
                        placeholderTextColor={colors.textSecondary}
                      />
                    </View>
                    {nameError ? <Text style={{ color: "#FF5A5F", fontSize: 12, marginTop: 4, marginLeft: 4 }}>{nameError}</Text> : null}

                    <Pressable
                      onPress={() => setIsDateOpen(true)}
                      style={{
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                        borderWidth: 1,
                        borderRadius: 12,
                        paddingHorizontal: 14,
                        height: 50,
                        justifyContent: "center"
                      }}
                    >
                      <Text style={{ color: birthDate ? colors.text : colors.textSecondary }}>
                        {birthDate ? new Date(birthDate).getFullYear().toString() : t('profile.birthDate')}
                      </Text>
                    </Pressable>

                        <Pressable
                          onPress={() => setIsGenderOpen(true)}
                          style={{
                            backgroundColor: colors.surface,
                            borderColor: genderError ? "#FF5A5F" : colors.border,
                            borderWidth: 1,
                            borderRadius: 12,
                            paddingHorizontal: 14,
                            height: 50,
                            justifyContent: "center",
                          }}
                        >
                          <Text style={{ color: gender ? colors.text : colors.textSecondary }}>
                            {gender === "male" ? t('profile.male') : gender === "female" ? t('profile.female') : gender === "other" ? t('profile.other') : t('profile.gender')}
                          </Text>
                        </Pressable>
                        {genderError ? <Text style={{ color: "#FF5A5F", fontSize: 12, marginTop: 4, marginLeft: 4 }}>{genderError}</Text> : null}
                  </View>

                      <Pressable
                        onPress={() => setIsCountryOpen(true)}
                        style={{
                          backgroundColor: colors.surface,
                            borderColor: countryError ? "#FF5A5F" : colors.border,
                          borderWidth: 1,
                          borderRadius: 12,
                          paddingHorizontal: 14,
                          height: 50,
                          justifyContent: "center",
                        }}
                      >
                        <Text style={{ color: selectedCountry ? colors.text : colors.textSecondary }}>{selectedCountry ?? t('profile.country')}</Text>
                      </Pressable>
                    {countryError ? <Text style={{ color: "#FF5A5F", fontSize: 12, marginTop: 4, marginLeft: 4 }}>{countryError}</Text> : null}
                  </View>

                      {error ? <Text style={{ color: "#FF5A5F", textAlign: "center" }}>{error}</Text> : null}

                  <Pressable
                        onPress={handleProfileCreation}
                        disabled={isLoading}
                    accessibilityRole="button"
                        style={{ borderRadius: 12, overflow: "hidden", marginTop: 24, opacity: isLoading ? 0.7 : 1 }}
                  >
                    <LinearGradient colors={[BRAND_BLUE, BRAND_PINK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingVertical: 16, borderRadius: 12, alignItems: "center" }}>
                          {isLoading ? (
                            <ActivityIndicator color="#FFFFFF" />
                          ) : (
                            <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700" }}>{t('profile.continue')}</Text>
                          )}
                    </LinearGradient>
                  </Pressable>
                
            </>
          )}

          {screen === "interests" && (
            <>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 30, marginBottom: 10 }}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Pressable onPress={() => setScreen("profile")}>
                    <MaterialCommunityIcons name="chevron-left" size={24} color={colors.text} />
                  </Pressable>
                  <Text style={{ marginLeft: 8, fontSize: 18, fontWeight: "700", color: colors.text }}>{t('interests.title')}</Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <MaterialCommunityIcons
                    name="heart"
                    size={44}
                    color={BRAND_PINK}
                    style={{ marginRight: -17, transform: [{ rotate: "-46deg" }] }}
                  />
                  <MaterialCommunityIcons 
                    name="heart" 
                    size={44} 
                    color={BRAND_BLUE} 
                    style={{ transform: [{ rotate: "46deg" }] }} 
                  />
                </View>
              </View>

              <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 10 }}>
                {isLoadingInterests ? (
                  <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={{ marginTop: 16, color: colors.textSecondary }}>{t('interests.loading')}</Text>
                  </View>
                ) : (
                  <>
                    <View style={{ gap: 16, marginTop: 20 }}>
                      {interests.map((interest) => (
                        <Pressable
                          key={interest.id}
                          onPress={() => handleInterestToggle(interest.id)}
                          style={{
                            backgroundColor: selectedInterests.includes(interest.id) ? colors.primary : colors.surface,
                            borderColor: selectedInterests.includes(interest.id) ? colors.primary : colors.border,
                            borderWidth: 1,
                            borderRadius: 12,
                            paddingHorizontal: 16,
                            paddingVertical: 16,
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 12,
                          }}
                        >
                          <MaterialCommunityIcons
                            name={interest.icon as any}
                            size={24}
                            color={selectedInterests.includes(interest.id) ? "#FFFFFF" : colors.textSecondary}
                          />
                          <Text
                            style={{
                              fontSize: 16,
                              fontWeight: "500",
                              color: selectedInterests.includes(interest.id) ? "#FFFFFF" : colors.text,
                              flex: 1,
                            }}
                          >
                            {getInterestTranslation(interest.label, language)}
                          </Text>
                          {selectedInterests.includes(interest.id) && (
                            <MaterialCommunityIcons
                              name="check"
                              size={20}
                              color="#FFFFFF"
                            />
                          )}
                        </Pressable>
                      ))}
                    </View>

                    <View style={{ marginTop: 32 }}>
                      <Pressable
                        onPress={handleInterestsComplete}
                        disabled={isInterestsLoading || selectedInterests.length === 0}
                        style={{ borderRadius: 12, overflow: "hidden", opacity: (isInterestsLoading || selectedInterests.length === 0) ? 0.7 : 1 }}
                      >
                        <LinearGradient colors={[BRAND_BLUE, BRAND_PINK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingVertical: 16, borderRadius: 12, alignItems: "center" }}>
                          {isInterestsLoading ? (
                            <ActivityIndicator color="#FFFFFF" />
                          ) : (
                            <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700" }}>
                              {selectedInterests.length === 0 ? t('interests.selectAtLeastOne') : t('interests.finish')}
                            </Text>
                          )}
                        </LinearGradient>
                      </Pressable>
                    </View>
                  </>
                )}
              </View>
            </>
          )}

          {screen === "inviteCodes" && (
                  <>
                    <HeaderBar variant="title" title={t('inviteCodes.title')} onBack={() => setScreen("profile")} />

                    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 20 }}>
                      {!showJoinSection ? (
                        <>
                          {/* App Logo */}
                          <View style={{ alignItems: "center", marginBottom: 40 }}>
                            <Image 
                              source={require('../../assets/images/big-logo.png')} 
                              style={{ width: 300, height: 300, resizeMode: 'contain',marginBottom: -70, marginTop: -70 }}
                            />
                          </View>

                          {/* Share Code Section */}
                          <LinearGradient
                            colors={['#c6eff7', '#ffd4f1']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={{ 
                              borderRadius: 20, 
                              padding: 20, 
                              alignItems: "center",
                              width: "100%",
                              maxWidth: 300,
                              shadowColor: "#000",
                              shadowOffset: { width: 0, height: 2 },
                              shadowOpacity: 0.1,
                              shadowRadius: 8,  
                              elevation: 3
                            }}
                          >
                            {myInviteCode ? (
                              <>
                                <Text style={{ 
                                  fontSize: 25, 
                                  fontWeight: "700", 
                                  color: "#35b1f0", 
                                  letterSpacing: 3,
                                  marginBottom: 12,
                                  fontFamily: 'monospace',
                                }}>
                                  {myInviteCode}
                                </Text>
                                <Text style={{ 
                                  fontSize: 14, 
                                  color: "gray", 
                                  textAlign: "center",
                                  lineHeight: 22,
                                  fontWeight: 'bold',
                                }}>
                                  {t('inviteCodes.waitForPartner')}
                                </Text>
                              </>
                            ) : (
                              <ActivityIndicator size="large" color="#FFFFFF" />
                            )}
                          </LinearGradient>

                          {/* Action Buttons */}
                          <View style={{ marginTop: 30, width: "100%", maxWidth: 300, gap: 16 }}>
                            <Pressable
                              onPress={async () => {
                                try {
                                  const shareMessage = t('inviteCodes.shareMessage').replace('{code}', myInviteCode)
                                  
                                  const result = await Share.share({
                                    message: shareMessage,
                                    title: t('inviteCodes.shareTitle'),
                                    url: Platform.OS === 'ios' ? 'https://apps.apple.com/app/zooj' : 'https://play.google.com/store/apps/details?id=com.zooj.app'
                                  })
                                  
                                  if (result.action === Share.sharedAction) {
                                    console.log('Code shared successfully')
                                  } else if (result.action === Share.dismissedAction) {
                                    console.log('Share dismissed')
                                  }
                                } catch (error) {
                                  console.log('Error sharing code:', error)
                                  Alert.alert(t('inviteCodes.shareError'), t('inviteCodes.shareError'))
                                }
                              }}
                              style={{ borderRadius: 12, overflow: "hidden" }}
                            >
                              <LinearGradient colors={[BRAND_BLUE, BRAND_PINK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingVertical: 16, borderRadius: 12, alignItems: "center", flexDirection: "row", justifyContent: "center" }}>
                                <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700", marginRight: 8 }}>
                                  {t('inviteCodes.shareCode')}
                                </Text>
                                <MaterialCommunityIcons name="share-variant" size={20} color="#FFFFFF" />
                              </LinearGradient>
                            </Pressable>

                            <Pressable
                              onPress={async () => {
                                try {
                                  await Clipboard.setStringAsync(myInviteCode)
                                  Alert.alert(t('inviteCodes.codeCopied'), t('inviteCodes.codeCopiedMessage'))
                                } catch (error) {
                                  Alert.alert(t('inviteCodes.copyError'), t('inviteCodes.copyError'))
                                }
                              }}
                              style={{ borderRadius: 12, overflow: "hidden" }}
                            >
                              <LinearGradient colors={[BRAND_BLUE, BRAND_PINK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingVertical: 16, borderRadius: 12, alignItems: "center", flexDirection: "row", justifyContent: "center" }}>
                                <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700", marginRight: 8 }}>
                                  {t('inviteCodes.copyCode')}
                                </Text>
                                <MaterialCommunityIcons name="content-copy" size={20} color="#FFFFFF" />
                              </LinearGradient>
                            </Pressable>
                          </View>

                          {/* Toggle to redeem section */}
                          <View style={{ marginTop: 20, width: "100%", maxWidth: 300, alignItems: 'center' }}>
                            <Pressable onPress={() => setShowJoinSection(true)}>
                              <Text style={{ color: colors.primary, fontWeight: '600', textDecorationLine: 'underline' }}>
                                {t('inviteCodes.alreadyHaveCode')}
                              </Text>
                            </Pressable>
                          </View>
                        </>
                      ) : (
                        <>
                          {/* App Logo */}
                          <View style={{ alignItems: "center", marginBottom: 40 }}>
                            <Image 
                              source={require('../../assets/images/big-logo.png')} 
                              style={{ width: 300, height: 300, resizeMode: 'contain', marginTop: -100,marginBottom: -50 }}
                            />
                          </View>

                          {/* Redeem Code Section */}
                          <View style={{ width: "100%", maxWidth: 300, gap: 16 }}>
                            <Text style={{ fontSize: 18, fontWeight: "600", color: "#2D2D2D", textAlign: "center" }}>
                              {t('inviteCodes.joinWithCode')}
                            </Text>

                            <View style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E5E5", borderWidth: 1, borderRadius: 12 }}>
                              <TextInput 
                                placeholder={t('inviteCodes.myPartner')} 
                                value={inviteCode} 
                                onChangeText={(t) => { setInviteCode(t); setRedeemError(""); setRedeemSuccess("") }} 
                                style={{ paddingHorizontal: 14, height: 50 }} 
                                placeholderTextColor="#9A9A9A" 
                              />
                            </View>

                            {redeemError ? <Text style={{ color: "#FF5A5F", textAlign: "center" }}>{redeemError}</Text> : null}
                            {redeemSuccess ? <Text style={{ color: "#4CAF50", textAlign: "center" }}>{redeemSuccess}</Text> : null}

                            <Pressable
                              onPress={handleRedeemCode}
                              disabled={isRedeeming}
                              style={{ borderRadius: 12, overflow: "hidden", opacity: isRedeeming ? 0.7 : 1 }}
                            >
                              <LinearGradient colors={[BRAND_BLUE, BRAND_PINK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingVertical: 16, borderRadius: 12, alignItems: "center" }}>
                                {isRedeeming ? (
                                  <ActivityIndicator color="#FFFFFF" />
                                ) : (
                                  <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700" }}>{t('inviteCodes.join')}</Text>
                                )}
                              </LinearGradient>
                            </Pressable>
                          </View>

                          {/* Toggle back to share section */}
                          <View style={{ marginTop: 24, width: "100%", maxWidth: 300, alignItems: 'center' }}>
                            <Pressable onPress={() => setShowJoinSection(false)}>
                              <Text style={{ color: colors.primary, fontWeight: '600', textDecorationLine: 'underline' }}>
                                {t('inviteCodes.shareMyCode')}
                              </Text>
                            </Pressable>
                          </View>
                        </>
                      )}

                      {/* Skip Option */}
                      <View style={{ marginTop: 30, alignItems: 'center' }}>
                       
                        <Pressable
                          onPress={handleSkipInviteCodes}
                          style={{
                            backgroundColor: "#F3F4F6",
                            borderColor: "#D1D5DB",
                            borderWidth: 1,
                            borderRadius: 12,
                            paddingVertical: 12,
                            paddingHorizontal: 24
                          }}
                        >
                          <Text style={{ color: "#374151", fontSize: 16, fontWeight: "600" }}>
                            {t('inviteCodes.continueWithoutCode')}
                          </Text>
                        </Pressable>
                      </View>
                    </View>
        </>
      )}


      {screen === "newPassword" && (
        <>
          <HeaderBar variant="title" title={t('newPassword.title')} onBack={() => setScreen("auth")} />

          <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 20 }}>
            <View style={{ width: "100%", maxWidth: 400, gap: 24 }}>
              {!recoveryTokens ? (
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 16, color: "#FF5A5F", textAlign: "center", lineHeight: 20 }}>
                    {t('newPassword.invalidSession')}
                  </Text>
                  <Pressable
                    onPress={() => setScreen("auth")}
                    style={{ marginTop: 16, padding: 12, backgroundColor: BRAND_BLUE, borderRadius: 8 }}
                  >
                    <Text style={{ color: "#FFFFFF", fontWeight: "600" }}>{t('newPassword.backToLogin')}</Text>
                  </Pressable>
                </View>
              ) : (
                <>
                  <View style={{ alignItems: "center" }}>
                    <Text style={{ fontSize: 16, color: "#6B7280", textAlign: "center", lineHeight: 20 }}>
                      {t('newPassword.enterNewPassword')}
                    </Text>
                  </View>

                  <View style={{ gap: 16, width: "100%" }}>
                    <View style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E5E5", borderWidth: 1, borderRadius: 12 }}>
                      <TextInput
                        placeholder={t('auth.password')}
                        value={newPassword}
                        onChangeText={(text) => { setNewPassword(text); setNewPasswordError("") }}
                        secureTextEntry
                        style={{ paddingHorizontal: 14, height: 50 }}
                        placeholderTextColor="#9A9A9A"
                      />
                    </View>

                    <View style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E5E5", borderWidth: 1, borderRadius: 12 }}>
                      <TextInput
                        placeholder={t('auth.password')}
                        value={confirmNewPassword}
                        onChangeText={(text) => { setConfirmNewPassword(text); setNewPasswordError("") }}
                        secureTextEntry
                        style={{ paddingHorizontal: 14, height: 50 }}
                        placeholderTextColor="#9A9A9A"
                      />
                    </View>

                    {newPasswordError ? <Text style={{ color: "#FF5A5F", textAlign: "center", fontSize: 14 }}>{newPasswordError}</Text> : null}

                    <Pressable
                      onPress={handleUpdatePassword}
                      disabled={isUpdatingPassword}
                      style={{ borderRadius: 12, overflow: "hidden", opacity: isUpdatingPassword ? 0.7 : 1 }}
                    >
                      <LinearGradient colors={[BRAND_BLUE, BRAND_PINK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingVertical: 16, borderRadius: 12, alignItems: "center" }}>
                        {isUpdatingPassword ? (
                          <ActivityIndicator color="#FFFFFF" />
                        ) : (
                          <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700" }}>{t('newPassword.confirm')}</Text>
                        )}
                      </LinearGradient>
                    </Pressable>
                  </View>
                </>
              )}
            </View>
          </View>
        </>
      )}

        </View>

        {screen !== "interests" && (
          <View style={{ alignItems: "center" }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <MaterialCommunityIcons
                name="heart"
                size={44}
                color={BRAND_BLUE}
                style={{ marginRight: -17, transform: [{ rotate: "-46deg" }] }}
              />
              <MaterialCommunityIcons name="heart" size={44} color={BRAND_PINK} style={{ marginRight: 0, transform: [{ rotate: "46deg" }] }} />
            </View>
          </View>
        )}
      </View>
            </View>
        </PanGestureHandler>
      </GestureHandlerRootView>

      {/* Gender Selection Modal */}
      <Modal
        visible={isGenderOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsGenderOpen(false)}
        statusBarTranslucent={true}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
          zIndex: 999999
        }}>
          <View style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 20,
            padding: 20,
            width: '100%',
            maxWidth: 400,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.25,
            shadowRadius: 20,
            elevation: 999999,
            zIndex: 999999
          }}>
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 20
            }}>
              <Text style={{ fontSize: 18, fontWeight: '600', color: '#2D2D2D' }}>{t('profile.selectGenderTitle')}</Text>
              <Pressable onPress={() => setIsGenderOpen(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#6B7280" />
              </Pressable>
            </View>
            
            {genders.map((g) => (
              <Pressable
                key={g}
                onPress={() => {
                  setGender(g as "male" | "female" | "other")
                  setIsGenderOpen(false)
                  setGenderError("")
                }}
                style={{
                  paddingVertical: 16,
                  paddingHorizontal: 20,
                  borderBottomWidth: 1,
                  borderBottomColor: '#F0F0F0',
                  backgroundColor: gender === g ? '#F8F9FA' : 'transparent'
                }}
              >
                <Text style={{
                  color: gender === g ? '#2DB6FF' : '#2D2D2D',
                  fontSize: 16,
                  fontWeight: gender === g ? '600' : '400'
                }}>
                  {g === "male" ? t('profile.male') : g === "female" ? t('profile.female') : t('profile.other')}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>

      {/* Country Selection Modal */}
      <Modal
        visible={isCountryOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsCountryOpen(false)}
        statusBarTranslucent={true}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
          zIndex: 999999
        }}>
          <View style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 20,
            padding: 20,
            width: '100%',
            maxWidth: 400,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.25,
            shadowRadius: 20,
            elevation: 999999,
            zIndex: 999999
          }}>
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 20
            }}>
              <Text style={{ fontSize: 18, fontWeight: '600', color: '#2D2D2D' }}>{t('profile.selectCountryTitle')}</Text>
              <Pressable onPress={() => setIsCountryOpen(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#6B7280" />
              </Pressable>
            </View>
            
            <ScrollView style={{ maxHeight: 300 }}>
              {countries.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => {
                    setSelectedCountry(c)
                    setIsCountryOpen(false)
                    setCountryError("")
                  }}
                  style={{
                    paddingVertical: 16,
                    paddingHorizontal: 20,
                    borderBottomWidth: 1,
                    borderBottomColor: '#F0F0F0',
                    backgroundColor: selectedCountry === c ? '#F8F9FA' : 'transparent'
                  }}
                >
                  <Text style={{
                    color: selectedCountry === c ? '#2DB6FF' : '#2D2D2D',
                    fontSize: 16,
                    fontWeight: selectedCountry === c ? '600' : '400'
                  }}>
                    {c}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Date Selection Modal */}
      <Modal
        visible={isDateOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsDateOpen(false)}
        statusBarTranslucent={true}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
          zIndex: 999999
        }}>
          <View style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 20,
            padding: 20,
            width: '100%',
            maxWidth: 400,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.25,
            shadowRadius: 20,
            elevation: 999999,
            zIndex: 999999
          }}>
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 20
            }}>
              <Text style={{ fontSize: 18, fontWeight: '600', color: '#2D2D2D' }}>{t('profile.selectDateTitle')}</Text>
              <Pressable onPress={() => setIsDateOpen(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#6B7280" />
              </Pressable>
            </View>
            
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 16, color: '#6B7280', marginBottom: 20, textAlign: 'center' }}>
                {t('profile.selectBirthYear')}
              </Text>
              
                                   <ScrollView style={{ maxHeight: 300, width: '100%' }}>
                       {Array.from({ length: 50 }, (_, i) => {
                         const year = new Date().getFullYear() - i - 18
                         return (
                           <Pressable
                             key={year}
                             onPress={() => {
                               // Create a proper date string in YYYY-MM-DD format
                               const dateString = `${year}-01-01`
                               setBirthDate(dateString)
                               setIsDateOpen(false)
                             }}
                             style={{
                               paddingVertical: 16,
                               paddingHorizontal: 20,
                               borderBottomWidth: 1,
                               borderBottomColor: '#F0F0F0',
                               backgroundColor: birthDate === `${year}-01-01` ? '#F8F9FA' : 'transparent',
                               alignItems: 'center'
                             }}
                           >
                             <Text style={{
                               color: birthDate === `${year}-01-01` ? '#2DB6FF' : '#2D2D2D',
                               fontSize: 18,
                               fontWeight: birthDate === `${year}-01-01` ? '600' : '400'
                             }}>
                               {year}
                             </Text>
                           </Pressable>
                         )
                       })}
                     </ScrollView>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

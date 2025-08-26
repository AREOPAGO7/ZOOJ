import HeaderBar from "@/components/HeaderBar"
import { profileService } from "@/lib/profileService"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import * as Clipboard from 'expo-clipboard'
import * as ImagePicker from 'expo-image-picker'
import { LinearGradient } from "expo-linear-gradient"
import * as Linking from 'expo-linking'
import { useRouter } from 'expo-router'
import { useEffect, useState } from "react"
import { ActivityIndicator, Alert, Image, Modal, Platform, Pressable, SafeAreaView, ScrollView, Text, TextInput, View } from "react-native"
import { GestureHandlerRootView, PanGestureHandler, PanGestureHandlerGestureEvent } from "react-native-gesture-handler"
import { useAuth } from "../../lib/auth"
import { supabase } from "../../lib/supabase"

const BRAND_BLUE = "#2DB6FF"
const BRAND_PINK = "#F47CC6"
const BRAND_GRAY = "#6C6C6C"

export default function App() {
  const { user, signUp, signIn, createProfile, resetPassword, updatePassword, loading: authLoading } = useAuth()
  const router = useRouter()
  const [screen, setScreen] = useState<"welcome" | "auth" | "signup" | "profile" | "interests" | "inviteCodes" | "resetPassword" | "newPassword">("welcome")
  const [isLoading, setIsLoading] = useState(false)

  // Auth state
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [isSignUp, setIsSignUp] = useState(false)
  
  // Password reset state
  const [resetEmail, setResetEmail] = useState("")
  const [resetError, setResetError] = useState("")
  const [resetSuccess, setResetSuccess] = useState("")
  const [isResetting, setIsResetting] = useState(false)
  
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
  
  // Interests data
  const interests = [
    { id: "wellness", label: "Bien-être & développement personnel", icon: "meditation" },
    { id: "travel", label: "Voyages & découvertes", icon: "airplane" },
    { id: "cinema", label: "Cinéma & séries", icon: "movie" },
    { id: "humor", label: "Humour & jeux", icon: "party-popper" },
    { id: "communication", label: "Communication", icon: "message-text" },
    { id: "family", label: "Famille & valeurs", icon: "account-group" },
    { id: "romance", label: "Vie de couple & romance", icon: "heart" },
    { id: "future", label: "Projets d'avenir", icon: "lightbulb" }
  ]
  
  // Invite code state
  const [inviteCode, setInviteCode] = useState("")
  const [redeemError, setRedeemError] = useState("")
  const [redeemSuccess, setRedeemSuccess] = useState("")
  const [myInviteCode, setMyInviteCode] = useState("")
  const [isRedeeming, setIsRedeeming] = useState(false)
  
  // Interests state
  const [selectedInterests, setSelectedInterests] = useState<string[]>([])
  const [isInterestsLoading, setIsInterestsLoading] = useState(false)

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
          const urlObj = new URL(url)
          const accessToken = urlObj.hash.split('access_token=')[1]?.split('&')[0]
          const refreshToken = urlObj.hash.split('refresh_token=')[1]?.split('&')[0]
          
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
            console.error("No access token found in URL")
            setNewPasswordError("Lien de réinitialisation invalide")
          }
        } catch (error) {
          console.error("Error processing recovery link:", error)
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

  const checkUserProfile = async () => {
    if (!user) return
    
    console.log("Checking profile for user:", user.id)
    
    try {
      const { data: profile, error: profileError } = await profileService.getProfile(user.id)
      
      if (profileError) {
        console.log("Profile check error:", profileError)
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
      console.error("Error checking user profile:", error)
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
      else if (screen === "resetPassword") setScreen("auth")
      else if (screen === "newPassword") setScreen("resetPassword")
    }
  }

  const handleAuth = async () => {
    if (!email || !password) {
      setError("Veuillez remplir tous les champs")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      console.log("Attempting to sign in user:", email)
      const result = await signIn(email, password)
      
      if (result.error) {
        console.error("Signin error:", result.error)
        setError(result.error.message || "Erreur lors de la connexion")
      } else {
        console.log("Signin successful")
        // User will be automatically redirected by the useEffect
      }
    } catch (error) {
      console.error("Signin exception:", error)
      setError("Une erreur inattendue s'est produite")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignUp = async () => {
    if (!email || !password || !confirmPassword) {
      setError("Veuillez remplir tous les champs")
      return
    }

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      console.log("Attempting to sign up user:", email)
      const result = await signUp(email, password)
      
      if (result.error) {
        console.error("Signup error:", result.error)
        setError(result.error.message || "Erreur lors de la création du compte")
      } else {
        console.log("Signup successful, user should be automatically signed in")
        // The user will be automatically signed in and redirected via the useEffect
        // No need to wait or manually redirect
      }
    } catch (error) {
      console.error("Signup exception:", error)
      setError("Une erreur inattendue s'est produite")
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
      setNameError("Le nom est obligatoire")
      isValid = false
    } else if (name.trim().length < 2) {
      setNameError("Le nom doit contenir au moins 2 caractères")
      isValid = false
    }
    
    // Gender validation
    if (!gender) {
      setGenderError("Veuillez sélectionner votre genre")
      isValid = false
    }
    
    // Country validation
    if (!selectedCountry) {
      setCountryError("Veuillez sélectionner votre pays")
      isValid = false
    }
    
    return isValid
  }

  const pickImageFromGallery = async () => {
    console.log('pickImageFromGallery called');
    try {
      console.log('Launching image picker...');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      console.log('Image picker result:', result);
      if (!result.canceled && result.assets[0]) {
        console.log('Image selected, uploading...');
        await uploadProfilePicture(result.assets[0].uri);
      } else {
        console.log('Image selection cancelled or no assets');
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner l\'image');
    }
  };

  const takePhotoWithCamera = async () => {
    console.log('takePhotoWithCamera called');
    try {
      console.log('Requesting camera permissions...');
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      console.log('Camera permission status:', status);
      
      if (status !== 'granted') {
        Alert.alert('Permission refusée', 'Permission d\'accès à la caméra requise');
        return;
      }

      console.log('Launching camera...');
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      console.log('Camera result:', result);
      if (!result.canceled && result.assets[0]) {
        console.log('Photo taken, uploading...');
        await uploadProfilePicture(result.assets[0].uri);
      } else {
        console.log('Camera cancelled or no assets');
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Erreur', 'Impossible de prendre la photo');
    }
  };

  const uploadProfilePicture = async (imageUri: string) => {
    if (!imageUri) return;

    setIsUploadingPicture(true);
    try {
      const formData = new FormData();
      
      // Platform-specific file handling
      if (Platform.OS === 'web') {
        // For web, fetch the image and create a blob
        const response = await fetch(imageUri);
        const blob = await response.blob();
        formData.append('file', blob, 'profile.jpg');
      } else {
        // For native platforms
        const fileData = {
          uri: imageUri,
          type: 'image/jpeg',
          name: 'profile.jpg',
        };
        formData.append('file', fileData as any);
      }

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
        setProfilePicture(data.secure_url);
        console.log('Profile picture uploaded successfully:', data.secure_url);
      } else {
        throw new Error('Upload failed - no secure_url in response');
      }
    } catch (error) {
      console.error('Profile picture upload error:', error);
      Alert.alert('Erreur', 'Impossible de télécharger l\'image de profil');
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
      setError("Utilisateur non connecté")
      return
    }

    console.log("Creating profile for user:", user.id, user.email)
    console.log("Profile data:", { name, selectedCountry, gender, birthDate })

    setIsLoading(true)
    setError("")

    try {
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

      console.log("Sending profile data:", profileData)

      const { data, error } = await profileService.createProfile(profileData)
      
      if (error) {
        console.error("Profile creation error:", error)
        setError(error.message || "Erreur lors de la création du profil")
      } else {
        console.log("Profile created successfully:", data)
        // Success! Redirect to interests section
        setScreen("interests")
      }
    } catch (error) {
      console.error("Profile creation exception:", error)
      setError("Une erreur inattendue s'est produite")
    } finally {
      setIsLoading(false)
    }
  }

  const handleRedeemCode = async () => {
    if (!inviteCode.trim()) {
      setRedeemError("Veuillez entrer un code d'invitation")
      return
    }
    if (!user) {
      setRedeemError("Utilisateur non connecté")
      return
    }

    setIsRedeeming(true)
    setRedeemError("")
    setRedeemSuccess("")

    try {
      // Find the profile with this invite code
      const { data: partnerProfile, error: findError } = await profileService.findProfileByInviteCode(inviteCode.trim())
      
      if (findError || !partnerProfile) {
        setRedeemError("Code d'invitation invalide")
        return
      }

      if (partnerProfile.id === user.id) {
        setRedeemError("Vous ne pouvez pas utiliser votre propre code")
        return
      }

      // Create couple relationship
      const { error: coupleError } = await profileService.createCouple(user.id, partnerProfile.id)
      
      if (coupleError) {
        setRedeemError("Erreur lors de la création de la relation")
        return
      }

      // Mark both profiles as completed since they now have a couple
      await profileService.updateProfile(user.id, { completed: true })
      await profileService.updateProfile(partnerProfile.id, { completed: true })

      setRedeemSuccess("Relation créée avec succès!")
      setTimeout(() => {
        router.push('/pages/accueil')
      }, 2000)
    } catch (error) {
      setRedeemError("Une erreur inattendue s'est produite")
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
    if (!user) return
    
    console.log("Completing interests for user:", user.id)
    console.log("Selected interests:", selectedInterests)
    
    setIsInterestsLoading(true)
    try {
      // Update profile with selected interests but DON'T mark as completed yet
      const { data, error } = await profileService.updateProfile(user.id, { 
        interests: selectedInterests,
        completed: false // Keep as false until couple is formed
      })
      
      if (error) {
        console.error("Error updating interests:", error)
        return
      }
      
      console.log("Interests updated successfully:", data)
      
      // Get the user's invite code and go to invite codes section
      const { data: profile } = await profileService.getProfile(user.id)
      if (profile) {
        console.log("Profile retrieved, invite code:", profile.invite_code)
        setMyInviteCode(profile.invite_code || "")
        setScreen("inviteCodes")
      } else {
        console.error("Failed to retrieve profile after interests update")
        // Fallback: try to get invite code from the update result
        if (data && data.invite_code) {
          setMyInviteCode(data.invite_code)
          setScreen("inviteCodes")
        }
      }
    } catch (error) {
      console.error("Error updating interests:", error)
      // Fallback: try to get profile again
      try {
        const { data: profile } = await profileService.getProfile(user.id)
        if (profile && profile.invite_code) {
          setMyInviteCode(profile.invite_code)
          setScreen("inviteCodes")
        }
      } catch (fallbackError) {
        console.error("Fallback profile retrieval failed:", fallbackError)
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
          console.error("Error marking profile as completed:", error)
          // Still redirect even if there's an error
          router.push('/pages/accueil')
        })
    } else {
      router.push('/pages/accueil')
    }
  }

  const handlePasswordReset = async () => {
    if (!resetEmail.trim()) {
      setResetError("Veuillez entrer votre email")
      return
    }

    setIsResetting(true)
    setResetError("")
    setResetSuccess("")

    try {
      console.log("Sending password reset email to:", resetEmail)
      
      const { error } = await resetPassword(resetEmail.trim())
      
      if (error) {
        console.error("Password reset error:", error)
        setResetError(error.message || "Erreur lors de l'envoi de l'email de réinitialisation")
        return
      }
      
      setResetSuccess("Un email de réinitialisation a été envoyé à votre adresse email. Cliquez sur le lien dans l'email pour continuer.")
      
      // Clear the email field
      setResetEmail("")
      
      // Redirect back to login after success
      setTimeout(() => {
        setScreen("auth")
        setResetSuccess("")
      }, 4000)
      
    } catch (error) {
      console.error("Password reset exception:", error)
      setResetError("Une erreur inattendue s'est produite")
    } finally {
      setIsResetting(false)
    }
  }

  const handleUpdatePassword = async () => {
    if (!newPassword.trim()) {
      setNewPasswordError("Veuillez entrer un nouveau mot de passe")
      return
    }

    if (newPassword.length < 6) {
      setNewPasswordError("Le mot de passe doit contenir au moins 6 caractères")
      return
    }

    if (newPassword !== confirmNewPassword) {
      setNewPasswordError("Les mots de passe ne correspondent pas")
      return
    }

    if (!recoveryTokens) {
      setNewPasswordError("Session de récupération invalide. Veuillez utiliser le lien dans votre email.")
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
        console.error("Error establishing recovery session:", sessionError)
        setNewPasswordError("Erreur lors de la récupération de la session")
        return
      }
      
      if (!sessionData.session) {
        console.error("No session established from recovery tokens")
        setNewPasswordError("Impossible d'établir la session de récupération")
        return
      }
      
      console.log("Recovery session established, updating password...")
      
      // Now update the password
      const { error } = await updatePassword(newPassword)
      
      if (error) {
        console.error("Password update error:", error)
        setNewPasswordError(error.message || "Erreur lors de la mise à jour du mot de passe")
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
        "Succès", 
        "Votre mot de passe a été mis à jour avec succès!",
        [
          {
            text: "OK",
            onPress: () => setScreen("auth")
          }
        ]
      )
      
    } catch (error) {
      console.error("Password update exception:", error)
      setNewPasswordError("Une erreur inattendue s'est produite")
    } finally {
      setIsUpdatingPassword(false)
    }
  }

  if (authLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF", justifyContent: "center", alignItems: "center", paddingTop: '5%' }}>
        <ActivityIndicator size="large" color={BRAND_BLUE} />
        <Text style={{ marginTop: 16, color: BRAND_GRAY }}>Chargement...</Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <PanGestureHandler onGestureEvent={handleSwipeRight}>
          <View style={{ flex: 1 }}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "space-between", paddingVertical: 40, paddingTop: '5%' }}>
              {(screen === "welcome" || screen === "auth" || screen === "signup") && (
                <HeaderBar variant="logo" tagline="L'amour se construit chaque jour" taglineColor={BRAND_GRAY} />
        )}

        <View style={{ width: "100%", paddingHorizontal: 20, flex: 1 }}>
          {screen === "welcome" && (
            <>
              <Pressable onPress={() => setScreen("auth")} accessibilityRole="button" style={{ borderRadius: 12, overflow: "hidden", marginTop: 24 }}>
                <LinearGradient colors={[BRAND_BLUE, BRAND_PINK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingVertical: 16, borderRadius: 12, alignItems: "center" }}>
                        <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700" }}>Continuer</Text>
                </LinearGradient>
              </Pressable>

              <View style={{ alignItems: "center", marginTop: 16 }}>
                <Text style={{ color: "#9A9A9A" }}>
                  Vous avez déjà un compte? <Text style={{ color: BRAND_BLUE }}>Se Connecter</Text>
                </Text>
                <Text style={{ color: "#9A9A9A", marginTop: 6 }}>
                  Vous avez reçu un code? <Text style={{ color: BRAND_BLUE }}>Cliquez ici</Text>
                </Text>
              </View>
            </>
          )}

          {screen === "auth" && (
            <>
                    <View style={{ gap: 12, marginBottom: 8, marginTop: 16 }}>
                <View style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E5E5", borderWidth: 1, borderRadius: 12 }}>
          <TextInput
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    style={{ paddingHorizontal: 14, height: 50 }}
                    placeholderTextColor="#9A9A9A"
          />
                </View>
                <View style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E5E5", borderWidth: 1, borderRadius: 12 }}>
          <TextInput
                    placeholder="Mot de passe"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
                    style={{ paddingHorizontal: 14, height: 50 }}
                    placeholderTextColor="#9A9A9A"
                  />
                </View>
              </View>

                    {error ? <Text style={{ color: "#FF5A5F", textAlign: "center" }}>{error}</Text> : null}

                    <Pressable onPress={handleAuth} disabled={isLoading} accessibilityRole="button" style={{ borderRadius: 12, overflow: "hidden", marginTop: 24, opacity: isLoading ? 0.7 : 1 }}>
                <LinearGradient colors={[BRAND_BLUE, BRAND_PINK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingVertical: 16, borderRadius: 12, alignItems: "center" }}>
                        {isLoading ? (
                          <ActivityIndicator color="#FFFFFF" />
                        ) : (
                  <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700" }}>Se connecter</Text>
                        )}
                </LinearGradient>
              </Pressable>

              <View style={{ alignItems: "center", marginTop: 12 }}>
                      <Pressable onPress={() => setScreen("signup")}>
                        <Text style={{ color: BRAND_BLUE, fontSize: 12 }}>Créer un compte</Text>
                </Pressable>
              </View>

              <View style={{ alignItems: "center", marginTop: 8 }}>
                <Pressable onPress={() => setScreen("resetPassword")}>
                  <Text style={{ color: BRAND_BLUE, fontSize: 12 }}>Mot de passe oublié?</Text>
                </Pressable>
              </View>

              <View style={{ alignItems: "center", marginTop: 8 }}>
                <Text style={{ color: "#9A9A9A" }}>
                  Vous avez reçu un code? <Text style={{ color: BRAND_BLUE }}>Cliquez ici</Text>
                </Text>
              </View>
            </>
          )}

                {screen === "signup" && (
                  <>
                    <View style={{ gap: 12, marginBottom: 8, marginTop: 16 }}>
                      <View style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E5E5", borderWidth: 1, borderRadius: 12 }}>
                        <TextInput
                          placeholder="Email"
                          value={email}
                          onChangeText={setEmail}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          style={{ paddingHorizontal: 14, height: 50 }}
                          placeholderTextColor="#9A9A9A"
                        />
                      </View>
                      <View style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E5E5", borderWidth: 1, borderRadius: 12 }}>
                        <TextInput
                          placeholder="Mot de passe"
                          value={password}
                          onChangeText={setPassword}
                          secureTextEntry
                          style={{ paddingHorizontal: 14, height: 50 }}
                          placeholderTextColor="#9A9A9A"
                        />
                      </View>
                      <View style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E5E5", borderWidth: 1, borderRadius: 12 }}>
                        <TextInput
                          placeholder="Confirmez le mot de passe"
                          value={confirmPassword}
                          onChangeText={setConfirmPassword}
                          secureTextEntry
                          style={{ paddingHorizontal: 14, height: 50 }}
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
                          <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700" }}>Créer un compte</Text>
                        )}
                      </LinearGradient>
                    </Pressable>

                    <View style={{ alignItems: "center", marginTop: 12 }}>
                      <Pressable onPress={() => setScreen("auth")}>
                        <Text style={{ color: BRAND_BLUE, fontSize: 12 }}>Déjà un compte? Se connecter</Text>
                      </Pressable>
              </View>
            </>
          )}

          {screen === "profile" && (
            <>
                <View style={{ gap: 16 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                        <Pressable onPress={() => setScreen("signup")}>
                      <MaterialCommunityIcons name="chevron-left" size={24} color="#1a1a1a" />
                    </Pressable>
                    <Text style={{ marginLeft: 8, fontSize: 18, fontWeight: "700", color: "#2D2D2D" }}>Créez votre profil</Text>
                  </View>
                  <View style={{ height: 1, backgroundColor: "#EFEFEF", marginBottom: 8 }} />

                  <View style={{ alignItems: "center", marginTop: 8, marginBottom: 8 }}>
                    <Pressable
                      onPress={() => {
                        console.log('Profile picture pressed!');
                        // Show a simple action sheet instead of Alert.alert
                        const options = ['Appareil photo', 'Galerie', 'Annuler'];
                        const cancelButtonIndex = 2;
                        
                        // For now, let's test with a simple approach
                        if (confirm('Voulez-vous prendre une photo ou choisir depuis la galerie?')) {
                          console.log('User confirmed, opening gallery...');
                          pickImageFromGallery();
                        }
                      }}
                      style={({ pressed }) => [
                        {
                          width: 140,
                          height: 140,
                          borderRadius: 70,
                          backgroundColor: pressed ? "#E0E0E0" : "#F2F3F5",
                          alignItems: "center",
                          justifyContent: "center",
                          overflow: "hidden",
                          borderWidth: 2,
                          borderColor: profilePicture ? BRAND_BLUE : "#E5E5E5",
                        }
                      ]}
                    >
                      {profilePicture ? (
                        <Image
                          source={{ uri: profilePicture }}
                          style={{
                            width: "100%",
                            height: "100%",
                            borderRadius: 68,
                          }}
                        />
                      ) : (
                        <MaterialCommunityIcons name="camera-outline" size={42} color="#8A8D92" />
                      )}
                      
                      {isUploadingPicture ? (
                        <View
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: "rgba(0,0,0,0.5)",
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: 68,
                          }}
                        >
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        </View>
                      ) : (
                        <View
                          style={{
                            position: "absolute",
                            right: 18,
                            bottom: 10,
                            width: 28,
                            height: 28,
                            borderRadius: 14,
                            backgroundColor: profilePicture ? BRAND_BLUE : BRAND_PINK,
                            alignItems: "center",
                            justifyContent: "center",
                            borderWidth: 3,
                            borderColor: "#FFFFFF",
                          }}
                        >
                          <MaterialCommunityIcons 
                            name={profilePicture ? "pencil" : "plus"} 
                            size={16} 
                            color="#FFFFFF" 
                          />
                        </View>
                      )}
                    </Pressable>
                  </View>

                  <View style={{ gap: 12 }}>
                    <View style={{ backgroundColor: "#FFFFFF", borderColor: nameError ? "#FF5A5F" : "#E5E5E5", borderWidth: 1, borderRadius: 12 }}>
                      <TextInput
                            placeholder="Nom complet"
                            value={name}
                            onChangeText={(text) => { setName(text); setNameError("") }}
                        style={{ paddingHorizontal: 14, height: 50 }}
                        placeholderTextColor="#9A9A9A"
                      />
                    </View>
                    {nameError ? <Text style={{ color: "#FF5A5F", fontSize: 12, marginTop: 4, marginLeft: 4 }}>{nameError}</Text> : null}

                    <Pressable
                      onPress={() => setIsDateOpen(true)}
                      style={{
                        backgroundColor: "#FFFFFF",
                        borderColor: "#E5E5E5",
                        borderWidth: 1,
                        borderRadius: 12,
                        paddingHorizontal: 14,
                        height: 50,
                        justifyContent: "center"
                      }}
                    >
                      <Text style={{ color: birthDate ? "#000" : "#9A9A9A" }}>
                        {birthDate ? new Date(birthDate).getFullYear().toString() : "Date de naissance (optionnel)"}
                      </Text>
                    </Pressable>

                        <Pressable
                          onPress={() => setIsGenderOpen(true)}
                          style={{
                            backgroundColor: "#FFFFFF",
                            borderColor: genderError ? "#FF5A5F" : "#E5E5E5",
                            borderWidth: 1,
                            borderRadius: 12,
                            paddingHorizontal: 14,
                            height: 50,
                            justifyContent: "center",
                          }}
                        >
                          <Text style={{ color: gender ? "#000" : "#9A9A9A" }}>
                            {gender === "male" ? "Homme" : gender === "female" ? "Femme" : gender === "other" ? "Autre" : "Genre"}
                          </Text>
                        </Pressable>
                        {genderError ? <Text style={{ color: "#FF5A5F", fontSize: 12, marginTop: 4, marginLeft: 4 }}>{genderError}</Text> : null}
                  </View>

                      <Pressable
                        onPress={() => setIsCountryOpen(true)}
                        style={{
                          backgroundColor: "#FFFFFF",
                            borderColor: countryError ? "#FF5A5F" : "#E5E5E5",
                          borderWidth: 1,
                          borderRadius: 12,
                          paddingHorizontal: 14,
                          height: 50,
                          justifyContent: "center",
                        }}
                      >
                        <Text style={{ color: selectedCountry ? "#000" : "#9A9A9A" }}>{selectedCountry ?? "Pays"}</Text>
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
                            <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700" }}>Créer mon profil</Text>
                          )}
                    </LinearGradient>
                  </Pressable>
                
            </>
          )}

          {screen === "interests" && (
            <>
              <HeaderBar variant="title" title="Vos centres d'intérêts" onBack={() => setScreen("profile")} />

              <View style={{ flex: 1, paddingHorizontal: 20 }}>
                <View style={{ gap: 16, marginTop: 20 }}>
                  {interests.map((interest) => (
                    <Pressable
                      key={interest.id}
                      onPress={() => handleInterestToggle(interest.id)}
                      style={{
                        backgroundColor: selectedInterests.includes(interest.id) ? BRAND_BLUE : "#F8F9FA",
                        borderColor: selectedInterests.includes(interest.id) ? BRAND_BLUE : "#E5E5E5",
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
                        color={selectedInterests.includes(interest.id) ? "#FFFFFF" : "#6C6C6C"}
                      />
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: "500",
                          color: selectedInterests.includes(interest.id) ? "#FFFFFF" : "#2D2D2D",
                          flex: 1,
                        }}
                      >
                        {interest.label}
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
                    disabled={isInterestsLoading}
                    style={{ borderRadius: 12, overflow: "hidden", opacity: isInterestsLoading ? 0.7 : 1 }}
                  >
                    <LinearGradient colors={[BRAND_BLUE, BRAND_PINK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingVertical: 16, borderRadius: 12, alignItems: "center" }}>
                      {isInterestsLoading ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700" }}>Terminer</Text>
                      )}
                    </LinearGradient>
                  </Pressable>
                </View>
              </View>
            </>
          )}

          {screen === "inviteCodes" && (
                  <>
                    <HeaderBar variant="title" title="Code d'invitation" onBack={() => setScreen("profile")} />

                    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 20 }}>
                      {/* Invite Code Card */}
                      <LinearGradient
                        colors={['#c6eff7', '#ffd4f1']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={{ 
                          borderRadius: 20, 
                          padding: 32, 
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
                              fontSize: 32, 
                              fontWeight: "700", 
                              color: "#35b1f0", 
                              letterSpacing: 3,
                              marginBottom: 12,
                              fontFamily: 'monospace',
                            }}>
                              {myInviteCode}
                            </Text>
                            <Text style={{ 
                              fontSize: 16, 
                              color: "gray", 
                              textAlign: "center",
                              lineHeight: 22,
                              fontWeight: 'bold',
                            }}>
                              Partagez le code avec votre partenaire
                            </Text>
                          </>
                        ) : (
                          <ActivityIndicator size="large" color="#FFFFFF" />
                        )}
                      </LinearGradient>

                      {/* Action Buttons */}
                      <View style={{ marginTop: 40, width: "100%", maxWidth: 300, gap: 16 }}>
                        <Pressable
                          onPress={() => {
                            Alert.alert("Code d'invitation", `Votre code: ${myInviteCode}\n\nPartagez ce code avec votre partenaire.`)
                          }}
                          style={{ borderRadius: 12, overflow: "hidden" }}
                        >
                          <LinearGradient colors={[BRAND_BLUE, BRAND_PINK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingVertical: 16, borderRadius: 12, alignItems: "center", flexDirection: "row", justifyContent: "center" }}>
                            <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700", marginRight: 8 }}>
                              Partager le code
                            </Text>
                            <MaterialCommunityIcons name="share-variant" size={20} color="#FFFFFF" />
                          </LinearGradient>
                  </Pressable>

                        <Pressable
                          onPress={async () => {
                            try {
                              await Clipboard.setStringAsync(myInviteCode)
                              Alert.alert("Code copié!", "Le code a été copié dans le presse-papiers")
                            } catch (error) {
                              Alert.alert("Erreur", "Impossible de copier le code")
                            }
                          }}
                          style={{ borderRadius: 12, overflow: "hidden" }}
                        >
                          <LinearGradient colors={[BRAND_BLUE, BRAND_PINK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingVertical: 16, borderRadius: 12, alignItems: "center", flexDirection: "row", justifyContent: "center" }}>
                            <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700", marginRight: 8 }}>
                              Copier le code
                            </Text>
                            <MaterialCommunityIcons name="content-copy" size={20} color="#FFFFFF" />
                          </LinearGradient>
                        </Pressable>
                    </View>

                      {/* Redeem Code Section */}
                      <View style={{ marginTop: 32, width: "100%", maxWidth: 300, gap: 16 }}>
                        <Text style={{ fontSize: 18, fontWeight: "600", color: "#2D2D2D", textAlign: "center" }}>
                          Rejoindre avec un code
                        </Text>
                     
                        
                        <View style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E5E5", borderWidth: 1, borderRadius: 12 }}>
                          <TextInput 
                            placeholder="Mon partenaire" 
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
                              <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700" }}>Rejoindre</Text>
                            )}
                </LinearGradient>
              </Pressable>
                      </View>

                      {/* Skip Option */}
                      <View style={{ marginTop: 32, alignItems: 'center' }}>
                       
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
                            Continuer sans code
                          </Text>
                        </Pressable>
                      </View>
                    </View>
        </>
      )}

      {screen === "resetPassword" && (
        <>
          <HeaderBar variant="title" title="Réinitialiser le mot de passe" onBack={() => setScreen("auth")} />

          <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 20 }}>
            <View style={{ width: "100%", maxWidth: 400, gap: 24 }}>
              <View style={{ alignItems: "center" }}>
                <View style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: "#F3F4F6",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 16
                }}>
                  <MaterialCommunityIcons name="lock-reset" size={40} color={BRAND_BLUE} />
                </View>
                <Text style={{ fontSize: 18, fontWeight: "600", color: "#2D2D2D", textAlign: "center", marginBottom: 8 }}>
                  Mot de passe oublié?
                </Text>
                <Text style={{ fontSize: 14, color: "#6B7280", textAlign: "center", lineHeight: 20 }}>
                  Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
                </Text>
              </View>

              <View style={{ gap: 16 }}>
                <View style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E5E5", borderWidth: 1, borderRadius: 12 }}>
                  <TextInput
                    placeholder="Votre adresse email"
                    value={resetEmail}
                    onChangeText={(text) => { setResetEmail(text); setResetError(""); setResetSuccess("") }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    style={{ paddingHorizontal: 14, height: 50 }}
                    placeholderTextColor="#9A9A9A"
                  />
                </View>

                {resetError ? <Text style={{ color: "#FF5A5F", textAlign: "center", fontSize: 14 }}>{resetError}</Text> : null}
                {resetSuccess ? <Text style={{ color: "#4CAF50", textAlign: "center", fontSize: 14 }}>{resetSuccess}</Text> : null}

                <Pressable
                  onPress={handlePasswordReset}
                  disabled={isResetting}
                  style={{ borderRadius: 12, overflow: "hidden", opacity: isResetting ? 0.7 : 1 }}
                >
                  <LinearGradient colors={[BRAND_BLUE, BRAND_PINK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingVertical: 16, borderRadius: 12, alignItems: "center" }}>
                    {isResetting ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700" }}>Envoyer l'email de réinitialisation</Text>
                    )}
                  </LinearGradient>
                </Pressable>
              </View>

              <View style={{ alignItems: "center" }}>
                <Pressable onPress={() => setScreen("auth")}>
                  <Text style={{ color: BRAND_BLUE, fontSize: 16, fontWeight: "500" }}>
                    Retour à la connexion
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </>
      )}

      {screen === "newPassword" && (
        <>
          <HeaderBar variant="title" title="Réinitialiser mon mot de passe" onBack={() => setScreen("auth")} />

          <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 20 }}>
            <View style={{ width: "100%", maxWidth: 400, gap: 24 }}>
              {!recoveryTokens ? (
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 16, color: "#FF5A5F", textAlign: "center", lineHeight: 20 }}>
                    Session de récupération invalide. Veuillez utiliser le lien dans votre email.
                  </Text>
                  <Pressable
                    onPress={() => setScreen("auth")}
                    style={{ marginTop: 16, padding: 12, backgroundColor: BRAND_BLUE, borderRadius: 8 }}
                  >
                    <Text style={{ color: "#FFFFFF", fontWeight: "600" }}>Retour à la connexion</Text>
                  </Pressable>
                </View>
              ) : (
                <>
                  <View style={{ alignItems: "center" }}>
                    <Text style={{ fontSize: 16, color: "#6B7280", textAlign: "center", lineHeight: 20 }}>
                      Veuillez retaper votre nouveau mot de passe
                    </Text>
                  </View>

                  <View style={{ gap: 16, width: "100%" }}>
                    <View style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E5E5", borderWidth: 1, borderRadius: 12 }}>
                      <TextInput
                        placeholder="Mot de passe"
                        value={newPassword}
                        onChangeText={(text) => { setNewPassword(text); setNewPasswordError("") }}
                        secureTextEntry
                        style={{ paddingHorizontal: 14, height: 50 }}
                        placeholderTextColor="#9A9A9A"
                      />
                    </View>

                    <View style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E5E5", borderWidth: 1, borderRadius: 12 }}>
                      <TextInput
                        placeholder="Mot de passe"
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
                          <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700" }}>Confirmer</Text>
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
              <Text style={{ fontSize: 18, fontWeight: '600', color: '#2D2D2D' }}>Sélectionner le genre</Text>
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
                  {g === "male" ? "Homme" : g === "female" ? "Femme" : "Autre"}
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
              <Text style={{ fontSize: 18, fontWeight: '600', color: '#2D2D2D' }}>Sélectionner le pays</Text>
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
              <Text style={{ fontSize: 18, fontWeight: '600', color: '#2D2D2D' }}>Sélectionner la date</Text>
              <Pressable onPress={() => setIsDateOpen(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#6B7280" />
              </Pressable>
            </View>
            
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 16, color: '#6B7280', marginBottom: 20, textAlign: 'center' }}>
                Sélectionnez votre année de naissance
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

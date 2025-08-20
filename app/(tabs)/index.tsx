import HeaderBar from "@/components/HeaderBar"
import { profileService } from "@/lib/profileService"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import * as Clipboard from 'expo-clipboard'
import { LinearGradient } from "expo-linear-gradient"
import { useRouter } from 'expo-router'
import { useEffect, useState } from "react"
import { ActivityIndicator, Alert, Pressable, SafeAreaView, ScrollView, Text, TextInput, View } from "react-native"
import { GestureHandlerRootView, PanGestureHandler, PanGestureHandlerGestureEvent } from "react-native-gesture-handler"
import { useAuth } from "../../lib/auth"

const BRAND_BLUE = "#2DB6FF"
const BRAND_PINK = "#F47CC6"
const BRAND_GRAY = "#6C6C6C"

export default function App() {
  const { user, signUp, signIn, createProfile, loading: authLoading } = useAuth()
  const router = useRouter()
  const [screen, setScreen] = useState<"welcome" | "auth" | "signup" | "profile" | "interests" | "inviteCodes">("welcome")
  const [isLoading, setIsLoading] = useState(false)

  // Auth state
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [isSignUp, setIsSignUp] = useState(false)

  // Profile state
  const [name, setName] = useState("")
  const [birthDate, setBirthDate] = useState("")
  const [gender, setGender] = useState<"male" | "female" | "other" | null>(null)
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null)
  const [isCountryOpen, setIsCountryOpen] = useState(false)
  const [isGenderOpen, setIsGenderOpen] = useState(false)
  
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

  const handleProfileCreation = async () => {
    if (!validateProfile()) {
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
      
      const profileData = {
        id: user.id, // Include the user ID
        name,
        country: selectedCountry,
        gender,
        birth_date: birthDate || null,
        invite_code: inviteCode,
        completed: false, // Profile not completed until interests are selected
      }

      console.log("Sending profile data:", profileData)

      const { data, error } = await profileService.createProfile(profileData)
      
      if (error) {
        console.error("Profile creation error:", error)
        setError(error.message || "Erreur lors de la création du profil")
      } else {
        console.log("Profile created successfully:", data)
        // Success! Show success message and redirect to welcome
        // Redirect to interests section
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
    
    setIsInterestsLoading(true)
    try {
      // Update profile with selected interests but DON'T mark as completed yet
      await profileService.updateProfile(user.id, { 
        interests: selectedInterests,
        completed: false // Keep as false until couple is formed
      })
      
      // Get the user's invite code and go to invite codes section
      const { data: profile } = await profileService.getProfile(user.id)
      if (profile) {
        setMyInviteCode(profile.invite_code || "")
        setScreen("inviteCodes")
      }
    } catch (error) {
      console.error("Error updating interests:", error)
    } finally {
      setIsInterestsLoading(false)
    }
  }

  const handleSkipInviteCodes = () => {
    setScreen("welcome")
  }

  if (authLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF", justifyContent: "center", alignItems: "center" }}>
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
      <View style={{ flex: 1, alignItems: "center", justifyContent: "space-between", paddingVertical: 40 }}>
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
                    <View
                      style={{
                        width: 140,
                        height: 140,
                        borderRadius: 70,
                        backgroundColor: "#F2F3F5",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <MaterialCommunityIcons name="camera-outline" size={42} color="#8A8D92" />
                      <View
                        style={{
                          position: "absolute",
                          right: 18,
                          bottom: 10,
                          width: 28,
                          height: 28,
                          borderRadius: 14,
                          backgroundColor: BRAND_PINK,
                          alignItems: "center",
                          justifyContent: "center",
                          borderWidth: 3,
                          borderColor: "#FFFFFF",
                        }}
                      >
                        <MaterialCommunityIcons name="plus" size={16} color="#FFFFFF" />
                      </View>
                    </View>
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

                    <View style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E5E5", borderWidth: 1, borderRadius: 12 }}>
                      <TextInput
                            placeholder="Date de naissance (optionnel)"
                            value={birthDate}
                            onChangeText={setBirthDate}
                        style={{ paddingHorizontal: 14, height: 50 }}
                        placeholderTextColor="#9A9A9A"
                      />
                    </View>

                        <View style={{ position: "relative", zIndex: 1000 }}>
                          <Pressable
                            onPress={() => setIsGenderOpen(!isGenderOpen)}
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
                          {isGenderOpen && (
                            <View
                              style={{
                                position: "absolute",
                                top: 54,
                                left: 0,
                                right: 0,
                                backgroundColor: "#FFFFFF",
                                borderColor: "#E5E5E5",
                                borderWidth: 1,
                                borderRadius: 12,
                                maxHeight: 200,
                                overflow: "hidden",
                                zIndex: 1000,
                              }}
                            >
                              <ScrollView>
                                <Pressable
                                  onPress={() => {
                                    setGender("male")
                                    setIsGenderOpen(false)
                                    setGenderError("")
                                  }}
                                  style={{ paddingHorizontal: 14, paddingVertical: 12 }}
                                >
                                  <Text>Homme</Text>
                                </Pressable>
                                <Pressable
                                  onPress={() => {
                                    setGender("female")
                                    setIsGenderOpen(false)
                                    setGenderError("")
                                  }}
                                  style={{ paddingHorizontal: 14, paddingVertical: 12 }}
                                >
                                  <Text>Femme</Text>
                                </Pressable>
                                <Pressable
                                  onPress={() => {
                                    setGender("other")
                                    setIsGenderOpen(false)
                                    setGenderError("")
                                  }}
                                  style={{ paddingHorizontal: 14, paddingVertical: 12 }}
                                >
                                  <Text>Autre</Text>
                                </Pressable>
                              </ScrollView>
                            </View>
                          )}
                    </View>
                        {genderError ? <Text style={{ color: "#FF5A5F", fontSize: 12, marginTop: 4, marginLeft: 4 }}>{genderError}</Text> : null}
                  </View>

                      <View style={{ position: "relative", zIndex: 1000 }}>
                      <Pressable
                        onPress={() => setIsCountryOpen(!isCountryOpen)}
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
                      {isCountryOpen && (
                        <View
                          style={{
                            position: "absolute",
                            top: 54,
                            left: 0,
                            right: 0,
                            backgroundColor: "#FFFFFF",
                            borderColor: "#E5E5E5",
                            borderWidth: 1,
                            borderRadius: 12,
                            maxHeight: 200,
                            overflow: "hidden",
                          }}
                        >
                          <ScrollView>
                            {countries.map((country) => (
                              <Pressable
                                key={country}
                                onPress={() => {
                                  setSelectedCountry(country)
                                  setIsCountryOpen(false)
                                  setCountryError("")
                                }}
                                style={{ paddingHorizontal: 14, paddingVertical: 12 }}
                              >
                                <Text>{country}</Text>
                              </Pressable>
                            ))}
                          </ScrollView>
                        </View>
                      )}
                    </View>
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
                        <Text style={{ fontSize: 14, color: "#7A7A7A", textAlign: "center" }}>
                          Entrez le code reçu de votre partenaire
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
                      <Pressable
                        onPress={handleSkipInviteCodes}
                        style={{ marginTop: 24 }}
                      >
                        <Text style={{ color: BRAND_BLUE, fontSize: 16, fontWeight: "500" }}>
                          Skip
                        </Text>
                      </Pressable>
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
    </SafeAreaView>
  )
}

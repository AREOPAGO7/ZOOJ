import { useAuth } from '@/lib/auth'
import { Profile, profileService } from '@/lib/profileService'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import React, { useEffect, useState } from 'react'
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native'

const BRAND_BLUE = "#2DB6FF"
const BRAND_PINK = "#F47CC6"
const BRAND_GRAY = "#6C6C6C"

interface ProfileEditorProps {
  onProfileUpdated?: (profile: Profile) => void
  onBack?: () => void
}

export default function ProfileEditor({ onProfileUpdated, onBack }: ProfileEditorProps) {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")
  
  // Profile state
  const [name, setName] = useState("")
  const [birthDate, setBirthDate] = useState("")
  const [gender, setGender] = useState<"male" | "female" | "other" | null>(null)
  const [country, setCountry] = useState<string | null>(null)
  const [interests, setInterests] = useState<string[]>([])
  const [newInterest, setNewInterest] = useState("")
  
  // UI state
  const [isCountryOpen, setIsCountryOpen] = useState(false)
  const [isGenderOpen, setIsGenderOpen] = useState(false)

  const countries = [
    "France", "Belgique", "Suisse", "Canada", "Maroc", "Algérie", "Tunisie", 
    "Côte d'Ivoire", "Sénégal", "Cameroun"
  ]

  const genders = ["male", "female", "other"]

  useEffect(() => {
    if (user) {
      loadProfile()
    }
  }, [user])

  const loadProfile = async () => {
    if (!user) return
    
    setIsLoading(true)
    try {
      const { data: profile, error } = await profileService.getProfile(user.id)
      if (error) {
        setError("Erreur lors du chargement du profil")
        return
      }
      
      if (profile) {
        setName(profile.name || "")
        setBirthDate(profile.birth_date || "")
        setGender(profile.gender)
        setCountry(profile.country)
        setInterests(profile.interests || [])
      }
    } catch (error) {
      setError("Une erreur inattendue s'est produite")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!user || !name.trim()) {
      setError("Le nom est obligatoire")
      return
    }

    setIsSaving(true)
    setError("")

    try {
      const updates = {
        name: name.trim(),
        birth_date: birthDate || null,
        gender,
        country,
        interests: interests.length > 0 ? interests : null,
      }

      const { data: updatedProfile, error } = await profileService.updateProfile(user.id, updates)
      
      if (error) {
        setError(error.message || "Erreur lors de la sauvegarde")
        return
      }

      if (updatedProfile) {
        Alert.alert("Succès", "Profil mis à jour avec succès!")
        onProfileUpdated?.(updatedProfile)
      }
    } catch (error) {
      setError("Une erreur inattendue s'est produite")
    } finally {
      setIsSaving(false)
    }
  }

  const addInterest = () => {
    if (newInterest.trim() && !interests.includes(newInterest.trim())) {
      setInterests([...interests, newInterest.trim()])
      setNewInterest("")
    }
  }

  const removeInterest = (index: number) => {
    setInterests(interests.filter((_, i) => i !== index))
  }

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={BRAND_BLUE} />
        <Text style={{ marginTop: 16, color: BRAND_GRAY }}>Chargement du profil...</Text>
      </View>
    )
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#FFFFFF" }} contentContainerStyle={{ padding: 20 }}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}>
        {onBack && (
          <Pressable onPress={onBack} style={{ marginRight: 12 }}>
            <MaterialCommunityIcons name="chevron-left" size={24} color="#1a1a1a" />
          </Pressable>
        )}
        <Text style={{ fontSize: 20, fontWeight: "700", color: "#2D2D2D" }}>Modifier mon profil</Text>
      </View>

      <View style={{ gap: 16 }}>
        <View style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E5E5", borderWidth: 1, borderRadius: 12 }}>
          <TextInput
            placeholder="Nom complet"
            value={name}
            onChangeText={setName}
            style={{ paddingHorizontal: 14, height: 50 }}
            placeholderTextColor="#9A9A9A"
          />
        </View>

        <View style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E5E5", borderWidth: 1, borderRadius: 12 }}>
          <TextInput
            placeholder="Date de naissance (optionnel)"
            value={birthDate}
            onChangeText={setBirthDate}
            style={{ paddingHorizontal: 14, height: 50 }}
            placeholderTextColor="#9A9A9A"
          />
        </View>

        <View style={{ position: "relative", zIndex: 100 }}>
          <Pressable
            onPress={() => setIsGenderOpen(!isGenderOpen)}
            style={{
              backgroundColor: "#FFFFFF",
              borderColor: "#E5E5E5",
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
                {genders.map((g) => (
                  <Pressable
                    key={g}
                    onPress={() => {
                      setGender(g as "male" | "female" | "other")
                      setIsGenderOpen(false)
                    }}
                    style={{ paddingHorizontal: 14, paddingVertical: 12 }}
                  >
                    <Text>{g === "male" ? "Homme" : g === "female" ? "Femme" : "Autre"}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        <View style={{ position: "relative", zIndex: 50 }}>
          <Pressable
            onPress={() => setIsCountryOpen(!isCountryOpen)}
            style={{
              backgroundColor: "#FFFFFF",
              borderColor: "#E5E5E5",
              borderWidth: 1,
              borderRadius: 12,
              paddingHorizontal: 14,
              height: 50,
              justifyContent: "center",
            }}
          >
            <Text style={{ color: country ? "#000" : "#9A9A9A" }}>{country ?? "Pays"}</Text>
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
                {countries.map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => {
                      setCountry(c)
                      setIsCountryOpen(false)
                    }}
                    style={{ paddingHorizontal: 14, paddingVertical: 12 }}
                  >
                    <Text>{c}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 16, fontWeight: "600", color: "#2D2D2D" }}>Centres d'intérêt</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <View style={{ flex: 1, backgroundColor: "#FFFFFF", borderColor: "#E5E5E5", borderWidth: 1, borderRadius: 12 }}>
              <TextInput
                placeholder="Ajouter un intérêt"
                value={newInterest}
                onChangeText={setNewInterest}
                style={{ paddingHorizontal: 14, height: 50 }}
                placeholderTextColor="#9A9A9A"
              />
            </View>
            <Pressable
              onPress={addInterest}
              style={{
                backgroundColor: BRAND_BLUE,
                borderRadius: 12,
                paddingHorizontal: 16,
                justifyContent: "center",
                minWidth: 60,
              }}
            >
              <Text style={{ color: "#FFFFFF", fontWeight: "600" }}>+</Text>
            </Pressable>
          </View>
          
          {interests.length > 0 && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
              {interests.map((interest, index) => (
                <View
                  key={index}
                  style={{
                    backgroundColor: "#F0F0F0",
                    borderRadius: 20,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  <Text style={{ marginRight: 8 }}>{interest}</Text>
                  <Pressable onPress={() => removeInterest(index)}>
                    <MaterialCommunityIcons name="close" size={16} color="#666" />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>

      {error ? <Text style={{ color: "#FF5A5F", textAlign: "center", marginTop: 16 }}>{error}</Text> : null}

      <Pressable
        onPress={handleSave}
        disabled={isSaving}
        style={{ borderRadius: 12, overflow: "hidden", marginTop: 24, opacity: isSaving ? 0.7 : 1 }}
      >
        <LinearGradient colors={[BRAND_BLUE, BRAND_PINK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingVertical: 16, borderRadius: 12, alignItems: "center" }}>
          {isSaving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700" }}>Sauvegarder</Text>
          )}
        </LinearGradient>
      </Pressable>
    </ScrollView>
  )
}

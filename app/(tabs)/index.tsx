import HeaderBar from "@/components/HeaderBar"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import { useState } from "react"
import { Pressable, SafeAreaView, ScrollView, Text, TextInput, View } from "react-native"
import { GestureHandlerRootView, PanGestureHandler, PanGestureHandlerGestureEvent } from "react-native-gesture-handler"

const BRAND_BLUE = "#2DB6FF"
const BRAND_PINK = "#F47CC6"
const BRAND_GRAY = "#6C6C6C"

export default function App() {
  const [screen, setScreen] = useState<"welcome" | "auth" | "profile" | "loveStory">("welcome")
  const bottomOffset = 0

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")

  const countries = [
    "France",
    "Belgique",
    "Suisse",
    "Canada",
    "Maroc",
    "Algérie",
    "Tunisie",
    "Côte d’Ivoire",
    "Sénégal",
    "Cameroun",
  ]
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null)
  const [isCountryOpen, setIsCountryOpen] = useState(false)
  // Love story (couple info) page state
  const [myName, setMyName] = useState("")
  const [partnerName, setPartnerName] = useState("")
  const [coupleAnniversary, setCoupleAnniversary] = useState("")
  const [relationshipStatus, setRelationshipStatus] = useState<string | null>(null)
  const [isStatusOpen, setIsStatusOpen] = useState(false)
  const [loveError, setLoveError] = useState("")
  const relationshipStatuses = [
    "En couple",
    "Fiancés",
    "Mariés",
    "C'est compliqué",
    "Séparés",
  ]

  const handleSwipeRight = ({ nativeEvent }: PanGestureHandlerGestureEvent) => {
    if (nativeEvent.translationX > 80 && Math.abs(nativeEvent.translationY) < 40) {
      if (screen === "auth") setScreen("welcome")
      else if (screen === "profile") setScreen("auth")
      else if (screen === "loveStory") setScreen("profile")
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <PanGestureHandler onGestureEvent={handleSwipeRight}>
          <View style={{ flex: 1 }}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "space-between", paddingVertical: 40 }}>
        {(screen === "welcome" || screen === "auth") && (
          <HeaderBar variant="logo" tagline="L’amour se construit chaque jour" taglineColor={BRAND_GRAY} />
        )}

        <View style={{ width: "100%", paddingHorizontal: 20, flex: 1 }}>
          {screen === "welcome" && (
            <>
              <Pressable onPress={() => setScreen("auth")} accessibilityRole="button" style={{ borderRadius: 12, overflow: "hidden", marginTop: 24 }}>
                <LinearGradient colors={[BRAND_BLUE, BRAND_PINK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingVertical: 16, borderRadius: 12, alignItems: "center" }}>
                  <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700", }}>Continuer</Text>
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
              <View style={{ gap: 12, marginBottom: 8 ,marginTop: 16}}>
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

              <Pressable onPress={() => { setScreen("profile"); }} accessibilityRole="button" style={{ borderRadius: 12, overflow: "hidden", marginTop: 24 }}>
                <LinearGradient colors={[BRAND_BLUE, BRAND_PINK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingVertical: 16, borderRadius: 12, alignItems: "center" }}>
                  <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700" }}>Se connecter</Text>
                </LinearGradient>
              </Pressable>

              <View style={{ alignItems: "center", marginTop: 12 }}>
                <Pressable>
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

          {screen === "profile" && (
            <>
                <View style={{ gap: 16 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                    <Pressable onPress={() => setScreen("auth")}>
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
                    
                    
                   
                   

                    {/* Credentials */}
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
                        onChangeText={(t) => {
                          setPassword(t)
                          setError("")
                        }}
                        secureTextEntry
                        style={{ paddingHorizontal: 14, height: 50 }}
                        placeholderTextColor="#9A9A9A"
                      />
                    </View>
                    <View style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E5E5", borderWidth: 1, borderRadius: 12 }}>
                      <TextInput
                        placeholder="Confirmez le mot de passe"
                        value={confirmPassword}
                        onChangeText={(t) => {
                          setConfirmPassword(t)
                          setError("")
                        }}
                        secureTextEntry
                        style={{ paddingHorizontal: 14, height: 50 }}
                        placeholderTextColor="#9A9A9A"
                      />
                    </View>
                  </View>
                  <View style={{ position: "relative", zIndex: 100 }}>
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
                  {error ? (
                    <Text style={{ color: "#FF5A5F" }}>{error}</Text>
                  ) : null}

                  <Pressable
                    onPress={() => {
                      if (password !== confirmPassword) {
                        setError("Les mots de passe ne correspondent pas")
                        return
                      }
                      setScreen("loveStory")
                    }}
                    accessibilityRole="button"
                    style={{ borderRadius: 12, overflow: "hidden", marginTop: 24 }}
                  >
                    <LinearGradient colors={[BRAND_BLUE, BRAND_PINK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingVertical: 16, borderRadius: 12, alignItems: "center" }}>
                      <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700" }}>Compléter mon profil</Text>
                    </LinearGradient>
                  </Pressable>
                </View>
            </>
          )}

          {screen === "loveStory" && (
            <>
              <HeaderBar variant="title" title="Informations du couple" onBack={() => setScreen("profile")} />

              <View style={{ gap: 12 }}>
                <View style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E5E5", borderWidth: 1, borderRadius: 12 }}>
                  <TextInput placeholder="Mon nom" value={myName} onChangeText={(t) => { setMyName(t); setLoveError("") }} style={{ paddingHorizontal: 14, height: 50 }} placeholderTextColor="#9A9A9A" />
                </View>
                <View style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E5E5", borderWidth: 1, borderRadius: 12 }}>
                  <TextInput placeholder="Mon partenaire" value={partnerName} onChangeText={(t) => { setPartnerName(t); setLoveError("") }} style={{ paddingHorizontal: 14, height: 50 }} placeholderTextColor="#9A9A9A" />
                </View>
                <View style={{ position: "relative" }}>
                  <View style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E5E5", borderWidth: 1, borderRadius: 12, paddingRight: 44 }}>
                    <TextInput placeholder="Anniversaire de notre couple" value={coupleAnniversary} onChangeText={(t) => { setCoupleAnniversary(t); setLoveError("") }} style={{ paddingHorizontal: 14, height: 50 }} placeholderTextColor="#9A9A9A" />
                  </View>
                  <Pressable style={{ position: "absolute", right: 10, top: 10, width: 30, height: 30, alignItems: "center", justifyContent: "center" }}>
                    <MaterialCommunityIcons name="calendar-outline" size={22} color="#7A7A7A" />
                  </Pressable>
                </View>
                <View style={{ position: "relative" }}>
                  <Pressable onPress={() => setIsStatusOpen(!isStatusOpen)} style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E5E5", borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, height: 50, justifyContent: "center", paddingRight: 44 }}>
                    <Text style={{ color: relationshipStatus ? "#000" : "#9A9A9A" }}>{relationshipStatus ?? "Statut de notre relation"}</Text>
                  </Pressable>
                  <Pressable style={{ position: "absolute", right: 10, top: 10, width: 30, height: 30, alignItems: "center", justifyContent: "center" }} onPress={() => setIsStatusOpen(!isStatusOpen)}>
                    <MaterialCommunityIcons name="calendar-outline" size={22} color="#7A7A7A" />
                  </Pressable>
                  {isStatusOpen && (
                    <View style={{ position: "absolute", top: 54, left: 0, right: 0, backgroundColor: "#FFFFFF", borderColor: "#E5E5E5", borderWidth: 1, borderRadius: 12, overflow: "hidden" }}>
                      {relationshipStatuses.map((s) => (
                        <Pressable key={s} onPress={() => { setRelationshipStatus(s); setIsStatusOpen(false) }} style={{ paddingHorizontal: 14, paddingVertical: 12 }}>
                          <Text>{s}</Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>
              </View>

              {loveError ? (
                <Text style={{ color: "#FF5A5F" }}>{loveError}</Text>
              ) : null}

              <Pressable
                onPress={() => {
                  if (!myName || !partnerName) {
                    setLoveError("Veuillez renseigner vos noms")
                    return
                  }
                }}
                accessibilityRole="button"
                style={{ borderRadius: 12, overflow: "hidden", marginTop: 24 }}
              >
                <LinearGradient colors={[BRAND_BLUE, BRAND_PINK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingVertical: 16, borderRadius: 12, alignItems: "center" }}>
                  <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700" }}>Enregistrer</Text>
                </LinearGradient>
              </Pressable>
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
            <MaterialCommunityIcons name="heart" size={44} color={BRAND_PINK}  style={{ marginRight: 0, transform: [{ rotate: "46deg" }] }}/>
          </View>
        </View>
      </View>
    </View>
        </PanGestureHandler>
      </GestureHandlerRootView>
    </SafeAreaView>
  )
}

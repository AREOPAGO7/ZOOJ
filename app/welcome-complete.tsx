import { MaterialCommunityIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import React, { useEffect } from 'react'
import { ActivityIndicator, Pressable, Text, View } from 'react-native'
import { useAuth } from '../lib/auth'

const BRAND_BLUE = "#2DB6FF"
const BRAND_PINK = "#F47CC6"

export default function WelcomeComplete() {
  const router = useRouter()
  const { user, loading } = useAuth()

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/')
    }
  }, [user, loading, router])

  // Show loading while checking auth
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#FFFFFF", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={BRAND_BLUE} />
        <Text style={{ marginTop: 16, color: "#7A7A7A" }}>Chargement...</Text>
      </View>
    )
  }

  // Don't render if not authenticated
  if (!user) {
    return null
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#FFFFFF", paddingTop: 50 }}>
      <View style={{ flex: 1, paddingHorizontal: 20 }}>
        {/* Logo */}
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <View style={{ alignItems: "center", gap: 40 }}>
            {/* Heart Logo */}
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <MaterialCommunityIcons
                name="heart"
                size={60}
                color={BRAND_BLUE}
                style={{ marginRight: -17, transform: [{ rotate: "-46deg" }] }}
              />
              <MaterialCommunityIcons 
                name="heart" 
                size={60} 
                color={BRAND_PINK} 
                style={{ marginRight: 0, transform: [{ rotate: "46deg" }] }} 
              />
            </View>
            
            {/* Welcome Message */}
            <View style={{ alignItems: "center", gap: 8 }}>
              <Text style={{ fontSize: 24, fontWeight: "700", color: "#2D2D2D", textAlign: "center" }}>
                Que l'aventure commence
              </Text>
              <Text style={{ fontSize: 20, fontWeight: "600", color: "#2D2D2D", textAlign: "center" }}>
                Christophe !
              </Text>
            </View>
          </View>
        </View>

        {/* Action Button */}
        <View style={{ paddingBottom: 40 }}>
          <Pressable
            onPress={() => {
              // Navigate to main features page
              router.push('/main-features')
            }}
            style={{ borderRadius: 12, overflow: "hidden" }}
          >
            <LinearGradient colors={[BRAND_BLUE, BRAND_PINK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingVertical: 16, borderRadius: 12, alignItems: "center" }}>
              <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700" }}>
                Accéder à Zooj
              </Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </View>
  )
}

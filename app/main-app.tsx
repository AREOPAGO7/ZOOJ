import { MaterialCommunityIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import React, { useEffect } from 'react'
import { ActivityIndicator, Pressable, Text, View } from 'react-native'
import { useAuth } from '../lib/auth'
import AppLayout from './app-layout'

const BRAND_BLUE = "#2DB6FF"
const BRAND_PINK = "#F47CC6"

export default function MainApp() {
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
    <AppLayout>
      <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
        <View style={{ flex: 1, paddingHorizontal: 20 }}>
        {/* Main Content */}
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <View style={{ alignItems: "center", gap: 24 }}>
            <View style={{ 
              width: 120, 
              height: 120, 
              borderRadius: 60, 
              backgroundColor: "#F8F9FA",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <MaterialCommunityIcons name="check-circle" size={60} color={BRAND_BLUE} />
            </View>
            
            <Text style={{ fontSize: 28, fontWeight: "700", color: "#2D2D2D", textAlign: "center" }}>
              Profil complet !
            </Text>
            
            <Text style={{ fontSize: 16, color: "#7A7A7A", textAlign: "center", lineHeight: 24, maxWidth: 280 }}>
              Félicitations ! Votre profil est maintenant complet avec vos centres d'intérêts. 
              Vous pouvez maintenant profiter pleinement de l'application.
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={{ paddingBottom: 40, gap: 16 }}>
          <Pressable
            onPress={() => {
              // Navigate to the accueil page
              router.push('/pages/accueil')
            }}
            style={{ borderRadius: 12, overflow: "hidden" }}
          >
            <LinearGradient colors={[BRAND_BLUE, BRAND_PINK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingVertical: 16, borderRadius: 12, alignItems: "center" }}>
              <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700" }}>
                Commencer à explorer
              </Text>
            </LinearGradient>
          </Pressable>

          <Pressable
            onPress={() => router.back()}
            style={{ paddingVertical: 16, alignItems: "center" }}
          >
            <Text style={{ color: BRAND_BLUE, fontSize: 16, fontWeight: "500" }}>
              Retour
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
    </AppLayout>
  )
}

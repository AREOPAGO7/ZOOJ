import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import React, { useEffect } from 'react'
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native'
import { useAuth } from '../lib/auth'

const BRAND_BLUE = "#2DB6FF"
const BRAND_PINK = "#F47CC6"

export default function MainFeatures() {
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

  const features = [
    {
      id: 'couple-activities',
      title: 'Activités de couple',
      description: 'Découvrez des activités amusantes à faire ensemble',
      icon: 'heart-multiple',
      color: BRAND_PINK
    },
    {
      id: 'date-ideas',
      title: 'Idées de rendez-vous',
      description: 'Des suggestions créatives pour vos sorties',
      icon: 'calendar-star',
      color: BRAND_BLUE
    },
    {
      id: 'relationship-tips',
      title: 'Conseils relationnels',
      description: 'Des conseils pour renforcer votre relation',
      icon: 'lightbulb-on',
      color: BRAND_PINK
    },
    {
      id: 'shared-goals',
      title: 'Objectifs partagés',
      description: 'Planifiez et suivez vos objectifs ensemble',
      icon: 'target',
      color: BRAND_BLUE
    },
    {
      id: 'memory-album',
      title: 'Album de souvenirs',
      description: 'Conservez vos moments précieux',
      icon: 'image-multiple',
      color: BRAND_PINK
    },
    {
      id: 'communication-tools',
      title: 'Outils de communication',
      description: 'Améliorez votre communication de couple',
      icon: 'message-text',
      color: BRAND_BLUE
    }
  ]

  return (
    <View style={{ flex: 1, backgroundColor: "#FFFFFF", paddingTop: 50 }}>
      <View style={{ flex: 1, paddingHorizontal: 20 }}>
        {/* Main Content */}
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <View style={{ alignItems: "center", gap: 24 }}>
            <Text style={{ fontSize: 28, fontWeight: "700", color: "#2D2D2D", textAlign: "center" }}>
              Découvrez ZOOJ
            </Text>
            <Text style={{ fontSize: 16, color: "#7A7A7A", textAlign: "center", marginTop: 8 }}>
              Explorez toutes les fonctionnalités de l'application
            </Text>

          </View>
        </View>

        {/* Features Grid */}
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          <View style={{ gap: 16, paddingBottom: 20, marginTop: 40 }}>
            {features.map((feature) => (
              <Pressable
                key={feature.id}
                onPress={() => {
                  console.log(`Navigate to ${feature.id}`)
                  // Here you can add navigation to specific feature pages
                }}
                style={{
                  backgroundColor: "#F8F9FA",
                  borderColor: "#E5E5E5",
                  borderWidth: 1,
                  borderRadius: 16,
                  padding: 20,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 16,
                }}
              >
                <View style={{
                  width: 50,
                  height: 50,
                  borderRadius: 25,
                  backgroundColor: feature.color,
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <MaterialCommunityIcons name={feature.icon as any} size={24} color="#FFFFFF" />
                </View>
                
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontSize: 18,
                    fontWeight: "600",
                    color: "#2D2D2D",
                    marginBottom: 4
                  }}>
                    {feature.title}
                  </Text>
                  <Text style={{
                    fontSize: 14,
                    color: "#7A7A7A",
                    lineHeight: 20
                  }}>
                    {feature.description}
                  </Text>
                </View>
                
                <MaterialCommunityIcons name="chevron-right" size={24} color="#C7C7C7" />
              </Pressable>
            ))}
          </View>
        </ScrollView>

        {/* Back Button */}
        <View style={{ paddingBottom: 20 }}>
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
   )
 }

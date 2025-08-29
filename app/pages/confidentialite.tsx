import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import AppLayout from '../app-layout';

const BRAND_BLUE = "#2DB6FF";
const BRAND_PINK = "#F47CC6";
const BRAND_GRAY = "#6C6C6C";

export default function ConfidentialitePage() {
  const router = useRouter();
  const [expandedCards, setExpandedCards] = React.useState<{
    [key: string]: boolean;
  }>({});

  const handleBack = () => {
    router.back();
  };

  const toggleCard = (cardKey: string) => {
    setExpandedCards(prev => ({
      ...prev,
      [cardKey]: !prev[cardKey]
    }));
  };

  return (
    <AppLayout>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={handleBack}>
            <MaterialCommunityIcons name="chevron-left" size={24} color={BRAND_GRAY} />
          </Pressable>
          <Text style={styles.headerTitle}>Confidentialité</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Conditions d'utilisation Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Conditions d'utilisation</Text>
            <Text style={styles.sectionDescription}>
              En utilisant notre application, vous acceptez les conditions suivantes. Ces conditions sont essentielles pour assurer une utilisation appropriée et sécurisée de nos services.
            </Text>
            
            <View style={styles.conditionsList}>
              <View style={styles.conditionItem}>
                <View style={styles.conditionIcon}>
                  <MaterialCommunityIcons name="shield-check" size={24} color={BRAND_BLUE} />
                </View>
                <View style={styles.conditionContent}>
                  <Text style={styles.conditionTitle}>Respect des droits d'auteur</Text>
                  <Text style={styles.conditionSubtitle}>Protection de la propriété intellectuelle</Text>
                </View>
              </View>

              <View style={styles.conditionItem}>
                <View style={styles.conditionIcon}>
                  <MaterialCommunityIcons name="file-document-outline" size={24} color={BRAND_BLUE} />
                </View>
                <View style={styles.conditionContent}>
                  <Text style={styles.conditionTitle}>Utilisation appropriée des services</Text>
                  <Text style={styles.conditionSubtitle}>Règles d'utilisation et comportement</Text>
                </View>
              </View>

              <View style={styles.conditionItem}>
                <View style={styles.conditionIcon}>
                  <MaterialCommunityIcons name="lock" size={24} color={BRAND_BLUE} />
                </View>
                <View style={styles.conditionContent}>
                  <Text style={styles.conditionTitle}>Protection des données personnelles</Text>
                  <Text style={styles.conditionSubtitle}>Sécurité et confidentialité</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Informations Légales Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informations Légales</Text>
            
            <View style={styles.legalCards}>
              <Pressable style={styles.legalCard} onPress={() => toggleCard('privacy')}>
                <View style={styles.legalCardContent}>
                  <View style={styles.legalCardText}>
                    <Text style={styles.legalCardTitle}>Politique de confidentialité</Text>
                    <Text style={styles.legalCardSubtitle}>Comment nous protégeons vos données</Text>
                  </View>
                  <MaterialCommunityIcons 
                    name={expandedCards['privacy'] ? "chevron-up" : "chevron-down"} 
                    size={24} 
                    color={BRAND_GRAY} 
                  />
                </View>
                {expandedCards['privacy'] && (
                  <View style={styles.legalCardContent}>
                    <Text style={styles.legalCardBody}>
                      Nous nous engageons à protéger vos données personnelles. Toutes les informations que vous nous confiez sont stockées de manière sécurisée et ne sont jamais partagées avec des tiers sans votre consentement explicite. Nous utilisons des protocoles de chiffrement avancés et respectons strictement les normes RGPD.
                    </Text>
                  </View>
                )}
              </Pressable>

              <Pressable style={styles.legalCard} onPress={() => toggleCard('gdpr')}>
                <View style={styles.legalCardContent}>
                  <View style={styles.legalCardText}>
                    <Text style={styles.legalCardTitle}>RGPD</Text>
                    <Text style={styles.legalCardSubtitle}>Vos droits sur vos données</Text>
                  </View>
                  <MaterialCommunityIcons 
                    name={expandedCards['gdpr'] ? "chevron-up" : "chevron-down"} 
                    size={24} 
                    color={BRAND_GRAY} 
                  />
                </View>
                {expandedCards['gdpr'] && (
                  <View style={styles.legalCardContent}>
                    <Text style={styles.legalCardBody}>
                      Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez des droits suivants : accès à vos données, rectification, effacement, limitation du traitement, portabilité des données et opposition au traitement. Vous pouvez exercer ces droits en nous contactant.
                    </Text>
                  </View>
                )}
              </Pressable>

              <Pressable style={styles.legalCard} onPress={() => toggleCard('cookies')}>
                <View style={styles.legalCardContent}>
                  <View style={styles.legalCardText}>
                    <Text style={styles.legalCardTitle}>Cookies</Text>
                    <Text style={styles.legalCardSubtitle}>Gestion des cookies et traceurs</Text>
                  </View>
                  <MaterialCommunityIcons 
                    name={expandedCards['cookies'] ? "chevron-up" : "chevron-down"} 
                    size={24} 
                    color={BRAND_GRAY} 
                  />
                </View>
                {expandedCards['cookies'] && (
                  <View style={styles.legalCardContent}>
                    <Text style={styles.legalCardBody}>
                      Notre application utilise des cookies essentiels pour son bon fonctionnement. Ces cookies ne collectent aucune information personnelle et sont nécessaires pour vous offrir une expérience utilisateur optimale. Vous pouvez gérer vos préférences de cookies dans les paramètres de votre appareil.
                    </Text>
                  </View>
                )}
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </View>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#374151',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  section: {
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 15,
  },
  sectionDescription: {
    fontSize: 16,
    color: '#4B5563',
    lineHeight: 24,
    marginBottom: 25,
  },
  conditionsList: {
    gap: 20,
  },
  conditionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  conditionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  conditionContent: {
    flex: 1,
  },
  conditionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  conditionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  legalCards: {
    gap: 15,
  },
  legalCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  legalCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },
  legalCardText: {
    flex: 1,
  },
  legalCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  legalCardSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  legalCardBody: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    paddingTop: 0,
  },
});

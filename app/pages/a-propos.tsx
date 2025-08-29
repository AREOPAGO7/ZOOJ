import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import AppLayout from '../app-layout';

const BRAND_GRAY = "#6C6C6C";
const LIGHT_GRAY = "#F3F4F6";
const DARK_GRAY = "#374151";

export default function AProposPage() {
  const router = useRouter();

  const handleBack = () => {
    router.back();
  };

  const handleVersionInfo = () => {
    // Navigate to version details or show version information
    console.log('Version info clicked');
  };

  const handleTechnicalInfo = () => {
    // Navigate to technical information page
    console.log('Technical info clicked');
  };

  return (
    <AppLayout>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={handleBack}>
            <MaterialCommunityIcons name="chevron-left" size={24} color={BRAND_GRAY} />
          </Pressable>
          <Text style={styles.headerTitle}>A propos</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Main Content */}
        <View style={styles.mainContent}>
          {/* Application Logo */}
          <View style={styles.logoContainer}>
            <MaterialCommunityIcons name="github" size={80} color={DARK_GRAY} />
          </View>

          {/* Current Version */}
          <Text style={styles.currentVersion}>Version 2.1.0</Text>

          {/* Version Information Card */}
          <Pressable style={styles.infoCard} onPress={handleVersionInfo}>
            <MaterialCommunityIcons name="cellphone" size={24} color={DARK_GRAY} />
            <Text style={styles.cardText}>Version 2.0.1</Text>
          </Pressable>

          {/* Technical Information Card */}
          <Pressable style={styles.infoCard} onPress={handleTechnicalInfo}>
            <MaterialCommunityIcons name="file-document" size={24} color={DARK_GRAY} />
            <Text style={styles.cardText}>Informations techniques</Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color={BRAND_GRAY} />
          </Pressable>
        </View>
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
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: DARK_GRAY,
  },
  headerSpacer: {
    width: 40,
  },
  backButton: {
    padding: 8,
  },
  mainContent: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: 20,
  },
  logoContainer: {
    marginBottom: 20,
  },
  currentVersion: {
    fontSize: 16,
    color: BRAND_GRAY,
    marginBottom: 40,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: LIGHT_GRAY,
    borderRadius: 10,
    paddingVertical: 15,
    paddingHorizontal: 20,
    width: '100%',
    marginBottom: 15,
  },
  cardText: {
    flex: 1,
    fontSize: 16,
    color: DARK_GRAY,
    marginLeft: 15,
  },
});

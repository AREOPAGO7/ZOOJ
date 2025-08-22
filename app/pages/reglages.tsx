import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../lib/auth';
import { profileService } from '../../lib/profileService';
import AppLayout from '../app-layout';

export default function ReglagesPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/');
    }
  }, [user, loading, router]);

  // Load profile data
  useEffect(() => {
    if (user && !loading) {
      loadProfile();
    }
  }, [user, loading]);

  const loadProfile = async () => {
    try {
      const { data } = await profileService.getProfile(user!.id);
      setProfile(data);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setProfileLoading(false);
    }
  };

  // Show loading while checking auth
  if (loading || profileLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2DB6FF" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  // Don't render if not authenticated
  if (!user) {
    return null;
  }

  return (
    <AppLayout>
      <View style={styles.container}>
        <Text style={styles.title}>Réglages</Text>
        
        {profile && profile.completed ? (
          <>
            <Text style={styles.subtitle}>Personnalisez votre expérience</Text>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Profil</Text>
              <Text style={styles.sectionText}>Nom: {profile.name}</Text>
              <Text style={styles.sectionText}>Pays: {profile.country}</Text>
              <Text style={styles.sectionText}>Genre: {profile.gender === 'male' ? 'Homme' : profile.gender === 'female' ? 'Femme' : 'Autre'}</Text>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.subtitle}>Complétez votre profil pour accéder à toutes les fonctionnalités</Text>
            <View style={styles.incompleteSection}>
              <Text style={styles.incompleteText}>
                Votre profil n'est pas encore complet. Complétez-le pour accéder aux questions, au quiz et au calendrier.
              </Text>
              <Pressable
                onPress={() => router.replace('/')}
                style={styles.completeButton}
              >
                <Text style={styles.completeButtonText}>Compléter mon profil</Text>
              </Pressable>
            </View>
          </>
        )}
      </View>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 16,
    color: '#7A7A7A',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2D2D2D',
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#7A7A7A',
    textAlign: 'center',
    marginBottom: 24,
  },
  section: {
    backgroundColor: '#F8F9FA',
    padding: 20,
    borderRadius: 12,
    marginTop: 20,
    width: '100%',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D2D2D',
    marginBottom: 12,
  },
  sectionText: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 8,
  },
  incompleteSection: {
    backgroundColor: '#FEF3C7',
    padding: 20,
    borderRadius: 12,
    marginTop: 20,
    width: '100%',
    alignItems: 'center',
  },
  incompleteText: {
    fontSize: 16,
    color: '#92400E',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  completeButton: {
    backgroundColor: '#2DB6FF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  completeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import AppLayout from '../app-layout';

const BRAND_BLUE = "#2DB6FF";
const BRAND_PINK = "#F47CC6";
const BRAND_GRAY = "#6C6C6C";

export default function ConfidentialitePage() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useLanguage();
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
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Pressable style={styles.backButton} onPress={handleBack}>
            <MaterialCommunityIcons name="chevron-left" size={24} color={BRAND_GRAY} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('privacy.title')}</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Conditions d'utilisation Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('privacy.termsOfUse')}</Text>
            <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
              {t('privacy.termsDescription')}
            </Text>
            
            <View style={styles.conditionsList}>
              <View style={styles.conditionItem}>
                <View style={[styles.conditionIcon, { backgroundColor: colors.border }]}>
                  <MaterialCommunityIcons name="shield-check" size={24} color={BRAND_BLUE} />
                </View>
                <View style={styles.conditionContent}>
                  <Text style={[styles.conditionTitle, { color: colors.text }]}>{t('privacy.copyrightRespect')}</Text>
                  <Text style={[styles.conditionSubtitle, { color: colors.textSecondary }]}>{t('privacy.copyrightSubtitle')}</Text>
                </View>
              </View>

              <View style={styles.conditionItem}>
                <View style={[styles.conditionIcon, { backgroundColor: colors.border }]}>
                  <MaterialCommunityIcons name="file-document-outline" size={24} color={BRAND_BLUE} />
                </View>
                <View style={styles.conditionContent}>
                  <Text style={[styles.conditionTitle, { color: colors.text }]}>{t('privacy.appropriateUse')}</Text>
                  <Text style={[styles.conditionSubtitle, { color: colors.textSecondary }]}>{t('privacy.appropriateUseSubtitle')}</Text>
                </View>
              </View>

              <View style={styles.conditionItem}>
                <View style={[styles.conditionIcon, { backgroundColor: colors.border }]}>
                  <MaterialCommunityIcons name="lock" size={24} color={BRAND_BLUE} />
                </View>
                <View style={styles.conditionContent}>
                  <Text style={[styles.conditionTitle, { color: colors.text }]}>{t('privacy.dataProtection')}</Text>
                  <Text style={[styles.conditionSubtitle, { color: colors.textSecondary }]}>{t('privacy.dataProtectionSubtitle')}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Informations Légales Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('privacy.legalInformation')}</Text>
            
            <View style={styles.legalCards}>
              <Pressable style={[styles.legalCard, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => toggleCard('privacy')}>
                <View style={styles.legalCardContent}>
                  <View style={styles.legalCardText}>
                    <Text style={[styles.legalCardTitle, { color: colors.text }]}>{t('privacy.privacyPolicy')}</Text>
                    <Text style={[styles.legalCardSubtitle, { color: colors.textSecondary }]}>{t('privacy.privacyPolicySubtitle')}</Text>
                  </View>
                  <MaterialCommunityIcons 
                    name={expandedCards['privacy'] ? "chevron-up" : "chevron-down"} 
                    size={24} 
                    color={BRAND_GRAY} 
                  />
                </View>
                {expandedCards['privacy'] && (
                  <View style={styles.legalCardContent}>
                    <Text style={[styles.legalCardBody, { color: colors.textSecondary }]}>
                      {t('privacy.privacyPolicyContent')}
                    </Text>
                  </View>
                )}
              </Pressable>

              <Pressable style={[styles.legalCard, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => toggleCard('gdpr')}>
                <View style={styles.legalCardContent}>
                  <View style={styles.legalCardText}>
                    <Text style={[styles.legalCardTitle, { color: colors.text }]}>{t('privacy.gdpr')}</Text>
                    <Text style={[styles.legalCardSubtitle, { color: colors.textSecondary }]}>{t('privacy.gdprSubtitle')}</Text>
                  </View>
                  <MaterialCommunityIcons 
                    name={expandedCards['gdpr'] ? "chevron-up" : "chevron-down"} 
                    size={24} 
                    color={BRAND_GRAY} 
                  />
                </View>
                {expandedCards['gdpr'] && (
                  <View style={styles.legalCardContent}>
                    <Text style={[styles.legalCardBody, { color: colors.textSecondary }]}>
                      {t('privacy.gdprContent')}
                    </Text>
                  </View>
                )}
              </Pressable>

              <Pressable style={[styles.legalCard, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => toggleCard('cookies')}>
                <View style={styles.legalCardContent}>
                  <View style={styles.legalCardText}>
                    <Text style={[styles.legalCardTitle, { color: colors.text }]}>{t('privacy.cookies')}</Text>
                    <Text style={[styles.legalCardSubtitle, { color: colors.textSecondary }]}>{t('privacy.cookiesSubtitle')}</Text>
                  </View>
                  <MaterialCommunityIcons 
                    name={expandedCards['cookies'] ? "chevron-up" : "chevron-down"} 
                    size={24} 
                    color={BRAND_GRAY} 
                  />
                </View>
                {expandedCards['cookies'] && (
                  <View style={styles.legalCardContent}>
                    <Text style={[styles.legalCardBody, { color: colors.textSecondary }]}>
                      {t('privacy.cookiesContent')}
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
    // backgroundColor is now dynamic from theme
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    // borderBottomColor is now dynamic from theme
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    // color is now dynamic from theme
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
    // color is now dynamic from theme
    marginBottom: 15,
  },
  sectionDescription: {
    fontSize: 16,
    // color is now dynamic from theme
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
    // backgroundColor is now dynamic from theme
    justifyContent: 'center',
    alignItems: 'center',
  },
  conditionContent: {
    flex: 1,
  },
  conditionTitle: {
    fontSize: 16,
    fontWeight: '600',
    // color is now dynamic from theme
    marginBottom: 4,
  },
  conditionSubtitle: {
    fontSize: 14,
    // color is now dynamic from theme
  },
  legalCards: {
    gap: 15,
  },
  legalCard: {
    // backgroundColor is now dynamic from theme
    borderRadius: 12,
    borderWidth: 1,
    // borderColor is now dynamic from theme
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
    // color is now dynamic from theme
    marginBottom: 4,
  },
  legalCardSubtitle: {
    fontSize: 14,
    // color is now dynamic from theme
  },
  legalCardBody: {
    fontSize: 14,
    // color is now dynamic from theme
    lineHeight: 20,
    paddingTop: 0,
  },
});

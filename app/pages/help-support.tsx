import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLanguage } from '../../contexts/LanguageContext';
import AppLayout from '../app-layout';

const BRAND_PINK = "#F47CC6";
const BRAND_GRAY = "#6C6C6C";
const LIGHT_GRAY = "#F3F4F6";
const DARK_GRAY = "#374151";

export default function HelpSupportPage() {
  const router = useRouter();
  const { t } = useLanguage();

  const handleBack = () => {
    router.back();
  };

  const handleEmailContact = () => {
    // Open email client or copy email to clipboard
    console.log('Email contact clicked');
  };

  const handlePhoneContact = () => {
    // Open phone dialer or copy phone number to clipboard
    console.log('Phone contact clicked');
  };

  const handleFAQItem = (faqType: string) => {
    // Navigate to FAQ details or show answer
    console.log('FAQ clicked:', faqType);
  };

  return (
    <AppLayout>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={handleBack}>
            <MaterialCommunityIcons name="chevron-left" size={24} color={BRAND_GRAY} />
          </Pressable>
          <Text style={styles.headerTitle}>{t('helpSupport.title')}</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Main Content */}
        <View style={styles.mainContent}>
          {/* Contact Us Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('helpSupport.contactUs')}</Text>
            
            <Pressable style={styles.contactCard} onPress={handleEmailContact}>
              <MaterialCommunityIcons name="email-outline" size={24} color={BRAND_PINK} />
              <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>{t('helpSupport.byEmail')}</Text>
                <Text style={styles.contactDetail}>{t('helpSupport.emailAddress')}</Text>
              </View>
            </Pressable>

            <Pressable style={styles.contactCard} onPress={handlePhoneContact}>
              <MaterialCommunityIcons name="phone-outline" size={24} color={BRAND_PINK} />
              <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>{t('helpSupport.byPhone')}</Text>
                <Text style={styles.contactDetail}>{t('helpSupport.phoneNumber')}</Text>
              </View>
            </Pressable>
          </View>

          {/* FAQ Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('helpSupport.faq')}</Text>
            
            <Pressable style={styles.faqCard} onPress={() => handleFAQItem('payments')}>
              <MaterialCommunityIcons name="help-circle-outline" size={24} color={BRAND_PINK} />
              <Text style={styles.faqText}>{t('helpSupport.payments')}</Text>
              <MaterialCommunityIcons name="chevron-right" size={20} color={BRAND_GRAY} />
            </Pressable>

            <Pressable style={styles.faqCard} onPress={() => handleFAQItem('password')}>
              <MaterialCommunityIcons name="help-circle-outline" size={24} color={BRAND_PINK} />
              <Text style={styles.faqText}>{t('helpSupport.changePassword')}</Text>
              <MaterialCommunityIcons name="chevron-right" size={20} color={BRAND_GRAY} />
            </Pressable>

            <Pressable style={styles.faqCard} onPress={() => handleFAQItem('delete-account')}>
              <MaterialCommunityIcons name="help-circle-outline" size={24} color={BRAND_PINK} />
              <Text style={styles.faqText}>{t('helpSupport.deleteAccount')}</Text>
              <MaterialCommunityIcons name="chevron-right" size={20} color={BRAND_GRAY} />
            </Pressable>
          </View>

          {/* Company Address Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('helpSupport.ourAddress')}</Text>
            
            <View style={styles.addressCard}>
              <View style={styles.addressRow}>
                <MaterialCommunityIcons name="map-marker-outline" size={24} color={BRAND_PINK} />
                <View style={styles.addressInfo}>
                  <Text style={styles.addressLabel}>{t('helpSupport.companyName')}</Text>
                  <Text style={styles.addressDetail}>{t('helpSupport.streetAddress')}</Text>
                  <Text style={styles.addressDetail}>{t('helpSupport.cityAddress')}</Text>
                </View>
              </View>
              
              <View style={styles.addressRow}>
                <MaterialCommunityIcons name="clock-outline" size={24} color={BRAND_PINK} />
                <View style={styles.addressInfo}>
                  <Text style={styles.addressLabel}>{t('helpSupport.openingHours')}</Text>
                  <Text style={styles.addressDetail}>{t('helpSupport.weekdayHours')}</Text>
                  <Text style={styles.addressDetail}>{t('helpSupport.saturdayHours')}</Text>
                </View>
              </View>
            </View>
          </View>
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
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: DARK_GRAY,
    marginBottom: 15,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: LIGHT_GRAY,
    borderRadius: 10,
    paddingVertical: 15,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  contactInfo: {
    marginLeft: 15,
    flex: 1,
  },
  contactLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: DARK_GRAY,
    marginBottom: 2,
  },
  contactDetail: {
    fontSize: 14,
    color: BRAND_GRAY,
  },
  faqCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: LIGHT_GRAY,
    borderRadius: 10,
    paddingVertical: 15,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  faqText: {
    flex: 1,
    fontSize: 16,
    color: DARK_GRAY,
    marginLeft: 15,
  },
  addressCard: {
    backgroundColor: LIGHT_GRAY,
    borderRadius: 10,
    padding: 20,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  addressInfo: {
    marginLeft: 15,
    flex: 1,
  },
  addressLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: DARK_GRAY,
    marginBottom: 2,
  },
  addressDetail: {
    fontSize: 14,
    color: BRAND_GRAY,
    marginBottom: 1,
  },
});

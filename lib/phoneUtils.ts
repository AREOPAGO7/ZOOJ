import { Linking } from 'react-native';
import { supabase } from './supabase';

export const makePhoneCall = async (phoneNumber: string, serviceProviderId?: string, userId?: string) => {
  try {
    // Track the call attempt in service_stats table (non-blocking)
    if (serviceProviderId && userId) {
      // Use setTimeout to make tracking non-blocking
      setTimeout(async () => {
        try {
          const { error } = await supabase
            .from('service_stats')
            .insert({
              service_provider_id: serviceProviderId,
              user_id: userId,
              accessed_at: new Date().toISOString(),
              ip_address: null // We don't have access to IP in React Native
            });

          if (error) {
            console.error('Error tracking service call:', error);
          } else {
            console.log('Service call tracked successfully');
          }
        } catch (trackingError) {
          console.error('Error tracking service call:', trackingError);
        }
      }, 0);
    }

    // Remove any non-digit characters except + for international numbers
    const cleanNumber = phoneNumber.replace(/[^\d+]/g, '');
    
    // Add tel: prefix for phone calls
    const phoneUrl = `tel:${cleanNumber}`;
    
    // Check if we can open the URL
    const canOpen = await Linking.canOpenURL(phoneUrl);
    if (canOpen) {
      // Small delay to ensure UI state is properly set before opening phone app
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Open the phone app
      await Linking.openURL(phoneUrl);
    } else {
      console.error('Cannot open phone app');
      throw new Error('Cannot open phone app');
    }
  } catch (error) {
    console.error('Error making phone call:', error);
    throw error; // Re-throw to let the calling function handle it
  }
};

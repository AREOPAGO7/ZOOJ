import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

// ⬇️ Get these from your Supabase project settings (Project URL + anon key)
const SUPABASE_URL = 'https://uvdwymweuwfrzdqmhsjh.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2ZHd5bXdldXdmcnpkcW1oc2poIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwOTMxNDQsImV4cCI6MjA3MjY2OTE0NH0.9upekTjCGOSNUH0QyoCHE_TH4k34IznM_f4iSs2Rgb8'

// AsyncStorage adapter for React Native
const createAsyncStorageAdapter = () => {
  return {
    getItem: async (key) => {
      try {
        const value = await AsyncStorage.getItem(key)
        return value
      } catch (error) {
        console.warn('AsyncStorage getItem error:', error)
        return null
      }
    },
    setItem: async (key, value) => {
      try {
        await AsyncStorage.setItem(key, value)
      } catch (error) {
        console.warn('AsyncStorage setItem error:', error)
      }
    },
    removeItem: async (key) => {
      try {
        await AsyncStorage.removeItem(key)
      } catch (error) {
        console.warn('AsyncStorage removeItem error:', error)
      }
    }
  }
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    storage: createAsyncStorageAdapter()
  }
})
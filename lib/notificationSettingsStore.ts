import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

interface NotificationSettings {
  id: number;
  daily_questions: boolean;
  quiz_invite: boolean;
  pulse: boolean;
  upcoming_events: boolean;
  messages: boolean;
  sound_enabled: boolean;
}

interface NotificationSettingsStore {
  settings: NotificationSettings;
  isLoading: boolean;
  isInitialized: boolean;
  setSettings: (settings: NotificationSettings) => void;
  updateSetting: (field: keyof Omit<NotificationSettings, 'id'>, value: boolean) => void;
  toggleMasterSetting: (value: boolean) => void;
  toggleSoundSetting: (value: boolean) => void;
  setIsLoading: (loading: boolean) => void;
  initializeSettings: () => Promise<void>;
  saveSettingsToStorage: (settings: NotificationSettings) => Promise<void>;
  loadSettingsFromStorage: () => Promise<NotificationSettings | null>;
}

const defaultSettings: NotificationSettings = {
  id: 1,
  daily_questions: true,
  quiz_invite: true,
  pulse: true,
  upcoming_events: true,
  messages: true,
  sound_enabled: true,
};

const STORAGE_KEY = 'notification_settings';

export const useNotificationSettingsStore = create<NotificationSettingsStore>((set, get) => ({
  settings: defaultSettings,
  isLoading: false,
  isInitialized: false,
  
  setSettings: async (settings) => {
    set({ settings });
    // Save to AsyncStorage whenever settings change
    await get().saveSettingsToStorage(settings);
  },
  
  updateSetting: async (field, value) => {
    const currentSettings = get().settings;
    const newSettings = { ...currentSettings, [field]: value };
    set({ settings: newSettings });
    // Save to AsyncStorage
    await get().saveSettingsToStorage(newSettings);
  },
  
  toggleMasterSetting: async (value) => {
    const currentSettings = get().settings;
    const newSettings = {
      ...currentSettings,
      daily_questions: value,
      quiz_invite: value,
      pulse: value,
      upcoming_events: value,
      messages: value,
    };
    set({ settings: newSettings });
    // Save to AsyncStorage
    await get().saveSettingsToStorage(newSettings);
  },
  
  toggleSoundSetting: async (value) => {
    const currentSettings = get().settings;
    const newSettings = { ...currentSettings, sound_enabled: value };
    set({ settings: newSettings });
    // Save to AsyncStorage
    await get().saveSettingsToStorage(newSettings);
  },
  
  setIsLoading: (loading) => set({ isLoading: loading }),
  
  // Save settings to AsyncStorage
  saveSettingsToStorage: async (settings) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      console.log('📱 Settings saved to AsyncStorage:', settings);
    } catch (error) {
      console.error('Error saving settings to AsyncStorage:', error);
    }
  },
  
  // Load settings from AsyncStorage
  loadSettingsFromStorage: async () => {
    try {
      const storedSettings = await AsyncStorage.getItem(STORAGE_KEY);
      if (storedSettings) {
        const parsedSettings = JSON.parse(storedSettings);
        console.log('📱 Settings loaded from AsyncStorage:', parsedSettings);
        return parsedSettings;
      }
      return null;
    } catch (error) {
      console.error('Error loading settings from AsyncStorage:', error);
      return null;
    }
  },
  
  // Initialize settings on app start
  initializeSettings: async () => {
    const { isLoading, isInitialized } = get();
    
    // Don't initialize if already initialized or currently loading
    if (isInitialized || isLoading) return;
    
    set({ isLoading: true });
    
    try {
      // Try to load from AsyncStorage first
      const storedSettings = await get().loadSettingsFromStorage();
      
      if (storedSettings) {
        // Use stored settings
        set({ settings: storedSettings, isInitialized: true });
        console.log('📱 Using stored notification settings');
      } else {
        // Use default settings and save them
        set({ settings: defaultSettings, isInitialized: true });
        await get().saveSettingsToStorage(defaultSettings);
        console.log('📱 Using default notification settings');
      }
    } catch (error) {
      console.error('Error initializing notification settings:', error);
      // Fallback to default settings
      set({ settings: defaultSettings, isInitialized: true });
    } finally {
      set({ isLoading: false });
    }
  },
}));

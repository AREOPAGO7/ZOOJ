import { supabase } from './supabase';

export interface UserMood {
  user_id: string;
  user_name: string;
  user_avatar?: string;
  mood_type: 'joyeux' | 'content' | 'neutre' | 'triste' | 'enerve';
  mood_emoji: string;
  mood_label: string;
  updated_at: string;
}

export const moodService = {
  // Get mood emoji and label
  getMoodInfo(moodType: string): { emoji: string; label: string } {
    const moodMap = {
      joyeux: { emoji: '😊', label: 'Joyeux' },
      content: { emoji: '🙂', label: 'Content' },
      neutre: { emoji: '😐', label: 'Neutre' },
      triste: { emoji: '😢', label: 'Triste' },
      enerve: { emoji: '😠', label: 'Énervé' }
    };
    return moodMap[moodType as keyof typeof moodMap] || { emoji: '😐', label: 'Neutre' };
  },

  // Get current user's mood from profiles table
  async getCurrentUserMood(userId: string): Promise<{ data: { mood: string } | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('mood')
        .eq('id', userId)
        .single();

      return { data, error };
    } catch (error) {
      console.error('Error getting current user mood:', error);
      return { data: null, error };
    }
  },

  // Set user's mood in profiles table
  async setUserMood(userId: string, moodType: 'joyeux' | 'content' | 'neutre' | 'triste' | 'enerve'): Promise<{ data: { mood: string } | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ 
          mood: moodType
        })
        .eq('id', userId)
        .select('mood')
        .single();

      return { data, error };
    } catch (error) {
      console.error('Error setting user mood:', error);
      return { data: null, error };
    }
  },

  // Get couple's moods (both users) from profiles table
  async getCoupleMoods(userId: string): Promise<{ data: UserMood[] | null; error: any }> {
    try {
      // First, find the couple
      const { data: couple, error: coupleError } = await supabase
        .from('couples')
        .select('user1_id, user2_id')
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
        .single();

      if (coupleError || !couple) {
        console.error('Error finding couple:', coupleError);
        return { data: null, error: coupleError };
      }

      // Get both users' profiles with mood
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, profile_picture, mood, created_at')
        .in('id', [couple.user1_id, couple.user2_id]);

      if (profilesError) {
        console.error('Error getting couple profiles:', profilesError);
        return { data: null, error: profilesError };
      }

      // Process and format the data
      const userMoods: UserMood[] = [];

      for (const profile of profiles || []) {
        const moodInfo = this.getMoodInfo(profile.mood || 'neutre');
        userMoods.push({
          user_id: profile.id,
          user_name: profile.name || 'Utilisateur',
          user_avatar: profile.profile_picture,
          mood_type: profile.mood || 'neutre',
          mood_emoji: moodInfo.emoji,
          mood_label: moodInfo.label,
          updated_at: profile.created_at || new Date().toISOString()
        });
      }

      return { data: userMoods, error: null };
    } catch (error) {
      console.error('Error getting couple moods:', error);
      return { data: null, error };
    }
  },

  // Get user's mood history (not applicable with profiles table approach)
  async getUserMoodHistory(userId: string, days: number = 7): Promise<{ data: any[] | null; error: any }> {
    // Since mood is now a field in profiles, we don't have historical data
    // This function is kept for compatibility but returns current mood only
    try {
      const { data, error } = await this.getCurrentUserMood(userId);
      return { data: data ? [data] : null, error };
    } catch (error) {
      console.error('Error getting user mood history:', error);
      return { data: null, error };
    }
  }
};

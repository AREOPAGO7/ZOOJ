import { supabase } from './supabase';

export interface Pulse {
  id: string;
  sender_id: string;
  receiver_id: string;
  emoji: string;
  message?: string;
  created_at: string;
  expires_at: string;
  is_read: boolean;
}

export interface PulseWithSender {
  id: string;
  sender_id: string;
  receiver_id: string;
  emoji: string;
  message?: string;
  created_at: string;
  expires_at: string;
  is_read: boolean;
  sender_name: string;
  sender_avatar?: string;
}

export const pulseService = {
  // Send a pulse to partner
  async sendPulse(userId: string, emoji: string, message?: string): Promise<{ data: Pulse | null; error: any }> {
    try {
      // First, find the partner
      const { data: couple, error: coupleError } = await supabase
        .from('couples')
        .select('user1_id, user2_id')
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
        .single();

      if (coupleError || !couple) {
        console.error('Error finding couple:', coupleError);
        return { data: null, error: coupleError };
      }

      // Determine the receiver (partner)
      const receiverId = couple.user1_id === userId ? couple.user2_id : couple.user1_id;

      if (!receiverId) {
        console.error('No partner found');
        return { data: null, error: 'No partner found' };
      }

      // Create the pulse
      const { data, error } = await supabase
        .from('pulses')
        .insert({
          sender_id: userId,
          receiver_id: receiverId,
          emoji,
          message,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours from now
        })
        .select()
        .single();

      if (error) {
        console.error('Error sending pulse:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error sending pulse:', error);
      return { data: null, error };
    }
  },

  // Get latest pulse received by user (not expired)
  async getLatestReceivedPulse(userId: string): Promise<{ data: PulseWithSender | null; error: any }> {
    try {
      // First get the pulse
      const { data: pulse, error: pulseError } = await supabase
        .from('pulses')
        .select('*')
        .eq('receiver_id', userId)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (pulseError && pulseError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        console.error('Error getting latest pulse:', pulseError);
        return { data: null, error: pulseError };
      }

      if (!pulse) {
        return { data: null, error: null };
      }

      // Then get the sender's profile
      const { data: senderProfile, error: profileError } = await supabase
        .from('profiles')
        .select('name, profile_picture')
        .eq('id', pulse.sender_id)
        .single();

      if (profileError) {
        console.error('Error getting sender profile:', profileError);
        // Continue anyway, we'll use default values
      }

      // Format the data
      const pulseWithSender: PulseWithSender = {
        ...pulse,
        sender_name: senderProfile?.name || 'Partenaire',
        sender_avatar: senderProfile?.profile_picture
      };

      return { data: pulseWithSender, error: null };
    } catch (error) {
      console.error('Error getting latest pulse:', error);
      return { data: null, error };
    }
  },

  // Mark pulse as read
  async markPulseAsRead(pulseId: string, userId: string): Promise<{ data: Pulse | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('pulses')
        .update({ is_read: true })
        .eq('id', pulseId)
        .eq('receiver_id', userId)
        .select()
        .single();

      if (error) {
        console.error('Error marking pulse as read:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error marking pulse as read:', error);
      return { data: null, error };
    }
  },

  // Get all pulses for user (sent and received, not expired)
  async getUserPulses(userId: string): Promise<{ data: PulseWithSender[] | null; error: any }> {
    try {
      // First get all pulses
      const { data: pulses, error: pulsesError } = await supabase
        .from('pulses')
        .select('*')
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (pulsesError) {
        console.error('Error getting user pulses:', pulsesError);
        return { data: null, error: pulsesError };
      }

      if (!pulses || pulses.length === 0) {
        return { data: [], error: null };
      }

      // Get all unique sender IDs
      const senderIds = [...new Set(pulses.map(pulse => pulse.sender_id))];

      // Get all sender profiles in one query
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, profile_picture')
        .in('id', senderIds);

      if (profilesError) {
        console.error('Error getting sender profiles:', profilesError);
      }

      // Create a map of sender profiles
      const profilesMap = new Map();
      if (profiles) {
        profiles.forEach(profile => {
          profilesMap.set(profile.id, profile);
        });
      }

      // Format the data
      const pulsesWithSender: PulseWithSender[] = pulses.map(pulse => {
        const senderProfile = profilesMap.get(pulse.sender_id);
        return {
          ...pulse,
          sender_name: senderProfile?.name || 'Partenaire',
          sender_avatar: senderProfile?.profile_picture
        };
      });

      return { data: pulsesWithSender, error: null };
    } catch (error) {
      console.error('Error getting user pulses:', error);
      return { data: null, error };
    }
  },

  // Clean up expired pulses (can be called periodically)
  async cleanupExpiredPulses(): Promise<{ data: any; error: any }> {
    try {
      const { data, error } = await supabase
        .from('pulses')
        .delete()
        .lt('expires_at', new Date().toISOString());

      if (error) {
        console.error('Error cleaning up expired pulses:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error cleaning up expired pulses:', error);
      return { data: null, error };
    }
  }
};

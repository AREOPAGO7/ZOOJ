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

export interface PulseWithSender extends Pulse {
  sender_name: string;
  sender_avatar?: string;
}

export class PulseService {
  private subscriptions: Map<string, any> = new Map();

  // Send a pulse to partner
  async sendPulse(userId: string, emoji: string, message?: string): Promise<{ data: Pulse | null; error: any }> {
    try {
      // Find the partner
      const { data: couple, error: coupleError } = await supabase
        .from('couples')
        .select('user1_id, user2_id')
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
        .single();

      if (coupleError || !couple) {
        return { data: null, error: coupleError };
      }

      const receiverId = couple.user1_id === userId ? couple.user2_id : couple.user1_id;
      if (!receiverId) {
        return { data: null, error: 'No partner found' };
      }

      // Create pulse with 24-hour expiration
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      const pulseData = {
        sender_id: userId,
        receiver_id: receiverId,
        emoji,
        message,
        expires_at: expiresAt.toISOString(),
        is_read: false
      };

      const { data, error } = await supabase
        .from('pulses')
        .insert(pulseData)
        .select()
        .single();

      if (error) {
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Get latest unread pulse for user
  async getLatestUnreadPulse(userId: string): Promise<{ data: PulseWithSender | null; error: any }> {
    try {
      // Get latest unread pulse
      const { data: pulse, error: pulseError } = await supabase
        .from('pulses')
        .select('*')
        .eq('receiver_id', userId)
        .eq('is_read', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (pulseError) {
        return { data: null, error: pulseError };
      }

      if (!pulse) {
        return { data: null, error: null };
      }

      // Get sender profile
      const { data: senderProfile, error: profileError } = await supabase
        .from('profiles')
        .select('name, profile_picture')
        .eq('id', pulse.sender_id)
        .single();

      const pulseWithSender: PulseWithSender = {
        ...pulse,
        sender_name: senderProfile?.name || 'Partenaire',
        sender_avatar: senderProfile?.profile_picture
      };

      return { data: pulseWithSender, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

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
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Subscribe to real-time pulse updates
  subscribeToPulses(userId: string, onPulseReceived: (pulse: PulseWithSender | null) => void): string {
    const channelName = `pulses_${userId}`;
    
    // Remove existing subscription if any
    this.unsubscribeFromPulses(userId);

    const subscription = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'pulses',
          filter: `receiver_id=eq.${userId}`
        },
        async (payload) => {
          // Fetch the latest unread pulse
          const { data, error } = await this.getLatestUnreadPulse(userId);
          if (!error && data) {
            onPulseReceived(data);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'pulses',
          filter: `receiver_id=eq.${userId}`
        },
        async (payload) => {
          // Fetch the latest unread pulse
          const { data, error } = await this.getLatestUnreadPulse(userId);
          if (!error && data) {
            onPulseReceived(data);
          }
        }
      )
      .subscribe();

    this.subscriptions.set(userId, subscription);
    return channelName;
  }

  // Unsubscribe from real-time updates
  unsubscribeFromPulses(userId: string): void {
    const subscription = this.subscriptions.get(userId);
    if (subscription) {
      supabase.removeChannel(subscription);
      this.subscriptions.delete(userId);
    }
  }

  // Clean up expired pulses
  async cleanupExpiredPulses(): Promise<{ data: any; error: any }> {
    try {
      const { data, error } = await supabase
        .from('pulses')
        .delete()
        .lt('expires_at', new Date().toISOString());

      if (error) {
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Get all pulses for user
  async getAllPulses(userId: string): Promise<{ data: Pulse[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('pulses')
        .select('*')
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (error) {
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Delete a specific pulse
  async deletePulse(pulseId: string): Promise<{ data: any; error: any }> {
    try {
      const { data, error } = await supabase
        .from('pulses')
        .delete()
        .eq('id', pulseId);

      if (error) {
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

}

// Export singleton instance
export const pulseService = new PulseService();

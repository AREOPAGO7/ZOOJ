import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { PulseWithSender, pulseService } from '../lib/pulseService';

interface ReceivedPulseProps {
  userId: string;
}

export const ReceivedPulse: React.FC<ReceivedPulseProps> = ({ userId }) => {
  const [latestPulse, setLatestPulse] = useState<PulseWithSender | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch latest pulse
  const fetchLatestPulse = async () => {
    if (!userId) return;
    
    setIsLoading(true);
    try {
      console.log('Fetching latest pulse for user:', userId);
      const { data, error } = await pulseService.getLatestReceivedPulse(userId);
      if (error) {
        console.error('Error fetching latest pulse:', error);
        return;
      }
      
      console.log('Latest pulse data:', data);
      
      // Only show if we have a new pulse and we're not already showing one
      if (data && !data.is_read && !isVisible) {
        console.log('Setting pulse as visible:', data);
        setLatestPulse(data);
        setIsVisible(true);
      } else if (!data || data.is_read) {
        console.log('No unread pulse found or already showing');
        setIsVisible(false);
        setLatestPulse(null);
      }
    } catch (error) {
      console.error('Error fetching latest pulse:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Mark pulse as read and hide it
  const handlePulsePress = async () => {
    if (!latestPulse) return;
    
    try {
      // Mark as read and hide immediately
      setIsVisible(false);
      setLatestPulse(null);
      
      // Mark as read in database
      await pulseService.markPulseAsRead(latestPulse.id, userId);
      
      // Provide haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.error('Error marking pulse as read:', error);
    }
  };

  // Auto-hide pulse after 3 seconds and prevent multiple displays
  useEffect(() => {
    if (latestPulse && isVisible) {
      const timer = setTimeout(() => {
        console.log('Auto-hiding pulse after 3 seconds');
        setIsVisible(false);
        setLatestPulse(null);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [latestPulse, isVisible]);

  // Prevent multiple pulses from showing - only show the latest one
  useEffect(() => {
    if (latestPulse && !latestPulse.is_read) {
      // Mark as read immediately to prevent showing again
      pulseService.markPulseAsRead(latestPulse.id, userId);
      setIsVisible(true);
    }
  }, [latestPulse, userId]);

  // Fetch pulse on mount and set up interval
  useEffect(() => {
    fetchLatestPulse();
    
    // Check for new pulses every 10 seconds (more frequent)
    const interval = setInterval(fetchLatestPulse, 10000);
    
    return () => clearInterval(interval);
  }, [userId]);

  // Also fetch when component becomes visible
  useEffect(() => {
    if (userId) {
      fetchLatestPulse();
    }
  }, [userId]);

  // Debug: Log the state
  console.log('ReceivedPulse state:', { isVisible, latestPulse, userId });

  // Only show unread pulses
  const shouldShow = latestPulse && !latestPulse.is_read;

  if (!shouldShow) {
    return null;
  }

  const getPulseMessage = (emoji: string) => {
    const messageMap: { [key: string]: string } = {
      '🌸': 'vous a envoyé une fleur',
      '💘': 'pense à vous avec amour',
      '😄': 'est de bonne humeur',
      '😈': 'a une idée coquine',
      '💨': 'vous envoie un petit vent'
    };
    return messageMap[emoji] || 'vous a envoyé un pulse';
  };

  const getTimeAgo = (createdAt: string) => {
    const now = new Date();
    const created = new Date(createdAt);
    const diffInMinutes = Math.floor((now.getTime() - created.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'À l\'instant';
    if (diffInMinutes < 60) return `Il y a ${diffInMinutes} min`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `Il y a ${diffInHours}h`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `Il y a ${diffInDays}j`;
  };

  return (
    <Pressable 
      style={styles.container}
      onPress={handlePulsePress}
    >
      <View style={styles.pulseCard}>
        <View style={styles.pulseHeader}>
          <View style={styles.senderInfo}>
            {latestPulse.sender_avatar ? (
              <Image source={{ uri: latestPulse.sender_avatar }} style={styles.senderAvatar} />
            ) : (
              <View style={styles.senderAvatarPlaceholder}>
                <MaterialCommunityIcons name="account" size={20} color="#666" />
              </View>
            )}
            <Text style={styles.senderName}>{latestPulse.sender_name}</Text>
          </View>
          <Text style={styles.timeAgo}>{getTimeAgo(latestPulse.created_at)}</Text>
        </View>
        
        <View style={styles.pulseContent}>
          <Text style={styles.pulseEmoji}>{latestPulse.emoji}</Text>
          <Text style={styles.pulseMessage}>
            {getPulseMessage(latestPulse.emoji)}
          </Text>
        </View>
        
        {latestPulse.message && (
          <Text style={styles.pulseText}>{latestPulse.message}</Text>
        )}
        
                 <View style={styles.footer}>
           <Text style={styles.tapToRead}>Appuyez pour marquer comme lu • Disparaît dans 3s</Text>
         </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    zIndex: 1000,
  },
  pulseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  pulseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  senderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  senderAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  senderAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  senderName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D2D2D',
  },
  timeAgo: {
    fontSize: 12,
    color: '#7A7A7A',
  },
  pulseContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  pulseEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  pulseMessage: {
    fontSize: 16,
    color: '#2D2D2D',
    flex: 1,
  },
  pulseText: {
    fontSize: 14,
    color: '#7A7A7A',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  footer: {
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  tapToRead: {
    fontSize: 12,
    color: '#7A7A7A',
  },
});

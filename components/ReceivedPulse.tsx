import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { PulseWithSender, pulseService } from '../lib/pulseService';

interface ReceivedPulseProps {
  userId: string;
}

export const ReceivedPulse: React.FC<ReceivedPulseProps> = ({ userId }) => {
  const [currentPulse, setCurrentPulse] = useState<PulseWithSender | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch latest unread pulse
  const fetchLatestPulse = async () => {
    if (!userId) return;

    setIsLoading(true);
    try {
      const { data, error } = await pulseService.getLatestUnreadPulse(userId);
      
      if (error) {
        return;
      }

      if (data && !isVisible) {
        setCurrentPulse(data);
        setIsVisible(true);
      } else if (!data) {
        setIsVisible(false);
        setCurrentPulse(null);
      }
    } catch (error) {
      // Silent error handling
    } finally {
      setIsLoading(false);
    }
  };

  // Handle pulse press (mark as read and hide)
  const handlePulsePress = async () => {
    if (!currentPulse) return;

    try {
      // Hide immediately for better UX
      setIsVisible(false);
      setCurrentPulse(null);
      
      // Mark as read in database
      await pulseService.markPulseAsRead(currentPulse.id, userId);
      
      // Provide haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      // Silent error handling
    }
  };

  // Auto-hide pulse after 5 seconds
  useEffect(() => {
    if (currentPulse && isVisible) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setCurrentPulse(null);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [currentPulse, isVisible]);

  // Set up real-time subscription and initial fetch
  useEffect(() => {
    if (!userId) return;

    // Initial fetch
    fetchLatestPulse();

    // Set up real-time subscription
    pulseService.subscribeToPulses(userId, (newPulse) => {
      if (newPulse && !isVisible) {
        setCurrentPulse(newPulse);
        setIsVisible(true);
      }
    });

    // Fallback polling every 30 seconds
    const interval = setInterval(() => {
      fetchLatestPulse();
    }, 30000);

    return () => {
      clearInterval(interval);
      pulseService.unsubscribeFromPulses(userId);
    };
  }, [userId]);

  // Don't render if no pulse or not visible
  if (!currentPulse || !isVisible) {
    return null;
  }

  const getPulseMessage = (emoji: string) => {
    const messageMap: { [key: string]: string } = {
      '🌸': 'vous a envoyé une fleur',
      '💘': 'pense à vous avec amour',
      '😄': 'est de bonne humeur',
      '😈': 'a une idée coquine',
      '💨': 'vous envoie un petit vent',
      '❤️': 'vous envoie de l\'amour',
      '🔥': 'vous envoie de la passion',
      '😘': 'vous envoie un bisou',
      '🤗': 'vous fait un câlin',
      '💕': 'vous envoie des cœurs'
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
            {currentPulse.sender_avatar ? (
              <Image source={{ uri: currentPulse.sender_avatar }} style={styles.senderAvatar} />
            ) : (
              <View style={styles.senderAvatarPlaceholder}>
                <MaterialCommunityIcons name="account" size={20} color="#666" />
              </View>
            )}
            <Text style={styles.senderName}>{currentPulse.sender_name}</Text>
          </View>
          <Text style={styles.timeAgo}>{getTimeAgo(currentPulse.created_at)}</Text>
        </View>
        
        <View style={styles.pulseContent}>
          <Text style={styles.pulseEmoji}>{currentPulse.emoji}</Text>
          <Text style={styles.pulseMessage}>
            {getPulseMessage(currentPulse.emoji)}
          </Text>
        </View>
        
        {currentPulse.message && (
          <Text style={styles.pulseText}>{currentPulse.message}</Text>
        )}
        
        <View style={styles.footer}>
          <Text style={styles.tapToRead}>Appuyez pour marquer comme lu • Disparaît dans 5s</Text>
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

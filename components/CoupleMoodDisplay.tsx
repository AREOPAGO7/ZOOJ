import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { UserMood } from '../lib/moodService';

interface CoupleMoodDisplayProps {
  coupleMoods: UserMood[];
  currentUserId: string;
  onMoodPress?: () => void;
}

export const CoupleMoodDisplay: React.FC<CoupleMoodDisplayProps> = ({
  coupleMoods,
  currentUserId,
  onMoodPress
}) => {
  const { colors } = useTheme();

  const currentUserMood = coupleMoods.find(mood => mood.user_id === currentUserId);
  const partnerMood = coupleMoods.find(mood => mood.user_id !== currentUserId);



  return (
    <View style={styles.container}>

             <View style={styles.profilesContainer}>
         {/* Partner Profile (Left) */}
         {partnerMood && (
           <View style={[styles.profileContainer, { marginRight: 0, zIndex: 1 }]}>
             <View style={[styles.profilePictureContainer, { borderColor: '#4A90E2' }]}>
               {partnerMood.user_avatar ? (
                 <Image source={{ uri: partnerMood.user_avatar }} style={styles.profilePicture} />
               ) : (
                 <View style={styles.profilePicturePlaceholder}>
                   <MaterialCommunityIcons name="account" size={60} color="#666" />
                 </View>
               )}
               <View style={[styles.moodEmojiOverlay, { backgroundColor: '#FFD700' },{zIndex: 100}]}>
                 <Text style={[styles.moodEmoji,{zIndex: 100 , position: 'absolute'}]}>{partnerMood.mood_emoji}</Text>
               </View>
             </View>
           </View>
         )}

         {/* Current User Profile (Right) - Slightly on top */}
         <Pressable onPress={onMoodPress} style={({ pressed }) => [
           styles.profileContainer,
           { marginLeft: -20, zIndex: 2, marginTop: -10 },
           pressed && { opacity: 0.7 }
         ]}>
           <View style={[styles.profilePictureContainer, { borderColor: '#FF69B4' }]}>
             {currentUserMood?.user_avatar ? (
               <Image source={{ uri: currentUserMood.user_avatar }} style={styles.profilePicture} />
             ) : (
               <View style={styles.profilePicturePlaceholder}>
                 <MaterialCommunityIcons name="account" size={60} color="#666" />
               </View>
             )}
             {currentUserMood && (
               <View style={[styles.moodEmojiOverlay, { backgroundColor: '#FFD700' }]}>
                 <Text style={styles.moodEmoji}>{currentUserMood.mood_emoji}</Text>
               </View>
             )}
           </View>
         </Pressable>
       </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D2D2D',
    marginBottom: 20,
    textAlign: 'center',
  },
  profilesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  profileContainer: {
    alignItems: 'center',
    position: 'relative',
  },
  profilePictureContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    position: 'relative',
  },
  profilePicture: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  profilePicturePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
  },
  moodEmojiOverlay: {
    position: 'absolute',
    bottom: 7,
    right: 7,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
    zIndex: 10,
  },
  moodEmoji: {
    fontSize: 20,
    lineHeight: 20,
    position: 'absolute',   
    top: 3,
    left: 0,
    right: 0,
    bottom: 0,
    textAlign: 'center',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

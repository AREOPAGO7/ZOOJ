import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

interface MoodOption {
  type: 'joyeux' | 'content' | 'neutre' | 'triste' | 'enerve';
  emoji: string;
  label: string;
}

interface MoodSelectorProps {
  visible: boolean;
  onClose: () => void;
  onSelectMood: (moodType: 'joyeux' | 'content' | 'neutre' | 'triste' | 'enerve') => void;
  currentMood?: string;
}

const moodOptions: MoodOption[] = [
  { type: 'joyeux', emoji: '😊', label: 'Joyeux' },
  { type: 'content', emoji: '🙂', label: 'Content' },
  { type: 'neutre', emoji: '😐', label: 'Neutre' },
  { type: 'triste', emoji: '😢', label: 'Triste' },
  { type: 'enerve', emoji: '😠', label: 'Énervé' }
];

export const MoodSelector: React.FC<MoodSelectorProps> = ({
  visible,
  onClose,
  onSelectMood,
  currentMood
}) => {
  const { colors } = useTheme();
  const [selectedMood, setSelectedMood] = useState<string | undefined>(currentMood);

  const handleMoodSelect = (moodType: 'joyeux' | 'content' | 'neutre' | 'triste' | 'enerve') => {
    setSelectedMood(moodType);
    onSelectMood(moodType);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>
              Comment vous sentez-vous ?
            </Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Text style={[styles.closeButtonText, { color: colors.textSecondary }]}>✕</Text>
            </Pressable>
          </View>

          {/* Mood Options */}
          <View style={styles.moodOptionsContainer}>
            {moodOptions.map((option) => (
              <Pressable
                key={option.type}
                style={[
                  styles.moodOption,
                  selectedMood === option.type && styles.selectedMoodOption
                ]}
                onPress={() => handleMoodSelect(option.type)}
              >
                <Text style={styles.moodEmoji}>{option.emoji}</Text>
                <Text style={[
                  styles.moodLabel,
                  { color: colors.text },
                  selectedMood === option.type && { color: colors.primary }
                ]}>
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 350,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  moodOptionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 20,
    backgroundColor: '#F8F0FF',
    borderRadius: 12,
  },
  moodOption: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
    minWidth: 50,
  },
  selectedMoodOption: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  moodEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  moodLabel: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
});

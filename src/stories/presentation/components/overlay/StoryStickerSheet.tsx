// Description: Bottom sheet of emoji stickers for the story editor.
import React from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { StoryEditorCopy } from './storyEditorCopy';

const STORY_STICKER_EMOJIS = [
  '😀', '😂', '😍', '🥰', '😎', '🤩',
  '😭', '😡', '🥳', '😴', '🤔', '🙏',
  '👏', '👍', '💪', '🔥', '✨', '🎉',
  '❤️', '💯', '🌟', '🌈', '☀️', '🌙',
  '🍀', '🌸', '🌺', '💐', '🍕', '🍔',
  '☕', '🍰', '🎂', '🎁', '🎵', '📸',
  '✈️', '🏖️', '⚽', '🐶', '🐱', '🚀',
];
const COLUMNS = 6;

export function StoryStickerSheet({
  visible,
  copy,
  onPick,
  onClose,
}: {
  visible: boolean;
  copy: StoryEditorCopy;
  onPick: (emoji: string) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.handle} />
        <Text style={styles.title}>{copy.stickerTitle}</Text>
        <FlatList
          data={STORY_STICKER_EMOJIS}
          numColumns={COLUMNS}
          keyExtractor={emoji => emoji}
          renderItem={({ item: emoji }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={emoji}
              onPress={() => onPick(emoji)}
              style={({ pressed }) => [styles.cell, pressed && styles.cellPressed]}
            >
              <Text style={styles.emoji}>{emoji}</Text>
            </Pressable>
          )}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  sheet: {
    maxHeight: '55%',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    backgroundColor: '#18181B',
    paddingHorizontal: 12,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginTop: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    marginVertical: 12,
  },
  cell: {
    flex: 1 / COLUMNS,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  cellPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  emoji: {
    fontSize: 34,
  },
});

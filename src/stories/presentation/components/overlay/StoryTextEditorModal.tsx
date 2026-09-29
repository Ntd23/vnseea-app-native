// Description: Full-screen text entry for a story text item, with colour and background style.
import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { STORY_OVERLAY_MAX_TEXT_LENGTH } from '../../../application/overlay/storyOverlay';
import { APP_COLORS } from '../../../../shared-kernel/presentation/theme/appColors';
import type { StoryTextStyle } from '../../../domain/types/stories.types';
import { contrastingTextColor } from './StoryOverlayItemView';
import type { StoryEditorCopy } from './storyEditorCopy';

export const STORY_TEXT_COLORS = [
  '#FFFFFF',
  '#000000',
  '#EF4444',
  '#F97316',
  '#FACC15',
  '#22C55E',
  '#06B6D4',
  APP_COLORS.status.info,
  '#8B5CF6',
  '#EC4899',
];
const TEXT_STYLE_ORDER: StoryTextStyle[] = ['plain', 'solid', 'soft'];

export type StoryTextValue = {
  text: string;
  color: string;
  textStyle: StoryTextStyle;
};

const DEFAULT_TEXT_VALUE: StoryTextValue = {
  text: '',
  color: '#FFFFFF',
  textStyle: 'plain',
};

export function StoryTextEditorModal({
  visible,
  initialValue,
  copy,
  onDone,
}: {
  visible: boolean;
  initialValue?: StoryTextValue;
  copy: StoryEditorCopy;
  /** Receives the edited value; an empty text means "remove / add nothing". */
  onDone: (value: StoryTextValue) => void;
}) {
  const insets = useSafeAreaInsets();
  const [value, setValue] = useState<StoryTextValue>(DEFAULT_TEXT_VALUE);

  useEffect(() => {
    if (visible) setValue(initialValue ?? DEFAULT_TEXT_VALUE);
  }, [initialValue, visible]);

  const isSolid = value.textStyle === 'solid';
  const isSoft = value.textStyle === 'soft';
  const finish = () => onDone({ ...value, text: value.text.trim() });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={finish}
    >
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.textStyle}
            onPress={() =>
              setValue(current => ({
                ...current,
                textStyle:
                  TEXT_STYLE_ORDER[
                    (TEXT_STYLE_ORDER.indexOf(current.textStyle) + 1) %
                      TEXT_STYLE_ORDER.length
                  ],
              }))
            }
            style={[styles.styleButton, (isSolid || isSoft) && styles.styleButtonActive]}
          >
            <Text style={[styles.styleButtonText, (isSolid || isSoft) && styles.styleButtonTextActive]}>
              Aa
            </Text>
          </Pressable>
          <Pressable onPress={finish} hitSlop={10}>
            <Text style={styles.doneText}>{copy.done}</Text>
          </Pressable>
        </View>

        <Pressable style={styles.inputArea} onPress={finish}>
          <View
            style={[
              styles.inputBox,
              isSolid && { backgroundColor: value.color },
              isSoft && styles.inputBoxSoft,
            ]}
          >
            <TextInput
              autoFocus
              multiline
              value={value.text}
              onChangeText={text => setValue(current => ({ ...current, text }))}
              maxLength={STORY_OVERLAY_MAX_TEXT_LENGTH}
              placeholder={copy.textPlaceholder}
              placeholderTextColor="rgba(255, 255, 255, 0.6)"
              style={[
                styles.input,
                { color: isSolid ? contrastingTextColor(value.color) : value.color },
              ]}
            />
          </View>
        </Pressable>

        <ScrollView
          horizontal
          keyboardShouldPersistTaps="always"
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.swatches}
        >
          {STORY_TEXT_COLORS.map(color => (
            <Pressable
              key={color}
              accessibilityRole="button"
              accessibilityLabel={color}
              onPress={() => setValue(current => ({ ...current, color }))}
              style={[
                styles.swatch,
                { backgroundColor: color },
                value.color === color && styles.swatchSelected,
              ]}
            />
          ))}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.62)',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  styleButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  styleButtonActive: {
    backgroundColor: '#FFFFFF',
  },
  styleButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  styleButtonTextActive: {
    color: '#111827',
  },
  doneText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  inputArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  inputBox: {
    maxWidth: '100%',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  inputBoxSoft: {
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  input: {
    minWidth: 40,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    textAlign: 'center',
  },
  swatches: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  swatch: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.7)',
  },
  swatchSelected: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
    transform: [{ scale: 1.15 }],
  },
});

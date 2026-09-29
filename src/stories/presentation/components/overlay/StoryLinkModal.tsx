// Description: Dialog to add or edit a link sticker on a story; accepts web links only.
import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { normalizeStoryLinkUrl } from '../../../application/overlay/storyOverlay';
import { APP_COLORS } from '../../../../shared-kernel/presentation/theme/appColors';
import type { StoryEditorCopy } from './storyEditorCopy';

export function StoryLinkModal({
  visible,
  initialUrl,
  copy,
  onDone,
  onClose,
}: {
  visible: boolean;
  initialUrl?: string;
  copy: StoryEditorCopy;
  onDone: (url: string) => void;
  onClose: () => void;
}) {
  const [input, setInput] = useState('');
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setInput(initialUrl ?? '');
    setShowError(false);
  }, [initialUrl, visible]);

  const submit = () => {
    const url = normalizeStoryLinkUrl(input);
    if (!url) {
      setShowError(true);
      return;
    }
    onDone(url);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.card}>
          <Text style={styles.title}>{copy.linkTitle}</Text>
          <TextInput
            autoFocus
            value={input}
            onChangeText={text => {
              setInput(text);
              setShowError(false);
            }}
            onSubmitEditing={submit}
            placeholder={copy.linkPlaceholder}
            placeholderTextColor="#94A3B8"
            keyboardType="url"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            style={styles.input}
          />
          {showError ? <Text style={styles.error}>{copy.linkInvalid}</Text> : null}
          <View style={styles.actions}>
            <Pressable onPress={onClose} hitSlop={8} style={styles.action}>
              <Text style={styles.cancel}>{copy.cancel}</Text>
            </Pressable>
            <Pressable onPress={submit} hitSlop={8} style={styles.action}>
              <Text style={styles.done}>{copy.done}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    padding: 18,
  },
  title: {
    color: '#0F172A',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 12,
  },
  input: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    color: '#0F172A',
    fontSize: 15,
  },
  error: {
    marginTop: 8,
    color: '#DC2626',
    fontSize: 13,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
    gap: 8,
  },
  action: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  cancel: {
    color: '#64748B',
    fontSize: 15,
    fontWeight: '700',
  },
  done: {
    color: APP_COLORS.status.info,
    fontSize: 15,
    fontWeight: '800',
  },
});

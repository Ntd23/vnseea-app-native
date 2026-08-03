import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { APP_BRAND_COLOR } from '../theme/appColors';

interface PostEditModalProps {
  visible: boolean;
  initialText: string;
  onClose: () => void;
  onSubmit: (text: string) => Promise<void>;
  maxLength?: number;
  title?: string;
}

export function PostEditModal({
  visible,
  initialText,
  onClose,
  onSubmit,
  maxLength = 5000,
  title = 'Chỉnh sửa bài viết',
}: PostEditModalProps) {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState(initialText);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setText(initialText);
    setError(null);
    setIsSaving(false);
  }, [initialText, visible]);

  const trimmedText = text.trim();
  const unchanged = trimmedText === initialText.trim();
  const canSubmit = Boolean(trimmedText) && !unchanged && !isSaving;

  const handleClose = () => {
    if (isSaving) return;
    onClose();
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSaving(true);
    setError(null);
    try {
      await onSubmit(trimmedText);
      onClose();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Không thể chỉnh sửa bài viết. Vui lòng thử lại.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.root}
      >
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <View
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}
        >
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Đóng"
              disabled={isSaving}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              onPress={handleClose}
              style={styles.closeButton}
            >
              <X size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          <TextInput
            autoFocus
            multiline
            maxLength={maxLength}
            value={text}
            onChangeText={setText}
            editable={!isSaving}
            placeholder="Nhập nội dung bài viết"
            placeholderTextColor="#94A3B8"
            selectionColor={APP_BRAND_COLOR}
            style={styles.input}
            textAlignVertical="top"
          />

          <View style={styles.metaRow}>
            <Text style={styles.counter}>
              {text.length}/{maxLength}
            </Text>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.85}
            disabled={!canSubmit}
            onPress={handleSubmit}
            style={[styles.submitButton, !canSubmit && styles.submitDisabled]}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.submitText}>Lưu thay đổi</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: {
    color: '#0F172A',
    fontSize: 19,
    fontWeight: '800',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  input: {
    minHeight: 150,
    maxHeight: 280,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: '#0F172A',
    fontSize: 16,
    lineHeight: 23,
  },
  metaRow: {
    minHeight: 28,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  counter: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
  error: {
    marginBottom: 10,
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '600',
  },
  submitButton: {
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: APP_BRAND_COLOR,
  },
  submitDisabled: {
    opacity: 0.45,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});

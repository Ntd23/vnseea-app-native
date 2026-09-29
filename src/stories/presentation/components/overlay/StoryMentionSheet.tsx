// Description: Sheet to pick a followed person to @mention in a story.
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import {
  useStoryMentionSearch,
  type StoryMentionCandidate,
} from '../../../application/view-models/useStoryMentionSearch';
import type { StoryEditorCopy } from './storyEditorCopy';

export function StoryMentionSheet({
  visible,
  copy,
  onPick,
  onClose,
}: {
  visible: boolean;
  copy: StoryEditorCopy;
  onPick: (candidate: StoryMentionCandidate) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const { candidates, isLoading } = useStoryMentionSearch(query, visible);

  useEffect(() => {
    if (visible) setQuery('');
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 8 }]}>
          <View style={styles.header}>
            <Text style={styles.title}>{copy.mentionTitle}</Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button">
              <X size={22} color="#FFFFFF" />
            </Pressable>
          </View>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={copy.mentionSearch}
            placeholderTextColor="rgba(255, 255, 255, 0.5)"
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.search}
          />
          <FlatList
            data={candidates}
            keyExtractor={candidate => candidate.userId}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              isLoading ? (
                <ActivityIndicator color="#FFFFFF" style={styles.empty} />
              ) : (
                <Text style={[styles.emptyText, styles.empty]}>
                  {copy.mentionEmpty}
                </Text>
              )
            }
            renderItem={({ item: candidate }) => (
              <Pressable
                onPress={() => onPick(candidate)}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              >
                {candidate.avatarUrl ? (
                  <Image source={{ uri: candidate.avatarUrl }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatar} />
                )}
                <View style={styles.rowText}>
                  <Text style={styles.name} numberOfLines={1}>
                    {candidate.name}
                  </Text>
                  {candidate.username ? (
                    <Text style={styles.username} numberOfLines={1}>
                      @{candidate.username}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            )}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  sheet: {
    height: '70%',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    backgroundColor: '#18181B',
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  search: {
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 14,
    color: '#FFFFFF',
    fontSize: 15,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
  },
  rowPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3F3F46',
  },
  rowText: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  username: {
    marginTop: 2,
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 13,
  },
  empty: {
    marginTop: 32,
  },
  emptyText: {
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    fontSize: 14,
  },
});

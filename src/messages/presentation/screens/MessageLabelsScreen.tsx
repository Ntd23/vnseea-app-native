import {
  APP_BRAND_COLOR,
  APP_COLORS,
} from '../../../shared-kernel/presentation/theme/appColors';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Check,
  Plus,
  Search,
  Tag,
  Trash2,
  UserRound,
} from 'lucide-react-native';
import { ROUTES } from '../../../navigation/constants/routes';
import type {
  MessageLabelTarget,
  RootStackParamList,
} from '../../../navigation/types';
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';
import { useAppTheme } from '../../../shared-kernel/application/hooks/useAppTheme';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import { ColorPicker } from '../../../shared-kernel/presentation/components/ColorPicker';
import { showSnackbar } from '../../../shared-kernel/presentation/components/Snackbar';
import type {
  ChatItem,
  MessageLabel,
} from '../../domain/types/messages.types';
import { createMessagesRepository } from '../../infrastructure/repositories/ApiMessagesRepository';
import { ConversationScreenHeader } from '../components/ConversationScreenHeader';

type Props = NativeStackScreenProps<
  RootStackParamList,
  typeof ROUTES.MESSAGE_LABELS
>;

type ScreenMode = 'assign' | 'create';

const DEFAULT_LABEL_COLOR = APP_BRAND_COLOR;
const HEX_COLOR_PATTERN = /^#[0-9A-F]{6}$/i;
const repository = createMessagesRepository();

const COPY = {
  vi: {
    assignTitle: 'Gắn nhãn khách hàng',
    createTitle: 'Tạo nhãn khách hàng',
    assignTab: 'Gắn nhãn',
    createTab: 'Tạo nhãn',
    existingLabels: 'Nhãn hiện có',
    noLabels: 'Bạn chưa tạo nhãn nào.',
    createFirst: 'Tạo nhãn mới',
    attached: 'Đã gắn',
    attach: 'Gắn',
    name: 'Tên nhãn',
    namePlaceholder: 'Ví dụ: Khách hàng tiềm năng',
    color: 'Màu nhãn',
    recipients: 'Gắn cho người dùng',
    optional: 'Không bắt buộc',
    search: 'Tìm người dùng',
    selectAll: 'Chọn tất cả',
    clearAll: 'Bỏ chọn tất cả',
    noUsers: 'Không tìm thấy cuộc trò chuyện phù hợp.',
    create: 'Tạo nhãn',
    retryAssignments: (count: number) => `Thử gắn lại (${count})`,
    loadingError: 'Không thể tải dữ liệu nhãn.',
    retry: 'Thử lại',
    attachSuccess: 'Đã gắn nhãn.',
    detachSuccess: 'Đã gỡ nhãn.',
    mutationError: 'Không thể cập nhật nhãn. Vui lòng thử lại.',
    createSuccess: 'Đã tạo nhãn thành công.',
    createError: 'Không thể tạo nhãn. Vui lòng thử lại.',
    partialError: (count: number) =>
      `Đã tạo nhãn nhưng chưa thể gắn cho ${count} người.`,
    deleteTitle: 'Xóa nhãn?',
    deleteMessage: (name: string) =>
      `Nhãn “${name}” sẽ được gỡ khỏi tất cả người dùng.`,
    cancel: 'Hủy',
    delete: 'Xóa',
    deleteSuccess: 'Đã xóa nhãn.',
    deleteError: 'Không thể xóa nhãn.',
  },
  en: {
    assignTitle: 'Assign customer labels',
    createTitle: 'Create customer label',
    assignTab: 'Assign',
    createTab: 'Create',
    existingLabels: 'Existing labels',
    noLabels: 'You have not created any labels yet.',
    createFirst: 'Create a new label',
    attached: 'Attached',
    attach: 'Attach',
    name: 'Label name',
    namePlaceholder: 'For example: Potential customer',
    color: 'Label color',
    recipients: 'Assign to people',
    optional: 'Optional',
    search: 'Search people',
    selectAll: 'Select all',
    clearAll: 'Clear all',
    noUsers: 'No eligible conversations found.',
    create: 'Create label',
    retryAssignments: (count: number) => `Retry assignments (${count})`,
    loadingError: 'Unable to load label data.',
    retry: 'Retry',
    attachSuccess: 'Label attached.',
    detachSuccess: 'Label removed.',
    mutationError: 'Unable to update the label. Please try again.',
    createSuccess: 'Label created.',
    createError: 'Unable to create the label. Please try again.',
    partialError: (count: number) =>
      `The label was created but could not be assigned to ${count} people.`,
    deleteTitle: 'Delete label?',
    deleteMessage: (name: string) =>
      `“${name}” will be removed from everyone.`,
    cancel: 'Cancel',
    delete: 'Delete',
    deleteSuccess: 'Label deleted.',
    deleteError: 'Unable to delete the label.',
  },
};

function getTargetFromChat(chat: ChatItem): MessageLabelTarget | null {
  if (chat.chatType !== 'user') return null;
  const userId = chat.participantId || chat.userId;
  if (!userId) return null;
  return {
    userId,
    name: chat.name,
    username: chat.username,
    avatar: chat.avatar,
  };
}

function dedupeTargets(
  chats: ChatItem[],
  initialTarget?: MessageLabelTarget,
) {
  const targets = new Map<string, MessageLabelTarget>();
  if (initialTarget?.userId) targets.set(initialTarget.userId, initialTarget);

  for (const chat of chats) {
    if (chat.hasConversationRecord === false) continue;
    const target = getTargetFromChat(chat);
    if (target) targets.set(target.userId, target);
  }

  return [...targets.values()].sort((left, right) =>
    left.name.localeCompare(right.name),
  );
}

function UserAvatar({ target, size = 44 }: { target: MessageLabelTarget; size?: number }) {
  if (target.avatar) {
    return (
      <Image
        source={{ uri: target.avatar }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }

  return (
    <View
      style={{ width: size, height: size, borderRadius: size / 2 }}
      className="items-center justify-center bg-slate-200"
    >
      <UserRound size={size * 0.5} color="#64748B" />
    </View>
  );
}

export default function MessageLabelsScreen({ navigation, route }: Props) {
  const language = useAppLanguage();
  const copy = COPY[language];
  const { isDark } = useAppTheme();
  const initialTarget =
    route.params.mode === 'assign'
      ? route.params.target
      : route.params.initialTarget;
  const requiredTargetUserId =
    route.params.mode === 'assign' ? initialTarget?.userId : undefined;
  const [mode, setMode] = useState<ScreenMode>(route.params.mode);
  const [labels, setLabels] = useState<MessageLabel[]>([]);
  const [attachedLabelIds, setAttachedLabelIds] = useState<Set<string>>(
    new Set(),
  );
  const [targets, setTargets] = useState<MessageLabelTarget[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(
    () => new Set(initialTarget?.userId ? [initialTarget.userId] : []),
  );
  const [query, setQuery] = useState('');
  const [labelName, setLabelName] = useState('');
  const [labelColor, setLabelColor] = useState<string>(DEFAULT_LABEL_COLOR);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [mutatingLabelIds, setMutatingLabelIds] = useState<Set<string>>(
    new Set(),
  );
  const [retryLabelId, setRetryLabelId] = useState<string | null>(null);

  const palette = useMemo(
    () => ({
      screen: isDark ? '#020617' : '#F8FAFC',
      card: isDark ? '#0F172A' : '#FFFFFF',
      border: isDark ? '#293241' : '#E2E8F0',
      text: isDark ? '#F8FAFC' : '#0F172A',
      muted: isDark ? '#94A3B8' : '#64748B',
      input: isDark ? '#111827' : '#FFFFFF',
    }),
    [isDark],
  );

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(false);
    try {
      const [nextLabels, chats, targetLabels] = await Promise.all([
        repository.listLabels(),
        repository.getChats({ includeDiscovery: false }),
        initialTarget
          ? repository.listTargetLabels(initialTarget.userId)
          : Promise.resolve([]),
      ]);
      setLabels(nextLabels);
      setTargets(dedupeTargets(chats, initialTarget));
      setAttachedLabelIds(new Set(targetLabels.map(label => label.id)));
    } catch {
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }, [initialTarget]);

  useEffect(() => {
    loadData().catch(() => undefined);
  }, [loadData]);

  const filteredTargets = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) return targets;
    return targets.filter(target =>
      `${target.name} ${target.username ?? ''}`
        .toLocaleLowerCase()
        .includes(normalizedQuery),
    );
  }, [query, targets]);

  const allVisibleSelected =
    filteredTargets.length > 0 &&
    filteredTargets.every(target => selectedUserIds.has(target.userId));

  const toggleTarget = useCallback(
    (userId: string) => {
      if (userId === requiredTargetUserId) return;
      setSelectedUserIds(current => {
        const next = new Set(current);
        if (next.has(userId)) next.delete(userId);
        else next.add(userId);
        return next;
      });
    },
    [requiredTargetUserId],
  );

  const toggleAllVisible = useCallback(() => {
    setSelectedUserIds(current => {
      const next = new Set(current);
      if (filteredTargets.every(target => next.has(target.userId))) {
        filteredTargets.forEach(target => {
          if (target.userId !== requiredTargetUserId) {
            next.delete(target.userId);
          }
        });
      } else {
        filteredTargets.forEach(target => next.add(target.userId));
      }
      return next;
    });
  }, [filteredTargets, requiredTargetUserId]);

  const toggleAttachedLabel = useCallback(
    async (label: MessageLabel) => {
      if (!initialTarget || mutatingLabelIds.has(label.id)) return;
      const wasAttached = attachedLabelIds.has(label.id);
      setAttachedLabelIds(current => {
        const next = new Set(current);
        if (wasAttached) next.delete(label.id);
        else next.add(label.id);
        return next;
      });
      setMutatingLabelIds(current => new Set(current).add(label.id));
      try {
        if (wasAttached) {
          await repository.detachLabel(initialTarget.userId, label.id);
        } else {
          await repository.attachLabel(initialTarget.userId, label.id);
        }
        showSnackbar({
          type: 'success',
          message: wasAttached ? copy.detachSuccess : copy.attachSuccess,
        });
      } catch {
        setAttachedLabelIds(current => {
          const next = new Set(current);
          if (wasAttached) next.add(label.id);
          else next.delete(label.id);
          return next;
        });
        showSnackbar({ type: 'error', message: copy.mutationError });
      } finally {
        setMutatingLabelIds(current => {
          const next = new Set(current);
          next.delete(label.id);
          return next;
        });
      }
    }, [
      attachedLabelIds,
      copy.attachSuccess,
      copy.detachSuccess,
      copy.mutationError,
      initialTarget,
      mutatingLabelIds,
    ],
  );

  const deleteLabel = useCallback(
    (label: MessageLabel) => {
      Alert.alert(copy.deleteTitle, copy.deleteMessage(label.name), [
        { text: copy.cancel, style: 'cancel' },
        {
          text: copy.delete,
          style: 'destructive',
          onPress: async () => {
            setMutatingLabelIds(current => new Set(current).add(label.id));
            try {
              await repository.deleteLabel(label.id);
              setLabels(current => current.filter(item => item.id !== label.id));
              setAttachedLabelIds(current => {
                const next = new Set(current);
                next.delete(label.id);
                return next;
              });
              showSnackbar({ type: 'success', message: copy.deleteSuccess });
            } catch {
              showSnackbar({ type: 'error', message: copy.deleteError });
            } finally {
              setMutatingLabelIds(current => {
                const next = new Set(current);
                next.delete(label.id);
                return next;
              });
            }
          },
        },
      ]);
    }, [copy],
  );

  const createOrRetryLabel = useCallback(async () => {
    const normalizedName = labelName.trim();
    if ((!normalizedName && !retryLabelId) || isSaving) return;
    setIsSaving(true);
    try {
      let labelId = retryLabelId;
      if (!labelId) {
        const existingIds = new Set(labels.map(label => label.id));
        await repository.createLabel(
          normalizedName,
          HEX_COLOR_PATTERN.test(labelColor)
            ? labelColor.toUpperCase()
            : DEFAULT_LABEL_COLOR,
        );
        const refreshedLabels = await repository.listLabels();
        setLabels(refreshedLabels);
        labelId =
          refreshedLabels.find(
            label =>
              !existingIds.has(label.id) &&
              label.name.trim().toLocaleLowerCase() ===
                normalizedName.toLocaleLowerCase(),
          )?.id ??
          refreshedLabels.find(
            label =>
              label.name.trim().toLocaleLowerCase() ===
              normalizedName.toLocaleLowerCase(),
          )?.id ??
          null;
      }

      if (!labelId) throw new Error('created_label_not_found');
      const recipients = retryLabelId
        ? [...selectedUserIds]
        : [
            ...new Set([
              ...selectedUserIds,
              ...(requiredTargetUserId ? [requiredTargetUserId] : []),
            ]),
          ];
      const assignmentResults = await Promise.allSettled(
        recipients.map(userId => repository.attachLabel(userId, labelId!)),
      );
      const failedUserIds = recipients.filter(
        (_, index) => assignmentResults[index]?.status === 'rejected',
      );

      if (failedUserIds.length > 0) {
        setRetryLabelId(labelId);
        setSelectedUserIds(new Set(failedUserIds));
        showSnackbar({
          type: 'error',
          message: copy.partialError(failedUserIds.length),
        });
        return;
      }

      showSnackbar({ type: 'success', message: copy.createSuccess });
      setRetryLabelId(null);
      setLabelName('');
      setLabelColor(DEFAULT_LABEL_COLOR);
      if (route.params.mode === 'assign' && initialTarget) {
        await loadData();
        setMode('assign');
        setSelectedUserIds(new Set([initialTarget.userId]));
      } else {
        navigation.goBack();
      }
    } catch {
      showSnackbar({ type: 'error', message: copy.createError });
    } finally {
      setIsSaving(false);
    }
  }, [
    copy,
    initialTarget,
    isSaving,
    labelColor,
    labelName,
    labels,
    loadData,
    navigation,
    retryLabelId,
    requiredTargetUserId,
    route.params.mode,
    selectedUserIds,
  ]);

  const openCreateMode = useCallback(() => {
    setRetryLabelId(null);
    setMode('create');
    setSelectedUserIds(
      new Set(initialTarget?.userId ? [initialTarget.userId] : []),
    );
  }, [initialTarget]);

  const title =
    mode === 'assign' ? copy.assignTitle : copy.createTitle;

  return (
    <SafeAreaView
      className="flex-1"
      edges={['top', 'bottom']}
      style={{ backgroundColor: palette.screen }}
    >
      <FocusAwareStatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={palette.card}
      />
      <ConversationScreenHeader title={title} onBack={navigation.goBack} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color={APP_BRAND_COLOR} />
          </View>
        ) : loadError ? (
          <View className="flex-1 items-center justify-center px-8">
            <Text className="mb-4 text-center" style={{ color: palette.muted }}>
              {copy.loadingError}
            </Text>
            <TouchableOpacity
              className="rounded-lg bg-brand px-5 py-3"
              onPress={() => loadData().catch(() => undefined)}
            >
              <Text className="font-bold text-white">{copy.retry}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
          >
            {initialTarget ? (
              <View
                className="mb-4 flex-row items-center rounded-lg border p-3"
                style={{ backgroundColor: palette.card, borderColor: palette.border }}
              >
                <UserAvatar target={initialTarget} />
                <View className="ml-3 flex-1">
                  <Text className="text-base font-bold" style={{ color: palette.text }}>
                    {initialTarget.name}
                  </Text>
                  {initialTarget.username ? (
                    <Text className="mt-0.5 text-sm" style={{ color: palette.muted }}>
                      @{initialTarget.username}
                    </Text>
                  ) : null}
                </View>
              </View>
            ) : null}

            {initialTarget ? (
              <View
                className="mb-5 flex-row rounded-lg p-1"
                style={{ backgroundColor: isDark ? '#111827' : '#E2E8F0' }}
              >
                {(['assign', 'create'] as const).map(item => {
                  const selected = mode === item;
                  return (
                    <TouchableOpacity
                      key={item}
                      className="flex-1 items-center rounded-md py-2.5"
                      style={{ backgroundColor: selected ? palette.card : 'transparent' }}
                      onPress={() =>
                        item === 'create' ? openCreateMode() : setMode('assign')
                      }
                    >
                      <Text
                        className="font-bold"
                        style={{ color: selected ? APP_BRAND_COLOR : palette.muted }}
                      >
                        {item === 'assign' ? copy.assignTab : copy.createTab}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : null}

            {mode === 'assign' ? (
              <View>
                <Text className="mb-2 text-xs font-bold uppercase" style={{ color: palette.muted }}>
                  {copy.existingLabels}
                </Text>
                <View
                  className="overflow-hidden rounded-lg border"
                  style={{ backgroundColor: palette.card, borderColor: palette.border }}
                >
                  {labels.length === 0 ? (
                    <View className="items-center px-6 py-10">
                      <Tag size={28} color={palette.muted} />
                      <Text className="mt-3 text-center" style={{ color: palette.muted }}>
                        {copy.noLabels}
                      </Text>
                    </View>
                  ) : (
                    labels.map(label => {
                      const attached = attachedLabelIds.has(label.id);
                      const mutating = mutatingLabelIds.has(label.id);
                      return (
                        <View
                          key={label.id}
                          className="flex-row items-center border-b px-3 py-2"
                          style={{ borderBottomColor: palette.border }}
                        >
                          <TouchableOpacity
                            className="min-h-11 flex-1 flex-row items-center"
                            disabled={mutating}
                            onPress={() => toggleAttachedLabel(label)}
                          >
                            <View
                              className="mr-3 h-4 w-4 rounded-full"
                              style={{ backgroundColor: label.color }}
                            />
                            <Text className="flex-1 font-semibold" style={{ color: palette.text }}>
                              {label.name}
                            </Text>
                            {mutating ? (
                              <ActivityIndicator size="small" color={APP_BRAND_COLOR} />
                            ) : (
                              <View
                                className="ml-2 flex-row items-center rounded-md px-2.5 py-1.5"
                                style={{ backgroundColor: attached ? APP_COLORS.brand.soft : '#F1F5F9' }}
                              >
                                {attached ? <Check size={14} color={APP_BRAND_COLOR} /> : null}
                                <Text className="ml-1 text-xs font-bold text-brand-pressed">
                                  {attached ? copy.attached : copy.attach}
                                </Text>
                              </View>
                            )}
                          </TouchableOpacity>
                          <TouchableOpacity
                            accessibilityRole="button"
                            accessibilityLabel={`${copy.delete} ${label.name}`}
                            className="ml-2 h-11 w-11 items-center justify-center rounded-full"
                            disabled={mutating}
                            onPress={() => deleteLabel(label)}
                          >
                            <Trash2 size={18} color="#DC2626" />
                          </TouchableOpacity>
                        </View>
                      );
                    })
                  )}
                </View>
                <TouchableOpacity
                  className="mt-4 flex-row items-center justify-center rounded-lg bg-brand py-3"
                  onPress={openCreateMode}
                >
                  <Plus size={18} color="#FFFFFF" />
                  <Text className="ml-2 font-bold text-white">{copy.createFirst}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <Text className="mb-2 text-xs font-bold uppercase" style={{ color: palette.muted }}>
                  {copy.name}
                </Text>
                <TextInput
                  className="h-12 rounded-lg border px-4 text-base"
                  style={{
                    color: palette.text,
                    borderColor: palette.border,
                    backgroundColor: palette.input,
                  }}
                  editable={!retryLabelId && !isSaving}
                  placeholder={copy.namePlaceholder}
                  placeholderTextColor={palette.muted}
                  value={labelName}
                  onChangeText={value => {
                    setRetryLabelId(null);
                    setLabelName(value);
                  }}
                />

                <Text className="mb-2 mt-5 text-xs font-bold uppercase" style={{ color: palette.muted }}>
                  {copy.color}
                </Text>
                <View
                  className="rounded-lg border p-3"
                  style={{ backgroundColor: palette.card, borderColor: palette.border }}
                >
                  <ColorPicker
                    value={labelColor}
                    onChange={setLabelColor}
                    label={copy.color}
                  />
                </View>

                <View className="mb-2 mt-5 flex-row items-center justify-between">
                  <View>
                    <Text className="text-xs font-bold uppercase" style={{ color: palette.muted }}>
                      {copy.recipients}
                    </Text>
                    <Text className="mt-0.5 text-xs" style={{ color: palette.muted }}>
                      {copy.optional} · {selectedUserIds.size}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={toggleAllVisible} disabled={filteredTargets.length === 0}>
                    <Text className="font-bold text-brand">
                      {allVisibleSelected ? copy.clearAll : copy.selectAll}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View
                  className="mb-2 flex-row items-center rounded-lg border px-3"
                  style={{ backgroundColor: palette.input, borderColor: palette.border }}
                >
                  <Search size={18} color={palette.muted} />
                  <TextInput
                    className="ml-2 h-11 flex-1 text-base"
                    style={{ color: palette.text }}
                    placeholder={copy.search}
                    placeholderTextColor={palette.muted}
                    value={query}
                    onChangeText={setQuery}
                  />
                </View>
                <View
                  className="overflow-hidden rounded-lg border"
                  style={{ backgroundColor: palette.card, borderColor: palette.border }}
                >
                  {filteredTargets.length === 0 ? (
                    <Text className="px-4 py-8 text-center" style={{ color: palette.muted }}>
                      {copy.noUsers}
                    </Text>
                  ) : (
                    filteredTargets.map(target => {
                      const selected = selectedUserIds.has(target.userId);
                      const required = target.userId === requiredTargetUserId;
                      return (
                        <TouchableOpacity
                          key={target.userId}
                          className="min-h-14 flex-row items-center border-b px-3 py-2"
                          style={{ borderBottomColor: palette.border }}
                          disabled={required}
                          onPress={() => toggleTarget(target.userId)}
                        >
                          <UserAvatar target={target} size={38} />
                          <View className="ml-3 flex-1">
                            <Text className="font-semibold" style={{ color: palette.text }}>
                              {target.name}
                            </Text>
                            {target.username ? (
                              <Text className="text-xs" style={{ color: palette.muted }}>
                                @{target.username}
                              </Text>
                            ) : null}
                          </View>
                          <View
                            className="h-6 w-6 items-center justify-center rounded-md border"
                            style={{
                              borderColor: selected ? APP_BRAND_COLOR : palette.border,
                              backgroundColor: selected ? APP_BRAND_COLOR : 'transparent',
                            }}
                          >
                            {selected ? <Check size={15} color="#FFFFFF" /> : null}
                          </View>
                        </TouchableOpacity>
                      );
                    })
                  )}
                </View>
                <TouchableOpacity
                  className={`mt-5 min-h-12 items-center justify-center rounded-lg ${
                    (labelName.trim() || retryLabelId) && !isSaving
                      ? 'bg-brand'
                      : 'bg-slate-300'
                  }`}
                  disabled={(!labelName.trim() && !retryLabelId) || isSaving}
                  onPress={() => createOrRetryLabel().catch(() => undefined)}
                >
                  {isSaving ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text className="font-bold text-white">
                      {retryLabelId
                        ? copy.retryAssignments(selectedUserIds.size)
                        : copy.create}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

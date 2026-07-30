import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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
import { Search, Tag, Trash2, UserRound } from 'lucide-react-native';
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
import {
  APP_BRAND_COLOR,
  APP_COLORS,
} from '../../../shared-kernel/presentation/theme/appColors';
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

type ScreenMode = 'assign' | 'manage';

const DEFAULT_LABEL_COLOR = APP_BRAND_COLOR;
const HEX_COLOR_PATTERN = /^#[0-9A-F]{6}$/i;
const repository = createMessagesRepository();

const COPY = {
  vi: {
    title: 'Thẻ khách hàng',
    assignTab: 'Gắn thẻ',
    manageTab: 'Quản lý thẻ',
    existingLabels: 'Thẻ có thể gắn',
    manageLabels: 'Thẻ của bạn',
    noLabels: 'Bạn chưa tạo thẻ nào.',
    attach: 'Gắn thẻ',
    detach: 'Gỡ thẻ',
    selectedCustomer: 'Người đang được gắn thẻ',
    selectCustomer: 'Chọn người dùng để gắn thẻ',
    changeCustomer: 'Đổi người',
    searchCustomer: 'Tìm trong cuộc trò chuyện 1-1',
    noUsers: 'Không tìm thấy cuộc trò chuyện phù hợp.',
    name: 'Tên thẻ',
    namePlaceholder: 'Ví dụ: Khách hàng tiềm năng',
    color: 'Màu thẻ',
    create: 'Tạo thẻ',
    loadingError: 'Không thể tải dữ liệu thẻ.',
    retry: 'Thử lại',
    attachSuccess: 'Đã gắn thẻ.',
    detachSuccess: 'Đã gỡ thẻ.',
    mutationError: 'Không thể cập nhật thẻ. Vui lòng thử lại.',
    createSuccess: 'Đã tạo thẻ thành công.',
    createAttachError:
      'Đã tạo thẻ nhưng chưa thể gắn cho người dùng này.',
    createError: 'Không thể tạo thẻ. Vui lòng thử lại.',
    deleteTitle: 'Xóa thẻ?',
    deleteMessage: (name: string) =>
      `Thẻ “${name}” sẽ được gỡ khỏi tất cả người dùng.`,
    cancel: 'Hủy',
    delete: 'Xóa',
    deleteSuccess: 'Đã xóa thẻ.',
    deleteError: 'Không thể xóa thẻ.',
  },
  en: {
    title: 'Customer labels',
    assignTab: 'Assign labels',
    manageTab: 'Manage labels',
    existingLabels: 'Available labels',
    manageLabels: 'Your labels',
    noLabels: 'You have not created any labels yet.',
    attach: 'Assign label',
    detach: 'Remove label',
    selectedCustomer: 'Selected customer',
    selectCustomer: 'Choose a customer to label',
    changeCustomer: 'Change',
    searchCustomer: 'Search one-to-one conversations',
    noUsers: 'No eligible conversations found.',
    name: 'Label name',
    namePlaceholder: 'For example: Potential customer',
    color: 'Label color',
    create: 'Create label',
    loadingError: 'Unable to load label data.',
    retry: 'Retry',
    attachSuccess: 'Label assigned.',
    detachSuccess: 'Label removed.',
    mutationError: 'Unable to update the label. Please try again.',
    createSuccess: 'Label created.',
    createAttachError:
      'The label was created but could not be assigned to this customer.',
    createError: 'Unable to create the label. Please try again.',
    deleteTitle: 'Delete label?',
    deleteMessage: (name: string) =>
      `“${name}” will be removed from everyone.`,
    cancel: 'Cancel',
    delete: 'Delete',
    deleteSuccess: 'Label deleted.',
    deleteError: 'Unable to delete label.',
  },
};

function getTargetFromChat(chat: ChatItem): MessageLabelTarget | null {
  if (chat.chatType !== 'user') return null;
  const userId = chat.participantId || chat.userId;
  if (!userId || chat.hasConversationRecord === false) return null;
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
    const target = getTargetFromChat(chat);
    if (target) targets.set(target.userId, target);
  }

  return [...targets.values()].sort((left, right) =>
    left.name.localeCompare(right.name),
  );
}

function UserAvatar({
  target,
  size = 44,
}: {
  target: MessageLabelTarget;
  size?: number;
}) {
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
  const [mode, setMode] = useState<ScreenMode>(
    route.params.mode === 'assign' ? 'assign' : 'manage',
  );
  const [labels, setLabels] = useState<MessageLabel[]>([]);
  const [targets, setTargets] = useState<MessageLabelTarget[]>([]);
  const [selectedTarget, setSelectedTarget] =
    useState<MessageLabelTarget | null>(initialTarget ?? null);
  const [attachedLabelIds, setAttachedLabelIds] = useState<Set<string>>(
    new Set(),
  );
  const [targetQuery, setTargetQuery] = useState('');
  const [labelName, setLabelName] = useState('');
  const [labelColor, setLabelColor] = useState<string>(DEFAULT_LABEL_COLOR);
  const [isLoading, setIsLoading] = useState(true);
  const [isTargetLabelsLoading, setIsTargetLabelsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [mutatingLabelIds, setMutatingLabelIds] = useState<Set<string>>(
    new Set(),
  );
  const targetLoadGenerationRef = useRef(0);

  const palette = useMemo(
    () => ({
      screen: isDark ? '#020617' : '#F8FAFC',
      card: isDark ? '#0F172A' : '#FFFFFF',
      border: isDark ? '#293241' : '#E2E8F0',
      text: isDark ? '#F8FAFC' : '#0F172A',
      muted: isDark ? '#94A3B8' : '#64748B',
      input: isDark ? '#111827' : '#FFFFFF',
      neutralAction: isDark ? '#1E293B' : '#F1F5F9',
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
    const normalizedQuery = targetQuery.trim().toLocaleLowerCase();
    if (!normalizedQuery) return targets;
    return targets.filter(target =>
      `${target.name} ${target.username ?? ''}`
        .toLocaleLowerCase()
        .includes(normalizedQuery),
    );
  }, [targetQuery, targets]);

  const selectCustomer = useCallback(
    async (target: MessageLabelTarget) => {
      const generation = ++targetLoadGenerationRef.current;
      setSelectedTarget(target);
      setAttachedLabelIds(new Set());
      setTargetQuery('');
      setIsTargetLabelsLoading(true);
      try {
        const targetLabels = await repository.listTargetLabels(target.userId);
        if (generation !== targetLoadGenerationRef.current) return;
        setAttachedLabelIds(new Set(targetLabels.map(label => label.id)));
      } catch {
        if (generation !== targetLoadGenerationRef.current) return;
        setSelectedTarget(null);
        showSnackbar({ type: 'error', message: copy.loadingError });
      } finally {
        if (generation === targetLoadGenerationRef.current) {
          setIsTargetLabelsLoading(false);
        }
      }
    },
    [copy.loadingError],
  );

  const changeCustomer = useCallback(() => {
    targetLoadGenerationRef.current += 1;
    setSelectedTarget(null);
    setAttachedLabelIds(new Set());
    setIsTargetLabelsLoading(false);
  }, []);

  const toggleAttachedLabel = useCallback(
    async (label: MessageLabel) => {
      if (!selectedTarget || mutatingLabelIds.has(label.id)) return;
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
          await repository.detachLabel(selectedTarget.userId, label.id);
        } else {
          await repository.attachLabel(selectedTarget.userId, label.id);
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
    },
    [
      attachedLabelIds,
      copy.attachSuccess,
      copy.detachSuccess,
      copy.mutationError,
      mutatingLabelIds,
      selectedTarget,
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
              setLabels(current =>
                current.filter(item => item.id !== label.id),
              );
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
    },
    [copy],
  );

  const createLabel = useCallback(async () => {
    const normalizedName = labelName.trim();
    if (!normalizedName || isSaving) return;

    setIsSaving(true);
    try {
      const existingIds = new Set(labels.map(label => label.id));
      await repository.createLabel(
        normalizedName,
        HEX_COLOR_PATTERN.test(labelColor)
          ? labelColor.toUpperCase()
          : DEFAULT_LABEL_COLOR,
      );
      const refreshedLabels = await repository.listLabels();
      setLabels(refreshedLabels);
      const createdLabel =
        refreshedLabels.find(label => !existingIds.has(label.id)) ??
        refreshedLabels.find(
          label =>
            label.name.trim().toLocaleLowerCase() ===
            normalizedName.toLocaleLowerCase(),
        );

      if (!createdLabel) throw new Error('created_label_not_found');

      let attached = false;
      if (selectedTarget) {
        try {
          await repository.attachLabel(
            selectedTarget.userId,
            createdLabel.id,
          );
          setAttachedLabelIds(current =>
            new Set(current).add(createdLabel.id),
          );
          attached = true;
        } catch {
          showSnackbar({
            type: 'error',
            message: copy.createAttachError,
          });
        }
      }

      if (!selectedTarget || attached) {
        showSnackbar({ type: 'success', message: copy.createSuccess });
      }
      setLabelName('');
      setLabelColor(DEFAULT_LABEL_COLOR);
    } catch {
      showSnackbar({ type: 'error', message: copy.createError });
    } finally {
      setIsSaving(false);
    }
  }, [
    copy.createAttachError,
    copy.createError,
    copy.createSuccess,
    isSaving,
    labelColor,
    labelName,
    labels,
    selectedTarget,
  ]);

  const renderTarget = () => {
    if (selectedTarget) {
      return (
        <View
          className="mb-4 flex-row items-center rounded-lg border p-3"
          style={{
            backgroundColor: palette.card,
            borderColor: palette.border,
          }}
        >
          <UserAvatar target={selectedTarget} />
          <View className="ml-3 flex-1">
            <Text className="text-xs font-bold uppercase text-brand">
              {copy.selectedCustomer}
            </Text>
            <Text
              className="mt-1 text-base font-bold"
              style={{ color: palette.text }}
            >
              {selectedTarget.name}
            </Text>
            {selectedTarget.username ? (
              <Text className="mt-0.5 text-sm" style={{ color: palette.muted }}>
                @{selectedTarget.username}
              </Text>
            ) : null}
          </View>
          {!initialTarget ? (
            <TouchableOpacity
              className="min-h-11 justify-center px-2"
              onPress={changeCustomer}
            >
              <Text className="font-bold text-brand">
                {copy.changeCustomer}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      );
    }

    return (
      <>
        <Text
          className="mb-2 text-xs font-bold uppercase"
          style={{ color: palette.muted }}
        >
          {copy.selectCustomer}
        </Text>
        <View
          className="mb-3 flex-row items-center rounded-lg border px-3"
          style={{
            backgroundColor: palette.input,
            borderColor: palette.border,
          }}
        >
          <Search size={18} color={palette.muted} />
          <TextInput
            className="ml-2 h-11 flex-1 text-base"
            style={{ color: palette.text }}
            placeholder={copy.searchCustomer}
            placeholderTextColor={palette.muted}
            value={targetQuery}
            onChangeText={setTargetQuery}
          />
        </View>
        <View
          className="overflow-hidden rounded-lg border"
          style={{
            backgroundColor: palette.card,
            borderColor: palette.border,
          }}
        >
          {filteredTargets.length === 0 ? (
            <Text
              className="px-4 py-8 text-center"
              style={{ color: palette.muted }}
            >
              {copy.noUsers}
            </Text>
          ) : (
            filteredTargets.map(target => (
              <TouchableOpacity
                key={target.userId}
                className="min-h-14 flex-row items-center border-b px-3 py-2"
                style={{ borderBottomColor: palette.border }}
                onPress={() => selectCustomer(target)}
              >
                <UserAvatar target={target} size={38} />
                <View className="ml-3 flex-1">
                  <Text
                    className="font-semibold"
                    style={{ color: palette.text }}
                  >
                    {target.name}
                  </Text>
                  {target.username ? (
                    <Text className="text-xs" style={{ color: palette.muted }}>
                      @{target.username}
                    </Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </>
    );
  };

  const renderLabelEmptyState = () => (
    <View className="items-center px-6 py-10">
      <Tag size={28} color={palette.muted} />
      <Text className="mt-3 text-center" style={{ color: palette.muted }}>
        {copy.noLabels}
      </Text>
    </View>
  );

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
      <ConversationScreenHeader
        title={copy.title}
        onBack={navigation.goBack}
      />
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
          <View className="flex-1">
            <View
              className="mx-4 mb-3 mt-4 flex-row rounded-lg p-1"
              style={{ backgroundColor: isDark ? '#111827' : '#E2E8F0' }}
            >
              {(['assign', 'manage'] as const).map(item => {
                const selected = mode === item;
                return (
                  <TouchableOpacity
                    key={item}
                    className="flex-1 items-center rounded-md py-2.5"
                    style={{
                      backgroundColor: selected
                        ? palette.card
                        : 'transparent',
                    }}
                    onPress={() => setMode(item)}
                  >
                    <Text
                      className="font-bold"
                      style={{
                        color: selected
                          ? APP_BRAND_COLOR
                          : palette.muted,
                      }}
                    >
                      {item === 'assign'
                        ? copy.assignTab
                        : copy.manageTab}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {mode === 'assign' ? (
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: 16, paddingTop: 0 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {renderTarget()}
                {selectedTarget ? (
                  <>
                    <Text
                      className="mb-2 text-xs font-bold uppercase"
                      style={{ color: palette.muted }}
                    >
                      {copy.existingLabels}
                    </Text>
                    <View
                      className="overflow-hidden rounded-lg border"
                      style={{
                        backgroundColor: palette.card,
                        borderColor: palette.border,
                      }}
                    >
                      {isTargetLabelsLoading ? (
                        <View className="items-center py-10">
                          <ActivityIndicator color={APP_BRAND_COLOR} />
                        </View>
                      ) : labels.length === 0 ? (
                        renderLabelEmptyState()
                      ) : (
                        labels.map(label => {
                          const attached = attachedLabelIds.has(label.id);
                          const mutating = mutatingLabelIds.has(label.id);
                          return (
                            <TouchableOpacity
                              key={label.id}
                              className="min-h-14 flex-row items-center border-b px-3 py-2"
                              style={{ borderBottomColor: palette.border }}
                              disabled={mutating}
                              onPress={() => toggleAttachedLabel(label)}
                            >
                              <View
                                className="mr-3 h-4 w-4 rounded-full"
                                style={{ backgroundColor: label.color }}
                              />
                              <Text
                                className="flex-1 font-semibold"
                                style={{ color: palette.text }}
                              >
                                {label.name}
                              </Text>
                              {mutating ? (
                                <ActivityIndicator
                                  size="small"
                                  color={APP_BRAND_COLOR}
                                />
                              ) : (
                                <View
                                  className="ml-2 rounded-md px-2.5 py-2"
                                  style={{
                                    backgroundColor: attached
                                      ? APP_COLORS.brand.soft
                                      : palette.neutralAction,
                                  }}
                                >
                                  <Text
                                    className="text-xs font-bold"
                                    style={{
                                      color: attached
                                        ? APP_BRAND_COLOR
                                        : palette.text,
                                    }}
                                  >
                                    {attached ? copy.detach : copy.attach}
                                  </Text>
                                </View>
                              )}
                            </TouchableOpacity>
                          );
                        })
                      )}
                    </View>
                  </>
                ) : null}
              </ScrollView>
            ) : (
              <View style={{ flex: 1 }}>
                <ScrollView
                  testID="message-labels-manage-list"
                  style={{ flex: 1 }}
                  contentContainerStyle={{
                    paddingHorizontal: 16,
                    paddingBottom: 12,
                  }}
                  showsVerticalScrollIndicator={false}
                >
                  <Text
                    className="mb-2 text-xs font-bold uppercase"
                    style={{ color: palette.muted }}
                  >
                    {copy.manageLabels}
                  </Text>
                  <View
                    className="overflow-hidden rounded-lg border"
                    style={{
                      backgroundColor: palette.card,
                      borderColor: palette.border,
                    }}
                  >
                    {labels.length === 0
                      ? renderLabelEmptyState()
                      : labels.map(label => {
                          const mutating = mutatingLabelIds.has(label.id);
                          return (
                            <View
                              key={label.id}
                              className="min-h-14 flex-row items-center border-b px-3 py-2"
                              style={{ borderBottomColor: palette.border }}
                            >
                              <View
                                className="mr-3 h-4 w-4 rounded-full"
                                style={{ backgroundColor: label.color }}
                              />
                              <Text
                                className="flex-1 font-semibold"
                                style={{ color: palette.text }}
                              >
                                {label.name}
                              </Text>
                              <TouchableOpacity
                                accessibilityRole="button"
                                accessibilityLabel={`${copy.delete} ${label.name}`}
                                className="h-11 w-11 items-center justify-center rounded-full"
                                disabled={mutating}
                                onPress={() => deleteLabel(label)}
                              >
                                {mutating ? (
                                  <ActivityIndicator
                                    size="small"
                                    color={APP_BRAND_COLOR}
                                  />
                                ) : (
                                  <Trash2 size={19} color="#DC2626" />
                                )}
                              </TouchableOpacity>
                            </View>
                          );
                        })}
                  </View>
                </ScrollView>

                <View
                  testID="message-labels-create-form"
                  className="border-t px-4 pb-3 pt-3"
                  style={{
                    backgroundColor: palette.card,
                    borderTopColor: palette.border,
                  }}
                >
                  <Text
                    className="mb-2 text-xs font-bold uppercase"
                    style={{ color: palette.muted }}
                  >
                    {copy.name}
                  </Text>
                  <TextInput
                    className="h-12 rounded-lg border px-4 text-base"
                    style={{
                      color: palette.text,
                      borderColor: palette.border,
                      backgroundColor: palette.input,
                    }}
                    editable={!isSaving}
                    placeholder={copy.namePlaceholder}
                    placeholderTextColor={palette.muted}
                    value={labelName}
                    onChangeText={setLabelName}
                  />
                  <Text
                    className="mb-2 mt-3 text-xs font-bold uppercase"
                    style={{ color: palette.muted }}
                  >
                    {copy.color}
                  </Text>
                  <ColorPicker
                    value={labelColor}
                    onChange={setLabelColor}
                    label={copy.color}
                  />
                  <TouchableOpacity
                    className={`mt-3 min-h-12 items-center justify-center rounded-lg ${
                      labelName.trim() && !isSaving
                        ? 'bg-brand'
                        : 'bg-slate-300'
                    }`}
                    disabled={!labelName.trim() || isSaving}
                    onPress={() => createLabel().catch(() => undefined)}
                  >
                    {isSaving ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text className="font-bold text-white">
                        {copy.create}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

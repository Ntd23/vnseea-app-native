// Description: Renders a multi-step create group form and submits it to WoWonder.
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Globe2,
  Link2,
  Lock,
  Shapes,
  ShieldCheck,
  Users,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../../../navigation/types';
import { apiConfig } from '../../../shared-kernel/infrastructure/config/env';
import { useCommunityViewModel } from '../../application/view-models/useCommunityViewModel';
import type {
  CreateGroupDraft,
  GroupPrivacy,
} from '../../domain/types/community.types';

type CreateGroupNav = NativeStackNavigationProp<RootStackParamList>;

type GroupCategory = {
  id: string;
  label: string;
};

const BRAND = '#0000ff';
const GROUP_URL_PREFIX = `${apiConfig.webBaseUrl.replace(/\/+$/, '')}/`;
const GROUP_CATEGORIES: GroupCategory[] = [
  { id: '1', label: 'Danh mục chung' },
];

const INITIAL_DRAFT: CreateGroupDraft = {
  groupName: '',
  groupTitle: '',
  about: '',
  category: GROUP_CATEGORIES[0].id,
  privacy: 'public',
};

const STEPS = ['Thông tin nhóm', 'Thiết lập nhóm', 'Hoàn tất'];

function toSafeGroupName(value: string) {
  return value
    .replace(/\u0111/g, 'd')
    .replace(/\u0110/g, 'D')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/^@+/, '')
    .replace(/[^a-z]+/g, '')
    .slice(0, 32);
}

function ErrorMessage({ message }: { message?: string | null }) {
  if (!message) return null;

  return (
    <View className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
      <Text className="text-caption-primary text-red-600">{message}</Text>
    </View>
  );
}

function ProgressBar({ step }: { step: number }) {
  return (
    <View className="mb-6 flex-row gap-2">
      {STEPS.map((label, index) => (
        <View key={label} className="flex-1">
          <View className="h-1 overflow-hidden rounded-full bg-blue-100">
            {index <= step ? (
              <View className="h-full w-full rounded-full bg-[#0000ff]" />
            ) : null}
          </View>
          <Text
            className={`mt-2 text-center text-[11px] ${
              index <= step ? 'text-blue-700' : 'text-slate-400'
            }`}
          >
            {label}
          </Text>
        </View>
      ))}
    </View>
  );
}

function PrivacyOption({
  title,
  description,
  value,
  selected,
  onPress,
}: {
  title: string;
  description: string;
  value: GroupPrivacy;
  selected: boolean;
  onPress: (value: GroupPrivacy) => void;
}) {
  const Icon = value === 'private' ? Lock : Globe2;

  return (
    <TouchableOpacity
      className="mb-3 flex-row items-center rounded-2xl border bg-white p-4"
      style={{ borderColor: selected ? BRAND : '#E2E8F0' }}
      activeOpacity={0.84}
      onPress={() => onPress(value)}
    >
      <View className="h-12 w-12 items-center justify-center rounded-full bg-blue-50">
        <Icon size={23} color={BRAND} />
      </View>
      <View className="ml-4 flex-1">
        <Text className="text-title-primary">{title}</Text>
        <Text className="mt-1 text-caption-secondary">{description}</Text>
      </View>
      {selected ? <CheckCircle2 size={22} color={BRAND} /> : null}
    </TouchableOpacity>
  );
}

function CreateGroupScreen() {
  const navigation = useNavigation<CreateGroupNav>();
  const { createGroup, clearError, error, isCreating } =
    useCommunityViewModel();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState(INITIAL_DRAFT);
  const [localError, setLocalError] = useState<string | null>(null);
  const [groupNameEdited, setGroupNameEdited] = useState(false);

  const selectedCategory = useMemo(
    () =>
      GROUP_CATEGORIES.find(category => category.id === draft.category) ??
      GROUP_CATEGORIES[0],
    [draft.category],
  );

  const clearErrors = useCallback(() => {
    setLocalError(null);
    clearError();
  }, [clearError]);

  const updateDraft = useCallback(
    <TKey extends keyof CreateGroupDraft>(
      key: TKey,
      value: CreateGroupDraft[TKey],
    ) => {
      clearErrors();
      setDraft(current => ({ ...current, [key]: value }));
    },
    [clearErrors],
  );

  const handleTitleChange = useCallback(
    (groupTitle: string) => {
      clearErrors();
      setDraft(current => ({
        ...current,
        groupTitle,
        groupName: groupNameEdited
          ? current.groupName
          : toSafeGroupName(groupTitle),
      }));
    },
    [clearErrors, groupNameEdited],
  );

  const handleGroupNameChange = useCallback(
    (groupName: string) => {
      setGroupNameEdited(true);
      updateDraft('groupName', toSafeGroupName(groupName));
    },
    [updateDraft],
  );

  const validateStep = useCallback(() => {
    if (step === 0) {
      if (draft.groupTitle.trim().length < 2) {
        return 'Vui lòng nhập tên nhóm ít nhất 2 ký tự.';
      }

      if (draft.groupName.length < 5 || draft.groupName.length > 32) {
        return 'URL nhóm phải từ 5 đến 32 ký tự.';
      }

      if (!draft.about.trim()) {
        return 'Vui lòng nhập mô tả nhóm.';
      }
    }

    if (step === 1 && !draft.category) {
      return 'Vui lòng chọn danh mục nhóm.';
    }

    return null;
  }, [draft, step]);

  const handleBack = useCallback(() => {
    clearErrors();

    if (step > 0) {
      setStep(current => current - 1);
      return;
    }

    navigation.goBack();
  }, [clearErrors, navigation, step]);

  const handleNext = useCallback(async () => {
    const validationError = validateStep();

    if (validationError) {
      setLocalError(validationError);
      return;
    }

    clearErrors();

    if (step < STEPS.length - 1) {
      setStep(current => current + 1);
      return;
    }

    try {
      const group = await createGroup(draft);

      if (!group) return;

      Alert.alert(
        'Tạo nhóm thành công',
        `Nhóm "${group.groupTitle || draft.groupTitle}" đã được tạo.`,
        [{ text: 'Xong', onPress: () => navigation.goBack() }],
      );
    } catch {
      // The view-model exposes a Vietnamese error message below the form.
    }
  }, [clearErrors, createGroup, draft, navigation, step, validateStep]);

  return (
    <SafeAreaView className="flex-1 surface-base" edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={BRAND} />

      <View className="surface-brand h-16 flex-row items-center px-4">
        <TouchableOpacity
          className="h-10 w-10 items-center justify-center rounded-full"
          activeOpacity={0.8}
          onPress={handleBack}
        >
          <ArrowLeft size={23} color="#FFFFFF" />
        </TouchableOpacity>
        <View className="ml-3 flex-1">
          <Text className="text-heading text-inverse">Tạo nhóm mới</Text>
          <Text className="mt-0.5 text-caption-primary text-white/80">
            Bước {step + 1}/{STEPS.length}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-4 pb-28 pt-5"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <ProgressBar step={step} />

          {step === 0 ? (
            <View>
              <Text className="text-heading">Thông tin nhóm</Text>
              <Text className="mt-2 text-body-secondary">
                Nhập tên, URL và mô tả để mọi người hiểu chủ đề của nhóm.
              </Text>

              <View className="surface-card mt-5 p-4">
                <Text className="text-title-primary">Tên nhóm</Text>
                <TextInput
                  className="mt-3 rounded-xl border border-slate-200 px-4 py-3 text-body-primary"
                  placeholder="Ví dụ: Cộng đồng VNSEEA"
                  placeholderTextColor="#94A3B8"
                  value={draft.groupTitle}
                  onChangeText={handleTitleChange}
                />

                <Text className="mt-5 text-title-primary">URL nhóm</Text>
                <View className="mt-3 min-h-[52px] flex-row items-center rounded-xl border border-slate-200 px-4">
                  <Link2 size={18} color="#64748B" />
                  <Text
                    className="ml-2 max-w-[150px] text-caption-secondary"
                    numberOfLines={1}
                  >
                    {GROUP_URL_PREFIX}
                  </Text>
                  <TextInput
                    className="ml-1 flex-1 text-body-primary"
                    placeholder="tennhom"
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={draft.groupName}
                    onChangeText={handleGroupNameChange}
                  />
                </View>
                <Text className="mt-2 text-caption-secondary">
                  Dùng 5-32 ký tự và chỉ gồm chữ cái không dấu.
                </Text>

                <Text className="mt-5 text-title-primary">Mô tả nhóm</Text>
                <TextInput
                  className="mt-3 min-h-[120px] rounded-xl border border-slate-200 px-4 py-3 text-body-primary"
                  placeholder="Nhóm này dành cho nội dung gì?"
                  placeholderTextColor="#94A3B8"
                  multiline
                  textAlignVertical="top"
                  value={draft.about}
                  onChangeText={value => updateDraft('about', value)}
                />
              </View>
            </View>
          ) : null}

          {step === 1 ? (
            <View>
              <Text className="text-heading">Thiết lập nhóm</Text>
              <Text className="mt-2 text-body-secondary">
                Chọn danh mục và quyền riêng tư phù hợp với cộng đồng của bạn.
              </Text>

              <View className="surface-card mt-5 p-4">
                <View className="flex-row items-center">
                  <View className="h-11 w-11 items-center justify-center rounded-full bg-blue-50">
                    <Shapes size={22} color={BRAND} />
                  </View>
                  <View className="ml-3 flex-1">
                    <Text className="text-title-primary">Danh mục nhóm</Text>
                    <Text className="mt-1 text-caption-secondary">
                      {selectedCategory.label}
                    </Text>
                  </View>
                  <CheckCircle2 size={21} color={BRAND} />
                </View>
              </View>

              <Text className="mb-3 mt-6 text-title-primary">
                Quyền riêng tư
              </Text>
              <PrivacyOption
                title="Công khai"
                description="Ai cũng có thể tìm thấy nhóm và xem bài viết."
                value="public"
                selected={draft.privacy === 'public'}
                onPress={value => updateDraft('privacy', value)}
              />
              <PrivacyOption
                title="Riêng tư"
                description="Chỉ thành viên mới xem được bài viết trong nhóm."
                value="private"
                selected={draft.privacy === 'private'}
                onPress={value => updateDraft('privacy', value)}
              />
            </View>
          ) : null}

          {step === 2 ? (
            <View>
              <View className="surface-card items-center p-6">
                <View className="h-20 w-20 items-center justify-center rounded-full bg-blue-50">
                  <ShieldCheck size={38} color={BRAND} />
                </View>
                <Text className="mt-5 text-center text-heading">
                  Kiểm tra thông tin nhóm
                </Text>
                <Text className="mt-2 text-center text-body-secondary">
                  Xác nhận lại thông tin trước khi tạo nhóm.
                </Text>

                <View className="mt-6 w-full rounded-2xl bg-slate-50 p-4">
                  <View className="flex-row items-center">
                    <Users size={21} color={BRAND} />
                    <Text className="ml-3 flex-1 text-title-primary">
                      {draft.groupTitle}
                    </Text>
                  </View>
                  <Text className="mt-3 text-caption-secondary">
                    {GROUP_URL_PREFIX}
                    {draft.groupName}
                  </Text>
                  <Text className="mt-2 text-caption-secondary">
                    {draft.privacy === 'private' ? 'Riêng tư' : 'Công khai'} ·{' '}
                    {selectedCategory.label}
                  </Text>
                  <Text className="mt-3 text-body-secondary">{draft.about}</Text>
                </View>
              </View>
            </View>
          ) : null}

          <ErrorMessage message={localError || error} />
        </ScrollView>

        <View className="absolute bottom-0 left-0 right-0 border-t border-blue-100 bg-white px-4 pb-5 pt-3">
          <TouchableOpacity
            className={`btn-primary min-h-[52px] ${
              isCreating ? 'opacity-70' : ''
            }`}
            activeOpacity={0.86}
            disabled={isCreating}
            onPress={handleNext}
          >
            {isCreating ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text className="text-title-primary text-inverse">
                  {step === STEPS.length - 1 ? 'Tạo nhóm' : 'Tiếp tục'}
                </Text>
                <ArrowRight size={19} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default CreateGroupScreen;

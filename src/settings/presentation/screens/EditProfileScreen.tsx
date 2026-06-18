// Description: Edits the authenticated user's public profile details.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Link,
  MapPin,
  Pencil,
  Save,
  User,
  X,
} from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import type { RootStackParamList } from '../../../navigation/types';
import { ROUTES } from '../../../navigation/constants/routes';
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';
import { AddressAutocomplete } from '../../../shared-kernel/presentation/components/AddressAutocomplete';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import { useUserViewModel } from '../../../user/application/view-models/useUserViewModel';
import { useMyInfoViewModel } from '../../application/view-models/useMyInfoViewModel';

type EditProfileScreenProps = NativeStackScreenProps<
  RootStackParamList,
  typeof ROUTES.EDIT_PROFILE
>;

type ProfileDetailsFormState = {
  firstName: string;
  lastName: string;
  website: string;
  about: string;
  working: string;
  workingLink: string;
  address: string;
  school: string;
  relationshipId: string;
  schoolCompleted: boolean;
};

const EMPTY_FORM: ProfileDetailsFormState = {
  firstName: '',
  lastName: '',
  website: '',
  about: '',
  working: '',
  workingLink: '',
  address: '',
  school: '',
  relationshipId: '0',
  schoolCompleted: false,
};

const EDIT_PROFILE_COPY = {
  vi: {
    title: 'Chỉnh sửa chi tiết',
    loading: 'Đang tải thông tin...',
    retry: 'Thử lại',
    firstName: 'Tên',
    lastName: 'Họ',
    website: 'Website',
    about: 'Giới thiệu',
    working: 'Công việc',
    companyWebsite: 'Website công ty',
    address: 'Địa chỉ',
    school: 'Trường học',
    relationship: 'Tình trạng quan hệ',
    schoolCompleted: 'Đã hoàn thành trường học',
    enabled: 'Bật',
    disabled: 'Tắt',
    save: 'Lưu thay đổi',
    saving: 'Đang lưu...',
    savedTitle: 'Đã cập nhật',
    savedMessage: 'Thông tin chi tiết của bạn đã được lưu.',
    errorTitle: 'Không lưu được',
    relationshipTitle: 'Chọn tình trạng quan hệ',
    addressPlaceholder: 'Tìm hoặc nhập địa chỉ',
    firstNamePlaceholder: 'Nhập tên',
    lastNamePlaceholder: 'Nhập họ',
    websitePlaceholder: 'https://example.com',
    aboutPlaceholder: 'Viết vài dòng về bạn...',
    workingPlaceholder: 'Công việc hiện tại',
    companyWebsitePlaceholder: 'https://company.com',
    schoolPlaceholder: 'Tên trường học',
    close: 'Đóng',
  },
  en: {
    title: 'Edit details',
    loading: 'Loading profile...',
    retry: 'Try again',
    firstName: 'First name',
    lastName: 'Last name',
    website: 'Website',
    about: 'About',
    working: 'Working',
    companyWebsite: 'Company website',
    address: 'Address',
    school: 'School',
    relationship: 'Relationship',
    schoolCompleted: 'School completed',
    enabled: 'Enabled',
    disabled: 'Disabled',
    save: 'Save changes',
    saving: 'Saving...',
    savedTitle: 'Updated',
    savedMessage: 'Your profile details have been saved.',
    errorTitle: 'Could not save',
    relationshipTitle: 'Choose relationship',
    addressPlaceholder: 'Search or enter address',
    firstNamePlaceholder: 'Enter first name',
    lastNamePlaceholder: 'Enter last name',
    websitePlaceholder: 'https://example.com',
    aboutPlaceholder: 'Write a short bio...',
    workingPlaceholder: 'Current work',
    companyWebsitePlaceholder: 'https://company.com',
    schoolPlaceholder: 'School name',
    close: 'Close',
  },
};

const RELATIONSHIP_OPTIONS = [
  {
    id: '0',
    label: {
      vi: 'Không',
      en: 'None',
    },
  },
  {
    id: '1',
    label: {
      vi: 'Độc thân',
      en: 'Single',
    },
  },
  {
    id: '2',
    label: {
      vi: 'Đang hẹn hò',
      en: 'In a relationship',
    },
  },
  {
    id: '3',
    label: {
      vi: 'Đã kết hôn',
      en: 'Married',
    },
  },
  {
    id: '4',
    label: {
      vi: 'Đã đính hôn',
      en: 'Engaged',
    },
  },
];

function fieldValue(value: unknown) {
  return String(value ?? '').trim();
}

function formFromProfile(profile: ReturnType<typeof useMyInfoViewModel>['profile']) {
  if (!profile) return EMPTY_FORM;

  return {
    firstName: fieldValue(profile.firstName),
    lastName: fieldValue(profile.lastName),
    website: fieldValue(profile.website),
    about: fieldValue(profile.about),
    working: fieldValue(profile.working),
    workingLink: fieldValue(profile.workingLink),
    address: fieldValue(profile.address),
    school: fieldValue(profile.school),
    relationshipId: fieldValue(profile.relationshipId) || '0',
    schoolCompleted: Boolean(profile.schoolCompleted),
  };
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function FieldIcon({ children }: { children: React.ReactNode }) {
  return (
    <View className="mr-3 h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
      {children}
    </View>
  );
}

function FormField({
  label,
  value,
  placeholder,
  icon,
  multiline = false,
  keyboardType,
  autoCapitalize = 'sentences',
  onChangeText,
}: {
  label: string;
  value: string;
  placeholder: string;
  icon: React.ReactNode;
  multiline?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad' | 'url';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  onChangeText: (value: string) => void;
}) {
  return (
    <View className="mb-4 flex-1">
      <Text className="mb-2 text-[15px] font-semibold text-slate-900">
        {label}
      </Text>
      <View
        className={`flex-row rounded-2xl border border-slate-200 bg-white px-3 ${
          multiline ? 'min-h-[124px] items-start py-3' : 'h-14 items-center'
        }`}
      >
        <FieldIcon>{icon}</FieldIcon>
        <TextInput
          className={`flex-1 p-0 text-[16px] text-slate-900 ${
            multiline ? 'min-h-[96px]' : ''
          }`}
          value={value}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          onChangeText={onChangeText}
        />
      </View>
    </View>
  );
}

function SelectField({
  label,
  value,
  icon,
  onPress,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <View className="mb-4 flex-1">
      <Text className="mb-2 text-[15px] font-semibold text-slate-900">
        {label}
      </Text>
      <TouchableOpacity
        activeOpacity={0.82}
        onPress={onPress}
        className="h-14 flex-row items-center rounded-2xl border border-slate-200 bg-white px-3"
      >
        <FieldIcon>{icon}</FieldIcon>
        <Text className="flex-1 text-[16px] text-slate-900" numberOfLines={1}>
          {value}
        </Text>
        <ChevronDown size={20} color="#94A3B8" />
      </TouchableOpacity>
    </View>
  );
}

function ToggleChoice({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.82}
      onPress={onPress}
      className={`h-12 flex-1 flex-row items-center justify-center rounded-2xl border ${
        active ? 'border-blue-600 bg-blue-600' : 'border-slate-200 bg-white'
      }`}
    >
      {active ? <Check size={18} color="#FFFFFF" /> : null}
      <Text
        className={`ml-2 text-[15px] font-bold ${
          active ? 'text-white' : 'text-slate-700'
        }`}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function RelationshipModal({
  visible,
  language,
  selectedId,
  title,
  closeLabel,
  onClose,
  onSelect,
}: {
  visible: boolean;
  language: 'vi' | 'en';
  selectedId: string;
  title: string;
  closeLabel: string;
  onClose: () => void;
  onSelect: (id: string) => void;
}) {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/40">
        <View className="rounded-t-[28px] bg-white px-5 pb-6 pt-4">
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-xl font-extrabold text-slate-950">
              {title}
            </Text>
            <TouchableOpacity
              activeOpacity={0.82}
              onPress={onClose}
              className="h-10 w-10 items-center justify-center rounded-full bg-slate-100"
              accessibilityLabel={closeLabel}
            >
              <X size={22} color="#334155" />
            </TouchableOpacity>
          </View>

          {RELATIONSHIP_OPTIONS.map(option => {
            const selected = option.id === selectedId;
            return (
              <TouchableOpacity
                key={option.id}
                activeOpacity={0.82}
                onPress={() => onSelect(option.id)}
                className={`mb-2 flex-row items-center rounded-2xl border px-4 py-4 ${
                  selected
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-slate-100 bg-white'
                }`}
              >
                <Text
                  className={`flex-1 text-[16px] font-semibold ${
                    selected ? 'text-blue-700' : 'text-slate-800'
                  }`}
                >
                  {option.label[language]}
                </Text>
                {selected ? <Check size={22} color="#0000ff" /> : null}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </Modal>
  );
}

function EditProfileScreen({ navigation }: EditProfileScreenProps) {
  const insets = useSafeAreaInsets();
  const language = useAppLanguage();
  const copy = EDIT_PROFILE_COPY[language] || EDIT_PROFILE_COPY.vi;
  const { profile, isLoading, error, retry, refresh } = useMyInfoViewModel();
  const { updateCurrentUser, isLoading: isSaving } = useUserViewModel();
  const [form, setForm] = useState<ProfileDetailsFormState>(EMPTY_FORM);
  const [relationshipVisible, setRelationshipVisible] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setForm(formFromProfile(profile));
    setHasHydrated(true);
  }, [profile]);

  const relationshipLabel = useMemo(() => {
    return (
      RELATIONSHIP_OPTIONS.find(option => option.id === form.relationshipId)
        ?.label[language] || RELATIONSHIP_OPTIONS[0].label[language]
    );
  }, [form.relationshipId, language]);

  const updateField = useCallback(
    <TKey extends keyof ProfileDetailsFormState>(
      key: TKey,
      value: ProfileDetailsFormState[TKey],
    ) => {
      setForm(previous => ({
        ...previous,
        [key]: value,
      }));
    },
    [],
  );

  const handleSave = useCallback(async () => {
    if (isSaving) return;

    try {
      await updateCurrentUser({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        website: form.website.trim(),
        about: form.about.trim(),
        working: form.working.trim(),
        workingLink: form.workingLink.trim(),
        address: form.address.trim(),
        school: form.school.trim(),
        relationshipId: form.relationshipId || '0',
        schoolCompleted: form.schoolCompleted,
      });
      await refresh();
      Alert.alert(copy.savedTitle, copy.savedMessage, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (caught) {
      Alert.alert(
        copy.errorTitle,
        getErrorMessage(caught, copy.errorTitle),
      );
    }
  }, [
    copy.errorTitle,
    copy.savedMessage,
    copy.savedTitle,
    form,
    isSaving,
    navigation,
    refresh,
    updateCurrentUser,
  ]);

  if (isLoading && !hasHydrated) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
        <FocusAwareStatusBar barStyle="dark-content" />
        <View className="h-16 flex-row items-center border-b border-slate-100 bg-white px-4">
          <TouchableOpacity
            activeOpacity={0.82}
            onPress={() => navigation.goBack()}
            className="h-11 w-11 items-center justify-center rounded-full bg-slate-50"
          >
            <ArrowLeft size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text className="ml-4 text-xl font-extrabold text-slate-950">
            {copy.title}
          </Text>
        </View>
        <View className="flex-1 items-center justify-center px-8">
          <ActivityIndicator size="large" color="#0000ff" />
          <Text className="mt-4 text-center text-[15px] text-slate-500">
            {copy.loading}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <FocusAwareStatusBar barStyle="dark-content" />

      <View className="h-16 flex-row items-center justify-between border-b border-slate-100 bg-white px-4">
        <TouchableOpacity
          activeOpacity={0.82}
          onPress={() => navigation.goBack()}
          className="h-11 w-11 items-center justify-center rounded-full bg-slate-50"
        >
          <ArrowLeft size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text className="text-xl font-extrabold text-slate-950">
          {copy.title}
        </Text>
        <View className="h-11 w-11" />
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 20,
            paddingBottom: insets.bottom + 28,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {error ? (
            <View className="mb-4 rounded-2xl border border-red-100 bg-red-50 p-4">
              <Text className="text-[14px] font-semibold text-red-700">
                {error}
              </Text>
              <TouchableOpacity
                activeOpacity={0.82}
                onPress={retry}
                className="mt-3 h-10 items-center justify-center rounded-xl bg-red-600"
              >
                <Text className="font-bold text-white">{copy.retry}</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <View className="rounded-[28px] border border-slate-100 bg-white p-4 shadow-sm">
            <View className="flex-row gap-3">
              <FormField
                label={copy.firstName}
                value={form.firstName}
                placeholder={copy.firstNamePlaceholder}
                icon={<User size={21} color="#0000ff" />}
                onChangeText={value => updateField('firstName', value)}
              />
              <FormField
                label={copy.lastName}
                value={form.lastName}
                placeholder={copy.lastNamePlaceholder}
                icon={<User size={21} color="#0000ff" />}
                onChangeText={value => updateField('lastName', value)}
              />
            </View>

            <FormField
              label={copy.website}
              value={form.website}
              placeholder={copy.websitePlaceholder}
              icon={<Link size={21} color="#0000ff" />}
              keyboardType="url"
              autoCapitalize="none"
              onChangeText={value => updateField('website', value)}
            />

            <FormField
              label={copy.about}
              value={form.about}
              placeholder={copy.aboutPlaceholder}
              icon={<Pencil size={21} color="#0000ff" />}
              multiline
              onChangeText={value => updateField('about', value)}
            />

            <View className="flex-row gap-3">
              <FormField
                label={copy.working}
                value={form.working}
                placeholder={copy.workingPlaceholder}
                icon={<Pencil size={21} color="#0000ff" />}
                onChangeText={value => updateField('working', value)}
              />
              <FormField
                label={copy.companyWebsite}
                value={form.workingLink}
                placeholder={copy.companyWebsitePlaceholder}
                icon={<Link size={21} color="#0000ff" />}
                keyboardType="url"
                autoCapitalize="none"
                onChangeText={value => updateField('workingLink', value)}
              />
            </View>

            <View className="mb-4">
              <Text className="mb-2 text-[15px] font-semibold text-slate-900">
                {copy.address}
              </Text>
              <AddressAutocomplete
                value={form.address}
                placeholder={copy.addressPlaceholder}
                onChangeText={value => updateField('address', value)}
                onSelectPlace={place =>
                  updateField('address', place.description || place.mainText)
                }
              />
            </View>

            <View className="flex-row gap-3">
              <FormField
                label={copy.school}
                value={form.school}
                placeholder={copy.schoolPlaceholder}
                icon={<Pencil size={21} color="#0000ff" />}
                onChangeText={value => updateField('school', value)}
              />
              <SelectField
                label={copy.relationship}
                value={relationshipLabel}
                icon={<User size={21} color="#0000ff" />}
                onPress={() => setRelationshipVisible(true)}
              />
            </View>

            <Text className="mb-2 text-[15px] font-semibold text-slate-900">
              {copy.schoolCompleted}
            </Text>
            <View className="mb-1 flex-row gap-3">
              <ToggleChoice
                label={copy.enabled}
                active={form.schoolCompleted}
                onPress={() => updateField('schoolCompleted', true)}
              />
              <ToggleChoice
                label={copy.disabled}
                active={!form.schoolCompleted}
                onPress={() => updateField('schoolCompleted', false)}
              />
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.86}
            disabled={isSaving}
            onPress={handleSave}
            className={`mt-6 h-14 flex-row items-center justify-center rounded-2xl ${
              isSaving ? 'bg-blue-300' : 'bg-blue-600'
            }`}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Save size={20} color="#FFFFFF" />
            )}
            <Text className="ml-2 text-[16px] font-extrabold text-white">
              {isSaving ? copy.saving : copy.save}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <RelationshipModal
        visible={relationshipVisible}
        language={language}
        selectedId={form.relationshipId}
        title={copy.relationshipTitle}
        closeLabel={copy.close}
        onClose={() => setRelationshipVisible(false)}
        onSelect={id => {
          updateField('relationshipId', id);
          setRelationshipVisible(false);
        }}
      />
    </SafeAreaView>
  );
}

export default EditProfileScreen;

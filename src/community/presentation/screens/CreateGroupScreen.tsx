// Description: Renders a multi-step create group form and submits it to WoWonder.
import { APP_BRAND_COLOR } from '../../../shared-kernel/presentation/theme/appColors';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  Pressable,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  ChevronDown,
  CheckCircle2,
  Globe2,
  Image as ImageIcon,
  Link2,
  Lock,
  Shapes,
  ShieldCheck,
  TrendingUp,
  Trash2,
  Users,
} from 'lucide-react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import { apiRoutes } from '../../../shared-kernel/application/constants/route-registry';
import { apiBridge } from '../../../shared-kernel/infrastructure/api/apiBridge';
import { apiConfig } from '../../../shared-kernel/infrastructure/config/env';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';
import { useCommunityViewModel } from '../../application/view-models/useCommunityViewModel';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import { SafeAreaFeedHeader } from '../../../feed/presentation/components/SafeAreaFeedHeader';
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';
import type {
  CreateGroupDraft,
  GroupMember,
  GroupItem,
  GroupPrivacy,
  UpdateGroupDraft,
} from '../../domain/types/community.types';

type CreateGroupNav = NativeStackNavigationProp<RootStackParamList>;
type CreateGroupRoute = RouteProp<RootStackParamList, typeof ROUTES.CREATE_GROUP | typeof ROUTES.EDIT_GROUP>;

type GroupCategory = {
  id: string;
  label: string;
};

type SiteSettingsResponse = {
  api_status?: number | string;
  group_categories?: Record<string, string> | Array<Record<string, unknown>>;
};

const BRAND = APP_BRAND_COLOR;
const GROUP_URL_PREFIX = `${apiConfig.webBaseUrl.replace(/\/+$/, '')}/`;
const GROUP_CATEGORIES: GroupCategory[] = [
  { id: '1', label: 'Hài kịch' },
  { id: '2', label: 'Kinh tế và Thương mại' },
  { id: '3', label: 'Giáo dục' },
  { id: '4', label: 'Giải trí' },
  { id: '5', label: 'Phim & Hoạt hình' },
  { id: '6', label: 'Chơi game' },
  { id: '7', label: 'Lịch sử và sự kiện' },
  { id: '8', label: 'Cách sống' },
  { id: '9', label: 'Thiên nhiên' },
  { id: '10', label: 'Tin tức và Chính trị' },
  { id: '11', label: 'Con người và Quốc gia' },
  { id: '12', label: 'Thú cưng và Động vật' },
  { id: '13', label: 'Địa điểm và Khu vực' },
  { id: '14', label: 'Khoa học và Công nghệ' },
  { id: '15', label: 'Thể thao' },
  { id: '16', label: 'Du lịch và Sự kiện' },
  { id: '17', label: 'Khác' },
];

const CREATE_GROUP_COPY = {
  vi: {
    groupTitleLabel: 'Tên nhóm',
    groupTitlePlaceholder: 'Tên nhóm',
    groupNameLabel: 'Đường dẫn nhóm',
    groupNamePlaceholder: 'tennhom',
    aboutLabel: 'Sự mô tả',
    aboutPlaceholder: 'Mô tả nhóm',
    privacyLabel: 'Loại nhóm',
    categoryLabel: 'Loại',
    btnCreate: 'Tạo ra',
    btnBack: 'Quay lại',
    btnSave: 'Lưu',
    errorTitleMinLength: 'Vui lòng nhập tên nhóm ít nhất 2 ký tự.',
    errorNameLength: 'URL nhóm phải từ 5 đến 32 ký tự.',
    errorAboutEmpty: 'Vui lòng nhập mô tả nhóm.',
    errorCategoryEmpty: 'Vui lòng chọn danh mục nhóm.',
    privacyPublic: 'Công cộng',
    privacyPrivate: 'Riêng tư',
    joinApprovalNo: 'Không',
    joinApprovalYes: 'Có',
    tabGeneral: 'Cài đặt chung',
    tabPrivacy: 'Cài đặt cá nhân',
    tabMedia: 'Ảnh đại diện & Ảnh bìa',
    tabMembers: 'Các thành viên',
    tabAnalytics: 'Phân tích nhóm',
    tabDelete: 'copy.confirmDeleteTitle',
    analyticsTotalMembers: 'Tổng số thành viên',
    analyticsRangeTitle: '{copy.analyticsRangeTitle}',
    analyticsChartTitle: '{copy.analyticsChartTitle}',
    deleteLabel: 'copy.alertDelete nhóm',
    deletePasswordLabel: 'Mật khẩu',
    deleteBtnSubmit: 'Xóa bỏ',
    deleteSuccess: 'Nhóm đã được xóa.',
    editSuccess: 'Nhóm đã được cập nhật.',
    membersEmpty: '{copy.membersEmpty}',
    joinApprovalLabel: 'Xác nhận yêu cầu khi ai đó tham gia nhóm này?',
    confirmDeleteTitle: 'Xác nhận xóa',
    confirmDeleteMsg: 'copy.confirmDeleteMsg',
    alertCancel: 'copy.alertCancel',
    alertDelete: 'Xóa',
    categories: {
      '1': 'Hài kịch',
      '2': 'Kinh tế và Thương mại',
      '3': 'Giáo dục',
      '4': 'Giải trí',
      '5': 'Phim & Hoạt hình',
      '6': 'Chơi game',
      '7': 'Lịch sử và sự kiện',
      '8': 'Cách sống',
      '9': 'Thiên nhiên',
      '10': 'Tin tức và Chính trị',
      '11': 'Con người và Quốc gia',
      '12': 'Thú cưng và Động vật',
      '13': 'Địa điểm và Khu vực',
      '14': 'Khoa học và Công nghệ',
      '15': 'Thể thao',
      '16': 'Du lịch và Sự kiện',
      '17': 'Khác',
    }
  },
  en: {
    groupTitleLabel: 'Group name',
    groupTitlePlaceholder: 'Group name',
    groupNameLabel: 'Group URL',
    groupNamePlaceholder: 'groupname',
    aboutLabel: 'Description',
    aboutPlaceholder: 'Group description',
    privacyLabel: 'Privacy',
    categoryLabel: 'Category',
    btnCreate: 'Create',
    btnBack: 'Back',
    btnSave: 'Save',
    errorTitleMinLength: 'Please enter a group name of at least 2 characters.',
    errorNameLength: 'Group URL must be between 5 and 32 characters.',
    errorAboutEmpty: 'Please enter a description for the group.',
    errorCategoryEmpty: 'Please select a category for the group.',
    privacyPublic: 'Public',
    privacyPrivate: 'Private',
    joinApprovalNo: 'No',
    joinApprovalYes: 'Yes',
    tabGeneral: 'General Settings',
    tabPrivacy: 'Privacy Settings',
    tabMedia: 'Avatar & Cover',
    tabMembers: 'Members',
    tabAnalytics: 'Group Analytics',
    tabDelete: 'Delete Group',
    analyticsTotalMembers: 'Total members',
    analyticsRangeTitle: 'Statistics Period',
    analyticsChartTitle: 'Joined Chart',
    deleteLabel: 'Delete Group',
    deletePasswordLabel: 'Password',
    deleteBtnSubmit: 'Delete',
    deleteSuccess: 'Group has been deleted.',
    editSuccess: 'Group has been updated.',
    membersEmpty: 'No members to display',
    joinApprovalLabel: 'Confirm request when someone joins this group?',
    confirmDeleteTitle: 'Confirm Delete',
    confirmDeleteMsg: 'Are you sure you want to delete this group?',
    alertCancel: 'Cancel',
    alertDelete: 'Delete',
    categories: {
      '1': 'Comedy',
      '2': 'Business',
      '3': 'Education',
      '4': 'Entertainment',
      '5': 'Film & Animation',
      '6': 'Gaming',
      '7': 'History & Facts',
      '8': 'Lifestyle',
      '9': 'Natural',
      '10': 'News & Politics',
      '11': 'People & Nations',
      '12': 'Pets & Animals',
      '13': 'Places & Regions',
      '14': 'Science & Technology',
      '15': 'Sport',
      '16': 'Travel & Events',
      '17': 'Other',
    }
  }
};

const INITIAL_DRAFT: CreateGroupDraft = {
  groupName: '',
  groupTitle: '',
  about: '',
  category: GROUP_CATEGORIES[0].id,
  privacy: 'public',
};

const STEPS = ['Thông tin nhóm', 'Thiết lập nhóm', 'Hoàn tất'];

const EDIT_TABS = [
  { id: 'general', icon: Shapes },
  { id: 'privacy', icon: Lock },
  { id: 'media', icon: Camera },
  { id: 'members', icon: Users },
  { id: 'analytics', icon: TrendingUp },
  { id: 'delete', icon: Trash2 },
] as const;

type EditGroupTab = (typeof EDIT_TABS)[number]['id'];

type PickedGroupMedia = {
  uri: string;
  name: string;
  type: string;
};

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

function getGroupEditId(group?: GroupItem) {
  const raw = group?.raw && typeof group.raw === 'object'
    ? group.raw as Record<string, unknown>
    : undefined;
  const id = group?.groupId || group?.id || raw?.group_id || raw?.id;
  return id === undefined || id === null ? '' : String(id);
}

function buildEditDraft(group: GroupItem): UpdateGroupDraft {
  return {
    groupName: group.groupName || '',
    groupTitle: group.groupTitle || '',
    about: group.about || '',
    category: group.category || GROUP_CATEGORIES[0].id,
    privacy: group.privacy || 'public',
    joinPrivacy: group.joinPrivacy || 'open',
  };
}

function normalizeGroupCategories(input: SiteSettingsResponse['group_categories']) {
  if (!input) return [];

  if (Array.isArray(input)) {
    return input
      .map(item => {
        const id = item.id ?? item.category_id ?? item.key ?? item.value;
        const label = item.lang ?? item.label ?? item.name ?? item.category_name ?? item.title;

        return {
          id: id === undefined || id === null ? '' : String(id),
          label: label === undefined || label === null ? '' : String(label),
        };
      })
      .filter(category => category.id && category.label);
  }

  return Object.entries(input)
    .map(([id, label]) => ({ id: String(id), label: String(label) }))
    .filter(category => category.id && category.label);
}

type SheetOption = {
  value: string;
  label: string;
};

function BottomSheetSelect({
  title,
  value,
  options,
  onSelect,
}: {
  title: string;
  value: string;
  options: SheetOption[];
  onSelect: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find(option => option.value === value) ?? options[0];

  return (
    <View>
      <TouchableOpacity
        activeOpacity={0.84}
        onPress={() => setOpen(true)}
        className="min-h-[48px] flex-row items-center justify-between rounded-xl border border-slate-200 bg-white px-4"
      >
        <Text className="flex-1 text-body-primary">
          {selected?.label || 'Chọn'}
        </Text>
        <ChevronDown size={18} color="#64748B" />
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <View className="flex-1 justify-end bg-black/40">
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setOpen(false)}
            className="absolute bottom-0 left-0 right-0 top-0"
          />
          <View className="rounded-t-3xl bg-white px-4 pb-6 pt-3" style={{ maxHeight: '72%' }}>
            <View className="mb-3 items-center">
              <View className="h-1 w-12 rounded-full bg-slate-300" />
            </View>
            <Text className="mb-3 text-title-primary">{title}</Text>
            <View className="overflow-hidden rounded-2xl border border-slate-200">
              <ScrollView
                nestedScrollEnabled
                showsVerticalScrollIndicator
                persistentScrollbar
                style={{ maxHeight: 360 }}
              >
                {options.map(option => {
                  const isSelected = option.value === selected?.value;

                  return (
                    <TouchableOpacity
                      key={option.value}
                      activeOpacity={0.84}
                      onPress={() => {
                        onSelect(option.value);
                        setOpen(false);
                      }}
                      className={`min-h-[52px] flex-row items-center border-b border-slate-100 px-4 ${
                        isSelected ? 'bg-brand-subtle' : 'bg-white'
                      }`}
                    >
                      <Text className={`flex-1 text-body-primary ${isSelected ? 'text-brand' : 'text-slate-700'}`}>
                        {option.label}
                      </Text>
                      {isSelected ? <CheckCircle2 size={19} color={BRAND} /> : null}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
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
          <View className="h-1 overflow-hidden rounded-full bg-brand-soft">
            {index <= step ? (
              <View className="h-full w-full rounded-full bg-brand" />
            ) : null}
          </View>
          <Text
            className={`mt-2 text-center text-[11px] ${
              index <= step ? 'text-brand-pressed' : 'text-slate-400'
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
      <View className="h-12 w-12 items-center justify-center rounded-full bg-brand-subtle">
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
  const language = useAppLanguage();
  const copy = CREATE_GROUP_COPY[language] ?? CREATE_GROUP_COPY.vi;
  const navigation = useNavigation<CreateGroupNav>();
  const route = useRoute<CreateGroupRoute>();
  const editingGroup = route.params && 'group' in route.params ? route.params.group : undefined;
  const editingGroupId = getGroupEditId(editingGroup);
  const isEditing = Boolean(editingGroup && editingGroupId);

  const {
    createGroup,
    updateGroup,
    updateGroupMedia,
    getGroupMembers,
    removeGroupMember,
    deleteGroup,
    clearError,
    error,
    isCreating,
    isLoading,
  } =
    useCommunityViewModel();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<CreateGroupDraft | UpdateGroupDraft>(() =>
    isEditing && editingGroup ? buildEditDraft(editingGroup) : INITIAL_DRAFT,
  );
  const [activeEditTab, setActiveEditTab] = useState<EditGroupTab>('general');
  const [localError, setLocalError] = useState<string | null>(null);
  const [groupNameEdited, setGroupNameEdited] = useState(false);
  const [groupCategories, setGroupCategories] = useState<GroupCategory[]>(GROUP_CATEGORIES);
  const [pickedMedia, setPickedMedia] = useState<Partial<Record<'avatar' | 'cover', PickedGroupMedia>>>({});
  const [isSavingMedia, setIsSavingMedia] = useState(false);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [analyticsRange, setAnalyticsRange] = useState('today');
  const [isAnalyticsRangeOpen, setIsAnalyticsRangeOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');

  useEffect(() => {
    let mounted = true;

    apiBridge
      .post<SiteSettingsResponse>(apiRoutes.auth.siteSettings, {})
      .then(response => {
        if (!mounted) return;
        const categories = normalizeGroupCategories(response.group_categories);
        if (categories.length > 0) {
          setGroupCategories(categories);
          setDraft(current => {
            const exists = categories.some(category => category.id === current.category);
            return exists ? current : { ...current, category: categories[0].id };
          });
        }
      })
      .catch(() => {
        // Fallback categories mirror the phtml defaults.
      });

    return () => {
      mounted = false;
    };
  }, []);

  const selectedCategory = useMemo(
    () =>
      groupCategories.find(category => category.id === draft.category) ??
      groupCategories[0] ??
      GROUP_CATEGORIES[0],
    [draft.category, groupCategories],
  );
  const analyticsRangeOptions = useMemo(
    () => [
      { value: 'today', label: 'Hôm nay' },
      { value: 'week', label: 'Tuần này' },
      { value: 'month', label: 'Tháng này' },
      { value: 'year', label: 'Năm nay' },
    ],
    [],
  );
  const selectedAnalyticsRange = useMemo(
    () =>
      analyticsRangeOptions.find(option => option.value === analyticsRange) ??
      analyticsRangeOptions[0],
    [analyticsRange, analyticsRangeOptions],
  );
  const analyticsMemberTotal = members.length || editingGroup?.members || 0;

  const clearErrors = useCallback(() => {
    setLocalError(null);
    clearError();
  }, [clearError]);

  const updateDraft = useCallback(
    <TKey extends keyof UpdateGroupDraft>(
      key: TKey,
      value: UpdateGroupDraft[TKey],
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
      if (isEditing) {
        await updateGroup(editingGroupId, draft);
        Alert.alert(copy.editSuccess, '', [
          { text: 'Xong', onPress: () => navigation.goBack() },
        ]);
        return;
      }

      const group = await createGroup(draft);

      if (!group) return;

      Alert.alert(
        copy.editSuccess,
        `Nhóm "${group.groupTitle || draft.groupTitle}" đã được tạo.`,
        [{ text: 'Xong', onPress: () => navigation.goBack() }],
      );
    } catch {
      // The view-model exposes a Vietnamese error message below the form.
    }
  }, [
    clearErrors,
    createGroup,
    draft,
    editingGroupId,
    isEditing,
    navigation,
    step,
    updateGroup,
    validateStep,
  ]);

  const handleCreateSubmit = useCallback(async () => {
    if (draft.groupTitle.trim().length < 2) {
      setLocalError(copy.errorTitleMinLength);
      return;
    }

    if (draft.groupName.length < 5 || draft.groupName.length > 32) {
      setLocalError(copy.errorNameLength);
      return;
    }

    if (!draft.about.trim()) {
      setLocalError(copy.errorAboutEmpty);
      return;
    }

    if (!draft.category) {
      setLocalError(copy.errorCategoryEmpty);
      return;
    }

    clearErrors();

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
  }, [clearErrors, createGroup, draft, navigation]);



  const handleSaveEdit = useCallback(async () => {
    if (!editingGroupId) return;

    if (draft.groupTitle.trim().length < 2) {
      setLocalError('Vui lòng nhập tên nhóm ít nhất 2 ký tự.');
      return;
    }

    if (draft.groupName.length < 5 || draft.groupName.length > 32) {
      setLocalError('URL nhóm phải từ 5 đến 32 ký tự.');
      return;
    }

    if (!draft.about.trim()) {
      setLocalError('Vui lòng nhập mô tả nhóm.');
      return;
    }

    clearErrors();

    try {
      await updateGroup(editingGroupId, draft);
      Alert.alert(copy.editSuccess, '');
    } catch {
      // The view-model exposes a Vietnamese error message below the form.
    }
  }, [clearErrors, draft, editingGroupId, updateGroup]);

  const handlePickMedia = useCallback(async (field: 'avatar' | 'cover') => {
    clearErrors();

    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.9,
      selectionLimit: 1,
    });
    const asset = result.assets?.[0];

    if (!asset?.uri) return;

    setPickedMedia(current => ({
      ...current,
      [field]: {
        uri: asset.uri,
        name: asset.fileName || `${field}_${Date.now()}.jpg`,
        type: asset.type || 'image/jpeg',
      },
    }));
  }, [clearErrors]);

  const handleSaveMedia = useCallback(async () => {
    if (!editingGroupId) return;

    const entries = Object.entries(pickedMedia) as Array<['avatar' | 'cover', PickedGroupMedia]>;

    if (entries.length === 0) {
      setLocalError('Vui lòng chọn ảnh trước khi lưu.');
      return;
    }

    clearErrors();
    setIsSavingMedia(true);

    try {
      await Promise.all(
        entries.map(([field, file]) => updateGroupMedia(editingGroupId, field, file)),
      );
      Alert.alert('Thành công', 'Ảnh nhóm đã được cập nhật.');
    } catch (mediaError) {
      setLocalError(
        mediaError instanceof Error
          ? mediaError.message
          : 'Không thể cập nhật ảnh nhóm. Vui lòng thử lại.',
      );
    } finally {
      setIsSavingMedia(false);
    }
  }, [clearErrors, editingGroupId, pickedMedia, updateGroupMedia]);

  const loadMembers = useCallback(async () => {
    if (!editingGroupId) return;

    setIsLoadingMembers(true);
    setLocalError(null);
    clearError();

    try {
      const nextMembers = await getGroupMembers(editingGroupId);
      setMembers(nextMembers);
    } catch (membersError) {
      setLocalError(
        membersError instanceof Error
          ? membersError.message
          : 'Không thể tải thành viên nhóm.',
      );
    } finally {
      setIsLoadingMembers(false);
    }
  }, [clearError, editingGroupId, getGroupMembers]);

  useEffect(() => {
    if (!isEditing || activeEditTab !== 'members') return;
    void loadMembers();
  }, [activeEditTab, isEditing, loadMembers]);

  const handleRemoveMember = useCallback(
    (member: GroupMember) => {
      if (!editingGroupId || !member.userId) return;

      Alert.alert(
        'Xóa thành viên',
        `Xóa ${member.name || member.username || 'thành viên này'} khỏi nhóm?`,
        [
          { text: 'Hủy', style: 'cancel' },
          {
            text: 'Xóa',
            style: 'destructive',
            onPress: async () => {
              setRemovingMemberId(member.userId);
              setLocalError(null);
              clearError();

              try {
                await removeGroupMember(editingGroupId, member.userId);
                setMembers(current =>
                  current.filter(item => item.userId !== member.userId),
                );
              } catch (removeError) {
                setLocalError(
                  removeError instanceof Error
                    ? removeError.message
                    : 'Không thể xóa thành viên khỏi nhóm.',
                );
              } finally {
                setRemovingMemberId(null);
              }
            },
          },
        ],
      );
    },
    [clearError, editingGroupId, removeGroupMember],
  );

  const handleDeleteGroup = useCallback(() => {
    if (!editingGroupId) return;

    if (!deletePassword.trim()) {
      setLocalError('Vui lòng nhập mật khẩu.');
      return;
    }

    Alert.alert(
      'Xóa nhóm',
      'Bạn có chắc muốn xóa nhóm này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa bỏ',
          style: 'destructive',
          onPress: async () => {
            setLocalError(null);
            clearError();

            try {
              await deleteGroup(editingGroupId, deletePassword);
              Alert.alert('Thành công', 'Nhóm đã được xóa.', [
                { text: 'Xong', onPress: () => navigation.goBack() },
              ]);
            } catch (deleteError) {
              setLocalError(
                deleteError instanceof Error
                  ? deleteError.message
                  : 'Không thể xóa nhóm. Vui lòng thử lại.',
              );
            }
          },
        },
      ],
    );
  }, [clearError, deleteGroup, deletePassword, editingGroupId, navigation]);

  if (isEditing) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        <FocusAwareStatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <SafeAreaFeedHeader />

        <View className="flex-row bg-cyan-500">
          {EDIT_TABS.map(tab => {
            const Icon = tab.icon;
            const active = activeEditTab === tab.id;

            return (
              <TouchableOpacity
                key={tab.id}
                activeOpacity={0.84}
                onPress={() => {
                  clearErrors();
                  setActiveEditTab(tab.id);
                }}
                className={`h-12 flex-1 items-center justify-center ${active ? 'bg-cyan-600' : ''}`}
              >
                <Icon size={19} color="#FFFFFF" />
              </TouchableOpacity>
            );
          })}
        </View>

        <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            className="flex-1"
            contentContainerClassName="pb-10"
            keyboardShouldPersistTaps="handled"
          >
            {activeEditTab === 'general' ? (
              <View className="bg-white px-4 pb-8 pt-5">
                <View className="mb-5 flex-row items-center">
                  <View className="h-8 w-8 items-center justify-center rounded-full bg-brand">
                    <Shapes size={17} color="#FFFFFF" />
                  </View>
                  <Text className="ml-2 text-title-primary">{copy.tabGeneral}</Text>
                </View>

                <Text className="text-title-primary">{copy.groupTitleLabel}</Text>
                <TextInput
                  className="mt-2 min-h-[48px] border-b border-slate-200 px-1 text-body-primary"
                  value={draft.groupTitle}
                  onChangeText={handleTitleChange}
                  placeholder={copy.groupTitlePlaceholder}
                  placeholderTextColor="#94A3B8"
                />

                <Text className="mt-5 text-title-primary">{copy.categoryLabel}</Text>
                <BottomSheetSelect
                  title={copy.categoryLabel}
                  value={draft.category}
                  options={groupCategories.map(category => ({
                    value: category.id,
                    label: category.label,
                  }))}
                  onSelect={value => updateDraft('category', value)}
                />

                <Text className="mt-5 text-title-primary">{copy.groupNameLabel}</Text>
                <View className="mt-2">
                  <Text className="self-start bg-slate-100 px-2 py-1 text-caption-secondary">
                    {GROUP_URL_PREFIX}
                  </Text>
                  <TextInput
                    className="min-h-[48px] border border-slate-200 px-3 text-body-primary"
                    value={draft.groupName}
                    onChangeText={handleGroupNameChange}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <Text className="mt-5 text-title-primary">{copy.aboutLabel}</Text>
                <TextInput
                  className="mt-2 min-h-[120px] border border-slate-200 px-3 py-3 text-body-primary"
                  value={draft.about}
                  onChangeText={value => updateDraft('about', value)}
                  multiline
                  textAlignVertical="top"
                  placeholder={copy.aboutPlaceholder}
                  placeholderTextColor="#94A3B8"
                />

                <ErrorMessage message={localError || error} />

                <TouchableOpacity
                  activeOpacity={0.86}
                  disabled={isLoading}
                  onPress={handleSaveEdit}
                  className="mt-7 min-h-[46px] w-32 self-center items-center justify-center rounded-lg bg-brand"
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text className="text-title-primary text-inverse">Lưu</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : null}

            {activeEditTab === 'privacy' ? (
              <View className="bg-white px-4 pb-8 pt-5">
                <View className="mb-5 flex-row items-center">
                  <View className="h-8 w-8 items-center justify-center rounded-full bg-brand">
                    <Lock size={17} color="#FFFFFF" />
                  </View>
                  <Text className="ml-2 text-title-primary">{copy.tabPrivacy}</Text>
                </View>
                <Text className="text-title-primary">{copy.privacyLabel}</Text>
                <BottomSheetSelect
                  title={copy.privacyLabel}
                  value={draft.privacy}
                  options={[
                    { value: 'public', label: copy.privacyPublic },
                    { value: 'private', label: copy.privacyPrivate },
                  ]}
                  onSelect={value => updateDraft('privacy', value as GroupPrivacy)}
                />

                <Text className="mt-7 text-title-primary">{copy.joinApprovalLabel}</Text>
                <BottomSheetSelect
                  title="Xác nhận yêu cầu tham gia"
                  value={(draft as UpdateGroupDraft).joinPrivacy || 'open'}
                  options={[
                    { value: 'open', label: copy.joinApprovalNo },
                    { value: 'approval', label: copy.joinApprovalYes },
                  ]}
                  onSelect={value => updateDraft('joinPrivacy', value as UpdateGroupDraft['joinPrivacy'])}
                />
                <TouchableOpacity
                  activeOpacity={0.86}
                  disabled={isLoading}
                  onPress={handleSaveEdit}
                  className="mt-5 min-h-[46px] w-32 self-center items-center justify-center rounded-lg bg-brand"
                >
                  {isLoading ? <ActivityIndicator color="#FFFFFF" /> : <Text className="text-title-primary text-inverse">Lưu</Text>}
                </TouchableOpacity>
              </View>
            ) : null}

            {activeEditTab === 'media' ? (
              <View className="bg-white pb-8 pt-5">
                <View className="mb-5 flex-row items-center px-4">
                  <View className="h-8 w-8 items-center justify-center rounded-full bg-brand">
                    <Camera size={17} color="#FFFFFF" />
                  </View>
                  <Text className="ml-2 text-title-primary">{copy.tabMedia}</Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.86}
                  className="h-44 items-center justify-center bg-slate-100"
                  onPress={() => handlePickMedia('cover')}
                >
                  {pickedMedia.cover?.uri || editingGroup?.cover ? (
                    <Image
                      source={{ uri: pickedMedia.cover?.uri || editingGroup?.cover || '' }}
                      className="h-full w-full"
                      resizeMode="cover"
                    />
                  ) : (
                    <ImageIcon size={28} color="#334155" />
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.86}
                  className="-mt-16 h-32 w-32 self-center overflow-hidden rounded-full border-4 border-white bg-slate-100"
                  onPress={() => handlePickMedia('avatar')}
                >
                  {pickedMedia.avatar?.uri || editingGroup?.avatar ? (
                    <Image
                      source={{ uri: pickedMedia.avatar?.uri || editingGroup?.avatar || '' }}
                      className="h-full w-full"
                      resizeMode="cover"
                    />
                  ) : (
                    <View className="h-full w-full items-center justify-center">
                      <Camera size={30} color="#334155" />
                    </View>
                  )}
                </TouchableOpacity>

                <View className="px-4">
                  <ErrorMessage message={localError || error} />
                  <TouchableOpacity
                    activeOpacity={0.86}
                    disabled={isSavingMedia}
                    onPress={handleSaveMedia}
                    className="mt-7 min-h-[46px] w-32 self-center items-center justify-center rounded-lg bg-brand"
                  >
                    {isSavingMedia ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text className="text-title-primary text-inverse">Lưu</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}

            {activeEditTab === 'members' ? (
              <View className="bg-white px-4 pb-8 pt-5">
                <View className="mb-5 flex-row items-center">
                  <View className="h-8 w-8 items-center justify-center rounded-full bg-brand">
                    <Users size={17} color="#FFFFFF" />
                  </View>
                  <Text className="ml-2 text-title-primary">{copy.tabMembers}</Text>
                </View>
                <ErrorMessage message={localError || error} />

                {isLoadingMembers ? (
                  <View className="min-h-[260px] items-center justify-center">
                    <ActivityIndicator color={BRAND} />
                  </View>
                ) : members.length === 0 ? (
                  <View className="min-h-[260px] items-center justify-center">
                    <View className="h-16 w-16 items-center justify-center rounded-full bg-slate-400">
                      <Users size={32} color="#FFFFFF" />
                    </View>
                    <Text className="mt-4 text-center text-body-secondary">
                      Không có thành viên nào để hiển thị
                    </Text>
                  </View>
                ) : (
                  <View className="overflow-hidden rounded-lg border border-slate-100">
                    {members.map(member => {
                      const isRemoving = removingMemberId === member.userId;

                      return (
                        <View
                          key={member.userId || member.id || member.username}
                          className="flex-row items-center border-b border-slate-100 bg-white px-3 py-3 last:border-b-0"
                        >
                          {member.avatar ? (
                            <Image
                              source={{ uri: member.avatar }}
                              className="h-12 w-12 rounded-full bg-slate-100"
                              resizeMode="cover"
                            />
                          ) : (
                            <View className="h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                              <Users size={22} color="#64748B" />
                            </View>
                          )}

                          <View className="ml-3 flex-1">
                            <Text className="text-title-primary" numberOfLines={1}>
                              {member.name}
                            </Text>
                            <Text className="mt-0.5 text-caption-secondary" numberOfLines={1}>
                              {member.username ? `@${member.username}` : `ID ${member.userId}`}
                            </Text>
                            {member.isAdmin ? (
                              <Text className="mt-1 text-caption-primary text-brand">
                                Quản trị viên
                              </Text>
                            ) : null}
                          </View>

                          <TouchableOpacity
                            activeOpacity={0.86}
                            disabled={!member.userId || isRemoving || isLoading}
                            onPress={() => handleRemoveMember(member)}
                            className="min-h-[36px] min-w-[64px] items-center justify-center rounded-lg bg-red-50 px-3"
                          >
                            {isRemoving ? (
                              <ActivityIndicator size="small" color="#DC2626" />
                            ) : (
                              <Text className="text-caption-primary text-red-600">Xóa</Text>
                            )}
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            ) : null}

            {activeEditTab === 'analytics' ? (
              <View className="bg-white pb-8 pt-5">
                <View className="mb-2 flex-row items-center px-4">
                  <View className="h-8 w-8 items-center justify-center rounded-full bg-green-100">
                    <Users size={17} color="#22C55E" />
                  </View>
                  <Text className="ml-2 text-title-primary text-green-600">{analyticsMemberTotal} {copy.analyticsTotalMembers}</Text>
                </View>
                <View className="border-y border-slate-300">
                  <TouchableOpacity
                    activeOpacity={0.86}
                    onPress={() => setIsAnalyticsRangeOpen(current => !current)}
                    className="min-h-[46px] flex-row items-center px-3"
                  >
                    <Text className="flex-1 text-body-primary">
                      {selectedAnalyticsRange.label}
                    </Text>
                    <ChevronDown size={18} color="#64748B" />
                  </TouchableOpacity>

                  {isAnalyticsRangeOpen ? (
                    <View className="border-t border-slate-200">
                      {analyticsRangeOptions.map(option => {
                        const selected = option.value === analyticsRange;

                        return (
                          <TouchableOpacity
                            key={option.value}
                            activeOpacity={0.84}
                            onPress={() => {
                              setAnalyticsRange(option.value);
                              setIsAnalyticsRangeOpen(false);
                            }}
                            className={`min-h-[44px] justify-center px-4 ${
                              selected ? 'bg-brand' : 'bg-white'
                            }`}
                          >
                            <Text className={`text-body-primary ${selected ? 'text-white' : 'text-slate-700'}`}>
                              {option.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ) : null}
                </View>
              </View>
            ) : null}

            {activeEditTab === 'delete' ? (
              <View className="bg-white px-4 pb-8 pt-5">
                <View className="mb-5 flex-row items-center">
                  <View className="h-8 w-8 items-center justify-center rounded-full bg-red-600">
                    <Trash2 size={17} color="#FFFFFF" />
                  </View>
                  <Text className="ml-2 text-title-primary text-red-600">{copy.deleteLabel}</Text>
                </View>

                <Text className="text-title-primary">{copy.deletePasswordLabel}</Text>
                <TextInput
                  className="mt-2 min-h-[48px] border border-slate-200 px-3 text-body-primary"
                  value={deletePassword}
                  onChangeText={value => {
                    clearErrors();
                    setDeletePassword(value);
                  }}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <ErrorMessage message={localError || error} />

                <TouchableOpacity
                  activeOpacity={0.86}
                  disabled={isLoading}
                  onPress={handleDeleteGroup}
                  className="mt-7 min-h-[46px] w-32 self-center items-center justify-center rounded-lg bg-brand"
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text className="text-title-primary text-inverse">{copy.deleteBtnSubmit}</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>

        <View
          style={{
            height: 72,
            borderTopWidth: 1,
            borderTopColor: '#E2E8F0',
            backgroundColor: '#FFFFFF',
            paddingHorizontal: 20,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <TouchableOpacity
            activeOpacity={0.82}
            onPress={() => navigation.goBack()}
            style={{ minHeight: 44, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}
          >
            <ArrowLeft size={18} color="#64748B" />
            <Text style={{ color: '#64748B', fontSize: 14, fontWeight: '700' }}>{copy.btnBack}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <FocusAwareStatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <SafeAreaFeedHeader />

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
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 8 }}>{copy.groupTitleLabel}</Text>
          <TextInput
            style={{
              minHeight: 48,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: '#cbd5e1',
              backgroundColor: '#FFFFFF',
              paddingHorizontal: 16,
              color: '#0f172a',
              fontSize: 15,
            }}
            value={draft.groupTitle}
            onChangeText={handleTitleChange}
            placeholder={copy.groupTitlePlaceholder}
            placeholderTextColor="#94A3B8"
          />

          <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A', marginTop: 20, marginBottom: 8 }}>{copy.groupNameLabel}</Text>
          <View>
            <View style={{ alignSelf: 'flex-start', backgroundColor: '#F1F5F9', borderRadius: 4, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 8 }}>
              <Text style={{ fontSize: 13, color: '#475569', fontWeight: '500' }}>
                {GROUP_URL_PREFIX}
              </Text>
            </View>
            <TextInput
              style={{
                minHeight: 48,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: '#cbd5e1',
                backgroundColor: '#FFFFFF',
                paddingHorizontal: 16,
                color: '#0f172a',
                fontSize: 15,
              }}
              value={draft.groupName}
              onChangeText={handleGroupNameChange}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder={copy.groupNamePlaceholder}
              placeholderTextColor="#94A3B8"
            />
          </View>

          <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A', marginTop: 20, marginBottom: 8 }}>{copy.aboutLabel}</Text>
          <TextInput
            style={{
              minHeight: 120,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: '#cbd5e1',
              backgroundColor: '#FFFFFF',
              paddingHorizontal: 16,
              paddingVertical: 12,
              color: '#0f172a',
              fontSize: 15,
            }}
            value={draft.about}
            onChangeText={value => updateDraft('about', value)}
            multiline
            textAlignVertical="top"
            placeholder={copy.aboutPlaceholder}
            placeholderTextColor="#94A3B8"
          />

          <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A', marginTop: 20, marginBottom: 8 }}>{copy.privacyLabel}</Text>
          <BottomSheetSelect
            title="Loại nhóm"
            value={draft.privacy}
            options={[
              { value: 'public', label: copy.privacyPublic },
              { value: 'private', label: copy.privacyPrivate },
            ]}
            onSelect={value => updateDraft('privacy', value as GroupPrivacy)}
          />

          <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A', marginTop: 20, marginBottom: 8 }}>{copy.categoryLabel}</Text>
          <BottomSheetSelect
            title="Loại"
            value={draft.category}
            options={groupCategories.map(category => ({
              value: category.id,
              label: (copy.categories as Record<string, string>)[category.id] || category.label,
            }))}
            onSelect={value => updateDraft('category', value)}
          />

          <ErrorMessage message={localError || error} />
        </ScrollView>

        <View
          style={{
            height: 72,
            borderTopWidth: 1,
            borderTopColor: '#E2E8F0',
            backgroundColor: '#FFFFFF',
            paddingHorizontal: 20,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <TouchableOpacity
            activeOpacity={0.82}
            onPress={() => navigation.goBack()}
            style={{ minHeight: 44, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}
          >
            <ArrowLeft size={18} color="#64748B" />
            <Text style={{ color: '#64748B', fontSize: 14, fontWeight: '700' }}>Quay lại</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.86}
            disabled={isCreating}
            onPress={handleCreateSubmit}
            style={{
              minWidth: 128,
              minHeight: 46,
              borderRadius: 23,
              backgroundColor: APP_BRAND_COLOR,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: isCreating ? 0.7 : 1,
            }}
          >
            {isCreating ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '700' }}>{copy.btnCreate}</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

export default CreateGroupScreen;

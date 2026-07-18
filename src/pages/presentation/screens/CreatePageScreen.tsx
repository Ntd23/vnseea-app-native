// Description: Renders the VNSEEA create page form and submits to WoWonder API.
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
import { launchImageLibrary } from 'react-native-image-picker';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeInDown,
} from 'react-native-reanimated';
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';
import {
  ArrowLeft,
  AtSign,
  CheckCircle2,
  Edit3,
  FileText,
  Info,
  Shapes,
  AlertCircle,
  Link2,
  Car,
  Clapperboard,
  DollarSign,
  GraduationCap,
  Lightbulb,
  Camera,
  Laptop,
  Utensils,
  Briefcase,
  Shirt,
  Target,
  ChevronDown,
  Flag,
  ImageIcon,
  Paintbrush,
  Settings,
  Trash2,
  TrendingUp,
  UserPlus,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../../../navigation/types';
import AddressAutocomplete from '../../../shared-kernel/presentation/components/AddressAutocomplete';
import { apiConfig } from '../../../shared-kernel/infrastructure/config/env';
import { usePagesViewModel } from '../../application/view-models/usePagesViewModel';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import { showSnackbar as showToast } from '../../../shared-kernel/presentation/components/Snackbar';
import { SafeAreaFeedHeader } from '../../../feed/presentation/components/SafeAreaFeedHeader';
import type {
  CreatePageDraft,
  PagePrivileges,
  PageUser,
  PagesItem,
} from '../../domain/types/pages.types';

type CreatePageNav = NativeStackNavigationProp<RootStackParamList>;
type PageMediaField = 'avatar' | 'cover' | 'background_image';
type PickedPageMedia = { uri: string; name: string; type: string };

type PageCategory = {
  id: string;
  label: string;
};

const PAGE_CATEGORIES: PageCategory[] = [
  { id: '1', label: 'Ô tô và Xe cộ' },
  { id: '2', label: 'Hài hước' },
  { id: '3', label: 'Kinh tế' },
  { id: '4', label: 'Giáo dục' },
  { id: '5', label: 'Giải trí' },
  { id: '6', label: 'Phim ảnh' },
  { id: '7', label: 'Công nghệ' },
  { id: '8', label: 'Ẩm thực' },
  { id: '9', label: 'Du lịch' },
  { id: '10', label: 'Thời trang' },
  { id: '11', label: 'Thể thao' },
];

const CATEGORY_ICONS: Record<string, React.ComponentType<any>> = {
  '1': Car,
  '2': Clapperboard,
  '3': DollarSign,
  '4': GraduationCap,
  '5': Lightbulb,
  '6': Camera,
  '7': Laptop,
  '8': Utensils,
  '9': Briefcase,
  '10': Shirt,
  '11': Target,
};

const INITIAL_DRAFT: CreatePageDraft = {
  pageTitle: '',
  pageName: '',
  pageDescription: '',
  pageAddress: '',
  pageCategory: PAGE_CATEGORIES[0].id,
  company: '',
  phone: '',
  website: '',
  mapPinRequested: false,
  mapPinStatus: 'none',
  callActionType: 'read_more',
  callActionUrl: '',
  allowPost: false,
  verified: false,
  facebook: '',
  twitter: '',
  instgram: '',
  vk: '',
  linkedin: '',
  youtube: '',
  backgroundImageStatus: 'defualt',
};

const PAGE_URL_PREFIX = `${apiConfig.webBaseUrl.replace(/\/$/, '')}/`;

const PAGE_EDIT_TABS = [
  { id: 'general', Icon: Settings },
  { id: 'flag', Icon: Flag },
  { id: 'social', Icon: AtSign },
  { id: 'media', Icon: ImageIcon },
  { id: 'style', Icon: Paintbrush },
  { id: 'users', Icon: UserPlus },
  { id: 'stats', Icon: TrendingUp },
  { id: 'delete', Icon: Trash2 },
] as const;

type PageEditTab = (typeof PAGE_EDIT_TABS)[number]['id'];

const CALL_ACTION_OPTIONS = [
  { id: 'read_more', label: 'Read more' },
  { id: 'shop_now', label: 'Shop now' },
  { id: 'contact_us', label: 'Contact us' },
  { id: 'book_now', label: 'Book now' },
  { id: 'learn_more', label: 'Learn more' },
] as const;

const DEFAULT_PAGE_PRIVILEGES: PagePrivileges = {
  general: false,
  info: false,
  social: false,
  avatar: false,
  design: false,
  admins: false,
  analytics: false,
  delete_page: false,
};

const PAGE_PRIVILEGE_OPTIONS: Array<{
  key: keyof PagePrivileges;
  label: string;
}> = [
  { key: 'general', label: 'Cài đặt chung' },
  { key: 'info', label: 'Thông tin trang' },
  { key: 'social', label: 'Liên kết mạng xã hội' },
  { key: 'avatar', label: 'Ảnh đại diện và ảnh bìa' },
  { key: 'design', label: 'Thiết kế' },
  { key: 'admins', label: 'Quản trị viên' },
  { key: 'analytics', label: 'Thống kê' },
  { key: 'delete_page', label: 'Xóa trang' },
];

function readPagePrivileges(user?: PageUser | null): PagePrivileges {
  const raw = user?.raw as Record<string, any> | undefined;
  const source = raw?.admin_info && typeof raw.admin_info === 'object'
    ? raw.admin_info as Record<string, any>
    : raw;

  const read = (key: keyof PagePrivileges) => {
    const value = source?.[key];
    return value === true || value === 1 || value === '1';
  };

  return {
    general: read('general'),
    info: read('info'),
    social: read('social'),
    avatar: read('avatar'),
    design: read('design'),
    admins: read('admins'),
    analytics: read('analytics'),
    delete_page: read('delete_page'),
  };
}

function toSafePageName(value: string) {
  return value
    .replace(/\u0111/g, 'd')
    .replace(/\u0110/g, 'D')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/^@+/, '')
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/_+/g, '_')
    .replace(/^[-_]+|[-_]+$/g, '')
    .slice(0, 32);
}

const CREATE_PAGE_COPY = {
  vi: {
    headerTitle: 'Tạo trang mới',
    headerEditTitle: 'Sửa trang',
    title: 'Thông tin trang của bạn',
    inputLabel: 'Tên trang',
    inputPlaceholder: 'Nhập tên trang',
    inputHint: 'Ví dụ: Quán Cà Phê VNSEEA, Cộng đồng Designer Việt Nam',
    errorMinLength: 'Vui lòng nhập tên trang ít nhất 2 ký tự.',
    step2InputLabel: 'Trang URL',
    step2InputPlaceholder: 'tentrangcuaban',
    step2LinkPrefix: 'Link trang: ',
    step2Hint: 'Tên URL dài 5–32 ký tự và chỉ gồm chữ cái không dấu, số và dấu gạch ngang (-).',
    step2ErrorLength: 'Tên URL của trang phải từ 5 đến 32 ký tự.',
    step2ErrorChars: 'Tên URL chỉ được dùng chữ cái không dấu, số, gạch dưới hoặc gạch ngang.',
    step3DescLabel: 'Mô tả trang',
    step3DescPlaceholder: 'Viết vài dòng giới thiệu về trang...',
    step3DescHint: 'Tối thiểu 10, tối đa 200 ký tự',
    step3AddressLabel: 'Địa điểm',
    step3AddressPlaceholder: 'Tìm địa điểm từ Google Maps',
    step3PinLabel: 'Yêu cầu ghim trên bản đồ',
    step3PinDesc: 'Admin sẽ duyệt trước khi tên trang hiển thị trực tiếp trên bản đồ tìm kiếm gần đây.',
    step3PinStatusNone: 'Chưa yêu cầu ghim',
    step3PinStatusPending: 'Đang chờ duyệt',
    step3PinStatusApproved: 'Đã duyệt',
    step3PinStatusRequested: 'Sẽ gửi duyệt',
    step3ErrorDescLength: 'Mô tả trang phải từ 10 đến 200 ký tự.',
    step3ErrorAddressEmpty: 'Vui lòng nhập địa điểm của trang.',
    step3ErrorAddressSelect: 'Vui lòng chọn địa điểm từ gợi ý Google Maps.',
    step4Subtitle: 'Chọn danh mục phù hợp nhất để mọi người dễ dàng tìm thấy trang của bạn.',
    step4Hint: 'Trang của bạn sẽ hiển thị trong kết quả tìm kiếm dựa trên danh mục này. Bạn có thể thay đổi danh mục sau trong phần cài đặt trang.',
    step4ErrorCategory: 'Vui lòng chọn danh mục cho trang.',
    categories: {
      '1': 'Ô tô và Xe cộ',
      '2': 'Hài hước',
      '3': 'Kinh tế',
      '4': 'Giáo dục',
      '5': 'Giải trí',
      '6': 'Phim ảnh',
      '7': 'Công nghệ',
      '8': 'Ẩm thực',
      '9': 'Du lịch',
      '10': 'Thời trang',
      '11': 'Thể thao',
    },
  },
  en: {
    headerTitle: 'Create new page',
    headerEditTitle: 'Edit page',
    title: 'Your page information',
    inputLabel: 'Page name',
    inputPlaceholder: 'Enter page name',
    inputHint: 'E.g., VNSEEA Coffee, Vietnam Designer Community',
    errorMinLength: 'Please enter a page name of at least 2 characters.',
    step2InputLabel: 'Page URL',
    step2InputPlaceholder: 'yourpagename',
    step2LinkPrefix: 'Page link: ',
    step2Hint: 'URL must be 5–32 characters and only contain English letters, numbers, and hyphens (-).',
    step2ErrorLength: 'Page URL name must be between 5 and 32 characters.',
    step2ErrorChars: 'Page URL can only contain letters, numbers, and hyphens (-).',
    step3DescLabel: 'Page Description',
    step3DescPlaceholder: 'Write a few lines to introduce the page...',
    step3DescHint: 'Min 10, max 200 characters',
    step3AddressLabel: 'Location',
    step3AddressPlaceholder: 'Search location from Google Maps',
    step3PinLabel: 'Request map pin',
    step3PinDesc: 'Admin will approve before the page name displays directly on the recent search map.',
    step3PinStatusNone: 'No pin requested',
    step3PinStatusPending: 'Pending approval',
    step3PinStatusApproved: 'Approved',
    step3PinStatusRequested: 'Will request pin',
    step3ErrorDescLength: 'Page description must be between 10 and 200 characters.',
    step3ErrorAddressEmpty: 'Please enter the page address.',
    step3ErrorAddressSelect: 'Please select a location from Google Maps suggestions.',
    step4Subtitle: 'Choose the category that best fits to help people easily find your page.',
    step4Hint: 'Your page will display in search results based on this category. You can change the category later in page settings.',
    step4ErrorCategory: 'Please select a category for the page.',
    categories: {
      '1': 'Vehicles',
      '2': 'Comedy',
      '3': 'Economy',
      '4': 'Education',
      '5': 'Entertainment',
      '6': 'Movies',
      '7': 'Technology',
      '8': 'Food & Dining',
      '9': 'Travel',
      '10': 'Fashion',
      '11': 'Sports',
    },
  },
};

interface ScaleButtonProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: any;
  disabled?: boolean;
}

function ScaleButton({
  children,
  onPress,
  style,
  disabled,
}: ScaleButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (!disabled) scale.value = withSpring(0.96, { damping: 15 });
  };

  const handlePressOut = () => {
    if (!disabled) scale.value = withSpring(1, { damping: 15 });
  };

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        style={style}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}

function FormHeader({
  onBack,
  title = 'Tạo trang mới',
}: {
  onBack: () => void;
  title?: string;
}) {
  return (
    <View
      style={{
        height: 64,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
      }}
    >
      <ScaleButton onPress={onBack}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: '#ffffff',
            borderWidth: 1,
            borderColor: '#f1f5f9',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.04,
            shadowRadius: 4,
            elevation: 2,
          }}
        >
          <ArrowLeft size={22} color="#0f172a" />
        </View>
      </ScaleButton>
      <Text style={{ marginLeft: 12, fontSize: 18, fontWeight: '800', color: '#0f172a' }}>
        {title}
      </Text>
    </View>
  );
}

function SubmitButton({
  onPress,
  label = 'Tạo trang',
  disabled = false,
  isLoading = false,
}: {
  onPress: () => void;
  label?: string;
  disabled?: boolean;
  isLoading?: boolean;
}) {
  return (
    <ScaleButton onPress={onPress} disabled={disabled || isLoading}>
      <View
        style={{
          minHeight: 54,
          borderRadius: 999,
          backgroundColor: '#002fff',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 24,
          opacity: disabled ? 0.6 : 1,
        }}
      >
        {isLoading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '800', marginRight: 8 }}>{label}</Text>
            <CheckCircle2 size={20} color="#FFFFFF" />
          </>
        )}
      </View>
    </ScaleButton>
  );
}

function ErrorMessage({ message }: { message?: string | null }) {
  if (!message) {
    return null;
  }

  return (
    <View
      style={{
        marginTop: 16,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff5f5',
        borderWidth: 1,
        borderColor: '#fee2e2',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
      }}
    >
      <AlertCircle size={18} color="#ef4444" style={{ marginRight: 8 }} />
      <Text style={{ flex: 1, color: '#dc2626', fontSize: 13, fontWeight: '600' }}>
        {message}
      </Text>
    </View>
  );
}

function PageEditTabBar({
  activeTab,
  onChangeTab,
}: {
  activeTab: PageEditTab;
  onChangeTab: (tab: PageEditTab) => void;
}) {
  return (
    <View
      style={{
        marginHorizontal: -20,
        marginTop: -20,
        marginBottom: 22,
        minHeight: 44,
        backgroundColor: '#fb923c',
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      {PAGE_EDIT_TABS.map(tab => {
        const active = activeTab === tab.id;
        const Icon = tab.Icon;
        return (
          <TouchableOpacity
            key={tab.id}
            activeOpacity={0.82}
            onPress={() => onChangeTab(tab.id)}
            style={{
              flex: 1,
              minHeight: 44,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: active ? '#f97316' : '#fb923c',
            }}
          >
            <Icon size={18} color="#ffffff" strokeWidth={2.4} />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function EditFieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text style={{ fontSize: 14, fontWeight: '800', color: '#334155', marginBottom: 8 }}>
      {children}
    </Text>
  );
}

function EditCheckbox({
  checked,
  label,
  onPress,
}: {
  checked: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.82}
      onPress={onPress}
      style={{
        minHeight: 34,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginRight: 18,
        marginBottom: 8,
      }}
    >
      <View
        style={{
          width: 18,
          height: 18,
          borderRadius: 2,
          borderWidth: 1.5,
          borderColor: checked ? '#1d4ed8' : '#94a3b8',
          backgroundColor: checked ? '#1d4ed8' : '#ffffff',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {checked ? (
          <Text style={{ color: '#ffffff', fontSize: 12, lineHeight: 14, fontWeight: '900' }}>
            ✓
          </Text>
        ) : null}
      </View>
      <Text style={{ color: '#475569', fontSize: 14, fontWeight: '600' }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function CreatePageScreen() {
  const navigation = useNavigation<CreatePageNav>();
  const route = useRoute<any>();
  const editingPage = route.params?.page as PagesItem | undefined;
  const isEditing = Boolean(editingPage?.pageId);
  const pagesVm = usePagesViewModel();
  const language = useAppLanguage();
  const copy = CREATE_PAGE_COPY[language];
  
  const [draft, setDraft] = useState<CreatePageDraft>(() =>
    editingPage
      ? {
          pageTitle: editingPage.pageTitle || '',
          pageName: editingPage.pageName || '',
          pageDescription: editingPage.pageDescription || '',
          pageAddress: editingPage.address || '',
          pageCategory: editingPage.pageCategory || PAGE_CATEGORIES[0].id,
          company: editingPage.company || '',
          phone: editingPage.phone || '',
          website: editingPage.website || '',
          placeId: editingPage.placeId,
          lat: editingPage.lat,
          lng: editingPage.lng,
          mapPinStatus: editingPage.mapPinStatus || 'none',
          mapPinRequested:
            editingPage.mapPinRequested ||
            editingPage.mapPinStatus === 'pending' ||
            editingPage.mapPinStatus === 'approved',
          callActionType: editingPage.callActionType || 'read_more',
          callActionUrl: editingPage.callActionUrl || '',
          allowPost: Boolean(editingPage.allowPost),
          verified: Boolean(editingPage.verified),
          facebook: editingPage.facebook || '',
          twitter: editingPage.twitter || '',
          instgram: editingPage.instgram || '',
          vk: editingPage.vk || '',
          linkedin: editingPage.linkedin || '',
          youtube: editingPage.youtube || '',
          backgroundImageStatus: editingPage.backgroundImageStatus || 'defualt',
        }
      : INITIAL_DRAFT,
  );
  const [localError, setLocalError] = useState<string | null>(null);
  const [isPageNameDirty, setIsPageNameDirty] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isCallActionOpen, setIsCallActionOpen] = useState(false);
  const [activeEditTab, setActiveEditTab] = useState<PageEditTab>('general');
  const [deletePassword, setDeletePassword] = useState('');
  const [pickedMediaNames, setPickedMediaNames] = useState<Record<string, string>>({});
  const [pickedMediaFiles, setPickedMediaFiles] = useState<Partial<Record<PageMediaField, PickedPageMedia>>>({});
  const [selectedAdmin, setSelectedAdmin] = useState<PageUser | null>(null);
  const [adminPrivileges, setAdminPrivileges] = useState<PagePrivileges>(DEFAULT_PAGE_PRIVILEGES);

  const currentError = localError || pagesVm.error;
  const isPageNameValid = draft.pageName.trim().length >= 5 && /^[a-z0-9_-]+$/.test(draft.pageName.trim());

  const updateDraft = useCallback(
    <TKey extends keyof CreatePageDraft>(
      key: TKey,
      value: CreatePageDraft[TKey],
    ) => {
      setDraft(prev => ({ ...prev, [key]: value }));
      setLocalError(null);
      pagesVm.clearError();
    },
    [pagesVm],
  );

  const handleTitleChange = useCallback(
    (value: string) => {
      setDraft(prev => ({
        ...prev,
        pageTitle: value,
        pageName: isPageNameDirty ? prev.pageName : toSafePageName(value),
      }));
      setLocalError(null);
      pagesVm.clearError();
    },
    [isPageNameDirty, pagesVm],
  );

  const handlePageNameChange = useCallback(
    (value: string) => {
      setIsPageNameDirty(true);
      updateDraft('pageName', value);
    },
    [updateDraft],
  );

  const handleAddressChange = useCallback(
    (value: string) => {
      setDraft(prev => ({
        ...prev,
        pageAddress: value,
        placeId: undefined,
        lat: undefined,
        lng: undefined,
      }));
      setLocalError(null);
      pagesVm.clearError();
    },
    [pagesVm],
  );

  const validateForm = useCallback(() => {
    if (isEditing && activeEditTab === 'flag') {
      if (
        draft.website &&
        !/^https?:\/\/.+\..+/i.test(draft.website.trim())
      ) {
        return 'Website không hợp lệ.';
      }
      return null;
    }

    if (draft.pageTitle.trim().length < 2) {
      return copy.errorMinLength;
    }

    const pageName = draft.pageName.trim();
    if (pageName.length < 5 || pageName.length > 32) {
      return copy.step2ErrorLength;
    }

    if (!/^[a-z0-9_-]+$/.test(pageName)) {
      return copy.step2ErrorChars;
    }

    if (!isEditing) {
      const descriptionLength = draft.pageDescription.trim().length;
      if (descriptionLength < 10 || descriptionLength > 200) {
        return copy.step3ErrorDescLength;
      }

      if (!draft.pageAddress.trim()) {
        return copy.step3ErrorAddressEmpty;
      }

      if (
        !draft.placeId ||
        draft.lat === undefined ||
        draft.lng === undefined
      ) {
        return copy.step3ErrorAddressSelect;
      }
    }

    if (!draft.pageCategory) {
      return copy.step4ErrorCategory;
    }

    return null;
  }, [draft, copy, isEditing, activeEditTab]);

  const handleSubmit = useCallback(async () => {
    if (isEditing && activeEditTab === 'media') {
      if (!editingPage?.pageId) {
        return;
      }
      const selectedMedia = [
        ['cover', pickedMediaFiles.cover],
        ['avatar', pickedMediaFiles.avatar],
      ] as const;
      const filesToUpload = selectedMedia.filter(([, file]) => Boolean(file));
      if (filesToUpload.length === 0) {
        setLocalError('Vui lòng chọn ảnh đại diện hoặc ảnh bìa trước khi lưu.');
        return;
      }
      try {
        for (const [field, file] of filesToUpload) {
          if (!file) continue;
          await pagesVm.updatePageMedia(editingPage.pageId, field, file);
        }
        showToast({ message: 'Đã lưu hình đại diện và ảnh bìa.', type: 'success' });
      } catch (err) {
        showToast({
          message:
            err instanceof Error
              ? err.message
              : 'Không thể lưu hình đại diện hoặc ảnh bìa.',
          type: 'error',
        });
      }
      return;
    }
    if (isEditing && activeEditTab === 'stats') {
      showToast({ message: 'Thống kê chỉ dùng để xem, không cần lưu.', type: 'info' });
      return;
    }
    if (isEditing && editingPage?.pageId && activeEditTab === 'users') {
      if (!selectedAdmin?.id) {
        setLocalError('Vui lòng chọn quản trị viên để cập nhật quyền.');
        return;
      }
      try {
        await pagesVm.updatePagePrivileges(
          editingPage.pageId,
          selectedAdmin.id,
          adminPrivileges,
        );
        showToast({ message: 'Đã cập nhật quyền quản trị.', type: 'success' });
      } catch (err) {
        showToast({
          message:
            err instanceof Error
              ? err.message
              : 'Không thể cập nhật quyền quản trị.',
          type: 'error',
        });
      }
      return;
    }

    if (isEditing && editingPage?.pageId && activeEditTab === 'delete') {
      try {
        const deleted = await pagesVm.deletePage(editingPage.pageId, deletePassword);
        if (deleted) {
          showToast({ message: 'Đã xóa trang.', type: 'success' });
          setTimeout(() => navigation.goBack(), 800);
        }
      } catch (err) {
        showToast({
          message: err instanceof Error ? err.message : 'Không thể xóa trang.',
          type: 'error',
        });
      }
      return;
    }

    const error = validateForm();
    if (error) {
      setLocalError(error);
      return;
    }

    setLocalError(null);

    try {
      if (
        isEditing &&
        activeEditTab === 'style' &&
        editingPage?.pageId &&
        pickedMediaFiles.background_image
      ) {
        await pagesVm.updatePageMedia(
          editingPage.pageId,
          'background_image',
          pickedMediaFiles.background_image,
        );
      }
      const savedPage =
        isEditing && editingPage?.pageId
          ? await pagesVm.updatePage(
              editingPage.pageId,
              draft,
              activeEditTab === 'flag'
                ? 'profile'
                : activeEditTab === 'social'
                  ? 'social'
                  : activeEditTab === 'style'
                    ? 'design'
                    : 'general',
            )
          : await pagesVm.createPage(draft);
      if (!savedPage) {
        return;
      }

      showToast({
        message: isEditing ? 'Cập nhật trang thành công!' : 'Tạo trang thành công!',
        type: 'success',
      });
      if (isEditing) {
        return;
      }
      setTimeout(() => {
        navigation.goBack();
      }, 1000);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Vui lòng kiểm tra thông tin và thử lại.';
      showToast({
        message: message,
        type: 'error',
      });
    }
  }, [
    draft,
    editingPage?.pageId,
    isEditing,
    navigation,
    pagesVm,
    validateForm,
    activeEditTab,
    deletePassword,
    selectedAdmin,
    adminPrivileges,
    pickedMediaFiles,
  ]);

  const submitLabel = isEditing
    ? (language === 'vi' ? 'Lưu' : 'Save')
    : (language === 'vi' ? 'Tạo trang' : 'Create Page');


  const BRAND = '#002fff';
  const selectedCallAction =
    CALL_ACTION_OPTIONS.find(option => option.id === draft.callActionType) ||
    CALL_ACTION_OPTIONS[0];

  useEffect(() => {
    if (!isEditing || activeEditTab !== 'users' || !editingPage?.pageId) {
      return;
    }

    pagesVm.loadPageAdmins(editingPage.pageId).catch(() => undefined);
  }, [activeEditTab, editingPage?.pageId, isEditing, pagesVm.loadPageAdmins]);

  const pickPageMedia = useCallback(
    async (field: PageMediaField) => {
      try {
        const result = await launchImageLibrary({
          mediaType: 'photo',
          quality: 0.8,
        });
        if (result.didCancel || !result.assets?.length) return;
        const asset = result.assets[0];
        if (!asset.uri) return;
        const name = asset.fileName || `${field}_${Date.now()}.jpg`;
        setPickedMediaFiles(prev => ({
          ...prev,
          [field]: {
            uri: asset.uri || '',
            name,
            type: asset.type || 'image/jpeg',
          },
        }));
        setPickedMediaNames(prev => ({ ...prev, [field]: name }));
        setLocalError(null);
        pagesVm.clearError();
        if (field === 'background_image') {
          updateDraft('backgroundImageStatus', 'my_background');
        }
      } catch (err) {
        Alert.alert(
          'Lỗi',
          err instanceof Error ? err.message : 'Không thể chọn ảnh.',
        );
      }
    },
    [pagesVm, updateDraft],
  );

  const renderEditGeneralTab = () => {
    if (activeEditTab !== 'general') {
      return (
        <View
          style={{
            borderRadius: 14,
            borderWidth: 1,
            borderColor: '#e2e8f0',
            backgroundColor: '#ffffff',
            padding: 18,
          }}
        >
          <Text style={{ color: '#0f172a', fontSize: 15, fontWeight: '800' }}>
            Chọn tab cài đặt chung để chỉnh sửa thông tin trang.
          </Text>
        </View>
      );
    }

    return (
      <>
        <View style={{ marginBottom: 18 }}>
          <EditFieldLabel>Tên trang</EditFieldLabel>
          <TextInput
            style={{ minHeight: 48, borderRadius: 9, borderWidth: 1, borderColor: '#D8DEE8', backgroundColor: '#FFFFFF', paddingHorizontal: 12, color: '#111827', fontSize: 15 }}
            placeholder="Tên trang"
            placeholderTextColor="#94a3b8"
            returnKeyType="next"
            value={draft.pageTitle}
            onChangeText={handleTitleChange}
          />
        </View>

        <View style={{ marginBottom: 18, zIndex: 120 }}>
          <EditFieldLabel>Loại</EditFieldLabel>
          <TouchableOpacity
            activeOpacity={0.84}
            onPress={() => setIsCategoryOpen(current => !current)}
            style={{ minHeight: 48, borderRadius: 9, borderWidth: 1, borderColor: '#D8DEE8', backgroundColor: '#FFFFFF', paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <Text style={{ color: '#64748b', fontSize: 15, fontWeight: '500' }}>
              {(copy.categories as Record<string, string>)[draft.pageCategory] || draft.pageCategory}
            </Text>
            <ChevronDown size={19} color="#94A3B8" />
          </TouchableOpacity>
          {isCategoryOpen ? (
            <View style={{ marginTop: 8, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#FFFFFF', overflow: 'hidden' }}>
              {PAGE_CATEGORIES.map(category => {
                const active = draft.pageCategory === category.id;
                const translatedLabel = (copy.categories as Record<string, string>)[category.id] || category.label;
                return (
                  <TouchableOpacity
                    key={category.id}
                    activeOpacity={0.78}
                    onPress={() => {
                      updateDraft('pageCategory', category.id);
                      setIsCategoryOpen(false);
                    }}
                    style={{ minHeight: 42, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', backgroundColor: active ? '#F8FAFC' : '#FFFFFF' }}
                  >
                    <Text style={{ flex: 1, color: '#111827', fontSize: 14, fontWeight: active ? '800' : '500' }}>
                      {translatedLabel}
                    </Text>
                    {active ? <CheckCircle2 size={16} color={BRAND} /> : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}
        </View>

        <View style={{ marginBottom: 18 }}>
          <EditFieldLabel>Trang URL</EditFieldLabel>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ height: 38, justifyContent: 'center', borderTopLeftRadius: 7, borderBottomLeftRadius: 7, backgroundColor: '#e5e7eb', paddingHorizontal: 10 }}>
              <Text style={{ color: '#64748b', fontSize: 13, fontWeight: '600' }}>
                {PAGE_URL_PREFIX}
              </Text>
            </View>
            <TextInput
              style={{ flex: 1, minHeight: 38, borderTopRightRadius: 7, borderBottomRightRadius: 7, borderWidth: 1, borderColor: '#D8DEE8', backgroundColor: '#FFFFFF', paddingHorizontal: 10, color: '#111827', fontSize: 14 }}
              placeholder="ten_trang"
              placeholderTextColor="#94a3b8"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              value={draft.pageName}
              onChangeText={handlePageNameChange}
            />
          </View>
        </View>

        <View style={{ marginBottom: 18, zIndex: 80 }}>
          <EditFieldLabel>Kêu gọi hành động</EditFieldLabel>
          <TouchableOpacity
            activeOpacity={0.84}
            onPress={() => setIsCallActionOpen(current => !current)}
            style={{ minHeight: 48, borderRadius: 9, borderWidth: 1, borderColor: '#D8DEE8', backgroundColor: '#FFFFFF', paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <Text style={{ color: '#64748b', fontSize: 15, fontWeight: '500' }}>
              {selectedCallAction.label}
            </Text>
            <ChevronDown size={19} color="#94A3B8" />
          </TouchableOpacity>
          {isCallActionOpen ? (
            <View style={{ marginTop: 8, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#FFFFFF', overflow: 'hidden' }}>
              {CALL_ACTION_OPTIONS.map(option => {
                const active = selectedCallAction.id === option.id;
                return (
                  <TouchableOpacity
                    key={option.id}
                    activeOpacity={0.78}
                    onPress={() => {
                      updateDraft('callActionType', option.id);
                      setIsCallActionOpen(false);
                    }}
                    style={{ minHeight: 42, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', backgroundColor: active ? '#F8FAFC' : '#FFFFFF' }}
                  >
                    <Text style={{ flex: 1, color: '#111827', fontSize: 14, fontWeight: active ? '800' : '500' }}>
                      {option.label}
                    </Text>
                    {active ? <CheckCircle2 size={16} color={BRAND} /> : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}
        </View>

        <View style={{ marginBottom: 18 }}>
          <EditFieldLabel>Gọi đến url mục tiêu</EditFieldLabel>
          <TextInput
            style={{ minHeight: 48, borderRadius: 9, borderWidth: 1, borderColor: '#D8DEE8', backgroundColor: '#FFFFFF', paddingHorizontal: 12, color: '#111827', fontSize: 15 }}
            placeholder="https://"
            placeholderTextColor="#94a3b8"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            value={draft.callActionUrl}
            onChangeText={value => updateDraft('callActionUrl', value)}
          />
        </View>

        <View style={{ marginBottom: 18 }}>
          <EditFieldLabel>Xuất hiện trên bản đồ</EditFieldLabel>
          <EditCheckbox
            checked={Boolean(draft.mapPinRequested)}
            label="Hiển thị page này trên bản đồ."
            onPress={() => {
              const value = !draft.mapPinRequested;
              updateDraft('mapPinRequested', value);
              updateDraft(
                'mapPinStatus',
                value
                  ? draft.mapPinStatus === 'approved'
                    ? 'approved'
                    : 'pending'
                  : 'none',
              );
            }}
          />
        </View>

        <View style={{ marginBottom: 18 }}>
          <EditFieldLabel>Người dùng có thể đăng trên trang của tôi</EditFieldLabel>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            <EditCheckbox
              checked={Boolean(draft.allowPost)}
              label="Cho phép"
              onPress={() => updateDraft('allowPost', true)}
            />
            <EditCheckbox
              checked={!draft.allowPost}
              label="Vô hiệu hóa"
              onPress={() => updateDraft('allowPost', false)}
            />
          </View>
        </View>

        <View style={{ marginBottom: 18 }}>
          <EditFieldLabel>xác minh</EditFieldLabel>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            <EditCheckbox
              checked={Boolean(draft.verified)}
              label="Đã xác minh"
              onPress={() => updateDraft('verified', true)}
            />
            <EditCheckbox
              checked={!draft.verified}
              label="Chưa xác minh"
              onPress={() => updateDraft('verified', false)}
            />
          </View>
        </View>
      </>
    );
  };

  const renderEditInfoTab = () => (
    <>
      <View style={{ marginBottom: 18 }}>
        <EditFieldLabel>Công ty</EditFieldLabel>
        <TextInput
          style={{ minHeight: 48, borderRadius: 9, borderWidth: 1, borderColor: '#D8DEE8', backgroundColor: '#FFFFFF', paddingHorizontal: 12, color: '#111827', fontSize: 15 }}
          placeholder=""
          placeholderTextColor="#94a3b8"
          value={draft.company}
          onChangeText={value => updateDraft('company', value)}
        />
      </View>

      <View style={{ marginBottom: 18 }}>
        <EditFieldLabel>Điện thoại</EditFieldLabel>
        <TextInput
          style={{ minHeight: 48, borderRadius: 9, borderWidth: 1, borderColor: '#D8DEE8', backgroundColor: '#FFFFFF', paddingHorizontal: 12, color: '#111827', fontSize: 15 }}
          placeholder=""
          placeholderTextColor="#94a3b8"
          keyboardType="phone-pad"
          value={draft.phone}
          onChangeText={value => updateDraft('phone', value)}
        />
      </View>

      <View style={{ marginBottom: 18 }}>
        <EditFieldLabel>Địa điểm</EditFieldLabel>
        <TextInput
          style={{ minHeight: 48, borderRadius: 9, borderWidth: 1, borderColor: '#D8DEE8', backgroundColor: '#FFFFFF', paddingHorizontal: 12, color: '#111827', fontSize: 15 }}
          placeholder="Địa điểm"
          placeholderTextColor="#94a3b8"
          value={draft.pageAddress}
          onChangeText={handleAddressChange}
        />
      </View>

      <View style={{ marginBottom: 18 }}>
        <EditFieldLabel>Trang mạng</EditFieldLabel>
        <TextInput
          style={{ minHeight: 48, borderRadius: 9, borderWidth: 1, borderColor: '#D8DEE8', backgroundColor: '#FFFFFF', paddingHorizontal: 12, color: '#111827', fontSize: 15 }}
          placeholder=""
          placeholderTextColor="#94a3b8"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          value={draft.website}
          onChangeText={value => updateDraft('website', value)}
        />
        <Text style={{ marginTop: 8, color: '#64748b', fontSize: 12, fontWeight: '500' }}>
          (ví dụ: http://www.siteurl.com)
        </Text>
      </View>

      <View style={{ marginBottom: 18 }}>
        <EditFieldLabel>Về</EditFieldLabel>
        <TextInput
          style={{ minHeight: 132, borderRadius: 9, borderWidth: 1, borderColor: '#D8DEE8', backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingTop: 12, color: '#111827', fontSize: 15, lineHeight: 21, textAlignVertical: 'top' }}
          placeholder=""
          placeholderTextColor="#94a3b8"
          multiline
          value={draft.pageDescription}
          onChangeText={value => updateDraft('pageDescription', value)}
        />
      </View>
    </>
  );

  const renderEditSocialTab = () => {
    const fields: Array<[keyof CreatePageDraft, string]> = [
      ['facebook', 'Facebook'],
      ['twitter', 'Twitter'],
      ['instgram', 'Instagram'],
      ['vk', 'VK'],
      ['linkedin', 'LinkedIn'],
      ['youtube', 'YouTube'],
    ];

    return (
      <>
        {fields.map(([key, label]) => (
          <View key={key} style={{ marginBottom: 18 }}>
            <EditFieldLabel>{label}</EditFieldLabel>
            <TextInput
              style={{ minHeight: 48, borderRadius: 9, borderWidth: 1, borderColor: '#D8DEE8', backgroundColor: '#FFFFFF', paddingHorizontal: 12, color: '#111827', fontSize: 15 }}
              placeholder="username"
              placeholderTextColor="#94a3b8"
              autoCapitalize="none"
              autoCorrect={false}
              value={(draft[key] as string | undefined) || ''}
              onChangeText={value => updateDraft(key, value as never)}
            />
          </View>
        ))}
      </>
    );
  };

  const renderMediaPicker = (
    field: 'avatar' | 'cover' | 'background_image',
    label: string,
    currentUri?: string,
  ) => {
    const pickerHeight = field === 'avatar' ? 108 : field === 'background_image' ? 150 : 150;

    return (
      <View style={{ marginBottom: 18 }}>
        <EditFieldLabel>{label}</EditFieldLabel>
        <TouchableOpacity
          activeOpacity={0.84}
          onPress={() => pickPageMedia(field)}
          style={{
            height: pickerHeight,
            maxHeight: pickerHeight,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#D8DEE8',
            backgroundColor: '#f8fafc',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {pickedMediaFiles[field]?.uri || currentUri ? (
            <Image
              source={{ uri: pickedMediaFiles[field]?.uri || currentUri || '' }}
              style={{ width: '100%', height: pickerHeight }}
              resizeMode="cover"
            />
          ) : (
            <>
              <ImageIcon size={28} color="#64748b" />
              <Text style={{ marginTop: 8, color: '#64748b', fontSize: 13, fontWeight: '700' }}>
                {pickedMediaNames[field] || 'Thả hình ảnh ở đây HOẶC Duyệt để tải lên'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const renderEditMediaTab = () => (
    <View style={{ marginBottom: 18 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 14,
        }}
      >
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor: BRAND,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 8,
          }}
        >
          <ImageIcon size={14} color="#ffffff" strokeWidth={2.5} />
        </View>
        <Text style={{ color: '#0f172a', fontSize: 15, fontWeight: '900' }}>
          Hình đại diện & Ảnh bìa
        </Text>
      </View>

      <View
        style={{
          minHeight: 260,
          borderTopWidth: 1,
          borderTopColor: '#e2e8f0',
          paddingTop: 16,
          alignItems: 'center',
        }}
      >
        <TouchableOpacity
          activeOpacity={0.84}
          onPress={() => pickPageMedia('cover')}
          style={{
            width: '100%',
            height: 178,
            borderRadius: 8,
            backgroundColor: '#f1f3f5',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {pickedMediaFiles.cover?.uri || editingPage?.cover ? (
            <Image
              source={{ uri: pickedMediaFiles.cover?.uri || editingPage?.cover || '' }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          ) : (
            <ImageIcon size={24} color="#334155" />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.84}
          onPress={() => pickPageMedia('avatar')}
          style={{
            width: 128,
            height: 128,
            borderRadius: 64,
            marginTop: -58,
            backgroundColor: '#f1f3f5',
            borderWidth: 4,
            borderColor: '#ffffff',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {pickedMediaFiles.avatar?.uri || editingPage?.avatar ? (
            <Image
              source={{ uri: pickedMediaFiles.avatar?.uri || editingPage?.avatar || '' }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          ) : (
            <Camera size={24} color="#334155" fill="#334155" />
          )}
        </TouchableOpacity>

        {pickedMediaNames.cover || pickedMediaNames.avatar ? (
          <Text
            style={{
              marginTop: 12,
              color: '#64748b',
              fontSize: 12,
              fontWeight: '700',
              textAlign: 'center',
            }}
          >
            {[pickedMediaNames.cover, pickedMediaNames.avatar]
              .filter(Boolean)
              .join(' • ')}
          </Text>
        ) : null}
      </View>
    </View>
  );

  const renderEditDesignTab = () => (
    <>
      {renderMediaPicker('background_image', 'Nền trang', editingPage?.backgroundImage)}
      <View style={{ marginBottom: 18 }}>
        <EditFieldLabel>Giao diện</EditFieldLabel>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          <EditCheckbox
            checked={draft.backgroundImageStatus !== 'my_background'}
            label="Mặc định"
            onPress={() => updateDraft('backgroundImageStatus', 'defualt')}
          />
          <EditCheckbox
            checked={draft.backgroundImageStatus === 'my_background'}
            label="Nền của tôi"
            onPress={() => updateDraft('backgroundImageStatus', 'my_background')}
          />
        </View>
      </View>
    </>
  );

  const renderDeleteTab = () => (
    <View style={{ marginBottom: 18 }}>
      <EditFieldLabel>Mật khẩu</EditFieldLabel>
      <TextInput
        style={{ minHeight: 48, borderRadius: 9, borderWidth: 1, borderColor: '#D8DEE8', backgroundColor: '#FFFFFF', paddingHorizontal: 12, color: '#111827', fontSize: 15 }}
        placeholder="Mật khẩu"
        placeholderTextColor="#94a3b8"
        secureTextEntry
        value={deletePassword}
        onChangeText={setDeletePassword}
      />
      <Text style={{ marginTop: 10, color: '#ef4444', fontSize: 13, fontWeight: '700' }}>
        Xóa trang sẽ không thể hoàn tác.
      </Text>
    </View>
  );

  const renderEditAdminsTab = () => (
    <>
      <View style={{ marginBottom: 18 }}>
        <EditFieldLabel>Quản trị viên</EditFieldLabel>
        {pagesVm.isLoading && pagesVm.pageAdmins.length === 0 ? (
          <ActivityIndicator color={BRAND} />
        ) : pagesVm.pageAdmins.length === 0 ? (
          <View
            style={{
              borderRadius: 14,
              borderWidth: 1,
              borderColor: '#e2e8f0',
              backgroundColor: '#ffffff',
              padding: 18,
            }}
          >
            <Text style={{ color: '#64748b', fontSize: 14, fontWeight: '700' }}>
              Chưa có quản trị viên nào cho trang này.
            </Text>
          </View>
        ) : (
          pagesVm.pageAdmins.map(admin => {
            const active = selectedAdmin?.id === admin.id;
            return (
              <TouchableOpacity
                key={admin.id}
                activeOpacity={0.84}
                onPress={() => {
                  setSelectedAdmin(admin);
                  setAdminPrivileges(readPagePrivileges(admin));
                  setLocalError(null);
                }}
                style={{
                  minHeight: 58,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: active ? BRAND : '#e2e8f0',
                  backgroundColor: active ? '#eef2ff' : '#ffffff',
                  paddingHorizontal: 12,
                  marginBottom: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                {admin.avatarUrl ? (
                  <Image
                    source={{ uri: admin.avatarUrl }}
                    style={{ width: 38, height: 38, borderRadius: 19, marginRight: 10 }}
                  />
                ) : (
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 19,
                      marginRight: 10,
                      backgroundColor: '#e2e8f0',
                    }}
                  />
                )}
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#0f172a', fontSize: 14, fontWeight: '800' }}>
                    {admin.name || admin.username}
                  </Text>
                  <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '600' }}>
                    @{admin.username || admin.id}
                  </Text>
                </View>
                {active ? <CheckCircle2 size={18} color={BRAND} /> : null}
              </TouchableOpacity>
            );
          })
        )}
      </View>

      {selectedAdmin ? (
        <View style={{ marginBottom: 18 }}>
          <EditFieldLabel>Phân quyền</EditFieldLabel>
          {PAGE_PRIVILEGE_OPTIONS.map(option => (
            <EditCheckbox
              key={option.key}
              checked={adminPrivileges[option.key]}
              label={option.label}
              onPress={() => {
                setAdminPrivileges(prev => ({
                  ...prev,
                  [option.key]: !prev[option.key],
                }));
                setLocalError(null);
              }}
            />
          ))}
        </View>
      ) : null}
    </>
  );

  const renderEditAnalyticsTab = () => {
    const stats = [
      { label: 'Tổng lượt thích', value: editingPage?.likes ?? 0 },
      { label: 'Người theo dõi', value: editingPage?.followersCount ?? 0 },
      { label: 'Bài viết', value: editingPage?.postCount ?? 0 },
      { label: 'Đánh giá', value: editingPage?.ratingCount ?? 0 },
    ];

    return (
      <View style={{ marginBottom: 18 }}>
        <EditFieldLabel>Thống kê trang</EditFieldLabel>
        {stats.map(item => (
          <View
            key={item.label}
            style={{
              minHeight: 54,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: '#e2e8f0',
              backgroundColor: '#ffffff',
              paddingHorizontal: 14,
              marginBottom: 10,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Text style={{ color: '#475569', fontSize: 14, fontWeight: '700' }}>
              {item.label}
            </Text>
            <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '900' }}>
              {item.value}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  const renderEditTabContent = () => {
    if (activeEditTab === 'general') {
      return renderEditGeneralTab();
    }
    if (activeEditTab === 'flag') {
      return renderEditInfoTab();
    }
    if (activeEditTab === 'social') {
      return renderEditSocialTab();
    }
    if (activeEditTab === 'media') {
      return renderEditMediaTab();
    }
    if (activeEditTab === 'style') {
      return renderEditDesignTab();
    }
    if (activeEditTab === 'delete') {
      return renderDeleteTab();
    }
    if (activeEditTab === 'users') {
      return renderEditAdminsTab();
    }
    return renderEditAnalyticsTab();
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <FocusAwareStatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <SafeAreaFeedHeader />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={{ flex: 1, backgroundColor: '#FFFFFF' }}
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingBottom: 110, paddingTop: 20 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {isEditing ? (
            <>
              <PageEditTabBar
                activeTab={activeEditTab}
                onChangeTab={setActiveEditTab}
              />
              {renderEditTabContent()}
            </>
          ) : (
            <>
          {/* Field: Page Title */}
          <View style={{ marginBottom: 18 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 8 }}>
              Tên trang
            </Text>
            <TextInput
              style={{ minHeight: 48, borderRadius: 9, borderWidth: 1, borderColor: '#D8DEE8', backgroundColor: '#FFFFFF', paddingHorizontal: 12, color: '#111827', fontSize: 15 }}
              placeholder={copy.inputPlaceholder}
              placeholderTextColor="#94a3b8"
              returnKeyType="next"
              value={draft.pageTitle}
              onChangeText={handleTitleChange}
            />
            <Text style={{ fontSize: 12, fontWeight: '500', color: '#94A3B8', marginTop: 6 }}>
              Tiêu đề trang của bạn
            </Text>
          </View>

          {/* Field: Page URL */}
          <View style={{ marginBottom: 18 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 8 }}>
              Trang URL
            </Text>
            <View style={{ alignSelf: 'flex-start', backgroundColor: '#F1F5F9', borderRadius: 4, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 8 }}>
              <Text style={{ fontSize: 13, color: '#475569', fontWeight: '500' }}>
                {PAGE_URL_PREFIX}
              </Text>
            </View>
            <TextInput
              style={{ minHeight: 48, borderRadius: 9, borderWidth: 1, borderColor: '#D8DEE8', backgroundColor: '#FFFFFF', paddingHorizontal: 12, color: '#111827', fontSize: 15 }}
              placeholder={copy.step2InputPlaceholder}
              placeholderTextColor="#94a3b8"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              value={draft.pageName}
              onChangeText={handlePageNameChange}
            />
            <Text style={{ fontSize: 12, fontWeight: '500', color: '#94A3B8', marginTop: 6 }}>
              Link trang: {PAGE_URL_PREFIX}{draft.pageName || copy.step2InputPlaceholder}
            </Text>
          </View>

          {/* Field: Category Selector Dropdown */}
          <View style={{ marginBottom: 18, zIndex: 100 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 8 }}>
              Danh mục trang
            </Text>
            <TouchableOpacity
              activeOpacity={0.84}
              onPress={() => setIsCategoryOpen(current => !current)}
              style={{ minHeight: 48, borderRadius: 9, borderWidth: 1, borderColor: '#D8DEE8', backgroundColor: '#FFFFFF', paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <Text style={{ color: '#111827', fontSize: 15, fontWeight: '500' }}>
                {(copy.categories as Record<string, string>)[draft.pageCategory] || draft.pageCategory}
              </Text>
              <ChevronDown size={19} color="#94A3B8" />
            </TouchableOpacity>
            {isCategoryOpen ? (
              <View style={{ marginTop: 8, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#FFFFFF', overflow: 'hidden' }}>
                {PAGE_CATEGORIES.map(category => {
                  const active = draft.pageCategory === category.id;
                  const translatedLabel = (copy.categories as Record<string, string>)[category.id] || category.label;
                  return (
                    <TouchableOpacity
                      key={category.id}
                      activeOpacity={0.78}
                      onPress={() => {
                        updateDraft('pageCategory', category.id);
                        setIsCategoryOpen(false);
                      }}
                      style={{ minHeight: 42, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', backgroundColor: active ? '#F8FAFC' : '#FFFFFF' }}
                    >
                      <Text style={{ flex: 1, color: '#111827', fontSize: 14, fontWeight: active ? '800' : '500' }}>
                        {translatedLabel}
                      </Text>
                      {active ? <CheckCircle2 size={16} color={BRAND} /> : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : null}
          </View>

          {/* Description Field */}
          <View style={{ marginBottom: 18 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 8 }}>
              Mô tả trang
            </Text>
            <TextInput
              style={{ minHeight: 100, borderRadius: 9, borderWidth: 1, borderColor: '#D8DEE8', backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingTop: 10, color: '#111827', fontSize: 15, lineHeight: 21, textAlignVertical: 'top' }}
              placeholder={copy.step3DescPlaceholder}
              placeholderTextColor="#94a3b8"
              multiline
              maxLength={200}
              value={draft.pageDescription}
              onChangeText={value => updateDraft('pageDescription', value)}
            />
            <Text style={{ fontSize: 12, fontWeight: '500', color: '#94A3B8', marginTop: 6 }}>
              Mô tả Trang của bạn, Tối đa từ 10 đến 200 ký tự.
            </Text>
          </View>

          {/* Address Field */}
          <View style={{ marginBottom: 18 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 8 }}>
              Địa điểm
            </Text>
            <AddressAutocomplete
              value={draft.pageAddress}
              placeholder="Địa điểm"
              onChangeText={handleAddressChange}
              onSelectPlace={place => {
                updateDraft('pageAddress', place.description);
                updateDraft('placeId', place.placeId);
                updateDraft('lat', place.lat);
                updateDraft('lng', place.lng);
              }}
            />
          </View>

          {/* Map Pin Checkbox Card */}
          <View style={{ marginBottom: 18 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 8 }}>
              Xuất hiện trên bản đồ
            </Text>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                const value = !draft.mapPinRequested;
                updateDraft('mapPinRequested', value);
                updateDraft(
                  'mapPinStatus',
                  value
                    ? draft.mapPinStatus === 'approved'
                      ? 'approved'
                      : 'pending'
                    : 'none',
                );
              }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
            >
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 4,
                  borderWidth: 1.5,
                  borderColor: draft.mapPinRequested ? BRAND : '#cbd5e1',
                  backgroundColor: draft.mapPinRequested ? BRAND : '#ffffff',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {draft.mapPinRequested && (
                  <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: '900', lineHeight: 12 }}>✓</Text>
                )}
              </View>
              <Text style={{ fontSize: 13, color: '#334155', fontWeight: '500' }}>
                Hiển thị page này trên bản đồ.
              </Text>
            </TouchableOpacity>
          </View>
            </>
          )}

          <ErrorMessage message={currentError} />
        </ScrollView>

        {/* Bottom Actions Footer */}
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            minHeight: 72,
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
            onPress={handleSubmit}
            disabled={pagesVm.isCreating}
            style={{
              minWidth: 118,
              minHeight: 46,
              borderRadius: 8,
              backgroundColor: BRAND,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pagesVm.isCreating ? 0.7 : 1,
            }}
          >
            {pagesVm.isCreating ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '900' }}>
                {isEditing && activeEditTab === 'delete' ? 'Xóa' : isEditing ? 'Lưu' : 'Tạo ra'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
    </View>
  );
}

export default CreatePageScreen;

// Description: Renders the VNSEEA create page form and submits to WoWonder API.
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
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
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../../../navigation/types';
import AddressAutocomplete from '../../../shared-kernel/presentation/components/AddressAutocomplete';
import { apiConfig } from '../../../shared-kernel/infrastructure/config/env';
import { usePagesViewModel } from '../../application/view-models/usePagesViewModel';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import { showToast, ToastContainer } from '../../../shared-kernel/presentation/components/ToastNotification';
import { FeedHeader } from '../../../feed/presentation/components/FeedHeader';
import type {
  CreatePageDraft,
  PagesItem,
} from '../../domain/types/pages.types';

type CreatePageNav = NativeStackNavigationProp<RootStackParamList>;

type PageCategory = {
  id: string;
  label: string;
};

const PAGE_CATEGORIES: PageCategory[] = [
  { id: '1', label: 'Xe cộ' },
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
  mapPinRequested: false,
  mapPinStatus: 'none',
};

const PAGE_URL_PREFIX = `${apiConfig.webBaseUrl.replace(/\/$/, '')}/`;

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
      '1': 'Xe cộ',
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
          placeId: editingPage.placeId,
          lat: editingPage.lat,
          lng: editingPage.lng,
          mapPinStatus: editingPage.mapPinStatus || 'none',
          mapPinRequested:
            editingPage.mapPinRequested ||
            editingPage.mapPinStatus === 'pending' ||
            editingPage.mapPinStatus === 'approved',
        }
      : INITIAL_DRAFT,
  );
  const [localError, setLocalError] = useState<string | null>(null);
  const [isPageNameDirty, setIsPageNameDirty] = useState(false);

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

    if (!draft.pageCategory) {
      return copy.step4ErrorCategory;
    }

    return null;
  }, [draft, copy]);

  const handleSubmit = useCallback(async () => {
    const error = validateForm();
    if (error) {
      setLocalError(error);
      return;
    }

    setLocalError(null);

    try {
      const savedPage =
        isEditing && editingPage?.pageId
          ? await pagesVm.updatePage(editingPage.pageId, draft)
          : await pagesVm.createPage(draft);
      if (!savedPage) {
        return;
      }

      showToast({
        message: isEditing ? 'Cập nhật trang thành công!' : 'Tạo trang thành công!',
        type: 'success',
      });
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
  ]);

  const submitLabel = isEditing
    ? (language === 'vi' ? 'Cập nhật trang' : 'Update Page')
    : (language === 'vi' ? 'Tạo trang' : 'Create Page');


  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} edges={['top']}>
      <FocusAwareStatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <FeedHeader />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FormHeader
          title={isEditing ? copy.headerEditTitle : copy.headerTitle}
          onBack={() => navigation.goBack()}
        />
        
        <ScrollView
          style={{ flex: 1, backgroundColor: '#f8fafc' }}
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 16, paddingVertical: 20 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Card 1: Basic Info */}
          <Animated.View
            entering={FadeInDown.delay(100).springify().damping(16)}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 24,
              borderWidth: 1,
              borderColor: '#f1f5f9',
              paddingHorizontal: 16,
              paddingVertical: 20,
              marginBottom: 16,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.02,
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            {/* Card Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                <Edit3 size={18} color="#002fff" />
              </View>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#0f172a' }}>
                {language === 'vi' ? 'Thông tin cơ bản' : 'Basic Info'}
              </Text>
            </View>

            {/* Field: Page Title */}
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#0f172a', marginBottom: 10 }}>
              {copy.inputLabel}
            </Text>
            <View
              style={{
                minHeight: 54,
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#ffffff',
                borderWidth: 1,
                borderColor: '#e2e8f0',
                borderRadius: 16,
                paddingHorizontal: 16,
                marginBottom: 6,
              }}
            >
              <TextInput
                style={{ flex: 1, color: '#0f172a', fontSize: 15, fontWeight: '600', paddingVertical: 12 }}
                placeholder={copy.inputPlaceholder}
                placeholderTextColor="#94a3b8"
                returnKeyType="next"
                value={draft.pageTitle}
                onChangeText={handleTitleChange}
              />
            </View>
            <Text style={{ fontSize: 12, fontWeight: '500', color: '#64748b', lineHeight: 16, marginBottom: 16 }}>
              {copy.inputHint}
            </Text>

            {/* Field: Page URL */}
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#0f172a', marginBottom: 10 }}>
              {copy.step2InputLabel}
            </Text>
            <View
              style={{
                minHeight: 54,
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#ffffff',
                borderWidth: 1,
                borderColor: '#e2e8f0',
                borderRadius: 16,
                paddingHorizontal: 16,
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: '#64748b',
                }}
                numberOfLines={1}
              >
                {PAGE_URL_PREFIX}
              </Text>

              <View style={{ width: 1, height: 20, backgroundColor: '#cbd5e1', marginHorizontal: 10 }} />

              <TextInput
                style={{
                  flex: 1,
                  color: '#0f172a',
                  fontSize: 15,
                  fontWeight: '600',
                  paddingVertical: 12,
                }}
                placeholder={copy.step2InputPlaceholder}
                placeholderTextColor="#94a3b8"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                value={draft.pageName}
                onChangeText={handlePageNameChange}
              />

              {isPageNameValid ? (
                <View style={{ marginLeft: 8 }}>
                  <CheckCircle2 size={20} color="#22c55e" />
                </View>
              ) : null}
            </View>

            {/* Link Preview Card */}
            <View
              style={{
                marginTop: 12,
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#f8fafc',
                borderRadius: 16,
                paddingHorizontal: 16,
                paddingVertical: 12,
              }}
            >
              <Link2 size={16} color="#64748b" style={{ marginRight: 8 }} />
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#002fff', flex: 1 }} numberOfLines={1}>
                {PAGE_URL_PREFIX}{draft.pageName || copy.step2InputPlaceholder}
              </Text>
            </View>

            <Text style={{ marginTop: 8, fontSize: 12, fontWeight: '500', color: '#64748b', lineHeight: 16 }}>
              {copy.step2Hint}
            </Text>
          </Animated.View>

          {/* Card 2: Description & Address */}
          <Animated.View
            entering={FadeInDown.delay(200).springify().damping(16)}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 24,
              borderWidth: 1,
              borderColor: '#f1f5f9',
              paddingHorizontal: 16,
              paddingVertical: 20,
              marginBottom: 16,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.02,
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            {/* Card Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                <FileText size={18} color="#002fff" />
              </View>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#0f172a' }}>
                {language === 'vi' ? 'Mô tả & Vị trí' : 'Description & Location'}
              </Text>
            </View>

            {/* Description Field */}
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#0f172a', marginBottom: 10 }}>
              {copy.step3DescLabel}
            </Text>
            <View
              style={{
                minHeight: 100,
                backgroundColor: '#ffffff',
                borderWidth: 1,
                borderColor: '#e2e8f0',
                borderRadius: 16,
                paddingHorizontal: 16,
                paddingVertical: 12,
              }}
            >
              <TextInput
                style={{
                  flex: 1,
                  color: '#0f172a',
                  fontSize: 15,
                  fontWeight: '600',
                  textAlignVertical: 'top',
                  padding: 0,
                }}
                placeholder={copy.step3DescPlaceholder}
                placeholderTextColor="#94a3b8"
                multiline
                maxLength={200}
                value={draft.pageDescription}
                onChangeText={value => updateDraft('pageDescription', value)}
              />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingHorizontal: 4, marginBottom: 20 }}>
              <Text style={{ fontSize: 12, fontWeight: '500', color: '#64748b' }}>
                {copy.step3DescHint}
              </Text>
              <Text style={{ fontSize: 12, fontWeight: '500', color: '#64748b' }}>
                {draft.pageDescription.length}/200
              </Text>
            </View>

            {/* Address Field */}
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#0f172a', marginBottom: 10 }}>
              {copy.step3AddressLabel}
            </Text>
            <AddressAutocomplete
              value={draft.pageAddress}
              placeholder={copy.step3AddressPlaceholder}
              onChangeText={handleAddressChange}
              onSelectPlace={place => {
                updateDraft('pageAddress', place.description);
                updateDraft('placeId', place.placeId);
                updateDraft('lat', place.lat);
                updateDraft('lng', place.lng);
              }}
            />

            {/* Map Pin Checkbox Card */}
            <ScaleButton
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
              style={{ marginTop: 20 }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#f8fafc',
                  borderWidth: 1,
                  borderColor: '#e2e8f0',
                  borderRadius: 20,
                  padding: 16,
                }}
              >
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 6,
                    borderWidth: 1.5,
                    borderColor: draft.mapPinRequested ? '#002fff' : '#cbd5e1',
                    backgroundColor: draft.mapPinRequested ? '#002fff' : '#ffffff',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12,
                  }}
                >
                  {draft.mapPinRequested && (
                    <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: '900', lineHeight: 12 }}>✓</Text>
                  )}
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#0f172a' }}>
                    {copy.step3PinLabel}
                  </Text>
                  <Text style={{ fontSize: 12, fontWeight: '500', color: '#64748b', marginTop: 4, lineHeight: 16 }}>
                    {copy.step3PinDesc}
                  </Text>
                </View>
              </View>
            </ScaleButton>
          </Animated.View>

          {/* Card 3: Categories */}
          <Animated.View
            entering={FadeInDown.delay(300).springify().damping(16)}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 24,
              borderWidth: 1,
              borderColor: '#f1f5f9',
              paddingHorizontal: 16,
              paddingVertical: 20,
              marginBottom: 24,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.02,
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            {/* Card Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                <Shapes size={18} color="#002fff" />
              </View>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#0f172a' }}>
                {language === 'vi' ? 'Chọn danh mục' : 'Select Category'}
              </Text>
            </View>

            <Text style={{ fontSize: 14, fontWeight: '500', color: '#64748b', lineHeight: 20, marginBottom: 16 }}>
              {copy.step4Subtitle}
            </Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'flex-start', marginBottom: 16 }}>
              {PAGE_CATEGORIES.map(category => {
                const active = draft.pageCategory === category.id;
                const IconComponent = CATEGORY_ICONS[category.id] || Shapes;
                const translatedLabel = (copy.categories as Record<string, string>)[category.id] || category.label;

                return (
                  <ScaleButton
                    key={category.id}
                    onPress={() => updateDraft('pageCategory', category.id)}
                    style={{
                      minHeight: 44,
                      borderRadius: 999,
                      backgroundColor: active ? '#eff6ff' : '#ffffff',
                      borderWidth: active ? 1.5 : 1,
                      borderColor: active ? '#002fff' : '#e2e8f0',
                      paddingHorizontal: 16,
                      flexDirection: 'row',
                      alignItems: 'center',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: active ? 0.05 : 0.02,
                      shadowRadius: 2,
                      elevation: 1,
                    }}
                  >
                    <IconComponent size={16} color={active ? '#002fff' : '#64748b'} style={{ marginRight: 8 }} />
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: active ? '800' : '600',
                        color: active ? '#002fff' : '#0f172a',
                      }}
                      numberOfLines={1}
                    >
                      {translatedLabel}
                    </Text>
                  </ScaleButton>
                );
              })}
            </View>

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                backgroundColor: '#f0f3ff',
                borderRadius: 16,
                padding: 16,
              }}
            >
              <Info size={18} color="#002fff" style={{ marginTop: 2, marginRight: 10 }} />
              <Text style={{ flex: 1, fontSize: 13, fontWeight: '500', color: '#64748b', lineHeight: 18 }}>
                {copy.step4Hint}
              </Text>
            </View>
          </Animated.View>

          {/* Form Actions */}
          <Animated.View
            entering={FadeInDown.delay(400).springify().damping(16)}
            style={{ marginBottom: 36 }}
          >
            <ErrorMessage message={currentError} />
            <View style={{ marginTop: 16 }}>
              <SubmitButton
                onPress={handleSubmit}
                label={submitLabel}
                isLoading={pagesVm.isCreating}
                disabled={pagesVm.isCreating}
              />
            </View>
            <Text style={{ marginTop: 24, textAlign: 'center', fontSize: 12, fontWeight: '700', color: '#94a3b8', letterSpacing: 1 }}>
              VNSEEA PROFESSIONAL
            </Text>
          </Animated.View>
        </ScrollView>
        <ToastContainer />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default CreatePageScreen;

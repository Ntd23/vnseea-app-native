// Description: Renders the VNSEEA create page wizard and submits to WoWonder API.
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
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
  ArrowRight,
  AtSign,
  CheckCircle2,
  Edit3,
  FileText,
  Info,
  Shapes,
  Eye,
  Sparkles,
  AlertCircle,
  Link2,
  Search,
  Flag,
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
import type {
  CreatePageDraft,
  PagesItem,
} from '../../domain/types/pages.types';

type CreatePageNav = NativeStackNavigationProp<RootStackParamList>;

type PageCategory = {
  id: string;
  label: string;
};

const PAGE_NAME_IMAGE =
  'https://lh3.googleusercontent.com/aida/ADBb0uh_7Hk2tZCJt_ZuSsmInEFIKcYkz_I_p1kiGHq0GazO9hqsIvzmyq5Wr9x0B1Qdov7k0AbFSs9RbfDPS7pV0l6H8F7Z-Yiqx03wvB9nNiJBvp9MxkAKieDmqOpkzzFSr8wSdGKiHddzN0mXES5-t-vCUBIC3WTWgZuCHehFVRfvKen58-5_QxROCtcOBTRP85jB2W81AXDNWDJpipz5TWEe28e2OQYBoTtFU94UQEoFhLhd-gG6VejH2YA4smY6HQRD3hI41wxKgA';

const USERNAME_IMAGE =
  'https://lh3.googleusercontent.com/aida/ADBb0uiZYLVyhHMWBGl31l47zy6o50IcsCudsMqHtBURRfDkgWuIX2dYl5EklJFpVQcWhSFNjF0nH7Wm2REahIL78NP8DpoCxJJaVUysUWa6ZsLYhkWo24lecvemew1n39kv9V1ykP4iUWk-fxMWUwMkZXmJeHx_RDqyCQYrlzItfXhBxRQqIWhACFW9OVo4-PzIk91imqqQabP1O0LK8Fl34QytlWtslif_JQoF-sKOToVYoj4oX1ev8_ctBrbFCpHjI8Udmm_P5gkr';

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
    stepLabel: (step: number) => `BƯỚC ${step}/4`,
    title: 'Đặt tên trang của bạn',
    subtitle: 'Tên trang nên phản ánh thương hiệu, tổ chức hoặc chủ đề bạn muốn chia sẻ với cộng đồng.',
    inputLabel: 'Tên trang',
    inputPlaceholder: 'Nhập tên trang',
    inputHint: 'Ví dụ: Quán Cà Phê VNSEEA, Cộng đồng Designer Việt Nam',
    errorMinLength: 'Vui lòng nhập tên trang ít nhất 2 ký tự.',
    previewTitle: 'Xem trước trang',
    previewSubtitle: 'Đây là cách tên trang của bạn sẽ hiển thị với mọi người trên ứng dụng.',
    nextBtn: 'Tiếp tục',
    step2Title: 'Đặt URL cho trang',
    step2Subtitle: 'URL giúp mọi người dễ dàng tìm thấy trang của bạn trong kết quả tìm kiếm và khi chia sẻ liên kết.',
    step2InputLabel: 'Trang URL',
    step2InputPlaceholder: 'tentrangcuaban',
    step2LinkPrefix: 'Link trang: ',
    step2Hint: 'Tên URL dài 5–32 ký tự và chỉ gồm chữ cái không dấu, số và dấu gạch ngang (-).',
    step2ErrorLength: 'Tên URL của trang phải từ 5 đến 32 ký tự.',
    step2ErrorChars: 'Tên URL chỉ được dùng chữ cái không dấu, số, gạch dưới hoặc gạch ngang.',
    // Step 3
    step3Title: 'Thông tin trang',
    step3Subtitle: 'Thêm mô tả và địa điểm để trang hiển thị đầy đủ như phiên bản web.',
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
    // Step 4
    step4Title: 'Chọn danh mục',
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
    stepLabel: (step: number) => `STEP ${step}/4`,
    title: 'Name your page',
    subtitle: 'Your page name should reflect your brand, organization, or topic you want to share with the community.',
    inputLabel: 'Page name',
    inputPlaceholder: 'Enter page name',
    inputHint: 'E.g., VNSEEA Coffee, Vietnam Designer Community',
    errorMinLength: 'Please enter a page name of at least 2 characters.',
    previewTitle: 'Page preview',
    previewSubtitle: 'This is how your page name will be displayed to people on the app.',
    nextBtn: 'Continue',
    step2Title: 'Set page URL',
    step2Subtitle: 'URL helps people easily find your page in search results and when sharing links.',
    step2InputLabel: 'Page URL',
    step2InputPlaceholder: 'yourpagename',
    step2LinkPrefix: 'Page link: ',
    step2Hint: 'URL must be 5–32 characters and only contain English letters, numbers, and hyphens (-).',
    step2ErrorLength: 'Page URL name must be between 5 and 32 characters.',
    step2ErrorChars: 'Page URL can only contain letters, numbers, and hyphens (-).',
    // Step 3
    step3Title: 'Page Info',
    step3Subtitle: 'Add description and location for the page to show completely like the web version.',
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
    // Step 4
    step4Title: 'Select category',
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
    <Animated.View style={[animatedStyle, style]}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}

function ProgressTracker({ step }: { step: number }) {
  const progressPercent = step === 1 ? '0%' : step === 2 ? '33.3%' : step === 3 ? '66.6%' : '100%';

  return (
    <View style={{ marginHorizontal: 20, marginBottom: 32, height: 24, justifyContent: 'center' }}>
      {/* Background Track */}
      <View
        style={{
          position: 'absolute',
          left: 11,
          right: 11,
          height: 3,
          backgroundColor: '#e2e8f0',
          borderRadius: 2,
        }}
      />
      
      {/* Active Blue Fill Track */}
      <View
        style={{
          position: 'absolute',
          left: 11,
          width: progressPercent,
          height: 3,
          backgroundColor: '#002fff',
          borderRadius: 2,
        }}
      />

      {/* Nodes */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        {[1, 2, 3, 4].map(node => {
          const isCompleted = node < step;
          const isActive = node === step;

          let bg = '#cbd5e1';
          let textColor = '#ffffff';
          if (isCompleted || isActive) {
            bg = '#002fff';
          }

          return (
            <View
              key={node}
              style={{
                width: 22,
                height: 22,
                borderRadius: 11,
                backgroundColor: bg,
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: bg,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 3,
                elevation: 2,
              }}
            >
              {isCompleted ? (
                <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: '900', lineHeight: 13 }}>✓</Text>
              ) : (
                <Text style={{ color: textColor, fontSize: 11, fontWeight: '800', lineHeight: 13 }}>{node}</Text>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

// Keep the old name alias just in case any other step references it
const ProgressBar = ProgressTracker;

function WizardHeader({
  step,
  raised = false,
  onBack,
  title = 'Tạo trang mới',
  copyStepLabel = 'BƯỚC',
}: {
  step: number;
  raised?: boolean;
  onBack: () => void;
  title?: string;
  copyStepLabel?: string;
}) {
  return (
    <View
      style={{
        height: 64,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
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
        <Text style={{ marginLeft: 8, fontSize: 18, fontWeight: '800', color: '#0f172a' }}>
          {title}
        </Text>
      </View>

      <View
        style={{
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 16,
          backgroundColor: '#f0f3ff',
        }}
      >
        <Text style={{ fontSize: 12, fontWeight: '800', color: '#002fff' }}>
          {copyStepLabel} {step}/4
        </Text>
      </View>
    </View>
  );
}

function NextButton({
  onPress,
  label = 'Tiếp tục',
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
            <ArrowRight size={20} color="#FFFFFF" />
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

function PageIllustration() {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', marginVertical: 24 }}>
      {/* Decorative Sparkles */}
      <View style={{ position: 'absolute', top: -10, left: '33%' }}>
        <Sparkles size={16} color="#ffe066" fill="#ffe066" />
      </View>
      <View style={{ position: 'absolute', top: -16, right: '35%' }}>
        <Sparkles size={20} color="#ffd43b" fill="#ffd43b" />
      </View>
      <View style={{ position: 'absolute', bottom: 10, right: '30%' }}>
        <Sparkles size={14} color="#ffe066" fill="#ffe066" />
      </View>

      {/* Styled Card Pad */}
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 20,
          backgroundColor: '#eff6ff',
          borderWidth: 1.5,
          borderColor: '#bfdbfe',
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#002fff',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.1,
          shadowRadius: 10,
          elevation: 4,
        }}
      >
        <FileText size={32} color="#002fff" />
        {/* Pencil edit badge overlap */}
        <View
          style={{
            position: 'absolute',
            bottom: -6,
            right: -6,
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: '#ffffff',
            borderWidth: 1.5,
            borderColor: '#e2e8f0',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 3,
            elevation: 2,
          }}
        >
          <Edit3 size={14} color="#002fff" />
        </View>
      </View>
    </View>
  );
}

function StepOne({
  value,
  error,
  onChange,
  onNext,
}: {
  value: string;
  error?: string | null;
  onChange: (value: string) => void;
  onNext: () => void;
}) {
  const language = useAppLanguage();
  const copy = CREATE_PAGE_COPY[language];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#f8fafc' }}
      contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingVertical: 24 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <ProgressBar step={1} />

      <Animated.View
        entering={FadeInDown.delay(100).springify().damping(16)}
        style={{ marginBottom: 32, alignItems: 'center' }}
      >
        <PageIllustration />
        <Text style={{ fontSize: 24, fontWeight: '800', color: '#0f172a', textAlign: 'center' }}>
          {copy.title}
        </Text>
        <Text style={{ marginTop: 12, fontSize: 14, fontWeight: '500', color: '#64748b', textAlign: 'center', paddingHorizontal: 8, lineHeight: 20 }}>
          {copy.subtitle}
        </Text>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(200).springify().damping(16)}
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 24,
          borderWidth: 1,
          borderColor: '#f1f5f9',
          paddingHorizontal: 16,
          paddingVertical: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.02,
          shadowRadius: 8,
          elevation: 2,
        }}
      >
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
          }}
        >
          <TextInput
            style={{ flex: 1, color: '#0f172a', fontSize: 15, fontWeight: '600', paddingVertical: 12 }}
            placeholder={copy.inputPlaceholder}
            placeholderTextColor="#94a3b8"
            returnKeyType="next"
            value={value}
            onChangeText={onChange}
            onSubmitEditing={onNext}
          />
          <Edit3 size={18} color="#002fff" />
        </View>
        <Text style={{ marginTop: 12, fontSize: 12, fontWeight: '500', color: '#64748b', lineHeight: 16 }}>
          {copy.inputHint}
        </Text>
        <ErrorMessage message={error} />
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(300).springify().damping(16)}
        style={{
          marginTop: 24,
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: '#f6f8ff',
          borderRadius: 24,
          padding: 16,
          borderWidth: 1,
          borderColor: '#eef2ff',
        }}
      >
        <View
          style={{
            marginRight: 16,
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: '#ffffff',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1.5,
            borderColor: '#e0e7ff',
            shadowColor: '#002fff',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.06,
            shadowRadius: 6,
            elevation: 2,
          }}
        >
          {/* Sparkles around Eye */}
          <View style={{ position: 'absolute', top: 6, left: 6 }}>
            <Sparkles size={8} color="#002fff" fill="#002fff" />
          </View>
          <View style={{ position: 'absolute', bottom: 6, right: 6 }}>
            <Sparkles size={8} color="#002fff" fill="#002fff" />
          </View>
          <Eye size={28} color="#002fff" />
        </View>
        
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: '#0f172a' }}>
            {copy.previewTitle}
          </Text>
          <Text style={{ marginTop: 4, fontSize: 13, fontWeight: '500', color: '#64748b', lineHeight: 18 }}>
            {copy.previewSubtitle}
          </Text>
        </View>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(400).springify().damping(16)}
        style={{ marginTop: 'auto', paddingTop: 36 }}
      >
        <NextButton onPress={onNext} label={copy.nextBtn} />
      </Animated.View>
    </ScrollView>
  );
}

function UrlIllustration() {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', marginVertical: 24 }}>
      {/* Decorative Sparkles */}
      <View style={{ position: 'absolute', top: -10, left: '25%' }}>
        <Sparkles size={16} color="#eff6ff" fill="#eff6ff" />
      </View>
      <View style={{ position: 'absolute', top: -16, right: '28%' }}>
        <Sparkles size={18} color="#eff6ff" fill="#eff6ff" />
      </View>
      <View style={{ position: 'absolute', bottom: 10, right: '22%' }}>
        <Sparkles size={14} color="#eff6ff" fill="#eff6ff" />
      </View>

      {/* Styled Browser Card Mock */}
      <View
        style={{
          width: 220,
          height: 106,
          borderRadius: 24,
          backgroundColor: '#ffffff',
          borderWidth: 1.5,
          borderColor: '#f1f5f9',
          padding: 16,
          justifyContent: 'center',
          shadowColor: '#002fff',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.04,
          shadowRadius: 12,
          elevation: 2,
        }}
      >
        {/* Mock Browser Dots */}
        <View style={{ flexDirection: 'row', gap: 4, position: 'absolute', top: 12, left: 14 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#cbd5e1' }} />
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#cbd5e1' }} />
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#cbd5e1' }} />
        </View>

        {/* Address Bar Row */}
        <View
          style={{
            height: 38,
            borderRadius: 12,
            backgroundColor: '#eff6ff',
            borderWidth: 1,
            borderColor: '#bfdbfe',
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 12,
            marginTop: 10,
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#002fff', marginRight: 'auto' }}>
            https://
          </Text>
          
          <View
            style={{
              width: 20,
              height: 20,
              borderRadius: 10,
              backgroundColor: '#002fff',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Simple link icon */}
            <View style={{ transform: [{ rotate: '45deg' }] }}>
              <View style={{ width: 8, height: 4, borderRadius: 2, borderWidth: 1.2, borderColor: '#ffffff' }} />
            </View>
          </View>
        </View>
      </View>

      {/* Overlapping Magnifying Glass */}
      <View
        style={{
          position: 'absolute',
          right: '20%',
          bottom: -8,
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: '#ffffff',
          borderWidth: 1.5,
          borderColor: '#e2e8f0',
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 6,
          elevation: 4,
        }}
      >
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: '#002fff',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Search size={16} color="#ffffff" />
        </View>
      </View>
    </View>
  );
}

function StepTwo({
  value,
  error,
  onChange,
  onNext,
}: {
  value: string;
  error?: string | null;
  onChange: (value: string) => void;
  onNext: () => void;
}) {
  const language = useAppLanguage();
  const copy = CREATE_PAGE_COPY[language];
  const isValid = value.trim().length >= 5 && /^[a-z0-9_-]+$/.test(value.trim());

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#f8fafc' }}
      contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingVertical: 24 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <ProgressBar step={2} />

      <Animated.View
        entering={FadeInDown.delay(100).springify().damping(16)}
        style={{ marginBottom: 32, alignItems: 'center' }}
      >
        <UrlIllustration />
        <Text style={{ fontSize: 24, fontWeight: '800', color: '#0f172a', textAlign: 'center', marginTop: 12 }}>
          {copy.step2Title}
        </Text>
        <Text style={{ marginTop: 12, fontSize: 14, fontWeight: '500', color: '#64748b', textAlign: 'center', paddingHorizontal: 8, lineHeight: 20 }}>
          {copy.step2Subtitle}
        </Text>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(200).springify().damping(16)}
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 24,
          borderWidth: 1,
          borderColor: '#f1f5f9',
          paddingHorizontal: 16,
          paddingVertical: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.02,
          shadowRadius: 8,
          elevation: 2,
        }}
      >
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
            paddingHorizontal: 12,
          }}
        >
          {/* Left Icon Square */}
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              backgroundColor: '#f0f3ff',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 10,
            }}
          >
            <AtSign size={18} color="#002fff" />
          </View>

          {/* Static Prefix Text */}
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

          {/* Vertical Divider */}
          <View style={{ width: 1, height: 20, backgroundColor: '#cbd5e1', marginHorizontal: 10 }} />

          {/* TextInput */}
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
            value={value}
            onChangeText={text => onChange(toSafePageName(text))}
            onSubmitEditing={onNext}
          />

          {/* Valid Indicator checkmark */}
          {isValid ? (
            <View style={{ marginLeft: 8 }}>
              <CheckCircle2 size={20} color="#22c55e" />
            </View>
          ) : null}
        </View>
        <ErrorMessage message={error} />
      </Animated.View>

      {/* Link Preview Card */}
      <Animated.View
        entering={FadeInDown.delay(300).springify().damping(16)}
        style={{
          marginTop: 16,
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: '#f8fafc',
          borderRadius: 16,
          paddingHorizontal: 16,
          paddingVertical: 14,
        }}
      >
        <Link2 size={16} color="#64748b" style={{ marginRight: 8 }} />
        
        <Text style={{ fontSize: 13, fontWeight: '500', color: '#64748b', flex: 1 }} numberOfLines={1}>
          {copy.step2LinkPrefix}
          <Text style={{ color: '#002fff', fontWeight: '700' }}>
            {PAGE_URL_PREFIX}{value || copy.step2InputPlaceholder}
          </Text>
        </Text>
      </Animated.View>

      {/* Instruction Hint */}
      <Animated.View
        entering={FadeInDown.delay(350).springify().damping(16)}
        style={{
          marginTop: 16,
          flexDirection: 'row',
          alignItems: 'flex-start',
          paddingHorizontal: 4,
        }}
      >
        <Info size={14} color="#94a3b8" style={{ marginTop: 2 }} />
        <Text style={{ flex: 1, fontSize: 12, fontWeight: '500', color: '#64748b', marginLeft: 8, lineHeight: 18 }}>
          {copy.step2Hint}
        </Text>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(400).springify().damping(16)}
        style={{ marginTop: 'auto', paddingTop: 36 }}
      >
        <NextButton onPress={onNext} label={copy.nextBtn} />
        <Text style={{ marginTop: 16, textAlign: 'center', fontSize: 12, fontWeight: '700', color: '#94a3b8', letterSpacing: 1 }}>
          VNSEEA PROFESSIONAL
        </Text>
      </Animated.View>
    </ScrollView>
  );
}

function StepThree({
  descriptionValue,
  addressValue,
  mapPinRequested,
  mapPinStatus,
  error,
  onDescriptionChange,
  onAddressChange,
  onPlaceSelect,
  onMapPinRequestedChange,
  onNext,
}: {
  descriptionValue: string;
  addressValue: string;
  mapPinRequested?: boolean;
  mapPinStatus?: string;
  error?: string | null;
  onDescriptionChange: (value: string) => void;
  onAddressChange: (value: string) => void;
  onPlaceSelect: (place: {
    description: string;
    placeId: string;
    lat?: number;
    lng?: number;
  }) => void;
  onMapPinRequestedChange: (value: boolean) => void;
  onNext: () => void;
}) {
  const language = useAppLanguage();
  const copy = CREATE_PAGE_COPY[language];

  const pinStatusLabel =
    mapPinStatus === 'approved'
      ? copy.step3PinStatusApproved
      : mapPinStatus === 'pending'
      ? copy.step3PinStatusPending
      : mapPinRequested
      ? copy.step3PinStatusRequested
      : copy.step3PinStatusNone;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#f8fafc' }}
      contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingVertical: 24 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <ProgressBar step={3} />

      <Animated.View
        entering={FadeInDown.delay(100).springify().damping(16)}
        style={{ marginBottom: 32, alignItems: 'center' }}
      >
        {/* Violet/Purple Circle with Blue Document Icon Illustration */}
        <View style={{ alignItems: 'center', justifyContent: 'center', marginVertical: 24 }}>
          {/* Decorative Sparkles */}
          <View style={{ position: 'absolute', top: -10, left: '33%' }}>
            <Sparkles size={16} color="#ffe066" fill="#ffe066" />
          </View>
          <View style={{ position: 'absolute', top: -16, right: '35%' }}>
            <Sparkles size={20} color="#ffd43b" fill="#ffd43b" />
          </View>
          <View style={{ position: 'absolute', bottom: 10, right: '30%' }}>
            <Sparkles size={14} color="#ffe066" fill="#ffe066" />
          </View>

          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: '#eff6ff',
              borderWidth: 1.5,
              borderColor: '#bfdbfe',
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#002fff',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.1,
              shadowRadius: 10,
              elevation: 4,
            }}
          >
            <FileText size={32} color="#002fff" />
          </View>
        </View>

        <Text style={{ fontSize: 24, fontWeight: '800', color: '#0f172a', textAlign: 'center' }}>
          {copy.step3Title}
        </Text>
        <Text style={{ marginTop: 12, fontSize: 14, fontWeight: '500', color: '#64748b', textAlign: 'center', paddingHorizontal: 8, lineHeight: 20 }}>
          {copy.step3Subtitle}
        </Text>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(200).springify().damping(16)}
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 24,
          borderWidth: 1,
          borderColor: '#f1f5f9',
          paddingHorizontal: 16,
          paddingVertical: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.02,
          shadowRadius: 8,
          elevation: 2,
        }}
      >
        {/* Description Field */}
        <Text style={{ fontSize: 14, fontWeight: '700', color: '#0f172a', marginBottom: 10 }}>
          {copy.step3DescLabel}
        </Text>
        <View
          style={{
            minHeight: 120,
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
            value={descriptionValue}
            onChangeText={onDescriptionChange}
          />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingHorizontal: 4 }}>
          <Text style={{ fontSize: 12, fontWeight: '500', color: '#64748b' }}>
            {copy.step3DescHint}
          </Text>
          <Text style={{ fontSize: 12, fontWeight: '500', color: '#64748b' }}>
            {descriptionValue.length}/200
          </Text>
        </View>

        {/* Address Field */}
        <Text style={{ fontSize: 14, fontWeight: '700', color: '#0f172a', marginTop: 24, marginBottom: 10 }}>
          {copy.step3AddressLabel}
        </Text>
        <AddressAutocomplete
          value={addressValue}
          placeholder={copy.step3AddressPlaceholder}
          onChangeText={onAddressChange}
          onSelectPlace={onPlaceSelect}
        />

        {/* Map Pin Checkbox Card */}
        <ScaleButton
          onPress={() => onMapPinRequestedChange(!mapPinRequested)}
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
            {/* Custom Checkbox */}
            <View
              style={{
                width: 20,
                height: 20,
                borderRadius: 6,
                borderWidth: 1.5,
                borderColor: mapPinRequested ? '#002fff' : '#cbd5e1',
                backgroundColor: mapPinRequested ? '#002fff' : '#ffffff',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
              }}
            >
              {mapPinRequested && (
                <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: '900', lineHeight: 12 }}>✓</Text>
              )}
            </View>

            {/* Checkbox Labels */}
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#0f172a' }}>
                {copy.step3PinLabel}
              </Text>
              <Text style={{ fontSize: 12, fontWeight: '500', color: '#64748b', marginTop: 4, lineHeight: 16 }}>
                {copy.step3PinDesc}
              </Text>
            </View>

            {/* Badge status indicator */}
            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 12,
                backgroundColor: mapPinRequested ? '#eef2ff' : '#f1f5f9',
                alignItems: 'center',
                justifyContent: 'center',
                maxWidth: 110,
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '800',
                  color: mapPinRequested ? '#002fff' : '#64748b',
                  textAlign: 'center',
                }}
                numberOfLines={2}
              >
                {pinStatusLabel}
              </Text>
            </View>
          </View>
        </ScaleButton>

        <ErrorMessage message={error} />
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(300).springify().damping(16)}
        style={{ marginTop: 'auto', paddingTop: 36 }}
      >
        <NextButton onPress={onNext} label={copy.nextBtn} />
        <Text style={{ marginTop: 16, textAlign: 'center', fontSize: 12, fontWeight: '700', color: '#94a3b8', letterSpacing: 1 }}>
          VNSEEA PROFESSIONAL
        </Text>
      </Animated.View>
    </ScrollView>
  );
}

function StepFour({
  selectedId,
  error,
  isCreating,
  submitLabel = 'Tạo trang',
  onSelect,
  onSubmit,
}: {
  selectedId: string;
  error?: string | null;
  isCreating: boolean;
  submitLabel?: string;
  onSelect: (categoryId: string) => void;
  onSubmit: () => void;
}) {
  const language = useAppLanguage();
  const copy = CREATE_PAGE_COPY[language];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#f8fafc' }}
      contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingVertical: 24 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <ProgressBar step={4} />

      <Animated.View
        entering={FadeInDown.delay(100).springify().damping(16)}
        style={{ marginBottom: 32, alignItems: 'center' }}
      >
        {/* Violet/Purple Circle with Blue Outline Flag Icon Illustration */}
        <View style={{ alignItems: 'center', justifyContent: 'center', marginVertical: 24 }}>
          {/* Decorative Sparkles */}
          <View style={{ position: 'absolute', top: -10, left: '33%' }}>
            <Sparkles size={16} color="#ffe066" fill="#ffe066" />
          </View>
          <View style={{ position: 'absolute', top: -16, right: '35%' }}>
            <Sparkles size={20} color="#ffd43b" fill="#ffd43b" />
          </View>
          <View style={{ position: 'absolute', bottom: 10, right: '30%' }}>
            <Sparkles size={14} color="#ffe066" fill="#ffe066" />
          </View>

          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: '#eff6ff',
              borderWidth: 1.5,
              borderColor: '#bfdbfe',
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#002fff',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.1,
              shadowRadius: 10,
              elevation: 4,
            }}
          >
            <Flag size={32} color="#002fff" />
          </View>
        </View>

        <Text style={{ fontSize: 24, fontWeight: '800', color: '#0f172a', textAlign: 'center' }}>
          {copy.step4Title}
        </Text>
        <Text style={{ marginTop: 12, fontSize: 14, fontWeight: '500', color: '#64748b', textAlign: 'center', paddingHorizontal: 8, lineHeight: 20 }}>
          {copy.step4Subtitle}
        </Text>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(200).springify().damping(16)}
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 24,
          borderWidth: 1,
          borderColor: '#f1f5f9',
          paddingHorizontal: 16,
          paddingVertical: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.02,
          shadowRadius: 8,
          elevation: 2,
        }}
      >
        {/* Categories wrap container */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'flex-start' }}>
          {PAGE_CATEGORIES.map(category => {
            const active = selectedId === category.id;
            const IconComponent = CATEGORY_ICONS[category.id] || Shapes;
            const translatedLabel = (copy.categories as Record<string, string>)[category.id] || category.label;

            return (
              <ScaleButton
                key={category.id}
                onPress={() => onSelect(category.id)}
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

        {/* Info panel */}
        <View
          style={{
            marginTop: 20,
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

        <ErrorMessage message={error} />
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(300).springify().damping(16)}
        style={{ marginTop: 'auto', paddingTop: 36 }}
      >
        <NextButton
          onPress={onSubmit}
          label={submitLabel}
          isLoading={isCreating}
          disabled={isCreating}
        />
        <Text style={{ marginTop: 16, textAlign: 'center', fontSize: 12, fontWeight: '700', color: '#94a3b8', letterSpacing: 1 }}>
          WOWONDER SOCIAL NETWORK
        </Text>
      </Animated.View>
    </ScrollView>
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
  const [step, setStep] = useState(1);
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
  const headerRaised = step === 4;

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

  const validateStep = useCallback(
    (targetStep: number) => {
      if (targetStep === 1 && draft.pageTitle.trim().length < 2) {
        return copy.errorMinLength;
      }

      if (targetStep === 2) {
        const pageName = draft.pageName.trim();
        if (pageName.length < 5 || pageName.length > 32) {
          return copy.step2ErrorLength;
        }

        if (!/^[a-z0-9_-]+$/.test(pageName)) {
          return copy.step2ErrorChars;
        }
      }

      if (targetStep === 3) {
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

      if (targetStep === 4 && !draft.pageCategory) {
        return copy.step4ErrorCategory;
      }

      return null;
    },
    [draft, copy],
  );

  const goNext = useCallback(() => {
    const error = validateStep(step);
    if (error) {
      setLocalError(error);
      return;
    }

    setLocalError(null);
    pagesVm.clearError();
    setStep(value => Math.min(value + 1, 4));
  }, [pagesVm, step, validateStep]);

  const handleSubmit = useCallback(async () => {
    const error = validateStep(4);
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

      Alert.alert(
        isEditing ? 'Cập nhật trang thành công' : 'Tạo trang thành công',
        `Trang ${savedPage.pageTitle || draft.pageTitle} đã được ${
          isEditing ? 'cập nhật' : 'tạo'
        }.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Vui lòng kiểm tra thông tin và thử lại.';
      Alert.alert(
        isEditing ? 'Không thể cập nhật trang' : 'Không thể tạo trang',
        message,
      );
    }
  }, [
    draft,
    editingPage?.pageId,
    isEditing,
    navigation,
    pagesVm,
    validateStep,
  ]);

  const content = useMemo(() => {
    if (step === 1) {
      return (
        <StepOne
          value={draft.pageTitle}
          error={currentError}
          onChange={handleTitleChange}
          onNext={goNext}
        />
      );
    }

    if (step === 2) {
      return (
        <StepTwo
          value={draft.pageName}
          error={currentError}
          onChange={handlePageNameChange}
          onNext={goNext}
        />
      );
    }

    if (step === 3) {
      return (
        <StepThree
          descriptionValue={draft.pageDescription}
          addressValue={draft.pageAddress}
          mapPinRequested={draft.mapPinRequested}
          mapPinStatus={draft.mapPinStatus}
          error={currentError}
          onDescriptionChange={value => updateDraft('pageDescription', value)}
          onAddressChange={handleAddressChange}
          onPlaceSelect={place => {
            updateDraft('pageAddress', place.description);
            updateDraft('placeId', place.placeId);
            updateDraft('lat', place.lat);
            updateDraft('lng', place.lng);
          }}
          onMapPinRequestedChange={value => {
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
          onNext={goNext}
        />
      );
    }

    return (
      <StepFour
        selectedId={draft.pageCategory}
        error={currentError}
        isCreating={pagesVm.isCreating}
        submitLabel={isEditing ? 'Cập nhật trang' : 'Tạo trang'}
        onSelect={categoryId => updateDraft('pageCategory', categoryId)}
        onSubmit={handleSubmit}
      />
    );
  }, [
    currentError,
    draft.pageAddress,
    draft.pageCategory,
    draft.pageDescription,
    draft.mapPinRequested,
    draft.mapPinStatus,
    draft.pageName,
    draft.pageTitle,
    goNext,
    handleAddressChange,
    handlePageNameChange,
    handleSubmit,
    handleTitleChange,
    pagesVm.isCreating,
    step,
    updateDraft,
  ]);

  function handleBack() {
    if (step > 1) {
      setLocalError(null);
      pagesVm.clearError();
      setStep(value => value - 1);
      return;
    }

    navigation.goBack();
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <WizardHeader
          step={step}
          raised={headerRaised}
          title={isEditing ? copy.headerEditTitle : copy.headerTitle}
          copyStepLabel={language === 'vi' ? 'BƯỚC' : 'STEP'}
          onBack={handleBack}
        />
        {content}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default CreatePageScreen;

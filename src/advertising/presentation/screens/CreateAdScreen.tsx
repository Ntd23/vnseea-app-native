// English description: Creates or edits an advertising campaign in a three-step wizard.
import { APP_BRAND_COLOR } from '../../../shared-kernel/presentation/theme/appColors';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import {
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  DollarSign,
  Globe,
  ImagePlus,
  Megaphone,
  Video,
} from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../navigation/types';
import { ROUTES } from '../../../navigation/constants/routes';
import { useAdsViewModel } from '../../application/view-models/useAdsViewModel';
import type { AdBiddingType, AdGender, AdAppearsType } from '../../domain/types/ads.types';
import { showSnackbar as showToast } from '../../../shared-kernel/presentation/components/Snackbar';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';
import { SafeAreaFeedHeader } from '../../../feed/presentation/components/SafeAreaFeedHeader';
import { apiConfig } from '../../../shared-kernel/infrastructure/config/env';
import { getAdvertisingCopy } from '../../application/i18n/advertisingCopy';
import { hasAdDraftChanges } from '../../application/services/adFormChangeDetection';
import {
  AD_WEBSITE_PREFIX,
  buildAdWebsiteUrl,
  getAdWebsiteHost,
  getAdWebsiteProtocol,
} from '../../application/services/adWebsiteInput';

type CreateAdNav = NativeStackNavigationProp<RootStackParamList>;

const BRAND = APP_BRAND_COLOR;
const MODAL_SCROLL_CONTENT_STYLE = { paddingBottom: 24 };

function isVideoPreview(
  media: string | undefined,
  mediaType: string | undefined,
) {
  return (
    mediaType?.startsWith('video/') === true ||
    /\.(mp4|mov|m4v|avi|webm)(\?|$)/i.test(media ?? '')
  );
}

function CreateAdScreen() {
  const navigation = useNavigation<CreateAdNav>();
  const route = useRoute<RouteProp<RootStackParamList, typeof ROUTES.CREATE_AD>>();
  const editingAd = route.params?.ad;
  const { options, isCreating, isUpdating, createAd, updateAd, fetchOptions } = useAdsViewModel();
  const language = useAppLanguage();
  const copy = getAdvertisingCopy(language);

  const [step, setStep] = useState(0);
  const [countrySheetOpen, setCountrySheetOpen] = useState(false);
  const [pageSheetOpen, setPageSheetOpen] = useState(false);
  const [genderSheetOpen, setGenderSheetOpen] = useState(false);
  const [placementSheetOpen, setPlacementSheetOpen] = useState(false);
  const [datePickerField, setDatePickerField] = useState<'startDate' | 'endDate' | null>(null);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const formScrollRef = useRef<ScrollView>(null);
  const initialFormDataRef = useRef({
    name: editingAd?.name ?? '',
    website: editingAd?.url || AD_WEBSITE_PREFIX,
    headline: editingAd?.headline ?? '',
    description: editingAd?.description ?? '',
    audienceList: editingAd?.audience ?? '233',
    gender: (editingAd?.gender ?? 'all') as AdGender,
    bidding: (editingAd?.bidding ?? 'clicks') as AdBiddingType,
    appears: (editingAd?.appears ?? 'entire') as AdAppearsType,
    budget: editingAd?.budget ? String(editingAd.budget) : '',
    media: editingAd?.ad_media ?? undefined,
    mediaName: undefined as string | undefined,
    mediaType: undefined as string | undefined,
    location: editingAd?.location ?? 'Vietnam',
    startDate: editingAd?.start ?? '',
    endDate: editingAd?.end ?? '',
    pageName: '',
  });
  const [formData, setFormData] = useState(() => initialFormDataRef.current);

  const [imagePreview, setImagePreview] = useState<string | null>(editingAd?.ad_media ?? null);
  const mediaPreviewIsVideo = isVideoPreview(
    formData.media,
    formData.mediaType,
  );
  const mediaPlacementMismatch = Boolean(formData.media) && (
    (formData.appears === 'video' && !mediaPreviewIsVideo) ||
    (formData.appears !== 'video' && mediaPreviewIsVideo)
  );

  const handleInputFocus = (target: unknown) => {
    setIsKeyboardVisible(true);
    setTimeout(() => {
      formScrollRef.current?.scrollResponderScrollNativeHandleToKeyboard(
        target,
        120,
        true,
      );
    }, 120);
  };

  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSubscription = Keyboard.addListener(showEvent, () => {
      setIsKeyboardVisible(true);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setIsKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!editingAd?.page_id || !options?.pages.length || formData.pageName) return;
    const selectedPage = options.pages.find(page => page.id === String(editingAd.page_id));
    if (selectedPage) {
      setFormData(previous => ({ ...previous, pageName: selectedPage.name }));
    }
  }, [editingAd?.page_id, formData.pageName, options?.pages]);

  const parseApiDate = (value: string) => {
    const parsed = value ? new Date(`${value}T00:00:00`) : new Date();
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  };

  const formatDisplayDate = (value: string) => {
    if (!value) return 'dd/mm/yyyy';
    const [year, month, day] = value.split('-');
    return day && month && year ? `${day}/${month}/${year}` : value;
  };

  const formatApiDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setDatePickerField(null);
    if (event.type === 'dismissed' || !selectedDate || !datePickerField) return;
    const field = datePickerField;
    setFormData(previous => ({ ...previous, [field]: formatApiDate(selectedDate) }));
  };

  const handleSelectImage = async () => {
    Keyboard.dismiss();
    try {
      const result = await launchImageLibrary({
        mediaType: 'mixed',
        quality: 0.8,
        maxWidth: 1200,
        maxHeight: 628,
      });
      if (result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setFormData(prev => ({
          ...prev,
          media: asset.uri,
          mediaName: asset.fileName,
          mediaType: asset.type,
        }));
        setImagePreview(asset.uri || null);
      }
    } catch (error) {
      console.error('Error selecting image:', error);
    }
  };

  const validateStep = (currentStep: number): boolean => {
    switch (currentStep) {
      case 0:
        if (!formData.name.trim() || formData.name.trim().length < 3) {
          showToast({ message: copy.errorCompanyName, type: 'error' });
          return false;
        }
        if (!formData.media) {
          showToast({ message: copy.errorImage, type: 'error' });
          return false;
        }
        return true;

      case 1:
        if (!/^https?:\/\/.+\..+/i.test(formData.website.trim())) {
          showToast({ message: copy.errorWebsite, type: 'error' });
          return false;
        }
        if (!formData.headline.trim() || formData.headline.trim().length < 5) {
          showToast({ message: copy.errorHeadline, type: 'error' });
          return false;
        }
        if (!formData.description.trim()) {
          showToast({ message: copy.errorDescription, type: 'error' });
          return false;
        }
        if (!formData.startDate || !formData.endDate) {
          showToast({ message: 'Vui lòng chọn ngày bắt đầu và ngày kết thúc.', type: 'error' });
          return false;
        }
        if (formData.startDate && formData.endDate && formData.endDate < formData.startDate) {
          showToast({ message: 'Ngày cuối phải bằng hoặc sau ngày bắt đầu.', type: 'error' });
          return false;
        }
        return true;

      case 2:
        const audienceList = formData.audienceList.trim();
        const countryIds = audienceList.split(',').map(item => item.trim()).filter(Boolean);
        if (countryIds.length === 0 || countryIds.some(item => !/^\d+$/.test(item) || item === '0')) {
          showToast({ message: copy.errorCountry, type: 'error' });
          return false;
        }
        if (!formData.location.trim()) {
          showToast({ message: copy.errorLocation, type: 'error' });
          return false;
        }
        return true;

      default:
        return true;
    }
  };

  const next = () => {
    if (!validateStep(step)) {
      return;
    }

    if (step < 2) {
      setStep(s => s + 1);
    } else {
      handleSubmit();
    }
  };

  const back = () => {
    if (step > 0) {
      setStep(s => s - 1);
    } else {
      navigation.goBack();
    }
  };

  const handleSubmit = async () => {
    if (
      editingAd &&
      !hasAdDraftChanges(initialFormDataRef.current, formData)
    ) {
      showToast({ message: copy.successUpdate, type: 'success' });
      navigation.goBack();
      return;
    }

    if (mediaPlacementMismatch) {
      showToast({
        message:
          language === 'vi'
            ? 'Media đã chọn chưa phù hợp với vị trí hiển thị.'
            : 'The selected media does not match the display placement.',
        type: 'error',
      });
      return;
    }

    const name = formData.name.trim();
    const website = formData.website.trim();
    const headline = formData.headline.trim();
    const description = formData.description.trim();
    const audienceList = formData.audienceList.trim();
    const location = formData.location.trim() || audienceList;

    if (name.length < 3) {
      showToast({ message: 'Vui lòng nhập tên công ty hợp lệ.', type: 'error' });
      return;
    }
    if (!/^https?:\/\/.+\..+/i.test(website)) {
      showToast({ message: 'Vui lòng nhập website đầy đủ, ví dụ https://example.com.', type: 'error' });
      return;
    }
    if (headline.length < 5) {
      showToast({ message: 'Vui lòng nhập tiêu đề quảng cáo hợp lệ.', type: 'error' });
      return;
    }
    if (!description) {
      showToast({ message: 'Vui lòng nhập mô tả quảng cáo.', type: 'error' });
      return;
    }
    const countryIds = audienceList
      .split(',')
      .map(item => item.trim())
      .filter(Boolean);

    if (
      countryIds.length === 0 ||
      countryIds.some(item => !/^\d+$/.test(item) || item === '0')
    ) {
      showToast({ message: 'Vui lòng chọn quốc gia mục tiêu.', type: 'error' });
      return;
    }
    if (!formData.media) {
      showToast({ message: 'Vui lòng chọn media quảng cáo.', type: 'error' });
      return;
    }

    const isNewMedia = formData.media && (
      formData.media.startsWith('file://') ||
      formData.media.startsWith('content://') ||
      !formData.media.startsWith('http')
    );

    if (
      isNewMedia &&
      formData.appears === 'video' &&
      !formData.mediaType?.startsWith('video/')
    ) {
      showToast({ message: 'Vị trí Video cần chọn file video.', type: 'error' });
      return;
    }

    if (
      isNewMedia &&
      formData.appears !== 'video' &&
      formData.mediaType?.startsWith('video/')
    ) {
      showToast({
        message:
          language === 'vi'
            ? 'Vị trí đã chọn cần tệp hình ảnh.'
            : 'The selected placement requires an image file.',
        type: 'error',
      });
      return;
    }

    const adData = {
      name,
      website,
      headline,
      description,
      audienceList: countryIds.join(','),
      gender: formData.gender,
      bidding: formData.bidding,
      appears: formData.appears,
      media: formData.media,
      mediaName: formData.mediaName,
      mediaType: formData.mediaType,
      location,
      budget: formData.budget ? parseFloat(formData.budget) : undefined,
      startDate: formData.startDate || undefined,
      endDate: formData.endDate || undefined,
      pageName: formData.pageName || undefined,
    };

    if (editingAd) {
      const res = await updateAd(editingAd.id, adData);
      if (res.success) {
        showToast({ message: copy.successUpdate, type: 'success' });
        setTimeout(() => navigation.goBack(), 1500);
      } else {
        showToast({ message: res.error || copy.errorUpdate, type: 'error' });
      }
    } else {
      const res = await createAd(adData);
      if (res.success) {
        showToast({ message: copy.successCreate, type: 'success' });
        setTimeout(() => navigation.goBack(), 1500);
      } else {
        showToast({ message: res.error || copy.errorCreate, type: 'error' });
      }
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 0:
        return language === 'vi' ? 'Ảnh & doanh nghiệp' : 'Media & business';
      case 1:
        return language === 'vi' ? 'Nội dung & liên kết' : 'Content & link';
      case 2:
        return language === 'vi' ? 'Mục tiêu & ngân sách' : 'Targeting & budget';
      default: return '';
    }
  };

  const getStepHelper = () => {
    switch (step) {
      case 0:
        return language === 'vi'
          ? 'Thêm tên doanh nghiệp và media đại diện cho chiến dịch.'
          : 'Add the business name and campaign media.';
      case 1:
        return language === 'vi'
          ? 'Viết nội dung ngắn gọn và chọn nơi người xem sẽ truy cập.'
          : 'Write concise content and choose where viewers will go.';
      case 2:
        return language === 'vi'
          ? 'Chọn đối tượng, vị trí hiển thị và ngân sách phù hợp.'
          : 'Choose the audience, placement, and suitable budget.';
      default: return '';
    }
  };


  const selectedCountry = options?.audience.find(
    item => item.value === formData.audienceList,
  );
  const selectedPage = options?.pages.find(item => item.name === formData.pageName);
  const genderOptions = options?.genders.length
    ? options.genders
    : [
        { value: 'all', label: 'Tất cả' },
        { value: 'male', label: 'Nam' },
        { value: 'female', label: 'Nữ' },
      ];
  const placementOptions = options?.placements.length
    ? options.placements
    : [
        { value: 'entire', label: 'Toàn bộ trang web' },
        { value: 'post', label: 'Bài viết' },
        { value: 'sidebar', label: 'Thanh bên' },
      ];
  const selectedGender = genderOptions.find(item => item.value === formData.gender);
  const selectedPlacement = placementOptions.find(item => item.value === formData.appears);

  const renderPhtmlStepContent = () => {
    if (step === 0) {
      return (
        <View className="gap-5">
          <View>
            <Text className="mb-2 text-sm font-semibold text-slate-700">
              {copy.companyName}
            </Text>
            <TextInput
              className="min-h-[56px] rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base text-slate-900"
              placeholder={copy.companyNamePlaceholder}
              placeholderTextColor="#94A3B8"
              value={formData.name}
              onChangeText={name => setFormData(previous => ({ ...previous, name }))}
              onFocus={event => handleInputFocus(event.target)}
              returnKeyType="done"
            />
          </View>

          <View>
            <Text className="mb-2 text-sm font-semibold text-slate-700">
              {copy.image}
            </Text>
            <Text className="mb-3 text-sm leading-5 text-slate-500">
              {language === 'vi'
                ? 'Chọn ảnh rõ nét để người xem nhận diện quảng cáo nhanh hơn.'
                : 'Choose a clear image so people can recognize your ad quickly.'}
            </Text>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleSelectImage}
              className="min-h-[220px] items-center justify-center overflow-hidden rounded-[20px] border-2 border-dashed border-brand-border bg-brand-subtle"
            >
              {imagePreview && !mediaPreviewIsVideo ? (
                <View className="w-full">
                  <Image
                    source={{ uri: imagePreview }}
                    className="h-56 w-full bg-slate-100"
                    resizeMode="cover"
                  />
                  <View className="absolute bottom-3 self-center rounded-full bg-black/65 px-4 py-2">
                    <Text className="text-sm font-semibold text-white">
                      {copy.changeImage}
                    </Text>
                  </View>
                </View>
              ) : imagePreview ? (
                <View className="h-56 w-full items-center justify-center bg-slate-900">
                  <View className="h-16 w-16 items-center justify-center rounded-full bg-white/15">
                    <Video size={30} color="#ffffff" />
                  </View>
                  <Text className="mt-3 text-sm font-semibold text-white">
                    {language === 'vi' ? 'Video đã được chọn' : 'Video selected'}
                  </Text>
                  <Text className="mt-1 text-xs text-white/70">
                    {language === 'vi'
                      ? 'Nhấn để chọn video khác'
                      : 'Tap to choose another video'}
                  </Text>
                </View>
              ) : (
                <>
                  <View className="h-16 w-16 items-center justify-center rounded-full bg-white">
                    <ImagePlus size={30} color={BRAND} />
                  </View>
                  <Text className="mt-4 text-base font-bold text-brand">
                    {copy.selectImage}
                  </Text>
                  <Text className="mt-1 px-4 text-center text-xs text-slate-500">
                    JPG, PNG, GIF hoặc video phù hợp vị trí hiển thị
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    if (step === 1) {
      return (
        <View className="gap-5">
            <View>
              <Text className="mb-2 text-sm font-semibold text-slate-700">
                {copy.headline}
              </Text>
              <TextInput
                className="min-h-[56px] rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base text-slate-900"
                placeholder={copy.headlinePlaceholder}
                placeholderTextColor="#94A3B8"
                value={formData.headline}
                onChangeText={headline => setFormData(previous => ({ ...previous, headline }))}
                onFocus={event => handleInputFocus(event.target)}
                returnKeyType="next"
              />
            </View>
            <View>
              <Text className="mb-2 text-sm font-semibold text-slate-700">
                {copy.description}
              </Text>
              <TextInput
                className="min-h-[132px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-base leading-6 text-slate-900"
                placeholder={copy.descriptionPlaceholder}
                placeholderTextColor="#94A3B8"
                multiline
                textAlignVertical="top"
                value={formData.description}
                onChangeText={description => setFormData(previous => ({ ...previous, description }))}
                onFocus={event => handleInputFocus(event.target)}
              />
              <Text className="mt-2 text-xs leading-4 text-slate-500">
                {language === 'vi'
                  ? 'Mô tả ngắn gọn lợi ích hoặc thông điệp chính của chiến dịch.'
                  : 'Briefly describe the main benefit or message of your campaign.'}
              </Text>
            </View>
            <View>
              <Text className="mb-2 text-sm font-semibold text-slate-700">
                {language === 'vi' ? 'Ngày bắt đầu' : 'Start date'}
              </Text>
              <TouchableOpacity
                className="min-h-[56px] flex-row items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4"
                onPress={() => {
                  Keyboard.dismiss();
                  setDatePickerField('startDate');
                }}
              >
                <Text className={formData.startDate ? 'text-base text-slate-900' : 'text-base text-slate-400'}>
                  {formatDisplayDate(formData.startDate)}
                </Text>
                <CalendarDays size={19} color="#64748b" />
              </TouchableOpacity>
            </View>
            <View>
              <Text className="mb-2 text-sm font-semibold text-slate-700">
                {language === 'vi' ? 'Ngày kết thúc' : 'End date'}
              </Text>
              <TouchableOpacity
                className="min-h-[56px] flex-row items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4"
                onPress={() => {
                  Keyboard.dismiss();
                  setDatePickerField('endDate');
                }}
              >
                <Text className={formData.endDate ? 'text-base text-slate-900' : 'text-base text-slate-400'}>
                  {formatDisplayDate(formData.endDate)}
                </Text>
                <CalendarDays size={19} color="#64748b" />
              </TouchableOpacity>
            </View>
            <View>
              <Text className="mb-2 text-sm font-semibold text-slate-700">
                {copy.website}
              </Text>
              <View className="min-h-[56px] flex-row items-center rounded-2xl border border-slate-200 bg-slate-50 px-4">
                <Globe size={19} color="#64748b" />
                <Text className="ml-3 text-base font-semibold text-slate-500">
                  {getAdWebsiteProtocol(formData.website)}
                </Text>
                <TextInput
                  className="ml-1 flex-1 text-base text-slate-900"
                  placeholder={language === 'vi' ? 'tenmien.com' : 'yourdomain.com'}
                  placeholderTextColor="#94A3B8"
                  keyboardType="url"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={getAdWebsiteHost(formData.website)}
                  onChangeText={website =>
                    setFormData(previous => ({
                      ...previous,
                      website: buildAdWebsiteUrl(website),
                      pageName: '',
                    }))
                  }
                  onFocus={event => handleInputFocus(event.target)}
                  returnKeyType="done"
                />
              </View>
              <Text className="mt-2 text-xs leading-4 text-slate-500">
                {getAdWebsiteProtocol(formData.website) === AD_WEBSITE_PREFIX
                  ? language === 'vi'
                    ? 'Bạn chỉ cần nhập tên miền, phần https:// đã được thêm sẵn.'
                    : 'Only enter the domain; https:// is already included.'
                  : language === 'vi'
                    ? 'Liên kết cũ đang dùng http://; khi chỉnh sửa, app sẽ chuyển sang https://.'
                    : 'This legacy link uses http://; editing it will upgrade to https://.'}
              </Text>
            </View>
            <View>
              <Text className="mb-2 text-sm font-semibold text-slate-700">
                {language === 'vi' ? 'Hoặc chọn trang của tôi' : 'Or choose my page'}
              </Text>
              <TouchableOpacity
                className="min-h-[56px] flex-row items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4"
                onPress={() => {
                  Keyboard.dismiss();
                  setPageSheetOpen(true);
                }}
              >
                <Text className={selectedPage ? 'flex-1 text-base text-slate-900' : 'flex-1 text-base text-slate-400'} numberOfLines={1}>
                  {selectedPage?.title || (language === 'vi' ? 'Không chọn trang' : 'No page selected')}
                </Text>
                <ChevronDown size={18} color="#64748b" />
              </TouchableOpacity>
            </View>
        </View>
      );
    }

    return (
      <View className="gap-5">
        <View>
          <Text className="mb-2 text-sm font-semibold text-slate-700">
            {copy.locationLabel}
          </Text>
          <TextInput
            className="min-h-[56px] rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base text-slate-900"
            placeholder={copy.displayLocationPlaceholder}
            placeholderTextColor="#94A3B8"
            value={formData.location}
            onChangeText={location => setFormData(previous => ({ ...previous, location }))}
            onFocus={event => handleInputFocus(event.target)}
          />
        </View>
        <View>
          <Text className="mb-2 text-sm font-semibold text-slate-700">
            {copy.targetCountry}
          </Text>
          <TouchableOpacity
            className="min-h-[56px] flex-row items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4"
            onPress={() => {
              Keyboard.dismiss();
              setCountrySheetOpen(true);
            }}
          >
            <Text className="text-base text-slate-900">
              {selectedCountry?.label || (language === 'vi' ? 'Chọn quốc gia' : 'Select country')}
            </Text>
            <ChevronDown size={18} color="#64748b" />
          </TouchableOpacity>
        </View>

        <View>
          <Text className="mb-2 text-sm font-semibold text-slate-700">
            {copy.gender}
          </Text>
          <TouchableOpacity
            className="min-h-[56px] flex-row items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4"
            onPress={() => {
              Keyboard.dismiss();
              setGenderSheetOpen(true);
            }}
          >
            <Text className="text-base text-slate-900">
              {selectedGender?.label || copy.genderAll}
            </Text>
            <ChevronDown size={18} color="#64748b" />
          </TouchableOpacity>
        </View>

        <View>
          <Text className="mb-2 text-sm font-semibold text-slate-700">
            {copy.displayPosition}
          </Text>
          <TouchableOpacity
            className="min-h-[56px] flex-row items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4"
            onPress={() => {
              Keyboard.dismiss();
              setPlacementSheetOpen(true);
            }}
          >
            <Text className="flex-1 text-base text-slate-900" numberOfLines={1}>
              {selectedPlacement?.label || copy.positionLabelEntire}
            </Text>
            <ChevronDown size={18} color="#64748b" />
          </TouchableOpacity>
          <Text className="mt-2 text-xs leading-4 text-slate-500">
            {formData.appears === 'video'
              ? (language === 'vi' ? 'Vị trí này yêu cầu tệp video.' : 'This placement requires a video file.')
              : (language === 'vi' ? 'Vị trí này yêu cầu tệp hình ảnh.' : 'This placement requires an image file.')}
          </Text>
          {mediaPlacementMismatch ? (
            <TouchableOpacity
              activeOpacity={0.82}
              className="mt-3 flex-row items-center rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3"
              onPress={handleSelectImage}
            >
              <ImagePlus size={20} color="#b45309" />
              <Text className="ml-3 flex-1 text-sm leading-5 text-amber-800">
                {language === 'vi'
                  ? 'Tệp đã chọn chưa phù hợp. Nhấn để chọn lại.'
                  : 'The selected file is incompatible. Tap to choose again.'}
              </Text>
              <ChevronRight size={18} color="#b45309" />
            </TouchableOpacity>
          ) : null}
        </View>

        <View>
          <Text className="mb-2 text-sm font-semibold text-slate-700">
            {copy.biddingMethod}
          </Text>
          <View className="flex-row gap-2">
            {(['clicks', 'views'] as AdBiddingType[]).map(value => {
              const selected = formData.bidding === value;
              const price = value === 'clicks' ? options?.clickPrice : options?.viewPrice;
              return (
                <TouchableOpacity
                  key={value}
                  className={`min-h-[82px] flex-1 rounded-2xl border px-4 py-3 ${selected ? 'border-brand bg-brand-soft' : 'border-slate-200 bg-slate-50'}`}
                  onPress={() => setFormData(previous => ({ ...previous, bidding: value }))}
                >
                  <Text className={`text-sm font-bold ${selected ? 'text-brand' : 'text-slate-700'}`}>
                    {value === 'clicks' ? copy.biddingClicks : copy.biddingViews}
                  </Text>
                  <Text className="mt-2 text-xs text-slate-500">
                    {Number(price ?? 0).toLocaleString('vi-VN')} {options?.currencySymbol || 'VNSEEA'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View>
          <Text className="mb-2 text-sm font-semibold text-slate-700">
            {copy.budget}
          </Text>
          <View className="min-h-[56px] flex-row items-center rounded-2xl border border-slate-200 bg-slate-50 px-4">
            <DollarSign size={19} color="#64748b" />
            <TextInput
              className="ml-3 flex-1 text-base text-slate-900"
              placeholder="0"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
              value={formData.budget}
              onChangeText={budget => setFormData(previous => ({ ...previous, budget }))}
              onFocus={event => handleInputFocus(event.target)}
              returnKeyType="done"
            />
            <Text className="text-xs font-semibold text-slate-500">
              {options?.currencySymbol || 'VNSEEA'}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const headerBackgroundColor =
    Platform.OS === 'android' ? APP_BRAND_COLOR : '#FFFFFF';

  return (
    <View className="flex-1 bg-[#f6f8fc]">
      <FocusAwareStatusBar
        barStyle={Platform.OS === 'android' ? 'light-content' : 'dark-content'}
        backgroundColor={headerBackgroundColor}
        translucent={false}
      />
      <SafeAreaFeedHeader safeAreaBackgroundColor={headerBackgroundColor} />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={formScrollRef}
          className="flex-1"
          contentContainerClassName="px-4 pb-8 pt-4"
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-row items-center">
            <View className="h-12 w-12 items-center justify-center rounded-2xl bg-brand-subtle">
              <Megaphone size={23} color={BRAND} />
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-xl font-bold text-slate-900">
                {editingAd
                  ? (language === 'vi' ? 'Sửa quảng cáo' : 'Edit advertisement')
                  : (language === 'vi' ? 'Tạo quảng cáo' : 'Create advertisement')}
              </Text>
              <Text className="mt-1 text-sm text-slate-500">
                {language === 'vi'
                  ? 'Hoàn tất từng bước và xem trước trước khi lưu.'
                  : 'Complete each step and preview before saving.'}
              </Text>
            </View>
            <View className="rounded-full bg-slate-200 px-3 py-1.5">
              <Text className="text-xs font-bold text-slate-700">{step + 1}/3</Text>
            </View>
          </View>

          <View className="mt-4 overflow-hidden rounded-[24px] border border-slate-200 bg-white">
            <View className="flex-row items-center px-4 py-3">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-brand-subtle">
                <Text className="font-bold text-brand">
                  {formData.name.charAt(0).toUpperCase() || 'A'}
                </Text>
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-sm font-bold text-slate-900" numberOfLines={1}>
                  {formData.name || (language === 'vi' ? 'Tên doanh nghiệp' : 'Business name')}
                </Text>
                <Text className="mt-0.5 text-xs text-slate-500" numberOfLines={1}>
                  {getAdWebsiteHost(formData.website) || 'yourdomain.com'}
                </Text>
              </View>
              <View className="rounded-full bg-brand-subtle px-2.5 py-1">
                <Text className="text-[11px] font-semibold text-brand">
                  {language === 'vi' ? 'Quảng cáo' : 'Sponsored'}
                </Text>
              </View>
            </View>

            {imagePreview && !mediaPreviewIsVideo ? (
              <Image
                source={{ uri: imagePreview }}
                className="h-48 w-full bg-slate-100"
                resizeMode="cover"
              />
            ) : imagePreview ? (
              <View className="h-48 items-center justify-center bg-slate-900">
                <Video size={32} color="#ffffff" />
                <Text className="mt-2 text-sm font-semibold text-white">
                  {language === 'vi' ? 'Xem trước video' : 'Video preview'}
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                activeOpacity={0.82}
                className="h-44 items-center justify-center bg-slate-100"
                onPress={handleSelectImage}
              >
                <ImagePlus size={32} color="#94a3b8" />
                <Text className="mt-2 text-sm font-semibold text-slate-500">
                  {language === 'vi' ? 'Thêm ảnh để xem trước' : 'Add media to preview'}
                </Text>
              </TouchableOpacity>
            )}

            <View className="p-4">
              <Text className="text-lg font-bold leading-6 text-slate-900" numberOfLines={2}>
                {formData.headline || copy.headline}
              </Text>
              <Text className="mt-2 text-sm leading-5 text-slate-600" numberOfLines={3}>
                {formData.description || copy.descriptionPlaceholder}
              </Text>
            </View>
          </View>

          <View className="mt-4 flex-row rounded-[20px] border border-slate-200 bg-white p-3">
            {[
              language === 'vi' ? 'Media' : 'Media',
              language === 'vi' ? 'Nội dung' : 'Content',
              language === 'vi' ? 'Mục tiêu' : 'Targeting',
            ].map((label, index) => (
              <TouchableOpacity
                key={label}
                activeOpacity={0.8}
                className="flex-1 items-center"
                onPress={() => index < step && setStep(index)}
              >
                <View className={`h-8 w-8 items-center justify-center rounded-full ${index <= step ? 'bg-brand' : 'bg-slate-200'}`}>
                  {index < step ? (
                    <Check size={16} color="#ffffff" />
                  ) : (
                    <Text className={`text-xs font-bold ${index === step ? 'text-white' : 'text-slate-500'}`}>
                      {index + 1}
                    </Text>
                  )}
                </View>
                <Text className={`mt-2 text-xs ${index === step ? 'font-bold text-brand' : 'text-slate-500'}`}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View className="mt-4 rounded-[24px] border border-slate-200 bg-white p-4">
            <Text className="text-lg font-bold text-slate-900">{getStepTitle()}</Text>
            <Text className="mt-1 text-sm leading-5 text-slate-500">{getStepHelper()}</Text>
            <View className="mt-5">{renderPhtmlStepContent()}</View>
          </View>
        </ScrollView>

        {!isKeyboardVisible ? (
          <View className="flex-row items-center gap-3 border-t border-slate-200 bg-white px-4 py-3">
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={back}
              className="min-h-[50px] flex-row items-center justify-center rounded-2xl border border-slate-200 bg-white px-4"
            >
              <ArrowLeft size={18} color="#475569" />
              <Text className="ml-2 text-sm font-semibold text-slate-700">
                {language === 'vi' ? 'Quay lại' : 'Back'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.85}
              className="min-h-[50px] flex-1 items-center justify-center rounded-2xl bg-brand px-5"
              onPress={next}
              disabled={isCreating || isUpdating}
            >
              {isCreating || isUpdating ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="text-base font-bold text-white">
                  {step === 2
                    ? editingAd
                      ? language === 'vi' ? 'Lưu thay đổi' : 'Save changes'
                      : language === 'vi' ? 'Công bố quảng cáo' : 'Publish ad'
                    : language === 'vi' ? 'Tiếp theo' : 'Next'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        ) : null}
      </KeyboardAvoidingView>

      <Modal visible={countrySheetOpen} transparent animationType="slide" onRequestClose={() => setCountrySheetOpen(false)}>
        <View className="flex-1 justify-end bg-black/35">
          <TouchableOpacity className="flex-1" activeOpacity={1} onPress={() => setCountrySheetOpen(false)} />
          <View className="h-[70%] rounded-t-2xl bg-white pb-6">
            <View className="items-center py-3">
              <View className="h-1.5 w-12 rounded-full bg-[#cbd5e1]" />
            </View>
            <Text className="border-b border-[#e5e7eb] px-4 pb-3 text-base font-semibold text-[#111827]">{language === 'vi' ? 'Chọn quốc gia' : 'Select Country'}</Text>
            <ScrollView
              className="flex-1"
              contentContainerStyle={MODAL_SCROLL_CONTENT_STYLE}
              nestedScrollEnabled
              showsVerticalScrollIndicator
              persistentScrollbar>
              {(options?.audience ?? []).map(item => {
                const selected = item.value === formData.audienceList;
                return (
                  <TouchableOpacity
                    key={item.value}
                    className="min-h-[48px] flex-row items-center justify-between border-b border-[#f1f5f9] px-4"
                    onPress={() => {
                      setFormData(previous => ({ ...previous, audienceList: item.value, location: item.label }));
                      setCountrySheetOpen(false);
                    }}>
                    <Text className={`text-sm ${selected ? 'font-semibold text-brand' : 'text-[#374151]'}`}>{item.label}</Text>
                    {selected && <Check size={18} color={APP_BRAND_COLOR} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={pageSheetOpen} transparent animationType="slide" onRequestClose={() => setPageSheetOpen(false)}>
        <View className="flex-1 justify-end bg-black/35">
          <TouchableOpacity className="flex-1" activeOpacity={1} onPress={() => setPageSheetOpen(false)} />
          <View className="h-[70%] rounded-t-2xl bg-white pb-6">
            <View className="items-center py-3"><View className="h-1.5 w-12 rounded-full bg-[#cbd5e1]" /></View>
            <Text className="border-b border-[#e5e7eb] px-4 pb-3 text-base font-semibold text-[#111827]">{language === 'vi' ? 'Trang của tôi' : 'My Page'}</Text>
            <ScrollView
              className="flex-1"
              contentContainerStyle={MODAL_SCROLL_CONTENT_STYLE}
              nestedScrollEnabled
              showsVerticalScrollIndicator
              persistentScrollbar>
              <TouchableOpacity
                className="min-h-[48px] flex-row items-center justify-between border-b border-[#f1f5f9] px-4"
                onPress={() => {
                  setFormData(previous => ({
                    ...previous,
                    pageName: '',
                    website: AD_WEBSITE_PREFIX,
                  }));
                  setPageSheetOpen(false);
                }}>
                <Text className={!formData.pageName ? 'font-semibold text-brand' : 'text-[#374151]'}>{language === 'vi' ? 'Không chọn trang' : 'Do not select page'}</Text>
                {!formData.pageName && <Check size={18} color={APP_BRAND_COLOR} />}
              </TouchableOpacity>
              {(options?.pages ?? []).map(item => {
                const selected = item.name === formData.pageName;
                return (
                  <TouchableOpacity
                    key={item.id}
                    className="min-h-[48px] flex-row items-center justify-between border-b border-[#f1f5f9] px-4"
                    onPress={() => {
                      const root = apiConfig.webBaseUrl.replace(/\/+$/, '');
                      setFormData(previous => ({
                        ...previous,
                        pageName: item.name,
                        website: `${root}/${item.name}`,
                      }));
                      setPageSheetOpen(false);
                    }}>
                    <View className="flex-1 pr-3">
                      <Text className={selected ? 'font-semibold text-brand' : 'text-[#374151]'}>{item.title}</Text>
                      <Text className="mt-0.5 text-xs text-[#94a3b8]">@{item.name}</Text>
                    </View>
                    {selected && <Check size={18} color={APP_BRAND_COLOR} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={genderSheetOpen} transparent animationType="slide" onRequestClose={() => setGenderSheetOpen(false)}>
        <View className="flex-1 justify-end bg-black/35">
          <TouchableOpacity className="flex-1" activeOpacity={1} onPress={() => setGenderSheetOpen(false)} />
          <View className="h-[50%] rounded-t-2xl bg-white pb-6">
            <View className="items-center py-3"><View className="h-1.5 w-12 rounded-full bg-[#cbd5e1]" /></View>
            <Text className="border-b border-[#e5e7eb] px-4 pb-3 text-base font-semibold text-[#111827]">{copy.gender || 'Giới tính'}</Text>
            <ScrollView className="flex-1" showsVerticalScrollIndicator persistentScrollbar>
              {genderOptions.map(item => {
                const selected = item.value === formData.gender;
                return (
                  <TouchableOpacity
                    key={item.value}
                    className="min-h-[50px] flex-row items-center justify-between border-b border-[#f1f5f9] px-4"
                    onPress={() => {
                      setFormData(previous => ({ ...previous, gender: item.value as AdGender }));
                      setGenderSheetOpen(false);
                    }}>
                    <Text className={selected ? 'font-semibold text-brand' : 'text-[#374151]'}>{item.label}</Text>
                    {selected && <Check size={18} color={APP_BRAND_COLOR} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={placementSheetOpen} transparent animationType="slide" onRequestClose={() => setPlacementSheetOpen(false)}>
        <View className="flex-1 justify-end bg-black/35">
          <TouchableOpacity className="flex-1" activeOpacity={1} onPress={() => setPlacementSheetOpen(false)} />
          <View className="h-[70%] rounded-t-2xl bg-white pb-6">
            <View className="items-center py-3"><View className="h-1.5 w-12 rounded-full bg-[#cbd5e1]" /></View>
            <Text className="border-b border-[#e5e7eb] px-4 pb-3 text-base font-semibold text-[#111827]">{copy.displayPosition || 'Vị trí hiển thị'}</Text>
            <ScrollView
              className="flex-1"
              contentContainerStyle={MODAL_SCROLL_CONTENT_STYLE}
              nestedScrollEnabled
              showsVerticalScrollIndicator
              persistentScrollbar>
              {placementOptions.map(item => {
                const selected = item.value === formData.appears;
                return (
                  <TouchableOpacity
                    key={item.value}
                    className="min-h-[54px] flex-row items-center justify-between border-b border-[#f1f5f9] px-4"
                    onPress={() => {
                      setFormData(previous => ({ ...previous, appears: item.value as AdAppearsType }));
                      setPlacementSheetOpen(false);
                    }}>
                    <View className="flex-1 pr-3">
                      <Text className={selected ? 'font-semibold text-brand' : 'text-[#374151]'}>{item.label}</Text>
                      <Text className="mt-0.5 text-xs text-[#94a3b8]">{language === 'vi' ? 'Định dạng tệp hình ảnh' : 'Image file format'}</Text>
                    </View>
                    {selected && <Check size={18} color={APP_BRAND_COLOR} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {datePickerField && (
        <DateTimePicker
          value={parseApiDate(formData[datePickerField])}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          minimumDate={datePickerField === 'endDate' && formData.startDate ? parseApiDate(formData.startDate) : undefined}
          onChange={handleDateChange}
        />
      )}

    </View>
  );
}

export default CreateAdScreen;

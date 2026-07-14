// English description: Creates or edits an advertising campaign in a three-step wizard.
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
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
  DollarSign,
  Globe,
  ImagePlus,
  Megaphone,
  Target,
  Users,
} from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../../../navigation/types';
import { ROUTES } from '../../../navigation/constants/routes';
import { useAdsViewModel } from '../../application/view-models/useAdsViewModel';
import type { AdBiddingType, AdGender, AdAppearsType } from '../../domain/types/ads.types';
import { showToast, ToastContainer } from '../../../shared-kernel/presentation/components/ToastNotification';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';
import { SafeAreaFeedHeader } from '../../../feed/presentation/components/SafeAreaFeedHeader';
import { Pressable } from 'react-native';
import { apiConfig } from '../../../shared-kernel/infrastructure/config/env';
import {
  languageStorage,
  type AppLanguage,
} from '../../../shared-kernel/infrastructure/storage/languageStorage';
import { getAdvertisingCopy } from '../../application/i18n/advertisingCopy';

type CreateAdNav = NativeStackNavigationProp<RootStackParamList>;

const BRAND = '#1d4ed8';

const AD_COUNTRY_OPTIONS = [
  { id: '233', name: 'Vietnam' },
  { id: '1', name: 'United States' },
  { id: '2', name: 'Canada' },
  { id: '73', name: 'France' },
  { id: '229', name: 'United Kingdom' },
  { id: '3', name: 'Australia' },
  { id: '4', name: 'Germany' },
  { id: '5', name: 'Japan' },
  { id: '6', name: 'South Korea' },
  { id: '7', name: 'China' },
  { id: '8', name: 'Singapore' },
  { id: '9', name: 'Malaysia' },
  { id: '10', name: 'Thailand' },
  { id: '11', name: 'Indonesia' },
  { id: '12', name: 'Philippines' },
  { id: '13', name: 'India' },
  { id: '14', name: 'Brazil' },
  { id: '15', name: 'Mexico' },
  { id: '16', name: 'Spain' },
  { id: '17', name: 'Italy' },
  { id: '18', name: 'Netherlands' },
  { id: '19', name: 'Russia' },
  { id: '20', name: 'Turkey' },
  { id: '21', name: 'Saudi Arabia' },
  { id: '22', name: 'United Arab Emirates' },
  { id: '23', name: 'South Africa' },
  { id: '24', name: 'Egypt' },
  { id: '25', name: 'Nigeria' },
  { id: '26', name: 'Argentina' },
  { id: '27', name: 'Colombia' },
  { id: '28', name: 'Chile' },
  { id: '29', name: 'Peru' },
  { id: '30', name: 'Poland' },
  { id: '31', name: 'Sweden' },
  { id: '32', name: 'Norway' },
  { id: '33', name: 'Denmark' },
  { id: '34', name: 'Finland' },
  { id: '35', name: 'Switzerland' },
  { id: '36', name: 'Austria' },
  { id: '37', name: 'Belgium' },
  { id: '38', name: 'Ireland' },
  { id: '39', name: 'Portugal' },
  { id: '40', name: 'Greece' },
  { id: '41', name: 'Czech Republic' },
  { id: '42', name: 'Hungary' },
  { id: '43', name: 'Romania' },
  { id: '44', name: 'Ukraine' },
  { id: '45', name: 'Israel' },
  { id: '46', name: 'Pakistan' },
  { id: '47', name: 'Bangladesh' },
  { id: '48', name: 'Sri Lanka' },
  { id: '49', name: 'Nepal' },
  { id: '50', name: 'Myanmar' },
  { id: '51', name: 'Cambodia' },
  { id: '52', name: 'Laos' },
  { id: '53', name: 'New Zealand' },
  { id: '54', name: 'Hong Kong' },
  { id: '55', name: 'Taiwan' },
  { id: '56', name: 'Macau' },
] as const;

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
  const [formData, setFormData] = useState({
    name: editingAd?.name ?? '',
    website: editingAd?.url ?? '',
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

  const [imagePreview, setImagePreview] = useState<string | null>(editingAd?.ad_media ?? null);

  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

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
    try {
      const result = await launchImageLibrary({
        mediaType: formData.appears === 'video' ? 'video' : 'photo',
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
      case 0: return editingAd ? copy.step1TitleEdit : copy.step1Title;
      case 1: return copy.step2Title;
      case 2: return copy.step3Title;
      case 3: return copy.step4Title;
      default: return '';
    }
  };

  const getStepHelper = () => {
    switch (step) {
      case 0: return copy.step1Helper;
      case 1: return copy.step2Helper;
      case 2: return copy.step3Helper;
      case 3: return copy.step4Helper;
      default: return '';
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 0:
        return (
          <View className="gap-5">
            <View>
              <Text className="mb-2 text-label-primary text-slate-500">{copy.companyName}</Text>
              <View className="flex-row items-center min-h-[54px] rounded-xl border border-slate-200 bg-white px-4">
                <Target size={20} color="#64748B" />
                <TextInput
                  className="ml-3 flex-1 text-body-primary"
                  placeholder={copy.companyNamePlaceholder}
                  placeholderTextColor="#94A3B8"
                  value={formData.name}
                  onChangeText={t => setFormData(p => ({ ...p, name: t }))}
                />
              </View>
            </View>

            <View>
              <Text className="mb-2 text-label-primary text-slate-500">{copy.website}</Text>
              <View className="flex-row items-center min-h-[54px] rounded-xl border border-slate-200 bg-white px-4">
                <Globe size={20} color="#64748B" />
                <TextInput
                  className="ml-3 flex-1 text-body-primary"
                  placeholder={copy.websitePlaceholder}
                  placeholderTextColor="#94A3B8"
                  value={formData.website}
                  onChangeText={t => setFormData(p => ({ ...p, website: t }))}
                  keyboardType="url"
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View>
              <Text className="mb-2 text-label-primary text-slate-500">{copy.headline}</Text>
              <View className="min-h-[54px] rounded-xl border border-slate-200 bg-white px-4 justify-center">
                <TextInput
                  className="text-body-primary"
                  placeholder={copy.headlinePlaceholder}
                  placeholderTextColor="#94A3B8"
                  value={formData.headline}
                  onChangeText={t => setFormData(p => ({ ...p, headline: t }))}
                />
              </View>
            </View>

            <View>
              <Text className="mb-2 text-label-primary text-slate-500">{copy.description}</Text>
              <View className="min-h-[100px] rounded-xl border border-slate-200 bg-white p-4">
                <TextInput
                  className="flex-1 text-body-primary"
                  placeholder={copy.descriptionPlaceholder}
                  placeholderTextColor="#94A3B8"
                  multiline
                  textAlignVertical="top"
                  value={formData.description}
                  onChangeText={t => setFormData(p => ({ ...p, description: t }))}
                />
              </View>
            </View>

            <View>
              <Text className="mb-2 text-label-primary text-slate-500">{copy.image}</Text>
              <TouchableOpacity
                className="min-h-[180px] items-center justify-center rounded-xl border-2 border-dashed border-blue-700 p-6 bg-slate-50"
                activeOpacity={0.85}
                onPress={handleSelectImage}
              >
                {imagePreview ? (
                  <View className="w-full">
                    <Image
                      source={{ uri: imagePreview }}
                      className="h-40 w-full rounded-xl"
                      resizeMode="cover"
                    />
                    <TouchableOpacity
                      className="absolute right-2 top-2 h-8 w-8 items-center justify-center rounded-full bg-black/50"
                      onPress={() => {
                        setFormData(p => ({
                          ...p,
                          media: undefined,
                          mediaName: undefined,
                          mediaType: undefined,
                        }));
                        setImagePreview(null);
                      }}
                    >
                      <Text className="text-white">X</Text>
                    </TouchableOpacity>
                    <Text className="mt-3 text-center text-title-primary text-blue-700">{copy.changeImage}</Text>
                  </View>
                ) : (
                  <>
                    <ImagePlus size={48} color={BRAND} />
                    <Text className="mt-4 text-title-primary text-blue-700">{copy.selectImage}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        );

      case 1:
        return (
          <View className="gap-5">
            <View>
              <Text className="mb-2 text-label-primary text-slate-500">{copy.gender}</Text>
              <View className="flex-row gap-3">
                {(['all', 'male', 'female'] as AdGender[]).map(g => (
                  <TouchableOpacity
                    key={g}
                    className={`flex-1 rounded-xl px-4 py-3 ${formData.gender === g ? 'bg-blue-700' : 'bg-slate-100'}`}
                    onPress={() => setFormData(p => ({ ...p, gender: g }))}
                  >
                    <Text className={`text-center font-semibold ${formData.gender === g ? 'text-white' : 'text-slate-700'}`}>
                      {g === 'all' ? copy.genderAll : g === 'male' ? copy.genderMale : copy.genderFemale}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View>
              <Text className="mb-2 text-label-primary text-slate-500">{copy.targetCountry}</Text>
              <View className="flex-row flex-wrap gap-2">
                {AD_COUNTRY_OPTIONS.map(country => (
                  <TouchableOpacity
                    key={country.id}
                    className={`rounded-xl px-4 py-3 ${formData.audienceList === country.id ? 'bg-blue-700' : 'bg-slate-100'}`}
                    activeOpacity={0.85}
                    onPress={() =>
                      setFormData(p => ({
                        ...p,
                        audienceList: country.id,
                        location: country.name,
                      }))
                    }
                  >
                    <Text
                      className={`font-semibold ${formData.audienceList === country.id ? 'text-white' : 'text-slate-700'}`}
                    >
                      {country.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text className="mt-2 text-caption-secondary">{copy.countryCodeHint}</Text>
            </View>

            <View>
              <Text className="mb-2 text-label-primary text-slate-500">{copy.displayLocation}</Text>
              <View className="flex-row items-center min-h-[54px] rounded-xl border border-slate-200 bg-white px-4">
                <TextInput
                  className="flex-1 text-body-primary"
                  placeholder={copy.displayLocationPlaceholder}
                  placeholderTextColor="#94A5B8"
                  value={formData.location}
                  onChangeText={t => setFormData(p => ({ ...p, location: t }))}
                />
              </View>
            </View>

            <View>
              <Text className="mb-2 text-label-primary text-slate-500">{copy.displayPosition}</Text>
              <View className="gap-3">
                {([
                  { value: 'post', label: copy.positionPost },
                  { value: 'sidebar', label: copy.positionSidebar },
                  { value: 'video', label: copy.positionVideo },
                  { value: 'story', label: copy.positionStory },
                  { value: 'timeline', label: copy.positionTimeline },
                  { value: 'groups', label: copy.positionGroups },
                  { value: 'pages', label: copy.positionPages },
                  { value: 'messages', label: copy.positionMessages },
                ] as { value: AdAppearsType; label: string }[]).map(item => (
                  <TouchableOpacity
                    key={item.value}
                    className={`flex-row items-center rounded-xl px-4 py-4 ${formData.appears === item.value ? 'bg-blue-50 border border-blue-700' : 'bg-slate-100 border border-transparent'}`}
                    onPress={() => setFormData(p => ({ ...p, appears: item.value }))}
                  >
                    <View className={`h-5 w-5 rounded-full border-2 ${formData.appears === item.value ? 'border-blue-700 bg-blue-700' : 'border-slate-300'}`} />
                    <Text className="ml-3 text-body-primary">{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        );

      case 2:
        return (
          <View className="gap-5">
            <View>
              <Text className="mb-2 text-label-primary text-slate-500">{copy.biddingMethod}</Text>
              <View className="gap-3">
                <TouchableOpacity
                  className={`flex-row items-center rounded-xl px-4 py-4 ${formData.bidding === 'clicks' ? 'bg-blue-50 border border-blue-700' : 'bg-slate-100 border border-transparent'}`}
                  onPress={() => setFormData(p => ({ ...p, bidding: 'clicks' }))}
                >
                  <View className={`h-5 w-5 rounded-full border-2 ${formData.bidding === 'clicks' ? 'border-blue-700' : 'border-slate-300'}`} />
                  <View className="ml-3">
                    <Text className="text-body-primary font-semibold">{copy.biddingClicks}</Text>
                    <Text className="text-caption-secondary">{copy.biddingClicksDesc}</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  className={`flex-row items-center rounded-xl px-4 py-4 ${formData.bidding === 'views' ? 'bg-blue-50 border border-blue-700' : 'bg-slate-100 border border-transparent'}`}
                  onPress={() => setFormData(p => ({ ...p, bidding: 'views' }))}
                >
                  <View className={`h-5 w-5 rounded-full border-2 ${formData.bidding === 'views' ? 'border-blue-700' : 'border-slate-300'}`} />
                  <View className="ml-3">
                    <Text className="text-body-primary font-semibold">{copy.biddingViews}</Text>
                    <Text className="text-caption-secondary">{copy.biddingViewsDesc}</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            <View>
              <Text className="mb-2 text-label-primary text-slate-500">{copy.budget}</Text>
              <View className="flex-row items-center min-h-[54px] rounded-xl border border-slate-200 bg-white px-4">
                <DollarSign size={20} color="#64748B" />
                <TextInput
                  className="ml-3 flex-1 text-body-primary"
                  placeholder={copy.budgetPlaceholder}
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={formData.budget}
                  onChangeText={t => setFormData(p => ({ ...p, budget: t }))}
                />
              </View>
            </View>
          </View>
        );

      case 3:
        return (
          <View className="gap-5">
            <Text className="text-heading">{copy.previewTitle}</Text>

            <View className="rounded-xl bg-white overflow-hidden border border-slate-200">
              <View className="flex-row items-center p-4">
                <View className="h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600">
                  <Text className="text-xs font-bold text-white">
                    {formData.name?.charAt(0)?.toUpperCase() || 'A'}
                  </Text>
                </View>
                <View className="ml-3 flex-1">
                  <View className="flex-row items-center">
                    <Text className="font-semibold text-body-primary">
                      {formData.name || 'Tên công ty'}
                    </Text>
                    <View className="ml-2 rounded-full bg-blue-700 px-2 py-0.5">
                      <Text className="text-[10px] font-medium text-white">{language === 'vi' ? 'Quảng cáo' : 'Sponsored'}</Text>
                    </View>
                  </View>
                  <Text className="text-caption-secondary">{formData.website || 'website.com'}</Text>
                </View>
              </View>

              {imagePreview ? (
                <Image
                  source={{ uri: imagePreview }}
                  className="h-52 w-full"
                  resizeMode="cover"
                />
              ) : (
                <View className="h-52 items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
                  <ImagePlus size={48} color="#94A3B8" />
                  <Text className="mt-2 text-caption-secondary">{language === 'vi' ? 'Chưa chọn hình' : 'No image selected'}</Text>
                </View>
              )}

              <View className="p-4">
                <Text className="text-xl font-bold leading-tight">
                  {formData.headline || copy.headline}
                </Text>
                <Text className="mt-2 text-body-secondary" numberOfLines={3}>
                  {formData.description || copy.description}
                </Text>
                <TouchableOpacity className="mt-4 items-center rounded-lg bg-blue-700 py-3">
                  <Text className="font-bold text-white">{copy.learnMore}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View className="rounded-xl bg-slate-50 p-4">
              <Text className="mb-3 font-semibold text-body-primary">{copy.campaignInfo}</Text>
              <View className="gap-2">
                <View className="flex-row items-center">
                  <Users size={16} color="#64748B" />
                  <Text className="ml-2 text-caption-secondary">
                    {formData.gender === 'all' ? copy.audienceAll : formData.gender === 'male' ? copy.audienceMale : copy.audienceFemale}
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <DollarSign size={16} color="#64748B" />
                  <Text className="ml-2 text-caption-secondary">
                    {copy.budgetLabel} {formData.budget ? `${parseFloat(formData.budget).toLocaleString('vi-VN')} VNĐ` : copy.budgetUnlimited}
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <Target size={16} color="#64748B" />
                  <Text className="ml-2 text-caption-secondary">
                    {formData.bidding === 'clicks' ? copy.paymentClicks : copy.paymentViews}
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <Globe size={16} color="#64748B" />
                  <Text className="ml-2 text-caption-secondary">
                    {formData.appears === 'post' ? copy.positionLabelPost : formData.appears === 'sidebar' ? copy.positionLabelSidebar : formData.appears === 'video' ? copy.positionLabelVideo : formData.appears === 'story' ? copy.positionLabelStory : formData.appears === 'timeline' ? copy.positionLabelTimeline : formData.appears === 'groups' ? copy.positionLabelGroups : formData.appears === 'pages' ? copy.positionLabelPages : copy.positionLabelMessages}
                  </Text>
                </View>
              </View>
            </View>

            {(!formData.name || !formData.headline) && (
              <View className="flex-row items-center rounded-xl bg-amber-50 p-4">
                <Text className="text-lg">!</Text>
                <View className="ml-3 flex-1">
                  <Text className="font-medium text-amber-800">{copy.needMoreInfo}</Text>
                  <Text className="text-caption-secondary text-amber-700">
                    {copy.needMoreInfoDesc}
                  </Text>
                </View>
              </View>
            )}
          </View>
        );

      default:
        return null;
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
        <View>
          <View className="border-b border-[#e5e7eb] bg-white px-4 py-3">
            <Text className="text-sm font-semibold text-[#111827]">{language === 'vi' ? 'Ảnh đại diện' : 'Avatar image'}</Text>
          </View>
          <View className="bg-white px-4 py-4">
            <Text className="mb-2 text-sm font-semibold text-[#374151]">{copy.companyName || 'Tên công ty'}</Text>
            <TextInput
              className="h-12 border border-[#d7dce4] bg-white px-3 text-sm text-[#111827]"
              placeholder="Tên công ty"
              placeholderTextColor="#94a3b8"
              value={formData.name}
              onChangeText={name => setFormData(previous => ({ ...previous, name }))}
            />

            <Text className="mb-2 mt-4 text-sm font-semibold text-[#374151]">{copy.image || 'Hình ảnh'}</Text>
            <Text className="mb-2 text-xs text-[#6b7280]">{language === 'vi' ? 'Chọn một hình ảnh cho chiến dịch của bạn' : 'Select an image for your campaign'}</Text>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleSelectImage}
              className="h-64 items-center justify-center overflow-hidden bg-[#f1f1f1]">
              {imagePreview ? (
                <Image source={{ uri: imagePreview }} className="h-full w-full" resizeMode="cover" />
              ) : (
                <>
                  <ImagePlus size={28} color="#9ca3af" />
                  <Text className="mt-3 text-sm text-[#6b7280]">{copy.selectImage || 'Chọn hình ảnh'}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    if (step === 1) {
      return (
        <View>
          <View className="flex-row items-center border-b border-[#e5e7eb] bg-white px-4 py-3">
            <Text className="mr-2 text-[#0000ff]">i</Text>
            <Text className="text-sm font-semibold text-[#111827]">{language === 'vi' ? 'Thông tin chi tiết' : 'Campaign details'}</Text>
          </View>
          <View className="gap-4 bg-white px-4 py-4">
            <View>
              <Text className="mb-2 text-sm font-semibold text-[#374151]">{copy.headline || 'Tiêu đề chiến dịch'}</Text>
              <TextInput
                className="h-12 border border-[#d7dce4] px-3 text-sm text-[#111827]"
                value={formData.headline}
                onChangeText={headline => setFormData(previous => ({ ...previous, headline }))}
              />
            </View>
            <View>
              <Text className="mb-2 text-sm font-semibold text-[#374151]">{copy.description || 'Mô tả chiến dịch'}</Text>
              <TextInput
                className="h-28 border border-[#d7dce4] px-3 py-3 text-sm text-[#111827]"
                multiline
                textAlignVertical="top"
                value={formData.description}
                onChangeText={description => setFormData(previous => ({ ...previous, description }))}
              />
              <Text className="mt-1 text-xs text-[#9ca3af]">{language === 'vi' ? 'Cho người dùng biết chiến dịch của bạn nói về điều gì' : 'Tell users what your campaign is about'}</Text>
            </View>
            <View>
              <Text className="mb-2 text-sm font-semibold text-[#374151]">{language === 'vi' ? 'Ngày bắt đầu' : 'Start Date'}</Text>
              <TouchableOpacity
                className="h-12 flex-row items-center justify-between border border-[#d7dce4] px-3"
                onPress={() => setDatePickerField('startDate')}>
                <Text className={formData.startDate ? 'text-[#111827]' : 'text-[#94a3b8]'}>{formatDisplayDate(formData.startDate)}</Text>
                <CalendarDays size={18} color="#111827" />
              </TouchableOpacity>
              <Text className="mt-1 text-xs text-[#9ca3af]">{language === 'vi' ? 'Chọn ngày bắt đầu chiến dịch, UTC' : 'Select campaign start date, UTC'}</Text>
            </View>
            <View>
              <Text className="mb-2 text-sm font-semibold text-[#374151]">{language === 'vi' ? 'Ngày kết thúc' : 'End Date'}</Text>
              <TouchableOpacity
                className="h-12 flex-row items-center justify-between border border-[#d7dce4] px-3"
                onPress={() => setDatePickerField('endDate')}>
                <Text className={formData.endDate ? 'text-[#111827]' : 'text-[#94a3b8]'}>{formatDisplayDate(formData.endDate)}</Text>
                <CalendarDays size={18} color="#111827" />
              </TouchableOpacity>
              <Text className="mt-1 text-xs text-[#9ca3af]">{language === 'vi' ? 'Chọn ngày kết thúc chiến dịch, UTC' : 'Select campaign end date, UTC'}</Text>
            </View>
            <View>
              <Text className="mb-2 text-sm font-semibold text-[#374151]">{copy.website || 'URL trang web'}</Text>
              <TextInput
                className="h-12 border border-[#d7dce4] px-3 text-sm text-[#111827]"
                placeholder="https://example.com"
                placeholderTextColor="#94a3b8"
                keyboardType="url"
                autoCapitalize="none"
                value={formData.website}
                onChangeText={website => setFormData(previous => ({ ...previous, website }))}
              />
              <Text className="mt-1 text-xs text-[#9ca3af]">{language === 'vi' ? 'Chọn một trang hoặc nhập một liên kết đến trang web của bạn' : 'Select a page or enter a link to your website'}</Text>
            </View>
            <View>
              <Text className="mb-2 text-sm font-semibold text-[#374151]">{language === 'vi' ? 'Trang của tôi' : 'My Page'}</Text>
              <TouchableOpacity
                className="h-12 flex-row items-center justify-between border border-[#d7dce4] px-3"
                onPress={() => setPageSheetOpen(true)}>
                <Text className={selectedPage ? 'text-[#111827]' : 'text-[#94a3b8]'}>{selectedPage?.title || 'Lựa chọn'}</Text>
                <ChevronDown size={18} color="#64748b" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    }

    if (false && step === 1) {
      return (
        <View className="gap-4 bg-white px-4 py-4">
          <View>
            <Text className="mb-2 text-sm font-semibold text-[#374151]">Website</Text>
            <TextInput
              className="h-12 border border-[#d7dce4] px-3 text-sm text-[#111827]"
              placeholder="https://example.com"
              placeholderTextColor="#94a3b8"
              keyboardType="url"
              autoCapitalize="none"
              value={formData.website}
              onChangeText={website => setFormData(previous => ({ ...previous, website }))}
            />
          </View>
          <View>
            <Text className="mb-2 text-sm font-semibold text-[#374151]">Tiêu đề</Text>
            <TextInput
              className="h-12 border border-[#d7dce4] px-3 text-sm text-[#111827]"
              placeholder="Tiêu đề quảng cáo"
              placeholderTextColor="#94a3b8"
              value={formData.headline}
              onChangeText={headline => setFormData(previous => ({ ...previous, headline }))}
            />
          </View>
          <View>
            <Text className="mb-2 text-sm font-semibold text-[#374151]">Mô tả</Text>
            <TextInput
              className="h-28 border border-[#d7dce4] px-3 py-3 text-sm text-[#111827]"
              placeholder="Mô tả quảng cáo"
              placeholderTextColor="#94a3b8"
              multiline
              textAlignVertical="top"
              value={formData.description}
              onChangeText={description => setFormData(previous => ({ ...previous, description }))}
            />
          </View>
        </View>
      );
    }

    return (
      <View className="gap-5 bg-white px-4 py-4">
        <View className="-mx-4 -mt-4 flex-row items-center border-b border-[#e5e7eb] bg-white px-4 py-3">
          <Target size={18} color="#0000ff" />
          <Text className="ml-2 text-sm font-semibold text-[#111827]">{copy.step2Title || "Nhắm mục tiêu"}</Text>
        </View>
        <View>
          <Text className="mb-2 text-sm font-semibold text-[#374151]">{copy.locationLabel || "Địa điểm"}</Text>
          <TextInput
            className="h-12 border border-[#d7dce4] px-3 text-sm text-[#111827]"
            value={formData.location}
            onChangeText={location => setFormData(previous => ({ ...previous, location }))}
          />
        </View>
        <View>
          <Text className="mb-2 text-sm font-semibold text-[#374151]">{copy.step2Title || "Sự tiếp kiến"}</Text>
          <TouchableOpacity
            className="h-12 flex-row items-center justify-between border border-[#d7dce4] px-3"
            onPress={() => setCountrySheetOpen(true)}>
            <Text className="text-sm text-[#374151]">{selectedCountry?.label || 'Chọn quốc gia'}</Text>
            <ChevronDown size={18} color="#64748b" />
          </TouchableOpacity>
        </View>

        <View>
          <Text className="mb-2 text-sm font-semibold text-[#374151]">{copy.gender || "Giới tính"}</Text>
          <TouchableOpacity
            className="h-12 flex-row items-center justify-between border border-[#d7dce4] px-3"
            onPress={() => setGenderSheetOpen(true)}>
            <Text className="text-sm text-[#374151]">{selectedGender?.label || 'Tất cả'}</Text>
            <ChevronDown size={18} color="#64748b" />
          </TouchableOpacity>
        </View>

        <View>
          <Text className="mb-2 text-sm font-semibold text-[#374151]">{copy.displayPosition || "Vị trí hiển thị"}</Text>
          <TouchableOpacity
            className="h-12 flex-row items-center justify-between border border-[#d7dce4] px-3"
            onPress={() => setPlacementSheetOpen(true)}>
            <Text className="flex-1 text-sm text-[#374151]" numberOfLines={1}>
              {selectedPlacement?.label || (copy.positionLabelEntire || 'Toàn bộ trang web')} ({language === 'vi' ? 'Định dạng tệp hình ảnh' : 'Image file format'})
            </Text>
            <ChevronDown size={18} color="#64748b" />
          </TouchableOpacity>
        </View>

        <View>
          <Text className="mb-2 text-sm font-semibold text-[#374151]">{copy.biddingMethod || "Phương thức đấu thầu"}</Text>
          <View className="flex-row gap-2">
            {(['clicks', 'views'] as AdBiddingType[]).map(value => {
              const selected = formData.bidding === value;
              const price = value === 'clicks' ? options?.clickPrice : options?.viewPrice;
              return (
                <TouchableOpacity
                  key={value}
                  className={`flex-1 border px-3 py-3 ${selected ? 'border-[#0000ff] bg-[#eef2ff]' : 'border-[#d7dce4]'}`}
                  onPress={() => setFormData(previous => ({ ...previous, bidding: value }))}>
                  <Text className={`text-sm font-semibold ${selected ? 'text-[#0000ff]' : 'text-[#374151]'}`}>
                    {value === 'clicks' ? (copy.biddingClicks || 'Lượt nhấp') : (copy.biddingViews || 'Lượt xem')}
                  </Text>
                  <Text className="mt-1 text-xs text-[#64748b]">
                    {Number(price ?? 0).toLocaleString('vi-VN')} {options?.currencySymbol || 'VNSEEA'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View>
          <Text className="mb-2 text-sm font-semibold text-[#374151]">{copy.budget || "Ngân sách"}</Text>
          <TextInput
            className="h-12 border border-[#d7dce4] px-3 text-sm text-[#111827]"
            placeholder="0"
            placeholderTextColor="#94a3b8"
            keyboardType="numeric"
            value={formData.budget}
            onChangeText={budget => setFormData(previous => ({ ...previous, budget }))}
          />
        </View>
      </View>
    );
  };

  void getStepTitle;
  void getStepHelper;
  void renderStepContent;

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <FocusAwareStatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <SafeAreaFeedHeader />

      <ScrollView className="flex-1 bg-[#eef3ff]" showsVerticalScrollIndicator={false}>
        <View className="mt-3 bg-white">
          <View className="flex-row items-center border-b border-[#e5e7eb] px-3 py-3">
            <Megaphone size={18} color="#0000ff" />
            <Text className="ml-2 text-sm font-semibold text-[#111827]">{copy.previewTitle || "Xem trước quảng cáo"}</Text>
          </View>
          <View className="px-3 py-3">
            <View className="flex-row items-center">
              <View className="h-9 w-9 items-center justify-center rounded-full bg-[#e5e7eb]">
                <Text className="font-bold text-[#64748b]">{formData.name.charAt(0).toUpperCase() || 'A'}</Text>
              </View>
              <View className="ml-2 flex-1">
                <Text className="text-sm font-semibold text-[#374151]">{formData.name || 'Công ty'}</Text>
                <Text className="text-xs text-[#9ca3af]">{formData.location || 'Địa điểm'}</Text>
              </View>
            </View>
            <Text className="mt-3 text-sm text-[#64748b]" numberOfLines={2}>{formData.description || (copy.description || 'Mô tả')}</Text>
            <Text className="mt-3 text-base text-[#64748b]">{formData.headline || (copy.headline || 'Tiêu đề')}</Text>
            {imagePreview ? (
              <Image source={{ uri: imagePreview }} className="mt-2 h-36 w-full bg-[#f3f4f6]" resizeMode="cover" />
            ) : (
              <View className="mt-2 h-36 items-center justify-center bg-[#f3f4f6]">
                <ImagePlus size={28} color="#c4c7cc" />
              </View>
            )}
          </View>
        </View>

        <View className="mt-3 flex-row bg-white px-2 py-3">
          {[language === 'vi' ? 'Tệp phương tiện' : 'Media', language === 'vi' ? 'Thông tin chi tiết' : 'Details', copy.step2Title || 'Targeting'].map((label, index) => (
            <TouchableOpacity
              key={label}
              className="flex-1 items-center"
              onPress={() => index < step && setStep(index)}>
              <View className={`h-6 w-6 items-center justify-center rounded-full ${index <= step ? 'bg-[#1da1f2]' : 'bg-[#e5e7eb]'}`}>
                <Check size={14} color={index <= step ? '#ffffff' : '#9ca3af'} />
              </View>
              <Text className={`mt-1 text-center text-xs ${index === step ? 'font-semibold text-[#1da1f2]' : 'text-[#9ca3af]'}`}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View className="mt-3">{renderPhtmlStepContent()}</View>
      </ScrollView>

      <View className="flex-row items-center justify-between border-t border-[#e5e7eb] bg-white px-5 py-4">
        <TouchableOpacity onPress={back} className="min-w-[92px] flex-row items-center py-3">
          <ArrowLeft size={17} color="#64748b" />
          <Text className="ml-2 text-sm text-[#64748b]">{language === 'vi' ? 'Quay lại' : 'Back'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="h-11 min-w-[120px] items-center justify-center rounded-md bg-[#0000ff] px-5"
          onPress={next}
          disabled={isCreating || isUpdating}
        >
          {isCreating || isUpdating ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text className="text-title-primary text-white">
              {step === 2 ? (editingAd ? (language === 'vi' ? 'Lưu' : 'Save') : (language === 'vi' ? 'Công bố' : 'Publish')) : (language === 'vi' ? 'Tiếp theo' : 'Next')}
            </Text>
          )}
        </TouchableOpacity>
      </View>

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
              contentContainerStyle={{ paddingBottom: 24 }}
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
                    <Text className={`text-sm ${selected ? 'font-semibold text-[#0000ff]' : 'text-[#374151]'}`}>{item.label}</Text>
                    {selected && <Check size={18} color="#0000ff" />}
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
              contentContainerStyle={{ paddingBottom: 24 }}
              nestedScrollEnabled
              showsVerticalScrollIndicator
              persistentScrollbar>
              <TouchableOpacity
                className="min-h-[48px] flex-row items-center justify-between border-b border-[#f1f5f9] px-4"
                onPress={() => {
                  setFormData(previous => ({ ...previous, pageName: '', website: '' }));
                  setPageSheetOpen(false);
                }}>
                <Text className={!formData.pageName ? 'font-semibold text-[#0000ff]' : 'text-[#374151]'}>{language === 'vi' ? 'Không chọn trang' : 'Do not select page'}</Text>
                {!formData.pageName && <Check size={18} color="#0000ff" />}
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
                      <Text className={selected ? 'font-semibold text-[#0000ff]' : 'text-[#374151]'}>{item.title}</Text>
                      <Text className="mt-0.5 text-xs text-[#94a3b8]">@{item.name}</Text>
                    </View>
                    {selected && <Check size={18} color="#0000ff" />}
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
                    <Text className={selected ? 'font-semibold text-[#0000ff]' : 'text-[#374151]'}>{item.label}</Text>
                    {selected && <Check size={18} color="#0000ff" />}
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
              contentContainerStyle={{ paddingBottom: 24 }}
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
                      <Text className={selected ? 'font-semibold text-[#0000ff]' : 'text-[#374151]'}>{item.label}</Text>
                      <Text className="mt-0.5 text-xs text-[#94a3b8]">{language === 'vi' ? 'Định dạng tệp hình ảnh' : 'Image file format'}</Text>
                    </View>
                    {selected && <Check size={18} color="#0000ff" />}
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

      <ToastContainer />
    </View>
  );
}

export default CreateAdScreen;

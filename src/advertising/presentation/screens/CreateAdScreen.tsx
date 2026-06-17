// Description: Create Ad Screen - Step by step ad creation wizard
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import {
  ArrowLeft,
  DollarSign,
  Globe,
  ImagePlus,
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
  const { isCreating, isUpdating, createAd, updateAd } = useAdsViewModel();
  const [language] = useState<AppLanguage>(languageStorage.getLanguage());
  const copy = getAdvertisingCopy(language);

  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({
    name: editingAd?.name ?? '',
    website: editingAd?.url ?? '',
    headline: editingAd?.headline ?? '',
    description: editingAd?.description ?? '',
    audienceList: editingAd?.audience ?? '233',
    gender: (editingAd?.gender ?? 'all') as AdGender,
    bidding: (editingAd?.bidding ?? 'clicks') as AdBiddingType,
    appears: (editingAd?.appears ?? 'post') as AdAppearsType,
    budget: editingAd?.budget ? String(editingAd.budget) : '',
    media: editingAd?.ad_media ?? undefined,
    mediaName: undefined as string | undefined,
    mediaType: undefined as string | undefined,
    location: editingAd?.location ?? 'Vietnam',
  });

  const [imagePreview, setImagePreview] = useState<string | null>(editingAd?.ad_media ?? null);

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
        if (!formData.media) {
          showToast({ message: copy.errorImage, type: 'error' });
          return false;
        }
        return true;

      case 1:
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

      case 2:
        // Budget is optional: empty or 0 means unlimited
        return true;

      case 3:
        return true;

      default:
        return true;
    }
  };

  const next = () => {
    if (!validateStep(step)) {
      return;
    }

    if (step < 3) {
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
                      <Text className="text-[10px] font-medium text-white">Quảng cáo</Text>
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
                  <Text className="mt-2 text-caption-secondary">Chưa chọn hình</Text>
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

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <FocusAwareStatusBar barStyle="light-content" backgroundColor={BRAND} />
      <View className="h-14 flex-row items-center justify-between bg-blue-700 px-4">
        <TouchableOpacity
          className="h-10 w-10 items-center justify-center rounded-full"
          onPress={back}
        >
          <ArrowLeft size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text className="text-title-primary text-white">{step + 1}/4</Text>
      </View>

      <ScrollView className="flex-1 px-5 pt-5 pb-8" showsVerticalScrollIndicator={false}>
        <View className="mb-6">
          <View className="h-1 rounded-full bg-slate-200">
            <View
              className="h-full rounded-full bg-blue-700 transition-all"
              style={{ width: `${Math.round(((step + 1) / 4) * 100)}%` }}
            />
          </View>
        </View>

        <View className="mb-6 flex-row items-center">
          <View className="h-14 w-14 items-center justify-center rounded-2xl bg-blue-50">
            <Users size={28} color={BRAND} />
          </View>
          <View className="ml-4 flex-1">
            <Text className="text-display">{getStepTitle()}</Text>
            <Text className="mt-1 text-body-secondary">{getStepHelper()}</Text>
          </View>
        </View>

        {renderStepContent()}
      </ScrollView>

      <View className="px-5 pb-6">
        <TouchableOpacity
          className="h-14 items-center justify-center rounded-xl bg-blue-700"
          onPress={next}
          disabled={isCreating || isUpdating}
        >
          {isCreating || isUpdating ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text className="text-title-primary text-white">
              {step === 3 ? (editingAd ? copy.saveChanges : copy.publishNow) : copy.continue}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <ToastContainer />
    </SafeAreaView>
  );
}

export default CreateAdScreen;

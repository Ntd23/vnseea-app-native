// Description: Create Ad Screen - Step by step ad creation wizard
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StatusBar,
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
import type { AdBiddingType, AdGender, AdAppearsType, AdItem } from '../../domain/types/ads.types';
import { showToast, ToastContainer } from '../../../shared-kernel/presentation/components/ToastNotification';

type CreateAdNav = NativeStackNavigationProp<RootStackParamList>;

const BRAND = '#1d4ed8';

const AD_COUNTRY_OPTIONS = [
  { id: '233', name: 'Vietnam' },
  { id: '1', name: 'United States' },
  { id: '2', name: 'Canada' },
  { id: '73', name: 'France' },
  { id: '229', name: 'United Kingdom' },
] as const;

function CreateAdScreen() {
  const navigation = useNavigation<CreateAdNav>();
  const route = useRoute<RouteProp<RootStackParamList, typeof ROUTES.CREATE_AD>>();
  const editingAd = route.params?.ad;
  const { isCreating, isUpdating, createAd, updateAd } = useAdsViewModel();

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

  const next = () => {
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
        showToast({ message: 'Cập nhật quảng cáo thành công!', type: 'success' });
        setTimeout(() => navigation.goBack(), 1500);
      } else {
        showToast({ message: res.error || 'Cập nhật quảng cáo thất bại.', type: 'error' });
      }
    } else {
      const res = await createAd(adData);
      if (res.success) {
        showToast({ message: 'Tạo quảng cáo thành công!', type: 'success' });
        setTimeout(() => navigation.goBack(), 1500);
      } else {
        showToast({ message: res.error || 'Không tạo được quảng cáo. Vui lòng thử lại.', type: 'error' });
      }
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 0: return editingAd ? 'Chỉnh sửa thông tin' : 'Thông tin quảng cáo';
      case 1: return 'Đối tượng';
      case 2: return 'Ngân sách & Thanh toán';
      case 3: return 'Xem trước';
      default: return '';
    }
  };

  const getStepHelper = () => {
    switch (step) {
      case 0: return 'Nhập thông tin cơ bản về quảng cáo.';
      case 1: return 'Chọn đối tượng bạn muốn tiếp cận.';
      case 2: return 'Đặt ngân sách và phương thức thanh toán.';
      case 3: return 'Xem lại trước khi xuất bản.';
      default: return '';
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 0:
        return (
          <View className="gap-5">
            <View>
              <Text className="mb-2 text-label-primary text-slate-500">Tên công ty</Text>
              <View className="flex-row items-center min-h-[54px] rounded-xl border border-slate-200 bg-white px-4">
                <Target size={20} color="#64748B" />
                <TextInput
                  className="ml-3 flex-1 text-body-primary"
                  placeholder="Nhập tên công ty"
                  placeholderTextColor="#94A3B8"
                  value={formData.name}
                  onChangeText={t => setFormData(p => ({ ...p, name: t }))}
                />
              </View>
            </View>

            <View>
              <Text className="mb-2 text-label-primary text-slate-500">Website</Text>
              <View className="flex-row items-center min-h-[54px] rounded-xl border border-slate-200 bg-white px-4">
                <Globe size={20} color="#64748B" />
                <TextInput
                  className="ml-3 flex-1 text-body-primary"
                  placeholder="https://example.com"
                  placeholderTextColor="#94A3B8"
                  value={formData.website}
                  onChangeText={t => setFormData(p => ({ ...p, website: t }))}
                  keyboardType="url"
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View>
              <Text className="mb-2 text-label-primary text-slate-500">Tiêu đề quảng cáo</Text>
              <View className="min-h-[54px] rounded-xl border border-slate-200 bg-white px-4 justify-center">
                <TextInput
                  className="text-body-primary"
                  placeholder="Nhập tiêu đề hấp dẫn"
                  placeholderTextColor="#94A3B8"
                  value={formData.headline}
                  onChangeText={t => setFormData(p => ({ ...p, headline: t }))}
                />
              </View>
            </View>

            <View>
              <Text className="mb-2 text-label-primary text-slate-500">Mô tả</Text>
              <View className="min-h-[100px] rounded-xl border border-slate-200 bg-white p-4">
                <TextInput
                  className="flex-1 text-body-primary"
                  placeholder="Nhập mô tả quảng cáo"
                  placeholderTextColor="#94A3B8"
                  multiline
                  textAlignVertical="top"
                  value={formData.description}
                  onChangeText={t => setFormData(p => ({ ...p, description: t }))}
                />
              </View>
            </View>

            <View>
              <Text className="mb-2 text-label-primary text-slate-500">Hình ảnh</Text>
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
                    <Text className="mt-3 text-center text-title-primary text-blue-700">Đổi ảnh khác</Text>
                  </View>
                ) : (
                  <>
                    <ImagePlus size={48} color={BRAND} />
                    <Text className="mt-4 text-title-primary text-blue-700">Chọn ảnh từ thư viện</Text>
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
              <Text className="mb-2 text-label-primary text-slate-500">Giới tính</Text>
              <View className="flex-row gap-3">
                {(['all', 'male', 'female'] as AdGender[]).map(g => (
                  <TouchableOpacity
                    key={g}
                    className={`flex-1 rounded-xl px-4 py-3 ${formData.gender === g ? 'bg-blue-700' : 'bg-slate-100'}`}
                    onPress={() => setFormData(p => ({ ...p, gender: g }))}
                  >
                    <Text className={`text-center font-semibold ${formData.gender === g ? 'text-white' : 'text-slate-700'}`}>
                      {g === 'all' ? 'Tất cả' : g === 'male' ? 'Nam' : 'Nữ'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View>
              <Text className="mb-2 text-label-primary text-slate-500">Quốc gia mục tiêu</Text>
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
              <Text className="mt-2 text-caption-secondary">
                Hệ thống yêu cầu mã quốc gia, Việt Nam = 233.
              </Text>
            </View>

            <View>
              <Text className="mb-2 text-label-primary text-slate-500">Địa điểm hiển thị</Text>
              <View className="flex-row items-center min-h-[54px] rounded-xl border border-slate-200 bg-white px-4">
                <TextInput
                  className="flex-1 text-body-primary"
                  placeholder="Vietnam"
                  placeholderTextColor="#94A5B8"
                  value={formData.location}
                  onChangeText={t => setFormData(p => ({ ...p, location: t }))}
                />
              </View>
            </View>

            <View>
              <Text className="mb-2 text-label-primary text-slate-500">Vị trí hiển thị</Text>
              <View className="gap-3">
                {([
                  { value: 'post', label: 'Bài đăng' },
                  { value: 'sidebar', label: 'Thanh bên' },
                  { value: 'video', label: 'Video' },
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
              <Text className="mb-2 text-label-primary text-slate-500">Phương thức đặt giá</Text>
              <View className="gap-3">
                <TouchableOpacity
                  className={`flex-row items-center rounded-xl px-4 py-4 ${formData.bidding === 'clicks' ? 'bg-blue-50 border border-blue-700' : 'bg-slate-100 border border-transparent'}`}
                  onPress={() => setFormData(p => ({ ...p, bidding: 'clicks' }))}
                >
                  <View className={`h-5 w-5 rounded-full border-2 ${formData.bidding === 'clicks' ? 'border-blue-700' : 'border-slate-300'}`} />
                  <View className="ml-3">
                    <Text className="text-body-primary font-semibold">Theo lượt nhấp</Text>
                    <Text className="text-caption-secondary">Thanh toán khi người dùng nhấn vào quảng cáo</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  className={`flex-row items-center rounded-xl px-4 py-4 ${formData.bidding === 'views' ? 'bg-blue-50 border border-blue-700' : 'bg-slate-100 border border-transparent'}`}
                  onPress={() => setFormData(p => ({ ...p, bidding: 'views' }))}
                >
                  <View className={`h-5 w-5 rounded-full border-2 ${formData.bidding === 'views' ? 'border-blue-700' : 'border-slate-300'}`} />
                  <View className="ml-3">
                    <Text className="text-body-primary font-semibold">Theo lượt xem</Text>
                    <Text className="text-caption-secondary">Thanh toán theo số lượt hiển thị</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            <View>
              <Text className="mb-2 text-label-primary text-slate-500">Ngân sách (VNĐ)</Text>
              <View className="flex-row items-center min-h-[54px] rounded-xl border border-slate-200 bg-white px-4">
                <DollarSign size={20} color="#64748B" />
                <TextInput
                  className="ml-3 flex-1 text-body-primary"
                  placeholder="100000"
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
            <Text className="text-heading">Xem trước quảng cáo</Text>

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
                  {formData.headline || 'Tiêu đề quảng cáo'}
                </Text>
                <Text className="mt-2 text-body-secondary" numberOfLines={3}>
                  {formData.description || 'Mô tả sẽ hiển thị ở đây'}
                </Text>
                <TouchableOpacity className="mt-4 items-center rounded-lg bg-blue-700 py-3">
                  <Text className="font-bold text-white">Tìm hiểu thêm</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View className="rounded-xl bg-slate-50 p-4">
              <Text className="mb-3 font-semibold text-body-primary">Thông tin chiến dịch</Text>
              <View className="gap-2">
                <View className="flex-row items-center">
                  <Users size={16} color="#64748B" />
                  <Text className="ml-2 text-caption-secondary">
                    Đối tượng: {formData.gender === 'all' ? 'Tất cả mọi người' : formData.gender === 'male' ? 'Nam giới' : 'Nữ giới'}
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <DollarSign size={16} color="#64748B" />
                  <Text className="ml-2 text-caption-secondary">
                    Ngân sách: {formData.budget ? `${parseFloat(formData.budget).toLocaleString('vi-VN')} VNĐ` : 'Chưa đặt'}
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <Target size={16} color="#64748B" />
                  <Text className="ml-2 text-caption-secondary">
                    Thanh toán: {formData.bidding === 'clicks' ? 'Theo lượt nhấp' : 'Theo lượt xem'}
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <Globe size={16} color="#64748B" />
                  <Text className="ml-2 text-caption-secondary">
                    Vị trí: {formData.appears === 'post' ? 'Bài đăng' : formData.appears === 'sidebar' ? 'Thanh bên' : 'Video'}
                  </Text>
                </View>
              </View>
            </View>

            {(!formData.name || !formData.headline) && (
              <View className="flex-row items-center rounded-xl bg-amber-50 p-4">
                <Text className="text-lg">!</Text>
                <View className="ml-3 flex-1">
                  <Text className="font-medium text-amber-800">Cần điền thêm thông tin</Text>
                  <Text className="text-caption-secondary text-amber-700">
                    Quay lại điền đầy đủ thông tin để quảng cáo hiệu quả hơn
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
      <StatusBar barStyle="light-content" backgroundColor={BRAND} />
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
              {step === 3 ? (editingAd ? 'Lưu thay đổi' : 'Xuất bản ngay') : 'Tiếp tục'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <ToastContainer />
    </SafeAreaView>
  );
}

export default CreateAdScreen;

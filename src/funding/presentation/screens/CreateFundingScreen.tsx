// Description: Renders the Create Funding screen with premium 2026 design tokens, tactile feedback, and multi-language support.
import React, { useCallback, useEffect, useRef } from 'react';
import {
  Alert,
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  DollarSign,
  HeartHandshake,
  ImagePlus,
  Info,
  Type,
  X,
} from 'lucide-react-native';
import {
  launchImageLibrary,
  type Asset,
  type ImagePickerResponse,
} from 'react-native-image-picker';
import { useCreateFundingViewModel } from '../../application/view-models/useCreateFundingViewModel';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';

type CreateFundingNav = NativeStackNavigationProp<RootStackParamList>;

const BRAND_COLOR = '#2563FF';

const CREATE_FUNDING_COPY = {
  vi: {
    headerTitle: 'Tạo chiến dịch',
    subHeaderTitle: 'Chiến dịch mới',
    subHeaderDesc: 'Cung cấp thông tin để mọi người hiểu và ủng hộ chiến dịch.',
    labelTitle: 'TIÊU ĐỀ',
    placeholderTitle: 'Ví dụ: Xây dựng cầu cho vùng cao',
    labelDesc: 'MÔ TẢ',
    placeholderDesc: 'Mô tả chi tiết mục đích, hoàn cảnh và kế hoạch sử dụng số tiền...',
    labelAmount: 'SỐ TIỀN MỤC TIÊU',
    labelImage: 'ẢNH ĐẠI DIỆN',
    chooseImage: 'Chọn hình ảnh',
    changeImage: 'Đổi ảnh khác',
    imageDesc: 'JPG hoặc PNG, tối đa 10 MB.',
    tipDesc: 'Chiến dịch của bạn sẽ được đăng công khai. Mọi người có thể ủng hộ bằng cách chuyển tiền qua ví Vnseea.',
    btnPublish: 'Đăng chiến dịch',
    btnCreating: 'Đang tạo...',
    successTitle: 'Tạo chiến dịch thành công!',
    successDesc: 'Chiến dịch của bạn đã được đăng. Hãy chia sẻ để mọi người cùng ủng hộ.',
    btnBackList: 'Về danh sách gây quỹ',
    btnCreateAnother: 'Tạo chiến dịch khác',
    alertCancelTitle: 'Hủy tạo chiến dịch',
    alertCancelMessage: 'Bạn có chắc muốn hủy? Thông tin đã nhập sẽ không được lưu.',
    alertKeep: 'Ở lại',
    alertExit: 'Hủy',
    errorTitle: 'Lỗi',
    errorPickImage: 'Không thể chọn hình ảnh',
  },
  en: {
    headerTitle: 'Create Campaign',
    subHeaderTitle: 'New Campaign',
    subHeaderDesc: 'Provide details to help people understand and support the campaign.',
    labelTitle: 'TITLE',
    placeholderTitle: 'e.g., Build a bridge for highland kids',
    labelDesc: 'DESCRIPTION',
    placeholderDesc: 'Detail the purpose, context, and plan for using the funds...',
    labelAmount: 'TARGET AMOUNT',
    labelImage: 'CAMPAIGN COVER',
    chooseImage: 'Choose image',
    changeImage: 'Change image',
    imageDesc: 'JPG or PNG, max 10 MB.',
    tipDesc: 'Your campaign will be published publicly. People can support by transferring via Vnseea wallet.',
    btnPublish: 'Publish Campaign',
    btnCreating: 'Creating...',
    successTitle: 'Campaign Created Successfully!',
    successDesc: 'Your campaign is now live. Share it to receive support.',
    btnBackList: 'Back to Campaigns',
    btnCreateAnother: 'Create Another',
    alertCancelTitle: 'Cancel Campaign Creation',
    alertCancelMessage: 'Are you sure you want to cancel? Entered details will not be saved.',
    alertKeep: 'Keep Editing',
    alertExit: 'Discard',
    errorTitle: 'Error',
    errorPickImage: 'Cannot select image',
  },
};

// Custom Helper to translate VM Vietnamese validation errors into English dynamically
const translateError = (error: string | undefined, isVi: boolean): string | undefined => {
  if (!error) return undefined;
  if (isVi) return error;

  if (error === 'Vui lòng nhập tiêu đề chiến dịch') return 'Please enter a campaign title';
  if (error.startsWith('Tiêu đề tối đa')) {
    return error.replace('Tiêu đề tối đa', 'Title must be at most').replace('ký tự', 'characters');
  }
  if (error === 'Vui lòng nhập mô tả chiến dịch') return 'Please enter a campaign description';
  if (error.startsWith('Mô tả tối đa')) {
    return error.replace('Mô tả tối đa', 'Description must be at most').replace('ký tự', 'characters');
  }
  if (error === 'Số tiền mục tiêu phải lớn hơn 0') return 'Target amount must be greater than 0';
  if (error === 'Vui lòng chọn ảnh đại diện cho chiến dịch') return 'Please choose a campaign cover image';
  if (error.includes('thất bại')) return 'Failed to create campaign, please try again';

  return error;
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text className="mb-2 text-[12px] font-extrabold text-[#64748B] tracking-wider uppercase">
      {children}
    </Text>
  );
}

interface IconFieldProps {
  icon: React.ReactNode;
  children: React.ReactNode;
  multiline?: boolean;
  hasError?: boolean;
}

function IconField({ icon, children, multiline, hasError }: IconFieldProps) {
  return (
    <View
      className={`flex-row px-4 bg-white border ${
        multiline ? 'min-h-[120px] items-start py-3.5' : 'min-h-[54px] items-center'
      } ${hasError ? 'border-red-500 bg-red-50/10' : 'border-[#E2E8F0]'} rounded-2xl`}
    >
      <View className={`${multiline ? 'mt-0.5' : ''}`}>
        {icon}
      </View>
      {children}
    </View>
  );
}

function CreateFundingScreen() {
  const navigation = useNavigation<CreateFundingNav>();
  const language = useAppLanguage();
  const isVi = language === 'vi';
  const copy = CREATE_FUNDING_COPY[language] || CREATE_FUNDING_COPY.vi;

  const {
    form,
    errors,
    isSubmitting,
    submitError,
    submitSuccess,
    updateField,
    resetForm,
    handleSubmit,
  } = useCreateFundingViewModel();

  // Screen Entrance Animation
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(30)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY]);

  const handleButtonPressIn = () => {
    Animated.spring(buttonScale, {
      toValue: 0.96,
      useNativeDriver: true,
      friction: 6,
      tension: 120,
    }).start();
  };

  const handleButtonPressOut = () => {
    Animated.spring(buttonScale, {
      toValue: 1.0,
      useNativeDriver: true,
      friction: 6,
      tension: 120,
    }).start();
  };

  const handleBack = useCallback(() => {
    if (form.title || form.description || form.amount || form.image) {
      Alert.alert(
        copy.alertCancelTitle,
        copy.alertCancelMessage,
        [
          { text: copy.alertKeep, style: 'cancel' },
          {
            text: copy.alertExit,
            style: 'destructive',
            onPress: () => navigation.goBack(),
          },
        ],
      );
    } else {
      navigation.goBack();
    }
  }, [form, navigation, copy]);

  const handlePickImage = useCallback(async () => {
    try {
      const result: ImagePickerResponse = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 1,
        quality: 0.8,
      });
      if (result.didCancel) return;
      if (result.errorCode) {
        Alert.alert(copy.errorTitle, result.errorMessage ?? copy.errorPickImage);
        return;
      }
      const assets = result.assets as Asset[] | undefined;
      const first = assets?.[0];
      if (first?.uri) {
        updateField('image', {
          uri: first.uri,
          name: first.fileName ?? 'funding_image.jpg',
          type: first.type ?? 'image/jpeg',
        });
      }
    } catch {
      Alert.alert(copy.errorTitle, copy.errorPickImage);
    }
  }, [updateField, copy]);

  if (submitSuccess) {
    return (
      <SafeAreaView className="flex-1 bg-[#F8FAFC]" edges={['top']}>
        <FocusAwareStatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
        <View className="flex-1 items-center justify-center px-6">
          <View className="h-20 w-20 items-center justify-center rounded-full bg-green-50 border border-green-100">
            <CheckCircle2 size={44} color="#22c55e" />
          </View>
          <Text className="mt-6 text-[22px] font-extrabold text-[#0F172A] text-center">
            {copy.successTitle}
          </Text>
          <Text className="mt-2 text-center text-[14px] font-semibold text-[#64748B] leading-6 px-4">
            {copy.successDesc}
          </Text>
          <View className="mt-8 w-full gap-3 px-4">
            <TouchableOpacity
              className="min-h-[54px] items-center justify-center rounded-full shadow-sm"
              style={{ backgroundColor: BRAND_COLOR }}
              activeOpacity={0.85}
              onPress={() => {
                resetForm();
                navigation.navigate(ROUTES.FUNDING as never);
              }}
            >
              <Text className="text-[16px] font-bold text-white">
                {copy.btnBackList}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="min-h-[54px] items-center justify-center rounded-full border border-[#E2E8F0] bg-white shadow-sm"
              activeOpacity={0.85}
              onPress={resetForm}
            >
              <Text className="text-[16px] font-bold text-[#64748B]">
                {copy.btnCreateAnother}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]" edges={['top']}>
      <FocusAwareStatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      {/* App Bar Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-[#F8FAFC]">
        <View className="flex-row items-center gap-2.5">
          <TouchableOpacity
            className="h-9 w-9 items-center justify-center rounded-full bg-white border border-slate-100 shadow-sm"
            style={{ elevation: 1 }}
            activeOpacity={0.75}
            onPress={handleBack}
          >
            <ArrowLeft size={18} color="#0F172A" />
          </TouchableOpacity>
          <Text className="text-[20px] font-extrabold text-[#0F172A]">{copy.headerTitle}</Text>
        </View>
        <View className="w-9" />
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-4 pb-6 pt-2"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Animated Card Container */}
          <Animated.View
            style={{
              opacity,
              transform: [{ translateY }],
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.03,
              shadowRadius: 8,
              elevation: 2,
            }}
            className="bg-white p-5 rounded-[24px] border border-[#F1F5F9]"
          >
            {/* Header info */}
            <View className="mb-6 flex-row items-center">
              <View className="h-12 w-12 items-center justify-center rounded-full bg-[#EFF6FF]">
                <HeartHandshake size={24} color={BRAND_COLOR} />
              </View>
              <View className="ml-4 flex-1">
                <Text className="text-[17px] font-extrabold text-[#0F172A]">
                  {copy.subHeaderTitle}
                </Text>
                <Text className="mt-1 text-[12px] font-semibold text-[#64748B] leading-5">
                  {copy.subHeaderDesc}
                </Text>
              </View>
            </View>

            {/* Title Field */}
            <View className="mb-5">
              <FieldLabel>{copy.labelTitle}</FieldLabel>
              <IconField
                icon={<Type size={18} color="#94A3B8" />}
                hasError={!!errors.title}
              >
                <TextInput
                  className="ml-3 flex-1 text-[14px] font-bold text-[#0F172A]"
                  placeholder={copy.placeholderTitle}
                  placeholderTextColor="#94A3B8"
                  value={form.title}
                  onChangeText={text => updateField('title', text)}
                />
              </IconField>
              {errors.title ? (
                <View className="mt-2 flex-row items-center px-1">
                  <AlertCircle size={14} color="#ef4444" />
                  <Text className="ml-2 text-xs font-semibold text-red-500">
                    {translateError(errors.title, isVi)}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Description Field */}
            <View className="mb-5">
              <FieldLabel>{copy.labelDesc}</FieldLabel>
              <IconField
                icon={<Info size={18} color="#94A3B8" />}
                multiline
                hasError={!!errors.description}
              >
                <TextInput
                  className="ml-3 flex-1 text-[14px] font-bold text-[#0F172A]"
                  placeholder={copy.placeholderDesc}
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                  value={form.description}
                  onChangeText={text => updateField('description', text)}
                />
              </IconField>
              {errors.description ? (
                <View className="mt-2 flex-row items-center px-1">
                  <AlertCircle size={14} color="#ef4444" />
                  <Text className="ml-2 text-xs font-semibold text-red-500">
                    {translateError(errors.description, isVi)}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Amount Field */}
            <View className="mb-5">
              <FieldLabel>{copy.labelAmount}</FieldLabel>
              <IconField
                icon={<DollarSign size={18} color="#94A3B8" />}
                hasError={!!errors.amount}
              >
                <TextInput
                  className="ml-3 flex-1 text-[14px] font-bold text-[#0F172A]"
                  placeholder="0"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={form.amount}
                  onChangeText={text =>
                    updateField('amount', text.replace(/[^0-9]/g, ''))
                  }
                />
                <View className="ml-2 rounded-lg bg-[#EFF6FF] px-2.5 py-1">
                  <Text className="text-[11px] font-extrabold" style={{ color: BRAND_COLOR }}>VND</Text>
                </View>
              </IconField>
              {errors.amount ? (
                <View className="mt-2 flex-row items-center px-1">
                  <AlertCircle size={14} color="#ef4444" />
                  <Text className="ml-2 text-xs font-semibold text-red-500">
                    {translateError(errors.amount, isVi)}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Image Upload Field */}
            <View className="mb-2">
              <FieldLabel>{copy.labelImage}</FieldLabel>
              {form.image ? (
                <View className="mb-4">
                  <View className="relative">
                    <Image
                      source={{ uri: form.image.uri }}
                      className="h-44 w-full rounded-2xl"
                      resizeMode="cover"
                    />
                    <TouchableOpacity
                      className="absolute -top-2 -right-2 h-7 w-7 items-center justify-center rounded-full bg-red-500 shadow-sm"
                      activeOpacity={0.8}
                      onPress={() => updateField('image', null)}
                    >
                      <X size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </View>
              ) : null}

              <TouchableOpacity
                className="min-h-[160px] items-center justify-center border-2 border-dashed border-[#CBD5E1] bg-[#F8FAFC] rounded-3xl p-6"
                activeOpacity={0.8}
                onPress={handlePickImage}
              >
                <View className="h-11 w-11 items-center justify-center rounded-full bg-[#EFF6FF] mb-3">
                  <ImagePlus size={20} color={BRAND_COLOR} strokeWidth={2.2} />
                </View>
                <Text className="text-[15px] font-bold text-[#0F172A]">
                  {form.image ? copy.changeImage : copy.chooseImage}
                </Text>
                <Text className="mt-1.5 text-[11px] font-semibold text-[#94A3B8]">
                  {copy.imageDesc}
                </Text>
              </TouchableOpacity>

              {errors.image ? (
                <View className="mt-2 flex-row items-center px-1">
                  <AlertCircle size={14} color="#ef4444" />
                  <Text className="ml-2 text-xs font-semibold text-red-500">
                    {translateError(errors.image, isVi)}
                  </Text>
                </View>
              ) : null}
            </View>
          </Animated.View>

          {submitError ? (
            <View className="mt-4 rounded-2xl bg-red-50 px-4 py-3 border border-red-100">
              <Text className="text-center text-xs font-bold text-red-600">
                {translateError(submitError, isVi)}
              </Text>
            </View>
          ) : null}

          {/* Info Banner Tip */}
          <View className="mt-4 flex-row items-start bg-[#EFF6FF] border border-[#DBEAFE] rounded-2xl p-4">
            <View className="mt-0.5">
              <Info size={18} color={BRAND_COLOR} />
            </View>
            <Text className="ml-3 flex-1 text-[12px] font-semibold leading-5 text-[#64748B]">
              {copy.tipDesc}
            </Text>
          </View>
        </ScrollView>

        {/* Submit Action Button */}
        <Animated.View style={{ transform: [{ scale: buttonScale }] }} className="px-4 pb-6">
          <TouchableOpacity
            className="min-h-[54px] items-center justify-center rounded-full shadow-sm"
            style={{ backgroundColor: BRAND_COLOR }}
            activeOpacity={0.85}
            onPressIn={handleButtonPressIn}
            onPressOut={handleButtonPressOut}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Text className="text-[16px] font-bold text-white">
                {copy.btnCreating}
              </Text>
            ) : (
              <Text className="text-[16px] font-bold text-white">
                {copy.btnPublish}
              </Text>
            )}
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default CreateFundingScreen;

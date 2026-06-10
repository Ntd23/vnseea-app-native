// Description: Renders the Create Funding screen using design tokens and the
// useCreateFundingViewModel hook.
import React, { useCallback } from 'react';
import {
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

type CreateFundingNav = NativeStackNavigationProp<RootStackParamList>;

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <Text className="mb-2 text-label-primary">{children}</Text>;
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
      className={`input-shell flex-row px-4 ${
        multiline ? 'min-h-[120px] items-start py-3' : 'min-h-[54px] items-center'
      } ${hasError ? 'border-red-500 border' : ''}`}
    >
      {icon}
      {children}
    </View>
  );
}

function CreateFundingScreen() {
  const navigation = useNavigation<CreateFundingNav>();
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

  const handleBack = useCallback(() => {
    if (form.title || form.description || form.amount || form.image) {
      Alert.alert(
        'Hủy tạo chiến dịch',
        'Bạn có chắc muốn hủy? Thông tin đã nhập sẽ không được lưu.',
        [
          { text: 'Ở lại', style: 'cancel' },
          {
            text: 'Hủy',
            style: 'destructive',
            onPress: () => navigation.goBack(),
          },
        ],
      );
    } else {
      navigation.goBack();
    }
  }, [form, navigation]);

  const handlePickImage = useCallback(async () => {
    try {
      const result: ImagePickerResponse = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 1,
        quality: 0.8,
      });
      if (result.didCancel) return;
      if (result.errorCode) {
        Alert.alert('Lỗi', result.errorMessage ?? 'Không thể mở thư viện ảnh');
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
      Alert.alert('Lỗi', 'Không thể chọn hình ảnh');
    }
  }, [updateField]);

  if (submitSuccess) {
    return (
      <SafeAreaView className="flex-1 surface-base" edges={['top']}>
        <StatusBar barStyle="dark-content" />
        <View className="flex-1 items-center justify-center px-6">
          <View className="h-20 w-20 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 size={50} color="#22c55e" />
          </View>
          <Text className="mt-6 text-heading">Tạo chiến dịch thành công!</Text>
          <Text className="mt-2 text-center text-body-secondary">
            Chiến dịch của bạn đã được đăng. Hãy chia sẻ để mọi người cùng ủng hộ.
          </Text>
          <View className="mt-8 w-full gap-3">
            <TouchableOpacity
              className="btn-primary min-h-[54px]"
              activeOpacity={0.9}
              onPress={() => {
                resetForm();
                navigation.navigate(ROUTES.FUNDING as never);
              }}
            >
              <Text className="text-title-primary text-inverse">
                Về danh sách gây quỹ
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="btn-secondary min-h-[54px]"
              activeOpacity={0.9}
              onPress={resetForm}
            >
              <Text className="text-title-primary">
                Tạo chiến dịch khác
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 surface-base" edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0000FF" />
      <View className="surface-brand h-16 flex-row items-center justify-between px-4">
        <TouchableOpacity
          className="h-10 w-10 items-center justify-center rounded-full"
          activeOpacity={0.8}
          onPress={handleBack}
        >
          <ArrowLeft size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text className="text-heading text-inverse">Tạo chiến dịch</Text>
        <View className="w-10" />
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-5 pb-6 pt-5"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Card */}
          <View className="surface-card p-5">
            <View className="mb-5 flex-row items-center">
              <View className="icon-chip h-14 w-14 items-center justify-center">
                <HeartHandshake size={28} color="#0000FF" />
              </View>
              <View className="ml-4 flex-1">
                <Text className="text-display">Chiến dịch mới</Text>
                <Text className="mt-1 text-body-secondary">
                  Cung cấp thông tin để mọi người hiểu và ủng hộ chiến dịch.
                </Text>
              </View>
            </View>

            {/* Title */}
            <View className="mb-4">
              <FieldLabel>TIÊU ĐỀ</FieldLabel>
              <IconField
                icon={<Type size={20} color="#64748B" />}
                hasError={!!errors.title}
              >
                <TextInput
                  className="ml-3 flex-1 text-body-primary"
                  placeholder="Ví dụ: Xây dựng cầu cho vùng cao"
                  placeholderTextColor="#94A3B8"
                  value={form.title}
                  onChangeText={text => updateField('title', text)}
                />
              </IconField>
              {errors.title ? (
                <View className="mt-2 flex-row items-center">
                  <AlertCircle size={14} color="#ef4444" />
                  <Text className="ml-2 text-sm text-red-500">
                    {errors.title}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Description */}
            <View className="mb-4">
              <FieldLabel>MÔ TẢ</FieldLabel>
              <IconField
                icon={<Info size={20} color="#64748B" />}
                multiline
                hasError={!!errors.description}
              >
                <TextInput
                  className="ml-3 flex-1 text-body-primary"
                  placeholder="Mô tả chi tiết mục đích, hoàn cảnh và kế hoạch sử dụng số tiền..."
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                  value={form.description}
                  onChangeText={text => updateField('description', text)}
                />
              </IconField>
              {errors.description ? (
                <View className="mt-2 flex-row items-center">
                  <AlertCircle size={14} color="#ef4444" />
                  <Text className="ml-2 text-sm text-red-500">
                    {errors.description}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Amount */}
            <View className="mb-4">
              <FieldLabel>SỐ TIỀN MỤC TIÊU</FieldLabel>
              <IconField
                icon={<DollarSign size={20} color="#64748B" />}
                hasError={!!errors.amount}
              >
                <TextInput
                  className="ml-3 flex-1 text-body-primary"
                  placeholder="0"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={form.amount}
                  onChangeText={text =>
                    updateField('amount', text.replace(/[^0-9]/g, ''))
                  }
                />
                <View className="ml-2 rounded-lg bg-[#eef0ff] px-3 py-1">
                  <Text className="text-caption-primary text-brand">VND</Text>
                </View>
              </IconField>
              {errors.amount ? (
                <View className="mt-2 flex-row items-center">
                  <AlertCircle size={14} color="#ef4444" />
                  <Text className="ml-2 text-sm text-red-500">
                    {errors.amount}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Image */}
            <View>
              <FieldLabel>ẢNH ĐẠI DIỆN</FieldLabel>
              {form.image ? (
                <View className="mb-3">
                  <View className="relative">
                    <Image
                      source={{ uri: form.image.uri }}
                      className="h-44 w-full rounded-2xl"
                      resizeMode="cover"
                    />
                    <TouchableOpacity
                      className="absolute -top-2 -right-2 h-7 w-7 items-center justify-center rounded-full bg-red-500"
                      activeOpacity={0.8}
                      onPress={() => updateField('image', null)}
                    >
                      <X size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </View>
              ) : null}

              <TouchableOpacity
                className="preview-panel min-h-[160px] items-center justify-center border border-dashed border-[#0000ff] p-6"
                activeOpacity={0.85}
                onPress={handlePickImage}
              >
                <ImagePlus size={46} color="#0000FF" />
                <Text className="mt-4 text-title-primary text-brand">
                  {form.image ? 'Đổi ảnh khác' : 'Chọn hình ảnh'}
                </Text>
                <Text className="mt-2 text-center text-caption-secondary">
                  JPG hoặc PNG, tối đa 10 MB.
                </Text>
              </TouchableOpacity>

              {errors.image ? (
                <View className="mt-2 flex-row items-center">
                  <AlertCircle size={14} color="#ef4444" />
                  <Text className="ml-2 text-sm text-red-500">
                    {errors.image}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          {submitError ? (
            <View className="mt-4 rounded-xl bg-red-50 px-4 py-3">
              <Text className="text-center text-sm text-red-600">
                {submitError}
              </Text>
            </View>
          ) : null}

          {/* Tip */}
          <View className="form-note-panel mt-4 flex-row items-start p-4">
            <Info size={20} color="#64748B" />
            <Text className="ml-3 flex-1 text-caption-secondary">
              Chiến dịch của bạn sẽ được đăng công khai. Mọi người có thể ủng hộ
              bằng cách chuyển tiền qua ví Vnseea.
            </Text>
          </View>
        </ScrollView>

        <View className="px-5 pb-6">
          <TouchableOpacity
            className="btn-primary min-h-[54px]"
            activeOpacity={0.9}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Text className="text-title-primary text-inverse">
                Đang tạo...
              </Text>
            ) : (
              <Text className="text-title-primary text-inverse">
                Đăng chiến dịch
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default CreateFundingScreen;

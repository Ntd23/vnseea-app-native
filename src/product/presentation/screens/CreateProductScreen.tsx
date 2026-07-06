// Description: Renders the VNSEEA nine-step create product wizard with API integration.
import React, { useCallback } from 'react';
import {
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
import {
  launchImageLibrary,
  type Asset,
} from 'react-native-image-picker';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  DollarSign,
  ImagePlus,
  Info,
  MapPin,
  Package,
  X,
} from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useProductViewModel } from '../../application/view-models/useProductViewModel';
import type { ProductFormData } from '../../application/view-models/useProductViewModel';
import { ROUTES } from '../../../navigation/constants/routes';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';

type CreateProductNav = NativeStackNavigationProp<RootStackParamList>;

type RootStackParamList = {
  Feed: undefined;
  [key: string]: undefined;
};

interface StepOption {
  id: string;
  name: string;
}

type StepConfig = {
  key: string;
  title: string;
  helper: string;
  label?: string;
  placeholder?: string;
  keyboard?: 'numeric' | 'default';
  iconComponent?: typeof DollarSign;
  field: keyof ProductFormData;
  select?: boolean;
  upload?: boolean;
  multiline?: boolean;
  options?: StepOption[];
};

const steps: StepConfig[] = [
  {
    key: 'name',
    title: 'Tên sản phẩm',
    helper: 'Đặt tên rõ ràng để người mua dễ tìm thấy sản phẩm.',
    label: 'Tên sản phẩm',
    placeholder: 'Nhập tên sản phẩm',
    field: 'product_title',
  },
  {
    key: 'price',
    title: 'Giá sản phẩm',
    helper: 'Vui lòng nhập giá bán công khai của sản phẩm này.',
    label: 'Mức giá niêm yết (VND)',
    placeholder: '0',
    keyboard: 'numeric',
    iconComponent: DollarSign,
    field: 'product_price',
  },
  {
    key: 'currency',
    title: 'Tiền tệ',
    helper: 'Chọn loại tiền tệ chính thức cho sản phẩm này.',
    label: 'Loại tiền tệ',
    placeholder: 'VND - Việt Nam Đồng',
    select: true,
    field: 'currency',
    options: [
      { id: 'VNSEEA', name: 'VNSEEA' },
      { id: 'USD', name: 'USD - Đô la Mỹ' },
      { id: 'EUR', name: 'EUR - Euro' },
    ],
  },
  {
    key: 'category',
    title: 'Chọn danh mục',
    helper: 'Danh mục giúp sản phẩm được phân phối đúng nhóm người mua.',
    field: 'product_category',
    options: [
      { id: '1', name: 'Điện tử tiêu dùng' },
      { id: '2', name: 'Thời trang nam' },
      { id: '3', name: 'Thời trang nữ' },
      { id: '4', name: 'Mẹ và bé' },
      { id: '5', name: 'Nhà cửa và đời sống' },
      { id: '6', name: 'Sức khỏe và làm đẹp' },
      { id: '7', name: 'Thể thao và du lịch' },
      { id: '8', name: 'Sách và văn phòng phẩm' },
    ],
  },
  {
    key: 'description',
    title: 'Mô tả sản phẩm',
    helper: 'Một mô tả chi tiết giúp khách hàng dễ tin tưởng hơn.',
    label: 'Mô tả sản phẩm',
    placeholder: 'Nhập mô tả chi tiết về sản phẩm của bạn...',
    multiline: true,
    field: 'product_description',
  },
  {
    key: 'type',
    title: 'Tình trạng sản phẩm',
    helper: 'Chọn tình trạng hiện tại để người mua dễ đánh giá.',
    field: 'product_type',
    options: [
      { id: '0', name: 'Sản phẩm bình thường' },
      { id: '1', name: 'Sản phẩm đang bán' },
    ],
  },
  {
    key: 'images',
    title: 'Hình ảnh sản phẩm',
    helper: 'Tải lên ít nhất 1 ảnh rõ nét cho sản phẩm của bạn.',
    upload: true,
    field: 'images',
  },
  {
    key: 'location',
    title: 'Người bán tỉnh/thành',
    helper: 'Khu vực vị trí giúp người mua tìm thấy sản phẩm gần họ.',
    label: 'Tỉnh/Thành phố',
    placeholder: 'Chọn tỉnh/thành phố',
    iconComponent: MapPin,
    select: true,
    field: 'product_location',
  },
  {
    key: 'units',
    title: 'Số lượng sản phẩm',
    helper: 'Nhập tổng số lượng đơn vị đang có sẵn.',
    label: 'Tổng số lượng đơn vị',
    placeholder: 'Nhập số lượng (vd: 100)',
    keyboard: 'numeric',
    field: 'units',
  },
];

export default function CreateProductScreen() {
  const navigation = useNavigation<CreateProductNav>();
  const route = useRoute<any>();
  const editingProduct = route.params?.product;

  const {
    step,
    formData,
    errors,
    totalSteps,
    updateFormData,
    addImage,
    removeImage,
    nextStep,
    prevStep,
    isLoading,
    submitError,
    submitSuccess,
    submitProduct,
    resetForm,
  } = useProductViewModel();

  // ALL hooks must be called unconditionally before any early returns
  const handleBack = useCallback(() => {
    if (step > 0) {
      prevStep();
    } else {
      Alert.alert(
        'Hủy tạo sản phẩm',
        'Bạn có chắc muốn hủy? Thông tin đã nhập sẽ không được lưu.',
        [
          { text: 'Không', style: 'cancel' },
          { text: 'Có', style: 'destructive', onPress: () => navigation.goBack() },
        ],
      );
    }
  }, [step, prevStep, navigation]);

  const handleNext = useCallback(() => {
    if (step === totalSteps - 1) {
      submitProduct();
    } else {
      nextStep();
    }
  }, [step, totalSteps, nextStep, submitProduct]);

  const currentStep = steps[step];
  const progressValue = Math.round(((step + 1) / totalSteps) * 100);
  const IconComponent = currentStep.iconComponent;

  // Get current field value
  const getFieldValue = (): string => {
    const value = formData[currentStep.field];
    if (currentStep.field === 'images') {
      return '';
    }
    return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
  };

  const handleSelectOption = useCallback(
    (optionId: string) => {
      if (currentStep.field === 'product_category' || currentStep.field === 'currency') {
        updateFormData(currentStep.field, optionId);
      } else if (currentStep.field === 'product_type') {
        updateFormData(currentStep.field, parseInt(optionId, 10));
      }
      nextStep();
    },
    [currentStep.field, updateFormData, nextStep],
  );

  const handleAddImage = useCallback(async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 10,
        quality: 0.8,
      });
      if (result.didCancel) return;
      if (result.errorCode) {
        Alert.alert('Lỗi', result.errorMessage ?? 'Không thể mở thư viện ảnh');
        return;
      }
      const assets = result.assets as Asset[] | undefined;
      if (assets && assets.length > 0) {
        for (const asset of assets) {
          if (asset.uri) {
            addImage({
              uri: asset.uri,
              name: asset.fileName ?? 'product_image.jpg',
              type: asset.type ?? 'image/jpeg',
            });
          }
        }
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể chọn hình ảnh');
    }
  }, [addImage]);

  const handleRemoveImage = useCallback(
    (index: number) => {
      removeImage(index);
    },
    [removeImage],
  );

  const getSelectedOption = (field: keyof ProductFormData, optionId: string): boolean => {
    if (field === 'product_category') {
      return formData.product_category === optionId;
    }
    if (field === 'product_type') {
      return formData.product_type === parseInt(optionId, 10);
    }
    if (field === 'currency') {
      return formData.currency === optionId;
    }
    return false;
  };

  // SUCCESS STATE - Conditional JSX return AFTER all hooks
  if (submitSuccess) {
    return (
      <SafeAreaView className="flex-1 surface-base" edges={['top']}>
        <FocusAwareStatusBar barStyle="dark-content" />
        <View className="flex-1 items-center justify-center px-6">
          <View className="h-20 w-20 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 size={50} color="#22c55e" />
          </View>
          <Text className="mt-6 text-heading">Đăng sản phẩm thành công!</Text>
          <Text className="mt-2 text-center text-body-secondary">
            Sản phẩm của bạn đã được đăng tải thành công.
          </Text>
          <View className="mt-8 w-full gap-3">
            <TouchableOpacity
              className="btn-primary min-h-[54px]"
              activeOpacity={0.9}
              onPress={() => navigation.goBack()}
            >
              <Text className="text-title-primary text-inverse">
                Quay lại trang chủ
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="btn-secondary min-h-[54px]"
              activeOpacity={0.9}
              onPress={resetForm}
            >
              <Text className="text-title-primary">
                Tạo thêm sản phẩm khác
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // MAIN FORM STATE
  return (
    <SafeAreaView className="flex-1 surface-base" edges={['top']}>
      <FocusAwareStatusBar barStyle="light-content" backgroundColor="#0000FF" />
      <View className="surface-brand h-16 flex-row items-center justify-between px-4">
        <TouchableOpacity
          className="h-10 w-10 items-center justify-center rounded-full"
          activeOpacity={0.8}
          onPress={handleBack}
        >
          <ArrowLeft size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text className="text-heading text-inverse">Tạo sản phẩm mới</Text>
        <Text className="text-title-primary text-inverse">{`Bước ${step + 1}/${totalSteps}`}</Text>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-5 pb-8 pt-5"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View className="mb-6">
            <View className="progress-track">
              <View className="progress-fill" style={{ width: `${progressValue}%` }} />
            </View>
            <Text className="mt-2 text-right text-caption-secondary">
              {progressValue}% hoàn thành
            </Text>
          </View>

          <View className="surface-card p-5">
            <View className="mb-5 flex-row items-center">
              <View className="icon-chip h-14 w-14 items-center justify-center">
                <Package size={28} color="#0000FF" />
              </View>
              <View className="ml-4 flex-1">
                <Text className="text-display">{currentStep.title}</Text>
                <Text className="mt-1 text-body-secondary">{currentStep.helper}</Text>
              </View>
            </View>

            {/* Upload Images Step */}
            {currentStep.upload ? (
              <View>
                {/* Image Grid */}
                {formData.images.length > 0 && (
                  <View className="mb-4 flex-row flex-wrap gap-2">
                    {formData.images.map((image, index) => (
                      <View key={index} className="relative">
                        <Image
                          source={{ uri: image.uri }}
                          className="h-20 w-20 rounded-xl"
                          resizeMode="cover"
                        />
                        <TouchableOpacity
                          className="absolute -top-2 -right-2 h-6 w-6 items-center justify-center rounded-full bg-red-500"
                          onPress={() => handleRemoveImage(index)}
                        >
                          <X size={14} color="#FFFFFF" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}

                <TouchableOpacity
                  className="preview-panel min-h-[160px] items-center justify-center border border-dashed border-[#0000ff] p-6"
                  activeOpacity={0.85}
                  onPress={handleAddImage}
                >
                  <ImagePlus size={46} color="#0000FF" />
                  <Text className="mt-4 text-title-primary text-brand">
                    Chọn hình ảnh
                  </Text>
                  <Text className="mt-2 text-center text-caption-secondary">
                    JPG, PNG hoặc ảnh chụp trực tiếp từ thiết bị.
                  </Text>
                </TouchableOpacity>

                {errors.images && (
                  <View className="mt-3 flex-row items-center">
                    <AlertCircle size={16} color="#ef4444" />
                    <Text className="ml-2 text-sm text-red-500">{errors.images}</Text>
                  </View>
                )}
              </View>
            ) : currentStep.options ? (
              // Select Options Step (Category/Type/Currency)
              <View className="gap-3">
                {currentStep.options.map((option, index) => {
                  const isSelected = getSelectedOption(currentStep.field, option.id);

                  return (
                    <TouchableOpacity
                      key={option.id || `option-${index}`}
                      className={`input-shell min-h-[54px] flex-row items-center justify-between px-4 ${
                        isSelected ? 'border-[#0000ff] border-2' : ''
                      }`}
                      activeOpacity={0.8}
                      onPress={() => handleSelectOption(option.id)}
                    >
                      <Text className="text-title-primary">{option.name}</Text>
                      {isSelected && <CheckCircle2 size={21} color="#0000FF" />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              // Text Input Step
              <View>
                <Text className="mb-2 text-label-primary text-slate-500">
                  {currentStep.label}
                </Text>
                <View
                  className={`input-shell flex-row items-center px-4 ${
                    currentStep.multiline
                      ? 'min-h-[180px] items-start py-3'
                      : 'min-h-[54px]'
                  } ${errors[currentStep.field as keyof typeof errors] ? 'border-red-500 border' : ''}`}
                >
                  {IconComponent && <IconComponent size={20} color="#64748B" />}
                  <TextInput
                    className={`flex-1 text-body-primary ${IconComponent ? 'ml-3' : ''}`}
                    placeholder={currentStep.placeholder}
                    placeholderTextColor="#94A3B8"
                    keyboardType={currentStep.keyboard === 'numeric' ? 'numeric' : 'default'}
                    multiline={currentStep.multiline}
                    textAlignVertical={currentStep.multiline ? 'top' : 'center'}
                    value={getFieldValue()}
                    onChangeText={(text) => updateFormData(currentStep.field, text)}
                  />
                  {currentStep.select && <ChevronDown size={20} color="#64748B" />}
                </View>
                {errors[currentStep.field as keyof typeof errors] && (
                  <View className="mt-2 flex-row items-center">
                    <AlertCircle size={14} color="#ef4444" />
                    <Text className="ml-2 text-sm text-red-500">
                      {errors[currentStep.field as keyof typeof errors]}
                    </Text>
                  </View>
                )}
              </View>
            )}

            <View className="form-note-panel mt-6 flex-row items-start p-4">
              <Info size={20} color="#64748B" />
              <Text className="ml-3 flex-1 text-caption-secondary">
                Bạn có thể quay lại các bước trước để chỉnh sửa trước khi đăng sản phẩm.
              </Text>
            </View>
          </View>

          {/* Error Message */}
          {submitError && (
            <View className="mt-4 rounded-xl bg-red-50 px-4 py-3">
              <Text className="text-center text-sm text-red-600">{submitError}</Text>
            </View>
          )}
        </ScrollView>

        <View className="px-5 pb-6">
          <TouchableOpacity
            className="btn-primary min-h-[54px]"
            activeOpacity={0.9}
            onPress={handleNext}
            disabled={isLoading}
          >
            {isLoading ? (
              <Text className="text-title-primary text-inverse">Đang xử lý...</Text>
            ) : (
              <Text className="text-title-primary text-inverse">
                {step === totalSteps - 1 ? 'Hoàn tất' : 'Tiếp tục'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

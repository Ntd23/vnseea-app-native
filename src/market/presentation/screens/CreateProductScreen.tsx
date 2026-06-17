// Description: Renders the VNSEEA nine-step create product wizard based on Stitch references.
import React, { useMemo, useState } from 'react';
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  DollarSign,
  ImagePlus,
  Info,
  MapPin,
  Package,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../../../navigation/types';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';

type CreateProductNav = NativeStackNavigationProp<RootStackParamList>;

const steps = [
  {
    title: 'Tên sản phẩm',
    helper: 'Đặt tên rõ ràng để người mua dễ tìm thấy sản phẩm.',
    label: 'Tên sản phẩm',
    placeholder: 'Nhập tên sản phẩm',
  },
  {
    title: 'Giá sản phẩm',
    helper: 'Vui lòng nhập giá bán công khai của sản phẩm này.',
    label: 'Mức giá niêm yết',
    placeholder: '0',
    keyboard: 'numeric' as const,
    icon: DollarSign,
  },
  {
    title: 'Tiền tệ',
    helper: 'Chọn loại tiền tệ chính thức cho sản phẩm này.',
    label: 'Loại tiền tệ',
    placeholder: 'VND - Việt Nam Đồng',
    select: true,
  },
  {
    title: 'Chọn danh mục',
    helper: 'Danh mục giúp sản phẩm được phân phối đúng nhóm người mua.',
    options: ['Điện tử tiêu dùng', 'Thời trang nam', 'Thời trang nữ'],
  },
  {
    title: 'Mô tả sản phẩm',
    helper: 'Một mô tả chi tiết giúp khách hàng dễ tin tưởng hơn.',
    label: 'Mô tả sản phẩm',
    placeholder: 'Nhập mô tả chi tiết về sản phẩm của bạn...',
    multiline: true,
  },
  {
    title: 'Tình trạng sản phẩm',
    helper: 'Chọn tình trạng hiện tại để người mua dễ đánh giá.',
    label: 'Tình trạng',
    placeholder: 'Chọn tình trạng sản phẩm',
    select: true,
  },
  {
    title: 'Hình ảnh sản phẩm',
    helper: 'Tải lên ít nhất 1 ảnh rõ nét cho sản phẩm của bạn.',
    upload: true,
  },
  {
    title: 'Vị trí sản phẩm',
    helper: 'Vị trí chính xác giúp người mua tìm thấy sản phẩm gần họ.',
    label: 'Chọn vị trí',
    placeholder: 'Chọn vị trí sản phẩm',
    icon: MapPin,
    select: true,
  },
  {
    title: 'Số lượng sản phẩm',
    helper: 'Nhập tổng số lượng đơn vị đang có sẵn.',
    label: 'Tổng số lượng đơn vị',
    placeholder: 'Nhập số lượng (vd: 100)',
    keyboard: 'numeric' as const,
  },
];

function CreateProductScreen() {
  const navigation = useNavigation<CreateProductNav>();
  const [step, setStep] = useState(0);
  const current = steps[step];
  const progressValue = useMemo(
    () => Math.round(((step + 1) / steps.length) * 100),
    [step],
  );
  const progress = `${progressValue}%` as const;

  function next() {
    if (step < steps.length - 1) {
      setStep(value => value + 1);
      return;
    }
    navigation.goBack();
  }

  function back() {
    if (step > 0) {
      setStep(value => value - 1);
      return;
    }
    navigation.goBack();
  }

  const FieldIcon = current.icon;

  return (
    <SafeAreaView className="flex-1 surface-base" edges={['top']}>
      <FocusAwareStatusBar barStyle="light-content" backgroundColor="#0000FF" />
      <View className="surface-brand h-16 flex-row items-center justify-between px-4">
        <TouchableOpacity
          className="h-10 w-10 items-center justify-center rounded-full"
          activeOpacity={0.8}
          onPress={back}
        >
          <ArrowLeft size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text className="text-heading text-inverse">Tạo sản phẩm mới</Text>
        <Text className="text-title-primary text-inverse">{`Bước ${
          step + 1
        }/9`}</Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-8 pt-5"
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-6">
          <View className="progress-track">
            <View className="progress-fill" style={{ width: progress }} />
          </View>
          <Text className="mt-2 text-right text-caption-secondary">
            {progress} hoàn thành
          </Text>
        </View>

        <View className="surface-card p-5">
          <View className="mb-5 flex-row items-center">
            <View className="icon-chip h-14 w-14 items-center justify-center">
              <Package size={28} color="#0000FF" />
            </View>
            <View className="ml-4 flex-1">
              <Text className="text-display">{current.title}</Text>
              <Text className="mt-1 text-body-secondary">{current.helper}</Text>
            </View>
          </View>

          {current.upload ? (
            <TouchableOpacity
              className="preview-panel min-h-[190px] items-center justify-center border border-dashed border-[#0000ff] p-6"
              activeOpacity={0.85}
            >
              <ImagePlus size={46} color="#0000FF" />
              <Text className="mt-4 text-title-primary text-brand">
                Chọn hình ảnh
              </Text>
              <Text className="mt-2 text-center text-caption-secondary">
                JPG, PNG hoặc ảnh chụp trực tiếp từ thiết bị.
              </Text>
            </TouchableOpacity>
          ) : current.options ? (
            <View className="gap-3">
              {current.options.map((option, index) => (
                <TouchableOpacity
                  key={option}
                  className={`input-shell min-h-[54px] flex-row items-center justify-between px-4 ${
                    index === 0 ? 'border-blue-600' : ''
                  }`}
                  activeOpacity={0.8}
                >
                  <Text className="text-title-primary">{option}</Text>
                  {index === 0 ? (
                    <CheckCircle2 size={21} color="#0000FF" />
                  ) : null}
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View>
              <Text className="mb-2 text-label-primary text-slate-500">
                {current.label}
              </Text>
              <View
                className={`input-shell flex-row items-center px-4 ${
                  current.multiline
                    ? 'min-h-[180px] items-start py-3'
                    : 'min-h-[54px]'
                }`}
              >
                {FieldIcon ? <FieldIcon size={20} color="#64748B" /> : null}
                <TextInput
                  className={`flex-1 text-body-primary ${
                    FieldIcon ? 'ml-3' : ''
                  }`}
                  placeholder={current.placeholder}
                  placeholderTextColor="#94A3B8"
                  keyboardType={current.keyboard}
                  multiline={current.multiline}
                  textAlignVertical={current.multiline ? 'top' : 'center'}
                />
                {current.select ? (
                  <ChevronDown size={20} color="#64748B" />
                ) : null}
              </View>
            </View>
          )}

          <View className="form-note-panel mt-6 flex-row items-start p-4">
            <Info size={20} color="#64748B" />
            <Text className="ml-3 flex-1 text-caption-secondary">
              Bạn có thể quay lại các bước trước để chỉnh sửa trước khi đăng sản
              phẩm.
            </Text>
          </View>
        </View>
      </ScrollView>

      <View className="px-5 pb-6">
        <TouchableOpacity
          className="btn-primary min-h-[54px]"
          activeOpacity={0.9}
          onPress={next}
        >
          <Text className="text-title-primary text-inverse">
            {step === steps.length - 1 ? 'Hoàn tất' : 'Tiếp tục'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

export default CreateProductScreen;

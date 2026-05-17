// Description: Renders the VNSEEA six-step create event wizard based on Stitch references.
import React, { useMemo, useState } from 'react';
import {
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  ImagePlus,
  Info,
  MapPin,
  PartyPopper,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../../../navigation/types';

type CreateEventNav = NativeStackNavigationProp<RootStackParamList>;
type EventField = {
  label: string;
  placeholder: string;
  Icon?: React.ComponentType<{ size: number; color: string }>;
  multiline?: boolean;
};
type EventStep = {
  title: string;
  helper: string;
  fields?: EventField[];
  upload?: boolean;
};

const steps: EventStep[] = [
  {
    title: 'Tên sự kiện',
    helper: 'Đặt tên ngắn gọn, rõ ràng cho sự kiện của bạn.',
    fields: [{ label: 'Tên sự kiện', placeholder: 'Nhập tên sự kiện' }],
  },
  {
    title: 'Thời gian diễn ra',
    helper: 'Chọn ngày và giờ bắt đầu cho sự kiện.',
    fields: [
      { label: 'Ngày bắt đầu', placeholder: 'DD/MM/YYYY', Icon: CalendarDays },
      { label: 'Giờ bắt đầu', placeholder: '08:00 AM', Icon: Clock },
    ],
  },
  {
    title: 'Thời gian kết thúc',
    helper: 'Chọn thời điểm kết thúc để khách mời nắm lịch.',
    fields: [
      { label: 'Ngày kết thúc', placeholder: 'Chọn ngày', Icon: CalendarDays },
      { label: 'Giờ kết thúc', placeholder: 'Chọn giờ', Icon: Clock },
    ],
  },
  {
    title: 'Ảnh sự kiện',
    helper: 'Chọn ảnh nổi bật để sự kiện hấp dẫn hơn.',
    upload: true,
  },
  {
    title: 'Vị trí',
    helper: 'Thêm địa điểm hoặc nơi tổ chức sự kiện.',
    fields: [
      { label: 'Vị trí sự kiện', placeholder: 'Chọn vị trí', Icon: MapPin },
    ],
  },
  {
    title: 'Mô tả sự kiện',
    helper: 'Mô tả nội dung, agenda hoặc thông tin cần biết.',
    fields: [
      {
        label: 'Mô tả sự kiện',
        placeholder: 'Nhập mô tả tại đây',
        multiline: true,
      },
    ],
  },
];

function CreateEventScreen() {
  const navigation = useNavigation<CreateEventNav>();
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

  return (
    <SafeAreaView className="flex-1 surface-base" edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0000FF" />
      <View className="surface-brand h-16 flex-row items-center justify-between px-4">
        <TouchableOpacity
          className="h-10 w-10 items-center justify-center rounded-full"
          activeOpacity={0.8}
          onPress={back}
        >
          <ArrowLeft size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text className="text-heading text-inverse">Tạo sự kiện</Text>
        <Text className="text-title-primary text-inverse">{`Bước ${
          step + 1
        }/6`}</Text>
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
              <PartyPopper size={28} color="#0000FF" />
            </View>
            <View className="ml-4 flex-1">
              <Text className="text-display">{current.title}</Text>
              <Text className="mt-1 text-body-secondary">{current.helper}</Text>
            </View>
          </View>

          {current.upload ? (
            <TouchableOpacity
              className="preview-panel min-h-[210px] items-center justify-center border border-dashed border-[#0000ff] p-6"
              activeOpacity={0.85}
            >
              <ImagePlus size={48} color="#0000FF" />
              <Text className="mt-4 text-title-primary text-brand">
                Chọn ảnh sự kiện
              </Text>
            </TouchableOpacity>
          ) : (
            <View className="gap-5">
              {current.fields?.map(field => {
                const FieldIcon = field.Icon;
                return (
                  <View key={field.label}>
                    <Text className="mb-2 text-label-primary text-slate-500">
                      {field.label}
                    </Text>
                    <View
                      className={`input-shell flex-row px-4 ${
                        field.multiline
                          ? 'min-h-[190px] items-start py-3'
                          : 'min-h-[54px] items-center'
                      }`}
                    >
                      {FieldIcon ? (
                        <FieldIcon size={20} color="#64748B" />
                      ) : null}
                      <TextInput
                        className={`flex-1 text-body-primary ${
                          FieldIcon ? 'ml-3' : ''
                        }`}
                        placeholder={field.placeholder}
                        placeholderTextColor="#94A3B8"
                        multiline={field.multiline}
                        textAlignVertical={field.multiline ? 'top' : 'center'}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          <View className="form-note-panel mt-6 flex-row items-start p-4">
            <Info size={20} color="#64748B" />
            <Text className="ml-3 flex-1 text-caption-secondary">
              Sau khi hoàn tất, sự kiện sẽ hiển thị trên feed và trang sự kiện
              của bạn.
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

export default CreateEventScreen;

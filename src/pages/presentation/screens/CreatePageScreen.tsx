// Description: Renders the VNSEEA-style create page wizard based on Stitch page creation screens.
import React, { useMemo, useState } from 'react';
import {
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
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ArrowLeft,
  ArrowRight,
  AtSign,
  CheckCircle2,
  Edit3,
  Info,
  Shapes,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../../../navigation/types';

type CreatePageNav = NativeStackNavigationProp<RootStackParamList>;

const PAGE_NAME_IMAGE =
  'https://lh3.googleusercontent.com/aida/ADBb0uh_7Hk2tZCJt_ZuSsmInEFIKcYkz_I_p1kiGHq0GazO9hqsIvzmyq5Wr9x0B1Qdov7k0AbFSs9RbfDPS7pV0l6H8F7Z-Yiqx03wvB9nNiJBvp9MxkAKieDmqOpkzzFSr8wSdGKiHddzN0mXES5-t-vCUBIC3WTWgZuCHehFVRfvKen58-5_QxROCtcOBTRP85jB2W81AXDNWDJpipz5TWEe28e2OQYBoTtFU94UQEoFhLhd-gG6VejH2YA4smY6HQRD3hI41wxKgA';

const USERNAME_IMAGE =
  'https://lh3.googleusercontent.com/aida/ADBb0uiZYLVyhHMWBGl31l47zy6o50IcsCudsMqHtBURRfDkgWuIX2dYl5EklJFpVQcWhSFNjF0nH7Wm2REahIL78NP8DpoCxJJaVUysUWa6ZsLYhkWo24lecvemew1n39kv9V1ykP4iUWk-fxMWUwMkZXmJeHx_RDqyCQYrlzItfXhBxRQqIWhACFW9OVo4-PzIk91imqqQabP1O0LK8Fl34QytlWtslif_JQoF-sKOToVYoj4oX1ev8_ctBrbFCpHjI8Udmm_P5gkr';

const categories = [
  'Xe cộ',
  'Hài hước',
  'Kinh tế',
  'Giáo dục',
  'Giải trí',
  'Phim ảnh',
  'Công nghệ',
  'Ẩm thực',
  'Du lịch',
  'Thời trang',
  'Thể thao',
];

function ProgressBar({ step }: { step: number }) {
  return (
    <View className="mb-8 flex-row gap-1">
      {[1, 2, 3, 4].map(item => (
        <View key={item} className="progress-track flex-1 overflow-hidden">
          {item <= step ? <View className="progress-fill flex-1" /> : null}
        </View>
      ))}
    </View>
  );
}

function WizardHeader({
  step,
  raised = false,
  onBack,
}: {
  step: number;
  raised?: boolean;
  onBack: () => void;
}) {
  return (
    <View
      className={`surface-brand flex-row items-center justify-between px-4 ${
        raised ? 'h-36 pb-10 pt-8' : 'h-16'
      }`}
    >
      <View className="flex-row items-center">
        <TouchableOpacity
          className="mr-3 h-10 w-10 items-center justify-center rounded-full"
          activeOpacity={0.8}
          onPress={onBack}
        >
          <ArrowLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text className="text-heading text-inverse">Tạo trang mới</Text>
      </View>
      <Text className="text-label-primary text-inverse opacity-80">
        BƯỚC {step}/4
      </Text>
    </View>
  );
}

function NextButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity
      className="btn-primary min-h-[54px]"
      activeOpacity={0.9}
      onPress={onPress}
    >
      <Text className="text-title-primary text-inverse">Tiếp tục</Text>
      <ArrowRight size={20} color="#FFFFFF" />
    </TouchableOpacity>
  );
}

function StepOne({ onNext }: { onNext: () => void }) {
  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="flex-grow px-6 py-8"
      keyboardShouldPersistTaps="handled"
    >
      <ProgressBar step={1} />

      <View className="mb-10 items-center">
        <Text className="text-center text-display">Đặt tên trang của bạn</Text>
        <Text className="mt-3 max-w-sm text-center text-body-secondary">
          Tên trang nên phản ánh thương hiệu, tổ chức hoặc chủ đề mà bạn muốn
          chia sẻ với cộng đồng.
        </Text>
      </View>

      <View className="surface-panel px-5 py-6">
        <Text className="mb-3 text-title-primary">Tên trang</Text>
        <View className="input-shell min-h-[54px] flex-row items-center px-4">
          <TextInput
            className="flex-1 text-body-primary"
            placeholder="Tên trang"
            placeholderTextColor="#94A3B8"
            returnKeyType="next"
          />
          <Edit3 size={20} color="#94A3B8" />
        </View>
        <Text className="mt-4 text-caption-secondary">
          Ví dụ: Quán Cà Phê VNSEEA, Cộng đồng Designer Việt Nam
        </Text>
      </View>

      <View className="preview-panel mt-8 flex-row items-center p-5">
        <View className="mr-4 h-20 w-20 overflow-hidden rounded-full border-4 border-white">
          <Image
            source={{ uri: PAGE_NAME_IMAGE }}
            className="h-full w-full"
            resizeMode="cover"
          />
        </View>
        <View className="flex-1">
          <Text className="text-title-primary">Xem trước trang</Text>
          <Text className="mt-1 text-caption-secondary">
            Đây là cách tên trang của bạn sẽ hiển thị với mọi người trên ứng
            dụng.
          </Text>
        </View>
      </View>

      <View className="mt-auto pt-12">
        <NextButton onPress={onNext} />
      </View>
    </ScrollView>
  );
}

function StepTwo({ onNext }: { onNext: () => void }) {
  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="flex-grow px-6 py-8"
      keyboardShouldPersistTaps="handled"
    >
      <ProgressBar step={2} />

      <View className="mb-8 h-40 overflow-hidden rounded-2xl surface-card">
        <Image
          source={{ uri: USERNAME_IMAGE }}
          className="h-full w-full"
          resizeMode="cover"
        />
      </View>

      <View className="mb-8">
        <Text className="text-display">Đặt tên người dùng cho trang</Text>
        <Text className="mt-2 text-body-secondary">
          Tên người dùng giúp mọi người dễ dàng tìm thấy Trang của bạn trong kết
          quả tìm kiếm.
        </Text>
      </View>

      <View className="flex-1">
        <Text className="mb-2 ml-1 text-title-primary">Tên người dùng</Text>
        <View className="input-shell min-h-[54px] flex-row items-center px-4">
          <AtSign size={18} color="#64748B" />
          <TextInput
            className="ml-2 flex-1 text-body-primary"
            placeholder="Tên người dùng"
            placeholderTextColor="#94A3B8"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
          />
        </View>
        <Text className="mt-2 px-1 text-caption-secondary">
          Tên người dùng có thể bao gồm chữ cái, số và dấu chấm.
        </Text>
      </View>

      <View className="mt-12 pt-6">
        <NextButton onPress={onNext} />
        <Text className="mt-4 text-center text-label-secondary">
          VN S E E A • PROFESSIONAL
        </Text>
      </View>
    </ScrollView>
  );
}

function StepThree({ onNext }: { onNext: () => void }) {
  const [selected, setSelected] = useState(categories[0]);

  return (
    <View className="flex-1">
      <View className="-mt-6 flex-1 px-4">
        <View className="surface-panel flex-1 px-5 py-6">
          <View className="items-center">
            <View className="icon-chip h-24 w-24 items-center justify-center">
              <Shapes size={48} color="#0000FF" />
            </View>
          </View>

          <View className="mt-5 items-center">
            <Text className="text-display">Chọn danh mục</Text>
            <Text className="mt-2 text-center text-body-secondary">
              Chọn danh mục phù hợp nhất để mọi người dễ dàng tìm thấy trang của
              bạn.
            </Text>
          </View>

          <View className="mt-6 flex-row flex-wrap gap-3">
            {categories.map(category => {
              const active = selected === category;

              return (
                <TouchableOpacity
                  key={category}
                  className={`min-h-[38px] flex-row items-center px-4 ${
                    active ? 'category-chip-active' : 'category-chip'
                  }`}
                  activeOpacity={0.85}
                  onPress={() => setSelected(category)}
                >
                  {active ? <CheckCircle2 size={17} color="#FFFFFF" /> : null}
                  <Text
                    className={`text-title-primary ${
                      active ? 'ml-2 text-inverse' : ''
                    }`}
                  >
                    {category}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View className="form-note-panel mt-6 flex-row items-start p-4">
            <Info size={20} color="#64748B" />
            <Text className="ml-3 flex-1 text-caption-secondary">
              Trang của bạn sẽ hiển thị trong kết quả tìm kiếm dựa trên danh mục
              này. Bạn có thể thay đổi danh mục sau trong phần cài đặt trang.
            </Text>
          </View>
        </View>
      </View>

      <View className="px-6 py-6">
        <NextButton onPress={onNext} />
        <Text className="mt-4 text-center text-label-secondary">
          WOWONDER SOCIAL NETWORK
        </Text>
      </View>
    </View>
  );
}

function CreatePageScreen() {
  const navigation = useNavigation<CreatePageNav>();
  const [step, setStep] = useState(1);

  const headerRaised = step === 3;
  const content = useMemo(() => {
    if (step === 1) {
      return <StepOne onNext={() => setStep(2)} />;
    }

    if (step === 2) {
      return <StepTwo onNext={() => setStep(3)} />;
    }

    return <StepThree onNext={() => undefined} />;
  }, [step]);

  function handleBack() {
    if (step > 1) {
      setStep(value => value - 1);
      return;
    }

    navigation.goBack();
  }

  return (
    <SafeAreaView className="flex-1 surface-base">
      <StatusBar barStyle="light-content" backgroundColor="#0000FF" />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <WizardHeader step={step} raised={headerRaised} onBack={handleBack} />
        {content}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default CreatePageScreen;

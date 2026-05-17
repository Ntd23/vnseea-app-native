// Description: Renders a multi-step VNSEEA create group wizard for group setup and publishing.
import React, { useMemo, useState } from 'react';
import {
  Image,
  ScrollView,
  StatusBar,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  ChevronRight,
  Globe2,
  ImagePlus,
  Lock,
  ShieldCheck,
  Users,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../../../navigation/types';

type CreateGroupNav = NativeStackNavigationProp<RootStackParamList>;

const BRAND = '#0000ff';
const cover =
  'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?q=80&w=1400&auto=format&fit=crop';

const steps = [
  'Thông tin',
  'Ảnh nhóm',
  'Quyền riêng tư',
  'Mời thành viên',
  'Hoàn tất',
];

function CreateGroupScreen() {
  const navigation = useNavigation<CreateGroupNav>();
  const [step, setStep] = useState(0);
  const [approvalEnabled, setApprovalEnabled] = useState(true);

  const progress = useMemo(() => `${step + 1}/${steps.length}`, [step]);
  const isLastStep = step === steps.length - 1;

  return (
    <SafeAreaView className="flex-1 surface-base" edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={BRAND} />

      <View className="surface-brand h-14 flex-row items-center justify-between px-4">
        <TouchableOpacity
          className="h-10 w-10 items-center justify-center rounded-full"
          activeOpacity={0.8}
          onPress={() => {
            if (step > 0) {
              setStep(step - 1);
              return;
            }
            navigation.goBack();
          }}
        >
          <ArrowLeft size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <View className="items-center">
          <Text className="text-title-primary text-inverse">Tạo nhóm</Text>
          <Text className="text-caption-primary text-white/80">
            Bước {progress}
          </Text>
        </View>
        <View className="h-10 w-10" />
      </View>

      <View className="h-1 bg-[#dbeafe]">
        <View
          className="h-1 bg-[#0000ff]"
          style={{ width: `${((step + 1) / steps.length) * 100}%` }}
        />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-28 pt-5"
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-heading">{steps[step]}</Text>

        {step === 0 && (
          <View className="mt-5 gap-4">
            <View className="surface-card p-4">
              <Text className="text-caption-primary">Tên nhóm</Text>
              <TextInput
                className="mt-2 rounded-xl border border-slate-200 px-4 py-3 text-body-primary"
                placeholder="Nhập tên nhóm"
                placeholderTextColor="#94A3B8"
                defaultValue="VNSEEA Design Circle"
              />
            </View>
            <View className="surface-card p-4">
              <Text className="text-caption-primary">Mô tả nhóm</Text>
              <TextInput
                className="mt-2 min-h-[120px] rounded-xl border border-slate-200 px-4 py-3 text-body-primary"
                placeholder="Nhóm này nói về điều gì?"
                placeholderTextColor="#94A3B8"
                multiline
                textAlignVertical="top"
              />
            </View>
          </View>
        )}

        {step === 1 && (
          <View className="mt-5">
            <View className="surface-card overflow-hidden">
              <Image source={{ uri: cover }} className="h-48 w-full" />
              <View className="p-4">
                <TouchableOpacity
                  className="btn-secondary min-h-[48px]"
                  activeOpacity={0.82}
                >
                  <ImagePlus size={20} color={BRAND} />
                  <Text className="text-title-primary text-brand">
                    Chọn ảnh bìa
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            <View className="surface-card mt-4 flex-row items-center p-4">
              <View className="h-16 w-16 items-center justify-center rounded-2xl bg-[#0000ff]/10">
                <Camera size={28} color={BRAND} />
              </View>
              <View className="ml-4 flex-1">
                <Text className="text-title-primary">Ảnh đại diện nhóm</Text>
                <Text className="mt-1 text-caption-secondary">
                  Dùng logo hoặc hình đại diện dễ nhận biết.
                </Text>
              </View>
              <ChevronRight size={20} color={BRAND} />
            </View>
          </View>
        )}

        {step === 2 && (
          <View className="mt-5 gap-4">
            {[
              {
                title: 'Công khai',
                desc: 'Ai cũng có thể tìm thấy nhóm và xem bài viết.',
                Icon: Globe2,
              },
              {
                title: 'Riêng tư',
                desc: 'Chỉ thành viên mới xem được bài viết trong nhóm.',
                Icon: Lock,
              },
            ].map((item, index) => (
              <TouchableOpacity
                key={item.title}
                className={`surface-card flex-row items-center border p-4 ${
                  index === 1 ? 'border-[#0000ff]' : 'border-transparent'
                }`}
                activeOpacity={0.84}
              >
                <View className="h-12 w-12 items-center justify-center rounded-full bg-[#0000ff]/10">
                  <item.Icon size={24} color={BRAND} />
                </View>
                <View className="ml-4 flex-1">
                  <Text className="text-title-primary">{item.title}</Text>
                  <Text className="mt-1 text-caption-secondary">
                    {item.desc}
                  </Text>
                </View>
                {index === 1 && <CheckCircle2 size={22} color={BRAND} />}
              </TouchableOpacity>
            ))}
            <View className="surface-card flex-row items-center justify-between p-4">
              <View className="flex-1 pr-4">
                <Text className="text-title-primary">Duyệt thành viên mới</Text>
                <Text className="mt-1 text-caption-secondary">
                  Quản trị viên phê duyệt trước khi thành viên tham gia.
                </Text>
              </View>
              <Switch
                value={approvalEnabled}
                onValueChange={setApprovalEnabled}
                trackColor={{ false: '#CBD5E1', true: '#0000ff' }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        )}

        {step === 3 && (
          <View className="mt-5 gap-4">
            {['Nguyễn Dũng', 'Thanh Thảo', 'Hoàng Long', 'Minh Anh'].map(
              (name, index) => (
                <View
                  key={name}
                  className="surface-card flex-row items-center p-4"
                >
                  <View className="h-12 w-12 rounded-full bg-[#0000ff]/10" />
                  <View className="ml-3 flex-1">
                    <Text className="text-title-primary">{name}</Text>
                    <Text className="text-caption-secondary">
                      Bạn bè trên VNSEEA
                    </Text>
                  </View>
                  <TouchableOpacity
                    className={`rounded-full px-4 py-2 ${
                      index < 2 ? 'surface-brand' : 'surface-muted'
                    }`}
                    activeOpacity={0.8}
                  >
                    <Text
                      className={
                        index < 2
                          ? 'text-caption-primary text-inverse'
                          : 'text-caption-secondary'
                      }
                    >
                      {index < 2 ? 'Đã mời' : 'Mời'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ),
            )}
          </View>
        )}

        {step === 4 && (
          <View className="surface-card mt-5 items-center p-8">
            <View className="h-20 w-20 items-center justify-center rounded-full bg-[#0000ff]/10">
              <ShieldCheck size={38} color={BRAND} />
            </View>
            <Text className="mt-5 text-center text-heading">
              Nhóm đã sẵn sàng
            </Text>
            <Text className="mt-3 text-center text-body-secondary">
              Kiểm tra lại thông tin, quyền riêng tư và danh sách thành viên
              trước khi tạo nhóm.
            </Text>
            <View className="mt-6 w-full rounded-2xl bg-slate-50 p-4">
              <View className="flex-row items-center">
                <Users size={22} color={BRAND} />
                <Text className="ml-3 text-title-primary">
                  VNSEEA Design Circle
                </Text>
              </View>
              <Text className="mt-2 text-caption-secondary">
                Riêng tư · Duyệt thành viên mới · 2 lời mời đã gửi
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 border-t border-[rgba(0,0,255,0.08)] bg-white px-4 pb-5 pt-3">
        <TouchableOpacity
          className="btn-primary min-h-[52px]"
          activeOpacity={0.86}
          onPress={() => {
            if (isLastStep) {
              navigation.goBack();
              return;
            }
            setStep(step + 1);
          }}
        >
          <Text className="text-title-primary text-inverse">
            {isLastStep ? 'Tạo nhóm' : 'Tiếp tục'}
          </Text>
          {!isLastStep && <ChevronRight size={19} color="#FFFFFF" />}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

export default CreateGroupScreen;

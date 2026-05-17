// Description: Renders the VNSEEA job detail screen opened from the jobs listing.
import React from 'react';
import {
  Image,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ArrowLeft,
  Bookmark,
  Briefcase,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FileText,
  Gift,
  MapPin,
  Send,
  Share2,
  UserRound,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../../../navigation/types';

type JobDetailNav = NativeStackNavigationProp<RootStackParamList>;

const BRAND = '#0000ff';

const companyLogo =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDf2kVfUA0YYHodXIZ_fsBEFCE7kj7bT7CkJ5WwSVAxt0-InEu_EfIyWw4kZEschTS_dWwGvyCJvxuZZZuvyQ3-_UZl5pYNXVMoezqxWX8eYlvMMv-K-vQzhdMMxVZG1cWt2bVWUb8AzUke1b4Zi2E6kHToKCViTvlzwP7MzD62edweqvrJeuEHYRDI7Riyv-natSoYDFW_wRuW_v1r1u6mK9rYiSYAM8c77yeDP-eQnCo78rfm3UrbHkHT94A05v8nnvxLPqr21fc';

const mapImage =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBYY2nwOPBDWl72y_Tu8kuMA-a10TUSJIDVYZ7HM5dAHUR6pIAK680lZgvZYOB2L426xjejCrGE5soMYrkD-JL_kC-Sd_5lqrKDcqW7rDsVFWdYVIv6tVh4wI4foYQtjYj7ts1tOp40wOUaS6WtXGHgiCRSP61Oan7yk7TpxdGH-bysjyHXJjbn60zpsfpjSd9cPmLiLGJq-tVDYx8TdOY7I23KBNHRlkpLHoGVHWMDIi_ZInQhummRh0tNCKMDU9QU0BAUwWitqdU';

const facts = [
  { label: 'Cấp bậc', value: 'Nhân viên / Senior', Icon: UserRound },
  { label: 'Kinh nghiệm', value: '3 - 5 năm', Icon: Clock3 },
  { label: 'Hạn nộp', value: '30/11/2023', Icon: CalendarClock },
];

function JobDetailScreen() {
  const navigation = useNavigation<JobDetailNav>();

  return (
    <SafeAreaView className="flex-1 surface-base" edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0000FF" />

      <View className="surface-brand h-14 flex-row items-center justify-between px-4">
        <TouchableOpacity
          className="h-10 w-10 items-center justify-center rounded-full"
          activeOpacity={0.8}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text className="text-title-primary text-inverse">
          Chi tiết công việc
        </Text>
        <View className="flex-row items-center">
          <TouchableOpacity
            className="h-10 w-10 items-center justify-center rounded-full"
            activeOpacity={0.8}
          >
            <Share2 size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity
            className="h-10 w-10 items-center justify-center rounded-full"
            activeOpacity={0.8}
          >
            <Bookmark size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-28 pt-5"
        showsVerticalScrollIndicator={false}
      >
        <View className="surface-card p-5">
          <View className="flex-row">
            <Image
              source={{ uri: companyLogo }}
              className="h-16 w-16 rounded-2xl"
              resizeMode="cover"
            />
            <View className="ml-4 flex-1">
              <Text className="text-heading">Product Designer</Text>
              <Text className="mt-1 text-title-primary text-brand">
                VNSEA Solutions
              </Text>
              <View className="mt-2 flex-row items-center">
                <MapPin size={16} color={BRAND} />
                <Text className="ml-1 text-caption-secondary">
                  Quận 1, TP. HCM
                </Text>
              </View>
            </View>
          </View>

          <View className="mt-5 flex-row items-center justify-between rounded-2xl bg-[#0000ff]/10 px-4 py-3">
            <View>
              <Text className="text-caption-secondary">Mức lương</Text>
              <Text className="mt-1 text-title-primary text-brand">
                25 - 40 Triệu
              </Text>
            </View>
            <View className="flex-row items-center rounded-full bg-white px-3 py-2">
              <Briefcase size={16} color={BRAND} />
              <Text className="ml-1 text-caption-primary text-brand">
                Full-time
              </Text>
            </View>
          </View>
        </View>

        <View className="surface-card mt-4 p-5">
          <View className="flex-row items-center">
            <FileText size={22} color={BRAND} />
            <Text className="ml-2 text-title-primary">Mô tả công việc</Text>
          </View>
          <Text className="mt-3 text-body-secondary">
            Chúng tôi đang tìm kiếm một Senior Product Designer tài năng để gia
            nhập đội ngũ phát triển sản phẩm VNSEA. Bạn sẽ chịu trách nhiệm kiến
            tạo trải nghiệm người dùng và định hình ngôn ngữ thiết kế cho các
            nền tảng của chúng tôi.
          </Text>
        </View>

        <View className="surface-card mt-4 p-5">
          <View className="flex-row items-center">
            <CheckCircle2 size={22} color={BRAND} />
            <Text className="ml-2 text-title-primary">Yêu cầu</Text>
          </View>
          {[
            'Có kinh nghiệm thiết kế sản phẩm số trên mobile.',
            'Thành thạo Figma, design system và prototype.',
            'Có tư duy dữ liệu và khả năng phối hợp cùng team kỹ thuật.',
          ].map(item => (
            <View key={item} className="mt-3 flex-row">
              <View className="mt-2 h-2 w-2 rounded-full bg-[#0000ff]" />
              <Text className="ml-3 flex-1 text-body-secondary">{item}</Text>
            </View>
          ))}
        </View>

        <View className="surface-card mt-4 p-5">
          <View className="flex-row items-center">
            <Gift size={22} color={BRAND} />
            <Text className="ml-2 text-title-primary">Phúc lợi</Text>
          </View>
          {[
            'Lương cạnh tranh, thưởng theo hiệu quả.',
            'Làm việc hybrid và trang thiết bị đầy đủ.',
            'Ngân sách học tập, bảo hiểm và team building định kỳ.',
          ].map(item => (
            <View key={item} className="mt-3 flex-row">
              <View className="mt-2 h-2 w-2 rounded-full bg-[#0000ff]" />
              <Text className="ml-3 flex-1 text-body-secondary">{item}</Text>
            </View>
          ))}
        </View>

        <View className="mt-4 flex-row gap-3">
          {facts.map(({ Icon, label, value }) => (
            <View key={label} className="surface-card flex-1 items-center p-3">
              <Icon size={22} color={BRAND} />
              <Text className="mt-2 text-caption-secondary">{label}</Text>
              <Text className="mt-1 text-center text-caption-primary">
                {value}
              </Text>
            </View>
          ))}
        </View>

        <View className="surface-card mt-4 overflow-hidden">
          <Image
            source={{ uri: mapImage }}
            className="h-40 w-full"
            resizeMode="cover"
          />
          <View className="p-4">
            <Text className="text-title-primary">Địa điểm làm việc</Text>
            <View className="mt-2 flex-row items-center">
              <MapPin size={17} color={BRAND} />
              <Text className="ml-2 flex-1 text-body-secondary">
                Tòa nhà Bitexco, 02 Hải Triều, Quận 1
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 border-t border-[rgba(0,0,255,0.08)] bg-white px-4 pb-5 pt-3">
        <TouchableOpacity
          className="btn-primary min-h-[52px]"
          activeOpacity={0.86}
        >
          <Send size={18} color="#FFFFFF" />
          <Text className="text-title-primary text-inverse">
            Ứng tuyển ngay
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

export default JobDetailScreen;

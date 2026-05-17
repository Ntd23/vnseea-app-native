// Description: Renders the VNSEEA jobs listing screen with search, job cards, and detail navigation.
import React from 'react';
import {
  Image,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ArrowLeft,
  Bookmark,
  Briefcase,
  Filter,
  MapPin,
  Search,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';

type JobsNav = NativeStackNavigationProp<RootStackParamList>;

const BRAND = '#0000ff';

const jobs = [
  {
    id: 'job-1',
    title: 'Senior UI/UX Designer',
    company: 'VNSEA Solutions',
    location: 'Quận 1, TP. HCM',
    salary: '25 - 40 Triệu',
    time: 'Đăng 2 giờ trước',
    type: 'Full-time',
    logo: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCoijqBsGZmV2HXBg0LxEE6queMlO6XkzO-k93Am3VJs9pyKlf_r0G_nUjMKy5yJVveEe2rE_rKbFzb02THw79IWfCf7sllhryL0ztJDJU2tOshd-NvPpM27TlAIyMvSzCnidY3y4ABQL4dYmrADrnWYBW794dNLNsjW5ojhG5l3t8tS-6x-zDCOKhxLUPdJan_lxDtcOPrUjh8Wf1a0Itu30BF6XCj0W8TOSHyedRaPdM1x878hcXLh8V7B_3Dw7rjpuhTZRcNyBI',
  },
  {
    id: 'job-2',
    title: 'Digital Marketing Specialist',
    company: 'Mekong Creative',
    location: 'Ba Đình, Hà Nội',
    salary: '15 - 25 Triệu',
    time: 'Đăng 5 giờ trước',
    type: 'Remote',
    logo: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBDhnXi56db7FhNUhK20S2WxRLrJhgHHd9CqNBuBov_VnjwuG7haZXeCfqIG50elHDCPzYBxq2PIbTQn2tAWWzKQLVFJEgaeliFiv12H3f7dbGkiNqCfjmrBNc36ZAJBFJ1Y4cEdgEj6qX7wkAGoxf19ZFlj-hkLcO6Dt7iCmtoUHvv4OI1F-7L8oSlnK9wCGWqe8t3lUnJpGJQcSnBz2oj77R4x-TM5mztQoZwqqq0VBTkAGjME0-qLoUd2YpOOGQPRKUK4br5kQY',
  },
  {
    id: 'job-3',
    title: 'Frontend Developer (React)',
    company: 'SkyTech Asia',
    location: 'Hải Châu, Đà Nẵng',
    salary: '20 - 35 Triệu',
    time: 'Đăng 1 ngày trước',
    type: 'Hybrid',
    logo: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCy-baSZYpClVjVmhbkQecK2X94EIMB_Y1OguftorkWGnMtDazp0HaOuZ-PV-QjEhjhNXuH2Ub4w-egkGV04sUyiC-eSakbNd5fd18piwCujzNlIE_6FgZBnLgU7xHw0YH5ZOPrJpTu1Q43AMdouyNlKw8xZx19uRLk2G28q7xlSpMxZ6dr7pWTHgnDMa2bUIDs6aLGNIuFN-R9NfG_vtv5IG6ue95wUoUssFAzoc7Yl7QacoNJsPu9ACzg0r8npougxFa0BcWnoH0',
  },
  {
    id: 'job-4',
    title: 'Business Analyst',
    company: 'FinLogix Vietnam',
    location: 'Quận 7, TP. HCM',
    salary: '18 - 30 Triệu',
    time: 'Đăng 3 ngày trước',
    type: 'Full-time',
    logo: 'https://lh3.googleusercontent.com/aida-public/AB6AXuASowRT2umgOOnK6b6fgg06aFjGdXt8Btb39WmtqqxetjxPkDGZEjsMilvEjkEQaYtZbHzc0ONA6LmDp0Q4qnNZ6Ni-qETQjGTF1IsoNDW4tXUtSik0qgvUCkYngltiHlx12X_1VFUo1QP5_xUBIeDHipdACT8e_3yRuU3i6nKg4sU4j8oF2BzVrY855wzu9dRF0y6aSEwpASPh7jEFYm-ogjyXf4qBOtVFMYvwKwvWM0Ocb5uIracrGu1guutIhKuVKiyP29gqrwU',
  },
];

function JobsScreen() {
  const navigation = useNavigation<JobsNav>();

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
        <Text className="text-title-primary text-inverse">Việc làm</Text>
        <View className="h-10 w-10" />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-24 pt-4"
        showsVerticalScrollIndicator={false}
      >
        <View className="surface-card flex-row items-center px-4 py-3">
          <Search size={20} color={BRAND} />
          <TextInput
            className="ml-3 flex-1 text-body-primary"
            placeholder="Tìm kiếm việc làm..."
            placeholderTextColor="#94A3B8"
          />
          <TouchableOpacity
            className="h-9 w-9 items-center justify-center rounded-full bg-[#0000ff]/10"
            activeOpacity={0.8}
          >
            <Filter size={18} color={BRAND} />
          </TouchableOpacity>
        </View>

        <View className="mt-5 flex-row gap-3">
          {['Tất cả', 'Gần bạn', 'Lương cao'].map((filter, index) => (
            <TouchableOpacity
              key={filter}
              className={`rounded-full px-4 py-2 ${
                index === 0 ? 'surface-brand' : 'surface-muted'
              }`}
              activeOpacity={0.8}
            >
              <Text
                className={
                  index === 0
                    ? 'text-caption-primary text-inverse'
                    : 'text-caption-secondary'
                }
              >
                {filter}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View className="mt-6 flex-row items-center justify-between">
          <Text className="text-heading">Gợi ý việc làm</Text>
          <Text className="text-caption-primary text-brand">
            {jobs.length} tin mới
          </Text>
        </View>

        {jobs.map(job => (
          <TouchableOpacity
            key={job.id}
            className="surface-card mt-4 p-4"
            activeOpacity={0.88}
            onPress={() => navigation.navigate(ROUTES.JOB_DETAIL)}
          >
            <View className="flex-row">
              <Image
                source={{ uri: job.logo }}
                className="h-14 w-14 rounded-2xl"
                resizeMode="cover"
              />
              <View className="ml-3 flex-1">
                <View className="flex-row items-start justify-between">
                  <Text className="flex-1 text-title-primary" numberOfLines={2}>
                    {job.title}
                  </Text>
                  <Bookmark size={20} color={BRAND} />
                </View>
                <Text className="mt-1 text-caption-primary">{job.company}</Text>
                <View className="mt-2 flex-row items-center">
                  <MapPin size={15} color={BRAND} />
                  <Text className="ml-1 flex-1 text-caption-secondary">
                    {job.location}
                  </Text>
                </View>
              </View>
            </View>

            <View className="mt-4 flex-row items-center justify-between">
              <View>
                <Text className="text-title-primary text-brand">
                  {job.salary}
                </Text>
                <Text className="mt-1 text-caption-secondary">{job.time}</Text>
              </View>
              <View className="flex-row items-center rounded-full bg-[#0000ff]/10 px-3 py-2">
                <Briefcase size={15} color={BRAND} />
                <Text className="ml-1 text-caption-primary text-brand">
                  {job.type}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

export default JobsScreen;

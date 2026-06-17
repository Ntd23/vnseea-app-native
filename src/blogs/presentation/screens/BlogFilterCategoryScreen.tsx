// Description: Renders the VNSEEA blog category filter screen for article browsing.
import React, { useState } from 'react';
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ArrowLeft,
  Car,
  Clock,
  Eye,
  GraduationCap,
  Globe,
  House,
  Landmark,
  Microscope,
  PawPrint,
  Plane,
  Search,
  Star,
  Timer,
  TrendingUp,
  Users,
  Gamepad2,
  Film,
  MoreHorizontal,
  Grid3x3,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import {
  languageStorage,
  type AppLanguage,
} from '../../../shared-kernel/infrastructure/storage/languageStorage';
import { getBlogsCopy } from '../../application/i18n/blogsCopy';

type BlogFilterNav = NativeStackNavigationProp<RootStackParamList>;

const BRAND = '#0000ff';

// Mapping giữa category ID và category name từ API
const categoryMapping: Record<string, string> = {
  vehicles: 'Xe cộ',
  business: 'Kinh tế và Thương mại',
  education: 'Giáo dục',
  movies: 'Phim ảnh',
  gaming: 'Gaming',
  history: 'Lịch sử',
  lifestyle: 'Cách sống',
  pets: 'Thú cưng',
  science: 'Khoa học',
  sports: 'Thể thao',
  travel: 'Du lịch',
  people: 'Con người',
  other: 'Khác',
};

const categories = [
  { id: 'all', label: 'Tất cả', Icon: Grid3x3 },
  { id: 'vehicles', label: 'Xe cộ', Icon: Car },
  { id: 'business', label: 'Kinh doanh', Icon: TrendingUp },
  { id: 'education', label: 'Giáo dục', Icon: GraduationCap },
  { id: 'movies', label: 'Phim ảnh', Icon: Film },
  { id: 'gaming', label: 'Gaming', Icon: Gamepad2 },
  { id: 'history', label: 'Lịch sử', Icon: Landmark },
  { id: 'lifestyle', label: 'Đời sống', Icon: House },
  { id: 'pets', label: 'Thú cưng', Icon: PawPrint },
  { id: 'science', label: 'Khoa học', Icon: Microscope },
  { id: 'sports', label: 'Thể thao', Icon: Users },
  { id: 'travel', label: 'Du lịch', Icon: Plane },
  { id: 'people', label: 'Con người', Icon: Globe },
  { id: 'other', label: 'Khác', Icon: MoreHorizontal },
];

const sortOptions = [
  { id: 'latest', label: 'Mới nhất', Icon: Clock },
  { id: 'popular', label: 'Phổ biến', Icon: Star },
  { id: 'most_viewed', label: 'Nhiều lượt xem', Icon: Eye },
  { id: 'quick_read', label: 'Đọc nhanh', Icon: Timer },
];

function BlogFilterCategoryScreen() {
  const navigation = useNavigation<BlogFilterNav>();
  const route = useRoute();
  const params = route.params as { currentCategory?: string; searchQuery?: string; sortBy?: string; myPostsOnly?: boolean } | undefined;
  const currentCategory = params?.currentCategory;
  const searchQuery = params?.searchQuery || '';
  const sortBy = params?.sortBy || 'latest';
  const myPostsOnly = params?.myPostsOnly || false;
  const [language] = useState<AppLanguage>(languageStorage.getLanguage());
  const copy = getBlogsCopy(language);

  const [selectedCategory, setSelectedCategory] = useState(currentCategory || 'all');
  const [searchText, setSearchText] = useState(searchQuery);
  const [selectedSort, setSelectedSort] = useState(sortBy);
  const [showMyPostsOnly, setShowMyPostsOnly] = useState(myPostsOnly);

  const handleApply = () => {
    // Map category ID to category name for API filtering
    const categoryToSend = selectedCategory === 'all' ? 'all' : (categoryMapping[selectedCategory] || selectedCategory);
    navigation.replace(ROUTES.BLOGS, {
      category: categoryToSend,
      searchQuery: searchText,
      sortBy: selectedSort,
      myPostsOnly: showMyPostsOnly,
    });
  };

  return (
    <SafeAreaView className="flex-1 surface-base" edges={['top']}>
      <FocusAwareStatusBar barStyle="light-content" backgroundColor={BRAND} />

      <View className="surface-brand h-14 flex-row items-center justify-between px-4">
        <TouchableOpacity
          className="h-10 w-10 items-center justify-center rounded-full"
          activeOpacity={0.8}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text className="text-title-primary text-inverse">{copy.filterTitle}</Text>
        <TouchableOpacity
          className="flex-row items-center gap-1.5 rounded-md bg-white/20 px-2.5 py-1.5"
          activeOpacity={0.8}
          onPress={() => navigation.navigate(ROUTES.CREATE_BLOG)}
        >
          <Grid3x3 size={16} color="#FFFFFF" />
          <Text className="text-sm font-medium text-white">{copy.createBlog}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-28 pt-5"
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-heading">Khám phá chủ đề phù hợp</Text>

        {/* Search Input */}
        <View className="mt-4">
          <View className="relative">
            <Search size={18} color="#94A3B8" className="absolute left-3 top-1/2 -translate-y-1/2" />
            <TextInput
              className="surface-card min-h-[44] rounded-lg border border-slate-200 px-10 text-base"
              placeholder={copy.searchPlaceholder}
              placeholderTextColor="#94A3B8"
              value={searchText}
              onChangeText={setSearchText}
            />
          </View>
        </View>

        {/* Categories */}
        <View className="mt-6">
          <Text className="text-body-secondary mb-3">{copy.category}</Text>
          <View className="flex-row flex-wrap gap-2">
            {categories.map(({ Icon, id, label }) => {
              const isSelected = id === selectedCategory;
              return (
                <TouchableOpacity
                  key={id}
                  className={`flex-row items-center gap-1.5 rounded-full px-3 py-2 ${
                    isSelected ? 'bg-[#0000ff]' : 'bg-slate-100'
                  }`}
                  activeOpacity={0.8}
                  onPress={() => setSelectedCategory(id)}
                >
                  <Icon size={14} color={isSelected ? '#FFFFFF' : '#64748B'} />
                  <Text className={`text-sm ${isSelected ? 'text-white' : 'text-slate-700'}`}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Sort Options */}
        <View className="mt-6">
          <Text className="text-body-secondary mb-3">{copy.sort}</Text>
          <View className="flex-row flex-wrap gap-2">
            {sortOptions.map(({ Icon, id, label }) => {
              const isSelected = id === selectedSort;
              return (
                <TouchableOpacity
                  key={id}
                  className={`flex-row items-center gap-1.5 rounded-full px-3 py-2 ${
                    isSelected ? 'bg-[#0000ff]' : 'bg-slate-100'
                  }`}
                  activeOpacity={0.8}
                  onPress={() => setSelectedSort(id)}
                >
                  <Icon size={14} color={isSelected ? '#FFFFFF' : '#64748B'} />
                  <Text className={`text-sm ${isSelected ? 'text-white' : 'text-slate-700'}`}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* My Posts Toggle */}
        <View className="mt-6">
          <TouchableOpacity
            className="flex-row items-center gap-2 rounded-lg border border-slate-200 bg-white p-3"
            activeOpacity={0.8}
            onPress={() => setShowMyPostsOnly(!showMyPostsOnly)}
          >
            {showMyPostsOnly ? (
              <ToggleRight size={20} color={BRAND} />
            ) : (
              <ToggleLeft size={20} color="#94A3B8" />
            )}
            <Text className={`text-base ${showMyPostsOnly ? 'text-[#0000ff]' : 'text-slate-700'}`}>
              {copy.myPosts}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Summary */}
        <View className="mt-6 flex-row items-center gap-2 rounded-lg bg-slate-50 p-3">
          <Search size={14} color="#94A3B8" />
          <Text className="text-caption-secondary">
            {copy.filtering}: {categories.find(c => c.id === selectedCategory)?.label || copy.all} / {sortOptions.find(s => s.id === selectedSort)?.label || copy.latest} {showMyPostsOnly ? `/ ${copy.myPosts}` : `/ ${copy.allAuthors}`}
          </Text>
        </View>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 border-t border-[rgba(0,0,255,0.08)] bg-white px-4 pb-5 pt-3">
        <TouchableOpacity
          className="btn-primary min-h-[52px]"
          activeOpacity={0.86}
          onPress={handleApply}
        >
          <Text className="text-title-primary text-inverse">{copy.apply}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

export default BlogFilterCategoryScreen;

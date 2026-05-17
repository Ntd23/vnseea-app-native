// Description: Renders the VNSEEA search screen with entity tabs and filter access.
import React, { useState } from 'react';
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
  Filter,
  Search,
  SearchX,
  Shuffle,
  Sparkles,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';

type SearchNav = NativeStackNavigationProp<RootStackParamList>;

const tabs = ['Users', 'Pages', 'Groups'];

function SearchScreen() {
  const navigation = useNavigation<SearchNav>();
  const [activeTab, setActiveTab] = useState(tabs[0]);

  return (
    <SafeAreaView className="flex-1 surface-base">
      <StatusBar barStyle="light-content" backgroundColor="#0000FF" />
      <View className="surface-brand h-16 flex-row items-center px-4">
        <TouchableOpacity
          className="h-10 w-10 items-center justify-center rounded-full"
          activeOpacity={0.8}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text className="ml-3 text-heading text-inverse">Tìm kiếm</Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-10 pt-4"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center gap-3">
          <View className="input-shell min-h-[50px] flex-1 flex-row items-center px-4">
            <Search size={20} color="#64748B" />
            <TextInput
              className="ml-3 flex-1 text-body-primary"
              placeholder="Tìm bạn bè, bài viết, trang..."
              placeholderTextColor="#94A3B8"
              returnKeyType="search"
            />
          </View>
          <TouchableOpacity
            className="surface-brand h-[50px] w-[50px] items-center justify-center rounded-2xl"
            activeOpacity={0.85}
            onPress={() => navigation.navigate(ROUTES.SEARCH_FILTER)}
          >
            <Filter size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-8 py-6"
        >
          {tabs.map(tab => (
            <TouchableOpacity
              key={tab}
              activeOpacity={0.8}
              onPress={() => setActiveTab(tab)}
            >
              <Text
                className={`pb-3 text-label-primary ${
                  activeTab === tab
                    ? 'border-b-2 border-blue-600 text-brand'
                    : 'text-slate-500'
                }`}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View className="items-center py-8">
          <View className="relative h-36 w-36 items-center justify-center">
            <SearchX size={100} color="#CBD5E1" strokeWidth={1.5} />
            <Sparkles
              className="absolute right-2 top-2"
              size={24}
              color="#C5CAFF"
            />
          </View>
          <Text className="text-heading">Không tìm thấy kết quả</Text>
          <Text className="mt-3 max-w-[280px] text-center text-body-secondary">
            Thử thay đổi từ khóa, kiểm tra chính tả hoặc dùng bộ lọc khác để mở
            rộng kết quả {activeTab.toLowerCase()}.
          </Text>
          <TouchableOpacity className="btn-primary mt-8 min-h-[54px] w-full max-w-sm">
            <Shuffle size={20} color="#FFFFFF" />
            <Text className="text-title-primary text-inverse">
              Thử tìm kiếm khác
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default SearchScreen;

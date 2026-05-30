// Description: Renders the VNSEEA search screen with user search, suggestions, and follow actions.
// Layout follows Facebook-style design with row-based suggestions and tab-based navigation.
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ArrowLeft,
  MoreHorizontal,
  Search,
  SearchX,
  X,
  Verified,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import { useSearchViewModel } from '../../application/view-models/useSearchViewModel';
import type { SearchResult, SuggestionResult } from '../../domain/types/search.types';

type SearchNav = NativeStackNavigationProp<RootStackParamList>;

const FALLBACK_AVATAR = 'https://cdn-icons-png.flaticon.com/512/847/847969.png';

// User Row Component - Facebook style for friend suggestions
function SuggestionRow({
  user,
  onFollow,
  onPress,
  onRemove,
}: {
  user: SuggestionResult;
  onFollow: () => void;
  onPress: () => void;
  onRemove: () => void;
}) {
  const [isFollowing, setIsFollowing] = useState(user.isFollowing);

  const handleFollow = () => {
    setIsFollowing(!isFollowing);
    onFollow();
  };

  return (
    <View className="flex-row items-center py-3.5 px-4 border-b border-[#F0F2F5] bg-white">
      {/* Clickable Avatar */}
      <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
        <Image
          source={{ uri: user.avatar || FALLBACK_AVATAR }}
          className="h-[74px] w-[74px] rounded-full bg-slate-100"
          resizeMode="cover"
        />
      </TouchableOpacity>

      {/* Main Info */}
      <View className="ml-3.5 flex-1 justify-center">
        <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
          <Text className="text-[16px] font-bold text-[#050505]" numberOfLines={1}>
            {user.name}
          </Text>
        </TouchableOpacity>

        <Text className="text-[13px] text-[#65676B] mt-0.5" numberOfLines={1}>
          {user.mutualFriends && user.mutualFriends > 0
            ? `${user.mutualFriends} bạn chung`
            : 'Gợi ý cho bạn'}
        </Text>

        {/* Buttons Row */}
        <View className="flex-row mt-2.5 gap-2">
          {/* Follow Button */}
          <TouchableOpacity
            className={`flex-1 h-9 rounded-lg justify-center items-center ${
              isFollowing ? 'bg-[#E4E6EB]' : 'bg-[#1877F2]'
            }`}
            activeOpacity={0.85}
            onPress={handleFollow}
          >
            <Text
              className={`text-[14px] font-bold ${
                isFollowing ? 'text-[#050505]' : 'text-white'
              }`}
            >
              {isFollowing ? 'Đang theo dõi' : 'Thêm bạn bè'}
            </Text>
          </TouchableOpacity>

          {/* Remove/Dismiss Button */}
          <TouchableOpacity
            className="flex-1 h-9 rounded-lg bg-[#E4E6EB] justify-center items-center"
            activeOpacity={0.85}
            onPress={onRemove}
          >
            <Text className="text-[14px] font-bold text-[#050505]">Gỡ</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// User List Card Component - Facebook style for search results
function UserListCard({
  user,
  onFollow,
  onPress,
}: {
  user: SearchResult;
  onFollow: () => void;
  onPress: () => void;
}) {
  const [isFollowing, setIsFollowing] = useState(user.isFollowing);

  const handleFollow = () => {
    setIsFollowing(!isFollowing);
    onFollow();
  };

  return (
    <View className="flex-row items-center py-3.5 px-4 border-b border-[#F0F2F5] bg-white">
      {/* Clickable Avatar */}
      <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
        <Image
          source={{ uri: user.avatar || FALLBACK_AVATAR }}
          className="h-14 w-14 rounded-full bg-slate-100"
          resizeMode="cover"
        />
      </TouchableOpacity>

      {/* Main Info */}
      <View className="ml-3.5 flex-1 justify-center">
        <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
          <View className="flex-row items-center">
            <Text className="text-[15px] font-bold text-[#050505] mr-1" numberOfLines={1}>
              {user.name}
            </Text>
            {user.verified && (
              <Verified size={15} color="#1877F2" fill="#1877F2" />
            )}
          </View>
        </TouchableOpacity>
        
        <Text className="text-[13px] text-[#65676B] mt-0.5">@{user.username}</Text>
        
        {user.mutualFriends && user.mutualFriends > 0 && (
          <Text className="text-[13px] text-[#65676B] mt-0.5">
            {user.mutualFriends} bạn chung
          </Text>
        )}
      </View>

      {/* Action Buttons */}
      <View className="flex-row items-center gap-2">
        <TouchableOpacity
          className={`rounded-lg px-4 h-9 justify-center items-center ${
            isFollowing ? 'bg-[#E4E6EB]' : 'bg-[#1877F2]'
          }`}
          activeOpacity={0.85}
          onPress={handleFollow}
        >
          <Text
            className={`text-[13px] font-bold ${
              isFollowing ? 'text-[#050505]' : 'text-white'
            }`}
          >
            {isFollowing ? 'Đang theo dõi' : 'Theo dõi'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="h-9 w-9 items-center justify-center rounded-full bg-[#E4E6EB]"
          activeOpacity={0.85}
        >
          <MoreHorizontal size={16} color="#050505" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Empty State Component
function EmptyState({ message, description }: { message?: string; description?: string }) {
  return (
    <View className="flex-1 items-center justify-center py-20 px-6">
      <SearchX size={64} color="#65676B" strokeWidth={1.5} />
      <Text className="mt-4 text-[16px] font-bold text-[#050505]">{message || 'Không tìm thấy kết quả'}</Text>
      <Text className="mt-2 text-[14px] text-center text-[#65676B] leading-relaxed">
        {description || 'Thử thay đổi từ khóa hoặc kiểm tra lại chính tả'}
      </Text>
    </View>
  );
}

function SearchScreen() {
  const navigation = useNavigation<SearchNav>();
  const {
    searchQuery,
    setSearchQuery,
    searchResults,
    suggestions,
    isLoading,
    isLoadingSuggestions,
    error,
    searchUsers,
    toggleFollow,
    clearSearch,
  } = useSearchViewModel();

  const [activeTab, setActiveTab] = useState<'suggestions' | 'people'>('suggestions');
  const [hiddenUserIds, setHiddenUserIds] = useState<string[]>([]);

  const handleSearch = useCallback(() => {
    if (searchQuery.trim()) {
      searchUsers(searchQuery);
      setActiveTab('people');
    }
  }, [searchQuery, searchUsers]);

  const handleClear = useCallback(() => {
    clearSearch();
    setActiveTab('suggestions');
  }, [clearSearch]);

  const handleFollow = useCallback(
    (userId: string, isCurrentlyFollowing: boolean) => {
      toggleFollow(userId, isCurrentlyFollowing);
    },
    [toggleFollow],
  );

  const handleUserPress = useCallback(
    (userId: string) => {
      navigation.navigate(ROUTES.PROFILE, { userId });
    },
    [navigation],
  );

  const handleRemoveSuggestion = useCallback((userId: string) => {
    setHiddenUserIds(prev => [...prev, userId]);
  }, []);

  const visibleSuggestions = suggestions.filter(s => !hiddenUserIds.includes(s.userId));

  const renderSuggestionItem = ({ item }: { item: SuggestionResult }) => (
    <SuggestionRow
      user={item}
      onFollow={() => handleFollow(item.userId, item.isFollowing)}
      onPress={() => handleUserPress(item.userId)}
      onRemove={() => handleRemoveSuggestion(item.userId)}
    />
  );

  const renderUserItem = ({ item }: { item: SearchResult }) => (
    <UserListCard
      user={item}
      onFollow={() => handleFollow(item.userId, item.isFollowing)}
      onPress={() => handleUserPress(item.userId)}
    />
  );

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Combined Header & Search Bar (Facebook style) */}
      <View className="flex-row items-center px-4 py-2 border-b border-[#F0F2F5]">
        <TouchableOpacity
          className="h-10 w-10 items-center justify-center rounded-full mr-1"
          activeOpacity={0.8}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={22} color="#050505" />
        </TouchableOpacity>

        <View className="flex-1 flex-row items-center rounded-full bg-[#F0F2F5] px-4 h-10">
          <Search size={18} color="#65676B" />
          <TextInput
            className="ml-2 flex-1 text-[15px] text-[#050505] p-0"
            placeholder="Tìm kiếm mọi người..."
            placeholderTextColor="#65676B"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={handleClear} className="p-1">
              <X size={18} color="#65676B" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tabs */}
      <View className="flex-row border-b border-[#F0F2F5] px-4 bg-white">
        <TouchableOpacity
          className={`pb-3 pt-3 pr-4 flex-1 items-center ${
            activeTab === 'suggestions'
              ? 'border-b-2 border-[#1877F2]'
              : ''
          }`}
          onPress={() => setActiveTab('suggestions')}
        >
          <Text
            className={`text-[14px] font-bold ${
              activeTab === 'suggestions' ? 'text-[#1877F2]' : 'text-[#65676B]'
            }`}
          >
            Gợi ý
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`pb-3 pt-3 pl-4 flex-1 items-center ${
            activeTab === 'people' ? 'border-b-2 border-[#1877F2]' : ''
          }`}
          onPress={() => setActiveTab('people')}
        >
          <Text
            className={`text-[14px] font-bold ${
              activeTab === 'people' ? 'text-[#1877F2]' : 'text-[#65676B]'
            }`}
          >
            Mọi người {searchResults.length > 0 ? `(${searchResults.length})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'suggestions' ? (
        <View className="flex-1 bg-[#F0F2F5]/30">
          {/* Header Title */}
          <View className="px-4 py-3 bg-[#F0F2F5]/20">
            <Text className="text-[17px] font-bold text-[#050505]">Những người bạn có thể biết</Text>
          </View>

          {isLoadingSuggestions ? (
            <View className="flex-1 items-center justify-center py-10">
              <ActivityIndicator color="#1877F2" />
            </View>
          ) : visibleSuggestions.length > 0 ? (
            <FlatList
              data={visibleSuggestions}
              renderItem={renderSuggestionItem}
              keyExtractor={item => item.userId}
              contentContainerStyle={{ paddingBottom: 20 }}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View className="flex-1 items-center justify-center py-10 px-6">
              <Text className="text-[14px] text-[#65676B] text-center">
                Không có gợi ý nào dành cho bạn vào lúc này.
              </Text>
            </View>
          )}
        </View>
      ) : (
        <FlatList
          data={searchResults}
          renderItem={renderUserItem}
          keyExtractor={item => item.userId}
          ListEmptyComponent={
            isLoading || isLoadingSuggestions ? (
              <View className="items-center py-12">
                <ActivityIndicator color="#1877F2" />
              </View>
            ) : searchQuery.length > 0 ? (
              <EmptyState 
                message="Không tìm thấy kết quả" 
                description="Không tìm thấy người dùng phù hợp với từ khóa của bạn." 
              />
            ) : (
              <EmptyState 
                message="Chưa có người dùng để hiển thị" 
                description="Bạn vẫn có thể nhập tên hoặc tài khoản để tìm kiếm." 
              />
            )
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Error Toast */}
      {error && (
        <View className="absolute bottom-6 left-4 right-4 rounded-xl bg-red-50 p-4 border border-red-200">
          <Text className="text-[13px] text-red-600 font-semibold">{error}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

export default SearchScreen;

// Description: Renders the VNSEEA search screen with user search, suggestions, and follow actions.
// Layout follows reference design with grid suggestions and tab-based navigation.
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
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
  Check,
  MoreHorizontal,
  Search,
  SearchX,
  UserPlus,
  X,
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
const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_GAP = 12;
const HORIZONTAL_PADDING = 16;
const CARD_WIDTH = (SCREEN_WIDTH - HORIZONTAL_PADDING * 2 - CARD_GAP) / 2;

// User Card Component - Grid layout for suggestions
function SuggestionCard({
  user,
  onFollow,
  onPress,
}: {
  user: SuggestionResult;
  onFollow: () => void;
  onPress: () => void;
}) {
  const [isFollowing, setIsFollowing] = useState(user.isFollowing);

  const handleFollow = () => {
    setIsFollowing(!isFollowing);
    onFollow();
  };

  return (
    <TouchableOpacity
      className="surface-card mb-3 w-full items-center p-4"
      activeOpacity={0.8}
      onPress={onPress}
      style={{ width: CARD_WIDTH }}
    >
      <Image
        source={{ uri: user.avatar || FALLBACK_AVATAR }}
        className="h-20 w-20 rounded-full"
        resizeMode="cover"
      />
      <Text className="mt-2 text-center text-title-primary" numberOfLines={1}>
        {user.name}
      </Text>
      {user.mutualFriends && user.mutualFriends > 0 ? (
        <Text className="mt-1 text-caption-secondary">
          {user.mutualFriends} bạn chung
        </Text>
      ) : (
        <Text className="mt-1 text-caption-secondary">Suggested for you</Text>
      )}
      <TouchableOpacity
        className={`mt-3 w-full items-center rounded-lg py-2 ${
          isFollowing ? 'bg-slate-100' : 'bg-blue-500'
        }`}
        activeOpacity={0.8}
        onPress={handleFollow}
      >
        <Text
          className={`text-caption-primary ${
            isFollowing ? 'text-slate-600' : 'text-white'
          }`}
        >
          {isFollowing ? 'Followed' : 'Follow'}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

// User Card Component - List layout for search results
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
    <TouchableOpacity
      className="surface-card mb-3 flex-row items-center p-4"
      activeOpacity={0.8}
      onPress={onPress}
    >
      <Image
        source={{ uri: user.avatar || FALLBACK_AVATAR }}
        className="h-14 w-14 rounded-full"
        resizeMode="cover"
      />
      <View className="ml-3 flex-1">
        <View className="flex-row items-center">
          <Text className="text-title-primary">{user.name}</Text>
          {user.verified && (
            <View className="ml-1 h-4 w-4 items-center justify-center rounded-full bg-blue-500">
              <Text className="text-[8px] text-white">✓</Text>
            </View>
          )}
        </View>
        <Text className="text-caption-secondary">@{user.username}</Text>
        {user.mutualFriends && user.mutualFriends > 0 && (
          <View className="mt-1 flex-row items-center">
            <UserPlus size={12} color="#64748B" />
            <Text className="ml-1 text-caption-secondary">
              {user.mutualFriends} bạn chung
            </Text>
          </View>
        )}
      </View>
      <View className="flex-row items-center gap-2">
        <TouchableOpacity
          className={`rounded-lg px-4 py-2 ${
            isFollowing ? 'bg-slate-100' : 'bg-blue-500'
          }`}
          activeOpacity={0.8}
          onPress={handleFollow}
        >
          <Text
            className={`text-caption-primary ${
              isFollowing ? 'text-slate-600' : 'text-white'
            }`}
          >
            {isFollowing ? 'Followed' : 'Follow'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="h-8 w-8 items-center justify-center rounded-full bg-slate-100"
          activeOpacity={0.8}
        >
          <MoreHorizontal size={16} color="#64748B" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// Empty State Component
function EmptyState({ message }: { message?: string }) {
  return (
    <View className="flex-1 items-center justify-center py-10">
      <SearchX size={80} color="#CBD5E1" strokeWidth={1.5} />
      <Text className="mt-4 text-heading">{message || 'Không tìm thấy'}</Text>
      <Text className="mt-2 max-w-[280px] text-center text-body-secondary">
        Thử thay đổi từ khóa hoặc kiểm tra lại
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

  const renderSuggestionItem = ({ item, index }: { item: SuggestionResult; index: number }) => {
    const isLeftColumn = index % 2 === 0;
    return (
      <View style={{ width: CARD_WIDTH }} className={isLeftColumn ? 'mr-3' : ''}>
        <SuggestionCard
          user={item}
          onFollow={() => handleFollow(item.userId, item.isFollowing)}
          onPress={() => handleUserPress(item.userId)}
        />
      </View>
    );
  };

  const renderUserItem = ({ item }: { item: SearchResult }) => (
    <UserListCard
      user={item}
      onFollow={() => handleFollow(item.userId, item.isFollowing)}
      onPress={() => handleUserPress(item.userId)}
    />
  );

  return (
    <SafeAreaView className="flex-1 surface-base">
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header with Back Button */}
      <View className="h-14 flex-row items-center px-4">
        <TouchableOpacity
          className="h-10 w-10 items-center justify-center rounded-full"
          activeOpacity={0.8}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={22} color="#0F172A" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View className="px-4 pb-3">
        <View className="flex-row items-center rounded-full bg-slate-100 px-4 py-3">
          <Search size={20} color="#64748B" />
          <TextInput
            className="ml-3 flex-1 text-body-primary"
            placeholder="Search for people"
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={handleClear}>
              <X size={20} color="#64748B" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tabs */}
      <View className="flex-row border-b border-slate-200 px-4">
        <TouchableOpacity
          className={`pb-3 pr-4 ${
            activeTab === 'suggestions'
              ? 'border-b-2 border-blue-600'
              : ''
          }`}
          onPress={() => setActiveTab('suggestions')}
        >
          <Text
            className={`text-label-primary ${
              activeTab === 'suggestions' ? 'text-brand' : 'text-slate-500'
            }`}
          >
            Suggestions
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`pb-3 pl-4 ${
            activeTab === 'people' ? 'border-b-2 border-blue-600' : ''
          }`}
          onPress={() => setActiveTab('people')}
        >
          <Text
            className={`text-label-primary ${
              activeTab === 'people' ? 'text-brand' : 'text-slate-500'
            }`}
          >
            People {searchResults.length > 0 ? `(${searchResults.length})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'suggestions' ? (
        <View className="flex-1 px-4 pt-4">
          {/* Header with See All */}
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-heading">People you may know</Text>
          </View>

          {isLoadingSuggestions ? (
            <View className="flex-1 items-center justify-center py-10">
              <ActivityIndicator color="#0000FF" />
            </View>
          ) : suggestions.length > 0 ? (
            <FlatList
              data={suggestions}
              renderItem={renderSuggestionItem}
              keyExtractor={item => item.userId}
              numColumns={2}
              columnWrapperStyle={{ justifyContent: 'flex-start' }}
              contentContainerStyle={{ paddingBottom: 20 }}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View className="flex-1 items-center justify-center py-10">
              <Text className="text-body-secondary">
                No suggestions available
              </Text>
            </View>
          )}
        </View>
      ) : (
        <FlatList
          data={searchResults}
          renderItem={renderUserItem}
          keyExtractor={item => item.userId}
          contentContainerClassName="px-4 py-4"
          ListEmptyComponent={
            isLoading ? (
              <View className="items-center py-10">
                <ActivityIndicator color="#0000FF" />
              </View>
            ) : searchQuery.length > 0 ? (
              <EmptyState message="No people found" />
            ) : (
              <EmptyState message="Search for people" />
            )
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Error Toast */}
      {error && (
        <View className="absolute bottom-6 left-4 right-4 rounded-xl bg-red-50 p-4">
          <Text className="text-caption-primary text-red-600">{error}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

export default SearchScreen;
// Description: Renders the VNSEEA search screen with user search, suggestions, and follow actions.
// Layout follows Facebook-style design with row-based suggestions and tab-based navigation.
import React, { useCallback, useState, useEffect } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Pressable,
  type LayoutChangeEvent,
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
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
  FadeInDown,
  FadeOutLeft,
  LinearTransition,
} from 'react-native-reanimated';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import { useSearchViewModel } from '../../application/view-models/useSearchViewModel';
import type { SearchResult, SuggestionResult } from '../../domain/types/search.types';
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';

const SEARCH_COPY = {
  vi: {
    placeholder: 'Tìm kiếm mọi người...',
    suggestionsTab: 'Gợi ý',
    peopleTab: 'Mọi người',
    suggestionsHeader: 'Những người bạn có thể biết',
    mutualFriendsSuffix: 'bạn chung',
    suggestedForYou: 'Gợi ý cho bạn',
    following: 'Đang theo dõi',
    addFriend: 'Thêm bạn bè',
    follow: 'Theo dõi',
    removeBtn: 'Gỡ',
    noSuggestions: 'Không có gợi ý nào dành cho bạn vào lúc này.',
    noResults: 'Không tìm thấy kết quả',
    noResultsDesc: 'Không tìm thấy người dùng phù hợp với từ khóa của bạn.',
    emptyState: 'Chưa có người dùng để hiển thị',
    emptyStateDesc: 'Bạn vẫn có thể nhập tên hoặc tài khoản để tìm kiếm.',
  },
  en: {
    placeholder: 'Search people...',
    suggestionsTab: 'Suggestions',
    peopleTab: 'People',
    suggestionsHeader: 'People you may know',
    mutualFriendsSuffix: 'mutual friends',
    suggestedForYou: 'Suggested for you',
    following: 'Following',
    addFriend: 'Add Friend',
    follow: 'Follow',
    removeBtn: 'Remove',
    noSuggestions: 'No suggestions available for you at this time.',
    noResults: 'No results found',
    noResultsDesc: 'No users match your search keyword.',
    emptyState: 'No users to display',
    emptyStateDesc: 'You can type a name or username to search.',
  },
};

type SearchNav = NativeStackNavigationProp<RootStackParamList>;

const FALLBACK_AVATAR = 'https://cdn-icons-png.flaticon.com/512/847/847969.png';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Custom ScaleButton for spring pressing effects (2026 UX standard)
interface ScaleButtonProps {
  children: React.ReactNode;
  onPress?: () => void;
  className?: string;
  style?: any;
  disabled?: boolean;
}

function ScaleButton({
  children,
  onPress,
  className,
  style,
  disabled = false,
}: ScaleButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    if (disabled) return;
    scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
  }, [disabled, scale]);

  const handlePressOut = useCallback(() => {
    if (disabled) return;
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  }, [disabled, scale]);

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      className={className}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}

// Sliding Indicator Segmented Tab Control using Reanimated
function SegmentedTabBar({
  tabs,
  activeTab,
  onChange,
}: {
  tabs: Array<{ id: 'suggestions' | 'people'; label: string }>;
  activeTab: 'suggestions' | 'people';
  onChange: (id: 'suggestions' | 'people') => void;
}) {
  const [containerWidth, setContainerWidth] = useState(0);
  const indicatorX = useSharedValue(0);

  const tabWidth = containerWidth / 2;

  useEffect(() => {
    const index = tabs.findIndex(t => t.id === activeTab);
    if (index !== -1 && containerWidth > 0) {
      indicatorX.value = withTiming(index * tabWidth, {
        duration: 250,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [activeTab, containerWidth, tabWidth, tabs, indicatorX]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: tabWidth - 8,
  }));

  const handleContainerLayout = useCallback((event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    setContainerWidth(width);
  }, []);

  return (
    <View className="px-4 py-2 bg-white border-b border-slate-100">
      <View
        onLayout={handleContainerLayout}
        className="relative flex-row rounded-2xl bg-slate-100/80 p-1 h-12 items-center"
      >
        {containerWidth > 0 && (
          <Animated.View
            pointerEvents="none"
            className="absolute top-1 bottom-1 left-1 rounded-xl bg-white shadow-sm border border-slate-200/10"
            style={[
              {
                shadowColor: '#000000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 3,
                elevation: 1,
              },
              indicatorStyle,
            ]}
          />
        )}
        {tabs.map(tab => {
          const isActive = tab.id === activeTab;
          return (
            <TouchableOpacity
              key={tab.id}
              className="flex-1 items-center justify-center h-10"
              onPress={() => onChange(tab.id)}
              activeOpacity={0.8}
            >
              <Text
                className={`text-[14px] font-bold ${
                  isActive ? 'text-[#0000ff]' : 'text-slate-500'
                }`}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// User Row Component - Modern Floating Card Design
function SuggestionRow({
  user,
  onFollow,
  onPress,
  onRemove,
  copy,
}: {
  user: SuggestionResult;
  onFollow: () => void;
  onPress: () => void;
  onRemove: () => void;
  copy: any;
}) {
  const [isFollowing, setIsFollowing] = useState(user.isFollowing);

  const handleFollow = () => {
    setIsFollowing(!isFollowing);
    onFollow();
  };

  return (
    <View
      className="mx-4 my-2 flex-row items-center rounded-3xl bg-white p-4 border border-blue-500/5"
      style={{
        shadowColor: '#0000ff',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 16,
        elevation: 2,
      }}
    >
      {/* Clickable Avatar */}
      <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
        <Image
          source={{ uri: user.avatar || FALLBACK_AVATAR }}
          className="h-[74px] w-[74px] rounded-full bg-slate-100"
          resizeMode="cover"
        />
      </TouchableOpacity>

      {/* Main Info */}
      <View className="ml-3.5 flex-1 justify-center">
        <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
          <Text className="text-[15px] font-bold text-slate-800" numberOfLines={1}>
            {user.name}
          </Text>
        </TouchableOpacity>

        <Text className="text-[13px] text-slate-500 mt-0.5" numberOfLines={1}>
          {user.mutualFriends && user.mutualFriends > 0
            ? `${user.mutualFriends} ${copy.mutualFriendsSuffix}`
            : copy.suggestedForYou}
        </Text>

        {/* Buttons Row */}
        <View className="flex-row mt-2.5 gap-2">
          {/* Follow Button */}
          <ScaleButton
            className={`flex-1 h-9 rounded-xl justify-center items-center ${
              isFollowing ? 'bg-slate-100' : 'bg-[#0000ff]'
            }`}
            onPress={handleFollow}
          >
            <Text
              className={`text-[13px] font-bold ${
                isFollowing ? 'text-slate-700' : 'text-white'
              }`}
            >
              {isFollowing ? copy.following : copy.addFriend}
            </Text>
          </ScaleButton>

          {/* Remove/Dismiss Button */}
          <ScaleButton
            className="flex-1 h-9 rounded-xl bg-slate-100 justify-center items-center"
            onPress={onRemove}
          >
            <Text className="text-[13px] font-bold text-slate-600">{copy.removeBtn}</Text>
          </ScaleButton>
        </View>
      </View>
    </View>
  );
}

// User List Card Component - Modern Flat Card Design
function UserListCard({
  user,
  onFollow,
  onPress,
  copy,
}: {
  user: SearchResult;
  onFollow: () => void;
  onPress: () => void;
  copy: any;
}) {
  const [isFollowing, setIsFollowing] = useState(user.isFollowing);

  const handleFollow = () => {
    setIsFollowing(!isFollowing);
    onFollow();
  };

  return (
    <View
      className="mx-4 my-2 flex-row items-center rounded-3xl bg-white p-4 border border-blue-500/5"
      style={{
        shadowColor: '#0000ff',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 16,
        elevation: 2,
      }}
    >
      {/* Clickable Avatar */}
      <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
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
            <Text className="text-[15px] font-bold text-slate-800 mr-1" numberOfLines={1}>
              {user.name}
            </Text>
            {user.verified && (
              <Verified size={15} color="#0000ff" fill="#0000ff" />
            )}
          </View>
        </TouchableOpacity>

        <Text className="text-[13px] text-slate-400 mt-0.5">@{user.username}</Text>

        {user.mutualFriends && user.mutualFriends > 0 && (
          <Text className="text-[13px] text-slate-500 mt-0.5">
            {user.mutualFriends} {copy.mutualFriendsSuffix}
          </Text>
        )}
      </View>

      {/* Action Buttons */}
      <View className="flex-row items-center gap-2">
        <ScaleButton
          className={`rounded-xl px-4 h-9 justify-center items-center ${
            isFollowing ? 'bg-slate-100' : 'bg-[#0000ff]'
          }`}
          onPress={handleFollow}
        >
          <Text
            className={`text-[13px] font-bold ${
              isFollowing ? 'text-slate-700' : 'text-white'
            }`}
          >
            {isFollowing ? copy.following : copy.follow}
          </Text>
        </ScaleButton>

        <ScaleButton
          className="h-9 w-9 items-center justify-center rounded-full bg-slate-100"
        >
          <MoreHorizontal size={16} color="#475569" />
        </ScaleButton>
      </View>
    </View>
  );
}

// Empty State Component with entry animation
function EmptyState({ message, description }: { message?: string; description?: string }) {
  return (
    <Animated.View
      entering={FadeInDown ? FadeInDown.duration(400).springify().damping(18) : undefined}
      className="flex-1 items-center justify-center py-20 px-6"
    >
      <SearchX size={64} color="#94a3b8" strokeWidth={1.5} />
      <Text className="mt-4 text-[16px] font-bold text-slate-800">{message}</Text>
      <Text className="mt-2 text-[14px] text-center text-slate-500 leading-relaxed">
        {description}
      </Text>
    </Animated.View>
  );
}

function SearchScreen() {
  const navigation = useNavigation<SearchNav>();
  const language = useAppLanguage();
  const copy = SEARCH_COPY[language];
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

  const renderSuggestionItem = useCallback(({ item, index }: { item: SuggestionResult; index: number }) => (
    <Animated.View
      entering={FadeInDown ? FadeInDown.delay(index * 50).springify().damping(15) : undefined}
      exiting={FadeOutLeft ? FadeOutLeft.duration(200) : undefined}
      layout={LinearTransition ? LinearTransition.springify().damping(15) : undefined}
    >
      <SuggestionRow
        user={item}
        onFollow={() => handleFollow(item.userId, item.isFollowing)}
        onPress={() => handleUserPress(item.userId)}
        onRemove={() => handleRemoveSuggestion(item.userId)}
        copy={copy}
      />
    </Animated.View>
  ), [copy, handleFollow, handleUserPress, handleRemoveSuggestion]);

  const renderUserItem = useCallback(({ item, index }: { item: SearchResult; index: number }) => (
    <Animated.View
      entering={FadeInDown ? FadeInDown.delay(index * 40).springify().damping(15) : undefined}
      layout={LinearTransition ? LinearTransition.springify().damping(15) : undefined}
    >
      <UserListCard
        user={item}
        onFollow={() => handleFollow(item.userId, item.isFollowing)}
        onPress={() => handleUserPress(item.userId)}
        copy={copy}
      />
    </Animated.View>
  ), [copy, handleFollow, handleUserPress]);

  const tabs = [
    { id: 'suggestions' as const, label: copy.suggestionsTab },
    { id: 'people' as const, label: copy.peopleTab + (searchResults.length > 0 ? ` (${searchResults.length})` : '') },
  ];

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]" edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Combined Header & Search Bar (Facebook style with ScaleButtons) */}
      <View className="flex-row items-center px-4 py-3 border-b border-slate-100 bg-white">
        <ScaleButton
          className="h-10 w-10 items-center justify-center rounded-full mr-2 bg-slate-50 border border-slate-100/50"
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={22} color="#0000ff" />
        </ScaleButton>

        <View className="flex-1 flex-row items-center rounded-2xl bg-slate-100 px-4 h-11 border border-slate-200/20">
          <Search size={18} color="#64748b" />
          <TextInput
            className="ml-2 flex-1 text-[15px] text-slate-900 p-0 font-medium"
            placeholder={copy.placeholder}
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <ScaleButton onPress={handleClear} className="p-1">
              <X size={18} color="#64748b" />
            </ScaleButton>
          )}
        </View>
      </View>

      {/* Sliding Segmented Tab Control */}
      <SegmentedTabBar
        tabs={tabs}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* Content */}
      {activeTab === 'suggestions' ? (
        <View className="flex-1 bg-slate-50/30">
          {/* Header Title */}
          <View className="px-5 py-3.5 bg-slate-50/50">
            <Text className="text-[13px] font-bold text-slate-400 uppercase tracking-wider">
              {copy.suggestionsHeader}
            </Text>
          </View>

          {isLoadingSuggestions ? (
            <View className="flex-1 items-center justify-center py-10">
              <ActivityIndicator color="#0000ff" />
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
            <View className="flex-1 items-center justify-center py-16 px-6">
              <Text className="text-[14px] text-slate-500 text-center leading-relaxed">
                {copy.noSuggestions}
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
              <View className="items-center py-16">
                <ActivityIndicator color="#0000ff" />
              </View>
            ) : searchQuery.length > 0 ? (
              <EmptyState
                message={copy.noResults}
                description={copy.noResultsDesc}
              />
            ) : (
              <EmptyState
                message={copy.emptyState}
                description={copy.emptyStateDesc}
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


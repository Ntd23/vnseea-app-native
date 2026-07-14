// Description: Create group chat screen - modern UI with real friends API
// English description: Allows users to create new group conversations with beautiful animations.
import React, { useState, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Check,
  ChevronLeft,
  Group,
  Search,
  Send,
  Sparkles,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../navigation/types';
import { ROUTES } from '../../../navigation/constants/routes';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';
import { useGroupChatViewModel } from '../../application/view-models/useGroupChatViewModel';
import type { GroupChatItem, GroupChatUser } from '../../domain/types/groupChat.types';
import type { ChatItem } from '../../domain/types/messages.types';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';

type CreateGroupNav = NativeStackNavigationProp<RootStackParamList>;

const BRAND = '#0000ff';
const BRAND_LIGHT = 'rgba(0, 0, 255, 0.08)';
const BRAND_MEDIUM = 'rgba(0, 0, 255, 0.15)';
const MAX_GROUP_NAME = 25;
const MIN_GROUP_NAME = 4;
const MAX_MEMBERS = 50;

function mapCreatedGroupToChat(group: GroupChatItem): ChatItem {
  const chatId = String(group.id);
  return {
    id: `group:${chatId}`,
    chatId,
    chatType: 'group',
    groupId: String(group.id),
    userId: chatId,
    username: '',
    name: group.group_name || 'Nhóm chat',
    avatar: group.avatar || '',
    lastMessage: group.last_message?.text ?? '',
    lastMessageTime: Number(group.last_message?.time ?? 0),
    unreadCount: 0,
    isOnline: false,
    isVerified: false,
  };
}

// Animated checkbox component
function AnimatedCheckbox({
  checked,
  onPress,
  size = 24,
}: {
  checked: boolean;
  onPress: () => void;
  size?: number;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();
    onPress();
  };

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={handlePress}>
      <Animated.View
        style={{
          transform: [{ scale: scaleAnim }],
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 2,
          borderColor: checked ? BRAND : '#d1d5db',
          backgroundColor: checked ? BRAND : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {checked && <Check size={size * 0.6} color="#ffffff" strokeWidth={3} />}
      </Animated.View>
    </TouchableOpacity>
  );
}

// Avatar component with fallback
function UserAvatar({
  user,
  size = 48,
  showOnline = false,
}: {
  user: GroupChatUser;
  size?: number;
  showOnline?: boolean;
}) {
  const [imageError, setImageError] = useState(false);

  return (
    <View className="relative">
      {user.avatar && !imageError ? (
        <Image
          source={{ uri: user.avatar }}
          className="rounded-full"
          style={{ width: size, height: size }}
          resizeMode="cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <View
          className="items-center justify-center rounded-full"
          style={{
            width: size,
            height: size,
            backgroundColor: BRAND_MEDIUM,
          }}
        >
          <Text
            style={{
              fontSize: size * 0.4,
              fontWeight: '700',
              color: BRAND,
            }}
          >
            {user.first_name?.[0]?.toUpperCase() ?? '?'}
          </Text>
        </View>
      )}
      {showOnline && (
        <View className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
      )}
    </View>
  );
}

// User item component with animation
function FriendItem({
  user,
  isSelected,
  onToggle,
  index,
}: {
  user: GroupChatUser;
  isSelected: boolean;
  onToggle: () => void;
  index: number;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        delay: index * 50,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        delay: index * 50,
        useNativeDriver: true,
      }),
    ]).start();
  }, [index, opacity, translateY]);

  return (
    <Animated.View
      style={{
        opacity,
        transform: [{ translateY }],
      }}
    >
      <TouchableOpacity
        className="flex-row items-center py-3 px-4 active:bg-slate-50"
        activeOpacity={0.7}
        onPress={onToggle}
      >
        <View className="relative">
          <UserAvatar user={user} size={48} />
          {isSelected && (
            <View className="absolute -bottom-1 -right-1 rounded-full bg-[#0000ff] p-1">
              <Check size={12} color="#ffffff" strokeWidth={3} />
            </View>
          )}
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-[15px] font-semibold text-slate-800">
            {user.first_name} {user.last_name}
          </Text>
          <Text className="text-[12px] text-slate-500">@{user.username}</Text>
        </View>
        <AnimatedCheckbox checked={isSelected} onPress={onToggle} />
      </TouchableOpacity>
    </Animated.View>
  );
}

// Selected members chip component
function SelectedMemberChip({
  user,
  onRemove,
}: {
  user: GroupChatUser;
  onRemove: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  return (
    <Animated.View
      style={{
        transform: [{ scale: scaleAnim }],
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: BRAND_LIGHT,
        borderRadius: 20,
        paddingVertical: 6,
        paddingLeft: 8,
        paddingRight: 4,
        marginRight: 8,
        marginBottom: 8,
      }}
    >
      <UserAvatar user={user} size={24} />
      <Text className="ml-2 mr-1 text-[13px] font-medium text-slate-700">
        {user.first_name}
      </Text>
      <TouchableOpacity
        onPress={onRemove}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        className="rounded-full bg-slate-200 p-1"
      >
        <X size={12} color="#64748b" />
      </TouchableOpacity>
    </Animated.View>
  );
}

// Loading skeleton component
function LoadingSkeleton() {
  return (
    <View className="px-4 py-3">
      {[1, 2, 3, 4, 5].map(i => (
        <View key={i} className="flex-row items-center py-3">
          <View className="h-12 w-12 rounded-full bg-slate-200" />
          <View className="ml-3 flex-1">
            <View className="mb-2 h-4 w-32 rounded bg-slate-200" />
            <View className="h-3 w-20 rounded bg-slate-100" />
          </View>
        </View>
      ))}
    </View>
  );
}

// Empty state component
function EmptyState({
  icon: IconComponent,
  title,
  subtitle,
}: {
  icon: React.ComponentType<{ size: number; color: string }>;
  title: string;
  subtitle?: string;
}) {
  return (
    <View className="flex-1 items-center justify-center py-16">
      <View className="mb-4 rounded-full bg-slate-100 p-4">
        <IconComponent size={32} color="#94a3b8" />
      </View>
      <Text className="text-[16px] font-medium text-slate-600">{title}</Text>
      {subtitle && <Text className="mt-1 text-[13px] text-slate-400">{subtitle}</Text>}
    </View>
  );
}

export default function CreateGroupScreen() {
  const navigation = useNavigation<CreateGroupNav>();
  const route = useRoute<
    RouteProp<RootStackParamList, typeof ROUTES.CREATE_GROUP_CHAT>
  >();
  const {
    createGroup,
    isCreating,
    suggestedFriends,
    isLoadingFriends,
    friendsError,
    loadSuggestedFriends,
  } = useGroupChatViewModel();

  const [groupName, setGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<GroupChatUser[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filteredFriends, setFilteredFriends] = useState<GroupChatUser[]>([]);

  useEffect(() => {
    const initialMember = route.params?.initialMember;
    if (!initialMember?.id) return;
    const nameParts = initialMember.name.trim().split(/\s+/).filter(Boolean);
    const initialUser: GroupChatUser = {
      user_id: Number(initialMember.id),
      username: initialMember.username,
      first_name: nameParts[0] || initialMember.name,
      last_name: nameParts.slice(1).join(' '),
      avatar: initialMember.avatar,
      cover: '',
    };
    if (!Number.isFinite(initialUser.user_id) || initialUser.user_id <= 0) return;
    setSelectedUsers(current =>
      current.some(user => user.user_id === initialUser.user_id)
        ? current
        : [initialUser, ...current],
    );
  }, [route.params?.initialMember]);

  // Animation values
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    // Fade in animation on mount
    Animated.parallel([
      Animated.timing(headerOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(contentTranslateY, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [headerOpacity, contentTranslateY]);

  // Filter friends based on search
  useEffect(() => {
    if (!searchKeyword.trim()) {
      setFilteredFriends(suggestedFriends);
    } else {
      const keyword = searchKeyword.toLowerCase().trim();
      const filtered = suggestedFriends.filter(
        user =>
          user.first_name.toLowerCase().includes(keyword) ||
          user.last_name.toLowerCase().includes(keyword) ||
          user.username.toLowerCase().includes(keyword),
      );
      setFilteredFriends(filtered);
    }
  }, [searchKeyword, suggestedFriends]);

  const toggleUserSelection = (user: GroupChatUser) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedUsers(prev => {
      const isSelected = prev.some(u => u.user_id === user.user_id);
      if (isSelected) {
        return prev.filter(u => u.user_id !== user.user_id);
      }
      if (prev.length >= MAX_MEMBERS) {
        Alert.alert('Thông báo', `Tối đa ${MAX_MEMBERS} thành viên`);
        return prev;
      }
      return [...prev, user];
    });
  };

  const removeUser = (userId: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedUsers(prev => prev.filter(u => u.user_id !== userId));
  };

  const clearAllSelected = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedUsers([]);
  };

  const handleCreateGroup = async () => {
    // Validate
    if (groupName.trim().length < MIN_GROUP_NAME) {
      Alert.alert('Lỗi', `Tên nhóm phải có ít nhất ${MIN_GROUP_NAME} ký tự`);
      return;
    }
    if (groupName.trim().length > MAX_GROUP_NAME) {
      Alert.alert('Lỗi', `Tên nhóm không được quá ${MAX_GROUP_NAME} ký tự`);
      return;
    }
    if (selectedUsers.length < 1) {
      Alert.alert('Lỗi', 'Vui lòng chọn ít nhất 1 thành viên');
      return;
    }

    const currentUserId = Number(sessionStorage.getSession()?.userId ?? 0);
    const userIds = [
      ...new Set(
        selectedUsers
          .map(user => Number(user.user_id))
          .filter(
            userId =>
              Number.isFinite(userId) &&
              userId > 0 &&
              (currentUserId <= 0 || userId !== currentUserId),
          ),
      ),
    ];

    if (userIds.length < 1) {
      Alert.alert('Lỗi', 'Không tìm thấy thành viên hợp lệ để tạo nhóm.');
      return;
    }

    try {
      const result = await createGroup({
        groupName: groupName.trim(),
        parts: userIds,
        groupType: 'group',
      });

      if (result) {
        navigation.replace(ROUTES.CHAT, {
          chat: mapCreatedGroupToChat(result),
        });
      }
    } catch {
      Alert.alert('Lỗi', 'Không thể tạo nhóm. Vui lòng thử lại.');
    }
  };

  const isValid =
    groupName.trim().length >= MIN_GROUP_NAME && selectedUsers.length > 0;

  // Character counter color
  const getCharCountColor = () => {
    if (groupName.length === 0) return '#94a3b8';
    if (groupName.length < MIN_GROUP_NAME) return '#f59e0b';
    if (groupName.length > MAX_GROUP_NAME - 5) return '#ef4444';
    return '#10b981';
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <FocusAwareStatusBar barStyle="dark-content" />

      {/* Header */}
      <Animated.View
        style={{ opacity: headerOpacity }}
        className="flex-row items-center justify-between border-b border-slate-100 px-2 py-3"
      >
        <TouchableOpacity
          className="h-11 w-11 items-center justify-center rounded-full active:bg-slate-100"
          activeOpacity={0.7}
          onPress={() => navigation.goBack()}
        >
          <ChevronLeft size={24} color="#1f2937" />
        </TouchableOpacity>
        <View className="items-center">
          <Text className="text-[17px] font-bold text-slate-800">Tạo nhóm chat</Text>
          <Text className="text-[11px] text-slate-500">
            {selectedUsers.length}/{MAX_MEMBERS} thành viên
          </Text>
        </View>
        <TouchableOpacity
          className={`h-11 w-11 items-center justify-center rounded-full ${
            isValid ? 'bg-[#0000ff]' : 'bg-slate-100'
          }`}
          activeOpacity={0.8}
          onPress={handleCreateGroup}
          disabled={!isValid || isCreating}
        >
          {isCreating ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Send size={20} color={isValid ? '#ffffff' : '#94a3b8'} />
          )}
        </TouchableOpacity>
      </Animated.View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <Animated.ScrollView
          style={{ transform: [{ translateY: contentTranslateY }] }}
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Section */}
          <View className="mx-4 mt-4 items-center rounded-2xl bg-gradient-to-br from-[#0000ff]/5 to-[#0000ff]/10 p-6">
            <View className="mb-4 h-16 w-16 items-center justify-center rounded-2xl bg-[#0000ff]">
              <Group size={32} color="#ffffff" />
            </View>
            <Text className="text-[18px] font-bold text-slate-800">
              Tạo nhóm mới
            </Text>
            <Text className="mt-1 text-center text-[13px] text-slate-500">
              Thêm bạn bè vào nhóm để trò chuyện cùng nhau
            </Text>
          </View>

          {/* Group Name Input */}
          <View className="mx-4 mt-5">
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="text-[14px] font-semibold text-slate-700">Tên nhóm</Text>
              <Text
                className="text-[12px] font-medium"
                style={{ color: getCharCountColor() }}
              >
                {groupName.length}/{MAX_GROUP_NAME}
              </Text>
            </View>
            <View
              className={`flex-row items-center rounded-xl border-2 px-4 py-3 ${
                groupName.length > 0 && groupName.length < MIN_GROUP_NAME
                  ? 'border-amber-300 bg-amber-50/50'
                  : 'border-slate-200 bg-slate-50/80'
              }`}
            >
              <TextInput
                className="flex-1 text-[16px] text-slate-800"
                placeholder="Nhập tên nhóm..."
                placeholderTextColor="#94a3b8"
                value={groupName}
                onChangeText={setGroupName}
                maxLength={MAX_GROUP_NAME}
              />
              {groupName.length >= MIN_GROUP_NAME && (
                <View className="h-5 w-5 items-center justify-center rounded-full bg-green-500">
                  <Check size={12} color="#ffffff" strokeWidth={3} />
                </View>
              )}
            </View>
            {groupName.length > 0 && groupName.length < MIN_GROUP_NAME && (
              <Text className="mt-1 text-[11px] text-amber-600">
                Tên nhóm phải có ít nhất {MIN_GROUP_NAME} ký tự
              </Text>
            )}
          </View>

          {/* Selected Members Preview */}
          {selectedUsers.length > 0 && (
            <Animated.View className="mx-4 mt-5">
              <View className="mb-3 flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <Users size={18} color={BRAND} />
                  <Text className="ml-2 text-[14px] font-semibold text-slate-700">
                    Đã chọn ({selectedUsers.length})
                  </Text>
                </View>
                <TouchableOpacity onPress={clearAllSelected} activeOpacity={0.7}>
                  <Text className="text-[13px] font-medium text-red-500">Xóa tất cả</Text>
                </TouchableOpacity>
              </View>

              {/* Horizontal scroll preview */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="-mx-4 px-4"
                contentContainerStyle={{ paddingVertical: 4 }}
              >
                <View className="flex-row flex-wrap">
                  {selectedUsers.slice(0, 8).map(user => (
                    <SelectedMemberChip
                      key={user.user_id}
                      user={user}
                      onRemove={() => removeUser(user.user_id)}
                    />
                  ))}
                  {selectedUsers.length > 8 && (
                    <View className="items-center justify-center rounded-full bg-slate-100 px-3 py-2">
                      <Text className="text-[13px] font-medium text-slate-500">
                        +{selectedUsers.length - 8} thêm
                      </Text>
                    </View>
                  )}
                </View>
              </ScrollView>

              {/* Create button preview */}
              <TouchableOpacity
                className={`mt-4 flex-row items-center justify-center rounded-xl py-3 ${
                  isValid ? 'bg-[#0000ff]' : 'bg-slate-300'
                }`}
                activeOpacity={0.8}
                onPress={handleCreateGroup}
                disabled={!isValid || isCreating}
              >
                {isCreating ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Sparkles size={18} color="#ffffff" />
                    <Text className="ml-2 text-[15px] font-semibold text-white">
                      Tạo nhóm với {selectedUsers.length} thành viên
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* Friends List Section */}
          <View className="mx-4 mt-6">
            <View className="mb-3 flex-row items-center justify-between">
              <View className="flex-row items-center">
                <UserPlus size={18} color={BRAND} />
                <Text className="ml-2 text-[14px] font-semibold text-slate-700">
                  Thêm thành viên
                </Text>
              </View>
              {isLoadingFriends && (
                <ActivityIndicator size="small" color={BRAND} />
              )}
            </View>

            {/* Search Input */}
            <View className="mb-4 flex-row items-center rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <Search size={18} color="#94a3b8" />
              <TextInput
                className="ml-3 flex-1 text-[14px] text-slate-800"
                placeholder="Tìm kiếm bạn bè..."
                placeholderTextColor="#94a3b8"
                value={searchKeyword}
                onChangeText={setSearchKeyword}
              />
              {searchKeyword.length > 0 && (
                <TouchableOpacity onPress={() => setSearchKeyword('')}>
                  <X size={18} color="#94a3b8" />
                </TouchableOpacity>
              )}
            </View>

            {/* Friends List */}
            {isLoadingFriends ? (
              <LoadingSkeleton />
            ) : friendsError ? (
              <View className="items-center py-8">
                <Text className="text-[14px] text-red-500">{friendsError}</Text>
                <TouchableOpacity
                  className="mt-2 rounded-lg bg-slate-100 px-4 py-2"
                  onPress={loadSuggestedFriends}
                >
                  <Text className="text-[13px] font-medium text-slate-600">Thử lại</Text>
                </TouchableOpacity>
              </View>
            ) : filteredFriends.length === 0 ? (
              <EmptyState
                icon={UserCheck}
                title="Không có bạn bè"
                subtitle="Tìm kiếm hoặc kết bạn để thêm vào nhóm"
              />
            ) : (
              <View className="rounded-xl border border-slate-100 bg-white">
                <FlatList
                  data={filteredFriends}
                  keyExtractor={item => String(item.user_id)}
                  renderItem={({ item, index }) => (
                    <FriendItem
                      user={item}
                      isSelected={selectedUsers.some(u => u.user_id === item.user_id)}
                      onToggle={() => toggleUserSelection(item)}
                      index={index}
                    />
                  )}
                  ItemSeparatorComponent={() => (
                    <View className="mx-4 h-px bg-slate-100" />
                  )}
                  showsVerticalScrollIndicator={false}
                  scrollEnabled={false}
                />
              </View>
            )}
          </View>
        </Animated.ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

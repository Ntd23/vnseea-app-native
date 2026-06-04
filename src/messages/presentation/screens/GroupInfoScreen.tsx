// Description: Group info screen - shows group details and allows editing avatar/name
// English description: Displays group chat information with edit capabilities for group owner
import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Camera,
  ChevronLeft,
  Crown,
  Edit2,
  Info,
  LogOut,
  MoreHorizontal,
  RefreshCw,
  UserMinus,
  UserPlus,
  Users,
  X,
  Check,
} from 'lucide-react-native';
import {
  launchImageLibrary,
  type MediaType,
} from 'react-native-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../navigation/types';
import { ROUTES } from '../../../navigation/constants/routes';
import { apiBridge } from '../../../shared-kernel/infrastructure/api/apiBridge';

type GroupInfoScreenProps = NativeStackScreenProps<RootStackParamList, 'GroupInfo'>;

const BRAND = '#0000ff';
const BRAND_LIGHT = 'rgba(0, 0, 255, 0.08)';

interface GroupMember {
  user_id: number;
  username: string;
  first_name: string;
  last_name: string;
  avatar: string;
  last_seen: number;
  active: number;
}

interface GroupChatResponse {
  api_status: number;
  data?: Array<{
    id: number;
    group_name: string;
    avatar: string;
    user_data?: {
      user_id: number;
      username: string;
      first_name: string;
      last_name: string;
      avatar: string;
    };
    parts?: GroupMember[];
  }>;
  message?: string;
  errors?: { error_text: string };
}

// Member item component with staggered animation
function MemberItem({ item, index, isOwner }: { item: GroupMember; index: number; isOwner: boolean }) {
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const translateXAnim = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 250,
        delay: index * 50,
        useNativeDriver: true,
      }),
      Animated.spring(translateXAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        delay: index * 50,
        useNativeDriver: true,
      }),
    ]).start();
  }, [index, opacityAnim, translateXAnim]);

  const name = [item.first_name, item.last_name].filter(Boolean).join(' ') || item.username || 'User';
  const initial = name[0]?.toUpperCase() || '?';

  return (
    <Animated.View
      style={{
        opacity: opacityAnim,
        transform: [{ translateX: translateXAnim }],
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
      }}
    >
      {/* Avatar */}
      <View className="relative">
        {item.avatar ? (
          <Image
            source={{ uri: item.avatar }}
            className="h-12 w-12 rounded-full"
            resizeMode="cover"
          />
        ) : (
          <View
            className="h-12 w-12 items-center justify-center rounded-full"
            style={{ backgroundColor: BRAND_LIGHT }}
          >
            <Text className="text-[16px] font-bold text-[#0000ff]">{initial}</Text>
          </View>
        )}
        {item.active === 1 && (
          <View className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
        )}
      </View>

      {/* Name & username */}
      <View className="ml-3 flex-1">
        <View className="flex-row items-center">
          <Text className="text-[15px] font-semibold text-slate-800" numberOfLines={1}>
            {name}
          </Text>
          {isOwner && (
            <View className="ml-2 flex-row items-center rounded-full bg-amber-100 px-2 py-0.5">
              <Crown size={10} color="#d97706" />
              <Text className="ml-1 text-[10px] font-medium text-amber-700">Trưởng nhóm</Text>
            </View>
          )}
        </View>
        <Text className="text-[12px] text-slate-500">@{item.username}</Text>
      </View>

      {/* Remove button (UI only for now) */}
      <TouchableOpacity
        className="h-9 w-9 items-center justify-center rounded-full bg-red-50"
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <UserMinus size={16} color="#dc2626" />
      </TouchableOpacity>
    </Animated.View>
  );
}

// Empty state component
function EmptyMembersState() {
  return (
    <View className="items-center py-8">
      <View className="mb-3 h-16 w-16 items-center justify-center rounded-full bg-slate-100">
        <Users size={28} color="#94a3b8" />
      </View>
      <Text className="text-[14px] font-medium text-slate-500">Chưa có thành viên</Text>
      <Text className="mt-1 text-[12px] text-slate-400">Thêm bạn bè vào nhóm</Text>
    </View>
  );
}

export default function GroupInfoScreen({ navigation, route }: GroupInfoScreenProps) {
  const { groupId, groupName: initialGroupName, avatar: initialAvatar, memberCount: initialMemberCount } = route.params;

  // State
  const [localAvatar, setLocalAvatar] = useState(initialAvatar);
  const [localGroupName, setLocalGroupName] = useState(initialGroupName);
  const [memberCount, setMemberCount] = useState(initialMemberCount);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [owner, setOwner] = useState<GroupMember | null>(null);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [showFullAvatar, setShowFullAvatar] = useState(false);

  // Animation refs
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(40)).current;
  const avatarScale = useRef(new Animated.Value(0.8)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(contentTranslateY, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(avatarScale, {
        toValue: 1,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse animation for online indicator
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [headerOpacity, contentTranslateY, avatarScale, fadeAnim, pulseAnim]);

  // Load group info
  const loadGroupInfo = useCallback(
    async (showLoading = false) => {
      if (showLoading) {
        setIsRefreshing(true);
      } else {
        setIsLoadingMembers(true);
      }
      try {
        console.log('[GroupInfoScreen] Loading group info:', groupId);
        const response = await apiBridge.post<GroupChatResponse>(
          'group_chat',
          { type: 'get_by_id', id: groupId },
        );

        console.log('[GroupInfoScreen] Group info response:', response);

        if (response.api_status === 200 && response.data?.[0]) {
          const groupData = response.data[0];

          if (groupData.avatar) setLocalAvatar(groupData.avatar);
          if (groupData.group_name) setLocalGroupName(groupData.group_name);

          if (groupData.user_data) {
            setOwner({
              user_id: Number(groupData.user_data.user_id ?? 0),
              username: groupData.user_data.username || '',
              first_name: groupData.user_data.first_name || '',
              last_name: groupData.user_data.last_name || '',
              avatar: groupData.user_data.avatar || '',
              last_seen: 0,
              active: 1,
            });
          }

          if (groupData.parts && groupData.parts.length > 0) {
            setMembers(groupData.parts);
            setMemberCount(groupData.parts.length);
          }
        }
      } catch (error: any) {
        console.error('[GroupInfoScreen] Load group info error:', error);
      } finally {
        setIsRefreshing(false);
        setIsLoadingMembers(false);
      }
    },
    [groupId],
  );

  useEffect(() => {
    loadGroupInfo(false);
  }, [loadGroupInfo]);

  // Avatar picker
  const handlePickAvatar = useCallback(async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo' as MediaType,
      selectionLimit: 1,
      quality: 0.8,
      maxWidth: 512,
      maxHeight: 512,
    });

    if (result.didCancel || result.errorCode || !result.assets?.[0]?.uri) {
      return;
    }

    const asset = result.assets[0];
    const uri = asset.uri ?? '';
    const imageUri = (Platform.OS === 'android' && uri && !/^[a-z][a-z0-9+.-]*:\/\//i.test(uri))
      ? `file://${uri}`
      : uri;

    setLocalAvatar(imageUri);
    Animated.sequence([
      Animated.timing(avatarScale, { toValue: 0.85, duration: 150, useNativeDriver: true }),
      Animated.spring(avatarScale, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();

    Alert.alert(
      'Cập nhật ảnh nhóm',
      'Bạn có muốn lưu ảnh đại diện mới cho nhóm không?',
      [
        { text: 'Hủy', style: 'cancel', onPress: () => setLocalAvatar(initialAvatar) },
        {
          text: 'Lưu',
          onPress: async () => {
            setIsUploading(true);
            try {
              const response = await apiBridge.multipart<GroupChatResponse>(
                'group_chat',
                {
                  type: 'edit',
                  id: groupId,
                  avatar: {
                    uri: uri,
                    name: asset.fileName || `avatar_${Date.now()}.jpg`,
                    type: asset.type || 'image/jpeg',
                  },
                },
              );

              if (response.api_status === 200 && response.data?.[0]?.avatar) {
                setLocalAvatar(response.data[0].avatar);
                Alert.alert('Thành công', 'Ảnh đại diện nhóm đã được cập nhật');
              } else {
                setLocalAvatar(initialAvatar);
                Alert.alert('Lỗi', response.errors?.error_text || 'Không thể cập nhật ảnh nhóm');
              }
            } catch (error: any) {
              console.error('[GroupInfoScreen] Update avatar error:', error);
              setLocalAvatar(initialAvatar);
              Alert.alert('Lỗi', error?.message || 'Không thể cập nhật ảnh nhóm');
            } finally {
              setIsUploading(false);
            }
          },
        },
      ],
    );
  }, [avatarScale, groupId, initialAvatar]);

  // Save name
  const handleSaveName = useCallback(async () => {
    const trimmedName = localGroupName.trim();

    if (trimmedName.length < 4) {
      Alert.alert('Lỗi', 'Tên nhóm phải có ít nhất 4 ký tự');
      return;
    }
    if (trimmedName.length > 25) {
      Alert.alert('Lỗi', 'Tên nhóm không được quá 25 ký tự');
      return;
    }
    if (trimmedName === initialGroupName) {
      setIsEditingName(false);
      return;
    }

    setIsUploading(true);
    try {
      const response = await apiBridge.post<GroupChatResponse>(
        'group_chat',
        { type: 'edit', id: groupId, group_name: trimmedName },
      );

      if (response.api_status === 200) {
        setIsEditingName(false);
        if (response.data?.[0]?.group_name) {
          setLocalGroupName(response.data[0].group_name);
        }
        Alert.alert('Thành công', 'Tên nhóm đã được cập nhật');
      } else {
        Alert.alert('Lỗi', response.errors?.error_text || 'Không thể cập nhật tên nhóm');
      }
    } catch (error: any) {
      console.error('[GroupInfoScreen] Update name error:', error);
      Alert.alert('Lỗi', error?.message || 'Không thể cập nhật tên nhóm');
    } finally {
      setIsUploading(false);
    }
  }, [groupId, initialGroupName, localGroupName]);

  // Leave group
  const handleLeaveGroup = useCallback(() => {
    Alert.alert(
      'Rời nhóm',
      'Bạn có chắc muốn rời khỏi nhóm này không?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Rời nhóm',
          style: 'destructive',
          onPress: async () => {
            setIsUploading(true);
            try {
              const response = await apiBridge.post<{
                api_status: number;
                message_data?: string;
                errors?: { error_text: string };
              }>(
                'group_chat',
                { type: 'leave', id: groupId },
              );

              if (response.api_status === 200) {
                Alert.alert('Thành công', 'Bạn đã rời nhóm', [
                  { text: 'OK', onPress: () => navigation.goBack() },
                ]);
              } else {
                Alert.alert('Lỗi', response.errors?.error_text || 'Không thể rời nhóm');
              }
            } catch (error: any) {
              console.error('[GroupInfoScreen] Leave group error:', error);
              Alert.alert('Lỗi', error?.message || 'Không thể rời nhóm');
            } finally {
              setIsUploading(false);
            }
          },
        },
      ],
    );
  }, [groupId, navigation]);

  // Navigate to add members
  const handleAddMembers = useCallback(() => {
    navigation.navigate(ROUTES.CREATE_GROUP_CHAT as any, { groupId, groupName: localGroupName });
  }, [groupId, localGroupName, navigation]);

  // Navigate to chat
  const handleOpenChat = useCallback(() => {
    const chatItem = {
      id: `group:${groupId}`,
      chatType: 'group' as const,
      userId: String(groupId),
      username: '',
      name: localGroupName,
      avatar: localAvatar,
      lastMessage: '',
      lastMessageTime: Date.now() / 1000,
      unreadCount: 0,
      isOnline: false,
      isVerified: false,
    };
    navigation.navigate(ROUTES.CHAT, { chat: chatItem });
  }, [groupId, localAvatar, localGroupName, navigation]);

  const ownerId = owner?.user_id;
  const isOwner = (member: GroupMember) => member.user_id === ownerId;

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <StatusBar barStyle="dark-content" />

      {/* Header with gradient effect */}
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
        <Text className="text-[17px] font-bold text-slate-800">Thông tin nhóm</Text>
        <TouchableOpacity
          className="h-11 w-11 items-center justify-center rounded-full active:bg-slate-100"
          activeOpacity={0.7}
          onPress={() => loadGroupInfo(true)}
        >
          <RefreshCw
            size={20}
            color="#1f2937"
            style={isRefreshing ? { transform: [{ rotate: '45deg' }] } : undefined}
          />
        </TouchableOpacity>
      </Animated.View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.ScrollView
          style={{ transform: [{ translateY: contentTranslateY }] }}
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => loadGroupInfo(true)}
              tintColor={BRAND}
              colors={[BRAND]}
            />
          }
        >
          {/* Gradient header background */}
          <View
            className="relative"
            style={{
              backgroundColor: BRAND_LIGHT,
              paddingTop: 24,
              paddingBottom: 32,
              borderBottomLeftRadius: 32,
              borderBottomRightRadius: 32,
            }}
          >
            {/* Decorative circles */}
            <View className="absolute -left-12 top-8 h-32 w-32 rounded-full bg-white/40" />
            <View className="absolute -right-8 top-20 h-24 w-24 rounded-full bg-white/30" />

            {/* Avatar */}
            <View className="items-center">
              <Animated.View
                style={{
                  transform: [{ scale: avatarScale }],
                  shadowColor: BRAND,
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.2,
                  shadowRadius: 16,
                  elevation: 12,
                }}
              >
                {localAvatar ? (
                  <Image
                    source={{ uri: localAvatar }}
                    className="h-32 w-32 rounded-full border-4 border-white"
                    resizeMode="cover"
                  />
                ) : (
                  <View className="h-32 w-32 items-center justify-center rounded-full border-4 border-white bg-white">
                    <Users size={48} color={BRAND} />
                  </View>
                )}

                {/* Camera button */}
                <TouchableOpacity
                  className="absolute bottom-0 right-0 h-10 w-10 items-center justify-center rounded-full bg-[#0000ff] shadow-lg"
                  activeOpacity={0.8}
                  onPress={handlePickAvatar}
                  disabled={isUploading}
                >
                  <Camera size={18} color="#ffffff" />
                </TouchableOpacity>
              </Animated.View>

              <Text className="mt-3 text-[12px] text-slate-600">Nhấn vào biểu tượng camera để đổi ảnh</Text>
            </View>
          </View>

          {/* Group Name Section */}
          <Animated.View
            style={{ opacity: fadeAnim }}
            className="mx-4 mt-4 rounded-2xl border border-slate-100 bg-white p-4"
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <View
                  className="h-9 w-9 items-center justify-center rounded-full"
                  style={{ backgroundColor: BRAND_LIGHT }}
                >
                  <Edit2 size={16} color={BRAND} />
                </View>
                <Text className="ml-3 text-[15px] font-semibold text-slate-700">Tên nhóm</Text>
              </View>
              {!isEditingName ? (
                <TouchableOpacity
                  className="rounded-full px-3 py-1.5"
                  style={{ backgroundColor: BRAND_LIGHT }}
                  activeOpacity={0.7}
                  onPress={() => setIsEditingName(true)}
                  disabled={isUploading}
                >
                  <Text className="text-[13px] font-semibold text-[#0000ff]">Sửa</Text>
                </TouchableOpacity>
              ) : (
                <View className="flex-row">
                  <TouchableOpacity
                    className="rounded-full px-3 py-1.5"
                    activeOpacity={0.7}
                    onPress={() => {
                      setLocalGroupName(initialGroupName);
                      setIsEditingName(false);
                    }}
                  >
                    <Text className="text-[13px] font-medium text-slate-500">Hủy</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {isEditingName ? (
              <View className="mt-3">
                <TextInput
                  className="rounded-xl border-2 px-4 py-3 text-[15px] text-slate-800"
                  style={{ borderColor: BRAND, backgroundColor: BRAND_LIGHT }}
                  value={localGroupName}
                  onChangeText={setLocalGroupName}
                  placeholder="Nhập tên nhóm mới..."
                  placeholderTextColor="#94a3b8"
                  maxLength={25}
                  autoFocus
                />
                <View className="mt-2 flex-row items-center justify-between">
                  <Text className="text-[11px] text-slate-400">
                    {localGroupName.length}/25 ký tự
                  </Text>
                  <TouchableOpacity
                    className="rounded-full bg-[#0000ff] px-5 py-2"
                    activeOpacity={0.8}
                    onPress={handleSaveName}
                    disabled={isUploading}
                  >
                    <Text className="text-[13px] font-semibold text-white">Lưu</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <Text className="mt-3 text-[16px] font-semibold text-slate-800">
                {localGroupName}
              </Text>
            )}
          </Animated.View>

          {/* Members Quick Stats + Add */}
          <Animated.View
            style={{ opacity: fadeAnim }}
            className="mx-4 mt-3 rounded-2xl border border-slate-100 bg-white p-4"
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <View
                  className="h-10 w-10 items-center justify-center rounded-full"
                  style={{ backgroundColor: BRAND_LIGHT }}
                >
                  <Users size={18} color={BRAND} />
                </View>
                <View className="ml-3">
                  <Text className="text-[13px] text-slate-500">Thành viên</Text>
                  <Text className="text-[18px] font-bold text-slate-800">{memberCount}</Text>
                </View>
              </View>

              <TouchableOpacity
                className="flex-row items-center rounded-full px-4 py-2"
                style={{ backgroundColor: BRAND }}
                activeOpacity={0.8}
                onPress={handleAddMembers}
              >
                <UserPlus size={16} color="#ffffff" />
                <Text className="ml-2 text-[13px] font-semibold text-white">Thêm</Text>
              </TouchableOpacity>
            </View>

            {/* Avatars preview */}
            {members.length > 0 && (
              <View className="mt-4 flex-row -space-x-2">
                {members.slice(0, 5).map((m, idx) => (
                  <View
                    key={m.user_id}
                    className="rounded-full border-2 border-white"
                    style={{ zIndex: 5 - idx }}
                  >
                    {m.avatar ? (
                      <Image
                        source={{ uri: m.avatar }}
                        className="h-10 w-10 rounded-full"
                        resizeMode="cover"
                      />
                    ) : (
                      <View
                        className="h-10 w-10 items-center justify-center rounded-full"
                        style={{ backgroundColor: BRAND_LIGHT }}
                      >
                        <Text className="text-[12px] font-bold text-[#0000ff]">
                          {(m.first_name?.[0] || m.username?.[0] || '?').toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>
                ))}
                {members.length > 5 && (
                  <View
                    className="h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-slate-200"
                  >
                    <Text className="text-[12px] font-bold text-slate-600">
                      +{members.length - 5}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </Animated.View>

          {/* Members List */}
          <Animated.View
            style={{ opacity: fadeAnim }}
            className="mx-4 mt-3 rounded-2xl border border-slate-100 bg-white"
          >
            {isLoadingMembers ? (
              <View className="items-center py-10">
                <ActivityIndicator size="small" color={BRAND} />
                <Text className="mt-2 text-[13px] text-slate-500">Đang tải thành viên...</Text>
              </View>
            ) : members.length === 0 ? (
              <EmptyMembersState />
            ) : (
              <FlatList
                data={members}
                keyExtractor={(item) => String(item.user_id)}
                renderItem={({ item, index }) => (
                  <MemberItem item={item} index={index} isOwner={isOwner(item)} />
                )}
                ItemSeparatorComponent={() => (
                  <View className="ml-16 mr-4 h-px bg-slate-100" />
                )}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
              />
            )}
          </Animated.View>

          {/* Leave Group Button */}
          <Animated.View style={{ opacity: fadeAnim }} className="mx-4 mt-6">
            <TouchableOpacity
              className="flex-row items-center justify-center rounded-2xl border border-red-200 bg-red-50 py-3.5"
              activeOpacity={0.8}
              onPress={handleLeaveGroup}
              disabled={isUploading}
            >
              <LogOut size={18} color="#dc2626" />
              <Text className="ml-2 text-[14px] font-semibold text-red-600">Rời nhóm</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.ScrollView>
      </KeyboardAvoidingView>

      {/* Loading overlay */}
      {isUploading && (
        <View className="absolute inset-0 z-50 items-center justify-center bg-black/40">
          <View className="rounded-2xl bg-white px-8 py-6 shadow-2xl">
            <ActivityIndicator size="large" color={BRAND} />
            <Text className="mt-3 text-[14px] font-medium text-slate-700">Đang xử lý...</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
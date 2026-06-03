// Description: Create group chat screen - allows users to create new group conversations
import React, { useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ArrowLeft,
  Check,
  ImageIcon,
  Search,
  Users,
  X,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../navigation/types';
import { useGroupChatViewModel } from '../../application/view-models/useGroupChatViewModel';
import type { GroupChatUser } from '../../domain/types/groupChat.types';

type CreateGroupNav = NativeStackNavigationProp<RootStackParamList>;

const BRAND = '#0000ff';
const MAX_GROUP_NAME = 25;
const MIN_GROUP_NAME = 4;
const MAX_MEMBERS = 50;

function CreateGroupScreen() {
  const navigation = useNavigation<CreateGroupNav>();
  const { createGroup, isCreating, error } = useGroupChatViewModel();

  const [groupName, setGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<GroupChatUser[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<GroupChatUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Mock search results for demo (in real app, call API)
  const mockSearchUsers = useCallback((keyword: string) => {
    // Simulate search - in production, call API
    const mockUsers: GroupChatUser[] = [
      { user_id: 1, username: 'nguyen_van_a', first_name: 'Nguyễn', last_name: 'Văn A', avatar: '', cover: '' },
      { user_id: 2, username: 'tran_thi_b', first_name: 'Trần', last_name: 'Thị B', avatar: '', cover: '' },
      { user_id: 3, username: 'le_van_c', first_name: 'Lê', last_name: 'Văn C', avatar: '', cover: '' },
    ];

    if (!keyword.trim()) {
      setSearchResults([]);
      return;
    }

    const filtered = mockUsers.filter(u =>
      u.first_name.toLowerCase().includes(keyword.toLowerCase()) ||
      u.last_name.toLowerCase().includes(keyword.toLowerCase()) ||
      u.username.toLowerCase().includes(keyword.toLowerCase())
    );
    setSearchResults(filtered);
  }, []);

  const handleSearch = (text: string) => {
    setSearchKeyword(text);
    mockSearchUsers(text);
  };

  const toggleUserSelection = (user: GroupChatUser) => {
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
    setSelectedUsers(prev => prev.filter(u => u.user_id !== userId));
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

    try {
      const userIds = selectedUsers.map(u => u.user_id);
      const result = await createGroup({
        groupName: groupName.trim(),
        parts: userIds,
        groupType: 'group',
      });

      if (result) {
        Alert.alert('Thành công', 'Nhóm chat đã được tạo', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể tạo nhóm. Vui lòng thử lại.');
    }
  };

  const isValid = groupName.trim().length >= MIN_GROUP_NAME && selectedUsers.length > 0;

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-slate-100 px-4 py-3">
        <TouchableOpacity
          className="h-10 w-10 items-center justify-center rounded-full"
          activeOpacity={0.8}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={22} color="#1f2937" />
        </TouchableOpacity>
        <Text className="text-[18px] font-bold text-slate-800">Tạo nhóm chat</Text>
        <View className="h-10 w-10" />
      </View>

      <ScrollView className="flex-1" contentContainerClassName="pb-8">
        {/* Group Name Input */}
        <View className="px-4 pt-4">
          <Text className="mb-2 text-[14px] font-medium text-slate-600">Tên nhóm</Text>
          <View className="flex-row items-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <TextInput
              className="flex-1 text-[16px] text-slate-800"
              placeholder="Nhập tên nhóm..."
              placeholderTextColor="#94a3b8"
              value={groupName}
              onChangeText={setGroupName}
              maxLength={MAX_GROUP_NAME}
            />
            <Text className="text-[12px] text-slate-400">
              {groupName.length}/{MAX_GROUP_NAME}
            </Text>
          </View>
          {groupName.length > 0 && groupName.length < MIN_GROUP_NAME && (
            <Text className="mt-1 text-[12px] text-red-500">
              Tên nhóm phải có ít nhất {MIN_GROUP_NAME} ký tự
            </Text>
          )}
        </View>

        {/* Selected Members */}
        {selectedUsers.length > 0 && (
          <View className="px-4 pt-5">
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-[14px] font-medium text-slate-600">
                Đã chọn ({selectedUsers.length})
              </Text>
              <TouchableOpacity
                onPress={() => setSelectedUsers([])}
                activeOpacity={0.8}
              >
                <Text className="text-[13px] text-[#0000ff]">Xóa tất cả</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2">
                {selectedUsers.map(user => (
                  <View
                    key={user.user_id}
                    className="flex-row items-center rounded-full bg-[#0000ff]/10 px-3 py-2"
                  >
                    <View className="h-6 w-6 items-center justify-center rounded-full bg-[#0000ff]">
                      <Text className="text-[11px] font-bold text-white">
                        {user.first_name[0]}
                      </Text>
                    </View>
                    <Text className="ml-2 text-[13px] text-slate-700">
                      {user.first_name} {user.last_name}
                    </Text>
                    <TouchableOpacity
                      className="ml-2"
                      onPress={() => removeUser(user.user_id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <X size={16} color="#64748b" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Add Members */}
        <View className="px-4 pt-5">
          <Text className="mb-3 text-[14px] font-medium text-slate-600">
            Thêm thành viên ({selectedUsers.length}/{MAX_MEMBERS})
          </Text>

          {/* Search Input */}
          <View className="mb-4 flex-row items-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <Search size={18} color="#94a3b8" />
            <TextInput
              className="ml-3 flex-1 text-[14px] text-slate-800"
              placeholder="Tìm kiếm bạn bè..."
              placeholderTextColor="#94a3b8"
              value={searchKeyword}
              onChangeText={handleSearch}
            />
          </View>

          {/* Search Results or Suggestions */}
          {searchKeyword.trim() ? (
            <View>
              <Text className="mb-2 text-[12px] text-slate-500">Kết quả tìm kiếm</Text>
              {searchResults.length > 0 ? (
                searchResults.map(user => (
                  <UserListItem
                    key={user.user_id}
                    user={user}
                    isSelected={selectedUsers.some(u => u.user_id === user.user_id)}
                    onToggle={() => toggleUserSelection(user)}
                  />
                ))
              ) : (
                <Text className="py-4 text-center text-[14px] text-slate-400">
                  Không tìm thấy kết quả
                </Text>
              )}
            </View>
          ) : (
            <View>
              <Text className="mb-2 text-[12px] text-slate-500">Gợi ý</Text>
              {[
                { user_id: 1, username: 'nguyen_van_a', first_name: 'Nguyễn', last_name: 'Văn A', avatar: '', cover: '' },
                { user_id: 2, username: 'tran_thi_b', first_name: 'Trần', last_name: 'Thị B', avatar: '', cover: '' },
                { user_id: 3, username: 'le_van_c', first_name: 'Lê', last_name: 'Văn C', avatar: '', cover: '' },
                { user_id: 4, username: 'pham_thi_d', first_name: 'Phạm', last_name: 'Thị D', avatar: '', cover: '' },
              ].map(user => (
                <UserListItem
                  key={user.user_id}
                  user={user}
                  isSelected={selectedUsers.some(u => u.user_id === user.user_id)}
                  onToggle={() => toggleUserSelection(user)}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom Create Button */}
      <View className="border-t border-slate-100 px-4 py-4">
        <TouchableOpacity
          className={`flex-row items-center justify-center rounded-full py-4 ${
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
              <Users size={18} color="#ffffff" />
              <Text className="ml-2 text-[15px] font-semibold text-white">
                Tạo nhóm ({selectedUsers.length} thành viên)
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

interface UserListItemProps {
  user: GroupChatUser;
  isSelected: boolean;
  onToggle: () => void;
}

function UserListItem({ user, isSelected, onToggle }: UserListItemProps) {
  return (
    <TouchableOpacity
      className="flex-row items-center py-3 active:bg-slate-50"
      activeOpacity={0.8}
      onPress={onToggle}
    >
      <View className="relative">
        {user.avatar ? (
          <Image
            source={{ uri: user.avatar }}
            className="h-12 w-12 rounded-full"
            resizeMode="cover"
          />
        ) : (
          <View className="h-12 w-12 items-center justify-center rounded-full bg-[#0000ff]/10">
            <Text className="text-[16px] font-bold text-[#0000ff]">
              {user.first_name[0]}
            </Text>
          </View>
        )}
      </View>
      <View className="ml-3 flex-1">
        <Text className="text-[15px] font-medium text-slate-800">
          {user.first_name} {user.last_name}
        </Text>
        <Text className="text-[12px] text-slate-500">@{user.username}</Text>
      </View>
      <View
        className={`h-6 w-6 items-center justify-center rounded-full border-2 ${
          isSelected ? 'border-[#0000ff] bg-[#0000ff]' : 'border-slate-300'
        }`}
      >
        {isSelected && <Check size={14} color="#ffffff" strokeWidth={3} />}
      </View>
    </TouchableOpacity>
  );
}

export default CreateGroupScreen;
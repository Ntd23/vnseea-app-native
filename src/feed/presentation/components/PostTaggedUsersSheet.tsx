import React, { useCallback, useRef } from 'react';
import {
  FlatList,
  Image,
  Modal,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { X } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../navigation/types';
import { navigateToUserProfile } from '../../../navigation/profileNavigation';
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';
import type { PostTaggedUser } from '../../domain/types/feed.types';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

interface PostTaggedUsersSheetProps {
  visible: boolean;
  users: PostTaggedUser[];
  onClose: () => void;
}

const taggedUsersListContentStyle = {
  paddingHorizontal: 12,
  paddingVertical: 8,
};

export function PostTaggedUsersSheet({
  visible,
  users,
  onClose,
}: PostTaggedUsersSheetProps) {
  const navigation = useNavigation<Navigation>();
  const insets = useSafeAreaInsets();
  const language = useAppLanguage();
  const pendingProfileUserIdRef = useRef<string | null>(null);

  const completePendingProfileNavigation = useCallback(() => {
    const userId = pendingProfileUserIdRef.current;
    if (!userId) return;
    pendingProfileUserIdRef.current = null;
    navigateToUserProfile(navigation, userId);
  }, [navigation]);

  const handleUserPress = useCallback(
    (userId: string) => {
      if (!userId || pendingProfileUserIdRef.current) return;
      pendingProfileUserIdRef.current = userId;
      onClose();
      setTimeout(completePendingProfileNavigation, 220);
    },
    [completePendingProfileNavigation, onClose],
  );

  const handleModalDismiss = useCallback(() => {
    completePendingProfileNavigation();
  }, [completePendingProfileNavigation]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
      onDismiss={handleModalDismiss}
    >
      <View className="flex-1 justify-end bg-black/35">
        <Pressable className="absolute inset-0" onPress={onClose} />
        <View
          className="max-h-[68%] rounded-t-3xl bg-white"
          style={{ paddingBottom: Math.max(insets.bottom, 12) }}
        >
          <View className="items-center pb-1 pt-2.5">
            <View className="h-1.5 w-12 rounded-full bg-slate-300" />
          </View>
          <View className="flex-row items-center border-b border-slate-100 px-4 pb-3 pt-2">
            <Text className="min-w-0 flex-1 text-[17px] font-bold text-slate-950">
              {language === 'vi' ? 'Những người được gắn thẻ' : 'Tagged people'}
            </Text>
            <TouchableOpacity
              activeOpacity={0.72}
              className="h-10 w-10 items-center justify-center rounded-full bg-slate-100"
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={language === 'vi' ? 'Đóng' : 'Close'}
            >
              <X size={20} color="#334155" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={users}
            keyExtractor={user => user.id}
            contentContainerStyle={taggedUsersListContentStyle}
            renderItem={({ item: user }) => (
              <TouchableOpacity
                activeOpacity={0.76}
                className="flex-row items-center rounded-xl px-2 py-2.5"
                onPress={() => handleUserPress(user.id)}
                accessibilityRole="button"
                accessibilityLabel={user.name}
              >
                {user.avatarUrl ? (
                  <Image
                    source={{ uri: user.avatarUrl }}
                    className="h-12 w-12 rounded-full bg-slate-100"
                  />
                ) : (
                  <View className="h-12 w-12 items-center justify-center rounded-full bg-brand/10">
                    <Text className="text-[16px] font-bold text-brand">
                      {(user.name || user.username).charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View className="ml-3 min-w-0 flex-1">
                  <Text
                    className="text-[15px] font-semibold text-slate-950"
                    numberOfLines={1}
                  >
                    {user.name}
                  </Text>
                  {user.username ? (
                    <Text
                      className="mt-0.5 text-[12px] text-slate-500"
                      numberOfLines={1}
                    >
                      @{user.username}
                    </Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

export default PostTaggedUsersSheet;

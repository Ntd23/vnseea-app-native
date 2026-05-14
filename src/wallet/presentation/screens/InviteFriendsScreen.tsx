import React from 'react';
import {
  FlatList,
  Share,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {ArrowLeft, Link, Search, Share2} from 'lucide-react-native';
import {useNavigation} from '@react-navigation/native';
import {useInviteFriendsViewModel} from '../../application/view-models/useInviteFriendsViewModel';
import type {Contact} from '../../domain/types/wallet.types';

/* ── Contact row ── */
function ContactRow({
  item,
  isLast,
  onInvite,
}: {
  item: Contact;
  isLast: boolean;
  onInvite: () => void;
}) {
  return (
    <View
      className={`flex-row items-stretch justify-between px-4 py-4 ${
        !isLast ? 'border-b border-[rgba(0,0,255,0.08)]' : ''
      }`}>
      {/* Avatar + text — dùng items-center chỉ ở row con này */}
      <View className="flex-row items-center gap-4 flex-1 mr-3">
        <View
          className={`h-12 w-12 shrink-0 items-center justify-center rounded-full ${item.chipBg}`}>
          <Text className={`text-title-primary font-bold ${item.chipText}`}>
            {item.initials}
          </Text>
        </View>

        {/* Name + phone — không bị clip vì outer không ép chiều cao */}
        <View className="flex-1">
          <Text className="text-title-primary leading-5">{item.name}</Text>
          <Text
            className="text-[12px] text-[#64748b] mt-0.5 leading-5">
            {item.phone}
          </Text>
        </View>
      </View>

      {/* Invite button — căn giữa theo chiều dọc */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onInvite}
        className={`self-center rounded-full border px-4 py-1.5 ${
          item.isInvited
            ? 'border-[#94a3b8] bg-[#f1f5f9]'
            : 'border-[#0000ff]'
        }`}>
        <Text
          className={`text-[14px] font-semibold ${
            item.isInvited ? 'text-[#94a3b8]' : 'text-[#0000ff]'
          }`}>
          {item.isInvited ? 'Đã mời' : 'Mời'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

/* ── Main screen ── */
function InviteFriendsScreen() {
  const navigation = useNavigation();
  const {contacts, searchQuery, handleInvite, handleSearch} =
    useInviteFriendsViewModel();

  const handleCopyLink = () => {
    // TODO: copy referral link to clipboard
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message:
          'Tham gia VNSEEA cùng mình nhé! Dùng link này để đăng ký: https://vnseea.app/invite',
        title: 'Mời bạn bè dùng VNSEEA',
      });
    } catch {
      // ignore
    }
  };

  return (
    <SafeAreaView className="flex-1 surface-base" edges={['top']}>
      <StatusBar barStyle="light-content" />

      {/* Top App Bar */}
      <View className="surface-brand flex-row items-center px-4 py-3">
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => navigation.goBack()}
          hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <ArrowLeft size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text className="flex-1 text-center text-heading text-inverse">
          Mời bạn bè
        </Text>
        <View className="w-10" />
      </View>

      {/* Search + List */}
      <View className="flex-1 px-4 pt-4">
        {/* Search field */}
        <View className="surface-card flex-row items-center gap-3 px-4 py-3 mb-4">
          <Search size={18} color="#94a3b8" />
          <TextInput
            className="flex-1 text-body-primary text-[#0b1c30]"
            placeholder="Tìm kiếm liên hệ..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={handleSearch}
            returnKeyType="search"
          />
        </View>

        {/* Contacts card */}
        <View className="surface-card overflow-hidden flex-1">
          <FlatList
            data={contacts}
            keyExtractor={item => item.id}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            renderItem={({item, index}) => (
              <ContactRow
                item={item}
                isLast={index === contacts.length - 1}
                onInvite={() => handleInvite(item.id)}
              />
            )}
            ListEmptyComponent={
              <View className="items-center py-12">
                <Text className="text-body-secondary">
                  Không tìm thấy liên hệ nào
                </Text>
              </View>
            }
          />
        </View>
      </View>

      {/* Bottom CTA Bar */}
      <View className="border-t border-[rgba(0,0,255,0.08)] bg-[#f8f9ff] px-4 py-3">
        <View className="flex-row gap-3">
          {/* Copy link */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleCopyLink}
            className="flex-1 flex-row items-center justify-center gap-2 rounded-full border border-[rgba(0,0,255,0.12)] bg-white py-3">
            <Link size={18} color="#0b1c30" />
            <Text className="text-title-primary text-[#0b1c30]">
              Sao chép liên kết
            </Text>
          </TouchableOpacity>

          {/* Share */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={handleShare}
            className="flex-1 flex-row items-center justify-center gap-2 rounded-full bg-[#0000ff] py-3">
            <Share2 size={18} color="#ffffff" />
            <Text className="text-title-primary text-inverse">Chia sẻ</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

export default InviteFriendsScreen;

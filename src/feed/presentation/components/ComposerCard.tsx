// Description: Shared composer card (used by Home feed and Profile).
// Renders the "What's on your mind?" input + 3 quick action buttons (Live/Ảnh/Sự kiện).
// No rounded background container — surfaces a flat white block matching the feed.
import React from 'react';
import {
  Image,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image as ImageIcon, Smile, Tag } from 'lucide-react-native';

const FALLBACK_AVATAR =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBzOiwu9eVVr13_YUuLqFaZS5DMZSQjPQqGVp3m79mrFIOksxUaafxT6NOD7hWY1ovOOtnGqlKKmPy3vZS5LhbiBbX6XQyXexcys3dCd700wiTgDGs4KRiq5vM64_gByXbAgZ356Xg_1i8PN9yGMKSGadOq-PYlT497w8_Ab1upM7ybuluWZspaikqyZ-BtES8q1oKfjZ9BHYtV1APztnG0dp7bW-4y0QkJh46DJatsljh0w0WsaL0Os2nes04dtts1t6X_kG8wXqw';

export type ComposerCopy = {
  composerPlaceholder: string;
  library: string;
  tag: string;
  feeling: string;
};

const Avatar = React.memo(function Avatar({
  uri,
  size = 44,
}: {
  uri: string;
  size?: number;
}) {
  const source = React.useMemo(() => ({ uri }), [uri]);
  const style = React.useMemo(() => ({ height: size, width: size }), [size]);

  return (
    <Image
      source={source}
      style={style}
      className="rounded-full"
      resizeMode="cover"
      fadeDuration={0}
    />
  );
});

export function ComposerCard({
  onPress,
  avatarUrl,
  copy,
}: {
  onPress: () => void;
  avatarUrl?: string;
  copy: ComposerCopy;
}) {
  return (
    <View className="bg-white px-4 pb-3 pt-1">
      <View className="mb-3 flex-row items-center">
        <Avatar uri={avatarUrl ?? FALLBACK_AVATAR} size={48} />
        <TouchableOpacity
          className="ml-3 min-h-[52px] flex-1 flex-row items-center justify-between rounded-[24px] border border-[#dfe3eb] bg-white px-5"
          activeOpacity={0.8}
          onPress={onPress}
        >
          <Text className="text-[17px] font-semibold text-[#667085]">
            {copy.composerPlaceholder}
          </Text>
          <ImageIcon size={24} color="#0758ff" strokeWidth={2.2} />
        </TouchableOpacity>
      </View>
      <View className="min-h-[52px] flex-row items-center justify-between rounded-2xl border border-[#edf0f5] bg-white px-3 shadow-sm">
        <TouchableOpacity
          className="flex-1 flex-row items-center justify-center"
          activeOpacity={0.75}
          onPress={onPress}
        >
          <ImageIcon size={23} color="#22c55e" strokeWidth={2.25} />
          <Text className="ml-2 text-[15px] font-bold text-[#4b5563]">
            {copy.library}
          </Text>
        </TouchableOpacity>
        <View className="h-6 w-px bg-[#dfe3eb]" />
        <TouchableOpacity
          className="flex-1 flex-row items-center justify-center"
          activeOpacity={0.75}
          onPress={onPress}
        >
          <Tag size={23} color="#0758ff" strokeWidth={2.25} />
          <Text className="ml-2 text-[15px] font-bold text-[#4b5563]">
            {copy.tag}
          </Text>
        </TouchableOpacity>
        <View className="h-6 w-px bg-[#dfe3eb]" />
        <TouchableOpacity
          className="flex-1 flex-row items-center justify-center"
          activeOpacity={0.75}
          onPress={onPress}
        >
          <Smile size={23} color="#ff8a00" strokeWidth={2.25} />
          <Text className="ml-2 text-[15px] font-bold text-[#4b5563]">
            {copy.feeling}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default ComposerCard;

// Description: Shared composer card used by Home feed and Profile to open the post composer.
import React from 'react';
import {
  Image,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Image as ImageIcon,
  Video as VideoIcon,
  ShoppingCart,
  BarChart3,
  Smile,
} from 'lucide-react-native';

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
  onPressAction,
  onPressAvatar,
  avatarUrl,
  displayName = 'Quản trị',
  copy,
}: {
  onPress: () => void;
  onPressAction?: (action: 'photo' | 'video' | 'product' | 'poll') => void;
  onPressAvatar?: () => void;
  avatarUrl?: string;
  displayName?: string;
  copy: any;
}) {
  const placeholder = copy.createPostBtn || copy.composerPlaceholder || 'Hôm nay bạn thế nào ?';

  return (
    <View
      style={{
        shadowColor: '#94a3b8',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
      }}
      className="mx-4  bg-white rounded-[20px] border border-slate-100 p-4"
    >
      {/* Top row with avatar, name, placeholder and smile icon */}
      {/* Top row with avatar (linking to profile) and name/placeholder input */}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity
          activeOpacity={onPressAvatar ? 0.7 : 1}
          onPress={onPressAvatar}
          disabled={!onPressAvatar}
        >
          <Avatar uri={avatarUrl ?? FALLBACK_AVATAR} size={48} />
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onPress}
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', marginLeft: 12 }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#0f172a' }}>
              {displayName}
            </Text>
            <Text style={{ fontSize: 14, color: '#94a3b8', marginTop: 2 }}>
              {placeholder}
            </Text>
          </View>
          <Smile size={24} color="#94a3b8" strokeWidth={2} style={{ marginLeft: 8 }} />
        </TouchableOpacity>
      </View>

      {/* Grid of 4 buttons */}
      <View style={{ marginTop: 16 }}>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => onPressAction ? onPressAction('photo') : onPress()}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#f1f5f9',
              borderRadius: 20,
              paddingVertical: 10,
              paddingHorizontal: 12,
            }}
          >
            <ImageIcon size={18} color="#3b82f6" strokeWidth={2.5} />
            <Text style={{ marginLeft: 8, fontSize: 13, fontWeight: '600', color: '#475569' }} numberOfLines={1}>
              {copy.photo === 'Ảnh' ? 'Hình ảnh' : copy.photo || 'Photos'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => onPressAction ? onPressAction('video') : onPress()}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#f1f5f9',
              borderRadius: 20,
              paddingVertical: 10,
              paddingHorizontal: 12,
            }}
          >
            <VideoIcon size={18} color="#22c55e" strokeWidth={2.5} />
            <Text style={{ marginLeft: 8, fontSize: 13, fontWeight: '600', color: '#475569' }} numberOfLines={1}>
              {copy.video || 'Video'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => onPressAction ? onPressAction('product') : onPress()}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#f1f5f9',
              borderRadius: 20,
              paddingVertical: 10,
              paddingHorizontal: 12,
            }}
          >
            <ShoppingCart size={18} color="#f97316" strokeWidth={2.5} />
            <Text style={{ marginLeft: 8, fontSize: 13, fontWeight: '600', color: '#475569' }} numberOfLines={1}>
              {copy.product || 'Product'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => onPressAction ? onPressAction('poll') : onPress()}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#f1f5f9',
              borderRadius: 20,
              paddingVertical: 10,
              paddingHorizontal: 12,
            }}
          >
            <BarChart3 size={18} color="#0d9488" strokeWidth={2.5} />
            <Text style={{ marginLeft: 8, fontSize: 13, fontWeight: '600', color: '#475569' }} numberOfLines={1}>
              {copy.poll || 'Poll'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export default ComposerCard;

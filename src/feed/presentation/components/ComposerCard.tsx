// Description: Shared composer card used by Home feed and Profile to open the post composer.
import React from 'react';
import {
  Image,
  Platform,
  StyleSheet,
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
import {
  FEED_CARD_CLASS,
  FEED_CARD_PADDING_CLASS,
} from './FeedCardChrome';

const FALLBACK_AVATAR =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBzOiwu9eVVr13_YUuLqFaZS5DMZSQjPQqGVp3m79mrFIOksxUaafxT6NOD7hWY1ovOOtnGqlKKmPy3vZS5LhbiBbX6XQyXexcys3dCd700wiTgDGs4KRiq5vM64_gByXbAgZ356Xg_1i8PN9yGMKSGadOq-PYlT497w8_Ab1upM7ybuluWZspaikqyZ-BtES8q1oKfjZ9BHYtV1APztnG0dp7bW-4y0QkJh46DJatsljh0w0WsaL0Os2nes04dtts1t6X_kG8wXqw';

export type ComposerCopy = {
  composerPlaceholder: string;
  library: string;
  tag: string;
  feeling: string;
};

type ComposerActionId = 'photo' | 'video' | 'product' | 'poll';

type ComposerAction = {
  id: ComposerActionId;
  label: string;
  color: string;
  Icon: React.ComponentType<{
    size?: number;
    color?: string;
    strokeWidth?: number;
  }>;
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
  onPressAction?: (action: ComposerActionId) => void;
  onPressAvatar?: () => void;
  avatarUrl?: string;
  displayName?: string;
  copy: any;
}) {
  const isIos = Platform.OS === 'ios';
  const placeholder = copy.createPostBtn || copy.composerPlaceholder || 'Hôm nay bạn thế nào ?';
  const composerCardClassName = isIos
    ? 'bg-white border border-slate-100 p-4'
    : `${FEED_CARD_CLASS} ${FEED_CARD_PADDING_CLASS}`;
  const actions: ComposerAction[] = [
    {
      id: 'photo',
      label: copy.photo === 'Ảnh' ? 'Hình ảnh' : copy.photo || 'Photos',
      color: '#3b82f6',
      Icon: ImageIcon,
    },
    {
      id: 'video',
      label: copy.video || 'Video',
      color: '#22c55e',
      Icon: VideoIcon,
    },
    {
      id: 'product',
      label: copy.product || 'Product',
      color: '#f97316',
      Icon: ShoppingCart,
    },
    {
      id: 'poll',
      label: copy.poll || 'Poll',
      color: '#0d9488',
      Icon: BarChart3,
    },
  ];

  const handleActionPress = (action: ComposerActionId) => {
    if (onPressAction) {
      onPressAction(action);
      return;
    }
    onPress();
  };

  return (
    <View
      style={isIos ? [styles.cardShadow, styles.iosCardSpacing] : undefined}
      className={composerCardClassName}
    >
      <View style={styles.composerTopRow}>
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
          style={styles.composerInput}
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

      {isIos ? (
        <View style={styles.iosActionsRow}>
          {actions.map(action => (
            <TouchableOpacity
              key={action.id}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={action.label}
              onPress={() => handleActionPress(action.id)}
              style={styles.iosActionButton}
            >
              <action.Icon size={21} color={action.color} strokeWidth={2.5} />
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <View style={styles.androidActionsRow}>
          {actions.map(action => (
            <TouchableOpacity
              key={action.id}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={action.label}
              onPress={() => handleActionPress(action.id)}
              style={styles.androidActionButton}
            >
              <action.Icon size={22} color={action.color} strokeWidth={2.4} />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cardShadow: {
    marginHorizontal: 16,
    shadowColor: '#94a3b8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  iosCardSpacing: {
    marginHorizontal: 0,
  },
  composerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  composerInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  iosActionsRow: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 10,
  },
  iosActionButton: {
    minHeight: 44,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: '#f1f5f9',
  },
  androidActionsRow: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 10,
  },
  androidActionButton: {
    flex: 1,
    minWidth: 0,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e8eef4',
    backgroundColor: '#f1f5f9',
  },
});

export default ComposerCard;

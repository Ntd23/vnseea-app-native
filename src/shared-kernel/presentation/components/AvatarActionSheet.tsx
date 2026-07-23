// Description: Modern bottom-sheet action menu for the avatar —
// "View Avatar" + "View Story" + "Cancel". Triggered when the user
// taps an avatar that has an active story ring (both own and other
// profiles). The "Change avatar" action stays on the dedicated Camera
// badge next to the avatar (own profile only), NOT in this sheet.
// Uses Reanimated 3 for the slide-up + fade backdrop and per-row
// press-scale feedback.
import { APP_BRAND_COLOR } from '../theme/appColors';
import React, { useEffect } from 'react';
import {
  Dimensions,
  Image,
  Modal,
  Pressable,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight, Eye, Play, X } from 'lucide-react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const SPRING_CONFIG = { damping: 20, stiffness: 200, mass: 0.9 } as const;

const FONT_PRIMARY = 'Inter';

export type AvatarActionSheetCopy = {
  title: string;
  subtitle: string;
  viewAvatarLabel: string;
  viewAvatarHint: string;
  viewStoryLabel: string;
  viewStoryHint: string;
  cancel: string;
};

export type AvatarActionSheetProps = {
  visible: boolean;
  onClose: () => void;
  avatarUrl?: string;
  onViewAvatar: () => void;
  onViewStory: () => void;
  copy: AvatarActionSheetCopy;
};

export function AvatarActionSheet({
  visible,
  onClose,
  avatarUrl,
  onViewAvatar,
  onViewStory,
  copy,
}: AvatarActionSheetProps) {
  const insets = useSafeAreaInsets();

  // 0 = closed (hidden off-screen, backdrop transparent), 1 = open.
  const progress = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      progress.value = withSpring(1, SPRING_CONFIG);
    } else {
      progress.value = withTiming(0, {
        duration: 220,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [visible, progress]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: progress.value * 0.5,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - progress.value) * SCREEN_HEIGHT }],
  }));

  if (!visible) {
    return null;
  }

  const avatarInitial =
    copy.title && copy.title.trim().length > 0
      ? copy.title.trim().charAt(0).toUpperCase()
      : 'U';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Animated.View
          pointerEvents="auto"
          style={[
            {
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              backgroundColor: '#000000',
            },
            backdropStyle,
          ]}
        >
          <Pressable
            style={{ flex: 1 }}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={copy.cancel}
          />
        </Animated.View>

        <Animated.View
          style={[
            {
              backgroundColor: '#FFFFFF',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingTop: 8,
              paddingBottom: insets.bottom + 16,
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: -6 },
              shadowOpacity: 0.18,
              shadowRadius: 18,
              elevation: 16,
            },
            sheetStyle,
          ]}
        >
          {/* Grabber */}
          <View style={{ alignItems: 'center', paddingTop: 8 }}>
            <View
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: '#E2E8F0',
              }}
            />
          </View>

          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 20,
              paddingTop: 16,
              paddingBottom: 12,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                flex: 1,
                minWidth: 0,
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  overflow: 'hidden',
                  backgroundColor: APP_BRAND_COLOR,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                }}
              >
                {avatarUrl ? (
                  <Image
                    source={{ uri: avatarUrl }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                  />
                ) : (
                  <Text
                    style={{
                      color: '#FFFFFF',
                      fontSize: 16,
                      fontWeight: '800',
                    }}
                  >
                    {avatarInitial}
                  </Text>
                )}
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  numberOfLines={2}
                  style={{
                    fontFamily: FONT_PRIMARY,
                    fontSize: 17,
                    fontWeight: '800',
                    color: '#050505',
                    includeFontPadding: false,
                  }}
                >
                  {copy.title}
                </Text>
                <Text
                  numberOfLines={2}
                  style={{
                    fontFamily: FONT_PRIMARY,
                    fontSize: 12,
                    fontWeight: '500',
                    color: '#65676B',
                    marginTop: 2,
                    includeFontPadding: false,
                  }}
                >
                  {copy.subtitle}
                </Text>
              </View>
            </View>

            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={copy.cancel}
              hitSlop={8}
              style={({ pressed }) => ({
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: '#F1F5F9',
                alignItems: 'center',
                justifyContent: 'center',
                marginLeft: 8,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <X size={16} color="#475569" />
            </Pressable>
          </View>

          {/* Action rows */}
          <View style={{ paddingHorizontal: 12 }}>
            <ActionRow
              label={copy.viewAvatarLabel}
              hint={copy.viewAvatarHint}
              iconBg="#EEF0FF"
              iconColor={APP_BRAND_COLOR}
              Icon={Eye}
              onPress={onViewAvatar}
            />

            <View style={{ height: 8 }} />

            <ActionRow
              label={copy.viewStoryLabel}
              hint={copy.viewStoryHint}
              iconBg="#F5F3FF"
              iconColor="#A855F7"
              Icon={Play}
              onPress={onViewStory}
            />
          </View>

          {/* Cancel button */}
          <View style={{ paddingHorizontal: 20, marginTop: 18 }}>
            <ScalePressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={copy.cancel}
            >
              <View
                style={{
                  height: 48,
                  borderRadius: 9999,
                  backgroundColor: '#F1F5F9',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                }}
              >
                <Text
                  style={{
                    fontFamily: FONT_PRIMARY,
                    fontSize: 15,
                    fontWeight: '800',
                    color: '#0F172A',
                    includeFontPadding: false,
                  }}
                >
                  {copy.cancel}
                </Text>
              </View>
            </ScalePressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

type ActionRowProps = {
  label: string;
  hint: string;
  iconBg: string;
  iconColor: string;
  Icon: React.ComponentType<{ size?: number; color?: string }>;
  onPress: () => void;
};

function ActionRow({
  label,
  hint,
  iconBg,
  iconColor,
  Icon,
  onPress,
}: ActionRowProps) {
  return (
    <ScalePressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          backgroundColor: iconBg,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 12,
        }}
      >
        <Icon size={20} color={iconColor} />
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          numberOfLines={2}
          style={{
            fontFamily: FONT_PRIMARY,
            fontSize: 15,
            fontWeight: '800',
            color: '#050505',
            includeFontPadding: false,
          }}
        >
          {label}
        </Text>
        <Text
          numberOfLines={2}
          style={{
            fontFamily: FONT_PRIMARY,
            fontSize: 12,
            fontWeight: '500',
            color: '#65676B',
            marginTop: 2,
            includeFontPadding: false,
          }}
        >
          {hint}
        </Text>
      </View>

      <ChevronRight size={18} color="#94A3B8" />
    </ScalePressable>
  );
}

type ScalePressableProps = {
  onPress: () => void;
  activeOpacity?: number;
  style?: any;
  children: React.ReactNode;
  accessibilityRole?: 'button';
  accessibilityLabel?: string;
};

function ScalePressable({
  onPress,
  activeOpacity = 0.7,
  style,
  children,
  accessibilityRole,
  accessibilityLabel,
}: ScalePressableProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[style, animatedStyle]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => {
          scale.value = withSpring(0.97, { damping: 18, stiffness: 260 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 18, stiffness: 260 });
        }}
        accessibilityRole={accessibilityRole}
        accessibilityLabel={accessibilityLabel}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 14,
          paddingVertical: 14,
          borderRadius: 16,
          backgroundColor: '#F8FAFC',
          width: '100%',
        }}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

// Description: Brand-blue hero header for the login screen.
// Renders the real logo image (when the API returns one) on top of a
// translucent "V" fallback so the screen never looks broken on slow
// networks. The decorative circles spin slowly using Reanimated 4.

import React, { useEffect } from 'react';
import { Image, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

interface LoginHeroProps {
  siteName: string;
  subtitle: string;
  logoUrl: string | null;
  onLogoImageError: () => void;
}

export default function LoginHero({
  siteName,
  subtitle,
  logoUrl,
  onLogoImageError,
}: LoginHeroProps) {
  const circleRotation = useSharedValue(0);

  useEffect(() => {
    circleRotation.value = withRepeat(
      withTiming(360, { duration: 60000, easing: Easing.linear }),
      -1,
      false,
    );
  }, [circleRotation]);

  const circle1Style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${circleRotation.value}deg` }],
  }));
  const circle2Style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${-circleRotation.value * 0.6}deg` }],
  }));
  const circle3Style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${circleRotation.value * 0.4}deg` }],
  }));

  return (
    <Animated.View
      entering={FadeInDown.duration(380).easing(Easing.out(Easing.cubic))}
      className="surface-brand relative h-[260px] overflow-hidden"
    >
      <Animated.View
        pointerEvents="none"
        className="absolute -right-10 -top-10 h-40 w-40 rounded-full"
        style={[{ backgroundColor: 'rgba(255,255,255,0.10)' }, circle1Style]}
      />
      <Animated.View
        pointerEvents="none"
        className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full"
        style={[{ backgroundColor: 'rgba(255,255,255,0.08)' }, circle2Style]}
      />
      <Animated.View
        pointerEvents="none"
        className="absolute left-8 top-12 h-20 w-20 rounded-full"
        style={[{ backgroundColor: 'rgba(255,255,255,0.07)' }, circle3Style]}
      />

      <View className="flex-1 items-center justify-center pt-4">
        <View
          className="mb-4 h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2"
          style={{
            backgroundColor: 'rgba(255,255,255,0.18)',
            borderColor: 'rgba(255,255,255,0.32)',
          }}
        >
          {logoUrl ? (
            <Image
              source={{ uri: logoUrl }}
              className="h-full w-full"
              resizeMode="cover"
              onError={onLogoImageError}
            />
          ) : (
            <Text
              className="text-[32px] font-extrabold text-inverse"
              style={{ letterSpacing: 1 }}
            >
              V
            </Text>
          )}
        </View>
        <Text
          className="text-[28px] font-extrabold text-inverse"
          style={{ letterSpacing: 4 }}
        >
          {siteName}
        </Text>
        <Text
          className="mt-1.5 text-[11px] font-semibold text-inverse"
          style={{ letterSpacing: 1.6, opacity: 0.75 }}
        >
          {subtitle}
        </Text>
      </View>
    </Animated.View>
  );
}

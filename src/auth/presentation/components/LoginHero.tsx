// Description: Light brand hero header for the login screen.
// Renders only the real logo image returned by the backend.

import React, { useEffect } from 'react';
import { Image, Text, View } from 'react-native';
import Animated, {
  Easing,
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
  const floatProgress = useSharedValue(0);

  useEffect(() => {
    circleRotation.value = withRepeat(
      withTiming(360, { duration: 60000, easing: Easing.linear }),
      -1,
      false,
    );
    floatProgress.value = withRepeat(
      withTiming(1, { duration: 3200, easing: Easing.inOut(Easing.cubic) }),
      -1,
      true,
    );
  }, [circleRotation, floatProgress]);

  const circle1Style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${circleRotation.value}deg` }],
  }));
  const circle2Style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${-circleRotation.value * 0.6}deg` }],
  }));
  const circle3Style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${circleRotation.value * 0.4}deg` }],
  }));
  const logoFloatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -4 + floatProgress.value * 8 }],
  }));

  return (
    <Animated.View
      className="relative h-[300px] overflow-hidden bg-[#F8FBFF]"
    >
      <Animated.View
        pointerEvents="none"
        className="absolute -right-14 -top-14 h-36 w-36 rounded-full"
        style={[{ backgroundColor: 'rgba(0,0,255,0.045)' }, circle1Style]}
      />
      <Animated.View
        pointerEvents="none"
        className="absolute -bottom-12 -left-16 h-36 w-36 rounded-full"
        style={[{ backgroundColor: 'rgba(0,0,255,0.04)' }, circle2Style]}
      />
      <Animated.View
        pointerEvents="none"
        className="absolute right-24 top-28 h-11 w-11 rounded-full"
        style={[{ backgroundColor: 'rgba(0,0,255,0.055)' }, circle3Style]}
      />
      <View pointerEvents="none" className="absolute left-7 top-12">
        {Array.from({ length: 24 }).map((_, index) => (
          <View
            key={`left-dot-${index}`}
            className="absolute h-1.5 w-1.5 rounded-full bg-[#D8E5FF]"
            style={{
              left: (index % 4) * 24,
              top: Math.floor(index / 4) * 24,
              opacity: 0.85,
            }}
          />
        ))}
      </View>
      <View pointerEvents="none" className="absolute right-8 top-36">
        {Array.from({ length: 18 }).map((_, index) => (
          <View
            key={`right-dot-${index}`}
            className="absolute h-1.5 w-1.5 rounded-full bg-[#DDE8FF]"
            style={{
              left: (index % 3) * 22,
              top: Math.floor(index / 3) * 22,
              opacity: 0.8,
            }}
          />
        ))}
      </View>

      <View className="flex-1 items-center justify-center px-8 pt-8">
        <Animated.View
          className="mb-8 h-24 w-64 items-center justify-center overflow-hidden rounded-[24px] border-[4px] border-white bg-[#0000ff]"
          style={[
            {
              shadowColor: '#0000ff',
              shadowOffset: { width: 0, height: 16 },
              shadowOpacity: 0.15,
              shadowRadius: 32,
              elevation: 8,
            },
            logoFloatStyle,
          ]}
        >
          {logoUrl ? (
            <Image
              source={{ uri: logoUrl }}
              className="h-16 w-52 rounded-xl"
              resizeMode="contain"
              onError={onLogoImageError}
            />
          ) : null}
        </Animated.View>
        <Text
          className="text-[11px] font-semibold text-slate-500"
          style={{ letterSpacing: 4 }}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {subtitle}
        </Text>
      </View>
    </Animated.View>
  );
}

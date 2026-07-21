import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
  Modal,
  PanResponder,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ChevronLeft,
  ChevronRight,
  FastForward,
  Pause,
  Play,
  Rewind,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react-native';
import VideoPlayer from 'react-native-video';
import { SafeAreaView } from 'react-native-safe-area-context';

export type ChatMediaViewerItem = {
  uri: string;
  type: 'image' | 'video';
};

type Props = {
  items: ChatMediaViewerItem[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
};

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

function SwipeToCloseContainer({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dy) > 10 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
      onMoveShouldSetPanResponderCapture: (_, gesture) =>
        Math.abs(gesture.dy) > 10 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
      onPanResponderMove: (_, gesture) => {
        translateY.setValue(gesture.dy);
        opacity.setValue(
          Math.max(1 - Math.abs(gesture.dy) / (SCREEN_HEIGHT / 2), 0.4),
        );
      },
      onPanResponderRelease: (_, gesture) => {
        if (Math.abs(gesture.dy) > 120 || Math.abs(gesture.vy) > 0.8) {
          Animated.parallel([
            Animated.timing(translateY, {
              toValue: gesture.dy > 0 ? SCREEN_HEIGHT : -SCREEN_HEIGHT,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start(onClose);
          return;
        }
        Animated.parallel([
          Animated.spring(translateY, {
            toValue: 0,
            tension: 40,
            friction: 6,
            useNativeDriver: true,
          }),
          Animated.spring(opacity, {
            toValue: 1,
            useNativeDriver: true,
          }),
        ]).start();
      },
    }),
  ).current;

  return (
    <Animated.View style={[styles.blackSurface, { opacity }]}>
      <Animated.View
        style={[styles.flex, { transform: [{ translateY }] }]}
        {...panResponder.panHandlers}
      >
        {children}
      </Animated.View>
    </Animated.View>
  );
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const remainder = Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0');
  return `${minutes}:${remainder}`;
}

function ChatVideoViewer({ uri, onClose }: { uri: string; onClose: () => void }) {
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoRef = useRef<any>(null);
  const progressWidthRef = useRef(1);

  const scheduleControlsHide = useCallback(() => {
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (paused) return;
    controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
  }, [paused]);

  useEffect(() => {
    scheduleControlsHide();
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [scheduleControlsHide]);

  const seekTo = useCallback(
    (seconds: number) => {
      if (duration <= 0) return;
      const nextTime = Math.max(0, Math.min(duration, seconds));
      setCurrentTime(nextTime);
      videoRef.current?.seek(nextTime);
      setShowControls(true);
      scheduleControlsHide();
    },
    [duration, scheduleControlsHide],
  );

  const seekFromX = useCallback(
    (locationX: number) => {
      const ratio = Math.max(
        0,
        Math.min(1, locationX / Math.max(progressWidthRef.current, 1)),
      );
      seekTo(duration * ratio);
    },
    [duration, seekTo],
  );

  const progressResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: event => seekFromX(event.nativeEvent.locationX),
        onPanResponderMove: event => seekFromX(event.nativeEvent.locationX),
      }),
    [seekFromX],
  );

  return (
    <SwipeToCloseContainer onClose={onClose}>
      <Pressable
        className="flex-1 bg-black"
        onPress={() => {
          setShowControls(current => !current);
          scheduleControlsHide();
        }}
      >
        <VideoPlayer
          ref={videoRef}
          source={{ uri }}
          style={styles.media}
          resizeMode="contain"
          paused={paused}
          muted={muted}
          controls={false}
          playInBackground={false}
          playWhenInactive={false}
          onProgress={event => setCurrentTime(event.currentTime)}
          onLoad={event => setDuration(event.duration)}
        />
        {showControls ? (
          <View
            className="absolute inset-0 items-center justify-center bg-black/20"
            pointerEvents="box-none"
          >
            <View className="flex-row items-center" pointerEvents="auto">
              <TouchableOpacity
                className="h-12 w-12 items-center justify-center rounded-full bg-black/60"
                onPress={() => seekTo(currentTime - 10)}
              >
                <Rewind size={21} color="#ffffff" />
              </TouchableOpacity>
              <TouchableOpacity
                className="mx-5 h-16 w-16 items-center justify-center rounded-full bg-black/70"
                onPress={() => setPaused(current => !current)}
              >
                {paused ? (
                  <Play size={28} color="#ffffff" fill="#ffffff" />
                ) : (
                  <Pause size={28} color="#ffffff" fill="#ffffff" />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                className="h-12 w-12 items-center justify-center rounded-full bg-black/60"
                onPress={() => seekTo(currentTime + 10)}
              >
                <FastForward size={21} color="#ffffff" />
              </TouchableOpacity>
            </View>
            <View
              className="absolute bottom-4 left-4 right-4 rounded-2xl bg-black/60 px-4 py-3"
              pointerEvents="auto"
            >
              <View
                className="h-7 justify-center"
                onLayout={event => {
                  progressWidthRef.current = event.nativeEvent.layout.width;
                }}
                {...progressResponder.panHandlers}
              >
                <View className="h-1.5 overflow-hidden rounded-full bg-white/20">
                  <View
                    className="h-full rounded-full bg-blue-500"
                    style={{
                      width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
                    }}
                  />
                </View>
              </View>
              <View className="mt-1 flex-row items-center justify-between">
                <Text className="text-xs font-semibold text-white">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </Text>
                <TouchableOpacity
                  className="h-9 w-9 items-center justify-center rounded-full bg-white/10"
                  onPress={() => setMuted(current => !current)}
                >
                  {muted ? (
                    <VolumeX size={16} color="#ffffff" />
                  ) : (
                    <Volume2 size={16} color="#ffffff" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : null}
      </Pressable>
    </SwipeToCloseContainer>
  );
}

export function ChatMediaViewerModal({
  items,
  index,
  onIndexChange,
  onClose,
}: Props) {
  const listRef = useRef<FlatList<ChatMediaViewerItem>>(null);
  const screenWidth = Dimensions.get('window').width;

  useEffect(() => {
    if (items.length === 0 || index < 0 || index >= items.length) return;
    const timer = setTimeout(() => {
      listRef.current?.scrollToIndex({ index, animated: false });
    }, 50);
    return () => clearTimeout(timer);
  }, [index, items.length]);

  return (
    <Modal
      visible={items.length > 0}
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <SafeAreaView
        className="flex-1 bg-black"
        edges={['top', 'right', 'bottom', 'left']}
      >
        <View className="z-10 flex-row items-center justify-between px-4 py-3">
          {items.length > 1 ? (
            <View className="rounded-full bg-white/20 px-4 py-2">
              <Text className="text-sm font-semibold text-white">
                {index + 1}/{items.length}
              </Text>
            </View>
          ) : (
            <View />
          )}
          <TouchableOpacity
            className="h-11 w-11 items-center justify-center rounded-full bg-white/15"
            activeOpacity={0.8}
            onPress={onClose}
          >
            <X size={23} color="#ffffff" />
          </TouchableOpacity>
        </View>

        <FlatList
          ref={listRef}
          className="flex-1"
          data={items}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item, itemIndex) => `${item.uri}-${itemIndex}`}
          getItemLayout={(_, itemIndex) => ({
            length: screenWidth,
            offset: screenWidth * itemIndex,
            index: itemIndex,
          })}
          onMomentumScrollEnd={event => {
            const width = event.nativeEvent.layoutMeasurement.width;
            if (width <= 0) return;
            const nextIndex = Math.round(
              event.nativeEvent.contentOffset.x / width,
            );
            if (nextIndex >= 0 && nextIndex < items.length) {
              onIndexChange(nextIndex);
            }
          }}
          renderItem={({ item }) => (
            <View style={[styles.slide, { width: screenWidth }]}>
              {item.type === 'image' ? (
                <SwipeToCloseContainer onClose={onClose}>
                  <View className="flex-1 items-center justify-center">
                    <Image
                      source={{ uri: item.uri }}
                      style={styles.media}
                      resizeMode="contain"
                    />
                  </View>
                </SwipeToCloseContainer>
              ) : (
                <ChatVideoViewer uri={item.uri} onClose={onClose} />
              )}
            </View>
          )}
        />

        {index > 0 ? (
          <TouchableOpacity
            className="absolute left-4 top-1/2 z-10 h-12 w-12 items-center justify-center rounded-full bg-white/20"
            onPress={() => onIndexChange(index - 1)}
          >
            <ChevronLeft size={26} color="#ffffff" />
          </TouchableOpacity>
        ) : null}
        {index < items.length - 1 ? (
          <TouchableOpacity
            className="absolute right-4 top-1/2 z-10 h-12 w-12 items-center justify-center rounded-full bg-white/20"
            onPress={() => onIndexChange(index + 1)}
          >
            <ChevronRight size={26} color="#ffffff" />
          </TouchableOpacity>
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  blackSurface: {
    flex: 1,
    backgroundColor: '#000000',
  },
  flex: {
    flex: 1,
  },
  media: {
    width: '100%',
    height: '100%',
  },
  slide: {
    flex: 1,
  },
});

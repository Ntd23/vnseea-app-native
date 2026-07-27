import React, { useCallback, useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type { KeyboardEvent, LayoutChangeEvent } from 'react-native';
import { ImagePlus, Mic, SendHorizonal, Square, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type {
  CommentAudioAttachment,
  CommentImageAttachment,
  ReelCaptionSuggestion,
} from '../../domain/types/reels.types';
import { APP_COLORS } from '../../../shared-kernel/presentation/theme/appColors';
import { AudioPlayer } from '../../../shared-kernel/presentation/components/AudioPlayer';
import { AudioWaveform } from '../../../shared-kernel/presentation/components/AudioWaveform';
import { CommentMentionSuggestions } from './CommentMentionSuggestions';

const QUICK_COMMENT_EMOJIS = [
  '😁',
  '🥰',
  '😂',
  '😳',
  '😏',
  '😅',
  '🥺',
] as const;
const KEYBOARD_SYNC_DELAYS_MS = [0, 40, 100, 320] as const;
const ANDROID_MANUAL_LIFT_FALLBACK_MS = 280;
const ANDROID_KEYBOARD_SLIDE_DURATION_MS = 220;
const COMPOSER_HIDE_DURATION_MS = 90;
const COMPOSER_FALLBACK_REVEAL_MS = 120;

interface Props {
  visible: boolean;
  avatarUrl: string;
  value: string;
  placeholder: string;
  editable: boolean;
  submitDisabled: boolean;
  imageDisabled: boolean;
  recordingDisabled: boolean;
  pendingImage: CommentImageAttachment | null;
  pendingAudio: CommentAudioAttachment | null;
  isRecording: boolean;
  recordingLabel: string;
  contextLabel?: string;
  contextSnippet?: string;
  mentionSuggestionsVisible: boolean;
  mentionSuggestionsLoading: boolean;
  mentionSuggestions: ReelCaptionSuggestion[];
  focusSignal?: number;
  onChangeText: (text: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  onInsertEmoji: (emoji: string) => void;
  onInsertMention: () => void;
  onSelectMention: (suggestion: ReelCaptionSuggestion) => void;
  onPickImage: () => void;
  onToggleRecording: () => void;
  onRemoveImage: () => void;
  onRemoveAudio: () => void;
  onCancelRecording: () => void;
  onCancelContext?: () => void;
}

export function ReelCommentComposerModal({
  visible,
  avatarUrl,
  value,
  placeholder,
  editable,
  submitDisabled,
  imageDisabled,
  recordingDisabled,
  pendingImage,
  pendingAudio,
  isRecording,
  recordingLabel,
  contextLabel,
  contextSnippet,
  mentionSuggestionsVisible,
  mentionSuggestionsLoading,
  mentionSuggestions,
  focusSignal = 0,
  onChangeText,
  onClose,
  onSubmit,
  onInsertEmoji,
  onInsertMention,
  onSelectMention,
  onPickImage,
  onToggleRecording,
  onRemoveImage,
  onRemoveAudio,
  onCancelRecording,
  onCancelContext,
}: Props) {
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const panelTranslateY = useRef(new Animated.Value(0)).current;
  const panelOpacity = useRef(new Animated.Value(0)).current;
  const baseViewportHeightRef = useRef(Dimensions.get('window').height);
  const viewportHeightRef = useRef(baseViewportHeightRef.current);
  const keyboardHeightRef = useRef(0);
  const keyboardSyncTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const focusFrameRef = useRef<number | null>(null);
  const closeAnimationInFlightRef = useRef(false);
  const lastKeyboardShowHeightRef = useRef(0);
  const visibleRef = useRef(visible);
  visibleRef.current = visible;

  const clearKeyboardSyncTimers = useCallback(() => {
    keyboardSyncTimersRef.current.forEach(clearTimeout);
    keyboardSyncTimersRef.current = [];
  }, []);

  const animatePanelForKeyboard = useCallback(
    (
      nextKeyboardHeight: number,
      nextViewportHeight = viewportHeightRef.current,
      duration = 120,
      allowAndroidManualLift = false,
    ) => {
      if (closeAnimationInFlightRef.current) return;

      const normalizedKeyboardHeight = Math.max(
        0,
        Math.round(nextKeyboardHeight),
      );
      keyboardHeightRef.current = normalizedKeyboardHeight;

      const viewportReduction = Math.max(
        0,
        baseViewportHeightRef.current - nextViewportHeight,
      );
      const canUseManualLift =
        Platform.OS !== 'android' || allowAndroidManualLift;
      const requiredLift = canUseManualLift
        ? Math.max(0, normalizedKeyboardHeight - viewportReduction)
        : 0;

      const animations = [
        Animated.timing(panelTranslateY, {
          toValue: -requiredLift,
          duration: Math.max(0, duration),
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ];

      if (normalizedKeyboardHeight > 0) {
        animations.push(
          Animated.timing(panelOpacity, {
            toValue: 1,
            duration: Math.min(120, Math.max(70, duration)),
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        );
      }

      panelTranslateY.stopAnimation();
      panelOpacity.stopAnimation();
      Animated.parallel(animations).start();
    },
    [panelOpacity, panelTranslateY],
  );

  const syncKeyboardMetrics = useCallback(
    (allowAndroidManualLift = false, duration = 70) => {
      if (!visibleRef.current || closeAnimationInFlightRef.current) return;
      const keyboardMetrics = Keyboard.metrics?.();
      const windowViewportReduction = Math.max(
        0,
        baseViewportHeightRef.current - Dimensions.get('window').height,
      );
      const inferredKeyboardHeight =
        windowViewportReduction > 96 ? windowViewportReduction : 0;
      const nextHeight = Math.max(
        0,
        keyboardMetrics?.height ?? keyboardHeightRef.current,
        inferredKeyboardHeight,
      );
      if (nextHeight <= 0) return;
      animatePanelForKeyboard(
        nextHeight,
        viewportHeightRef.current,
        duration,
        allowAndroidManualLift,
      );
    },
    [animatePanelForKeyboard],
  );

  const scheduleKeyboardSync = useCallback(
    (androidManualLiftDelay = ANDROID_MANUAL_LIFT_FALLBACK_MS) => {
      clearKeyboardSyncTimers();
      keyboardSyncTimersRef.current = KEYBOARD_SYNC_DELAYS_MS.map(delay =>
        setTimeout(
          () => syncKeyboardMetrics(delay >= androidManualLiftDelay),
          delay,
        ),
      );
    },
    [clearKeyboardSyncTimers, syncKeyboardMetrics],
  );

  const focusInput = useCallback(() => {
    if (closeAnimationInFlightRef.current) return;
    if (focusFrameRef.current !== null) {
      cancelAnimationFrame(focusFrameRef.current);
    }
    focusFrameRef.current = requestAnimationFrame(() => {
      focusFrameRef.current = null;
      if (!visibleRef.current) return;
      inputRef.current?.focus();
      scheduleKeyboardSync();
    });
  }, [scheduleKeyboardSync]);

  const refocusInput = useCallback(() => {
    if (closeAnimationInFlightRef.current) return;
    if (focusFrameRef.current !== null) {
      cancelAnimationFrame(focusFrameRef.current);
    }
    focusFrameRef.current = requestAnimationFrame(() => {
      focusFrameRef.current = null;
      if (!visibleRef.current || closeAnimationInFlightRef.current) return;
      inputRef.current?.focus();
    });
  }, []);

  const resetKeyboardPosition = useCallback(() => {
    clearKeyboardSyncTimers();
    if (focusFrameRef.current !== null) {
      cancelAnimationFrame(focusFrameRef.current);
      focusFrameRef.current = null;
    }
    keyboardHeightRef.current = 0;
    lastKeyboardShowHeightRef.current = 0;
    closeAnimationInFlightRef.current = false;
    panelTranslateY.stopAnimation();
    panelTranslateY.setValue(0);
    panelOpacity.stopAnimation();
    panelOpacity.setValue(0);
  }, [clearKeyboardSyncTimers, panelOpacity, panelTranslateY]);

  const handleClose = useCallback(() => {
    if (closeAnimationInFlightRef.current) return;
    closeAnimationInFlightRef.current = true;
    Keyboard.dismiss();
    clearKeyboardSyncTimers();
    if (focusFrameRef.current !== null) {
      cancelAnimationFrame(focusFrameRef.current);
      focusFrameRef.current = null;
    }
    panelOpacity.stopAnimation();
    Animated.timing(panelOpacity, {
      toValue: 0,
      duration: COMPOSER_HIDE_DURATION_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      closeAnimationInFlightRef.current = false;
      if (visibleRef.current) onClose();
    });
  }, [clearKeyboardSyncTimers, onClose, panelOpacity]);

  const handleInsertEmoji = useCallback(
    (emoji: string) => {
      onInsertEmoji(emoji);
      refocusInput();
    },
    [onInsertEmoji, refocusInput],
  );

  const handleInsertMention = useCallback(() => {
    onInsertMention();
    refocusInput();
  }, [onInsertMention, refocusInput]);

  const handleRootLayout = useCallback(
    (event: LayoutChangeEvent) => {
      if (closeAnimationInFlightRef.current) return;
      const nextViewportHeight = Math.max(0, event.nativeEvent.layout.height);
      const previousViewportHeight = viewportHeightRef.current;
      viewportHeightRef.current = nextViewportHeight;
      baseViewportHeightRef.current = Math.max(
        baseViewportHeightRef.current,
        nextViewportHeight,
      );

      if (
        keyboardHeightRef.current > 0 &&
        nextViewportHeight > previousViewportHeight + 1 &&
        nextViewportHeight >= baseViewportHeightRef.current - 1
      ) {
        animatePanelForKeyboard(0, nextViewportHeight, 90, true);
        return;
      }

      const viewportReduction = Math.max(
        0,
        baseViewportHeightRef.current - nextViewportHeight,
      );
      const measuredKeyboardHeight = Math.max(
        0,
        Keyboard.metrics?.()?.height ?? 0,
        keyboardHeightRef.current,
        viewportReduction > 96 ? viewportReduction : 0,
      );
      const layoutAnimationDuration =
        Platform.OS === 'android' &&
        keyboardHeightRef.current > 0 &&
        nextViewportHeight < previousViewportHeight - 1
          ? ANDROID_KEYBOARD_SLIDE_DURATION_MS
          : 90;

      animatePanelForKeyboard(
        measuredKeyboardHeight,
        nextViewportHeight,
        layoutAnimationDuration,
        true,
      );
    },
    [animatePanelForKeyboard],
  );

  useEffect(() => {
    if (!visible) {
      resetKeyboardPosition();
      return;
    }

    const initialViewportHeight = Dimensions.get('window').height;
    baseViewportHeightRef.current = initialViewportHeight;
    viewportHeightRef.current = initialViewportHeight;
    resetKeyboardPosition();

    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillChangeFrame' : 'keyboardWillShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const handleKeyboardShow = (event: KeyboardEvent) => {
      if (closeAnimationInFlightRef.current) return;
      clearKeyboardSyncTimers();
      const keyboardMetrics = Keyboard.metrics?.();
      const windowViewportReduction = Math.max(
        0,
        baseViewportHeightRef.current - Dimensions.get('window').height,
      );
      const inferredKeyboardHeight =
        windowViewportReduction > 96 ? windowViewportReduction : 0;
      const nextHeight = Math.max(
        0,
        event.endCoordinates?.height ?? 0,
        keyboardMetrics?.height ?? 0,
        inferredKeyboardHeight,
      );
      const duration =
        event.duration && event.duration > 0
          ? event.duration
          : Platform.OS === 'ios'
          ? 220
          : ANDROID_KEYBOARD_SLIDE_DURATION_MS;

      const isRepeatedKeyboardShow =
        Platform.OS === 'android' &&
        lastKeyboardShowHeightRef.current === nextHeight;
      keyboardHeightRef.current = nextHeight;
      lastKeyboardShowHeightRef.current = nextHeight;
      if (Platform.OS === 'ios') {
        animatePanelForKeyboard(
          nextHeight,
          viewportHeightRef.current,
          duration,
        );
      } else {
        animatePanelForKeyboard(
          nextHeight,
          viewportHeightRef.current,
          isRepeatedKeyboardShow ? 90 : duration,
          true,
        );
        keyboardSyncTimersRef.current = [
          setTimeout(
            () => syncKeyboardMetrics(true, 90),
            ANDROID_MANUAL_LIFT_FALLBACK_MS,
          ),
        ];
      }
    };

    const handleKeyboardHide = (event?: KeyboardEvent) => {
      clearKeyboardSyncTimers();
      lastKeyboardShowHeightRef.current = 0;
      keyboardHeightRef.current = 0;
      if (closeAnimationInFlightRef.current) return;
      const duration =
        event?.duration && event.duration > 0
          ? event.duration
          : Platform.OS === 'ios'
          ? 180
          : 100;
      animatePanelForKeyboard(0, viewportHeightRef.current, duration, true);
    };

    const showSubscription = Keyboard.addListener(
      showEvent,
      handleKeyboardShow,
    );
    const didShowSubscription =
      Platform.OS === 'android'
        ? Keyboard.addListener('keyboardDidShow', handleKeyboardShow)
        : null;
    const hideSubscription = Keyboard.addListener(
      hideEvent,
      handleKeyboardHide,
    );

    return () => {
      showSubscription.remove();
      didShowSubscription?.remove();
      hideSubscription.remove();
      resetKeyboardPosition();
    };
  }, [
    animatePanelForKeyboard,
    clearKeyboardSyncTimers,
    resetKeyboardPosition,
    scheduleKeyboardSync,
    syncKeyboardMetrics,
    visible,
  ]);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(focusInput, 100);
    return () => clearTimeout(timer);
  }, [focusInput, focusSignal, visible]);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => {
      if (!visibleRef.current || closeAnimationInFlightRef.current) return;
      panelOpacity.stopAnimation();
      Animated.timing(panelOpacity, {
        toValue: 1,
        duration: 90,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }, COMPOSER_FALLBACK_REVEAL_MS);

    return () => clearTimeout(timer);
  }, [panelOpacity, visible]);

  if (!visible) return null;

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      presentationStyle="overFullScreen"
      hardwareAccelerated
      onRequestClose={handleClose}
    >
      <View className="flex-1 justify-end" onLayout={handleRootLayout}>
        <Pressable className="absolute inset-0" onPress={handleClose}>
          <Animated.View
            pointerEvents="none"
            className="absolute inset-0 bg-black/20"
            style={{ opacity: panelOpacity }}
          />
        </Pressable>

        <Animated.View
          style={{
            opacity: panelOpacity,
            transform: [{ translateY: panelTranslateY }],
          }}
        >
          <View
            className="rounded-t-[22px] border border-slate-200 bg-white px-3 pt-2"
            style={{ paddingBottom: Math.max(insets.bottom, 8) }}
          >
            <View className="h-12 flex-row items-center justify-between">
              {QUICK_COMMENT_EMOJIS.map(emoji => (
                <TouchableOpacity
                  key={emoji}
                  activeOpacity={0.8}
                  className="h-11 flex-1 items-center justify-center"
                  onPress={() => handleInsertEmoji(emoji)}
                  accessibilityRole="button"
                  accessibilityLabel={`Thêm ${emoji}`}
                >
                  <Text className="text-[25px] leading-[31px]">{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <CommentMentionSuggestions
              visible={mentionSuggestionsVisible}
              loading={mentionSuggestionsLoading}
              suggestions={mentionSuggestions}
              onSelect={onSelectMention}
            />

            {contextLabel ? (
              <View className="mb-2 flex-row items-center rounded-[14px] border border-red-100 bg-red-50 px-3 py-2">
                <View className="mr-2 h-8 w-1 rounded-full bg-brand" />
                <View className="flex-1">
                  <Text className="text-caption-primary text-brand">
                    {contextLabel}
                  </Text>
                  {contextSnippet ? (
                    <Text
                      className="mt-0.5 text-caption-secondary text-slate-500"
                      numberOfLines={1}
                    >
                      {contextSnippet}
                    </Text>
                  ) : null}
                </View>
                {onCancelContext ? (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    className="h-8 w-8 items-center justify-center rounded-full bg-white"
                    onPress={onCancelContext}
                  >
                    <X size={16} color={APP_COLORS.neutral.textMuted} />
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null}

            {pendingImage ? (
              <View className="mb-2 flex-row items-center rounded-[14px] border border-slate-200 bg-slate-50 p-2">
                <View className="relative h-[72px] w-[72px] overflow-hidden rounded-[12px] bg-slate-200">
                  <Image
                    source={{ uri: pendingImage.uri }}
                    className="h-full w-full"
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={onRemoveImage}
                    className="absolute right-1 top-1 h-6 w-6 items-center justify-center rounded-full bg-black/60"
                  >
                    <X size={14} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}

            {pendingAudio ? (
              <View className="mb-2 flex-row items-center rounded-[14px] border border-slate-200 bg-slate-50 px-3 py-2">
                <View className="flex-1">
                  <Text
                    className="mb-1 text-caption-primary text-slate-600"
                    numberOfLines={1}
                  >
                    {pendingAudio.name}
                  </Text>
                  <AudioPlayer uri={pendingAudio.uri} compact />
                </View>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={onRemoveAudio}
                  className="ml-2 h-8 w-8 items-center justify-center rounded-full bg-white"
                >
                  <X size={16} color={APP_COLORS.neutral.textMuted} />
                </TouchableOpacity>
              </View>
            ) : null}

            {isRecording ? (
              <View className="mb-2 flex-row items-center rounded-[14px] border border-red-100 bg-red-50 px-3 py-2">
                <View className="mr-2 h-2.5 w-2.5 rounded-full bg-red-500" />
                <View className="flex-1">
                  <Text className="mb-1 text-caption-primary text-red-700">
                    {recordingLabel}
                  </Text>
                  <AudioWaveform
                    animated
                    color={APP_COLORS.brand.primary}
                    inactiveColor={APP_COLORS.brand.onPrimaryMuted}
                    height={18}
                    barCount={30}
                  />
                </View>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={onCancelRecording}
                  className="ml-2 h-8 w-8 items-center justify-center rounded-full bg-white"
                >
                  <X size={16} color={APP_COLORS.status.destructive} />
                </TouchableOpacity>
              </View>
            ) : null}

            <View className="flex-row items-end">
              <Image
                source={{ uri: avatarUrl }}
                className="avatar-md mr-2 bg-slate-200"
              />
              <View className="input-shell min-h-[54px] flex-1 overflow-hidden">
                <TextInput
                  ref={inputRef}
                  value={value}
                  onChangeText={onChangeText}
                  placeholder={placeholder}
                  placeholderTextColor={APP_COLORS.neutral.iconMuted}
                  className="max-h-[92px] min-h-[52px] px-4 py-3 text-body-primary text-slate-900"
                  multiline
                  maxLength={500}
                  editable={editable}
                  textAlignVertical="top"
                />
              </View>
            </View>

            <View className="mt-1 min-h-[48px] flex-row items-center">
              <TouchableOpacity
                activeOpacity={0.8}
                disabled={imageDisabled}
                className={`h-11 w-11 items-center justify-center ${
                  imageDisabled ? 'opacity-40' : ''
                }`}
                onPress={onPickImage}
              >
                <ImagePlus size={24} color={APP_COLORS.neutral.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.8}
                className="h-11 w-11 items-center justify-center"
                onPress={refocusInput}
              >
                <Text className="text-[27px] leading-[31px] text-slate-700">
                  ☺
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.8}
                className="h-11 w-11 items-center justify-center"
                onPress={handleInsertMention}
              >
                <Text className="text-[27px] font-medium leading-[31px] text-slate-700">
                  @
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.8}
                disabled={recordingDisabled}
                className={`h-11 w-11 items-center justify-center ${
                  recordingDisabled ? 'opacity-40' : ''
                }`}
                onPress={onToggleRecording}
              >
                {isRecording ? (
                  <Square
                    size={23}
                    color={APP_COLORS.brand.primary}
                    fill={APP_COLORS.brand.primary}
                  />
                ) : (
                  <Mic size={24} color={APP_COLORS.neutral.textMuted} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={onSubmit}
                disabled={submitDisabled}
                className={`btn-primary ml-auto h-10 w-14 px-0 ${
                  submitDisabled ? 'opacity-40' : ''
                }`}
              >
                <SendHorizonal size={20} color={APP_COLORS.brand.onPrimary} />
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

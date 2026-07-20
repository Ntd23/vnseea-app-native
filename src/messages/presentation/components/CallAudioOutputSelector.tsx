// Description: Displays a compact call-audio control and a safe device picker.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  BluetoothConnected,
  Check,
  Ear,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { showSnackbar } from '../../../shared-kernel/presentation/components/Snackbar';
import {
  ensureCallBluetoothPermission,
  getAvailableCallAudioOutputs,
  type CallAudioOutputMode,
} from '../../application/livekit/callAudioRouting';

type AudioOutputChoice = {
  mode: CallAudioOutputMode;
  label: string;
  description: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
};

const AUDIO_OUTPUT_CHOICES: AudioOutputChoice[] = [
  {
    mode: 'bluetooth',
    label: 'Tai nghe Bluetooth',
    description: 'Nghe riêng bằng tai nghe không dây',
    icon: BluetoothConnected,
  },
  {
    mode: 'earpiece',
    label: 'Loa trong',
    description: 'Đưa điện thoại lên tai để nghe',
    icon: Ear,
  },
  {
    mode: 'speaker',
    label: 'Loa ngoài',
    description: 'Phát âm thanh lớn ra loa điện thoại',
    icon: Volume2,
  },
  {
    mode: 'muted',
    label: 'Tắt âm thanh',
    description: 'Tắt tiếng đối phương, mic của bạn vẫn giữ nguyên',
    icon: VolumeX,
  },
];

const MODE_LABELS: Record<CallAudioOutputMode, string> = {
  bluetooth: 'Tai nghe',
  earpiece: 'Loa trong',
  speaker: 'Loa ngoài',
  muted: 'Đã tắt tiếng',
};

const MODE_ICONS = {
  bluetooth: BluetoothConnected,
  earpiece: Ear,
  speaker: Volume2,
  muted: VolumeX,
} as const;

export function CallAudioOutputSelector({
  mode,
  fallbackMode = 'earpiece',
  onChange,
  compact = false,
  triggerSize = 48,
}: {
  mode: CallAudioOutputMode;
  fallbackMode?: 'earpiece' | 'speaker';
  onChange: (mode: CallAudioOutputMode) => void | Promise<void>;
  compact?: boolean;
  triggerSize?: number;
}) {
  const [isOpen, setOpen] = useState(false);
  const [availableOutputs, setAvailableOutputs] = useState<string[]>([]);
  const [hasCheckedOutputs, setHasCheckedOutputs] = useState(false);
  const [optimisticMode, setOptimisticMode] =
    useState<CallAudioOutputMode | null>(null);
  const [notice, setNotice] = useState('');
  const onChangeRef = useRef(onChange);
  const applyRequestIdRef = useRef(0);
  const previousBluetoothAvailableRef = useRef<boolean | undefined>(undefined);
  const displayedMode = optimisticMode ?? mode;
  const CurrentIcon = MODE_ICONS[displayedMode];
  const currentIconSize = compact
    ? Math.max(20, Math.min(24, triggerSize * 0.5))
    : 25;

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const refreshOutputs = useCallback(async () => {
    const outputs: string[] = await getAvailableCallAudioOutputs().catch(
      (): string[] => [],
    );
    setAvailableOutputs(outputs);
    setHasCheckedOutputs(true);
    return outputs;
  }, []);

  useEffect(() => {
    refreshOutputs();
    const interval = setInterval(refreshOutputs, 2_000);
    return () => clearInterval(interval);
  }, [refreshOutputs]);

  const detectedBluetoothOutput = availableOutputs.includes('bluetooth');
  const hasBluetoothOutput = detectedBluetoothOutput || Platform.OS === 'ios';

  useEffect(() => {
    if (!hasCheckedOutputs || Platform.OS !== 'android') return;

    const wasAvailable = previousBluetoothAvailableRef.current;
    previousBluetoothAvailableRef.current = detectedBluetoothOutput;

    if (
      detectedBluetoothOutput &&
      wasAvailable !== true &&
      mode !== 'bluetooth' &&
      mode !== 'muted'
    ) {
      ensureCallBluetoothPermission().then(granted => {
        if (granted) {
          Promise.resolve(onChangeRef.current('bluetooth')).catch(
            () => undefined,
          );
        }
      });
      return;
    }

    if (
      !detectedBluetoothOutput &&
      wasAvailable === true &&
      mode === 'bluetooth'
    ) {
      Promise.resolve(onChangeRef.current(fallbackMode)).catch(() => undefined);
    }
  }, [detectedBluetoothOutput, fallbackMode, hasCheckedOutputs, mode]);

  const chooseOutput = useCallback(
    async (nextMode: CallAudioOutputMode) => {
      const requestId = ++applyRequestIdRef.current;
      setNotice('');
      // Reflect the tap before permission checks/native routing complete. Only
      // the latest tap is allowed to continue after an asynchronous boundary.
      setOptimisticMode(nextMode);
      try {
        if (nextMode === 'bluetooth') {
          const granted = await ensureCallBluetoothPermission();
          if (requestId !== applyRequestIdRef.current) return;
          if (!granted) {
            setNotice('Bạn cần cho phép kết nối thiết bị để dùng tai nghe.');
            return;
          }
          const outputs = await refreshOutputs();
          if (requestId !== applyRequestIdRef.current) return;
          if (!outputs.includes('bluetooth') && Platform.OS !== 'ios') {
            setNotice('Chưa tìm thấy tai nghe Bluetooth đang kết nối.');
            return;
          }
        }

        if (requestId !== applyRequestIdRef.current) return;
        setOpen(false);
        await onChange(nextMode);
      } catch {
        if (requestId === applyRequestIdRef.current) {
          showSnackbar({
            message: 'Không thể chuyển chế độ âm thanh. Vui lòng thử lại.',
            type: 'error',
          });
        }
      } finally {
        if (requestId === applyRequestIdRef.current) {
          setOptimisticMode(null);
        }
      }
    },
    [onChange, refreshOutputs],
  );

  return (
    <>
      <View className={compact ? undefined : 'items-center'}>
        <TouchableOpacity
          className={`${
            compact ? '' : 'h-[58px] w-[58px] rounded-full'
          } items-center justify-center border ${
            displayedMode === 'muted'
              ? 'border-amber-300/30 bg-amber-500/20'
              : 'border-white/10 bg-slate-800'
          }`}
          style={
            compact
              ? {
                  width: triggerSize,
                  height: triggerSize,
                  borderRadius: Math.min(18, triggerSize * 0.36),
                }
              : undefined
          }
          activeOpacity={0.82}
          accessibilityRole="button"
          accessibilityLabel={`Thiết bị âm thanh: ${MODE_LABELS[displayedMode]}`}
          onPress={() => {
            setNotice('');
            setOpen(true);
            refreshOutputs();
          }}
        >
          <CurrentIcon size={currentIconSize} color="#ffffff" />
          {displayedMode === 'bluetooth' ? (
            <View className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full border-2 border-slate-800 bg-emerald-400" />
          ) : null}
        </TouchableOpacity>
        {compact ? null : (
          <Text className="mt-2 text-xs font-semibold text-slate-200">
            {MODE_LABELS[displayedMode]}
          </Text>
        )}
      </View>

      <Modal
        animationType="slide"
        transparent
        visible={isOpen}
        statusBarTranslucent
        onRequestClose={() => setOpen(false)}
      >
        <View className="flex-1 justify-end bg-slate-950/70">
          <Pressable
            className="absolute inset-0"
            accessibilityRole="button"
            accessibilityLabel="Đóng chọn thiết bị âm thanh"
            onPress={() => setOpen(false)}
          />
          <SafeAreaView
            edges={['bottom']}
            className="rounded-t-[32px] border-t border-white/10 bg-slate-900 px-5 pt-4"
          >
            <View className="mb-3 flex-row items-center justify-between">
              <View className="flex-1 pr-4">
                <Text className="text-xl font-bold text-white">
                  Âm thanh cuộc gọi
                </Text>
                <Text className="mt-1 text-sm text-slate-400">
                  Chọn nơi bạn muốn nghe cuộc gọi
                </Text>
              </View>
              <TouchableOpacity
                className="h-10 w-10 items-center justify-center rounded-full bg-slate-800"
                accessibilityRole="button"
                accessibilityLabel="Đóng"
                onPress={() => setOpen(false)}
              >
                <X size={21} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <View className="gap-2 pb-3">
              {AUDIO_OUTPUT_CHOICES.map(choice => {
                const selected = choice.mode === displayedMode;
                const unavailableBluetooth =
                  choice.mode === 'bluetooth' && !hasBluetoothOutput;
                const Icon = choice.icon;

                return (
                  <TouchableOpacity
                    key={choice.mode}
                    className={`min-h-[72px] flex-row items-center rounded-2xl border px-4 ${
                      selected
                        ? 'border-blue-500 bg-blue-500/15'
                        : 'border-white/5 bg-slate-800/80'
                    }`}
                    activeOpacity={0.82}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => chooseOutput(choice.mode)}
                  >
                    <View
                      className={`h-11 w-11 items-center justify-center rounded-full ${
                        selected ? 'bg-blue-600' : 'bg-slate-700'
                      }`}
                    >
                      <Icon
                        size={22}
                        color={unavailableBluetooth ? '#94a3b8' : '#ffffff'}
                      />
                    </View>
                    <View className="ml-3 flex-1">
                      <Text
                        className={`text-base font-bold ${
                          unavailableBluetooth ? 'text-slate-400' : 'text-white'
                        }`}
                      >
                        {choice.label}
                      </Text>
                      <Text className="mt-0.5 text-xs text-slate-400">
                        {unavailableBluetooth
                          ? 'Chạm để kiểm tra hoặc kết nối tai nghe'
                          : choice.description}
                      </Text>
                    </View>
                    {selected ? <Check size={22} color="#60a5fa" /> : null}
                  </TouchableOpacity>
                );
              })}
            </View>

            {notice ? (
              <View className="mb-3 rounded-2xl bg-amber-500/15 px-4 py-3">
                <Text className="text-sm font-medium text-amber-200">
                  {notice}
                </Text>
              </View>
            ) : null}
          </SafeAreaView>
        </View>
      </Modal>
    </>
  );
}

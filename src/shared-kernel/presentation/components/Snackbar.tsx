// Description: Provides the single app-wide Snackbar host and notification API.
import { APP_BRAND_COLOR } from '../theme/appColors';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
  XCircle,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type SnackbarType = 'success' | 'error' | 'warning' | 'info';
export type SnackbarDuration = 'short' | 'long' | 'persistent';

export type SnackbarAction = {
  label: string;
  onPress: () => void;
};

export type SnackbarConfig = {
  message: string;
  type?: SnackbarType;
  duration?: SnackbarDuration;
  action?: SnackbarAction;
};

type SnackbarItem = SnackbarConfig & {
  id: number;
  type: SnackbarType;
  duration: SnackbarDuration;
};

export const SNACKBAR_SHORT_DURATION_MS = 3200;
export const SNACKBAR_LONG_DURATION_MS = 5000;
export const SNACKBAR_TOP_SAFE_GAP = 8;
const SNACKBAR_EDGE_GAP = 12;
const MAX_QUEUED_SNACKBARS = 3;

const DURATION_MS: Record<Exclude<SnackbarDuration, 'persistent'>, number> = {
  short: SNACKBAR_SHORT_DURATION_MS,
  long: SNACKBAR_LONG_DURATION_MS,
};

const PALETTE = {
  success: {
    accent: '#059669',
    background: '#ECFDF5',
    border: '#A7F3D0',
    icon: CheckCircle2,
  },
  error: {
    accent: '#DC2626',
    background: '#FEF2F2',
    border: '#FECACA',
    icon: XCircle,
  },
  warning: {
    accent: '#D97706',
    background: '#FFFBEB',
    border: '#FDE68A',
    icon: AlertTriangle,
  },
  info: {
    accent: APP_BRAND_COLOR,
    background: '#EFF6FF',
    border: '#BFDBFE',
    icon: Info,
  },
} satisfies Record<
  SnackbarType,
  {
    accent: string;
    background: string;
    border: string;
    icon: typeof CheckCircle2;
  }
>;

type SnackbarListener = (config: SnackbarConfig) => void;

let snackbarId = 0;
let bufferedSnackbars: SnackbarConfig[] = [];
const listeners = new Set<SnackbarListener>();

function normalizeConfig(
  input: SnackbarConfig | string,
): Required<Pick<SnackbarConfig, 'message' | 'type' | 'duration'>> &
  Pick<SnackbarConfig, 'action'> {
  const config = typeof input === 'string' ? { message: input } : input;

  return {
    message: config.message.trim(),
    type: config.type ?? 'info',
    duration: config.duration ?? 'short',
    action: config.action,
  };
}

export function resolveSnackbarDuration(
  duration: SnackbarDuration,
): number | null {
  return duration === 'persistent' ? null : DURATION_MS[duration];
}

export function showSnackbar(config: SnackbarConfig | string): void {
  const normalized = normalizeConfig(config);
  if (!normalized.message) return;

  if (listeners.size === 0) {
    bufferedSnackbars = [...bufferedSnackbars, normalized].slice(
      -MAX_QUEUED_SNACKBARS,
    );
    return;
  }

  listeners.forEach(listener => listener(normalized));
}

function subscribe(listener: SnackbarListener): () => void {
  listeners.add(listener);

  if (bufferedSnackbars.length > 0) {
    const pending = bufferedSnackbars;
    bufferedSnackbars = [];
    pending.forEach(listener);
  }

  return () => {
    listeners.delete(listener);
  };
}

function SnackbarCard({
  item,
  onDismiss,
}: {
  item: SnackbarItem;
  onDismiss: (id: number) => void;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-28)).current;
  const scale = useRef(new Animated.Value(0.98)).current;
  const dismissingRef = useRef(false);
  const palette = PALETTE[item.type];
  const Icon = palette.icon;

  const dismiss = useCallback(() => {
    if (dismissingRef.current) return;
    dismissingRef.current = true;

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: -18,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 0.98,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => onDismiss(item.id));
  }, [item.id, onDismiss, opacity, scale, translateY]);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        tension: 105,
        friction: 13,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        tension: 110,
        friction: 12,
        useNativeDriver: true,
      }),
    ]).start();

    const durationMs = resolveSnackbarDuration(item.duration);
    if (durationMs === null) return undefined;

    const timer = setTimeout(dismiss, durationMs);
    return () => clearTimeout(timer);
  }, [dismiss, item.duration, opacity, scale, translateY]);

  const handleAction = useCallback(() => {
    item.action?.onPress();
    dismiss();
  }, [dismiss, item.action]);

  return (
    <Animated.View
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={[
        styles.snackbar,
        {
          backgroundColor: palette.background,
          borderColor: palette.border,
          borderLeftColor: palette.accent,
          opacity,
          transform: [{ translateY }, { scale }],
        },
      ]}
    >
      <View
        style={[styles.iconWrap, { backgroundColor: `${palette.accent}18` }]}
      >
        <Icon size={20} color={palette.accent} strokeWidth={2.25} />
      </View>

      <Text style={styles.message} numberOfLines={3}>
        {item.message}
      </Text>

      {item.action ? (
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={handleAction}
          style={styles.actionButton}
        >
          <Text style={[styles.actionLabel, { color: palette.accent }]}>
            {item.action.label}
          </Text>
        </Pressable>
      ) : null}

      <Pressable
        accessibilityLabel="Đóng thông báo"
        accessibilityRole="button"
        hitSlop={10}
        onPress={dismiss}
        style={styles.closeButton}
      >
        <X size={18} color="#64748B" />
      </Pressable>
    </Animated.View>
  );
}

const SnackbarContext = createContext<{
  showSnackbar: (config: SnackbarConfig | string) => void;
} | null>(null);

export function SnackbarProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [queue, setQueue] = useState<SnackbarItem[]>([]);

  const enqueue = useCallback((input: SnackbarConfig | string) => {
    const config = normalizeConfig(input);
    if (!config.message) return;

    setQueue(current => {
      const previous = current[current.length - 1];
      if (
        previous?.message === config.message &&
        previous.type === config.type
      ) {
        return current;
      }

      return [
        ...current,
        {
          ...config,
          id: ++snackbarId,
        },
      ].slice(0, MAX_QUEUED_SNACKBARS);
    });
  }, []);

  const dismiss = useCallback((id: number) => {
    setQueue(current => current.filter(item => item.id !== id));
  }, []);

  useEffect(() => subscribe(enqueue), [enqueue]);

  return (
    <SnackbarContext.Provider value={{ showSnackbar: enqueue }}>
      {children}
      <View pointerEvents="box-none" style={styles.overlay}>
        <View
          pointerEvents="box-none"
          style={[
            styles.host,
            {
              top:
                Math.max(insets.top, SNACKBAR_EDGE_GAP) + SNACKBAR_TOP_SAFE_GAP,
            },
          ]}
        >
          {queue[0] ? (
            <SnackbarCard item={queue[0]} onDismiss={dismiss} />
          ) : null}
        </View>
      </View>
    </SnackbarContext.Provider>
  );
}

export function useSnackbar() {
  return useContext(SnackbarContext) ?? { showSnackbar };
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 10000,
    elevation: 10000,
  },
  host: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  snackbar: {
    width: '100%',
    maxWidth: 560,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderLeftWidth: 4,
    borderRadius: 16,
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 10,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    flex: 1,
    marginLeft: 10,
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  actionButton: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '800',
  },
  closeButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

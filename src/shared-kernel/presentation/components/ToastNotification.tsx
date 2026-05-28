// ToastNotification - Custom animated toast component for success/error feedback
//
// Usage:
//   ToastNotification.show({ message: 'Đã lưu!', type: 'success' });
//
// Add <ToastNotification /> to your screen's JSX to render the toast.

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CheckCircle2, XCircle, AlertTriangle, X } from 'lucide-react-native';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastConfig {
  message: string;
  type?: ToastType;
  duration?: number;
}

interface ToastState extends ToastConfig {
  visible: boolean;
  id: number;
}

// ── Toast Manager ───────────────────────────────────────────────────────────

let toastCounter = 0;
const TOAST_DURATION = 3000;

let showToastFn: ((config: ToastConfig) => void) | null = null;

export function showToast(config: ToastConfig) {
  if (showToastFn) {
    showToastFn(config);
  }
}

// ── Toast Item ──────────────────────────────────────────────────────────────

function ToastItem({
  message,
  type = 'success',
  onDismiss,
}: {
  message: string;
  type: ToastType;
  onDismiss: () => void;
}) {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Slide in from top
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto dismiss after duration
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -100,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => onDismiss());
    }, TOAST_DURATION);

    return () => clearTimeout(timer);
  }, [translateY, opacity, onDismiss]);

  const config = {
    success: {
      bgColor: '#10B981',
      borderColor: '#059669',
      icon: CheckCircle2,
      iconColor: '#FFFFFF',
    },
    error: {
      bgColor: '#EF4444',
      borderColor: '#DC2626',
      icon: XCircle,
      iconColor: '#FFFFFF',
    },
    warning: {
      bgColor: '#F59E0B',
      borderColor: '#D97706',
      icon: AlertTriangle,
      iconColor: '#FFFFFF',
    },
    info: {
      bgColor: '#3B82F6',
      borderColor: '#2563EB',
      icon: CheckCircle2,
      iconColor: '#FFFFFF',
    },
  };

  const { bgColor, borderColor, icon: IconComponent, iconColor } = config[type];

  return (
    <Animated.View
      style={[
        styles.toastContainer,
        {
          transform: [{ translateY }],
          opacity,
          backgroundColor: bgColor,
          borderColor,
        },
      ]}
    >
      <IconComponent size={22} color={iconColor} />
      <Text style={styles.toastMessage}>{message}</Text>
      <TouchableOpacity
        onPress={onDismiss}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        className="ml-2"
      >
        <X size={18} color="#FFFFFF" />
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Toast Provider ──────────────────────────────────────────────────────────

const ToastContext = createContext<{
  show: (config: ToastConfig) => void;
} | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastState[]>([]);

  const show = useCallback((config: ToastConfig) => {
    const id = ++toastCounter;
    setToasts(prev => [...prev, { ...config, visible: true, id }]);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  useEffect(() => {
    showToastFn = show;
  }, [show]);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {/* Toast Container - renders at top of screen */}
      <View style={styles.toastWrapper} pointerEvents="box-none">
        {toasts.map(toast => (
          <ToastItem
            key={toast.id}
            message={toast.message}
            type={toast.type ?? 'success'}
            onDismiss={() => dismiss(toast.id)}
          />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

// ── Hook ────────────────────────────────────────────────────────────────────

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    // Fallback to global showToast if used outside provider
    return { showToast };
  }
  return context;
}

// ── Simple Toast Container (for screens without provider) ──────────────────

/**
 * Lightweight toast container component.
 * Use this when ToastProvider is not available (e.g., in individual screens).
 * Import `showToast` function separately and call it to trigger toasts.
 *
 * Usage in JSX:
 *   import { showToast, ToastContainer } from './ToastNotification';
 *   // In component:
 *     showToast({ message: 'Hello!', type: 'success' });
 *   // In JSX:
 *     <ToastContainer />
 */
export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastState[]>([]);

  const show = useCallback((config: ToastConfig) => {
    const id = ++toastCounter;
    setToasts(prev => [...prev, { ...config, visible: true, id }]);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  useEffect(() => {
    showToastFn = show;
  }, [show]);

  if (toasts.length === 0) return null;

  return (
    <View style={styles.toastWrapper} pointerEvents="box-none">
      {toasts.map(toast => (
        <ToastItem
          key={toast.id}
          message={toast.message}
          type={toast.type ?? 'success'}
          onDismiss={() => dismiss(toast.id)}
        />
      ))}
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  toastWrapper: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    zIndex: 9999,
    alignItems: 'center',
  },
  toastContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    minWidth: 280,
    maxWidth: '100%',
  },
  toastMessage: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
    marginLeft: 12,
  },
});
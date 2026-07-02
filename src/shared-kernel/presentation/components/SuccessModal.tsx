import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  Animated,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Check } from 'lucide-react-native';

interface SuccessModalProps {
  visible: boolean;
  title: string;
  message: string;
  buttonLabel?: string;
  onClose: () => void;
}

export default function SuccessModal({
  visible,
  title,
  message,
  buttonLabel = 'Đồng ý',
  onClose,
}: SuccessModalProps) {
  const scaleVal = useRef(new Animated.Value(0.8)).current;
  const opacityVal = useRef(new Animated.Value(0)).current;
  const checkRotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Fade in & Scale up card
      Animated.parallel([
        Animated.timing(opacityVal, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleVal, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();

      // Spin / pulse checkmark icon
      Animated.sequence([
        Animated.delay(100),
        Animated.spring(checkRotate, {
          toValue: 1,
          tension: 120,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      opacityVal.setValue(0);
      scaleVal.setValue(0.8);
      checkRotate.setValue(0);
    }
  }, [visible, opacityVal, scaleVal, checkRotate]);

  const rotation = checkRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['-45deg', '0deg'],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.card,
            {
              opacity: opacityVal,
              transform: [{ scale: scaleVal }],
            },
          ]}
        >
          {/* Animated Circle Wrapper */}
          <View style={styles.iconCircle}>
            <Animated.View style={{ transform: [{ rotate: rotation }] }}>
              <Check size={36} color="#10B981" strokeWidth={4} />
            </Animated.View>
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <Pressable
            style={({ pressed }) => [
              styles.btn,
              pressed && styles.btnPressed,
            ]}
            onPress={onClose}
          >
            <Text style={styles.btnText}>{buttonLabel}</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)', // Sleek modern dark overlay
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  card: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
    alignItems: 'center',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 3,
    borderColor: '#A7F3D0',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14.5,
    color: '#64748B',
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 28,
  },
  btn: {
    width: '100%',
    backgroundColor: '#2563EB',
    borderRadius: 16,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  btnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  btnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
});

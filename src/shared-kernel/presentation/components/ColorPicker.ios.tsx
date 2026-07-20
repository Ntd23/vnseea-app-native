import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  NativeModules,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Palette } from 'lucide-react-native';

export interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
}

interface NativeColorPickerModule {
  pickColor(initialHex: string, title: string): Promise<string>;
}

const OPAQUE_HEX_PATTERN = /^#[0-9A-F]{6}$/i;

function getNativeColorPicker(): NativeColorPickerModule | undefined {
  return NativeModules.VnseeaColorPicker as
    | NativeColorPickerModule
    | undefined;
}

export function ColorPicker({ value, onChange, label }: ColorPickerProps) {
  const [isPicking, setIsPicking] = useState(false);

  const handlePress = useCallback(async () => {
    if (isPicking) return;

    const nativeColorPicker = getNativeColorPicker();
    if (!nativeColorPicker) {
      console.error('[VNSEEA_COLOR_PICKER] native_module_unavailable');
      Alert.alert(
        label ?? 'Màu sắc',
        'Không thể mở bộ chọn màu hệ thống. Vui lòng cài lại bản ứng dụng mới nhất.',
      );
      return;
    }

    setIsPicking(true);
    try {
      const selectedColor = await nativeColorPicker.pickColor(
        value,
        label ?? '',
      );
      if (OPAQUE_HEX_PATTERN.test(selectedColor)) {
        onChange(selectedColor);
      }
    } catch (error) {
      console.error('[VNSEEA_COLOR_PICKER] native_presentation_error', error);
      Alert.alert(
        label ?? 'Màu sắc',
        'Không thể mở bộ chọn màu hệ thống. Vui lòng thử lại.',
      );
    } finally {
      setIsPicking(false);
    }
  }, [isPicking, label, onChange, value]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label ?? value}
      accessibilityState={{ busy: isPicking }}
      disabled={isPicking}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.buttonPressed,
      ]}
    >
      <View style={[styles.swatch, { backgroundColor: value }]} />
      <Text style={styles.hexValue}>{value.toUpperCase()}</Text>
      {isPicking ? (
        <ActivityIndicator color="#475569" size="small" />
      ) : (
        <Palette color="#475569" size={20} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 56,
    paddingHorizontal: 12,
  },
  buttonPressed: {
    opacity: 0.72,
  },
  swatch: {
    borderColor: 'rgba(15, 23, 42, 0.12)',
    borderRadius: 12,
    borderWidth: 1,
    height: 40,
    marginRight: 12,
    width: 40,
  },
  hexValue: {
    color: '#1E293B',
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
  },
});

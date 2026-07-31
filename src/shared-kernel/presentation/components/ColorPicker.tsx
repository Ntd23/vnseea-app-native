import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Check, ChevronDown, ChevronUp, Sliders, X } from 'lucide-react-native';
import { APP_BRAND_COLOR } from '../theme/appColors';
import { useSafeBottomPadding } from '../layout/useSafeBottomLayout';

const SCREEN_W = Dimensions.get('window').width;

const POPULAR_COLORS = [
  '#3b82f6', '#10b981', '#ef4444', '#f59e0b',
  '#8b5cf6', '#ec4899', '#14b8a6', '#64748b',
];

const PRESET_COLORS = [
  '#3b82f6', '#2563eb', '#1d4ed8', '#0758ff',
  '#10b981', '#059669', '#047857', '#22c55e',
  '#ef4444', '#dc2626', '#b91c1c', '#f43f5e',
  '#f59e0b', '#d97706', '#b45309', '#eab308',
  '#8b5cf6', '#7c3aed', '#6d28d9', '#a855f7',
  '#ec4899', '#db2777', '#be185d', '#f472b6',
  '#14b8a6', '#0d9488', '#0f766e', '#2dd4bf',
  '#64748b', '#475569', '#334155', '#1e293b',
];

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function hexToHsl(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [210, 80, 60];
  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

// Lấy hue từ hex (dùng cho picker grid khi hue đổi)
function hueToHex(hue: number): string {
  return hslToHex(hue, 100, 50);
}

// Memoized picker grid - chỉ re-render khi hue đổi
const MemoPickerGrid = React.memo(function PickerGrid({
  hue,
  cells,
}: {
  hue: number;
  cells: Array<Array<{ s: number; l: number; color: string }>>;
}) {
  return (
    <>
      {cells.map((row, ri) => (
        <View key={ri} style={styles.pickerRow}>
          {row.map((cell, ci) => (
            <View
              key={ci}
              style={[
                styles.pickerCell,
                { backgroundColor: hslToHex(hue, cell.s, cell.l) },
              ]}
            />
          ))}
        </View>
      ))}
    </>
  );
}, (prev, next) => prev.hue === next.hue && prev.cells === next.cells);

// Wrapper để lấy hue từ hueBg hex
function hueBgToHue(hueBg: string): number {
  const [h] = hexToHsl(hueBg);
  return h;
}

interface ColorCustomizeModalProps {
  visible: boolean;
  color: string;
  onChange: (c: string) => void;
  onClose: () => void;
}

function ColorCustomizeModal({ visible, color, onChange, onClose }: ColorCustomizeModalProps) {
  const safeBottomPadding = useSafeBottomPadding(40);
  const PICKER_W = SCREEN_W - 80;
  const PICKER_H = PICKER_W * 0.6;
  const HUE_TRACK_W = SCREEN_W - 80;

  const hueRef = useRef(210);
  const saturationRef = useRef(80);
  const lightnessRef = useRef(60);
  const onChangeRef = useRef(onChange);
  const pickerOffsetRef = useRef({ x: 40, y: 200 });
  const hueOffsetRef = useRef({ x: 40, y: 0 });
  const pickerCursorRef = useRef({ x: PICKER_W * 0.8, y: PICKER_H * 0.4 });
  const hueCursorRef = useRef(0);
  const currentColorRef = useRef<string>(APP_BRAND_COLOR);
  const hueBgRef = useRef<string>(hslToHex(hexToHsl(color)[0], 100, 50));

  // Chỉ re-render khi hueBg thay đổi (kéo hue slider)
  const [hueBgState, setHueBgState] = useState(hueBgRef.current);

  // Refs cho animated values của cursor
  const pickerCursorX = useRef(new Animated.Value(pickerCursorRef.current.x)).current;
  const pickerCursorY = useRef(new Animated.Value(pickerCursorRef.current.y)).current;
  const hueCursorX = useRef(new Animated.Value(hueCursorRef.current)).current;

  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  // Sync khi modal mở - chỉ chạy khi visible thay đổi từ false → true
  const lastVisibleRef = useRef(false);
  const colorRef = useRef(color);
  colorRef.current = color;
  useEffect(() => {
    if (visible && !lastVisibleRef.current) {
      lastVisibleRef.current = true;
      const [h, s, l] = hexToHsl(colorRef.current);
      hueRef.current = h;
      saturationRef.current = s;
      lightnessRef.current = l;
      const cx = (s / 100) * PICKER_W;
      const cy = ((100 - l) / 100) * PICKER_H;
      const hx = (h / 360) * (HUE_TRACK_W - 20);
      pickerCursorRef.current = { x: cx, y: cy };
      hueCursorRef.current = hx;
      pickerCursorX.setValue(cx);
      pickerCursorY.setValue(cy);
      hueCursorX.setValue(hx);
      currentColorRef.current = colorRef.current;
      const newHueBg = hslToHex(h, 100, 50);
      hueBgRef.current = newHueBg;
      setHueBgState(newHueBg);

      setTimeout(() => {
        pickerRef.current?.measureInWindow((x, y) => {
          pickerOffsetRef.current = { x, y };
        });
        hueTrackRef.current?.measureInWindow((x, y) => {
          hueOffsetRef.current = { x, y };
        });
      }, 50);
    }
    if (!visible) {
      lastVisibleRef.current = false;
    }
  }, [visible]);

  const pickerRef = useRef<View>(null);
  const hueTrackRef = useRef<View>(null);

  // Picker grid: 8 cột (saturation) × 6 hàng (lightness)
  const COLS = 8;
  const ROWS = 6;
  const cellW = PICKER_W / COLS;
  const cellH = PICKER_H / ROWS;

  // Tạo màu cells dựa trên hue hiện tại - dùng useMemo để cache
  const cells = useMemo(() => {
    const result: Array<Array<{ s: number; l: number; color: string }>> = [];
    for (let r = 0; r < ROWS; r++) {
      const row = [];
      const l = 100 - ((r + 0.5) / ROWS) * 100;
      for (let c = 0; c < COLS; c++) {
        const s = ((c + 0.5) / COLS) * 100;
        // Sẽ tính color dựa trên hue hiện tại trong render
        row.push({ s, l, color: '' });
      }
      result.push(row);
    }
    return result;
  }, []);

  const onPickerTouchStart = useCallback((e: any) => {
    pickerRef.current?.measureInWindow((x, y) => {
      pickerOffsetRef.current = { x, y };
    });
    handlePickerTouch(e);
  }, []);

  const onPickerTouchMove = useCallback((e: any) => {
    handlePickerTouch(e);
  }, []);

  const handlePickerTouch = useCallback((e: any) => {
    const pageX = e.nativeEvent.pageX;
    const pageY = e.nativeEvent.pageY;
    const relX = Math.max(0, Math.min(PICKER_W, pageX - pickerOffsetRef.current.x));
    const relY = Math.max(0, Math.min(PICKER_H, pageY - pickerOffsetRef.current.y));
    const s = (relX / PICKER_W) * 100;
    const l = 100 - (relY / PICKER_H) * 100;
    saturationRef.current = s;
    lightnessRef.current = l;
    pickerCursorRef.current = { x: relX, y: relY };
    pickerCursorX.setValue(relX);
    pickerCursorY.setValue(relY);
    const newColor = hslToHex(hueRef.current, s, l);
    currentColorRef.current = newColor;
    onChangeRef.current(newColor);
  }, [PICKER_W, PICKER_H]);

  const onHueTouchStart = useCallback((e: any) => {
    hueTrackRef.current?.measureInWindow((x, y) => {
      hueOffsetRef.current = { x, y };
    });
    handleHueTouch(e);
  }, []);

  const onHueTouchMove = useCallback((e: any) => {
    handleHueTouch(e);
  }, []);

  const handleHueTouch = useCallback((e: any) => {
    const pageX = e.nativeEvent.pageX;
    const h = Math.min(360, Math.max(0, ((pageX - hueOffsetRef.current.x) / HUE_TRACK_W) * 360));
    hueRef.current = h;
    const hx = (h / 360) * (HUE_TRACK_W - 20);
    hueCursorRef.current = hx;
    hueCursorX.setValue(hx);
    const newHueBg = hslToHex(h, 100, 50);
    hueBgRef.current = newHueBg;
    setHueBgState(newHueBg);
    const newColor = hslToHex(h, saturationRef.current, lightnessRef.current);
    currentColorRef.current = newColor;
    onChangeRef.current(newColor);
  }, [HUE_TRACK_W]);

  // Static hue gradient - tạo 1 lần, không re-render khi kéo
  const hueStops = [
    '#ff0000', '#ff8000', '#ffff00', '#80ff00',
    '#00ff00', '#00ff80', '#00ffff', '#0080ff',
    '#0000ff', '#8000ff', '#ff00ff', '#ff0080', '#ff0000',
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View
          style={[
            styles.modalContent,
            { paddingBottom: safeBottomPadding },
          ]}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Tùy chỉnh màu</Text>
            <TouchableOpacity style={styles.modalClose} onPress={onClose}>
              <X size={18} color="#475569" />
            </TouchableOpacity>
          </View>

          {/* 2D Picker - dùng grid cells với màu thực */}
          <View
            ref={pickerRef}
            collapsable={false}
            style={[styles.pickerArea, { width: PICKER_W, height: PICKER_H }]}
            onTouchStart={onPickerTouchStart}
            onTouchMove={onPickerTouchMove}
          >
            <MemoPickerGrid
              hue={hueBgToHue(hueBgState)}
              cells={cells}
            />
            {/* Cursor - dùng Animated để không re-render khi kéo */}
            <Animated.View
              pointerEvents="none"
              style={[
                styles.pickerCursor,
                {
                  transform: [
                    { translateX: Animated.subtract(pickerCursorX, 12) },
                    { translateY: Animated.subtract(pickerCursorY, 12) },
                  ],
                },
              ]}
            />
          </View>

          {/* Hue Slider */}
          <View style={styles.hueContainer}>
            <View
              ref={hueTrackRef}
              collapsable={false}
              style={styles.hueTrack}
              onTouchStart={onHueTouchStart}
              onTouchMove={onHueTouchMove}
            >
              <View style={styles.hueGradient}>
                {hueStops.map((c, i) => (
                  <View key={i} style={[styles.hueSegment, { backgroundColor: c }]} />
                ))}
              </View>
              <Animated.View
                pointerEvents="none"
                style={[styles.hueThumb, { transform: [{ translateX: hueCursorX }] }]}
              />
            </View>
          </View>

          <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
            <Text style={styles.doneBtnText}>Xong</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
}

export function ColorPicker({ value, onChange, label }: ColorPickerProps) {
  const [showCustomize, setShowCustomize] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [tempColor, setTempColor] = useState(value);

  useEffect(() => {
    setTempColor(value);
  }, [value]);

  const handleColorSelect = useCallback((color: string) => {
    setTempColor(color);
    onChange(color);
    setIsExpanded(false);
  }, [onChange]);

  const isSelected = useCallback((c: string) => {
    return tempColor.toLowerCase() === c.toLowerCase();
  }, [tempColor]);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={label ?? 'Màu thẻ'}
        accessibilityState={{ expanded: isExpanded }}
        activeOpacity={0.75}
        style={styles.previewRow}
        onPress={() => setIsExpanded(current => !current)}
      >
        <View style={[styles.previewColor, { backgroundColor: tempColor }]}>
          <Text style={styles.previewHash}>#</Text>
        </View>
        <View style={styles.previewInfo}>
          <Text style={styles.previewHex}>{tempColor.replace('#', '').toUpperCase()}</Text>
          <Text style={styles.previewHint}>Đã chọn</Text>
        </View>
        {isExpanded ? (
          <ChevronUp size={20} color="#64748b" />
        ) : (
          <ChevronDown size={20} color="#64748b" />
        )}
      </TouchableOpacity>

      {isExpanded ? (
        <View style={styles.pickerOptions}>
          <TouchableOpacity
            style={styles.customizeBtn}
            onPress={() => setShowCustomize(true)}
          >
            <Sliders size={14} color="#64748b" />
            <Text style={styles.customizeBtnText}>Tùy chỉnh</Text>
          </TouchableOpacity>

          <Text style={styles.sectionTitle}>Phổ biến</Text>
          <View style={styles.popularRow}>
            {POPULAR_COLORS.map((color) => (
              <TouchableOpacity
                key={color}
                style={[
                  styles.colorCircle,
                  { backgroundColor: color },
                  isSelected(color) && styles.colorCircleSelected,
                ]}
                onPress={() => handleColorSelect(color)}
              >
                {isSelected(color) && <Check size={16} color="#ffffff" strokeWidth={3} />}
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Tất cả màu</Text>
          <View style={styles.paletteGrid}>
            {PRESET_COLORS.map((color) => (
              <TouchableOpacity
                key={color}
                style={[
                  styles.colorCircleSmall,
                  { backgroundColor: color },
                  isSelected(color) && styles.colorCircleSelected,
                ]}
                onPress={() => handleColorSelect(color)}
              >
                {isSelected(color) && <Check size={12} color="#ffffff" strokeWidth={3} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : null}

      <ColorCustomizeModal
        visible={showCustomize}
        color={tempColor}
        onChange={(c) => {
          setTempColor(c);
          onChange(c);
        }}
        onClose={() => {
          setShowCustomize(false);
          setIsExpanded(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 4,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  pickerOptions: {
    marginTop: 12,
  },
  previewColor: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  previewHash: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ffffff',
    opacity: 0.5,
  },
  previewInfo: {
    flex: 1,
    marginLeft: 12,
  },
  previewHex: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  previewHint: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  customizeBtn: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  customizeBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginLeft: 6,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: '#94a3b8',
    marginBottom: 8,
    marginTop: 4,
  },
  popularRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    gap: 8,
  },
  colorCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorCircleSmall: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorCircleSelected: {
    borderWidth: 2,
    borderColor: '#0f172a',
    transform: [{ scale: 1.1 }],
  },
  paletteGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerArea: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    alignSelf: 'center',
    position: 'relative',
  },
  pickerRow: {
    flex: 1,
    flexDirection: 'row',
  },
  pickerCell: {
    flex: 1,
  },
  pickerCursor: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#ffffff',
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  hueContainer: {
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  hueTrack: {
    height: 24,
    justifyContent: 'center',
    position: 'relative',
  },
  hueGradient: {
    flexDirection: 'row',
    height: 16,
    borderRadius: 8,
    overflow: 'hidden',
  },
  hueSegment: {
    flex: 1,
  },
  hueThumb: {
    position: 'absolute',
    width: 20,
    height: 24,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#1e293b',
    marginLeft: -10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  doneBtn: {
    backgroundColor: APP_BRAND_COLOR,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  doneBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
});

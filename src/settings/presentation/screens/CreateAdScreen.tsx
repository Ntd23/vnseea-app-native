// Description: Redesigned Create Ad screen with modern UI, animations and effects.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronDown,
  DollarSign,
  Globe,
  ImagePlus,
  MapPin,
  Send,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useCreateAdViewModel } from '../../application/view-models/useCreateAdViewModel';
import type { AdGender } from '../../application/view-models/useCreateAdViewModel';

const { width } = Dimensions.get('window');

// Animated gradient background
function AnimatedHeader() {
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulseAnim]);

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '100%',
          backgroundColor: '#4f46e5',
        },
        {
          opacity: pulseAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 0.85],
          }),
        },
      ]}
    />
  );
}

// Floating animated particles
function FloatingParticles() {
  const particles = Array.from({ length: 6 }, (_, i) => ({
    id: i,
    size: 8 + Math.random() * 12,
    x: Math.random() * width,
    delay: Math.random() * 2000,
  }));

  return (
    <>
      {particles.map(p => (
        <AnimatedParticle key={p.id} size={p.size} initialX={p.x} delay={p.delay} />
      ))}
    </>
  );
}

function AnimatedParticle({ size, initialX, delay }: { size: number; initialX: number; delay: number }) {
  const translateY = useRef(new Animated.Value(-50)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: 200,
            duration: 4000,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0.3,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: 400,
            duration: 4000,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
      ]),
    ).start();
  }, [translateY, opacity, delay]);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 0,
        left: initialX,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: 'rgba(255,255,255,0.3)',
        transform: [{ translateY }],
        opacity,
      }}
    />
  );
}

// Step progress indicator
function StepProgress({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16 }}>
      {Array.from({ length: totalSteps }, (_, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View
            style={{
              width: i <= currentStep ? 28 : 20,
              height: i <= currentStep ? 28 : 20,
              borderRadius: i <= currentStep ? 14 : 10,
              backgroundColor: i <= currentStep ? '#fbbf24' : 'rgba(255,255,255,0.3)',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 2,
              borderColor: i <= currentStep ? '#fbbf24' : 'rgba(255,255,255,0.5)',
            }}
          >
            {i < currentStep ? (
              <CheckCircle2 size={14} color="#ffffff" />
            ) : (
              <Text style={{ fontSize: 12, fontWeight: '700', color: i <= currentStep ? '#ffffff' : 'rgba(255,255,255,0.7)' }}>
                {i + 1}
              </Text>
            )}
          </View>
          {i < totalSteps - 1 && (
            <View
              style={{
                width: 24,
                height: 2,
                backgroundColor: i < currentStep ? '#fbbf24' : 'rgba(255,255,255,0.3)',
                marginHorizontal: 4,
              }}
            />
          )}
        </View>
      ))}
    </View>
  );
}

// Animated card with press effect
function AnimatedCard({ children, style, onPress }: { children: React.ReactNode; style?: object; onPress?: () => void }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const shadowAnim = useRef(new Animated.Value(4)).current;

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.98,
        useNativeDriver: true,
      }),
      Animated.timing(shadowAnim, {
        toValue: 2,
        duration: 100,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.timing(shadowAnim, {
        toValue: 4,
        duration: 100,
        useNativeDriver: false,
      }),
    ]).start();
  };

  return (
    <Animated.View
      style={[
        {
          transform: [{ scale: scaleAnim }],
          shadowRadius: shadowAnim,
        },
        style,
      ]}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}

// Glassmorphism card effect
function GlassCard({ children, style }: { children: React.ReactNode; style?: object }) {
  return (
    <View
      style={[
        {
          backgroundColor: 'rgba(255,255,255,0.95)',
          borderRadius: 20,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.5)',
          paddingHorizontal: 20,
          paddingVertical: 20,
          marginBottom: 16,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 16,
          elevation: 4,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

// Section header with icon
function SectionHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          backgroundColor: 'rgba(79,70,229,0.1)',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 12,
        }}
      >
        {icon}
      </View>
      <View>
        <Text style={{ fontSize: 16, fontWeight: '700', color: '#1e1b4b' }}>{title}</Text>
        {subtitle && <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{subtitle}</Text>}
      </View>
    </View>
  );
}

// Animated input field
function AnimatedInput({
  label,
  placeholder,
  value,
  onChangeText,
  icon,
  keyboardType = 'default',
  multiline = false,
  unit,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  icon?: React.ReactNode;
  keyboardType?: 'default' | 'numeric' | 'url';
  multiline?: boolean;
  unit?: string;
}) {
  const [focused, setFocused] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(borderAnim, {
      toValue: focused ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [focused, borderAnim]);

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#e5e7eb', '#4f46e5'],
  });

  return (
    <Animated.View
      style={{
        marginBottom: 14,
        borderRadius: 14,
        backgroundColor: '#ffffff',
        borderWidth: 1.5,
        borderColor,
        overflow: 'hidden',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: multiline ? 12 : 10 }}>
        {icon && <View style={{ marginRight: 10 }}>{icon}</View>}
        <TextInput
          style={{
            flex: 1,
            fontSize: 14,
            color: '#1e1b4b',
            minHeight: multiline ? 80 : undefined,
            textAlignVertical: multiline ? 'top' : 'center',
          }}
          placeholder={placeholder}
          placeholderTextColor="#9ca3af"
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          keyboardType={keyboardType}
          multiline={multiline}
          numberOfLines={multiline ? 4 : 1}
        />
        {unit && (
          <View
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 8,
              backgroundColor: 'rgba(79,70,229,0.1)',
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#4f46e5' }}>{unit}</Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

// Gender selector with pill animation
function GenderPill({ options, selected, onChange }: {
  options: { value: AdGender; label: string; icon?: string }[];
  selected: AdGender;
  onChange: (v: AdGender) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {options.map(opt => {
        const isSelected = selected === opt.value;
        return (
          <TouchableOpacity
            key={opt.value}
            activeOpacity={0.8}
            onPress={() => onChange(opt.value)}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 12,
              borderRadius: 12,
              backgroundColor: isSelected ? '#4f46e5' : '#f3f4f6',
              borderWidth: 1.5,
              borderColor: isSelected ? '#4f46e5' : 'transparent',
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: isSelected ? '600' : '500', color: isSelected ? '#ffffff' : '#6b7280' }}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// Dropdown selector
function DropdownSelector({ label, value, onPress }: { label: string; value: string; onPress?: () => void }) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 14,
        backgroundColor: '#f9fafb',
        borderWidth: 1.5,
        borderColor: '#e5e7eb',
        marginBottom: 14,
      }}
    >
      <Text style={{ fontSize: 14, color: value ? '#1e1b4b' : '#9ca3af' }}>
        {value || label}
      </Text>
      <ChevronDown size={18} color="#6b7280" />
    </TouchableOpacity>
  );
}

// Submit button with loading animation
function SubmitButton({ onPress, disabled, loading }: { onPress: () => void; disabled: boolean; loading: boolean }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (loading) {
      Animated.loop(
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ).start();
    } else {
      shimmerAnim.setValue(0);
    }
  }, [loading, shimmerAnim]);

  const handlePressIn = () => {
    if (!disabled && !loading) {
      Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true }).start();
    }
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 16,
          borderRadius: 16,
          backgroundColor: disabled ? '#d1d5db' : '#4f46e5',
          shadowColor: disabled ? '#9ca3af' : '#4f46e5',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: disabled ? 0.1 : 0.4,
          shadowRadius: 20,
          elevation: 6,
          marginTop: 8,
          marginBottom: 24,
        }}
      >
        {loading ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Animated.View
              style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                borderWidth: 2,
                borderColor: 'rgba(255,255,255,0.3)',
                borderTopColor: '#ffffff',
                transform: [
                  {
                    rotate: shimmerAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '360deg'],
                    }),
                  },
                ],
              }}
            />
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#ffffff' }}>Đang xử lý...</Text>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Send size={18} color="#ffffff" />
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#ffffff' }}>Tạo Quảng Cáo</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Main screen ───────────────────────────────────────────────────────────────

function CreateAdScreen() {
  const navigation = useNavigation<any>();
  const { form, updateField, isSubmitting, handleSubmit } = useCreateAdViewModel();
  const [currentStep, setCurrentStep] = useState(0);
  const totalSteps = 4;

  const stepTitles = ['Phương tiện', 'Chi tiết', 'Nhắm đối tượng', 'Ngân sách'];
  const stepIcons = [<ImagePlus size={20} color="#4f46e5" />, <TrendingUp size={20} color="#4f46e5" />, <Target size={20} color="#4f46e5" />, <DollarSign size={20} color="#4f46e5" />];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} edges={['top']}>
      <StatusBar barStyle="light-content" />

      {/* Animated header */}
      <View style={{ backgroundColor: '#4f46e5', paddingBottom: 20 }}>
        <AnimatedHeader />
        <FloatingParticles />

        {/* Header row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8 }}>
          <TouchableOpacity
            activeOpacity={0.8}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={() => navigation.goBack()}
            style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
          >
            <ArrowLeft size={24} color="#ffffff" />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#ffffff' }}>Tạo Quảng Cáo</Text>
            <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>Bước {currentStep + 1} - {stepTitles[currentStep]}</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Step progress */}
        <StepProgress currentStep={currentStep} totalSteps={totalSteps} />
      </View>

      {/* Body */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Step 1: Media */}
          <GlassCard>
            <SectionHeader
              icon={<ImagePlus size={20} color="#4f46e5" />}
              title="Phương tiện"
              subtitle="Hình ảnh hoặc video cho quảng cáo"
            />

            <TouchableOpacity
              activeOpacity={0.8}
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 32,
                borderRadius: 16,
                borderWidth: 2,
                borderStyle: 'dashed',
                borderColor: '#c7d2fe',
                backgroundColor: '#fafafa',
              }}
            >
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: 'rgba(79,70,229,0.1)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 12,
                }}
              >
                <ImagePlus size={28} color="#4f46e5" />
              </View>
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#4f46e5', marginBottom: 6 }}>Tải lên phương tiện</Text>
              <Text style={{ fontSize: 12, color: '#9ca3af' }}>PNG, JPG, MP4 — tối đa 50 MB</Text>
            </TouchableOpacity>
          </GlassCard>

          {/* Step 2: Details */}
          <GlassCard>
            <SectionHeader
              icon={<TrendingUp size={20} color="#4f46e5" />}
              title="Chi tiết chiến dịch"
              subtitle="Thông tin cơ bản về quảng cáo"
            />

            <AnimatedInput
              label="Tiêu đề"
              placeholder="Nhập tiêu đề quảng cáo..."
              value={form.title}
              onChangeText={v => updateField('title', v)}
            />

            <AnimatedInput
              label="Mô tả"
              placeholder="Mô tả chi tiết nội dung quảng cáo của bạn..."
              value={form.description}
              onChangeText={v => updateField('description', v)}
              multiline
            />

            <AnimatedInput
              label="Website"
              placeholder="https://example.com"
              value={form.website}
              onChangeText={v => updateField('website', v)}
              icon={<Globe size={18} color="#6b7280" />}
              keyboardType="url"
            />
          </GlassCard>

          {/* Step 3: Targeting */}
          <GlassCard>
            <SectionHeader
              icon={<Target size={20} color="#4f46e5" />}
              title="Nhắm đối tượng"
              subtitle="Xác định đối tượng mục tiêu"
            />

            <AnimatedInput
              label="Vị trí"
              placeholder="Quốc gia, thành phố..."
              value={form.location}
              onChangeText={v => updateField('location', v)}
              icon={<MapPin size={18} color="#6b7280" />}
            />

            <Text style={{ fontSize: 12, fontWeight: '600', color: '#6b7280', marginBottom: 10, letterSpacing: 0.5 }}>GIỚI TÍNH</Text>
            <GenderPill
              options={[
                { value: 'male', label: 'Nam' },
                { value: 'female', label: 'Nữ' },
                { value: 'all', label: 'Tất cả' },
              ]}
              selected={form.gender}
              onChange={v => updateField('gender', v)}
            />

            <DropdownSelector label="Chọn độ tuổi" value={form.ageRange} />
            <DropdownSelector label="Chọn trang để quảng cáo" value="" />
          </GlassCard>

          {/* Step 4: Budget */}
          <GlassCard>
            <SectionHeader
              icon={<DollarSign size={20} color="#4f46e5" />}
              title="Ngân sách & Lịch trình"
              subtitle="Thiết lập ngân sách và thời gian"
            />

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#6b7280', marginBottom: 10, letterSpacing: 0.5 }}>NGÂN SÁCH</Text>
                <AnimatedInput
                  label=""
                  placeholder="0"
                  value={form.budget}
                  onChangeText={v => updateField('budget', v)}
                  unit="VND"
                  keyboardType="numeric"
                />
              </View>
            </View>

            <AnimatedInput
              label="Ngày bắt đầu"
              placeholder="mm/dd/yyyy"
              value={form.startDate}
              onChangeText={v => updateField('startDate', v)}
              icon={<Calendar size={18} color="#6b7280" />}
              keyboardType="numeric"
            />
          </GlassCard>

          {/* Submit */}
          <SubmitButton onPress={handleSubmit} disabled={isSubmitting} loading={isSubmitting} />

          {/* Bottom info */}
          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Users size={14} color="#9ca3af" />
              <Text style={{ fontSize: 12, color: '#9ca3af' }}>Quảng cáo sẽ được duyệt trước khi hiển thị</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default CreateAdScreen;

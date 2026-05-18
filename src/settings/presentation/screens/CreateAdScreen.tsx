// Description: Create Ad form screen - lets users configure and submit ad campaigns.
import React, { useCallback, useState } from 'react';
import {
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
  ChevronDown,
  Globe,
  ImagePlus,
  MapPin,
  Send,
  Users,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useCreateAdViewModel } from '../../application/view-models/useCreateAdViewModel';
import type { AdGender } from '../../application/view-models/useCreateAdViewModel';

// ─── FieldShell: borderWidth cố định để tránh re-layout ───────────────────────

function FieldShell({
  children,
  focused = false,
  multiline = false,
}: {
  children: React.ReactNode;
  focused?: boolean;
  multiline?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: multiline ? 'flex-start' : 'center',
        paddingHorizontal: 16,
        paddingVertical: multiline ? 12 : 13,
        marginBottom: 16,
        borderRadius: 14,
        // borderWidth cố định → không gây layout shift → keyboard không bị dismiss
        borderWidth: 1,
        borderColor: focused ? '#0000ff' : '#cbd5e1',
        backgroundColor: focused ? '#f6f8ff' : '#ffffff',
        // Glow hiệu ứng thay vì đổi borderWidth
        shadowColor: focused ? '#0000ff' : '#000000',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: focused ? 0.15 : 0,
        shadowRadius: focused ? 5 : 0,
        elevation: focused ? 2 : 0,
      }}>
      {children}
    </View>
  );
}

// ─── SelectShell ───────────────────────────────────────────────────────────────

function SelectShell({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon?: React.ReactNode;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 13,
        marginBottom: 16,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#cbd5e1',
        backgroundColor: '#ffffff',
      }}>
      {icon ? <View style={{ marginRight: 12 }}>{icon}</View> : null}
      <Text style={{ flex: 1, fontSize: 14, color: '#94a3b8' }}>{label}</Text>
      <ChevronDown size={18} color="#94a3b8" />
    </TouchableOpacity>
  );
}

// ─── SectionLabel ──────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: string }) {
  return (
    <Text
      style={{
        fontSize: 11,
        fontWeight: '700',
        color: '#64748b',
        letterSpacing: 0.7,
        marginBottom: 8,
        paddingHorizontal: 2,
      }}>
      {children}
    </Text>
  );
}

// ─── FormCard ──────────────────────────────────────────────────────────────────

function FormCard({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <View
      style={{
        backgroundColor: '#ffffff',
        borderRadius: 18,
        borderWidth: 1,
        borderColor: 'rgba(0,0,255,0.08)',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 4,
        marginBottom: 12,
        shadowColor: '#0000ff',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 1,
      }}>
      {title ? (
        <Text
          style={{
            fontSize: 15,
            fontWeight: '700',
            color: '#1a1c1e',
            marginBottom: 20,
          }}>
          {title}
        </Text>
      ) : null}
      {children}
    </View>
  );
}

// ─── Gender radio ──────────────────────────────────────────────────────────────

const GENDER_OPTIONS: { value: AdGender; label: string }[] = [
  { value: 'male', label: 'Nam' },
  { value: 'female', label: 'Nữ' },
  { value: 'all', label: 'Tất cả' },
];

function GenderSelector({
  selected,
  onChange,
}: {
  selected: AdGender;
  onChange: (v: AdGender) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
      {GENDER_OPTIONS.map(opt => {
        const active = selected === opt.value;
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
              gap: 8,
              paddingVertical: 13,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: active ? '#0000ff' : '#cbd5e1',
              backgroundColor: active ? '#eef0ff' : '#ffffff',
            }}>
            <View
              style={{
                width: 16,
                height: 16,
                borderRadius: 8,
                borderWidth: active ? 5 : 1.5,
                borderColor: active ? '#0000ff' : '#cbd5e1',
                backgroundColor: '#ffffff',
              }}
            />
            <Text
              style={{
                fontSize: 14,
                fontWeight: active ? '600' : '400',
                color: active ? '#0000ff' : '#64748b',
              }}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Main screen ───────────────────────────────────────────────────────────────

function CreateAdScreen() {
  const navigation = useNavigation<any>();
  const { form, updateField, isSubmitting, handleSubmit } =
    useCreateAdViewModel();

  const [focusedField, setFocusedField] = useState<string | null>(null);

  const onFocus = useCallback((field: string) => {
    setFocusedField(field);
  }, []);

  const onBlur = useCallback(() => {
    setFocusedField(null);
  }, []);

  const isFocused = (field: string) => focusedField === field;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0000ff' }} edges={['top']}>
      <StatusBar barStyle="light-content" />

      {/* Blue top bar */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: '#0000ff',
        }}>
        <TouchableOpacity
          activeOpacity={0.8}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          onPress={() => navigation.goBack()}>
          <ArrowLeft size={22} color="#ffffff" />
        </TouchableOpacity>
        <Text
          style={{
            flex: 1,
            textAlign: 'center',
            fontSize: 15,
            fontWeight: '600',
            color: '#ffffff',
            marginRight: 32,
          }}>
          Tạo quảng cáo
        </Text>
      </View>

      {/* Body — behavior="padding" iOS, undefined Android để tránh keyboard dismiss */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={{ flex: 1, backgroundColor: '#f1f4fb' }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 }}
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={false}>

          {/* ── Tập phương tiện ── */}
          <View
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 18,
              borderWidth: 1,
              borderColor: 'rgba(0,0,255,0.08)',
              paddingHorizontal: 20,
              paddingTop: 20,
              paddingBottom: 20,
              marginBottom: 12,
              shadowColor: '#0000ff',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.04,
              shadowRadius: 8,
              elevation: 1,
            }}>
            <Text
              style={{
                fontSize: 15,
                fontWeight: '700',
                color: '#1a1c1e',
                marginBottom: 16,
              }}>
              Tập phương tiện
            </Text>

            <TouchableOpacity
              activeOpacity={0.8}
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 16,
                borderWidth: 1.5,
                borderStyle: 'dashed',
                borderColor: 'rgba(0,0,255,0.25)',
                backgroundColor: '#f4f6ff',
                // Chiều cao đủ để chứa hết nội dung
                paddingTop: 32,
                paddingBottom: 32,
                paddingHorizontal: 16,
              }}>
              {/* Icon */}
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: '#dfe4ff',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 14,
                }}>
                <ImagePlus size={24} color="#0000ff" />
              </View>

              {/* Title */}
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: '#0000ff',
                  marginBottom: 6,
                  textAlign: 'center',
                }}>
                Tải lên hình ảnh hoặc video
              </Text>

              {/* Subtitle — không bị cắt vì container tự mở rộng */}
              <Text
                style={{
                  fontSize: 12,
                  color: '#94a3b8',
                  textAlign: 'center',
                }}>
                PNG, JPG, MP4 — tối đa 50 MB
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── Chi tiết ── */}
          <FormCard title="Chi tiết">
            <SectionLabel>TIÊU ĐỀ CHIẾN DỊCH</SectionLabel>
            <FieldShell focused={isFocused('title')}>
              <TextInput
                style={{ flex: 1, fontSize: 14, color: '#1a1c1e' }}
                placeholder="Nhập tiêu đề ngắn gọn..."
                placeholderTextColor="#94a3b8"
                value={form.title}
                onChangeText={v => updateField('title', v)}
                onFocus={() => onFocus('title')}
                onBlur={onBlur}
                returnKeyType="next"
              />
            </FieldShell>

            <SectionLabel>MÔ TẢ CHIẾN DỊCH</SectionLabel>
            <FieldShell focused={isFocused('description')} multiline>
              <TextInput
                style={{
                  flex: 1,
                  fontSize: 14,
                  color: '#1a1c1e',
                  minHeight: 96,
                  textAlignVertical: 'top',
                }}
                placeholder="Mô tả chi tiết nội dung quảng cáo của bạn..."
                placeholderTextColor="#94a3b8"
                value={form.description}
                onChangeText={v => updateField('description', v)}
                onFocus={() => onFocus('description')}
                onBlur={onBlur}
                multiline
                numberOfLines={4}
              />
            </FieldShell>
          </FormCard>

          {/* ── Ngày bắt đầu ── */}
          <FormCard>
            <SectionLabel>NGÀY BẮT ĐẦU</SectionLabel>
            <FieldShell focused={isFocused('startDate')}>
              <TextInput
                style={{ flex: 1, fontSize: 14, color: '#1a1c1e' }}
                placeholder="mm/dd/yyyy"
                placeholderTextColor="#94a3b8"
                value={form.startDate}
                onChangeText={v => updateField('startDate', v)}
                onFocus={() => onFocus('startDate')}
                onBlur={onBlur}
                keyboardType="numeric"
              />
              <Calendar
                size={18}
                color={isFocused('startDate') ? '#0000ff' : '#94a3b8'}
              />
            </FieldShell>
          </FormCard>

          {/* ── Website ── */}
          <FormCard>
            <SectionLabel>WEBSITE</SectionLabel>
            <FieldShell focused={isFocused('website')}>
              <Globe
                size={18}
                color={isFocused('website') ? '#0000ff' : '#94a3b8'}
              />
              <TextInput
                style={{ flex: 1, fontSize: 14, color: '#1a1c1e', marginLeft: 12 }}
                placeholder="https://example.com"
                placeholderTextColor="#94a3b8"
                value={form.website}
                onChangeText={v => updateField('website', v)}
                onFocus={() => onFocus('website')}
                onBlur={onBlur}
                keyboardType="url"
                autoCapitalize="none"
              />
            </FieldShell>
          </FormCard>

          {/* ── Trang của tôi ── */}
          <FormCard>
            <SectionLabel>TRANG CỦA TÔI</SectionLabel>
            <SelectShell
              label="Chọn trang để quảng cáo"
              icon={<Users size={18} color="#94a3b8" />}
            />
          </FormCard>

          {/* ── Nhóm mục tiêu ── */}
          <FormCard title="Nhóm mục tiêu">
            <SectionLabel>VỊ TRÍ</SectionLabel>
            <FieldShell focused={isFocused('location')}>
              <MapPin
                size={18}
                color={isFocused('location') ? '#0000ff' : '#94a3b8'}
              />
              <TextInput
                style={{ flex: 1, fontSize: 14, color: '#1a1c1e', marginLeft: 12 }}
                placeholder="Quốc gia, Thành phố..."
                placeholderTextColor="#94a3b8"
                value={form.location}
                onChangeText={v => updateField('location', v)}
                onFocus={() => onFocus('location')}
                onBlur={onBlur}
              />
            </FieldShell>

            <SectionLabel>ĐỘ TUỔI</SectionLabel>
            <SelectShell label={form.ageRange} />

            <SectionLabel>GIỚI TÍNH</SectionLabel>
            <GenderSelector
              selected={form.gender}
              onChange={v => updateField('gender', v)}
            />

            <SectionLabel>VỊ TRÍ QUẢNG CÁO</SectionLabel>
            <SelectShell label={form.adPosition} />
          </FormCard>

          {/* ── Ngân sách ── */}
          <FormCard title="Ngân sách">
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-end' }}>
              {/* Ngân sách */}
              <View style={{ flex: 1 }}>
                <SectionLabel>NGÂN SÁCH</SectionLabel>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 16,
                    height: 48,
                    marginBottom: 16,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: isFocused('budget') ? '#0000ff' : '#cbd5e1',
                    backgroundColor: isFocused('budget') ? '#f6f8ff' : '#ffffff',
                    shadowColor: isFocused('budget') ? '#0000ff' : 'transparent',
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: isFocused('budget') ? 0.15 : 0,
                    shadowRadius: isFocused('budget') ? 5 : 0,
                    elevation: isFocused('budget') ? 2 : 0,
                  }}>
                  <TextInput
                    style={{ flex: 1, fontSize: 14, color: '#1a1c1e' }}
                    value={form.budget}
                    onChangeText={v => updateField('budget', v)}
                    onFocus={() => onFocus('budget')}
                    onBlur={onBlur}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* Đơn vị — cùng height 48 với input */}
              <View style={{ width: 80 }}>
                <SectionLabel>ĐƠN VỊ</SectionLabel>
                <View
                  style={{
                    height: 48,
                    marginBottom: 16,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: '#e2e8f0',
                    backgroundColor: '#f8fafc',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <Text style={{ fontSize: 14, color: '#64748b', fontWeight: '500' }}>
                    đồng
                  </Text>
                </View>
              </View>
            </View>
          </FormCard>

          {/* ── Submit ── */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={handleSubmit}
            disabled={isSubmitting}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              paddingVertical: 16,
              borderRadius: 9999,
              backgroundColor: '#0000ff',
              marginTop: 8,
              shadowColor: '#0000ff',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 12,
              elevation: 6,
            }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#ffffff' }}>
              Gửi Quảng Cáo
            </Text>
            <Send size={18} color="#ffffff" />
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default CreateAdScreen;

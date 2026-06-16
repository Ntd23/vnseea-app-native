// Description: Create offer screen - form to create a new offer for a page.
import React, { useCallback } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Camera,
  ChevronLeft,
  Tag,
} from 'lucide-react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ROUTES } from '../../../navigation/constants/routes';
import { useCreateOfferViewModel } from '../../application/view-models/useOfferViewModel';

type CreateOfferRouteParams = {
  pageId: number;
  pageName?: string;
};

export default function CreateOfferScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute<RouteProp<{ params: CreateOfferRouteParams }, 'params'>>();
  const { pageId, pageName = 'Page' } = route.params || { pageId: 0, pageName: 'Page' };

  const vm = useCreateOfferViewModel(pageId);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleSubmit = useCallback(async () => {
    const success = await vm.submit();
    if (success) {
      Alert.alert('Thành công', 'Ưu đãi đã được tạo!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } else if (vm.error) {
      Alert.alert('Lỗi', vm.error);
    }
  }, [vm, navigation]);

  const renderDiscountFields = () => {
    switch (vm.discountType) {
      case 'discount_percent':
        return (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Phần trăm giảm (1-99) *</Text>
            <View style={styles.inputShell}>
              <TextInput
                className="flex-1 px-4 py-3"
                style={styles.textInput}
                placeholder="VD: 50"
                placeholderTextColor="#9CA3AF"
                value={vm.discountPercent}
                onChangeText={vm.setDiscountPercent}
                keyboardType="number-pad"
                maxLength={2}
              />
              <Text style={styles.inputSuffix}>%</Text>
            </View>
          </View>
        );
      case 'discount_amount':
        return (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Số tiền giảm *</Text>
            <View style={styles.inputShell}>
              <TextInput
                className="flex-1 px-4 py-3"
                style={styles.textInput}
                placeholder="VD: 100000"
                placeholderTextColor="#9CA3AF"
                value={vm.discountAmount}
                onChangeText={vm.setDiscountAmount}
                keyboardType="number-pad"
              />
              <Text style={styles.inputSuffix}>{vm.currency}</Text>
            </View>
          </View>
        );
      case 'buy_get_discount':
        return (
          <View style={{ gap: 12 }}>
            <View style={styles.row2}>
              <View style={[styles.inputGroup, styles.flex1]}>
                <Text style={styles.inputLabel}>Mua (X) *</Text>
                <View style={styles.inputShell}>
                  <TextInput
                    className="flex-1 px-4 py-3"
                    style={styles.textInput}
                    placeholder="VD: 2"
                    placeholderTextColor="#9CA3AF"
                    value={vm.buy}
                    onChangeText={vm.setBuy}
                    keyboardType="number-pad"
                  />
                </View>
              </View>
              <View style={[styles.inputGroup, styles.flex1]}>
                <Text style={styles.inputLabel}>Tặng (Y) *</Text>
                <View style={styles.inputShell}>
                  <TextInput
                    className="flex-1 px-4 py-3"
                    style={styles.textInput}
                    placeholder="VD: 1"
                    placeholderTextColor="#9CA3AF"
                    value={vm.get}
                    onChangeText={vm.setGet}
                    keyboardType="number-pad"
                  />
                </View>
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Giảm thêm (%)</Text>
              <View style={styles.inputShell}>
                <TextInput
                  className="flex-1 px-4 py-3"
                  style={styles.textInput}
                  placeholder="VD: 30"
                  placeholderTextColor="#9CA3AF"
                  value={vm.discountPercent}
                  onChangeText={vm.setDiscountPercent}
                  keyboardType="number-pad"
                  maxLength={2}
                />
                <Text style={styles.inputSuffix}>%</Text>
              </View>
            </View>
          </View>
        );
      case 'spend_get_off':
        return (
          <View style={{ gap: 12 }}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Chi tiêu tối thiểu *</Text>
              <View style={styles.inputShell}>
                <TextInput
                  className="flex-1 px-4 py-3"
                  style={styles.textInput}
                  placeholder="VD: 500000"
                  placeholderTextColor="#9CA3AF"
                  value={vm.spend}
                  onChangeText={vm.setSpend}
                  keyboardType="number-pad"
                />
                <Text style={styles.inputSuffix}>{vm.currency}</Text>
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Số tiền giảm *</Text>
              <View style={styles.inputShell}>
                <TextInput
                  className="flex-1 px-4 py-3"
                  style={styles.textInput}
                  placeholder="VD: 100000"
                  placeholderTextColor="#9CA3AF"
                  value={vm.amountOff}
                  onChangeText={vm.setAmountOff}
                  keyboardType="number-pad"
                />
                <Text style={styles.inputSuffix}>{vm.currency}</Text>
              </View>
            </View>
          </View>
        );
      case 'free_shipping':
        return (
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              🌟 Ưu đãi miễn phí vận chuyển cho mọi đơn hàng của page
            </Text>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView className="flex-1 surface-base" edges={['top']}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View className="surface-topbar flex-row items-center justify-between px-4 py-3">
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ChevronLeft size={24} color="#1A1C1E" />
        </TouchableOpacity>
        <Text className="text-[18px] font-semibold text-[#1A1C1E]">
          Tạo ưu đãi
        </Text>
        <View className="w-6" />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Page name pill */}
          <View style={styles.pagePill}>
            <Tag size={14} color="#0000FF" />
            <Text style={styles.pagePillText}>{pageName}</Text>
          </View>

          {/* Thumbnail upload */}
          <TouchableOpacity activeOpacity={0.8} style={styles.thumbnailUpload}>
            <Camera size={32} color="#0000FF" />
            <Text style={styles.thumbnailUploadText}>Thêm ảnh bìa</Text>
            <Text style={styles.thumbnailHint}>JPEG, PNG (tối đa 5MB)</Text>
          </TouchableOpacity>

          {/* Discount Type */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Loại ưu đãi *</Text>
            <View style={styles.discountTypeList}>
              {vm.discountTypeOptions.map(opt => {
                const isActive = vm.discountType === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    activeOpacity={0.8}
                    onPress={() => vm.setDiscountType(opt.value)}
                    style={[
                      styles.discountTypeItem,
                      isActive && styles.discountTypeItemActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.discountTypeText,
                        isActive && styles.discountTypeTextActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Dynamic fields */}
          {renderDiscountFields()}

          {/* Description */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.inputLabel}>Mô tả * (≥ 32 ký tự)</Text>
              <Text style={styles.charCount}>{vm.description.length}/500</Text>
            </View>
            <View style={[styles.inputShell, styles.textAreaShell]}>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Mô tả chi tiết ưu đãi..."
                placeholderTextColor="#9CA3AF"
                value={vm.description}
                onChangeText={vm.setDescription}
                multiline
                textAlignVertical="top"
                maxLength={500}
              />
            </View>
          </View>

          {/* Discounted Items */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.inputLabel}>Sản phẩm áp dụng</Text>
              <Text style={styles.charCount}>{vm.discountedItems.length}/100</Text>
            </View>
            <View style={styles.inputShell}>
              <TextInput
                className="flex-1 px-4 py-3"
                style={styles.textInput}
                placeholder="VD: Điện thoại, Laptop"
                placeholderTextColor="#9CA3AF"
                value={vm.discountedItems}
                onChangeText={vm.setDiscountedItems}
                maxLength={100}
              />
            </View>
          </View>

          {/* Expiry */}
          <View style={styles.row2}>
            <View style={[styles.inputGroup, styles.flex1]}>
              <Text style={styles.inputLabel}>Ngày hết hạn *</Text>
              <View style={styles.inputShell}>
                <TextInput
                  className="flex-1 px-4 py-3"
                  style={styles.textInput}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#9CA3AF"
                  value={vm.expireDate}
                  onChangeText={vm.setExpireDate}
                />
              </View>
            </View>
            <View style={[styles.inputGroup, styles.flex1]}>
              <Text style={styles.inputLabel}>Giờ hết hạn *</Text>
              <View style={styles.inputShell}>
                <TextInput
                  className="flex-1 px-4 py-3"
                  style={styles.textInput}
                  placeholder="HH:mm"
                  placeholderTextColor="#9CA3AF"
                  value={vm.expireTime}
                  onChangeText={vm.setExpireTime}
                />
              </View>
            </View>
          </View>

          {/* Currency */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Tiền tệ</Text>
            <View style={styles.currencyRow}>
              {vm.currencyOptions.map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  activeOpacity={0.8}
                  onPress={() => vm.setCurrency(opt.value)}
                  style={[
                    styles.currencyItem,
                    vm.currency === opt.value && styles.currencyItemActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.currencyText,
                      vm.currency === opt.value && styles.currencyTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Error message */}
          {vm.error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{vm.error}</Text>
            </View>
          ) : null}
        </ScrollView>

        {/* Submit Button */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={handleSubmit}
            disabled={vm.isLoading}
            style={[styles.submitBtn, vm.isLoading && styles.submitBtnLoading]}
          >
            <Text style={styles.submitBtnText}>
              {vm.isLoading ? 'Đang đăng...' : 'Đăng ưu đãi'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  flex1: { flex: 1 },

  pagePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(0, 0, 255, 0.08)',
    borderRadius: 16,
    marginBottom: 16,
  },
  pagePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0000FF',
  },

  // Thumbnail upload
  thumbnailUpload: {
    height: 140,
    backgroundColor: 'rgba(0, 0, 255, 0.04)',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 0, 255, 0.18)',
    borderStyle: 'dashed',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginBottom: 20,
  },
  thumbnailUploadText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0000FF',
  },
  thumbnailHint: {
    fontSize: 11,
    color: '#64748B',
  },

  // Inputs
  inputGroup: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1C1E',
  },
  charCount: {
    fontSize: 11,
    color: '#94A3B8',
  },
  inputShell: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 255, 0.12)',
    borderRadius: 14,
    height: 48,
  },
  textAreaShell: {
    height: 100,
    alignItems: 'flex-start',
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: '#1A1C1E',
    paddingVertical: 0,
  },
  textArea: {
    height: 88,
    paddingTop: 12,
  },
  inputSuffix: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    paddingHorizontal: 12,
  },

  // Discount type selector
  discountTypeList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  discountTypeItem: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F1F4FB',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 255, 0.12)',
  },
  discountTypeItemActive: {
    backgroundColor: '#0000FF',
    borderColor: '#0000FF',
  },
  discountTypeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1A1C1E',
  },
  discountTypeTextActive: {
    color: '#FFFFFF',
  },

  // Row 2
  row2: {
    flexDirection: 'row',
    gap: 12,
  },

  // Info box
  infoBox: {
    backgroundColor: 'rgba(0, 0, 255, 0.06)',
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  infoText: {
    fontSize: 13,
    color: '#0000FF',
    fontWeight: '500',
    lineHeight: 18,
  },

  // Currency
  currencyRow: {
    flexDirection: 'row',
    gap: 8,
  },
  currencyItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#F1F4FB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 255, 0.12)',
  },
  currencyItemActive: {
    backgroundColor: '#0000FF',
    borderColor: '#0000FF',
  },
  currencyText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1C1E',
  },
  currencyTextActive: {
    color: '#FFFFFF',
  },

  // Error
  errorBox: {
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    color: '#DC2626',
    fontWeight: '500',
    textAlign: 'center',
  },

  // Submit
  bottomBar: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 255, 0.08)',
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  submitBtn: {
    backgroundColor: '#0000FF',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#0000FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnLoading: { opacity: 0.7 },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

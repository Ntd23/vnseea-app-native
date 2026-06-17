// Description: Create offer screen - form to create a new offer for a page.
import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Modal,
  type TextInputProps,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { launchImageLibrary } from 'react-native-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  Calendar,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  Clock,
  FileText,
  Gift,
  Image as ImageIcon,
  Megaphone,
  Package,
  Percent,
  Tag,
  Ticket,
  Truck,
  Wallet,
  X,
} from 'lucide-react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';
import type { AppLanguage } from '../../../shared-kernel/infrastructure/storage/languageStorage';
import { useCreateOfferViewModel } from '../../application/view-models/useOfferViewModel';
import type { DiscountType } from '../../domain/types/offer.types';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';

const BRAND = '#3435F7';
const TEXT = '#0F172A';
const MUTED = '#64748B';
const BORDER = '#E4E8F4';
const SOFT_BLUE = '#EEF4FF';

type CreateOfferRouteParams = {
  pageId: number;
  pageName?: string;
};

type OfferCopy = {
  title: string;
  pageFallback: string;
  uploadTitle: string;
  uploadHint: string;
  changeCover: string;
  typeLabel: string;
  percentLabel: string;
  amountLabel: string;
  buyLabel: string;
  getLabel: string;
  extraPercentLabel: string;
  spendLabel: string;
  amountOffLabel: string;
  freeShippingInfo: string;
  descriptionLabel: string;
  descriptionPlaceholder: string;
  itemsLabel: string;
  itemsPlaceholder: string;
  dateLabel: string;
  timeLabel: string;
  currencyLabel: string;
  submit: string;
  submitting: string;
  successTitle: string;
  successMessage: string;
  errorTitle: string;
  pickImageError: string;
  typeNames: Record<DiscountType, string>;
};

const COPY: Record<AppLanguage, OfferCopy> = {
  vi: {
    title: 'Tạo ưu đãi',
    pageFallback: 'Trang',
    uploadTitle: 'Thêm ảnh bìa',
    uploadHint: 'JPEG, PNG (tối đa 5MB)',
    changeCover: 'Đổi ảnh bìa',
    typeLabel: 'Loại ưu đãi *',
    percentLabel: 'Phần trăm giảm (1-99) *',
    amountLabel: 'Số tiền giảm *',
    buyLabel: 'Mua (X) *',
    getLabel: 'Tặng (Y) *',
    extraPercentLabel: 'Giảm thêm (%)',
    spendLabel: 'Chi tiêu tối thiểu *',
    amountOffLabel: 'Số tiền giảm *',
    freeShippingInfo: 'Ưu đãi miễn phí vận chuyển cho mọi đơn hàng của trang.',
    descriptionLabel: 'Mô tả * (≥ 32 ký tự)',
    descriptionPlaceholder: 'Mô tả chi tiết ưu đãi...',
    itemsLabel: 'Sản phẩm áp dụng (không bắt buộc)',
    itemsPlaceholder: 'VD: Điện thoại, Laptop...',
    dateLabel: 'Ngày hết hạn *',
    timeLabel: 'Giờ hết hạn *',
    currencyLabel: 'Tiền tệ',
    submit: 'Đăng ưu đãi',
    submitting: 'Đang đăng...',
    successTitle: 'Thành công',
    successMessage: 'Ưu đãi đã được tạo!',
    errorTitle: 'Lỗi',
    pickImageError: 'Không chọn được ảnh bìa',
    typeNames: {
      discount_percent: 'Giảm %',
      discount_amount: 'Giảm tiền',
      buy_get_discount: 'Mua X tặng Y',
      spend_get_off: 'Chi tiêu X giảm Y',
      free_shipping: 'Miễn phí ship',
    },
  },
  en: {
    title: 'Create offer',
    pageFallback: 'Page',
    uploadTitle: 'Add cover image',
    uploadHint: 'JPEG, PNG (max 5MB)',
    changeCover: 'Change cover',
    typeLabel: 'Offer type *',
    percentLabel: 'Discount percent (1-99) *',
    amountLabel: 'Discount amount *',
    buyLabel: 'Buy (X) *',
    getLabel: 'Get (Y) *',
    extraPercentLabel: 'Extra discount (%)',
    spendLabel: 'Minimum spend *',
    amountOffLabel: 'Amount off *',
    freeShippingInfo: 'Free shipping offer for every page order.',
    descriptionLabel: 'Description * (≥ 32 chars)',
    descriptionPlaceholder: 'Describe this offer...',
    itemsLabel: 'Applied products (optional)',
    itemsPlaceholder: 'E.g. Phone, Laptop...',
    dateLabel: 'Expiry date *',
    timeLabel: 'Expiry time *',
    currencyLabel: 'Currency',
    submit: 'Publish offer',
    submitting: 'Publishing...',
    successTitle: 'Success',
    successMessage: 'Offer has been created!',
    errorTitle: 'Error',
    pickImageError: 'Could not choose cover image',
    typeNames: {
      discount_percent: 'Percent off',
      discount_amount: 'Amount off',
      buy_get_discount: 'Buy X get Y',
      spend_get_off: 'Spend X save Y',
      free_shipping: 'Free shipping',
    },
  },
};

const OFFER_TYPE_META: Array<{
  value: DiscountType;
  Icon: typeof Percent;
}> = [
  { value: 'discount_percent', Icon: Percent },
  { value: 'discount_amount', Icon: Wallet },
  { value: 'buy_get_discount', Icon: Gift },
  { value: 'spend_get_off', Icon: Ticket },
  { value: 'free_shipping', Icon: Truck },
];

function PressScale({
  children,
  onPress,
  disabled,
  style,
  activeOpacity = 0.92,
  contentStyle,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  style?: any;
  activeOpacity?: number;
  contentStyle?: any;
}) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[animatedStyle, style]}>
      <TouchableOpacity
        activeOpacity={activeOpacity}
        disabled={disabled}
        onPress={onPress}
        onPressIn={() => {
          scale.value = withSpring(0.96, { damping: 15, stiffness: 250 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 15, stiffness: 250 });
        }}
        style={contentStyle}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}

function FieldShell({
  label,
  icon,
  suffix,
  right,
  containerStyle,
  inputStyle,
  onFocus,
  onBlur,
  ...inputProps
}: TextInputProps & {
  label: string;
  icon: React.ReactNode;
  suffix?: string;
  right?: React.ReactNode;
  containerStyle?: any;
  inputStyle?: TextInputProps['style'];
}) {
  const [isFocused, setIsFocused] = useState(false);
  return (
    <View style={[styles.inputGroup, containerStyle]}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={[styles.inputShell, isFocused && styles.inputShellFocused]}>
        <View style={[styles.inputIconBox, isFocused && styles.inputIconBoxFocused]}>{icon}</View>
        <TextInput
          placeholderTextColor="#A0AEC0"
          {...inputProps}
          onFocus={(e) => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          style={[styles.textInput, inputStyle]}
        />
        {suffix ? <Text style={styles.inputSuffix}>{suffix}</Text> : null}
        {right}
      </View>
    </View>
  );
}

function TouchableFieldShell({
  label,
  icon,
  value,
  placeholder,
  right,
  containerStyle,
  onPress,
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  placeholder?: string;
  right?: React.ReactNode;
  containerStyle?: any;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={[styles.inputGroup, containerStyle]}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.inputShell}>
        <View style={styles.inputIconBox}>{icon}</View>
        <Text
          numberOfLines={1}
          style={[
            styles.textInput,
            !value && { color: '#A0AEC0' },
            { textAlignVertical: 'center', lineHeight: 54 },
          ]}
        >
          {value || placeholder}
        </Text>
        {right}
      </View>
    </TouchableOpacity>
  );
}

const formatDate = (date: Date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const formatTime = (date: Date) => {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
};

export default function CreateOfferScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute<RouteProp<{ params: CreateOfferRouteParams }, 'params'>>();
  const insets = useSafeAreaInsets();
  const language = useAppLanguage();
  const copy = COPY[language] ?? COPY.vi;
  const { pageId, pageName = copy.pageFallback } = route.params || {
    pageId: 0,
    pageName: copy.pageFallback,
  };
  const vm = useCreateOfferViewModel(pageId, language);
  const [coverUri, setCoverUri] = useState<string | undefined>(undefined);
  const [isDescFocused, setIsDescFocused] = useState(false);
  const [isItemsFocused, setIsItemsFocused] = useState(false);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const currencyOptions = useMemo(() => vm.currencyOptions, [vm.currencyOptions]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handlePickCover = useCallback(async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        selectionLimit: 1,
        includeBase64: true,
      });
      if (result.didCancel) return;
      const asset = result.assets?.[0];
      if (!asset?.uri) return;
      setCoverUri(asset.uri);
      vm.setThumbnailBase64(
        asset.base64 ? `data:${asset.type ?? 'image/jpeg'};base64,${asset.base64}` : undefined,
      );
    } catch {
      Alert.alert(copy.errorTitle, copy.pickImageError);
    }
  }, [copy.errorTitle, copy.pickImageError, vm]);

  const handleClearCover = useCallback(() => {
    setCoverUri(undefined);
    vm.setThumbnailBase64(undefined);
  }, [vm]);

  const handleSubmit = useCallback(async () => {
    const success = await vm.submit();
    if (success) {
      Alert.alert(copy.successTitle, copy.successMessage, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } else if (vm.error) {
      Alert.alert(copy.errorTitle, vm.error);
    }
  }, [copy.errorTitle, copy.successMessage, copy.successTitle, navigation, vm]);

  const getPickerDate = () => {
    if (vm.expireDate) {
      const parts = vm.expireDate.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        return new Date(year, month, day);
      }
    }
    return new Date();
  };

  const getPickerTime = () => {
    const d = new Date();
    if (vm.expireTime) {
      const parts = vm.expireTime.split(':');
      if (parts.length === 2) {
        d.setHours(parseInt(parts[0], 10));
        d.setMinutes(parseInt(parts[1], 10));
      }
    }
    return d;
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      vm.setExpireDate(formatDate(selectedDate));
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    if (selectedTime) {
      vm.setExpireTime(formatTime(selectedTime));
    }
  };

  const renderDiscountFields = () => {
    switch (vm.discountType) {
      case 'discount_percent':
        return (
          <FieldShell
            label={copy.percentLabel}
            icon={<Percent size={20} color={BRAND} />}
            value={vm.discountPercent}
            onChangeText={vm.setDiscountPercent}
            keyboardType="number-pad"
            maxLength={2}
            suffix="%"
            placeholder="10"
          />
        );
      case 'discount_amount':
        return (
          <FieldShell
            label={copy.amountLabel}
            icon={<Wallet size={20} color={BRAND} />}
            value={vm.discountAmount}
            onChangeText={vm.setDiscountAmount}
            keyboardType="number-pad"
            suffix={vm.currency}
            placeholder="100000"
          />
        );
      case 'buy_get_discount':
        return (
          <>
            <View style={styles.row2}>
              <FieldShell
                label={copy.buyLabel}
                icon={<Package size={20} color={BRAND} />}
                value={vm.buy}
                onChangeText={vm.setBuy}
                keyboardType="number-pad"
                placeholder="2"
                containerStyle={styles.flex1}
              />
              <FieldShell
                label={copy.getLabel}
                icon={<Gift size={20} color={BRAND} />}
                value={vm.get}
                onChangeText={vm.setGet}
                keyboardType="number-pad"
                placeholder="1"
                containerStyle={styles.flex1}
              />
            </View>
            <FieldShell
              label={copy.extraPercentLabel}
              icon={<Percent size={20} color={BRAND} />}
              value={vm.discountPercent}
              onChangeText={vm.setDiscountPercent}
              keyboardType="number-pad"
              maxLength={2}
              suffix="%"
              placeholder="30"
            />
          </>
        );
      case 'spend_get_off':
        return (
          <>
            <FieldShell
              label={copy.spendLabel}
              icon={<Wallet size={20} color={BRAND} />}
              value={vm.spend}
              onChangeText={vm.setSpend}
              keyboardType="number-pad"
              suffix={vm.currency}
              placeholder="500000"
            />
            <FieldShell
              label={copy.amountOffLabel}
              icon={<Ticket size={20} color={BRAND} />}
              value={vm.amountOff}
              onChangeText={vm.setAmountOff}
              keyboardType="number-pad"
              suffix={vm.currency}
              placeholder="100000"
            />
          </>
        );
      case 'free_shipping':
        return (
          <Animated.View entering={FadeInDown.duration(320)} style={styles.infoBox}>
            <Truck size={21} color={BRAND} />
            <Text style={styles.infoText}>{copy.freeShippingInfo}</Text>
          </Animated.View>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <FocusAwareStatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.header}>
        <PressScale
          onPress={handleBack}
          style={styles.backButtonWrap}
          contentStyle={{ flex: 1, width: '100%', height: '100%' }}
        >
          <View style={styles.backButton}>
            <ChevronLeft size={27} color={TEXT} strokeWidth={2.5} />
          </View>
        </PressScale>
        <Text style={styles.headerTitle}>{copy.title}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 22}
        style={styles.flex1}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 20) + 112 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInDown.delay(40).duration(360)} style={styles.pagePill}>
            <Tag size={18} color={BRAND} />
            <Text style={styles.pagePillText} numberOfLines={1}>
              {pageName}
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(90).duration(380)}>
            <PressScale onPress={handlePickCover} style={styles.coverWrap}>
              <View style={styles.coverUpload}>
                {coverUri ? (
                  <>
                    <Image source={{ uri: coverUri }} style={styles.coverImage as any} resizeMode="cover" />
                    <View style={styles.coverOverlay} />
                    <View style={styles.coverChangeBadge}>
                      <Camera size={18} color="#FFFFFF" />
                      <Text style={styles.coverChangeText}>{copy.changeCover}</Text>
                    </View>
                  </>
                ) : (
                  <View style={styles.coverPlaceholder}>
                    <View style={styles.coverSparkles}>
                      <Text style={styles.sparkleOne}>✦</Text>
                      <Text style={styles.sparkleTwo}>✧</Text>
                      <Text style={styles.sparkleThree}>•</Text>
                    </View>
                    <View style={styles.coverIconLarge}>
                      <ImageIcon size={42} color="#FFFFFF" fill="#FFFFFF" />
                      <View style={styles.coverCameraBadge}>
                        <Camera size={16} color="#FFFFFF" />
                      </View>
                    </View>
                    <Text style={styles.coverTitle}>{copy.uploadTitle}</Text>
                    <Text style={styles.coverHint}>{copy.uploadHint}</Text>
                  </View>
                )}
              </View>
            </PressScale>
            {coverUri ? (
              <TouchableOpacity activeOpacity={0.85} onPress={handleClearCover} style={styles.clearCover}>
                <X size={15} color="#EF4444" />
              </TouchableOpacity>
            ) : null}
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(140).duration(380)} style={styles.section}>
            <Text style={styles.inputLabel}>{copy.typeLabel}</Text>
            <View style={styles.offerTypeGrid}>
              {OFFER_TYPE_META.map(({ value, Icon }) => {
                const isActive = vm.discountType === value;
                return (
                  <PressScale
                    key={value}
                    onPress={() => vm.setDiscountType(value)}
                    style={[
                      styles.offerTypeItem,
                      isActive ? styles.offerTypeItemActive : undefined,
                      (value === 'spend_get_off' || value === 'free_shipping') && styles.offerTypeWide,
                    ]}
                    contentStyle={{ flex: 1, width: '100%', height: '100%' }}
                  >
                    <View style={styles.offerTypeInner}>
                      <Icon size={18} color={isActive ? '#FFFFFF' : BRAND} strokeWidth={2.2} />
                      <Text
                        style={[styles.offerTypeText, isActive && styles.offerTypeTextActive]}
                        numberOfLines={1}
                      >
                        {copy.typeNames[value]}
                      </Text>
                      {isActive ? <CheckCircle2 size={16} color="#FFFFFF" fill="rgba(255, 255, 255, 0.2)" /> : null}
                    </View>
                  </PressScale>
                );
              })}
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(180).duration(380)}>
            {renderDiscountFields()}
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(220).duration(380)} style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.inputLabel}>{copy.descriptionLabel}</Text>
              <Text style={styles.charCount}>{vm.description.length}/500</Text>
            </View>
            <View
              style={[
                styles.inputShell,
                styles.textAreaShell,
                isDescFocused && styles.inputShellFocused,
              ]}
            >
              <View
                style={[
                  styles.inputIconBox,
                  styles.textAreaIconBox,
                  isDescFocused && styles.inputIconBoxFocused,
                ]}
              >
                <FileText size={21} color={BRAND} />
              </View>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder={copy.descriptionPlaceholder}
                placeholderTextColor="#A0AEC0"
                value={vm.description}
                onChangeText={vm.setDescription}
                multiline
                textAlignVertical="top"
                maxLength={500}
                onFocus={() => setIsDescFocused(true)}
                onBlur={() => setIsDescFocused(false)}
              />
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(260).duration(380)} style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.inputLabel}>{copy.itemsLabel}</Text>
              <Text style={styles.charCount}>{vm.discountedItems.length}/100</Text>
            </View>
            <View style={[styles.inputShell, isItemsFocused && styles.inputShellFocused]}>
              <View style={[styles.inputIconBox, isItemsFocused && styles.inputIconBoxFocused]}>
                <Package size={20} color={BRAND} />
              </View>
              <TextInput
                style={styles.textInput}
                placeholder={copy.itemsPlaceholder}
                placeholderTextColor="#A0AEC0"
                value={vm.discountedItems}
                onChangeText={vm.setDiscountedItems}
                maxLength={100}
                onFocus={() => setIsItemsFocused(true)}
                onBlur={() => setIsItemsFocused(false)}
              />
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(300).duration(380)} style={styles.row2}>
            <TouchableFieldShell
              label={copy.dateLabel}
              icon={<Calendar size={20} color={BRAND} />}
              value={vm.expireDate}
              placeholder="YYYY-MM-DD"
              containerStyle={styles.flex1}
              onPress={() => setShowDatePicker(true)}
              right={<ChevronDown size={18} color="#475569" style={styles.chevron} />}
            />
            <TouchableFieldShell
              label={copy.timeLabel}
              icon={<Clock size={20} color={BRAND} />}
              value={vm.expireTime}
              placeholder="HH:mm"
              containerStyle={styles.flex1}
              onPress={() => setShowTimePicker(true)}
              right={<ChevronDown size={18} color="#475569" style={styles.chevron} />}
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(340).duration(380)} style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{copy.currencyLabel}</Text>
            <View style={styles.currencyRow}>
              {currencyOptions.map(opt => {
                const active = vm.currency === opt.value;
                return (
                  <PressScale
                    key={opt.value}
                    onPress={() => vm.setCurrency(opt.value)}
                    style={[styles.currencyItem, active ? styles.currencyItemActive : undefined]}
                    contentStyle={{ flex: 1, width: '100%', height: '100%' }}
                  >
                    <View style={styles.currencyInner}>
                      <View style={[styles.currencyIcon, active && styles.currencyIconActive]}>
                        <Text
                          style={[
                            styles.currencyIconText,
                            active ? styles.currencyIconTextActive : undefined,
                          ]}
                        >
                          {opt.value === 'USD' ? '$' : '₫'}
                        </Text>
                      </View>
                      <Text style={[styles.currencyText, active ? styles.currencyTextActive : undefined]}>
                        {opt.label}
                      </Text>
                    </View>
                  </PressScale>
                );
              })}
            </View>
          </Animated.View>

          {vm.error ? (
            <Animated.View entering={FadeInDown.duration(260)} style={styles.errorBox}>
              <Text style={styles.errorText}>{vm.error}</Text>
            </Animated.View>
          ) : null}
        </ScrollView>

        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <PressScale
            onPress={handleSubmit}
            disabled={vm.isLoading}
            style={[styles.submitBtn, vm.isLoading && styles.submitBtnLoading]}
            contentStyle={{ flex: 1, width: '100%', height: '100%' }}
          >
            <View style={styles.submitInner}>
              <Megaphone size={22} color="#FFFFFF" fill="#FFFFFF30" />
              <Text style={styles.submitBtnText}>
                {vm.isLoading ? copy.submitting : copy.submit}
              </Text>
            </View>
          </PressScale>
        </View>
      </KeyboardAvoidingView>

      {/* iOS Date Picker Modal */}
      {showDatePicker && Platform.OS === 'ios' && (
        <Modal transparent animationType="slide" visible={showDatePicker}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.modalCancelText}>Hủy</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitleText}>Chọn ngày hết hạn</Text>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.modalConfirmText}>Xong</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={getPickerDate()}
                mode="date"
                display="spinner"
                onChange={handleDateChange}
                minimumDate={new Date()}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* iOS Time Picker Modal */}
      {showTimePicker && Platform.OS === 'ios' && (
        <Modal transparent animationType="slide" visible={showTimePicker}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                  <Text style={styles.modalCancelText}>Hủy</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitleText}>Chọn giờ hết hạn</Text>
                <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                  <Text style={styles.modalConfirmText}>Xong</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={getPickerTime()}
                mode="time"
                display="spinner"
                onChange={handleTimeChange}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Android Pickers */}
      {showDatePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={getPickerDate()}
          mode="date"
          display="default"
          onChange={handleDateChange}
          minimumDate={new Date()}
        />
      )}
      {showTimePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={getPickerTime()}
          mode="time"
          display="default"
          onChange={handleTimeChange}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFF',
  },
  flex1: {
    flex: 1,
  },
  header: {
    height: 78,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEF1FA',
  },
  backButtonWrap: {
    width: 52,
    height: 52,
  },
  backButton: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 4,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '800',
    color: TEXT,
  },
  headerSpacer: {
    width: 52,
    height: 52,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 22,
  },
  pagePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    maxWidth: '80%',
    gap: 9,
    paddingHorizontal: 17,
    paddingVertical: 11,
    backgroundColor: '#EEF0FF',
    borderRadius: 18,
    marginBottom: 22,
  },
  pagePillText: {
    fontSize: 15,
    fontWeight: '800',
    color: BRAND,
  },
  coverWrap: {
    marginBottom: 24,
  },
  coverUpload: {
    height: 164,
    overflow: 'hidden',
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#A8AEFF',
    borderStyle: 'dashed',
    backgroundColor: '#F7F8FF',
  },
  coverPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverSparkles: {
    position: 'absolute',
    top: 15,
    width: 100,
    height: 50,
  },
  sparkleOne: {
    position: 'absolute',
    top: 4,
    left: 8,
    color: '#3435F7',
    fontSize: 16,
    fontWeight: '900',
  },
  sparkleTwo: {
    position: 'absolute',
    top: 0,
    right: 16,
    color: '#FACC15',
    fontSize: 14,
    fontWeight: '900',
  },
  sparkleThree: {
    position: 'absolute',
    bottom: 4,
    left: 35,
    color: '#8EA0FF',
    fontSize: 10,
    fontWeight: '900',
  },
  coverIconLarge: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7B73FF',
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 4,
  },
  coverCameraBadge: {
    position: 'absolute',
    right: -10,
    bottom: -5,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BRAND,
    borderWidth: 3.5,
    borderColor: '#F7F8FF',
  },
  coverTitle: {
    marginTop: 14,
    fontSize: 18,
    fontWeight: '800',
    color: TEXT,
  },
  coverHint: {
    marginTop: 4,
    fontSize: 14,
    color: MUTED,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(15, 23, 42, 0.18)',
  },
  coverChangeBadge: {
    position: 'absolute',
    left: 18,
    bottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.48)',
  },
  coverChangeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  clearCover: {
    position: 'absolute',
    right: 12,
    top: 12,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  section: {
    marginBottom: 18,
  },
  inputGroup: {
    marginBottom: 18,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 9,
  },
  inputLabel: {
    marginBottom: 9,
    fontSize: 16,
    fontWeight: '800',
    color: TEXT,
  },
  charCount: {
    fontSize: 13,
    color: '#8792A8',
    fontWeight: '600',
  },
  inputShell: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1.2,
    borderColor: '#DCE1EF',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  inputShellFocused: {
    borderColor: BRAND,
    shadowColor: BRAND,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  inputIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF0FF',
    marginRight: 14,
  },
  inputIconBoxFocused: {
    backgroundColor: '#E6E6FF',
  },
  textInput: {
    flex: 1,
    minHeight: 54,
    paddingVertical: 0,
    fontSize: 16,
    fontWeight: '500',
    color: TEXT,
  },
  inputSuffix: {
    paddingLeft: 10,
    fontSize: 16,
    fontWeight: '800',
    color: '#26324A',
  },
  textAreaShell: {
    height: 116,
    alignItems: 'flex-start',
    paddingVertical: 13,
  },
  textAreaIconBox: {
    marginTop: 2,
  },
  textArea: {
    minHeight: 90,
    textAlignVertical: 'top',
    paddingTop: 8,
  },
  row2: {
    flexDirection: 'row',
    gap: 14,
  },
  offerTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  offerTypeItem: {
    width: '31.5%',
    minHeight: 63,
    borderRadius: 18,
    borderWidth: 1.2,
    borderColor: BORDER,
    backgroundColor: '#FFFFFF',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 1,
  },
  offerTypeWide: {
    width: '48.5%',
  },
  offerTypeItemActive: {
    borderColor: BRAND,
    backgroundColor: BRAND,
    shadowColor: BRAND,
    shadowOpacity: 0.24,
    elevation: 5,
  },
  offerTypeInner: {
    flex: 1,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  offerTypeText: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '800',
    color: '#26324A',
  },
  offerTypeTextActive: {
    color: '#FFFFFF',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 16,
    borderRadius: 18,
    backgroundColor: SOFT_BLUE,
    borderWidth: 1,
    borderColor: '#D9E5FF',
    marginBottom: 18,
  },
  infoText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
    color: BRAND,
    fontWeight: '700',
  },
  chevron: {
    marginLeft: 8,
  },
  currencyRow: {
    flexDirection: 'row',
    gap: 14,
  },
  currencyItem: {
    flex: 1,
    height: 62,
    borderRadius: 18,
    borderWidth: 1.2,
    borderColor: BORDER,
    backgroundColor: '#FFFFFF',
  },
  currencyItemActive: {
    borderColor: BRAND,
    backgroundColor: BRAND,
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 5,
  },
  currencyInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 11,
  },
  currencyIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.4,
    borderColor: '#26324A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencyIconActive: {
    borderColor: '#FFFFFF',
  },
  currencyIconText: {
    fontSize: 15,
    color: '#26324A',
    fontWeight: '900',
  },
  currencyIconTextActive: {
    color: '#FFFFFF',
  },
  currencyText: {
    fontSize: 16,
    fontWeight: '800',
    color: TEXT,
  },
  currencyTextActive: {
    color: '#FFFFFF',
  },
  errorBox: {
    borderRadius: 16,
    padding: 14,
    backgroundColor: '#FEE2E2',
    marginBottom: 8,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderTopWidth: 1,
    borderTopColor: '#EEF1FA',
  },
  submitBtn: {
    height: 62,
    borderRadius: 22,
    backgroundColor: BRAND,
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.28,
    shadowRadius: 20,
    elevation: 7,
  },
  submitBtnLoading: {
    opacity: 0.72,
  },
  submitInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 13,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalCancelText: {
    color: '#64748B',
    fontSize: 16,
    fontWeight: '600',
  },
  modalConfirmText: {
    color: BRAND,
    fontSize: 16,
    fontWeight: '700',
  },
  modalTitleText: {
    fontSize: 17,
    fontWeight: '700',
    color: TEXT,
  },
});

// Description: Renders the withdrawal screen with SePay payout form and payment history.

import {
  APP_BRAND_COLOR,
  APP_COLORS,
} from '../../../shared-kernel/presentation/theme/appColors';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  AlertTriangle,
  ArrowLeft,
  Banknote,
  Check,
  ChevronDown,
  Clock3,
  HandCoins,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../navigation/types';
import { formatCurrency } from '../../../shared-kernel/application/utils/formatCurrency';
import { useWithdrawalViewModel } from '../../application/view-models/useWithdrawalViewModel';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import { useSafeBottomPadding } from '../../../shared-kernel/presentation/layout/useSafeBottomLayout';
import type {
  SepayBank,
  WithdrawalHistoryItem,
  WithdrawalMethod,
} from '../../domain/types/withdrawal.types';

type WithdrawalNav = NativeStackNavigationProp<RootStackParamList>;

function methodLabel(method: string) {
  if (method === 'sepay') return 'SePay';
  if (method === 'paypal') return 'PayPal';
  if (method === 'bank') return 'Ngân hàng';
  return method || 'N/A';
}

function statusLabel(status: number) {
  if (status === 1) return { label: 'Đã duyệt', color: '#15803d' };
  if (status === 2) return { label: 'Từ chối', color: '#dc2626' };
  return { label: 'Đang chờ', color: '#ca8a04' };
}

function MethodPickerModal({
  visible,
  methods,
  selectedMethod,
  onSelect,
  onClose,
}: {
  visible: boolean;
  methods: WithdrawalMethod[];
  selectedMethod: WithdrawalMethod;
  onSelect: (method: WithdrawalMethod) => void;
  onClose: () => void;
}) {
  const safeBottomPadding = useSafeBottomPadding(28);
  const [mounted, setMounted] = useState(false);
  const translateY = useRef(new Animated.Value(480)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      translateY.setValue(480);
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          damping: 22,
          stiffness: 210,
          mass: 0.9,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 210,
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 480,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) setMounted(false);
    });
  }, [backdropOpacity, translateY, visible]);

  if (!mounted) return null;

  return (
    <Modal
      transparent
      visible={mounted}
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View
        pointerEvents="box-none"
        style={[StyleSheet.absoluteFill, { opacity: backdropOpacity }]}
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: 'rgba(0,0,0,0.42)' },
            ]}
          />
        </TouchableWithoutFeedback>
      </Animated.View>

      <Animated.View
        style={[
          pickerStyles.sheet,
          {
            paddingBottom: safeBottomPadding,
            transform: [{ translateY }],
          },
        ]}
      >
        <View style={pickerStyles.handle} />
        <Text style={pickerStyles.sheetTitle}>Phương thức rút tiền</Text>
        {methods.map((method, index) => {
          const active = selectedMethod.id === method.id;
          return (
            <TouchableOpacity
              key={method.id}
              activeOpacity={0.78}
              onPress={() => onSelect(method)}
              style={[
                pickerStyles.row,
                index < methods.length - 1 && pickerStyles.rowDivider,
              ]}
            >
              <Text
                style={[
                  pickerStyles.rowLabel,
                  active && pickerStyles.rowLabelActive,
                ]}
              >
                {method.label}
              </Text>
              {active ? <Check size={18} color={APP_BRAND_COLOR} /> : null}
            </TouchableOpacity>
          );
        })}
      </Animated.View>
    </Modal>
  );
}

function BankPickerModal({
  visible,
  banks,
  selectedCode,
  onSelect,
  onClose,
}: {
  visible: boolean;
  banks: SepayBank[];
  selectedCode: string;
  onSelect: (bank: SepayBank) => void;
  onClose: () => void;
}) {
  const safeBottomPadding = useSafeBottomPadding(28);
  const [mounted, setMounted] = useState(false);
  const translateY = useRef(new Animated.Value(620)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      translateY.setValue(620);
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          damping: 22,
          stiffness: 210,
          mass: 0.9,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 210,
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 620,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) setMounted(false);
    });
  }, [backdropOpacity, translateY, visible]);

  if (!mounted) return null;

  return (
    <Modal
      transparent
      visible={mounted}
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View
        pointerEvents="box-none"
        style={[StyleSheet.absoluteFill, { opacity: backdropOpacity }]}
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: 'rgba(0,0,0,0.42)' },
            ]}
          />
        </TouchableWithoutFeedback>
      </Animated.View>

      <Animated.View
        style={[
          pickerStyles.sheet,
          {
            paddingBottom: safeBottomPadding,
            transform: [{ translateY }],
          },
        ]}
      >
        <View style={pickerStyles.handle} />
        <Text style={pickerStyles.sheetTitle}>Ngân hàng</Text>
        <ScrollView style={pickerStyles.bankList}>
          {banks.map((bank, index) => {
            const active = selectedCode === bank.code;
            return (
              <TouchableOpacity
                key={`${bank.code}-${bank.bin}`}
                activeOpacity={0.78}
                onPress={() => onSelect(bank)}
                style={[
                  pickerStyles.bankRow,
                  index < banks.length - 1 && pickerStyles.rowDivider,
                ]}
              >
                <View className="flex-1">
                  <Text
                    style={[
                      pickerStyles.rowLabel,
                      active && pickerStyles.rowLabelActive,
                    ]}
                  >
                    {bank.shortName}
                  </Text>
                  <Text style={pickerStyles.bankSubLabel}>{bank.name}</Text>
                </View>
                {active ? <Check size={18} color={APP_BRAND_COLOR} /> : null}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

function FieldLabel({ label }: { label: string }) {
  return <Text style={formStyles.label}>{label}</Text>;
}

function HistoryRow({
  item,
  currency,
  currencySymbol,
}: {
  item: WithdrawalHistoryItem;
  currency: string;
  currencySymbol: string;
}) {
  const status = statusLabel(item.status);
  return (
    <View style={historyStyles.row}>
      <Text style={historyStyles.amount}>
        {formatCurrency(item.amount, currency, currencySymbol)}
      </Text>
      <View style={historyStyles.meta}>
        <Text style={historyStyles.method}>{methodLabel(item.method)}</Text>
        <Text style={historyStyles.date}>{item.requested || 'N/A'}</Text>
      </View>
      <Text style={[historyStyles.status, { color: status.color }]}>
        {status.label}
      </Text>
    </View>
  );
}

function WithdrawalScreen() {
  const navigation = useNavigation<WithdrawalNav>();
  const {
    methods,
    balance,
    walletBalance,
    minimumAmount,
    currency,
    currencySymbol,
    selectedMethod,
    setSelectedMethod,
    amount,
    setAmount,
    accountValue,
    setAccountValue,
    sepayDetails,
    updateSepayDetails,
    sepayBanks,
    selectSepayBank,
    isBanksLoading,
    accountFieldLabel,
    accountFieldPlaceholder,
    accountKeyboardType,
    history,
    hasPendingRequest,
    isLoading,
    isRefreshing,
    error,
    successMessage,
    handleSubmit,
  } = useWithdrawalViewModel();

  const [pickerVisible, setPickerVisible] = useState(false);
  const [bankPickerVisible, setBankPickerVisible] = useState(false);
  const selectedSepayBank = useMemo(
    () => sepayBanks.find(bank => bank.code === sepayDetails.bankCode),
    [sepayBanks, sepayDetails.bankCode],
  );

  const handleSelectMethod = useCallback(
    (method: WithdrawalMethod) => {
      setSelectedMethod(method);
      setPickerVisible(false);
    },
    [setSelectedMethod],
  );

  const handleSelectBank = useCallback(
    (bank: SepayBank) => {
      selectSepayBank(bank);
      setBankPickerVisible(false);
    },
    [selectSepayBank],
  );

  useEffect(() => {
    if (successMessage) {
      Alert.alert('Thành công', successMessage);
    }
  }, [successMessage]);

  return (
    <SafeAreaView className="flex-1 surface-base" edges={['top']}>
      <FocusAwareStatusBar barStyle="light-content" />

      <View className="surface-brand flex-row items-center px-4 py-3">
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => navigation.goBack()}
          className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-white/15"
        >
          <ArrowLeft size={22} color="#ffffff" />
        </TouchableOpacity>
        <Text className="text-xl font-extrabold text-white">
          Thu nhập của tôi
        </Text>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-4 pb-16 pt-5"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={heroStyles.card}>
            <View style={heroStyles.iconWrap}>
              <HandCoins size={52} color="#f59e0b" />
              <View style={heroStyles.moneyBadge}>
                <Banknote size={20} color="#ffffff" />
              </View>
            </View>
            <View className="flex-1">
              <Text style={heroStyles.role}>Quản trị viên</Text>
              <Text style={heroStyles.title}>
                Thu nhập của tôi{' '}
                {formatCurrency(balance, currency, currencySymbol)}
              </Text>
            </View>
          </View>

          <View style={noticeStyles.danger}>
            <AlertTriangle size={18} color="#ff3333" />
            <Text style={noticeStyles.dangerText}>
              Số tiền có sẵn để rút:{' '}
              {formatCurrency(balance, currency, currencySymbol)}, yêu cầu rút
              tiền tối thiểu là{' '}
              {formatCurrency(minimumAmount, currency, currencySymbol)}
            </Text>
          </View>

          <View style={noticeStyles.warning}>
            <Text style={noticeStyles.warningText}>
              Xin lưu ý rằng bạn chỉ có thể rút Tiền kiếm được của mình, không
              thể rút tiền nạp vào ví.
            </Text>
          </View>

          {isRefreshing ? (
            <View className="surface-card mb-4 items-center px-4 py-6">
              <ActivityIndicator size="small" color={APP_BRAND_COLOR} />
            </View>
          ) : null}

          <View className="surface-card mb-5 p-5">
            <View style={{ marginBottom: 18 }}>
              <FieldLabel label="Phương thức Rút tiền" />
              <TouchableOpacity
                activeOpacity={0.84}
                onPress={() => setPickerVisible(true)}
                style={formStyles.inputRow}
              >
                <Text style={formStyles.inputText}>{selectedMethod.label}</Text>
                <ChevronDown size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            {selectedMethod.id === 'sepay' ? (
              <>
                <View style={{ marginBottom: 18 }}>
                  <FieldLabel label="Ngân hàng" />
                  <TouchableOpacity
                    activeOpacity={0.84}
                    disabled={isBanksLoading || sepayBanks.length === 0}
                    onPress={() => setBankPickerVisible(true)}
                    style={formStyles.inputRow}
                  >
                    <Text style={formStyles.inputText}>
                      {selectedSepayBank?.shortName ||
                        sepayDetails.bankName ||
                        'Chọn ngân hàng'}
                    </Text>
                    {isBanksLoading ? (
                      <ActivityIndicator size="small" color={APP_BRAND_COLOR} />
                    ) : (
                      <ChevronDown size={18} color="#64748b" />
                    )}
                  </TouchableOpacity>
                </View>

                <View style={{ marginBottom: 18 }}>
                  <FieldLabel label="Số tài khoản" />
                  <TextInput
                    style={[formStyles.inputRow, formStyles.textInput]}
                    placeholder="Nhập số tài khoản"
                    placeholderTextColor="#94a3b8"
                    keyboardType="number-pad"
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={sepayDetails.accountNumber}
                    onChangeText={value =>
                      updateSepayDetails('accountNumber', value)
                    }
                  />
                </View>

                <View style={{ marginBottom: 18 }}>
                  <FieldLabel label="Tên người thụ hưởng" />
                  <TextInput
                    style={[formStyles.inputRow, formStyles.textInput]}
                    placeholder="Nhập tên chủ tài khoản"
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="words"
                    autoCorrect={false}
                    value={sepayDetails.beneficiaryName}
                    onChangeText={value =>
                      updateSepayDetails('beneficiaryName', value)
                    }
                  />
                </View>
              </>
            ) : null}

            <View>
              {selectedMethod.id !== 'sepay' ? (
                <View style={{ marginBottom: 18 }}>
                  <FieldLabel label={accountFieldLabel} />
                  <TextInput
                    style={[formStyles.inputRow, formStyles.textInput]}
                    placeholder={accountFieldPlaceholder}
                    placeholderTextColor="#94a3b8"
                    keyboardType={accountKeyboardType as any}
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={accountValue}
                    onChangeText={setAccountValue}
                  />
                </View>
              ) : null}

              <View style={{ marginBottom: 18 }}>
                <FieldLabel label="Số tiền" />
                <TextInput
                  style={[formStyles.inputRow, formStyles.textInput]}
                  placeholder="0"
                  placeholderTextColor="#94a3b8"
                  keyboardType="decimal-pad"
                  value={amount}
                  onChangeText={setAmount}
                />
              </View>
            </View>

            {hasPendingRequest ? (
              <View style={noticeStyles.pending}>
                <Clock3 size={16} color="#ca8a04" />
                <Text style={noticeStyles.pendingText}>
                  Bạn đang có yêu cầu rút tiền chờ xử lý.
                </Text>
              </View>
            ) : null}

            {error ? (
              <View style={noticeStyles.errorBox}>
                <Text style={noticeStyles.errorText}>{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              activeOpacity={0.9}
              onPress={handleSubmit}
              disabled={isLoading || isRefreshing}
              style={[
                formStyles.submitBtn,
                (isLoading || isRefreshing) && formStyles.submitBtnDisabled,
              ]}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={formStyles.submitText}>Yêu cầu rút tiền</Text>
              )}
            </TouchableOpacity>

            <Text style={formStyles.walletNote}>
              Số dư ví không thể rút:{' '}
              {formatCurrency(walletBalance, currency, currencySymbol)}
            </Text>
          </View>

          <View className="surface-card overflow-hidden">
            <View style={historyStyles.header}>
              <Clock3 size={18} color={APP_BRAND_COLOR} />
              <Text style={historyStyles.title}>Lịch sử thanh toán</Text>
            </View>
            <View style={historyStyles.columns}>
              <Text style={historyStyles.columnText}>Số lượng</Text>
              <Text style={historyStyles.columnText}>Yêu cầu</Text>
              <Text style={historyStyles.columnText}>Trạng thái</Text>
            </View>
            {history.length === 0 ? (
              <Text style={historyStyles.empty}>
                Chưa có yêu cầu rút tiền nào.
              </Text>
            ) : (
              history.map(item => (
                <HistoryRow
                  key={item.id}
                  item={item}
                  currency={currency}
                  currencySymbol={currencySymbol}
                />
              ))
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <MethodPickerModal
        visible={pickerVisible}
        methods={methods}
        selectedMethod={selectedMethod}
        onSelect={handleSelectMethod}
        onClose={() => setPickerVisible(false)}
      />
      <BankPickerModal
        visible={bankPickerVisible}
        banks={sepayBanks}
        selectedCode={sepayDetails.bankCode}
        onSelect={handleSelectBank}
        onClose={() => setBankPickerVisible(false)}
      />
    </SafeAreaView>
  );
}

const pickerStyles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
  },
  handle: {
    alignSelf: 'center',
    width: 46,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#cbd5e1',
    marginBottom: 18,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 10,
  },
  row: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  rowLabel: {
    fontSize: 16,
    color: '#0f172a',
  },
  rowLabelActive: {
    color: APP_BRAND_COLOR,
    fontWeight: '800',
  },
  bankList: {
    maxHeight: 460,
  },
  bankRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 10,
  },
  bankSubLabel: {
    marginTop: 3,
    fontSize: 12,
    color: '#64748b',
  },
});

const heroStyles = StyleSheet.create({
  card: {
    minHeight: 116,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d8ecd9',
    backgroundColor: '#f5fcf6',
    borderRadius: 8,
    padding: 18,
    marginBottom: 18,
  },
  iconWrap: {
    width: 86,
    height: 74,
    justifyContent: 'center',
    marginRight: 16,
  },
  moneyBadge: {
    position: 'absolute',
    right: 8,
    bottom: 2,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#008000',
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  role: {
    fontSize: 17,
    fontWeight: '800',
    color: '#008000',
    marginBottom: 4,
  },
  title: {
    fontSize: 26,
    lineHeight: 34,
    fontWeight: '900',
    color: '#008000',
  },
});

const noticeStyles = StyleSheet.create({
  danger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ffebeb',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 14,
    marginBottom: 18,
  },
  dangerText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: '#ff3333',
    fontWeight: '800',
  },
  warning: {
    backgroundColor: '#fff4eb',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 14,
    marginBottom: 28,
  },
  warningText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#ff8a33',
    fontWeight: '800',
  },
  pending: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef9c3',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  pendingText: {
    flex: 1,
    fontSize: 13,
    color: '#854d0e',
    fontWeight: '700',
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    color: '#dc2626',
    lineHeight: 20,
  },
});

const formStyles = StyleSheet.create({
  label: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },
  inputRow: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inputText: {
    flex: 1,
    fontSize: 16,
    color: '#0f172a',
  },
  textInput: {
    fontSize: 16,
    color: '#0f172a',
    padding: 0,
    margin: 0,
  },
  submitBtn: {
    alignSelf: 'center',
    minWidth: 188,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: APP_BRAND_COLOR,
    paddingHorizontal: 24,
    shadowColor: APP_BRAND_COLOR,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 7,
    elevation: 5,
  },
  submitBtnDisabled: {
    backgroundColor: APP_COLORS.neutral.iconMuted,
  },
  submitText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  walletNote: {
    marginTop: 14,
    textAlign: 'center',
    fontSize: 12,
    color: '#64748b',
  },
});

const historyStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0f172a',
  },
  columns: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8fafc',
  },
  columnText: {
    flex: 1,
    fontSize: 13,
    color: '#475569',
    fontWeight: '800',
  },
  row: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e2e8f0',
  },
  amount: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '800',
  },
  meta: {
    flex: 1,
  },
  method: {
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '700',
  },
  date: {
    marginTop: 2,
    fontSize: 12,
    color: '#64748b',
  },
  status: {
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
  },
  empty: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    fontSize: 14,
    color: '#64748b',
  },
});

export default WithdrawalScreen;

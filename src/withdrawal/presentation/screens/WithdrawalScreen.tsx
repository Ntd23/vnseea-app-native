import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Check, ChevronDown } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../navigation/types';
import { useWithdrawalViewModel } from '../../application/view-models/useWithdrawalViewModel';
import type { WithdrawalMethod } from '../../domain/types/withdrawal.types';

type WithdrawalNav = NativeStackNavigationProp<RootStackParamList>;

/* ─────────────────────────────────────────────
   Animated bottom-sheet method picker
───────────────────────────────────────────── */
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
  onSelect: (m: WithdrawalMethod) => void;
  onClose: () => void;
}) {
  // Keep Modal mounted during close animation
  const [mounted, setMounted] = useState(false);
  const translateY = useRef(new Animated.Value(480)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      // Reset start position then spring up
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
    } else {
      // Slide down + fade, then unmount
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 480,
          duration: 230,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 190,
          useNativeDriver: true,
        }),
      ]).start(() => setMounted(false));
    }
  }, [visible, translateY, backdropOpacity]);

  if (!mounted) return null;

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      {/* Dim backdrop */}
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

      {/* Bottom sheet */}
      <Animated.View
        style={[pickerStyles.sheet, { transform: [{ translateY }] }]}
      >
        {/* Drag handle */}
        <View style={pickerStyles.handle} />

        <Text style={pickerStyles.sheetTitle}>Phương thức rút tiền</Text>

        {methods.map((method, index) => {
          const isActive = selectedMethod.id === method.id;
          return (
            <TouchableOpacity
              key={method.id}
              activeOpacity={0.75}
              onPress={() => onSelect(method)}
              style={[
                pickerStyles.row,
                index < methods.length - 1 && pickerStyles.rowDivider,
              ]}
            >
              <Text
                style={[
                  pickerStyles.rowLabel,
                  isActive && pickerStyles.rowLabelActive,
                ]}
              >
                {method.label}
              </Text>
              {isActive && <Check size={18} color="#0000ff" />}
            </TouchableOpacity>
          );
        })}

        <View style={{ height: 32 }} />
      </Animated.View>
    </Modal>
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
    paddingTop: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 24,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 99,
    backgroundColor: '#cbd5e1',
    alignSelf: 'center',
    marginBottom: 18,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,255,0.08)',
  },
  rowLabel: {
    fontSize: 14,
    lineHeight: 20,
    color: '#000000',
  },
  rowLabelActive: {
    fontWeight: '700',
    color: '#0000ff',
  },
});

/* ─────────────────────────────────────────────
   Reusable field label
───────────────────────────────────────────── */
function FieldLabel({ label }: { label: string }) {
  return (
    <Text
      style={{
        fontSize: 15,
        fontWeight: '700',
        color: '#000000',
        marginBottom: 8,
      }}
    >
      {label}
    </Text>
  );
}

/* ─────────────────────────────────────────────
   Main screen
───────────────────────────────────────────── */
function WithdrawalScreen() {
  const navigation = useNavigation<WithdrawalNav>();
  const {
    methods,
    balance,
    selectedMethod,
    setSelectedMethod,
    amount,
    setAmount,
    accountValue,
    setAccountValue,
    accountFieldLabel,
    accountFieldPlaceholder,
    accountKeyboardType,
    isLoading,
    error,
    successMessage,
    handleSubmit,
  } = useWithdrawalViewModel();

  const [pickerVisible, setPickerVisible] = useState(false);

  const handleSelectMethod = useCallback(
    (method: WithdrawalMethod) => {
      setSelectedMethod(method);
      setPickerVisible(false);
    },
    [setSelectedMethod],
  );

  useEffect(() => {
    if (successMessage) {
      Alert.alert('Thành công', successMessage, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    }
  }, [successMessage, navigation]);

  return (
    <SafeAreaView className="flex-1 surface-base" edges={['top']}>
      <StatusBar barStyle="light-content" />

      {/* ── Top App Bar ── */}
      <View className="surface-brand flex-row items-center px-4 py-3">
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text className="text-heading text-inverse ml-3">Rút tiền</Text>
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
          {/* ── Balance Card ── */}
          <View className="surface-card items-center justify-center p-6 mb-5">
            <Text className="text-body-secondary mb-1">Số dư hiện tại</Text>
            <Text className="text-display text-brand">{balance}</Text>
          </View>

          {/* ── Form Card ── */}
          <View className="surface-card p-5">
            {/* Method picker trigger */}
            <View style={{ marginBottom: 20 }}>
              <FieldLabel label="Phương thức rút tiền" />
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setPickerVisible(true)}
                style={formStyles.inputRow}
              >
                <Text style={formStyles.inputText}>{selectedMethod.label}</Text>
                <ChevronDown size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Amount input */}
            <View style={{ marginBottom: 20 }}>
              <FieldLabel label="Số tiền (USD)" />
              <View style={[formStyles.inputRow, { paddingVertical: 14 }]}>
                <Text
                  style={{ fontSize: 14, color: '#64748b', marginRight: 6 }}
                >
                  $
                </Text>
                <TextInput
                  style={[formStyles.textInput, { flex: 1 }]}
                  placeholder="0.00"
                  placeholderTextColor="#94a3b8"
                  keyboardType="decimal-pad"
                  value={amount}
                  onChangeText={setAmount}
                />
              </View>
              {/* Hint text — explicit style, never hidden */}
              <Text
                style={{
                  fontSize: 12,
                  color: '#64748b',
                  lineHeight: 18,
                  marginTop: 6,
                }}
              >
                Số tiền tối thiểu: $50.00
              </Text>
            </View>

            {/* Account / email field */}
            <View style={{ marginBottom: 20 }}>
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

            {/* Error banner */}
            {error ? (
              <View
                style={{
                  backgroundColor: '#fef2f2',
                  borderWidth: 1,
                  borderColor: '#fecaca',
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  marginBottom: 16,
                }}
              >
                <Text
                  style={{ fontSize: 13, color: '#dc2626', lineHeight: 20 }}
                >
                  {error}
                </Text>
              </View>
            ) : null}

            {/* Submit */}
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={handleSubmit}
              disabled={isLoading}
              style={formStyles.submitBtn}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text
                  style={{ fontSize: 15, fontWeight: '700', color: '#ffffff' }}
                >
                  Yêu cầu rút tiền
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Animated method picker */}
      <MethodPickerModal
        visible={pickerVisible}
        methods={methods}
        selectedMethod={selectedMethod}
        onSelect={handleSelectMethod}
        onClose={() => setPickerVisible(false)}
      />
    </SafeAreaView>
  );
}

const formStyles = StyleSheet.create({
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(0,0,255,0.12)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  inputText: {
    fontSize: 14,
    color: '#000000',
    flex: 1,
  },
  textInput: {
    fontSize: 14,
    color: '#000000',
    padding: 0,
    margin: 0,
  },
  submitBtn: {
    backgroundColor: '#0000ff',
    borderRadius: 9999,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0000ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 6,
  },
});

export default WithdrawalScreen;

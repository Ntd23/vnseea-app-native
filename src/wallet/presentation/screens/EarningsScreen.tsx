// Description: Manage user monetization subscription packages (Kiếm tiền) with details and options.
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ArrowLeft, ChevronDown, CreditCard, Pencil, Plus, Trash2, X } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../../../navigation/types';
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';
import { apiBridge } from '../../../shared-kernel/infrastructure/api/apiBridge';
import { apiConfig } from '../../../shared-kernel/infrastructure/config/env';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';
import axios from 'axios';
import { formatCurrency } from '../../../shared-kernel/application/utils/formatCurrency';
import {
  APP_BRAND_COLOR,
  APP_COLORS,
} from '../../../shared-kernel/presentation/theme/appColors';

type EarningsNav = NativeStackNavigationProp<RootStackParamList>;

interface MonetizationPlan {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  period: string;
  status: string;
}

const MONETIZATION_COPY = {
  vi: {
    header: 'Kiếm tiền',
    addNew: 'Thêm mới',
    title: 'Tiêu đề',
    titlePlaceholder: 'Nhập tiêu đề gói...',
    price: 'Giá bán',
    pricePlaceholder: 'Nhập giá bán...',
    currency: 'Tiền tệ',
    interval: 'Khoảng thời gian',
    description: 'Sự mô tả',
    descPlaceholder: 'Nhập mô tả chi tiết...',
    addBtn: 'Thêm',
    saveBtn: 'Chỉnh sửa',
    cancelBtn: 'Hủy',
    addTitle: 'Thêm gói mới',
    editTitle: 'Chỉnh sửa gói',
    confirmDeleteTitle: 'Xóa gói',
    confirmDeleteMsg: 'Bạn có chắc chắn muốn xóa gói này?',
    deleteSuccess: 'Xóa gói thành công',
    addSuccess: 'Thêm gói thành công',
    editSuccess: 'Chỉnh sửa gói thành công',
    errorTitle: 'Lỗi',
    validationError: 'Vui lòng nhập đầy đủ các trường thông tin bắt buộc.',
    daily: 'Hằng ngày',
    weekly: 'hàng tuần',
    monthly: 'hàng tháng',
    yearly: 'Hàng năm',
    selectInterval: 'Chọn khoảng thời gian',
    selectCurrency: 'Chọn tiền tệ',
  },
  en: {
    header: 'Monetization',
    addNew: 'Add New',
    title: 'Title',
    titlePlaceholder: 'Enter package title...',
    price: 'Price',
    pricePlaceholder: 'Enter price...',
    currency: 'Currency',
    interval: 'Interval',
    description: 'Description',
    descPlaceholder: 'Enter detailed description...',
    addBtn: 'Add',
    saveBtn: 'Edit',
    cancelBtn: 'Cancel',
    addTitle: 'Add new package',
    editTitle: 'Edit package',
    confirmDeleteTitle: 'Delete package',
    confirmDeleteMsg: 'Are you sure you want to delete this package?',
    deleteSuccess: 'Package deleted successfully',
    addSuccess: 'Package added successfully',
    editSuccess: 'Package edited successfully',
    errorTitle: 'Error',
    validationError: 'Please fill in all required fields.',
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
    yearly: 'Yearly',
    selectInterval: 'Select interval',
    selectCurrency: 'Select currency',
  },
};

interface SelectFieldProps {
  label: string;
  value: string;
  placeholder: string;
  onPress: () => void;
}

function SelectField({ label, value, placeholder, onPress }: SelectFieldProps) {
  return (
    <View className="mb-4">
      <Text className="mb-2 text-sm font-bold text-slate-700">{label}</Text>
      <TouchableOpacity
        activeOpacity={0.82}
        onPress={onPress}
        className="min-h-[48px] justify-between flex-row items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
      >
        <Text className={`text-base font-semibold ${value ? 'text-slate-900' : 'text-slate-400'}`}>
          {value || placeholder}
        </Text>
        <ChevronDown size={18} color="#94A3B8" />
      </TouchableOpacity>
    </View>
  );
}

function EarningsScreen() {
  const navigation = useNavigation<EarningsNav>();
  const language = useAppLanguage();
  const copy = MONETIZATION_COPY[language] || MONETIZATION_COPY.vi;
  const isVi = language === 'vi';

  interface CurrencyOption {
    id: string;
    name: string;
    symbol: string;
  }

  const [plans, setPlans] = useState<MonetizationPlan[]>([]);
  const [availableCurrencies, setAvailableCurrencies] = useState<CurrencyOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Modal & Option pickers state
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingPlan, setEditingPlan] = useState<MonetizationPlan | null>(null);
  const [isIntervalPickerVisible, setIsIntervalPickerVisible] = useState(false);
  const [isCurrencyPickerVisible, setIsCurrencyPickerVisible] = useState(false);

  // Form Fields State
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('');
  const [period, setPeriod] = useState('weekly');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Helpers to get name/symbol from currency ID
  const getCurrencyName = useCallback(
    (currVal: string) => {
      const found = availableCurrencies.find(c => c.id === currVal || c.name === currVal);
      return found?.name || currVal;
    },
    [availableCurrencies],
  );

  const getCurrencySymbol = useCallback(
    (currVal: string) => {
      const found = availableCurrencies.find(c => c.id === currVal || c.name === currVal);
      return found?.symbol || '';
    },
    [availableCurrencies],
  );

  // Period Mapper for display
  const getPeriodLabel = useCallback(
    (p: string) => {
      switch (p) {
        case 'daily':
          return copy.daily;
        case 'weekly':
          return copy.weekly;
        case 'monthly':
          return copy.monthly;
        case 'yearly':
          return copy.yearly;
        default:
          return p;
      }
    },
    [copy],
  );

  // Fetch plans from backend settings-monetization endpoint
  const loadPlans = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await apiBridge.post<{
        api_status: number;
        plans?: any[];
        currency?: string;
        currencies?: any[];
      }>('settings-monetization');

      if (response) {
        if (Array.isArray(response.plans)) {
          const mapped = response.plans.map(item => ({
            id: String(item.id || ''),
            title: String(item.title || ''),
            description: String(item.description || ''),
            price: Number(item.price || 0),
            currency: String(item.currency || 'VND'),
            period: String(item.period || 'monthly'),
            status: String(item.status || 'active'),
          }));
          setPlans(mapped);
        }

        if (Array.isArray(response.currencies)) {
          const mappedCurrencies = response.currencies.map(curr => ({
            id: String(curr.id || ''),
            name: String(curr.name || ''),
            symbol: String(curr.symbol || ''),
          }));
          setAvailableCurrencies(mappedCurrencies);
        }

        if (response.currency) {
          setCurrency(current => current || response.currency || 'VND');
        }
      }
    } catch (error) {
      console.warn('[EarningsScreen] Failed to load plans', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  // Open modal to add new
  const handleAddNewPress = useCallback(() => {
    setEditingPlan(null);
    setTitle('');
    setPrice('');
    setCurrency(availableCurrencies[0]?.id || 'VND');
    setPeriod('weekly');
    setDescription('');
    setIsModalVisible(true);
  }, [availableCurrencies]);

  // Open modal to edit existing
  const handleEditPress = useCallback((plan: MonetizationPlan) => {
    setEditingPlan(plan);
    setTitle(plan.title);
    setPrice(String(plan.price));
    setCurrency(plan.currency);
    setPeriod(plan.period);
    setDescription(plan.description);
    setIsModalVisible(true);
  }, []);

  // Delete plan
  const handleDeletePress = useCallback(
    (plan: MonetizationPlan) => {
      Alert.alert(copy.confirmDeleteTitle, copy.confirmDeleteMsg, [
        { text: copy.cancelBtn, style: 'cancel' },
        {
          text: isVi ? 'Xóa' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              const token = sessionStorage.getAccessToken();
              const userId = sessionStorage.getSession()?.userId;
              const params = new URLSearchParams();
              params.append('server_key', apiConfig.serverKey);
              if (token) {
                params.append('access_token', token);
              }
              if (userId) {
                params.append('user_id', String(userId));
              }
              params.append('id', plan.id);

              await axios.post(
                `${apiConfig.webBaseUrl}/requests.php?f=monetization&s=delete`,
                params.toString(),
                {
                  headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-Requested-With': 'XMLHttpRequest',
                  },
                },
              );

              Alert.alert(isVi ? 'Thành công' : 'Success', copy.deleteSuccess);
              loadPlans();
            } catch (error) {
              Alert.alert(
                copy.errorTitle,
                error instanceof Error ? error.message : String(error),
              );
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]);
    },
    [copy, isVi, loadPlans],
  );

  // Save or Edit plan handler
  const handleSavePlan = useCallback(async () => {
    if (!title.trim() || !price.trim() || !description.trim()) {
      Alert.alert(copy.errorTitle, copy.validationError);
      return;
    }

    setIsSaving(true);
    try {
      const token = sessionStorage.getAccessToken();
      const userId = sessionStorage.getSession()?.userId;
      const params = new URLSearchParams();
      params.append('server_key', apiConfig.serverKey);
      if (token) {
        params.append('access_token', token);
      }
      if (userId) {
        params.append('user_id', String(userId));
      }
      params.append('title', title.trim());
      params.append('price', price.trim());
      params.append('currency', currency);
      params.append('period', period);
      params.append('description', description.trim());
      if (editingPlan) {
        params.append('id', editingPlan.id);
      }

      const action = editingPlan ? 'edit' : 'add';
      const response = await axios.post(
        `${apiConfig.webBaseUrl}/requests.php?f=monetization&s=${action}`,
        params.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-Requested-With': 'XMLHttpRequest',
          },
        },
      );

      if (response.data && response.data.status === 200) {
        Alert.alert(
          isVi ? 'Thành công' : 'Success',
          editingPlan ? copy.editSuccess : copy.addSuccess,
        );
        setIsModalVisible(false);
        loadPlans();
      } else {
        throw new Error(response.data?.message || 'Server returned failure');
      }
    } catch (error) {
      Alert.alert(
        copy.errorTitle,
        error instanceof Error ? error.message : String(error),
      );
    } finally {
      setIsSaving(false);
    }
  }, [title, price, currency, period, description, editingPlan, copy, isVi, loadPlans]);

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      {/* Header */}
      <View className="h-16 flex-row items-center justify-between border-b border-slate-100 bg-white px-4">
        <TouchableOpacity
          activeOpacity={0.82}
          onPress={() => navigation.goBack()}
          className="h-11 w-11 items-center justify-center rounded-full bg-slate-50"
        >
          <ArrowLeft size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text className="text-xl font-extrabold text-slate-950">{copy.header}</Text>
        <View className="h-11 w-11" />
      </View>

      {/* Plans List */}
      {isLoading && plans.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={APP_BRAND_COLOR} />
        </View>
      ) : (
        <FlatList
          data={plans}
          keyExtractor={item => item.id}
          ListHeaderComponent={
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleAddNewPress}
              className="mx-4 mt-5 items-center justify-center rounded-2xl bg-slate-100 py-7 border border-dashed border-slate-300"
            >
              <View className="h-10 w-10 items-center justify-center rounded-full bg-slate-800 mb-2">
                <CreditCard size={20} color="#ffffff" />
              </View>
              <Text className="text-base font-bold text-slate-800">{copy.addNew}</Text>
            </TouchableOpacity>
          }
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View
              className="mx-4 mt-4 flex-row items-center justify-between rounded-2xl border border-slate-100 bg-white p-5"
              style={{
                shadowColor: '#000000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.03,
                shadowRadius: 4,
                elevation: 1,
              }}
            >
              <View className="flex-1 pr-4">
                <Text className="text-[17px] font-bold text-slate-900 mb-1">{item.title}</Text>
                <Text className="text-sm font-semibold text-slate-600 mb-1">
                  {formatCurrency(item.price, getCurrencyName(item.currency), getCurrencySymbol(item.currency))} / {getPeriodLabel(item.period)}
                </Text>
                <Text className="text-sm font-medium text-slate-500">{item.description}</Text>
              </View>

              {/* Action Buttons */}
              <View className="flex-col justify-center gap-3">
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => handleEditPress(item)}
                  className="h-10 w-10 items-center justify-center rounded-full bg-sky-100"
                >
                  <Pencil size={18} color={APP_BRAND_COLOR} />
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => handleDeletePress(item)}
                  className="h-10 w-10 items-center justify-center rounded-full bg-red-100"
                >
                  <Trash2 size={18} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* Add/Edit Modal */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <SafeAreaView className="flex-1 bg-white">
          {/* Top Handle */}
          <View className="h-1.5 w-12 rounded-full bg-slate-200 self-center mt-2.5 mb-1.5" />

          {/* Modal Header */}
          <View className="flex-row items-center justify-between px-5 py-3 border-b border-slate-100">
            <Text className="text-xl font-bold text-slate-900">
              {editingPlan ? copy.editTitle : copy.addTitle}
            </Text>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setIsModalVisible(false)}
              className="h-9 w-9 items-center justify-center rounded-full bg-slate-100"
            >
              <X size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1"
          >
            <ScrollView
              className="flex-1 px-5 pt-5"
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Title Field */}
              <View className="mb-4">
                <Text className="mb-2 text-sm font-bold text-slate-700">
                  {copy.title} <Text className="text-red-500">*</Text>
                </Text>
                <View className="rounded-2xl border border-slate-200 bg-slate-50 px-4">
                  <TextInput
                    value={title}
                    onChangeText={setTitle}
                    placeholder={copy.titlePlaceholder}
                    placeholderTextColor="#94A3B8"
                    className="min-h-[48px] text-base font-semibold text-slate-900"
                  />
                </View>
              </View>

              {/* Price Field */}
              <View className="mb-4">
                <Text className="mb-2 text-sm font-bold text-slate-700">
                  {copy.price} <Text className="text-red-500">*</Text>
                </Text>
                <View className="rounded-2xl border border-slate-200 bg-slate-50 px-4">
                  <TextInput
                    value={price}
                    onChangeText={setPrice}
                    placeholder={copy.pricePlaceholder}
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    className="min-h-[48px] text-base font-semibold text-slate-900"
                  />
                </View>
              </View>

              {/* Currency Dropdown Picker */}
              <SelectField
                label={copy.currency}
                value={getCurrencyName(currency) ? `${getCurrencyName(currency)} (${getCurrencyName(currency)})` : ''}
                placeholder={copy.selectCurrency}
                onPress={() => setIsCurrencyPickerVisible(true)}
              />

              {/* Interval Dropdown Picker */}
              <SelectField
                label={copy.interval}
                value={getPeriodLabel(period)}
                placeholder={copy.selectInterval}
                onPress={() => setIsIntervalPickerVisible(true)}
              />

              {/* Description Field */}
              <View className="mb-6">
                <Text className="mb-2 text-sm font-bold text-slate-700">
                  {copy.description} <Text className="text-red-500">*</Text>
                </Text>
                <View className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2">
                  <TextInput
                    value={description}
                    onChangeText={setDescription}
                    placeholder={copy.descPlaceholder}
                    placeholderTextColor="#94A3B8"
                    multiline
                    numberOfLines={4}
                    className="min-h-[100px] text-base font-semibold text-slate-900 textAlignVertical-top"
                    style={{ textAlignVertical: 'top' }}
                  />
                </View>
              </View>

              {/* Submit Button */}
              <View className="flex-row justify-end mb-10">
                <TouchableOpacity
                  activeOpacity={0.85}
                  disabled={isSaving}
                  onPress={handleSavePlan}
                  className="min-h-[48px] px-8 bg-brand rounded-2xl items-center justify-center flex-row"
                  style={{
                    shadowColor: APP_COLORS.brand.shadow,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.15,
                    shadowRadius: 6,
                    elevation: 2,
                  }}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color="#ffffff" className="mr-2" />
                  ) : null}
                  <Text className="text-base font-extrabold text-white">
                    {editingPlan ? copy.saveBtn : copy.addBtn}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Interval Selector Modal */}
      <Modal
        visible={isIntervalPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsIntervalPickerVisible(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setIsIntervalPickerVisible(false)}
          className="flex-1 justify-center bg-black/50 px-6"
        >
          <View className="rounded-3xl bg-white p-5">
            <Text className="mb-4 text-center text-lg font-bold text-slate-900">{copy.selectInterval}</Text>
            {['daily', 'weekly', 'monthly', 'yearly'].map(item => (
              <TouchableOpacity
                key={item}
                activeOpacity={0.7}
                onPress={() => {
                  setPeriod(item);
                  setIsIntervalPickerVisible(false);
                }}
                className={`py-3.5 border-b border-slate-100 items-center ${period === item ? 'bg-brand-subtle' : ''}`}
              >
                <Text className={`text-base ${period === item ? 'font-bold text-brand' : 'font-semibold text-slate-800'}`}>
                  {getPeriodLabel(item)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Currency Selector Modal */}
      <Modal
        visible={isCurrencyPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsCurrencyPickerVisible(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setIsCurrencyPickerVisible(false)}
          className="flex-1 justify-center bg-black/50 px-6"
        >
          <View className="rounded-3xl bg-white p-5">
            <Text className="mb-4 text-center text-lg font-bold text-slate-900">{copy.selectCurrency}</Text>
            {(availableCurrencies.length > 0
              ? availableCurrencies.filter(
                  c => c.name.toUpperCase() === 'VND' || c.name.toUpperCase() === 'USD'
                )
              : []
            ).concat(
              // Safe fallback if the filtered list is empty
              (availableCurrencies.length > 0 &&
               availableCurrencies.some(c => c.name.toUpperCase() === 'VND' || c.name.toUpperCase() === 'USD'))
                ? []
                : [
                    { id: 'VND', name: 'VND', symbol: 'đ' },
                    { id: 'USD', name: 'USD', symbol: '$' },
                  ]
            ).map(item => (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.7}
                onPress={() => {
                  setCurrency(item.id);
                  setIsCurrencyPickerVisible(false);
                }}
                className={`py-3.5 border-b border-slate-100 items-center ${currency === item.id ? 'bg-brand-subtle' : ''}`}
              >
                <Text className={`text-base ${currency === item.id ? 'font-bold text-brand' : 'font-semibold text-slate-800'}`}>
                  {item.name} ({item.symbol})
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

export default EarningsScreen;

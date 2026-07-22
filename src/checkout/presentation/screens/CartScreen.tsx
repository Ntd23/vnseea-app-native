// Description: Marketplace cart screen with item selection before checkout.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Check,
  Minus,
  Package,
  Plus,
  ShoppingBag,
  Trash2,
} from 'lucide-react-native';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import type { CheckoutItem } from '../../domain/types/checkout.types';
import { getCheckoutCurrencyTotals } from '../../domain/checkoutMoney';
import { useCheckoutViewModel } from '../../application/view-models/useCheckoutViewModel';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import { FeedHeader } from '../../../feed/presentation/components/FeedHeader';
import { formatCurrency } from '../../../shared-kernel/application/utils/formatCurrency';

type CartNav = NativeStackNavigationProp<RootStackParamList>;

function CartItemRow({
  item,
  selected,
  disabled,
  onToggle,
  onChangeQuantity,
  onRemove,
}: {
  item: CheckoutItem;
  selected: boolean;
  disabled: boolean;
  onToggle: () => void;
  onChangeQuantity: (quantity: number) => void;
  onRemove: () => void;
}) {
  return (
    <View className="mb-3 rounded-3xl border border-slate-100 bg-white p-3 shadow-sm">
      <View className="flex-row">
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onToggle}
          className={`mr-3 mt-1 h-7 w-7 items-center justify-center rounded-full border-2 ${
            selected ? 'border-[#0000ff] bg-[#0000ff]' : 'border-slate-300 bg-white'
          }`}
        >
          {selected ? <Check size={16} color="#FFFFFF" strokeWidth={3} /> : null}
        </TouchableOpacity>

        {item.image ? (
          <Image
            source={{ uri: item.image }}
            className="h-24 w-24 rounded-2xl bg-slate-100"
            resizeMode="cover"
          />
        ) : (
          <View className="h-24 w-24 items-center justify-center rounded-2xl bg-slate-100">
            <Package size={28} color="#94A3B8" />
          </View>
        )}

        <View className="ml-3 flex-1">
          <Text className="text-base font-extrabold leading-5 text-slate-950" numberOfLines={2}>
            {item.name}
          </Text>
          <Text className="mt-2 text-base font-extrabold text-[#0000ff]">
            {formatCurrency(
              item.price,
              item.currencyCode,
              item.currencySymbol,
            )}
          </Text>

          <View className="mt-3 flex-row items-center justify-between">
            <View className="flex-row items-center rounded-full bg-slate-100">
              <TouchableOpacity
                activeOpacity={0.8}
                disabled={disabled}
                onPress={() => onChangeQuantity(item.quantity - 1)}
                className="h-9 w-9 items-center justify-center"
              >
                <Minus size={15} color="#475569" />
              </TouchableOpacity>
              <Text className="min-w-7 text-center text-sm font-extrabold text-slate-900">
                {item.quantity}
              </Text>
              <TouchableOpacity
                activeOpacity={0.8}
                disabled={disabled}
                onPress={() => onChangeQuantity(item.quantity + 1)}
                className="h-9 w-9 items-center justify-center"
              >
                <Plus size={15} color="#475569" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              disabled={disabled}
              onPress={onRemove}
              className="h-9 w-9 items-center justify-center rounded-full bg-red-50"
            >
              <Trash2 size={16} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

function CartScreen() {
  const navigation = useNavigation<CartNav>();
  const vm = useCheckoutViewModel({ initialStep: 'cart' });
  const initializedSelectionRef = useRef(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const items = vm.summary?.items ?? [];

  useFocusEffect(
    useCallback(() => {
      vm.load().catch(() => undefined);
    }, [vm.load]),
  );

  useEffect(() => {
    if (!items.length) {
      initializedSelectionRef.current = false;
      setSelectedIds(current => {
        if (current.length === 0) return current;
        return [];
      });
      return;
    }

    setSelectedIds(current => {
      const availableIds = new Set(items.map(item => item.productId));
      if (!initializedSelectionRef.current) {
        initializedSelectionRef.current = true;
        const next = items.map(item => item.productId);
        if (current.length === next.length && current.every((id, idx) => next[idx] === id)) {
          return current;
        }
        return next;
      }
      const next = current.filter(id => availableIds.has(id));
      if (current.length === next.length && current.every((id, idx) => next[idx] === id)) {
        return current;
      }
      return next;
    });
  }, [items]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedItems = useMemo(
    () => items.filter(item => selectedSet.has(item.productId)),
    [items, selectedSet],
  );
  const selectedCurrencyTotals = useMemo(
    () => getCheckoutCurrencyTotals(selectedItems),
    [selectedItems],
  );
  const selectedCount = selectedItems.reduce((sum, item) => sum + item.quantity, 0);
  const allSelected = items.length > 0 && selectedItems.length === items.length;

  const toggleItem = useCallback((productId: number) => {
    setSelectedIds(current =>
      current.includes(productId)
        ? current.filter(id => id !== productId)
        : [...current, productId],
    );
  }, []);

  const toggleAll = useCallback(() => {
    setSelectedIds(allSelected ? [] : items.map(item => item.productId));
  }, [allSelected, items]);

  const handleCheckout = useCallback(() => {
    if (!selectedIds.length) return;
    navigation.navigate(ROUTES.CHECKOUT, {
      selectedProductIds: selectedIds,
    });
  }, [navigation, selectedIds]);

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <FocusAwareStatusBar barStyle="dark-content" />
      <FeedHeader />
      <View className="flex-row items-center border-b border-slate-200 bg-white px-4 py-3">
        <TouchableOpacity
          className="h-10 w-10 items-center justify-center rounded-full"
          activeOpacity={0.8}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={23} color="#1E293B" />
        </TouchableOpacity>
        <View className="ml-2 flex-1">
          <Text className="text-2xl font-extrabold text-slate-950">Giỏ hàng</Text>
          <Text className="mt-0.5 text-sm font-semibold text-slate-500">
            Chọn sản phẩm muốn thanh toán
          </Text>
        </View>
      </View>

      {vm.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0000FF" />
          <Text className="mt-3 text-sm font-semibold text-slate-500">
            Đang tải giỏ hàng...
          </Text>
        </View>
      ) : !items.length ? (
        <View className="flex-1 items-center justify-center px-8">
          <View className="h-20 w-20 items-center justify-center rounded-full bg-blue-50">
            <ShoppingBag size={34} color="#0000FF" />
          </View>
          <Text className="mt-5 text-center text-xl font-extrabold text-slate-950">
            Giỏ hàng đang trống
          </Text>
          <Text className="mt-2 text-center text-sm font-medium leading-6 text-slate-500">
            Hãy thêm sản phẩm vào giỏ rồi quay lại đây để chọn món cần thanh toán.
          </Text>
          <TouchableOpacity
            className="mt-6 min-h-[46px] rounded-full bg-[#0000ff] px-6 items-center justify-center"
            activeOpacity={0.9}
            onPress={() => navigation.navigate(ROUTES.MARKETPLACE)}
          >
            <Text className="text-base font-extrabold text-white">Tiếp tục mua sắm</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ padding: 16, paddingBottom: 130 }}
            showsVerticalScrollIndicator={false}
          >
            <View className="mb-4 flex-row items-center justify-between rounded-3xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={toggleAll}
                className="flex-row items-center"
              >
                <View
                  className={`h-7 w-7 items-center justify-center rounded-full border-2 ${
                    allSelected ? 'border-[#0000ff] bg-[#0000ff]' : 'border-slate-300'
                  }`}
                >
                  {allSelected ? <Check size={16} color="#FFFFFF" strokeWidth={3} /> : null}
                </View>
                <Text className="ml-3 text-base font-extrabold text-slate-900">
                  Chọn tất cả
                </Text>
              </TouchableOpacity>
              <Text className="text-sm font-semibold text-slate-500">
                {selectedItems.length}/{items.length} sản phẩm
              </Text>
            </View>

            {items.map(item => (
              <CartItemRow
                key={item.id}
                item={item}
                selected={selectedSet.has(item.productId)}
                disabled={vm.isUpdatingQuantity}
                onToggle={() => toggleItem(item.productId)}
                onChangeQuantity={quantity =>
                  vm.changeQuantity(item.productId, quantity)
                }
                onRemove={() => vm.changeQuantity(item.productId, 0)}
              />
            ))}

            {vm.paymentError ? (
              <Text className="mt-2 text-sm font-semibold text-red-500">
                {vm.paymentError}
              </Text>
            ) : null}
          </ScrollView>

          <View className="absolute bottom-0 left-0 right-0 border-t border-slate-200 bg-white px-4 pb-4 pt-3 shadow-lg">
            <View className="mb-3 flex-row items-center justify-between">
              <View>
                <Text className="text-sm font-semibold text-slate-500">
                  Đã chọn {selectedCount} sản phẩm
                </Text>
                <Text
                  className="mt-0.5 max-w-[210px] text-lg font-extrabold text-[#0000ff]"
                  numberOfLines={2}
                >
                  {selectedCurrencyTotals
                    .map(total =>
                      formatCurrency(
                        total.amount,
                        total.currencyCode,
                        total.currencySymbol,
                      ),
                    )
                    .join(' · ')}
                </Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.9}
                disabled={!selectedIds.length}
                onPress={handleCheckout}
                className={`min-h-[50px] min-w-[150px] items-center justify-center rounded-full px-5 ${
                  selectedIds.length ? 'bg-[#0000ff]' : 'bg-slate-300'
                }`}
              >
                <Text className="text-base font-extrabold text-white">
                  Thanh toán
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

export default CartScreen;

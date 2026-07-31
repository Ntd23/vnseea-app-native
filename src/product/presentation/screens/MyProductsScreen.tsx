// Description: Renders the user's marketplace products, purchases, orders, and nearby shortcut.
import { APP_BRAND_COLOR } from '../../../shared-kernel/presentation/theme/appColors';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type ListRenderItemInfo,
} from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Banknote,
  Clock3,
  Download,
  Eye,
  MessageSquare,
  Package,
  Plus,
  RotateCw,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Store,
  Trash2,
  X,
} from 'lucide-react-native';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import type { OrdersItem, OrderLineItem, OrderStatus } from '../../../orders/domain/types/orders.types';
import {
  type MyProductsTab,
  type OrderStatusFilter,
  type ProductSortOption,
  useMyProductsViewModel,
} from '../../application/view-models/useMyProductsViewModel';
import type { ProductItem } from '../../domain/types/product.types';
import ProductPostCard from '../components/ProductPostCard';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import { FeedHeader } from '../../../feed/presentation/components/FeedHeader';
import { markOrderNotificationModeRead } from '../../../orders/application/notifications/orderNotificationBadgeActions';
import { useOrderNotificationBadges } from '../../../orders/application/notifications/orderNotificationBadgeStore';
import type { OrderNotificationMode } from '../../../orders/application/notifications/orderNotificationBadges';
import { showSnackbar } from '../../../shared-kernel/presentation/components/Snackbar';

type MyProductsNav = NativeStackNavigationProp<RootStackParamList>;
type MyProductsRoute = RouteProp<RootStackParamList, typeof ROUTES.MY_PRODUCTS>;

const PRODUCT_COLUMNS = { justifyContent: 'space-between' } as const;
const ORDER_DETAIL_MAX_HEIGHT = Dimensions.get('window').height * 0.82;
const PURCHASE_COLUMNS = Dimensions.get('window').width >= 700 ? 2 : 1;

const TABS: Array<{ key: MyProductsTab; label: string }> = [
  { key: 'products', label: 'Sản phẩm của tôi' },
  { key: 'purchased', label: 'Đã đặt' },
  { key: 'orders', label: 'Đơn bán' },
  { key: 'marketplace', label: 'Thị trường' },
];

const PRODUCT_SORT_OPTIONS: Array<{ label: string; value: ProductSortOption }> = [
  { label: 'Mới đăng', value: 'newest' },
  { label: 'Giá tăng dần', value: 'price_asc' },
  { label: 'Giá giảm dần', value: 'price_desc' },
];

const ORDER_STATUS_OPTIONS: Array<{
  label: string;
  value: OrderStatusFilter;
}> = [
  { label: 'Tất cả', value: 'all' },
  { label: 'Chờ xác nhận', value: 'placed' },
  { label: 'Đã xác nhận', value: 'accepted' },
  { label: 'Đã đóng gói', value: 'packed' },
  { label: 'Đang giao', value: 'shipped' },
  { label: 'Đã giao', value: 'delivered' },
  { label: 'Đã hủy', value: 'canceled' },
];

function SearchFilterRow({
  value,
  placeholder,
  hasActiveFilters,
  onChangeText,
  onToggleFilters,
}: {
  value: string;
  placeholder: string;
  hasActiveFilters: boolean;
  onChangeText: (value: string) => void;
  onToggleFilters: () => void;
}) {
  return (
    <View className="flex-row items-center gap-2">
      <View className="input-shell flex-1 flex-row items-center px-4">
        <Search size={19} color="#64748B" />
        <TextInput
          className="ml-3 min-h-[46px] flex-1 text-body-primary"
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          value={value}
          onChangeText={onChangeText}
          returnKeyType="search"
        />
        {value ? (
          <TouchableOpacity
            className="h-8 w-8 items-center justify-center rounded-full"
            activeOpacity={0.8}
            hitSlop={{ top: 6, right: 6, bottom: 6, left: 6 }}
            onPress={() => onChangeText('')}
          >
            <X size={16} color="#64748B" />
          </TouchableOpacity>
        ) : null}
      </View>
      <TouchableOpacity
        className={`h-12 w-12 items-center justify-center rounded-2xl border ${
          hasActiveFilters
            ? 'border-brand bg-brand-subtle'
            : 'border-slate-200 bg-white'
        }`}
        activeOpacity={0.8}
        hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
        onPress={onToggleFilters}
      >
        <SlidersHorizontal size={20} color={APP_BRAND_COLOR} />
      </TouchableOpacity>
    </View>
  );
}

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      className={`rounded-full border px-3 py-2 ${
        active ? 'border-brand bg-brand-subtle' : 'border-slate-200 bg-white'
      }`}
      activeOpacity={0.8}
      onPress={onPress}
    >
      <Text
        className={
          active
            ? 'text-caption-primary text-brand'
            : 'text-caption-secondary'
        }
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function EmptyPanel({
  title,
  description,
  canRetry,
  onRetry,
}: {
  title: string;
  description: string;
  canRetry?: boolean;
  onRetry?: () => void;
}) {
  return (
    <View className="items-center px-8 py-16">
      <View className="icon-chip h-16 w-16 items-center justify-center">
        <ShoppingBag size={30} color={APP_BRAND_COLOR} />
      </View>
      <Text className="mt-4 text-center text-title-primary">{title}</Text>
      <Text className="mt-2 text-center text-body-secondary">
        {description}
      </Text>
      {canRetry && onRetry ? (
        <TouchableOpacity
          className="btn-secondary mt-5 min-h-[42px] px-5"
          activeOpacity={0.85}
          onPress={onRetry}
        >
          <RotateCw size={16} color={APP_BRAND_COLOR} />
          <Text className="text-title-primary text-brand">Thử lại</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function OrderCard({
  item,
  isSeller,
  onViewDetail,
}: {
  item: OrdersItem;
  isSeller?: boolean;
  onViewDetail: (item: OrdersItem) => void;
}) {
  return (
    <View className="mb-3 px-4 py-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
      <View className="flex-row items-start justify-between gap-3" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View className="flex-1">
          <Text className="text-sm font-bold text-slate-800" numberOfLines={1}>{item.product}</Text>
          <Text className="mt-1 text-xs text-slate-500">
            Mã đơn: <Text className="font-bold text-slate-700">{item.code}</Text>
          </Text>
          <Text className="mt-0.5 text-xs text-slate-500">
            {isSeller ? 'Khách hàng: ' : 'Cửa hàng: '}<Text className="font-bold text-slate-700">{isSeller ? (item.buyerName || item.shop) : item.shop}</Text>
          </Text>
        </View>
        <View className="rounded-full bg-brand-subtle px-2.5 py-1">
          <Text className="text-xs font-bold text-brand">
            {item.statusLabel}
          </Text>
        </View>
      </View>
      <View className="mt-4 flex-row items-center justify-between border-t border-slate-100 pt-3" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text className="text-xs text-slate-400">{item.date}</Text>
        <Text className="text-sm font-black text-brand">{item.total}</Text>
      </View>
      <TouchableOpacity
        className="flex-row items-center justify-center bg-slate-100 border border-slate-200 h-10 mt-4 rounded-xl"
        style={{ flexDirection: 'row', alignItems: 'center' }}
        activeOpacity={0.85}
        onPress={() => onViewDetail(item)}
      >
        <Eye size={16} color="#475569" />
        <Text className="ml-2 text-xs font-semibold text-slate-600">Xem chi tiết</Text>
      </TouchableOpacity>
    </View>
  );
}
function OrderDetailModal({
  order,
  isSeller,
  onUpdateStatus,
  onClose,
  navigation,
}: {
  order: OrdersItem | null;
  isSeller?: boolean;
  onUpdateStatus?: (id: string, status: OrderStatus) => Promise<void>;
  onClose: () => void;
  navigation: any;
}) {
  const [updating, setUpdating] = useState(false);

  const handleMessageCustomer = () => {
    if (!order?.buyerUserId) {
      Alert.alert('Thông báo', 'Không tìm thấy thông tin liên lạc của khách hàng này.');
      return;
    }
    onClose();
    const chat = {
      id: `user:${order.buyerUserId}`,
      chatType: 'user' as const,
      userId: String(order.buyerUserId),
      username: order.buyerUsername || '',
      name: order.buyerName || '',
      avatar: order.buyerAvatar || '',
      lastMessage: '',
      lastMessageTime: 0,
      unreadCount: 0,
      isOnline: false,
      isVerified: false,
    };
    navigation.navigate(ROUTES.CHAT, { chat });
  };

  const handleUpdateStatus = async (status: OrderStatus) => {
    if (!order || !onUpdateStatus) return;
    setUpdating(true);
    try {
      await onUpdateStatus(order.id, status);
      Alert.alert('Thành công', 'Đã cập nhật trạng thái đơn hàng thành công.');
    } catch (e) {
      console.warn(e);
      Alert.alert('Thất bại', 'Không thể cập nhật trạng thái đơn hàng.');
    } finally {
      setUpdating(false);
    }
  };

  // Get allowed next statuses based on current status
  const nextStatuses = React.useMemo(() => {
    if (!order) return [];
    const current = order.status;
    if (order.orderFlow === 'request' && current === 'placed') {
      return [
        { label: 'Chấp nhận', value: 'accepted' as const },
        { label: 'Từ chối', value: 'canceled' as const },
      ];
    }
    if (current === 'placed') {
      return [
        { label: 'Chấp nhận', value: 'accepted' as const },
        { label: 'Đóng gói', value: 'packed' as const },
        { label: 'Giao hàng', value: 'shipped' as const },
        { label: 'Hủy đơn', value: 'canceled' as const },
      ];
    }
    if (current === 'accepted') {
      return [
        { label: 'Đóng gói', value: 'packed' as const },
        { label: 'Giao hàng', value: 'shipped' as const },
      ];
    }
    if (current === 'packed') {
      return [
        { label: 'Giao hàng', value: 'shipped' as const },
      ];
    }
    if (current === 'shipped') {
      return [
        { label: 'Hoàn thành', value: 'delivered' as const },
      ];
    }
    return [];
  }, [order]);

  return (
    <Modal
      transparent
      visible={Boolean(order)}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/35">
        <View
          className="rounded-t-3xl bg-white px-5 pb-6 pt-4"
          style={styles.orderDetailSheet}
        >
          <View className="mb-4 flex-row items-center justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-heading">Chi tiết đơn hàng</Text>
              <Text className="mt-1 text-caption-secondary">{order?.code}</Text>
            </View>
            <TouchableOpacity
              className="h-10 w-10 items-center justify-center rounded-full bg-slate-100"
              activeOpacity={0.8}
              hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
              onPress={onClose}
            >
              <X size={18} color="#475569" />
            </TouchableOpacity>
          </View>

          {order ? (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View className="rounded-2xl bg-slate-50 px-4 py-4">
                <View className="flex-row justify-between py-1.5" style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text className="text-body-secondary">{isSeller ? 'Khách hàng' : 'Shop'}</Text>
                  <Text className="ml-4 flex-1 text-right text-title-secondary font-bold text-slate-800">
                    {isSeller ? (order.buyerName || 'Người mua') : order.shop}
                  </Text>
                </View>
                <View className="flex-row justify-between py-1.5" style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text className="text-body-secondary">Trạng thái</Text>
                  <Text className="ml-4 flex-1 text-right text-title-secondary font-bold text-brand">
                    {order.statusLabel}
                  </Text>
                </View>
                <View className="flex-row justify-between py-1.5" style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text className="text-body-secondary">Ngày đặt</Text>
                  <Text className="ml-4 flex-1 text-right text-title-secondary">
                    {order.date || 'Chưa cập nhật'}
                  </Text>
                </View>
                <View className="mt-2 flex-row justify-between border-t border-slate-100 pt-4" style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text className="text-title-primary">Tổng cộng</Text>
                  <Text className="text-title-primary text-brand font-bold">
                    {order.total}
                  </Text>
                </View>
              </View>

              {isSeller && (
                <View className="mt-4 gap-3 bg-brand-subtle border border-brand-border rounded-2xl p-4">
                  <Text className="text-xs font-extrabold text-brand-pressed uppercase tracking-wide">Khách hàng: {order.buyerName}</Text>
                  <TouchableOpacity
                    className="flex-row items-center justify-center bg-brand rounded-xl py-2.5 px-4 shadow-sm"
                    style={{ flexDirection: 'row', alignItems: 'center' }}
                    activeOpacity={0.8}
                    onPress={handleMessageCustomer}
                  >
                    <MessageSquare size={14} color="#FFFFFF" />
                    <Text className="ml-2 text-white font-bold text-xs">Nhắn tin với khách hàng</Text>
                  </TouchableOpacity>
                </View>
              )}

              {isSeller && nextStatuses.length > 0 && (
                <View className="mt-4 border-t border-slate-100 pt-4">
                  <Text className="text-xs font-extrabold text-slate-400 uppercase tracking-wide mb-2">Cập nhật trạng thái đơn</Text>
                  {updating ? (
                    <ActivityIndicator size="small" color={APP_BRAND_COLOR} />
                  ) : (
                    <View className="flex-row flex-wrap gap-2" style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                      {nextStatuses.map(option => (
                        <TouchableOpacity
                          key={option.value}
                          className="bg-brand-subtle border border-brand-border rounded-full px-3 py-1.5 mr-2 mb-2"
                          activeOpacity={0.8}
                          onPress={() => handleUpdateStatus(option.value)}
                        >
                          <Text className="text-xs font-bold text-brand">{option.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              )}

              <Text className="mb-2 mt-5 text-title-primary">Sản phẩm</Text>
              {(order.lines.length ? order.lines : [
                {
                  id: order.id,
                  product: order.product,
                  total: order.total,
                  status: order.status,
                  statusLabel: order.statusLabel,
                },
              ]).map(line => (
                <View
                  key={line.id}
                  className="mb-3 rounded-2xl border border-slate-100 px-4 py-3"
                >
                  <View className="flex-row justify-between gap-3" style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text className="flex-1 text-title-secondary">
                      {line.product}
                    </Text>
                    <Text className="text-title-secondary text-brand">
                      {line.total}
                    </Text>
                  </View>
                  <Text className="mt-2 text-caption-secondary">
                    {line.statusLabel}
                  </Text>
                </View>
              ))}
            </ScrollView>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

function orderLines(order: OrdersItem): OrderLineItem[] {
  return order.lines.length
    ? order.lines
    : [
        {
          id: order.id,
          product: order.product,
          total: order.total,
          status: order.status,
          statusLabel: order.statusLabel,
          shop: order.shop,
          price: order.amount,
          quantity: 1,
        },
      ];
}

function formatVnd(value?: number, withDecimals = false) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 'VND0';
  return `VND${amount.toLocaleString(withDecimals ? 'en-US' : 'vi-VN', {
    minimumFractionDigits: withDecimals ? 2 : 0,
    maximumFractionDigits: withDecimals ? 2 : 0,
  })}`;
}

function PurchasedOrderDetailModal({
  order,
  onClose,
  onRequestRefund,
}: {
  order: OrdersItem | null;
  onClose: () => void;
  onRequestRefund: (orderId: string, message: string) => Promise<void>;
}) {
  const [refundFormVisible, setRefundFormVisible] = useState(false);
  const [refundMessage, setRefundMessage] = useState('');
  const [requestingRefund, setRequestingRefund] = useState(false);
  const [refundSubmitted, setRefundSubmitted] = useState(false);

  useEffect(() => {
    setRefundFormVisible(false);
    setRefundMessage('');
    setRequestingRefund(false);
    setRefundSubmitted(Boolean(order?.refundRequested));
  }, [order]);

  const lines = order ? orderLines(order) : [];
  const subtotal = order?.amount || lines.reduce((sum, line) => sum + (line.price || 0), 0);
  const address = order?.shippingAddress;

  const submitRefund = async () => {
    const message = refundMessage.trim();
    if (!order || !message) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập lý do yêu cầu hoàn tiền.');
      return;
    }

    setRequestingRefund(true);
    try {
      await onRequestRefund(order.id, message);
      setRefundSubmitted(true);
      setRefundFormVisible(false);
      Alert.alert('Thành công', 'Yêu cầu hoàn tiền của bạn đang được xem xét.');
    } catch (error) {
      Alert.alert(
        'Không thể gửi yêu cầu',
        error instanceof Error ? error.message : 'Vui lòng thử lại sau.',
      );
    } finally {
      setRequestingRefund(false);
    }
  };

  return (
    <Modal
      transparent
      visible={Boolean(order)}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.orderDetailBackdrop}>
        <View style={styles.purchasedDetailSheet}>
          <View style={styles.purchasedDetailHeader}>
            <View style={styles.purchasedDetailHeaderText}>
              <Text style={styles.purchasedDetailTitle}>Chi tiết đơn hàng</Text>
              <Text style={styles.purchasedDetailCode}>{order?.code}</Text>
            </View>
            <TouchableOpacity
              style={styles.purchasedDetailClose}
              activeOpacity={0.8}
              onPress={onClose}
            >
              <X size={19} color="#475569" />
            </TouchableOpacity>
          </View>

          {order ? (
            <ScrollView
              showsVerticalScrollIndicator
              persistentScrollbar
              contentContainerStyle={styles.purchasedDetailContent}
            >
              {order.status !== 'delivered' ? (
                <>
                  <View style={styles.orderInfoBanner}>
                    <Text style={styles.orderInfoText}>
                      Nếu trạng thái đơn đặt hàng không được đặt thành đã giao trong vòng 60 ngày kể từ ngày đặt hàng, nó sẽ tự động được gửi đến "Đã giao".
                    </Text>
                  </View>
                  <View style={styles.orderInfoBanner}>
                    <Text style={styles.orderInfoText}>
                      Nếu đơn đặt hàng không thực sự được giao, người mua có thể yêu cầu hoàn lại tiền.
                    </Text>
                  </View>
                </>
              ) : null}

              <Text style={styles.orderSectionTitle}>Địa chỉ giao hàng</Text>
              <View style={styles.shippingAddressCard}>
                {address ? (
                  <>
                    <Text style={styles.shippingName}>{address.name || 'Người nhận'}</Text>
                    {address.phone ? <Text style={styles.shippingText}>{address.phone}</Text> : null}
                    {address.address ? <Text style={styles.shippingText}>{address.address}</Text> : null}
                    {[address.city, address.state, address.country]
                      .filter(Boolean)
                      .map((value, index) => (
                        <Text key={`${value}-${index}`} style={styles.shippingText}>{value}</Text>
                      ))}
                    {address.zip ? <Text style={styles.shippingText}>{address.zip}</Text> : null}
                  </>
                ) : (
                  <Text style={styles.shippingMissing}>Chưa có thông tin địa chỉ giao hàng.</Text>
                )}
              </View>

              <View style={styles.orderProductsSection}>
                {lines.map(line => (
                  <View key={line.id} style={styles.orderProductRow}>
                    <View style={styles.orderProductImageWrap}>
                      {line.image ? (
                        <Image source={{ uri: line.image }} style={styles.orderProductImage} resizeMode="cover" />
                      ) : (
                        <View style={styles.orderProductPlaceholder}>
                          <Package size={28} color="#94a3b8" />
                        </View>
                      )}
                      <View style={styles.orderProductPriceBadge}>
                        <Text style={styles.orderProductPriceText}>{formatVnd(line.price)}</Text>
                      </View>
                    </View>
                    <View style={styles.orderProductCopy}>
                      <Text style={styles.orderProductName} numberOfLines={3}>{line.product}</Text>
                      <Text style={styles.orderProductQuantity}>Qty {line.quantity || 1}</Text>
                    </View>
                  </View>
                ))}

                <View style={styles.orderSubtotal}>
                  <Text style={styles.orderSubtotalLabel}>Thanh toán Tổng phụ</Text>
                  <Text style={styles.orderSubtotalValue}>{formatVnd(subtotal, true)}</Text>
                </View>

                {refundFormVisible ? (
                  <View style={styles.refundForm}>
                    <Text style={styles.refundLabel}>Lý do hoàn tiền</Text>
                    <TextInput
                      style={styles.refundInput}
                      value={refundMessage}
                      onChangeText={setRefundMessage}
                      placeholder="Mô tả vấn đề với đơn hàng"
                      placeholderTextColor="#94a3b8"
                      multiline
                      textAlignVertical="top"
                    />
                    <View style={styles.refundFormActions}>
                      <TouchableOpacity
                        style={styles.refundCancelButton}
                        activeOpacity={0.8}
                        onPress={() => setRefundFormVisible(false)}
                      >
                        <Text style={styles.refundCancelText}>Hủy</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.refundSubmitButton}
                        activeOpacity={0.8}
                        disabled={requestingRefund}
                        onPress={submitRefund}
                      >
                        {requestingRefund ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Text style={styles.refundSubmitText}>Gửi yêu cầu</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : null}

                {refundSubmitted ? (
                  <View style={styles.refundPendingBanner}>
                    <Text style={styles.refundPendingText}>Yêu cầu hoàn tiền của bạn đang chờ duyệt.</Text>
                  </View>
                ) : null}

                <View style={styles.orderDetailActions}>
                  <TouchableOpacity
                    style={styles.invoiceButton}
                    activeOpacity={0.8}
                    onPress={() => downloadInvoiceFile(order, order.shop || 'Shop', lines)}
                  >
                    <Download size={15} color="#FFFFFF" />
                    <Text style={styles.orderActionText}>Tải xuống hóa đơn</Text>
                  </TouchableOpacity>
                  {!refundSubmitted && order.status !== 'canceled' ? (
                    <TouchableOpacity
                      style={styles.refundButton}
                      activeOpacity={0.8}
                      onPress={() => setRefundFormVisible(true)}
                    >
                      <RotateCw size={15} color="#FFFFFF" />
                      <Text style={styles.orderActionText}>Yêu cầu hoàn lại</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            </ScrollView>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const downloadInvoiceFile = async (order: OrdersItem, shopName: string, lines: OrderLineItem[]) => {
  try {
    const cleanShopName = shopName.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `hoa_don_${order.code.replace('#', '')}_${cleanShopName}.html`;
    const { dirs } = ReactNativeBlobUtil.fs;
    const downloadDir = Platform.OS === 'android' ? dirs.DownloadDir : dirs.DocumentDir;
    const filePath = `${downloadDir}/${fileName}`;

    const totalAmount = lines.reduce((sum, item) => {
      const itemPrice = item.price || Number(String(item.total).replace(/[^\d.-]/g, '')) || 0;
      return sum + itemPrice;
    }, 0);
    const moneyFormatted = totalAmount > 0 
      ? `${totalAmount.toLocaleString('vi-VN')} đ` 
      : order.total;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Hóa Đơn Mua Hàng - ${order.code}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; margin: 0; padding: 40px; background-color: #f8fafc; }
    .invoice-box { max-width: 600px; margin: auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05); }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 25px; }
    .logo { font-size: 24px; font-weight: 800; color: ${APP_BRAND_COLOR}; }
    .title { font-size: 18px; font-weight: 700; color: #475569; }
    .section-title { font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }
    .info-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
    .divider { height: 1px; background-color: #e2e8f0; margin: 20px 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 15px; }
    th { text-align: left; font-size: 12px; font-weight: 700; color: #64748b; padding-bottom: 8px; border-bottom: 1px solid #e2e8f0; }
    td { padding: 12px 0; font-size: 14px; border-bottom: 1px solid #f1f5f9; }
    .total-row { display: flex; justify-content: space-between; align-items: center; margin-top: 25px; font-size: 18px; font-weight: 700; color: ${APP_BRAND_COLOR}; }
    .footer { text-align: center; font-size: 12px; color: #94a3b8; margin-top: 40px; }
  </style>
</head>
<body>
  <div class="invoice-box">
    <div class="header">
      <div class="logo">VNSEEA</div>
      <div class="title">HÓA ĐƠN MUA HÀNG</div>
    </div>
    
    <div>
      <div class="section-title">Chi tiết đơn hàng</div>
      <div class="info-row">
        <span style="color: #64748b;">Mã đơn hàng:</span>
        <span style="font-weight: 600; color: #0f172a;">${order.code}</span>
      </div>
      <div class="info-row">
        <span style="color: #64748b;">Ngày đặt:</span>
        <span style="font-weight: 600; color: #0f172a;">${order.date || 'Vừa xong'}</span>
      </div>
      <div class="info-row">
        <span style="color: #64748b;">Cửa hàng:</span>
        <span style="font-weight: 600; color: #0f172a;">${shopName}</span>
      </div>
      <div class="info-row">
        <span style="color: #64748b;">Trạng thái:</span>
        <span style="font-weight: 600; color: ${APP_BRAND_COLOR};">${order.statusLabel}</span>
      </div>
    </div>
    
    <div class="divider"></div>
    
    <div class="section-title">Danh sách sản phẩm</div>
    <table>
      <thead>
        <tr>
          <th>Sản phẩm</th>
          <th style="text-align: right;">Giá</th>
        </tr>
      </thead>
      <tbody>
        ${lines.map(line => `
          <tr>
            <td style="font-weight: 600; color: #334155;">${line.product}</td>
            <td style="text-align: right; font-weight: 600; color: #0f172a;">${line.total}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    
    <div class="total-row">
      <span>Tổng cộng:</span>
      <span>${moneyFormatted}</span>
    </div>
    
    <div class="footer">
      Cảm ơn bạn đã tin tưởng mua sắm trên VNSEEA Marketplace!
    </div>
  </div>
</body>
</html>
    `;

    await ReactNativeBlobUtil.fs.writeFile(filePath, htmlContent, 'utf8');

    if (Platform.OS === 'android') {
      ReactNativeBlobUtil.android.actionViewIntent(filePath, 'text/html');
    }

    Alert.alert(
      'Tải hóa đơn thành công',
      `Đã lưu hóa đơn tại thư mục tải xuống:\n${fileName}`
    );
  } catch (err) {
    console.error('Download invoice failed:', err);
    Alert.alert('Thất bại', 'Không thể tạo và tải hóa đơn.');
  }
};

function PurchasedOrderCard({
  item,
  onViewDetail,
}: {
  item: OrdersItem;
  onViewDetail: (item: OrdersItem) => void;
}) {
  const invoiceLines = React.useMemo(
    () =>
      item.lines.length
        ? item.lines
        : [
            {
              id: item.id,
              product: item.product,
              total: item.total,
              status: item.status,
              statusLabel: item.statusLabel,
              shop: item.shop,
            } as OrderLineItem,
          ],
    [item],
  );
  const amount = Number(item.amount);
  const formattedAmount = Number.isFinite(amount)
    ? amount.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : item.total.replace(/\s*đ$/i, '');

  return (
    <View className="rounded-xl border border-slate-200 bg-white px-4 py-4">
      <Text className="text-sm font-medium text-slate-500">#{item.id}</Text>
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={() => onViewDetail(item)}
        style={{ alignSelf: 'flex-start' }}
      >
        <Text
          className="mt-1 text-lg font-extrabold text-slate-800"
          numberOfLines={2}
          style={{ textDecorationLine: 'underline' }}
        >
          {item.product}
        </Text>
      </TouchableOpacity>

      <View className="mt-2 flex-row items-center">
        <Banknote size={16} color="#475569" />
        <Text className="ml-1.5 text-sm font-medium text-slate-600">
          {formattedAmount}
        </Text>
      </View>

      <View className="mt-5 flex-row items-center justify-between border-t border-slate-100 pt-3">
        <View className="flex-row items-center">
          <Clock3 size={16} color="#475569" />
          <Text className="ml-1.5 text-sm text-slate-600">
            {item.date || 'Vừa xong'}
          </Text>
        </View>
        <TouchableOpacity
          className="flex-row items-center rounded bg-brand px-3 py-2"
          activeOpacity={0.8}
          onPress={() =>
            downloadInvoiceFile(item, item.shop || 'Shop', invoiceLines)
          }
        >
          <Download size={14} color="#FFFFFF" />
          <Text className="ml-1.5 text-xs font-bold text-white">
            Tải xuống hóa đơn
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function MyProductsScreen() {
  const navigation = useNavigation<MyProductsNav>();
  const route = useRoute<MyProductsRoute>();
  const orderBadges = useOrderNotificationBadges();
  const targetUserIdRaw = route.params?.userId;
  const targetUserId = targetUserIdRaw ? Number(targetUserIdRaw) : undefined;
  const vm = useMyProductsViewModel(
    targetUserId,
    route.params?.initialTab ?? 'products',
  );
  const { setActiveTab } = vm;
  const deleteProductAction = vm.deleteProduct;
  const updateSellerOrderStatus = vm.updateOrderStatus;
  const [selectedSellerOrder, setSelectedSellerOrder] =
    useState<OrdersItem | null>(null);

  useEffect(() => {
    if (route.params?.initialTab) {
      setActiveTab(route.params.initialTab);
    }
  }, [route.params?.initialTab, setActiveTab]);

  const markOrderTabRead = useCallback(
    async (mode: OrderNotificationMode) => {
      const result = await markOrderNotificationModeRead(mode);
      if (result.failedCount > 0) {
        showSnackbar({
          type: 'error',
          message: 'Chưa thể đánh dấu tất cả thông báo đơn hàng đã đọc.',
        });
      }
    },
    [],
  );

  useEffect(() => {
    if (targetUserId) return;

    if (vm.activeTab === 'purchased') {
      markOrderTabRead('purchased').catch(() => undefined);
    } else if (vm.activeTab === 'orders') {
      markOrderTabRead('seller').catch(() => undefined);
    }
  }, [markOrderTabRead, targetUserId, vm.activeTab]);

  const handleCreate = useCallback(() => {
    navigation.navigate(ROUTES.CREATE_PRODUCT);
  }, [navigation]);

  const handleTabPress = useCallback(
    (tab: MyProductsTab) => {
      if (tab === 'marketplace') {
        navigation.navigate(ROUTES.MARKETPLACE);
        return;
      }
      if (!targetUserId && tab === 'purchased') {
        markOrderTabRead('purchased').catch(() => undefined);
      } else if (!targetUserId && tab === 'orders') {
        markOrderTabRead('seller').catch(() => undefined);
      }
      setActiveTab(tab);
    },
    [markOrderTabRead, navigation, setActiveTab, targetUserId],
  );

  const handleProductPress = useCallback(
    (product: ProductItem) => {
      navigation.navigate(ROUTES.PRODUCT_DETAIL, {
        productId: product.id,
        product,
      });
    },
    [navigation],
  );

  const handleEditProduct = useCallback(
    (product: ProductItem) => {
      navigation.navigate(ROUTES.EDIT_PRODUCT, { product });
    },
    [navigation],
  );

  const handleDeleteProduct = useCallback(
    (product: ProductItem) => {
      Alert.alert(
        'Xóa sản phẩm',
        `Bạn có chắc chắn muốn xóa "${product.name}"?`,
        [
          { text: 'Hủy', style: 'cancel' },
          {
            text: 'Xóa',
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteProductAction(product);
              } catch (error) {
                Alert.alert(
                  'Không thể xóa sản phẩm',
                  error instanceof Error
                    ? error.message
                    : 'Vui lòng thử lại.',
                );
              }
            },
          },
        ],
      );
    },
    [deleteProductAction],
  );

  const renderProduct = useCallback(
    ({ item }: ListRenderItemInfo<ProductItem>) => (
      <View className="w-[48%]">
        <ProductPostCard
          compact
          product={item}
          onPress={handleProductPress}
          onEdit={item.is_owner ? handleEditProduct : undefined}
          onDelete={item.is_owner ? handleDeleteProduct : undefined}
          isDeleting={vm.deletingProductId === item.id}
        />
      </View>
    ),
    [
      handleDeleteProduct,
      handleEditProduct,
      handleProductPress,
      vm.deletingProductId,
    ],
  );

  const renderOrder = useCallback(
    ({ item }: ListRenderItemInfo<OrdersItem>) => (
      <View style={{ flex: 1 }}>
        <PurchasedOrderCard
          item={item}
          onViewDetail={order => navigation.navigate(ROUTES.ORDER_DETAIL, { order })}
        />
      </View>
    ),
    [navigation],
  );

  const renderSellerOrder = useCallback(
    ({ item }: ListRenderItemInfo<OrdersItem>) => (
      <View style={{ flex: 1 }}>
        <OrderCard
          item={item}
          isSeller
          onViewDetail={setSelectedSellerOrder}
        />
      </View>
    ),
    [],
  );

  const handleUpdateSellerOrderStatus = useCallback(
    async (orderId: string, status: OrderStatus) => {
      await updateSellerOrderStatus(orderId, status);
      setSelectedSellerOrder(current =>
        current?.id === orderId
          ? {
              ...current,
              status,
              statusLabel:
                status === 'accepted'
                  ? 'Đã xác nhận'
                  : status === 'packed'
                    ? 'Đã đóng gói'
                    : status === 'shipped'
                      ? 'Đang giao'
                      : status === 'delivered'
                        ? 'Đã giao'
                        : status === 'canceled'
                          ? 'Đã hủy'
                          : current.statusLabel,
            }
          : current,
      );
    },
    [updateSellerOrderStatus],
  );

  const productFiltersActive = Boolean(
    vm.selectedCategoryId || vm.productSort !== 'newest',
  );
  const purchasedFiltersActive = vm.purchasedStatus !== 'all';
  const orderFiltersActive = vm.ordersStatus !== 'all';

  return (
    <SafeAreaView className="flex-1 surface-base" edges={['top']}>
      <FocusAwareStatusBar barStyle="dark-content" />
      <FeedHeader />

      {/* Tạm thời comment title Sản phẩm của tôi ở đầu trang theo yêu cầu */}
      {/* 
      <View className="surface-topbar flex-row items-center px-4 py-3">
        <TouchableOpacity
          className="h-10 w-10 items-center justify-center rounded-full"
          activeOpacity={0.8}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={22} color="#1E293B" />
        </TouchableOpacity>
        <View className="ml-2 flex-1">
          <Text className="text-heading">
            {targetUserId ? 'Sản phẩm' : 'Sản phẩm của tôi'}
          </Text>
          <Text className="mt-0.5 text-caption-secondary">
            {targetUserId
              ? 'Danh sách sản phẩm của người dùng'
              : 'Quản lý mua bán marketplace'}
          </Text>
        </View>
      </View>
      */}

      {!targetUserId && vm.activeTab === 'products' && (
        <View className="mx-4 my-2.5 rounded-2xl bg-white p-3 border border-slate-100 shadow-sm">
          <View className="flex-row items-center">
            <TouchableOpacity
              className="flex-1 flex-row items-center justify-center bg-brand rounded-xl py-3 px-3 shadow-sm active:bg-brand-pressed"
              activeOpacity={0.8}
              onPress={() => navigation.navigate(ROUTES.MARKETPLACE)}
            >
              <Store size={16} color="#FFFFFF" />
              <Text className="ml-2 text-white font-semibold text-caption-primary">
                Chuyển đến thị trường
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View className="flex-row items-center justify-between border-b border-slate-100 bg-white">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator
          persistentScrollbar
          contentContainerClassName="flex-row items-center gap-6 px-4 pb-1"
          className="flex-1"
        >
          {TABS.filter(tab => {
            // When viewing another user's products, keep a marketplace shortcut beside the products tab.
            if (targetUserId) {
              return tab.key === 'products' || tab.key === 'marketplace';
            }
            if (tab.key === 'marketplace') {
              return vm.activeTab === 'purchased';
            }
            return true;
          }).map(tab => {
            const isActive = tab.key === vm.activeTab;
            const tabLabel = targetUserId && tab.key === 'marketplace'
              ? 'Chuyển đến Thị trường'
              : tab.label;
            const tabBadgeCount =
              !targetUserId && tab.key === 'purchased'
                ? orderBadges.purchasedCount
                : !targetUserId && tab.key === 'orders'
                  ? orderBadges.sellerCount
                  : 0;

            return (
              <TouchableOpacity
                key={tab.key}
                className="py-3.5 relative"
                activeOpacity={0.8}
                accessibilityRole="tab"
                accessibilityLabel={
                  tabBadgeCount > 0
                    ? `${tabLabel}, ${tabBadgeCount} chưa đọc`
                    : tabLabel
                }
                accessibilityState={{ selected: isActive }}
                onPress={() => handleTabPress(tab.key)}
              >
                <View className="flex-row items-center">
                  <Text
                    className={`text-body-primary font-semibold ${
                      isActive ? 'text-slate-900 font-bold' : 'text-slate-500'
                    }`}
                  >
                    {tabLabel}
                  </Text>
                  {tabBadgeCount > 0 ? (
                    <View className="ml-1.5 min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1">
                      <Text className="text-[10px] font-bold leading-[16px] text-white">
                        {tabBadgeCount > 99 ? '99+' : tabBadgeCount}
                      </Text>
                    </View>
                  ) : null}
                </View>
                {isActive && (
                  <View className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand rounded-full" />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        {!targetUserId && (
          <TouchableOpacity
            className="mx-4 flex-row items-center bg-brand rounded-full px-3 py-1.5 shadow-sm active:bg-brand-pressed"
            activeOpacity={0.8}
            onPress={handleCreate}
          >
            <Plus size={14} color="#FFFFFF" />
            <Text className="ml-1 text-white font-semibold text-xs">Tạo ra</Text>
          </TouchableOpacity>
        )}
      </View>

      {vm.activeTab === 'products' ? (
        <>
          {/* Tạm thời comment tìm kiếm và bộ lọc ở tab Sản phẩm của tôi theo yêu cầu */}
          {/*
          <View className="gap-3 px-4 py-4">
            <SearchFilterRow
              value={vm.productSearch}
              placeholder="Tìm sản phẩm của tôi..."
              hasActiveFilters={productFiltersActive}
              onChangeText={vm.setProductSearch}
              onToggleFilters={vm.toggleFilters}
            />
            {vm.filtersVisible ? (
              <View className="surface-panel gap-4 px-4 py-4">
                <View>
                  <Text className="mb-2 text-caption-primary">Sắp xếp</Text>
                  <View className="flex-row flex-wrap gap-2">
                    {PRODUCT_SORT_OPTIONS.map(option => (
                      <FilterChip
                        key={option.value}
                        label={option.label}
                        active={option.value === vm.productSort}
                        onPress={() => vm.setProductSort(option.value)}
                      />
                    ))}
                  </View>
                </View>
                <View>
                  <Text className="mb-2 text-caption-primary">Thể loại</Text>
                  <View className="flex-row flex-wrap gap-2">
                    <FilterChip
                      label="Tất cả"
                      active={!vm.selectedCategoryId}
                      onPress={() => vm.setSelectedCategoryId(undefined)}
                    />
                    {vm.categories.map(category => (
                      <FilterChip
                        key={category.id}
                        label={category.label}
                        active={category.id === vm.selectedCategoryId}
                        onPress={() => vm.setSelectedCategoryId(category.id)}
                      />
                    ))}
                  </View>
                </View>
              </View>
            ) : null}
          </View>
          */}
          <FlatList
            data={vm.filteredProducts}
            keyExtractor={item => String(item.id)}
            renderItem={renderProduct}
            numColumns={2}
            columnWrapperStyle={PRODUCT_COLUMNS}
            contentContainerClassName="gap-3 px-4 pb-10"
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              vm.isLoading ? (
                <ActivityIndicator className="py-10" color={APP_BRAND_COLOR} />
              ) : (
                <EmptyPanel
                  title={
                    vm.error
                      ? 'Không tải được sản phẩm'
                      : 'Chưa có sản phẩm của tôi'
                  }
                  description={
                    vm.error ??
                    'Đăng bán sản phẩm đầu tiên hoặc thử thay đổi bộ lọc.'
                  }
                  canRetry={Boolean(vm.error)}
                  onRetry={vm.reload}
                />
              )
            }
          />
        </>
      ) : null}



      {vm.activeTab === 'purchased' ? (
        <>
          {/* Tạm thời comment tìm kiếm và bộ lọc ở tab Đơn hàng theo yêu cầu */}
          {/*
          <View className="gap-3 px-4 py-4">
            <SearchFilterRow
              value={vm.ordersSearch}
              placeholder="Tìm theo mã đơn hoặc shop..."
              hasActiveFilters={orderFiltersActive}
              onChangeText={vm.setOrdersSearch}
              onToggleFilters={vm.toggleFilters}
            />
            {vm.filtersVisible ? (
              <View className="surface-panel gap-4 px-4 py-4">
                <Text className="text-title-primary">Trạng thái đơn</Text>
                <View className="flex-row flex-wrap gap-2">
                  {ORDER_STATUS_OPTIONS.map(option => (
                    <FilterChip
                      key={option.value}
                      label={option.label}
                      active={option.value === vm.ordersStatus}
                      onPress={() => vm.setOrdersStatus(option.value)}
                    />
                  ))}
                </View>
              </View>
            ) : null}
          </View>
          */}
          <FlatList
            data={vm.purchasedItems}
            keyExtractor={item => item.id}
            renderItem={renderOrder}
            numColumns={PURCHASE_COLUMNS}
            columnWrapperStyle={
              PURCHASE_COLUMNS > 1
                ? { gap: 16 }
                : undefined
            }
            contentContainerStyle={{
              gap: 16,
              paddingHorizontal: 16,
              paddingVertical: 16,
              paddingBottom: 40,
            }}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              vm.isOrdersLoading ? (
                <ActivityIndicator className="py-10" color={APP_BRAND_COLOR} />
              ) : (
                <EmptyPanel
                  title={
                    vm.ordersError
                      ? 'Không tải được đơn hàng'
                      : 'Chưa có đơn hàng'
                  }
                  description={
                    vm.ordersError ??
                    'Những sản phẩm bạn đã mua sẽ hiển thị ở đây.'
                  }
                  canRetry={Boolean(vm.ordersError)}
                  onRetry={vm.reload}
                />
              )
            }
          />
        </>
      ) : null}

      {vm.activeTab === 'orders' ? (
        <FlatList
          data={vm.orderItems}
          keyExtractor={item => item.id}
          renderItem={renderSellerOrder}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingVertical: 16,
            paddingBottom: 40,
          }}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            vm.isOrdersLoading ? (
              <ActivityIndicator className="py-10" color={APP_BRAND_COLOR} />
            ) : (
              <EmptyPanel
                title={
                  vm.ordersError
                    ? 'Không tải được đơn bán'
                    : 'Chưa có yêu cầu mua'
                }
                description={
                  vm.ordersError ??
                  'Yêu cầu mua từ khách hàng sẽ hiển thị ở đây.'
                }
                canRetry={Boolean(vm.ordersError)}
                onRetry={vm.reload}
              />
            )
          }
        />
      ) : null}

      <OrderDetailModal
        order={selectedSellerOrder}
        isSeller
        navigation={navigation}
        onUpdateStatus={handleUpdateSellerOrderStatus}
        onClose={() => setSelectedSellerOrder(null)}
      />
    </SafeAreaView>
  );
}

export default MyProductsScreen;

const styles = StyleSheet.create({
  orderDetailSheet: {
    maxHeight: ORDER_DETAIL_MAX_HEIGHT,
  },
  orderDetailBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.42)',
  },
  purchasedDetailSheet: {
    maxHeight: Dimensions.get('window').height * 0.94,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  purchasedDetailHeader: {
    minHeight: 62,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  purchasedDetailHeaderText: {
    flex: 1,
  },
  purchasedDetailTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  purchasedDetailCode: {
    marginTop: 2,
    fontSize: 12,
    color: '#64748b',
  },
  purchasedDetailClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  purchasedDetailContent: {
    paddingBottom: 28,
  },
  orderInfoBanner: {
    paddingHorizontal: 18,
    paddingVertical: 18,
    backgroundColor: '#dbeafe',
    borderBottomWidth: 1,
    borderBottomColor: '#bfdbfe',
  },
  orderInfoText: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
    color: '#0ea5e9',
  },
  orderSectionTitle: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 8,
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
    backgroundColor: '#f8fafc',
  },
  shippingAddressCard: {
    marginHorizontal: 14,
    marginVertical: 12,
    padding: 14,
    minHeight: 112,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  shippingName: {
    marginBottom: 3,
    fontSize: 16,
    fontWeight: '800',
    color: '#1e293b',
  },
  shippingText: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 18,
    color: '#475569',
  },
  shippingMissing: {
    fontSize: 13,
    color: '#64748b',
  },
  orderProductsSection: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingTop: 18,
    borderTopWidth: 10,
    borderTopColor: '#f8fafc',
  },
  orderProductRow: {
    minHeight: 104,
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 16,
  },
  orderProductImageWrap: {
    width: 88,
    height: 88,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#f1f5f9',
  },
  orderProductImage: {
    width: '100%',
    height: '100%',
  },
  orderProductPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderProductPriceBadge: {
    position: 'absolute',
    left: 4,
    bottom: 4,
    maxWidth: 80,
    paddingHorizontal: 5,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: 'rgba(51, 65, 85, 0.9)',
  },
  orderProductPriceText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ffffff',
  },
  orderProductCopy: {
    flex: 1,
    alignSelf: 'stretch',
    paddingLeft: 12,
    paddingTop: 8,
  },
  orderProductName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  orderProductQuantity: {
    marginTop: 8,
    fontSize: 13,
    color: '#64748b',
  },
  orderSubtotal: {
    alignItems: 'flex-end',
    paddingVertical: 18,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
  },
  orderSubtotalLabel: {
    fontSize: 16,
    color: '#475569',
  },
  orderSubtotalValue: {
    marginTop: 4,
    fontSize: 26,
    fontWeight: '400',
    color: '#334155',
  },
  refundForm: {
    marginTop: 14,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
  },
  refundLabel: {
    marginBottom: 7,
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  refundInput: {
    minHeight: 86,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    fontSize: 14,
    color: '#0f172a',
  },
  refundFormActions: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  refundCancelButton: {
    minWidth: 74,
    height: 38,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refundCancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  refundSubmitButton: {
    minWidth: 112,
    height: 38,
    borderRadius: 6,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refundSubmitText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  refundPendingBanner: {
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 6,
    backgroundColor: '#dbeafe',
  },
  refundPendingText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0284c7',
  },
  orderDetailActions: {
    paddingTop: 18,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  invoiceButton: {
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#38bdf8',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refundButton: {
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#4ade80',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderActionText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
  },
});

// Description: Renders the user's marketplace products, purchases, orders, and nearby shortcut.
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
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
  useFocusEffect,
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Download,
  Eye,
  MessageSquare,
  Plus,
  RotateCw,
  Search,
  ShoppingBag,
  ShoppingCart,
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
import { createProductRepository } from '../../infrastructure/repositories/ApiProductRepository';
import { useSyncedCartCount } from '../../../shared-kernel/application/state/cartCountSync';

type MyProductsNav = NativeStackNavigationProp<RootStackParamList>;
type MyProductsRoute = RouteProp<RootStackParamList, typeof ROUTES.MY_PRODUCTS>;

const PRODUCT_COLUMNS = { justifyContent: 'space-between' } as const;
const ORDER_DETAIL_MAX_HEIGHT = Dimensions.get('window').height * 0.82;
const productRepository = createProductRepository();

const TABS: Array<{ key: MyProductsTab; label: string }> = [
  { key: 'products', label: 'Sản phẩm của tôi' },
  { key: 'orders', label: 'Đơn hàng' },
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
            ? 'border-blue-600 bg-blue-50'
            : 'border-slate-200 bg-white'
        }`}
        activeOpacity={0.8}
        hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
        onPress={onToggleFilters}
      >
        <SlidersHorizontal size={20} color="#0000FF" />
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
        active ? 'border-blue-600 bg-blue-50' : 'border-slate-200 bg-white'
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
        <ShoppingBag size={30} color="#0000FF" />
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
          <RotateCw size={16} color="#0000FF" />
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
        <View className="rounded-full bg-blue-50 px-2.5 py-1">
          <Text className="text-xs font-bold text-blue-600">
            {item.statusLabel}
          </Text>
        </View>
      </View>
      <View className="mt-4 flex-row items-center justify-between border-t border-slate-100 pt-3" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text className="text-xs text-slate-400">{item.date}</Text>
        <Text className="text-sm font-black text-blue-600">{item.total}</Text>
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
                <View className="mt-4 gap-3 bg-blue-50/40 border border-blue-100/50 rounded-2xl p-4">
                  <Text className="text-xs font-extrabold text-blue-800 uppercase tracking-wide">Khách hàng: {order.buyerName}</Text>
                  <TouchableOpacity
                    className="flex-row items-center justify-center bg-blue-600 rounded-xl py-2.5 px-4 shadow-sm"
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
                    <ActivityIndicator size="small" color="#0000FF" />
                  ) : (
                    <View className="flex-row flex-wrap gap-2" style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                      {nextStatuses.map(option => (
                        <TouchableOpacity
                          key={option.value}
                          className="bg-blue-50 border border-blue-200 rounded-full px-3 py-1.5 mr-2 mb-2"
                          activeOpacity={0.8}
                          onPress={() => handleUpdateStatus(option.value)}
                        >
                          <Text className="text-xs font-bold text-blue-600">{option.label}</Text>
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
    .logo { font-size: 24px; font-weight: 800; color: #2563eb; }
    .title { font-size: 18px; font-weight: 700; color: #475569; }
    .section-title { font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }
    .info-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
    .divider { height: 1px; background-color: #e2e8f0; margin: 20px 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 15px; }
    th { text-align: left; font-size: 12px; font-weight: 700; color: #64748b; padding-bottom: 8px; border-bottom: 1px solid #e2e8f0; }
    td { padding: 12px 0; font-size: 14px; border-bottom: 1px solid #f1f5f9; }
    .total-row { display: flex; justify-content: space-between; align-items: center; margin-top: 25px; font-size: 18px; font-weight: 700; color: #2563eb; }
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
        <span style="font-weight: 600; color: #2563eb;">${order.statusLabel}</span>
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
  onDelete,
  onViewDetail,
}: {
  item: OrdersItem;
  onDelete: (id: string) => void;
  onViewDetail: (item: OrdersItem) => void;
}) {
  const groups = React.useMemo(() => {
    const map: Record<string, OrderLineItem[]> = {};
    const lines = item.lines.length ? item.lines : [
      {
        id: item.id,
        product: item.product,
        total: item.total,
        status: item.status,
        statusLabel: item.statusLabel,
        shop: item.shop,
      } as OrderLineItem
    ];
    lines.forEach(line => {
      const shopName = line.shop || item.shop || 'Shop';
      if (!map[shopName]) map[shopName] = [];
      map[shopName].push(line);
    });
    return map;
  }, [item]);

  const handleDelete = () => {
    Alert.alert(
      'Xác nhận xóa',
      'Bạn có chắc chắn muốn xóa đơn mua hàng này không?',
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Xóa', style: 'destructive', onPress: () => onDelete(item.id) },
      ]
    );
  };

  return (
    <View className="mb-4 p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-slate-100 pb-3 mb-3" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View>
          <Text className="text-sm font-bold text-slate-800">{item.code}</Text>
          <Text className="text-xs text-slate-400 mt-0.5">{item.date}</Text>
        </View>
        <View className="rounded-full bg-blue-50 px-2.5 py-1">
          <Text className="text-xs font-bold text-blue-600">
            {item.statusLabel}
          </Text>
        </View>
      </View>

      {/* Shop groups for invoice separation */}
      <View className="gap-3">
        {Object.entries(groups).map(([shopName, lines]) => {
          return (
            <View key={shopName} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
              <View className="flex-row items-center justify-between mb-2" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text className="text-xs font-extrabold text-slate-700 uppercase tracking-wide flex-1 mr-2" numberOfLines={1}>🏬 Shop: {shopName}</Text>
                <TouchableOpacity
                  className="flex-row items-center bg-blue-50 border border-blue-200 rounded-lg px-2 py-1"
                  style={{ flexDirection: 'row', alignItems: 'center' }}
                  activeOpacity={0.8}
                  onPress={() => downloadInvoiceFile(item, shopName, lines)}
                >
                  <Download size={12} color="#2563EB" />
                  <Text className="ml-1 text-[10px] font-bold text-blue-600">Tải hóa đơn</Text>
                </TouchableOpacity>
              </View>
              {lines.map((line, idx) => (
                <View key={line.id || idx} className="flex-row justify-between py-1" style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text className="text-xs text-slate-600 flex-1 pr-3" numberOfLines={1}>• {line.product}</Text>
                  <Text className="text-xs font-bold text-slate-800">{line.total}</Text>
                </View>
              ))}
            </View>
          );
        })}
      </View>

      {/* Total and Actions */}
      <View className="flex-row items-center justify-between border-t border-slate-100 pt-3 mt-3" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View>
          <Text className="text-xs text-slate-400">Tổng cộng:</Text>
          <Text className="text-sm font-black text-blue-600 mt-0.5">{item.total}</Text>
        </View>
        <View className="flex-row gap-2" style={{ flexDirection: 'row' }}>
          <TouchableOpacity
            className="flex-row items-center justify-center bg-slate-100 border border-slate-200 h-9 px-3 rounded-xl"
            style={{ flexDirection: 'row', alignItems: 'center', marginRight: 8 }}
            activeOpacity={0.85}
            onPress={() => onViewDetail(item)}
          >
            <Eye size={14} color="#475569" />
            <Text className="ml-1 text-xs font-semibold text-slate-600">Chi tiết</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-row items-center justify-center bg-red-50 border border-red-200 h-9 px-3 rounded-xl"
            style={{ flexDirection: 'row', alignItems: 'center' }}
            activeOpacity={0.8}
            onPress={handleDelete}
          >
            <Trash2 size={14} color="#EF4444" />
            <Text className="ml-1 text-xs font-bold text-red-600">Xóa đơn</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function MyProductsScreen() {
  const navigation = useNavigation<MyProductsNav>();
  const route = useRoute<MyProductsRoute>();
  const targetUserIdRaw = route.params?.userId;
  const targetUserId = targetUserIdRaw ? Number(targetUserIdRaw) : undefined;
  const vm = useMyProductsViewModel(targetUserId);
  const { setActiveTab } = vm;
  const { cartCount, syncCartCount } = useSyncedCartCount(0);
  const [selectedOrder, setSelectedOrder] = useState<OrdersItem | null>(null);

  useEffect(() => {
    if (route.params?.initialTab) {
      setActiveTab(route.params.initialTab);
    }
  }, [route.params?.initialTab, setActiveTab]);

  const handleCreate = useCallback(() => {
    navigation.navigate(ROUTES.CREATE_PRODUCT);
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      productRepository
        .getCartCount()
        .then(count => {
          if (!cancelled) {
            syncCartCount(count);
          }
        })
        .catch(error => {
          console.warn('[MyProducts] getCartCount error:', error);
        });

      return () => {
        cancelled = true;
      };
    }, [syncCartCount]),
  );

  const handleTabPress = useCallback(
    (tab: MyProductsTab) => {
      if (tab === 'marketplace') {
        navigation.navigate(ROUTES.MARKETPLACE);
        return;
      }
      setActiveTab(tab);
    },
    [navigation, setActiveTab],
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

  const renderProduct = useCallback(
    ({ item }: ListRenderItemInfo<ProductItem>) => (
      <View className="w-[48%]">
        <ProductPostCard compact product={item} onPress={handleProductPress} />
      </View>
    ),
    [handleProductPress],
  );

  const renderOrder = useCallback(
    ({ item }: ListRenderItemInfo<OrdersItem>) => (
      <OrderCard
        item={item}
        isSeller={vm.activeTab === 'orders'}
        onViewDetail={setSelectedOrder}
      />
    ),
    [vm.activeTab],
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

      {!targetUserId && (
        <View className="mx-4 my-2.5 rounded-2xl bg-white p-3 border border-slate-100 shadow-sm">
          <View className="flex-row items-center gap-3">
            <TouchableOpacity
              className="flex-1 flex-row items-center justify-center bg-blue-600 rounded-xl py-3 px-3 shadow-sm active:bg-blue-700"
              activeOpacity={0.8}
              onPress={() => navigation.navigate(ROUTES.MARKETPLACE)}
            >
              <Store size={16} color="#FFFFFF" />
              <Text className="ml-2 text-white font-semibold text-caption-primary">
                Chuyển đến thị trường
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="relative flex-1 flex-row items-center justify-center bg-orange-500 rounded-xl py-3 px-3 shadow-sm active:bg-orange-600"
              style={{ backgroundColor: '#F97316' }}
              activeOpacity={0.8}
              onPress={() => navigation.navigate(ROUTES.CART)}
            >
              <ShoppingCart size={16} color="#FFFFFF" />
              {cartCount > 0 ? (
                <View className="absolute right-2 top-1 h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1">
                  <Text className="text-[10px] font-extrabold text-white">
                    {cartCount > 99 ? '99+' : cartCount}
                  </Text>
                </View>
              ) : null}
              <Text className="ml-2 text-white font-semibold text-caption-primary">
                Giỏ hàng
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View className="flex-row items-center justify-between border-b border-slate-100 bg-white">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="flex-row items-center gap-6 px-4"
          className="flex-1"
        >
          {TABS.filter(tab => {
            // Khi xem sản phẩm của người khác → chỉ hiện tab 'products'
            if (targetUserId) {
              return tab.key === 'products';
            }
            return true;
          }).map(tab => {
            const isActive = tab.key === vm.activeTab;

            return (
              <TouchableOpacity
                key={tab.key}
                className="py-3.5 relative"
                activeOpacity={0.8}
                onPress={() => handleTabPress(tab.key)}
              >
                <Text
                  className={`text-body-primary font-semibold ${
                    isActive ? 'text-slate-900 font-bold' : 'text-slate-500'
                  }`}
                >
                  {tab.label}
                </Text>
                {isActive && (
                  <View className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        {!targetUserId && (
          <TouchableOpacity
            className="mx-4 flex-row items-center bg-blue-600 rounded-full px-3 py-1.5 shadow-sm active:bg-blue-700"
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
                <ActivityIndicator className="py-10" color="#0000FF" />
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



      {vm.activeTab === 'orders' ? (
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
            data={vm.orderItems}
            keyExtractor={item => item.id}
            renderItem={renderOrder}
            contentContainerClassName="px-4 pb-10"
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              vm.isOrdersLoading ? (
                <ActivityIndicator className="py-10" color="#0000FF" />
              ) : (
                <EmptyPanel
                  title={
                    vm.ordersError
                      ? 'Không tải được đơn hàng'
                      : 'Chưa có đơn hàng'
                  }
                  description={
                    vm.ordersError ??
                    'Đơn từ người mua sản phẩm của bạn sẽ hiển thị ở đây.'
                  }
                  canRetry={Boolean(vm.ordersError)}
                  onRetry={vm.reload}
                />
              )
            }
          />
        </>
      ) : null}
      <OrderDetailModal
        order={selectedOrder}
        isSeller={vm.activeTab === 'orders'}
        onUpdateStatus={vm.updateOrderStatus}
        onClose={() => setSelectedOrder(null)}
        navigation={navigation}
      />
    </SafeAreaView>
  );
}

export default MyProductsScreen;

const styles = StyleSheet.create({
  orderDetailSheet: {
    maxHeight: ORDER_DETAIL_MAX_HEIGHT,
  },
});

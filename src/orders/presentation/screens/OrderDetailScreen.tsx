// Description: Renders purchased marketplace order details as a dedicated native screen.
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Download, Package, RotateCw } from 'lucide-react-native';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import { createCheckoutRepository } from '../../../checkout/infrastructure/repositories/ApiCheckoutRepository';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import { createOrdersRepository } from '../../infrastructure/repositories/ApiOrdersRepository';
import type {
  OrderLineItem,
  OrderShippingAddress,
  OrdersItem,
} from '../../domain/types/orders.types';

type OrderDetailRoute = RouteProp<RootStackParamList, typeof ROUTES.ORDER_DETAIL>;
type OrderDetailNavigation = NativeStackNavigationProp<RootStackParamList>;

const checkoutRepository = createCheckoutRepository();
const ordersRepository = createOrdersRepository();

function getOrderLines(order: OrdersItem): OrderLineItem[] {
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

function mapSavedAddress(address: {
  name: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  zip: string;
}): OrderShippingAddress {
  return {
    name: address.name,
    phone: address.phone,
    address: address.address,
    city: address.city,
    state: '',
    country: address.country,
    zip: address.zip,
  };
}

async function downloadInvoice(order: OrdersItem, lines: OrderLineItem[]) {
  try {
    const fileName = `hoa_don_${order.code.replace(/^#/, '')}.html`;
    const directory = Platform.OS === 'android'
      ? ReactNativeBlobUtil.fs.dirs.DownloadDir
      : ReactNativeBlobUtil.fs.dirs.DocumentDir;
    const path = `${directory}/${fileName}`;
    const rows = lines
      .map(line => `<tr><td>${line.product}</td><td>${line.quantity || 1}</td><td>${formatVnd(line.price)}</td></tr>`)
      .join('');
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Hoa don ${order.code}</title><style>body{font-family:Arial,sans-serif;padding:28px;color:#1e293b}table{width:100%;border-collapse:collapse}th,td{padding:10px;border-bottom:1px solid #e2e8f0;text-align:left}.total{text-align:right;font-size:24px;margin-top:24px}</style></head><body><h1>VNSEEA</h1><h2>Hoa don ${order.code}</h2><table><thead><tr><th>San pham</th><th>So luong</th><th>Gia</th></tr></thead><tbody>${rows}</tbody></table><div class="total">${formatVnd(order.amount, true)}</div></body></html>`;

    await ReactNativeBlobUtil.fs.writeFile(path, html, 'utf8');
    if (Platform.OS === 'android') {
      await ReactNativeBlobUtil.android.actionViewIntent(path, 'text/html');
    }
    Alert.alert('Đã tải hóa đơn', `Hóa đơn đã được lưu: ${fileName}`);
  } catch {
    Alert.alert('Không thể tải hóa đơn', 'Vui lòng thử lại sau.');
  }
}

export default function OrderDetailScreen() {
  const navigation = useNavigation<OrderDetailNavigation>();
  const route = useRoute<OrderDetailRoute>();
  const order = route.params.order;
  const lines = useMemo(() => getOrderLines(order), [order]);
  const subtotal = order.amount || lines.reduce((sum, line) => sum + (line.price || 0), 0);
  const [address, setAddress] = useState<OrderShippingAddress | undefined>(order.shippingAddress);
  const [isLoadingAddress, setIsLoadingAddress] = useState(!order.shippingAddress);
  const [refundFormVisible, setRefundFormVisible] = useState(false);
  const [refundMessage, setRefundMessage] = useState('');
  const [requestingRefund, setRequestingRefund] = useState(false);
  const [refundSubmitted, setRefundSubmitted] = useState(Boolean(order.refundRequested));

  useEffect(() => {
    if (order.shippingAddress) {
      setAddress(order.shippingAddress);
      setIsLoadingAddress(false);
      return;
    }

    let active = true;
    checkoutRepository
      .getAddresses()
      .then(addresses => {
        if (!active) return;
        const selected = order.addressId
          ? addresses.find(item => String(item.id) === String(order.addressId))
          : addresses.length === 1
            ? addresses[0]
            : undefined;
        setAddress(selected ? mapSavedAddress(selected) : undefined);
      })
      .catch(() => {
        if (active) setAddress(undefined);
      })
      .finally(() => {
        if (active) setIsLoadingAddress(false);
      });

    return () => {
      active = false;
    };
  }, [order.addressId, order.shippingAddress]);

  const submitRefund = async () => {
    const message = refundMessage.trim();
    if (!message) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập lý do yêu cầu hoàn tiền.');
      return;
    }

    setRequestingRefund(true);
    try {
      await ordersRepository.requestRefund(order.code, message);
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
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <FocusAwareStatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} activeOpacity={0.8} onPress={() => navigation.goBack()}>
          <ArrowLeft size={21} color="#334155" />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>Chi tiết đơn hàng</Text>
          <Text style={styles.headerCode}>{order.code}</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator persistentScrollbar contentContainerStyle={styles.content}>
        {order.orderFlow === 'request' ? (
          <View style={styles.infoBanner}>
            <Text style={styles.infoText}>
              Đây là yêu cầu mua. Bạn và người bán tự thỏa thuận phương thức thanh toán; tồn kho chỉ được giữ sau khi người bán chấp nhận.
            </Text>
          </View>
        ) : order.status !== 'delivered' ? (
          <>
            <View style={styles.infoBanner}>
              <Text style={styles.infoText}>
                Nếu trạng thái đơn đặt hàng không được đặt thành đã giao trong vòng 60 ngày kể từ ngày đặt hàng, nó sẽ tự động được gửi đến "Đã giao".
              </Text>
            </View>
            <View style={styles.infoBanner}>
              <Text style={styles.infoText}>
                Nếu đơn đặt hàng không thực sự được giao, người mua có thể yêu cầu hoàn lại tiền.
              </Text>
            </View>
          </>
        ) : null}

        <Text style={styles.sectionTitle}>Địa chỉ giao hàng</Text>
        <View style={styles.addressCard}>
          {isLoadingAddress ? (
            <ActivityIndicator color="#0000ff" />
          ) : address ? (
            <>
              <Text style={styles.addressName}>{address.name || 'Người nhận'}</Text>
              {address.phone ? <Text style={styles.addressText}>{address.phone}</Text> : null}
              {address.address ? <Text style={styles.addressText}>{address.address}</Text> : null}
              {[address.city, address.state, address.country]
                .filter(Boolean)
                .map((value, index) => (
                  <Text key={`${value}-${index}`} style={styles.addressText}>{value}</Text>
                ))}
              {address.zip ? <Text style={styles.addressText}>{address.zip}</Text> : null}
            </>
          ) : (
            <Text style={styles.addressMissing}>Không tìm thấy địa chỉ đã dùng cho đơn hàng này.</Text>
          )}
        </View>

        <View style={styles.productsSection}>
          {lines.map(line => (
            <View key={line.id} style={styles.productRow}>
              <View style={styles.imageWrap}>
                {line.image ? (
                  <Image source={{ uri: line.image }} style={styles.productImage} resizeMode="cover" />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Package size={28} color="#94a3b8" />
                  </View>
                )}
                <View style={styles.priceBadge}>
                  <Text style={styles.priceText}>{formatVnd(line.price)}</Text>
                </View>
              </View>
              <View style={styles.productCopy}>
                <Text style={styles.productName} numberOfLines={3}>{line.product}</Text>
                <Text style={styles.quantity}>Qty {line.quantity || 1}</Text>
              </View>
            </View>
          ))}

          <View style={styles.subtotal}>
            <Text style={styles.subtotalLabel}>Thanh toán Tổng phụ</Text>
            <Text style={styles.subtotalValue}>{formatVnd(subtotal, true)}</Text>
          </View>

          {order.orderFlow === 'prepaid' && refundFormVisible ? (
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
                <TouchableOpacity style={styles.cancelButton} activeOpacity={0.8} onPress={() => setRefundFormVisible(false)}>
                  <Text style={styles.cancelText}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.submitButton} activeOpacity={0.8} disabled={requestingRefund} onPress={submitRefund}>
                  {requestingRefund ? <ActivityIndicator size="small" color="#ffffff" /> : <Text style={styles.submitText}>Gửi yêu cầu</Text>}
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          {order.orderFlow === 'prepaid' && refundSubmitted ? (
            <View style={styles.pendingBanner}>
              <Text style={styles.pendingText}>Yêu cầu hoàn tiền của bạn đang chờ duyệt.</Text>
            </View>
          ) : null}

          {order.orderFlow === 'prepaid' ? (
          <View style={styles.actions}>
            <TouchableOpacity style={styles.invoiceButton} activeOpacity={0.8} onPress={() => downloadInvoice(order, lines)}>
              <Download size={15} color="#ffffff" />
              <Text style={styles.actionText}>Tải xuống hóa đơn</Text>
            </TouchableOpacity>
            {!refundSubmitted && order.status !== 'canceled' ? (
              <TouchableOpacity style={styles.refundButton} activeOpacity={0.8} onPress={() => setRefundFormVisible(true)}>
                <RotateCw size={15} color="#ffffff" />
                <Text style={styles.actionText}>Yêu cầu hoàn lại</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#eef2ff' },
  header: { minHeight: 62, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  backButton: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9' },
  headerCopy: { flex: 1, marginLeft: 12 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a' },
  headerCode: { marginTop: 2, fontSize: 12, color: '#64748b' },
  content: { paddingBottom: 32 },
  infoBanner: { paddingHorizontal: 18, paddingVertical: 18, backgroundColor: '#dbeafe', borderBottomWidth: 1, borderBottomColor: '#bfdbfe' },
  infoText: { fontSize: 13, lineHeight: 20, fontWeight: '700', color: '#0ea5e9' },
  sectionTitle: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 8, fontSize: 15, fontWeight: '700', color: '#334155' },
  addressCard: { marginHorizontal: 14, marginBottom: 12, padding: 14, minHeight: 112, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#ffffff', justifyContent: 'center' },
  addressName: { marginBottom: 3, fontSize: 16, fontWeight: '800', color: '#1e293b' },
  addressText: { marginTop: 2, fontSize: 13, lineHeight: 18, color: '#475569' },
  addressMissing: { fontSize: 13, color: '#64748b' },
  productsSection: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 24, borderTopWidth: 10, borderTopColor: '#e0e7ff', backgroundColor: '#ffffff' },
  productRow: { minHeight: 104, flexDirection: 'row', alignItems: 'center', paddingBottom: 16 },
  imageWrap: { width: 88, height: 88, borderRadius: 6, overflow: 'hidden', backgroundColor: '#f1f5f9' },
  productImage: { width: '100%', height: '100%' },
  imagePlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  priceBadge: { position: 'absolute', left: 4, bottom: 4, maxWidth: 80, paddingHorizontal: 5, paddingVertical: 3, borderRadius: 4, backgroundColor: 'rgba(51, 65, 85, 0.9)' },
  priceText: { fontSize: 10, fontWeight: '800', color: '#ffffff' },
  productCopy: { flex: 1, alignSelf: 'stretch', paddingLeft: 12, paddingTop: 8 },
  productName: { fontSize: 14, fontWeight: '600', color: '#334155' },
  quantity: { marginTop: 8, fontSize: 13, color: '#64748b' },
  subtotal: { alignItems: 'flex-end', paddingVertical: 18, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#e2e8f0' },
  subtotalLabel: { fontSize: 16, color: '#475569' },
  subtotalValue: { marginTop: 4, fontSize: 26, color: '#334155' },
  refundForm: { marginTop: 14, padding: 12, borderRadius: 8, backgroundColor: '#f8fafc' },
  refundLabel: { marginBottom: 7, fontSize: 13, fontWeight: '700', color: '#334155' },
  refundInput: { minHeight: 86, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, backgroundColor: '#ffffff', fontSize: 14, color: '#0f172a' },
  refundFormActions: { marginTop: 10, flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  cancelButton: { minWidth: 74, height: 38, borderRadius: 6, borderWidth: 1, borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontSize: 13, fontWeight: '700', color: '#475569' },
  submitButton: { minWidth: 112, height: 38, borderRadius: 6, backgroundColor: '#22c55e', alignItems: 'center', justifyContent: 'center' },
  submitText: { fontSize: 13, fontWeight: '800', color: '#ffffff' },
  pendingBanner: { marginTop: 14, paddingHorizontal: 12, paddingVertical: 11, borderRadius: 6, backgroundColor: '#dbeafe' },
  pendingText: { fontSize: 13, fontWeight: '700', color: '#0284c7' },
  actions: { paddingTop: 18, flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  invoiceButton: { minHeight: 40, paddingHorizontal: 12, borderRadius: 6, backgroundColor: '#38bdf8', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  refundButton: { minHeight: 40, paddingHorizontal: 12, borderRadius: 6, backgroundColor: '#4ade80', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  actionText: { marginLeft: 6, fontSize: 12, fontWeight: '800', color: '#ffffff' },
});

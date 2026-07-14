// Description: Renders the My Balance screen with custom card layout, curved wave send modal, real camera QR code scanner using react-native-camera-kit, dynamic QR transfer modal, and social integrations, matching the user's mockup.
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  PermissionsAndroid,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  CheckCheck,
  QrCode,
  RefreshCw,
  Search,
  Send,
  X,
} from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';
import { Camera } from 'react-native-camera-kit';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEarningsViewModel } from '../../application/view-models/useEarningsViewModel';
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';
import { apiBridge } from '../../../shared-kernel/infrastructure/api/apiBridge';
import { apiConfig } from '../../../shared-kernel/infrastructure/config/env';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';
import type { RootStackParamList } from '../../../navigation/types';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import { createWalletRepository } from '../../infrastructure/repositories/ApiWalletRepository';
import {
  encodePointsQrPayload,
  parsePointsQrPayload,
  parsePositivePoints,
} from '../../domain/services/pointsTransfer';
import { pendingPointsTransferRequestStorage } from '../../infrastructure/storage/pointsTransferRequestStorage';
import { SafeAreaFeedHeader } from '../../../feed/presentation/components/SafeAreaFeedHeader';

type BalanceNav = NativeStackNavigationProp<RootStackParamList>;

interface SearchUserItem {
  id: number;
  name: string;
  username: string;
  avatar: string;
  email?: string;
}

type RecipientSearchResponse = {
  api_status: number | string;
  items?: unknown[];
  users?: unknown[];
  data?: unknown[] | { items?: unknown[]; users?: unknown[] };
};

type ParsedTransferQr = {
  userId: string;
  username: string;
  amount: string;
};

const walletRepository = createWalletRepository();

const BALANCE_COPY = {
  vi: {
    header: 'Số dư của tôi',
    balanceLabel: 'Số dư VNSEEA',
    sendBtn: 'Gửi VNSEEA',
    qrBtn: 'Mã QR nhận VNSEEA',
    transactionsTitle: 'Lịch sử giao dịch',
    dateLabel: 'Ngày giao dịch',
    amountLabel: 'Số VNSEEA',
    loading: 'Đang tải...',
    errorOccurred: 'Đã xảy ra lỗi',
    retry: 'Thử lại',
    sendModalTitle: 'Gửi VNSEEA',
    infoBoxText: 'Bạn có thể chuyển khoản VNSEEA trực tiếp đến ví của người dùng khác một cách nhanh chóng.',
    amountInputLabel: 'Số lượng VNSEEA',
    recipientLabel: 'Người nhận',
    scanQrBtn: 'Quét mã QR',
    searchPlaceholder: 'Tìm theo tên tài khoản hoặc email...',
    confirmSend: 'Xác nhận chuyển',
    cancel: 'Hủy bỏ',
    qrModalTitle: 'Mã QR nhận VNSEEA',
    qrAmountLabel: 'Số VNSEEA cần nhận (tùy chọn)',
    qrAmountHint: 'Để trống nếu muốn người gửi tự nhập số tiền.',
    qrDesc: 'Đưa mã QR này cho người gửi quét để thực hiện chuyển VNSEEA đến ví của bạn',
    successSend: 'Chuyển VNSEEA thành công!',
    insufficientBalance: 'Số dư ví không đủ để thực hiện giao dịch!',
    invalidAmount: 'Số lượng VNSEEA chuyển không hợp lệ!',
    selectRecipient: 'Vui lòng chọn người nhận tiền!',
    cameraPermissionTitle: 'Quyền sử dụng Camera',
    cameraPermissionDesc: 'Ứng dụng cần quyền truy cập Camera để quét mã QR chuyển tiền.',
    scannerTitle: 'Quét mã QR nhận VNSEEA',
    userNotFound: 'Không tìm thấy tài khoản người dùng tương ứng!',
  },
  en: {
    header: 'My Balance',
    balanceLabel: 'VNSEEA Balance',
    sendBtn: 'Send VNSEEA',
    qrBtn: 'Receive VNSEEA QR Code',
    transactionsTitle: 'Transactions',
    dateLabel: 'Date',
    amountLabel: 'Amount',
    loading: 'Loading...',
    errorOccurred: 'An error occurred',
    retry: 'Retry',
    sendModalTitle: 'Send VNSEEA',
    infoBoxText: 'You can transfer VNSEEA directly to another user\'s wallet instantly.',
    amountInputLabel: 'VNSEEA Amount',
    recipientLabel: 'Send to',
    scanQrBtn: 'Scan QR',
    searchPlaceholder: 'Search by username or email',
    confirmSend: 'Continue',
    cancel: 'Cancel',
    qrModalTitle: 'VNSEEA Receive QR',
    qrAmountLabel: 'VNSEEA Amount (optional)',
    qrAmountHint: 'Leave blank if you want the sender to input the amount.',
    qrDesc: 'Show this QR code to the sender to transfer VNSEEA to your wallet',
    successSend: 'VNSEEA sent successfully!',
    insufficientBalance: 'Insufficient balance!',
    invalidAmount: 'Invalid amount!',
    selectRecipient: 'Please select a recipient!',
    cameraPermissionTitle: 'Camera Permission',
    cameraPermissionDesc: 'The app needs Camera permission to scan transaction QR codes.',
    scannerTitle: 'Scan VNSEEA QR Code',
    userNotFound: 'User not found!',
  },
};

function formatNumber(value: number) {
  return Math.round(value).toLocaleString('vi-VN');
}

function asRecipientArray(response: RecipientSearchResponse | null | undefined) {
  if (!response) return [];
  if (Array.isArray(response.items)) return response.items;
  if (Array.isArray(response.users)) return response.users;
  if (Array.isArray(response.data)) return response.data;
  if (response.data && typeof response.data === 'object') {
    if (Array.isArray(response.data.items)) return response.data.items;
    if (Array.isArray(response.data.users)) return response.data.users;
  }
  return [];
}

function mapRecipient(item: unknown): SearchUserItem {
  const raw = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
  const firstName = String(raw.first_name || '').trim();
  const lastName = String(raw.last_name || '').trim();
  const fallbackName = `${firstName} ${lastName}`.trim();
  const username = String(raw.username || raw.user_name || '').trim();

  return {
    id: Number(raw.id || raw.user_id || raw.uid || 0),
    name: String(raw.name || fallbackName || username || ''),
    username,
    avatar: String(raw.avatar || raw.avatar_url || raw.profile_picture || ''),
    email: raw.email ? String(raw.email) : undefined,
  };
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function stripWrappingQuotes(value: string) {
  return value.trim().replace(/^[\"'`]+|[\"'`]+$/g, '').trim();
}

function normalizeRecipientQuery(value: string) {
  const clean = safeDecode(stripWrappingQuotes(value)).trim();
  return clean.startsWith('@') ? clean.substring(1).trim() : clean;
}

function extractProfileUsernameFromUrl(value: string) {
  const cleanUrl = stripWrappingQuotes(value).split('#')[0].trim();
  if (!/^https?:\/\//i.test(cleanUrl)) return '';

  const pathOnly = cleanUrl.split('?')[0].replace(/\/+$/, '');
  const urlParts = pathOnly.split('/').filter(Boolean);
  const rawLastPart = safeDecode(urlParts[urlParts.length - 1] || '').trim();

  if (!rawLastPart) return '';
  
  // Ignore system paths
  const systemPaths = new Set([
    'requests.php',
    'index.php',
    'wallet',
    'marketplace',
    'messages',
    'settings',
    'admin-cp',
    'posts',
    'funding',
    'offers',
    'create-product',
    'welcome',
    'register',
    'login',
  ]);
  
  const lastPartLower = rawLastPart.toLowerCase();
  if (systemPaths.has(lastPartLower)) return '';
  
  // If it starts with @, strip @
  return rawLastPart.startsWith('@') 
    ? normalizeRecipientQuery(rawLastPart)
    : rawLastPart;
}

function readQrCodeValue(event: any) {
  const nativeEvent = event?.nativeEvent || event || {};
  const value = nativeEvent.codeStringValue || nativeEvent.value || nativeEvent.data || nativeEvent.code || '';
  return stripWrappingQuotes(String(value || ''));
}

function parseQueryParams(query: string, parsed: ParsedTransferQr) {
  query
    .split('&')
    .map(part => part.trim())
    .filter(Boolean)
    .forEach(pair => {
      const separatorIndex = pair.indexOf('=');
      const key = safeDecode(separatorIndex >= 0 ? pair.slice(0, separatorIndex) : pair).toLowerCase();
      const value = safeDecode(separatorIndex >= 0 ? pair.slice(separatorIndex + 1) : '').trim();

      if (key === 'user_id' || key === 'userid' || key === 'uid' || key === 'id' || key === 'to') {
        if (/^\d+$/.test(value)) {
          parsed.userId = value;
        } else {
          parsed.username = normalizeRecipientQuery(value);
        }
      }
      if (key === 'username' || key === 'user' || key === 'u') {
        parsed.username = normalizeRecipientQuery(value);
      }
      if (key === 'amount') {
        parsed.amount = value;
      }
    });
}

function parseLegacyTransferQrPayload(code: string): ParsedTransferQr {
  const cleanCode = stripWrappingQuotes(code).trim();
  const parsed: ParsedTransferQr = { userId: '', username: '', amount: '' };

  if (!cleanCode) return parsed;

  // JSON format support (e.g. {"type":"wallet","to":5,"amount":100})
  if (cleanCode.startsWith('{')) {
    try {
      const json = JSON.parse(cleanCode);
      const type = String(json.type || '');
      if (type === 'wallet' || type === 'send') {
        const toVal = String(json.to || '');
        if (/^\d+$/.test(toVal)) {
          parsed.userId = toVal;
        } else {
          parsed.username = normalizeRecipientQuery(toVal);
        }
        if (json.amount !== undefined && json.amount !== null) {
          parsed.amount = String(json.amount);
        }
        return parsed;
      }
    } catch {
      // ignore
    }
  }

  // Pipe or comma format support (e.g. WALLET|to=5|amount=12.00 or WALLET|to=5,amount=2)
  if (cleanCode.includes('|') || cleanCode.includes(',')) {
    const parts = cleanCode.split(/[|,]+/);
    const prefix = parts.shift()?.toUpperCase();
    if (prefix === 'WALLET' || prefix === 'POINTS' || prefix === 'VNSEEA_POINTS') {
      parts.forEach(part => {
        const separatorIndex = part.indexOf('=');
        if (separatorIndex > -1) {
          const key = part.slice(0, separatorIndex).trim().toUpperCase();
          const val = part.slice(separatorIndex + 1).trim();
          if (key === 'TO') {
            if (/^\d+$/.test(val)) {
              parsed.userId = val;
            } else {
              parsed.username = normalizeRecipientQuery(val);
            }
          }
          if (key === 'AMOUNT' || key === 'AMT' || key === 'POINTS') {
            parsed.amount = val;
          }
        }
      });
      return parsed;
    }
  }

  // Fallback to query params or profile URLs
  const query = cleanCode.includes('?') ? cleanCode.split('?').slice(1).join('?').split('#')[0] : '';
  if (query) {
    parseQueryParams(query, parsed);
  }
  if (!parsed.username && !parsed.userId) {
    parsed.username = extractProfileUsernameFromUrl(cleanCode);
  }

  return parsed;
}

function parseTransferQrForScreen(code: string): ParsedTransferQr | null {
  const pointsPayload = parsePointsQrPayload(code);
  if (pointsPayload) {
    return {
      userId: pointsPayload.userId,
      username: pointsPayload.username,
      amount: pointsPayload.points ? String(pointsPayload.points) : '',
    };
  }
  if (/^(POINTS|WALLET)\|/i.test(stripWrappingQuotes(code).trim())) {
    return null;
  }
  return parseLegacyTransferQrPayload(code);
}

function MyBalanceScreen() {
  const navigation = useNavigation<BalanceNav>();
  const language = useAppLanguage();
  const copy = BALANCE_COPY[language] || BALANCE_COPY.vi;
  const isVi = language === 'vi';

  const { walletOverview, isLoading, error, reload } = useEarningsViewModel();

  const balance = walletOverview?.balance ?? 0;
  const username = walletOverview?.currentUser?.username || '';

  // Modals visibility state
  const [isSendModalVisible, setIsSendModalVisible] = useState(false);
  const [isQrModalVisible, setIsQrModalVisible] = useState(false);
  const [isScannerVisible, setIsScannerVisible] = useState(false);

  // Send Money form state
  const [sendAmount, setSendAmount] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUserItem[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<SearchUserItem | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // QR Transfer code generation state
  const [qrAmount, setQrAmount] = useState('');

  // Handle typing search query
  const handleSearchRecipient = useCallback(async (query: string) => {
    setSearchQuery(query);
    const cleanQuery = normalizeRecipientQuery(query);
    if (cleanQuery.length < 2 && !/^\d+$/.test(cleanQuery)) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await apiBridge.get<RecipientSearchResponse>(
        'wallet-recipient-search',
        { q: cleanQuery },
      );
      const mapped = asRecipientArray(response)
        .map(mapRecipient)
        .filter(item => item.id > 0);
      setSearchResults(mapped);
    } catch (err) {
      console.warn('[MyBalanceScreen] Failed to search recipients', err);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Fetch and auto-select recipient by scanned QR payload.
  const fetchAndSetRecipientFromQr = useCallback(async (payload: ParsedTransferQr) => {
    const normalizedUserId = Number(payload.userId || 0);
    const normalizedUsername = normalizeRecipientQuery(payload.username).toLowerCase();
    if (normalizedUserId <= 0 && !normalizedUsername) {
      Alert.alert(
        isVi ? 'ThÃƒÂ´ng bÃƒÂ¡o' : 'Notice',
        isVi 
          ? 'MÃƒÂ£ QR khÃƒÂ´ng chÃ¡Â»Â©a thÃƒÂ´ng tin ngÃ†Â°Ã¡Â»Âi nhÃ¡ÂºÂ­n!\nPayload: ' + JSON.stringify(payload)
          : 'QR Code does not contain recipient info!\nPayload: ' + JSON.stringify(payload),
      );
      return;
    }

    setIsSearching(true);
    try {
      let found: SearchUserItem | null = null;

      if (normalizedUserId > 0) {
        // Fetch user directly by ID using get-user-data endpoint
        const response = await apiBridge.post<any>('get-user-data', {
          user_id: String(normalizedUserId),
          fetch: 'user_data',
        });
        // get-user-data returns { api_status: 200, user_data: { ... } }
        const userData = response?.user_data;
        if (userData && typeof userData === 'object') {
          const mapped = mapRecipient(userData);
          if (mapped.id > 0) {
            found = mapped;
          }
        }
      } else {
        // Fall back to search by username
        const response = await apiBridge.get<RecipientSearchResponse>(
          'wallet-recipient-search',
          { q: normalizedUsername },
        );
        const recipients = asRecipientArray(response)
          .map(mapRecipient)
          .filter(item => item.id > 0);
        found = recipients.find(
          item => item.username.toLowerCase() === normalizedUsername,
        ) || null;
      }

      if (found) {
        setSelectedRecipient(found);
        setSearchQuery(found.name || found.username);
        if (payload.amount) {
          setSendAmount(payload.amount);
        }
      } else {
        Alert.alert(isVi ? 'ThÃƒÂ´ng bÃƒÂ¡o' : 'Notice', copy.userNotFound);
      }
    } catch (err: any) {
      console.warn('[MyBalanceScreen] Failed to fetch recipient from scanned QR', err);
      Alert.alert(isVi ? 'LÃ¡Â»â€”i' : 'Error', err?.message || 'Network error');
    } finally {
      setIsSearching(false);
    }
  }, [copy.userNotFound, isVi]);
  // Send money execution
  const handleConfirmSend = useCallback(async () => {
    if (!selectedRecipient) {
      Alert.alert(isVi ? 'ThÃƒÂ´ng bÃƒÂ¡o' : 'Warning', copy.selectRecipient);
      return;
    }

    const numericAmount = parsePositivePoints(sendAmount);
    if (!numericAmount) {
      Alert.alert(isVi ? 'ThÃƒÂ´ng bÃƒÂ¡o' : 'Warning', copy.invalidAmount);
      return;
    }

    const balance = walletOverview?.balance ?? 0;
    if (numericAmount > balance) {
      Alert.alert(isVi ? 'ThÃƒÂ´ng bÃƒÂ¡o' : 'Warning', copy.insufficientBalance);
      return;
    }

    const senderId = Number(sessionStorage.getSession()?.userId || 0);
    if (!Number.isSafeInteger(senderId) || senderId <= 0) {
      Alert.alert(isVi ? 'LÃ¡Â»â€”i' : 'Error', 'Authentication is required.');
      return;
    }
    const requestId = pendingPointsTransferRequestStorage.getOrCreate({
      senderId,
      recipientUserId: selectedRecipient.id,
      points: numericAmount,
      note: '',
    });

    setIsSubmitting(true);
    try {
      const response = await walletRepository.transferPoints({
        recipientUserId: selectedRecipient.id,
        points: numericAmount,
        requestId,
      });

      pendingPointsTransferRequestStorage.clear(response.requestId || requestId);
      Alert.alert(isVi ? 'ThÃƒÂ nh cÃƒÂ´ng' : 'Success', response.message || copy.successSend);
      setIsSendModalVisible(false);
      setSearchQuery('');
      setSearchResults([]);
      setSelectedRecipient(null);
      setSendAmount('');
      reload();
    } catch (err: any) {
      const status = Number(err?.response?.status || err?.apiStatus || 0);
      const errorCode = String(
        err?.response?.data?.error_code || err?.errorId || '',
      );
      if (
        [400, 422].includes(status) ||
        (status === 409 && errorCode === 'idempotency_conflict')
      ) {
        pendingPointsTransferRequestStorage.clear(requestId);
      }
      Alert.alert(isVi ? 'LÃ¡Â»â€”i' : 'Error', err?.message || 'Network error');
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedRecipient, sendAmount, walletOverview, copy, isVi, reload]);

  const requestCameraPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn('[MyBalanceScreen] Error requesting camera permission', err);
        return false;
      }
    }
    // On iOS, the Camera component automatically requests authorization when mounted
    return true;
  };

  // Handle QR scanner trigger click
  const handleOpenScanner = useCallback(async () => {
    const isAuthorized = await requestCameraPermission();
    if (isAuthorized) {
      setIsScannerVisible(true);
    } else {
      Alert.alert(copy.cameraPermissionTitle, copy.cameraPermissionDesc);
    }
  }, [copy]);

  // Handle scanned QR code result.
  const handleReadCode = useCallback((code: string) => {
    if (!code) return;
    setIsScannerVisible(false);

    const payload = parseTransferQrForScreen(code);
    console.log('[MyBalanceScreen] QR scanned value', code);
    console.log('[MyBalanceScreen] QR parsed payload', payload);

    if (!payload) {
      Alert.alert(
        isVi ? 'ThÃƒÂ´ng bÃƒÂ¡o' : 'Notice',
        isVi ? 'Mã QR VNSEEA không hợp lệ.' : 'Invalid VNSEEA QR code.',
      );
      return;
    }

    const scannedCurrentUserId = Number(payload.userId || 0);
    const currentUserId = Number(walletOverview?.currentUser?.id || 0);

    if (
      (payload.username && payload.username.toLowerCase() === username.toLowerCase()) ||
      (scannedCurrentUserId > 0 && currentUserId > 0 && scannedCurrentUserId === currentUserId)
    ) {
      Alert.alert(
        isVi ? 'ThÃƒÂ´ng bÃƒÂ¡o' : 'Notice',
        isVi
          ? 'BÃ¡ÂºÂ¡n khÃƒÂ´ng thÃ¡Â»Æ’ tÃ¡Â»Â± gÃ¡Â»Â­i VNSEEA cho chÃƒÂ­nh mÃƒÂ¬nh!'
          : 'You cannot send VNSEEA to yourself!',
      );
      return;
    }

    if (payload.userId || payload.username) {
      fetchAndSetRecipientFromQr(payload);
      return;
    }

    Alert.alert(
      isVi ? 'ThÃƒÂ´ng bÃƒÂ¡o' : 'Notice',
      isVi 
        ? 'MÃƒÂ£ QR khÃƒÂ´ng hÃ¡Â»Â£p lÃ¡Â»â€¡ hoÃ¡ÂºÂ·c khÃƒÂ´ng chÃ¡Â»Â©a thÃƒÂ´ng tin ngÃ†Â°Ã¡Â»Âi nhÃ¡ÂºÂ­n!\nDÃ¡Â»Â¯ liÃ¡Â»â€¡u quÃƒÂ©t Ã„â€˜Ã†Â°Ã¡Â»Â£c: "' + code + '"'
        : 'Invalid QR or QR does not contain recipient info!\nScanned data: "' + code + '"',
    );
  }, [fetchAndSetRecipientFromQr, isVi, username, walletOverview?.currentUser?.id]);
  if (isLoading && !walletOverview) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        <FocusAwareStatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <SafeAreaFeedHeader />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="small" color="#0000ff" />
          <Text className="text-sm font-bold text-slate-500 mt-4">{copy.loading}</Text>
        </View>
      </View>
    );
  }

  if (error && !walletOverview) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        <FocusAwareStatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <SafeAreaFeedHeader />
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-sm font-extrabold text-center text-red-500 mb-4">
            {copy.errorOccurred}: {error}
          </Text>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => void reload()}
            className="flex-row items-center gap-x-2 rounded-full bg-blue-50 px-6 py-3"
          >
            <RefreshCw size={18} color="#0000ff" />
            <Text className="text-sm font-extrabold text-blue-600">{copy.retry}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }



  // App and Nuxt share the canonical POINTS QR protocol.
  const currentUserId = Number(walletOverview?.currentUser?.id || 0);
  const normalizedQrPoints = qrAmount ? parsePositivePoints(qrAmount) : null;
  const qrPayload = currentUserId > 0
    ? encodePointsQrPayload({recipientUserId: currentUserId, points: normalizedQrPoints})
    : '';
  const baseUrl = apiConfig.webBaseUrl.replace(/\/+$/, '');
  const qrCodeUrl = `${baseUrl}/requests.php?f=qrcode&s=points-qr-code&to=${encodeURIComponent(String(currentUserId))}${
    normalizedQrPoints ? `&points=${encodeURIComponent(String(normalizedQrPoints))}` : ''
  }`;

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <FocusAwareStatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <SafeAreaFeedHeader />

      <FlatList
        data={walletOverview?.transactions || []}
        keyExtractor={item => String(item.id)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshing={isLoading}
        onRefresh={reload}
        ListHeaderComponent={
          <View className="mb-4">
            {/* Top Balance Panel */}
            <View className="bg-white px-5 py-8 items-center border-b border-slate-100 relative overflow-hidden">
              {/* Background abstract circles pattern */}
              <View className="absolute inset-0 opacity-[0.03] flex-wrap flex-row justify-around pointer-events-none">
                {Array.from({ length: 48 }).map((_, i) => (
                  <View key={i} className="h-3 w-3 rounded-full bg-slate-900 m-2.5" />
                ))}
              </View>

              <Text className="text-sm font-extrabold text-slate-500 mb-3">
                {copy.balanceLabel}
              </Text>
              
              <Text className="text-[32px] font-black text-blue-600 mb-6">
                {formatNumber(balance)} VNSEEA
              </Text>

              {/* Send Button */}
              <TouchableOpacity
                activeOpacity={0.82}
                onPress={() => setIsSendModalVisible(true)}
                className="w-48 h-12 flex-row items-center justify-center bg-slate-100 rounded-2xl mb-3"
              >
                <Send size={16} color="#475569" style={{ transform: [{ rotate: '-15deg' }], marginRight: 8 }} />
                <Text className="text-slate-700 font-extrabold text-[15px]">{copy.sendBtn}</Text>
              </TouchableOpacity>

              {/* QR Code Button */}
              <TouchableOpacity
                activeOpacity={0.82}
                onPress={() => {
                  if (!currentUserId) {
                    Alert.alert(
                      isVi ? '\u0054h\u00f4ng b\u00e1o' : 'Notice',
                      isVi ? 'Kh\u00f4ng l\u1ea5y \u0111\u01b0\u1ee3c ID ng\u01b0\u1eddi d\u00f9ng \u0111\u1ec3 t\u1ea1o m\u00e3 QR VNSEEA.' : 'Unable to resolve user ID for VNSEEA QR.',
                    );
                    return;
                  }
                  setIsQrModalVisible(true);
                }}
                className="w-72 h-12 flex-row items-center justify-center bg-blue-600 rounded-2xl"
              >
                <QrCode size={18} color="#ffffff" style={{ marginRight: 8 }} />
                <Text className="text-white font-extrabold text-[15px]">{copy.qrBtn}</Text>
              </TouchableOpacity>
            </View>

            {/* Transactions Header */}
            <View className="px-4 pt-5 pb-1">
              <Text className="text-lg font-black text-slate-900">
                {copy.transactionsTitle}
              </Text>
            </View>
          </View>
        }
        renderItem={({ item }) => {
          const isSent = ['SENT', 'PURCHASE', 'POINTS_SENT', 'POINTS_DEDUCT'].includes(item.kind);
          const isReceived = ['RECEIVED', 'WALLET', 'POINTS_RECEIVED', 'POINTS_EARNED'].includes(item.kind);
          const sign = isSent ? '-' : isReceived ? '+' : '';
          const amountColor = isSent ? '#ef4444' : isReceived ? '#22c55e' : '#0f172a';
          const transactionPoints = item.points > 0 ? item.points : item.amount;
          return (
            <View
              className="mx-4 mt-3 bg-white border border-slate-100 rounded-2xl p-5"
              style={{
                shadowColor: '#000000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.02,
                shadowRadius: 4,
                elevation: 1,
              }}
            >
              {/* Transaction Title */}
              <Text className="text-[15px] font-bold text-slate-800 leading-tight mb-1">
                {item.notes || (isSent ? 'Ã„ÂÃƒÂ£ gÃ¡Â»Â­i VNSEEA' : isReceived ? 'Nhận VNSEEA' : item.kind)}
              </Text>

              {/* Counterparty */}
              {item.counterpartyName ? (
                <Text className="text-xs font-semibold text-slate-400 mb-3">
                  {isSent ? 'Ã„ÂÃ¡ÂºÂ¿n: ' : 'Từ: '}{item.counterpartyName}
                </Text>
              ) : <View className="mb-3" />}

              {/* Transaction Date */}
              <View className="flex-row justify-between items-center mb-3">
                <Text className="text-xs font-bold text-slate-400">{copy.dateLabel}</Text>
                <Text className="text-xs font-bold text-slate-600">{item.transactionDt}</Text>
              </View>

              {/* Transaction Quantity */}
              <View className="flex-row justify-between items-center">
                <Text className="text-xs font-bold text-slate-400">{copy.amountLabel}</Text>
                <Text style={{ color: amountColor }} className="text-sm font-extrabold">
                  {sign}{formatNumber(transactionPoints)} VNSEEA
                </Text>
              </View>
            </View>
          );
        }}
      />

      {/* Send money Modal */}
      <Modal
        visible={isSendModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsSendModalVisible(false)}
      >
        <SafeAreaView className="flex-1 bg-white" edges={['top']}>
          {/* Header with Curved Wave Style */}
          <View className="bg-blue-600 pt-8 pb-10 relative items-center justify-center">
            {/* Close Button X */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setIsSendModalVisible(false)}
              className="absolute right-5 top-5 h-8 w-8 items-center justify-center rounded-full bg-white/20"
            >
              <X size={18} color="#ffffff" />
            </TouchableOpacity>

            {/* Title Block */}
            <View className="flex-row items-center justify-center">
              <View className="h-9 w-9 items-center justify-center rounded-full bg-white/20 mr-2.5">
                <Send size={18} color="#ffffff" style={{ transform: [{ rotate: '-15deg' }] }} />
              </View>
              <Text className="text-xl font-black text-white">{copy.sendModalTitle}</Text>
            </View>

            {/* SVG Wave bottom decoration */}
            <View className="absolute bottom-0 left-0 right-0 h-6">
              <Svg height="100%" width="100%" viewBox="0 0 1440 320" preserveAspectRatio="none">
                <Path
                  d="M0,160 C480,260 960,260 1440,160 L1440,320 L0,320 Z"
                  fill="#ffffff"
                />
              </Svg>
            </View>
          </View>

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            className="flex-1"
          >
            <ScrollView className="flex-1 px-5 pt-3" keyboardShouldPersistTaps="handled">
              {/* Blue Info Box */}
              <View className="rounded-xl bg-blue-50/70 border border-blue-100/50 p-4 items-center mb-6">
                <Text className="text-blue-600 font-extrabold text-[15px] text-center">
                  {copy.infoBoxText}
                </Text>
              </View>

              {/* Amount input */}
              <View className="mb-5">
                <Text className="mb-2 text-sm font-black text-slate-800">
                  {copy.amountInputLabel}
                </Text>
                <TextInput
                  value={sendAmount}
                  onChangeText={value => setSendAmount(value.replace(/\D/g, ''))}
                  placeholder="0"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                  className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-base font-semibold text-slate-900"
                />
              </View>

              {/* Recipient Search Input Header (Label & Scan QR Btn) */}
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-sm font-black text-slate-800">{copy.recipientLabel}</Text>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleOpenScanner}
                  className="flex-row items-center bg-slate-100 rounded-lg px-2.5 py-1.5"
                >
                  <QrCode size={14} color="#475569" style={{ marginRight: 5 }} />
                  <Text className="text-slate-600 font-extrabold text-[11px]">{copy.scanQrBtn}</Text>
                </TouchableOpacity>
              </View>

              {/* Search textfield */}
              <View className="mb-4">
                <View className="h-12 flex-row items-center rounded-2xl border border-slate-200 bg-white px-4">
                  <Search size={18} color="#94a3b8" style={{ marginRight: 8 }} />
                  <TextInput
                    value={searchQuery}
                    onChangeText={handleSearchRecipient}
                    placeholder={copy.searchPlaceholder}
                    placeholderTextColor="#94a3b8"
                    className="flex-1 text-base font-semibold text-slate-900"
                  />
                  {isSearching ? <ActivityIndicator size="small" color="#0000ff" /> : null}
                </View>
              </View>

              {/* Selected recipient badge */}
              {selectedRecipient ? (
                <View className="mb-5 flex-row items-center gap-x-3 rounded-2xl bg-blue-50 border border-blue-100 p-3">
                  {selectedRecipient.avatar ? (
                    <Image source={{ uri: selectedRecipient.avatar }} className="w-10 h-10 rounded-full" />
                  ) : (
                    <View className="w-10 h-10 rounded-full bg-blue-100 items-center justify-center">
                      <Text className="text-blue-700 font-bold text-sm">
                        {selectedRecipient.name.slice(0, 1).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View className="flex-1">
                    <Text className="text-sm font-extrabold text-blue-900">{selectedRecipient.name}</Text>
                    <Text className="text-xs font-bold text-blue-400 mt-0.5">@{selectedRecipient.username}</Text>
                  </View>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      setSelectedRecipient(null);
                      setSearchQuery('');
                    }}
                    className="h-8 w-8 items-center justify-center rounded-full bg-blue-200/50"
                  >
                    <X size={16} color="#2563eb" />
                  </TouchableOpacity>
                </View>
              ) : null}

              {/* Search suggestions list */}
              {searchResults.length > 0 && !selectedRecipient ? (
                <View className="mb-5 rounded-2xl border border-slate-100 bg-white p-2">
                  {searchResults.map(user => (
                    <TouchableOpacity
                      key={user.id}
                      activeOpacity={0.8}
                      onPress={() => {
                        setSelectedRecipient(user);
                        setSearchResults([]);
                        setSearchQuery(user.name);
                      }}
                      className="flex-row items-center gap-x-3 p-3 border-b border-slate-50 last:border-0"
                    >
                      {user.avatar ? (
                        <Image source={{ uri: user.avatar }} className="w-9 h-9 rounded-full" />
                      ) : (
                        <View className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center">
                          <Text className="text-slate-600 font-bold text-sm">
                            {user.name.slice(0, 1).toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <View className="flex-1">
                        <Text className="text-sm font-extrabold text-slate-800">{user.name}</Text>
                        <Text className="text-xs font-bold text-slate-400 mt-0.5">@{user.username}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}

              {/* Submit Continue Button */}
              <TouchableOpacity
                activeOpacity={0.85}
                disabled={isSubmitting}
                onPress={handleConfirmSend}
                className="bg-blue-600 rounded-full py-3.5 px-8 flex-row items-center justify-center self-center mt-8 min-w-[140px]"
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <CheckCheck size={18} color="#ffffff" style={{ marginRight: 6 }} />
                    <Text className="text-white font-extrabold text-base">{copy.confirmSend}</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* QR Transfer Modal */}
      <Modal
        visible={isQrModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsQrModalVisible(false)}
      >
        <SafeAreaView className="flex-1 bg-white" edges={['top']}>
          {/* Header */}
          <View className="bg-blue-600 pt-8 pb-10 relative items-center justify-center">
            {/* Close Button X */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setIsQrModalVisible(false)}
              className="absolute right-5 top-5 h-8 w-8 items-center justify-center rounded-full bg-white/20"
            >
              <X size={18} color="#ffffff" />
            </TouchableOpacity>

            <Text className="text-xl font-black text-white">{copy.qrModalTitle}</Text>

            {/* SVG Wave bottom decoration */}
            <View className="absolute bottom-0 left-0 right-0 h-6">
              <Svg height="100%" width="100%" viewBox="0 0 1440 320" preserveAspectRatio="none">
                <Path
                  d="M0,160 C480,260 960,260 1440,160 L1440,320 L0,320 Z"
                  fill="#ffffff"
                />
              </Svg>
            </View>
          </View>

          <ScrollView className="flex-1 px-5 pt-3" showsVerticalScrollIndicator={false}>
            {/* Amount (optional) input */}
            <View className="mb-1">
              <Text className="mb-2 text-sm font-black text-slate-800">
                {copy.qrAmountLabel}
              </Text>
              <TextInput
                value={qrAmount}
                onChangeText={value => setQrAmount(value.replace(/\D/g, ''))}
                placeholder=""
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-base font-semibold text-slate-900"
              />
            </View>

            <Text className="text-[12px] font-semibold text-slate-500 mb-6">
              {copy.qrAmountHint}
            </Text>

            {/* Large QR Display */}
            <View className="items-center justify-center mt-4">
              <View
                className="h-64 w-64 items-center justify-center border border-slate-100 rounded-3xl bg-white p-3"
                style={{
                  shadowColor: '#000000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.05,
                  shadowRadius: 10,
                  elevation: 2,
                }}
              >
                <Image source={{ uri: qrCodeUrl }} className="h-full w-full rounded-2xl" />
              </View>
            </View>

            {/* User credentials summary below QR */}
            <Text className="text-center text-sm font-extrabold text-slate-400 mt-6">
              @{username}
            </Text>
            <Text selectable className="text-center text-[11px] font-semibold text-slate-400 mt-2">
              {qrPayload}
            </Text>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Real QR Code Scanner Modal using react-native-camera-kit */}
      <Modal
        visible={isScannerVisible}
        animationType="slide"
        onRequestClose={() => setIsScannerVisible(false)}
      >
        <SafeAreaView className="flex-1 bg-black" edges={['top']}>
          {/* Header */}
          <View className="h-16 flex-row items-center justify-between px-5 bg-black border-b border-neutral-900">
            <Text className="text-lg font-black text-white">{copy.scannerTitle}</Text>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setIsScannerVisible(false)}
              className="h-10 w-10 items-center justify-center rounded-full bg-neutral-900"
            >
              <X size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>

          {/* Camera Scanner Component */}
          <View className="flex-1 relative">
            <Camera
              style={{ flex: 1 }}
              scanBarcode={true}
              onReadCode={(event: any) => {
                const scannedValue = readQrCodeValue(event);
                if (scannedValue) {
                  handleReadCode(scannedValue);
                }
              }}
            />
            {/* Overlay viewfinder square guide line */}
            <View className="absolute inset-0 items-center justify-center pointer-events-none">
              <View className="h-64 w-64 border-2 border-blue-500 rounded-3xl bg-transparent" />
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

export default MyBalanceScreen;

// Description: Renders the VNSEEA single-page create/edit product form.
import { APP_BRAND_COLOR } from '../../../shared-kernel/presentation/theme/appColors';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import {
  launchImageLibrary,
  type Asset,
} from 'react-native-image-picker';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  DollarSign,
  ImagePlus,
  Info,
  MapPin,
  Package,
  X,
  Laptop,
  Shirt,
  Heart,
  Utensils,
  Target,
  GraduationCap,
  Sparkles,
  ShoppingBag,
  Check,
} from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';
import {
  useNavigation,
  usePreventRemove,
  useRoute,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useProductViewModel } from '../../application/view-models/useProductViewModel';
import type { ProductFormData } from '../../application/view-models/useProductViewModel';
import { ROUTES } from '../../../navigation/constants/routes';
import { createProductRepository } from '../../infrastructure/repositories/ApiProductRepository';
import { apiBridge } from '../../../shared-kernel/infrastructure/api/apiBridge';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';
import { FeedHeader } from '../../../feed/presentation/components/FeedHeader';
import AddressAutocomplete from '../../../shared-kernel/presentation/components/AddressAutocomplete';

type CreateProductNav = NativeStackNavigationProp<RootStackParamList>;

const PRODUCT_HEADER_COLOR = APP_BRAND_COLOR;

type RootStackParamList = {
  Feed: undefined;
  [key: string]: undefined;
};

interface StepOption {
  id: string;
  name: string;
}

interface CurrencyOption extends StepOption {
  code: string;
}

type StepConfig = {
  key: string;
  title: string;
  helper: string;
  label?: string;
  placeholder?: string;
  keyboard?: 'numeric' | 'default';
  iconComponent?: typeof DollarSign;
  field: keyof ProductFormData;
  select?: boolean;
  upload?: boolean;
  multiline?: boolean;
  options?: StepOption[];
};

const steps: StepConfig[] = [
  {
    key: 'name',
    title: 'Tên sản phẩm',
    helper: 'Đặt tên rõ ràng để người mua dễ tìm thấy sản phẩm.',
    label: 'Tên sản phẩm',
    placeholder: 'Nhập tên sản phẩm',
    field: 'product_title',
  },
  {
    key: 'price',
    title: 'Giá sản phẩm',
    helper: 'Vui lòng nhập giá bán công khai của sản phẩm này.',
    label: 'Mức giá niêm yết (VND)',
    placeholder: '0',
    keyboard: 'numeric',
    iconComponent: DollarSign,
    field: 'product_price',
  },
  {
    key: 'currency',
    title: 'Tiền tệ',
    helper: 'Chọn loại tiền tệ chính thức cho sản phẩm này.',
    label: 'Loại tiền tệ',
    placeholder: 'VND - Việt Nam Đồng',
    select: true,
    field: 'currency',
    options: [
      { id: 'VND', name: 'VND - Việt Nam Đồng' },
      { id: 'VNSEEA', name: 'VNSEEA' },
      { id: 'USD', name: 'USD - Đô la Mỹ' },
      { id: 'EUR', name: 'EUR - Euro' },
    ],
  },
  {
    key: 'category',
    title: 'Chọn danh mục',
    helper: 'Danh mục giúp sản phẩm được phân phối đúng nhóm người mua.',
    field: 'product_category',
    options: [
      { id: '1', name: 'Điện tử tiêu dùng' },
      { id: '2', name: 'Thời trang nam' },
      { id: '3', name: 'Thời trang nữ' },
      { id: '4', name: 'Mẹ và bé' },
      { id: '5', name: 'Nhà cửa và đời sống' },
      { id: '6', name: 'Sức khỏe và làm đẹp' },
      { id: '7', name: 'Thể thao và du lịch' },
      { id: '8', name: 'Sách và văn phòng phẩm' },
    ],
  },
  {
    key: 'description',
    title: 'Mô tả sản phẩm',
    helper: 'Một mô tả chi tiết giúp khách hàng dễ tin tưởng hơn.',
    label: 'Mô tả sản phẩm',
    placeholder: 'Nhập mô tả chi tiết về sản phẩm của bạn...',
    multiline: true,
    field: 'product_description',
  },
  {
    key: 'type',
    title: 'Tình trạng sản phẩm',
    helper: 'Chọn tình trạng hiện tại để người mua dễ đánh giá.',
    field: 'product_type',
    options: [
      { id: '0', name: 'Sản phẩm bình thường' },
      { id: '1', name: 'Sản phẩm đang bán' },
    ],
  },
  {
    key: 'images',
    title: 'Hình ảnh sản phẩm',
    helper: 'Tải lên ít nhất 1 ảnh rõ nét cho sản phẩm của bạn.',
    upload: true,
    field: 'images',
  },
  {
    key: 'location',
    title: 'Người bán tỉnh/thành',
    helper: 'Khu vực vị trí giúp người mua tìm thấy sản phẩm gần họ.',
    label: 'Tỉnh/Thành phố',
    placeholder: 'Chọn tỉnh/thành phố',
    iconComponent: MapPin,
    select: true,
    field: 'product_location',
  },
  {
    key: 'units',
    title: 'Số lượng sản phẩm',
    helper: 'Nhập tổng số lượng đơn vị đang có sẵn.',
    label: 'Tổng số lượng đơn vị',
    placeholder: 'Nhập số lượng (vd: 100)',
    keyboard: 'numeric',
    field: 'units',
  },
];

// Reusable custom layout components for the premium form
function FieldWrapper({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ marginBottom: 18 }}>
      <Text
        style={{
          fontSize: 14,
          fontWeight: '800',
          color: '#0f172a',
          marginBottom: 8,
        }}
      >
        {label}
      </Text>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          minHeight: 52,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: error ? '#ef4444' : '#e2e8f0',
          backgroundColor: '#ffffff',
          paddingHorizontal: 16,
        }}
      >
        {children}
      </View>
      {error ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
          <AlertCircle size={14} color="#ef4444" />
          <Text style={{ marginLeft: 6, fontSize: 12, fontWeight: '600', color: '#ef4444' }}>
            {error}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function SelectorTrigger({
  label,
  valueLabel,
  placeholder,
  onPress,
  error,
}: {
  label: string;
  valueLabel?: string;
  placeholder?: string;
  onPress: () => void;
  error?: string;
}) {
  return (
    <View style={{ marginBottom: 18 }}>
      <Text
        style={{
          fontSize: 14,
          fontWeight: '800',
          color: '#0f172a',
          marginBottom: 8,
        }}
      >
        {label}
      </Text>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: 52,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: error ? '#ef4444' : '#e2e8f0',
          backgroundColor: '#ffffff',
          paddingHorizontal: 16,
        }}
      >
        <Text style={{ flex: 1, fontSize: 15, fontWeight: '600', color: valueLabel ? '#0f172a' : '#94a3b8' }}>
          {valueLabel || placeholder || ''}
        </Text>
        <ChevronDown size={20} color="#64748b" />
      </TouchableOpacity>
      {error ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
          <AlertCircle size={14} color="#ef4444" />
          <Text style={{ marginLeft: 6, fontSize: 12, fontWeight: '600', color: '#ef4444' }}>
            {error}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

interface BottomSheetOption {
  id: string | number;
  name: string;
}

function BottomSheetSelector<T>({
  visible,
  title,
  options,
  selectedValue,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: BottomSheetOption[];
  selectedValue: T;
  onSelect: (value: T) => void;
  onClose: () => void;
}) {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        activeOpacity={1}
        style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={{ backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: 40, paddingTop: 20, maxHeight: '60%' }}
        >
          {/* Handle bar indicator */}
          <View style={{ height: 6, width: 48, borderRadius: 99, backgroundColor: '#e2e8f0', alignSelf: 'center', marginBottom: 16 }} />

          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', marginBottom: 8 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#0f172a' }}>{title}</Text>
            <TouchableOpacity
              style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}
              activeOpacity={0.8}
              onPress={onClose}
            >
              <X size={16} color="#64748b" />
            </TouchableOpacity>
          </View>

          <FlatList
            data={options}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => {
              const isSelected = String(item.id) === String(selectedValue);
              return (
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#f8fafc' }}
                  className="py-4"
                  activeOpacity={0.7}
                  onPress={() => {
                    onSelect(item.id as any);
                    onClose();
                  }}
                >
                  <Text style={{ fontSize: 16, fontWeight: '700', color: isSelected ? APP_BRAND_COLOR : '#334155' }}>
                    {item.name}
                  </Text>
                  {isSelected ? <Check size={18} color={APP_BRAND_COLOR} /> : null}
                </TouchableOpacity>
              );
            }}
            showsVerticalScrollIndicator={false}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const CONDITIONS_LIST = [
  { id: '0', name: 'Mới' },
  { id: '1', name: 'Đã sử dụng' },
];

function decodeCurrencySymbol(value: unknown) {
  let decoded = String(value ?? '');

  for (let pass = 0; pass < 2; pass += 1) {
    decoded = decoded
      .replace(/&amp;/gi, '&')
      .replace(/&#x([0-9a-f]+);?/gi, (_, code: string) =>
        String.fromCodePoint(Number.parseInt(code, 16)),
      )
      .replace(/&#(\d+);?/g, (_, code: string) =>
        String.fromCodePoint(Number.parseInt(code, 10)),
      )
      .replace(/&quot;/gi, '"')
      .replace(/&#39;|&apos;/gi, "'")
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>');
  }

  return decoded.trim();
}

function formatCurrencyOption(code: string, symbol: unknown, fallback?: string) {
  const decodedSymbol = decodeCurrencySymbol(symbol);
  return decodedSymbol
    ? `${code} (${decodedSymbol})`
    : decodeCurrencySymbol(fallback || code);
}

export default function CreateProductScreen() {
  const navigation = useNavigation<CreateProductNav>();
  const route = useRoute<any>();
  const editingProduct = route.params?.product;
  const language = useAppLanguage();
  const isVi = language === 'vi';

  const {
    formData,
    errors,
    updateFormData,
    addImage,
    removeImage,
    isLoading,
    submitError,
    submitSuccess,
    submitProduct,
    resetForm,
    isEditing,
  } = useProductViewModel(editingProduct);

  const [categoriesList, setCategoriesList] = useState<Array<{ id: string; name: string }>>([
    { id: '1', name: 'Điện tử tiêu dùng' },
    { id: '2', name: 'Thời trang nam' },
    { id: '3', name: 'Thời trang nữ' },
    { id: '4', name: 'Mẹ và bé' },
    { id: '5', name: 'Nhà cửa và đời sống' },
    { id: '6', name: 'Sức khỏe và làm đẹp' },
    { id: '7', name: 'Thể thao và du lịch' },
    { id: '8', name: 'Sách và văn phòng phẩm' },
    { id: '9', name: 'Ô tô & Xe cộ' },
  ]);

  const [currenciesList, setCurrenciesList] = useState<CurrencyOption[]>([
    { id: 'VND', code: 'VND', name: 'VND (₫)' },
    { id: 'VNSEEA', code: 'VNSEEA', name: 'VNSEEA' },
    { id: 'USD', code: 'USD', name: 'USD ($)' },
    { id: 'EUR', code: 'EUR', name: 'EUR (€)' },
  ]);

  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [conditionModalVisible, setConditionModalVisible] = useState(false);
  const [currencyModalVisible, setCurrencyModalVisible] = useState(false);

  // Dynamic API Fetching for Categories & Currencies
  React.useEffect(() => {
    let isMounted = true;

    const fetchApiData = async () => {
      const parseCurrencies = (raw: unknown): CurrencyOption[] => {
        if (!raw) return [];
        console.log('[CreateProductScreen] Parsing currencies from raw data:', typeof raw, Array.isArray(raw));
        if (Array.isArray(raw)) {
          return raw.map((curr, index) => {
            const id = String(curr?.id ?? index);
            const code = String(curr?.code ?? curr?.text ?? id).toUpperCase();
            const name = String(curr?.name || curr?.text || code);
            return {
              id,
              code,
              name: formatCurrencyOption(code, curr?.symbol, name),
            };
          }).filter(c => c.id);
        }
        if (typeof raw === 'object' && raw !== null) {
          return Object.entries(raw).map(([id, val]) => {
            if (typeof val === 'object' && val !== null) {
              const code = String((val as any).code || (val as any).text || id).toUpperCase();
              const text = String((val as any).name || (val as any).text || code);
              return {
                id,
                code,
                name: formatCurrencyOption(code, (val as any).symbol, text),
              };
            }
            const code = id.toUpperCase();
            return {
              id,
              code,
              name: formatCurrencyOption(code, val),
            };
          }).filter(c => c.id);
        }
        return [];
      };

      const applyCurrencyOptions = (options: CurrencyOption[]) => {
        if (!isMounted || options.length === 0) return;

        setCurrenciesList(options);
        const currentValue = String(formData.currency ?? '');
        const requestedCode = String(
          editingProduct?.currency_code ||
          (/^\d+$/.test(currentValue) ? '' : currentValue),
        ).toUpperCase();
        const selectedOption =
          options.find(option => String(option.id) === currentValue) ||
          options.find(option => option.code === requestedCode);

        if (selectedOption && String(selectedOption.id) !== currentValue) {
          updateFormData('currency', String(selectedOption.id));
        }
      };

      // 1. Fetch categories & currencies from get-products response
      try {
        const repo = createProductRepository();
        const resProducts = await repo.getProducts({ limit: 1 });

        const normalizeCategories = (raw: unknown): Record<string, string> => {
          if (!raw || typeof raw !== 'object') return {};
          const out: Record<string, string> = {};
          Object.entries(raw as Record<string, unknown>).forEach(([key, value]) => {
            if (typeof value === 'string') {
              out[key] = value;
            } else if (Array.isArray(value)) {
              const first = value.find(entry => entry && typeof entry === 'object');
              if (first && typeof (first as { lang?: unknown }).lang === 'string') {
                out[key] = (first as { lang: string }).lang;
              }
            }
          });
          return out;
        };

        const categoriesMap = normalizeCategories(resProducts.products_categories);
        const cats = Object.entries(categoriesMap).map(([id, name]) => ({
          id,
          name,
        }));

        if (isMounted && cats.length > 0) {
          setCategoriesList(cats);
        }

        if (isMounted && resProducts.currencies) {
          const currs = parseCurrencies(resProducts.currencies);
          console.log('[CreateProductScreen] Currencies loaded from products API:', currs);
          if (currs.length > 0) {
            applyCurrencyOptions(currs);
          }
        }
      } catch (err) {
        console.warn('Failed to fetch categories & currencies from products API', err);
      }

      // 2. Fetch site currencies from get-site-settings (main WoWonder config)
      try {
        const response = await apiBridge.post<any>('get-site-settings', {});
        if (isMounted && response?.currencies) {
          const currs = parseCurrencies(response.currencies);
          console.log('[CreateProductScreen] Currencies loaded from site settings envelope:', currs);
          if (currs.length > 0) {
            applyCurrencyOptions(currs);
          }
        } else if (isMounted && response?.config) {
          const config = response.config;
          let currencySymbols: Record<string, string> = {};

          if (typeof config.currency_symbol_array === 'string') {
            try {
              currencySymbols = JSON.parse(config.currency_symbol_array);
            } catch (e) {}
          } else if (config.currency_symbol_array && typeof config.currency_symbol_array === 'object') {
            currencySymbols = config.currency_symbol_array;
          }

          if (Object.keys(currencySymbols).length > 0) {
            const list = Object.entries(currencySymbols).map(([code, symbol]) => ({
              id: code,
              code: code.toUpperCase(),
              name: formatCurrencyOption(code, symbol),
            }));
            console.log('[CreateProductScreen] Currencies loaded from site settings config.currency_symbol_array:', list);
            applyCurrencyOptions(list);
          } else if (typeof config.currency === 'string' && typeof config.currency_symbol === 'string') {
            applyCurrencyOptions([
              {
                id: config.currency,
                code: config.currency.toUpperCase(),
                name: formatCurrencyOption(config.currency, config.currency_symbol),
              },
            ]);
          }
        }
      } catch (err) {
        console.warn('Failed to fetch site settings currencies', err);
      }

      // 3. Fallback: Fetch currencies from settings-monetization if the above was empty
      try {
        const resMonetization = await apiBridge.post<{
          api_status: number;
          currencies?: any[];
        }>('settings-monetization');

        if (isMounted && resMonetization && resMonetization.currencies) {
          const currs = parseCurrencies(resMonetization.currencies);
          console.log('[CreateProductScreen] Currencies loaded from monetization API:', currs);
          if (currs.length > 0) {
            if (currenciesList.length <= 3) {
              applyCurrencyOptions(currs);
            }
          }
        }
      } catch (err) {
        console.warn('Failed to fetch currencies from monetization API', err);
      }
    };

    fetchApiData();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  usePreventRemove(!submitSuccess, ({ data }) => {
    Alert.alert(
      isEditing ? 'Hủy chỉnh sửa' : 'Hủy tạo sản phẩm',
      'Bạn có chắc muốn hủy? Thông tin đã nhập sẽ không được lưu.',
      [
        { text: 'Không', style: 'cancel' },
        {
          text: 'Có',
          style: 'destructive',
          onPress: () => navigation.dispatch(data.action),
        },
      ],
    );
  });

  const handleAddImage = useCallback(async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 10,
        quality: 0.8,
      });
      if (result.didCancel) return;
      if (result.errorCode) {
        Alert.alert('Lỗi', result.errorMessage ?? 'Không thể mở thư viện ảnh');
        return;
      }
      const assets = result.assets as Asset[] | undefined;
      if (assets && assets.length > 0) {
        for (const asset of assets) {
          if (asset.uri) {
            addImage({
              uri: asset.uri,
              name: asset.fileName ?? 'product_image.jpg',
              type: asset.type ?? 'image/jpeg',
            });
          }
        }
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể chọn hình ảnh');
    }
  }, [addImage]);

  const handleRemoveImage = useCallback(
    (index: number) => {
      removeImage(index);
    },
    [removeImage],
  );

  const handleLocationChange = useCallback(
    (value: string) => {
      updateFormData('product_location', value);
      updateFormData('lat', '');
      updateFormData('lng', '');
    },
    [updateFormData],
  );

  const handleLocationSelect = useCallback(
    (place: { description: string; lat?: number; lng?: number }) => {
      updateFormData('product_location', place.description);
      updateFormData('lat', place.lat === undefined ? '' : String(place.lat));
      updateFormData('lng', place.lng === undefined ? '' : String(place.lng));
    },
    [updateFormData],
  );

  React.useEffect(() => {
    if (submitSuccess) {
      navigation.replace(ROUTES.MY_PRODUCTS);
    }
  }, [navigation, submitSuccess]);

  // SUCCESS STATE
  if (submitSuccess) {
    return (
      <SafeAreaView className="flex-1 surface-base" edges={['top']}>
        <FocusAwareStatusBar barStyle="dark-content" />
        <FeedHeader />
        <View className="flex-1 items-center justify-center px-6">
          <View className="h-20 w-20 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 size={50} color="#22c55e" />
          </View>
          <Text className="mt-6 text-heading">
            {isEditing ? 'Cập nhật sản phẩm thành công!' : 'Đăng sản phẩm thành công!'}
          </Text>
          <Text className="mt-2 text-center text-body-secondary">
            Sản phẩm của bạn đã được cập nhật/đăng tải thành công.
          </Text>
          <View className="mt-8 w-full gap-3">
            <TouchableOpacity
              className="btn-primary min-h-[54px]"
              activeOpacity={0.9}
              onPress={() => navigation.goBack()}
            >
              <Text className="text-title-primary text-inverse">
                Quay lại trang trước
              </Text>
            </TouchableOpacity>
            {!isEditing && (
              <TouchableOpacity
                className="btn-secondary min-h-[54px]"
                activeOpacity={0.9}
                onPress={resetForm}
              >
                <Text className="text-title-primary">
                  Tạo thêm sản phẩm khác
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const selectedCategoryName = categoriesList.find(opt => String(opt.id) === String(formData.product_category))?.name || 'Chọn danh mục';
  const selectedConditionName = CONDITIONS_LIST.find(opt => String(opt.id) === String(formData.product_type))?.name || 'Mới';
  const selectedCurrencyName = currenciesList.find(
    option =>
      String(option.id) === String(formData.currency) ||
      option.code === String(formData.currency).toUpperCase(),
  )?.name || 'Chọn tiền tệ';

  // MAIN FORM STATE
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: PRODUCT_HEADER_COLOR }}
      edges={['top']}
    >
      <FocusAwareStatusBar barStyle="light-content" backgroundColor={PRODUCT_HEADER_COLOR} />

      {/* Curved Wave Header */}
      <View style={{ backgroundColor: PRODUCT_HEADER_COLOR, paddingTop: 20, paddingBottom: 28, position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleBack}
          style={{ position: 'absolute', right: 20, top: 20, height: 32, width: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
        >
          <X size={18} color="#ffffff" />
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ height: 36, width: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: 'rgba(255, 255, 255, 0.2)', marginRight: 10 }}>
            <ShoppingBag size={18} color="#ffffff" />
          </View>
          <Text style={{ fontSize: 18, fontWeight: '900', color: '#ffffff' }}>
            {isEditing ? 'Cập nhật sản phẩm' : 'Bán sản phẩm mới'}
          </Text>
        </View>

        {/* SVG Wave bottom decoration */}
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 16 }}>
          <Svg height="100%" width="100%" viewBox="0 0 1440 320" preserveAspectRatio="none">
            <Path
              d="M0,160 C480,260 960,260 1440,160 L1440,320 L0,320 Z"
              fill="#ffffff"
            />
          </Svg>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: '#ffffff' }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={{ flex: 1, backgroundColor: '#ffffff' }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 10, paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Tên sản phẩm */}
          <FieldWrapper label="Tên sản phẩm" error={errors.product_title}>
            <TextInput
              style={{ flex: 1, color: '#0f172a', fontSize: 15, fontWeight: '600', height: '100%' }}
              placeholder="Dầu gội dược liệu"
              placeholderTextColor="#94a3b8"
              value={formData.product_title}
              onChangeText={val => updateFormData('product_title', val)}
            />
          </FieldWrapper>

          {/* Giá bán */}
          <FieldWrapper label="Giá bán" error={errors.product_price}>
            <TextInput
              style={{ flex: 1, color: '#0f172a', fontSize: 15, fontWeight: '600', height: '100%' }}
              placeholder="0.00"
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
              value={formData.product_price}
              onChangeText={val => updateFormData('product_price', val)}
            />
          </FieldWrapper>

          {/* Mô tả */}
          <Text
            style={{
              fontSize: 14,
              fontWeight: '800',
              color: '#0f172a',
              marginBottom: 8,
            }}
          >
            Sự mô tả
          </Text>
          <View
            style={{
              minHeight: 120,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: errors.product_description ? '#ef4444' : '#e2e8f0',
              backgroundColor: '#ffffff',
              paddingHorizontal: 16,
              paddingVertical: 12,
              marginBottom: 18,
            }}
          >
            <TextInput
              style={{ flex: 1, color: '#0f172a', fontSize: 15, fontWeight: '600', textAlignVertical: 'top' }}
              placeholder="Vui lòng mô tả sản phẩm của bạn."
              placeholderTextColor="#94a3b8"
              multiline
              value={formData.product_description}
              onChangeText={val => updateFormData('product_description', val)}
            />
          </View>
          {errors.product_description ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: -12, marginBottom: 18 }}>
              <AlertCircle size={14} color="#ef4444" />
              <Text style={{ marginLeft: 6, fontSize: 12, fontWeight: '600', color: '#ef4444' }}>
                {errors.product_description}
              </Text>
            </View>
          ) : null}

          {/* Loại (Category) Bottom Sheet Trigger */}
          <SelectorTrigger
            label="Loại"
            valueLabel={formData.product_category ? selectedCategoryName : undefined}
            placeholder="Chọn danh mục"
            onPress={() => setCategoryModalVisible(true)}
            error={errors.product_category}
          />

          {/* Loại hình (Condition) Bottom Sheet Trigger */}
          <SelectorTrigger
            label="Loại hình"
            valueLabel={selectedConditionName}
            onPress={() => setConditionModalVisible(true)}
          />

          {/* Địa điểm */}
          <View style={{ marginBottom: 18 }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: '800',
                color: '#0f172a',
                marginBottom: 8,
              }}
            >
              Địa điểm
            </Text>
            <AddressAutocomplete
              value={formData.product_location}
              placeholder="Địa điểm"
              onChangeText={handleLocationChange}
              onSelectPlace={handleLocationSelect}
              customInputContainerStyle={{
                minHeight: 52,
                borderRadius: 16,
                borderColor: errors.product_location ? '#ef4444' : '#e2e8f0',
              }}
              customInputStyle={{
                fontSize: 15,
                fontWeight: '600',
              }}
            />
            {errors.product_location ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                <AlertCircle size={14} color="#ef4444" />
                <Text style={{ marginLeft: 6, fontSize: 12, fontWeight: '600', color: '#ef4444' }}>
                  {errors.product_location}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Tiền tệ Bottom Sheet Trigger */}
          <SelectorTrigger
            label="Tiền tệ"
            valueLabel={selectedCurrencyName}
            onPress={() => setCurrencyModalVisible(true)}
          />

          {/* Tổng số đơn vị mặt hàng */}
          <FieldWrapper label="Tổng số đơn vị mặt hàng" error={errors.units}>
            <TextInput
              style={{ flex: 1, color: '#0f172a', fontSize: 15, fontWeight: '600', height: '100%' }}
              placeholder="Số lượng khả dụng"
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
              value={formData.units !== undefined ? String(formData.units) : ''}
              onChangeText={val => updateFormData('units', val ? parseInt(val, 10) : undefined)}
            />
          </FieldWrapper>

          {/* Hình ảnh */}
          <Text
            style={{
              fontSize: 14,
              fontWeight: '800',
              color: '#0f172a',
              marginBottom: 12,
            }}
          >
            Hình ảnh
          </Text>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
            {formData.images.map((image, idx) => (
              <View key={idx} style={{ position: 'relative' }}>
                <Image
                  source={{ uri: image.uri }}
                  style={{ width: 88, height: 88, borderRadius: 16 }}
                  resizeMode="cover"
                />
                <TouchableOpacity
                  onPress={() => handleRemoveImage(idx)}
                  style={{
                    position: 'absolute',
                    top: -6,
                    right: -6,
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    backgroundColor: '#ef4444',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1.5,
                    borderColor: '#ffffff',
                  }}
                >
                  <X size={12} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity
              onPress={handleAddImage}
              activeOpacity={0.8}
              style={{
                width: 88,
                height: 88,
                borderRadius: 16,
                backgroundColor: '#f1f5f9',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ImagePlus size={24} color="#64748b" />
            </TouchableOpacity>
          </View>
          {errors.images ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: -6, marginBottom: 18 }}>
              <AlertCircle size={14} color="#ef4444" />
              <Text style={{ marginLeft: 6, fontSize: 12, fontWeight: '600', color: '#ef4444' }}>
                {errors.images}
              </Text>
            </View>
          ) : null}

          {/* Hộp lỗi submit */}
          {submitError ? (
            <View style={{ borderRadius: 16, backgroundColor: '#fef2f2', paddingHorizontal: 16, paddingVertical: 12, marginBottom: 16 }}>
              <Text style={{ textAlign: 'center', fontSize: 13, fontWeight: '600', color: '#ef4444' }}>{submitError}</Text>
            </View>
          ) : null}
        </ScrollView>

        {/* Nút bấm Submit cố định ở dưới */}
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: '#ffffff',
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: Platform.OS === 'ios' ? 28 : 16,
            borderTopWidth: 1,
            borderTopColor: '#f1f5f9',
            flexDirection: 'row',
            gap: 12,
          }}
        >
          <TouchableOpacity
            onPress={handleBack}
            disabled={isLoading}
            activeOpacity={0.8}
            style={{
              flex: 1,
              minHeight: 52,
              borderRadius: 26,
              borderWidth: 1,
              borderColor: '#e2e8f0',
              backgroundColor: '#ffffff',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: '#64748b', fontSize: 15, fontWeight: '700' }}>
              {isVi ? 'Quay lại' : 'Back'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={submitProduct}
            disabled={isLoading}
            activeOpacity={0.8}
            style={{
              flex: 2,
              minHeight: 52,
              borderRadius: 26,
              backgroundColor: APP_BRAND_COLOR,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: isLoading ? 0.6 : 1,
            }}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '900' }}>
                {isEditing ? (isVi ? 'Cập nhật' : 'Update') : (isVi ? 'Đăng sản phẩm' : 'Publish')}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Categories Bottom Sheet */}
      <BottomSheetSelector
        visible={categoryModalVisible}
        title="Chọn danh mục"
        options={categoriesList}
        selectedValue={formData.product_category}
        onSelect={(val) => updateFormData('product_category', val)}
        onClose={() => setCategoryModalVisible(false)}
      />

      {/* Conditions Bottom Sheet */}
      <BottomSheetSelector
        visible={conditionModalVisible}
        title="Chọn tình trạng"
        options={CONDITIONS_LIST}
        selectedValue={formData.product_type}
        onSelect={(val) => updateFormData('product_type', Number(val))}
        onClose={() => setConditionModalVisible(false)}
      />

      {/* Currencies Bottom Sheet */}
      <BottomSheetSelector
        visible={currencyModalVisible}
        title="Chọn tiền tệ"
        options={currenciesList}
        selectedValue={formData.currency}
        onSelect={(val) => updateFormData('currency', val)}
        onClose={() => setCurrencyModalVisible(false)}
      />
    </SafeAreaView>
  );
}

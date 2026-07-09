// Description: Renders the VNSEEA single-page create/edit product form.
import React, { useCallback } from 'react';
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
} from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useProductViewModel } from '../../application/view-models/useProductViewModel';
import type { ProductFormData } from '../../application/view-models/useProductViewModel';
import { ROUTES } from '../../../navigation/constants/routes';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import { FeedHeader } from '../../../feed/presentation/components/FeedHeader';

type CreateProductNav = NativeStackNavigationProp<RootStackParamList>;

type RootStackParamList = {
  Feed: undefined;
  [key: string]: undefined;
};

interface StepOption {
  id: string;
  name: string;
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

// Reusable custom layout components for the premium single-page form
function OptionPill({
  label,
  selected,
  onPress,
  icon,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 99,
        borderWidth: 1,
        borderColor: selected ? '#0000FF' : '#e2e8f0',
        backgroundColor: selected ? '#eef2ff' : '#ffffff',
        marginRight: 8,
        marginBottom: 8,
      }}
    >
      {icon ? <View style={{ marginRight: 6 }}>{icon}</View> : null}
      <Text
        style={{
          fontSize: 13,
          fontWeight: '700',
          color: selected ? '#0000FF' : '#475569',
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function FormCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View
      style={{
        backgroundColor: '#ffffff',
        borderRadius: 24,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.02,
        shadowRadius: 8,
        elevation: 2,
      }}
    >
      <Text
        style={{
          fontSize: 15,
          fontWeight: '800',
          color: '#0f172a',
          marginBottom: 16,
        }}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

function FieldWrapper({
  label,
  error,
  children,
  icon,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text
        style={{
          fontSize: 13,
          fontWeight: '700',
          color: '#475569',
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
          backgroundColor: '#f8fafc',
          paddingHorizontal: 16,
        }}
      >
        {icon ? <View style={{ marginRight: 10 }}>{icon}</View> : null}
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

const getCategoryIcon = (id: string, selected: boolean) => {
  const color = selected ? '#0000FF' : '#64748B';
  switch (id) {
    case '1': return <Laptop size={16} color={color} />;
    case '2':
    case '3': return <Shirt size={16} color={color} />;
    case '4': return <Heart size={16} color={color} />;
    case '5': return <Utensils size={16} color={color} />;
    case '6': return <Sparkles size={16} color={color} />;
    case '7': return <Target size={16} color={color} />;
    case '8': return <GraduationCap size={16} color={color} />;
    default: return <Package size={16} color={color} />;
  }
};

export default function CreateProductScreen() {
  const navigation = useNavigation<CreateProductNav>();
  const route = useRoute<any>();
  const editingProduct = route.params?.product;

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

  const handleBack = useCallback(() => {
    Alert.alert(
      isEditing ? 'Hủy chỉnh sửa' : 'Hủy tạo sản phẩm',
      'Bạn có chắc muốn hủy? Thông tin đã nhập sẽ không được lưu.',
      [
        { text: 'Không', style: 'cancel' },
        { text: 'Có', style: 'destructive', onPress: () => navigation.goBack() },
      ],
    );
  }, [navigation, isEditing]);

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

  // SUCCESS STATE - Conditional JSX return AFTER all hooks
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

  // MAIN FORM STATE
  return (
    <SafeAreaView className="flex-1 surface-base" edges={['top']}>
      <FocusAwareStatusBar barStyle="dark-content" />
      <FeedHeader />

      {/* Header Bar */}
      <View
        style={{
          height: 64,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          backgroundColor: '#ffffff',
          borderBottomWidth: 1,
          borderBottomColor: '#f1f5f9',
        }}
      >
        <TouchableOpacity
          onPress={handleBack}
          activeOpacity={0.7}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: '#ffffff',
            borderWidth: 1,
            borderColor: '#f1f5f9',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.04,
            shadowRadius: 4,
            elevation: 2,
          }}
        >
          <ArrowLeft size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text
          style={{
            fontSize: 18,
            fontWeight: '800',
            color: '#0f172a',
            flex: 1,
          }}
          numberOfLines={1}
        >
          {isEditing ? 'Sửa sản phẩm' : 'Tạo sản phẩm mới'}
        </Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={{ flex: 1, backgroundColor: '#f8fafc' }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 20, paddingBottom: 100 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Card 1: Thông tin cơ bản */}
          <FormCard title="Thông tin cơ bản">
             {/* Tên sản phẩm */}
             <FieldWrapper label="Tên sản phẩm" error={errors.product_title} icon={<Package size={20} color="#64748b" />}>
               <TextInput
                 style={{ flex: 1, color: '#0f172a', fontSize: 15, fontWeight: '600' }}
                 placeholder="Nhập tên sản phẩm"
                 placeholderTextColor="#94a3b8"
                 value={formData.product_title}
                 onChangeText={val => updateFormData('product_title', val)}
               />
             </FieldWrapper>

             {/* Giá & Tiền tệ */}
             <View style={{ flexDirection: 'row', gap: 12 }}>
               <View style={{ flex: 1.2 }}>
                 <FieldWrapper label="Giá sản phẩm (VND)" error={errors.product_price} icon={<DollarSign size={20} color="#64748b" />}>
                   <TextInput
                     style={{ flex: 1, color: '#0f172a', fontSize: 15, fontWeight: '600' }}
                     placeholder="0"
                     placeholderTextColor="#94a3b8"
                     keyboardType="numeric"
                     value={formData.product_price}
                     onChangeText={val => updateFormData('product_price', val)}
                   />
                 </FieldWrapper>
               </View>

               <View style={{ flex: 0.8 }}>
                 <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 8 }}>
                   Tiền tệ
                 </Text>
                 <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                   {['VNSEEA', 'USD', 'EUR'].map(curr => {
                     const isCurrSelected = formData.currency === curr;
                     return (
                       <TouchableOpacity
                         key={curr}
                         onPress={() => updateFormData('currency', curr)}
                         style={{
                           paddingHorizontal: 10,
                           paddingVertical: 8,
                           borderRadius: 12,
                           borderWidth: 1,
                           borderColor: isCurrSelected ? '#0000FF' : '#e2e8f0',
                           backgroundColor: isCurrSelected ? '#eef2ff' : '#ffffff',
                           marginRight: 4,
                           marginBottom: 6,
                         }}
                       >
                         <Text style={{ fontSize: 11, fontWeight: '700', color: isCurrSelected ? '#0000FF' : '#475569' }}>
                           {curr}
                         </Text>
                       </TouchableOpacity>
                     );
                   })}
                 </View>
               </View>
             </View>

             {/* Số lượng */}
             <FieldWrapper label="Tổng số lượng đơn vị" error={errors.units}>
               <TextInput
                 style={{ flex: 1, color: '#0f172a', fontSize: 15, fontWeight: '600' }}
                 placeholder="Nhập số lượng (vd: 100)"
                 placeholderTextColor="#94a3b8"
                 keyboardType="numeric"
                 value={formData.units !== undefined ? String(formData.units) : ''}
                 onChangeText={val => updateFormData('units', val ? parseInt(val, 10) : undefined)}
               />
             </FieldWrapper>
          </FormCard>

          {/* Card 2: Phân loại & Vị trí */}
          <FormCard title="Phân loại & Địa điểm">
             {/* Danh mục */}
             <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 8 }}>
               Chọn danh mục
             </Text>
             <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 }}>
               {steps[3].options?.map(option => {
                 const isSel = formData.product_category === option.id;
                 return (
                   <OptionPill
                     key={option.id}
                     label={option.name}
                     selected={isSel}
                     onPress={() => updateFormData('product_category', option.id)}
                     icon={getCategoryIcon(option.id, isSel)}
                   />
                 );
               })}
             </View>
             {errors.product_category ? (
               <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: -6, marginBottom: 12 }}>
                 <AlertCircle size={14} color="#ef4444" />
                 <Text style={{ marginLeft: 6, fontSize: 12, fontWeight: '600', color: '#ef4444' }}>
                   {errors.product_category}
                 </Text>
               </View>
             ) : null}

             {/* Tình trạng */}
             <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 8 }}>
               Tình trạng sản phẩm
             </Text>
             <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 }}>
               {steps[5].options?.map(option => {
                 const isSel = String(formData.product_type) === option.id;
                 return (
                   <OptionPill
                     key={option.id}
                     label={option.name}
                     selected={isSel}
                     onPress={() => updateFormData('product_type', parseInt(option.id, 10))}
                   />
                 );
               })}
             </View>

             {/* Vị trí */}
             <FieldWrapper label="Địa điểm (Tỉnh/Thành phố)" error={errors.product_location} icon={<MapPin size={20} color="#64748b" />}>
               <TextInput
                 style={{ flex: 1, color: '#0f172a', fontSize: 15, fontWeight: '600' }}
                 placeholder="Chọn hoặc nhập tỉnh/thành phố"
                 placeholderTextColor="#94a3b8"
                 value={formData.product_location}
                 onChangeText={val => updateFormData('product_location', val)}
               />
             </FieldWrapper>
          </FormCard>

          {/* Card 3: Mô tả */}
          <FormCard title="Mô tả sản phẩm">
             <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 8 }}>
               Mô tả chi tiết
             </Text>
             <View
               style={{
                 minHeight: 120,
                 borderRadius: 16,
                 borderWidth: 1,
                 borderColor: errors.product_description ? '#ef4444' : '#e2e8f0',
                 backgroundColor: '#f8fafc',
                 paddingHorizontal: 16,
                 paddingVertical: 12,
               }}
             >
               <TextInput
                 style={{ flex: 1, color: '#0f172a', fontSize: 15, fontWeight: '600', textAlignVertical: 'top' }}
                 placeholder="Nhập mô tả chi tiết về sản phẩm của bạn..."
                 placeholderTextColor="#94a3b8"
                 multiline
                 value={formData.product_description}
                 onChangeText={val => updateFormData('product_description', val)}
               />
             </View>
             {errors.product_description ? (
               <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                 <AlertCircle size={14} color="#ef4444" />
                 <Text style={{ marginLeft: 6, fontSize: 12, fontWeight: '600', color: '#ef4444' }}>
                   {errors.product_description}
                 </Text>
               </View>
             ) : null}
          </FormCard>

          {/* Card 4: Hình ảnh */}
          <FormCard title="Hình ảnh sản phẩm">
             {formData.images.length > 0 && (
               <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
                 {formData.images.map((image, idx) => (
                   <View key={idx} style={{ position: 'relative' }}>
                     <Image
                       source={{ uri: image.uri }}
                       style={{ width: 80, height: 80, borderRadius: 16 }}
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
               </View>
             )}

             <TouchableOpacity
               onPress={handleAddImage}
               activeOpacity={0.8}
               style={{
                 minHeight: 120,
                 borderRadius: 16,
                 borderWidth: 1,
                 borderStyle: 'dashed',
                 borderColor: '#0000FF',
                 backgroundColor: '#f8fafc',
                 alignItems: 'center',
                 justifyContent: 'center',
                 padding: 16,
               }}
             >
               <ImagePlus size={36} color="#0000FF" />
               <Text style={{ marginTop: 8, fontSize: 14, fontWeight: '700', color: '#0000FF' }}>
                 Chọn hình ảnh
               </Text>
               <Text style={{ marginTop: 4, fontSize: 11, fontWeight: '500', color: '#64748b' }}>
                 JPG, PNG hoặc ảnh chụp trực tiếp từ thiết bị
               </Text>
             </TouchableOpacity>
             {errors.images ? (
               <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                 <AlertCircle size={14} color="#ef4444" />
                 <Text style={{ marginLeft: 6, fontSize: 12, fontWeight: '600', color: '#ef4444' }}>
                   {errors.images}
                 </Text>
               </View>
             ) : null}
          </FormCard>

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
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: Platform.OS === 'ios' ? 24 : 16,
            borderTopWidth: 1,
            borderTopColor: '#f1f5f9',
          }}
        >
          <TouchableOpacity
            onPress={submitProduct}
            disabled={isLoading}
            activeOpacity={0.8}
            style={{
              minHeight: 52,
              borderRadius: 99,
              backgroundColor: '#0000FF',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: isLoading ? 0.6 : 1,
            }}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '800' }}>
                {isEditing ? 'Cập nhật sản phẩm' : 'Đăng sản phẩm'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

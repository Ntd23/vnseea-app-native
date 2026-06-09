// Description: Renders the VNSEEA create page wizard and submits to WoWonder API.
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ArrowLeft,
  ArrowRight,
  AtSign,
  CheckCircle2,
  Edit3,
  FileText,
  Info,
  Shapes,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../../../navigation/types';
import AddressAutocomplete from '../../../shared-kernel/presentation/components/AddressAutocomplete';
import { apiConfig } from '../../../shared-kernel/infrastructure/config/env';
import { usePagesViewModel } from '../../application/view-models/usePagesViewModel';
import type {
  CreatePageDraft,
  PagesItem,
} from '../../domain/types/pages.types';

type CreatePageNav = NativeStackNavigationProp<RootStackParamList>;

type PageCategory = {
  id: string;
  label: string;
};

const PAGE_NAME_IMAGE =
  'https://lh3.googleusercontent.com/aida/ADBb0uh_7Hk2tZCJt_ZuSsmInEFIKcYkz_I_p1kiGHq0GazO9hqsIvzmyq5Wr9x0B1Qdov7k0AbFSs9RbfDPS7pV0l6H8F7Z-Yiqx03wvB9nNiJBvp9MxkAKieDmqOpkzzFSr8wSdGKiHddzN0mXES5-t-vCUBIC3WTWgZuCHehFVRfvKen58-5_QxROCtcOBTRP85jB2W81AXDNWDJpipz5TWEe28e2OQYBoTtFU94UQEoFhLhd-gG6VejH2YA4smY6HQRD3hI41wxKgA';

const USERNAME_IMAGE =
  'https://lh3.googleusercontent.com/aida/ADBb0uiZYLVyhHMWBGl31l47zy6o50IcsCudsMqHtBURRfDkgWuIX2dYl5EklJFpVQcWhSFNjF0nH7Wm2REahIL78NP8DpoCxJJaVUysUWa6ZsLYhkWo24lecvemew1n39kv9V1ykP4iUWk-fxMWUwMkZXmJeHx_RDqyCQYrlzItfXhBxRQqIWhACFW9OVo4-PzIk91imqqQabP1O0LK8Fl34QytlWtslif_JQoF-sKOToVYoj4oX1ev8_ctBrbFCpHjI8Udmm_P5gkr';

const PAGE_CATEGORIES: PageCategory[] = [
  { id: '1', label: 'Xe cộ' },
  { id: '2', label: 'Hài hước' },
  { id: '3', label: 'Kinh tế' },
  { id: '4', label: 'Giáo dục' },
  { id: '5', label: 'Giải trí' },
  { id: '6', label: 'Phim ảnh' },
  { id: '7', label: 'Công nghệ' },
  { id: '8', label: 'Ẩm thực' },
  { id: '9', label: 'Du lịch' },
  { id: '10', label: 'Thời trang' },
  { id: '11', label: 'Thể thao' },
];

const INITIAL_DRAFT: CreatePageDraft = {
  pageTitle: '',
  pageName: '',
  pageDescription: '',
  pageAddress: '',
  pageCategory: PAGE_CATEGORIES[0].id,
  mapPinRequested: false,
  mapPinStatus: 'none',
};

const PAGE_URL_PREFIX = `${apiConfig.webBaseUrl.replace(/\/$/, '')}/`;

function toSafePageName(value: string) {
  return value
    .replace(/\u0111/g, 'd')
    .replace(/\u0110/g, 'D')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/^@+/, '')
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/_+/g, '_')
    .replace(/^[-_]+|[-_]+$/g, '')
    .slice(0, 32);
}

function ProgressBar({ step }: { step: number }) {
  return (
    <View className="mb-8 flex-row gap-1">
      {[1, 2, 3, 4].map(item => (
        <View key={item} className="progress-track flex-1 overflow-hidden">
          {item <= step ? <View className="progress-fill flex-1" /> : null}
        </View>
      ))}
    </View>
  );
}

function WizardHeader({
  step,
  raised = false,
  onBack,
  title = 'Tạo trang mới',
}: {
  step: number;
  raised?: boolean;
  onBack: () => void;
  title?: string;
}) {
  return (
    <View
      className={`surface-brand flex-row items-center justify-between px-4 ${
        raised ? 'h-36 pb-10 pt-8' : 'h-16'
      }`}
    >
      <View className="flex-row items-center">
        <TouchableOpacity
          className="mr-3 h-10 w-10 items-center justify-center rounded-full"
          activeOpacity={0.8}
          onPress={onBack}
        >
          <ArrowLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text className="text-heading text-inverse">{title}</Text>
      </View>
      <Text className="text-label-primary text-inverse opacity-80">
        BƯỚC {step}/4
      </Text>
    </View>
  );
}

function NextButton({
  onPress,
  label = 'Tiếp tục',
  disabled = false,
  isLoading = false,
}: {
  onPress: () => void;
  label?: string;
  disabled?: boolean;
  isLoading?: boolean;
}) {
  return (
    <TouchableOpacity
      className={`btn-primary min-h-[54px] ${disabled ? 'opacity-60' : ''}`}
      activeOpacity={0.9}
      disabled={disabled}
      onPress={onPress}
    >
      {isLoading ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <>
          <Text className="text-title-primary text-inverse">{label}</Text>
          <ArrowRight size={20} color="#FFFFFF" />
        </>
      )}
    </TouchableOpacity>
  );
}

function ErrorMessage({ message }: { message?: string | null }) {
  if (!message) {
    return null;
  }

  return (
    <View className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
      <Text className="text-caption-primary text-red-600">{message}</Text>
    </View>
  );
}

function StepOne({
  value,
  error,
  onChange,
  onNext,
}: {
  value: string;
  error?: string | null;
  onChange: (value: string) => void;
  onNext: () => void;
}) {
  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="flex-grow px-6 py-8"
      keyboardShouldPersistTaps="handled"
    >
      <ProgressBar step={1} />

      <View className="mb-10 items-center">
        <Text className="text-center text-display">Đặt tên trang của bạn</Text>
        <Text className="mt-3 max-w-sm text-center text-body-secondary">
          Tên trang nên phản ánh thương hiệu, tổ chức hoặc chủ đề bạn muốn chia
          sẻ với cộng đồng.
        </Text>
      </View>

      <View className="surface-panel px-5 py-6">
        <Text className="mb-3 text-title-primary">Tên trang</Text>
        <View className="input-shell min-h-[54px] flex-row items-center px-4">
          <TextInput
            className="flex-1 text-body-primary"
            placeholder="Tên trang"
            placeholderTextColor="#94A3B8"
            returnKeyType="next"
            value={value}
            onChangeText={onChange}
            onSubmitEditing={onNext}
          />
          <Edit3 size={20} color="#94A3B8" />
        </View>
        <Text className="mt-4 text-caption-secondary">
          Ví dụ: Quán Cà Phê VNSEEA, Cộng đồng Designer Việt Nam
        </Text>
        <ErrorMessage message={error} />
      </View>

      <View className="preview-panel mt-8 flex-row items-center p-5">
        <View className="mr-4 h-20 w-20 overflow-hidden rounded-full border-4 border-white">
          <Image
            source={{ uri: PAGE_NAME_IMAGE }}
            className="h-full w-full"
            resizeMode="cover"
          />
        </View>
        <View className="flex-1">
          <Text className="text-title-primary">Xem trước trang</Text>
          <Text className="mt-1 text-caption-secondary">
            Đây là cách tên trang của bạn sẽ hiển thị với mọi người trên ứng
            dụng.
          </Text>
        </View>
      </View>

      <View className="mt-auto pt-12">
        <NextButton onPress={onNext} />
      </View>
    </ScrollView>
  );
}

function StepTwo({
  value,
  error,
  onChange,
  onNext,
}: {
  value: string;
  error?: string | null;
  onChange: (value: string) => void;
  onNext: () => void;
}) {
  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="flex-grow px-6 py-8"
      keyboardShouldPersistTaps="handled"
    >
      <ProgressBar step={2} />

      <View className="mb-8 h-40 overflow-hidden rounded-2xl surface-card">
        <Image
          source={{ uri: USERNAME_IMAGE }}
          className="h-full w-full"
          resizeMode="cover"
        />
      </View>

      <View className="mb-8">
        <Text className="text-display">Đặt URL cho trang</Text>
        <Text className="mt-2 text-body-secondary">
          URL giúp mọi người dễ dàng tìm thấy trang của bạn trong kết quả tìm
          kiếm và khi chia sẻ liên kết.
        </Text>
      </View>

      <View className="flex-1">
        <Text className="mb-2 ml-1 text-title-primary">Trang URL</Text>
        <View className="input-shell min-h-[54px] flex-row items-center px-4">
          <AtSign size={18} color="#64748B" />
          <View className="ml-2 mr-3 max-w-[155px] border-r border-slate-200 pr-3">
            <Text className="text-caption-secondary" numberOfLines={1}>
              {PAGE_URL_PREFIX}
            </Text>
          </View>
          <TextInput
            className="flex-1 text-body-primary"
            placeholder="tentrangcuaban"
            placeholderTextColor="#94A3B8"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            value={value}
            onChangeText={text => onChange(toSafePageName(text))}
            onSubmitEditing={onNext}
          />
        </View>
        <Text className="mt-2 px-1 text-caption-secondary" numberOfLines={1}>
          Link trang: {PAGE_URL_PREFIX}
          {value || 'tentrangcuaban'}
        </Text>
        <Text className="mt-1 px-1 text-caption-secondary">
          Tên URL dài 5-32 ký tự và chỉ gồm chữ cái không dấu.
        </Text>
        <ErrorMessage message={error} />
      </View>

      <View className="mt-12 pt-6">
        <NextButton onPress={onNext} />
        <Text className="mt-4 text-center text-label-secondary">
          VNSEEA PROFESSIONAL
        </Text>
      </View>
    </ScrollView>
  );
}

function StepThree({
  descriptionValue,
  addressValue,
  mapPinRequested,
  mapPinStatus,
  error,
  onDescriptionChange,
  onAddressChange,
  onPlaceSelect,
  onMapPinRequestedChange,
  onNext,
}: {
  descriptionValue: string;
  addressValue: string;
  mapPinRequested?: boolean;
  mapPinStatus?: string;
  error?: string | null;
  onDescriptionChange: (value: string) => void;
  onAddressChange: (value: string) => void;
  onPlaceSelect: (place: {
    description: string;
    placeId: string;
    lat?: number;
    lng?: number;
  }) => void;
  onMapPinRequestedChange: (value: boolean) => void;
  onNext: () => void;
}) {
  const pinStatusLabel =
    mapPinStatus === 'approved'
      ? 'Đã duyệt'
      : mapPinStatus === 'pending'
      ? 'Đang chờ duyệt'
      : mapPinRequested
      ? 'Sẽ gửi duyệt'
      : 'Chưa yêu cầu ghim';

  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="flex-grow px-6 py-8"
      keyboardShouldPersistTaps="handled"
    >
      <ProgressBar step={3} />

      <View className="surface-panel px-5 py-6">
        <View className="items-center">
          <View className="icon-chip h-20 w-20 items-center justify-center">
            <FileText size={38} color="#0000FF" />
          </View>
          <Text className="mt-5 text-center text-display">Thông tin trang</Text>
          <Text className="mt-2 text-center text-body-secondary">
            Thêm mô tả và địa điểm để trang hiển thị đầy đủ như phiên bản web.
          </Text>
        </View>

        <Text className="mt-6 text-title-primary">Mô tả trang</Text>
        <View className="input-shell mt-3 min-h-[150px] px-4 py-3">
          <TextInput
            className="flex-1 text-body-primary"
            placeholder="Viết vài dòng giới thiệu về trang..."
            placeholderTextColor="#94A3B8"
            multiline
            textAlignVertical="top"
            value={descriptionValue}
            onChangeText={onDescriptionChange}
            maxLength={200}
          />
        </View>
        <View className="mt-2 flex-row justify-between px-1">
          <Text className="text-caption-secondary">
            Tối thiểu 10, tối đa 200 ký tự
          </Text>
          <Text className="text-caption-secondary">
            {descriptionValue.length}/200
          </Text>
        </View>

        <Text className="mt-6 text-title-primary">Địa điểm</Text>
        <View className="mt-3">
          <AddressAutocomplete
            value={addressValue}
            placeholder="Tìm địa điểm từ Google Maps"
            onChangeText={onAddressChange}
            onSelectPlace={onPlaceSelect}
          />
        </View>
        <TouchableOpacity
          activeOpacity={0.86}
          className="mt-4 flex-row items-start rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4"
          onPress={() => onMapPinRequestedChange(!mapPinRequested)}
        >
          <View
            className={`mt-1 h-5 w-5 items-center justify-center rounded-md border ${
              mapPinRequested
                ? 'border-blue-600 bg-blue-600'
                : 'border-slate-300 bg-white'
            }`}
          >
            {mapPinRequested ? (
              <CheckCircle2 size={14} color="#FFFFFF" />
            ) : null}
          </View>
          <View className="ml-3 flex-1 pr-2">
            <Text className="text-title-primary">Yêu cầu ghim trên bản đồ</Text>
            <Text className="mt-1 text-body-secondary">
              Admin sẽ duyệt trước khi tên trang hiển thị trực tiếp trên bản đồ
              tìm kiếm gần đây.
            </Text>
          </View>
          <View className="max-w-[118px] rounded-full bg-blue-50 px-3 py-2">
            <Text
              className="text-center text-xs font-extrabold text-blue-700"
              numberOfLines={2}
            >
              {pinStatusLabel}
            </Text>
          </View>
        </TouchableOpacity>
        <ErrorMessage message={error} />
      </View>

      <View className="mt-auto pt-12">
        <NextButton onPress={onNext} />
      </View>
    </ScrollView>
  );
}

function StepFour({
  selectedId,
  error,
  isCreating,
  submitLabel = 'Tạo trang',
  onSelect,
  onSubmit,
}: {
  selectedId: string;
  error?: string | null;
  isCreating: boolean;
  submitLabel?: string;
  onSelect: (categoryId: string) => void;
  onSubmit: () => void;
}) {
  return (
    <View className="flex-1">
      <View className="-mt-6 flex-1 px-4">
        <View className="surface-panel flex-1 px-5 py-6">
          <View className="items-center">
            <View className="icon-chip h-24 w-24 items-center justify-center">
              <Shapes size={48} color="#0000FF" />
            </View>
          </View>

          <View className="mt-5 items-center">
            <Text className="text-display">Chọn danh mục</Text>
            <Text className="mt-2 text-center text-body-secondary">
              Chọn danh mục phù hợp nhất để mọi người dễ dàng tìm thấy trang của
              bạn.
            </Text>
          </View>

          <ScrollView
            className="mt-6"
            contentContainerClassName="flex-row flex-wrap gap-3 pb-4"
            keyboardShouldPersistTaps="handled"
          >
            {PAGE_CATEGORIES.map(category => {
              const active = selectedId === category.id;

              return (
                <TouchableOpacity
                  key={category.id}
                  className={`min-h-[38px] flex-row items-center px-4 ${
                    active ? 'category-chip-active' : 'category-chip'
                  }`}
                  activeOpacity={0.85}
                  onPress={() => onSelect(category.id)}
                >
                  {active ? <CheckCircle2 size={17} color="#FFFFFF" /> : null}
                  <Text
                    className={`text-title-primary ${
                      active ? 'ml-2 text-inverse' : ''
                    }`}
                  >
                    {category.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View className="form-note-panel mt-4 flex-row items-start p-4">
            <Info size={20} color="#64748B" />
            <Text className="ml-3 flex-1 text-caption-secondary">
              Trang của bạn sẽ hiển thị trong kết quả tìm kiếm dựa trên danh mục
              này. Bạn có thể thay đổi danh mục sau trong phần cài đặt trang.
            </Text>
          </View>
          <ErrorMessage message={error} />
        </View>
      </View>

      <View className="px-6 py-6">
        <NextButton
          label={submitLabel}
          isLoading={isCreating}
          disabled={isCreating}
          onPress={onSubmit}
        />
        <Text className="mt-4 text-center text-label-secondary">
          WOWONDER SOCIAL NETWORK
        </Text>
      </View>
    </View>
  );
}

function CreatePageScreen() {
  const navigation = useNavigation<CreatePageNav>();
  const route = useRoute<any>();
  const editingPage = route.params?.page as PagesItem | undefined;
  const isEditing = Boolean(editingPage?.pageId);
  const pagesVm = usePagesViewModel();
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<CreatePageDraft>(() =>
    editingPage
      ? {
          pageTitle: editingPage.pageTitle || '',
          pageName: editingPage.pageName || '',
          pageDescription: editingPage.pageDescription || '',
          pageAddress: editingPage.address || '',
          pageCategory: editingPage.pageCategory || PAGE_CATEGORIES[0].id,
          placeId: editingPage.placeId,
          lat: editingPage.lat,
          lng: editingPage.lng,
          mapPinStatus: editingPage.mapPinStatus || 'none',
          mapPinRequested:
            editingPage.mapPinRequested ||
            editingPage.mapPinStatus === 'pending' ||
            editingPage.mapPinStatus === 'approved',
        }
      : INITIAL_DRAFT,
  );
  const [localError, setLocalError] = useState<string | null>(null);
  const [isPageNameDirty, setIsPageNameDirty] = useState(false);

  const currentError = localError || pagesVm.error;
  const headerRaised = step === 4;

  const updateDraft = useCallback(
    <TKey extends keyof CreatePageDraft>(
      key: TKey,
      value: CreatePageDraft[TKey],
    ) => {
      setDraft(prev => ({ ...prev, [key]: value }));
      setLocalError(null);
      pagesVm.clearError();
    },
    [pagesVm],
  );

  const handleTitleChange = useCallback(
    (value: string) => {
      setDraft(prev => ({
        ...prev,
        pageTitle: value,
        pageName: isPageNameDirty ? prev.pageName : toSafePageName(value),
      }));
      setLocalError(null);
      pagesVm.clearError();
    },
    [isPageNameDirty, pagesVm],
  );

  const handlePageNameChange = useCallback(
    (value: string) => {
      setIsPageNameDirty(true);
      updateDraft('pageName', value);
    },
    [updateDraft],
  );

  const handleAddressChange = useCallback(
    (value: string) => {
      setDraft(prev => ({
        ...prev,
        pageAddress: value,
        placeId: undefined,
        lat: undefined,
        lng: undefined,
      }));
      setLocalError(null);
      pagesVm.clearError();
    },
    [pagesVm],
  );

  const validateStep = useCallback(
    (targetStep: number) => {
      if (targetStep === 1 && draft.pageTitle.trim().length < 2) {
        return 'Vui lòng nhập tên trang ít nhất 2 ký tự.';
      }

      if (targetStep === 2) {
        const pageName = draft.pageName.trim();
        if (pageName.length < 5 || pageName.length > 32) {
          return 'Tên URL của trang phải từ 5 đến 32 ký tự.';
        }

        if (!/^[a-z0-9_-]+$/.test(pageName)) {
          return 'Tên URL chỉ được dùng chữ cái không dấu, số, gạch dưới hoặc gạch ngang.';
        }
      }

      if (targetStep === 3) {
        const descriptionLength = draft.pageDescription.trim().length;
        if (descriptionLength < 10 || descriptionLength > 200) {
          return 'Mô tả trang phải từ 10 đến 200 ký tự.';
        }

        if (!draft.pageAddress.trim()) {
          return 'Vui lòng nhập địa điểm của trang.';
        }

        if (
          !draft.placeId ||
          draft.lat === undefined ||
          draft.lng === undefined
        ) {
          return 'Vui lòng chọn địa điểm từ gợi ý Google Maps.';
        }
      }

      if (targetStep === 4 && !draft.pageCategory) {
        return 'Vui lòng chọn danh mục cho trang.';
      }

      return null;
    },
    [draft],
  );

  const goNext = useCallback(() => {
    const error = validateStep(step);
    if (error) {
      setLocalError(error);
      return;
    }

    setLocalError(null);
    pagesVm.clearError();
    setStep(value => Math.min(value + 1, 4));
  }, [pagesVm, step, validateStep]);

  const handleSubmit = useCallback(async () => {
    const error = validateStep(4);
    if (error) {
      setLocalError(error);
      return;
    }

    setLocalError(null);

    try {
      const savedPage =
        isEditing && editingPage?.pageId
          ? await pagesVm.updatePage(editingPage.pageId, draft)
          : await pagesVm.createPage(draft);
      if (!savedPage) {
        return;
      }

      Alert.alert(
        isEditing ? 'Cập nhật trang thành công' : 'Tạo trang thành công',
        `Trang ${savedPage.pageTitle || draft.pageTitle} đã được ${
          isEditing ? 'cập nhật' : 'tạo'
        }.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Vui lòng kiểm tra thông tin và thử lại.';
      Alert.alert(
        isEditing ? 'Không thể cập nhật trang' : 'Không thể tạo trang',
        message,
      );
    }
  }, [
    draft,
    editingPage?.pageId,
    isEditing,
    navigation,
    pagesVm,
    validateStep,
  ]);

  const content = useMemo(() => {
    if (step === 1) {
      return (
        <StepOne
          value={draft.pageTitle}
          error={currentError}
          onChange={handleTitleChange}
          onNext={goNext}
        />
      );
    }

    if (step === 2) {
      return (
        <StepTwo
          value={draft.pageName}
          error={currentError}
          onChange={handlePageNameChange}
          onNext={goNext}
        />
      );
    }

    if (step === 3) {
      return (
        <StepThree
          descriptionValue={draft.pageDescription}
          addressValue={draft.pageAddress}
          mapPinRequested={draft.mapPinRequested}
          mapPinStatus={draft.mapPinStatus}
          error={currentError}
          onDescriptionChange={value => updateDraft('pageDescription', value)}
          onAddressChange={handleAddressChange}
          onPlaceSelect={place => {
            updateDraft('pageAddress', place.description);
            updateDraft('placeId', place.placeId);
            updateDraft('lat', place.lat);
            updateDraft('lng', place.lng);
          }}
          onMapPinRequestedChange={value => {
            updateDraft('mapPinRequested', value);
            updateDraft(
              'mapPinStatus',
              value
                ? draft.mapPinStatus === 'approved'
                  ? 'approved'
                  : 'pending'
                : 'none',
            );
          }}
          onNext={goNext}
        />
      );
    }

    return (
      <StepFour
        selectedId={draft.pageCategory}
        error={currentError}
        isCreating={pagesVm.isCreating}
        submitLabel={isEditing ? 'Cập nhật trang' : 'Tạo trang'}
        onSelect={categoryId => updateDraft('pageCategory', categoryId)}
        onSubmit={handleSubmit}
      />
    );
  }, [
    currentError,
    draft.pageAddress,
    draft.pageCategory,
    draft.pageDescription,
    draft.mapPinRequested,
    draft.mapPinStatus,
    draft.pageName,
    draft.pageTitle,
    goNext,
    handleAddressChange,
    handlePageNameChange,
    handleSubmit,
    handleTitleChange,
    pagesVm.isCreating,
    step,
    updateDraft,
  ]);

  function handleBack() {
    if (step > 1) {
      setLocalError(null);
      pagesVm.clearError();
      setStep(value => value - 1);
      return;
    }

    navigation.goBack();
  }

  return (
    <SafeAreaView className="flex-1 surface-base">
      <StatusBar barStyle="light-content" backgroundColor="#0000FF" />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <WizardHeader
          step={step}
          raised={headerRaised}
          title={isEditing ? 'Sửa trang' : 'Tạo trang mới'}
          onBack={handleBack}
        />
        {content}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default CreatePageScreen;

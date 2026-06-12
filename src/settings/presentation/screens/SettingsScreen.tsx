// Description: Renders the main settings tab with profile, feature shortcuts, and settings menu.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  View,
} from 'react-native';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { launchImageLibrary, type Asset } from 'react-native-image-picker';
import {
  errorCodes,
  isErrorWithCode,
  pick,
  types as documentTypes,
} from '@react-native-documents/picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  BadgeCheck,
  Bell,
  CalendarDays,
  Camera,
  Check,
  ChevronDown,
  ChevronRight,
  Circle,
  Clock3,
  FileBadge,
  IdCard,
  ImagePlus,
  Link,
  LockKeyhole,
  Mail,
  Pencil,
  Phone,
  Plus,
  Save,
  Search,
  ShieldCheck,
  Store,
  User,
  Wallet,
  Globe,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ROUTES } from '../../../navigation/constants/routes';
import type {
  RootStackParamList,
  RootStackRouteName,
} from '../../../navigation/types';
import { useAuthViewModel } from '../../../auth/application/view-models/useAuthViewModel';
import CreateActionSheet from '../../../shared-kernel/presentation/components/CreateActionSheet';
import { languageStorage, type AppLanguage } from '../../../shared-kernel/infrastructure/storage/languageStorage';
import { AddressAutocomplete } from '../../../shared-kernel/presentation/components/AddressAutocomplete';
import { apiRoutes } from '../../../shared-kernel/application/constants/route-registry';
import { apiBridge } from '../../../shared-kernel/infrastructure/api/apiBridge';
import { useSettingsViewModel } from '../../application/view-models/useSettingsViewModel';
import { useMyInfoViewModel } from '../../application/view-models/useMyInfoViewModel';
import { useUserViewModel } from '../../../user/application/view-models/useUserViewModel';
import ProfileHeaderCard from '../components/ProfileHeaderCard';
import FeatureGrid from '../components/FeatureGrid';
import GoProBanner from '../components/GoProBanner';
import SettingsMenuList from '../components/SettingsMenuList';
import type {
  UserGender,
  UserUploadFile,
} from '../../../user/domain/types/user.types';
import {
  COUNTRY_OPTIONS,
  type CountryOption,
} from '../../domain/constants/countries';

type SettingsNav = NativeStackNavigationProp<RootStackParamList>;
type AccountFormState = {
  username: string;
  phoneNumber: string;
  gender: UserGender;
  email: string;
  birthday: string;
  countryId: string;
};

type ProfileFormState = {
  firstName: string;
  lastName: string;
  website: string;
  about: string;
  working: string;
  workingLink: string;
  address: string;
  school: string;
  relationshipId: string;
  schoolCompleted: boolean;
};

type SettingsPanel =
  | 'main'
  | 'general'
  | 'general-common'
  | 'general-profile'
  | 'general-avatar'
  | 'general-password'
  | 'general-two-factor'
  | 'general-notifications'
  | 'general-verification';

type PasswordFormState = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

type TwoFactorFormState = {
  enabled: boolean;
  phoneNumber: string;
  verificationCode: string;
  method: 'email_sms' | 'google' | 'authy';
};

type EmailNotificationFormState = {
  emailLiked: boolean;
  emailShared: boolean;
  emailWondered: boolean;
  emailCommented: boolean;
  emailFollowed: boolean;
  emailLikedPage: boolean;
  emailVisited: boolean;
  emailMentioned: boolean;
  emailJoinedGroup: boolean;
  emailAccepted: boolean;
  emailProfileWallPost: boolean;
  emailMessages: boolean;
};

type AccountVerificationStatus = {
  isShop: boolean;
  verified: boolean;
  hasPendingRequest: boolean;
  user?: {
    id?: string | number;
    name?: string;
    username?: string;
    avatar?: string;
  };
};

type AccountVerificationFormState = {
  fullName: string;
  dateOfBirth: string;
  idCardNumber: string;
  shopDescription: string;
  passport?: UserUploadFile;
  photo?: UserUploadFile;
  shopImage?: UserUploadFile;
  license?: UserUploadFile;
};

type VerificationStatusResponse = {
  api_status?: number | string;
  data?: {
    is_shop?: boolean | number | string;
    verified?: boolean | number | string;
    has_pending_request?: boolean | number | string;
    user?: AccountVerificationStatus['user'];
  };
};

type VerificationSubmitResponse = {
  api_status?: number | string;
  message?: string;
  errors?: Array<{ error_text?: string }> | { error_text?: string };
};

const RELATIONSHIP_OPTIONS = [
  { id: '0', label: 'None' },
  { id: '1', label: 'Single' },
  { id: '2', label: 'In a relationship' },
  { id: '3', label: 'Married' },
  { id: '4', label: 'Engaged' },
];

const EMAIL_NOTIFICATION_ITEMS: Array<{
  key: keyof EmailNotificationFormState;
  title: string;
  description: string;
  supported: boolean;
}> = [
  {
    key: 'emailLiked',
    title: 'Likes',
    description: 'Send email for likes.',
    supported: true,
  },
  {
    key: 'emailShared',
    title: 'Shares',
    description: 'Send email for shares.',
    supported: true,
  },
  {
    key: 'emailWondered',
    title: 'Wonders',
    description: 'Send email for wonders.',
    supported: true,
  },
  {
    key: 'emailCommented',
    title: 'Comments',
    description: 'Send email for comments.',
    supported: true,
  },
  {
    key: 'emailFollowed',
    title: 'Followers',
    description: 'Send email for followers.',
    supported: true,
  },
  {
    key: 'emailLikedPage',
    title: 'Page likes',
    description: 'Send email for page likes.',
    supported: true,
  },
  {
    key: 'emailVisited',
    title: 'Profile visits',
    description: 'Send email for profile visits.',
    supported: true,
  },
  {
    key: 'emailMentioned',
    title: 'Mentions',
    description: 'Send email for mentions.',
    supported: true,
  },
  {
    key: 'emailJoinedGroup',
    title: 'Group joins',
    description: 'Send email for group joins.',
    supported: true,
  },
  {
    key: 'emailAccepted',
    title: 'Accepted requests',
    description: 'Send email for accepted requests.',
    supported: true,
  },
  {
    key: 'emailProfileWallPost',
    title: 'Profile wall posts',
    description: 'Send email for profile wall posts.',
    supported: true,
  },
  {
    key: 'emailMessages',
    title: 'Messages',
    description: 'Send email for messages.',
    supported: false,
  },
];

function fieldValue(value: unknown) {
  return String(value ?? '').trim();
}

function readFlag(value: unknown, fallback = true) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  }
  return fallback;
}

function uploadFileFromAsset(
  asset: Asset | undefined,
  fallbackName: string,
): UserUploadFile | undefined {
  if (!asset?.uri) return undefined;
  return {
    uri: asset.uri,
    name: asset.fileName || fallbackName,
    type: asset.type || 'image/jpeg',
  };
}

function settingsPanelTitle(panel: SettingsPanel, language: AppLanguage) {
  const isVi = language === 'vi';
  if (panel === 'general-common') return isVi ? 'Chung' : 'Common';
  if (panel === 'general-profile') return isVi ? 'Hồ sơ' : 'Profile';
  if (panel === 'general-avatar') return isVi ? 'Ảnh đại diện' : 'Avatar';
  if (panel === 'general-password') return isVi ? 'Mật khẩu' : 'Password';
  if (panel === 'general-two-factor') return isVi ? 'Xác thực 2 yếu tố' : 'Two-Factor Auth';
  if (panel === 'general-notifications') return isVi ? 'Thông báo' : 'Notifications';
  if (panel === 'general-verification') return isVi ? 'Xác thực tài khoản' : 'Verification';
  return isVi ? 'Cài đặt chung' : 'General settings';
}

function apiSucceeded(status: unknown) {
  return status === 200 || status === '200';
}

function verificationErrorMessage(response: VerificationSubmitResponse) {
  if (response.message) return response.message;
  const errors = response.errors;
  if (Array.isArray(errors)) {
    return errors[0]?.error_text || 'Không thể gửi yêu cầu xác thực.';
  }
  return errors?.error_text || 'Không thể gửi yêu cầu xác thực.';
}

async function pickVerificationDocument(
  fallbackName: string,
): Promise<UserUploadFile | undefined> {
  try {
    const [file] = await pick({
      type: [documentTypes.images, documentTypes.pdf],
      allowMultiSelection: false,
      mode: 'import',
    });
    if (!file?.uri) return undefined;
    return {
      uri: file.uri,
      name: file.name || fallbackName,
      type: file.type || 'application/octet-stream',
    };
  } catch (error) {
    if (
      isErrorWithCode(error) &&
      error.code === errorCodes.OPERATION_CANCELED
    ) {
      return undefined;
    }
    throw error;
  }
}

function padDatePart(value: number) {
  return String(value).padStart(2, '0');
}

function formatDateForApi(date: Date) {
  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
}

function formatDateForDisplay(value: string) {
  const date = parseBirthdayDate(value);
  if (!date) return '';
  return `${padDatePart(date.getDate())}/${padDatePart(date.getMonth() + 1)}/${date.getFullYear()}`;
}

function parseBirthdayDate(value: string) {
  const normalized = fieldValue(value);
  if (!normalized || normalized === '0000-00-00') return null;

  const apiMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (apiMatch) {
    const year = Number(apiMatch[1]);
    const month = Number(apiMatch[2]);
    const day = Number(apiMatch[3]);
    const date = new Date(year, month - 1, day);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const displayMatch = normalized.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (displayMatch) {
    const day = Number(displayMatch[1]);
    const month = Number(displayMatch[2]);
    const year = Number(displayMatch[3]);
    const date = new Date(year, month - 1, day);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
}

function countryNameFromId(countryId: string) {
  return (
    COUNTRY_OPTIONS.find(country => country.id === fieldValue(countryId))?.name ||
    ''
  );
}

function relationshipLabelFromId(relationshipId: string) {
  return (
    RELATIONSHIP_OPTIONS.find(
      relationship => relationship.id === fieldValue(relationshipId),
    )?.label || 'None'
  );
}

function AccountTextField({
  label,
  value,
  placeholder,
  icon,
  rightIcon,
  editable = true,
  multiline = false,
  secureTextEntry = false,
  onChangeText,
}: {
  label: string;
  value: string;
  placeholder?: string;
  icon: React.ReactNode;
  rightIcon?: React.ReactNode;
  editable?: boolean;
  multiline?: boolean;
  secureTextEntry?: boolean;
  onChangeText?: (value: string) => void;
}) {
  return (
    <View className="mb-4 flex-1">
      <Text className="mb-2 text-[15px] font-medium text-slate-900">
        {label}
      </Text>
      <View
        className={`flex-row rounded-lg border border-slate-300 bg-white px-3 ${
          multiline ? 'min-h-[112px] items-start py-3' : 'h-10 items-center'
        }`}
      >
        <View className="mr-2">{icon}</View>
        <TextInput
          className={`flex-1 p-0 text-[15px] ${
            editable ? 'text-slate-900' : 'text-slate-500'
          }`}
          value={value}
          placeholder={placeholder}
          placeholderTextColor="#64748b"
          editable={editable}
          multiline={multiline}
          secureTextEntry={secureTextEntry}
          textAlignVertical={multiline ? 'top' : 'center'}
          onChangeText={onChangeText}
        />
        {rightIcon ? <View className="ml-2">{rightIcon}</View> : null}
      </View>
    </View>
  );
}

function AccountSelectField({
  label,
  value,
  placeholder,
  icon,
  rightIcon,
  onPress,
}: {
  label: string;
  value: string;
  placeholder: string;
  icon: React.ReactNode;
  rightIcon?: React.ReactNode;
  onPress: () => void;
}) {
  const hasValue = value.trim().length > 0;

  return (
    <View className="mb-4 flex-1">
      <Text className="mb-2 text-[15px] font-medium text-slate-900">
        {label}
      </Text>
      <TouchableOpacity
        activeOpacity={0.82}
        onPress={onPress}
        className="h-10 flex-row items-center rounded-lg border border-slate-300 bg-white px-3"
      >
        <View className="mr-2">{icon}</View>
        <Text
          className={`flex-1 text-[15px] ${
            hasValue ? 'text-slate-900' : 'text-slate-500'
          }`}
          numberOfLines={1}
        >
          {hasValue ? value : placeholder}
        </Text>
        {rightIcon ? <View className="ml-2">{rightIcon}</View> : null}
      </TouchableOpacity>
    </View>
  );
}

function GenderButton({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      className={`mr-3 h-11 justify-center rounded-xl border px-5 ${
        selected ? 'border-[#0000ff] bg-indigo-50' : 'border-slate-200 bg-white'
      }`}
    >
      <Text
        className={`font-semibold ${
          selected ? 'text-[#0000ff]' : 'text-slate-700'
        }`}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function VerificationButton({
  label,
  selected,
}: {
  label: string;
  selected: boolean;
}) {
  return (
    <View
      className={`mr-3 h-11 flex-row items-center rounded-xl border px-5 ${
        selected ? 'border-[#0000ff] bg-indigo-50' : 'border-slate-200 bg-slate-50'
      }`}
    >
      <Circle size={16} color={selected ? '#0000ff' : '#94a3b8'} />
      <Text
        className={`ml-2 font-medium ${
          selected ? 'text-[#0000ff]' : 'text-slate-400'
        }`}
      >
        {label}
      </Text>
    </View>
  );
}

function CountryPickerModal({
  visible,
  selectedCountryId,
  onClose,
  onSelect,
}: {
  visible: boolean;
  selectedCountryId: string;
  onClose: () => void;
  onSelect: (country: CountryOption) => void;
}) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!visible) {
      setQuery('');
    }
  }, [visible]);

  const countries = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return COUNTRY_OPTIONS;
    return COUNTRY_OPTIONS.filter(
      country =>
        country.name.toLowerCase().includes(normalizedQuery) ||
        country.id.includes(normalizedQuery),
    );
  }, [query]);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/40">
        <View className="max-h-[78%] rounded-t-3xl bg-white px-4 pb-6 pt-4">
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-lg font-extrabold text-slate-950">
              Chọn quốc gia
            </Text>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={onClose}
              className="rounded-full bg-slate-100 px-4 py-2"
            >
              <Text className="font-semibold text-slate-700">Đóng</Text>
            </TouchableOpacity>
          </View>

          <View className="mb-3 h-11 flex-row items-center rounded-xl border border-slate-200 bg-slate-50 px-3">
            <Search size={18} color="#64748b" />
            <TextInput
              className="ml-2 flex-1 p-0 text-[15px] text-slate-900"
              value={query}
              placeholder="Tìm quốc gia"
              placeholderTextColor="#94a3b8"
              autoCapitalize="none"
              onChangeText={setQuery}
            />
          </View>

          <FlatList
            data={countries}
            keyExtractor={item => item.id}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <Text className="py-8 text-center text-slate-500">
                Không tìm thấy quốc gia
              </Text>
            }
            renderItem={({ item }) => {
              const selected = item.id === selectedCountryId;
              return (
                <TouchableOpacity
                  activeOpacity={0.82}
                  onPress={() => {
                    onSelect(item);
                    onClose();
                  }}
                  className={`mb-2 flex-row items-center rounded-xl px-4 py-3 ${
                    selected ? 'bg-blue-50' : 'bg-slate-50'
                  }`}
                >
                  <Text
                    className={`flex-1 text-[15px] ${
                      selected
                        ? 'font-bold text-[#0000ff]'
                        : 'font-medium text-slate-800'
                    }`}
                  >
                    {item.name}
                  </Text>
                  <Text className="mr-3 text-xs text-slate-400">
                    {item.id}
                  </Text>
                  {selected ? <Check size={18} color="#0000ff" /> : null}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

function RelationshipPickerModal({
  visible,
  selectedRelationshipId,
  onClose,
  onSelect,
}: {
  visible: boolean;
  selectedRelationshipId: string;
  onClose: () => void;
  onSelect: (relationshipId: string) => void;
}) {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/40">
        <View className="rounded-t-3xl bg-white px-4 pb-6 pt-4">
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-lg font-extrabold text-slate-950">
              Relationship
            </Text>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={onClose}
              className="rounded-full bg-slate-100 px-4 py-2"
            >
              <Text className="font-semibold text-slate-700">Đóng</Text>
            </TouchableOpacity>
          </View>
          {RELATIONSHIP_OPTIONS.map(option => {
            const selected = option.id === selectedRelationshipId;
            return (
              <TouchableOpacity
                key={option.id}
                activeOpacity={0.82}
                onPress={() => {
                  onSelect(option.id);
                  onClose();
                }}
                className={`mb-2 flex-row items-center rounded-xl px-4 py-3 ${
                  selected ? 'bg-blue-50' : 'bg-slate-50'
                }`}
              >
                <Text
                  className={`flex-1 text-[15px] ${
                    selected
                      ? 'font-bold text-[#0000ff]'
                      : 'font-medium text-slate-800'
                  }`}
                >
                  {option.label}
                </Text>
                {selected ? <Check size={18} color="#0000ff" /> : null}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </Modal>
  );
}

function GeneralSettingsMenuRow({
  label,
  icon,
  isLast = false,
  onPress,
}: {
  label: string;
  icon: React.ReactNode;
  isLast?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      className={`flex-row items-center px-5 py-4 ${
        !isLast ? 'border-b border-slate-100' : ''
      }`}
    >
      <View className="mr-4 h-10 w-10 items-center justify-center rounded-full bg-[#eef2ff]">
        {icon}
      </View>
      <Text className="flex-1 text-[16px] font-semibold text-slate-800">
        {label}
      </Text>
      <ChevronRight size={18} color="#94a3b8" />
    </TouchableOpacity>
  );
}

function AccountInformationCard() {
  const { profile, refresh } = useMyInfoViewModel();
  const { updateCurrentUser, isLoading } = useUserViewModel();
  const [birthdayPickerVisible, setBirthdayPickerVisible] = useState(false);
  const [countryPickerVisible, setCountryPickerVisible] = useState(false);
  const [form, setForm] = useState<AccountFormState>({
    username: '',
    phoneNumber: '',
    gender: '',
    email: '',
    birthday: '',
    countryId: '',
  });

  useEffect(() => {
    if (!profile) return;
    setForm({
      username: fieldValue(profile.username),
      phoneNumber: fieldValue(profile.phoneNumber),
      gender:
        profile.gender === 'male' || profile.gender === 'female'
          ? profile.gender
          : '',
      email: fieldValue(profile.email),
      birthday: fieldValue(profile.birthday),
      countryId: fieldValue(profile.countryId),
    });
  }, [profile]);

  const updateField = useCallback(
    <TKey extends keyof AccountFormState>(
      key: TKey,
      value: AccountFormState[TKey],
    ) => {
      setForm(previous => ({ ...previous, [key]: value }));
    },
    [],
  );

  const handleBirthdayChange = useCallback(
    (event: DateTimePickerEvent, selectedDate?: Date) => {
      if (Platform.OS === 'android') {
        setBirthdayPickerVisible(false);
      }
      if (event.type === 'dismissed' || !selectedDate) return;
      updateField('birthday', formatDateForApi(selectedDate));
    },
    [updateField],
  );

  const handleSave = useCallback(async () => {
    try {
      await updateCurrentUser({
        username: form.username,
        phoneNumber: form.phoneNumber,
        gender: form.gender,
        email: form.email,
        birthday: form.birthday,
        countryId: form.countryId,
      });
      await refresh();
      Alert.alert('Cài đặt chung', 'Đã lưu thông tin tài khoản.');
    } catch (error) {
      Alert.alert(
        'Cài đặt chung',
        error instanceof Error ? error.message : String(error),
      );
    }
  }, [form, refresh, updateCurrentUser]);

  const isVerified = Boolean(profile?.verified);
  const wallet = fieldValue(profile?.wallet);
  const selectedBirthday = parseBirthdayDate(form.birthday) || new Date(2000, 0, 1);
  const selectedCountryName = countryNameFromId(form.countryId);

  return (
    <View className="surface-card px-4 py-4">
      <AccountTextField
        label="Username"
        value={form.username}
        icon={<User size={17} color="#111827" />}
        onChangeText={value => updateField('username', value)}
      />
      <AccountTextField
        label="Phone"
        value={form.phoneNumber}
        icon={<Phone size={17} color="#111827" />}
        onChangeText={value => updateField('phoneNumber', value)}
      />

      <View className="mb-4">
        <Text className="mb-2 text-[15px] font-medium text-slate-900">
          Gender
        </Text>
        <View className="flex-row">
          <GenderButton
            label="Male"
            selected={form.gender === 'male'}
            onPress={() => updateField('gender', 'male')}
          />
          <GenderButton
            label="Female"
            selected={form.gender === 'female'}
            onPress={() => updateField('gender', 'female')}
          />
        </View>
      </View>

      <AccountTextField
        label="E-mail"
        value={form.email}
        icon={<Mail size={17} color="#111827" />}
        onChangeText={value => updateField('email', value)}
      />

      <AccountSelectField
        label="Birthday"
        value={formatDateForDisplay(form.birthday)}
        placeholder="dd/mm/yyyy"
        icon={<CalendarDays size={17} color="#111827" />}
        rightIcon={<CalendarDays size={16} color="#111827" />}
        onPress={() => setBirthdayPickerVisible(true)}
      />
      <AccountSelectField
        label="Country"
        value={selectedCountryName}
        placeholder="Chọn quốc gia"
        icon={<View className="h-[17px] w-[17px]" />}
        rightIcon={<ChevronDown size={18} color="#94a3b8" />}
        onPress={() => setCountryPickerVisible(true)}
      />

      <View className="mb-4">
        <Text className="mb-2 text-[15px] font-medium text-slate-900">
          Verification
        </Text>
        <View className="flex-row">
          <VerificationButton label="Verified" selected={isVerified} />
          <VerificationButton label="Not verified" selected={!isVerified} />
        </View>
      </View>

      <AccountTextField
        label="Wallet"
        value={wallet}
        icon={<Wallet size={17} color="#111827" />}
        editable={false}
      />

      <TouchableOpacity
        activeOpacity={0.86}
        disabled={isLoading}
        onPress={() => {
          handleSave().catch(() => undefined);
        }}
        className={`mt-2 h-12 flex-row items-center justify-center rounded-xl ${
          isLoading ? 'bg-blue-300' : 'bg-blue-600'
        }`}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <Save size={17} color="#ffffff" />
        )}
        <Text className="ml-2 text-[16px] font-bold text-white">Save</Text>
      </TouchableOpacity>

      {birthdayPickerVisible && Platform.OS === 'android' ? (
        <DateTimePicker
          value={selectedBirthday}
          mode="date"
          display="default"
          maximumDate={new Date()}
          onChange={handleBirthdayChange}
        />
      ) : null}

      {birthdayPickerVisible && Platform.OS === 'ios' ? (
        <Modal
          transparent
          visible={birthdayPickerVisible}
          animationType="slide"
          onRequestClose={() => setBirthdayPickerVisible(false)}
        >
          <View className="flex-1 justify-end bg-black/40">
            <View className="rounded-t-3xl bg-white px-4 pb-6 pt-4">
              <View className="mb-4 flex-row items-center justify-between">
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setBirthdayPickerVisible(false)}
                  className="rounded-full bg-slate-100 px-4 py-2"
                >
                  <Text className="font-semibold text-slate-700">Hủy</Text>
                </TouchableOpacity>
                <Text className="text-lg font-extrabold text-slate-950">
                  Chọn ngày sinh
                </Text>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setBirthdayPickerVisible(false)}
                  className="rounded-full bg-blue-600 px-4 py-2"
                >
                  <Text className="font-semibold text-white">Xong</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={selectedBirthday}
                mode="date"
                display="spinner"
                maximumDate={new Date()}
                onChange={handleBirthdayChange}
              />
            </View>
          </View>
        </Modal>
      ) : null}

      <CountryPickerModal
        visible={countryPickerVisible}
        selectedCountryId={form.countryId}
        onClose={() => setCountryPickerVisible(false)}
        onSelect={country => updateField('countryId', country.id)}
      />
    </View>
  );
}

function ProfileInformationCard() {
  const { profile, refresh } = useMyInfoViewModel();
  const { updateCurrentUser, isLoading } = useUserViewModel();
  const [relationshipPickerVisible, setRelationshipPickerVisible] =
    useState(false);
  const [form, setForm] = useState<ProfileFormState>({
    firstName: '',
    lastName: '',
    website: '',
    about: '',
    working: '',
    workingLink: '',
    address: '',
    school: '',
    relationshipId: '0',
    schoolCompleted: false,
  });

  useEffect(() => {
    if (!profile) return;
    setForm({
      firstName: fieldValue(profile.firstName),
      lastName: fieldValue(profile.lastName),
      website: fieldValue(profile.website),
      about: fieldValue(profile.about),
      working: fieldValue(profile.working),
      workingLink: fieldValue(profile.workingLink),
      address: fieldValue(profile.address),
      school: fieldValue(profile.school),
      relationshipId: fieldValue(profile.relationshipId) || '0',
      schoolCompleted: Boolean(profile.schoolCompleted),
    });
  }, [profile]);

  const updateField = useCallback(
    <TKey extends keyof ProfileFormState>(
      key: TKey,
      value: ProfileFormState[TKey],
    ) => {
      setForm(previous => ({ ...previous, [key]: value }));
    },
    [],
  );

  const handleSave = useCallback(async () => {
    try {
      await updateCurrentUser({
        firstName: form.firstName,
        lastName: form.lastName,
        website: form.website,
        about: form.about,
        working: form.working,
        workingLink: form.workingLink,
        address: form.address,
        school: form.school,
        relationshipId: form.relationshipId,
        schoolCompleted: form.schoolCompleted,
      });
      await refresh();
      Alert.alert('Hồ sơ', 'Đã lưu thông tin hồ sơ.');
    } catch (error) {
      Alert.alert(
        'Hồ sơ',
        error instanceof Error ? error.message : String(error),
      );
    }
  }, [form, refresh, updateCurrentUser]);

  return (
    <View className="surface-card px-4 py-4">
      <AccountTextField
        label="First name"
        value={form.firstName}
        icon={<User size={17} color="#111827" />}
        onChangeText={value => updateField('firstName', value)}
      />
      <AccountTextField
        label="Last name"
        value={form.lastName}
        icon={<User size={17} color="#111827" />}
        onChangeText={value => updateField('lastName', value)}
      />

      <AccountTextField
        label="Website"
        value={form.website}
        icon={<Link size={17} color="#111827" />}
        onChangeText={value => updateField('website', value)}
      />

      <AccountTextField
        label="About"
        value={form.about}
        icon={<View className="h-[17px] w-[17px]" />}
        multiline
        onChangeText={value => updateField('about', value)}
      />

      <AccountTextField
        label="Working"
        value={form.working}
        icon={<Pencil size={17} color="#111827" />}
        onChangeText={value => updateField('working', value)}
      />
      <AccountTextField
        label="Company website"
        value={form.workingLink}
        icon={<Pencil size={17} color="#111827" />}
        onChangeText={value => updateField('workingLink', value)}
      />

      <View className="mb-4">
        <Text className="mb-2 text-[15px] font-medium text-slate-900">
          Address
        </Text>
        <AddressAutocomplete
          value={form.address}
          placeholder="Tìm địa chỉ trên Google Maps"
          onChangeText={value => updateField('address', value)}
          onSelectPlace={place =>
            updateField('address', place.description || place.mainText)
          }
        />
      </View>

      <AccountTextField
        label="School"
        value={form.school}
        icon={<Pencil size={17} color="#111827" />}
        onChangeText={value => updateField('school', value)}
      />
      <AccountSelectField
        label="Relationship"
        value={relationshipLabelFromId(form.relationshipId)}
        placeholder="None"
        icon={<View className="h-[17px] w-[17px]" />}
        rightIcon={<ChevronDown size={18} color="#94a3b8" />}
        onPress={() => setRelationshipPickerVisible(true)}
      />

      <View className="mb-4">
        <Text className="mb-2 text-[15px] font-medium text-slate-900">
          School completed
        </Text>
        <View className="flex-row">
          <GenderButton
            label="Enabled"
            selected={form.schoolCompleted}
            onPress={() => updateField('schoolCompleted', true)}
          />
          <GenderButton
            label="Disabled"
            selected={!form.schoolCompleted}
            onPress={() => updateField('schoolCompleted', false)}
          />
        </View>
      </View>

      <TouchableOpacity
        activeOpacity={0.86}
        disabled={isLoading}
        onPress={() => {
          handleSave().catch(() => undefined);
        }}
        className={`mt-2 h-12 flex-row items-center justify-center rounded-xl ${
          isLoading ? 'bg-blue-300' : 'bg-blue-600'
        }`}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <Save size={17} color="#ffffff" />
        )}
        <Text className="ml-2 text-[16px] font-bold text-white">Save</Text>
      </TouchableOpacity>

      <RelationshipPickerModal
        visible={relationshipPickerVisible}
        selectedRelationshipId={form.relationshipId}
        onClose={() => setRelationshipPickerVisible(false)}
        onSelect={relationshipId =>
          updateField('relationshipId', relationshipId)
        }
      />
    </View>
  );
}

function AvatarCoverCard() {
  const { profile, refresh } = useMyInfoViewModel();
  const { updateCurrentUser, isLoading } = useUserViewModel();
  const [avatarFile, setAvatarFile] = useState<UserUploadFile | undefined>();
  const [coverFile, setCoverFile] = useState<UserUploadFile | undefined>();
  const avatarUri = avatarFile?.uri || profile?.avatarUrl || '';
  const coverUri = coverFile?.uri || profile?.coverUrl || '';

  const pickImage = useCallback(
    async (kind: 'avatar' | 'cover') => {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: kind === 'avatar' ? 700 : 1400,
        maxHeight: kind === 'avatar' ? 700 : 600,
      });
      const file = uploadFileFromAsset(
        result.assets?.[0],
        kind === 'avatar' ? 'avatar.jpg' : 'cover.jpg',
      );
      if (!file) return;
      if (kind === 'avatar') {
        setAvatarFile(file);
      } else {
        setCoverFile(file);
      }
    },
    [],
  );

  const handleSave = useCallback(async () => {
    if (!avatarFile && !coverFile) {
      Alert.alert('Ảnh đại diện', 'Chọn ảnh đại diện hoặc ảnh bìa trước khi lưu.');
      return;
    }

    try {
      await updateCurrentUser({
        avatar: avatarFile,
        cover: coverFile,
      });
      setAvatarFile(undefined);
      setCoverFile(undefined);
      await refresh();
      Alert.alert('Ảnh đại diện', 'Đã cập nhật ảnh.');
    } catch (error) {
      Alert.alert(
        'Ảnh đại diện',
        error instanceof Error ? error.message : String(error),
      );
    }
  }, [avatarFile, coverFile, refresh, updateCurrentUser]);

  return (
    <View className="surface-card px-4 py-4">
      <View className="mb-24 h-48">
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => {
            pickImage('cover').catch(() => undefined);
          }}
          className="h-44 overflow-hidden rounded-2xl bg-slate-100"
        >
          {coverUri ? (
            <Image
              source={{ uri: coverUri }}
              className="h-full w-full"
              resizeMode="cover"
            />
          ) : (
            <View className="h-full w-full items-center justify-center bg-slate-100">
              <ImagePlus size={30} color="#94a3b8" />
            </View>
          )}
          <View className="absolute bottom-4 right-4 h-11 w-11 items-center justify-center rounded-full bg-white shadow">
            <Camera size={19} color="#0f172a" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => {
            pickImage('avatar').catch(() => undefined);
          }}
          className="absolute -bottom-16 left-6"
        >
          {avatarUri ? (
            <Image
              source={{ uri: avatarUri }}
              className="h-32 w-32 rounded-full border-4 border-white bg-slate-100"
              resizeMode="cover"
            />
          ) : (
            <View className="h-32 w-32 items-center justify-center rounded-full border-4 border-white bg-slate-100">
              <User size={42} color="#94a3b8" />
            </View>
          )}
          <View className="absolute bottom-2 right-0 h-10 w-10 items-center justify-center rounded-full border-4 border-white bg-slate-950">
            <Camera size={16} color="#ffffff" />
          </View>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        activeOpacity={0.86}
        disabled={isLoading}
        onPress={() => {
          handleSave().catch(() => undefined);
        }}
        className={`mt-2 h-12 flex-row items-center justify-center rounded-xl ${
          isLoading ? 'bg-blue-300' : 'bg-blue-600'
        }`}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <Save size={17} color="#ffffff" />
        )}
        <Text className="ml-2 text-[16px] font-bold text-white">Save</Text>
      </TouchableOpacity>
    </View>
  );
}

function PasswordSettingsCard() {
  const { updateCurrentUser, isLoading } = useUserViewModel();
  const [form, setForm] = useState<PasswordFormState>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const updateField = useCallback(
    <TKey extends keyof PasswordFormState>(
      key: TKey,
      value: PasswordFormState[TKey],
    ) => {
      setForm(previous => ({ ...previous, [key]: value }));
    },
    [],
  );

  const handleSave = useCallback(async () => {
    if (!form.currentPassword || !form.newPassword) {
      Alert.alert('Mật khẩu', 'Nhập mật khẩu hiện tại và mật khẩu mới.');
      return;
    }
    if (form.newPassword.length < 6) {
      Alert.alert('Mật khẩu', 'Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      Alert.alert('Mật khẩu', 'Xác nhận mật khẩu chưa khớp.');
      return;
    }

    try {
      await updateCurrentUser({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      setForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      Alert.alert('Mật khẩu', 'Đã cập nhật mật khẩu.');
    } catch (error) {
      Alert.alert(
        'Mật khẩu',
        error instanceof Error ? error.message : String(error),
      );
    }
  }, [form, updateCurrentUser]);

  return (
    <View className="surface-card px-4 py-4">
      <AccountTextField
        label="Current password"
        value={form.currentPassword}
        icon={<LockKeyhole size={17} color="#111827" />}
        secureTextEntry
        onChangeText={value => updateField('currentPassword', value)}
      />
      <AccountTextField
        label="New password"
        value={form.newPassword}
        icon={<LockKeyhole size={17} color="#111827" />}
        secureTextEntry
        onChangeText={value => updateField('newPassword', value)}
      />
      <AccountTextField
        label="Confirm password"
        value={form.confirmPassword}
        icon={<LockKeyhole size={17} color="#111827" />}
        secureTextEntry
        onChangeText={value => updateField('confirmPassword', value)}
      />

      <TouchableOpacity
        activeOpacity={0.86}
        disabled={isLoading}
        onPress={() => {
          handleSave().catch(() => undefined);
        }}
        className={`mt-2 h-12 flex-row items-center justify-center rounded-xl ${
          isLoading ? 'bg-blue-300' : 'bg-blue-600'
        }`}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <Save size={17} color="#ffffff" />
        )}
        <Text className="ml-2 text-[16px] font-bold text-white">Save</Text>
      </TouchableOpacity>
    </View>
  );
}

function TwoFactorSettingsCard() {
  const { profile, refresh } = useMyInfoViewModel();
  const { updateCurrentUser, isLoading } = useUserViewModel();
  const [form, setForm] = useState<TwoFactorFormState>({
    enabled: false,
    phoneNumber: '',
    verificationCode: '',
    method: 'email_sms',
  });

  useEffect(() => {
    if (!profile) return;
    setForm(previous => ({
      ...previous,
      enabled: Boolean(profile.twoFactor),
      phoneNumber: fieldValue(profile.phoneNumber),
      method:
        profile.twoFactorMethod === 'google'
          ? 'google'
          : profile.twoFactorMethod === 'authy'
            ? 'authy'
            : 'email_sms',
    }));
  }, [profile]);

  const handleSave = useCallback(async () => {
    try {
      await updateCurrentUser({
        twoFactor: form.enabled ? 'on' : 'off',
        phoneNumber: form.phoneNumber,
      });
      await refresh();
      Alert.alert('Xác thực 2 yếu tố', 'Đã lưu cài đặt xác thực.');
    } catch (error) {
      Alert.alert(
        'Xác thực 2 yếu tố',
        error instanceof Error ? error.message : String(error),
      );
    }
  }, [form.enabled, form.phoneNumber, refresh, updateCurrentUser]);

  return (
    <View className="surface-card px-4 py-4">
      <Text className="mb-5 text-xl font-extrabold text-slate-950">
        Two-factor authentication
      </Text>
      <View className="mb-4">
        <Text className="mb-2 text-[15px] font-medium text-slate-900">
          Action
        </Text>
        <View className="flex-row">
          <GenderButton
            label="Enable"
            selected={form.enabled}
            onPress={() => setForm(previous => ({ ...previous, enabled: true }))}
          />
          <GenderButton
            label="Disable"
            selected={!form.enabled}
            onPress={() =>
              setForm(previous => ({ ...previous, enabled: false }))
            }
          />
        </View>
      </View>
      <AccountTextField
        label="Phone for SMS code"
        value={form.phoneNumber}
        icon={<Phone size={17} color="#111827" />}
        onChangeText={value =>
          setForm(previous => ({ ...previous, phoneNumber: value }))
        }
      />
      <AccountTextField
        label="Verification code"
        value={form.verificationCode}
        icon={<Pencil size={17} color="#111827" />}
        onChangeText={value =>
          setForm(previous => ({ ...previous, verificationCode: value }))
        }
      />
      <View className="mb-4">
        <Text className="mb-2 text-[15px] font-medium text-slate-900">
          Verification method
        </Text>
        <View className="flex-row flex-wrap">
          <GenderButton
            label="Email / SMS code"
            selected={form.method === 'email_sms'}
            onPress={() =>
              setForm(previous => ({ ...previous, method: 'email_sms' }))
            }
          />
          <GenderButton
            label="Google Authenticator"
            selected={form.method === 'google'}
            onPress={() =>
              setForm(previous => ({ ...previous, method: 'google' }))
            }
          />
          <View className="mt-3">
            <GenderButton
              label="Authy"
              selected={form.method === 'authy'}
              onPress={() =>
                setForm(previous => ({ ...previous, method: 'authy' }))
              }
            />
          </View>
        </View>
      </View>

      <TouchableOpacity
        activeOpacity={0.86}
        disabled={isLoading}
        onPress={() => {
          handleSave().catch(() => undefined);
        }}
        className={`mt-2 h-12 flex-row items-center justify-center rounded-xl ${
          isLoading ? 'bg-blue-300' : 'bg-blue-600'
        }`}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <Save size={17} color="#ffffff" />
        )}
        <Text className="ml-2 text-[16px] font-bold text-white">Save</Text>
      </TouchableOpacity>
    </View>
  );
}

function EmailNotificationsCard() {
  const { profile, refresh } = useMyInfoViewModel();
  const { updateCurrentUser, isLoading } = useUserViewModel();
  const [form, setForm] = useState<EmailNotificationFormState>({
    emailLiked: true,
    emailShared: true,
    emailWondered: true,
    emailCommented: true,
    emailFollowed: true,
    emailLikedPage: true,
    emailVisited: true,
    emailMentioned: true,
    emailJoinedGroup: true,
    emailAccepted: true,
    emailProfileWallPost: true,
    emailMessages: false,
  });

  useEffect(() => {
    const settings = profile?.notificationSettings;
    if (!settings) return;
    setForm({
      emailLiked: readFlag(settings.e_liked),
      emailShared: readFlag(settings.e_shared),
      emailWondered: readFlag(settings.e_wondered),
      emailCommented: readFlag(settings.e_commented),
      emailFollowed: readFlag(settings.e_followed),
      emailLikedPage: readFlag(settings.e_liked_page),
      emailVisited: readFlag(settings.e_visited),
      emailMentioned: readFlag(settings.e_mentioned),
      emailJoinedGroup: readFlag(settings.e_joined_group),
      emailAccepted: readFlag(settings.e_accepted),
      emailProfileWallPost: readFlag(settings.e_profile_wall_post),
      emailMessages: readFlag(settings.e_messages, false),
    });
  }, [profile]);

  const handleSave = useCallback(async () => {
    try {
      await updateCurrentUser({
        emailLiked: form.emailLiked,
        emailShared: form.emailShared,
        emailWondered: form.emailWondered,
        emailCommented: form.emailCommented,
        emailFollowed: form.emailFollowed,
        emailLikedPage: form.emailLikedPage,
        emailVisited: form.emailVisited,
        emailMentioned: form.emailMentioned,
        emailJoinedGroup: form.emailJoinedGroup,
        emailAccepted: form.emailAccepted,
        emailProfileWallPost: form.emailProfileWallPost,
      });
      await refresh();
      Alert.alert('Thông báo', 'Đã lưu cài đặt email.');
    } catch (error) {
      Alert.alert(
        'Thông báo',
        error instanceof Error ? error.message : String(error),
      );
    }
  }, [form, refresh, updateCurrentUser]);

  return (
    <View className="surface-card px-4 py-4">
      <Text className="mb-5 text-xl font-extrabold text-slate-950">
        Email notifications
      </Text>
      {EMAIL_NOTIFICATION_ITEMS.map(item => (
        <View
          key={item.key}
          className="mb-3 flex-row items-center rounded-2xl border border-slate-100 bg-white px-4 py-4"
        >
          <View className="flex-1 pr-3">
            <Text className="text-[16px] font-bold text-slate-950">
              {item.title}
            </Text>
            <Text className="mt-1 text-[14px] text-slate-500">
              {item.description}
            </Text>
          </View>
          <Switch
            value={Boolean(form[item.key])}
            disabled={!item.supported}
            trackColor={{ false: '#e2e8f0', true: '#2f7cff' }}
            thumbColor="#ffffff"
            ios_backgroundColor="#e2e8f0"
            onValueChange={value =>
              setForm(previous => ({ ...previous, [item.key]: value }))
            }
          />
        </View>
      ))}

      <TouchableOpacity
        activeOpacity={0.86}
        disabled={isLoading}
        onPress={() => {
          handleSave().catch(() => undefined);
        }}
        className={`mt-2 h-12 flex-row items-center justify-center rounded-xl ${
          isLoading ? 'bg-blue-300' : 'bg-blue-600'
        }`}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <Save size={17} color="#ffffff" />
        )}
        <Text className="ml-2 text-[16px] font-bold text-white">Save</Text>
      </TouchableOpacity>
    </View>
  );
}

function VerificationDocumentTile({
  title,
  icon,
  file,
  onPress,
}: {
  title: string;
  icon: React.ReactNode;
  file?: UserUploadFile;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.84}
      onPress={onPress}
      className="mb-4 min-h-[150px] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5"
    >
      <View className="h-16 w-16 items-center justify-center rounded-full bg-slate-400">
        {icon}
      </View>
      <Text className="mt-4 text-center text-[17px] font-extrabold text-slate-700">
        {file?.name || title}
      </Text>
      {file ? (
        <Text className="mt-1 text-center text-xs text-blue-600">
          Nhấn để đổi tệp
        </Text>
      ) : null}
    </TouchableOpacity>
  );
}

function AccountVerificationCard() {
  const { profile } = useMyInfoViewModel();
  const [status, setStatus] = useState<AccountVerificationStatus>({
    isShop: false,
    verified: false,
    hasPendingRequest: false,
  });
  const [form, setForm] = useState<AccountVerificationFormState>({
    fullName: '',
    dateOfBirth: '',
    idCardNumber: '',
    shopDescription: '',
  });
  const [birthdayPickerVisible, setBirthdayPickerVisible] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setForm(previous => ({
      ...previous,
      fullName:
        previous.fullName ||
        fieldValue(profile?.name) ||
        `${fieldValue(profile?.firstName)} ${fieldValue(profile?.lastName)}`.trim(),
      dateOfBirth: previous.dateOfBirth || fieldValue(profile?.birthday),
    }));
  }, [profile]);

  const loadStatus = useCallback(async () => {
    setLoadingStatus(true);
    try {
      const response = await apiBridge.post<VerificationStatusResponse>(
        apiRoutes.user.verification,
        { type: 'status' },
      );
      const data = response.data;
      setStatus({
        isShop: readFlag(data?.is_shop, false),
        verified: readFlag(data?.verified, false),
        hasPendingRequest: readFlag(data?.has_pending_request, false),
        user: data?.user,
      });
    } catch (error) {
      Alert.alert(
        'Xác thực tài khoản',
        error instanceof Error ? error.message : String(error),
      );
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    loadStatus().catch(() => undefined);
  }, [loadStatus]);

  const updateField = useCallback(
    <TKey extends keyof AccountVerificationFormState>(
      key: TKey,
      value: AccountVerificationFormState[TKey],
    ) => {
      setForm(previous => ({ ...previous, [key]: value }));
    },
    [],
  );

  const pickImage = useCallback(
    async (
      key: 'passport' | 'photo' | 'shopImage',
      fallbackName: string,
      maxWidth = 1000,
      maxHeight = 1000,
    ) => {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        maxWidth,
        maxHeight,
      });
      const file = uploadFileFromAsset(result.assets?.[0], fallbackName);
      if (file) {
        updateField(key, file);
      }
    },
    [updateField],
  );

  const pickLicense = useCallback(async () => {
    const file = await pickVerificationDocument('license.pdf');
    if (file) {
      updateField('license', file);
    }
  }, [updateField]);

  const handleBirthdayChange = useCallback(
    (event: DateTimePickerEvent, selectedDate?: Date) => {
      if (Platform.OS === 'android') {
        setBirthdayPickerVisible(false);
      }
      if (event.type === 'dismissed' || !selectedDate) return;
      updateField('dateOfBirth', formatDateForApi(selectedDate));
    },
    [updateField],
  );

  const handleSubmit = useCallback(async () => {
    if (form.fullName.trim().length < 5) {
      Alert.alert('Xác thực tài khoản', 'Tên phải có ít nhất 5 ký tự.');
      return;
    }
    if (!form.passport || !form.photo) {
      Alert.alert(
        'Xác thực tài khoản',
        'Vui lòng tải ảnh giấy tờ và ảnh chân dung.',
      );
      return;
    }
    if (status.isShop && (!form.shopDescription.trim() || !form.shopImage || !form.license)) {
      Alert.alert(
        'Xác thực tài khoản',
        'Shop cần mô tả, ảnh shop và giấy phép.',
      );
      return;
    }
    if (!status.isShop && (!form.dateOfBirth || !form.idCardNumber.trim())) {
      Alert.alert(
        'Xác thực tài khoản',
        'Vui lòng nhập ngày sinh và số CCCD/CMND.',
      );
      return;
    }

    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = status.isShop
        ? {
            verification_type: 'shop',
            name: form.fullName.trim(),
            text_shop: form.shopDescription.trim(),
            passport: form.passport,
            photo: form.photo,
            shop_image: form.shopImage,
            license: form.license,
          }
        : {
            verification_type: 'user',
            name: form.fullName.trim(),
            full_name: form.fullName.trim(),
            text: 'Xác minh người dùng',
            dob: form.dateOfBirth,
            cccd: form.idCardNumber.trim(),
            passport: form.passport,
            photo: form.photo,
          };
      const response = await apiBridge.multipart<VerificationSubmitResponse>(
        apiRoutes.user.verification,
        payload,
      );
      if (!apiSucceeded(response.api_status)) {
        throw new Error(verificationErrorMessage(response));
      }
      Alert.alert(
        'Xác thực tài khoản',
        response.message || 'Đã gửi yêu cầu xác thực.',
      );
      await loadStatus();
    } catch (error) {
      Alert.alert(
        'Xác thực tài khoản',
        error instanceof Error ? error.message : String(error),
      );
    } finally {
      setSubmitting(false);
    }
  }, [form, loadStatus, status.isShop]);

  const selectedBirthday =
    parseBirthdayDate(form.dateOfBirth) || new Date(2000, 0, 1);
  const avatarUri = fieldValue(status.user?.avatar) || profile?.avatarUrl || '';
  const title = status.isShop
    ? 'Profile verification! Shop'
    : 'Profile verification! User';

  return (
    <View>
      <View className="surface-card mb-4 flex-row items-center px-4 py-5">
        {avatarUri ? (
          <Image
            source={{ uri: avatarUri }}
            className="h-20 w-20 rounded-full bg-slate-100"
            resizeMode="cover"
          />
        ) : (
          <View className="h-20 w-20 items-center justify-center rounded-full bg-slate-100">
            {status.isShop ? (
              <Store size={34} color="#94a3b8" />
            ) : (
              <User size={34} color="#94a3b8" />
            )}
          </View>
        )}
        <View className="absolute left-[76px] top-[72px] h-9 w-9 items-center justify-center rounded-full border-4 border-white bg-sky-500">
          <BadgeCheck size={18} color="#ffffff" />
        </View>
        <View className="ml-4 flex-1">
          <Text className="text-[14px] font-bold text-[#0000ff]">
            {status.user?.username || profile?.username || profile?.id || ''}
          </Text>
          <Text className="mt-1 text-[28px] font-extrabold text-sky-500">
            {title}
          </Text>
          {status.verified || status.hasPendingRequest ? (
            <Text className="mt-2 text-[13px] font-semibold text-slate-500">
              {status.verified
                ? 'Tài khoản đã được xác thực.'
                : 'Yêu cầu xác thực đang chờ duyệt.'}
            </Text>
          ) : null}
        </View>
      </View>

      {status.verified ? (
        <View className="surface-card px-4 py-6">
          <View className="items-center">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-sky-500">
              <BadgeCheck size={34} color="#ffffff" />
            </View>
            <Text className="mt-4 text-center text-xl font-extrabold text-slate-950">
              Tài khoản đã được xác thực
            </Text>
            <Text className="mt-2 text-center text-[15px] leading-5 text-slate-500">
              Bạn không cần gửi thêm giấy tờ xác thực. Các tính năng yêu cầu
              xác thực đã có thể sử dụng theo quyền tài khoản hiện tại.
            </Text>
          </View>
        </View>
      ) : (
      <View className="surface-card px-4 py-4">
        {loadingStatus ? (
          <View className="items-center py-6">
            <ActivityIndicator size="small" color="#0000ff" />
          </View>
        ) : null}

        <View className="mb-5 flex-row rounded-none bg-amber-50 px-4 py-4">
          <Clock3 size={20} color="#f59e0b" />
          <View className="ml-3 flex-1">
            <Text className="text-[15px] font-bold text-amber-500">
              Verification required within 30 days
            </Text>
            <Text className="mt-2 text-[14px] leading-5 text-amber-500">
              Please submit the required documents within 30 days so your
              account or shop can continue using verification-gated features.
            </Text>
          </View>
        </View>

        <AccountTextField
          label={status.isShop ? 'Shop name' : 'Full name'}
          value={form.fullName}
          icon={<User size={17} color="#111827" />}
          onChangeText={value => updateField('fullName', value)}
        />

        {status.isShop ? (
          <AccountTextField
            label="Shop description"
            value={form.shopDescription}
            icon={<Store size={17} color="#111827" />}
            multiline
            onChangeText={value => updateField('shopDescription', value)}
          />
        ) : (
          <>
            <AccountSelectField
              label="Date of birth"
              value={formatDateForDisplay(form.dateOfBirth)}
              placeholder="dd/mm/yyyy"
              icon={<CalendarDays size={17} color="#111827" />}
              rightIcon={<CalendarDays size={16} color="#111827" />}
              onPress={() => setBirthdayPickerVisible(true)}
            />
            <AccountTextField
              label="ID card number"
              value={form.idCardNumber}
              placeholder="9-12 digits"
              icon={<IdCard size={17} color="#111827" />}
              onChangeText={value => updateField('idCardNumber', value)}
            />
          </>
        )}

        <Text className="mb-2 mt-2 text-xl font-extrabold text-slate-950">
          Upload documents
        </Text>
        <Text className="mb-4 text-[15px] font-medium leading-5 text-slate-500">
          {status.isShop
            ? 'Please upload owner identity documents, shop image, and business license.'
            : 'Please upload your passport or identity document and a separate personal photo.'}
        </Text>

        <VerificationDocumentTile
          title="ID card / Passport"
          file={form.passport}
          icon={<FileBadge size={28} color="#ffffff" />}
          onPress={() => {
            pickImage('passport', 'passport.jpg').catch(error =>
              Alert.alert('Xác thực tài khoản', String(error)),
            );
          }}
        />
        <VerificationDocumentTile
          title="Portrait photo"
          file={form.photo}
          icon={<Camera size={28} color="#ffffff" />}
          onPress={() => {
            pickImage('photo', 'portrait.jpg').catch(error =>
              Alert.alert('Xác thực tài khoản', String(error)),
            );
          }}
        />

        {status.isShop ? (
          <>
            <VerificationDocumentTile
              title="Shop image"
              file={form.shopImage}
              icon={<Store size={28} color="#ffffff" />}
              onPress={() => {
                pickImage('shopImage', 'shop.jpg', 1400, 900).catch(error =>
                  Alert.alert('Xác thực tài khoản', String(error)),
                );
              }}
            />
            <VerificationDocumentTile
              title="License"
              file={form.license}
              icon={<FileBadge size={28} color="#ffffff" />}
              onPress={() => {
                pickLicense().catch(error =>
                  Alert.alert('Xác thực tài khoản', String(error)),
                );
              }}
            />
          </>
        ) : null}

        <TouchableOpacity
          activeOpacity={0.86}
          disabled={submitting}
          onPress={() => {
            handleSubmit().catch(() => undefined);
          }}
          className={`mt-2 h-12 flex-row items-center justify-center rounded-xl ${
            submitting ? 'bg-blue-300' : 'bg-blue-600'
          }`}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Save size={17} color="#ffffff" />
          )}
          <Text className="ml-2 text-[16px] font-bold text-white">
            Submit
          </Text>
        </TouchableOpacity>

        {birthdayPickerVisible && Platform.OS === 'android' ? (
          <DateTimePicker
            value={selectedBirthday}
            mode="date"
            display="default"
            maximumDate={new Date()}
            onChange={handleBirthdayChange}
          />
        ) : null}

        {birthdayPickerVisible && Platform.OS === 'ios' ? (
          <Modal
            transparent
            visible={birthdayPickerVisible}
            animationType="slide"
            onRequestClose={() => setBirthdayPickerVisible(false)}
          >
            <View className="flex-1 justify-end bg-black/40">
              <View className="rounded-t-3xl bg-white px-4 pb-6 pt-4">
                <View className="mb-4 flex-row items-center justify-between">
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setBirthdayPickerVisible(false)}
                    className="rounded-full bg-slate-100 px-4 py-2"
                  >
                    <Text className="font-semibold text-slate-700">Hủy</Text>
                  </TouchableOpacity>
                  <Text className="text-lg font-extrabold text-slate-950">
                    Chọn ngày sinh
                  </Text>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setBirthdayPickerVisible(false)}
                    className="rounded-full bg-blue-600 px-4 py-2"
                  >
                    <Text className="font-semibold text-white">Xong</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={selectedBirthday}
                  mode="date"
                  display="spinner"
                  maximumDate={new Date()}
                  onChange={handleBirthdayChange}
                />
              </View>
            </View>
          </Modal>
        ) : null}
      </View>
      )}
    </View>
  );
}

function SettingsScreen() {
  const navigation = useNavigation<SettingsNav>();
  const [sheetVisible, setSheetVisible] = useState(false);
  const [activePanel, setActivePanel] = useState<SettingsPanel>('main');
  const [languageSheetVisible, setLanguageSheetVisible] = useState(false);
  const {
    profile,
    features,
    settingsMenu,
    language,
    setLanguage,
    copy,
  } = useSettingsViewModel();
  const { logout } = useAuthViewModel();

  const handleDirectLanguageChange = useCallback((lang: AppLanguage) => {
    setLanguage(lang);
    Alert.alert(
      'Ngôn ngữ / Language',
      lang === 'vi' ? 'Đã đổi sang Tiếng Việt' : 'Changed to English',
    );
  }, [setLanguage]);

  const handleCreateNavigate = useCallback(
    (route: RootStackRouteName) => {
      if (route === ROUTES.CREATE_EVENT) {
        navigation.navigate(ROUTES.CREATE_EVENT);
      }

      if (route === ROUTES.CREATE_PRODUCT) {
        navigation.navigate(ROUTES.CREATE_PRODUCT);
      }

      if (route === ROUTES.CREATE_PAGE) {
        navigation.navigate(ROUTES.CREATE_PAGE);
      }

      if (route === ROUTES.CREATE_GROUP) {
        navigation.navigate(ROUTES.CREATE_GROUP);
      }

      if (route === ROUTES.CREATE_STORY) {
        navigation.navigate(ROUTES.CREATE_STORY);
      }

      if (route === ROUTES.CREATE_POST) {
        navigation.navigate(ROUTES.CREATE_POST);
      }

      if (route === ROUTES.CREATE_POLL) {
        navigation.navigate(ROUTES.CREATE_POLL);
      }

      if (route === ROUTES.CREATE_REEL) {
        navigation.navigate(ROUTES.CREATE_REEL);
      }

      if (route === ROUTES.CREATE_AD) {
        navigation.navigate(ROUTES.CREATE_AD);
      }
    },
    [navigation],
  );

  const handleSettingsItemPress = useCallback(
    async (id: string) => {
      if (id === 'general') {
        setSheetVisible(false);
        setActivePanel('general');
        setLanguageSheetVisible(true);
        return;
      }

      if (id === 'notifications') {
        navigation.navigate(ROUTES.MAIN_TABS, {
          screen: ROUTES.NOTIFICATIONS,
        });
      }

      if (id === 'earnings') {
        navigation.navigate(ROUTES.EARNINGS);
      }

      if (id === 'address') {
        navigation.navigate(ROUTES.SETTINGS_ADDRESS);
      }

      if (id === 'logout') {
        try {
          await logout();
          navigation.reset({
            index: 0,
            routes: [{ name: ROUTES.LOGIN }],
          });
        } catch (error) {
          Alert.alert(
            'Đăng xuất',
            error instanceof Error ? error.message : String(error),
          );
        }
      }
    },
    [logout, navigation],
  );

  const handleFeaturePress = useCallback(
    (id: string) => {
      if (id === 'messages') {
        navigation.navigate(ROUTES.MESSAGES);
      }

      if (id === 'following') {
        navigation.navigate(ROUTES.FOLLOWING);
      }

      if (id === 'memories') {
        navigation.navigate(ROUTES.MEMORIES);
      }

      if (id === 'offers') {
        navigation.navigate(ROUTES.OFFERS);
      }

      if (id === 'photos') {
        navigation.navigate(ROUTES.MY_PHOTOS);
      }

      if (id === 'albums') {
        navigation.navigate(ROUTES.ALBUMS);
      }

      if (id === 'videos') {
        navigation.navigate(ROUTES.MY_VIDEOS);
      }

      if (id === 'saved') {
        navigation.navigate(ROUTES.SAVED_POSTS);
      }

      if (id === 'pages') {
        navigation.navigate(ROUTES.PAGES);
      }

      if (id === 'groups') {
        navigation.navigate(ROUTES.EXPLORE_GROUPS);
      }

      if (id === 'market') {
        navigation.navigate(ROUTES.MARKETPLACE);
      }

      if (id === 'boosted') {
        navigation.navigate(ROUTES.BOOSTED);
      }

      if (id === 'popular') {
        navigation.navigate(ROUTES.POPULAR);
      }

      if (id === 'blogs') {
        navigation.navigate(ROUTES.BLOGS);
      }

      if (id === 'events') {
        navigation.navigate(ROUTES.EVENTS);
      }

      if (id === 'movies') {
        navigation.navigate(ROUTES.MOVIES);
      }

      if (id === 'jobs') {
        navigation.navigate(ROUTES.JOBS);
      }

      if (id === 'funding') {
        navigation.navigate(ROUTES.FUNDING);
      }

      if (id === 'ads') {
        navigation.navigate(ROUTES.ADVERTISING);
      }

      if (id === 'find-friends') {
        navigation.navigate(ROUTES.SEARCH);
      }

      if (id === 'nearby') {
        navigation.navigate(ROUTES.NEARBY_USERS);
      }

      if (id === 'live') {
        navigation.navigate(ROUTES.LIVE);
      }
    },
    [navigation],
  );

  return (
    <SafeAreaView className="flex-1 surface-base" edges={['top']}>
      <StatusBar barStyle="dark-content" />

      {/* Top App Bar */}
      <View className="surface-topbar flex-row items-center justify-between px-5 py-3">
        {activePanel !== 'main' ? (
          <>
            <TouchableOpacity
              activeOpacity={0.8}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              onPress={() =>
                setActivePanel(
                  activePanel === 'general' ? 'main' : 'general',
                )
              }
              className="h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm border border-slate-100/50"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
                elevation: 2,
              }}
            >
              <ArrowLeft size={22} color="#0000ff" />
            </TouchableOpacity>
            <Text className="flex-1 text-center text-[20px] font-bold text-slate-900">
              {settingsPanelTitle(activePanel, language)}
            </Text>
            <View className="w-11" />
          </>
        ) : (
          <>
            <Text className="text-heading text-[#ef4444]">WoWonder</Text>
            <View className="flex-row items-center gap-4">
              <TouchableOpacity
                activeOpacity={0.8}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                onPress={() => navigation.navigate(ROUTES.SEARCH)}
              >
                <Search size={22} color="#0000ff" />
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.8}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                onPress={() => setSheetVisible(true)}
                style={{
                  transform: [{ rotate: sheetVisible ? '45deg' : '0deg' }],
                }}
              >
                <Plus size={22} color="#0000ff" />
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {activePanel !== 'main' ? (
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-5 pb-28 pt-4"
          showsVerticalScrollIndicator={false}
        >
          {activePanel === 'general' ? (
            <View
              className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100/40"
              style={{
                shadowColor: '#000000',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.03,
                shadowRadius: 24,
                elevation: 3,
              }}
            >
              <GeneralSettingsMenuRow
                label={language === 'vi' ? 'Chung' : 'Common'}
                icon={<User size={20} color="#0000ff" />}
                onPress={() => setActivePanel('general-common')}
              />
              <View className="flex-row items-center justify-between px-5 py-4 border-b border-slate-100 bg-white">
                <View className="flex-row items-center">
                  <View className="mr-4 h-10 w-10 items-center justify-center rounded-full bg-[#eef2ff]">
                    <Globe size={20} color="#0000ff" />
                  </View>
                  <Text className="text-[16px] font-semibold text-slate-800">{copy.languageTitle}</Text>
                </View>
                <View className="flex-row gap-2.5">
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => handleDirectLanguageChange('vi')}
                    className={`h-9 w-14 items-center justify-center rounded-xl border-2 ${
                      language === 'vi'
                        ? 'border-[#0000ff]'
                        : 'border-slate-200'
                    }`}
                  >
                    <Text
                      className={`text-sm font-bold ${
                        language === 'vi' ? 'text-[#0000ff]' : 'text-slate-400'
                      }`}
                    >
                      VI
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => handleDirectLanguageChange('en')}
                    className={`h-9 w-14 items-center justify-center rounded-xl border-2 ${
                      language === 'en'
                        ? 'border-[#0000ff]'
                        : 'border-slate-200'
                    }`}
                  >
                    <Text
                      className={`text-sm font-bold ${
                        language === 'en' ? 'text-[#0000ff]' : 'text-slate-400'
                      }`}
                    >
                      EN
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              <GeneralSettingsMenuRow
                label={language === 'vi' ? 'Hồ sơ' : 'Profile'}
                icon={<Pencil size={20} color="#0000ff" />}
                onPress={() => setActivePanel('general-profile')}
              />
              <GeneralSettingsMenuRow
                label={language === 'vi' ? 'Ảnh đại diện' : 'Avatar'}
                icon={<Camera size={20} color="#0000ff" />}
                onPress={() => setActivePanel('general-avatar')}
              />
              <GeneralSettingsMenuRow
                label={language === 'vi' ? 'Mật khẩu' : 'Password'}
                icon={<LockKeyhole size={20} color="#0000ff" />}
                onPress={() => setActivePanel('general-password')}
              />
              <GeneralSettingsMenuRow
                label={language === 'vi' ? 'Xác thực 2 yếu tố' : 'Two-Factor Auth'}
                icon={<ShieldCheck size={20} color="#0000ff" />}
                onPress={() => setActivePanel('general-two-factor')}
              />
              <GeneralSettingsMenuRow
                label={language === 'vi' ? 'Xác thực tài khoản' : 'Verification'}
                icon={<BadgeCheck size={20} color="#0000ff" />}
                onPress={() => setActivePanel('general-verification')}
              />
              <GeneralSettingsMenuRow
                label={language === 'vi' ? 'Thông báo' : 'Notifications'}
                icon={<Bell size={20} color="#0000ff" />}
                isLast
                onPress={() => setActivePanel('general-notifications')}
              />
            </View>
          ) : activePanel === 'general-common' ? (
            <AccountInformationCard />
          ) : activePanel === 'general-profile' ? (
            <ProfileInformationCard />
          ) : activePanel === 'general-avatar' ? (
            <AvatarCoverCard />
          ) : activePanel === 'general-password' ? (
            <PasswordSettingsCard />
          ) : activePanel === 'general-two-factor' ? (
            <TwoFactorSettingsCard />
          ) : activePanel === 'general-verification' ? (
            <AccountVerificationCard />
          ) : (
            <EmailNotificationsCard />
          )}
        </ScrollView>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-5 pb-28 pt-4"
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Header Card */}
          {profile ? (
            <ProfileHeaderCard
              profile={profile}
              onPress={() => navigation.navigate(ROUTES.PROFILE)}
            />
          ) : (
            // Loading skeleton for profile card
            <View className="surface-card flex-row items-center gap-4 px-5 py-4">
              <View className="h-16 w-16 rounded-full bg-gray-200" />
              <View className="flex-1">
                <View className="h-5 w-32 rounded bg-gray-200 mb-2" />
                <View className="h-4 w-24 rounded bg-gray-200" />
              </View>
            </View>
          )}

          {/* Feature Grid */}
          <View className="mt-5">
            <FeatureGrid
              features={features}
              onFeaturePress={handleFeaturePress}
            />
          </View>

          {/* Go Pro Banner */}
          <View className="mt-5">
            <GoProBanner />
          </View>

          {/* Settings Menu List */}
          <View className="mt-6">
            <SettingsMenuList
              items={settingsMenu}
              onItemPress={handleSettingsItemPress}
            />
          </View>
        </ScrollView>
      )}

      <Modal
        visible={languageSheetVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLanguageSheetVisible(false)}
      >
        <Pressable
          className="flex-1 justify-end bg-black/35"
          onPress={() => setLanguageSheetVisible(false)}
        >
          {activePanel === 'general' ? (
            <View className="surface-card overflow-hidden">
              <GeneralSettingsMenuRow
                label="Chung"
                icon={<User size={22} color="#0000ff" />}
                onPress={() => setActivePanel('general-common')}
              />
              <GeneralSettingsMenuRow
                label="Hồ sơ"
                icon={<Pencil size={22} color="#0000ff" />}
                onPress={() => setActivePanel('general-profile')}
              />
              <GeneralSettingsMenuRow
                label="Ảnh đại diện"
                icon={<Camera size={22} color="#0000ff" />}
                onPress={() => setActivePanel('general-avatar')}
              />
              <GeneralSettingsMenuRow
                label="Mật khẩu"
                icon={<LockKeyhole size={22} color="#0000ff" />}
                onPress={() => setActivePanel('general-password')}
              />
              <GeneralSettingsMenuRow
                label="Xác thực 2 yếu tố"
                icon={<ShieldCheck size={22} color="#0000ff" />}
                onPress={() => setActivePanel('general-two-factor')}
              />
              <GeneralSettingsMenuRow
                label="Xác thực tài khoản"
                icon={<BadgeCheck size={22} color="#0000ff" />}
                onPress={() => setActivePanel('general-verification')}
              />
              <GeneralSettingsMenuRow
                label="Thông báo"
                icon={<Bell size={22} color="#0000ff" />}
                isLast
                onPress={() => setActivePanel('general-notifications')}
              />
            </View>
          ) : activePanel === 'general-common' ? (
            <AccountInformationCard />
          ) : activePanel === 'general-profile' ? (
            <ProfileInformationCard />
          ) : activePanel === 'general-avatar' ? (
            <AvatarCoverCard />
          ) : activePanel === 'general-password' ? (
            <PasswordSettingsCard />
          ) : activePanel === 'general-two-factor' ? (
            <TwoFactorSettingsCard />
          ) : activePanel === 'general-verification' ? (
            <AccountVerificationCard />
          ) : (
            <EmailNotificationsCard />
          )}
        </Pressable>
      </Modal>

      <CreateActionSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        onNavigate={handleCreateNavigate}
      />
    </SafeAreaView>
  );
}

export default SettingsScreen;

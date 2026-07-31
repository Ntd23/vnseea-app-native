// Description: Renders the VNSEEA six-step create event wizard with date/time pickers and image selection.
import { APP_BRAND_COLOR } from '../../../shared-kernel/presentation/theme/appColors';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import {
  ArrowLeft,
  CalendarDays,
  Check,
  Clock,
  ImagePlus,
  Info,
  MapPin,
  PartyPopper,
  X,
} from 'lucide-react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import { useEventsViewModel } from '../../application/view-models/useEventsViewModel';
import { showSnackbar as showToast } from '../../../shared-kernel/presentation/components/Snackbar';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import { SafeAreaFeedHeader } from '../../../feed/presentation/components/SafeAreaFeedHeader';
import {
  languageStorage,
  type AppLanguage,
} from '../../../shared-kernel/infrastructure/storage/languageStorage';
import { getEventsCopy } from '../../application/i18n/eventsCopy';

type CreateEventNav = NativeStackNavigationProp<RootStackParamList>;
type CreateEventRoute = RouteProp<
  RootStackParamList,
  typeof ROUTES.CREATE_EVENT | typeof ROUTES.EDIT_EVENT
>;

interface EventFormData {
  name: string;
  startDate: Date | null;
  startTime: Date | null;
  endDate: Date | null;
  endTime: Date | null;
  image: string | null;
  location: string;
  description: string;
}

function CreateEventScreen() {
  const navigation = useNavigation<CreateEventNav>();
  const route = useRoute<CreateEventRoute>();
  const editingEvent = 'event' in (route.params ?? {}) ? route.params?.event : undefined;
  const isEditing = Boolean(editingEvent?.id);
  const { isCreating, isUpdating, createEvent, updateEvent } = useEventsViewModel();
  const [language] = useState<AppLanguage>(languageStorage.getLanguage());
  const copy = getEventsCopy(language);

  const parseDate = (value?: string): Date | null => {
    if (!value) return null;
    const nativeDate = new Date(value);
    if (!Number.isNaN(nativeDate.getTime())) return nativeDate;

    const parts = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (!parts) return null;
    return new Date(Number(parts[3]), Number(parts[2]) - 1, Number(parts[1]));
  };

  const parseTime = (value?: string): Date | null => {
    if (!value) return null;
    const parts = value.match(/^(\d{1,2}):(\d{2})/);
    if (!parts) return null;
    const date = new Date();
    date.setHours(Number(parts[1]), Number(parts[2]), 0, 0);
    return date;
  };

  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<EventFormData>({
    name: editingEvent?.name ?? editingEvent?.event_name ?? '',
    startDate: parseDate(editingEvent?.start_date ?? editingEvent?.event_start_date),
    startTime: parseTime(editingEvent?.start_time ?? editingEvent?.event_start_time),
    endDate: parseDate(editingEvent?.end_date ?? editingEvent?.event_end_date),
    endTime: parseTime(editingEvent?.end_time ?? editingEvent?.event_end_time),
    image: editingEvent?.cover ?? editingEvent?.event_cover ?? null,
    location: editingEvent?.location ?? editingEvent?.event_location ?? '',
    description: editingEvent?.description ?? editingEvent?.event_description ?? '',
  });

  // Date/Time picker state
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  // Image state
  const [imagePreview, setImagePreview] = useState<string | null>(
    editingEvent?.cover ?? editingEvent?.event_cover ?? null,
  );

  const progressValue = Math.round(((step + 1) / 6) * 100);
  const progress = `${progressValue}%`;

  // Format functions
  const formatDate = (date: Date | null): string => {
    if (!date) return '';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatTime = (date: Date | null): string => {
    if (!date) return '';
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const period = date.getHours() >= 12 ? 'PM' : 'AM';
    return `${hours}:${minutes} ${period}`;
  };

  // Date/Time handlers
  const handleStartDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowStartDatePicker(false);
    }
    if (selectedDate) {
      setFormData(prev => ({ ...prev, startDate: selectedDate }));
    }
  };

  const handleStartTimeChange = (event: DateTimePickerEvent, selectedTime?: Date) => {
    if (Platform.OS === 'android') {
      setShowStartTimePicker(false);
    }
    if (selectedTime) {
      setFormData(prev => ({ ...prev, startTime: selectedTime }));
    }
  };

  const handleEndDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowEndDatePicker(false);
    }
    if (selectedDate) {
      setFormData(prev => ({ ...prev, endDate: selectedDate }));
    }
  };

  const handleEndTimeChange = (event: DateTimePickerEvent, selectedTime?: Date) => {
    if (Platform.OS === 'android') {
      setShowEndTimePicker(false);
    }
    if (selectedTime) {
      setFormData(prev => ({ ...prev, endTime: selectedTime }));
    }
  };

  // Image picker handler
  const handleSelectImage = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 1200,
        maxHeight: 1200,
      });

      if (result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setFormData(prev => ({ ...prev, image: asset.uri || null }));
        setImagePreview(asset.uri || null);
      }
    } catch (error) {
      console.error('Error selecting image:', error);
    }
  };

  // Navigation
  function next() {
    // Validation for each step
    switch (step) {
      case 0:
        if (!formData.name.trim()) {
          showToast({ message: copy.errorNameRequired, type: 'error' });
          return;
        }
        break;
      case 1:
        if (!formData.startDate) {
          showToast({ message: copy.errorStartDateRequired, type: 'error' });
          return;
        }
        if (!formData.startTime) {
          showToast({ message: copy.errorStartTimeRequired, type: 'error' });
          return;
        }
        break;
      case 2:
        if (!formData.endDate) {
          showToast({ message: copy.errorEndDateRequired, type: 'error' });
          return;
        }
        if (!formData.endTime) {
          showToast({ message: copy.errorEndTimeRequired, type: 'error' });
          return;
        }
        break;
      case 3:
        // Image is optional
        break;
      case 4:
        if (!formData.location.trim()) {
          showToast({ message: copy.errorLocationRequired, type: 'error' });
          return;
        }
        break;
      case 5:
        if (!formData.description.trim()) {
          showToast({ message: copy.errorDescriptionRequired, type: 'error' });
          return;
        }
        break;
    }

    if (step < 5) {
      setStep(value => value + 1);
    } else {
      // Submit event
      submitEvent();
    }
  }

  function back() {
    if (step > 0) {
      setStep(value => value - 1);
    } else {
      navigation.goBack();
    }
  }

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      showToast({ message: copy.errorNameRequired || 'Vui lòng nhập tên sự kiện.', type: 'error' });
      return;
    }
    if (formData.name.trim().length < 5) {
      showToast({ message: 'Tên sự kiện phải có ít nhất 5 ký tự.', type: 'error' });
      return;
    }
    if (!formData.location.trim()) {
      showToast({ message: copy.errorLocationRequired || 'Vui lòng nhập địa điểm.', type: 'error' });
      return;
    }
    if (!formData.startDate) {
      showToast({ message: copy.errorStartDateRequired || 'Vui lòng chọn ngày bắt đầu.', type: 'error' });
      return;
    }
    if (!formData.startTime) {
      showToast({ message: copy.errorStartTimeRequired || 'Vui lòng chọn giờ bắt đầu.', type: 'error' });
      return;
    }
    if (!formData.endDate) {
      showToast({ message: copy.errorEndDateRequired || 'Vui lòng chọn ngày kết thúc.', type: 'error' });
      return;
    }
    if (!formData.endTime) {
      showToast({ message: copy.errorEndTimeRequired || 'Vui lòng chọn giờ kết thúc.', type: 'error' });
      return;
    }
    if (!formData.description.trim()) {
      showToast({ message: copy.errorDescriptionRequired || 'Vui lòng nhập mô tả.', type: 'error' });
      return;
    }
    if (formData.description.trim().length < 10) {
      showToast({ message: 'Mô tả sự kiện phải có ít nhất 10 ký tự.', type: 'error' });
      return;
    }

    const startAt = new Date(formData.startDate);
    startAt.setHours(formData.startTime.getHours(), formData.startTime.getMinutes(), 0, 0);
    const endAt = new Date(formData.endDate);
    endAt.setHours(formData.endTime.getHours(), formData.endTime.getMinutes(), 0, 0);
    if (endAt.getTime() < startAt.getTime()) {
      showToast({ message: 'Thời gian kết thúc phải sau thời gian bắt đầu.', type: 'error' });
      return;
    }
    submitEvent();
  };

  function submitEvent() {
    // Call API to create event
    const dateToString = (date: Date | null): string => {
      if (!date) return '';
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${year}-${month}-${day}`;
    };

    const timeToString = (date: Date | null): string => {
      if (!date) return '';
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${hours}:${minutes}`;
    };

    // Map to API field names as expected by backend
    const eventData = {
      name: formData.name,
      startDate: dateToString(formData.startDate),
      startTime: timeToString(formData.startTime),
      endDate: dateToString(formData.endDate),
      endTime: timeToString(formData.endTime),
      location: formData.location,
      description: formData.description,
      image: formData.image || undefined,
    };

    console.log('[CreateEventScreen] Submitting event:', eventData);

    const submitAction: Promise<{ success: boolean; error?: string }> = isEditing && editingEvent?.id
      ? updateEvent(editingEvent.id, eventData)
      : createEvent(eventData);

    submitAction.then(result => {
      console.log('[CreateEventScreen] Submit event result:', result.success);
      if (result.success) {
        showToast({
          message: isEditing ? copy.updateSuccess : copy.createSuccess,
          type: 'success',
        });
        setTimeout(() => {
          navigation.navigate(ROUTES.EVENTS);
        }, 1500);
      } else {
        showToast({
          message: result.error ?? copy.errorSave,
          type: 'error',
        });
      }
    });
  }

  function renderStepContent() {
    switch (step) {
      case 0:
        // Step 1: Event Name
        return (
          <View className="gap-5">
            <View>
              <Text className="mb-2 text-label-primary text-slate-500">
                {copy.eventName}
              </Text>
              <View className="input-shell flex-row px-4 min-h-[54px] items-center">
                <PartyPopper size={20} color="#64748B" />
                <TextInput
                  className="ml-3 flex-1 text-body-primary"
                  placeholder={copy.eventNamePlaceholder}
                  placeholderTextColor="#94A3B8"
                  value={formData.name}
                  onChangeText={(text: string) => setFormData(prev => ({ ...prev, name: text }))}
                  autoFocus
                />
              </View>
            </View>
          </View>
        );

      case 1:
        // Step 2: Start Date & Time
        return (
          <View className="gap-5">
            {/* Start Date */}
            <View>
              <Text className="mb-2 text-label-primary text-slate-500">
                {copy.startDate}
              </Text>
              <TouchableOpacity
                className="input-shell flex-row px-4 min-h-[54px] items-center"
                activeOpacity={0.8}
                onPress={() => setShowStartDatePicker(true)}
              >
                <CalendarDays size={20} color="#64748B" />
                <Text
                  className={`ml-3 flex-1 text-body-primary ${
                    formData.startDate ? 'text-[#050505]' : 'text-[#94A3B8]'
                  }`}
                >
                  {formData.startDate ? formatDate(formData.startDate) : copy.selectDate}
                </Text>
                {formData.startDate && (
                  <TouchableOpacity
                    onPress={() => setFormData(prev => ({ ...prev, startDate: null }))}
                  >
                    <X size={18} color="#94A3B8" />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            </View>

            {/* Start Time */}
            <View>
              <Text className="mb-2 text-label-primary text-slate-500">
                {copy.startTime}
              </Text>
              <TouchableOpacity
                className="input-shell flex-row px-4 min-h-[54px] items-center"
                activeOpacity={0.8}
                onPress={() => setShowStartTimePicker(true)}
              >
                <Clock size={20} color="#64748B" />
                <Text
                  className={`ml-3 flex-1 text-body-primary ${
                    formData.startTime ? 'text-[#050505]' : 'text-[#94A3B8]'
                  }`}
                >
                  {formData.startTime ? formatTime(formData.startTime) : copy.selectTime}
                </Text>
                {formData.startTime && (
                  <TouchableOpacity
                    onPress={() => setFormData(prev => ({ ...prev, startTime: null }))}
                  >
                    <X size={18} color="#94A3B8" />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            </View>
          </View>
        );

      case 2:
        // Step 3: End Date & Time
        return (
          <View className="gap-5">
            {/* End Date */}
            <View>
              <Text className="mb-2 text-label-primary text-slate-500">
                {copy.endDate}
              </Text>
              <TouchableOpacity
                className="input-shell flex-row px-4 min-h-[54px] items-center"
                activeOpacity={0.8}
                onPress={() => setShowEndDatePicker(true)}
              >
                <CalendarDays size={20} color="#64748B" />
                <Text
                  className={`ml-3 flex-1 text-body-primary ${
                    formData.endDate ? 'text-[#050505]' : 'text-[#94A3B8]'
                  }`}
                >
                  {formData.endDate ? formatDate(formData.endDate) : copy.selectDate}
                </Text>
                {formData.endDate && (
                  <TouchableOpacity
                    onPress={() => setFormData(prev => ({ ...prev, endDate: null }))}
                  >
                    <X size={18} color="#94A3B8" />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            </View>

            {/* End Time */}
            <View>
              <Text className="mb-2 text-label-primary text-slate-500">
                {copy.endTime}
              </Text>
              <TouchableOpacity
                className="input-shell flex-row px-4 min-h-[54px] items-center"
                activeOpacity={0.8}
                onPress={() => setShowEndTimePicker(true)}
              >
                <Clock size={20} color="#64748B" />
                <Text
                  className={`ml-3 flex-1 text-body-primary ${
                    formData.endTime ? 'text-[#050505]' : 'text-[#94A3B8]'
                  }`}
                >
                  {formData.endTime ? formatTime(formData.endTime) : copy.selectTime}
                </Text>
                {formData.endTime && (
                  <TouchableOpacity
                    onPress={() => setFormData(prev => ({ ...prev, endTime: null }))}
                  >
                    <X size={18} color="#94A3B8" />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            </View>
          </View>
        );

      case 3:
        // Step 4: Event Image
        return (
          <TouchableOpacity
            className="preview-panel min-h-[210px] items-center justify-center border border-dashed border-brand p-6"
            activeOpacity={0.85}
            onPress={handleSelectImage}
          >
            {imagePreview ? (
              <View className="relative w-full">
                <Image
                  source={{ uri: imagePreview }}
                  className="h-48 w-full rounded-xl"
                  resizeMode="cover"
                />
                <View className="absolute right-2 top-2">
                  <TouchableOpacity
                    className="h-8 w-8 items-center justify-center rounded-full bg-black/50"
                    onPress={() => {
                      setImagePreview(null);
                      setFormData(prev => ({ ...prev, image: null }));
                    }}
                  >
                    <X size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
                <Text className="mt-3 text-center text-title-primary text-brand">
                  {copy.changeImage}
                </Text>
              </View>
            ) : (
              <>
                <ImagePlus size={48} color={APP_BRAND_COLOR} />
                <Text className="mt-4 text-title-primary text-brand">
                  {copy.selectImage}
                </Text>
              </>
            )}
          </TouchableOpacity>
        );

      case 4:
        // Step 5: Location
        return (
          <View className="gap-5">
            <View>
              <Text className="mb-2 text-label-primary text-slate-500">
                {copy.eventLocation}
              </Text>
              <View className="input-shell flex-row px-4 min-h-[54px] items-center">
                <MapPin size={20} color="#64748B" />
                <TextInput
                  className="ml-3 flex-1 text-body-primary"
                  placeholder={copy.selectLocation}
                  placeholderTextColor="#94A3B8"
                  value={formData.location}
                  onChangeText={(text: string) => setFormData(prev => ({ ...prev, location: text }))}
                />
              </View>
            </View>
          </View>
        );

      case 5:
        // Step 6: Description
        return (
          <View className="gap-5">
            <View>
              <Text className="mb-2 text-label-primary text-slate-500">
                {copy.eventDescription}
              </Text>
              <View className="input-shell min-h-[190px] items-start py-3 px-4">
                <TextInput
                  className="flex-1 w-full text-body-primary"
                  placeholder={copy.descriptionPlaceholder}
                  placeholderTextColor="#94A3B8"
                  multiline
                  textAlignVertical="top"
                  value={formData.description}
                  onChangeText={(text: string) => setFormData(prev => ({ ...prev, description: text }))}
                />
              </View>
            </View>
          </View>
        );

      default:
        return null;
    }
  }

  function getStepTitle(): string {
    switch (step) {
      case 0: return copy.eventName;
      case 1: return copy.startTimeTitle;
      case 2: return copy.endTimeTitle;
      case 3: return copy.eventImage;
      case 4: return copy.locationTitle;
      case 5: return copy.eventDescription;
      default: return '';
    }
  }

  function getStepHelper(): string {
    switch (step) {
      case 0: return copy.step0Helper;
      case 1: return copy.step1Helper;
      case 2: return copy.step2Helper;
      case 3: return copy.step3Helper;
      case 4: return copy.step4Helper;
      case 5: return copy.step5Helper;
      default: return '';
    }
  }

  function getStepIcon() {
    switch (step) {
      case 0: return <PartyPopper size={28} color={APP_BRAND_COLOR} />;
      case 1: return <Clock size={28} color={APP_BRAND_COLOR} />;
      case 2: return <Clock size={28} color={APP_BRAND_COLOR} />;
      case 3: return <ImagePlus size={28} color={APP_BRAND_COLOR} />;
      case 4: return <MapPin size={28} color={APP_BRAND_COLOR} />;
      case 5: return <Info size={28} color={APP_BRAND_COLOR} />;
      default: return <PartyPopper size={28} color={APP_BRAND_COLOR} />;
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <FocusAwareStatusBar
        barStyle={Platform.OS === 'android' ? 'light-content' : 'dark-content'}
        backgroundColor={
          Platform.OS === 'android' ? APP_BRAND_COLOR : '#FFFFFF'
        }
        translucent={false}
      />
      <SafeAreaFeedHeader
        safeAreaBackgroundColor={
          Platform.OS === 'android' ? APP_BRAND_COLOR : '#FFFFFF'
        }
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Section Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 14,
            borderBottomWidth: 1,
            borderBottomColor: '#f1f5f9',
          }}
        >
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: APP_BRAND_COLOR,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CalendarDays size={16} color="#FFFFFF" />
          </View>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#0f172a', marginLeft: 10 }}>
            {isEditing ? copy.editEventTitle : copy.createEventTitle}
          </Text>
        </View>

        <View style={{ paddingHorizontal: 16 }}>
          {/* Tên */}
          <View style={{ marginTop: 16 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#0f172a', marginBottom: 8 }}>
              {language === 'vi' ? 'Tên' : 'Name'}
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: '#e2e8f0',
                borderRadius: 12,
                paddingHorizontal: 16,
                height: 50,
                backgroundColor: '#ffffff',
                color: '#0f172a',
                fontSize: 15,
              }}
              placeholder={copy.eventNamePlaceholder}
              placeholderTextColor="#94A3B8"
              value={formData.name}
              onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
            />
          </View>

          {/* Địa điểm */}
          <View style={{ marginTop: 16 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#0f172a', marginBottom: 8 }}>
              {language === 'vi' ? 'Địa điểm' : 'Location'}
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: '#e2e8f0',
                borderRadius: 12,
                paddingHorizontal: 16,
                height: 50,
                backgroundColor: '#ffffff',
                color: '#0f172a',
                fontSize: 15,
              }}
              placeholder={copy.selectLocation || 'Chọn địa điểm'}
              placeholderTextColor="#94A3B8"
              value={formData.location}
              onChangeText={(text) => setFormData(prev => ({ ...prev, location: text }))}
            />
          </View>

          {/* Khi nào sự kiện này sẽ bắt đầu? */}
          <View style={{ marginTop: 16 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#0f172a', marginBottom: 8 }}>
              {language === 'vi' ? 'Khi nào sự kiện này sẽ bắt đầu?' : 'When will this event start?'}
            </Text>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setShowStartDatePicker(true)}
              style={{
                borderWidth: 1,
                borderColor: '#e2e8f0',
                borderRadius: 12,
                paddingHorizontal: 16,
                height: 50,
                backgroundColor: '#ffffff',
                justifyContent: 'center',
                marginBottom: 8,
              }}
            >
              <Text style={{ fontSize: 15, color: formData.startDate ? '#0f172a' : '#94a3b8' }}>
                {formData.startDate ? formatDate(formData.startDate) : (copy.selectDate || 'Chọn ngày')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setShowStartTimePicker(true)}
              style={{
                borderWidth: 1,
                borderColor: '#e2e8f0',
                borderRadius: 12,
                paddingHorizontal: 16,
                height: 50,
                backgroundColor: '#ffffff',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 15, color: formData.startTime ? '#0f172a' : '#94a3b8' }}>
                {formData.startTime ? formatTime(formData.startTime) : (copy.selectTime || 'Chọn giờ')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Khi nào sự kiện này sẽ kết thúc? */}
          <View style={{ marginTop: 16 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#0f172a', marginBottom: 8 }}>
              {language === 'vi' ? 'Khi nào sự kiện này sẽ kết thúc?' : 'When will this event end?'}
            </Text>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setShowEndDatePicker(true)}
              style={{
                borderWidth: 1,
                borderColor: '#e2e8f0',
                borderRadius: 12,
                paddingHorizontal: 16,
                height: 50,
                backgroundColor: '#ffffff',
                justifyContent: 'center',
                marginBottom: 8,
              }}
            >
              <Text style={{ fontSize: 15, color: formData.endDate ? '#0f172a' : '#94a3b8' }}>
                {formData.endDate ? formatDate(formData.endDate) : (copy.selectDate || 'Chọn ngày')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setShowEndTimePicker(true)}
              style={{
                borderWidth: 1,
                borderColor: '#e2e8f0',
                borderRadius: 12,
                paddingHorizontal: 16,
                height: 50,
                backgroundColor: '#ffffff',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 15, color: formData.endTime ? '#0f172a' : '#94a3b8' }}>
                {formData.endTime ? formatTime(formData.endTime) : (copy.selectTime || 'Chọn giờ')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Sự mô tả */}
          <View style={{ marginTop: 16 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#0f172a', marginBottom: 8 }}>
              {language === 'vi' ? 'Sự mô tả' : 'Description'}
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: '#e2e8f0',
                borderRadius: 12,
                paddingHorizontal: 16,
                height: 120,
                backgroundColor: '#ffffff',
                color: '#0f172a',
                fontSize: 15,
                textAlignVertical: 'top',
                paddingTop: 12,
              }}
              placeholder={copy.descriptionPlaceholder}
              placeholderTextColor="#94A3B8"
              multiline
              value={formData.description}
              onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
            />
          </View>

          {/* Ảnh */}
          <View style={{ marginTop: 16 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#0f172a', marginBottom: 8 }}>
              {language === 'vi' ? 'Ảnh' : 'Image'}
            </Text>
            <TouchableOpacity
              onPress={handleSelectImage}
              activeOpacity={0.8}
              style={{
                height: 180,
                borderRadius: 12,
                borderWidth: imagePreview ? 0 : 1,
                borderStyle: 'dashed',
                borderColor: '#94a3b8',
                backgroundColor: '#f8fafc',
                justifyContent: 'center',
                alignItems: 'center',
                overflow: 'hidden',
              }}
            >
              {imagePreview ? (
                <View style={{ width: '100%', height: '100%', position: 'relative' }}>
                  <Image source={{ uri: imagePreview }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                  <TouchableOpacity
                    onPress={() => {
                      setImagePreview(null);
                      setFormData(prev => ({ ...prev, image: null }));
                    }}
                    style={{
                      position: 'absolute',
                      right: 10,
                      top: 10,
                      width: 30,
                      height: 30,
                      borderRadius: 15,
                      backgroundColor: 'rgba(0,0,0,0.5)',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <X size={16} color="#ffffff" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{ alignItems: 'center' }}>
                  <ImagePlus size={32} color="#94a3b8" />
                  <Text style={{ marginTop: 8, fontSize: 13, color: '#64748b', fontWeight: '500' }}>
                    {copy.selectImage || 'Chọn ảnh'}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Action Buttons */}
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              activeOpacity={0.8}
              style={{
                flex: 1,
                height: 52,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#e2e8f0',
                backgroundColor: '#ffffff',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#475569' }}>
                {language === 'vi' ? 'Quay lại' : 'Back'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSubmit}
              activeOpacity={0.8}
              disabled={isCreating || isUpdating}
              style={{
                flex: 1,
                height: 52,
                borderRadius: 12,
                backgroundColor: APP_BRAND_COLOR,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isCreating || isUpdating ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#ffffff' }}>
                  {isEditing ? (copy.saveChanges || 'Lưu thay đổi') : (copy.createEvent || 'Tạo sự kiện')}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Start Date Picker Modal (iOS) */}
      {showStartDatePicker && Platform.OS === 'ios' && (
        <Modal transparent animationType="slide" visible={showStartDatePicker}>
          <View className="flex-1 justify-end bg-black/50">
            <View className="bg-white rounded-t-2xl p-4">
              <View className="flex-row justify-between items-center mb-4">
                <TouchableOpacity onPress={() => setShowStartDatePicker(false)}>
                  <Text className="text-[#65676B]">{copy.cancel}</Text>
                </TouchableOpacity>
                <Text className="text-title-primary font-semibold">{copy.selectStartDate}</Text>
                <TouchableOpacity onPress={() => setShowStartDatePicker(false)}>
                  <Check size={24} color={APP_BRAND_COLOR} />
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={formData.startDate || new Date()}
                mode="date"
                display="spinner"
                onChange={handleStartDateChange}
                minimumDate={new Date()}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Start Date Picker (Android) */}
      {showStartDatePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={formData.startDate || new Date()}
          mode="date"
          display="spinner"
          onChange={handleStartDateChange}
          minimumDate={new Date()}
        />
      )}

      {/* Start Time Picker Modal (iOS) */}
      {showStartTimePicker && Platform.OS === 'ios' && (
        <Modal transparent animationType="slide" visible={showStartTimePicker}>
          <View className="flex-1 justify-end bg-black/50">
            <View className="bg-white rounded-t-2xl p-4">
              <View className="flex-row justify-between items-center mb-4">
                <TouchableOpacity onPress={() => setShowStartTimePicker(false)}>
                  <Text className="text-[#65676B]">{copy.cancel}</Text>
                </TouchableOpacity>
                <Text className="text-title-primary font-semibold">{copy.selectStartTime}</Text>
                <TouchableOpacity onPress={() => setShowStartTimePicker(false)}>
                  <Check size={24} color={APP_BRAND_COLOR} />
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={formData.startTime || new Date()}
                mode="time"
                display="spinner"
                onChange={handleStartTimeChange}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Start Time Picker (Android) */}
      {showStartTimePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={formData.startTime || new Date()}
          mode="time"
          display="spinner"
          onChange={handleStartTimeChange}
        />
      )}

      {/* End Date Picker Modal (iOS) */}
      {showEndDatePicker && Platform.OS === 'ios' && (
        <Modal transparent animationType="slide" visible={showEndDatePicker}>
          <View className="flex-1 justify-end bg-black/50">
            <View className="bg-white rounded-t-2xl p-4">
              <View className="flex-row justify-between items-center mb-4">
                <TouchableOpacity onPress={() => setShowEndDatePicker(false)}>
                  <Text className="text-[#65676B]">{copy.cancel}</Text>
                </TouchableOpacity>
                <Text className="text-title-primary font-semibold">{copy.selectEndDate}</Text>
                <TouchableOpacity onPress={() => setShowEndDatePicker(false)}>
                  <Check size={24} color={APP_BRAND_COLOR} />
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={formData.endDate || new Date()}
                mode="date"
                display="spinner"
                onChange={handleEndDateChange}
                minimumDate={formData.startDate || new Date()}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* End Date Picker (Android) */}
      {showEndDatePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={formData.endDate || new Date()}
          mode="date"
          display="spinner"
          onChange={handleEndDateChange}
          minimumDate={formData.startDate || new Date()}
        />
      )}

      {/* End Time Picker Modal (iOS) */}
      {showEndTimePicker && Platform.OS === 'ios' && (
        <Modal transparent animationType="slide" visible={showEndTimePicker}>
          <View className="flex-1 justify-end bg-black/50">
            <View className="bg-white rounded-t-2xl p-4">
              <View className="flex-row justify-between items-center mb-4">
                <TouchableOpacity onPress={() => setShowEndTimePicker(false)}>
                  <Text className="text-[#65676B]">{copy.cancel}</Text>
                </TouchableOpacity>
                <Text className="text-title-primary font-semibold">{copy.selectEndTime}</Text>
                <TouchableOpacity onPress={() => setShowEndTimePicker(false)}>
                  <Check size={24} color={APP_BRAND_COLOR} />
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={formData.endTime || new Date()}
                mode="time"
                display="spinner"
                onChange={handleEndTimeChange}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* End Time Picker (Android) */}
      {showEndTimePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={formData.endTime || new Date()}
          mode="time"
          display="spinner"
          onChange={handleEndTimeChange}
        />
      )}

    </View>
  );
}

export default CreateEventScreen;

// Description: Renders the VNSEEA six-step create event wizard with date/time pickers and image selection.
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
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
import { showToast, ToastContainer } from '../../../shared-kernel/presentation/components/ToastNotification';

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
      : createEvent(eventData).then(success => ({ success }));

    submitAction.then(result => {
      console.log('[CreateEventScreen] Submit event result:', result.success);
      if (result.success) {
        showToast({
          message: isEditing ? 'Cập nhật sự kiện thành công!' : 'Tạo sự kiện thành công!',
          type: 'success',
        });
        setTimeout(() => {
          navigation.navigate(ROUTES.EVENTS);
        }, 1500);
      } else {
        showToast({
          message: result.error ?? 'Không thể lưu sự kiện. Vui lòng thử lại.',
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
                Tên sự kiện
              </Text>
              <View className="input-shell flex-row px-4 min-h-[54px] items-center">
                <PartyPopper size={20} color="#64748B" />
                <TextInput
                  className="ml-3 flex-1 text-body-primary"
                  placeholder="Nhập tên sự kiện"
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
                Ngày bắt đầu
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
                  {formData.startDate ? formatDate(formData.startDate) : 'Chọn ngày'}
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
                Giờ bắt đầu
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
                  {formData.startTime ? formatTime(formData.startTime) : 'Chọn giờ'}
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
                Ngày kết thúc
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
                  {formData.endDate ? formatDate(formData.endDate) : 'Chọn ngày'}
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
                Giờ kết thúc
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
                  {formData.endTime ? formatTime(formData.endTime) : 'Chọn giờ'}
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
            className="preview-panel min-h-[210px] items-center justify-center border border-dashed border-[#0000ff] p-6"
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
                  Đổi ảnh khác
                </Text>
              </View>
            ) : (
              <>
                <ImagePlus size={48} color="#0000FF" />
                <Text className="mt-4 text-title-primary text-brand">
                  Chọn ảnh từ thư viện
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
                Vị trí sự kiện
              </Text>
              <View className="input-shell flex-row px-4 min-h-[54px] items-center">
                <MapPin size={20} color="#64748B" />
                <TextInput
                  className="ml-3 flex-1 text-body-primary"
                  placeholder="Chọn vị trí"
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
                Mô tả sự kiện
              </Text>
              <View className="input-shell min-h-[190px] items-start py-3 px-4">
                <TextInput
                  className="flex-1 w-full text-body-primary"
                  placeholder="Nhập mô tả tại đây"
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
      case 0: return 'Tên sự kiện';
      case 1: return 'Thời gian bắt đầu';
      case 2: return 'Thời gian kết thúc';
      case 3: return 'Ảnh sự kiện';
      case 4: return 'Vị trí';
      case 5: return 'Mô tả sự kiện';
      default: return '';
    }
  }

  function getStepHelper(): string {
    switch (step) {
      case 0: return 'Đặt tên ngắn gọn, rõ ràng cho sự kiện của bạn.';
      case 1: return 'Chọn ngày và giờ bắt đầu cho sự kiện.';
      case 2: return 'Chọn thời điểm kết thúc để khách mời nắm lịch.';
      case 3: return 'Chọn ảnh nổi bật để sự kiện hấp dẫn hơn.';
      case 4: return 'Thêm địa điểm hoặc nơi tổ chức sự kiện.';
      case 5: return 'Mô tả nội dung, agenda hoặc thông tin cần biết.';
      default: return '';
    }
  }

  function getStepIcon() {
    switch (step) {
      case 0: return <PartyPopper size={28} color="#0000FF" />;
      case 1: return <Clock size={28} color="#0000FF" />;
      case 2: return <Clock size={28} color="#0000FF" />;
      case 3: return <ImagePlus size={28} color="#0000FF" />;
      case 4: return <MapPin size={28} color="#0000FF" />;
      case 5: return <Info size={28} color="#0000FF" />;
      default: return <PartyPopper size={28} color="#0000FF" />;
    }
  }

  return (
    <SafeAreaView className="flex-1 surface-base" edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0000FF" />
      <View className="surface-brand h-16 flex-row items-center justify-between px-4">
        <TouchableOpacity
          className="h-10 w-10 items-center justify-center rounded-full"
          activeOpacity={0.8}
          onPress={back}
        >
          <ArrowLeft size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text className="text-heading text-inverse">
          {isEditing ? 'Sửa sự kiện' : 'Tạo sự kiện'}
        </Text>
        <Text className="text-title-primary text-inverse">{`Bước ${step + 1}/6`}</Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-8 pt-5"
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-6">
          <View className="progress-track">
            <View className="progress-fill" style={{ width: progress as any }} />
          </View>
          <Text className="mt-2 text-right text-caption-secondary">
            {progress} hoàn thành
          </Text>
        </View>

        <View className="surface-card p-5">
          <View className="mb-5 flex-row items-center">
            <View className="icon-chip h-14 w-14 items-center justify-center">
              {getStepIcon()}
            </View>
            <View className="ml-4 flex-1">
              <Text className="text-display">{getStepTitle()}</Text>
              <Text className="mt-1 text-body-secondary">{getStepHelper()}</Text>
            </View>
          </View>

          {renderStepContent()}

          <View className="form-note-panel mt-6 flex-row items-start p-4">
            <Info size={20} color="#64748B" />
            <Text className="ml-3 flex-1 text-caption-secondary">
              Sau khi hoàn tất, sự kiện sẽ hiển thị trên feed và trang sự kiện
              của bạn.
            </Text>
          </View>
        </View>
      </ScrollView>

      <View className="px-5 pb-6">
        <TouchableOpacity
          className="btn-primary min-h-[54px]"
          activeOpacity={0.9}
          onPress={next}
          disabled={isCreating || isUpdating}
        >
          {isCreating || isUpdating ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text className="text-title-primary text-inverse">
              {step === 5 ? (isEditing ? 'Lưu thay đổi' : 'Hoàn tất') : 'Tiếp tục'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Start Date Picker Modal (iOS) */}
      {showStartDatePicker && Platform.OS === 'ios' && (
        <Modal transparent animationType="slide" visible={showStartDatePicker}>
          <View className="flex-1 justify-end bg-black/50">
            <View className="bg-white rounded-t-2xl p-4">
              <View className="flex-row justify-between items-center mb-4">
                <TouchableOpacity onPress={() => setShowStartDatePicker(false)}>
                  <Text className="text-[#65676B]">Hủy</Text>
                </TouchableOpacity>
                <Text className="text-title-primary font-semibold">Chọn ngày bắt đầu</Text>
                <TouchableOpacity onPress={() => setShowStartDatePicker(false)}>
                  <Check size={24} color="#0000FF" />
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
          display="default"
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
                  <Text className="text-[#65676B]">Hủy</Text>
                </TouchableOpacity>
                <Text className="text-title-primary font-semibold">Chọn giờ bắt đầu</Text>
                <TouchableOpacity onPress={() => setShowStartTimePicker(false)}>
                  <Check size={24} color="#0000FF" />
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
          display="default"
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
                  <Text className="text-[#65676B]">Hủy</Text>
                </TouchableOpacity>
                <Text className="text-title-primary font-semibold">Chọn ngày kết thúc</Text>
                <TouchableOpacity onPress={() => setShowEndDatePicker(false)}>
                  <Check size={24} color="#0000FF" />
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
          display="default"
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
                  <Text className="text-[#65676B]">Hủy</Text>
                </TouchableOpacity>
                <Text className="text-title-primary font-semibold">Chọn giờ kết thúc</Text>
                <TouchableOpacity onPress={() => setShowEndTimePicker(false)}>
                  <Check size={24} color="#0000FF" />
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
          display="default"
          onChange={handleEndTimeChange}
        />
      )}

      {/* Toast Notification */}
      <ToastContainer />
    </SafeAreaView>
  );
}

export default CreateEventScreen;

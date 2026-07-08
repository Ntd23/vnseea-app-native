// Description: Màn hình tạo việc làm mới với form nhập thông tin và gọi API create job.
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ArrowLeft,
  Briefcase,
  Camera,
  ChevronDown,
  DollarSign,
  FileText,
  ImagePlus,
  X,
} from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { launchImageLibrary } from 'react-native-image-picker';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import { useCreateJobViewModel } from '../../application/view-models/useCreateJobViewModel';
import type { JobType } from '../../domain/types/jobs.types';
import { JOB_TYPE_VIETNAMESE, JOB_CATEGORIES, SALARY_DATE_OPTIONS } from '../../domain/types/jobs.types';
import { AddressAutocomplete } from '../../../shared-kernel/presentation/components/AddressAutocomplete';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';

type CreateJobNav = NativeStackNavigationProp<RootStackParamList>;
type CreateJobRoute = RouteProp<RootStackParamList, typeof ROUTES.CREATE_JOB>;

const BRAND = '#0000ff';

const JOB_TYPES: JobType[] = ['full_time', 'part_time', 'internship', 'volunteer', 'contract'];

function DropdownField({
  label,
  value,
  options,
  onPress,
  placeholder,
}: {
  label: string;
  value: string;
  options: Record<string, string>;
  onPress: () => void;
  placeholder: string;
}) {
  const displayValue = value ? options[value] || value : placeholder;

  return (
    <TouchableOpacity
      className="mb-4"
      activeOpacity={0.8}
      onPress={onPress}
    >
      <Text className="mb-1.5 text-sm font-medium text-slate-700">{label}</Text>
      <View className="flex-row items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
        <Text className={`flex-1 ${value ? 'text-slate-900' : 'text-slate-400'}`}>
          {displayValue}
        </Text>
        <ChevronDown size={20} color="#94A3B8" />
      </View>
    </TouchableOpacity>
  );
}

function CreateJobScreen() {
  const navigation = useNavigation<CreateJobNav>();
  const route = useRoute<CreateJobRoute>();
  const { createJob, isLoading, error, clearError, myPages, isLoadingPages } = useCreateJobViewModel();
  const initialPageId = route.params?.pageId ? String(route.params.pageId) : '';
  const initialPageName = route.params?.pageName || '';

  // Form state
  const [jobTitle, setJobTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [jobType, setJobType] = useState<JobType>('full_time');
  const [category, setCategory] = useState('');
  const [minimumSalary, setMinimumSalary] = useState('');
  const [maximumSalary, setMaximumSalary] = useState('');
  const [salaryDate, setSalaryDate] = useState('');
  const [selectedPageId, setSelectedPageId] = useState(initialPageId);
  const [selectedPageName, setSelectedPageName] = useState(initialPageName);
  const [thumbnail, setThumbnail] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [imageType, setImageType] = useState<'cover' | 'upload'>('cover');

  // Modal state
  const [showJobTypeModal, setShowJobTypeModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showSalaryDateModal, setShowSalaryDateModal] = useState(false);
  const [showPageModal, setShowPageModal] = useState(false);

  const handlePickThumbnail = useCallback(async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 800,
        maxHeight: 400,
      });

      if (result.assets?.[0]?.uri) {
        const asset = result.assets[0];
        setThumbnail({
          uri: asset.uri!,
          name: asset.fileName || `job_${Date.now()}.jpg`,
          type: asset.type || 'image/jpeg',
        });
        setImageType('upload');
      }
    } catch (err) {
      console.log('Error picking thumbnail:', err);
    }
  }, []);

  const handleRemoveThumbnail = useCallback(() => {
    setThumbnail(null);
    setImageType('cover');
  }, []);

  const handleSubmit = useCallback(async () => {
    // Validation
    if (!jobTitle.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tiêu đề công việc');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập mô tả công việc');
      return;
    }
    if (!location.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập địa điểm');
      return;
    }
    if (!category) {
      Alert.alert('Lỗi', 'Vui lòng chọn danh mục');
      return;
    }
    if (!selectedPageId) {
      Alert.alert('Lỗi', 'Vui lòng chọn Trang để đăng việc làm');
      return;
    }

    try {
      await createJob({
        jobTitle: jobTitle.trim(),
        description: description.trim(),
        location: location.trim(),
        jobType,
        category,
        pageId: selectedPageId,
        minimum: minimumSalary ? Number(minimumSalary) : undefined,
        maximum: maximumSalary ? Number(maximumSalary) : undefined,
        salaryDate: salaryDate || undefined,
        imageType,
        thumbnail: thumbnail ?? undefined,
      });

      Alert.alert('Thành công', 'Việc làm đã được tạo thành công!', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Không thể tạo việc làm. Vui lòng thử lại.');
    }
  }, [jobTitle, description, location, jobType, category, selectedPageId, minimumSalary, maximumSalary, salaryDate, imageType, thumbnail, createJob, navigation]);

  const hasFormData = jobTitle || description || location || category || selectedPageId;

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <FocusAwareStatusBar barStyle="dark-content" />

      {/* Header */}
      <View className="h-14 flex-row items-center justify-between border-b border-slate-200 bg-white px-4">
        <TouchableOpacity
          className="h-10 w-10 items-center justify-center rounded-full"
          activeOpacity={0.8}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-slate-900">Tạo việc làm</Text>
        <TouchableOpacity
          className={`h-10 min-w-[60px] items-center justify-center rounded-full px-4 ${
            hasFormData && !isLoading ? 'bg-blue-600' : 'bg-slate-200'
          }`}
          activeOpacity={hasFormData && !isLoading ? 0.8 : 1}
          disabled={!hasFormData || isLoading}
          onPress={handleSubmit}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text className={`text-sm font-semibold ${hasFormData ? 'text-white' : 'text-slate-400'}`}>
              Đăng
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-4 py-6 pb-10"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Page Selection */}
          <View className="mb-6">
            <Text className="mb-1.5 text-sm font-medium text-slate-700">Trang đăng việc *</Text>
            <TouchableOpacity
              className="flex-row items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3"
              activeOpacity={0.8}
              onPress={() => setShowPageModal(true)}
            >
              {selectedPageId ? (
                <Text className="text-slate-900">Đã chọn trang</Text>
              ) : (
                <Text className="text-slate-400">Chọn trang để đăng việc làm</Text>
              )}
              <ChevronDown size={20} color="#94A3B8" />
            </TouchableOpacity>
            {myPages.length > 0 && (
              <Text className="mt-1 text-xs text-slate-500">
                Bạn có {myPages.length} trang. Chỉ trang của bạn mới có thể tạo việc làm.
              </Text>
            )}
          </View>

          {/* Job Title */}
          <View className="mb-4">
            <Text className="mb-1.5 text-sm font-medium text-slate-700">Tiêu đề *</Text>
            <TextInput
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900"
              placeholder="VD: Senior React Native Developer"
              placeholderTextColor="#94A3B8"
              value={jobTitle}
              onChangeText={setJobTitle}
            />
          </View>

          {/* Job Type */}
          <DropdownField
            label="Loại công việc"
            value={jobType}
            options={JOB_TYPE_VIETNAMESE}
            onPress={() => setShowJobTypeModal(true)}
            placeholder="Chọn loại công việc"
          />

          {/* Category */}
          <DropdownField
            label="Danh mục"
            value={category}
            options={JOB_CATEGORIES}
            onPress={() => setShowCategoryModal(true)}
            placeholder="Chọn danh mục"
          />

          {/* Location with Google Places Autocomplete */}
          <View className="mb-4 z-50">
            <Text className="mb-1.5 text-sm font-medium text-slate-700">Địa điểm *</Text>
            <AddressAutocomplete
              value={location}
              onChangeText={setLocation}
              onSelectPlace={(place) => {
                // When user selects a place, update the location
                setLocation(place.mainText);
              }}
              placeholder="VD: Quận 1, TP. HCM"
            />
          </View>

          {/* Salary */}
          <View className="mb-4">
            <Text className="mb-1.5 text-sm font-medium text-slate-700">Mức lương (triệu VNĐ)</Text>
            <View className="flex-row gap-3">
              <View className="flex-1 flex-row items-center rounded-xl border border-slate-200 bg-white px-4 py-3">
                <DollarSign size={18} color="#94A3B8" />
                <TextInput
                  className="ml-2 flex-1 text-slate-900"
                  placeholder="Từ"
                  placeholderTextColor="#94A3B8"
                  value={minimumSalary}
                  onChangeText={setMinimumSalary}
                  keyboardType="numeric"
                />
              </View>
              <View className="flex-1 flex-row items-center rounded-xl border border-slate-200 bg-white px-4 py-3">
                <DollarSign size={18} color="#94A3B8" />
                <TextInput
                  className="ml-2 flex-1 text-slate-900"
                  placeholder="Đến"
                  placeholderTextColor="#94A3B8"
                  value={maximumSalary}
                  onChangeText={setMaximumSalary}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>

          {/* Salary Date */}
          <DropdownField
            label="Chu kỳ trả lương"
            value={salaryDate}
            options={SALARY_DATE_OPTIONS}
            onPress={() => setShowSalaryDateModal(true)}
            placeholder="Chọn chu kỳ"
          />

          {/* Description */}
          <View className="mb-4">
            <Text className="mb-1.5 text-sm font-medium text-slate-700">Mô tả công việc *</Text>
            <TextInput
              className="min-h-[150px] rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900"
              placeholder="Mô tả chi tiết về công việc, yêu cầu, quyền lợi..."
              placeholderTextColor="#94A3B8"
              value={description}
              onChangeText={setDescription}
              multiline
              textAlignVertical="top"
            />
          </View>

          {/* Thumbnail */}
          <View className="mb-6">
            <Text className="mb-1.5 text-sm font-medium text-slate-700">Hình ảnh</Text>
            {thumbnail ? (
              <View className="relative overflow-hidden rounded-2xl border border-slate-200">
                <Image
                  source={{ uri: thumbnail.uri }}
                  className="h-40 w-full"
                  resizeMode="cover"
                />
                <TouchableOpacity
                  className="absolute right-2 top-2 h-8 w-8 items-center justify-center rounded-full bg-black/50"
                  activeOpacity={0.8}
                  onPress={handleRemoveThumbnail}
                >
                  <X size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                className="h-32 items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-white"
                activeOpacity={0.8}
                onPress={handlePickThumbnail}
              >
                <ImagePlus size={32} color="#94A3B8" />
                <Text className="mt-2 text-sm text-slate-500">Thêm hình ảnh (tùy chọn)</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              className="mt-2 flex-row items-center justify-center"
              activeOpacity={0.8}
              onPress={handlePickThumbnail}
            >
              <Camera size={16} color={BRAND} />
              <Text className="ml-2 text-sm text-brand">Hoặc dùng ảnh bìa trang</Text>
            </TouchableOpacity>
          </View>

          {/* Info */}
          <View className="rounded-xl bg-slate-100 p-4">
            <Text className="text-sm text-slate-500">
              💡 Việc làm sẽ được đăng dưới dạng bài viết trên trang bạn chọn. Bạn cần là chủ sở hữu trang mới có thể tạo việc làm.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Job Type Modal */}
      {showJobTypeModal && (
        <View className="absolute inset-0 bg-black/50" style={{ zIndex: 100 }}>
          <TouchableOpacity
            className="flex-1"
            activeOpacity={1}
            onPress={() => setShowJobTypeModal(false)}
          />
          <View className="rounded-t-3xl bg-white p-6">
            <Text className="mb-4 text-lg font-bold text-slate-900">Chọn loại công việc</Text>
            {JOB_TYPES.map((type) => (
              <TouchableOpacity
                key={type}
                className={`flex-row items-center justify-between py-3 ${
                  jobType === type ? 'border-b border-slate-100' : ''
                }`}
                activeOpacity={0.8}
                onPress={() => {
                  setJobType(type);
                  setShowJobTypeModal(false);
                }}
              >
                <Text className={`text-base ${jobType === type ? 'font-semibold text-blue-600' : 'text-slate-700'}`}>
                  {JOB_TYPE_VIETNAMESE[type]}
                </Text>
                {jobType === type && <View className="h-2 w-2 rounded-full bg-blue-600" />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <View className="absolute inset-0 bg-black/50" style={{ zIndex: 100 }}>
          <TouchableOpacity
            className="flex-1"
            activeOpacity={1}
            onPress={() => setShowCategoryModal(false)}
          />
          <View className="max-h-[70%] rounded-t-3xl bg-white p-6">
            <Text className="mb-4 text-lg font-bold text-slate-900">Chọn danh mục</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {Object.entries(JOB_CATEGORIES).map(([key, label]) => (
                <TouchableOpacity
                  key={key}
                  className={`flex-row items-center justify-between py-3 ${
                    category === key ? 'border-b border-slate-100' : ''
                  }`}
                  activeOpacity={0.8}
                  onPress={() => {
                    setCategory(key);
                    setShowCategoryModal(false);
                  }}
                >
                  <Text className={`text-base ${category === key ? 'font-semibold text-blue-600' : 'text-slate-700'}`}>
                    {label}
                  </Text>
                  {category === key && <View className="h-2 w-2 rounded-full bg-blue-600" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}

      {/* Salary Date Modal */}
      {showSalaryDateModal && (
        <View className="absolute inset-0 bg-black/50" style={{ zIndex: 100 }}>
          <TouchableOpacity
            className="flex-1"
            activeOpacity={1}
            onPress={() => setShowSalaryDateModal(false)}
          />
          <View className="rounded-t-3xl bg-white p-6">
            <Text className="mb-4 text-lg font-bold text-slate-900">Chu kỳ trả lương</Text>
            {Object.entries(SALARY_DATE_OPTIONS).map(([key, label]) => (
              <TouchableOpacity
                key={key}
                className={`flex-row items-center justify-between py-3 ${
                  salaryDate === key ? 'border-b border-slate-100' : ''
                }`}
                activeOpacity={0.8}
                onPress={() => {
                  setSalaryDate(key);
                  setShowSalaryDateModal(false);
                }}
              >
                <Text className={`text-base ${salaryDate === key ? 'font-semibold text-blue-600' : 'text-slate-700'}`}>
                  {label}
                </Text>
                {salaryDate === key && <View className="h-2 w-2 rounded-full bg-blue-600" />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Page Selection Modal */}
      {showPageModal && (
        <View className="absolute inset-0 bg-black/50" style={{ zIndex: 100 }}>
          <TouchableOpacity
            className="flex-1"
            activeOpacity={1}
            onPress={() => setShowPageModal(false)}
          />
          <View className="max-h-[70%] rounded-t-3xl bg-white p-6">
            <Text className="mb-4 text-lg font-bold text-slate-900">Chọn trang</Text>
            {isLoadingPages ? (
              <ActivityIndicator size="large" color={BRAND} />
            ) : myPages.length > 0 ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                {myPages.map((page) => (
                  <TouchableOpacity
                    key={page.page_id}
                    className={`flex-row items-center gap-3 py-3 ${
                      selectedPageId === String(page.page_id) ? 'border-b border-slate-100' : ''
                    }`}
                    activeOpacity={0.8}
                    onPress={() => {
                      setSelectedPageId(String(page.page_id));
                      setSelectedPageName(page.page_title || page.page_name || '');
                      setShowPageModal(false);
                    }}
                  >
                    <View className="h-10 w-10 items-center justify-center rounded-full bg-slate-200">
                      <Briefcase size={20} color="#64748B" />
                    </View>
                    <View className="flex-1">
                      <Text className={`text-base ${selectedPageId === String(page.page_id) ? 'font-semibold text-blue-600' : 'text-slate-700'}`}>
                        {page.page_title}
                      </Text>
                      <Text className="text-xs text-slate-500">@{page.page_name}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <Text className="text-center text-slate-500">
                Bạn chưa có trang nào. Vui lòng tạo trang trước.
              </Text>
            )}
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

export default CreateJobScreen;

// English description: Renders the native form for creating a job through the existing backend API.
import { APP_BRAND_COLOR } from '../../../shared-kernel/presentation/theme/appColors';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  ChevronDown,
  ImagePlus,
  PlusCircle,
  X,
} from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';
import { getJobsCopy } from '../../application/i18n/jobsCopy';
import { SafeAreaFeedHeader } from '../../../feed/presentation/components/SafeAreaFeedHeader';
import { launchImageLibrary } from 'react-native-image-picker';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import { useCreateJobViewModel } from '../../application/view-models/useCreateJobViewModel';
import type { JobsItem, JobType } from '../../domain/types/jobs.types';
import { AddressAutocomplete } from '../../../shared-kernel/presentation/components/AddressAutocomplete';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import { profilePostsChangedEvents } from '../../../feed/application/events/profilePostsChangedEvents';
import { mapProfileJobPost } from '../../../profile/application/services/profileCommercePosts';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';
import { feedCacheStorage } from '../../../shared-kernel/infrastructure/storage/feedCacheStorage';

type CreateJobNav = NativeStackNavigationProp<RootStackParamList>;
type CreateJobRoute = RouteProp<RootStackParamList, typeof ROUTES.CREATE_JOB>;

const BRAND = APP_BRAND_COLOR;

type JobQuestionDraft = {
  prompt: string;
  type: 'free_text_question' | 'yes_no_question' | 'multiple_choice_question';
  answers: string;
};

type SalaryFieldErrors = {
  minimum?: string;
  maximum?: string;
};

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
  const language = useAppLanguage();
  const copy = getJobsCopy(language);
  const { createJob, isLoading, myPages, metadata } = useCreateJobViewModel();
  const initialPageId = route.params?.pageId ? String(route.params.pageId) : '';

  // Form state
  const [jobTitle, setJobTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [jobCoordinate, setJobCoordinate] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [jobType, setJobType] = useState<JobType>('full_time');
  const [category, setCategory] = useState('');
  const [minimumSalary, setMinimumSalary] = useState('');
  const [maximumSalary, setMaximumSalary] = useState('');
  const [salaryErrors, setSalaryErrors] = useState<SalaryFieldErrors>({});
  const [salaryDate, setSalaryDate] = useState('');
  const [currency, setCurrency] = useState('');
  const [selectedPageId, setSelectedPageId] = useState(initialPageId);
  const [thumbnail, setThumbnail] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [imageType, setImageType] = useState<'cover' | 'upload'>('cover');
  const [questions, setQuestions] = useState<JobQuestionDraft[]>([]);

  // Modal state
  const [showJobTypeModal, setShowJobTypeModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showSalaryDateModal, setShowSalaryDateModal] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [questionTypeIndex, setQuestionTypeIndex] = useState<number | null>(null);
  const jobTypeLabels = useMemo(
    () => Object.fromEntries(metadata.types.map(option => [option.value, option.label])),
    [metadata.types],
  );
  const categoryLabels = useMemo(
    () => Object.fromEntries(metadata.categories.map(option => [option.value, option.label])),
    [metadata.categories],
  );
  const salaryDateLabels = useMemo(
    () => Object.fromEntries(metadata.salaryDates.map(option => [option.value, option.label])),
    [metadata.salaryDates],
  );
  const currencyLabels = useMemo(
    () => Object.fromEntries(metadata.currencies.map(option => [option.value, `${option.label}${option.symbol ? ` (${option.symbol})` : ''}`])),
    [metadata.currencies],
  );
  const selectedPage = useMemo(
    () => myPages.find(page => String(page.page_id) === selectedPageId),
    [myPages, selectedPageId],
  );
  const previewImage = thumbnail?.uri || (imageType === 'cover' ? selectedPage?.cover : '') || '';

  useEffect(() => {
    if (!selectedPageId && myPages[0]) {
      setSelectedPageId(String(myPages[0].page_id));
    }
  }, [myPages, selectedPageId]);

  useEffect(() => {
    if (!currency && metadata.currencies[0]) {
      setCurrency(metadata.currencies[0].value);
    }
    if (!salaryDate && metadata.salaryDates[0]) {
      setSalaryDate(metadata.salaryDates[0].value);
    }
  }, [currency, metadata.currencies, metadata.salaryDates, salaryDate]);

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
      Alert.alert(language === 'vi' ? 'Lỗi' : 'Error', copy.errorTitleRequired || 'Vui lòng nhập tiêu đề công việc');
      return;
    }
    if (!description.trim()) {
      Alert.alert(language === 'vi' ? 'Lỗi' : 'Error', copy.errorDescriptionRequired || 'Vui lòng nhập mô tả công việc');
      return;
    }
    if (!location.trim()) {
      Alert.alert(language === 'vi' ? 'Lỗi' : 'Error', copy.errorLocationRequired || 'Vui lòng nhập địa điểm');
      return;
    }

    const nextSalaryErrors: SalaryFieldErrors = {};
    const minimumText = minimumSalary.trim();
    const maximumText = maximumSalary.trim();
    const minimumValue = Number(minimumText);
    const maximumValue = Number(maximumText);

    if (!minimumText) {
      nextSalaryErrors.minimum = copy.errorSalaryMinRequired;
    } else if (!Number.isFinite(minimumValue) || minimumValue <= 0) {
      nextSalaryErrors.minimum = copy.errorSalaryInvalid;
    }

    if (!maximumText) {
      nextSalaryErrors.maximum = copy.errorSalaryMaxRequired;
    } else if (!Number.isFinite(maximumValue) || maximumValue <= 0) {
      nextSalaryErrors.maximum = copy.errorSalaryInvalid;
    }

    if (
      !nextSalaryErrors.minimum &&
      !nextSalaryErrors.maximum &&
      minimumValue > maximumValue
    ) {
      nextSalaryErrors.maximum = copy.errorSalaryRange;
    }

    if (Object.keys(nextSalaryErrors).length > 0) {
      setSalaryErrors(nextSalaryErrors);
      return;
    }
    setSalaryErrors({});

    if (!category) {
      Alert.alert(language === 'vi' ? 'Lỗi' : 'Error', copy.errorSelectCategory || 'Vui lòng chọn danh mục');
      return;
    }
    if (!selectedPageId) {
      Alert.alert(language === 'vi' ? 'Lỗi' : 'Error', language === 'vi' ? 'Vui lòng chọn Trang để đăng việc làm' : 'Please select a Page to post this job');
      return;
    }

    try {
      const result = await createJob({
        jobTitle: jobTitle.trim(),
            description: description.trim(),
            location: location.trim(),
            lat: jobCoordinate?.latitude.toString(),
            lng: jobCoordinate?.longitude.toString(),
            jobType,
        category,
        pageId: selectedPageId,
        minimum: minimumValue,
        maximum: maximumValue,
        salaryDate: salaryDate || undefined,
        currency: currency || undefined,
        questions: questions
          .filter(question => question.prompt.trim())
          .map(question => ({
            prompt: question.prompt.trim(),
            type: question.type,
            answers: question.type === 'multiple_choice_question'
              ? question.answers.split(',').map(answer => answer.trim()).filter(Boolean)
              : undefined,
          })),
        imageType,
        thumbnail: thumbnail ?? undefined,
      });

      const createdJob = result.data;
      const ownerId =
        createdJob?.page?.user_id ||
        createdJob?.user_id ||
        sessionStorage.getSession()?.userId ||
        '';
      const optimisticJob: JobsItem = {
        id:
          createdJob?.id ||
          result.job_id ||
          result.post_id ||
          `pending-${Date.now()}`,
        title: createdJob?.title || jobTitle.trim(),
        description: createdJob?.description || description.trim(),
        location: createdJob?.location || location.trim(),
            lat: createdJob?.lat ?? (jobCoordinate ? String(jobCoordinate.latitude) : undefined),
            lng: createdJob?.lng ?? (jobCoordinate ? String(jobCoordinate.longitude) : undefined),
        minimum: createdJob?.minimum ?? minimumValue,
        maximum: createdJob?.maximum ?? maximumValue,
        salary_date: createdJob?.salary_date || salaryDate || undefined,
        salary_date_label: createdJob?.salary_date_label,
        job_type: createdJob?.job_type || jobType,
        job_type_label: createdJob?.job_type_label || jobTypeLabels[jobType],
        category: createdJob?.category || category,
        category_label:
          createdJob?.category_label || categoryLabels[category],
        currency: createdJob?.currency || currency || undefined,
        currency_symbol: createdJob?.currency_symbol,
        image: createdJob?.image || previewImage,
        image_type: createdJob?.image_type || imageType,
        page_id: createdJob?.page_id || selectedPageId,
        user_id: createdJob?.user_id || ownerId,
        time:
          Number(createdJob?.time) > 0
            ? Number(createdJob?.time)
            : Math.floor(Date.now() / 1000),
        post_id: createdJob?.post_id || result.post_id,
        apply: createdJob?.apply,
        apply_count: createdJob?.apply_count,
        url: createdJob?.url,
        page:
          createdJob?.page ||
          (selectedPage
            ? {
                page_id: selectedPage.page_id,
                page_title: selectedPage.page_title,
                page_name: selectedPage.page_name,
                page_description: '',
                avatar: selectedPage.avatar,
                cover: selectedPage.cover,
                user_id: ownerId,
                is_page_onwer: true,
              }
            : undefined),
      };

      feedCacheStorage.setCachedJobs([
        optimisticJob,
        ...feedCacheStorage
          .getCachedJobs()
          .filter(job => String(job.id) !== String(optimisticJob.id)),
      ]);
      profilePostsChangedEvents.emit(
        mapProfileJobPost(optimisticJob, copy.company),
      );

      Alert.alert('Thành công', 'Việc làm đã được tạo thành công!', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (err: any) {
      Alert.alert(language === 'vi' ? 'Lỗi' : 'Error', err?.message || (copy.saveError || 'Không thể tạo việc làm. Vui lòng thử lại.'));
    }
      }, [jobTitle, description, location, jobCoordinate, jobType, category, selectedPageId, minimumSalary, maximumSalary, salaryDate, currency, questions, imageType, thumbnail, createJob, navigation, copy, language, selectedPage, previewImage, jobTypeLabels, categoryLabels]);

  const hasFormData = jobTitle || description || location || category || selectedPageId;

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <FocusAwareStatusBar
        barStyle="light-content"
        backgroundColor={BRAND}
        translucent={false}
      />
      <SafeAreaFeedHeader safeAreaBackgroundColor={BRAND} />

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
          {/* Job Title */}
          <View className="mb-4">
            <Text className="mb-1.5 text-sm font-bold text-slate-700">{copy.jobTitleLabel || "Chức danh công việc"}</Text>
            <TextInput
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900"
              placeholder={copy.jobTitlePlaceholder || "Chức danh công việc"}
              placeholderTextColor="#94A3B8"
              value={jobTitle}
              onChangeText={setJobTitle}
            />
          </View>

          {/* Location with Google Places Autocomplete */}
          <View className="mb-4 z-50">
            <Text className="mb-1.5 text-sm font-bold text-slate-700">{copy.locationLabel || "Địa điểm"}</Text>
                <AddressAutocomplete
                  value={location}
                  onChangeText={(text) => {
                    setLocation(text);
                    setJobCoordinate(null);
                  }}
                  onSelectPlace={(place) => {
                    setLocation(place.description);
                    if (typeof place.lat === 'number' && typeof place.lng === 'number') {
                      setJobCoordinate({
                        latitude: place.lat,
                        longitude: place.lng,
                      });
                    } else {
                      setJobCoordinate(null);
                    }
                  }}
              placeholder={language === "vi" ? "VD: Quận 1, TP. HCM" : "e.g. District 1, HCMC"}
            />
          </View>

          <View className="mb-4">
            <Text className="mb-1.5 text-sm font-bold text-slate-700">{copy.salary || "Mức lương"}</Text>
            <View className="flex-row gap-3">
              <View
                className={`flex-1 rounded-xl border bg-white px-3 py-3 ${
                  salaryErrors.minimum ? 'border-red-500' : 'border-slate-200'
                }`}
              >
                <TextInput
                  className="p-0 text-slate-900"
                  placeholder={copy.salaryMinPlaceholder || "VND Tối thiểu"}
                  placeholderTextColor="#94A3B8"
                  value={minimumSalary}
                  onChangeText={value => {
                    setMinimumSalary(value);
                    setSalaryErrors(current => ({
                      ...current,
                      minimum: undefined,
                      maximum:
                        current.maximum === copy.errorSalaryRange
                          ? undefined
                          : current.maximum,
                    }));
                  }}
                  keyboardType="numeric"
                />
              </View>
              <View
                className={`flex-1 rounded-xl border bg-white px-3 py-3 ${
                  salaryErrors.maximum ? 'border-red-500' : 'border-slate-200'
                }`}
              >
                <TextInput
                  className="p-0 text-slate-900"
                  placeholder={copy.salaryMaxPlaceholder || "VND Tối đa"}
                  placeholderTextColor="#94A3B8"
                  value={maximumSalary}
                  onChangeText={value => {
                    setMaximumSalary(value);
                    setSalaryErrors(current => ({
                      ...current,
                      maximum: undefined,
                    }));
                  }}
                  keyboardType="numeric"
                />
              </View>
            </View>
            {salaryErrors.minimum || salaryErrors.maximum ? (
              <View className="mt-1 flex-row gap-3">
                <Text className="flex-1 text-[11px] font-semibold text-red-500">
                  {salaryErrors.minimum || ''}
                </Text>
                <Text className="flex-1 text-[11px] font-semibold text-red-500">
                  {salaryErrors.maximum || ''}
                </Text>
              </View>
            ) : null}
            <View className="mt-2 flex-row gap-3">
              <TouchableOpacity className="min-h-[44px] flex-1 flex-row items-center rounded-xl border border-slate-200 bg-white px-3" onPress={() => setShowCurrencyModal(true)}>
                <Text className="flex-1 text-[14px] text-slate-700" numberOfLines={1}>{currencyLabels[currency] || (language === 'vi' ? 'Tiền tệ' : 'Currency')}</Text>
                <ChevronDown size={18} color="#64748B" />
              </TouchableOpacity>
              <TouchableOpacity className="min-h-[44px] flex-1 flex-row items-center rounded-xl border border-slate-200 bg-white px-3" onPress={() => setShowSalaryDateModal(true)}>
                <Text className="flex-1 text-[14px] text-slate-700" numberOfLines={1}>{salaryDateLabels[salaryDate] || (language === 'vi' ? 'Chu kỳ' : 'Period')}</Text>
                <ChevronDown size={18} color="#64748B" />
              </TouchableOpacity>
            </View>
          </View>

          <DropdownField
            label={copy.jobType || "Loại công việc"}
            value={jobType}
            options={jobTypeLabels}
            onPress={() => setShowJobTypeModal(true)}
            placeholder={language === 'vi' ? 'Chọn loại công việc' : 'Select job type'}
          />

          <DropdownField
            label={copy.category || "Loại"}
            value={category}
            options={categoryLabels}
            onPress={() => setShowCategoryModal(true)}
            placeholder={language === 'vi' ? 'Chọn loại' : 'Select category'}
          />

          {/* Description */}
          <View className="mb-4">
            <Text className="mb-1.5 text-sm font-bold text-slate-700">{copy.jobDescriptionLabel || "Sự mô tả"}</Text>
            <TextInput
              className="min-h-[130px] rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900"
              placeholder={copy.jobDescriptionPlaceholder || "Mô tả các trách nhiệm và kỹ năng ưu tiên cho công việc này"}
              placeholderTextColor="#94A3B8"
              value={description}
              onChangeText={setDescription}
              multiline
              textAlignVertical="top"
            />
            <Text className="mt-1 text-[11px] text-slate-400">{copy.jobDescriptionPlaceholder || "Mô tả các trách nhiệm và kỹ năng ưu tiên cho công việc này"}</Text>
          </View>

          <View className="mb-5">
            <Text className="mb-2 text-sm font-bold text-slate-700">{language === "vi" ? "Câu hỏi tuyển dụng" : "Screening Questions"}</Text>
            {questions.map((question, index) => (
              <View key={`question-${index}`} className="mb-3 rounded-md bg-slate-100 p-3">
                <View className="mb-2 flex-row items-center justify-between">
                  <Text className="text-[13px] font-bold text-slate-700">{language === "vi" ? "Câu hỏi" : "Question"} {index + 1}</Text>
                  <TouchableOpacity
                    className="h-7 w-7 items-center justify-center rounded-full bg-slate-200"
                    onPress={() => setQuestions(current => current.filter((_, itemIndex) => itemIndex !== index))}
                  >
                    <X size={15} color="#64748B" />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  className="min-h-[44px] flex-row items-center rounded-md border border-slate-200 bg-white px-3"
                  onPress={() => setQuestionTypeIndex(index)}
                >
                  <Text className="flex-1 text-[13px] text-slate-600">
                    {metadata.questionTypes.find(option => option.value === question.type)?.label || question.type}
                  </Text>
                  <ChevronDown size={17} color="#64748B" />
                </TouchableOpacity>
                <TextInput
                  className="mt-3 min-h-[58px] rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-900"
                  placeholder={language === "vi" ? "Nhập câu hỏi" : "Enter question"}
                  placeholderTextColor="#94A3B8"
                  value={question.prompt}
                  onChangeText={prompt => setQuestions(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, prompt } : item))}
                  multiline
                  textAlignVertical="top"
                />
                {question.type === 'multiple_choice_question' ? (
                  <TextInput
                    className="mt-3 rounded-md border border-slate-200 bg-white px-3 py-3 text-slate-900"
                    placeholder={language === "vi" ? "Các lựa chọn, cách nhau bằng dấu phẩy" : "Options, separated by commas"}
                    placeholderTextColor="#94A3B8"
                    value={question.answers}
                    onChangeText={answers => setQuestions(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, answers } : item))}
                  />
                ) : null}
              </View>
            ))}
            {questions.length < 3 ? (
              <TouchableOpacity
                className="min-h-[42px] flex-row items-center justify-center border border-slate-300 bg-slate-50"
                onPress={() => setQuestions(current => [...current, {
                  prompt: '',
                  type: 'free_text_question',
                  answers: '',
                }])}
              >
                <PlusCircle size={16} color="#64748B" />
                <Text className="ml-1 text-[13px] font-semibold text-slate-600">{language === "vi" ? "Thêm câu hỏi" : "Add Question"}</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <View className="mb-6">
            <Text className="mb-2 text-sm font-bold leading-5 text-slate-700">
              {language === "vi" ? "Thêm hình ảnh để giúp các ứng viên thấy được việc làm tại vị trí này như thế nào." : "Add an image to help candidates see what it is like to work in this position."}
            </Text>
            <View className="overflow-hidden rounded-md bg-slate-200">
              {previewImage ? (
                <Image source={{ uri: previewImage }} className="h-48 w-full" resizeMode="cover" />
              ) : (
                <View className="h-48 items-center justify-center">
                  <ImagePlus size={38} color="#94A3B8" />
                </View>
              )}
              <View className="absolute bottom-2 left-2 right-2 overflow-hidden rounded-md">
                <TouchableOpacity className="min-h-[42px] items-center justify-center bg-white/90" onPress={handlePickThumbnail}>
                  <Text className="text-[13px] font-bold text-slate-700">{language === "vi" ? "Duyệt để tải lên" : "Browse to upload"}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="mt-px min-h-[42px] items-center justify-center bg-white/90"
                  onPress={() => {
                    setThumbnail(null);
                    setImageType('cover');
                  }}
                >
                  <Text className="text-[13px] font-bold text-slate-700">{language === "vi" ? "Sử dụng ảnh bìa" : "Use cover image"}</Text>
                </TouchableOpacity>
              </View>
            </View>
            {thumbnail ? (
              <TouchableOpacity className="mt-2 self-end" onPress={handleRemoveThumbnail}>
                <Text className="text-[12px] font-semibold text-red-500">{language === "vi" ? "Xóa ảnh đã chọn" : "Remove selected image"}</Text>
              </TouchableOpacity>
            ) : (
              null
            )}
          </View>

          <View className="flex-row justify-end border-t border-slate-200 pt-4">
            <TouchableOpacity className="mr-3 min-h-[44px] justify-center px-3" onPress={() => navigation.goBack()}>
              <Text className="font-semibold text-slate-500">{language === "vi" ? "Quay lại" : "Back"}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`min-h-[44px] min-w-[110px] items-center justify-center rounded-md ${hasFormData && !isLoading ? 'bg-brand' : 'bg-slate-300'}`}
              disabled={!hasFormData || isLoading}
              onPress={handleSubmit}
            >
              {isLoading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text className="font-bold text-white">{copy.submitCreate || 'Đăng tin'}</Text>}
            </TouchableOpacity>
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
            <Text className="mb-4 text-lg font-bold text-slate-900">{language === "vi" ? "Chọn loại công việc" : "Select Job Type"}</Text>
            {metadata.types.map(option => {
              const type = option.value as JobType;
              return (
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
                <Text className={`text-base ${jobType === type ? 'font-semibold text-brand' : 'text-slate-700'}`}>
                  {option.label}
                </Text>
                {jobType === type && <View className="h-2 w-2 rounded-full bg-brand" />}
              </TouchableOpacity>
              );
            })}
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
            <Text className="mb-4 text-lg font-bold text-slate-900">{language === "vi" ? "Chọn danh mục" : "Select Category"}</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {metadata.categories.map(({ value: key, label }) => (
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
                  <Text className={`text-base ${category === key ? 'font-semibold text-brand' : 'text-slate-700'}`}>
                    {label}
                  </Text>
                  {category === key && <View className="h-2 w-2 rounded-full bg-brand" />}
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
            <Text className="mb-4 text-lg font-bold text-slate-900">{language === "vi" ? "Chu kỳ trả lương" : "Salary Period"}</Text>
            {metadata.salaryDates.map(({ value: key, label }) => (
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
                <Text className={`text-base ${salaryDate === key ? 'font-semibold text-brand' : 'text-slate-700'}`}>
                  {label}
                </Text>
                {salaryDate === key && <View className="h-2 w-2 rounded-full bg-brand" />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {showCurrencyModal && (
        <View className="absolute inset-0 bg-black/50" style={{ zIndex: 100 }}>
          <TouchableOpacity
            className="flex-1"
            activeOpacity={1}
            onPress={() => setShowCurrencyModal(false)}
          />
          <View className="max-h-[70%] rounded-t-3xl bg-white p-6">
            <Text className="mb-4 text-lg font-bold text-slate-900">{language === "vi" ? "Chọn tiền tệ" : "Select Currency"}</Text>
            <ScrollView showsVerticalScrollIndicator persistentScrollbar>
              {metadata.currencies.map(option => (
                <TouchableOpacity
                  key={option.value}
                  className="flex-row items-center justify-between border-b border-slate-100 py-3"
                  onPress={() => {
                    setCurrency(option.value);
                    setShowCurrencyModal(false);
                  }}
                >
                  <Text className={`text-base ${currency === option.value ? 'font-semibold text-brand' : 'text-slate-700'}`}>
                    {option.label}{option.symbol ? ` (${option.symbol})` : ''}
                  </Text>
                  {currency === option.value ? <View className="h-2 w-2 rounded-full bg-brand" /> : null}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}

      {questionTypeIndex !== null && questions[questionTypeIndex] ? (
        <View className="absolute inset-0 bg-black/50" style={{ zIndex: 100 }}>
          <TouchableOpacity className="flex-1" activeOpacity={1} onPress={() => setQuestionTypeIndex(null)} />
          <View className="rounded-t-3xl bg-white p-6">
            <Text className="mb-4 text-lg font-bold text-slate-900">{language === "vi" ? "Loại câu hỏi" : "Question Type"}</Text>
            {metadata.questionTypes.map(option => (
              <TouchableOpacity
                key={option.value}
                className="flex-row items-center justify-between border-b border-slate-100 py-3"
                onPress={() => {
                  setQuestions(current => current.map((question, index) => index === questionTypeIndex
                    ? { ...question, type: option.value as JobQuestionDraft['type'] }
                    : question));
                  setQuestionTypeIndex(null);
                }}
              >
                <Text className={`text-base ${questions[questionTypeIndex]?.type === option.value ? 'font-semibold text-brand' : 'text-slate-700'}`}>
                  {option.label}
                </Text>
                {questions[questionTypeIndex]?.type === option.value ? <View className="h-2 w-2 rounded-full bg-brand" /> : null}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

export default CreateJobScreen;

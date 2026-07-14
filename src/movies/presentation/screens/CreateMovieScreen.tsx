// Description: Renders the Create Movie composer (Tạo phim) for VnseeaRn.
//
// All state + validation lives in useCreateMovieViewModel — this file is a
// dumb view that binds ViewModel output to token-styled UI. Mirrors the
// layout pattern of CreateAlbumScreen + CreateStoryScreen.

import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { launchImageLibrary, type Asset } from 'react-native-image-picker';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  AlertCircle,
  Camera,
  Check,
  ChevronDown,
  Image as ImageIcon,
  Link2,
  Play,
  X,
} from 'lucide-react-native';
import type { RootStackParamList } from '../../../navigation/types';
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import {
  showToast,
  ToastContainer,
} from '../../../shared-kernel/presentation/components/ToastNotification';
import {
  useCreateMovieViewModel,
  type CoverAsset,
} from '../../application/view-models/useCreateMovieViewModel';
import { getCreateMovieCopy } from '../../application/i18n/moviesCopy';
import { FeedHeader } from '../../../feed/presentation/components/FeedHeader';
import type {
  MovieCountryKey,
  MovieGenreKey,
  MovieQuality,
} from '../../domain/types/movies.types';

type CreateMovieNav = NativeStackNavigationProp<RootStackParamList>;

const BRAND = '#0000ff';
const TEXT_PRIMARY = '#0f172a';
const TEXT_SECONDARY = '#64748b';
const ERROR_RED = '#ef4444';
const SURFACE_CARD = '#ffffff';
const SURFACE_BASE = '#f1f4fb';
const BORDER_LIGHT = 'rgba(0, 0, 255, 0.08)';

const COVER_RATIO = 570 / 400; // admin rule: ≤400×570
const COVER_DISPLAY_HEIGHT = 220;

interface PickerOption<TKey extends string> {
  key: TKey;
  label: string;
}

function PickerModal<TKey extends string>(props: {
  visible: boolean;
  title: string;
  options: PickerOption<TKey>[];
  selected: TKey | '';
  onClose: () => void;
  onSelect: (key: TKey) => void;
}) {
  const { visible, title, options, selected, onClose, onSelect } = props;
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        onPress={onClose}
        className="flex-1"
        style={{ backgroundColor: 'rgba(15, 23, 42, 0.45)' }}
      >
        <Pressable
          onPress={() => {}}
          className="mt-auto max-h-[80%] rounded-t-3xl bg-white px-4 pb-6 pt-4"
        >
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-[16px] font-semibold text-slate-800">
              {title}
            </Text>
            <Pressable
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              className="h-8 w-8 items-center justify-center rounded-full bg-slate-100"
            >
              <X size={18} color={TEXT_PRIMARY} />
            </Pressable>
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {options.map(option => {
              const isActive = selected === option.key;
              return (
                <Pressable
                  key={option.key}
                  onPress={() => {
                    onSelect(option.key);
                    onClose();
                  }}
                  className={`flex-row items-center justify-between rounded-2xl px-4 py-3 ${
                    isActive ? 'bg-blue-50' : 'bg-white'
                  }`}
                  style={
                    !isActive
                      ? {
                          borderWidth: 1,
                          borderColor: BORDER_LIGHT,
                          marginBottom: 8,
                        }
                      : { marginBottom: 8 }
                  }
                >
                  <Text
                    className={`text-[14px] ${
                      isActive
                        ? 'font-semibold text-[#0000ff]'
                        : 'font-medium text-slate-700'
                    }`}
                  >
                    {option.label}
                  </Text>
                  {isActive ? <Check size={18} color={BRAND} /> : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

interface FieldShellProps {
  label: string;
  required?: boolean;
  error?: string | null;
  helper?: string | null;
  children: React.ReactNode;
}

function FieldShell({ label, required, error, helper, children }: FieldShellProps) {
  return (
    <View className="mb-4">
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="text-[13px] font-semibold text-slate-700">
          {label}
          {required ? <Text style={{ color: ERROR_RED }}> *</Text> : null}
        </Text>
      </View>
      {children}
      {error ? (
        <View className="mt-1.5 flex-row items-center gap-1.5">
          <AlertCircle size={12} color={ERROR_RED} />
          <Text className="text-[12px] font-medium" style={{ color: ERROR_RED }}>
            {error}
          </Text>
        </View>
      ) : helper ? (
        <Text className="mt-1.5 text-[12px] text-slate-500">{helper}</Text>
      ) : null}
    </View>
  );
}

interface SelectFieldProps {
  label: string;
  placeholder: string;
  value: string;
  onPress: () => void;
  required?: boolean;
  error?: string | null;
}

function SelectField({
  label,
  placeholder,
  value,
  onPress,
  required,
  error,
}: SelectFieldProps) {
  return (
    <FieldShell label={label} required={required} error={error}>
      <Pressable
        onPress={onPress}
        className="flex-row items-center justify-between rounded-2xl px-4 py-3"
        style={{
          backgroundColor: SURFACE_BASE,
          borderWidth: 1,
          borderColor: error ? ERROR_RED : BORDER_LIGHT,
        }}
      >
        <Text
          className={`flex-1 text-[14px] ${
            value ? 'font-semibold text-slate-800' : 'text-slate-500'
          }`}
        >
          {value || placeholder}
        </Text>
        <ChevronDown size={18} color={TEXT_SECONDARY} />
      </Pressable>
    </FieldShell>
  );
}

function CreateMovieScreen() {
  const navigation = useNavigation<CreateMovieNav>();
  const language = useAppLanguage();
  const copy = getCreateMovieCopy(language);
  const vm = useCreateMovieViewModel();

  const [genreOpen, setGenreOpen] = useState(false);
  const [countryOpen, setCountryOpen] = useState(false);
  const [qualityOpen, setQualityOpen] = useState(false);

  // Build picker options from i18n copies.
  const genreOptions = useMemo<PickerOption<MovieGenreKey>[]>(
    () =>
      Object.entries(copy.genreOptions).map(([key, label]) => ({
        key: key as MovieGenreKey,
        label,
      })),
    [copy.genreOptions],
  );
  const countryOptions = useMemo<PickerOption<MovieCountryKey>[]>(
    () =>
      Object.entries(copy.countryOptions).map(([key, label]) => ({
        key: key as MovieCountryKey,
        label,
      })),
    [copy.countryOptions],
  );
  const qualityOptions = useMemo<PickerOption<MovieQuality>[]>(
    () =>
      Object.entries(copy.qualityOptions).map(([key, label]) => ({
        key: key as MovieQuality,
        label,
      })),
    [copy.qualityOptions],
  );

  const selectedGenreLabel = vm.genre ? copy.genreOptions[vm.genre] : '';
  const selectedCountryLabel = vm.country ? copy.countryOptions[vm.country] : '';
  const selectedQualityLabel = vm.quality ? copy.qualityOptions[vm.quality] : '';

  const hasDraft = useMemo(() => {
    return (
      vm.name.trim().length > 0 ||
      vm.description.trim().length > 0 ||
      vm.genre !== '' ||
      vm.country !== '' ||
      vm.stars.trim().length > 0 ||
      vm.producer.trim().length > 0 ||
      vm.release.trim().length > 0 ||
      vm.duration.trim().length > 0 ||
      vm.quality !== '' ||
      vm.rating.trim().length > 0 ||
      vm.source.trim().length > 0 ||
      vm.cover !== null
    );
  }, [vm]);

  const handleClose = useCallback(() => {
    if (hasDraft) {
      Alert.alert(
        copy.discardConfirmTitle,
        copy.discardConfirmMessage,
        [
          { text: copy.discardCancel, style: 'cancel' },
          {
            text: copy.discardConfirmAction,
            style: 'destructive',
            onPress: () => navigation.goBack(),
          },
        ],
        { cancelable: true },
      );
      return;
    }
    navigation.goBack();
  }, [hasDraft, copy, navigation]);

  const handlePickCover = useCallback(async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 1,
        quality: 0.8,
        maxWidth: 1200,
        maxHeight: 1710, // 400×570 ratio = 1.425, doubled gives 1200×1710
        includeBase64: false,
      });
      if (result.didCancel) return;
      if (result.errorCode) {
        showToast({ message: result.errorMessage ?? copy.errorNetwork, type: 'error' });
        return;
      }
      const asset: Asset | undefined = result.assets?.[0];
      if (!asset?.uri) return;

      // React-native-image-picker exposes width/height for the chosen image.
      const width = asset.width ?? 0;
      const height = asset.height ?? 0;
      if (width > 0 && height > 0 && (width > 400 || height > 570)) {
        vm.markTouched('cover');
        showToast({
          message: copy.validationCoverTooLarge(vm.coverMaxW, vm.coverMaxH),
          type: 'error',
        });
        // Still set the cover so the user sees the chosen image and the
        // inline error, instead of being forced to re-pick.
      }
      const next: CoverAsset = {
        uri: asset.uri,
        name: asset.fileName ?? `cover_${Date.now()}.jpg`,
        type: asset.type ?? 'image/jpeg',
        width: width || undefined,
        height: height || undefined,
        fileSize: asset.fileSize ?? undefined,
      };
      vm.setCover(next);
    } catch (caught) {
      showToast({
        message: caught instanceof Error ? caught.message : copy.errorNetwork,
        type: 'error',
      });
    }
  }, [vm, copy]);

  const handleSubmit = useCallback(async () => {
    const result = await vm.submit();
    if (result) {
      showToast({ message: copy.successToast, type: 'success' });
      // Tiny delay so the toast is visible before the screen pops.
      setTimeout(() => navigation.goBack(), 350);
    }
  }, [vm, copy, navigation]);

  const sourceKindLabel = useMemo(() => {
    switch (vm.sourceKind) {
      case 'youtube':
        return copy.sourceHintYouTube;
      case 'vimeo':
        return copy.sourceHintVimeo;
      case 'url':
        return copy.sourceHintUrl;
      default:
        return null;
    }
  }, [vm.sourceKind, copy]);

  const sourceKindColor = useMemo(() => {
    switch (vm.sourceKind) {
      case 'youtube':
        return '#ef4444';
      case 'vimeo':
        return '#1ab7ea';
      case 'url':
        return BRAND;
      default:
        return TEXT_SECONDARY;
    }
  }, [vm.sourceKind]);

  return (
    <View style={{ flex: 1, backgroundColor: SURFACE_BASE }}>
      <FocusAwareStatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <FeedHeader />
      <ToastContainer />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-4 pb-10 pt-2"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Cover picker card */}
          <View
            className="mb-5 overflow-hidden rounded-3xl"
            style={{
              backgroundColor: SURFACE_CARD,
              borderWidth: 1,
              borderColor: BORDER_LIGHT,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.04,
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            <Pressable
              onPress={handlePickCover}
              className="items-center justify-center"
              style={{
                height: COVER_DISPLAY_HEIGHT,
                backgroundColor: vm.cover ? 'transparent' : SURFACE_BASE,
              }}
            >
              {vm.cover ? (
                <Image
                  source={{ uri: vm.cover.uri }}
                  className="h-full w-full"
                  resizeMode="cover"
                />
              ) : (
                <View className="items-center">
                  <View className="mb-2 h-12 w-12 items-center justify-center rounded-full bg-blue-50">
                    <Camera size={22} color={BRAND} />
                  </View>
                  <Text className="text-[14px] font-semibold text-slate-700">
                    {copy.pickCover}
                  </Text>
                  <Text className="mt-1 text-[12px] text-slate-500">
                    {copy.validationCoverTooLarge(vm.coverMaxW, vm.coverMaxH)}
                  </Text>
                </View>
              )}
            </Pressable>
            {vm.cover ? (
              <View className="flex-row items-center justify-between border-t border-blue-50/40 px-4 py-2.5">
                <View className="flex-1 flex-row items-center gap-2">
                  <Check size={14} color={BRAND} />
                  <Text
                    className="flex-1 text-[12px] font-medium text-slate-600"
                    numberOfLines={1}
                  >
                    {copy.coverSelectedLabel}
                  </Text>
                </View>
                <Pressable
                  onPress={handlePickCover}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  className="ml-3"
                >
                  <Text className="text-[12px] font-semibold text-[#0000ff]">
                    {copy.replaceCover}
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </View>
          {vm.coverError ? (
            <View className="-mt-3 mb-4 flex-row items-center gap-1.5">
              <AlertCircle size={12} color={ERROR_RED} />
              <Text className="text-[12px] font-medium" style={{ color: ERROR_RED }}>
                {vm.coverError}
              </Text>
            </View>
          ) : null}

          {/* Form fields */}
          <View>
            <FieldShell
              label={copy.fieldNameLabel}
              required
              error={vm.errorFor('name', vm.name)}
            >
              <TextInput
                value={vm.name}
                onChangeText={vm.setName}
                onBlur={() => vm.markTouched('name')}
                placeholder={copy.fieldNamePlaceholder}
                placeholderTextColor={TEXT_SECONDARY}
                className="rounded-2xl px-4 py-3 text-[14px] font-medium text-slate-800"
                style={{
                  backgroundColor: SURFACE_BASE,
                  borderWidth: 1,
                  borderColor: vm.errorFor('name', vm.name)
                    ? ERROR_RED
                    : BORDER_LIGHT,
                }}
                maxLength={200}
              />
            </FieldShell>

            <FieldShell
              label={copy.fieldDescriptionLabel}
              required
              error={vm.errorFor('description', vm.description)}
              helper={`${copy.descriptionCounter(
                vm.description.length,
                vm.maxDescriptionLength,
              )}`}
            >
              <TextInput
                value={vm.description}
                onChangeText={vm.setDescription}
                onBlur={() => vm.markTouched('description')}
                placeholder={copy.fieldDescriptionPlaceholder}
                placeholderTextColor={TEXT_SECONDARY}
                multiline
                numberOfLines={4}
                className="rounded-2xl px-4 py-3 text-[14px] text-slate-800"
                style={{
                  backgroundColor: SURFACE_BASE,
                  borderWidth: 1,
                  borderColor: vm.errorFor('description', vm.description)
                    ? ERROR_RED
                    : BORDER_LIGHT,
                  minHeight: 100,
                  textAlignVertical: 'top',
                }}
                maxLength={vm.maxDescriptionLength}
              />
            </FieldShell>

            <SelectField
              label={copy.fieldGenreLabel}
              placeholder={copy.fieldGenrePlaceholder}
              value={selectedGenreLabel}
              onPress={() => setGenreOpen(true)}
              required
              error={vm.errorFor('genre', vm.genre)}
            />

            <SelectField
              label={copy.fieldCountryLabel}
              placeholder={copy.fieldCountryPlaceholder}
              value={selectedCountryLabel}
              onPress={() => setCountryOpen(true)}
              required
              error={vm.errorFor('country', vm.country)}
            />

            <FieldShell label={copy.fieldStarsLabel} required>
              <TextInput
                value={vm.stars}
                onChangeText={vm.setStars}
                onBlur={() => vm.markTouched('stars')}
                placeholder={copy.fieldStarsPlaceholder}
                placeholderTextColor={TEXT_SECONDARY}
                className="rounded-2xl px-4 py-3 text-[14px] text-slate-800"
                style={{
                  backgroundColor: SURFACE_BASE,
                  borderWidth: 1,
                  borderColor: BORDER_LIGHT,
                }}
                maxLength={300}
              />
            </FieldShell>

            <FieldShell label={copy.fieldProducerLabel} required>
              <TextInput
                value={vm.producer}
                onChangeText={vm.setProducer}
                onBlur={() => vm.markTouched('producer')}
                placeholder={copy.fieldProducerPlaceholder}
                placeholderTextColor={TEXT_SECONDARY}
                className="rounded-2xl px-4 py-3 text-[14px] text-slate-800"
                style={{
                  backgroundColor: SURFACE_BASE,
                  borderWidth: 1,
                  borderColor: BORDER_LIGHT,
                }}
                maxLength={200}
              />
            </FieldShell>

            <View className="flex-row gap-3">
              <View className="flex-1">
                <FieldShell
                  label={copy.fieldReleaseLabel}
                  required
                  error={vm.errorFor('release', vm.release)}
                >
                  <TextInput
                    value={vm.release}
                    onChangeText={text => vm.setRelease(text.replace(/[^0-9]/g, ''))}
                    onBlur={() => vm.markTouched('release')}
                    placeholder={copy.fieldReleasePlaceholder}
                    placeholderTextColor={TEXT_SECONDARY}
                    keyboardType="number-pad"
                    maxLength={4}
                    className="rounded-2xl px-4 py-3 text-[14px] font-medium text-slate-800"
                    style={{
                      backgroundColor: SURFACE_BASE,
                      borderWidth: 1,
                      borderColor: vm.errorFor('release', vm.release)
                        ? ERROR_RED
                        : BORDER_LIGHT,
                    }}
                  />
                </FieldShell>
              </View>
              <View className="flex-1">
                <FieldShell
                  label={copy.fieldDurationLabel}
                  required
                  error={vm.errorFor('duration', vm.duration)}
                >
                  <TextInput
                    value={vm.duration}
                    onChangeText={text => vm.setDuration(text.replace(/[^0-9]/g, ''))}
                    onBlur={() => vm.markTouched('duration')}
                    placeholder={copy.fieldDurationPlaceholder}
                    placeholderTextColor={TEXT_SECONDARY}
                    keyboardType="number-pad"
                    maxLength={3}
                    className="rounded-2xl px-4 py-3 text-[14px] font-medium text-slate-800"
                    style={{
                      backgroundColor: SURFACE_BASE,
                      borderWidth: 1,
                      borderColor: vm.errorFor('duration', vm.duration)
                        ? ERROR_RED
                        : BORDER_LIGHT,
                    }}
                  />
                </FieldShell>
              </View>
            </View>

            <SelectField
              label={copy.fieldQualityLabel}
              placeholder={copy.fieldQualityPlaceholder}
              value={selectedQualityLabel}
              onPress={() => setQualityOpen(true)}
              required
              error={vm.errorFor('quality', vm.quality)}
            />

            <FieldShell
              label={copy.fieldRatingLabel}
              required
              error={vm.errorFor('rating', vm.rating)}
            >
              <TextInput
                value={vm.rating}
                onChangeText={text => vm.setRating(text.replace(/[^0-9]/g, ''))}
                onBlur={() => vm.markTouched('rating')}
                placeholder={copy.fieldRatingPlaceholder}
                placeholderTextColor={TEXT_SECONDARY}
                keyboardType="number-pad"
                maxLength={2}
                className="rounded-2xl px-4 py-3 text-[14px] font-medium text-slate-800"
                style={{
                  backgroundColor: SURFACE_BASE,
                  borderWidth: 1,
                  borderColor: vm.errorFor('rating', vm.rating)
                    ? ERROR_RED
                    : BORDER_LIGHT,
                }}
              />
            </FieldShell>

            <FieldShell
              label={copy.fieldSourceLabel}
              required
              error={vm.errorFor('source', vm.source)}
              helper={sourceKindLabel ?? copy.sourceHintEmpty}
            >
              <View
                className="flex-row items-center rounded-2xl px-4 py-3"
                style={{
                  backgroundColor: SURFACE_BASE,
                  borderWidth: 1,
                  borderColor: vm.errorFor('source', vm.source)
                    ? ERROR_RED
                    : BORDER_LIGHT,
                }}
              >
                {vm.sourceKind === 'youtube' ? (
                  <Play size={16} color={sourceKindColor} />
                ) : vm.sourceKind === 'vimeo' ? (
                  <Link2 size={16} color={sourceKindColor} />
                ) : vm.sourceKind === 'url' ? (
                  <ImageIcon size={16} color={sourceKindColor} />
                ) : (
                  <Link2 size={16} color={TEXT_SECONDARY} />
                )}
                <TextInput
                  value={vm.source}
                  onChangeText={vm.setSource}
                  onBlur={() => vm.markTouched('source')}
                  placeholder={copy.fieldSourcePlaceholder}
                  placeholderTextColor={TEXT_SECONDARY}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  className="ml-2 flex-1 text-[14px] text-slate-800"
                />
              </View>
            </FieldShell>
          </View>

          {/* Bottom error banner */}
          {vm.error ? (
            <View
              className="mt-2 flex-row items-start gap-2 rounded-2xl px-4 py-3"
              style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)' }}
            >
              <AlertCircle size={16} color={ERROR_RED} />
              <Text className="flex-1 text-[13px] font-medium" style={{ color: ERROR_RED }}>
                {vm.error}
              </Text>
            </View>
          ) : null}

          {/* Action Buttons: Cancel and Submit side-by-side */}
          <View className="mt-6 flex-row gap-3">
            <TouchableOpacity
              onPress={handleClose}
              className="flex-1 min-h-[54px] items-center justify-center rounded-full border border-slate-200 bg-white"
              activeOpacity={0.8}
            >
              <Text className="text-[15px] font-bold text-slate-600">
                {language === 'vi' ? 'Quay lại' : 'Back'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={!vm.canSubmit}
              className="flex-1 min-h-[54px] items-center justify-center rounded-full"
              style={{
                backgroundColor: vm.canSubmit ? BRAND : 'rgba(0, 0, 255, 0.3)',
              }}
              activeOpacity={0.85}
            >
              {vm.isSubmitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-[15px] font-bold text-white">
                  {vm.submitButton}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Picker modals */}
      <PickerModal
        visible={genreOpen}
        title={copy.fieldGenreLabel}
        options={genreOptions}
        selected={vm.genre}
        onClose={() => setGenreOpen(false)}
        onSelect={key => {
          vm.setGenre(key);
          vm.markTouched('genre');
        }}
      />
      <PickerModal
        visible={countryOpen}
        title={copy.fieldCountryLabel}
        options={countryOptions}
        selected={vm.country}
        onClose={() => setCountryOpen(false)}
        onSelect={key => {
          vm.setCountry(key);
          vm.markTouched('country');
        }}
      />
      <PickerModal
        visible={qualityOpen}
        title={copy.fieldQualityLabel}
        options={qualityOptions}
        selected={vm.quality}
        onClose={() => setQualityOpen(false)}
        onSelect={key => {
          vm.setQuality(key);
          vm.markTouched('quality');
        }}
      />
    </View>
  );
}

export default CreateMovieScreen;

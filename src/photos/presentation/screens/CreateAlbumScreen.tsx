// Description: Renders the modern VNSEEA album creation flow.
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Check,
  ChevronLeft,
  Globe2,
  ImagePlus,
  Lock,
  Plus,
  Users,
  X,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { launchImageLibrary, type Asset } from 'react-native-image-picker';

import type { RootStackParamList } from '../../../navigation/types';
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';
import { apiRoutes } from '../../../shared-kernel/application/constants/route-registry';
import {
  CONTENT_AUDIENCE_CONTRACT,
  audienceToWire,
  type ContentAudience,
} from '../../../shared-kernel/domain/types/contentAudience';
import { apiBridge } from '../../../shared-kernel/infrastructure/api/apiBridge';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import {
  APP_BRAND_COLOR,
  APP_COLORS,
} from '../../../shared-kernel/presentation/theme/appColors';
import { SafeAreaFeedHeader } from '../../../feed/presentation/components/SafeAreaFeedHeader';

type CreateAlbumNav = NativeStackNavigationProp<RootStackParamList>;
type PrivacyOption = ContentAudience;

const BRAND = APP_BRAND_COLOR;
const HEADER_SAFE_AREA_COLOR =
  Platform.OS === 'android' ? BRAND : APP_COLORS.neutral.surface;

const PRIVACY_OPTIONS: { key: PrivacyOption; Icon: typeof Globe2 }[] = [
  { key: 'public', Icon: Globe2 },
  { key: 'friends', Icon: Users },
  { key: 'followers', Icon: Users },
  { key: 'only_me', Icon: Lock },
];

const CREATE_ALBUM_COPY = {
  vi: {
    pageTitle: 'Tạo album mới',
    pageSubtitle: 'Sắp xếp những khoảnh khắc theo cách của bạn',
    detailsTitle: 'Thông tin album',
    detailsDescription: 'Đặt một cái tên dễ nhớ cho bộ sưu tập này.',
    albumNameLabel: 'Tên album',
    albumNamePlaceholder: 'Ví dụ: Những chuyến đi đáng nhớ',
    albumNameHint: 'Tên album sẽ hiển thị bên dưới ảnh bìa.',
    photosTitle: 'Hình ảnh',
    photosDescription: 'Chọn một hoặc nhiều ảnh để tạo bộ sưu tập.',
    choosePhotos: 'Chọn ảnh từ thư viện',
    choosePhotosHint: 'Hỗ trợ chọn nhiều ảnh cùng lúc',
    changePhotos: 'Thêm ảnh',
    photosSelected: 'ảnh đã chọn',
    coverLabel: 'Ảnh bìa',
    privacyTitle: 'Quyền riêng tư',
    privacyDescription: 'Chọn những người có thể xem album này.',
    cancelButton: 'Quay lại',
    submitButton: 'Tạo album',
    submittingButton: 'Đang tạo...',
    validationNameError: 'Vui lòng nhập tên album.',
    validationPhotosError: 'Vui lòng chọn ít nhất một ảnh.',
    loginError: 'Vui lòng đăng nhập để tạo album.',
    successTitle: 'Thành công',
    successMessage: 'Album đã được tạo.',
    errorTitle: 'Lỗi',
    errorGeneric: 'Không thể tạo album. Vui lòng thử lại.',
    selectImagesError: 'Không thể mở thư viện ảnh.',
    privacy: {
      public: { label: 'Công khai', desc: 'Mọi người đều có thể xem' },
      friends: { label: 'Bạn bè', desc: 'Chỉ bạn bè có thể xem' },
      followers: {
        label: 'Người theo dõi',
        desc: 'Chỉ người theo dõi có thể xem',
      },
      only_me: { label: 'Chỉ mình tôi', desc: 'Chỉ bạn có thể xem' },
    },
  },
  en: {
    pageTitle: 'Create a new album',
    pageSubtitle: 'Organize your moments your way',
    detailsTitle: 'Album details',
    detailsDescription: 'Give this collection a memorable name.',
    albumNameLabel: 'Album name',
    albumNamePlaceholder: 'For example: Memorable trips',
    albumNameHint: 'The album name appears below its cover photo.',
    photosTitle: 'Photos',
    photosDescription: 'Select one or more photos for this collection.',
    choosePhotos: 'Choose from library',
    choosePhotosHint: 'You can select multiple photos at once',
    changePhotos: 'Add photos',
    photosSelected: 'photos selected',
    coverLabel: 'Cover photo',
    privacyTitle: 'Privacy',
    privacyDescription: 'Choose who can view this album.',
    cancelButton: 'Go back',
    submitButton: 'Create album',
    submittingButton: 'Creating...',
    validationNameError: 'Please enter an album name.',
    validationPhotosError: 'Please select at least one photo.',
    loginError: 'Please sign in to create an album.',
    successTitle: 'Success',
    successMessage: 'The album was created.',
    errorTitle: 'Error',
    errorGeneric: 'Could not create the album. Please try again.',
    selectImagesError: 'Could not open the photo library.',
    privacy: {
      public: { label: 'Public', desc: 'Everyone can view this album' },
      friends: { label: 'Friends', desc: 'Only friends can view it' },
      followers: { label: 'Followers', desc: 'Only followers can view it' },
      only_me: { label: 'Only me', desc: 'Only you can view it' },
    },
  },
};

type CreateAlbumResponse = {
  api_status: number | string;
  data?: {
    id?: string;
    post_id?: string;
  };
  message?: string;
  errors?: {
    error_text?: string;
  };
};

function CreateAlbumScreen() {
  const navigation = useNavigation<CreateAlbumNav>();
  const language = useAppLanguage();
  const isVi = language === 'vi';
  const copy = useMemo(
    () => CREATE_ALBUM_COPY[language] || CREATE_ALBUM_COPY.vi,
    [language],
  );
  const [albumName, setAlbumName] = useState('');
  const [selectedPrivacy, setSelectedPrivacy] =
    useState<PrivacyOption>('public');
  const [selectedImages, setSelectedImages] = useState<Asset[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectImages = useCallback(async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 1920,
        maxHeight: 1920,
        selectionLimit: 0,
      });

      if (result.didCancel) return;

      if (result.errorCode) {
        Alert.alert(
          copy.errorTitle,
          result.errorMessage || copy.selectImagesError,
        );
        return;
      }

      const nextImages = (result.assets ?? []).filter(asset => asset.uri);
      if (nextImages.length === 0) return;

      setSelectedImages(current => {
        const seenUris = new Set(current.map(image => image.uri));
        return [
          ...current,
          ...nextImages.filter(image => !seenUris.has(image.uri)),
        ];
      });
    } catch {
      Alert.alert(copy.errorTitle, copy.selectImagesError);
    }
  }, [copy]);

  const removeImage = useCallback((index: number) => {
    setSelectedImages(current =>
      current.filter((_, imageIndex) => imageIndex !== index),
    );
  }, []);

  const publishAlbum = useCallback(async () => {
    if (!albumName.trim()) {
      Alert.alert(copy.errorTitle, copy.validationNameError);
      return;
    }
    if (selectedImages.length === 0) {
      Alert.alert(copy.errorTitle, copy.validationPhotosError);
      return;
    }
    if (!sessionStorage.getSession()?.userId) {
      Alert.alert(copy.errorTitle, copy.loginError);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await apiBridge.multipart<CreateAlbumResponse>(
        apiRoutes.photos.create,
        {
          type: 'create',
          album_name: albumName.trim(),
          postPrivacy: audienceToWire(selectedPrivacy),
          privacy_contract: CONTENT_AUDIENCE_CONTRACT,
          postPhotos: selectedImages.map((image, index) => ({
            uri: image.uri,
            name: image.fileName || `album_${Date.now()}_${index}.jpg`,
            type: image.type || 'image/jpeg',
          })),
        },
      );

      if (response.api_status !== 200 && response.api_status !== '200') {
        throw new Error(response.errors?.error_text || copy.errorGeneric);
      }

      Alert.alert(copy.successTitle, copy.successMessage, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert(
        copy.errorTitle,
        error instanceof Error ? error.message : copy.errorGeneric,
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [albumName, copy, navigation, selectedImages, selectedPrivacy]);

  const coverImage = selectedImages[0]?.uri;

  return (
    <View style={styles.screen}>
      <FocusAwareStatusBar
        barStyle={Platform.OS === 'android' ? 'light-content' : 'dark-content'}
        backgroundColor={HEADER_SAFE_AREA_COLOR}
        translucent={false}
      />
      <SafeAreaFeedHeader safeAreaBackgroundColor={HEADER_SAFE_AREA_COLOR} />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.pageHeader}>
          <TouchableOpacity
            activeOpacity={0.78}
            accessibilityRole="button"
            accessibilityLabel={copy.cancelButton}
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <ChevronLeft size={22} color={APP_COLORS.neutral.text} />
          </TouchableOpacity>
          <View style={styles.pageHeadingCopy}>
            <Text style={styles.pageTitle}>{copy.pageTitle}</Text>
            <Text numberOfLines={1} style={styles.pageSubtitle}>
              {copy.pageSubtitle}
            </Text>
          </View>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.formCard}>
            <View style={styles.sectionHeading}>
              <View style={styles.sectionNumber}>
                <Text style={styles.sectionNumberText}>1</Text>
              </View>
              <View style={styles.sectionHeadingCopy}>
                <Text style={styles.sectionTitle}>{copy.detailsTitle}</Text>
                <Text style={styles.sectionDescription}>
                  {copy.detailsDescription}
                </Text>
              </View>
            </View>

            <Text style={styles.fieldLabel}>{copy.albumNameLabel}</Text>
            <TextInput
              value={albumName}
              onChangeText={setAlbumName}
              editable={!isSubmitting}
              maxLength={100}
              returnKeyType="done"
              placeholder={copy.albumNamePlaceholder}
              placeholderTextColor={APP_COLORS.neutral.iconMuted}
              selectionColor={BRAND}
              style={styles.nameInput}
            />
            <View style={styles.inputFooter}>
              <Text style={styles.inputHint}>{copy.albumNameHint}</Text>
              <Text style={styles.characterCount}>{albumName.length}/100</Text>
            </View>
          </View>

          <View style={styles.formCard}>
            <View style={styles.sectionHeading}>
              <View style={styles.sectionNumber}>
                <Text style={styles.sectionNumberText}>2</Text>
              </View>
              <View style={styles.sectionHeadingCopy}>
                <Text style={styles.sectionTitle}>{copy.photosTitle}</Text>
                <Text style={styles.sectionDescription}>
                  {copy.photosDescription}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.88}
              disabled={isSubmitting}
              accessibilityRole="button"
              accessibilityLabel={copy.choosePhotos}
              style={styles.photoPicker}
              onPress={selectImages}
            >
              {coverImage ? (
                <>
                  <Image
                    source={{ uri: coverImage }}
                    style={styles.coverImage}
                    resizeMode="cover"
                  />
                  <View style={styles.coverShade} />
                  <View style={styles.coverLabel}>
                    <Text style={styles.coverLabelText}>{copy.coverLabel}</Text>
                  </View>
                  <View style={styles.coverActions}>
                    <View style={styles.selectedCountBadge}>
                      <ImagePlus size={15} color="#FFFFFF" />
                      <Text style={styles.selectedCountText}>
                        {selectedImages.length} {copy.photosSelected}
                      </Text>
                    </View>
                    <View style={styles.addPhotosButton}>
                      <Plus size={16} strokeWidth={2.5} color="#FFFFFF" />
                      <Text style={styles.addPhotosButtonText}>
                        {copy.changePhotos}
                      </Text>
                    </View>
                  </View>
                </>
              ) : (
                <View style={styles.emptyPhotoPicker}>
                  <View style={styles.photoPickerIcon}>
                    <ImagePlus size={31} color={BRAND} />
                  </View>
                  <Text style={styles.photoPickerTitle}>
                    {copy.choosePhotos}
                  </Text>
                  <Text style={styles.photoPickerHint}>
                    {copy.choosePhotosHint}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {selectedImages.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.thumbnailList}
              >
                {selectedImages.map((image, index) => (
                  <View key={`${image.uri}-${index}`} style={styles.thumbnail}>
                    <Image
                      source={{ uri: image.uri }}
                      style={styles.thumbnailImage}
                      resizeMode="cover"
                    />
                    {index === 0 ? (
                      <View style={styles.thumbnailCoverBadge}>
                        <Text style={styles.thumbnailCoverBadgeText}>1</Text>
                      </View>
                    ) : null}
                    <TouchableOpacity
                      activeOpacity={0.8}
                      accessibilityRole="button"
                      accessibilityLabel={isVi ? 'Xóa ảnh' : 'Remove photo'}
                      style={styles.removeImageButton}
                      onPress={() => removeImage(index)}
                    >
                      <X size={13} strokeWidth={2.7} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ))}
                <TouchableOpacity
                  activeOpacity={0.82}
                  style={styles.addThumbnailButton}
                  onPress={selectImages}
                >
                  <Plus size={22} color={BRAND} />
                  <Text style={styles.addThumbnailText}>
                    {copy.changePhotos}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            ) : null}
          </View>

          <View style={styles.formCard}>
            <View style={styles.sectionHeading}>
              <View style={styles.sectionNumber}>
                <Text style={styles.sectionNumberText}>3</Text>
              </View>
              <View style={styles.sectionHeadingCopy}>
                <Text style={styles.sectionTitle}>{copy.privacyTitle}</Text>
                <Text style={styles.sectionDescription}>
                  {copy.privacyDescription}
                </Text>
              </View>
            </View>

            <View style={styles.privacyList}>
              {PRIVACY_OPTIONS.map(({ key, Icon }) => {
                const isSelected = selectedPrivacy === key;
                const optionCopy = copy.privacy[key];

                return (
                  <TouchableOpacity
                    key={key}
                    activeOpacity={0.82}
                    disabled={isSubmitting}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: isSelected }}
                    style={[
                      styles.privacyOption,
                      isSelected && styles.privacyOptionSelected,
                    ]}
                    onPress={() => setSelectedPrivacy(key)}
                  >
                    <View
                      style={[
                        styles.privacyIcon,
                        isSelected && styles.privacyIconSelected,
                      ]}
                    >
                      <Icon
                        size={19}
                        color={
                          isSelected ? BRAND : APP_COLORS.neutral.textMuted
                        }
                      />
                    </View>
                    <View style={styles.privacyCopy}>
                      <Text style={styles.privacyLabel}>
                        {optionCopy.label}
                      </Text>
                      <Text style={styles.privacyDescription}>
                        {optionCopy.desc}
                      </Text>
                    </View>
                    <View
                      style={[styles.radio, isSelected && styles.radioSelected]}
                    >
                      {isSelected ? (
                        <Check size={13} strokeWidth={3} color="#FFFFFF" />
                      ) : null}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </ScrollView>

        <SafeAreaView edges={['bottom']} style={styles.footerSafeArea}>
          <View style={styles.footer}>
            <TouchableOpacity
              activeOpacity={0.8}
              disabled={isSubmitting}
              style={styles.cancelButton}
              onPress={() => navigation.goBack()}
            >
              <ChevronLeft size={18} color={APP_COLORS.neutral.textMuted} />
              <Text style={styles.cancelButtonText}>{copy.cancelButton}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.86}
              disabled={isSubmitting}
              style={[
                styles.submitButton,
                isSubmitting && styles.submitButtonDisabled,
              ]}
              onPress={publishAlbum}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <ImagePlus size={18} strokeWidth={2.5} color="#FFFFFF" />
              )}
              <Text style={styles.submitButtonText}>
                {isSubmitting ? copy.submittingButton : copy.submitButton}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: APP_COLORS.neutral.base,
  },
  keyboardView: {
    flex: 1,
  },
  pageHeader: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: APP_COLORS.neutral.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: APP_COLORS.neutral.border,
  },
  backButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    borderWidth: 1,
    borderColor: APP_COLORS.neutral.border,
    backgroundColor: APP_COLORS.neutral.surface,
  },
  pageHeadingCopy: {
    flex: 1,
    marginLeft: 12,
  },
  pageTitle: {
    color: APP_COLORS.neutral.text,
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.25,
  },
  pageSubtitle: {
    marginTop: 3,
    color: APP_COLORS.neutral.textMuted,
    fontSize: 12.5,
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    gap: 14,
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 24,
  },
  formCard: {
    padding: 15,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E6EAF1',
    backgroundColor: APP_COLORS.neutral.surface,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.055,
    shadowRadius: 10,
    elevation: 2,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  sectionNumber: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: APP_COLORS.brand.soft,
  },
  sectionNumberText: {
    color: BRAND,
    fontSize: 13,
    fontWeight: '900',
  },
  sectionHeadingCopy: {
    flex: 1,
    marginLeft: 10,
  },
  sectionTitle: {
    color: APP_COLORS.neutral.text,
    fontSize: 16,
    fontWeight: '800',
  },
  sectionDescription: {
    marginTop: 3,
    color: APP_COLORS.neutral.textMuted,
    fontSize: 12.5,
    lineHeight: 18,
  },
  fieldLabel: {
    marginBottom: 8,
    color: APP_COLORS.neutral.text,
    fontSize: 13,
    fontWeight: '700',
  },
  nameInput: {
    minHeight: 50,
    paddingHorizontal: 14,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: APP_COLORS.neutral.border,
    backgroundColor: '#FBFCFE',
    color: APP_COLORS.neutral.text,
    fontSize: 14.5,
    fontWeight: '600',
  },
  inputFooter: {
    marginTop: 7,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  inputHint: {
    flex: 1,
    color: APP_COLORS.neutral.textMuted,
    fontSize: 11.5,
    lineHeight: 16,
  },
  characterCount: {
    color: APP_COLORS.neutral.iconMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  photoPicker: {
    width: '100%',
    aspectRatio: 1.55,
    overflow: 'hidden',
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: APP_COLORS.brand.border,
    backgroundColor: '#FAF5F5',
  },
  emptyPhotoPicker: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  photoPickerIcon: {
    width: 62,
    height: 62,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 31,
    backgroundColor: APP_COLORS.brand.soft,
  },
  photoPickerTitle: {
    marginTop: 14,
    color: APP_COLORS.neutral.text,
    fontSize: 15,
    fontWeight: '800',
  },
  photoPickerHint: {
    marginTop: 5,
    color: APP_COLORS.neutral.textMuted,
    fontSize: 12,
    textAlign: 'center',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverShade: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.24)',
  },
  coverLabel: {
    position: 'absolute',
    top: 12,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  coverLabelText: {
    color: APP_COLORS.neutral.text,
    fontSize: 10.5,
    fontWeight: '800',
  },
  coverActions: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  selectedCountBadge: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    borderRadius: 17,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
  },
  selectedCountText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  addPhotosButton: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    borderRadius: 17,
    backgroundColor: BRAND,
  },
  addPhotosButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  thumbnailList: {
    gap: 9,
    paddingTop: 11,
    paddingRight: 2,
  },
  thumbnail: {
    width: 72,
    height: 72,
    overflow: 'hidden',
    borderRadius: 13,
    backgroundColor: APP_COLORS.neutral.muted,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailCoverBadge: {
    position: 'absolute',
    left: 5,
    bottom: 5,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: BRAND,
  },
  thumbnailCoverBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  removeImageButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
  },
  addThumbnailButton: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: APP_COLORS.brand.border,
    backgroundColor: APP_COLORS.brand.soft,
  },
  addThumbnailText: {
    marginTop: 3,
    color: BRAND,
    fontSize: 9.5,
    fontWeight: '800',
  },
  privacyList: {
    gap: 9,
  },
  privacyOption: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: APP_COLORS.neutral.border,
    backgroundColor: APP_COLORS.neutral.surface,
  },
  privacyOptionSelected: {
    borderColor: BRAND,
    backgroundColor: APP_COLORS.brand.soft,
  },
  privacyIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    backgroundColor: APP_COLORS.neutral.muted,
  },
  privacyIconSelected: {
    backgroundColor: 'rgba(185, 28, 28, 0.12)',
  },
  privacyCopy: {
    flex: 1,
    marginLeft: 11,
  },
  privacyLabel: {
    color: APP_COLORS.neutral.text,
    fontSize: 14,
    fontWeight: '800',
  },
  privacyDescription: {
    marginTop: 3,
    color: APP_COLORS.neutral.textMuted,
    fontSize: 11.5,
  },
  radio: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: APP_COLORS.neutral.surface,
  },
  radioSelected: {
    borderColor: BRAND,
    backgroundColor: BRAND,
  },
  footerSafeArea: {
    backgroundColor: APP_COLORS.neutral.surface,
  },
  footer: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: APP_COLORS.neutral.border,
    backgroundColor: APP_COLORS.neutral.surface,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.055,
    shadowRadius: 10,
    elevation: 8,
  },
  cancelButton: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 14,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: APP_COLORS.neutral.border,
    backgroundColor: APP_COLORS.neutral.surface,
  },
  cancelButtonText: {
    color: APP_COLORS.neutral.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  submitButton: {
    minHeight: 46,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 13,
    backgroundColor: BRAND,
    shadowColor: APP_COLORS.brand.shadow,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 9,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.65,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});

export default CreateAlbumScreen;

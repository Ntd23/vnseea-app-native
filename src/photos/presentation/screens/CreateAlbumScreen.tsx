// Description: Renders the VNSEEA create album screen for naming, privacy, and photo upload setup.
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Animated,
  Platform,
} from 'react-native';
import {
  Check,
  ChevronLeft,
  CheckCircle2,
  Globe2,
  ImagePlus,
  Lock,
  Users,
  X,
  Pencil,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { launchImageLibrary, type Asset } from 'react-native-image-picker';
import { apiRoutes } from '../../../shared-kernel/application/constants/route-registry';
import { apiBridge } from '../../../shared-kernel/infrastructure/api/apiBridge';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';
import type { RootStackParamList } from '../../../navigation/types';
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import { SafeAreaFeedHeader } from '../../../feed/presentation/components/SafeAreaFeedHeader';

type CreateAlbumNav = NativeStackNavigationProp<RootStackParamList>;

type PrivacyOption = 'public' | 'friends' | 'private';

const PRIVACY_OPTIONS: { key: PrivacyOption; Icon: typeof Globe2 }[] = [
  { key: 'public', Icon: Globe2 },
  { key: 'friends', Icon: Users },
  { key: 'private', Icon: Lock },
];

const CREATE_ALBUM_COPY = {
  vi: {
    headerTitle: 'Tạo album',
    albumNameLabel: 'Tên album *',
    albumNamePlaceholder: 'Nhập tên album',
    descriptionLabel: 'Mô tả',
    descriptionPlaceholder: 'Viết mô tả ngắn cho album',
    addPhotosTitle: 'Thêm ảnh vào album',
    addPhotosDesc: 'Chọn nhiều ảnh để tạo bộ sưu tập đầu tiên.',
    addMoreText: 'Thêm',
    photosSelected: 'ảnh đã chọn',
    submitButton: 'Tạo album',
    submittingButton: 'Đang tạo...',
    validationNameError: 'Vui lòng nhập tên album',
    validationPhotosError: 'Vui lòng chọn ít nhất một ảnh',
    loginError: 'Vui lòng đăng nhập để tạo album',
    successTitle: 'Thành công',
    successMessage: 'Album đã được tạo',
    errorTitle: 'Lỗi',
    errorGeneric: 'Không thể tạo album. Vui lòng thử lại.',
    selectImagesError: 'Không thể mở thư viện ảnh',
    errorOccurred: 'Đã xảy ra lỗi khi chọn ảnh',
    privacy: {
      public: { label: 'Công khai', desc: 'Mọi người đều có thể xem' },
      friends: { label: 'Bạn bè', desc: 'Chỉ bạn bè có thể xem' },
      private: { label: 'Riêng tư', desc: 'Chỉ mình tôi' },
    },
  },
  en: {
    headerTitle: 'Create Album',
    albumNameLabel: 'Album name *',
    albumNamePlaceholder: 'Enter album name',
    descriptionLabel: 'Description',
    descriptionPlaceholder: 'Write a short description for the album',
    addPhotosTitle: 'Add photos to album',
    addPhotosDesc: 'Select multiple photos to create your first collection.',
    addMoreText: 'Add',
    photosSelected: 'photos selected',
    submitButton: 'Create album',
    submittingButton: 'Creating...',
    validationNameError: 'Please enter the album name',
    validationPhotosError: 'Please select at least one photo',
    loginError: 'Please login to create an album',
    successTitle: 'Success',
    successMessage: 'Album has been created',
    errorTitle: 'Error',
    errorGeneric: 'Failed to create album. Please try again.',
    selectImagesError: 'Cannot open photo library',
    errorOccurred: 'An error occurred while selecting photos',
    privacy: {
      public: { label: 'Public', desc: 'Everyone can see' },
      friends: { label: 'Friends', desc: 'Only friends can see' },
      private: { label: 'Private', desc: 'Only me' },
    },
  },
};

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

interface ScaleButtonProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: any;
  activeOpacity?: number;
  disabled?: boolean;
  className?: string;
}

function ScaleButton({
  children,
  onPress,
  style,
  activeOpacity = 0.75,
  disabled,
  className,
  ...props
}: ScaleButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scale, {
      toValue: 0.96,
      useNativeDriver: true,
      tension: 150,
      friction: 12,
    }).start();
  }, [scale]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      tension: 150,
      friction: 12,
    }).start();
  }, [scale]);

  return (
    <AnimatedTouchableOpacity
      activeOpacity={activeOpacity}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      disabled={disabled}
      style={[style, { transform: [{ scale }] }]}
      className={className}
      {...props}
    >
      {children}
    </AnimatedTouchableOpacity>
  );
}

// Response type for album creation
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

function LegacyCreateAlbumScreen() {
  const navigation = useNavigation<CreateAlbumNav>();
  const language = useAppLanguage();
  const copy = useMemo(() => CREATE_ALBUM_COPY[language] || CREATE_ALBUM_COPY.vi, [language]);

  // States
  const [albumName, setAlbumName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPrivacy, setSelectedPrivacy] = useState<PrivacyOption>('public');
  const [selectedImages, setSelectedImages] = useState<Asset[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Staggered animations for cards
  const cardAnim1 = useRef(new Animated.Value(0)).current;
  const cardAnim2 = useRef(new Animated.Value(0)).current;
  const cardAnim3 = useRef(new Animated.Value(0)).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(80, [
      Animated.spring(cardAnim1, { toValue: 1, tension: 70, friction: 12, useNativeDriver: true }),
      Animated.spring(cardAnim2, { toValue: 1, tension: 70, friction: 12, useNativeDriver: true }),
      Animated.spring(cardAnim3, { toValue: 1, tension: 70, friction: 12, useNativeDriver: true }),
      Animated.spring(buttonAnim, { toValue: 1, tension: 70, friction: 12, useNativeDriver: true }),
    ]).start();
  }, [cardAnim1, cardAnim2, cardAnim3, buttonAnim]);

  // Handle image selection
  const handleSelectImages = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 1920,
        maxHeight: 1920,
        selectionLimit: 0, // 0 = unlimited
      });

      if (result.didCancel) {
        return;
      }

      if (result.errorCode) {
        Alert.alert(copy.errorTitle, result.errorMessage || copy.selectImagesError);
        return;
      }

      if (result.assets && result.assets.length > 0) {
        setSelectedImages(prev => [...prev, ...(result.assets ?? [])]);
      }
    } catch (error) {
      console.error('[CreateAlbum] Error selecting images:', error);
      Alert.alert(copy.errorTitle, copy.errorOccurred);
    }
  };

  // Remove image from selection
  const handleRemoveImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  // Validate form
  const validateForm = (): boolean => {
    if (!albumName.trim()) {
      Alert.alert(copy.errorTitle, copy.validationNameError);
      return false;
    }

    if (selectedImages.length === 0) {
      Alert.alert(copy.errorTitle, copy.validationPhotosError);
      return false;
    }

    return true;
  };

  // Map privacy to postPrivacy value
  const getPrivacyValue = (privacy: PrivacyOption): number => {
    switch (privacy) {
      case 'public':
        return 0;
      case 'friends':
        return 2;
      case 'private':
        return 3;
      default:
        return 0;
    }
  };

  // Handle form submission
  const handleCreateAlbum = async () => {
    if (!validateForm()) return;

    const session = sessionStorage.getSession();
    if (!session?.userId) {
      Alert.alert(copy.errorTitle, copy.loginError);
      return;
    }

    setIsSubmitting(true);

    try {
      // Build FormData for multipart upload
      const formData: Record<string, unknown> = {
        type: 'create',
        album_name: albumName.trim(),
        postPrivacy: getPrivacyValue(selectedPrivacy),
        description: description.trim() || undefined,
      };

      // Add images as postPhotos array
      const postPhotos: Asset[] = selectedImages;

      // Use multipart API
      const response = await apiBridge.multipart<CreateAlbumResponse>(
        apiRoutes.photos.create,
        {
          ...formData,
          postPhotos: postPhotos.map((img, index) => ({
            uri: img.uri,
            name: img.fileName || `photo_${Date.now()}_${index}.jpg`,
            type: img.type || 'image/jpeg',
          })),
        }
      );

      if (response.api_status === 200) {
        Alert.alert(copy.successTitle, copy.successMessage, [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]);
      } else {
        throw new Error(response.errors?.error_text || response.message || copy.errorGeneric);
      }
    } catch (error) {
      console.error('[CreateAlbum] Error creating album:', error);
      Alert.alert(
        copy.errorTitle,
        error instanceof Error ? error.message : copy.errorGeneric
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const cardStyle1 = {
    opacity: cardAnim1,
    transform: [{ translateY: cardAnim1.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
  };

  const cardStyle2 = {
    opacity: cardAnim2,
    transform: [{ translateY: cardAnim2.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
  };

  const cardStyle3 = {
    opacity: cardAnim3,
    transform: [{ translateY: cardAnim3.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: '#f8fafc' }} edges={['top']}>
      <FocusAwareStatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      {/* Header */}
      <View
        style={{
          height: 60,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 16,
          backgroundColor: '#f8fafc',
          position: 'relative',
        }}
      >
        <ScaleButton
          onPress={() => navigation.goBack()}
          disabled={isSubmitting}
          style={{
            position: 'absolute',
            left: 16,
            width: 44,
            height: 44,
            borderRadius: 14,
            backgroundColor: '#ffffff',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 5,
            elevation: 2,
          }}
        >
          <ChevronLeft size={22} color="#0f172a" strokeWidth={2.5} />
        </ScaleButton>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#0f172a' }}>
          {copy.headerTitle}
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120, paddingTop: 12 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Album Info Card */}
        <Animated.View
          style={[
            cardStyle1,
            {
              backgroundColor: '#ffffff',
              borderRadius: 24,
              padding: 16,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.02,
              shadowRadius: 5,
              elevation: 1.5,
              borderWidth: 1,
              borderColor: '#f1f5f9',
            },
          ]}
        >
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#0f172a' }}>
            {copy.albumNameLabel}
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              borderRadius: 16,
              backgroundColor: '#f8fafc',
              borderWidth: 1,
              borderColor: '#e2e8f0',
              paddingHorizontal: 12,
              marginTop: 8,
            }}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: '#eff6ff',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 10,
              }}
            >
              <ImagePlus size={18} color="#002fff" strokeWidth={2} />
            </View>
            <TextInput
              style={{
                flex: 1,
                fontSize: 15,
                color: '#0f172a',
                paddingVertical: 12,
              }}
              placeholder={copy.albumNamePlaceholder}
              placeholderTextColor="#94a3b8"
              value={albumName}
              onChangeText={setAlbumName}
              maxLength={100}
              editable={!isSubmitting}
            />
          </View>

          <Text style={{ fontSize: 14, fontWeight: '700', color: '#0f172a', marginTop: 20 }}>
            {copy.descriptionLabel}
          </Text>
          <View
            style={{
              flexDirection: 'row',
              borderRadius: 16,
              backgroundColor: '#f8fafc',
              borderWidth: 1,
              borderColor: '#e2e8f0',
              paddingHorizontal: 12,
              marginTop: 8,
              minHeight: 120,
              position: 'relative',
            }}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: '#f1f5f9',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 10,
                marginTop: 10,
              }}
            >
              <Pencil size={16} color="#475569" strokeWidth={2} />
            </View>
            <TextInput
              style={{
                flex: 1,
                fontSize: 15,
                color: '#0f172a',
                paddingTop: 10,
                paddingBottom: 28,
                lineHeight: 20,
              }}
              placeholder={copy.descriptionPlaceholder}
              placeholderTextColor="#94a3b8"
              value={description}
              onChangeText={setDescription}
              multiline
              textAlignVertical="top"
              maxLength={500}
              editable={!isSubmitting}
            />
            <Text
              style={{
                position: 'absolute',
                bottom: 10,
                right: 12,
                fontSize: 11,
                color: '#94a3b8',
                fontWeight: '500',
              }}
            >
              {description.length}/500
            </Text>
          </View>
        </Animated.View>

        {/* Photo Selection Area */}
        <Animated.View style={[cardStyle2, { marginTop: 16 }]}>
          {selectedImages.length > 0 ? (
            <View
              style={{
                backgroundColor: '#ffffff',
                borderRadius: 24,
                padding: 16,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.02,
                shadowRadius: 5,
                elevation: 1.5,
                borderWidth: 1,
                borderColor: '#f1f5f9',
              }}
            >
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 10, paddingRight: 12 }}
              >
                {selectedImages.map((image, index) => (
                  <View key={`${image.uri}-${index}`} style={{ position: 'relative' }}>
                    <Image
                      source={{ uri: image.uri }}
                      style={{
                        width: 84,
                        height: 84,
                        borderRadius: 16,
                      }}
                      resizeMode="cover"
                    />
                    {!isSubmitting && (
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => handleRemoveImage(index)}
                        style={{
                          position: 'absolute',
                          top: -4,
                          right: -4,
                          width: 22,
                          height: 22,
                          borderRadius: 11,
                          backgroundColor: 'rgba(0,0,0,0.6)',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <X size={12} color="#FFFFFF" strokeWidth={2.5} />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}

                {/* Add More Button */}
                {!isSubmitting && (
                  <ScaleButton
                    onPress={handleSelectImages}
                    style={{
                      width: 84,
                      height: 84,
                      borderRadius: 16,
                      borderWidth: 1.5,
                      borderStyle: 'dashed',
                      borderColor: '#002fff',
                      backgroundColor: '#eff6ff',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ImagePlus size={20} color="#002fff" strokeWidth={2} />
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#002fff', marginTop: 4 }}>
                      {copy.addMoreText}
                    </Text>
                  </ScaleButton>
                )}
              </ScrollView>

              <Text style={{ fontSize: 12, color: '#64748b', marginTop: 10, fontWeight: '500' }}>
                {selectedImages.length} {copy.photosSelected}
              </Text>
            </View>
          ) : (
            <ScaleButton
              onPress={handleSelectImages}
              disabled={isSubmitting}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: 24,
                borderWidth: 1.5,
                borderStyle: 'dashed',
                borderColor: '#cbd5e1',
                paddingVertical: 36,
                paddingHorizontal: 20,
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.02,
                shadowRadius: 5,
                elevation: 1.5,
              }}
            >
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: '#eff6ff',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16,
                }}
              >
                <ImagePlus size={26} color="#002fff" strokeWidth={2} />
              </View>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#0f172a', textAlign: 'center' }}>
                {copy.addPhotosTitle}
              </Text>
              <Text style={{ fontSize: 12.5, color: '#64748b', textAlign: 'center', marginTop: 6, lineHeight: 18 }}>
                {copy.addPhotosDesc}
              </Text>
            </ScaleButton>
          )}
        </Animated.View>

        {/* Privacy Options */}
        <Animated.View style={[cardStyle3, { marginTop: 16, gap: 12 }]}>
          {PRIVACY_OPTIONS.map(({ key, Icon }) => {
            const isSelected = selectedPrivacy === key;
            const itemCopy = copy.privacy[key];

            return (
              <ScaleButton
                key={key}
                onPress={() => setSelectedPrivacy(key)}
                disabled={isSubmitting}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: 20,
                  padding: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.02,
                  shadowRadius: 5,
                  elevation: 1.5,
                  borderWidth: isSelected ? 1.5 : 1,
                  borderColor: isSelected ? '#002fff' : '#f1f5f9',
                }}
              >
                {/* Circle Icon Container */}
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: key === 'public' ? '#eff6ff' : key === 'friends' ? '#ecfdf5' : '#fffbeb',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon size={20} color={key === 'public' ? '#1d4ed8' : key === 'friends' ? '#10b981' : '#d97706'} />
                </View>

                {/* Labels */}
                <View style={{ marginLeft: 16, flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 15.5,
                      fontWeight: '700',
                      color: '#0f172a',
                    }}
                  >
                    {itemCopy.label}
                  </Text>
                  <Text
                    style={{
                      fontSize: 12.5,
                      color: '#64748b',
                      marginTop: 3,
                    }}
                  >
                    {itemCopy.desc}
                  </Text>
                </View>

                {/* Custom Checkbox */}
                {isSelected ? (
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      backgroundColor: '#002fff',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Check size={12} color="#ffffff" strokeWidth={3} />
                  </View>
                ) : (
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      borderWidth: 1.5,
                      borderColor: '#cbd5e1',
                      backgroundColor: 'transparent',
                    }}
                  />
                )}
              </ScaleButton>
            );
          })}
        </Animated.View>
      </ScrollView>

      {/* Submit Button */}
      <Animated.View
        style={{
          opacity: buttonAnim,
          transform: [{ translateY: buttonAnim.interpolate({ inputRange: [0, 1], outputRange: [15, 0] }) }],
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: '#ffffff',
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: Platform.OS === 'ios' ? 34 : 20,
          borderTopWidth: 1,
          borderTopColor: '#f1f5f9',
        }}
      >
        <ScaleButton
          onPress={handleCreateAlbum}
          disabled={isSubmitting}
          style={{
            backgroundColor: '#002fff',
            height: 52,
            borderRadius: 26,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#002fff',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
            elevation: 4,
            opacity: isSubmitting ? 0.7 : 1,
          }}
        >
          {isSubmitting ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#ffffff' }}>
                {copy.submittingButton}
              </Text>
            </View>
          ) : (
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#ffffff' }}>
              {copy.submitButton}
            </Text>
          )}
        </ScaleButton>
      </Animated.View>
    </SafeAreaView>
  );
}

function CreateAlbumScreen() {
  const navigation = useNavigation<CreateAlbumNav>();
  const language = useAppLanguage();
  const isVi = language === 'vi';
  const [albumName, setAlbumName] = useState('');
  const [selectedImages, setSelectedImages] = useState<Asset[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectImages = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 1920,
      maxHeight: 1920,
      selectionLimit: 0,
    });

    if (result.errorCode) {
      Alert.alert(
        isVi ? 'Lỗi' : 'Error',
        result.errorMessage || (isVi ? 'Không thể mở thư viện ảnh.' : 'Could not open the photo library.'),
      );
      return;
    }

    if (result.assets?.length) {
      setSelectedImages(result.assets.filter(asset => Boolean(asset.uri)));
    }
  };

  const publishAlbum = async () => {
    if (!albumName.trim()) {
      Alert.alert(isVi ? 'Lỗi' : 'Error', isVi ? 'Vui lòng nhập tên album.' : 'Please enter an album name.');
      return;
    }
    if (selectedImages.length === 0) {
      Alert.alert(isVi ? 'Lỗi' : 'Error', isVi ? 'Vui lòng chọn ít nhất một ảnh.' : 'Please select at least one image.');
      return;
    }
    if (!sessionStorage.getSession()?.userId) {
      Alert.alert(isVi ? 'Lỗi' : 'Error', isVi ? 'Vui lòng đăng nhập để tạo album.' : 'Please sign in to create an album.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await apiBridge.multipart<CreateAlbumResponse>(
        apiRoutes.photos.create,
        {
          type: 'create',
          album_name: albumName.trim(),
          postPhotos: selectedImages.map((image, index) => ({
            uri: image.uri,
            name: image.fileName || `album_${Date.now()}_${index}.jpg`,
            type: image.type || 'image/jpeg',
          })),
        },
      );

      if (response.api_status !== 200 && response.api_status !== '200') {
        throw new Error(response.errors?.error_text || (isVi ? 'Không thể tạo album.' : 'Could not create the album.'));
      }

      Alert.alert(
        isVi ? 'Thành công' : 'Success',
        isVi ? 'Album đã được tạo.' : 'The album was created.',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (error) {
      Alert.alert(
        isVi ? 'Lỗi' : 'Error',
        error instanceof Error ? error.message : (isVi ? 'Không thể tạo album.' : 'Could not create the album.'),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const coverImage = selectedImages[0]?.uri;

  return (
    <View className="flex-1 bg-[#eaf0ff]">
      <FocusAwareStatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <SafeAreaFeedHeader />

      <ScrollView
        className="flex-1 bg-white"
        contentContainerStyle={{ padding: 14, paddingBottom: 28 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text className="mb-2 text-sm font-bold text-slate-800">
          {isVi ? 'Tên album' : 'Album name'}
        </Text>
        <TextInput
          value={albumName}
          onChangeText={setAlbumName}
          editable={!isSubmitting}
          className="h-12 rounded-[7px] border border-slate-300 px-3 text-slate-800"
        />
        <Text className="mb-5 mt-1 text-xs text-slate-500">
          {isVi ? 'Chọn tên album của bạn' : 'Choose a name for your album'}
        </Text>

        <Text className="mb-2 text-sm font-bold text-slate-800">
          {isVi ? 'Hình ảnh' : 'Images'}
        </Text>
        <TouchableOpacity
          activeOpacity={0.88}
          disabled={isSubmitting}
          onPress={selectImages}
          className="h-[280px] overflow-hidden rounded-[6px] bg-[#e5e7eb]"
        >
          {coverImage ? (
            <Image source={{ uri: coverImage }} className="h-full w-full" resizeMode="cover" />
          ) : (
            <View className="h-full w-full bg-[#e5e7eb]" />
          )}
          <View className="absolute inset-0 justify-end bg-black/20 px-4 pb-5">
            <View className="items-center">
              <ImagePlus size={25} color="#FFFFFF" fill="#FFFFFF" />
              <Text className="mt-2 text-center text-sm text-white">
                {isVi ? 'Thả hình ảnh ở đây HOẶC Duyệt để tải lên' : 'Drop images here OR browse to upload'}
              </Text>
              {selectedImages.length > 0 && (
                <Text className="mt-1 text-xs font-bold text-white">
                  {selectedImages.length} {isVi ? 'ảnh đã chọn' : 'images selected'}
                </Text>
              )}
            </View>
          </View>
        </TouchableOpacity>

        {selectedImages.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3">
            {selectedImages.map((image, index) => (
              <View key={`${image.uri}-${index}`} className="mr-2 overflow-hidden rounded-[4px]">
                <Image source={{ uri: image.uri }} className="h-16 w-16" resizeMode="cover" />
                <TouchableOpacity
                  className="absolute right-1 top-1 h-5 w-5 items-center justify-center rounded-full bg-black/60"
                  onPress={() => setSelectedImages(current => current.filter((_, itemIndex) => itemIndex !== index))}
                >
                  <X size={12} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}

        <View className="mt-7 flex-row items-center justify-end gap-6">
          <TouchableOpacity
            disabled={isSubmitting}
            className="h-11 flex-row items-center px-2"
            onPress={() => navigation.goBack()}
          >
            <ChevronLeft size={18} color="#64748b" />
            <Text className="ml-1 text-sm text-slate-500">{isVi ? 'Quay lại' : 'Go back'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            disabled={isSubmitting}
            className="h-11 min-w-[120px] items-center justify-center rounded-[6px] bg-[#0000ff] px-5"
            onPress={publishAlbum}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className="font-bold text-white">{isVi ? 'Công bố' : 'Publish'}</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

export default CreateAlbumScreen;

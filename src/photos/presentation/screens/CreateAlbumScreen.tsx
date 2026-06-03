// Description: Renders the VNSEEA create album screen for naming, privacy, and photo upload setup.
import React, { useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import {
  ArrowLeft,
  CheckCircle2,
  Globe2,
  ImagePlus,
  Lock,
  Users,
  X,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { launchImageLibrary, type Asset } from 'react-native-image-picker';
import { apiRoutes } from '../../../shared-kernel/application/constants/route-registry';
import { apiBridge } from '../../../shared-kernel/infrastructure/api/apiBridge';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';
import type { RootStackParamList } from '../../../navigation/types';

type CreateAlbumNav = NativeStackNavigationProp<RootStackParamList>;

const BRAND = '#0000ff';

type PrivacyOption = 'public' | 'friends' | 'private';

const PRIVACY_OPTIONS: { key: PrivacyOption; label: string; desc: string; Icon: typeof Globe2 }[] = [
  { key: 'public', label: 'Công khai', desc: 'Mọi người đều có thể xem', Icon: Globe2 },
  { key: 'friends', label: 'Bạn bè', desc: 'Chỉ bạn bè có thể xem', Icon: Users },
  { key: 'private', label: 'Riêng tư', desc: 'Chỉ mình tôi', Icon: Lock },
];

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

function CreateAlbumScreen() {
  const navigation = useNavigation<CreateAlbumNav>();

  // States
  const [albumName, setAlbumName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPrivacy, setSelectedPrivacy] = useState<PrivacyOption>('public');
  const [selectedImages, setSelectedImages] = useState<Asset[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        Alert.alert('Lỗi', result.errorMessage || 'Không thể mở thư viện ảnh');
        return;
      }

      if (result.assets && result.assets.length > 0) {
        setSelectedImages(prev => [...prev, ...(result.assets ?? [])]);
      }
    } catch (error) {
      console.error('[CreateAlbum] Error selecting images:', error);
      Alert.alert('Lỗi', 'Đã xảy ra lỗi khi chọn ảnh');
    }
  };

  // Remove image from selection
  const handleRemoveImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  // Validate form
  const validateForm = (): boolean => {
    if (!albumName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên album');
      return false;
    }

    if (selectedImages.length === 0) {
      Alert.alert('Lỗi', 'Vui lòng chọn ít nhất một ảnh');
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
      Alert.alert('Lỗi', 'Vui lòng đăng nhập để tạo album');
      return;
    }

    setIsSubmitting(true);

    try {
      // Build FormData for multipart upload
      const formData: Record<string, unknown> = {
        type: 'create',
        album_name: albumName.trim(),
        postPrivacy: getPrivacyValue(selectedPrivacy),
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
        Alert.alert('Thành công', 'Album đã được tạo', [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]);
      } else {
        throw new Error(response.errors?.error_text || response.message || 'Tạo album thất bại');
      }
    } catch (error) {
      console.error('[CreateAlbum] Error creating album:', error);
      Alert.alert(
        'Lỗi',
        error instanceof Error ? error.message : 'Không thể tạo album. Vui lòng thử lại.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 surface-base" edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={BRAND} />

      {/* Header */}
      <View className="surface-brand h-14 flex-row items-center justify-between px-4">
        <TouchableOpacity
          className="h-10 w-10 items-center justify-center rounded-full"
          activeOpacity={0.8}
          onPress={() => navigation.goBack()}
          disabled={isSubmitting}
        >
          <ArrowLeft size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text className="text-title-primary text-inverse">Tạo Album</Text>
        <View className="h-10 w-10" />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-28 pt-5"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Album Info Card */}
        <View className="surface-card p-4">
          <Text className="text-caption-primary">Tên album *</Text>
          <TextInput
            className="mt-2 rounded-xl border border-slate-200 px-4 py-3 text-body-primary"
            placeholder="Nhập tên album"
            placeholderTextColor="#94A3B8"
            value={albumName}
            onChangeText={setAlbumName}
            maxLength={100}
            editable={!isSubmitting}
          />

          <Text className="mt-5 text-caption-primary">Mô tả</Text>
          <TextInput
            className="mt-2 min-h-[110px] rounded-xl border border-slate-200 px-4 py-3 text-body-primary"
            placeholder="Viết mô tả ngắn cho album"
            placeholderTextColor="#94A3B8"
            value={description}
            onChangeText={setDescription}
            multiline
            textAlignVertical="top"
            maxLength={500}
            editable={!isSubmitting}
          />
        </View>

        {/* Photo Selection Area */}
        {selectedImages.length > 0 ? (
          <View className="mt-4">
            {/* Selected Images Preview */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="gap-2 pr-4"
            >
              {selectedImages.map((image, index) => (
                <View key={`${image.uri}-${index}`} className="relative">
                  <Image
                    source={{ uri: image.uri }}
                    className="h-24 w-24 rounded-xl"
                    resizeMode="cover"
                  />
                  {!isSubmitting && (
                    <TouchableOpacity
                      className="absolute -right-1 -top-1 h-6 w-6 items-center justify-center rounded-full bg-red-500"
                      activeOpacity={0.8}
                      onPress={() => handleRemoveImage(index)}
                    >
                      <X size={14} color="#FFFFFF" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}

              {/* Add More Button */}
              {!isSubmitting && (
                <TouchableOpacity
                  className="h-24 w-24 items-center justify-center rounded-xl border-2 border-dashed border-[#0000ff]/50 bg-[#0000ff]/5"
                  activeOpacity={0.85}
                  onPress={handleSelectImages}
                >
                  <ImagePlus size={24} color={BRAND} />
                  <Text className="mt-1 text-caption-primary text-brand">Thêm</Text>
                </TouchableOpacity>
              )}
            </ScrollView>

            <Text className="mt-2 text-caption-secondary">
              {selectedImages.length} ảnh đã chọn
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            className="preview-panel mt-4 min-h-[190px] items-center justify-center border border-dashed border-[#0000ff] p-6"
            activeOpacity={0.85}
            onPress={handleSelectImages}
            disabled={isSubmitting}
          >
            <ImagePlus size={48} color={BRAND} />
            <Text className="mt-4 text-title-primary text-brand">
              Thêm ảnh vào album
            </Text>
            <Text className="mt-2 text-center text-caption-secondary">
              Chọn nhiều ảnh để tạo bộ sưu tập đầu tiên.
            </Text>
          </TouchableOpacity>
        )}

        {/* Privacy Options */}
        <View className="mt-4 gap-3">
          {PRIVACY_OPTIONS.map(({ key, Icon, desc, label }) => (
            <TouchableOpacity
              key={key}
              className={`surface-card flex-row items-center border p-4 ${
                selectedPrivacy === key ? 'border-[#0000ff]' : 'border-transparent'
              }`}
              activeOpacity={0.84}
              onPress={() => setSelectedPrivacy(key)}
              disabled={isSubmitting}
            >
              <View className="h-12 w-12 items-center justify-center rounded-full bg-[#0000ff]/10">
                <Icon size={23} color={BRAND} />
              </View>
              <View className="ml-4 flex-1">
                <Text className="text-title-primary">{label}</Text>
                <Text className="mt-1 text-caption-secondary">{desc}</Text>
              </View>
              {selectedPrivacy === key && (
                <CheckCircle2 size={22} color={BRAND} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Submit Button */}
      <View className="absolute bottom-0 left-0 right-0 border-t border-[rgba(0,0,255,0.08)] bg-white px-4 pb-5 pt-3">
        <TouchableOpacity
          className={`btn-primary min-h-[52px] ${isSubmitting ? 'opacity-50' : ''}`}
          activeOpacity={0.86}
          onPress={handleCreateAlbum}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <View className="flex-row items-center justify-center">
              <ActivityIndicator size="small" color="#FFFFFF" className="mr-2" />
              <Text className="text-title-primary text-inverse">Đang tạo...</Text>
            </View>
          ) : (
            <Text className="text-title-primary text-inverse">Tạo album</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

export default CreateAlbumScreen;

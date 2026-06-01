// Description: Màn hình chỉnh sửa thông tin cá nhân người dùng.
import React, { useCallback, useState } from 'react';
import {
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
import {
  Camera,
  ImagePlus,
} from 'lucide-react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { launchImageLibrary } from 'react-native-image-picker';
import type { RootStackParamList } from '../../../navigation/types';
import { apiRoutes } from '../../../shared-kernel/application/constants/route-registry';
import { apiBridge } from '../../../shared-kernel/infrastructure/api/apiBridge';
import type { UserProfile } from '../../../user/domain/types/user.types';

type EditProfileParams = {
  EditProfile: {
    profile?: UserProfile;
    avatarUrl?: string;
    coverUrl?: string;
  };
};

type EditProfileScreenProps = NativeStackScreenProps<EditProfileParams, 'EditProfile'>;
const postFormData = apiBridge.post as any;

function EditProfileScreen({ route, navigation }: EditProfileScreenProps) {
  // Get profile data from route params
  const profile = route.params?.profile;
  const avatarUrl = route.params?.avatarUrl;
  const coverUrl = route.params?.coverUrl;

  // Form state - pre-filled with existing data
  const [firstName, setFirstName] = useState(profile?.firstName || '');
  const [lastName, setLastName] = useState(profile?.lastName || '');
  const [about, setAbout] = useState(profile?.about || '');
  const [website, setWebsite] = useState(profile?.website || '');
  const [gender, setGender] = useState<'male' | 'female' | ''>(
    profile?.gender === 'male' || profile?.gender === 'female' ? profile.gender : ''
  );

  // New image state (only set when user picks new images)
  const [newAvatarUri, setNewAvatarUri] = useState<string | null>(null);
  const [newCoverUri, setNewCoverUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Track changes
  const handleFieldChange = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    setHasChanges(true);
  };

  // Pick avatar image
  const handlePickAvatar = useCallback(async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 500,
        maxHeight: 500,
      });
      if (result.assets?.[0]?.uri) {
        setNewAvatarUri(result.assets[0].uri);
        setHasChanges(true);
      }
    } catch (err) {
      console.log('Error picking avatar:', err);
    }
  }, []);

  // Pick cover image
  const handlePickCover = useCallback(async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 1200,
        maxHeight: 400,
      });
      if (result.assets?.[0]?.uri) {
        setNewCoverUri(result.assets[0].uri);
        setHasChanges(true);
      }
    } catch (err) {
      console.log('Error picking cover:', err);
    }
  }, []);

  // Submit form
  const handleSubmit = useCallback(async () => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      const formData = new FormData();

      // Add text fields
      if (firstName.trim()) formData.append('first_name', firstName.trim());
      if (lastName.trim()) formData.append('last_name', lastName.trim());
      if (about.trim()) formData.append('about', about.trim());
      if (website.trim()) formData.append('website', website.trim());
      if (gender) formData.append('gender', gender);

      // Add new avatar if picked
      if (newAvatarUri) {
        formData.append('avatar', {
          uri: newAvatarUri,
          name: 'avatar.jpg',
          type: 'image/jpeg',
        } as any);
      }

      // Add new cover if picked
      if (newCoverUri) {
        formData.append('cover', {
          uri: newCoverUri,
          name: 'cover.jpg',
          type: 'image/jpeg',
        } as any);
      }

      console.log('[EditProfile] Submitting profile update...');
      const response = await postFormData(apiRoutes.user.update, formData);
      console.log('[EditProfile] Response:', response);

      if (response.api_status == 200) {
        Alert.alert('Thành công', 'Đã cập nhật thông tin cá nhân!', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        throw new Error(response.errors?.[0]?.error_text || 'Cập nhật thất bại');
      }
    } catch (err: any) {
      console.log('[EditProfile] Error:', err);
      Alert.alert('Lỗi', err?.message || 'Không thể cập nhật thông tin. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  }, [firstName, lastName, about, website, gender, newAvatarUri, newCoverUri, navigation, isLoading]);

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View className="h-14 flex-row items-center justify-between border-b border-slate-200 bg-white px-4">
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => navigation.goBack()}
          className="h-10 w-10 items-center justify-center rounded-full"
        >
          <ArrowLeft size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-slate-900">Chỉnh sửa thông tin</Text>
        <TouchableOpacity
          activeOpacity={hasChanges ? 0.7 : 1}
          onPress={handleSubmit}
          disabled={!hasChanges || isLoading}
          className={`h-10 min-w-[60px] items-center justify-center rounded-full px-4 ${
            hasChanges ? 'bg-blue-600' : 'bg-slate-200'
          }`}
        >
          {isLoading ? (
            <Text className="text-sm font-semibold text-slate-400">...</Text>
          ) : (
            <Text className={`text-sm font-semibold ${hasChanges ? 'text-white' : 'text-slate-400'}`}>
              Lưu
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
          {/* Avatar Section */}
          <View className="mb-6 items-center">
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={handlePickAvatar}
              className="relative"
            >
              {newAvatarUri ? (
                <Image
                  source={{ uri: newAvatarUri }}
                  className="h-24 w-24 rounded-full border-4 border-white shadow-lg"
                  resizeMode="cover"
                />
              ) : avatarUrl ? (
                <Image
                  source={{ uri: avatarUrl }}
                  className="h-24 w-24 rounded-full border-4 border-white shadow-lg"
                  resizeMode="cover"
                />
              ) : (
                <View className="h-24 w-24 items-center justify-center rounded-full border-4 border-white bg-slate-200 shadow-lg">
                  <Text className="text-3xl font-bold text-slate-400">
                    {(firstName[0] || lastName[0] || '?').toUpperCase()}
                  </Text>
                </View>
              )}
              <View className="absolute bottom-0 right-0 h-8 w-8 items-center justify-center rounded-full bg-blue-600 shadow-lg">
                <Camera size={14} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
            <Text className="mt-2 text-sm font-medium text-slate-500">
              Nhấn để đổi ảnh đại diện
            </Text>
          </View>

          {/* Cover Section */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={handlePickCover}
            className="mb-6 h-32 overflow-hidden rounded-2xl border border-slate-200"
          >
            {newCoverUri ? (
              <Image source={{ uri: newCoverUri }} className="h-full w-full" resizeMode="cover" />
            ) : coverUrl ? (
              <Image source={{ uri: coverUrl }} className="h-full w-full" resizeMode="cover" />
            ) : (
              <View className="flex-1 items-center justify-center bg-slate-100">
                <ImagePlus size={24} color="#94A3B8" />
                <Text className="mt-2 text-sm text-slate-400">Thêm ảnh bìa</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Form Fields */}
          <View className="gap-4">
            {/* First Name */}
            <View>
              <Text className="mb-1.5 text-sm font-medium text-slate-700">Tên</Text>
              <TextInput
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900"
                placeholder="Nhập tên của bạn"
                placeholderTextColor="#94A3B8"
                value={firstName}
                onChangeText={handleFieldChange(setFirstName)}
              />
            </View>

            {/* Last Name */}
            <View>
              <Text className="mb-1.5 text-sm font-medium text-slate-700">Họ</Text>
              <TextInput
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900"
                placeholder="Nhập họ của bạn"
                placeholderTextColor="#94A3B8"
                value={lastName}
                onChangeText={handleFieldChange(setLastName)}
              />
            </View>

            {/* Gender */}
            <View>
              <Text className="mb-1.5 text-sm font-medium text-slate-700">Giới tính</Text>
              <View className="flex-row gap-3">
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => { setGender('male'); setHasChanges(true); }}
                  className={`flex-1 items-center justify-center rounded-xl border-2 py-3 ${
                    gender === 'male' ? 'border-blue-600 bg-blue-50' : 'border-slate-200 bg-white'
                  }`}
                >
                  <Text className={`font-medium ${gender === 'male' ? 'text-blue-600' : 'text-slate-600'}`}>
                    Nam
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => { setGender('female'); setHasChanges(true); }}
                  className={`flex-1 items-center justify-center rounded-xl border-2 py-3 ${
                    gender === 'female' ? 'border-blue-600 bg-blue-50' : 'border-slate-200 bg-white'
                  }`}
                >
                  <Text className={`font-medium ${gender === 'female' ? 'text-blue-600' : 'text-slate-600'}`}>
                    Nữ
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* About */}
            <View>
              <Text className="mb-1.5 text-sm font-medium text-slate-700">Giới thiệu bản thân</Text>
              <TextInput
                className="min-h-[100px] rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900"
                placeholder="Viết vài dòng về bản thân bạn..."
                placeholderTextColor="#94A3B8"
                value={about}
                onChangeText={handleFieldChange(setAbout)}
                multiline
                textAlignVertical="top"
              />
            </View>

            {/* Website */}
            <View>
              <Text className="mb-1.5 text-sm font-medium text-slate-700">Website</Text>
              <TextInput
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900"
                placeholder="https://example.com"
                placeholderTextColor="#94A3B8"
                value={website}
                onChangeText={handleFieldChange(setWebsite)}
                keyboardType="url"
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Info Text */}
          <View className="mt-6 rounded-xl bg-slate-100 p-4">
            <Text className="text-sm text-slate-500">
              💡 Thông tin này sẽ được hiển thị trên trang cá nhân của bạn. Bạn có thể chỉnh sửa bất cứ lúc nào.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default EditProfileScreen;
// Description: Screen for creating a new blog post with form fields.
import React, { useState, useCallback } from 'react';
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
import { launchImageLibrary, type Asset, type MediaType } from 'react-native-image-picker';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeft, Plus, X } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../../../navigation/types';
import { createBlogsRepository } from '../../infrastructure/repositories/ApiBlogsRepository';
import type { BlogCreateData } from '../../domain/repositories/BlogsRepository';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import {
  languageStorage,
  type AppLanguage,
} from '../../../shared-kernel/infrastructure/storage/languageStorage';
import { getBlogsCopy } from '../../application/i18n/blogsCopy';

type CreateBlogNav = NativeStackNavigationProp<RootStackParamList>;

const categories = [
  { id: 'vehicles', label: 'Xe cộ' },
  { id: 'business', label: 'Kinh doanh' },
  { id: 'education', label: 'Giáo dục' },
  { id: 'movies', label: 'Phim ảnh' },
  { id: 'gaming', label: 'Gaming' },
  { id: 'history', label: 'Lịch sử' },
  { id: 'lifestyle', label: 'Đời sống' },
  { id: 'pets', label: 'Thú cưng' },
  { id: 'science', label: 'Khoa học' },
  { id: 'sports', label: 'Thể thao' },
  { id: 'travel', label: 'Du lịch' },
  { id: 'people', label: 'Con người' },
  { id: 'other', label: 'Khác' },
];

function CreateBlogScreen() {
  const navigation = useNavigation<CreateBlogNav>();
  const repository = createBlogsRepository();
  const [language] = useState<AppLanguage>(languageStorage.getLanguage());
  const copy = getBlogsCopy(language);
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('other');
  const [tags, setTags] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [thumbnail, setThumbnail] = useState<Asset | null>(null);
  const [isPickingImage, setIsPickingImage] = useState(false);

  const handlePickThumbnail = useCallback(async () => {
    console.log('[CreateBlogScreen] handlePickThumbnail called');
    setIsPickingImage(true);
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo' as MediaType,
        selectionLimit: 1,
        includeBase64: false,
        maxWidth: 1080,
        maxHeight: 1080,
        quality: 0.8,
      });

      console.log('[CreateBlogScreen] Image picker result:', result);

      if (result.didCancel) {
        console.log('[CreateBlogScreen] User cancelled image picker');
        return;
      }
      if (result.errorCode) {
        console.log('[CreateBlogScreen] Image picker error:', result.errorCode, result.errorMessage);
        Alert.alert('Lỗi', result.errorMessage ?? 'Không thể chọn ảnh.');
        return;
      }

      const assets = result.assets ?? [];
      console.log('[CreateBlogScreen] Selected assets:', assets);
      if (assets.length > 0) {
        setThumbnail(assets[0]);
      }
    } finally {
      setIsPickingImage(false);
    }
  }, []);

  const handleRemoveThumbnail = useCallback(() => {
    setThumbnail(null);
  }, []);

  const handleCreate = async () => {
    if (!title.trim() || title.length < 10) {
      Alert.alert(copy.errorTitle, copy.errorTitle);
      return;
    }

    if (!content.trim() || content.length < 80) {
      Alert.alert(copy.errorTitle, copy.errorContent);
      return;
    }

    if (!tags.trim()) {
      Alert.alert(copy.errorTitle, copy.errorCategory);
      return;
    }

    setIsLoading(true);

    try {
      let thumbnailFile = null;
      
      if (thumbnail && thumbnail.uri) {
        thumbnailFile = {
          filename: thumbnail.fileName || `thumbnail_${Date.now()}.jpg`,
          type: thumbnail.type || 'image/jpeg',
          uri: thumbnail.uri,
        };
      }

      const data: BlogCreateData = {
        title: title.trim(),
        content: content.trim(),
        description: description.trim() || content.slice(0, 290),
        category,
        tags: tags.trim(),
        status: 'publish',
        thumbnailFile,
      };

      await repository.createBlog(data);
      Alert.alert(
        'Thành công',
        copy.successCreate,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ],
      );
    } catch (error) {
      Alert.alert(
        'Lỗi',
        error instanceof Error ? error.message : copy.errorCreate,
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 surface-base" edges={['top']}>
      <FocusAwareStatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      <View className="surface-topbar h-16 flex-row items-center justify-between px-4">
        <View className="flex-row items-center">
          <TouchableOpacity
            className="h-10 w-10 items-center justify-center rounded-full"
            activeOpacity={0.8}
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft size={22} color="#0F172A" />
          </TouchableOpacity>
          <Text className="ml-3 text-heading">{copy.createBlogTitle}</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-4 pb-6 pt-4"
          showsVerticalScrollIndicator={false}
        >
          <View className="mb-6">
            <Text className="mb-2 text-title-primary">{copy.title} *</Text>
            <TextInput
              className="surface-card min-h-[52] rounded-xl px-4 text-body-primary"
              placeholder={copy.titlePlaceholder}
              placeholderTextColor="#94A3B8"
              value={title}
              onChangeText={setTitle}
              multiline
            />
            <Text className="mt-1 text-caption-secondary">
              {title.length}/10 ký tự tối thiểu
            </Text>
          </View>

          <View className="mb-6">
            <Text className="mb-2 text-title-primary">{copy.categoryLabel}</Text>
            <View className="flex-row flex-wrap gap-2">
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  className={`rounded-full border px-4 py-2 ${
                    category === cat.id
                      ? 'border-[#0000ff] bg-[#0000ff]/10'
                      : 'border-slate-200 bg-white'
                  }`}
                  activeOpacity={0.7}
                  onPress={() => setCategory(cat.id)}
                >
                  <Text
                    className={`text-body-primary ${
                      category === cat.id ? 'text-brand' : ''
                    }`}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View className="mb-6">
            <Text className="mb-2 text-title-primary">{copy.description}</Text>
            <TextInput
              className="surface-card min-h-[52] rounded-xl px-4 text-body-primary"
              placeholder={copy.descriptionPlaceholder}
              placeholderTextColor="#94A3B8"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />
          </View>

          <View className="mb-6">
            <Text className="mb-2 text-title-primary">{copy.content} *</Text>
            <TextInput
              className="surface-card min-h-[180] rounded-xl px-4 text-body-primary"
              placeholder={copy.contentPlaceholder}
              placeholderTextColor="#94A3B8"
              value={content}
              onChangeText={setContent}
              multiline
              textAlignVertical="top"
            />
            <Text className="mt-1 text-caption-secondary">
              {content.length}/80 ký tự tối thiểu
            </Text>
          </View>

          <View className="mb-6">
            <Text className="mb-2 text-title-primary">Tags *</Text>
            <TextInput
              className="surface-card min-h-[52] rounded-xl px-4 text-body-primary"
              placeholder="Ví dụ: công nghệ, lập trình, react..."
              placeholderTextColor="#94A3B8"
              value={tags}
              onChangeText={setTags}
            />
            <Text className="mt-1 text-caption-secondary">
              Cách nhau bằng dấu phẩy
            </Text>
          </View>

          <View className="mb-6">
            {thumbnail ? (
              <View className="relative">
                <Image
                  source={{ uri: thumbnail.uri }}
                  className="h-48 w-full rounded-xl bg-slate-200"
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
                className="surface-card flex-row items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 py-6"
                activeOpacity={0.7}
                onPress={handlePickThumbnail}
                disabled={isPickingImage}
              >
                {isPickingImage ? (
                  <ActivityIndicator color="#94A3B8" />
                ) : (
                  <>
                    <Plus size={24} color="#94A3B8" />
                    <Text className="text-body-secondary">Thêm ảnh thumbnail</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            className="btn-primary min-h-[52] rounded-xl"
            activeOpacity={0.86}
            onPress={handleCreate}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className="text-title-primary text-inverse">{copy.publish}</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default CreateBlogScreen;

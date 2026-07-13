// Description: Renders the mobile blog create and edit form using existing blog API data.
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
import { launchImageLibrary, type Asset, type MediaType } from 'react-native-image-picker';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ArrowLeft,
  Bold,
  Check,
  ChevronDown,
  Heading2,
  Image as ImageIcon,
  Italic,
  List,
  Quote,
  X,
} from 'lucide-react-native';
import { SafeAreaFeedHeader } from '../../../feed/presentation/components/SafeAreaFeedHeader';
import type { RootStackParamList } from '../../../navigation/types';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import { createBlogsRepository } from '../../infrastructure/repositories/ApiBlogsRepository';
import type { BlogCategoryOption } from '../../domain/types/blogs.types';
import type { BlogCreateData } from '../../domain/repositories/BlogsRepository';

type CreateBlogNav = NativeStackNavigationProp<RootStackParamList>;

const BRAND = '#0000FF';

type Selection = {
  start: number;
  end: number;
};

function wordCountOf(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text style={{ marginBottom: 8, color: '#111827', fontSize: 14, fontWeight: '800' }}>
      {children}
    </Text>
  );
}

function EditorTool({
  children,
  onPress,
}: {
  children: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.78}
      onPress={onPress}
      style={{
        minHeight: 34,
        minWidth: 34,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
      }}
    >
      {children}
    </TouchableOpacity>
  );
}

function CreateBlogScreen() {
  const navigation = useNavigation<CreateBlogNav>();
  const route = useRoute();
  const params = route.params as { blogId?: string } | undefined;
  const editBlogId = params?.blogId;
  const isEditMode = Boolean(editBlogId);
  const repository = useMemo(() => createBlogsRepository(), []);

  const [categories, setCategories] = useState<BlogCategoryOption[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('other');
  const [tags, setTags] = useState('');
  const [thumbnail, setThumbnail] = useState<Asset | null>(null);
  const [existingThumbnailUrl, setExistingThumbnailUrl] = useState('');
  const [selection, setSelection] = useState<Selection>({ start: 0, end: 0 });
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isPickingImage, setIsPickingImage] = useState(false);
  const [isLoadingArticle, setIsLoadingArticle] = useState(isEditMode);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;
    repository.getCategories()
      .then(result => {
        if (!mounted) return;
        setCategories(result);
        if (!isEditMode && result[0]?.id) {
          setCategory(result[0].id);
        }
      })
      .catch(() => {
        if (mounted) {
          setCategories([{ id: 'other', label: 'Khác' }]);
        }
      });
    return () => {
      mounted = false;
    };
  }, [isEditMode, repository]);

  useEffect(() => {
    if (!editBlogId) return;

    let mounted = true;
    setIsLoadingArticle(true);
    repository.getArticleById(editBlogId)
      .then(article => {
        if (!mounted) return;
        setTitle(article.title || '');
        setDescription(article.description || '');
        setContent(article.content || '');
        setCategory(article.categoryId || 'other');
        setTags(String((article.raw as Record<string, unknown> | undefined)?.tags || ''));
        setExistingThumbnailUrl(article.thumbnailUrl || '');
      })
      .catch(error => {
        if (mounted) {
          Alert.alert('Lỗi', error instanceof Error ? error.message : 'Không thể tải bài viết.');
          navigation.goBack();
        }
      })
      .finally(() => {
        if (mounted) setIsLoadingArticle(false);
      });

    return () => {
      mounted = false;
    };
  }, [editBlogId, navigation, repository]);

  const selectedCategoryLabel = categories.find(item => item.id === category)?.label || 'Loại';
  const contentWordCount = wordCountOf(content);
  const thumbnailPreview = thumbnail?.uri || existingThumbnailUrl;

  const applyContentTransform = useCallback((type: 'h2' | 'bold' | 'italic' | 'quote' | 'list') => {
    const selectedStart = Math.min(selection.start, selection.end);
    const selectedEnd = Math.max(selection.start, selection.end);
    const selected = content.slice(selectedStart, selectedEnd);
    const hasSelection = selected.length > 0;
    const start = hasSelection ? selectedStart : content.length;
    const end = hasSelection ? selectedEnd : content.length;
    const before = content.slice(0, start);
    const after = content.slice(end);

    const withSpacing = (value: string, block = false) => {
      const leading = before.length > 0 ? (before.endsWith('\n') || (!block && before.endsWith(' ')) ? '' : block ? '\n' : ' ') : '';
      const trailing = after.length > 0 ? (after.startsWith('\n') || (!block && after.startsWith(' ')) ? '' : block ? '\n' : ' ') : block ? '\n' : '';
      return `${leading}${value}${trailing}`;
    };

    const cleanLines = (value: string) => value
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean);

    let replacement = selected || '';
    if (type === 'h2') {
      replacement = withSpacing(hasSelection ? selected.trim() : 'Tiêu đề', true);
    }
    if (type === 'bold') {
      replacement = withSpacing(hasSelection ? selected.trim() : 'chữ đậm');
    }
    if (type === 'italic') {
      replacement = withSpacing(hasSelection ? selected.trim() : 'chữ nghiêng');
    }
    if (type === 'quote') {
      const text = cleanLines(hasSelection ? selected : 'Trích dẫn').join('\n');
      replacement = withSpacing(text, true);
    }
    if (type === 'list') {
      const text = cleanLines(hasSelection ? selected : 'Mục danh sách')
        .map(line => `• ${line}`)
        .join('\n');
      replacement = withSpacing(text, true);
    }

    const nextContent = `${before}${replacement}${after}`;
    const nextCaret = before.length + replacement.length;
    setContent(nextContent);
    setSelection({ start: nextCaret, end: nextCaret });
  }, [content, selection.end, selection.start]);

  const handlePickThumbnail = useCallback(async () => {
    setIsPickingImage(true);
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo' as MediaType,
        selectionLimit: 1,
        includeBase64: false,
        maxWidth: 1200,
        maxHeight: 800,
        quality: 0.8,
      });

      if (result.didCancel) return;
      if (result.errorCode) {
        Alert.alert('Lỗi', result.errorMessage ?? 'Không thể chọn ảnh.');
        return;
      }
      setThumbnail(result.assets?.[0] ?? null);
    } finally {
      setIsPickingImage(false);
    }
  }, []);

  const validateForm = useCallback(() => {
    const normalizedTitle = title.trim();
    const normalizedDescription = description.trim();
    const normalizedContent = content.trim();
    const normalizedTags = tags.trim();

    if (normalizedTitle.length < 10) {
      Alert.alert('Lỗi', 'Tiêu đề phải có ít nhất 10 ký tự.');
      return null;
    }
    if (normalizedDescription.length < 32) {
      Alert.alert('Lỗi', 'Sự mô tả phải có ít nhất 32 ký tự.');
      return null;
    }
    if (normalizedContent.length < 80) {
      Alert.alert('Lỗi', 'Nội dung phải có ít nhất 80 ký tự.');
      return null;
    }
    if (!normalizedTags) {
      Alert.alert('Lỗi', 'Vui lòng nhập thẻ.');
      return null;
    }
    if (!thumbnail?.uri && !existingThumbnailUrl) {
      Alert.alert('Lỗi', 'Vui lòng chọn hình nhỏ.');
      return null;
    }

    const thumbnailFile = thumbnail?.uri
      ? {
          filename: thumbnail.fileName || `blog_${Date.now()}.jpg`,
          type: thumbnail.type || 'image/jpeg',
          uri: thumbnail.uri,
        }
      : null;

    return {
      title: normalizedTitle,
      description: normalizedDescription,
      content: normalizedContent,
      category,
      tags: normalizedTags,
      status: 'publish',
      thumbnailFile,
    } satisfies BlogCreateData;
  }, [category, content, description, existingThumbnailUrl, tags, thumbnail, title]);

  const handleSubmit = useCallback(async () => {
    const payload = validateForm();
    if (!payload) return;

    if (isEditMode) {
      Alert.alert(
        'Chưa thể cập nhật',
        'App đã mở form chỉnh sửa trong ứng dụng, nhưng backend API v2 hiện chưa có endpoint cập nhật bài viết bằng access token. Theo yêu cầu, tôi không sửa PHP và không gọi endpoint web session-hash.',
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await repository.createBlog(payload);
      Alert.alert('Thành công', 'Đã đăng bài viết thành công.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('Lỗi', error instanceof Error ? error.message : 'Không thể đăng bài viết.');
    } finally {
      setIsSubmitting(false);
    }
  }, [isEditMode, navigation, repository, validateForm]);

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <FocusAwareStatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={{ zIndex: 10, elevation: 5, backgroundColor: '#FFFFFF' }}>
        <SafeAreaFeedHeader />
      </View>

      {isLoadingArticle ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={BRAND} />
        </View>
      ) : (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 10, paddingBottom: 96, paddingTop: 16 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={{ marginBottom: 16, color: '#111827', fontSize: 22, fontWeight: '900' }}>
              {isEditMode ? 'Chỉnh sửa bài viết' : 'Tạo bài viết'}
            </Text>

            <View style={{ marginBottom: 18 }}>
              <FieldLabel>Tiêu đề</FieldLabel>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder=""
                placeholderTextColor="#A3AAB8"
                style={{ minHeight: 48, borderRadius: 9, borderWidth: 1, borderColor: '#D8DEE8', backgroundColor: '#FFFFFF', paddingHorizontal: 12, color: '#111827', fontSize: 15 }}
              />
            </View>

            <View style={{ marginBottom: 18 }}>
              <FieldLabel>Sự mô tả</FieldLabel>
              <TextInput
                value={description}
                onChangeText={setDescription}
                multiline
                textAlignVertical="top"
                placeholder=""
                placeholderTextColor="#A3AAB8"
                style={{ minHeight: 86, borderRadius: 9, borderWidth: 1, borderColor: '#D8DEE8', backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingTop: 10, color: '#111827', fontSize: 15, lineHeight: 21 }}
              />
            </View>

            <View style={{ marginBottom: 18 }}>
              <FieldLabel>Nội dung</FieldLabel>
              <View style={{ overflow: 'hidden', borderRadius: 10, borderWidth: 1, borderColor: '#D8DEE8', backgroundColor: '#FFFFFF' }}>
                <View style={{ borderBottomWidth: 1, borderBottomColor: '#EEF2F7', paddingHorizontal: 12, paddingVertical: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <EditorTool onPress={() => applyContentTransform('h2')}><Heading2 size={17} color="#475569" /></EditorTool>
                    <EditorTool onPress={() => applyContentTransform('bold')}><Bold size={16} color="#475569" /></EditorTool>
                    <EditorTool onPress={() => applyContentTransform('italic')}><Italic size={16} color="#475569" /></EditorTool>
                    <EditorTool onPress={() => applyContentTransform('quote')}><Quote size={16} color="#475569" /></EditorTool>
                    <EditorTool onPress={() => applyContentTransform('list')}><List size={17} color="#475569" /></EditorTool>
                  </View>
                </View>
                <TextInput
                  value={content}
                  onChangeText={setContent}
                  onSelectionChange={event => setSelection(event.nativeEvent.selection)}
                  multiline
                  textAlignVertical="top"
                  placeholder="Nội dung"
                  placeholderTextColor="#A3AAB8"
                  style={{ minHeight: 210, paddingHorizontal: 14, paddingTop: 16, color: '#111827', fontSize: 15, lineHeight: 22 }}
                />
                <View style={{ minHeight: 30, borderTopWidth: 1, borderTopColor: '#EEF2F7', paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ color: '#94A3B8', fontSize: 12 }}>p</Text>
                  <Text style={{ color: '#94A3B8', fontSize: 12 }}>{contentWordCount} words</Text>
                </View>
              </View>
            </View>

            <View style={{ marginBottom: 18 }}>
              <FieldLabel>Hình nhỏ</FieldLabel>
              <TouchableOpacity activeOpacity={0.86} onPress={handlePickThumbnail} disabled={isPickingImage} style={{ height: 190, overflow: 'hidden', borderRadius: 8, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' }}>
                {thumbnailPreview ? (
                  <>
                    <Image source={{ uri: thumbnailPreview }} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }} resizeMode="cover" />
                    <TouchableOpacity activeOpacity={0.84} onPress={() => { setThumbnail(null); setExistingThumbnailUrl(''); }} style={{ position: 'absolute', top: 10, right: 10, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(15,23,42,0.68)', alignItems: 'center', justifyContent: 'center' }}>
                      <X size={17} color="#FFFFFF" />
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    {isPickingImage ? <ActivityIndicator color="#64748B" /> : <ImageIcon size={28} color="#FFFFFF" />}
                    <Text style={{ marginTop: 10, color: '#FFFFFF', fontSize: 14, fontWeight: '700' }}>Thả hình ảnh ở đây HOẶC Duyệt để tải lên</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View style={{ marginBottom: 18 }}>
              <FieldLabel>Loại</FieldLabel>
              <TouchableOpacity activeOpacity={0.84} onPress={() => setIsCategoryOpen(current => !current)} style={{ minHeight: 46, borderRadius: 9, borderWidth: 1, borderColor: '#D8DEE8', backgroundColor: '#FFFFFF', paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ flex: 1, color: category ? '#111827' : '#94A3B8', fontSize: 15 }}>{selectedCategoryLabel}</Text>
                <ChevronDown size={19} color="#94A3B8" />
              </TouchableOpacity>
              {isCategoryOpen ? (
                <View style={{ marginTop: 8, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#FFFFFF', overflow: 'hidden' }}>
                  {categories.map(item => (
                    <TouchableOpacity
                      key={item.id}
                      activeOpacity={0.78}
                      onPress={() => {
                        setCategory(item.id);
                        setIsCategoryOpen(false);
                      }}
                      style={{ minHeight: 42, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}
                    >
                      <Text style={{ flex: 1, color: '#111827', fontSize: 14, fontWeight: item.id === category ? '800' : '500' }}>{item.label}</Text>
                      {item.id === category ? <Check size={16} color={BRAND} /> : null}
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}
            </View>

            <View style={{ marginBottom: 18 }}>
              <FieldLabel>Thẻ</FieldLabel>
              <TextInput
                value={tags}
                onChangeText={setTags}
                placeholder="Thẻ"
                placeholderTextColor="#94A3B8"
                style={{ minHeight: 46, borderRadius: 9, borderWidth: 1, borderColor: '#D8DEE8', backgroundColor: '#FFFFFF', paddingHorizontal: 12, color: '#111827', fontSize: 15 }}
              />
            </View>

            <View style={{ alignSelf: 'flex-start', minWidth: 224, minHeight: 58, borderRadius: 2, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#FFFFFF', paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Check size={26} color="#16A34A" />
              <Text style={{ color: '#334155', fontSize: 13, fontWeight: '700' }}>I'm not a robot</Text>
              <View style={{ marginLeft: 'auto', alignItems: 'center' }}>
                <View style={{ width: 28, height: 28, borderRadius: 4, backgroundColor: '#E2E8F0' }} />
                <Text style={{ marginTop: 2, color: '#64748B', fontSize: 9 }}>reCAPTCHA</Text>
              </View>
            </View>
          </ScrollView>

          <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, minHeight: 72, borderTopWidth: 1, borderTopColor: '#E2E8F0', backgroundColor: '#FFFFFF', paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <TouchableOpacity activeOpacity={0.82} onPress={() => navigation.goBack()} style={{ minHeight: 44, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ArrowLeft size={18} color="#64748B" />
              <Text style={{ color: '#64748B', fontSize: 14, fontWeight: '700' }}>Quay lại</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.86} onPress={handleSubmit} disabled={isSubmitting} style={{ minWidth: 118, minHeight: 46, borderRadius: 8, backgroundColor: BRAND, alignItems: 'center', justifyContent: 'center', opacity: isSubmitting ? 0.7 : 1 }}>
              {isSubmitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '900' }}>{isEditMode ? 'Lưu' : 'Công bố'}</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

export default CreateBlogScreen;

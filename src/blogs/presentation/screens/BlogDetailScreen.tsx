// Description: Renders a WoWonder article detail page with hero metadata, comments, related posts, and category widgets.
import {
  APP_BRAND_COLOR,
  APP_COLORS,
} from '../../../shared-kernel/presentation/theme/appColors';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  Linking,
  ScrollView,
  Share,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ArrowLeft,
  BookOpen,
  FileText,
  MessageCircle,
  RotateCw,
  Search,
  Send,
  Share2,
  Tag,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SafeAreaFeedHeader } from '../../../feed/presentation/components/SafeAreaFeedHeader';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import { ROOT_SAFE_AREA_EDGES } from '../../../shared-kernel/presentation/utils/safeAreaEdges';
import { useBlogDetailViewModel } from '../../application/view-models/useBlogDetailViewModel';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import { KeyboardSafeView } from '../../../shared-kernel/presentation/components/KeyboardSafeView';
import {
  languageStorage,
  type AppLanguage,
} from '../../../shared-kernel/infrastructure/storage/languageStorage';
import { getBlogsCopy } from '../../application/i18n/blogsCopy';
import type { BlogCategoryOption, BlogsItem } from '../../domain/types/blogs.types';

type BlogDetailNav = NativeStackNavigationProp<RootStackParamList>;
type BlogDetailRoute = RouteProp<RootStackParamList, typeof ROUTES.BLOG_DETAIL>;

const BRAND = APP_BRAND_COLOR;
const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1495020689067-958852a7765e?q=80&w=1400&auto=format&fit=crop';

const categoryKeyMap: Record<string, string> = {
  vehicles: 'categoryVehicles',
  comedy: 'categoryComedy',
  business: 'categoryBusiness',
  education: 'categoryEducation',
  entertainment: 'categoryEntertainment',
  movies: 'categoryMovies',
  gaming: 'categoryGaming',
  history: 'categoryHistory',
  lifestyle: 'categoryLifestyle',
  nature: 'categoryNature',
  news: 'categoryNews',
  people: 'categoryPeople',
  pets: 'categoryPets',
  places: 'categoryPlaces',
  science: 'categoryScience',
  sports: 'categorySports',
  travel: 'categoryTravel',
  other: 'categoryOther',
};

function categoryLabelOf(
  categoryId: string | undefined,
  fallback: string | undefined,
  copy: Record<string, string>,
) {
  const key = categoryId ? categoryKeyMap[categoryId] : undefined;
  return (key ? copy[key] : undefined) || fallback || copy.categoryOther || copy.article;
}

function dateLabelOf(article: BlogsItem) {
  if (article.postedLabel) return article.postedLabel;
  if (!article.postedAt) return '';

  const date = new Date(article.postedAt * 1000);
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function textBlocksOf(article: BlogsItem) {
  const source = article.content || article.description || '';
  const blocks = source
    .replace(/\.\s+/g, '.\n')
    .split(/\n+/g)
    .map(block => block.trim())
    .filter(Boolean);

  return blocks.length > 0 ? blocks : [source].filter(Boolean);
}

function SocialButton({ label, color, onPress }: { label: string; color: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      activeOpacity={0.82}
      onPress={onPress}
      style={{
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: color,
      }}
    >
      <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>{label}</Text>
    </TouchableOpacity>
  );
}

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: BRAND, alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </View>
      <Text style={{ color: '#111827', fontSize: 15, fontWeight: '800' }}>{title}</Text>
    </View>
  );
}

function RelatedArticleCard({ article, onPress }: { article: BlogsItem; onPress: () => void }) {
  return (
    <TouchableOpacity activeOpacity={0.86} onPress={onPress} style={{ marginBottom: 18 }}>
      {article.thumbnailUrl ? (
        <Image source={{ uri: article.thumbnailUrl }} style={{ width: '100%', height: 92, borderRadius: 8, backgroundColor: '#E5E7EB' }} resizeMode="cover" />
      ) : (
        <View style={{ width: '100%', height: 92, borderRadius: 8, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#9CA3AF' }}>Article Picture</Text>
        </View>
      )}
      <Text numberOfLines={2} style={{ marginTop: 8, color: '#111827', fontSize: 13, fontWeight: '800', lineHeight: 18 }}>
        {article.title}
      </Text>
      <Text style={{ marginTop: 5, color: '#9CA3AF', fontSize: 12, fontWeight: '600' }}>{dateLabelOf(article)}</Text>
    </TouchableOpacity>
  );
}

function PopularArticleRow({ article, onPress }: { article: BlogsItem; onPress: () => void }) {
  return (
    <TouchableOpacity activeOpacity={0.86} onPress={onPress} style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
      {article.thumbnailUrl ? (
        <Image source={{ uri: article.thumbnailUrl }} style={{ width: 64, height: 52, borderRadius: 6, backgroundColor: '#E5E7EB' }} resizeMode="cover" />
      ) : (
        <View style={{ width: 64, height: 52, borderRadius: 6, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#94A3B8', fontSize: 10 }}>Article</Text>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text numberOfLines={2} style={{ color: '#111827', fontSize: 13, fontWeight: '800', lineHeight: 17 }}>
          {article.title}
        </Text>
        <Text numberOfLines={1} style={{ marginTop: 3, color: '#9CA3AF', fontSize: 12 }}>
          Qua {article.author.name || article.author.username || 'VNSEEA'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function CategoriesCloud({ categories, copy }: { categories: BlogCategoryOption[]; copy: Record<string, string> }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {categories.map(category => {
        const key = categoryKeyMap[category.id];
        return (
          <View key={category.id} style={{ borderRadius: 999, backgroundColor: APP_COLORS.brand.soft, paddingHorizontal: 12, paddingVertical: 8 }}>
            <Text style={{ color: '#4263C7', fontSize: 12, fontWeight: '800' }}>
              {(key ? copy[key] : undefined) || category.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function BlogDetailScreen() {
  const navigation = useNavigation<BlogDetailNav>();
  const route = useRoute<BlogDetailRoute>();
  const vm = useBlogDetailViewModel(route.params.blogId);
  const [language] = useState<AppLanguage>(languageStorage.getLanguage());
  const [commentText, setCommentText] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);
  const commentInputRef = useRef<TextInput>(null);
  const copy = getBlogsCopy(language);

  const article = vm.article;
  const articleBlocks = useMemo(() => (article ? textBlocksOf(article) : []), [article]);

  const openArticle = useCallback(
    (item: BlogsItem) => {
      navigation.navigate(ROUTES.BLOG_DETAIL, { blogId: item.id });
    },
    [navigation],
  );

  const handleShare = useCallback(async () => {
    if (!article?.url) return;
    await Share.share({
      title: article.title,
      message: article.url,
      url: article.url,
    });
  }, [article]);

  const submitComment = useCallback(async () => {
    const ok = await vm.submitComment(commentText);
    if (ok) setCommentText('');
  }, [commentText, vm]);

  const revealCommentInput = useCallback(() => {
    const input = commentInputRef.current;
    if (!input) return;
    scrollViewRef.current?.scrollResponderScrollNativeHandleToKeyboard(
      input,
      24,
      true,
    );
  }, []);

  if (vm.isLoading) {
    return (
      <SafeAreaView
        className="flex-1 items-center justify-center surface-base"
        edges={ROOT_SAFE_AREA_EDGES}
      >
        <ActivityIndicator color={BRAND} size="large" />
        <Text className="mt-4 text-body-secondary">{copy.loading}</Text>
      </SafeAreaView>
    );
  }

  if (!article) {
    return (
      <SafeAreaView className="flex-1 surface-base" edges={['top']}>
        <FocusAwareStatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
        <View className="surface-topbar h-16 flex-row items-center px-4">
          <TouchableOpacity className="h-10 w-10 items-center justify-center rounded-full" activeOpacity={0.8} onPress={() => navigation.goBack()}>
            <ArrowLeft size={22} color="#0F172A" />
          </TouchableOpacity>
          <Text className="ml-3 text-heading">{copy.blogsTitle}</Text>
        </View>
        <View className="flex-1 items-center justify-center px-8">
          <FileText size={56} color={APP_BRAND_COLOR} opacity={0.32} />
          <Text className="mt-5 text-center text-heading">{copy.error}</Text>
          <Text className="mt-2 text-center text-body-secondary">{vm.error}</Text>
          <TouchableOpacity className="btn-primary mt-6 min-h-[46px] rounded-xl px-6" activeOpacity={0.85} onPress={() => void vm.retry()}>
            <RotateCw size={18} color="#FFFFFF" />
            <Text className="text-title-primary text-inverse">{'Th\u1eed l\u1ea1i'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const categoryLabel = categoryLabelOf(article.categoryId, article.category, copy);
  const imageUrl = article.thumbnailUrl || FALLBACK_IMAGE;
  const commentCountLabel = `${vm.comments.length} B\u00ecnh lu\u1eadn`;

  return (
    <KeyboardSafeView style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <FocusAwareStatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={{ zIndex: 10, elevation: 5, backgroundColor: '#ffffff' }}>
        <SafeAreaFeedHeader />
      </View>
      <ScrollView
        ref={scrollViewRef}
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 28 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <ImageBackground source={{ uri: imageUrl }} style={{ height: 300, backgroundColor: '#9CA3AF' }} resizeMode="cover">
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.36)' }}>
            <View style={{ position: 'absolute', top: 12, right: 10, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 999, backgroundColor: 'rgba(17,24,39,0.78)', paddingHorizontal: 10, paddingVertical: 6 }}>
              <TouchableOpacity activeOpacity={0.82} onPress={handleShare}>
                <Share2 size={17} color="#FFFFFF" />
              </TouchableOpacity>
              <SocialButton label="f" color="#1877F2" onPress={handleShare} />
              <SocialButton label="t" color="#1DA1F2" onPress={handleShare} />
              <SocialButton label="in" color="#0A66C2" onPress={handleShare} />
              <SocialButton label="p" color="#BD081C" onPress={handleShare} />
            </View>
            <View style={{ marginTop: 'auto', paddingHorizontal: 10, paddingBottom: 18 }}>
              <View style={{ alignSelf: 'flex-start', borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.22)', paddingHorizontal: 8, paddingVertical: 5 }}>
                <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>{categoryLabel}</Text>
              </View>
              <Text style={{ marginTop: 14, color: '#FFFFFF', fontSize: 26, lineHeight: 31, fontWeight: '900' }} numberOfLines={3}>
                {article.title}
              </Text>
              <View style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center' }}>
                {article.author.avatarUrl ? (
                  <Image source={{ uri: article.author.avatarUrl }} style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: '#E5E7EB' }} />
                ) : (
                  <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: '#E5E7EB' }} />
                )}
                <View style={{ marginLeft: 9, flex: 1 }}>
                  <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '900' }}>{article.author.name}</Text>
                  <Text style={{ marginTop: 2, color: 'rgba(255,255,255,0.86)', fontSize: 12 }}>{dateLabelOf(article)}</Text>
                </View>
                <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '700' }}>{commentCountLabel}</Text>
              </View>
            </View>
          </View>
        </ImageBackground>

        <View style={{ backgroundColor: '#FFFFFF', paddingHorizontal: 18, paddingTop: 22, paddingBottom: 20 }}>
          {articleBlocks.map((block, index) => (
            <Text
              key={`${index}-${block.slice(0, 12)}`}
              style={{
                color: '#374151',
                fontSize: 15,
                lineHeight: 23,
                marginBottom: 14,
                fontWeight: index === 0 ? '800' : '400',
                fontStyle: index === 0 ? 'italic' : 'normal',
              }}
            >
              {block}
            </Text>
          ))}
        </View>

        <View style={{ marginTop: 12, backgroundColor: '#FFFFFF', paddingHorizontal: 18, paddingVertical: 18 }}>
          <SectionHeader icon={<BookOpen size={13} color="#FFFFFF" />} title={'\u0110\u1ecdc th\u00eam'} />
          {vm.relatedArticles.map(item => (
            <RelatedArticleCard key={item.id} article={item} onPress={() => openArticle(item)} />
          ))}
        </View>

        <View style={{ marginTop: 12, backgroundColor: '#FFFFFF', paddingHorizontal: 18, paddingVertical: 18 }}>
          <SectionHeader icon={<MessageCircle size={13} color="#FFFFFF" />} title={commentCountLabel} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <TextInput
              ref={commentInputRef}
              value={commentText}
              onChangeText={setCommentText}
              onFocus={revealCommentInput}
              placeholder={'Vi\u1ebft b\u00ecnh lu\u1eadn v\u00e0 nh\u1ea5n enter'}
              placeholderTextColor="#A3AAB8"
              returnKeyType="send"
              onSubmitEditing={submitComment}
              style={{ flex: 1, minHeight: 46, borderRadius: 23, borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 18, color: '#111827' }}
            />
            <TouchableOpacity activeOpacity={0.84} onPress={submitComment} disabled={vm.isSubmittingComment} style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: BRAND, alignItems: 'center', justifyContent: 'center', opacity: vm.isSubmittingComment ? 0.6 : 1 }}>
              {vm.isSubmittingComment ? <ActivityIndicator color="#FFFFFF" /> : <Send size={22} color="#FFFFFF" />}
            </TouchableOpacity>
          </View>
          {vm.comments.map(comment => (
            <View key={comment.id} style={{ marginTop: 14, flexDirection: 'row', gap: 10 }}>
              {comment.author.avatarUrl ? (
                <Image source={{ uri: comment.author.avatarUrl }} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#E5E7EB' }} />
              ) : (
                <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#E5E7EB' }} />
              )}
              <View style={{ flex: 1, borderRadius: 14, backgroundColor: '#F8FAFC', padding: 10 }}>
                <Text style={{ color: '#111827', fontSize: 13, fontWeight: '800' }}>{comment.author.name}</Text>
                <Text style={{ marginTop: 3, color: '#475569', fontSize: 13, lineHeight: 18 }}>{comment.text}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={{ marginTop: 12, backgroundColor: '#FFFFFF', paddingHorizontal: 18, paddingVertical: 18 }}>
          <SectionHeader icon={<Search size={13} color="#FFFFFF" />} title={'T\u00ecm ki\u1ebfm'} />
          <TextInput placeholder={'T\u1eeb kh\u00f3a'} placeholderTextColor="#9CA3AF" style={{ minHeight: 42, borderRadius: 21, backgroundColor: '#EEF2F7', paddingHorizontal: 14, color: '#111827' }} />
        </View>

        <View style={{ marginTop: 12, backgroundColor: '#FFFFFF', paddingHorizontal: 18, paddingVertical: 18 }}>
          <SectionHeader icon={<BookOpen size={13} color="#FFFFFF" />} title={'B\u00e0i vi\u1ebft ph\u1ed5 bi\u1ebfn'} />
          {vm.popularArticles.map(item => (
            <PopularArticleRow key={item.id} article={item} onPress={() => openArticle(item)} />
          ))}
        </View>

        <View style={{ marginTop: 12, backgroundColor: '#FFFFFF', paddingHorizontal: 18, paddingVertical: 18 }}>
          <SectionHeader icon={<Tag size={13} color="#FFFFFF" />} title={'Th\u1ec3 lo\u1ea1i'} />
          <CategoriesCloud categories={vm.categories} copy={copy} />
        </View>

        {article.url ? (
          <View style={{ marginHorizontal: 18, marginTop: 16 }}>
            <TouchableOpacity activeOpacity={0.85} onPress={() => void Linking.openURL(article.url!)} style={{ minHeight: 44, borderRadius: 12, backgroundColor: APP_COLORS.brand.soft, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: BRAND, fontSize: 14, fontWeight: '800' }}>{'Xem tr\u00ean website'}</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>
    </KeyboardSafeView>
  );
}

export default BlogDetailScreen;

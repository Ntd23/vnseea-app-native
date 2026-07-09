// Description: Renders the current user's blog articles with in-app edit navigation and owner actions.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Edit3, FileText, Plus, Trash2 } from 'lucide-react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { FeedHeader } from '../../../feed/presentation/components/FeedHeader';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';
import { createBlogsRepository } from '../../infrastructure/repositories/ApiBlogsRepository';
import type { BlogsItem } from '../../domain/types/blogs.types';

type MyArticlesNav = NativeStackNavigationProp<RootStackParamList>;

const BRAND = '#0000FF';

const categoryKeyMap: Record<string, string> = {
  vehicles: 'Ô tô và Xe cộ',
  comedy: 'Hài kịch',
  business: 'Kinh tế và Thương mại',
  education: 'Giáo dục',
  entertainment: 'Giải trí',
  movies: 'Phim & Hoạt hình',
  gaming: 'Chơi game',
  history: 'Lịch sử và sự kiện',
  lifestyle: 'Cách sống',
  nature: 'Thiên nhiên',
  news: 'Tin tức và Chính trị',
  people: 'Con người và Quốc gia',
  pets: 'Thú cưng và Động vật',
  places: 'Địa điểm và Khu vực',
  science: 'Khoa học và Công nghệ',
  sports: 'Thể thao',
  travel: 'Du lịch và Sự kiện',
  other: 'Khác',
};

function formatDate(timestamp?: number, fallback?: string) {
  if (!timestamp) return fallback || '';
  return new Date(timestamp * 1000).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function MyArticleCard({
  article,
  onEdit,
  onDelete,
}: {
  article: BlogsItem;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const categoryLabel = categoryKeyMap[article.categoryId || ''] || article.category || 'Khác';
  const dateLabel = formatDate(article.postedAt, article.postedLabel);

  return (
    <View style={{ height: 260, overflow: 'hidden', backgroundColor: '#CBD5E1', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }}>
      {article.thumbnailUrl ? (
        <Image
          source={{ uri: article.thumbnailUrl }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }}
          resizeMode="cover"
        />
      ) : (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: '#D1D5DB' }}>
          <FileText size={46} color="rgba(15,23,42,0.2)" />
        </View>
      )}

      <Svg pointerEvents="none" width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        <Defs>
          <LinearGradient id={`mineArticleGrad-${article.id}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#000000" stopOpacity={0.12} />
            <Stop offset="48%" stopColor="#000000" stopOpacity={0.32} />
            <Stop offset="100%" stopColor="#000000" stopOpacity={0.78} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#mineArticleGrad-${article.id})`} />
      </Svg>

      <View style={{ position: 'absolute', top: 14, left: 14, borderRadius: 6, backgroundColor: 'rgba(15,23,42,0.82)', paddingHorizontal: 10, paddingVertical: 6 }}>
        <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>{categoryLabel}</Text>
      </View>

      <View style={{ position: 'absolute', left: 16, right: 16, bottom: 18 }}>
        <Text numberOfLines={2} style={{ color: '#FFFFFF', fontSize: 22, lineHeight: 28, fontWeight: '900' }}>
          {article.title}
        </Text>
        <Text style={{ marginTop: 8, color: 'rgba(255,255,255,0.82)', fontSize: 13, fontWeight: '700' }}>
          {`${article.views || 0} Lượt xem  •  ${dateLabel}`}
        </Text>
        <View style={{ marginTop: 14, flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity
            activeOpacity={0.84}
            onPress={onEdit}
            style={{ minHeight: 38, borderRadius: 7, backgroundColor: '#FFFFFF', paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}
          >
            <Edit3 size={15} color="#334155" />
            <Text style={{ color: '#334155', fontSize: 13, fontWeight: '800' }}>Chỉnh sửa</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.84}
            onPress={onDelete}
            style={{ minHeight: 38, borderRadius: 7, backgroundColor: '#FFFFFF', paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}
          >
            <Trash2 size={15} color="#334155" />
            <Text style={{ color: '#334155', fontSize: 13, fontWeight: '800' }}>Xóa bỏ</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function MyArticlesScreen() {
  const navigation = useNavigation<MyArticlesNav>();
  const repository = useMemo(() => createBlogsRepository(), []);
  const [articles, setArticles] = useState<BlogsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentUserId = sessionStorage.getSession()?.userId;

  const loadArticles = useCallback(async (refreshing = false) => {
    if (!currentUserId) {
      setArticles([]);
      setError('Không tìm thấy phiên đăng nhập.');
      setIsLoading(false);
      return;
    }

    refreshing ? setIsRefreshing(true) : setIsLoading(true);
    setError(null);
    try {
      const result = await repository.getArticles({ userId: currentUserId, limit: 30 });
      setArticles(result.items);
    } catch (err) {
      setArticles([]);
      setError(err instanceof Error ? err.message : 'Không thể tải bài viết của tôi.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [currentUserId, repository]);

  useFocusEffect(
    useCallback(() => {
      void loadArticles(false);
    }, [loadArticles]),
  );

  useEffect(() => {
    void loadArticles(false);
  }, [loadArticles]);

  const openEdit = useCallback((article: BlogsItem) => {
    navigation.navigate(ROUTES.EDIT_BLOG, { blogId: article.id });
  }, [navigation]);

  const deleteArticle = useCallback(async (article: BlogsItem) => {
    try {
      await repository.deleteBlog(article.id, article.postId);
      setArticles(current => current.filter(item => String(item.id) !== String(article.id)));
      Alert.alert('Đã xóa', 'Bài viết đã được xóa thành công.');
    } catch (err) {
      Alert.alert(
        'Không thể xóa',
        err instanceof Error ? err.message : 'Không thể xóa bài viết. Vui lòng thử lại.',
      );
    }
  }, [repository]);

  const confirmDelete = useCallback((article: BlogsItem) => {
    Alert.alert(
      'Xóa bài viết',
      `Bạn có chắc chắn muốn xóa "${article.title}" không?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa bỏ',
          style: 'destructive',
          onPress: () => {
            void deleteArticle(article);
          },
        },
      ],
    );
  }, [deleteArticle]);
  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <FocusAwareStatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={{ zIndex: 10, elevation: 5, backgroundColor: '#FFFFFF' }}>
        <FeedHeader />
      </View>

      <View style={{ height: 56, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#CBD5E1', backgroundColor: '#FFFFFF' }}>
        <TouchableOpacity activeOpacity={0.84} style={{ height: '100%', justifyContent: 'center', paddingHorizontal: 8, borderBottomWidth: 3, borderBottomColor: BRAND }}>
          <Text style={{ color: '#111827', fontSize: 13, fontWeight: '800' }}>Bài viết của tôi</Text>
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.84} onPress={() => navigation.navigate(ROUTES.BLOGS)} style={{ height: '100%', justifyContent: 'center', paddingHorizontal: 8 }}>
          <Text style={{ color: '#64748B', fontSize: 13, fontWeight: '700' }}>Duyệt bài viết</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          activeOpacity={0.86}
          onPress={() => navigation.navigate(ROUTES.CREATE_BLOG)}
          style={{ marginRight: 8, minHeight: 34, borderRadius: 6, backgroundColor: BRAND, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 4, shadowColor: BRAND, shadowOpacity: 0.22, shadowRadius: 6, elevation: 2 }}
        >
          <Plus size={14} color="#FFFFFF" />
          <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '900' }}>Tạo bài</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 28 }}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void loadArticles(true)} tintColor={BRAND} colors={[BRAND]} />}
      >
        {isLoading ? (
          <View style={{ paddingVertical: 60, alignItems: 'center' }}>
            <ActivityIndicator color={BRAND} />
          </View>
        ) : error ? (
          <View style={{ padding: 24, alignItems: 'center' }}>
            <Text style={{ color: '#EF4444', fontSize: 14, fontWeight: '800', textAlign: 'center' }}>{error}</Text>
          </View>
        ) : articles.length === 0 ? (
          <View style={{ paddingHorizontal: 28, paddingVertical: 70, alignItems: 'center' }}>
            <FileText size={48} color="rgba(0,0,255,0.28)" />
            <Text style={{ marginTop: 16, color: '#111827', fontSize: 17, fontWeight: '900' }}>Chưa có bài viết</Text>
            <Text style={{ marginTop: 7, color: '#64748B', fontSize: 14, textAlign: 'center', lineHeight: 20 }}>Tạo bài viết đầu tiên để hiển thị ở đây.</Text>
          </View>
        ) : (
          articles.map(article => (
            <MyArticleCard
              key={article.id}
              article={article}
              onEdit={() => openEdit(article)}
              onDelete={() => confirmDelete(article)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

export default MyArticlesScreen;


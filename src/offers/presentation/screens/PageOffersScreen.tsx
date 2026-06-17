// Description: Page offers list screen - shows all offers for a specific page.
import React, { useCallback } from 'react';
import {
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Plus, Tag } from 'lucide-react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ROUTES } from '../../../navigation/constants/routes';
import { useOffersViewModel } from '../../application/view-models/useOfferViewModel';
import OfferCard from '../components/OfferCard';
import type { OfferWithDisplay } from '../../domain/types/offer.types';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';

type PageOffersRouteParams = {
  pageId: number;
  pageName?: string;
  isOwner?: boolean;
};

export default function PageOffersScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute<RouteProp<{ params: PageOffersRouteParams }, 'params'>>();
  const { pageId, pageName = 'Page', isOwner = false } = route.params || {
    pageId: 0,
    pageName: 'Page',
    isOwner: false,
  };

  const { offers, isLoading, error } = useOffersViewModel(pageId);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleCreateOffer = useCallback(() => {
    navigation.navigate(ROUTES.CREATE_OFFER, { pageId, pageName });
  }, [navigation, pageId, pageName]);

  const handleOfferPress = useCallback(
    (offer: OfferWithDisplay) => {
      console.log('[PageOffers] offer pressed:', offer.id);
      // TODO: navigate to offer detail
    },
    [],
  );

  const renderHeader = () => (
    <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}>
      <Text style={styles.summaryText}>
        {offers.length} ưu đãi
        {offers.filter(o => !o.isExpired).length !== offers.length &&
          ` (${offers.filter(o => !o.isExpired).length} còn hiệu lực)`}
      </Text>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconBg}>
        <Tag size={48} color="#94A3B8" />
      </View>
      <Text style={styles.emptyTitle}>Chưa có ưu đãi nào</Text>
      <Text style={styles.emptySubtitle}>
        {isOwner
          ? 'Bấm nút bên dưới để tạo ưu đãi đầu tiên'
          : 'Page này chưa đăng ưu đãi nào'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 surface-base" edges={['top']}>
      <FocusAwareStatusBar barStyle="dark-content" />

      {/* Top bar */}
      <View className="surface-topbar flex-row items-center justify-between px-4 py-3">
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ChevronLeft size={24} color="#1A1C1E" />
        </TouchableOpacity>
        <View className="flex-1 items-center">
          <Text className="text-[15px] font-semibold text-[#1A1C1E]">Ưu đãi</Text>
          <Text className="text-[11px] text-[#64748B]" numberOfLines={1}>
            {pageName}
          </Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <FlatList
        data={offers}
        keyExtractor={item => String(item.id)}
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: 16 }}>
            <OfferCard offer={item} onPress={() => handleOfferPress(item)} />
          </View>
        )}
        ListHeaderComponent={offers.length > 0 ? renderHeader : null}
        ListEmptyComponent={!isLoading ? renderEmpty : null}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      />

      {/* Create offer FAB */}
      {isOwner && (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={handleCreateOffer}
          style={styles.fab}
        >
          <Plus size={22} color="#FFFFFF" strokeWidth={2.5} />
          <Text style={styles.fabText}>Tạo ưu đãi</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = {
  summaryText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500' as const,
  },
  errorBanner: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 10,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '500' as const,
    textAlign: 'center' as const,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: 32,
    paddingTop: 60,
  },
  emptyIconBg: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#F1F4FB',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#1A1C1E',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center' as const,
  },
  fab: {
    position: 'absolute' as const,
    bottom: 24,
    right: 16,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    backgroundColor: '#0000FF',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 28,
    shadowColor: '#0000FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700' as const,
  },
};

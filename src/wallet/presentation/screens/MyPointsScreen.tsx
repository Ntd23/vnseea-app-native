// Description: Renders the real member points balance, exchange action, and wallet-backed point history.

import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  ArrowLeftRight,
  Check,
  Coins,
  RefreshCw,
  Star,
  Wallet,
  X,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { formatCurrency } from '../../../shared-kernel/application/utils/formatCurrency';
import { useMyPointsViewModel } from '../../application/view-models/useMyPointsViewModel';
import type { PointHistoryItem } from '../../domain/types/wallet.types';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';

function formatNumber(value: number) {
  return Math.round(value).toLocaleString('vi-VN');
}

function StatCard({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: string;
  tone: 'blue' | 'green' | 'orange';
  icon: React.ReactNode;
}) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, styles[`${tone}Icon`]]}>{icon}</View>
      <View style={styles.statCopy}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={styles.statValue}>{value}</Text>
      </View>
    </View>
  );
}

function HistoryRow({ item }: { item: PointHistoryItem }) {
  const positive = item.points >= 0;
  return (
    <View style={styles.historyRow}>
      <View style={styles.historyIcon}>
        <Coins size={17} color="#0000ff" />
      </View>
      <View style={styles.historyCopy}>
        <Text style={styles.historyTitle}>{item.title}</Text>
        <Text style={styles.historyMeta}>{item.meta}</Text>
      </View>
      <Text style={[styles.historyPoints, !positive && styles.negativePoints]}>
        {positive ? '+' : '-'}
        {formatNumber(Math.abs(item.points))}
      </Text>
    </View>
  );
}

function MyPointsScreen() {
  const navigation = useNavigation();
  const {
    data,
    exchangePoints,
    setExchangePoints,
    canExchange,
    isLoading,
    isSubmitting,
    error,
    exchangeError,
    successMessage,
    reload,
    submitExchange,
  } = useMyPointsViewModel();
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    if (successMessage) {
      Alert.alert('Thành công', successMessage);
    }
  }, [successMessage]);

  const walletBalanceText = data
    ? formatCurrency(
        data.walletBalance,
        data.walletCurrency,
        data.walletCurrencySymbol,
      )
    : '0 đ';

  const handleSubmitExchange = async () => {
    const ok = await submitExchange();
    if (ok) {
      setModalVisible(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <FocusAwareStatusBar barStyle="dark-content" backgroundColor="#f3f6fb" />

      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <ArrowLeft size={24} color="#0000ff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Điểm của tôi</Text>
        <View style={{ width: 44 }} />
      </View>

      {isLoading && !data ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="small" color="#0000ff" />
          <Text style={styles.stateText}>Đang tải điểm thành viên...</Text>
        </View>
      ) : null}

      {error && !data ? (
        <TouchableOpacity
          activeOpacity={0.82}
          onPress={reload}
          style={styles.centerState}
        >
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.retryText}>Chạm để thử lại</Text>
        </TouchableOpacity>
      ) : null}

      {data ? (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentInner}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <View style={styles.heroMain}>
              <View style={styles.heroIcon}>
                <Star size={24} color="#ffffff" fill="#ffffff" />
              </View>
              <View style={styles.heroCopy}>
                <Text style={styles.eyebrow}>ĐIỂM THÀNH VIÊN</Text>
                <Text style={styles.heroTitle}>
                  {formatNumber(data.pointsBalance)} điểm
                </Text>
                <Text style={styles.heroDescription}>
                  Đổi điểm tích lũy sang số dư ví VNSEEA để tiếp tục sử dụng
                  trong hệ thống.
                </Text>
              </View>
            </View>
            <TouchableOpacity
              activeOpacity={0.86}
              disabled={!canExchange}
              onPress={() => setModalVisible(true)}
              style={[styles.exchangeButton, !canExchange && styles.disabled]}
            >
              <ArrowLeftRight size={16} color="#ffffff" />
              <Text style={styles.exchangeButtonText}>Đổi điểm</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.statsRow}>
            <StatCard
              label="Điểm khả dụng"
              value={formatNumber(data.pointsBalance)}
              tone="blue"
              icon={<Star size={20} color="#0000ff" />}
            />
            <StatCard
              label="Số dư ví"
              value={walletBalanceText}
              tone="green"
              icon={<Wallet size={20} color="#16a34a" />}
            />
            <StatCard
              label="Tỉ lệ quy đổi"
              value={data.exchangeRateLabel}
              tone="orange"
              icon={<ArrowLeftRight size={20} color="#f59e0b" />}
            />
          </View>

          <View style={styles.historyCard}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Lịch sử điểm</Text>
                <Text style={styles.sectionDescription}>
                  Các lần đổi điểm sang ví gần đây.
                </Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.78}
                onPress={reload}
                style={styles.refreshButton}
              >
                <RefreshCw size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            {data.history.length === 0 ? (
              <View style={styles.emptyBox}>
                <Coins size={24} color="#94a3b8" />
                <Text style={styles.emptyText}>Chưa có lịch sử điểm.</Text>
              </View>
            ) : (
              <View style={styles.historyList}>
                {data.history.map(item => (
                  <HistoryRow key={item.id} item={item} />
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      ) : null}

      {data ? (
        <Modal
          transparent
          visible={modalVisible}
          animationType="fade"
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Đổi điểm sang ví</Text>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setModalVisible(false)}
                  style={styles.modalClose}
                >
                  <X size={20} color="#64748b" />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalLabel}>Số điểm muốn đổi</Text>
              <TextInput
                style={styles.modalInput}
                keyboardType="number-pad"
                value={exchangePoints}
                onChangeText={setExchangePoints}
                placeholder={String(data.exchangeStepPoints)}
                placeholderTextColor="#94a3b8"
              />
              <Text style={styles.modalHint}>
                Có thể đổi tối đa {formatNumber(data.maxExchangePoints)} điểm,
                theo bội số {formatNumber(data.exchangeStepPoints)}.
              </Text>

              {exchangeError ? (
                <Text style={styles.modalError}>{exchangeError}</Text>
              ) : null}

              <TouchableOpacity
                activeOpacity={0.88}
                disabled={!canExchange || isSubmitting}
                onPress={handleSubmitExchange}
                style={[
                  styles.modalSubmit,
                  (!canExchange || isSubmitting) && styles.disabled,
                ]}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Check size={18} color="#ffffff" />
                    <Text style={styles.modalSubmitText}>Xác nhận đổi</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f3f6fb',
  },
  header: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#dbe3ef',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
  },
  content: {
    flex: 1,
  },
  contentInner: {
    padding: 16,
    paddingBottom: 32,
  },
  centerState: {
    margin: 16,
    minHeight: 140,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: '#ffffff',
    padding: 18,
  },
  stateText: {
    marginTop: 10,
    color: '#64748b',
    fontWeight: '700',
  },
  errorText: {
    color: '#ff3333',
    fontWeight: '800',
    textAlign: 'center',
  },
  retryText: {
    marginTop: 8,
    color: '#0000ff',
    fontWeight: '800',
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    padding: 16,
    shadowColor: '#0f172a',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  heroMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0000ff',
  },
  heroCopy: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
    color: '#64748b',
  },
  heroTitle: {
    marginTop: 2,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '900',
    color: '#0f172a',
  },
  heroDescription: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
    color: '#64748b',
  },
  exchangeButton: {
    minHeight: 44,
    minWidth: 104,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 12,
    backgroundColor: '#0000ff',
    paddingHorizontal: 13,
  },
  exchangeButtonText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 13,
  },
  disabled: {
    opacity: 0.55,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
  },
  statCard: {
    flex: 1,
    minHeight: 94,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    padding: 13,
    justifyContent: 'center',
  },
  statIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  blueIcon: {
    backgroundColor: '#eef0ff',
  },
  greenIcon: {
    backgroundColor: '#dcfce7',
  },
  orangeIcon: {
    backgroundColor: '#fff7ed',
  },
  statCopy: {
    minWidth: 0,
  },
  statLabel: {
    fontSize: 11,
    lineHeight: 15,
    color: '#64748b',
    fontWeight: '800',
  },
  statValue: {
    marginTop: 3,
    fontSize: 15,
    lineHeight: 20,
    color: '#0f172a',
    fontWeight: '900',
  },
  historyCard: {
    marginTop: 16,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
  },
  sectionDescription: {
    marginTop: 3,
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  historyList: {
    gap: 10,
  },
  historyRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  historyIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef0ff',
    marginRight: 10,
  },
  historyCopy: {
    flex: 1,
    minWidth: 0,
  },
  historyTitle: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '900',
  },
  historyMeta: {
    marginTop: 2,
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
  },
  historyPoints: {
    color: '#16a34a',
    fontWeight: '900',
    fontSize: 14,
    marginLeft: 10,
  },
  negativePoints: {
    color: '#dc2626',
  },
  emptyBox: {
    minHeight: 110,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#dbe3ef',
  },
  emptyText: {
    marginTop: 8,
    color: '#64748b',
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(15,23,42,0.45)',
    padding: 20,
  },
  modalCard: {
    borderRadius: 18,
    backgroundColor: '#ffffff',
    padding: 18,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
  },
  modalClose: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
  },
  modalInput: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 14,
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '800',
  },
  modalHint: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 17,
    color: '#64748b',
    fontWeight: '600',
  },
  modalError: {
    marginTop: 10,
    color: '#dc2626',
    fontWeight: '800',
  },
  modalSubmit: {
    marginTop: 16,
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: '#0000ff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  modalSubmitText: {
    color: '#ffffff',
    fontWeight: '900',
  },
});

export default MyPointsScreen;

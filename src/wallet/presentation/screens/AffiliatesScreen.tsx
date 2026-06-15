// Description: Renders the referral rewards screen from real affiliate API data.

import React from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  Info,
  ShieldCheck,
  UserRoundCheck,
  UsersRound,
  WalletCards,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../navigation/types';
import { useAffiliatesViewModel } from '../../application/view-models/useAffiliatesViewModel';

type AffiliatesNav = NativeStackNavigationProp<RootStackParamList>;

function StatCard({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: string | number;
  tone: 'green' | 'blue' | 'orange';
  icon: React.ReactNode;
}) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, styles[`${tone}Icon`]]}>{icon}</View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function RequirementChip({
  label,
  completed,
}: {
  label: string;
  completed: boolean;
}) {
  return (
    <View style={styles.requirementChip}>
      {completed ? (
        <CheckCircle2 size={16} color="#16a34a" />
      ) : (
        <Info size={16} color="#94a3b8" />
      )}
      <Text style={styles.requirementText}>{label}</Text>
    </View>
  );
}

function AffiliatesScreen() {
  const navigation = useNavigation<AffiliatesNav>();
  const {
    referralLink,
    earningPerUserText,
    qualifiedUsers,
    availableRewardText,
    requirements,
    referredUsers,
    isLoading,
    error,
    reload,
    handleCopy,
  } = useAffiliatesViewModel();

  const hasData = Boolean(referralLink);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#f3f6fb" />

      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.backButton}
        >
          <ArrowLeft size={24} color="#0000ff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Giới thiệu và nhận thưởng</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentInner}
        showsVerticalScrollIndicator={false}
      >
        {isLoading && !hasData ? (
          <View style={styles.stateCard}>
            <ActivityIndicator size="small" color="#0000ff" />
            <Text style={styles.stateText}>Đang tải dữ liệu giới thiệu...</Text>
          </View>
        ) : null}

        {error && !hasData ? (
          <TouchableOpacity
            activeOpacity={0.82}
            onPress={reload}
            style={styles.stateCard}
          >
            <Text style={styles.errorText}>{error}</Text>
            <Text style={styles.retryText}>Chạm để thử lại</Text>
          </TouchableOpacity>
        ) : null}

        {hasData ? (
          <>
            {error ? (
              <TouchableOpacity
                activeOpacity={0.82}
                onPress={reload}
                style={styles.inlineError}
              >
                <Text style={styles.errorText}>{error}</Text>
              </TouchableOpacity>
            ) : null}

            <View style={styles.statsRow}>
              <StatCard
                label="Tiền thưởng mỗi người đủ điều kiện"
                value={earningPerUserText}
                tone="green"
                icon={<UsersRound size={20} color="#16a34a" />}
              />
              <StatCard
                label="Người đủ điều kiện"
                value={qualifiedUsers}
                tone="blue"
                icon={<ShieldCheck size={20} color="#0000ff" />}
              />
              <StatCard
                label="Thưởng có thể nhận"
                value={availableRewardText}
                tone="orange"
                icon={<WalletCards size={20} color="#f59e0b" />}
              />
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionLabel}>LINK GIỚI THIỆU</Text>
              <View style={styles.linkRow}>
                <View style={styles.linkBox}>
                  <Text style={styles.linkText} numberOfLines={1}>
                    {referralLink}
                  </Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.86}
                  onPress={handleCopy}
                  style={styles.copyButton}
                >
                  <Copy size={18} color="#ffffff" />
                  <Text style={styles.copyButtonText}>Sao chép</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.title}>Điều kiện nhận tiền của bạn</Text>
              <Text style={styles.subtitle}>
                Tài khoản của bạn phải đầy đủ thông tin và đã xác minh trước
                khi nhận thưởng.
              </Text>
              <View style={styles.requirementsRow}>
                {requirements.map(requirement => (
                  <RequirementChip
                    key={requirement.id}
                    label={requirement.label}
                    completed={requirement.completed}
                  />
                ))}
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>Người đã giới thiệu</Text>
                  <Text style={styles.subtitle}>
                    Người được giới thiệu chỉ đủ điều kiện khi cập nhật đầy đủ
                    thông tin và xác minh tài khoản thành công.
                  </Text>
                </View>
                <View style={styles.infoButton}>
                  <Info size={16} color="#64748b" />
                </View>
              </View>

              {referredUsers.length === 0 ? (
                <View style={styles.emptyBox}>
                  <UserRoundCheck size={24} color="#94a3b8" />
                  <Text style={styles.emptyText}>
                    Chưa có người được giới thiệu.
                  </Text>
                </View>
              ) : (
                referredUsers.map(user => (
                  <View key={user.id} style={styles.referredRow}>
                    {user.avatar ? (
                      <Image source={{ uri: user.avatar }} style={styles.avatar} />
                    ) : (
                      <View style={styles.avatarFallback}>
                        <Text style={styles.avatarText}>
                          {(user.name || user.username || '?').slice(0, 1)}
                        </Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.referredName}>{user.name}</Text>
                      <Text style={styles.referredUsername}>
                        @{user.username}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.referredStatus,
                        user.qualified && styles.referredStatusActive,
                      ]}
                    >
                      {user.qualified ? 'Đủ điều kiện' : 'Đang chờ'}
                    </Text>
                  </View>
                ))
              )}
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f3f6fb',
  },
  header: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    backgroundColor: '#f8fafc',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#dbe3ef',
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: '#ffffff',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '900',
    color: '#111827',
  },
  content: {
    flex: 1,
  },
  contentInner: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 28,
    gap: 16,
  },
  stateCard: {
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    padding: 16,
  },
  stateText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '700',
  },
  errorText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '800',
  },
  retryText: {
    fontSize: 13,
    color: '#0000ff',
    fontWeight: '900',
  },
  inlineError: {
    borderRadius: 12,
    backgroundColor: '#fee2e2',
    padding: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minHeight: 118,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    padding: 14,
    justifyContent: 'space-between',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },
  statIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  greenIcon: {
    backgroundColor: '#dcfce7',
  },
  blueIcon: {
    backgroundColor: '#eef2ff',
  },
  orangeIcon: {
    backgroundColor: '#fff7ed',
  },
  statLabel: {
    minHeight: 34,
    fontSize: 12,
    lineHeight: 17,
    color: '#64748b',
    fontWeight: '800',
  },
  statValue: {
    fontSize: 18,
    color: '#0f172a',
    fontWeight: '900',
  },
  card: {
    borderRadius: 16,
    backgroundColor: '#ffffff',
    padding: 16,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },
  sectionLabel: {
    marginBottom: 10,
    fontSize: 12,
    letterSpacing: 0.4,
    color: '#64748b',
    fontWeight: '900',
  },
  linkRow: {
    flexDirection: 'row',
    gap: 10,
  },
  linkBox: {
    flex: 1,
    minHeight: 46,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#dbe3ef',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
  },
  linkText: {
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '800',
  },
  copyButton: {
    minWidth: 116,
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    backgroundColor: '#0000ff',
    paddingHorizontal: 14,
  },
  copyButtonText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '900',
  },
  title: {
    fontSize: 17,
    color: '#0f172a',
    fontWeight: '900',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 20,
    color: '#64748b',
    fontWeight: '600',
  },
  requirementsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  requirementChip: {
    flex: 1,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 10,
  },
  requirementText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 15,
    color: '#1f2937',
    fontWeight: '900',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  infoButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#dbe3ef',
    borderRadius: 14,
  },
  emptyBox: {
    minHeight: 112,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#cbd5e1',
    borderRadius: 14,
    backgroundColor: '#fbfdff',
  },
  emptyText: {
    marginTop: 10,
    fontSize: 13,
    color: '#64748b',
    fontWeight: '700',
  },
  referredRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 14,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eef2ff',
  },
  avatarFallback: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: '#eef2ff',
  },
  avatarText: {
    color: '#0000ff',
    fontWeight: '900',
  },
  referredName: {
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '900',
  },
  referredUsername: {
    marginTop: 2,
    fontSize: 12,
    color: '#64748b',
  },
  referredStatus: {
    fontSize: 12,
    color: '#ca8a04',
    fontWeight: '900',
  },
  referredStatusActive: {
    color: '#16a34a',
  },
});

export default AffiliatesScreen;

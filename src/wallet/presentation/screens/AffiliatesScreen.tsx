import React from 'react';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Copy, Share2 } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../navigation/AppNavigator';
import { useAffiliatesViewModel } from '../../application/view-models/useAffiliatesViewModel';

type AffiliatesNav = NativeStackNavigationProp<RootStackParamList>;

function AffiliatesScreen() {
  const navigation = useNavigation<AffiliatesNav>();
  const { referralLink, earningPerUser, handleCopy, handleShare } =
    useAffiliatesViewModel();

  return (
    <SafeAreaView className="flex-1 surface-base" edges={['top']}>
      <StatusBar barStyle="light-content" />

      {/* ── Top App Bar ── */}
      <View className="surface-brand flex-row items-center px-4 py-3">
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <ArrowLeft size={24} color="#ffffff" />
        </TouchableOpacity>
        {/* Centered title with matching right spacer */}
        <Text className="flex-1 text-center text-heading text-inverse">
          Tiếp thị liên kết
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-16 pt-8"
        showsVerticalScrollIndicator={false}>

        {/* ── Headline ── */}
        <Text style={s.headline}>
          Kiếm tới {earningPerUser} cho mỗi người dùng bạn giới thiệu!
        </Text>

        {/* ── Referral Link Card ── */}
        <View style={s.card}>
          <Text style={s.cardLabel}>Liên kết giới thiệu của bạn</Text>

          {/* Link row */}
          <View style={s.linkRow}>
            <Text style={s.linkText} numberOfLines={1} ellipsizeMode="tail">
              {referralLink}
            </Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleCopy}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{ marginLeft: 12 }}>
              <Copy size={20} color="#0000ff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Share Button ── */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={handleShare}
          style={s.shareBtn}>
          <Share2 size={18} color="#ffffff" />
          <Text style={s.shareBtnText}>Chia sẻ</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  headline: {
    fontFamily: 'Be Vietnam Pro',
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 36,
    color: '#0000ff',
    textAlign: 'center',
    marginBottom: 32,
    letterSpacing: -0.5,
  },
  card: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(0,0,255,0.08)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    // shadow
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#454558',
    textAlign: 'center',
    marginBottom: 16,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff4ff',
    borderWidth: 1,
    borderColor: 'rgba(0,0,255,0.10)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  linkText: {
    flex: 1,
    fontSize: 14,
    color: '#0b1c30',
    lineHeight: 20,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0000ff',
    borderRadius: 9999,
    paddingVertical: 16,
    paddingHorizontal: 24,
    shadowColor: '#0000ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 6,
  },
  shareBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
});

export default AffiliatesScreen;

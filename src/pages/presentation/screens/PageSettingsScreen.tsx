// Description: Renders the Page Settings surface. Hosts two cards:
//
//   1. Basic info — read-only summary of the page + a shortcut into
//      the existing Edit Page flow (so we don't duplicate the long
//      form).
//   2. CTA and Public Signals — five CTA targets (None / Message /
//      Follow / View catalog / Book now / Call now) with conditional
//      URL or Phone input, and five boolean public-signal toggles.
//
// All UI strings come from `usePagesCopy()` so the screen honours
// the active language without any per-component wiring.

import { APP_BRAND_COLOR } from '../../../shared-kernel/presentation/theme/appColors';
import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Phone,
  Save,
  X,
} from 'lucide-react-native';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import { showSnackbar as showToast } from '../../../shared-kernel/presentation/components/Snackbar';
import { ROOT_SAFE_AREA_EDGES } from '../../../shared-kernel/presentation/utils/safeAreaEdges';
import { usePageSettingsViewModel } from '../../application/view-models/usePageSettingsViewModel';
import { usePagesCopy } from '../../application/i18n/pagesCopy';
import { ctaRequiresPhone, ctaRequiresUrl } from '../../application/mappers/pageSettingsMapper';
import type { PageCtaTarget } from '../../domain/types/pageSettings.types';
import { FeedHeader } from '../../../feed/presentation/components/FeedHeader';

type PageSettingsProps = NativeStackScreenProps<
  RootStackParamList,
  typeof ROUTES.PAGE_SETTINGS
>;

interface CtaOption {
  target: PageCtaTarget;
  labelKey: keyof Record<string, string>;
  descKey: keyof Record<string, string>;
  icon: React.ReactNode;
  tone: 'red' | 'blue' | 'green' | 'amber' | 'purple' | 'slate';
}

const CTA_TONE_STYLES: Record<
  CtaOption['tone'],
  { bg: string; fg: string; border: string }
> = {
  red: { bg: 'bg-red-50', fg: '#DC2626', border: 'border-red-100' },
  blue: { bg: 'bg-blue-50', fg: '#2563EB', border: 'border-blue-100' },
  green: { bg: 'bg-emerald-50', fg: '#059669', border: 'border-emerald-100' },
  amber: { bg: 'bg-amber-50', fg: '#B45309', border: 'border-amber-100' },
  purple: { bg: 'bg-purple-50', fg: '#7C3AED', border: 'border-purple-100' },
  slate: { bg: 'bg-slate-50', fg: '#475569', border: 'border-slate-200' },
};

function PageSettingsScreen({ navigation, route }: PageSettingsProps) {
  const { pageId, page } = route.params;
  const copy = usePagesCopy();
  const insets = useSafeAreaInsets();

  const vm = usePageSettingsViewModel(pageId);
  const canSave =
    vm.isDirty && !vm.isSaving && !vm.urlError && !vm.phoneError;

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const handleEditProfile = () => {
    if (!page) return;
    navigation.navigate(ROUTES.EDIT_PAGE, { page });
  };

  const handleSave = async () => {
    await vm.save();
    if (!vm.error) {
      showToast({ message: copy.toastSaved, type: 'success' });
    }
  };

  const ctaOptions: CtaOption[] = useMemo(
    () => [
      {
        target: 'none',
        labelKey: 'ctaNone',
        descKey: 'ctaNoneDesc',
        icon: <X size={18} color={CTA_TONE_STYLES.slate.fg} />,
        tone: 'slate',
      },
      {
        target: 'message',
        labelKey: 'ctaMessage',
        descKey: 'ctaMessageDesc',
        icon: <ArrowLeft size={18} color={CTA_TONE_STYLES.blue.fg} />,
        tone: 'blue',
      },
      {
        target: 'follow',
        labelKey: 'ctaFollow',
        descKey: 'ctaFollowDesc',
        icon: <Check size={18} color={CTA_TONE_STYLES.green.fg} />,
        tone: 'green',
      },
      {
        target: 'catalog',
        labelKey: 'ctaViewCatalog',
        descKey: 'ctaViewCatalogDesc',
        icon: <ChevronRight size={18} color={CTA_TONE_STYLES.purple.fg} />,
        tone: 'purple',
      },
      {
        target: 'book',
        labelKey: 'ctaBookNow',
        descKey: 'ctaBookNowDesc',
        icon: <Check size={18} color={CTA_TONE_STYLES.amber.fg} />,
        tone: 'amber',
      },
      {
        target: 'call',
        labelKey: 'ctaCallNow',
        descKey: 'ctaCallNowDesc',
        icon: <Phone size={18} color={CTA_TONE_STYLES.red.fg} />,
        tone: 'red',
      },
    ],
    [],
  );

  const showUrlInput = ctaRequiresUrl(vm.draft.cta.ctaTarget);
  const showPhoneInput = ctaRequiresPhone(vm.draft.cta.ctaTarget);

  return (
    <SafeAreaView
      edges={ROOT_SAFE_AREA_EDGES}
      className="flex-1 bg-[#f1f4fb]"
    >
      <FeedHeader />
      {/* Standard sticky AppBar */}
      <View
        style={{
          height: 64,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          backgroundColor: '#ffffff',
          borderBottomWidth: 1,
          borderBottomColor: '#f1f5f9',
        }}
      >
        <TouchableOpacity
          onPress={handleBack}
          activeOpacity={0.7}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: '#ffffff',
            borderWidth: 1,
            borderColor: '#f1f5f9',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.04,
            shadowRadius: 4,
            elevation: 2,
          }}
          accessibilityLabel={copy.settingsBack}
        >
          <ArrowLeft size={22} color="#0F172A" />
        </TouchableOpacity>
        <Text
          style={{
            fontSize: 18,
            fontWeight: '800',
            color: '#0F172A',
            flex: 1,
          }}
          numberOfLines={1}
        >
          {copy.settingsTitle}
        </Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{
            padding: 16,
            paddingBottom: insets.bottom + 96,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Card 1: Basic info ──────────────────────────── */}
          <View className="mb-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <Text className="mb-3 text-[15px] font-bold text-slate-900">
              {copy.sectionBasicInfo}
            </Text>

            <View className="mb-2 flex-row items-center justify-between py-2">
              <Text className="text-[14px] text-slate-500">
                {copy.settingsPageName}
              </Text>
              <Text
                className="text-[14px] font-semibold text-slate-900"
                numberOfLines={1}
                style={{ maxWidth: 220 }}
              >
                {page?.pageTitle || page?.pageName || '—'}
              </Text>
            </View>

            <View className="mb-2 flex-row items-center justify-between border-t border-slate-100 py-2">
              <Text className="text-[14px] text-slate-500">
                {copy.settingsPageCategory}
              </Text>
              <Text
                className="text-[14px] font-semibold text-slate-900"
                numberOfLines={1}
                style={{ maxWidth: 220 }}
              >
                {page?.pageCategory || copy.settingsPageCategoryFallback}
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleEditProfile}
              className="mt-3 flex-row items-center justify-between rounded-xl bg-brand-subtle px-4 py-3"
            >
              <Text className="text-[14px] font-semibold text-brand">
                {copy.settingsEditProfile}
              </Text>
              <ChevronRight size={18} color={APP_BRAND_COLOR} />
            </TouchableOpacity>
          </View>

          {/* ── Card 2: CTA and Public Signals ──────────────── */}
          <View className="mb-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            {/* CTA section */}
            <View className="mb-4">
              <Text className="text-[15px] font-bold text-slate-900">
                {copy.sectionCta}
              </Text>
              <Text className="mt-1 text-[13px] text-slate-500">
                {copy.sectionCtaDescription}
              </Text>
            </View>

            {ctaOptions.map(option => {
              const tone = CTA_TONE_STYLES[option.tone];
              const isSelected = vm.draft.cta.ctaTarget === option.target;
              return (
                <Pressable
                  key={option.target}
                  onPress={() => vm.setCtaTarget(option.target)}
                  className={`mb-2 flex-row items-center rounded-xl border px-3 py-3 ${
                    isSelected
                      ? `${tone.bg} ${tone.border}`
                      : 'border-slate-100 bg-white'
                  }`}
                  android_ripple={{ color: 'rgba(0,0,0,0.05)' }}
                >
                  <View
                    className="mr-3 h-9 w-9 items-center justify-center rounded-full"
                    style={{ backgroundColor: tone.bg }}
                  >
                    {option.icon}
                  </View>
                  <View className="flex-1">
                    <Text className="text-[15px] font-semibold text-slate-900">
                      {copy[option.labelKey]}
                    </Text>
                    <Text className="mt-0.5 text-[12px] text-slate-500">
                      {copy[option.descKey]}
                    </Text>
                  </View>
                  <View
                    className={`h-5 w-5 items-center justify-center rounded-full border ${
                      isSelected
                        ? 'border-brand bg-brand'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {isSelected ? <Check size={12} color="#FFFFFF" /> : null}
                  </View>
                </Pressable>
              );
            })}

            {/* URL input (for catalog / book) */}
            {showUrlInput ? (
              <View className="mt-3">
                <Text className="mb-1 text-[13px] font-semibold text-slate-700">
                  {copy.ctaUrlLabel}
                </Text>
                <TextInput
                  value={vm.draft.cta.ctaUrl}
                  onChangeText={vm.setCtaUrl}
                  placeholder={copy.ctaUrlPlaceholder}
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  className={`rounded-xl border px-3 py-3 text-[14px] text-slate-900 ${
                    vm.urlError
                      ? 'border-red-300 bg-red-50'
                      : 'border-slate-200 bg-white'
                  }`}
                />
                {vm.urlError ? (
                  <Text className="mt-1 text-[12px] text-red-500">
                    {copy[vm.urlError]}
                  </Text>
                ) : (
                  <Text className="mt-1 text-[12px] text-slate-400">
                    {copy.ctaUrlHint}
                  </Text>
                )}
              </View>
            ) : null}

            {/* Phone input (for call) */}
            {showPhoneInput ? (
              <View className="mt-3">
                <Text className="mb-1 text-[13px] font-semibold text-slate-700">
                  {copy.ctaPhoneLabel}
                </Text>
                <TextInput
                  value={vm.draft.cta.ctaPhone}
                  onChangeText={vm.setCtaPhone}
                  placeholder={copy.ctaPhonePlaceholder}
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                  className={`rounded-xl border px-3 py-3 text-[14px] text-slate-900 ${
                    vm.phoneError
                      ? 'border-red-300 bg-red-50'
                      : 'border-slate-200 bg-white'
                  }`}
                />
                {vm.phoneError ? (
                  <Text className="mt-1 text-[12px] text-red-500">
                    {copy[vm.phoneError]}
                  </Text>
                ) : null}
              </View>
            ) : null}

            {/* Divider */}
            <View className="my-4 h-px bg-slate-100" />

            {/* Public Signals section */}
            <View className="mb-2">
              <Text className="text-[15px] font-bold text-slate-900">
                {copy.sectionPublicSignals}
              </Text>
              <Text className="mt-1 text-[13px] text-slate-500">
                {copy.sectionPublicSignalsDescription}
              </Text>
            </View>

            <SignalRow
              label={copy.signalMessageButton}
              description={copy.signalMessageButtonDesc}
              value={vm.draft.signals.messageButtonEnabled}
              onValueChange={v => vm.toggleSignal('messageButtonEnabled', v)}
            />
            <SignalRow
              label={copy.signalFollowerCount}
              description={copy.signalFollowerCountDesc}
              value={vm.draft.signals.showFollowerCount}
              onValueChange={v => vm.toggleSignal('showFollowerCount', v)}
            />
            <SignalRow
              label={copy.signalLikeCount}
              description={copy.signalLikeCountDesc}
              value={vm.draft.signals.showLikeCount}
              onValueChange={v => vm.toggleSignal('showLikeCount', v)}
            />
            <SignalRow
              label={copy.signalPublicWebsite}
              description={copy.signalPublicWebsiteDesc}
              value={vm.draft.signals.showPublicWebsite}
              onValueChange={v => vm.toggleSignal('showPublicWebsite', v)}
            />
            <SignalRow
              label={copy.signalSuggestFanpages}
              description={copy.signalSuggestFanpagesDesc}
              value={vm.draft.signals.suggestRelatedFanpages}
              onValueChange={v => vm.toggleSignal('suggestRelatedFanpages', v)}
              isLast
            />
          </View>

          {/* ── Action buttons ─────────────────────────────── */}
          {vm.isDirty ? (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={vm.reset}
              className="mb-2 h-11 items-center justify-center rounded-xl border border-slate-200 bg-white"
            >
              <Text className="text-[14px] font-semibold text-slate-600">
                {copy.settingsReset}
              </Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            activeOpacity={0.86}
            disabled={!canSave}
            onPress={handleSave}
            className={`h-12 flex-row items-center justify-center rounded-xl ${
              canSave ? 'bg-brand' : 'bg-brand/40'
            }`}
          >
            {vm.isSaving ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Save size={17} color="#ffffff" />
            )}
            <Text className="ml-2 text-[15px] font-bold text-white">
              {copy.settingsSave}
            </Text>
          </TouchableOpacity>

          {vm.error ? (
            <Text className="mt-2 text-center text-[13px] text-red-500">
              {copy.saveError}
            </Text>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

interface SignalRowProps {
  label: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  isLast?: boolean;
}

function SignalRow({
  label,
  description,
  value,
  onValueChange,
  isLast,
}: SignalRowProps) {
  return (
    <View
      className={`flex-row items-center py-3 ${
        isLast ? '' : 'border-b border-slate-100'
      }`}
    >
      <View className="flex-1 pr-3">
        <Text className="text-[15px] font-semibold text-slate-900">
          {label}
        </Text>
        <Text className="mt-0.5 text-[12px] text-slate-500">
          {description}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#e2e8f0', true: APP_BRAND_COLOR }}
        thumbColor="#ffffff"
        ios_backgroundColor="#e2e8f0"
      />
    </View>
  );
}

export default PageSettingsScreen;

// Description: Action sheet that pops up from the 3-dot button on
// the Page Detail header. Replaces the old `Alert.alert` report
// dialog with a proper bottom sheet offering two actions:
//
//   1. Report page — calls back to the screen which in turn calls
//      the existing `vm.reportPage` (no API surface change).
//   2. Page settings — visible only to the owner / admin, navigates
//      to the new PageSettingsScreen.
//
// Visual language mirrors PostMenuActionSheet (Modal fade + bottom
// rounded sheet) so the two menus feel like siblings.

import { APP_BRAND_COLOR } from '../../../shared-kernel/presentation/theme/appColors';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Flag, Settings, X } from 'lucide-react-native';
import { usePagesCopy } from '../../application/i18n/pagesCopy';
import type { PagesItem } from '../../domain/types/pages.types';
import { useSafeBottomPadding } from '../../../shared-kernel/presentation/layout/useSafeBottomLayout';

interface PageDetailMenuActionSheetProps {
  visible: boolean;
  onClose: () => void;
  page: PagesItem | null;
  isOwnerOrAdmin: boolean;
  onReport: (pageId: string) => Promise<void>;
  onOpenSettings: (pageId: string) => void;
}

export function PageDetailMenuActionSheet({
  visible,
  onClose,
  page,
  isOwnerOrAdmin,
  onReport,
  onOpenSettings,
}: PageDetailMenuActionSheetProps) {
  const copy = usePagesCopy();
  const [loadingId, setLoadingId] = useState<'report' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const safeBottomPadding = useSafeBottomPadding(32);

  const handleReport = async () => {
    if (!page) return;
    setLoadingId('report');
    setError(null);
    try {
      await onReport(page.pageId);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.saveError);
    } finally {
      setLoadingId(null);
    }
  };

  const handleOpenSettings = () => {
    if (!page) return;
    onOpenSettings(page.pageId);
    onClose();
  };

  if (!visible || !page) return null;

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      {/* Backdrop */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={onClose}
        style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      />

      {/* Action Sheet */}
      <View
        className="absolute bottom-0 left-0 right-0 rounded-t-2xl bg-white px-4 pt-4 shadow-lg"
        style={{ paddingBottom: safeBottomPadding }}
      >
        {/* Header */}
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-xl font-bold text-slate-900">
            {copy.pageMenuTitle}
          </Text>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel={copy.settingsBack}
          >
            <X size={22} color="#64748B" />
          </TouchableOpacity>
        </View>

        {/* Error */}
        {error && (
          <Text className="mb-3 text-center text-sm text-red-500">{error}</Text>
        )}

        {/* Report Option */}
        <TouchableOpacity
          onPress={handleReport}
          disabled={loadingId !== null}
          className="flex-row items-center py-4"
          activeOpacity={0.7}
        >
          {loadingId === 'report' ? (
            <ActivityIndicator
              size="small"
              color="#EF4444"
              style={{ marginRight: 12 }}
            />
          ) : (
            <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-red-100">
              <Flag size={20} color="#EF4444" />
            </View>
          )}
          <View className="flex-1">
            <Text className="text-base font-semibold text-slate-900">
              {copy.pageMenuReport}
            </Text>
            <Text className="mt-0.5 text-xs text-slate-500">
              {copy.pageMenuReportDesc}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Settings Option — only for owner / admin */}
        {isOwnerOrAdmin ? (
          <>
            <View className="h-px bg-slate-100" />
            <TouchableOpacity
              onPress={handleOpenSettings}
              disabled={loadingId !== null}
              className="flex-row items-center py-4"
              activeOpacity={0.7}
            >
              <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-brand-soft">
                <Settings size={20} color={APP_BRAND_COLOR} />
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-slate-900">
                  {copy.pageMenuSettings}
                </Text>
                <Text className="mt-0.5 text-xs text-slate-500">
                  {copy.pageMenuSettingsDesc}
                </Text>
              </View>
            </TouchableOpacity>
          </>
        ) : null}
      </View>
    </Modal>
  );
}

export default PageDetailMenuActionSheet;

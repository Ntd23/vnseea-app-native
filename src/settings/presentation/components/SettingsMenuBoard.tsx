// Description: Renders the 5-section menu board shown on the Settings
// tab (matches the reference layout: wallet+points header, content
// management list, account actions, system actions, footer actions).
//
// Data is driven entirely by `useSettingsViewModel` — this component
// has no business logic of its own; it just lays out the sections and
// forwards taps back to the screen via `onItemPress`.
import { APP_BRAND_COLOR } from '../../../shared-kernel/presentation/theme/appColors';
import React from 'react';
import { Pressable, Switch, Text, View } from 'react-native';
import {
  Banknote,
  ChevronRight,
  Compass,
  Keyboard,
  LogOut,
  Moon,
  Package,
  Repeat,
  ShieldCheck,
  Sparkles,
  Star,
  Wallet,
} from 'lucide-react-native';
import type { SettingsMenuItem } from '../../domain/types/settings.types';

const ICON_MAP: Record<
  string,
  React.ComponentType<{ size: number; color: string }>
> = {
  // account + system icons (kept local; everything else falls back to
  // a colored dot so the board never crashes on a missing glyph).
  Settings: Sparkles,
  Sparkles,
  ShieldCheck,
  LogOut,
  Repeat,
  Keyboard,
  Moon,
  Compass,
  Package,
  Newspaper: Star,
};

interface SettingsMenuBoardProps {
  wallet: { amount: number; formatted: string } | null;
  points: { amount: number; formatted: string } | null;
  isAdmin: boolean;
  contentMenu: SettingsMenuItem[];
  accountMenu: SettingsMenuItem[];
  systemMenu: SettingsMenuItem[];
  footerMenu: SettingsMenuItem[];
  sectionLabels: Record<string, string>;
  onItemPress: (id: string) => void;
  onSwitchAccountPress?: () => void;
  onShortcutsPress?: () => void;
  onToggleNightMode?: (next: boolean) => void;
  isNightMode?: boolean;
}

// ── Small helpers ────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: string }) {
  return (
    <Text className="mb-3 px-2 text-[11px] font-bold uppercase tracking-wider text-[#64748b]">
      {children}
    </Text>
  );
}

function SurfaceCard({ children }: { children: React.ReactNode }) {
  return (
    <View className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {children}
    </View>
  );
}

// ── Row ──────────────────────────────────────────────────────────────────

function BoardRow({
  item,
  isLast,
  onPress,
  trailing,
}: {
  item: SettingsMenuItem;
  isLast: boolean;
  onPress?: () => void;
  trailing?: React.ReactNode;
}) {
  const IconComponent = ICON_MAP[item.iconKey];
  const iconColor = item.isDestructive ? '#ef4444' : APP_BRAND_COLOR;
  const textColorClass = item.isDestructive
    ? 'text-[#ef4444]'
    : 'text-[#1a1c1e]';

  return (
    <Pressable
      android_ripple={{ color: 'rgba(185,28,28,0.08)' }}
      onPress={onPress}
      className={`flex-row items-center gap-4 px-5 py-4 ${
        !isLast ? 'border-b border-slate-200' : ''
      }`}>
      <View className="h-9 w-9 items-center justify-center rounded-xl bg-brand-subtle">
        {IconComponent ? (
          <IconComponent size={18} color={iconColor} />
        ) : (
          <View
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: iconColor }}
          />
        )}
      </View>
      <View className="flex-1">
        <Text className={`text-[15px] font-medium leading-6 ${textColorClass}`}>
          {item.label}
        </Text>
        {item.subtitle ? (
          <Text className="mt-0.5 text-[12px] leading-5 text-[#64748b]">
            {item.subtitle}
          </Text>
        ) : null}
      </View>
      {trailing ?? (
        <ChevronRight
          size={18}
          color={item.isDestructive ? '#ef4444' : '#94a3b8'}
        />
      )}
    </Pressable>
  );
}

// ── Wallet + Points header ──────────────────────────────────────────────

function WalletPointsHeader({
  wallet,
  points,
  labels,
}: {
  wallet: SettingsMenuBoardProps['wallet'];
  points: SettingsMenuBoardProps['points'];
  labels: SettingsMenuBoardProps['sectionLabels'];
}) {
  return (
    <View className="flex-row gap-3">
      <Pressable
        android_ripple={{ color: 'rgba(185,28,28,0.08)' }}
        className="flex-1 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <View className="mb-2 flex-row items-center gap-2">
          <View className="h-8 w-8 items-center justify-center rounded-full bg-brand-subtle">
            <Wallet size={16} color={APP_BRAND_COLOR} />
          </View>
          <Text className="text-[12px] font-semibold uppercase tracking-wide text-[#64748b]">
            {labels.wallet}
          </Text>
        </View>
        <Text className="text-[20px] font-bold text-[#1a1c1e]">
          {wallet ? wallet.formatted : '—'}
        </Text>
        <Text className="mt-1 text-[11px] text-[#94a3b8]">
          {wallet ? 'VNĐ' : 'Chưa có dữ liệu'}
        </Text>
      </Pressable>

      <Pressable
        android_ripple={{ color: 'rgba(185,28,28,0.08)' }}
        className="flex-1 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <View className="mb-2 flex-row items-center gap-2">
          <View className="h-8 w-8 items-center justify-center rounded-full bg-brand-subtle">
            <Banknote size={16} color={APP_BRAND_COLOR} />
          </View>
          <Text className="text-[12px] font-semibold uppercase tracking-wide text-[#64748b]">
            {labels.points}
          </Text>
        </View>
        <Text className="text-[20px] font-bold text-[#1a1c1e]">
          {points ? points.formatted : '—'}
        </Text>
        <Text className="mt-1 text-[11px] text-[#94a3b8]">
          {points ? 'Điểm thưởng' : 'Chưa có dữ liệu'}
        </Text>
      </Pressable>
    </View>
  );
}

// ── Main board ──────────────────────────────────────────────────────────

export default function SettingsMenuBoard({
  wallet,
  points,
  isAdmin,
  contentMenu,
  accountMenu,
  systemMenu,
  footerMenu,
  sectionLabels,
  onItemPress,
  onSwitchAccountPress,
  onShortcutsPress,
  onToggleNightMode,
  isNightMode,
}: SettingsMenuBoardProps) {
  // Admin link is only rendered when the viewer is actually an admin.
  const visibleSystemMenu = isAdmin
    ? systemMenu
    : systemMenu.filter(item => item.id !== 'admin');

  return (
    <View>
      {/* 1. Wallet + Points summary */}
      <View className="mb-6">
        <WalletPointsHeader
          wallet={wallet}
          points={points}
          labels={sectionLabels}
        />
      </View>

      {/* 2. Content management */}
      <View className="mb-6">
        <SectionLabel>{sectionLabels.content}</SectionLabel>
        <SurfaceCard>
          {contentMenu.map((item, index) => (
            <BoardRow
              key={item.id}
              item={item}
              isLast={index === contentMenu.length - 1}
              onPress={() => onItemPress(item.id)}
            />
          ))}
        </SurfaceCard>
      </View>

      {/* 3. Account / Settings */}
      <View className="mb-6">
        <SectionLabel>{sectionLabels.account}</SectionLabel>
        <SurfaceCard>
          {accountMenu.map((item, index) => (
            <BoardRow
              key={item.id}
              item={item}
              isLast={index === accountMenu.length - 1}
              onPress={() => onItemPress(item.id)}
            />
          ))}
        </SurfaceCard>
      </View>

      {/* 4. System (admin / logout) */}
      <View className="mb-6">
        <SectionLabel>{sectionLabels.system}</SectionLabel>
        <SurfaceCard>
          {visibleSystemMenu.length === 0 ? (
            <BoardRow
              item={systemMenu[systemMenu.length - 1]}
              isLast
              onPress={() => onItemPress(systemMenu[systemMenu.length - 1].id)}
            />
          ) : (
            visibleSystemMenu.map((item, index) => (
              <BoardRow
                key={item.id}
                item={item}
                isLast={index === visibleSystemMenu.length - 1}
                onPress={() => onItemPress(item.id)}
              />
            ))
          )}
        </SurfaceCard>
      </View>

      {/* 5. Footer (switch account / shortcuts / night mode) */}
      <View className="mb-8">
        <SectionLabel>{sectionLabels.footer}</SectionLabel>
        <SurfaceCard>
          {footerMenu.map((item, index) => {
            const isLast = index === footerMenu.length - 1;
            if (item.id === 'switch-account') {
              return (
                <BoardRow
                  key={item.id}
                  item={{ ...item, subtitle: sectionLabels.switchAccountHint }}
                  isLast={false}
                  onPress={onSwitchAccountPress}
                />
              );
            }
            if (item.id === 'shortcuts') {
              return (
                <BoardRow
                  key={item.id}
                  item={{ ...item, subtitle: sectionLabels.shortcutsHint }}
                  isLast={false}
                  onPress={onShortcutsPress}
                />
              );
            }
            if (item.id === 'night-mode') {
              return (
                <BoardRow
                  key={item.id}
                  item={{ ...item, subtitle: sectionLabels.nightModeHint }}
                  isLast={isLast}
                  onPress={() => onToggleNightMode?.(!isNightMode)}
                  trailing={
                    <Switch
                      value={Boolean(isNightMode)}
                      onValueChange={next => onToggleNightMode?.(next)}
                      trackColor={{ false: '#cbd5e1', true: APP_BRAND_COLOR }}
                      thumbColor="#ffffff"
                    />
                  }
                />
              );
            }
            return (
              <BoardRow
                key={item.id}
                item={item}
                isLast={isLast}
                onPress={() => onItemPress(item.id)}
              />
            );
          })}
        </SurfaceCard>
      </View>
    </View>
  );
}

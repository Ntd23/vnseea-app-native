import React, {useMemo, useState} from 'react';
import {StatusBar, Switch, Text, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {
  Bell,
  ChevronRight,
  Globe,
  HelpCircle,
  Lock,
  Moon,
  Palette,
  Shield,
  Sun,
  User,
} from 'lucide-react-native';

type ThemeMode = 'light' | 'dark';

function SettingRow({
  icon,
  label,
  value,
  onPress,
  rightSlot,
  dark = false,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  onPress?: () => void;
  rightSlot?: React.ReactNode;
  dark?: boolean;
}) {
  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container
      {...(onPress ? {onPress, activeOpacity: 0.8} : {})}
      className={`flex-row items-center justify-between rounded-2xl border px-4 py-4 ${dark ? 'border-white/10 bg-white/5' : 'border-[#E2E8FF] bg-white'}`}>
      <View className="flex-row items-center">
        <View className={`mr-3 h-11 w-11 items-center justify-center rounded-2xl ${dark ? 'bg-white/10' : 'bg-[#EEF2FF]'}`}>
          {icon}
        </View>
        <View>
          <Text className={`text-base font-semibold ${dark ? 'text-white' : 'text-slate-900'}`}>
            {label}
          </Text>
          {value ? (
            <Text className={`mt-0.5 text-sm ${dark ? 'text-white/60' : 'text-slate-500'}`}>
              {value}
            </Text>
          ) : null}
        </View>
      </View>
      {rightSlot ?? <ChevronRight size={18} color={dark ? '#A5B4FC' : '#94A3B8'} />}
    </Container>
  );
}

function SettingsScreen() {
  const [theme, setTheme] = useState<ThemeMode>('light');
  const dark = theme === 'dark';

  const palette = useMemo(
    () => ({
      bg: dark ? '#0B1020' : '#EEF2FF',
      top: dark ? '#111933' : '#0700FF',
      card: dark ? '#121A33' : '#FFFFFF',
      text: dark ? '#F8FAFC' : '#0F172A',
      muted: dark ? 'rgba(248,250,252,0.65)' : '#64748B',
      border: dark ? 'rgba(255,255,255,0.10)' : '#E2E8FF',
      surface: dark ? 'rgba(255,255,255,0.05)' : '#F8FAFF',
    }),
    [dark],
  );

  return (
    <SafeAreaView className="flex-1" style={{backgroundColor: palette.bg}}>
      <StatusBar barStyle={dark ? 'light-content' : 'light-content'} />

      <View className="flex-1">
        <View
          className="overflow-hidden px-6 pb-16 pt-5"
          style={{backgroundColor: palette.top}}>
          <View className="absolute -left-8 top-16 h-28 w-28 rounded-full bg-white/8" />
          <View className="absolute right-0 top-0 h-48 w-48 rounded-full bg-white/8" />
          <View className="items-center pt-8">
            <View className="h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-white/12">
              <Text className="text-3xl text-white">V</Text>
            </View>
            <Text className="mt-4 text-[34px] font-extrabold tracking-wide text-white">
              VNSEEA
            </Text>
            <Text className="mt-1 text-sm font-semibold tracking-[4px] text-white/75">
              SETTINGS
            </Text>
          </View>
        </View>

        <View className="-mt-10 flex-1 rounded-t-[38px] px-5 pt-5" style={{backgroundColor: palette.bg}}>
          <View className="rounded-[28px] px-6 py-7 shadow-[0px_18px_40px_rgba(15,23,42,0.08)]" style={{backgroundColor: palette.card}}>
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-[28px] font-extrabold" style={{color: palette.text}}>
                  Cài đặt
                </Text>
                <Text className="mt-2 text-base" style={{color: palette.muted}}>
                  Tùy chỉnh tài khoản và giao diện theo ý bạn
                </Text>
              </View>
              <View className={`h-12 w-12 items-center justify-center rounded-2xl`} style={{backgroundColor: palette.surface}}>
                {dark ? <Moon size={22} color="#A5B4FC" /> : <Sun size={22} color="#0700FF" />}
              </View>
            </View>

            <View className="mt-6 flex-row items-center justify-between rounded-2xl px-4 py-4" style={{backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border}}>
              <View className="flex-row items-center">
                <View className="mr-3 h-11 w-11 items-center justify-center rounded-2xl" style={{backgroundColor: dark ? 'rgba(255,255,255,0.08)' : '#EEF2FF'}}>
                  {dark ? <Moon size={20} color="#A5B4FC" /> : <Sun size={20} color="#0700FF" />}
                </View>
                <View>
                  <Text className="text-base font-semibold" style={{color: palette.text}}>
                    Giao diện {dark ? 'tối' : 'sáng'}
                  </Text>
                  <Text className="text-sm" style={{color: palette.muted}}>
                    Chuyển qua lại giữa hai theme
                  </Text>
                </View>
              </View>
              <Switch
                value={dark}
                onValueChange={value => setTheme(value ? 'dark' : 'light')}
                trackColor={{false: '#CBD5E1', true: '#4F46E5'}}
                thumbColor="#FFFFFF"
              />
            </View>

            <View className="mt-6">
              <Text className="mb-3 text-sm font-bold" style={{color: palette.muted}}>
                Tài khoản
              </Text>
              <View className="space-y-3">
                <SettingRow
                  dark={dark}
                  icon={<User size={20} color={dark ? '#A5B4FC' : '#0700FF'} />}
                  label="Hồ sơ cá nhân"
                  value="Ảnh đại diện, tên hiển thị, bio"
                />
                <SettingRow
                  dark={dark}
                  icon={<Lock size={20} color={dark ? '#A5B4FC' : '#0700FF'} />}
                  label="Bảo mật"
                  value="Mật khẩu, xác thực, quyền riêng tư"
                />
                <SettingRow
                  dark={dark}
                  icon={<Shield size={20} color={dark ? '#A5B4FC' : '#0700FF'} />}
                  label="Quyền riêng tư"
                  value="Ai có thể nhìn thấy hoạt động của bạn"
                />
              </View>
            </View>

            <View className="mt-6">
              <Text className="mb-3 text-sm font-bold" style={{color: palette.muted}}>
                Ứng dụng
              </Text>
              <View className="space-y-3">
                <SettingRow
                  dark={dark}
                  icon={<Bell size={20} color={dark ? '#A5B4FC' : '#0700FF'} />}
                  label="Thông báo"
                  value="Tin nhắn, tương tác, cập nhật"
                />
                <SettingRow
                  dark={dark}
                  icon={<Globe size={20} color={dark ? '#A5B4FC' : '#0700FF'} />}
                  label="Ngôn ngữ"
                  value="Tiếng Việt"
                />
                <SettingRow
                  dark={dark}
                  icon={<Palette size={20} color={dark ? '#A5B4FC' : '#0700FF'} />}
                  label="Chủ đề"
                  value="Sáng / tối"
                  rightSlot={<Text className="text-sm font-semibold" style={{color: palette.muted}}>{theme === 'dark' ? 'Dark' : 'Light'}</Text>}
                />
                <SettingRow
                  dark={dark}
                  icon={<HelpCircle size={20} color={dark ? '#A5B4FC' : '#0700FF'} />}
                  label="Trợ giúp"
                  value="Hỗ trợ, FAQ, liên hệ"
                />
              </View>
            </View>

            <TouchableOpacity
              className="mt-7 items-center rounded-2xl py-4"
              activeOpacity={0.9}
              style={{backgroundColor: dark ? '#2A325A' : '#0700FF'}}>
              <Text className="text-base font-bold text-white">Lưu thay đổi</Text>
            </TouchableOpacity>
          </View>

          <View className="flex-row items-center justify-center py-5">
            <Text className="text-sm" style={{color: palette.muted}}>
              Thay đổi theme theo cả 2 hướng sáng/tối
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

export default SettingsScreen;

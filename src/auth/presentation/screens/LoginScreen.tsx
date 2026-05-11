import React, {useState} from 'react';
import {StatusBar, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {Eye, EyeOff, Lock, Mail, User} from 'lucide-react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import {ROUTES} from '../../../navigation/constants/routes';

function SocialButton({
  label,
  icon,
}: {
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <TouchableOpacity
      className="flex-1 flex-row items-center justify-center rounded-2xl border border-[#DEE4FF] bg-white px-4 py-4"
      activeOpacity={0.85}>
      {icon}
      <Text className="ml-2 text-sm font-semibold text-slate-700">{label}</Text>
    </TouchableOpacity>
  );
}

function LoginScreen() {
  const navigation = useNavigation<any>();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  return (
    <SafeAreaView className="flex-1 bg-[#EEF2FF]">
      <StatusBar barStyle="light-content" />

      <View className="flex-1">
        <View className="overflow-hidden bg-[#0700FF] px-6 pb-16 pt-5">
          <View className="absolute -left-8 top-16 h-28 w-28 rounded-full bg-white/8" />
          <View className="absolute right-0 top-0 h-48 w-48 rounded-full bg-white/8" />
          <View className="absolute left-1/2 top-10 h-16 w-16 -translate-x-8 rounded-full border border-white/20 bg-white/12" />
          <View className="items-center pt-10">
            <View className="h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-white/12">
              <Text className="text-3xl text-white">V</Text>
            </View>
            <Text className="mt-4 text-[34px] font-extrabold tracking-wide text-white">
              VNSEEA
            </Text>
            <Text className="mt-1 text-sm font-semibold tracking-[4px] text-white/75">
              SOCIAL NETWORK
            </Text>
          </View>
        </View>

        <View className="-mt-10 flex-1 rounded-t-[38px] bg-[#EEF2FF] px-5 pt-5">
          <View className="rounded-[28px] bg-white px-6 py-7 shadow-[0px_18px_40px_rgba(15,23,42,0.08)]">
            <Text className="text-[28px] font-extrabold text-slate-900">
              Đăng nhập
            </Text>
            <Text className="mt-2 text-base text-slate-500">
              Nhập email hoặc đăng nhập bằng mạng xã hội
            </Text>

            <View className="mt-6">
              <Text className="mb-3 text-sm font-bold text-slate-900">Email</Text>
              <View className="flex-row items-center rounded-2xl border border-[#D9E0FF] bg-[#FAFBFF] px-4 py-4">
                <Mail size={18} color="#94A3B8" />
                <TextInput
                  className="ml-3 flex-1 text-base text-slate-900"
                  placeholder="your@email.com"
                  placeholderTextColor="#94A3B8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View className="mt-5">
              <Text className="mb-3 text-sm font-bold text-slate-900">Mật khẩu</Text>
              <View className="flex-row items-center rounded-2xl border border-[#D9E0FF] bg-[#FAFBFF] px-4 py-4">
                <Lock size={18} color="#94A3B8" />
                <TextInput
                  className="ml-3 flex-1 text-base text-slate-900"
                  placeholder="Nhập mật khẩu"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(value => !value)}
                  activeOpacity={0.75}>
                  {showPassword ? (
                    <EyeOff size={20} color="#94A3B8" />
                  ) : (
                    <Eye size={20} color="#94A3B8" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <View className="mt-5 flex-row items-center justify-between">
              <TouchableOpacity
                className="flex-row items-center"
                onPress={() => setRememberMe(value => !value)}
                activeOpacity={0.8}>
                <View
                  className={`mr-3 h-5 w-5 rounded-[6px] border ${rememberMe ? 'border-[#0700FF] bg-[#0700FF]' : 'border-slate-300 bg-white'}`}>
                  {rememberMe ? (
                    <Text className="text-center text-xs font-bold leading-5 text-white">
                      ✓
                    </Text>
                  ) : null}
                </View>
                <Text className="text-sm font-medium text-slate-600">
                  Ghi nhớ đăng nhập
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => navigation.navigate(ROUTES.FORGOT_PASSWORD)}>
                <Text className="text-sm font-semibold text-[#0700FF]">
                  Quên mật khẩu?
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              className="mt-7 items-center rounded-2xl bg-[#0700FF] py-4 shadow-[0px_12px_24px_rgba(7,0,255,0.25)]"
              activeOpacity={0.9}>
              <Text className="text-base font-bold text-white">Đăng nhập</Text>
            </TouchableOpacity>

            <View className="mt-6 flex-row items-center">
              <View className="h-px flex-1 bg-[#E5E9F8]" />
              <Text className="mx-3 text-sm font-semibold text-slate-400">
                Hoặc đăng nhập bằng
              </Text>
              <View className="h-px flex-1 bg-[#E5E9F8]" />
            </View>

            <View className="mt-5 flex-row gap-3">
              <SocialButton
                label="Phone"
                icon={<User size={18} color="#0EA5E9" />}
              />
              <SocialButton
                label="Facebook"
                icon={<Icon name="facebook" size={18} color="#1877F2" />}
              />
            </View>
          </View>

          <View className="flex-row items-center justify-center py-5">
            <Text className="text-sm text-slate-500">
              Chưa có tài khoản?{' '}
            </Text>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => navigation.navigate(ROUTES.REGISTER)}>
              <Text className="text-sm font-bold text-[#0700FF]">Đăng ký</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

export default LoginScreen;

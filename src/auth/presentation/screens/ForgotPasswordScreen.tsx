import React from 'react';
import {StatusBar, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {ArrowLeft, Mail, ShieldCheck} from 'lucide-react-native';
import {ROUTES} from '../../../navigation/constants/routes';

function ForgotPasswordScreen() {
  const navigation = useNavigation<any>();

  return (
    <SafeAreaView className="flex-1 bg-[#EEF2FF]">
      <StatusBar barStyle="light-content" />

      <View className="flex-1">
        <View className="overflow-hidden bg-[#0700FF] px-6 pb-16 pt-5">
          <View className="absolute -left-8 top-16 h-28 w-28 rounded-full bg-white/8" />
          <View className="absolute right-0 top-0 h-48 w-48 rounded-full bg-white/8" />
          <View className="items-center pt-10">
            <View className="h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-white/12">
              <Text className="text-3xl text-white">V</Text>
            </View>
            <Text className="mt-4 text-[34px] font-extrabold tracking-wide text-white">
              VNSEEA
            </Text>
            <Text className="mt-1 text-sm font-semibold tracking-[4px] text-white/75">
              RESET PASSWORD
            </Text>
          </View>
        </View>

        <View className="-mt-10 flex-1 rounded-t-[38px] bg-[#EEF2FF] px-5 pt-5">
          <View className="rounded-[28px] bg-white px-6 py-7 shadow-[0px_18px_40px_rgba(15,23,42,0.08)]">
            <View className="flex-row items-center">
              <View className="mr-3 h-11 w-11 items-center justify-center rounded-2xl bg-[#EEF2FF]">
                <ShieldCheck size={22} color="#0700FF" />
              </View>
              <View className="flex-1">
                <Text className="text-[28px] font-extrabold text-slate-900">
                  Quên mật khẩu
                </Text>
                <Text className="mt-1 text-base text-slate-500">
                  Nhập email để nhận liên kết đặt lại mật khẩu
                </Text>
              </View>
            </View>

            <View className="mt-7">
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

            <TouchableOpacity
              className="mt-7 items-center rounded-2xl bg-[#0700FF] py-4 shadow-[0px_12px_24px_rgba(7,0,255,0.25)]"
              activeOpacity={0.9}>
              <Text className="text-base font-bold text-white">
                Gửi liên kết đặt lại
              </Text>
            </TouchableOpacity>

            <View className="mt-5 flex-row items-center justify-center rounded-2xl bg-[#F8FAFF] px-4 py-4">
              <ArrowLeft size={18} color="#0700FF" />
              <Text className="ml-2 text-sm font-semibold text-slate-600">
                Kiểm tra hộp thư và làm theo hướng dẫn
              </Text>
            </View>
          </View>

          <View className="flex-row items-center justify-center py-5">
            <Text className="text-sm text-slate-500">
              Nhớ mật khẩu rồi?{' '}
            </Text>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => navigation.navigate(ROUTES.LOGIN)}>
              <Text className="text-sm font-bold text-[#0700FF]">Đăng nhập</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

export default ForgotPasswordScreen;

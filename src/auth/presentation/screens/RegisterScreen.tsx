// Description: Renders the Stitch VNSEEA-style register screen using shared design token utilities.
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowRight, Network } from 'lucide-react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ROUTES } from '../../../navigation/constants/routes';

function Field({
  label,
  placeholder,
  secureTextEntry,
  keyboardType,
}: {
  label: string;
  placeholder: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address';
}) {
  return (
    <View>
      <Text className="mb-2 text-label-primary text-slate-500">{label}</Text>
      <View className="input-shell min-h-[48px] justify-center px-3">
        <TextInput
          className="text-body-primary"
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>
    </View>
  );
}

function SocialButton({
  label,
  icon,
}: {
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <TouchableOpacity
      className="btn-secondary min-h-[44px]"
      activeOpacity={0.8}
    >
      {icon}
      <Text className="text-title-primary">{label}</Text>
    </TouchableOpacity>
  );
}

function RegisterScreen() {
  const navigation = useNavigation<any>();
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  return (
    <SafeAreaView className="flex-1 surface-base">
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9ff" />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="flex-grow justify-center px-4 py-12"
          keyboardShouldPersistTaps="handled"
        >
          <View className="surface-panel overflow-hidden px-6 py-8">
            <View className="items-center pb-4">
              <View className="icon-chip mb-4 h-12 w-12 items-center justify-center">
                <Network size={26} color="#0000FF" strokeWidth={2.6} />
              </View>
              <Text className="text-display text-brand">WoWonder</Text>
              <Text className="mt-2 text-heading">Đăng ký</Text>
            </View>

            <View className="gap-4">
              <View className="flex-row gap-4">
                <View className="flex-1">
                  <Field label="First Name" placeholder="Nguyễn Văn" />
                </View>
                <View className="flex-1">
                  <Field label="Last Name" placeholder="A" />
                </View>
              </View>

              <Field label="Username" placeholder="nguyenvana123" />
              <Field
                label="Email"
                placeholder="email@example.com"
                keyboardType="email-address"
              />
              <Field label="Password" placeholder="••••••••" secureTextEntry />
              <Field
                label="Confirm Password"
                placeholder="••••••••"
                secureTextEntry
              />

              <View className="pt-2">
                <Text className="mb-3 text-label-primary text-slate-500">
                  Gender
                </Text>
                <View className="flex-row gap-8">
                  <TouchableOpacity
                    className="flex-row items-center"
                    activeOpacity={0.8}
                    onPress={() => setGender('male')}
                  >
                    <View
                      className={
                        gender === 'male' ? 'choice-dot-active' : 'choice-dot'
                      }
                    />
                    <Text className="ml-2 text-body-primary">Male</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="flex-row items-center"
                    activeOpacity={0.8}
                    onPress={() => setGender('female')}
                  >
                    <View
                      className={
                        gender === 'female' ? 'choice-dot-active' : 'choice-dot'
                      }
                    />
                    <Text className="ml-2 text-body-primary">Female</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                className="flex-row items-start pt-2"
                activeOpacity={0.8}
                onPress={() => setAcceptedTerms(value => !value)}
              >
                <View
                  className={
                    acceptedTerms ? 'choice-dot-active mt-1' : 'choice-dot mt-1'
                  }
                />
                <Text className="ml-3 flex-1 text-caption-secondary">
                  Bằng việc đăng ký, bạn đồng ý với{' '}
                  <Text className="text-brand">Điều khoản dịch vụ</Text> và{' '}
                  <Text className="text-brand">Chính sách bảo mật</Text> của
                  chúng tôi.
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="btn-primary mt-2 min-h-[48px]"
                activeOpacity={0.9}
              >
                <Text className="text-title-primary text-inverse">Đăng ký</Text>
                <ArrowRight size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View className="my-6 flex-row items-center">
              <View className="divider-line flex-1" />
              <Text className="mx-4 text-caption-secondary">
                Hoặc đăng ký với
              </Text>
              <View className="divider-line flex-1" />
            </View>

            <View className="mb-6 gap-4">
              <SocialButton
                label="Google"
                icon={<Icon name="google" size={20} color="#4285F4" />}
              />
              <SocialButton
                label="Facebook"
                icon={<Icon name="facebook" size={20} color="#1877F2" />}
              />
              <SocialButton
                label="Apple"
                icon={<Icon name="apple" size={22} color="#000000" />}
              />
            </View>

            <View className="flex-row items-center justify-center">
              <Text className="text-body-secondary">Đã có tài khoản?</Text>
              <TouchableOpacity
                className="ml-1"
                activeOpacity={0.8}
                onPress={() => navigation.navigate(ROUTES.LOGIN)}
              >
                <Text className="text-title-primary text-brand">Đăng nhập</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default RegisterScreen;

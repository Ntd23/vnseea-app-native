// Description: Allows the user to select and download their account data as an HTML file.
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ArrowLeft,
  Download,
  FileText,
  Flag,
  Info,
  PackageOpen,
  UserPlus,
  Users,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';
import { apiConfig } from '../../../shared-kernel/infrastructure/config/env';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';

import type { RootStackParamList } from '../../../navigation/types';

type MyInfoNav = NativeStackNavigationProp<RootStackParamList>;
type SelectionKey =
  | 'my_information'
  | 'posts'
  | 'pages'
  | 'groups'
  | 'following'
  | 'followers';

type DownloadInfoResponse = {
  api_status?: number;
  message?: string;
  link?: string;
};

interface SelectionCardProps {
  IconComponent: React.ComponentType<{ size: number; color: string }>;
  label: string;
  selected: boolean;
  onPress: () => void;
}

function SelectionCard({
  IconComponent,
  label,
  selected,
  onPress,
}: SelectionCardProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.82}
      onPress={onPress}
      className={`mb-4 items-center justify-center rounded-2xl border bg-white py-6 ${
        selected ? 'border-blue-600' : 'border-slate-100'
      }`}
      style={{
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 2,
        elevation: 1,
      }}
    >
      <View
        className="mb-3 h-14 w-14 items-center justify-center rounded-full"
        style={{ backgroundColor: selected ? '#eff6ff' : '#f1f5f9' }}
      >
        <IconComponent size={24} color={selected ? '#2563eb' : '#64748b'} />
      </View>
      <Text
        className={`text-[15px] font-bold ${
          selected ? 'text-blue-600' : 'text-slate-800'
        }`}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function MyInfoScreen() {
  const navigation = useNavigation<MyInfoNav>();
  const language = useAppLanguage();
  const isVi = language === 'vi';

  const [selections, setSelections] = useState<Record<SelectionKey, boolean>>({
    my_information: false,
    posts: false,
    pages: false,
    groups: false,
    following: false,
    followers: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isFileReady, setIsFileReady] = useState(false);
  const [readyMessage, setReadyMessage] = useState('');
  const [downloadLink, setDownloadLink] = useState('');

  const toggleSelection = useCallback((key: SelectionKey) => {
    setIsFileReady(false);
    setReadyMessage('');
    setDownloadLink('');
    setSelections(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  }, []);

  const handleCreateFile = useCallback(async () => {
    const hasSelection = Object.values(selections).some(Boolean);
    if (!hasSelection) {
      Alert.alert(
        isVi ? 'Thông báo' : 'Notice',
        isVi
          ? 'Vui lòng chọn ít nhất một loại thông tin để tải xuống.'
          : 'Please select at least one type of information to download.',
      );
      return;
    }

    setIsLoading(true);
    setIsFileReady(false);
    setReadyMessage('');
    setDownloadLink('');

    try {
      // Build comma-separated data param for v2 API
      const selectedKeys = (Object.keys(selections) as SelectionKey[]).filter(
        key => selections[key],
      );
      const dataValue = selectedKeys.join(',');

      const token = sessionStorage.getAccessToken();
      const params = new URLSearchParams();
      params.append('server_key', apiConfig.serverKey);
      if (token) {
        params.append('access_token', token);
      }
      params.append('data', dataValue);

      // Call the v2 API endpoint which returns { api_status, message, link }
      const response = await axios.post<DownloadInfoResponse>(
        `${apiConfig.apiBaseUrl}/download_info`,
        params.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 30000,
        },
      );

      const payload = response.data ?? {};
      if (payload.api_status !== 200 || !payload.link) {
        throw new Error(
          payload.message ||
            (isVi
              ? 'Không thể tạo tệp thông tin. Vui lòng thử lại.'
              : 'Unable to generate your information file. Please try again.'),
        );
      }

      setReadyMessage(
        isVi
          ? 'Tệp của bạn đã sẵn sàng để tải xuống!'
          : 'Your file is ready to download!',
      );
      setDownloadLink(payload.link);
      setIsFileReady(true);
    } catch (caught) {
      Alert.alert(
        isVi ? 'Không thể tạo tệp' : 'Unable to create file',
        caught instanceof Error
          ? caught.message
          : isVi
            ? 'Đã có lỗi xảy ra. Vui lòng thử lại.'
            : 'Something went wrong. Please try again.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [isVi, selections]);

  const handleDownloadFile = useCallback(async () => {
    if (!downloadLink) return;
    try {
      await Linking.openURL(downloadLink);
    } catch {
      Alert.alert(
        isVi ? 'Không thể tải xuống' : 'Unable to download',
        isVi
          ? 'Không mở được tệp tải xuống. Vui lòng thử lại.'
          : 'Could not open the download file. Please try again.',
      );
    }
  }, [downloadLink, isVi]);

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <View
        className="flex-row items-center justify-between border-b border-slate-100 bg-white px-4"
        style={{ height: 64 }}
      >
        <TouchableOpacity
          activeOpacity={0.82}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          onPress={() => navigation.goBack()}
          className="h-11 w-11 items-center justify-center rounded-full bg-slate-50"
        >
          <ArrowLeft size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text
          className="flex-1 text-center text-xl font-extrabold text-slate-950"
          numberOfLines={1}
        >
          {isVi ? 'Thông tin của tôi' : 'My information'}
        </Text>
        <View className="w-11" />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 20,
          paddingBottom: 40,
        }}
        showsVerticalScrollIndicator={false}
      >
        {isFileReady ? (
          <View
            className="items-center rounded-2xl border border-slate-100 bg-white px-5 py-9"
            style={{
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            <View className="mb-5 h-28 w-28 items-center justify-center rounded-full bg-blue-50">
              <PackageOpen size={70} color="#1e81ce" />
            </View>
            <Text className="mb-6 text-center text-[15px] font-extrabold text-slate-800">
              {readyMessage ||
                (isVi
                  ? 'Tệp của bạn đã sẵn sàng để tải xuống!'
                  : 'Your file is ready to download!')}
            </Text>
            <TouchableOpacity
              activeOpacity={0.86}
              onPress={handleDownloadFile}
              className="h-12 flex-row items-center justify-center rounded-xl bg-blue-600 px-8"
              style={{
                shadowColor: '#2563eb',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.18,
                shadowRadius: 8,
                elevation: 3,
              }}
            >
              <Download size={18} color="#ffffff" />
              <Text className="ml-2 text-[15px] font-extrabold text-white">
                {isVi ? 'Tải xuống' : 'Download'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text className="mb-6 text-center text-[16px] font-semibold text-slate-600">
              {isVi
                ? 'Vui lòng chọn thông tin bạn muốn tải xuống'
                : 'Please select the information you want to download'}
            </Text>

            <SelectionCard
              IconComponent={Info}
              label={isVi ? 'Thông tin của tôi' : 'My Information'}
              selected={selections.my_information}
              onPress={() => toggleSelection('my_information')}
            />
            <SelectionCard
              IconComponent={FileText}
              label={isVi ? 'Bài viết' : 'Posts'}
              selected={selections.posts}
              onPress={() => toggleSelection('posts')}
            />
            <SelectionCard
              IconComponent={Flag}
              label={isVi ? 'Các trang' : 'Pages'}
              selected={selections.pages}
              onPress={() => toggleSelection('pages')}
            />
            <SelectionCard
              IconComponent={Users}
              label={isVi ? 'Các nhóm' : 'Groups'}
              selected={selections.groups}
              onPress={() => toggleSelection('groups')}
            />
            <SelectionCard
              IconComponent={UserPlus}
              label={isVi ? 'Đang theo dõi' : 'Following'}
              selected={selections.following}
              onPress={() => toggleSelection('following')}
            />
            <SelectionCard
              IconComponent={Users}
              label={isVi ? 'Người theo dõi' : 'Followers'}
              selected={selections.followers}
              onPress={() => toggleSelection('followers')}
            />

            <TouchableOpacity
              activeOpacity={0.86}
              disabled={isLoading}
              onPress={handleCreateFile}
              className={`mt-6 h-14 flex-row items-center justify-center rounded-2xl ${
                isLoading ? 'bg-blue-300' : 'bg-blue-600'
              }`}
              style={{
                shadowColor: '#2563eb',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 8,
                elevation: 3,
              }}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : null}
              <Text className="ml-2 text-[16px] font-extrabold text-white">
                {isVi ? 'Tạo tệp' : 'Create file'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

export default MyInfoScreen;
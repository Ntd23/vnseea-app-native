// Description: Allows the user to select and download their account data as an HTML file.
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';
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
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';
import apiClient from '../../../shared-kernel/infrastructure/api/client';

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

      // apiClient auto-injects server_key and access_token
      const response = await apiClient.post<DownloadInfoResponse>(
        'download_info',
        { data: dataValue },
      );

      const payload = response.data ?? {};
      if (!payload.link) {
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

  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadFile = useCallback(async () => {
    if (!downloadLink) return;
    setIsDownloading(true);
    try {
      const fileName = `my_info_${Date.now()}.html`;
      const { dirs } = ReactNativeBlobUtil.fs;
      const downloadDir =
        Platform.OS === 'android' ? dirs.DownloadDir : dirs.DocumentDir;
      const filePath = `${downloadDir}/${fileName}`;

      const res = await ReactNativeBlobUtil.config({
        path: filePath,
        fileCache: true,
        addAndroidDownloads: {
          useDownloadManager: true,
          notification: true,
          title: fileName,
          description: isVi
            ? 'Đang tải xuống thông tin của bạn...'
            : 'Downloading your information...',
          mime: 'text/html',
          mediaScannable: true,
        },
      }).fetch('GET', downloadLink);

      const savedPath = res.path();

      Alert.alert(
        isVi ? 'Tải xuống thành công' : 'Download complete',
        isVi
          ? `Tệp đã được lưu vào thư mục Tải xuống.`
          : `File saved to Downloads folder.`,
      );

      // Reset state after successful download
      setIsFileReady(false);
      setReadyMessage('');
      setDownloadLink('');
    } catch {
      Alert.alert(
        isVi ? 'Không thể tải xuống' : 'Unable to download',
        isVi
          ? 'Không thể tải tệp xuống. Vui lòng thử lại.'
          : 'Could not download the file. Please try again.',
      );
    } finally {
      setIsDownloading(false);
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
              disabled={isDownloading}
              onPress={handleDownloadFile}
              className={`h-12 flex-row items-center justify-center rounded-xl px-8 ${
                isDownloading ? 'bg-blue-300' : 'bg-blue-600'
              }`}
              style={{
                shadowColor: '#2563eb',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.18,
                shadowRadius: 8,
                elevation: 3,
              }}
            >
              {isDownloading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Download size={18} color="#ffffff" />
              )}
              <Text className="ml-2 text-[15px] font-extrabold text-white">
                {isDownloading
                  ? isVi
                    ? 'Đang tải...'
                    : 'Downloading...'
                  : isVi
                    ? 'Tải xuống'
                    : 'Download'}
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
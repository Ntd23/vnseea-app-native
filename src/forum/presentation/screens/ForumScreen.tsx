// Description: Renders the phtml-aligned forum tabs for browsing, members, search, personal threads, and messages.
// Port từ: client/src/forum/presentation/pages/ForumPage.vue

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Pressable,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useForumViewModel } from '../../application/view-models/useForumViewModel';
import type { ForumSummarySection, ForumThread } from '../../domain/types/forum.types';
import { languageStorage } from '../../../shared-kernel/infrastructure/storage/languageStorage';
import { forumCopy } from '../../application/i18n/forumCopy';
import { ChevronDown, List, MessageSquare, Search, Users, X } from 'lucide-react-native';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import { FeedHeader } from '../../../feed/presentation/components/FeedHeader';
import type {
  ForumPageTab,
  ForumReply,
  ForumSearchScope,
  ForumSummaryForum,
} from '../../domain/types/forum.types';
import { ROUTES } from '../../../navigation/constants/routes';

type NavigationProp = NativeStackNavigationProp<any>;

function LegacyForumScreen() {
  const navigation = useNavigation<NavigationProp>();
  const vm = useForumViewModel();
  const [language, setLanguage] = useState<'vi' | 'en'>('vi');
  const [searchQuery, setSearchQuery] = useState('');
  const copy = forumCopy[language];

  useEffect(() => {
    const loadLanguage = async () => {
      const currentLang = await languageStorage.getLanguage();
      setLanguage(currentLang as 'vi' | 'en');
    };
    loadLanguage();
  }, []);

  useEffect(() => {
    vm.loadCatalog({ q: searchQuery });
  }, [searchQuery]);

  const handleRefresh = () => {
    vm.refresh();
    vm.loadCatalog({ q: searchQuery });
  };

  const handleSectionPress = (section: ForumSummarySection) => {
    // Navigate to forum threads for this section
    console.log('Section pressed:', section.title);
  };

  const handleForumPress = (forumId: number, forumTitle: string) => {
    // Navigate to forum threads
    console.log('Forum pressed:', forumId, forumTitle);
  };

  if (vm.isLoading && !vm.catalog) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#0000FF" />
      </View>
    );
  }

  return (
    <SafeAreaView
      className="flex-1 bg-white"
      edges={['top']}
    >
      {/* Header */}
      <View className="bg-blue-600 p-4">
        <Text className="text-white text-xl font-bold">{copy.title}</Text>
      </View>

      {/* Search Bar */}
      <View className="p-4 border-b border-gray-200">
        <TextInput
          className="bg-gray-100 rounded-lg p-3 text-base"
          placeholder={copy.searchPlaceholder}
          placeholderTextColor="#94A3B8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Content */}
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={vm.isLoading} onRefresh={handleRefresh} />
        }
      >
        {vm.catalog?.sections.map((section) => (
          <View key={section.id} className="p-4 border-b border-gray-100">
            <Text className="text-lg font-bold mb-2">{section.title}</Text>
            {section.description && (
              <Text className="text-gray-600 mb-3">{section.description}</Text>
            )}
            {section.forums.map((forum) => (
              <TouchableOpacity
                key={forum.id}
                className="bg-gray-50 p-3 rounded-lg mb-2"
                onPress={() => handleForumPress(forum.id, forum.title)}
              >
                <Text className="font-semibold text-base">{forum.title}</Text>
                <Text className="text-gray-600 text-sm mt-1">{forum.description}</Text>
                <Text className="text-gray-400 text-xs mt-1">{copy.posts}: {forum.posts}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}

        {vm.catalog?.sections.length === 0 && (
          <View className="p-8 items-center">
            <Text className="text-gray-500">{copy.noForums}</Text>
          </View>
        )}

        {vm.error && (
          <View className="p-4 bg-red-50">
            <Text className="text-red-600">{vm.error}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const FORUM_TABS: Array<{ key: ForumPageTab; vi: string; en: string }> = [
  { key: 'browse', vi: 'Duyệt diễn đàn', en: 'Browse forum' },
  { key: 'members', vi: 'Các thành viên', en: 'Members' },
  { key: 'search', vi: 'Tìm kiếm', en: 'Search' },
  { key: 'my_threads', vi: 'Chủ đề của tôi', en: 'My threads' },
  { key: 'my_messages', vi: 'Tin nhắn của tôi', en: 'My messages' },
];

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

type SelectOption = { label: string; value: string };

function elapsedTime(value: number, language: 'vi' | 'en') {
  if (!value) return '-';
  const milliseconds = value > 9999999999 ? value : value * 1000;
  const seconds = Math.max(0, Math.floor((Date.now() - milliseconds) / 1000));
  if (seconds < 60) return language === 'vi' ? `${seconds} giây` : `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return language === 'vi' ? `${minutes} phút` : `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return language === 'vi' ? `${hours} giờ` : `${hours}h`;
  const days = Math.floor(hours / 24);
  return language === 'vi' ? `${days} ngày` : `${days}d`;
}

function ForumEmpty({ message }: { message: string }) {
  return (
    <View className="flex-1 items-center justify-center bg-[#edf3ff] px-6 py-20">
      <View className="h-14 w-14 items-center justify-center rounded-full bg-[#91aab5]">
        <List color="#FFFFFF" size={30} strokeWidth={2.5} />
      </View>
      <Text className="mt-4 text-center text-base text-slate-500">{message}</Text>
    </View>
  );
}

function ForumSelectSheet({
  visible,
  title,
  options,
  selected,
  onClose,
  onSelect,
}: {
  visible: boolean;
  title: string;
  options: SelectOption[];
  selected: string;
  onClose: () => void;
  onSelect: (value: string) => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/40" onPress={onClose}>
        <Pressable className="max-h-[70%] rounded-t-[8px] bg-white px-4 pb-8 pt-3">
          <View className="mb-3 flex-row items-center justify-between border-b border-slate-200 pb-3">
            <Text className="text-base font-bold text-slate-900">{title}</Text>
            <TouchableOpacity accessibilityLabel="Đóng" onPress={onClose}>
              <X color="#475569" size={22} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator persistentScrollbar>
            {options.map(option => {
              const active = option.value === selected;
              return (
                <TouchableOpacity
                  key={option.value}
                  className="flex-row items-center border-b border-slate-100 py-4"
                  onPress={() => {
                    onSelect(option.value);
                    onClose();
                  }}
                >
                  <View className={`mr-3 h-5 w-5 rounded-full border ${active ? 'border-[#0000ff] bg-[#0000ff]' : 'border-slate-300'}`} />
                  <Text className={`text-base ${active ? 'font-bold text-[#0000ff]' : 'text-slate-700'}`}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function ForumThreadRow({ thread, language }: { thread: ForumThread; language: 'vi' | 'en' }) {
  return (
    <View className="border-b border-slate-200 bg-white px-4 py-3">
      <Text className="text-base font-bold text-slate-900">{thread.title}</Text>
      <Text className="mt-1 text-sm text-slate-500">{thread.author} · {thread.createdAt}</Text>
      {!!thread.excerpt && <Text className="mt-2 text-sm leading-5 text-slate-700">{thread.excerpt}</Text>}
      <Text className="mt-2 text-xs text-slate-500">{thread.views} {language === 'vi' ? 'lượt xem' : 'views'} · {thread.repliesCount} {language === 'vi' ? 'trả lời' : 'replies'}</Text>
    </View>
  );
}

function ForumReplyRow({ reply }: { reply: ForumReply }) {
  return (
    <View className="border-b border-slate-200 bg-white px-4 py-3">
      <Text className="font-bold text-slate-900">{reply.subject || reply.author}</Text>
      <Text className="mt-1 text-xs text-slate-500">{reply.author} · {reply.time}</Text>
      <Text className="mt-2 text-sm leading-5 text-slate-700">{reply.message}</Text>
    </View>
  );
}

export default function ForumScreen() {
  const navigation = useNavigation<NavigationProp>();
  const vm = useForumViewModel();
  const [language, setLanguage] = useState<'vi' | 'en'>('vi');
  const [activeTab, setActiveTab] = useState<ForumPageTab>('browse');
  const [memberLetter, setMemberLetter] = useState('');
  const [terms, setTerms] = useState('');
  const [searchContent, setSearchContent] = useState(false);
  const [searchScope, setSearchScope] = useState<ForumSearchScope>('threads');
  const [sectionId, setSectionId] = useState('0');
  const [sheet, setSheet] = useState<'type' | 'scope' | 'section' | null>(null);

  useEffect(() => {
    setLanguage(languageStorage.getLanguage() as 'vi' | 'en');
    vm.loadCatalog().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (activeTab === 'members') vm.loadMembers({ key: memberLetter }).catch(() => undefined);
    if (activeTab === 'my_threads') vm.loadMyThreads().catch(() => undefined);
    if (activeTab === 'my_messages') vm.loadMyMessages().catch(() => undefined);
  }, [activeTab, memberLetter]);

  const searchSections = vm.catalog?.searchSections?.length
    ? vm.catalog.searchSections
    : vm.catalog?.sections ?? [];

  useEffect(() => {
    if (sectionId === '0' && searchSections[0]) {
      setSectionId(String(searchSections[0].id));
    }
  }, [sectionId, searchSections[0]?.id]);

  const sectionOptions: SelectOption[] = searchSections.map(section => ({
    value: String(section.id),
    label: section.title,
  }));
  const typeOptions: SelectOption[] = [
    { value: '0', label: language === 'vi' ? 'Chỉ tìm kiếm chủ đề' : 'Search subjects only' },
    { value: '1', label: language === 'vi' ? 'Tìm kiếm bài viết' : 'Search posts' },
  ];
  const scopeOptions: SelectOption[] = [
    { value: 'forums', label: language === 'vi' ? 'Tìm kiếm trong diễn đàn' : 'Search in forums' },
    { value: 'messages', label: language === 'vi' ? 'Tìm kiếm trong tin nhắn' : 'Search in messages' },
    { value: 'threads', label: language === 'vi' ? 'Tìm kiếm trong chuỗi' : 'Search in threads' },
  ];

  const findLabel = (options: SelectOption[], value: string) =>
    options.find(option => option.value === value)?.label || options[0]?.label || '';

  const refreshCurrentTab = () => {
    if (activeTab === 'browse') vm.loadCatalog().catch(() => undefined);
    if (activeTab === 'members') vm.loadMembers({ key: memberLetter }).catch(() => undefined);
    if (activeTab === 'my_threads') vm.loadMyThreads().catch(() => undefined);
    if (activeTab === 'my_messages') vm.loadMyMessages().catch(() => undefined);
  };

  const submitSearch = () => {
    if (terms.trim().length < 4) {
      Alert.alert(
        language === 'vi' ? 'Từ khóa chưa hợp lệ' : 'Invalid search terms',
        language === 'vi' ? 'Mỗi cụm từ tìm kiếm phải có ít nhất 4 ký tự.' : 'Search terms must contain at least 4 characters.',
      );
      return;
    }
    vm.searchForum({
      terms,
      scope: searchScope,
      searchContent,
      sectionId: Number(sectionId) || undefined,
    }).catch(() => undefined);
  };

  const renderForum = (forum: ForumSummaryForum) => (
    <View key={forum.id} className="border-b border-slate-200 bg-white px-4 py-3">
      <Text className="text-base font-bold text-slate-900">{forum.title}</Text>
      {!!forum.description && <Text className="mt-1 text-sm text-slate-600">{forum.description}</Text>}
      <Text className="mt-2 text-xs text-slate-500">{forum.posts} {language === 'vi' ? 'bài viết' : 'posts'}</Text>
    </View>
  );

  const renderBrowse = () => {
    const sections = vm.catalog?.sections ?? [];
    if (!vm.isLoading && sections.length === 0) {
      return <ForumEmpty message={language === 'vi' ? 'Không có diễn đàn để hiển thị' : 'No forums to display'} />;
    }
    return (
      <ScrollView
        className="flex-1 bg-[#edf3ff]"
        refreshControl={<RefreshControl refreshing={vm.isLoading} onRefresh={refreshCurrentTab} />}
      >
        {sections.map(section => (
          <View key={section.id} className="mb-3 bg-white">
            <View className="bg-[#0000ff] px-4 py-3">
              <Text className="font-bold text-white">{section.title}</Text>
            </View>
            {section.forums.map(renderForum)}
          </View>
        ))}
      </ScrollView>
    );
  };

  const renderMembers = () => (
    <ScrollView
      className="flex-1 bg-white"
      refreshControl={<RefreshControl refreshing={vm.isLoading} onRefresh={refreshCurrentTab} />}
    >
      <View className="bg-[#0000ff] px-3 py-3">
        <Text className="mb-1 text-sm text-white">{language === 'vi' ? 'Danh sách người dùng' : 'User list'}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <TouchableOpacity onPress={() => setMemberLetter('')} className="mr-2">
            <Text className={`font-bold ${memberLetter === '' ? 'text-yellow-300' : 'text-white'}`}>{language === 'vi' ? 'TẤT CẢ' : 'ALL'}</Text>
          </TouchableOpacity>
          {LETTERS.map(letter => (
            <TouchableOpacity key={letter} onPress={() => setMemberLetter(letter.toLowerCase())} className="px-1">
              <Text className={`font-bold ${memberLetter === letter.toLowerCase() ? 'text-yellow-300' : 'text-white'}`}>{letter}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View className="min-w-[560px]">
          <View className="flex-row bg-[#edf1fb] px-3 py-3">
            {(language === 'vi'
              ? ['Tên', 'Đã tham gia', 'Lần truy cập trước', 'Số lượng bài viết', 'Giới thiệu']
              : ['Name', 'Joined', 'Last Seen', 'Posts Count', 'Referrals']
            ).map((label, index) => (
              <Text key={label} className={`${index === 0 ? 'w-[150px]' : 'w-[100px]'} text-xs text-slate-600`}>{label}</Text>
            ))}
          </View>
          {vm.members.map(member => (
            <TouchableOpacity
              key={member.id}
              className="flex-row border-b border-slate-100 px-3 py-3"
              onPress={() => navigation.navigate(ROUTES.USER_PROFILE, { userId: String(member.id) })}
            >
              <View className="w-[150px] flex-row items-center pr-2">
                {member.avatarUrl ? <Image source={{ uri: member.avatarUrl }} className="mr-2 h-9 w-9 rounded-full" /> : null}
                <View className="flex-1">
                  <Text className="font-bold text-slate-700" numberOfLines={2}>{member.name}</Text>
                  <Text className="mt-1 text-xs text-slate-500">{member.isAdmin ? (language === 'vi' ? 'Quản trị viên' : 'Administrator') : (language === 'vi' ? 'Đăng ký' : 'Registered')}</Text>
                </View>
              </View>
              <Text className="w-[100px] text-sm text-slate-600">{elapsedTime(member.joined, language)}</Text>
              <Text className="w-[100px] text-sm text-slate-600">{elapsedTime(member.lastSeen, language)}</Text>
              <Text className="w-[100px] text-sm text-slate-600">{member.postCount}</Text>
              <Text className="w-[100px] text-sm text-slate-600">{member.referrals}</Text>
            </TouchableOpacity>
          ))}
          {!vm.isLoading && vm.members.length === 0 && (
            <Text className="py-12 text-center text-slate-500">{language === 'vi' ? 'Không tìm thấy thành viên' : 'No members found'}</Text>
          )}
        </View>
      </ScrollView>
    </ScrollView>
  );

  const SelectField = ({ label, value, onPress }: { label: string; value: string; onPress: () => void }) => (
    <View className="mb-4">
      <Text className="mb-2 font-bold text-slate-800">{label}</Text>
      <TouchableOpacity style={{ height: 48 }} className="flex-row items-center justify-between rounded-[6px] border border-slate-300 px-3" onPress={onPress}>
        <Text className="text-slate-600">{value}</Text>
        <ChevronDown color="#64748B" size={18} />
      </TouchableOpacity>
    </View>
  );

  const renderSearchResults = () => {
    if (!vm.searchResult) return null;
    const resultCount = vm.searchResult.sections.length + vm.searchResult.threads.length + vm.searchResult.replies.length;
    if (!resultCount) return <Text className="py-8 text-center text-slate-500">{language === 'vi' ? 'Không tìm thấy kết quả' : 'No results found'}</Text>;
    return (
      <View className="mt-5 border-t border-slate-200 pt-2">
        {vm.searchResult.sections.flatMap(section => section.forums).map(renderForum)}
        {vm.searchResult.threads.map(thread => <ForumThreadRow key={thread.id} thread={thread} language={language} />)}
        {vm.searchResult.replies.map(reply => <ForumReplyRow key={reply.id} reply={reply} />)}
      </View>
    );
  };

  const renderSearch = () => (
    <ScrollView className="flex-1 bg-white px-4 py-5" keyboardShouldPersistTaps="handled">
      <Text className="mb-2 font-bold text-slate-800">{language === 'vi' ? 'Tìm kiếm thuật ngữ' : 'Search Term'}</Text>
      <TextInput
        multiline
        textAlignVertical="top"
        value={terms}
        onChangeText={setTerms}
        className="min-h-[106px] rounded-[6px] border border-slate-300 px-3 py-3 text-slate-800"
      />
      <Text className="mb-5 mt-1 text-xs text-slate-500">{language === 'vi' ? 'Nhập một hoặc nhiều cụm từ tìm kiếm, mỗi cụm từ phải có ít nhất 4 ký tự' : 'Enter one or more search terms, each must be at least 4 characters'}</Text>
      <SelectField label={language === 'vi' ? 'Loại tìm kiếm' : 'Search type'} value={findLabel(typeOptions, searchContent ? '1' : '0')} onPress={() => setSheet('type')} />
      <SelectField label={language === 'vi' ? 'Tìm kiếm ở' : 'Search in'} value={findLabel(scopeOptions, searchScope)} onPress={() => setSheet('scope')} />
      <SelectField label={language === 'vi' ? 'Phần tìm kiếm' : 'Search section'} value={findLabel(sectionOptions, sectionId)} onPress={() => setSheet('section')} />
      <TouchableOpacity style={{ height: 46 }} disabled={vm.isLoading} className="mx-auto mt-1 w-[122px] items-center justify-center rounded-[6px] bg-[#0000ff]" onPress={submitSearch}>
        {vm.isLoading ? <ActivityIndicator color="#FFFFFF" /> : <Text className="font-bold text-white">{language === 'vi' ? 'Tìm kiếm' : 'Search'}</Text>}
      </TouchableOpacity>
      {renderSearchResults()}
    </ScrollView>
  );

  const renderPersonalList = (messages: boolean) => {
    const items = messages ? vm.replies : vm.threads;
    if (!vm.isLoading && items.length === 0) {
      return <ForumEmpty message={messages ? (language === 'vi' ? 'Không có tin nhắn để hiển thị' : 'No messages to display') : (language === 'vi' ? 'Không có chủ đề để hiển thị' : 'No threads to display')} />;
    }
    return (
      <ScrollView className="flex-1 bg-[#edf3ff]" refreshControl={<RefreshControl refreshing={vm.isLoading} onRefresh={refreshCurrentTab} />}>
        {messages
          ? vm.replies.map(reply => <ForumReplyRow key={reply.id} reply={reply} />)
          : vm.threads.map(thread => <ForumThreadRow key={thread.id} thread={thread} language={language} />)}
      </ScrollView>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#edf3ff' }}>
      <FocusAwareStatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <FeedHeader />
      <View className="border-b border-slate-200 bg-white">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 10 }}>
          {FORUM_TABS.map(tab => {
            const active = activeTab === tab.key;
            return (
              <TouchableOpacity style={{ height: 52 }} key={tab.key} className="mr-1 justify-end px-3" onPress={() => setActiveTab(tab.key)}>
                <Text className={`pb-3 text-sm ${active ? 'font-bold text-slate-800' : 'text-slate-500'}`}>{language === 'vi' ? tab.vi : tab.en}</Text>
                <View className={`h-2 ${active ? 'bg-[#0000ff]' : 'bg-transparent'}`} />
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {activeTab === 'browse' && renderBrowse()}
      {activeTab === 'members' && renderMembers()}
      {activeTab === 'search' && renderSearch()}
      {activeTab === 'my_threads' && renderPersonalList(false)}
      {activeTab === 'my_messages' && renderPersonalList(true)}

      {vm.isLoading && activeTab !== 'search' && (
        <View pointerEvents="none" className="absolute inset-x-0 top-60 items-center">
          <ActivityIndicator color="#0000ff" />
        </View>
      )}
      {!!vm.error && <Text className="bg-red-50 px-4 py-2 text-center text-red-600">{vm.error}</Text>}

      <ForumSelectSheet
        visible={sheet === 'type'}
        title={language === 'vi' ? 'Loại tìm kiếm' : 'Search type'}
        options={typeOptions}
        selected={searchContent ? '1' : '0'}
        onClose={() => setSheet(null)}
        onSelect={value => setSearchContent(value === '1')}
      />
      <ForumSelectSheet
        visible={sheet === 'scope'}
        title={language === 'vi' ? 'Tìm kiếm ở' : 'Search in'}
        options={scopeOptions}
        selected={searchScope}
        onClose={() => setSheet(null)}
        onSelect={value => setSearchScope(value as ForumSearchScope)}
      />
      <ForumSelectSheet
        visible={sheet === 'section'}
        title={language === 'vi' ? 'Phần tìm kiếm' : 'Search section'}
        options={sectionOptions}
        selected={sectionId}
        onClose={() => setSheet(null)}
        onSelect={setSectionId}
      />
    </View>
  );
}

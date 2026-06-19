// Forum Screen
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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useForumViewModel } from '../../application/view-models/useForumViewModel';
import type { ForumSummarySection, ForumThread } from '../../domain/types/forum.types';
import { languageStorage } from '../../../shared-kernel/infrastructure/storage/languageStorage';
import { forumCopy } from '../../application/i18n/forumCopy';

type NavigationProp = NativeStackNavigationProp<any>;

export default function ForumScreen() {
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
    <View className="flex-1 bg-white">
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
    </View>
  );
}

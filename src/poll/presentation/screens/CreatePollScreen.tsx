// Description: Creates a poll post with question and options.
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ArrowLeft,
  BarChart3,
  Check,
  Plus,
  Trash2,
  X,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../../../navigation/types';
import { usePollViewModel } from '../../application/view-models/usePollViewModel';

type CreatePollNav = NativeStackNavigationProp<RootStackParamList>;

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 6;

function CreatePollScreen() {
  const navigation = useNavigation<CreatePollNav>();
  const { createPoll, isLoading, error } = usePollViewModel();

  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);

  const canAddMore = options.length < MAX_OPTIONS;
  const canRemove = options.length > MIN_OPTIONS;
  const canSubmit = question.trim().length > 0 && options.filter(o => o.trim()).length >= MIN_OPTIONS;

  const addOption = () => {
    if (canAddMore) {
      setOptions([...options, '']);
    }
  };

  const removeOption = (index: number) => {
    if (canRemove) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index: number, value: string) => {
    const updated = [...options];
    updated[index] = value;
    setOptions(updated);
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;

    const validOptions = options.filter(o => o.trim());
    try {
      await createPoll(question.trim(), validOptions);
      Alert.alert('Success', 'Poll created successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      // Error handled by viewmodel
    }
  };

  return (
    <SafeAreaView className="flex-1 surface-base" edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0000FF" />

      {/* Header */}
      <View className="surface-brand h-16 flex-row items-center justify-between px-4">
        <TouchableOpacity
          className="h-10 w-10 items-center justify-center rounded-full"
          activeOpacity={0.8}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text className="text-heading text-inverse">Create Poll</Text>
        <TouchableOpacity
          className={`h-10 w-16 items-center justify-center rounded-full ${
            canSubmit ? 'bg-white/20' : 'bg-transparent'
          }`}
          activeOpacity={canSubmit ? 0.8 : 1}
          onPress={handleSubmit}
          disabled={!canSubmit || isLoading}
        >
          <Text
            className={`text-title-primary ${
              canSubmit ? 'text-inverse' : 'text-inverse/50'
            }`}
          >
            {isLoading ? '...' : 'Post'}
          </Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="p-5"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Poll Icon */}
          <View className="mb-6 items-center">
            <View className="icon-chip h-16 w-16 items-center justify-center">
              <BarChart3 size={32} color="#0000FF" />
            </View>
            <Text className="mt-2 text-body-secondary">
              Create a poll to get opinions
            </Text>
          </View>

          {/* Question Input */}
          <View className="surface-card mb-4 p-4">
            <Text className="mb-2 text-label-primary text-slate-500">
              Your Question
            </Text>
            <TextInput
              className="min-h-[60px] text-body-primary"
              placeholder="What do you want to ask?"
              placeholderTextColor="#94A3B8"
              value={question}
              onChangeText={setQuestion}
              multiline
              textAlignVertical="top"
            />
          </View>

          {/* Options */}
          <View className="surface-card p-4">
            <Text className="mb-4 text-label-primary text-slate-500">
              Answer Options ({options.length}/{MAX_OPTIONS})
            </Text>

            {options.map((opt, index) => (
              <View key={index} className="mb-3 flex-row items-center">
                <View
                  className={`input-shell min-h-[50px] flex-1 flex-row items-center px-3 ${
                    opt.trim() ? 'border-blue-500' : ''
                  }`}
                >
                  <Text className="mr-3 text-caption-secondary">
                    {index + 1}.
                  </Text>
                  <TextInput
                    className="flex-1 text-body-primary"
                    placeholder={`Option ${index + 1}`}
                    placeholderTextColor="#94A3B8"
                    value={opt}
                    onChangeText={value => updateOption(index, value)}
                  />
                  {opt.trim() && (
                    <Check size={18} color="#0000FF" />
                  )}
                </View>
                {canRemove && (
                  <TouchableOpacity
                    className="ml-2 h-10 w-10 items-center justify-center rounded-full bg-red-50"
                    activeOpacity={0.8}
                    onPress={() => removeOption(index)}
                  >
                    <Trash2 size={18} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </View>
            ))}

            {/* Add Option Button */}
            {canAddMore && (
              <TouchableOpacity
                className="mt-3 flex-row items-center justify-center rounded-lg border border-dashed border-slate-300 py-3"
                activeOpacity={0.8}
                onPress={addOption}
              >
                <Plus size={18} color="#64748B" />
                <Text className="ml-2 text-caption-primary text-slate-500">
                  Add Option
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Help Text */}
          <View className="mt-4 rounded-lg bg-slate-50 p-4">
            <Text className="text-caption-secondary">
              {MIN_OPTIONS}-{MAX_OPTIONS} options required. Poll will be posted
              to your timeline for followers to vote.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Error Toast */}
      {error && (
        <View className="absolute bottom-20 left-4 right-4 rounded-xl bg-red-50 p-4">
          <Text className="text-caption-primary text-red-600">{error}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

export default CreatePollScreen;
// Description: Màn hình tạo cuộc thăm dò ý kiến với giao diện đẹp mắt.
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
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
  List,
  Trash2,
  Loader2,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../../../navigation/types';
import { usePollViewModel } from '../../application/view-models/usePollViewModel';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';

type CreatePollNav = NativeStackNavigationProp<RootStackParamList>;

const POLL_HEADER_COLOR = '#0000FF';
const MIN_OPTIONS = 2;
const MAX_OPTIONS = 6;

function CreatePollScreen() {
  const navigation = useNavigation<CreatePollNav>();
  const { createPoll, isLoading, error, clearError } = usePollViewModel();

  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [successMessage, setSuccessMessage] = useState('');

  // Simple fade animation
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const canAddMore = options.length < MAX_OPTIONS;
  const canRemove = options.length > MIN_OPTIONS;
  const canSubmit = question.trim().length > 0 && options.filter(o => o.trim()).length >= MIN_OPTIONS;
  const validOptionsCount = options.filter(o => o.trim()).length;

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
    if (!canSubmit || isLoading) return;

    const validOptions = options.filter(o => o.trim());
    try {
      await createPoll(question.trim(), validOptions);
      // Show success message first, then navigate back
      setSuccessMessage('✓ Đăng thành công!');
      setTimeout(() => {
        navigation.goBack();
      }, 1500);
    } catch (err) {
      // Error will be shown via the error toast
      clearError();
    }
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: POLL_HEADER_COLOR }}
      edges={['top']}
    >
      <FocusAwareStatusBar barStyle="light-content" backgroundColor={POLL_HEADER_COLOR} />

      {/* Header */}
      <View className="surface-brand h-16 flex-row items-center justify-between px-4">
        <TouchableOpacity
          className="h-10 w-10 items-center justify-center rounded-full active:bg-white/10"
          activeOpacity={0.8}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text className="text-heading text-inverse">Tạo cuộc thăm dò</Text>
        <TouchableOpacity
          className={`h-10 min-w-[60px] items-center justify-center rounded-full px-4 ${
            canSubmit ? 'bg-white/20' : 'bg-transparent'
          }`}
          activeOpacity={canSubmit ? 0.8 : 1}
          onPress={handleSubmit}
          disabled={!canSubmit || isLoading}
        >
          {isLoading ? (
            <View className="h-5 w-5 items-center justify-center">
              <Loader2 size={18} color="#FFFFFF" className="animate-spin" />
            </View>
          ) : (
            <Text
              className={`text-title-primary font-semibold ${
                canSubmit ? 'text-inverse' : 'text-inverse/40'
              }`}
            >
              Đăng
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        className="flex-1 surface-base"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="pb-8"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            style={{
              padding: 20,
              opacity: fadeAnim,
            }}
          >
            {/* Poll Icon Header */}
            <View className="mb-6 items-center">
              <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-blue-50">
                <BarChart3 size={40} color="#0000FF" />
              </View>
              <Text className="text-heading">Hỏi ý kiến cộng đồng</Text>
              <Text className="mt-1 text-body-secondary">
                Tạo cuộc thăm dò để thu thập ý kiến từ bạn bè
              </Text>
            </View>

            {/* Question Input Card */}
            <View className="mb-5 overflow-hidden rounded-2xl bg-white">
              <View className="border-b border-slate-100 bg-gradient-to-r from-blue-50 to-white px-5 py-4">
                <View className="flex-row items-center">
                  <View className="mr-3 h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                    <List size={16} color="#0000FF" />
                  </View>
                  <Text className="text-label-primary font-semibold text-slate-700">
                    Câu hỏi của bạn
                  </Text>
                </View>
              </View>
              <TextInput
                className="mx-5 my-4 min-h-[80px] text-body-primary"
                placeholder="Bạn muốn hỏi gì?"
                placeholderTextColor="#94A3B8"
                value={question}
                onChangeText={setQuestion}
                multiline
                textAlignVertical="top"
              />
            </View>

            {/* Options Card */}
            <View className="overflow-hidden rounded-2xl bg-white">
              <View className="border-b border-slate-100 bg-gradient-to-r from-blue-50 to-white px-5 py-4">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <View className="mr-3 h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                      <Check size={16} color="#0000FF" />
                    </View>
                    <Text className="text-label-primary font-semibold text-slate-700">
                      Phương án trả lời
                    </Text>
                  </View>
                  <View className="rounded-full bg-blue-100 px-3 py-1">
                    <Text className="text-caption-primary font-medium text-blue-600">
                      {validOptionsCount}/{MAX_OPTIONS}
                    </Text>
                  </View>
                </View>
              </View>

              <View className="p-4">
                {options.map((opt, index) => (
                  <View key={index} className="mb-3">
                    <View
                      className={`flex-row items-center rounded-xl border-2 px-4 py-3 transition-colors ${
                        opt.trim()
                          ? 'border-blue-500 bg-blue-50/50'
                          : 'border-slate-200 bg-slate-50'
                      }`}
                    >
                      <View
                        className={`mr-3 flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                          opt.trim()
                            ? 'bg-blue-500 text-white'
                            : 'bg-slate-200 text-slate-500'
                        }`}
                      >
                        {opt.trim() ? (
                          <Check size={16} color="#FFFFFF" />
                        ) : (
                          <Text>{index + 1}</Text>
                        )}
                      </View>
                      <TextInput
                        className="flex-1 text-body-primary"
                        placeholder={`Phương án ${index + 1}`}
                        placeholderTextColor="#94A3B8"
                        value={opt}
                        onChangeText={value => updateOption(index, value)}
                      />
                    </View>
                    {canRemove && (
                      <TouchableOpacity
                        className="mt-2 flex-row items-center"
                        activeOpacity={0.7}
                        onPress={() => removeOption(index)}
                      >
                        <Trash2 size={14} color="#EF4444" />
                        <Text className="ml-1 text-caption-secondary text-red-500">
                          Xóa phương án
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}

                {/* Add Option Button */}
                {canAddMore && (
                  <TouchableOpacity
                    className="mt-2 flex-row items-center justify-center rounded-xl border-2 border-dashed border-blue-300 bg-blue-50/30 py-4"
                    activeOpacity={0.8}
                    onPress={addOption}
                  >
                    <Plus size={20} color="#0000FF" />
                    <Text className="ml-2 text-label-primary font-medium text-blue-600">
                      Thêm phương án
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Help Text Card */}
            <View className="mt-5 flex-row items-start rounded-2xl bg-amber-50 p-4">
              <View className="mr-3 h-6 w-6 items-center justify-center rounded-full bg-amber-200">
                <Text className="text-xs">💡</Text>
              </View>
              <View className="flex-1">
                <Text className="text-label-primary font-medium text-amber-800">
                  Mẹo tạo cuộc thăm dò hiệu quả
                </Text>
                <Text className="mt-1 text-caption-secondary text-amber-700">
                  Cần tối thiểu {MIN_OPTIONS} phương án trả lời. Bạn có thể thêm tối đa {MAX_OPTIONS} phương án.
                  Cuộc thăm dò sẽ được đăng lên bảng tin để bạn bè bình chọn.
                </Text>
              </View>
            </View>

            {/* Progress Indicator */}
            <View className="mt-6 items-center">
              <View className="mb-2 h-2 w-48 overflow-hidden rounded-full bg-slate-200">
                <View
                  className="h-full rounded-full bg-blue-500"
                  style={{
                    width: `${Math.min(100, (validOptionsCount / MIN_OPTIONS) * 50 + (question.trim() ? 50 : 0))}%`,
                  }}
                />
              </View>
              <Text className="text-caption-secondary">
                {canSubmit ? '✓ Sẵn sàng đăng' : 'Điền đầy đủ thông tin để tiếp tục'}
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Success Toast */}
      {successMessage ? (
        <View className="absolute bottom-6 left-4 right-4 items-center">
          <View className="flex-row items-center rounded-2xl bg-green-500 px-5 py-4 shadow-lg">
            <View className="mr-3 h-8 w-8 items-center justify-center rounded-full bg-white/20">
              <Check size={18} color="#FFFFFF" />
            </View>
            <Text className="flex-1 text-title-primary text-white font-semibold">
              {successMessage}
            </Text>
          </View>
        </View>
      ) : null}

      {/* Error Toast */}
      {error && (
        <View className="absolute bottom-6 left-4 right-4 items-center">
          <View className="flex-row items-center rounded-2xl bg-red-500 px-5 py-4">
            <View className="mr-3 h-8 w-8 items-center justify-center rounded-full bg-white/20">
              <Text>⚠️</Text>
            </View>
            <Text className="flex-1 text-title-primary text-white">{error}</Text>
            <TouchableOpacity onPress={clearError} className="ml-2">
              <Text className="text-white/80">✕</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

export default CreatePollScreen;

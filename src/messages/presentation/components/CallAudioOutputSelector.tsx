// Description: Displays explicit earpiece, speaker, and call-output mute choices.
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ear, Volume2, VolumeX } from 'lucide-react-native';
import type { CallAudioOutputMode } from '../../application/livekit/callAudioRouting';

type AudioOutputChoice = {
  mode: CallAudioOutputMode;
  label: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
};

const AUDIO_OUTPUT_CHOICES: AudioOutputChoice[] = [
  { mode: 'earpiece', label: 'Loa trong', icon: Ear },
  { mode: 'speaker', label: 'Loa ngoài', icon: Volume2 },
  { mode: 'muted', label: 'Tắt loa', icon: VolumeX },
];

export function CallAudioOutputSelector({
  mode,
  onChange,
}: {
  mode: CallAudioOutputMode;
  onChange: (mode: CallAudioOutputMode) => void;
}) {
  return (
    <View className="mb-3 flex-row items-center gap-1 rounded-2xl bg-slate-950/95 p-1.5">
      {AUDIO_OUTPUT_CHOICES.map(choice => {
        const selected = choice.mode === mode;
        const Icon = choice.icon;
        return (
          <TouchableOpacity
            key={choice.mode}
            className={`min-h-[46px] flex-row items-center justify-center rounded-xl px-3 ${
              selected ? 'bg-blue-600' : 'bg-slate-800'
            }`}
            activeOpacity={0.82}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={choice.label}
            onPress={() => onChange(choice.mode)}
          >
            <Icon size={18} color="#ffffff" />
            <Text className="ml-1.5 text-xs font-bold text-white">
              {choice.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Music2, Pause, Play } from 'lucide-react-native';
import VideoPlayer from 'react-native-video';
import { formatAudioDuration } from '../../application/utils/audioFiles';
import { AudioWaveform } from './AudioWaveform';

type Props = {
  uri: string;
  pending?: boolean;
  compact?: boolean;
  accentColor?: string;
};

export function AudioPlayer({
  uri,
  pending = false,
  compact = false,
  accentColor = '#2563eb',
}: Props) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [durationMs, setDurationMs] = useState(0);
  const [positionMs, setPositionMs] = useState(0);

  const togglePlayback = useCallback(() => {
    if (!pending) setIsPlaying(current => !current);
  }, [pending]);

  const progress =
    durationMs > 0 ? Math.min(1, Math.max(0, positionMs / durationMs)) : 0;

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      <VideoPlayer
        source={{ uri }}
        paused={!isPlaying}
        onLoad={event => setDurationMs(event.duration * 1000)}
        onProgress={event => setPositionMs(event.currentTime * 1000)}
        onEnd={() => {
          setIsPlaying(false);
          setPositionMs(0);
        }}
        style={styles.hiddenPlayer}
      />
      <TouchableOpacity
        activeOpacity={0.75}
        disabled={pending}
        onPress={togglePlayback}
        style={[styles.playButton, { backgroundColor: `${accentColor}18` }]}
      >
        {pending ? (
          <Music2 size={17} color={accentColor} />
        ) : isPlaying ? (
          <Pause size={17} color={accentColor} fill={accentColor} />
        ) : (
          <Play size={17} color={accentColor} fill={accentColor} />
        )}
      </TouchableOpacity>
      <View style={styles.body}>
        <AudioWaveform
          progress={progress}
          color={accentColor}
          inactiveColor="#bfdbfe"
          height={compact ? 18 : 22}
          barCount={compact ? 22 : 28}
        />
        <Text style={styles.duration}>
          {pending ? 'Đang gửi...' : formatAudioDuration(durationMs || positionMs)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minWidth: 190,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  containerCompact: {
    minWidth: 150,
    paddingVertical: 7,
  },
  hiddenPlayer: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  playButton: {
    height: 34,
    width: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
  },
  body: {
    marginLeft: 9,
    flex: 1,
  },
  duration: {
    marginTop: 4,
    color: '#64748b',
    fontSize: 11,
  },
});

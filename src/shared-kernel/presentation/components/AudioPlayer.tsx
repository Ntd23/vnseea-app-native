import { APP_BRAND_COLOR } from '../theme/appColors';
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
  accentColor = APP_BRAND_COLOR,
}: Props) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [durationMs, setDurationMs] = useState(0);
  const [positionMs, setPositionMs] = useState(0);
  const canPlay = Boolean(uri) && !pending;
  const shouldMountPlayer = Boolean(uri) && (isPlaying || positionMs > 0);

  const togglePlayback = useCallback(() => {
    if (canPlay) setIsPlaying(current => !current);
  }, [canPlay]);

  const progress =
    durationMs > 0 ? Math.min(1, Math.max(0, positionMs / durationMs)) : 0;
  const displayDuration = durationMs || positionMs;

  return (
    <View
      style={[
        styles.container,
        compact ? styles.containerCompact : styles.containerRegular,
      ]}
    >
      {shouldMountPlayer ? (
        <VideoPlayer
          source={{ uri }}
          paused={!isPlaying}
          onLoad={event => setDurationMs(event.duration * 1000)}
          onProgress={event => setPositionMs(event.currentTime * 1000)}
          onEnd={() => {
            setIsPlaying(false);
            setPositionMs(0);
          }}
          onError={() => {
            setIsPlaying(false);
            setPositionMs(0);
          }}
          style={styles.hiddenPlayer}
        />
      ) : null}

      {/* Blue circular Play/Pause Button */}
      <TouchableOpacity
        activeOpacity={0.85}
        disabled={!canPlay}
        onPress={togglePlayback}
        style={[styles.playButton, { backgroundColor: accentColor }]}
      >
        {pending ? (
          <Music2 size={15} color="#ffffff" />
        ) : isPlaying ? (
          <Pause size={15} color="#ffffff" fill="#ffffff" />
        ) : (
          <Play size={15} color="#ffffff" fill="#ffffff" style={{ marginLeft: 2 }} />
        )}
      </TouchableOpacity>

      {/* Row containing waveform and duration */}
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Music2 size={12} color="#64748B" />
          <Text style={styles.title} numberOfLines={1}>
            Tin nhắn thoại
          </Text>
        </View>
        <View style={styles.waveformContainer}>
          <AudioWaveform
            progress={progress}
            color={accentColor}
            inactiveColor="#CBD5E1"
            height={compact ? 18 : 22}
            barCount={compact ? 22 : 28}
          />
        </View>
        <Text style={styles.duration}>
          {pending ? '...' : formatAudioDuration(displayDuration)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  containerCompact: {
    width: 230,
  },
  containerRegular: {
    width: 270,
  },
  hiddenPlayer: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  playButton: {
    height: 38,
    width: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
  },
  body: {
    marginLeft: 10,
    flex: 1,
    justifyContent: 'center',
  },
  titleRow: {
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    marginLeft: 4,
    color: '#475569',
    fontSize: 11,
    fontWeight: '700',
  },
  waveformContainer: {
    height: 22,
  },
  duration: {
    marginTop: 3,
    color: '#64748B', // Slate-500
    fontSize: 11,
    fontWeight: '600',
  },
});

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
  accentColor = '#0084FF',
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
    <View style={styles.container}>
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

      {/* Blue circular Play/Pause Button */}
      <TouchableOpacity
        activeOpacity={0.85}
        disabled={pending}
        onPress={togglePlayback}
        style={styles.playButton}
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
        <View style={styles.waveformContainer}>
          <AudioWaveform
            progress={progress}
            color="#09090b" // Zinc-900 / black
            inactiveColor="#CBD5E1" // Slate-300
            height={20}
            barCount={20}
          />
        </View>
        <Text style={styles.duration}>
          {pending ? '...' : formatAudioDuration(durationMs || positionMs)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 230,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: '#F1F5F9', // light grey-purple
    paddingHorizontal: 12,
    paddingVertical: 8,
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
    backgroundColor: '#0084FF', // Messenger blue
  },
  body: {
    marginLeft: 10,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  waveformContainer: {
    flex: 1,
    marginRight: 8,
  },
  duration: {
    color: '#64748B', // Slate-500
    fontSize: 11,
    fontWeight: '600',
  },
});

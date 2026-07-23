import { APP_BRAND_COLOR } from '../../../shared-kernel/presentation/theme/appColors';
import React, { memo, useMemo } from 'react';
import { Image, Text, Pressable, View } from 'react-native';
import { Play } from 'lucide-react-native';
import type { StoriesListRow } from '../../application/view-models/useStoriesListViewModel';
import { formatStoriesRelativeTime, type StoriesCopy } from '../../application/i18n/storiesCopy';
import { useStoryCoverImageUri } from '../hooks/useStoryCoverImageUri';

interface StoryGridCellProps {
  row: StoriesListRow;
  copy: StoriesCopy;
  onPress: (row: StoriesListRow) => void;
}

function StoryGridCellImpl({ row, copy, onPress }: StoryGridCellProps) {
  const timeLabel = useMemo(
    () => formatStoriesRelativeTime(row.postedAt, copy),
    [row.postedAt, copy],
  );

  const showVideoBadge = row.isVideo;
  const coverImageUri = useStoryCoverImageUri({
    segment: row.segment,
    fallbackUri: row.coverUrl || row.publisher.avatarUrl,
  });

  return (
    <Pressable
      onPress={() => onPress(row)}
      style={{ flex: 1 }}
      accessibilityRole="button"
      accessibilityLabel={`${row.publisher.name} ${timeLabel}`}
    >
      {({ pressed }) => (
        <View
          style={{
            transform: [{ scale: pressed ? 0.96 : 1 }],
            borderRadius: 22,
            overflow: 'hidden',
            backgroundColor: '#1E293B',
            aspectRatio: 3 / 4,
            position: 'relative',
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.08)',
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.12,
            shadowRadius: 12,
            elevation: 4,
          }}
        >
          {/* Cover Media or Premium Mesh Gradient Fallback */}
          {coverImageUri ? (
            <Image
              source={{ uri: coverImageUri }}
              style={{ width: '100%', height: '100%', position: 'absolute' }}
              resizeMode="cover"
            />
          ) : (
            // Premium Glassmorphic Mesh Gradient Background
            <View style={{ width: '100%', height: '100%', position: 'absolute', backgroundColor: '#0B1329', overflow: 'hidden' }}>
              {/* Mesh Orb 1 */}
              <View
                style={{
                  position: 'absolute',
                  top: -20,
                  left: -20,
                  width: 140,
                  height: 140,
                  borderRadius: 70,
                  backgroundColor: APP_BRAND_COLOR,
                  opacity: 0.35,
                }}
              />
              {/* Mesh Orb 2 */}
              <View
                style={{
                  position: 'absolute',
                  bottom: -30,
                  right: -30,
                  width: 160,
                  height: 160,
                  borderRadius: 80,
                  backgroundColor: '#06B6D4',
                  opacity: 0.25,
                }}
              />
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1.2 }}>
                  {copy.timeJustNow}
                </Text>
              </View>
            </View>
          )}

          {/* Soft Vignette Shadows for Text Readability */}
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.15)' }} />
          <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%', backgroundColor: 'rgba(0, 0, 0, 0.45)' }} />

          {/* Video Play Badge */}
          {showVideoBadge ? (
            <View
              style={{
                position: 'absolute',
                right: 12,
                top: 12,
                height: 28,
                width: 28,
                borderRadius: 14,
                backgroundColor: 'rgba(255, 255, 255, 0.25)',
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.35)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Play size={12} color="#FFFFFF" fill="#FFFFFF" />
            </View>
          ) : null}

          {/* Unseen badge accent dot */}
          {row.hasUnseen && !row.isViewed ? (
            <View
              style={{
                position: 'absolute',
                right: 12,
                top: 12,
                height: 10,
                width: 10,
                borderRadius: 5,
                backgroundColor: APP_BRAND_COLOR,
                borderWidth: 1.5,
                borderColor: '#FFFFFF',
              }}
            />
          ) : null}

          {/* Publisher Details and Metadata */}
          <View
            style={{
              position: 'absolute',
              bottom: 12,
              left: 12,
              right: 12,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            {/* Avatar container */}
            <View
              style={{
                height: 32,
                width: 32,
                borderRadius: 16,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#FFFFFF',
                borderWidth: 2,
                borderColor: (row.hasUnseen && !row.isViewed) ? APP_BRAND_COLOR : 'rgba(255, 255, 255, 0.6)',
                padding: 1.5,
              }}
            >
              {row.publisher.avatarUrl ? (
                <Image
                  source={{ uri: row.publisher.avatarUrl }}
                  style={{ width: '100%', height: '100%', borderRadius: 999 }}
                  resizeMode="cover"
                />
              ) : (
                <View style={{ width: '100%', height: '100%', borderRadius: 999, backgroundColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#475569' }}>
                    {row.publisher.name?.charAt(0)?.toUpperCase() ?? '?'}
                  </Text>
                </View>
              )}
            </View>

            {/* Typography */}
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '800',
                  color: '#FFFFFF',
                  textShadowColor: 'rgba(0, 0, 0, 0.4)',
                  textShadowOffset: { width: 0, height: 1 },
                  textShadowRadius: 2,
                }}
                numberOfLines={1}
              >
                {row.publisher.name || row.publisher.username}
              </Text>
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: '600',
                  color: 'rgba(255, 255, 255, 0.85)',
                  marginTop: 1,
                  textShadowColor: 'rgba(0, 0, 0, 0.4)',
                  textShadowOffset: { width: 0, height: 1 },
                  textShadowRadius: 2,
                }}
                numberOfLines={1}
              >
                {timeLabel}
              </Text>
            </View>

            {/* Segment count badge */}
            {row.segmentCount > 1 ? (
              <View
                style={{
                  marginLeft: 6,
                  height: 18,
                  minWidth: 18,
                  borderRadius: 9,
                  backgroundColor: 'rgba(255, 255, 255, 0.25)',
                  borderWidth: 1,
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: 4,
                }}
              >
                <Text style={{ fontSize: 9, fontWeight: '800', color: '#FFFFFF' }}>
                  {row.segmentCount}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      )}
    </Pressable>
  );
}

const StoryGridCell = memo(StoryGridCellImpl);
export default StoryGridCell;

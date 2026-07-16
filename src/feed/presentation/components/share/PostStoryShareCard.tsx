import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Play } from 'lucide-react-native';
import type { PostStoryCardModel } from '../../../application/sharing/postStoryShare';

const FALLBACK_AVATAR = 'https://cdn-icons-png.flaticon.com/512/847/847969.png';

interface PostStoryShareCardProps {
  model: PostStoryCardModel;
  forceMediaFallback?: boolean;
  onReady?: () => void;
}

export const PostStoryShareCard = forwardRef<View, PostStoryShareCardProps>(
  function PostStoryShareCard(
    { model, forceMediaFallback = false, onReady },
    forwardedRef,
  ) {
    const viewRef = useRef<View | null>(null);
    const [mediaFailed, setMediaFailed] = useState(false);
    const canShowMedia =
      Boolean(model.mediaUrl) && !mediaFailed && !forceMediaFallback;

    useImperativeHandle(forwardedRef, () => viewRef.current as View);

    useEffect(() => {
      setMediaFailed(false);
      if (!model.mediaUrl || forceMediaFallback) onReady?.();
    }, [forceMediaFallback, model.mediaUrl, onReady]);

    return (
      <View
        ref={viewRef}
        collapsable={false}
        style={styles.card}
        testID="post-story-share-card"
      >
        {canShowMedia ? (
          <Image
            source={{ uri: model.mediaUrl }}
            resizeMode="cover"
            style={StyleSheet.absoluteFill}
            onLoad={onReady}
            onError={() => {
              setMediaFailed(true);
              onReady?.();
            }}
          />
        ) : null}
        <View style={styles.scrim} />

        <View style={styles.header}>
          <Image
            source={{ uri: model.publisherAvatar || FALLBACK_AVATAR }}
            style={styles.avatar}
          />
          <View style={styles.publisherCopy}>
            <Text style={styles.publisherName} numberOfLines={1}>
              {model.publisherName}
            </Text>
            <Text style={styles.kindLabel}>{model.kindLabel}</Text>
          </View>
          <View style={styles.brandBadge}>
            <Text style={styles.brandBadgeText}>VNSEEA</Text>
          </View>
        </View>

        <View style={styles.content}>
          {model.showPlayIcon ? (
            <View style={styles.playButton}>
              <Play size={30} color="#ffffff" fill="#ffffff" />
            </View>
          ) : null}
          <Text style={styles.title} numberOfLines={5}>
            {model.title}
          </Text>
          {model.body ? (
            <Text style={styles.body} numberOfLines={3}>
              {model.body}
            </Text>
          ) : null}
          {model.options.length > 0 ? (
            <View style={styles.pollOptions}>
              {model.options.map(option => (
                <View key={option} style={styles.pollOption}>
                  <Text style={styles.pollOptionText} numberOfLines={1}>
                    {option}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        <View style={styles.footer}>
          {model.note ? (
            <Text style={styles.note} numberOfLines={4}>
              {model.note}
            </Text>
          ) : null}
          <Text style={styles.footerLink}>Xem bài viết trên VNSEEA</Text>
        </View>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  card: {
    aspectRatio: 9 / 16,
    width: '100%',
    overflow: 'hidden',
    borderRadius: 8,
    backgroundColor: '#17175f',
  },
  scrim: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(10, 15, 45, 0.42)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 22,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    borderColor: '#ffffff',
    backgroundColor: '#e2e8f0',
  },
  publisherCopy: {
    flex: 1,
    marginLeft: 10,
  },
  publisherName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  kindLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  brandBadge: {
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  brandBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  playButton: {
    alignSelf: 'center',
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.48)',
    marginBottom: 18,
  },
  title: {
    color: '#ffffff',
    fontSize: 31,
    lineHeight: 38,
    fontWeight: '900',
    textAlign: 'center',
  },
  body: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 10,
  },
  pollOptions: {
    marginTop: 18,
    gap: 8,
  },
  pollOption: {
    minHeight: 42,
    borderRadius: 8,
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 14,
  },
  pollOptionText: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: 22,
    paddingBottom: 24,
  },
  note: {
    color: '#ffffff',
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    marginBottom: 10,
  },
  footerLink: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 12,
    fontWeight: '800',
  },
});

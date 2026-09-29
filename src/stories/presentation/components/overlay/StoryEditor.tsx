// Description: Full-screen Facebook-style story editor: playing media, a tool rail, draggable overlays and share controls.
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import VideoPlayer from 'react-native-video';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AtSign,
  ChevronLeft,
  Globe2,
  Link2,
  Lock,
  Sparkles,
  Sticker,
  Trash2,
  Type,
  Users,
} from 'lucide-react-native';
import FocusAwareStatusBar from '../../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import { showSnackbar } from '../../../../shared-kernel/presentation/components/Snackbar';
import { useAppLanguage } from '../../../../shared-kernel/application/hooks/useAppLanguage';
import type { ContentAudience } from '../../../../shared-kernel/domain/types/contentAudience';
import {
  STORY_FILTER_IDS,
  STORY_OVERLAY_MAX_ITEMS,
  addStoryOverlayItem,
  canAddStoryOverlayItem,
  createStoryOverlayItemId,
  nextStoryOverlayPlacement,
  placeStoryOverlayItem,
  removeStoryOverlayItem,
  replaceStoryOverlayItem,
  setStoryOverlayFilter,
} from '../../../application/overlay/storyOverlay';
import type { StoryMentionCandidate } from '../../../application/view-models/useStoryMentionSearch';
import type {
  StoryMediaUpload,
  StoryOverlay,
  StoryOverlayItem,
} from '../../../domain/types/stories.types';
import {
  DraggableStoryOverlayItem,
  STORY_TRASH_CENTER_Y_RATIO,
  type StoryOverlayPlacementChange,
} from './DraggableStoryOverlayItem';
import { STORY_EDITOR_COPY } from './storyEditorCopy';
import { STORY_FILTER_SPECS, StoryFilterLayer } from './StoryFilterLayer';
import { fitStoryFrame } from './storyFrame';
import { StoryLinkModal } from './StoryLinkModal';
import { StoryMentionSheet } from './StoryMentionSheet';
import { StoryStickerSheet } from './StoryStickerSheet';
import { StoryTextEditorModal, type StoryTextValue } from './StoryTextEditorModal';

type StoryEditorTool = 'sticker' | 'text' | 'filter' | 'mention' | 'link';

const TOOL_ICONS: Record<StoryEditorTool, React.ComponentType<{ size: number; color: string }>> = {
  sticker: Sticker,
  text: Type,
  filter: Sparkles,
  mention: AtSign,
  link: Link2,
};
// Music is hidden until VNSEEA has a licensed music library.
const TOOL_ORDER: StoryEditorTool[] = ['sticker', 'text', 'mention', 'filter', 'link'];

const AUDIENCE_ICONS: Record<ContentAudience, React.ComponentType<{ size: number; color: string }>> = {
  public: Globe2,
  friends: Users,
  followers: Users,
  only_me: Lock,
};

export type StoryEditorProps = {
  media: StoryMediaUpload;
  overlay: StoryOverlay;
  onChangeOverlay: React.Dispatch<React.SetStateAction<StoryOverlay>>;
  audience: ContentAudience;
  audienceLabel: string;
  onPressAudience: () => void;
  isSharing: boolean;
  onShare: () => void;
  onBack: () => void;
  errorMessage?: string | null;
};

export function StoryEditor({
  media,
  overlay,
  onChangeOverlay,
  audience,
  audienceLabel,
  onPressAudience,
  isSharing,
  onShare,
  onBack,
  errorMessage,
}: StoryEditorProps) {
  const language = useAppLanguage();
  const copy = STORY_EDITOR_COPY[language];
  const insets = useSafeAreaInsets();
  const [canvas, setCanvas] = useState({ width: 0, height: 0 });
  const frame = useMemo(
    () => fitStoryFrame(canvas.width, canvas.height),
    [canvas.height, canvas.width],
  );
  const [activeTool, setActiveTool] = useState<StoryEditorTool | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isOverTrash, setIsOverTrash] = useState(false);

  const editingItem = overlay.items.find(item => item.id === editingItemId);
  const closeTool = useCallback(() => {
    setActiveTool(null);
    setEditingItemId(null);
  }, []);

  const addItem = useCallback(
    (
      build: (id: string, placement: ReturnType<typeof nextStoryOverlayPlacement>) => StoryOverlayItem,
    ) => {
      onChangeOverlay(current =>
        addStoryOverlayItem(
          current,
          build(createStoryOverlayItemId(), nextStoryOverlayPlacement(current)),
        ),
      );
    },
    [onChangeOverlay],
  );

  const openTool = useCallback(
    (tool: StoryEditorTool) => {
      if (tool !== 'filter' && !canAddStoryOverlayItem(overlay)) {
        showSnackbar({
          message: copy.maxItems(STORY_OVERLAY_MAX_ITEMS),
          type: 'warning',
        });
        return;
      }
      setEditingItemId(null);
      setActiveTool(tool);
    },
    [copy, overlay],
  );

  const handleTextDone = useCallback(
    (value: StoryTextValue) => {
      const editing = editingItem?.kind === 'text' ? editingItem : null;
      if (editing) {
        onChangeOverlay(current =>
          value.text
            ? replaceStoryOverlayItem(current, { ...editing, ...value })
            : removeStoryOverlayItem(current, editing.id),
        );
      } else if (value.text) {
        addItem((id, placement) => ({ ...placement, id, kind: 'text', ...value }));
      }
      closeTool();
    },
    [addItem, closeTool, editingItem, onChangeOverlay],
  );

  const handleLinkDone = useCallback(
    (url: string) => {
      const editing = editingItem?.kind === 'link' ? editingItem : null;
      if (editing) {
        onChangeOverlay(current =>
          replaceStoryOverlayItem(current, { ...editing, url }),
        );
      } else {
        addItem((id, placement) => ({ ...placement, id, kind: 'link', url }));
      }
      closeTool();
    },
    [addItem, closeTool, editingItem, onChangeOverlay],
  );

  const handleStickerPick = useCallback(
    (emoji: string) => {
      addItem((id, placement) => ({ ...placement, id, kind: 'sticker', emoji }));
      closeTool();
    },
    [addItem, closeTool],
  );

  const handleMentionPick = useCallback(
    (candidate: StoryMentionCandidate) => {
      addItem((id, placement) => ({
        ...placement,
        id,
        kind: 'mention',
        userId: candidate.userId,
        username: candidate.username,
        name: candidate.name,
      }));
      closeTool();
    },
    [addItem, closeTool],
  );

  const handleEditItem = useCallback(
    (id: string) => {
      const item = overlay.items.find(current => current.id === id);
      if (item?.kind === 'text' || item?.kind === 'link') {
        setEditingItemId(id);
        setActiveTool(item.kind);
      }
    },
    [overlay.items],
  );

  const handlePlaceItem = useCallback(
    (id: string, placement: StoryOverlayPlacementChange) => {
      onChangeOverlay(current => placeStoryOverlayItem(current, id, placement));
    },
    [onChangeOverlay],
  );

  const handleDeleteItem = useCallback(
    (id: string) => {
      onChangeOverlay(current => removeStoryOverlayItem(current, id));
    },
    [onChangeOverlay],
  );

  const AudienceIcon = AUDIENCE_ICONS[audience] ?? Globe2;
  const showChrome = !isDragging;

  return (
    <View style={[styles.root, { paddingTop: insets.top + 6 }]}>
      <FocusAwareStatusBar barStyle="light-content" backgroundColor="#000000" />
      <View
        style={styles.canvas}
        onLayout={event => {
          const { width, height } = event.nativeEvent.layout;
          setCanvas({ width, height });
        }}
      >
        {media.fileType === 'video' ? (
          <VideoPlayer
            source={{ uri: media.uri }}
            style={StyleSheet.absoluteFill}
            resizeMode="contain"
            repeat
            playInBackground={false}
          />
        ) : (
          <Image
            source={{ uri: media.uri }}
            style={StyleSheet.absoluteFill}
            resizeMode="contain"
          />
        )}

        {frame.width > 0 ? (
          <View
            pointerEvents="box-none"
            style={[
              styles.frame,
              { left: frame.left, top: frame.top, width: frame.width, height: frame.height },
            ]}
          >
            <StoryFilterLayer filter={overlay.filter} idSuffix="editor" />
            {isDragging ? (
              <View
                pointerEvents="none"
                style={[
                  styles.trash,
                  { top: frame.height * STORY_TRASH_CENTER_Y_RATIO - 28 },
                  isOverTrash && styles.trashActive,
                ]}
              >
                <Trash2 size={24} color="#FFFFFF" />
              </View>
            ) : null}
            {overlay.items.map(item => (
              <DraggableStoryOverlayItem
                key={item.id}
                item={item}
                frame={frame}
                onChange={handlePlaceItem}
                onDelete={handleDeleteItem}
                onEdit={handleEditItem}
                onDragChange={setIsDragging}
                onTrashHoverChange={setIsOverTrash}
              />
            ))}
            {isDragging ? (
              <Text pointerEvents="none" style={styles.trashHint}>
                {copy.dragToDelete}
              </Text>
            ) : null}
          </View>
        ) : null}

        {showChrome ? (
          <>
            <Pressable
              accessibilityRole="button"
              onPress={onBack}
              hitSlop={8}
              style={styles.backButton}
            >
              <ChevronLeft size={28} color="#FFFFFF" />
            </Pressable>

            <View style={styles.toolRail}>
              {TOOL_ORDER.map(tool => {
                const Icon = TOOL_ICONS[tool];
                return (
                  <Pressable
                    key={tool}
                    accessibilityRole="button"
                    accessibilityLabel={copy.tools[tool]}
                    onPress={() => openTool(tool)}
                    style={styles.toolRow}
                  >
                    <Text style={styles.toolLabel}>{copy.tools[tool]}</Text>
                    <View
                      style={[styles.toolIcon, activeTool === tool && styles.toolIconActive]}
                    >
                      <Icon size={24} color="#FFFFFF" />
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : null}

        {activeTool === 'filter' ? (
          <View style={styles.filterStrip}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterList}
            >
              {STORY_FILTER_IDS.map(filter => (
                <Pressable
                  key={filter}
                  accessibilityRole="button"
                  onPress={() =>
                    onChangeOverlay(current => setStoryOverlayFilter(current, filter))
                  }
                  style={styles.filterOption}
                >
                  <View
                    style={[
                      styles.filterSwatch,
                      { backgroundColor: STORY_FILTER_SPECS[filter].swatch },
                      overlay.filter === filter && styles.filterSwatchSelected,
                    ]}
                  />
                  <Text style={styles.filterLabel}>{copy.filters[filter]}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable onPress={closeTool} hitSlop={8} style={styles.filterDone}>
              <Text style={styles.filterDoneText}>{copy.done}</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 10 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy.audienceTitle}
          onPress={onPressAudience}
          disabled={isSharing}
          style={styles.audiencePill}
        >
          <AudienceIcon size={20} color="#FFFFFF" />
          <Text style={styles.audienceText}>{audienceLabel}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={onShare}
          disabled={isSharing}
          style={[styles.shareButton, isSharing && styles.shareButtonBusy]}
        >
          {isSharing ? (
            <ActivityIndicator color="#111827" />
          ) : (
            <Text style={styles.shareText}>{copy.share}</Text>
          )}
        </Pressable>
      </View>

      <StoryTextEditorModal
        visible={activeTool === 'text'}
        initialValue={
          editingItem?.kind === 'text'
            ? {
                text: editingItem.text,
                color: editingItem.color,
                textStyle: editingItem.textStyle,
              }
            : undefined
        }
        copy={copy}
        onDone={handleTextDone}
      />
      <StoryStickerSheet
        visible={activeTool === 'sticker'}
        copy={copy}
        onPick={handleStickerPick}
        onClose={closeTool}
      />
      <StoryMentionSheet
        visible={activeTool === 'mention'}
        copy={copy}
        onPick={handleMentionPick}
        onClose={closeTool}
      />
      <StoryLinkModal
        visible={activeTool === 'link'}
        initialUrl={editingItem?.kind === 'link' ? editingItem.url : undefined}
        copy={copy}
        onDone={handleLinkDone}
        onClose={closeTool}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },
  canvas: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: 22,
    backgroundColor: '#111111',
  },
  frame: {
    position: 'absolute',
  },
  backButton: {
    position: 'absolute',
    top: 14,
    left: 14,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  toolRail: {
    position: 'absolute',
    top: 78,
    right: 12,
    gap: 14,
  },
  toolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  toolLabel: {
    marginRight: 12,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  toolIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  toolIconActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  trash: {
    position: 'absolute',
    alignSelf: 'center',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.85)',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  trashActive: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
    transform: [{ scale: 1.2 }],
  },
  trashHint: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: 10,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  filterStrip: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  filterList: {
    paddingHorizontal: 14,
    gap: 14,
  },
  filterOption: {
    alignItems: 'center',
  },
  filterSwatch: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  filterSwatchSelected: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  filterLabel: {
    marginTop: 6,
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  filterDone: {
    alignSelf: 'flex-end',
    marginTop: 10,
    marginRight: 16,
  },
  filterDoneText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  error: {
    marginTop: 8,
    marginHorizontal: 16,
    color: '#FCA5A5',
    fontSize: 13,
    textAlign: 'center',
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  audiencePill: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 24,
    paddingHorizontal: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
  },
  audienceText: {
    marginLeft: 8,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  shareButton: {
    minWidth: 132,
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#FFFFFF',
  },
  shareButtonBusy: {
    opacity: 0.8,
  },
  shareText: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '700',
  },
});

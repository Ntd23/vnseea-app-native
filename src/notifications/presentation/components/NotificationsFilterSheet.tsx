// Description: Bottom-sheet style modal that lets the user filter
// non-message notifications by type. Uses the native Modal with
// animationType="slide" so Android can use its optimized bottom-up
// sheet animation. Content is rendered eagerly (only when visible=true)
// to keep the first frame after open lightweight.

import React, { memo, useCallback } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  CalendarDays,
  Check,
  Heart,
  Inbox,
  MessageCircle,
  UserPlus,
  Users,
} from 'lucide-react-native';
import type { NotificationFilterType } from '../../application/i18n/notificationCopy';

interface NotificationsFilterSheetProps {
  visible: boolean;
  onClose: () => void;
  active: NotificationFilterType;
  onSelect: (filter: NotificationFilterType) => void;
  labels: {
    title: string;
    filterAll: string;
    filterLikes: string;
    filterComments: string;
    filterFollows: string;
    filterGroups: string;
    filterEvents: string;
    close: string;
  };
}

const ICON_MAP: Record<NotificationFilterType, React.ComponentType<{ size: number; color: string }>> = {
  all: Inbox,
  likes: Heart,
  comments: MessageCircle,
  follows: UserPlus,
  groups: Users,
  events: CalendarDays,
};

const COLOR_MAP: Record<NotificationFilterType, string> = {
  all: '#0000ff',
  likes: '#F33E58',
  comments: '#1877F2',
  follows: '#65676B',
  groups: '#0000ff',
  events: '#EA4335',
};

const ORDER: NotificationFilterType[] = [
  'all',
  'likes',
  'comments',
  'follows',
  'groups',
  'events',
];

const LABEL_KEY: Record<NotificationFilterType, keyof NotificationsFilterSheetProps['labels']> = {
  all: 'filterAll',
  likes: 'filterLikes',
  comments: 'filterComments',
  follows: 'filterFollows',
  groups: 'filterGroups',
  events: 'filterEvents',
};

const FilterRow = memo(function FilterRow({
  id,
  active,
  color,
  label,
  onPress,
}: {
  id: NotificationFilterType;
  active: boolean;
  color: string;
  label: string;
  onPress: () => void;
}) {
  const Icon = ICON_MAP[id];
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[
        styles.row,
        { backgroundColor: active ? '#EFF6FF' : '#F8FAFC' },
      ]}
    >
      <View
        style={[
          styles.iconBubble,
          { backgroundColor: `${color}1A` },
        ]}
      >
        <Icon size={18} color={color} />
      </View>
      <Text
        style={[
          styles.rowLabel,
          {
            color: active ? '#0000FF' : '#1E293B',
            fontWeight: active ? '700' : '500',
          },
        ]}
      >
        {label}
      </Text>
      {active ? <Check size={18} color="#0000FF" /> : null}
    </TouchableOpacity>
  );
});

export default function NotificationsFilterSheet({
  visible,
  onClose,
  active,
  onSelect,
  labels,
}: NotificationsFilterSheetProps) {
  const handleSelect = useCallback(
    (id: NotificationFilterType) => {
      onSelect(id);
      onClose();
    },
    [onSelect, onClose],
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable onPress={e => e.stopPropagation?.()} style={styles.sheet}>
          <View style={styles.sheetInner}>
            <View style={styles.headerRow}>
              <Text style={styles.title}>{labels.title}</Text>
              <TouchableOpacity
                activeOpacity={0.8}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                onPress={onClose}
                style={styles.closeBtn}
              >
                <Text style={styles.closeText}>{labels.close}</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={styles.list}
              contentContainerStyle={styles.listContent}
            >
              {ORDER.map(id => (
                <FilterRow
                  key={id}
                  id={id}
                  active={active === id}
                  color={COLOR_MAP[id]}
                  label={labels[LABEL_KEY[id]]}
                  onPress={() => handleSelect(id)}
                />
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 24,
  },
  sheetInner: {
    // No nested wrapper — keeps the first paint cheap.
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  closeBtn: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  closeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  list: {
    maxHeight: 480,
  },
  listContent: {
    paddingBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8,
  },
  iconBubble: {
    height: 36,
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  rowLabel: {
    marginLeft: 12,
    flex: 1,
    fontSize: 15,
  },
});

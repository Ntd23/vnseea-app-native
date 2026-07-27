// Description: Modern confirmation popup for deleting a notification.
import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Trash2, X } from 'lucide-react-native';

type NotificationDeleteConfirmModalProps = {
  visible: boolean;
  title: string;
  message: string;
  cancelLabel: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function NotificationDeleteConfirmModal({
  visible,
  title,
  message,
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
}: NotificationDeleteConfirmModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onCancel} />
        <View style={styles.card}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onCancel}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.closeButton}
          >
            <X size={19} color="#64748B" />
          </TouchableOpacity>

          <View style={styles.iconWrap}>
            <Trash2 size={30} color="#DC2626" />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.actions}>
            <TouchableOpacity
              activeOpacity={0.82}
              onPress={onCancel}
              style={[styles.actionButton, styles.cancelButton]}
            >
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.86}
              onPress={onConfirm}
              style={[styles.actionButton, styles.deleteButton]}
            >
              <Trash2 size={17} color="#FFFFFF" />
              <Text style={styles.deleteText}>{confirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(15, 23, 42, 0.58)',
  },
  card: {
    width: '100%',
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 26,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 28,
    elevation: 26,
  },
  closeButton: {
    position: 'absolute',
    right: 14,
    top: 14,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  iconWrap: {
    alignSelf: 'center',
    width: 66,
    height: 66,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  title: {
    marginTop: 17,
    color: '#0F172A',
    fontSize: 21,
    fontWeight: '900',
    textAlign: 'center',
  },
  message: {
    marginTop: 8,
    paddingHorizontal: 8,
    color: '#64748B',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 21,
    textAlign: 'center',
  },
  actions: {
    marginTop: 24,
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    minHeight: 50,
    flex: 1,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  cancelButton: {
    backgroundColor: '#F1F5F9',
  },
  deleteButton: {
    backgroundColor: '#DC2626',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  cancelText: {
    color: '#334155',
    fontSize: 15,
    fontWeight: '800',
  },
  deleteText: {
    marginLeft: 7,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
});

import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { theme } from '../styles/theme';

export const SessionControlModal = ({
  visible,
  onClose,
  session,
  actionType, // 'OPEN' | 'CLOSE'
  onConfirm,
  attendanceCount = 0,
}) => {
  if (!session) return null;

  const isOpenAction = actionType === 'OPEN';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheetContainer}>
          {/* Header indicator */}
          <View style={styles.dragIndicator} />

          <View style={styles.header}>
            <View
              style={[
                styles.iconBubble,
                isOpenAction ? styles.iconBubbleSuccess : styles.iconBubbleDanger,
              ]}
            >
              <Text style={styles.iconBubbleText}>
                {isOpenAction ? '🚀' : '🛑'}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle}>
                {isOpenAction ? 'Buka Sesi Praktikum' : 'Tutup Sesi Praktikum'}
              </Text>
              <Text style={styles.modalSub}>
                {isOpenAction
                  ? 'Praktikan akan dapat melakukan presensi secara mandiri'
                  : 'Sesi akan diakhiri dan presensi baru akan dikunci'}
              </Text>
            </View>
          </View>

          {/* Session Detail summary */}
          <View style={styles.detailBox}>
            <Text style={styles.detailCourse}>{session.courseName}</Text>
            <Text style={styles.detailModule}>{session.moduleTitle}</Text>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Kelas / Ruang:</Text>
              <Text style={styles.infoValue}>
                {session.className} • {session.room}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Jadwal Waktu:</Text>
              <Text style={styles.infoValue}>
                {session.day}, {session.time}
              </Text>
            </View>

            {!isOpenAction && (
              <View style={[styles.infoRow, styles.statHighlight]}>
                <Text style={styles.infoLabel}>Total Hadir Saat Ini:</Text>
                <Text style={styles.infoValueHighlight}>
                  {attendanceCount} dari {session.totalStudents} Mahasiswa
                </Text>
              </View>
            )}
          </View>

          {/* Action buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Batal</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.confirmButton,
                isOpenAction ? styles.confirmButtonSuccess : styles.confirmButtonDanger,
              ]}
              onPress={() => {
                onConfirm(session.id);
                onClose();
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.confirmButtonText}>
                {isOpenAction ? '✓ Ya, Buka Sesi' : '✕ Ya, Tutup Sesi'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    ...theme.shadows.modal,
  },
  dragIndicator: {
    width: 40,
    height: 4,
    backgroundColor: theme.colors.borderStrong,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  iconBubble: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBubbleSuccess: {
    backgroundColor: theme.colors.successLight,
  },
  iconBubbleDanger: {
    backgroundColor: theme.colors.dangerLight,
  },
  iconBubbleText: {
    fontSize: 22,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  modalSub: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  detailBox: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 20,
  },
  detailCourse: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  detailModule: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  infoLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  infoValue: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  statHighlight: {
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  infoValueHighlight: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    backgroundColor: theme.colors.surface,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  confirmButton: {
    flex: 2,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: theme.borderRadius.md,
  },
  confirmButtonSuccess: {
    backgroundColor: theme.colors.success,
  },
  confirmButtonDanger: {
    backgroundColor: theme.colors.danger,
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textLight,
  },
});

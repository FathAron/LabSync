import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { theme } from '../styles/theme';
import { EmptyState } from './EmptyState';

export const AttendanceSummaryModal = ({
  visible,
  onClose,
  session,
  attendees = [],
}) => {
  if (!session) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheetContainer}>
          <View style={styles.dragIndicator} />

          {/* Modal Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Rekap Presensi Sesi</Text>
              <Text style={styles.subtitle}>
                {session.courseName} • Kelas {session.className}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeIconBtn}>
              <Text style={styles.closeIconText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Mini Stat Summary */}
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{attendees.length}</Text>
              <Text style={styles.statLabel}>Total Hadir</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>
                {session.totalStudents - attendees.length}
              </Text>
              <Text style={styles.statLabel}>Belum Hadir</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statNumber, { color: theme.colors.success }]}>
                {session.totalStudents > 0
                  ? `${Math.round((attendees.length / session.totalStudents) * 100)}%`
                  : '0%'}
              </Text>
              <Text style={styles.statLabel}>Tingkat Kehadiran</Text>
            </View>
          </View>

          {/* List of Attendees */}
          <Text style={styles.listHeaderTitle}>
            Daftar Mahasiswa Hadir ({attendees.length})
          </Text>

          <ScrollView style={styles.listScroll} showsVerticalScrollIndicator={false}>
            {attendees.length === 0 ? (
              <EmptyState
                icon="👥"
                title="Belum Ada Presensi"
                message="Belum ada praktikan yang mencatat kehadiran pada sesi praktikum ini."
              />
            ) : (
              attendees.map((attendee, index) => (
                <View key={attendee.id || index} style={styles.attendeeCard}>
                  <View style={styles.attendeeNumber}>
                    <Text style={styles.attendeeNumberText}>{index + 1}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.attendeeName}>{attendee.studentName}</Text>
                    <Text style={styles.attendeeNim}>NIM: {attendee.studentNim}</Text>
                    {attendee.notes ? (
                      <Text style={styles.attendeeNotes}>💬 {attendee.notes}</Text>
                    ) : null}
                  </View>
                  <View style={styles.timeBadge}>
                    <Text style={styles.timeBadgeText}>{attendee.timestamp}</Text>
                    <Text style={styles.statusBadgeText}>✓ {attendee.status}</Text>
                  </View>
                </View>
              ))
            )}
          </ScrollView>

          {/* Footer button */}
          <TouchableOpacity
            style={styles.doneBtn}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={styles.doneBtnText}>Selesai Meninjau</Text>
          </TouchableOpacity>
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
    maxHeight: '88%',
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
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  closeIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIconText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: theme.colors.surfaceSubtle,
    padding: 10,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  statLabel: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    marginTop: 2,
    fontWeight: '600',
  },
  listHeaderTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  listScroll: {
    marginBottom: 16,
  },
  attendeeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: 12,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 8,
  },
  attendeeNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: theme.colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attendeeNumberText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  attendeeName: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  attendeeNim: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  attendeeNotes: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
    fontStyle: 'italic',
  },
  timeBadge: {
    alignItems: 'flex-end',
  },
  timeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.success,
    marginTop: 2,
  },
  doneBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.secondary,
  },
  doneBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textLight,
  },
});

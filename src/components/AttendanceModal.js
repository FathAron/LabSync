import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import { theme } from '../styles/theme';

export const AttendanceModal = ({
  visible,
  onClose,
  session,
  student,
  onSubmit,
}) => {
  const [labSeat, setLabSeat] = useState('Meja Lab A-12');
  const [tokenInput, setTokenInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!session || !student) return null;

  const handleSubmit = () => {
    // Basic verification: session token is optional or auto-filled for easy demo
    if (tokenInput.trim() && tokenInput.trim().toUpperCase() !== session.token.toUpperCase()) {
      setErrorMsg(`Token tidak cocok! Petunjuk token sesi: "${session.token}"`);
      return;
    }

    setErrorMsg('');
    const notes = labSeat ? `Presensi di ${labSeat}` : 'Presensi Mandiri di Lab';
    const result = onSubmit(session.id, student, notes);

    if (result && result.success) {
      onClose();
    } else if (result) {
      setErrorMsg(result.message);
    }
  };

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

          <View style={styles.header}>
            <View style={styles.iconBubble}>
              <Text style={styles.iconBubbleText}>📝</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Form Presensi Mahasiswa</Text>
              <Text style={styles.subtitle}>
                Pastikan data identitas dan sesi praktikum sudah sesuai
              </Text>
            </View>
          </View>

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {/* Student Identity Card */}
            <View style={styles.identityBox}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{student.avatar}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.studentName}>{student.name}</Text>
                <Text style={styles.studentMeta}>
                  NIM: {student.nim} • Kelas: {student.class}
                </Text>
              </View>
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedBadgeText}>Praktikan</Text>
              </View>
            </View>

            {/* Session Info */}
            <View style={styles.sessionBox}>
              <Text style={styles.sessionCourse}>{session.courseName}</Text>
              <Text style={styles.sessionModule}>{session.moduleTitle}</Text>
              <View style={styles.sessionMetaRow}>
                <Text style={styles.sessionMeta}>📍 {session.room}</Text>
                <Text style={styles.sessionMeta}>🕒 {session.time}</Text>
              </View>
            </View>

            {/* Input Form Fields */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Posisi / Meja di Lab (Opsional)</Text>
              <TextInput
                style={styles.textInput}
                value={labSeat}
                onChangeText={setLabSeat}
                placeholder="Contoh: Meja A-04, Baris Depan"
                placeholderTextColor={theme.colors.textMuted}
              />
            </View>

            <View style={styles.formGroup}>
              <View style={styles.tokenLabelRow}>
                <Text style={styles.formLabel}>Token Sesi (Opsional untuk Demo)</Text>
                <TouchableOpacity onPress={() => setTokenInput(session.token)}>
                  <Text style={styles.autoFillBtn}>Auto-isi "{session.token}"</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={[styles.textInput, styles.tokenInput]}
                value={tokenInput}
                onChangeText={setTokenInput}
                placeholder={`Masukkan token (cth: ${session.token})`}
                placeholderTextColor={theme.colors.textMuted}
                autoCapitalize="characters"
              />
            </View>

            {/* Error banner if validation fails */}
            {errorMsg ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>⚠️ {errorMsg}</Text>
              </View>
            ) : null}

            {/* Attendance Rules notice */}
            <View style={styles.rulesNotice}>
              <Text style={styles.rulesNoticeTitle}>ℹ️ Aturan Presensi:</Text>
              <Text style={styles.rulesNoticeText}>
                • Presensi hanya dapat dilakukan 1 kali per sesi per praktikan.
              </Text>
              <Text style={styles.rulesNoticeText}>
                • Waktu kehadiran akan otomatis dicatat sesuai jam saat ini.
              </Text>
            </View>
          </ScrollView>

          {/* Action buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelBtnText}>Batal</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleSubmit}
              activeOpacity={0.8}
            >
              <Text style={styles.submitBtnText}>✓ Simpan Presensi</Text>
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
    maxHeight: '90%',
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
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: theme.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBubbleText: {
    fontSize: 22,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  scrollArea: {
    marginBottom: 16,
  },
  identityBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceSubtle,
    padding: 12,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 12,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.studentTag,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  studentName: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  studentMeta: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  verifiedBadge: {
    backgroundColor: theme.colors.studentTagBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  verifiedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.studentTag,
  },
  sessionBox: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: 12,
    marginBottom: 16,
  },
  sessionCourse: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  sessionModule: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
    marginBottom: 6,
  },
  sessionMetaRow: {
    flexDirection: 'row',
    gap: 16,
  },
  sessionMeta: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  formGroup: {
    marginBottom: 14,
  },
  tokenLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 6,
  },
  autoFillBtn: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  textInput: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: theme.colors.textPrimary,
  },
  tokenInput: {
    fontFamily: 'monospace',
    letterSpacing: 1.5,
  },
  errorBanner: {
    backgroundColor: theme.colors.dangerLight,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.danger,
    padding: 10,
    borderRadius: theme.borderRadius.sm,
    marginBottom: 12,
  },
  errorBannerText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.danger,
  },
  rulesNotice: {
    backgroundColor: theme.colors.primaryLight,
    padding: 12,
    borderRadius: theme.borderRadius.md,
    marginBottom: 8,
  },
  rulesNoticeTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primaryDark,
    marginBottom: 4,
  },
  rulesNoticeText: {
    fontSize: 11,
    color: theme.colors.primaryDark,
    lineHeight: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    backgroundColor: theme.colors.surface,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  submitBtn: {
    flex: 2,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textLight,
  },
});

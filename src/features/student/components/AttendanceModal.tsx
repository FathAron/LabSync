import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, theme } from '../../../styles/theme';
import type { SessionInfo, StudentInfo, SubmitResult } from '../types';
import { MESSAGES, formatDateID, formatTimeRange } from '../studentUtils';

const NOTES_MAX_LENGTH = 30;

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value || '-'}</Text>
  </View>
);

interface Props {
  visible: boolean;
  session: SessionInfo | null;
  student: StudentInfo | null;
  onClose: () => void;
  onSubmit: (notes: string) => Promise<SubmitResult>;
}

const AttendanceModal = ({
  visible,
  session,
  student,
  onClose,
  onSubmit,
}: Props) => {
  const { height } = useWindowDimensions();
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const savingRef = useRef(false);

  if (!visible || !session || !student) return null;

  const scheduleText =
    [
      formatDateID(session.date ?? session.startTime),
      formatTimeRange(session.startTime, session.endTime),
    ]
      .filter(Boolean)
      .join(' • ') || 'Jadwal belum tersedia';

  const moduleText =
    [session.moduleCode, session.moduleTitle].filter(Boolean).join(' — ');

  const handleCancel = () => {
    if (savingRef.current) return;
    setNotes('');
    setError('');
    onClose();
  };

  const handleSave = async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError('');
    try {
      const result = await onSubmit(notes.trim());
      if (result.ok || result.closeModal) {
        setNotes('');
        setError('');
        onClose();
      } else {
        setError(result.message || MESSAGES.genericError);
      }
    } catch {
      setError(MESSAGES.genericError);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleCancel}
    >
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={handleCancel}
          accessibilityLabel="Tutup formulir presensi"
        >
          <View style={styles.backdrop} />
        </Pressable>

        <View style={[styles.sheet, { maxHeight: height * 0.9 }]}>
          <View style={styles.handle} />

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.headerRow}>
              <View>
                <Text style={styles.title} accessibilityRole="header">
                  Konfirmasi Presensi
                </Text>
                <Text style={styles.subtitle}>
                  Pastikan data sesi di bawah sudah sesuai
                </Text>
              </View>
              <Pressable
                onPress={handleCancel}
                hitSlop={8}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={20} color={colors.mochaDark} />
              </Pressable>
            </View>

            <Text style={styles.sectionLabel}>Data Praktikan</Text>
            <View style={styles.infoCard}>
              <InfoRow label="Nama" value={student.name} />
              <InfoRow label="NIM" value={student.nim} />
              <InfoRow label="Kelas" value={student.className} />
            </View>

            <Text style={styles.sectionLabel}>Data Sesi Praktikum</Text>
            <View style={styles.infoCard}>
              <InfoRow label="Mata Kuliah" value={session.courseName} />
              <InfoRow label="Modul" value={moduleText} />
              <InfoRow label="Jadwal" value={scheduleText} />
              <InfoRow label="Ruangan" value={session.room} />
              <InfoRow label="Asisten" value={session.assistantName} />
            </View>

            <Text style={styles.sectionLabel}>
              Posisi / Catatan Meja (Opsional)
            </Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              editable={!saving}
              placeholder="Contoh: Meja Lab C-08 (maks. 30 karakter)"
              placeholderTextColor={colors.textMuted}
              maxLength={NOTES_MAX_LENGTH}
              returnKeyType="done"
              onSubmitEditing={handleSave}
              style={styles.input}
              accessibilityLabel="Posisi atau nomor meja laboratorium"
            />
            <Text style={styles.hint}>
              Boleh dikosongkan bila tidak diperlukan.
            </Text>

            {error ? (
              <View style={styles.errorBox} accessibilityLiveRegion="polite">
                <Ionicons
                  name="alert-circle-outline"
                  size={18}
                  color={colors.dangerDark}
                />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Batal"
              disabled={saving}
              onPress={handleCancel}
              style={[styles.btn, styles.btnSecondary, saving && styles.btnDimmed]}
            >
              <Text style={styles.btnSecondaryText}>Batal</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Simpan Presensi"
              accessibilityState={{ disabled: saving, busy: saving }}
              disabled={saving}
              onPress={handleSave}
              style={[styles.btn, styles.btnPrimary, saving && styles.btnDimmed]}
            >
              {saving ? (
                <View style={styles.savingRow}>
                  <ActivityIndicator color="#FFFFFF" size="small" />
                  <Text style={[styles.btnPrimaryText, styles.savingText]}>
                    Menyimpan...
                  </Text>
                </View>
              ) : (
                <Text style={styles.btnPrimaryText}>Simpan Presensi</Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  backdrop: { flex: 1, backgroundColor: colors.overlay },
  sheet: {
    width: '100%',
    maxWidth: 560,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    ...theme.shadows.modal,
  },
  handle: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    marginTop: spacing.sm,
  },
  scroll: { flexGrow: 0, flexShrink: 1 },
  scrollContent: { padding: spacing.lg },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 18, fontWeight: '800', color: colors.mochaDark },
  subtitle: { marginTop: 2, fontSize: 13, color: colors.textSecondary },
  sectionLabel: {
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    fontSize: 12,
    fontWeight: '700',
    color: colors.mochaDark,
  },
  infoCard: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: 4,
  },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start' },
  infoLabel: {
    flex: 2,
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
  },
  infoValue: {
    flex: 4,
    fontSize: 12,
    fontWeight: '700',
    color: colors.mochaDark,
  },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: 13,
    color: colors.mochaDark,
    backgroundColor: colors.surfaceSubtle,
  },
  hint: { marginTop: 4, fontSize: 11, color: colors.textMuted },
  errorBox: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  errorText: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: 12,
    fontWeight: '600',
    color: colors.dangerDark,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    backgroundColor: colors.surface,
  },
  btn: {
    flex: 1,
    minHeight: 46,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  btnPrimary: {
    backgroundColor: colors.primary,
    ...theme.shadows.button,
  },
  btnSecondary: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnDimmed: { opacity: 0.6 },
  btnPrimaryText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
  btnSecondaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.mochaDark,
  },
  savingRow: { flexDirection: 'row', alignItems: 'center' },
  savingText: { marginLeft: spacing.sm },
});

export default AttendanceModal;

// TASK-04 - Modal (bottom sheet) formulir presensi.

import React, { useEffect, useRef, useState } from 'react';
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
import { colors, radius, spacing } from '../studentTokens';
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

const AttendanceModal = ({ visible, session, student, onClose, onSubmit }: Props) => {
  const { height } = useWindowDimensions();
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const savingRef = useRef(false);

  useEffect(() => {
    if (visible) {
      setNotes('');
      setError('');
    }
  }, [visible]);

  if (!session || !student) return null;

  const scheduleText =
    [
      formatDateID(session.date ?? session.startTime),
      formatTimeRange(session.startTime, session.endTime),
    ]
      .filter(Boolean)
      .join(' - ') || 'Jadwal belum tersedia';

  const moduleText = [session.moduleCode, session.moduleTitle].filter(Boolean).join(' - ');

  const handleCancel = () => {
    if (savingRef.current) return; 
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
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleCancel}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
            <Text style={styles.title} accessibilityRole="header">
              Formulir Presensi
            </Text>
            <Text style={styles.subtitle}>Periksa data berikut, lalu simpan presensimu.</Text>

            <Text style={styles.sectionLabel}>Data Praktikan</Text>
            <View style={styles.infoCard}>
              <InfoRow label="Nama" value={student.name} />
              <InfoRow label="NIM" value={student.nim} />
              <InfoRow label="Kelas" value={student.className} />
            </View>

            <Text style={styles.sectionLabel}>Data Sesi</Text>
            <View style={styles.infoCard}>
              <InfoRow label="Praktikum" value={session.courseName} />
              <InfoRow label="Modul" value={moduleText} />
              <InfoRow label="Jadwal" value={scheduleText} />
              <InfoRow label="Ruangan" value={session.room} />
            </View>

            <Text style={styles.sectionLabel}>Posisi / Nomor Meja (opsional)</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              editable={!saving}
              placeholder="Contoh: Meja Lab A-12"
              placeholderTextColor={colors.textMuted}
              maxLength={NOTES_MAX_LENGTH}
              returnKeyType="done"
              onSubmitEditing={handleSave}
              style={styles.input}
              accessibilityLabel="Posisi atau nomor meja laboratorium"
            />
            <Text style={styles.hint}>Boleh dikosongkan.</Text>

            {error ? (
              <View style={styles.errorBox} accessibilityLiveRegion="polite">
                <Ionicons name="alert-circle-outline" size={18} color={colors.dangerDark} />
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
                  <Text style={[styles.btnPrimaryText, styles.savingText]}>Menyimpan...</Text>
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
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    marginTop: spacing.sm,
  },
  scroll: { flexGrow: 0, flexShrink: 1 },
  scrollContent: { padding: spacing.lg },
  title: { fontSize: 20, fontWeight: '800', color: colors.text },
  subtitle: { marginTop: 4, fontSize: 14, color: colors.textMuted },
  sectionLabel: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    fontSize: 13,
    fontWeight: '700',
    color: colors.neutralDark,
  },
  infoCard: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  infoLabel: { flex: 2, fontSize: 13, color: colors.textMuted, paddingRight: spacing.sm },
  infoValue: { flex: 5, fontSize: 14, fontWeight: '600', color: colors.text, lineHeight: 20 },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  hint: { marginTop: 4, fontSize: 12, color: colors.textMuted },
  errorBox: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  errorText: { flex: 1, marginLeft: spacing.sm, fontSize: 13, color: colors.dangerDark },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: spacing.lg + (Platform.OS === 'ios' ? spacing.md : 0),
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  btn: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  btnPrimary: { backgroundColor: colors.primary },
  btnSecondary: { backgroundColor: colors.neutralSoft },
  btnDimmed: { opacity: 0.6 },
  btnPrimaryText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  btnSecondaryText: { fontSize: 15, fontWeight: '700', color: colors.neutralDark },
  savingRow: { flexDirection: 'row', alignItems: 'center' },
  savingText: { marginLeft: spacing.sm },
});

export default AttendanceModal;

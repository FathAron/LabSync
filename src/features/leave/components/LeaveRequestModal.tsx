import { useState } from 'react';
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
} from 'react-native';

import type {
  ApiResponse,
  LeaveRequest,
  Session,
} from '../../../types/models';

import {
  colors,
  spacing,
  radius,
} from '../../student/studentTokens';

interface LeaveRequestModalProps {
  visible: boolean;
  sessions: Session[];
  submitting: boolean;
  onClose: () => void;
  onSubmit: (
    session: Session,
    reason: string
  ) => Promise<ApiResponse<LeaveRequest>>;
}

const formatSessionDate = (date: string): string => {
  const parsed = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) return date;

  return parsed.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

const LeaveRequestModal = ({
  visible,
  sessions,
  submitting,
  onClose,
  onSubmit,
}: LeaveRequestModalProps) => {
  const [selectedSessionId, setSelectedSessionId] =
    useState<string | null>(null);

  const [reason, setReason] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const selectedSession =
    sessions.find(
      (session) => session.id === selectedSessionId
    ) ?? null;

  const handleClose = () => {
    if (submitting) return;

    setSelectedSessionId(null);
    setReason('');
    setErrorMessage('');
    onClose();
  };

  const handleSubmit = async () => {
    setErrorMessage('');

    if (!selectedSession) {
      setErrorMessage(
        'Silakan pilih sesi praktikum terlebih dahulu.'
      );
      return;
    }

    if (!reason.trim()) {
      setErrorMessage(
        'Alasan izin tidak boleh kosong.'
      );
      return;
    }

    const result = await onSubmit(
      selectedSession,
      reason.trim()
    );

    if (result.ok) {
      handleClose();
    } else {
      setErrorMessage(result.message);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={
          Platform.OS === 'ios' ? 'padding' : undefined
        }
      >
        <View style={styles.modal}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>
                Ajukan Izin
              </Text>

              <Text style={styles.subtitle}>
                Isi informasi pengajuan izin praktikum.
              </Text>
            </View>

            <Pressable
              onPress={handleClose}
              disabled={submitting}
              style={styles.closeButton}
            >
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.sectionTitle}>
              Pilih Sesi Praktikum
            </Text>

            {sessions.length === 0 ? (
              <Text style={styles.emptyText}>
                Belum ada sesi praktikum yang tersedia.
              </Text>
            ) : (
              sessions.map((session) => {
                const selected =
                  selectedSessionId === session.id;

                return (
                  <Pressable
                    key={session.id}
                    disabled={submitting}
                    onPress={() => {
                      setSelectedSessionId(session.id);
                      setErrorMessage('');
                    }}
                    style={[
                      styles.sessionOption,
                      selected && styles.sessionSelected,
                    ]}
                  >
                    <View style={styles.sessionHeader}>
                      <Text style={styles.sessionName}>
                        {session.courseName}
                      </Text>

                      <Text
                        style={[
                          styles.radio,
                          selected && styles.radioSelected,
                        ]}
                      >
                        {selected ? '●' : '○'}
                      </Text>
                    </View>

                    <Text style={styles.sessionDetail}>
                      {session.moduleCode} - {session.moduleTitle}
                    </Text>

                    <Text style={styles.sessionDetail}>
                      {formatSessionDate(session.date)}
                    </Text>

                    <Text style={styles.sessionDetail}>
                      {session.startTime} - {session.endTime} WIB
                      {' · '}
                      {session.room}
                    </Text>
                  </Pressable>
                );
              })
            )}

            <Text style={styles.sectionTitle}>
              Alasan Izin
            </Text>

            <TextInput
              value={reason}
              onChangeText={(value) => {
                setReason(value);
                setErrorMessage('');
              }}
              placeholder="Tuliskan alasan ketidakhadiran..."
              placeholderTextColor={colors.textMuted}
              multiline
              textAlignVertical="top"
              maxLength={1000}
              editable={!submitting}
              style={styles.reasonInput}
            />

            <Text style={styles.characterCount}>
              {reason.length}/1000 karakter
            </Text>

            <View style={styles.aiInfo}>
              <Text style={styles.aiTitle}>
                ✨ Klasifikasi AI
              </Text>

              <Text style={styles.aiDescription}>
                Alasan izin akan dianalisis oleh AI sebagai
                informasi pendukung. Keputusan diterima atau
                ditolak sepenuhnya ditentukan oleh asisten.
              </Text>
            </View>

            {submitting ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color={colors.primary} />

                <Text style={styles.loadingText}>
                  Menganalisis alasan dan menyimpan pengajuan...
                </Text>
              </View>
            ) : null}

            {errorMessage ? (
              <Text style={styles.errorText}>
                {errorMessage}
              </Text>
            ) : null}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              onPress={handleClose}
              disabled={submitting}
              style={styles.cancelButton}
            >
              <Text style={styles.cancelText}>
                Batal
              </Text>
            </Pressable>

            <Pressable
              onPress={handleSubmit}
              disabled={
                submitting || sessions.length === 0
              }
              style={[
                styles.submitButton,
                submitting && styles.disabledButton,
              ]}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitText}>
                  Kirim Pengajuan
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modal: {
    maxHeight: '90%',
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 21,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },
  closeButton: {
    padding: spacing.sm,
  },
  closeText: {
    fontSize: 20,
    color: colors.textMuted,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primaryDark,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  sessionOption: {
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
  },
  sessionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sessionName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryDark,
    flex: 1,
  },
  radio: {
    fontSize: 18,
    color: colors.textMuted,
  },
  radioSelected: {
    color: colors.primary,
  },
  sessionDetail: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 5,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
    padding: spacing.md,
  },
  reasonInput: {
    minHeight: 110,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    color: colors.primaryDark,
    fontSize: 14,
  },
  characterCount: {
    textAlign: 'right',
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 5,
  },
  aiInfo: {
    backgroundColor: colors.primarySoft,
    padding: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.md,
  },
  aiTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  aiDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.primaryDark,
    marginTop: 5,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  loadingText: {
    fontSize: 12,
    color: colors.textMuted,
    flex: 1,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    marginTop: spacing.md,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  cancelButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  cancelText: {
    fontWeight: '700',
    color: colors.textMuted,
  },
  submitButton: {
    flex: 2,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  disabledButton: {
    opacity: 0.6,
  },
});

export default LeaveRequestModal;

import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
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
} from '../../../types/models';

import {
  colors,
  radius,
  spacing,
} from '../../student/studentTokens';

interface LeaveReviewModalProps {
  visible: boolean;
  request: LeaveRequest | null;
  submitting: boolean;
  onClose: () => void;
  onReview: (
    decision: 'APPROVED' | 'REJECTED',
    reviewNotes: string
  ) => Promise<ApiResponse<void>>;
}

const LeaveReviewModal = ({
  visible,
  request,
  submitting,
  onClose,
  onReview,
}: LeaveReviewModalProps) => {
  const [reviewNotes, setReviewNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleClose = () => {
    if (submitting) return;

    setReviewNotes('');
    setErrorMessage('');
    onClose();
  };

  if (!request) return null;

  const handleReview = async (
    decision: 'APPROVED' | 'REJECTED'
  ) => {
    setErrorMessage('');

    const result = await onReview(
      decision,
      reviewNotes.trim()
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
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>
                Pemeriksaan Izin
              </Text>

              <Text style={styles.subtitle}>
                Periksa pengajuan praktikan.
              </Text>
            </View>

            <Pressable
              onPress={handleClose}
              disabled={submitting}
            >
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.sectionTitle}>
              Identitas Praktikan
            </Text>

            <Text style={styles.studentName}>
              {request.studentName}
            </Text>

            <Text style={styles.detail}>
              NIM: {request.studentNim}
            </Text>

            <Text style={styles.detail}>
              Kelas: {request.className}
            </Text>

            <Text style={styles.sectionTitle}>
              Sesi Praktikum
            </Text>

            <Text style={styles.detail}>
              {request.sessionTitle}
            </Text>

            <Text style={styles.sectionTitle}>
              Alasan Pengajuan
            </Text>

            <View style={styles.reasonBox}>
              <Text style={styles.reason}>
                {request.reason}
              </Text>
            </View>

            <View style={styles.aiBox}>
              <Text style={styles.aiTitle}>
                ✨ Hasil Prediksi AI
              </Text>

              <Text style={styles.aiCategory}>
                {request.aiCategory}
              </Text>

              {request.aiConfidence !== null ? (
                <Text style={styles.detail}>
                  Tingkat keyakinan:{' '}
                  {(request.aiConfidence * 100).toFixed(1)}%
                </Text>
              ) : null}

              {request.aiStatus !== 'SUCCESS' ? (
                <Text style={styles.aiWarning}>
                  Layanan AI tidak tersedia atau gagal.
                  Pengajuan tetap dapat diproses.
                </Text>
              ) : null}

              <Text style={styles.aiDisclaimer}>
                Hanya sebagai informasi pendukung.
                Hasil AI tidak menentukan keputusan
                diterima atau ditolaknya izin.
              </Text>
            </View>

            <Text style={styles.sectionTitle}>
              Catatan Asisten (Opsional)
            </Text>

            <TextInput
              value={reviewNotes}
              onChangeText={setReviewNotes}
              placeholder="Tuliskan catatan pemeriksaan..."
              placeholderTextColor={colors.textMuted}
              multiline
              textAlignVertical="top"
              editable={!submitting}
              style={styles.input}
            />

            {errorMessage ? (
              <Text style={styles.errorText}>
                {errorMessage}
              </Text>
            ) : null}

            {submitting ? (
              <View style={styles.loading}>
                <ActivityIndicator color={colors.primary} />

                <Text style={styles.detail}>
                  Menyimpan keputusan...
                </Text>
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.actions}>
            <Pressable
              style={styles.rejectButton}
              disabled={submitting}
              onPress={() => handleReview('REJECTED')}
            >
              <Text style={styles.rejectText}>
                Tolak
              </Text>
            </Pressable>

            <Pressable
              style={styles.approveButton}
              disabled={submitting}
              onPress={() => handleReview('APPROVED')}
            >
              <Text style={styles.approveText}>
                Terima
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
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
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },
  closeText: {
    fontSize: 20,
    color: colors.textMuted,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primaryDark,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
  },
  detail: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 5,
  },
  reasonBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  reason: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.primaryDark,
  },
  aiBox: {
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
  aiCategory: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.primary,
    marginTop: 7,
  },
  aiWarning: {
    fontSize: 11,
    color: '#B45309',
    marginTop: 6,
  },
  aiDisclaimer: {
    fontSize: 11,
    lineHeight: 17,
    color: colors.textMuted,
    marginTop: 8,
  },
  input: {
    minHeight: 85,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    color: colors.primaryDark,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    marginTop: spacing.md,
  },
  loading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  rejectButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
  },
  rejectText: {
    color: '#B91C1C',
    fontWeight: '800',
  },
  approveButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  approveText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});

export default LeaveReviewModal;

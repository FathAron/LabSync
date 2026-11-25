import { useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type {
  ApiResponse,
  LeaveRequest,
} from '../../../types/models';
import { colors, radius, spacing, theme } from '../../../styles/theme';

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
  const { width, height } = useWindowDimensions();
  const isCompact = width < 600;

  const [reviewNotes, setReviewNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleClose = () => {
    if (submitting) return;
    setReviewNotes('');
    setErrorMessage('');
    onClose();
  };

  if (!request) return null;

  const handleReview = async (decision: 'APPROVED' | 'REJECTED') => {
    setErrorMessage('');

    const result = await onReview(decision, reviewNotes.trim());
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
      animationType={isCompact ? 'slide' : 'fade'}
      onRequestClose={handleClose}
    >
      <View
        style={[
          styles.overlay,
          {
            justifyContent: isCompact ? 'flex-end' : 'center',
            padding: isCompact ? 0 : spacing.lg,
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tutup modal pemeriksaan"
          onPress={handleClose}
          style={StyleSheet.absoluteFill}
        />

        <View
          style={[
            styles.modal,
            {
              width: isCompact ? width : Math.min(width - 32, 540),
              maxHeight: height * 0.9,
            },
            isCompact && styles.bottomSheet,
          ]}
        >
          {isCompact && (
            <View style={styles.handleContainer}>
              <View style={styles.handle} />
            </View>
          )}

          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.eyebrow}>VERIFIKASI PERIZINAN</Text>
              <Text style={styles.title}>Pemeriksaan Izin Praktikan</Text>
              <Text style={styles.subtitle}>
                Tinjau alasan mahasiswa dan tentukan persetujuan kehadiran.
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Tutup"
              onPress={handleClose}
              disabled={submitting}
              hitSlop={8}
              style={styles.closeBtn}
            >
              <Ionicons name="close" size={20} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
            {/* STUDENT IDENTITY */}
            <View style={styles.studentCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {request.studentName.slice(0, 2).toUpperCase()}
                </Text>
              </View>

              <View style={styles.studentDetails}>
                <Text style={styles.studentName}>{request.studentName}</Text>
                <Text style={styles.studentMeta}>
                  NIM {request.studentNim} · Kelas {request.className}
                </Text>
              </View>
            </View>

            {/* SESSION INFO */}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Sesi Praktikum:</Text>
              <Text style={styles.infoValue}>{request.sessionTitle}</Text>
            </View>

            {/* REASON */}
            <Text style={styles.sectionTitle}>Alasan Mahasiswa</Text>
            <View style={styles.reasonBox}>
              <Text style={styles.reason}>&ldquo;{request.reason}&rdquo;</Text>
            </View>

            {/* ATTACHMENTS */}
            {request.attachments && request.attachments.length > 0 ? (
              <View style={styles.attachmentSection}>
                <Text style={styles.sectionTitle}>
                  Dokumen Pendukung ({request.attachments.length})
                </Text>
                {request.attachments.map((att) => (
                  <Pressable
                    key={att.id}
                    onPress={() => {
                      if (att.downloadUrl) {
                        Linking.openURL(att.downloadUrl).catch(() => {});
                      }
                    }}
                    style={({ pressed }) => [
                      styles.attachmentItem,
                      pressed && { opacity: 0.8 },
                    ]}
                  >
                    <Ionicons
                      name={att.mimeType.includes('pdf') ? 'document-text' : 'image'}
                      size={20}
                      color={colors.primary}
                    />
                    <View style={styles.attachmentMeta}>
                      <Text style={styles.attachmentName} numberOfLines={1}>
                        {att.fileName}
                      </Text>
                      <Text style={styles.attachmentSize}>
                        {(att.fileSize / 1024).toFixed(0)} KB · Ketuk untuk membuka
                      </Text>
                    </View>
                    <Ionicons name="open-outline" size={16} color={colors.textMuted} />
                  </Pressable>
                ))}
              </View>
            ) : null}

            {/* AI PREDICTION ADVISORY */}
            <View style={styles.aiBox}>
              <View style={styles.aiHeader}>
                <Ionicons name="sparkles" size={16} color={colors.primaryDark} />
                <Text style={styles.aiTitle}>Hasil Klasifikasi AI</Text>
              </View>

              <View style={styles.aiCategoryRow}>
                <Text style={styles.aiCategoryLabel}>Kategori Disarankan:</Text>
                <Text style={styles.aiCategory}>{request.aiCategory}</Text>
              </View>

              {request.aiConfidence !== null ? (
                <Text style={styles.aiConfidence}>
                  Tingkat keyakinan model: {(request.aiConfidence * 100).toFixed(1)}%
                </Text>
              ) : null}

              {request.aiStatus !== 'SUCCESS' ? (
                <Text style={styles.aiWarning}>
                  Layanan AI belum memberikan hasil klasifikasi otomatis. Pengajuan tetap dapat diperiksa secara manual.
                </Text>
              ) : null}

              <Text style={styles.aiDisclaimer}>
                * Prediksi AI bersifat rekomendasi pendukung. Keputusan penerimaan atau penolakan sepenuhnya berada pada asisten praktikum.
              </Text>
            </View>

            {/* ASSISTANT NOTES INPUT */}
            <Text style={styles.sectionTitle}>Catatan Pemeriksaan (Opsional)</Text>
            <TextInput
              value={reviewNotes}
              onChangeText={setReviewNotes}
              placeholder="Berikan catatan persetujuan atau instruksi praktikum susulan..."
              placeholderTextColor={colors.textMuted}
              multiline
              textAlignVertical="top"
              editable={!submitting}
              style={styles.input}
            />

            {errorMessage ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color={colors.danger} />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {submitting ? (
              <View style={styles.loading}>
                <ActivityIndicator color={colors.primary} />
                <Text style={styles.loadingText}>Menyimpan keputusan verifikasi...</Text>
              </View>
            ) : null}
          </ScrollView>

          {/* ACTION BUTTONS */}
          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [
                styles.rejectButton,
                pressed && { opacity: 0.8 },
                submitting && styles.disabled,
              ]}
              disabled={submitting}
              onPress={() => handleReview('REJECTED')}
            >
              <Ionicons name="close-circle-outline" size={18} color={colors.danger} />
              <Text style={styles.rejectText}>Tolak Izin</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.approveButton,
                pressed && { opacity: 0.8 },
                submitting && styles.disabled,
              ]}
              disabled={submitting}
              onPress={() => handleReview('APPROVED')}
            >
              <Ionicons name="checkmark-circle-outline" size={18} color={colors.primaryText} />
              <Text style={styles.approveText}>Setujui Izin</Text>
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
    alignItems: 'center',
    backgroundColor: colors.overlay,
  },
  modal: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    paddingTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...theme.shadows.modal,
    overflow: 'hidden',
  },
  bottomSheet: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  handleContainer: {
    alignItems: 'center',
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.borderDark,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerText: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primaryDark,
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginTop: 2,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: spacing.xl,
  },
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  studentDetails: {
    flex: 1,
  },
  studentName: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  studentMeta: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  infoRow: {
    marginBottom: spacing.md,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.xs,
    marginTop: spacing.xs,
  },
  reasonBox: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  attachmentSection: {
    marginBottom: spacing.md,
  },
  attachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm + 2,
    marginTop: spacing.xs,
  },
  attachmentMeta: {
    flex: 1,
  },
  attachmentName: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  attachmentSize: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  reason: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.text,
    fontStyle: 'italic',
  },
  aiBox: {
    backgroundColor: colors.warningSoft,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#F5DEB3',
    marginBottom: spacing.md,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.xs,
  },
  aiTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
  },
  aiCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  aiCategoryLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  aiCategory: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  aiConfidence: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
  },
  aiWarning: {
    fontSize: 11,
    color: '#9A5B13',
    marginTop: 6,
  },
  aiDisclaimer: {
    fontSize: 10,
    lineHeight: 15,
    color: colors.textMuted,
    marginTop: 8,
    fontStyle: 'italic',
  },
  input: {
    minHeight: 80,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.surfaceMuted,
    color: colors.text,
    fontSize: 13,
    textAlignVertical: 'top',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: '#F8CCD4',
    padding: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.md,
  },
  errorText: {
    flex: 1,
    color: colors.danger,
    fontSize: 12,
    fontWeight: '600',
  },
  loading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  loadingText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  rejectButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: radius.lg,
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: '#F8CCD4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  rejectText: {
    color: colors.danger,
    fontWeight: '800',
    fontSize: 14,
  },
  approveButton: {
    flex: 1.2,
    minHeight: 46,
    borderRadius: radius.lg,
    backgroundColor: colors.success,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  approveText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  disabled: {
    opacity: 0.6,
  },
});

export default LeaveReviewModal;

import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { LeaveRequest } from '../../../types/models';
import { colors, radius, spacing, theme } from '../../../styles/theme';
import { formatDisplayClass } from '../../../utils/classUtils';

interface LeaveStatusCardProps {
  request: LeaveRequest;
}

const STATUS_CONFIG = {
  PENDING: {
    label: 'Menunggu Pemeriksaan',
    background: colors.butterCreamSoft,
    borderColor: colors.butterCream,
    color: colors.butterCreamDark,
    icon: 'time-outline' as const,
  },
  APPROVED: {
    label: 'Disetujui Asisten',
    background: colors.sageSoft,
    borderColor: colors.sage,
    color: colors.successDark,
    icon: 'checkmark-circle-outline' as const,
  },
  REJECTED: {
    label: 'Ditolak Asisten',
    background: colors.dangerSoft,
    borderColor: colors.danger,
    color: colors.dangerDark,
    icon: 'close-circle-outline' as const,
  },
};

const formatDate = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const LeaveStatusCard: React.FC<LeaveStatusCardProps> = ({ request }) => {
  const status = STATUS_CONFIG[request.status] ?? STATUS_CONFIG.PENDING;

  return (
    <View style={styles.card}>
      {/* Header Row: Session Title & Status Badge */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.courseTitle}>{request.sessionTitle}</Text>
          <Text style={styles.className}>{formatDisplayClass(request.className)}</Text>
        </View>

        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: status.background,
              borderColor: status.borderColor,
            },
          ]}
        >
          <Ionicons name={status.icon} size={13} color={status.color} />
          <Text style={[styles.statusText, { color: status.color }]}>
            {status.label}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Student Reason */}
      <Text style={styles.label}>Alasan Ketidakhadiran</Text>
      <Text style={styles.reason}>{request.reason}</Text>

      {/* Attachments */}
      {request.attachments && request.attachments.length > 0 ? (
        <View style={styles.attachmentsContainer}>
          <Text style={styles.attachmentsTitle}>
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
                styles.attachmentChip,
                pressed && { opacity: 0.8 },
              ]}
            >
              <Ionicons
                name={att.mimeType.includes('pdf') ? 'document-text-outline' : 'image-outline'}
                size={16}
                color={colors.primaryDark}
              />
              <Text style={styles.attachmentNameText} numberOfLines={1}>
                {att.fileName}
              </Text>
              <Ionicons name="open-outline" size={13} color={colors.textMuted} />
            </Pressable>
          ))}
        </View>
      ) : null}

      {/* AI Inference Advisory Section */}
      <View style={styles.aiContainer}>
        <View style={styles.aiHeader}>
          <Text style={styles.aiTitle}>✨ Klasifikasi AI</Text>
          {request.aiConfidence !== null ? (
            <View style={styles.aiConfidenceBadge}>
              <Text style={styles.aiConfidenceText}>
                Keyakinan {(request.aiConfidence * 100).toFixed(0)}%
              </Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.aiCategory}>
          Prediksi Kategori: <Text style={styles.bold}>{request.aiCategory}</Text>
        </Text>

        {request.aiStatus !== 'SUCCESS' ? (
          <Text style={styles.aiUnavailable}>
            Model AI tidak memberikan prediksi untuk alasan ini. Pengajuan tetap diproses normal oleh asisten.
          </Text>
        ) : null}

        <Text style={styles.aiDisclaimer}>
          Klasifikasi AI hanya merupakan pertimbangan informasi pendukung dan tidak menentukan keputusan izin.
        </Text>
      </View>

      <Text style={styles.dateText}>
        Diajukan pada {formatDate(request.createdAt)}
      </Text>

      {/* Assistant Review Decision (if resolved) */}
      {request.status !== 'PENDING' ? (
        <View style={styles.reviewContainer}>
          <Text style={styles.reviewTitle}>Keputusan Pemeriksaan</Text>

          <Text style={styles.reviewText}>
            Diperiksa oleh: <Text style={styles.bold}>{request.reviewedByName ?? 'Asisten Lab'}</Text>
          </Text>

          {request.reviewedAt ? (
            <Text style={styles.reviewText}>
              Waktu verifikasi: {formatDate(request.reviewedAt)}
            </Text>
          ) : null}

          {request.reviewNotes ? (
            <View style={styles.reviewNotesBox}>
              <Text style={styles.reviewNotesLabel}>Catatan Asisten:</Text>
              <Text style={styles.reviewNotes}>{request.reviewNotes}</Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...theme.shadows.card,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  titleContainer: {
    flex: 1,
  },
  courseTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.mochaDark,
  },
  className: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: spacing.md,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.mochaDark,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  reason: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.textPrimary,
  },
  attachmentsContainer: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  attachmentsTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  attachmentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.md,
  },
  attachmentNameText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: colors.mochaDark,
  },
  aiContainer: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  aiTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.mochaDark,
  },
  aiConfidenceBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.sand,
  },
  aiConfidenceText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.mochaDark,
  },
  aiCategory: {
    fontSize: 13,
    color: colors.textPrimary,
    marginTop: 6,
  },
  bold: {
    fontWeight: '700',
    color: colors.mochaDark,
  },
  aiUnavailable: {
    fontSize: 11,
    color: colors.butterCreamDark,
    marginTop: 4,
  },
  aiDisclaimer: {
    fontSize: 11,
    lineHeight: 16,
    color: colors.textMuted,
    marginTop: 6,
    fontStyle: 'italic',
  },
  dateText: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
  reviewContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    marginTop: spacing.md,
    paddingTop: spacing.md,
  },
  reviewTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.mochaDark,
    marginBottom: 4,
  },
  reviewText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 3,
  },
  reviewNotesBox: {
    marginTop: 6,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  reviewNotesLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.mochaDark,
  },
  reviewNotes: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textPrimary,
    marginTop: 2,
  },
});

export default LeaveStatusCard;

import { StyleSheet, Text, View } from 'react-native';
import type { LeaveRequest } from '../../../types/models';
import {
  colors,
  radius,
  spacing,
} from '../../student/studentTokens';

interface LeaveStatusCardProps {
  request: LeaveRequest;
}

const STATUS_CONFIG = {
  PENDING: {
    label: 'Menunggu',
    background: '#FFF7ED',
    color: '#C2410C',
  },
  APPROVED: {
    label: 'Disetujui',
    background: '#DCFCE7',
    color: '#15803D',
  },
  REJECTED: {
    label: 'Ditolak',
    background: '#FEE2E2',
    color: '#B91C1C',
  },
};

const formatDate = (value: string): string => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const LeaveStatusCard = ({
  request,
}: LeaveStatusCardProps) => {
  const status = STATUS_CONFIG[request.status];

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.courseTitle}>
            {request.sessionTitle}
          </Text>
          <Text style={styles.className}>
            Kelas {request.className}
          </Text>
        </View>

        <View
          style={[
            styles.statusBadge,
            { backgroundColor: status.background },
          ]}
        >
          <Text style={[styles.statusText, { color: status.color }]}>
            {status.label}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <Text style={styles.label}>Alasan Pengajuan</Text>
      <Text style={styles.reason}>{request.reason}</Text>

      <View style={styles.aiContainer}>
        <Text style={styles.aiTitle}>
          ✨ Hasil Klasifikasi AI
        </Text>

        <Text style={styles.aiCategory}>
          {request.aiCategory}
        </Text>

        {request.aiConfidence !== null ? (
          <Text style={styles.aiConfidence}>
            Tingkat keyakinan:{' '}
            {(request.aiConfidence * 100).toFixed(1)}%
          </Text>
        ) : null}

        {request.aiStatus !== 'SUCCESS' ? (
          <Text style={styles.aiUnavailable}>
            Klasifikasi AI tidak tersedia atau gagal.
            Pengajuan izin tetap dapat diproses.
          </Text>
        ) : null}

        <Text style={styles.aiDisclaimer}>
          Hasil AI hanya merupakan informasi pendukung,
          bukan penentu keputusan izin.
        </Text>
      </View>

      <Text style={styles.dateText}>
        Diajukan: {formatDate(request.createdAt)}
      </Text>

      {request.status !== 'PENDING' ? (
        <View style={styles.reviewContainer}>
          <Text style={styles.reviewTitle}>
            Pemeriksaan Asisten
          </Text>

          <Text style={styles.reviewText}>
            Diperiksa oleh: {request.reviewedByName ?? '-'}
          </Text>

          {request.reviewedAt ? (
            <Text style={styles.reviewText}>
              Tanggal: {formatDate(request.reviewedAt)}
            </Text>
          ) : null}

          {request.reviewNotes ? (
            <>
              <Text style={styles.label}>
                Catatan Asisten
              </Text>
              <Text style={styles.reviewNotes}>
                {request.reviewNotes}
              </Text>
            </>
          ) : (
            <Text style={styles.reviewText}>
              Tidak ada catatan dari asisten.
            </Text>
          )}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
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
    fontSize: 15,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  className: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primaryDark,
    marginBottom: 5,
  },
  reason: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.textMuted,
  },
  aiContainer: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  aiTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  aiCategory: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
    marginTop: 7,
  },
  aiConfidence: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
  },
  aiUnavailable: {
    fontSize: 11,
    color: '#B45309',
    marginTop: 5,
  },
  aiDisclaimer: {
    fontSize: 11,
    lineHeight: 17,
    color: colors.textMuted,
    marginTop: 7,
  },
  dateText: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
  reviewContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.md,
    paddingTop: spacing.md,
  },
  reviewTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primaryDark,
    marginBottom: spacing.sm,
  },
  reviewText: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 5,
  },
  reviewNotes: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.primaryDark,
  },
});

export default LeaveStatusCard;

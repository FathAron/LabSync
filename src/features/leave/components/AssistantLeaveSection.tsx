import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useLeave } from '../../../hooks/useLeave';

import type {
  ApiResponse,
  LeaveRequest,
} from '../../../types/models';

import {
  colors,
  radius,
  spacing,
} from '../../student/studentTokens';

import LeaveReviewModal from './LeaveReviewModal';

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

const AssistantLeaveSection = () => {
  const {
    leaveRequests,
    pendingCount,
    loading,
    submitting,
    reviewLeaveRequest,
  } = useLeave();

  const [selectedRequest, setSelectedRequest] =
    useState<LeaveRequest | null>(null);

  const sortedRequests = [...leaveRequests].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() -
      new Date(a.createdAt).getTime()
  );

  const handleReview = async (
    decision: 'APPROVED' | 'REJECTED',
    notes: string
  ): Promise<ApiResponse<void>> => {
    if (!selectedRequest) {
      return {
        ok: false,
        success: false,
        message: 'Pengajuan izin tidak ditemukan.',
        errorCode: 'NOT_FOUND',
      };
    }

    return reviewLeaveRequest(
      selectedRequest.id,
      decision,
      notes
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.heading}>
        <View>
          <Text style={styles.title}>Pengajuan Izin Praktikan</Text>
          <Text style={styles.subtitle}>
            Periksa dan kelola pengajuan izin praktikum.
          </Text>
        </View>

        <View style={styles.countBadge}>
          <Text style={styles.countText}>
            {pendingCount}
          </Text>
        </View>
      </View>

      <Text style={styles.pendingLabel}>
        {pendingCount} pengajuan menunggu pemeriksaan
      </Text>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.emptyText}>
            Memuat pengajuan izin...
          </Text>
        </View>
      ) : sortedRequests.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyTitle}>
            Belum Ada Pengajuan Izin
          </Text>
          <Text style={styles.emptyText}>
            Pengajuan izin praktikan akan muncul di sini.
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
        >
          {sortedRequests.map((request) => {
            const status = STATUS_CONFIG[request.status];

            return (
              <View
                key={request.id}
                style={styles.card}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.studentInfo}>
                    <Text style={styles.studentName}>
                      {request.studentName}
                    </Text>
                    <Text style={styles.detail}>
                      {request.studentNim} · {request.className}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: status.background },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: status.color },
                      ]}
                    >
                      {status.label}
                    </Text>
                  </View>
                </View>

                <Text style={styles.sessionTitle}>
                  {request.sessionTitle}
                </Text>

                <Text style={styles.reasonLabel}>
                  Alasan Izin
                </Text>
                <Text
                  style={styles.reason}
                  numberOfLines={3}
                >
                  {request.reason}
                </Text>

                <View style={styles.aiInfo}>
                  <Text style={styles.aiLabel}>
                    ✨ Prediksi AI
                  </Text>

                  <Text style={styles.aiCategory}>
                    {request.aiCategory}
                  </Text>

                  {request.aiConfidence !== null ? (
                    <Text style={styles.detail}>
                      Keyakinan:{' '}
                      {(request.aiConfidence * 100).toFixed(1)}%
                    </Text>
                  ) : null}

                  {request.aiStatus !== 'SUCCESS' ? (
                    <Text style={styles.aiWarning}>
                      Layanan AI tidak tersedia atau gagal.
                    </Text>
                  ) : null}

                  <Text style={styles.aiDisclaimer}>
                    Hanya sebagai informasi pendukung.
                  </Text>
                </View>

                <Text style={styles.dateText}>
                  Diajukan: {formatDate(request.createdAt)}
                </Text>

                {request.status === 'PENDING' ? (
                  <Pressable
                    style={styles.reviewButton}
                    onPress={() => setSelectedRequest(request)}
                  >
                    <Text style={styles.reviewButtonText}>
                      Periksa Pengajuan
                    </Text>
                  </Pressable>
                ) : (
                  <View style={styles.reviewedInfo}>
                    <Text style={styles.detail}>
                      Diperiksa oleh: {request.reviewedByName ?? '-'}
                    </Text>
                    {request.reviewNotes ? (
                      <Text style={styles.detail}>
                        Catatan: {request.reviewNotes}
                      </Text>
                    ) : null}
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}

      <LeaveReviewModal
        visible={selectedRequest !== null}
        request={selectedRequest}
        submitting={submitting}
        onClose={() => setSelectedRequest(null)}
        onReview={handleReview}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
  },
  heading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },
  countBadge: {
    minWidth: 34,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  countText: {
    color: '#C2410C',
    fontWeight: '800',
  },
  pendingLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  list: {
    paddingBottom: spacing.xl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  detail: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  sessionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    marginTop: spacing.md,
  },
  reasonLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primaryDark,
    marginTop: spacing.md,
  },
  reason: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
    marginTop: 4,
  },
  aiInfo: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  aiLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  aiCategory: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
    marginTop: 5,
  },
  aiWarning: {
    fontSize: 11,
    color: '#B45309',
    marginTop: 5,
  },
  aiDisclaimer: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 5,
  },
  dateText: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
  reviewButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  reviewButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  reviewedInfo: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
  },
  center: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  emptyText: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});

export default AssistantLeaveSection;

import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useLeave } from '../../../hooks/useLeave';
import type {
  ApiResponse,
  LeaveRequest,
} from '../../../types/models';
import { colors, radius, spacing, theme } from '../../../styles/theme';
import StatusBadge from '../../../components/StatusBadge';
import EmptyState from '../../../components/EmptyState';
import LeaveReviewModal from './LeaveReviewModal';

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
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
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
        <View style={styles.headingText}>
          <Text style={styles.title}>Pengajuan Izin Praktikan</Text>
          <Text style={styles.subtitle}>
            Tinjau dan verifikasi surat perizinan praktikum dengan bantuan klasifikasi AI.
          </Text>
        </View>

        <View style={styles.countBadge}>
          <Text style={styles.countText}>{pendingCount} Menunggu</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.emptyText}>Memuat pengajuan izin...</Text>
        </View>
      ) : sortedRequests.length === 0 ? (
        <EmptyState
          icon="document-text-outline"
          title="Belum Ada Pengajuan Izin"
          message="Pengajuan izin dari praktikan akan muncul di sini untuk ditinjau oleh asisten."
        />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
        >
          {sortedRequests.map((request) => {
            const isPending = request.status === 'PENDING';

            return (
              <View key={request.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.studentInfo}>
                    <Text style={styles.studentName}>{request.studentName}</Text>
                    <Text style={styles.studentMeta}>
                      NIM {request.studentNim} · Kelas {request.className}
                    </Text>
                  </View>

                  <StatusBadge status={request.status} />
                </View>

                <View style={styles.sessionBox}>
                  <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
                  <Text style={styles.sessionTitle} numberOfLines={1}>
                    {request.sessionTitle}
                  </Text>
                </View>

                <Text style={styles.reasonLabel}>Alasan Pengajuan:</Text>
                <Text style={styles.reasonText} numberOfLines={3}>
                  &ldquo;{request.reason}&rdquo;
                </Text>

                {/* AI PREDICTION TAG */}
                <View style={styles.aiTag}>
                  <Ionicons name="sparkles" size={13} color={colors.primaryDark} />
                  <Text style={styles.aiTagText}>
                    Prediksi AI: <Text style={styles.aiTagBold}>{request.aiCategory}</Text>
                    {request.aiConfidence !== null
                      ? ` (${Math.round(request.aiConfidence * 100)}% keyakinan)`
                      : ''}
                  </Text>
                </View>

                {request.reviewNotes ? (
                  <View style={styles.reviewNotesBox}>
                    <Text style={styles.reviewNotesLabel}>Catatan Asisten:</Text>
                    <Text style={styles.reviewNotesText}>{request.reviewNotes}</Text>
                  </View>
                ) : null}

                <View style={styles.cardFooter}>
                  <Text style={styles.dateText}>
                    Diajukan: {formatDate(request.createdAt)}
                  </Text>

                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setSelectedRequest(request)}
                    style={({ pressed }) => [
                      styles.actionBtn,
                      isPending ? styles.actionBtnPending : styles.actionBtnReviewed,
                      pressed && { opacity: 0.8 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.actionBtnText,
                        isPending
                          ? styles.actionBtnTextPending
                          : styles.actionBtnTextReviewed,
                      ]}
                    >
                      {isPending ? 'Periksa Izin' : 'Lihat Detail'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* REVIEW MODAL */}
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
    padding: spacing.lg,
  },
  heading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  headingText: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 17,
    marginTop: 2,
  },
  countBadge: {
    backgroundColor: colors.warningSoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#F5DEB3',
  },
  countText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text,
  },
  list: {
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...theme.shadows.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  studentInfo: {
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
  sessionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.md,
    marginVertical: spacing.xs,
  },
  sessionTitle: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  reasonLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  reasonText: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.text,
    fontStyle: 'italic',
    marginTop: 2,
  },
  aiTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.md,
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
  },
  aiTagText: {
    fontSize: 11,
    color: colors.primaryDark,
  },
  aiTagBold: {
    fontWeight: '800',
  },
  reviewNotesBox: {
    backgroundColor: colors.surfaceMuted,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.borderDark,
    marginTop: spacing.sm,
  },
  reviewNotesLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
  },
  reviewNotesText: {
    fontSize: 12,
    color: colors.text,
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.md,
  },
  dateText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  actionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnPending: {
    backgroundColor: colors.primary,
  },
  actionBtnReviewed: {
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  actionBtnTextPending: {
    color: colors.primaryText,
  },
  actionBtnTextReviewed: {
    color: colors.text,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
});

export default AssistantLeaveSection;

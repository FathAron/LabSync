import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, spacing, theme } from '../../../styles/theme';
import {
  formatIDR,
  type FineInvoice,
  type FineInvoiceStatus,
  type PaymentStatus,
  type PaymentTransaction,
} from '../paymentPlaceholder';

export type PaymentFilterTab = 'all' | 'invoices' | 'transactions';

interface PaymentHistoryListProps {
  activeFilter: PaymentFilterTab;
  invoices: FineInvoice[];
  transactions: PaymentTransaction[];
  busyInvoiceId?: string | null;
  onPayInvoice: (invoice: FineInvoice) => void;
  onSyncTransaction: (orderId: string) => void;
}

const formatDateTimeID = (isoString?: string | null): string => {
  if (!isoString) return '—';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;

  return date.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const INVOICE_STATUS_META: Record<
  FineInvoiceStatus,
  { label: string; bg: string; fg: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  UNPAID: {
    label: 'Belum Dibayar',
    bg: colors.dangerSoft,
    fg: colors.dangerDark,
    icon: 'alert-circle-outline',
  },
  PENDING: {
    label: 'Menunggu Bayar',
    bg: colors.warningSoft,
    fg: colors.warningDark,
    icon: 'time-outline',
  },
  PAID: {
    label: 'Lunas',
    bg: colors.successSoft,
    fg: colors.successDark,
    icon: 'checkmark-circle-outline',
  },
  FAILED: {
    label: 'Gagal',
    bg: colors.dangerSoft,
    fg: colors.dangerDark,
    icon: 'close-circle-outline',
  },
  WAIVED: {
    label: 'Dibebaskan',
    bg: colors.neutralSoft,
    fg: colors.neutralDark,
    icon: 'shield-checkmark-outline',
  },
};

const TX_STATUS_META: Record<
  PaymentStatus,
  { label: string; bg: string; fg: string }
> = {
  pending: {
    label: 'Pending',
    bg: colors.warningSoft,
    fg: colors.warningDark,
  },
  success: {
    label: 'Berhasil',
    bg: colors.successSoft,
    fg: colors.successDark,
  },
  failed: {
    label: 'Gagal',
    bg: colors.dangerSoft,
    fg: colors.dangerDark,
  },
};

const PaymentHistoryList: React.FC<PaymentHistoryListProps> = ({
  activeFilter,
  invoices,
  transactions,
  busyInvoiceId,
  onPayInvoice,
  onSyncTransaction,
}) => {
  const showInvoices = activeFilter === 'all' || activeFilter === 'invoices';
  const showTransactions = activeFilter === 'all' || activeFilter === 'transactions';

  const invoiceById = React.useMemo(() => {
    const map = new Map<string, FineInvoice>();
    invoices.forEach((inv) => map.set(inv.id, inv));
    return map;
  }, [invoices]);

  return (
    <View style={styles.container}>
      {showInvoices && invoices.length > 0 ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Daftar Tagihan Denda</Text>
            <View style={styles.countPill}>
              <Text style={styles.countPillText}>{invoices.length} Tagihan</Text>
            </View>
          </View>

          {invoices.map((invoice) => {
            const meta = INVOICE_STATUS_META[invoice.status];
            const canPay = invoice.status === 'UNPAID' || invoice.status === 'FAILED';
            const isPending = invoice.status === 'PENDING' && Boolean(invoice.latestOrderId);
            const isBusy = busyInvoiceId === invoice.id;

            return (
              <View key={invoice.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.courseBadge}>
                    <Text style={styles.courseBadgeText}>
                      {invoice.courseCode} · {invoice.laboratoryName}
                    </Text>
                  </View>

                  <View style={[styles.statusPill, { backgroundColor: meta.bg }]}>
                    <Ionicons name={meta.icon} size={13} color={meta.fg} />
                    <Text style={[styles.statusText, { color: meta.fg }]}>
                      {meta.label}
                    </Text>
                  </View>
                </View>

                <Text style={styles.sessionTitle}>{invoice.sessionTitle}</Text>
                <Text style={styles.courseName}>{invoice.courseName}</Text>

                <View style={styles.metaGrid}>
                  <View style={styles.metaRow}>
                    <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
                    <Text style={styles.metaText}>
                      Presensi: {formatDateTimeID(invoice.attendanceTimestamp)}
                    </Text>
                  </View>

                  <View style={styles.metaRow}>
                    <Ionicons name="hourglass-outline" size={14} color={colors.warningDark} />
                    <Text style={styles.metaText}>
                      Terlambat {invoice.lateMinutes} menit (toleransi {invoice.gracePeriodMinutes} mnt)
                    </Text>
                  </View>
                </View>

                <View style={styles.amountRow}>
                  <View>
                    <Text style={styles.amountLabel}>Nominal Denda</Text>
                    <Text style={styles.amountValue}>{formatIDR(invoice.amount)}</Text>
                  </View>

                  {canPay ? (
                    <Pressable
                      accessibilityRole="button"
                      disabled={isBusy}
                      onPress={() => onPayInvoice(invoice)}
                      style={({ pressed }) => [
                        styles.payButton,
                        pressed && styles.pressed,
                        isBusy && styles.disabled,
                      ]}
                    >
                      <Ionicons name="card-outline" size={16} color={colors.primaryText} />
                      <Text style={styles.payButtonText}>
                        {isBusy
                          ? 'Memproses...'
                          : invoice.status === 'FAILED'
                          ? 'Bayar Ulang'
                          : 'Bayar Sekarang'}
                      </Text>
                    </Pressable>
                  ) : isPending && invoice.latestOrderId ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => onSyncTransaction(invoice.latestOrderId!)}
                      style={({ pressed }) => [
                        styles.syncButton,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Ionicons name="refresh-outline" size={15} color={colors.mochaDark} />
                      <Text style={styles.syncButtonText}>Cek Status</Text>
                    </Pressable>
                  ) : invoice.paidAt ? (
                    <Text style={styles.paidDateText}>
                      Lunas: {formatDateTimeID(invoice.paidAt)}
                    </Text>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      ) : null}

      {showTransactions && transactions.length > 0 ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Riwayat Transaksi</Text>
            <View style={styles.countPill}>
              <Text style={styles.countPillText}>{transactions.length} Transaksi</Text>
            </View>
          </View>

          {transactions.map((tx) => {
            const meta = TX_STATUS_META[tx.status];
            const relatedInvoice = invoiceById.get(tx.invoiceId);

            return (
              <View key={tx.orderId} style={styles.txCard}>
                <View style={styles.txTop}>
                  <View style={styles.txInfo}>
                    <Text style={styles.txTitle} numberOfLines={1}>
                      {relatedInvoice?.sessionTitle ?? 'Pembayaran Denda Praktikum'}
                    </Text>
                    <Text style={styles.txOrderId} numberOfLines={1}>
                      Order: {tx.orderId}
                    </Text>
                  </View>

                  <View style={[styles.statusPill, { backgroundColor: meta.bg }]}>
                    <Text style={[styles.statusText, { color: meta.fg }]}>
                      {meta.label}
                    </Text>
                  </View>
                </View>

                <View style={styles.txBottom}>
                  <View style={styles.txMeta}>
                    <Ionicons name="time-outline" size={13} color={colors.textMuted} />
                    <Text style={styles.txDate}>
                      {formatDateTimeID(tx.paidAt ?? tx.createdAt)}
                    </Text>
                    <Text style={styles.txProvider}>
                      · {tx.paymentType ? tx.paymentType.toUpperCase() : 'MIDTRANS'}
                    </Text>
                  </View>

                  <Text style={styles.txAmount}>{formatIDR(tx.amount)}</Text>
                </View>
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  section: {
    gap: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.mochaDark,
  },
  countPill: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  countPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    ...theme.shadows.card,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  courseBadge: {
    flexShrink: 1,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  courseBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  sessionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.mochaDark,
  },
  courseName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 2,
  },
  metaGrid: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    flex: 1,
    fontSize: 12,
    color: colors.textMuted,
  },
  amountRow: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  amountLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  amountValue: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.mochaDark,
    marginTop: 1,
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
    ...theme.shadows.button,
  },
  payButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primaryText,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.butterCreamSoft,
    borderWidth: 1,
    borderColor: colors.butterCream,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  syncButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.butterCreamDark,
  },
  paidDateText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.successDark,
  },
  txCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  txTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  txInfo: {
    flex: 1,
    minWidth: 0,
  },
  txTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.mochaDark,
  },
  txOrderId: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  txBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  txMeta: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  txDate: {
    fontSize: 11,
    color: colors.textMuted,
  },
  txProvider: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.mochaDark,
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.6,
  },
});

export default PaymentHistoryList;

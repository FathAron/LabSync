import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useApp } from '../../src/context/AppContext';
import PaymentHistoryList, {
  type PaymentFilterTab,
} from '../../src/features/student/components/PaymentHistoryList';
import StudentEmptyState from '../../src/features/student/components/StudentEmptyState';
import {
  formatIDR,
  useFinesPlaceholder,
  type FineInvoice,
} from '../../src/features/student/paymentPlaceholder';
import { triggerPlaceholderPaymentNotification } from '../../src/services/notificationService';
import {
  CONTENT_MAX_WIDTH,
  colors,
  radius,
  spacing,
  theme,
} from '../../src/styles/theme';

const PaymentsScreen = () => {
  const { currentStudent, showToast } = useApp();

  // PLACEHOLDER: Ganti ke `useFines()` dari `src/hooks/useFines.ts` saat modul Midtrans (Naufal) siap.
  const {
    isPlaceholder,
    invoices,
    transactions,
    loading,
    createCheckoutTransaction,
    syncTransactionStatus,
    simulateWebhookResult,
    resetPlaceholderData,
  } = useFinesPlaceholder(currentStudent);

  const [activeFilter, setActiveFilter] = useState<PaymentFilterTab>('all');
  const [busyInvoiceId, setBusyInvoiceId] = useState<string | null>(null);
  const [pendingCheckout, setPendingCheckout] = useState<{
    invoice: FineInvoice;
    orderId: string;
    redirectUrl: string;
  } | null>(null);

  const summary = useMemo(() => {
    const unpaidInvoices = invoices.filter(
      (inv) =>
        inv.status === 'UNPAID' ||
        inv.status === 'PENDING' ||
        inv.status === 'FAILED'
    );
    const paidInvoices = invoices.filter((inv) => inv.status === 'PAID');

    const totalUnpaidAmount = unpaidInvoices.reduce(
      (sum, inv) => sum + inv.amount,
      0
    );
    const totalPaidAmount = paidInvoices.reduce(
      (sum, inv) => sum + inv.amount,
      0
    );

    return {
      unpaidCount: unpaidInvoices.length,
      totalUnpaidAmount,
      totalPaidAmount,
    };
  }, [invoices]);

  const handlePayInvoice = async (invoice: FineInvoice) => {
    if (busyInvoiceId) return;
    setBusyInvoiceId(invoice.id);

    try {
      const res = await createCheckoutTransaction(invoice.id);
      if (!res.ok || !res.data) {
        showToast(res.message, 'error');
        return;
      }

      setPendingCheckout({
        invoice,
        orderId: res.data.orderId,
        redirectUrl: res.data.redirectUrl,
      });
    } finally {
      setBusyInvoiceId(null);
    }
  };

  const handleSyncTransaction = async (orderId: string) => {
    const res = await syncTransactionStatus(orderId);
    if (res.ok && res.data) {
      if (res.data.status === 'pending' && isPlaceholder) {
        const linkedInvoice = invoices.find((inv) => inv.id === res.data?.invoiceId);
        if (linkedInvoice) {
          setPendingCheckout({
            invoice: linkedInvoice,
            orderId: res.data.orderId,
            redirectUrl:
              res.data.redirectUrl ??
              'https://app.sandbox.midtrans.com/snap/v2/vtweb/placeholder',
          });
          return;
        }
      }
      showToast(res.message, 'info');
    } else {
      showToast(res.message, 'error');
    }
  };

  const handleSimulateOutcome = async (outcome: 'success' | 'failed') => {
    if (!pendingCheckout) return;

    const { orderId, invoice } = pendingCheckout;
    const res = await simulateWebhookResult(orderId, outcome);
    setPendingCheckout(null);

    if (res.ok) {
      showToast(res.message, outcome === 'success' ? 'success' : 'warning');
      await triggerPlaceholderPaymentNotification(
        outcome === 'success' ? 'PAYMENT_SUCCESS' : 'PAYMENT_FAILED',
        {
          invoiceId: invoice.id,
          orderId,
          amount: invoice.amount,
          sessionTitle: invoice.sessionTitle,
        }
      );
    } else {
      showToast(res.message, 'error');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Memuat tagihan & riwayat pembayaran...</Text>
      </View>
    );
  }

  if (!currentStudent) {
    return (
      <StudentEmptyState
        icon="person-outline"
        title="Identitas Praktikan Belum Tersedia"
        message="Silakan masuk menggunakan akun praktikan untuk melihat tagihan dan riwayat pembayaran."
      />
    );
  }

  const hasVisibleContent =
    (activeFilter === 'all' && (invoices.length > 0 || transactions.length > 0)) ||
    (activeFilter === 'invoices' && invoices.length > 0) ||
    (activeFilter === 'transactions' && transactions.length > 0);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* SUMMARY CARDS */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, styles.statCardWarning]}>
            <Text style={styles.statLabel}>Tagihan Belum Lunas</Text>
            <Text style={[styles.statAmount, { color: colors.dangerDark }]}>
              {formatIDR(summary.totalUnpaidAmount)}
            </Text>
            <Text style={styles.statSub}>{summary.unpaidCount} Tagihan aktif</Text>
          </View>

          <View style={[styles.statCard, styles.statCardSuccess]}>
            <Text style={styles.statLabel}>Total Sudah Lunas</Text>
            <Text style={[styles.statAmount, { color: colors.successDark }]}>
              {formatIDR(summary.totalPaidAmount)}
            </Text>
            <Text style={styles.statSub}>{transactions.length} Transaksi tercatat</Text>
          </View>
        </View>

        {/* PLACEHOLDER INTEGRATION BANNER */}
        {isPlaceholder ? (
          <View style={styles.placeholderBanner}>
            <View style={styles.placeholderHeader}>
              <Ionicons name="construct-outline" size={16} color={colors.butterCreamDark} />
              <Text style={styles.placeholderTitle}>
                Mode Placeholder Pembayaran & Notifikasi
              </Text>
            </View>
            <Text style={styles.placeholderBody}>
              Data tagihan & riwayat disimpan secara persisten di perangkat sambil menunggu
              integrasi backend Midtrans Sandbox. Anda dapat menekan &ldquo;Bayar Sekarang&rdquo;
              untuk menguji alur checkout & notifikasi.
            </Text>

            <View style={styles.placeholderActions}>
              <Pressable
                accessibilityRole="button"
                onPress={async () => {
                  const res = await triggerPlaceholderPaymentNotification('FINE_CREATED', {
                    amount: 10000,
                    sessionTitle: 'Modul 4 - Struktur Data Tree',
                  });
                  showToast(res.message, res.ok ? 'info' : 'error');
                }}
                style={styles.placeholderBtn}
              >
                <Ionicons name="notifications-outline" size={14} color={colors.mochaDark} />
                <Text style={styles.placeholderBtnText}>Tes Notif Tagihan</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={async () => {
                  await resetPlaceholderData();
                  showToast('Data placeholder pembayaran direset.', 'info');
                }}
                style={styles.placeholderBtn}
              >
                <Ionicons name="refresh-outline" size={14} color={colors.mochaDark} />
                <Text style={styles.placeholderBtnText}>Reset Demo</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {/* FILTER TABS */}
        <View style={styles.filterRow}>
          {(
            [
              { key: 'all', label: 'Semua' },
              { key: 'invoices', label: `Tagihan (${invoices.length})` },
              { key: 'transactions', label: `Transaksi (${transactions.length})` },
            ] as const
          ).map((tab) => {
            const active = activeFilter === tab.key;
            return (
              <Pressable
                key={tab.key}
                accessibilityRole="button"
                onPress={() => setActiveFilter(tab.key)}
                style={[styles.filterPill, active && styles.filterPillActive]}
              >
                <Text style={[styles.filterText, active && styles.filterTextActive]}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {hasVisibleContent ? (
          <PaymentHistoryList
            activeFilter={activeFilter}
            invoices={invoices}
            transactions={transactions}
            busyInvoiceId={busyInvoiceId}
            onPayInvoice={handlePayInvoice}
            onSyncTransaction={handleSyncTransaction}
          />
        ) : (
          <StudentEmptyState
            icon="wallet-outline"
            title="Belum Ada Tagihan atau Transaksi"
            message="Tagihan denda keterlambatan dan riwayat pembayaran Midtrans akan muncul di halaman ini."
          />
        )}
      </ScrollView>

      {/* PLACEHOLDER MIDTRANS CHECKOUT MODAL */}
      <Modal
        visible={pendingCheckout !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPendingCheckout(null)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setPendingCheckout(null)}
          />
          {pendingCheckout ? (
            <View style={styles.modalCard}>
              <View style={styles.modalIcon}>
                <Ionicons name="card-outline" size={26} color={colors.primaryDark} />
              </View>
              <Text style={styles.modalTitle}>Placeholder Checkout Midtrans</Text>
              <Text style={styles.modalSubtitle}>
                {pendingCheckout.invoice.sessionTitle} ·{' '}
                {formatIDR(pendingCheckout.invoice.amount)}
              </Text>
              <Text style={styles.modalOrderText}>Order ID: {pendingCheckout.orderId}</Text>
              <Text style={styles.modalBody}>
                Backend Midtrans Sandbox belum terhubung. Pilih hasil simulasi webhook
                untuk memverifikasi pembaruan riwayat & notifikasi:
              </Text>

              <View style={styles.modalActions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => handleSimulateOutcome('success')}
                  style={[styles.modalBtn, styles.modalBtnSuccess]}
                >
                  <Text style={styles.modalBtnSuccessText}>Simulasikan Berhasil (Lunas)</Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  onPress={() => handleSimulateOutcome('failed')}
                  style={[styles.modalBtn, styles.modalBtnDanger]}
                >
                  <Text style={styles.modalBtnDangerText}>Simulasikan Gagal</Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setPendingCheckout(null);
                    showToast('Transaksi disimpan dengan status PENDING.', 'info');
                  }}
                  style={[styles.modalBtn, styles.modalBtnNeutral]}
                >
                  <Text style={styles.modalBtnNeutralText}>Biarkan Pending</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: 'center',
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 13,
    color: colors.textMuted,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 2,
    gap: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    ...theme.shadows.card,
  },
  statCardWarning: {
    backgroundColor: colors.dangerSoft,
    borderColor: '#F5C2C7',
  },
  statCardSuccess: {
    backgroundColor: colors.successSoft,
    borderColor: '#C6DEC8',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  statAmount: {
    fontSize: 17,
    fontWeight: '800',
    marginTop: 4,
  },
  statSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  placeholderBanner: {
    backgroundColor: colors.butterCreamSoft,
    borderWidth: 1,
    borderColor: colors.butterCream,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.xs,
  },
  placeholderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  placeholderTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.butterCreamDark,
  },
  placeholderBody: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.textSecondary,
  },
  placeholderActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  placeholderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
  },
  placeholderBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.mochaDark,
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  filterPill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterPillActive: {
    backgroundColor: colors.mocha,
    borderColor: colors.mocha,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    ...theme.shadows.modal,
  },
  modalIcon: {
    width: 50,
    height: 50,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.mochaDark,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryDark,
    textAlign: 'center',
    marginTop: 4,
  },
  modalOrderText: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  modalBody: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  modalActions: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  modalBtn: {
    minHeight: 42,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  modalBtnSuccess: {
    backgroundColor: colors.success,
  },
  modalBtnSuccessText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  modalBtnDanger: {
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: '#F5C2C7',
  },
  modalBtnDangerText: {
    color: colors.dangerDark,
    fontSize: 13,
    fontWeight: '800',
  },
  modalBtnNeutral: {
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalBtnNeutralText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
});

export default PaymentsScreen;

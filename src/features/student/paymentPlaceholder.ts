import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { ApiResponse, UserProfile } from '../../types/models';

// ==========================================
// KONTRAK TIPE SPRINT 4 (SESUAI SPRINT_4_MODELS_API_AND_PAYMENT.md)
// Saat modul Naufal (src/hooks/useFines.ts & src/types/models.ts) sudah di-merge,
// tipe ini dapat langsung diimpor dari src/types/models.ts.
// ==========================================

export type FineInvoiceStatus =
  | 'UNPAID'
  | 'PENDING'
  | 'PAID'
  | 'FAILED'
  | 'WAIVED';

export interface FineInvoice {
  id: string; // `${sessionId}_${studentId}`
  sessionId: string;
  sessionTitle: string;
  courseCode: string;
  courseName: string;
  laboratoryId: string;
  laboratoryName: string;
  studentId: string;
  studentNim: string;
  studentName: string;
  className: string;
  attendanceId: string;
  attendanceTimestamp: string;
  sessionStartAt: string;
  gracePeriodMinutes: number;
  lateMinutes: number;
  amount: number;
  status: FineInvoiceStatus;
  latestOrderId?: string | null;
  paidAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type PaymentStatus = 'pending' | 'success' | 'failed';

export interface PaymentTransaction {
  orderId: string;
  invoiceId: string;
  studentId: string;
  sessionId: string;
  amount: number;
  provider: 'midtrans_sandbox';
  snapToken?: string;
  redirectUrl?: string;
  paymentType?: string | null;
  midtransTransactionId?: string | null;
  midtransStatus?: string;
  status: PaymentStatus;
  paidAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UseFinesResult {
  invoices: FineInvoice[];
  transactions: PaymentTransaction[];
  loading: boolean;
  createCheckoutTransaction: (
    invoiceId: string
  ) => Promise<ApiResponse<{ orderId: string; snapToken: string; redirectUrl: string }>>;
  syncTransactionStatus: (orderId: string) => Promise<ApiResponse<PaymentTransaction>>;
}

export interface UseFinesPlaceholderResult extends UseFinesResult {
  isPlaceholder: true;
  simulateWebhookResult: (
    orderId: string,
    outcome: 'success' | 'failed'
  ) => Promise<ApiResponse<PaymentTransaction>>;
  resetPlaceholderData: () => Promise<void>;
}

const STORAGE_KEY_PREFIX = 'labsync:sprint4_payments_placeholder_v1:';

interface StoredPlaceholderState {
  invoices: FineInvoice[];
  transactions: PaymentTransaction[];
}

export const formatIDR = (amount: number): string => {
  const safe = Number.isFinite(amount) ? Math.max(0, Math.round(amount)) : 0;
  return `Rp ${safe.toLocaleString('id-ID')}`;
};

const createInitialPlaceholderState = (
  student: UserProfile
): StoredPlaceholderState => {
  const now = Date.now();
  const iso = (offsetMs: number) => new Date(now + offsetMs).toISOString();
  const studentId = student.uid;
  const studentNim = student.nim || '24060123140000';
  const studentName = student.name || 'Praktikan';
  const className = student.className || 'Kelas A';

  const paidOrderId = `LABSYNC-demo_sess_1_${studentId}-1`;
  const failedOrderId = `LABSYNC-demo_sess_3_${studentId}-2`;

  return {
    invoices: [
      {
        id: `demo_sess_2_${studentId}`,
        sessionId: 'demo_sess_2',
        sessionTitle: 'Modul 4 - Struktur Data Tree',
        courseCode: 'PAIK6201',
        courseName: 'Struktur Data',
        laboratoryId: 'lab-a',
        laboratoryName: 'Lab Komputer A',
        studentId,
        studentNim,
        studentName,
        className,
        attendanceId: `demo_sess_2_${studentId}`,
        attendanceTimestamp: iso(-2 * 3600_000),
        sessionStartAt: iso(-2 * 3600_000 - 25 * 60_000),
        gracePeriodMinutes: 15,
        lateMinutes: 10,
        amount: 10000,
        status: 'UNPAID',
        latestOrderId: null,
        paidAt: null,
        createdAt: iso(-2 * 3600_000),
        updatedAt: iso(-2 * 3600_000),
      },
      {
        id: `demo_sess_3_${studentId}`,
        sessionId: 'demo_sess_3',
        sessionTitle: 'Modul 3 - Graf & Traversal',
        courseCode: 'PAIK6201',
        courseName: 'Struktur Data',
        laboratoryId: 'lab-b',
        laboratoryName: 'Lab Komputer B',
        studentId,
        studentNim,
        studentName,
        className,
        attendanceId: `demo_sess_3_${studentId}`,
        attendanceTimestamp: iso(-5 * 86400_000),
        sessionStartAt: iso(-5 * 86400_000 - 22 * 60_000),
        gracePeriodMinutes: 15,
        lateMinutes: 7,
        amount: 10000,
        status: 'FAILED',
        latestOrderId: failedOrderId,
        paidAt: null,
        createdAt: iso(-5 * 86400_000),
        updatedAt: iso(-5 * 86400_000 + 600_000),
      },
      {
        id: `demo_sess_1_${studentId}`,
        sessionId: 'demo_sess_1',
        sessionTitle: 'Modul 2 - Linked List',
        courseCode: 'PAIK6201',
        courseName: 'Struktur Data',
        laboratoryId: 'lab-a',
        laboratoryName: 'Lab Komputer A',
        studentId,
        studentNim,
        studentName,
        className,
        attendanceId: `demo_sess_1_${studentId}`,
        attendanceTimestamp: iso(-10 * 86400_000),
        sessionStartAt: iso(-10 * 86400_000 - 30 * 60_000),
        gracePeriodMinutes: 15,
        lateMinutes: 15,
        amount: 10000,
        status: 'PAID',
        latestOrderId: paidOrderId,
        paidAt: iso(-9 * 86400_000),
        createdAt: iso(-10 * 86400_000),
        updatedAt: iso(-9 * 86400_000),
      },
    ],
    transactions: [
      {
        orderId: failedOrderId,
        invoiceId: `demo_sess_3_${studentId}`,
        studentId,
        sessionId: 'demo_sess_3',
        amount: 10000,
        provider: 'midtrans_sandbox',
        paymentType: 'qris',
        midtransStatus: 'expire',
        status: 'failed',
        paidAt: null,
        createdAt: iso(-5 * 86400_000 + 300_000),
        updatedAt: iso(-5 * 86400_000 + 600_000),
      },
      {
        orderId: paidOrderId,
        invoiceId: `demo_sess_1_${studentId}`,
        studentId,
        sessionId: 'demo_sess_1',
        amount: 10000,
        provider: 'midtrans_sandbox',
        paymentType: 'qris',
        midtransTransactionId: 'sandbox-tx-001',
        midtransStatus: 'settlement',
        status: 'success',
        paidAt: iso(-9 * 86400_000),
        createdAt: iso(-9 * 86400_000 - 120_000),
        updatedAt: iso(-9 * 86400_000),
      },
    ],
  };
};

/**
 * Hook placeholder persisten (AsyncStorage) untuk riwayat & tagihan denda.
 * Tinggal diganti ke `useFines()` dari `src/hooks/useFines.ts` ketika
 * backend Midtrans Sandbox (Naufal) sudah tersedia.
 */
export const useFinesPlaceholder = (
  student: UserProfile | null
): UseFinesPlaceholderResult => {
  const [state, setState] = useState<StoredPlaceholderState>({
    invoices: [],
    transactions: [],
  });
  const [loading, setLoading] = useState(true);

  const studentId = student?.uid ?? '';
  const storageKey = studentId ? `${STORAGE_KEY_PREFIX}${studentId}` : '';

  const persistState = useCallback(
    async (next: StoredPlaceholderState) => {
      setState(next);
      if (storageKey) {
        try {
          await AsyncStorage.setItem(storageKey, JSON.stringify(next));
        } catch (error) {
          console.warn('[PaymentPlaceholder] Gagal menyimpan state lokal:', error);
        }
      }
    },
    [storageKey]
  );

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!student || !storageKey) {
        if (!cancelled) {
          setState({ invoices: [], transactions: [] });
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      try {
        const raw = await AsyncStorage.getItem(storageKey);
        if (raw) {
          const parsed = JSON.parse(raw) as StoredPlaceholderState;
          if (!cancelled && Array.isArray(parsed.invoices) && Array.isArray(parsed.transactions)) {
            setState(parsed);
            setLoading(false);
            return;
          }
        }
      } catch {
        // Fallback ke initial state jika cache korup
      }

      const initial = createInitialPlaceholderState(student);
      if (!cancelled) {
        setState(initial);
        setLoading(false);
      }
      try {
        await AsyncStorage.setItem(storageKey, JSON.stringify(initial));
      } catch {
        // Abaikan error tulis awal
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [student, storageKey]);

  const createCheckoutTransaction = useCallback(
    async (
      invoiceId: string
    ): Promise<ApiResponse<{ orderId: string; snapToken: string; redirectUrl: string }>> => {
      const target = state.invoices.find((inv) => inv.id === invoiceId);
      if (!target) {
        return {
          ok: false,
          success: false,
          message: 'Tagihan denda tidak ditemukan.',
          errorCode: 'NOT_FOUND',
        };
      }

      if (target.status === 'PAID' || target.status === 'WAIVED') {
        return {
          ok: false,
          success: false,
          message: 'Tagihan ini sudah lunas atau dibebaskan.',
          errorCode: 'ALREADY_EXISTS',
        };
      }

      const nowIso = new Date().toISOString();
      const orderId = `LABSYNC-${invoiceId}-${Date.now()}`;
      const snapToken = `placeholder-snap-${Date.now()}`;
      const redirectUrl = `https://app.sandbox.midtrans.com/snap/v2/vtweb/${snapToken}`;

      const newTx: PaymentTransaction = {
        orderId,
        invoiceId,
        studentId: target.studentId,
        sessionId: target.sessionId,
        amount: target.amount,
        provider: 'midtrans_sandbox',
        snapToken,
        redirectUrl,
        paymentType: 'placeholder_snap',
        midtransStatus: 'pending',
        status: 'pending',
        paidAt: null,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      const next: StoredPlaceholderState = {
        invoices: state.invoices.map((inv) =>
          inv.id === invoiceId
            ? { ...inv, status: 'PENDING', latestOrderId: orderId, updatedAt: nowIso }
            : inv
        ),
        transactions: [newTx, ...state.transactions],
      };

      await persistState(next);

      return {
        ok: true,
        success: true,
        message: 'Transaksi placeholder Midtrans berhasil dibuat.',
        data: { orderId, snapToken, redirectUrl },
      };
    },
    [persistState, state]
  );

  const simulateWebhookResult = useCallback(
    async (
      orderId: string,
      outcome: 'success' | 'failed'
    ): Promise<ApiResponse<PaymentTransaction>> => {
      const tx = state.transactions.find((item) => item.orderId === orderId);
      if (!tx) {
        return {
          ok: false,
          success: false,
          message: 'Transaksi tidak ditemukan.',
          errorCode: 'NOT_FOUND',
        };
      }

      const nowIso = new Date().toISOString();
      const updatedTx: PaymentTransaction = {
        ...tx,
        status: outcome,
        midtransStatus: outcome === 'success' ? 'settlement' : 'deny',
        midtransTransactionId: outcome === 'success' ? `sandbox-${Date.now()}` : null,
        paidAt: outcome === 'success' ? nowIso : null,
        updatedAt: nowIso,
      };

      const nextInvoiceStatus: FineInvoiceStatus =
        outcome === 'success' ? 'PAID' : 'FAILED';

      const next: StoredPlaceholderState = {
        invoices: state.invoices.map((inv) =>
          inv.id === tx.invoiceId
            ? {
                ...inv,
                status: nextInvoiceStatus,
                paidAt: outcome === 'success' ? nowIso : inv.paidAt ?? null,
                updatedAt: nowIso,
              }
            : inv
        ),
        transactions: state.transactions.map((item) =>
          item.orderId === orderId ? updatedTx : item
        ),
      };

      await persistState(next);

      return {
        ok: true,
        success: true,
        message:
          outcome === 'success'
            ? 'Simulasi webhook: Pembayaran berhasil dikonfirmasi lunas.'
            : 'Simulasi webhook: Pembayaran ditandai gagal.',
        data: updatedTx,
      };
    },
    [persistState, state]
  );

  const syncTransactionStatus = useCallback(
    async (orderId: string): Promise<ApiResponse<PaymentTransaction>> => {
      const tx = state.transactions.find((item) => item.orderId === orderId);
      if (!tx) {
        return {
          ok: false,
          success: false,
          message: 'Transaksi tidak ditemukan.',
          errorCode: 'NOT_FOUND',
        };
      }

      return {
        ok: true,
        success: true,
        message: `Status transaksi ${orderId}: ${tx.status.toUpperCase()} (mode placeholder).`,
        data: tx,
      };
    },
    [state.transactions]
  );

  const resetPlaceholderData = useCallback(async () => {
    if (!student) return;
    const initial = createInitialPlaceholderState(student);
    await persistState(initial);
  }, [persistState, student]);

  return {
    isPlaceholder: true,
    invoices: state.invoices,
    transactions: state.transactions,
    loading,
    createCheckoutTransaction,
    syncTransactionStatus,
    simulateWebhookResult,
    resetPlaceholderData,
  };
};

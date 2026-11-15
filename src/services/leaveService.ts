import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  setDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';

import { db } from './firebaseConfig';

import type {
  AIClassificationResult,
  ApiErrorCode,
  ApiResponse,
  LeaveRequest,
  Session,
  UserProfile,
} from '../types/models';

type LeaveDecision = 'APPROVED' | 'REJECTED';

type LeaveListener = (requests: LeaveRequest[]) => void;
type ErrorListener = (message: string) => void;

class LeaveServiceError extends Error {
  constructor(
    message: string,
    public readonly code: ApiErrorCode
  ) {
    super(message);
    this.name = 'LeaveServiceError';
  }
}

const getErrorDetails = (
  error: unknown
): { code: ApiErrorCode; message: string } => {
  if (error instanceof LeaveServiceError) {
    return {
      code: error.code,
      message: error.message,
    };
  }

  const firebaseCode =
    typeof error === 'object' &&
    error !== null &&
    'code' in error
      ? String(error.code)
      : '';

  if (firebaseCode === 'permission-denied') {
    return {
      code: 'FORBIDDEN',
      message: 'Anda tidak memiliki izin untuk melakukan tindakan ini.',
    };
  }

  if (
    ['unavailable', 'deadline-exceeded', 'network-request-failed']
      .includes(firebaseCode)
  ) {
    return {
      code: 'NETWORK_ERROR',
      message: 'Koneksi bermasalah. Silakan coba kembali.',
    };
  }

  if (firebaseCode === 'not-found') {
    return {
      code: 'NOT_FOUND',
      message: 'Data pengajuan izin tidak ditemukan.',
    };
  }

  return {
    code: 'INTERNAL_ERROR',
    message: 'Terjadi kesalahan saat memproses pengajuan izin.',
  };
};

const toTimestamp = (value: string): number => {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
};

/**
 * Real-time listener pengajuan izin.
 * Student hanya menerima pengajuan miliknya.
 * Assistant menerima seluruh pengajuan.
 */
export const subscribeLeaveRequests = (
  user: UserProfile,
  onData: LeaveListener,
  onError: ErrorListener
): Unsubscribe => {
  const requestsRef = collection(db, 'leaveRequests');

  const requestsQuery =
    user.role === 'student'
      ? query(
          requestsRef,
          where('studentId', '==', user.uid)
        )
      : requestsRef;

  return onSnapshot(
    requestsQuery,
    (snapshot) => {
      const requests = snapshot.docs
        .map((item) => ({
          ...item.data(),
          id: item.id,
        }) as LeaveRequest)
        .sort(
          (a, b) =>
            toTimestamp(b.createdAt) - toTimestamp(a.createdAt)
        );

      onData(requests);
    },
    (error) => {
      onError(
        error.message ||
          'Gagal memperbarui daftar pengajuan izin.'
      );
    }
  );
};

/**
 * Membuat pengajuan izin praktikan.
 * AI hanya menyimpan informasi klasifikasi.
 * Status pengajuan selalu PENDING.
 */
export const createLeaveRequest = async (
  student: UserProfile,
  session: Session,
  reason: string,
  aiResponse: ApiResponse<AIClassificationResult>
): Promise<ApiResponse<LeaveRequest>> => {
  const trimmedReason = reason.trim();

  if (student.role !== 'student') {
    return {
      ok: false,
      success: false,
      message: 'Hanya praktikan yang dapat mengajukan izin.',
      errorCode: 'FORBIDDEN',
    };
  }

  if (!trimmedReason) {
    return {
      ok: false,
      success: false,
      message: 'Alasan izin tidak boleh kosong.',
      errorCode: 'VALIDATION_ERROR',
    };
  }

  if (!session.id || !student.uid) {
    return {
      ok: false,
      success: false,
      message: 'Identitas praktikan atau sesi tidak valid.',
      errorCode: 'VALIDATION_ERROR',
    };
  }

  try {
    // Periksa izin sebelumnya untuk sesi yang sama.
    const studentRequestsQuery = query(
      collection(db, 'leaveRequests'),
      where('studentId', '==', student.uid)
    );

    const existingRequests = await getDocs(
      studentRequestsQuery
    );

    const duplicate = existingRequests.docs.some((item) => {
      const existing = item.data() as LeaveRequest;

      return (
        existing.sessionId === session.id &&
        ['PENDING', 'APPROVED'].includes(existing.status)
      );
    });

    if (duplicate) {
      return {
        ok: false,
        success: false,
        message: 'Anda sudah memiliki pengajuan izin aktif untuk sesi ini.',
        errorCode: 'ALREADY_EXISTS',
      };
    }

    const now = new Date().toISOString();

    const aiResult: AIClassificationResult =
      aiResponse.data ?? {
        category: 'Belum Terklasifikasi (Layanan AI Tidak Tersedia)',
        confidence: null,
        status: 'UNAVAILABLE',
        errorMessage: aiResponse.message,
        classifiedAt: now,
      };

    // ID dokumen dibuat sebelum penyimpanan.
    const requestRef = doc(
      collection(db, 'leaveRequests')
    );

    const leaveRequest: LeaveRequest = {
      id: requestRef.id,
      sessionId: session.id,
      sessionTitle: `${session.courseName} - ${session.moduleCode}`,
      className: session.className,
      studentId: student.uid,
      studentNim: student.nim,
      studentName: student.name,
      reason: trimmedReason,

      aiCategory: aiResult.category,
      aiConfidence: aiResult.confidence,
      aiStatus: aiResult.status,

      // WAJIB PENDING. Tidak pernah ditentukan oleh AI.
      status: 'PENDING',

      reviewedBy: null,
      reviewedByName: null,
      reviewedAt: null,
      reviewNotes: '',

      createdAt: now,
      updatedAt: now,
    };

    await setDoc(requestRef, leaveRequest);

    return {
      ok: true,
      success: true,
      message: 'Pengajuan izin berhasil disimpan dan menunggu pemeriksaan asisten.',
      data: leaveRequest,
    };
  } catch (error) {
    const details = getErrorDetails(error);

    return {
      ok: false,
      success: false,
      message: details.message,
      errorCode: details.code,
    };
  }
};

/**
 * Keputusan izin oleh asisten.
 * Hanya pengajuan PENDING yang dapat diperiksa.
 */
export const reviewLeaveRequest = async (
  leaveId: string,
  assistant: UserProfile,
  decision: LeaveDecision,
  reviewNotes = ''
): Promise<ApiResponse<void>> => {
  if (assistant.role !== 'assistant') {
    return {
      ok: false,
      success: false,
      message: 'Hanya asisten yang dapat memeriksa pengajuan izin.',
      errorCode: 'FORBIDDEN',
    };
  }

  if (!leaveId || !['APPROVED', 'REJECTED'].includes(decision)) {
    return {
      ok: false,
      success: false,
      message: 'Data keputusan izin tidak valid.',
      errorCode: 'VALIDATION_ERROR',
    };
  }

  try {
    const leaveRef = doc(db, 'leaveRequests', leaveId);

    await runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(leaveRef);

      if (!snapshot.exists()) {
        throw new LeaveServiceError(
          'Pengajuan izin tidak ditemukan.',
          'NOT_FOUND'
        );
      }

      const existing = snapshot.data() as LeaveRequest;

      if (existing.status !== 'PENDING') {
        throw new LeaveServiceError(
          'Pengajuan izin sudah diperiksa sebelumnya.',
          'ALREADY_EXISTS'
        );
      }

      const reviewedAt = new Date().toISOString();

      transaction.update(leaveRef, {
        status: decision,
        reviewedBy: assistant.uid,
        reviewedByName: assistant.name,
        reviewedAt,
        reviewNotes: reviewNotes.trim(),
        updatedAt: reviewedAt,
      });
    });

    return {
      ok: true,
      success: true,
      message:
        decision === 'APPROVED'
          ? 'Pengajuan izin berhasil disetujui.'
          : 'Pengajuan izin berhasil ditolak.',
    };
  } catch (error) {
    const details = getErrorDetails(error);

    return {
      ok: false,
      success: false,
      message: details.message,
      errorCode: details.code,
    };
  }
};

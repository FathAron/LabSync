import { useCallback, useEffect, useState } from 'react';

import { useApp } from '../context/AppContext';

import {
  classifyLeaveReason,
  setAIErrorReporter,
} from '../services/aiService';

import {
  createLeaveRequest,
  reviewLeaveRequest as reviewLeaveRequestService,
  subscribeLeaveRequests,
} from '../services/leaveService';

import type {
  ApiResponse,
  LeaveRequest,
  Session,
  UseLeaveResult,
} from '../types/models';

interface LeaveSnapshot {
  userId: string;
  requests: LeaveRequest[];
  loaded: boolean;
}

export const useLeave = (): UseLeaveResult => {
  const {
    currentUser,
    reportError,
    showToast,
  } = useApp();

  const [leaveSnapshot, setLeaveSnapshot] =
    useState<LeaveSnapshot>({
      userId: '',
      requests: [],
      loaded: false,
    });

  const [submitting, setSubmitting] = useState(false);

  // Menghubungkan error AI ke AppContext.
  useEffect(() => {
    setAIErrorReporter(reportError);

    return () => {
      setAIErrorReporter(null);
    };
  }, [reportError]);

  // Listener real-time pengajuan izin.
  useEffect(() => {
    if (!currentUser) {
      return;
    }

    const userId = currentUser.uid;

    const unsubscribe = subscribeLeaveRequests(
      currentUser,
      (requests) => {
        setLeaveSnapshot({
          userId,
          requests,
          loaded: true,
        });
      },
      (message) => {
        setLeaveSnapshot((previous) => ({
          userId,
          requests:
            previous.userId === userId
              ? previous.requests
              : [],
          loaded: true,
        }));

        reportError('firestore', message);
      }
    );

    return unsubscribe;
  }, [currentUser, reportError]);

  // Data sesuai akun yang sedang login.
  const leaveRequests =
    currentUser &&
    leaveSnapshot.userId === currentUser.uid
      ? leaveSnapshot.requests
      : [];

  const loading =
    currentUser != null &&
    (
      leaveSnapshot.userId !== currentUser.uid ||
      !leaveSnapshot.loaded
    );

  // Jumlah izin yang menunggu pemeriksaan.
  const pendingCount = leaveRequests.filter(
    (request) => request.status === 'PENDING'
  ).length;

  // Pengajuan izin praktikan.
  const submitLeaveRequest = useCallback(
    async (
      session: Session,
      reason: string
    ): Promise<ApiResponse<LeaveRequest>> => {
      if (!currentUser) {
        return {
          ok: false,
          success: false,
          message: 'Silakan login terlebih dahulu.',
          errorCode: 'UNAUTHENTICATED',
        };
      }

      if (currentUser.role !== 'student') {
        return {
          ok: false,
          success: false,
          message: 'Hanya praktikan yang dapat mengajukan izin.',
          errorCode: 'FORBIDDEN',
        };
      }

      if (!reason.trim()) {
        return {
          ok: false,
          success: false,
          message: 'Alasan izin tidak boleh kosong.',
          errorCode: 'VALIDATION_ERROR',
        };
      }

      setSubmitting(true);

      try {
        // AI hanya memberikan klasifikasi pendukung.
        const aiResult = await classifyLeaveReason(reason);

        // Keputusan izin tetap PENDING.
        const result = await createLeaveRequest(
          currentUser,
          session,
          reason,
          aiResult
        );

        showToast(
          result.message,
          result.ok ? 'success' : 'error'
        );

        return result;
      } catch {
        const result: ApiResponse<LeaveRequest> = {
          ok: false,
          success: false,
          message: 'Terjadi kesalahan saat mengajukan izin.',
          errorCode: 'INTERNAL_ERROR',
        };

        showToast(result.message, 'error');

        return result;
      } finally {
        setSubmitting(false);
      }
    },
    [currentUser, showToast]
  );

  // Pemeriksaan izin oleh asisten.
  const reviewLeaveRequest = useCallback(
    async (
      leaveId: string,
      decision: 'APPROVED' | 'REJECTED',
      reviewNotes = ''
    ): Promise<ApiResponse<void>> => {
      if (!currentUser) {
        return {
          ok: false,
          success: false,
          message: 'Silakan login terlebih dahulu.',
          errorCode: 'UNAUTHENTICATED',
        };
      }

      if (currentUser.role !== 'assistant') {
        return {
          ok: false,
          success: false,
          message: 'Hanya asisten yang dapat memeriksa izin.',
          errorCode: 'FORBIDDEN',
        };
      }

      setSubmitting(true);

      try {
        const result = await reviewLeaveRequestService(
          leaveId,
          currentUser,
          decision,
          reviewNotes
        );

        showToast(
          result.message,
          result.ok ? 'success' : 'error'
        );

        return result;
      } catch {
        const result: ApiResponse<void> = {
          ok: false,
          success: false,
          message: 'Gagal memproses keputusan izin.',
          errorCode: 'INTERNAL_ERROR',
        };

        showToast(result.message, 'error');

        return result;
      } finally {
        setSubmitting(false);
      }
    },
    [currentUser, showToast]
  );

  return {
    leaveRequests,
    pendingCount,
    loading,
    submitting,
    submitLeaveRequest,
    reviewLeaveRequest,
  };
};

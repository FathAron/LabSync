import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  INITIAL_ATTENDANCE,
  INITIAL_SESSIONS,
  type AttendanceRecord as MockAttendanceRecord,
  type Session as MockSession,
} from '../data/mockData';
import { formatTimeWIB, readStudent, sameId, sameText } from '../features/student/studentUtils';
import type { FeedbackType, Id } from '../features/student/types';
import {
  loginUser,
  logoutUser,
  registerUser,
  subscribeAuthState,
  type RegisterPayload,
} from '../services/authService';
import type { ApiResponse, UserProfile, UserRole } from '../types/models';

export type ToastTone = FeedbackType | 'warning' | 'danger';

export interface FeedbackToastState {
  key: number;
  type: ToastTone;
  message: string;
  withHistoryLink?: boolean;
}

export interface RecordAttendanceResult {
  success: boolean;
  ok: boolean;
  message: string;
  record?: MockAttendanceRecord;
}

export interface AppContextValue {
  // Auth & User State
  currentUser: UserProfile | null;
  currentRole: UserRole | null;
  authLoading: boolean;
  syncError: string | null;
  setSyncError: (message: string | null) => void;

  // Kompatibilitas Sprint 1 (diisi otomatis dari currentUser)
  currentAssistant: UserProfile | null;
  currentStudent: UserProfile | null;

  // Toast / Feedback & Error Reporting (SRS-04)
  feedbackToast: FeedbackToastState | null;
  showToast: (message: string, type?: ToastTone, withHistoryLink?: boolean) => void;
  hideToast: () => void;
  notify: (feedback: { type: FeedbackType; message: string; withHistoryLink?: boolean }) => void;
  reportError: (source: 'auth' | 'firestore' | 'ai', message: string) => void;

  // Auth Actions (SRS-01, SRS-02)
  login: (email: string, password: string) => Promise<ApiResponse<UserProfile>>;
  register: (payload: RegisterPayload) => Promise<ApiResponse<UserProfile>>;
  logout: () => Promise<ApiResponse<void>>;

  // Kompatibilitas Sprint 1 untuk AssistantView & centralState sebelum modul Wipin di-merge
  sessions: MockSession[];
  attendanceList: MockAttendanceRecord[];
  openSession: (sessionId: Id) => boolean;
  closeSession: (sessionId: Id) => boolean;
  recordAttendance: (sessionId: Id, student: unknown, notes?: string) => RecordAttendanceResult;
  hasStudentAttended: (sessionId: Id, studentId: Id) => boolean;
  getAttendanceForSession: (sessionId: Id) => MockAttendanceRecord[];
}

const AppContext = createContext<AppContextValue | null>(null);

const TOAST_DURATION_MS = 4000;

const getCurrentWIBString = (): string => {
  return formatTimeWIB(new Date()) ?? '00:00 WIB';
};

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [feedbackToast, setFeedbackToast] = useState<FeedbackToastState | null>(null);

  // State kompatibilitas Sprint 1
  const [sessions, setSessions] = useState<MockSession[]>(INITIAL_SESSIONS);
  const [attendanceList, setAttendanceList] = useState<MockAttendanceRecord[]>(INITIAL_ATTENDANCE);

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hideToast = useCallback(() => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    setFeedbackToast(null);
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastTone = 'success', withHistoryLink = false) => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
      setFeedbackToast({
        key: Date.now(),
        type,
        message,
        withHistoryLink,
      });
      toastTimerRef.current = setTimeout(() => {
        setFeedbackToast(null);
        toastTimerRef.current = null;
      }, TOAST_DURATION_MS);
    },
    []
  );

  const notify = useCallback(
    (feedback: { type: FeedbackType; message: string; withHistoryLink?: boolean }) => {
      showToast(
        feedback.message,
        feedback.type,
        feedback.withHistoryLink ?? feedback.type === 'success'
      );
    },
    [showToast]
  );

  const reportError = useCallback(
    (source: 'auth' | 'firestore' | 'ai', message: string) => {
      const cleanMessage = message.trim() || 'Terjadi gangguan pada layanan.';
      if (source === 'firestore') {
        setSyncError(cleanMessage);
        showToast(cleanMessage, 'error');
        return;
      }
      if (source === 'ai') {
        showToast(cleanMessage, 'warning');
        return;
      }
      showToast(cleanMessage, 'error');
    },
    [showToast]
  );

  useEffect(() => {
    const unsubscribe = subscribeAuthState((user, errorMessage) => {
      setCurrentUser(user);
      setAuthLoading(false);
      if (errorMessage) {
        setSyncError(errorMessage);
        showToast(errorMessage, 'error');
      } else {
        setSyncError(null);
      }
    });

    return () => {
      unsubscribe();
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, [showToast]);

  const login = useCallback(
    async (email: string, password: string): Promise<ApiResponse<UserProfile>> => {
      const res = await loginUser(email, password);
      if (res.ok && res.data) {
        setCurrentUser(res.data);
        setSyncError(null);
        showToast(res.message, 'success');
      } else {
        reportError('auth', res.message);
      }
      return res;
    },
    [reportError, showToast]
  );

  const register = useCallback(
    async (payload: RegisterPayload): Promise<ApiResponse<UserProfile>> => {
      const res = await registerUser(payload);
      if (res.ok && res.data) {
        setCurrentUser(res.data);
        setSyncError(null);
        showToast(res.message, 'success');
      } else {
        reportError('auth', res.message);
      }
      return res;
    },
    [reportError, showToast]
  );

  const logout = useCallback(async (): Promise<ApiResponse<void>> => {
    const res = await logoutUser();
    if (res.ok) {
      setCurrentUser(null);
      setSyncError(null);
      showToast(res.message, 'info');
    } else {
      reportError('auth', res.message);
    }
    return res;
  }, [reportError, showToast]);

  // --- Helper Kompatibilitas Sprint 1 ---
  const openSession = useCallback(
    (sessionId: Id): boolean => {
      const target = sessions.find((s) => sameId(s.id, sessionId));
      if (!target) {
        showToast('Sesi praktikum tidak ditemukan.', 'error');
        return false;
      }
      if (target.status === 'CLOSED') {
        showToast('Sesi yang sudah ditutup tidak dapat dibuka kembali.', 'error');
        return false;
      }
      if (target.status === 'ACTIVE') {
        showToast('Sesi praktikum sudah dalam keadaan aktif.', 'info');
        return false;
      }
      const openedAt = getCurrentWIBString();
      setSessions((prev) =>
        prev.map((s) => (sameId(s.id, sessionId) ? { ...s, status: 'ACTIVE', openedAt } : s))
      );
      showToast(`Sesi ${target.courseName} (${target.className}) dibuka pukul ${openedAt}.`, 'success');
      return true;
    },
    [sessions, showToast]
  );

  const closeSession = useCallback(
    (sessionId: Id): boolean => {
      const target = sessions.find((s) => sameId(s.id, sessionId));
      if (!target) {
        showToast('Sesi praktikum tidak ditemukan.', 'error');
        return false;
      }
      if (target.status !== 'ACTIVE') {
        showToast('Hanya sesi yang sedang dibuka yang dapat ditutup.', 'error');
        return false;
      }
      const closedAt = getCurrentWIBString();
      setSessions((prev) =>
        prev.map((s) => (sameId(s.id, sessionId) ? { ...s, status: 'CLOSED', closedAt } : s))
      );
      showToast(`Sesi ${target.courseName} (${target.className}) ditutup pukul ${closedAt}.`, 'warning');
      return true;
    },
    [sessions, showToast]
  );

  const hasStudentAttended = useCallback(
    (sessionId: Id, studentId: Id): boolean => {
      return attendanceList.some(
        (item) => sameId(item.sessionId, sessionId) && sameId(item.studentId, studentId)
      );
    },
    [attendanceList]
  );

  const recordAttendance = useCallback(
    (sessionId: Id, studentInput: unknown, notes = ''): RecordAttendanceResult => {
      const fallbackStudent = currentUser?.role === 'student' ? currentUser : null;
      const parsedStudent = readStudent(studentInput ?? fallbackStudent);
      if (!parsedStudent) {
        return {
          success: false,
          ok: false,
          message: 'Identitas praktikan belum tersedia.',
        };
      }

      const targetSession = sessions.find((s) => sameId(s.id, sessionId));
      if (!targetSession) {
        return { success: false, ok: false, message: 'Data sesi tidak ditemukan.' };
      }

      if (
        targetSession.className !== '' &&
        parsedStudent.className !== '' &&
        !sameText(targetSession.className, parsedStudent.className)
      ) {
        return { success: false, ok: false, message: 'Sesi ini bukan untuk kelasmu.' };
      }

      if (targetSession.status !== 'ACTIVE') {
        return {
          success: false,
          ok: false,
          message:
            targetSession.status === 'PENDING'
              ? 'Presensi hanya dapat dilakukan saat sesi dibuka.'
              : 'Sesi praktikum telah ditutup.',
        };
      }

      if (hasStudentAttended(sessionId, parsedStudent.id)) {
        return {
          success: false,
          ok: false,
          message: 'Anda sudah melakukan presensi pada sesi ini.',
        };
      }

      const nowIso = new Date().toISOString();
      const attendedAt = formatTimeWIB(nowIso) ?? getCurrentWIBString();
      const newRecord: MockAttendanceRecord = {
        id: `${String(targetSession.id)}_${String(parsedStudent.id)}`,
        sessionId: String(targetSession.id),
        studentId: String(parsedStudent.id),
        studentNim: parsedStudent.nim,
        studentName: parsedStudent.name,
        timestamp: nowIso,
        attendedAt,
        status: 'Hadir',
        notes: typeof notes === 'string' ? notes.trim() : '',
      };

      setAttendanceList((prev) => [newRecord, ...prev]);
      return {
        success: true,
        ok: true,
        message: 'Presensi berhasil dicatat.',
        record: newRecord,
      };
    },
    [currentUser, hasStudentAttended, sessions]
  );

  const getAttendanceForSession = useCallback(
    (sessionId: Id): MockAttendanceRecord[] => {
      return attendanceList.filter((item) => sameId(item.sessionId, sessionId));
    },
    [attendanceList]
  );

  const currentRole: UserRole | null = currentUser?.role ?? null;
  const currentAssistant: UserProfile | null =
    currentUser?.role === 'assistant' ? currentUser : null;
  const currentStudent: UserProfile | null =
    currentUser?.role === 'student' ? currentUser : null;

  const value = useMemo<AppContextValue>(
    () => ({
      currentUser,
      currentRole,
      authLoading,
      syncError,
      setSyncError,
      currentAssistant,
      currentStudent,
      feedbackToast,
      showToast,
      hideToast,
      notify,
      reportError,
      login,
      register,
      logout,
      sessions,
      attendanceList,
      openSession,
      closeSession,
      recordAttendance,
      hasStudentAttended,
      getAttendanceForSession,
    }),
    [
      currentUser,
      currentRole,
      authLoading,
      syncError,
      currentAssistant,
      currentStudent,
      feedbackToast,
      showToast,
      hideToast,
      notify,
      reportError,
      login,
      register,
      logout,
      sessions,
      attendanceList,
      openSession,
      closeSession,
      recordAttendance,
      hasStudentAttended,
      getAttendanceForSession,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = (): AppContextValue => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp harus digunakan di dalam AppProvider.');
  }
  return context;
};

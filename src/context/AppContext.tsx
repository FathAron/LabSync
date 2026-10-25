// TASK-01 - Central State Store (Aron Sorimuda Johanes Pasaribu)
// Mengelola state terpusat aplikasi LabSync menggunakan React Context API.
// Kompatibel penuh dengan kontrak CentralState pada modul Praktikan (TASK-04)
// serta kebutuhan modul Asisten (TASK-03) dan App Shell (TASK-02).

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ASSISTANTS,
  INITIAL_ATTENDANCE,
  INITIAL_SESSIONS,
  STUDENTS,
  type Assistant,
  type AttendanceRecord,
  type Session,
  type Student,
} from '../data/mockData';
import {
  formatTimeWIB,
  readStudent,
  sameId,
  sameText,
} from '../features/student/studentUtils';
import type { CentralState, FeedbackType, Id } from '../features/student/types';

export type UserRole = 'assistant' | 'student';

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
  record?: AttendanceRecord;
}

export interface StudentHistoryItem extends AttendanceRecord {
  session: Session | null;
}

export interface AppContextValue extends CentralState {
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  toggleRole: () => void;
  currentAssistant: Assistant;
  setCurrentAssistant: (assistant: Assistant) => void;
  currentStudent: Student | null;
  setCurrentStudent: (student: Student | null) => void;
  assistants: Assistant[];
  students: Student[];
  sessions: Session[];
  attendanceList: AttendanceRecord[];
  feedbackToast: FeedbackToastState | null;
  showToast: (message: string, type?: ToastTone, withHistoryLink?: boolean) => void;
  hideToast: () => void;
  notify: (feedback: { type: FeedbackType; message: string; withHistoryLink?: boolean }) => void;
  openSession: (sessionId: Id) => boolean;
  closeSession: (sessionId: Id) => boolean;
  recordAttendance: (sessionId: Id, student: unknown, notes?: string) => RecordAttendanceResult;
  hasStudentAttended: (sessionId: Id, studentId: Id) => boolean;
  getStudentAttendanceRecord: (sessionId: Id, studentId: Id) => AttendanceRecord | undefined;
  getAttendanceForSession: (sessionId: Id) => AttendanceRecord[];
  getStudentHistory: (studentId: Id) => StudentHistoryItem[];
  resetDemoData: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

const TOAST_DURATION_MS = 3800;

const getCurrentWIBString = (): string => {
  const now = new Date();
  return formatTimeWIB(now) ?? '00:00 WIB';
};

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentRole, setCurrentRoleState] = useState<UserRole>('student');
  const [currentAssistant, setCurrentAssistantState] = useState<Assistant>(ASSISTANTS[0]);
  const [currentStudent, setCurrentStudentState] = useState<Student | null>(STUDENTS[0]);
  const [sessions, setSessions] = useState<Session[]>(INITIAL_SESSIONS);
  const [attendanceList, setAttendanceList] = useState<AttendanceRecord[]>(INITIAL_ATTENDANCE);
  const [feedbackToast, setFeedbackToast] = useState<FeedbackToastState | null>(null);

  const sessionsRef = useRef<Session[]>(sessions);
  sessionsRef.current = sessions;

  const attendanceRef = useRef<AttendanceRecord[]>(attendanceList);
  attendanceRef.current = attendanceList;

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

  const setCurrentRole = useCallback(
    (role: UserRole) => {
      setCurrentRoleState(role);
      showToast(
        `Beralih ke Sudut Pandang ${role === 'assistant' ? 'Asisten Praktikum' : 'Praktikan'}.`,
        'info'
      );
    },
    [showToast]
  );

  const toggleRole = useCallback(() => {
    setCurrentRoleState((prev) => {
      const next = prev === 'assistant' ? 'student' : 'assistant';
      showToast(
        `Beralih ke Sudut Pandang ${next === 'assistant' ? 'Asisten Praktikum' : 'Praktikan'}.`,
        'info'
      );
      return next;
    });
  }, [showToast]);

  const setCurrentAssistant = useCallback(
    (assistant: Assistant) => {
      setCurrentAssistantState(assistant);
      showToast(`Identitas asisten aktif: ${assistant.name}`, 'info');
    },
    [showToast]
  );

  const setCurrentStudent = useCallback(
    (student: Student | null) => {
      setCurrentStudentState(student);
      if (student) {
        showToast(`Identitas praktikan aktif: ${student.name} (${student.className})`, 'info');
      } else {
        showToast('Simulasi tanpa identitas praktikan diaktifkan.', 'warning');
      }
    },
    [showToast]
  );

  // Asisten: Buka sesi praktikum (PENDING -> ACTIVE)
  const openSession = useCallback(
    (sessionId: Id): boolean => {
      const target = sessionsRef.current.find((s) => sameId(s.id, sessionId));
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
      const updated = sessionsRef.current.map((s) =>
        sameId(s.id, sessionId) ? { ...s, status: 'ACTIVE' as const, openedAt } : s
      );
      sessionsRef.current = updated;
      setSessions(updated);
      showToast(
        `Sesi ${target.courseName} (${target.className}) dibuka pukul ${openedAt}.`,
        'success'
      );
      return true;
    },
    [showToast]
  );

  // Asisten: Tutup sesi praktikum (ACTIVE -> CLOSED)
  const closeSession = useCallback(
    (sessionId: Id): boolean => {
      const target = sessionsRef.current.find((s) => sameId(s.id, sessionId));
      if (!target) {
        showToast('Sesi praktikum tidak ditemukan.', 'error');
        return false;
      }
      if (target.status !== 'ACTIVE') {
        showToast('Hanya sesi yang sedang dibuka yang dapat ditutup.', 'error');
        return false;
      }

      const closedAt = getCurrentWIBString();
      const updated = sessionsRef.current.map((s) =>
        sameId(s.id, sessionId) ? { ...s, status: 'CLOSED' as const, closedAt } : s
      );
      sessionsRef.current = updated;
      setSessions(updated);
      showToast(
        `Sesi ${target.courseName} (${target.className}) ditutup pukul ${closedAt}.`,
        'warning'
      );
      return true;
    },
    [showToast]
  );

  // Validasi apakah mahasiswa sudah melakukan presensi pada sesi tertentu
  const hasStudentAttended = useCallback((sessionId: Id, studentId: Id): boolean => {
    return attendanceRef.current.some(
      (item) => sameId(item.sessionId, sessionId) && sameId(item.studentId, studentId)
    );
  }, []);

  // Ambil objek presensi mahasiswa pada sesi tertentu
  const getStudentAttendanceRecord = useCallback(
    (sessionId: Id, studentId: Id): AttendanceRecord | undefined => {
      return attendanceRef.current.find(
        (item) => sameId(item.sessionId, sessionId) && sameId(item.studentId, studentId)
      );
    },
    []
  );

  // Praktikan: Catat kehadiran mandiri dengan validasi status & anti-duplikasi
  const recordAttendance = useCallback(
    (sessionId: Id, studentInput: unknown, notes = ''): RecordAttendanceResult => {
      const parsedStudent = readStudent(studentInput ?? currentStudent);
      if (!parsedStudent) {
        const msg = 'Identitas praktikan belum tersedia. Pilih identitas terlebih dahulu.';
        return { success: false, ok: false, message: msg };
      }

      const targetSession = sessionsRef.current.find((s) => sameId(s.id, sessionId));
      if (!targetSession) {
        const msg = 'Data sesi tidak ditemukan.';
        return { success: false, ok: false, message: msg };
      }

      if (
        targetSession.className !== '' &&
        parsedStudent.className !== '' &&
        !sameText(targetSession.className, parsedStudent.className)
      ) {
        const msg = 'Sesi ini bukan untuk kelasmu.';
        return { success: false, ok: false, message: msg };
      }

      if (targetSession.status !== 'ACTIVE') {
        const msg =
          targetSession.status === 'PENDING'
            ? 'Presensi hanya dapat dilakukan saat sesi dibuka.'
            : 'Sesi praktikum telah ditutup.';
        return { success: false, ok: false, message: msg };
      }

      const alreadyPresent = attendanceRef.current.some(
        (item) =>
          sameId(item.sessionId, sessionId) && sameId(item.studentId, parsedStudent.id)
      );
      if (alreadyPresent) {
        const msg = 'Anda sudah melakukan presensi pada sesi ini.';
        return { success: false, ok: false, message: msg };
      }

      const nowIso = new Date().toISOString();
      const attendedAt = formatTimeWIB(nowIso) ?? getCurrentWIBString();
      const trimmedNotes = typeof notes === 'string' ? notes.trim() : '';

      const newRecord: AttendanceRecord = {
        id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        sessionId: String(targetSession.id),
        studentId: String(parsedStudent.id),
        studentNim: parsedStudent.nim,
        studentName: parsedStudent.name,
        timestamp: nowIso,
        attendedAt,
        status: 'Hadir',
        notes: trimmedNotes,
      };

      const nextList = [newRecord, ...attendanceRef.current];
      attendanceRef.current = nextList;
      setAttendanceList(nextList);

      return {
        success: true,
        ok: true,
        message: 'Presensi berhasil dicatat.',
        record: newRecord,
      };
    },
    [currentStudent]
  );

  // Asisten: Ambil daftar hadir mahasiswa untuk sesi tertentu
  const getAttendanceForSession = useCallback(
    (sessionId: Id): AttendanceRecord[] => {
      return attendanceList.filter((item) => sameId(item.sessionId, sessionId));
    },
    [attendanceList]
  );

  // Praktikan: Ambil riwayat kehadiran lengkap dengan detail sesi
  const getStudentHistory = useCallback(
    (studentId: Id): StudentHistoryItem[] => {
      return attendanceList
        .filter((item) => sameId(item.studentId, studentId))
        .map((record) => ({
          ...record,
          session: sessions.find((s) => sameId(s.id, record.sessionId)) ?? null,
        }));
    },
    [attendanceList, sessions]
  );

  // Reset seluruh data demo ke kondisi awal
  const resetDemoData = useCallback(() => {
    sessionsRef.current = INITIAL_SESSIONS;
    attendanceRef.current = INITIAL_ATTENDANCE;
    setSessions(INITIAL_SESSIONS);
    setAttendanceList(INITIAL_ATTENDANCE);
    setCurrentAssistantState(ASSISTANTS[0]);
    setCurrentStudentState(STUDENTS[0]);
    showToast('Data demo berhasil direset ke kondisi awal.', 'info');
  }, [showToast]);

  const value = useMemo<AppContextValue>(
    () => ({
      currentRole,
      setCurrentRole,
      toggleRole,
      currentAssistant,
      setCurrentAssistant,
      currentStudent,
      setCurrentStudent,
      assistants: ASSISTANTS,
      students: STUDENTS,
      sessions,
      attendanceList,
      feedbackToast,
      showToast,
      hideToast,
      notify,
      openSession,
      closeSession,
      recordAttendance,
      hasStudentAttended,
      getStudentAttendanceRecord,
      getAttendanceForSession,
      getStudentHistory,
      resetDemoData,
    }),
    [
      currentRole,
      setCurrentRole,
      toggleRole,
      currentAssistant,
      setCurrentAssistant,
      currentStudent,
      setCurrentStudent,
      sessions,
      attendanceList,
      feedbackToast,
      showToast,
      hideToast,
      notify,
      openSession,
      closeSession,
      recordAttendance,
      hasStudentAttended,
      getStudentAttendanceRecord,
      getAttendanceForSession,
      getStudentHistory,
      resetDemoData,
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


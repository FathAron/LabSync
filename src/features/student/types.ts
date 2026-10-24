// TASK-04 - Tipe data modul praktikan.

export type Id = string | number;

export type SessionStatus = 'PENDING' | 'ACTIVE' | 'CLOSED';

export type FeedbackType = 'success' | 'error' | 'info';

export interface StudentInfo {
  id: Id;
  name: string;
  nim: string;
  className: string;
  raw: unknown; 
}

export interface SessionInfo {
  id: Id;
  status: SessionStatus;
  courseName: string;
  moduleCode: string;
  moduleTitle: string;
  className: string;
  date: unknown;
  startTime: unknown;
  endTime: unknown;
  room: string;
  assistantName: string;
  raw: unknown;
}

export interface AttendanceInfo {
  id: Id | undefined;
  sessionId: Id | undefined;
  studentId: Id | undefined;
  timestamp: unknown;
  notes: string;
  raw: unknown;
}

export interface HistoryEntry {
  record: AttendanceInfo;
  session: SessionInfo | null; // null = data sesi tidak ditemukan
}

export interface SubmitResult {
  ok: boolean;
  message?: string;
  tone?: FeedbackType;
  closeModal?: boolean; // true = tutup modal, pesan ditampilkan sebagai feedback
}

export interface CentralState {
  currentStudent: unknown;
  sessions: unknown;
  attendanceList: unknown;
  recordAttendance?: (sessionId: Id, student: unknown, notes: string) => unknown;
  hasStudentAttended?: (sessionId: Id, studentId: Id) => boolean;
  // Opsional: jika shell/FeedbackToast tim tersedia, feedback dikirim ke sana.
  notify?: (feedback: { type: FeedbackType; message: string }) => void;
}

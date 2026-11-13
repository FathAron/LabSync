export type UserRole = 'assistant' | 'student';

export type SessionStatus = 'PENDING' | 'ACTIVE' | 'CLOSED';

export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type AIInferenceStatus = 'SUCCESS' | 'FAILED' | 'UNAVAILABLE';

export interface UserProfile {
  uid: string;
  id: string; // alias untuk uid (kompatibilitas Sprint 1)
  email: string;
  name: string;
  role: UserRole;
  nim: string; // wajib untuk student, opsional untuk assistant
  className: string; // wajib untuk student (mis. 'IF-26-A'), '' untuk assistant
  class: string; // alias kompatibilitas Sprint 1 untuk className
  assistantRole?: string; // mis. 'Koordinator Asisten' | 'Asisten Laboratorium'
  avatar: string; // 2 huruf inisial, mis. 'AS'
  createdAt: string; // ISO 8601 UTC string
  updatedAt: string; // ISO 8601 UTC string
}

export interface LabClass {
  id: string;
  name: string; // mis. 'IF-26-A'
  courseCode: string; // mis. 'CSG3H3'
  courseName: string; // mis. 'Pemrograman Perangkat Bergerak'
  assistantId: string;
  assistantName: string;
  studentIds: string[]; // array of user.uid praktikan terdaftar
  totalStudents: number;
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  id: string;
  classId?: string; // referensi ke classes/{id}
  courseName: string;
  courseCode: string;
  moduleCode: string;
  moduleTitle: string;
  className: string;
  class: string; // alias kompatibilitas Sprint 1
  day: string; // mis. 'Senin'
  date: string; // ISO YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  time: string; // 'HH:mm - HH:mm WIB'
  room: string;
  assistantId: string;
  assistantName: string;
  totalStudents: number;
  status: SessionStatus;
  openedAt: string | null; // 'HH:mm WIB' atau null
  closedAt: string | null; // 'HH:mm WIB' atau null
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceRecord {
  id: string; // wajib format `${sessionId}_${studentId}`
  sessionId: string;
  studentId: string; // user.uid praktikan
  studentNim: string;
  studentName: string;
  className: string;
  timestamp: string; // ISO 8601 UTC string
  attendedAt: string; // 'HH:mm WIB'
  status: 'Hadir';
  notes: string;
}

export interface AIClassificationResult {
  category: string; // mis. 'Sakit', 'Keperluan Keluarga', 'Kegiatan Akademik', 'Lainnya', 'Tidak Diketahui'
  confidence: number | null; // 0.0 - 1.0 atau null jika unavailable
  status: AIInferenceStatus;
  rawLabel?: string;
  errorMessage?: string;
  classifiedAt: string; // ISO 8601 UTC string
}

export interface LeaveRequest {
  id: string;
  sessionId: string;
  sessionTitle: string; // ringkasan: `${courseName} - ${moduleCode}`
  className: string;
  studentId: string; // user.uid praktikan
  studentNim: string;
  studentName: string;
  reason: string; // alasan ketidakhadiran dari praktikan
  aiCategory: string; // hasil prediksi kategori alasan (informasi pendukung)
  aiConfidence: number | null;
  aiStatus: AIInferenceStatus;
  status: LeaveStatus; // WAJIB 'PENDING' saat dibuat; AI tidak boleh mengubah field ini
  reviewedBy: string | null; // uid asisten yang memeriksa
  reviewedByName: string | null;
  reviewedAt: string | null; // ISO 8601 UTC string
  reviewNotes: string;
  createdAt: string; // ISO 8601 UTC string
  updatedAt: string; // ISO 8601 UTC string
}

export type ApiErrorCode =
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'ALREADY_EXISTS'
  | 'SESSION_NOT_ACTIVE'
  | 'NETWORK_ERROR'
  | 'AI_UNAVAILABLE'
  | 'INTERNAL_ERROR';

export interface ApiResponse<T = unknown> {
  ok: boolean;
  success: boolean; // selalu sama dengan ok (kompatibilitas Sprint 1)
  message: string; // pesan ramah pengguna dalam Bahasa Indonesia
  data?: T;
  errorCode?: ApiErrorCode;
}

export interface CreateSessionInput {
  courseName: string;
  courseCode: string;
  moduleCode: string;
  moduleTitle: string;
  className: string;
  day: string;
  date: string;
  startTime: string;
  endTime: string;
  room: string;
  totalStudents: number;
  notes?: string;
}

export interface CreateClassInput {
  name: string;
  courseCode: string;
  courseName: string;
  studentIds?: string[];
}

export interface UsePracticumResult {
  classes: LabClass[];
  students: UserProfile[];
  sessions: Session[];
  attendanceList: AttendanceRecord[];
  dataLoading: boolean;
  createSession: (input: CreateSessionInput) => Promise<ApiResponse<Session>>;
  updateSession: (sessionId: string, patch: Partial<CreateSessionInput>) => Promise<ApiResponse<void>>;
  deleteSession: (sessionId: string) => Promise<ApiResponse<void>>;
  openSession: (sessionId: string) => Promise<ApiResponse<void>>;
  closeSession: (sessionId: string) => Promise<ApiResponse<void>>;
  createClass: (input: CreateClassInput) => Promise<ApiResponse<LabClass>>;
  updateClass: (classId: string, patch: Partial<CreateClassInput>) => Promise<ApiResponse<void>>;
  deleteClass: (classId: string) => Promise<ApiResponse<void>>;
  assignStudentToClass: (studentId: string, className: string) => Promise<ApiResponse<void>>;
  recordAttendance: (sessionId: string, notes?: string) => Promise<ApiResponse<AttendanceRecord>>;
  hasStudentAttended: (sessionId: string, studentId: string) => boolean;
  getAttendanceForSession: (sessionId: string) => AttendanceRecord[];
}

export interface UseLeaveResult {
  leaveRequests: LeaveRequest[];
  pendingCount: number;
  loading: boolean;
  submitting: boolean;
  submitLeaveRequest: (session: Session, reason: string) => Promise<ApiResponse<LeaveRequest>>;
  reviewLeaveRequest: (
    leaveId: string,
    decision: 'APPROVED' | 'REJECTED',
    reviewNotes?: string
  ) => Promise<ApiResponse<void>>;
}


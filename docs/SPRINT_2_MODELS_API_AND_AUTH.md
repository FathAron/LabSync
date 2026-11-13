# Sprint 2 — Data Models, Firestore Schema, API Format & Authorization

Dokumen ini mendefinisikan **kontrak tunggal** untuk struktur database Cloud Firestore, model TypeScript, format response API standar, kontrak `AppContextValue`, serta aturan otorisasi (*authorization check*) dan `firestore.rules`.

---

## 1. Skema Cloud Firestore (Hanya 5 Koleksi Resmi)

> [!CAUTION]
> **Dilarang menambah koleksi baru** di luar 5 koleksi di bawah ini. Seluruh nama field menggunakan `camelCase` yang konsisten dengan model Sprint 1.

| Koleksi | Document ID | Deskripsi |
| :--- | :--- | :--- |
| `users` | `{uid}` (sama dengan Firebase Auth `user.uid`) | Profil pengguna terautentikasi (`student` atau `assistant`) |
| `classes` | `{classId}` (auto-id atau slug mis. `IF-26-A`) | Data kelas praktikum dan daftar peserta |
| `sessions` | `{sessionId}` (auto-id Firestore atau `ses-...`) | Jadwal dan sesi praktikum (`PENDING`, `ACTIVE`, `CLOSED`) |
| `attendance` | `{sessionId}_{studentId}` *(composite ID)* | Catatan presensi; composite ID menjamin anti-duplikasi di level database |
| `leaveRequests` | `{leaveId}` (auto-id Firestore) | Pengajuan izin praktikan + hasil klasifikasi AI + keputusan asisten |

---

## 2. Model TypeScript Standar (`src/types/models.ts`)

Seluruh naming mempertahankan field inti Sprint 1 (`Session`, `AttendanceRecord`) agar komponen UI Sprint 1 tetap kompatibel.

```typescript
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
```

---

## 3. Response Format API Standard

### A. Format Standar Internal Service & Context (`ApiResponse<T>`)

Seluruh operasi async pada `authService`, `firestoreService`, `aiService`, dan mutasi di `AppContext` **WAJIB** mengembalikan format standar berikut (kompatibel dengan `RecordAttendanceResult` & `SubmitResult` Sprint 1):

```typescript
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
```

**Contoh Sukses**:
```json
{
  "ok": true,
  "success": true,
  "message": "Presensi berhasil dicatat.",
  "data": { "id": "ses-a2_uid123", "status": "Hadir" }
}
```

**Contoh Gagal**:
```json
{
  "ok": false,
  "success": false,
  "message": "Anda sudah melakukan presensi pada sesi ini.",
  "errorCode": "ALREADY_EXISTS"
}
```

### B. Format Request & Response AI Classification API (`aiService.ts`)

Endpoint dikonfigurasi melalui environment variable: `EXPO_PUBLIC_AI_API_URL`.

- **Request**: `POST ${EXPO_PUBLIC_AI_API_URL}`
  ```json
  {
    "text": "Saya demam tinggi sejak semalam dan harus istirahat."
  }
  ```
- **Response yang Diterima (toleran terhadap variasi field dari server pengajar)**:
  `aiService.ts` harus mem-parsing variasi umum response JSON (misalnya `category`, `label`, `prediction`, atau `data.category`, serta `confidence` atau `score`) menjadi `ApiResponse<AIClassificationResult>`.
- **Aturan Fallback & Timeout**:
  - Timeout request: maksimal `10000 ms` (10 detik).
  - Jika `EXPO_PUBLIC_AI_API_URL` kosong, timeout, HTTP non-2xx, atau jaringan putus:
    - `aiService` mengembalikan `ok: false, errorCode: 'AI_UNAVAILABLE'` dengan `AIClassificationResult` fallback:
      `{ category: 'Belum Terklasifikasi (Layanan AI Tidak Tersedia)', confidence: null, status: 'UNAVAILABLE', classifiedAt: nowISO }`.
    - **Pengajuan izin tetap bisa disimpan** ke Firestore dengan `aiStatus: 'UNAVAILABLE'` dan `status: 'PENDING'`.
  - **ATURAN KERAS AI**: Hasil AI hanya sebagai **informasi pendukung** bagi asisten. Sistem **DILARANG** otomatis mengubah `LeaveRequest.status` menjadi `'APPROVED'` atau `'REJECTED'` berdasarkan output AI.

---

## 4. Kontrak `AppContextValue` (Acuan Paralel Programmer 1, 2, 3)

Agar Programmer 2 & 3 dapat bekerja paralel tanpa menunggu Programmer 1 selesai:

```typescript
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

export interface AppContextValue {
  // Auth & User State
  currentUser: UserProfile | null;
  currentRole: UserRole | null;
  authLoading: boolean;
  dataLoading: boolean;
  syncError: string | null;

  // Kompatibilitas Sprint 1 (diisi otomatis dari currentUser)
  currentAssistant: UserProfile | null;
  currentStudent: UserProfile | null;

  // Real-time Collections (dari onSnapshot)
  classes: LabClass[];
  students: UserProfile[];
  sessions: Session[];
  attendanceList: AttendanceRecord[];
  leaveRequests: LeaveRequest[];

  // Toast / Feedback (Sprint 1)
  feedbackToast: FeedbackToastState | null;
  showToast: (message: string, type?: ToastTone, withHistoryLink?: boolean) => void;
  hideToast: () => void;
  notify: (feedback: { type: FeedbackType; message: string; withHistoryLink?: boolean }) => void;

  // Auth Actions (Programmer 1)
  login: (email: string, password: string) => Promise<ApiResponse<UserProfile>>;
  register: (payload: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    nim: string;
    className: string;
  }) => Promise<ApiResponse<UserProfile>>;
  logout: () => Promise<ApiResponse<void>>;

  // Session & Class CRUD Actions (Dipanggil Programmer 2)
  createSession: (input: CreateSessionInput) => Promise<ApiResponse<Session>>;
  updateSession: (sessionId: string, patch: Partial<CreateSessionInput>) => Promise<ApiResponse<void>>;
  deleteSession: (sessionId: string) => Promise<ApiResponse<void>>;
  openSession: (sessionId: string) => Promise<ApiResponse<void>>;
  closeSession: (sessionId: string) => Promise<ApiResponse<void>>;
  createClass: (input: CreateClassInput) => Promise<ApiResponse<LabClass>>;
  updateClass: (classId: string, patch: Partial<CreateClassInput>) => Promise<ApiResponse<void>>;
  deleteClass: (classId: string) => Promise<ApiResponse<void>>;
  assignStudentToClass: (studentId: string, className: string) => Promise<ApiResponse<void>>;

  // Attendance Actions (Dipanggil Programmer 3 & 2)
  recordAttendance: (sessionId: string, student: unknown, notes?: string) => Promise<ApiResponse<AttendanceRecord>>;
  hasStudentAttended: (sessionId: string, studentId: string) => boolean;
  getStudentAttendanceRecord: (sessionId: string, studentId: string) => AttendanceRecord | undefined;
  getAttendanceForSession: (sessionId: string) => AttendanceRecord[];
  getStudentHistory: (studentId: string) => StudentHistoryItem[];

  // Leave Request & AI Actions (Dipanggil Programmer 3 & 2)
  submitLeaveRequest: (sessionId: string, reason: string) => Promise<ApiResponse<LeaveRequest>>;
  reviewLeaveRequest: (
    leaveId: string,
    decision: 'APPROVED' | 'REJECTED',
    reviewNotes?: string
  ) => Promise<ApiResponse<void>>;
}
```

---

## 5. Authorization Check (Aplikasi + `firestore.rules`)

Setiap aksi sensitif wajib dicek di **3 lapisan**: (1) UI visibility, (2) Service/Context guard, dan (3) Firestore Security Rules.

### Matriks Hak Akses

| Resource / Aksi | `student` (Praktikan) | `assistant` (Asisten) | Unauthenticated |
| :--- | :--- | :--- | :--- |
| `users` (Read) | Read profil sendiri & daftar asisten/teman sekelas | Read semua user | **DENY** |
| `users` (Create/Update) | Create saat register (`role == 'student'` atau `'assistant'` sesuai auth uid); Update profil sendiri (tidak boleh ubah `role`) | Update `className` mahasiswa (kelola peserta) & profil sendiri | **DENY** |
| `classes` (Read) | Read kelasnya | Read semua | **DENY** |
| `classes` (Create/Update/Delete) | **DENY** (`FORBIDDEN`) | **ALLOW** | **DENY** |
| `sessions` (Read) | Read semua sesi (difilter kelas di UI) | Read semua | **DENY** |
| `sessions` (Create/Update/Delete/Open/Close) | **DENY** (`FORBIDDEN`) | **ALLOW** | **DENY** |
| `attendance` (Read) | Read presensi miliknya (`studentId == uid`) | Read semua | **DENY** |
| `attendance` (Create) | **ALLOW** hanya jika `studentId == uid`, ID `{sessionId}_{uid}`, sesi `ACTIVE`, & belum ada | **DENY** | **DENY** |
| `attendance` (Update/Delete) | **DENY** | **DENY** (immutable audit) | **DENY** |
| `leaveRequests` (Read) | Read miliknya (`studentId == uid`) | Read semua | **DENY** |
| `leaveRequests` (Create) | **ALLOW** hanya jika `studentId == uid` & `status == 'PENDING'` | **DENY** | **DENY** |
| `leaveRequests` (Update/Review) | **DENY** | **ALLOW** hanya untuk mengubah `status` (`APPROVED`/`REJECTED`), `reviewedBy`, `reviewedByName`, `reviewedAt`, `reviewNotes` | **DENY** |

### Referensi `firestore.rules` (Dikelola Programmer 1)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isSignedIn() {
      return request.auth != null;
    }

    function userDoc() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
    }

    function isAssistant() {
      return isSignedIn() && userDoc().role == 'assistant';
    }

    function isStudent() {
      return isSignedIn() && userDoc().role == 'student';
    }

    match /users/{uid} {
      allow read: if isSignedIn();
      allow create: if isSignedIn() && request.auth.uid == uid
        && request.resource.data.uid == uid
        && request.resource.data.role in ['student', 'assistant'];
      allow update: if isSignedIn() && (
        (request.auth.uid == uid && request.resource.data.role == resource.data.role)
        || (isAssistant() && resource.data.role == 'student'
            && request.resource.data.role == resource.data.role)
      );
      allow delete: if false;
    }

    match /classes/{classId} {
      allow read: if isSignedIn();
      allow create, update, delete: if isAssistant();
    }

    match /sessions/{sessionId} {
      allow read: if isSignedIn();
      allow create, update, delete: if isAssistant();
    }

    match /attendance/{attendanceId} {
      allow read: if isAssistant() || (isStudent() && resource.data.studentId == request.auth.uid);
      allow create: if isStudent()
        && request.resource.data.studentId == request.auth.uid
        && attendanceId == request.resource.data.sessionId + '_' + request.auth.uid
        && get(/databases/$(database)/documents/sessions/$(request.resource.data.sessionId)).data.status == 'ACTIVE'
        && !exists(/databases/$(database)/documents/attendance/$(attendanceId));
      allow update, delete: if false;
    }

    match /leaveRequests/{leaveId} {
      allow read: if isAssistant() || (isStudent() && resource.data.studentId == request.auth.uid);
      allow create: if isStudent()
        && request.resource.data.studentId == request.auth.uid
        && request.resource.data.status == 'PENDING';
      allow update: if isAssistant()
        && request.resource.data.status in ['APPROVED', 'REJECTED']
        && request.resource.data.studentId == resource.data.studentId
        && request.resource.data.sessionId == resource.data.sessionId
        && request.resource.data.reason == resource.data.reason;
      allow delete: if false;
    }
  }
}
```

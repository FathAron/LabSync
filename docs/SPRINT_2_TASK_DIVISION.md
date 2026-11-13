# Sprint 2 — Pembagian Tugas Paralel & Alur Merge

Dokumen ini membagi pekerjaan Sprint 2 ke **3 Programmer** sesuai pembagian SRS resmi dengan prinsip:
- **Zero File Overlap**: Tidak ada dua programmer yang mengedit file yang sama.
- **Zero Blocking**: Ketiga programmer dapat langsung bekerja paralel karena kontrak antar modul (`AppContext`, `usePracticum`, `useLeave`, `models.ts`, `ApiResponse<T>`) sudah dikunci di [SPRINT_2_MODELS_API_AND_AUTH.md](./SPRINT_2_MODELS_API_AND_AUTH.md).
- **Abis Push Langsung Merge**: Begitu satu programmer selesai dan lolos `npx tsc --noEmit` + `npx expo lint`, langsung push dan merge ke `main`.

---

## 1. Rangkuman Pembagian SRS

| Programmer | Peran | Tiket SRS | Lingkup Pekerjaan |
| :--- | :--- | :--- | :--- |
| **Naufal Dwi Yusmawan** | Nama 1 (Auth, Security & Core) | **SRS-01, SRS-02, SRS-03, SRS-04** | Firebase Setup, Register/Login/Logout, Role Routing, Security Rules, & Global Error/Feedback UI |
| **Wipin Saputra Poh** | Nama 2 (Praktikum & Presensi) | **SRS-05, SRS-06, SRS-07, SRS-08** | CRUD Kelas/Jadwal/Peserta/Sesi (Asisten), Jadwal Praktikan, Buka/Tutup Sesi + Rekap Real-time, & Presensi Anti-Duplikasi |
| **Adelia Clearesta** | Nama 3 (Perizinan & AI) | **SRS-09, SRS-10, SRS-11, SRS-12** | Form & Riwayat Pengajuan Izin Praktikan, Integrasi Endpoint API AI, & Daftar/Keputusan Izin Asisten |

---

## 2. Rincian Tugas Per Programmer

### Naufal Dwi Yusmawan (Nama 1 — SRS-01, SRS-02, SRS-03, SRS-04)
**Branch**: `feat/sprint2-naufal-auth-core`

**Checklist Pekerjaan**:
1. **Setup Firebase & Models**:
   - Install `firebase` dengan `npx expo install firebase`.
   - Buat `.env.example` (`EXPO_PUBLIC_FIREBASE_*`, `EXPO_PUBLIC_AI_API_URL`).
   - Buat `src/types/models.ts` sesuai **persis** kontrak di `SPRINT_2_MODELS_API_AND_AUTH.md`.
   - Buat `src/services/firebaseConfig.ts` (export `app`, `auth`, `db`).
2. **SRS-01 — Autentikasi Pengguna**:
   - Buat `src/services/authService.ts`:
     - `registerUser`: validasi input, `createUserWithEmailAndPassword`, simpan dokumen `users/{uid}` ke Firestore, kembalikan `ApiResponse<UserProfile>`.
     - `loginUser`: `signInWithEmailAndPassword`, ambil `users/{uid}`, kembalikan `ApiResponse<UserProfile>`.
     - `logoutUser`: `signOut`, kembalikan `ApiResponse<void>`.
     - `subscribeAuthState`: `onAuthStateChanged` + fetch `users/{uid}`.
   - Buat halaman `app/(auth)/_layout.tsx`, `app/(auth)/login.tsx`, `app/(auth)/register.tsx` (form email, password, nama, role `student`/`assistant`, NIM, kelas dengan validasi input).
3. **SRS-02 — Role-Based Routing & Header**:
   - Update `src/context/AppContext.tsx`: sediakan `currentUser`, `currentRole`, `authLoading`, `login`, `register`, `logout`, serta alias `currentAssistant`/`currentStudent` untuk kompatibilitas Sprint 1.
   - Update `app/_layout.tsx` & `app/index.tsx`: tampilkan loading saat `authLoading`, redirect ke `/(auth)/login` jika belum login, tampilkan `AssistantView` jika `role === 'assistant'` atau `/student` jika `role === 'student'`.
   - Update `src/components/Header.tsx`: hapus Role Switcher bebas Sprint 1, tampilkan identitas user login, badge role, indikator koneksi, dan tombol **Logout**.
4. **SRS-03 — Firebase Security Rules**:
   - Buat `firestore.rules` sesuai matriks otorisasi di `SPRINT_2_MODELS_API_AND_AUTH.md` (role-based & ownership-based untuk 5 koleksi).
5. **SRS-04 — Global Error & Feedback UI/UX**:
   - Lengkapi `AppContext.tsx` (`syncError`, `setSyncError`, `reportError`, `showToast`, `notify`) dan `FeedbackToast.tsx` agar kegagalan auth, putusnya koneksi Firestore, atau gangguan API AI menampilkan pesan ramah pengguna yang jelas.

**Definition of Done (Naufal)**:
- Register, Login, Logout berjalan dengan Firebase Auth + Firestore `users/{uid}` dan tetap login saat app dibuka ulang.
- Routing otomatis memisahkan Asisten dan Praktikan sesuai `role`.
- `firestore.rules` siap deploy dan `npx tsc --noEmit` + `npx expo lint` lolos 0 error.

---

### Wipin Saputra Poh (Nama 2 — SRS-05, SRS-06, SRS-07, SRS-08)
**Branch**: `feat/sprint2-wipin-practicum-attendance`

**Checklist Pekerjaan**:
1. **Service & Hook Real-time (`src/services/practicumService.ts` & `src/hooks/usePracticum.ts`)**:
   - Listener `onSnapshot` untuk `classes`, `sessions`, `users` (daftar mahasiswa), dan `attendance` (filter `studentId == uid` untuk student, semua untuk assistant).
   - Tangani error listener dengan memanggil `reportError('firestore', ...)` dari `useApp()`.
2. **SRS-05 — CRUD Praktikum Asisten**:
   - Implementasi fungsi CRUD `classes` (`createClass`, `updateClass`, `deleteClass`, `assignStudentToClass`) dan `sessions` (`createSession`, `updateSession`, `deleteSession`) dengan pengecekan `currentUser.role === 'assistant'`.
   - Buat `src/features/assistant/components/SessionFormModal.tsx` (Tambah & Ubah sesi + validasi form) dan `src/features/assistant/components/ClassManagementModal.tsx` (CRUD kelas & kelola peserta kelas).
3. **SRS-06 — Jadwal Spesifik Praktikan**:
   - Hubungkan `src/features/student/centralState.ts` & `useStudentModule.ts` ke `usePracticum()` dan `useApp()`.
   - Pastikan praktikan di `app/student/index.tsx` hanya melihat jadwal sesi sesuai `currentUser.className` dari Firestore, lengkap dengan loading state, empty state, dan error state.
4. **SRS-07 — Buka/Tutup Sesi & Rekap Kehadiran Real-time**:
   - Update `src/screens/AssistantView.tsx` (tab **Sesi Praktikum**, tab **Kelas & Peserta**, serta tab **Pengajuan Izin** yang me-render `<AssistantLeaveSection />` dari modul Adelia).
   - Pastikan `openSession`, `closeSession`, dan `AttendanceSummaryModal.tsx` menampilkan perubahan status & daftar hadir secara real-time.
5. **SRS-08 — Presensi Terintegrasi & Anti-Duplikasi**:
   - Implementasi `recordAttendance` di `practicumService.ts` menggunakan composite document ID `${sessionId}_${uid}`, validasi sesi `ACTIVE`, dan tolak duplikasi (`ALREADY_EXISTS`).
   - Pastikan `app/student/history.tsx` menampilkan riwayat presensi real-time dari Firestore.

**Definition of Done (Wipin)**:
- Asisten dapat melakukan CRUD kelas, peserta, jadwal, dan sesi praktikum secara persisten di Firestore.
- Asisten dapat membuka/menutup sesi dan memantau rekap kehadiran secara real-time.
- Praktikan melihat jadwal miliknya dan dapat melakukan presensi maksimal 1x pada sesi `ACTIVE`.
- `npx tsc --noEmit` & `npx expo lint` lolos 0 error.

---

### Adelia Clearesta (Nama 3 — SRS-09, SRS-10, SRS-11, SRS-12)
**Branch**: `feat/sprint2-adelia-leave-ai`

**Checklist Pekerjaan**:
1. **SRS-11 — Integrasi API AI (`src/services/aiService.ts`)**:
   - Buat `classifyLeaveReason(reason: string): Promise<ApiResponse<AIClassificationResult>>`.
   - Kirim `POST` ke `process.env.EXPO_PUBLIC_AI_API_URL` dengan timeout 10 detik.
   - Parse response JSON secara toleran; jika API belum dikonfigurasi/timeout/error, kembalikan fallback `aiStatus: 'UNAVAILABLE'` dan panggil `reportError('ai', ...)` tanpa menggagalkan pengajuan izin.
2. **Service & Hook Izin (`src/services/leaveService.ts` & `src/hooks/useLeave.ts`)**:
   - Listener `onSnapshot` ke koleksi `leaveRequests` (filter `studentId == uid` untuk student, semua untuk assistant).
   - `submitLeaveRequest(session, reason)`: validasi alasan tidak kosong, cek belum ada izin `PENDING`/`APPROVED` untuk sesi tersebut, panggil `aiService.classifyLeaveReason(reason)`, lalu simpan dokumen `LeaveRequest` ke Firestore dengan **`status: 'PENDING'`** (AI tidak boleh menentukan diterima/ditolak).
   - `reviewLeaveRequest(leaveId, decision, reviewNotes)`: cek `role === 'assistant'`, update `status` (`APPROVED` / `REJECTED`), `reviewedBy`, `reviewedByName`, `reviewedAt`, `reviewNotes`.
3. **SRS-09 & SRS-10 — Antarmuka Pengajuan & Riwayat Izin Praktikan**:
   - Update `app/student/_layout.tsx`: tambah tab **Pengajuan Izin** (`leave`) dengan badge jumlah izin `PENDING`.
   - Buat `app/student/leave.tsx`, `src/features/leave/components/LeaveRequestModal.tsx` (pilih sesi + isi alasan + loading state saat klasifikasi AI), dan `src/features/leave/components/LeaveStatusCard.tsx` (status `Menunggu`/`Disetujui`/`Ditolak`, kategori AI sebagai info pendukung, & catatan asisten).
4. **SRS-12 — Antarmuka Pemeriksaan Izin Asisten**:
   - Buat `src/features/leave/components/AssistantLeaveSection.tsx` (daftar pengajuan izin dengan badge kategori AI + status) dan `src/features/leave/components/LeaveReviewModal.tsx` (tampilkan alasan, hasil prediksi AI dengan catatan *"Hanya sebagai informasi pendukung"*, input catatan asisten, dan tombol **Terima** / **Tolak**).

**Definition of Done (Adelia)**:
- Praktikan dapat mengajukan izin, sistem mengirim alasan ke API AI dan menyimpan hasil klasifikasi ke Firestore dengan status awal `PENDING`.
- Praktikan dapat memantau riwayat & status pengajuan izin secara real-time.
- Asisten dapat melihat daftar pengajuan izin + prediksi AI lalu menerima/menolak izin, dan keputusan langsung terlihat oleh praktikan.
- `npx tsc --noEmit` & `npx expo lint` lolos 0 error.

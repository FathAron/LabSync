# Sprint 2 — Pembagian Tugas Paralel & Alur Merge

Dokumen ini membagi pekerjaan Sprint 2 ke **3 Programmer** dengan prinsip:
- **Zero File Overlap**: Tidak ada dua programmer yang mengedit file yang sama.
- **Zero Blocking**: Programmer 2 & 3 tidak perlu menunggu Programmer 1 selesai karena seluruh kontrak (`AppContextValue`, `models.ts`, `ApiResponse<T>`) sudah dikunci di [SPRINT_2_MODELS_API_AND_AUTH.md](./SPRINT_2_MODELS_API_AND_AUTH.md).
- **Abis Push Langsung Merge**: Begitu satu programmer selesai dan lolos `npx tsc --noEmit` + `npx expo lint`, langsung push dan merge ke `main`.

---

## 1. Strategi Paralel Tanpa Saling Menunggu

1. **Programmer 1** langsung bekerja di branch `feat/sprint2-p1-firebase-core`:
   - Install `firebase`, buat `src/types/models.ts`, `src/services/*`, `firestore.rules`, update `AppContext.tsx`, `Header.tsx`, `app/_layout.tsx`, `app/(auth)/*`.
   - Begitu selesai → test typecheck/lint → **push & langsung merge ke `main`**.
2. **Programmer 2** langsung bekerja bersamaan di branch `feat/sprint2-p2-assistant-module`:
   - Buat `src/features/assistant/assistantAdapter.ts` yang membungkus `useApp()` dengan tipe sesuai `AppContextValue` di docs (menggunakan fallback aman jika method Sprint 2 belum ada di `main` saat lokal dev).
   - Bangun seluruh UI Asisten (`AssistantView.tsx`, `SessionFormModal.tsx`, `ClassManagementModal.tsx`, `LeaveReviewModal.tsx`, update `AttendanceSummaryModal.tsx`).
   - Begitu Programmer 1 merge ke `main` (atau setelah selesai), pull `main`, pastikan `npx tsc --noEmit` & `npx expo lint` hijau → **push & langsung merge ke `main`**.
3. **Programmer 3** langsung bekerja bersamaan di branch `feat/sprint2-p3-student-module`:
   - Update `src/features/student/centralState.ts` agar mengekspos kontrak Sprint 2 (`submitLeaveRequest`, `leaveRequests`, `dataLoading`, `syncError`, dll.) dengan fallback aman.
   - Bangun UI Praktikan (`app/student/_layout.tsx` tambah tab Izin, `app/student/index.tsx`, `app/student/history.tsx`, `app/student/leave.tsx`, `LeaveRequestModal.tsx`, `LeaveStatusCard.tsx`).
   - Begitu Programmer 1 merge ke `main` (atau setelah selesai), pull `main`, pastikan `npx tsc --noEmit` & `npx expo lint` hijau → **push & langsung merge ke `main`**.

---

## 2. Rincian Tugas Per Programmer

### Programmer 1 — Core, Firebase Auth, Firestore, AI Service & Auth UI
**Branch**: `feat/sprint2-p1-firebase-core`

**Checklist Pekerjaan**:
1. Install `firebase` menggunakan `npx expo install firebase` dan buat `.env.example` berisi:
   - `EXPO_PUBLIC_FIREBASE_API_KEY`
   - `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
   - `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `EXPO_PUBLIC_FIREBASE_APP_ID`
   - `EXPO_PUBLIC_AI_API_URL`
2. Buat `src/types/models.ts` sesuai **persis** definisi di `SPRINT_2_MODELS_API_AND_AUTH.md`.
3. Buat `src/services/firebaseConfig.ts` (inisialisasi Firebase App, Auth, Firestore dengan guard agar tidak double-init).
4. Buat `src/services/authService.ts`:
   - `registerUser(...)`: validasi input, `createUserWithEmailAndPassword`, simpan dokumen `users/{uid}` ke Firestore, kembalikan `ApiResponse<UserProfile>`.
   - `loginUser(email, password)`: `signInWithEmailAndPassword`, ambil `users/{uid}`, kembalikan `ApiResponse<UserProfile>`.
   - `logoutUser()`: `signOut`, kembalikan `ApiResponse<void>`.
   - `subscribeAuthState(...)`: `onAuthStateChanged` + fetch profil `users/{uid}`.
5. Buat `src/services/firestoreService.ts`:
   - Real-time listeners (`onSnapshot`) untuk `classes`, `users` (students), `sessions`, `attendance` (filter `studentId == uid` untuk student, semua untuk assistant), dan `leaveRequests` (filter `studentId == uid` untuk student, semua untuk assistant).
   - CRUD `sessions` (`createSession`, `updateSession`, `deleteSession`, `openSession`, `closeSession`) — wajib cek `role === 'assistant'`.
   - CRUD `classes` & `assignStudentToClass` — wajib cek `role === 'assistant'`.
   - `recordAttendance(sessionId, currentUser, notes)` — cek `role === 'student'`, cek sesi `ACTIVE`, gunakan doc ID `${sessionId}_${uid}`, tolak jika sudah ada (`ALREADY_EXISTS`).
   - `submitLeaveRequest(session, currentUser, reason, aiResult)` — cek `role === 'student'`, tolak jika sudah ada pengajuan `PENDING`/`APPROVED` untuk sesi yang sama, paksa `status: 'PENDING'`.
   - `reviewLeaveRequest(leaveId, currentAssistant, decision, reviewNotes)` — cek `role === 'assistant'`, update `status`, `reviewedBy`, `reviewedByName`, `reviewedAt`, `reviewNotes`.
6. Buat `src/services/aiService.ts`:
   - Kirim `POST` ke `EXPO_PUBLIC_AI_API_URL` dengan timeout 10 detik.
   - Parse response fleksibel & kembalikan `AIClassificationResult` dengan fallback `UNAVAILABLE` bila gagal/timeout.
7. Update `src/context/AppContext.tsx`:
   - Penuhi seluruh interface `AppContextValue`.
   - Hubungkan `submitLeaveRequest` agar memanggil `aiService.classifyLeaveReason(reason)` lalu menyimpan hasilnya bersama `LeaveRequest` ke Firestore (`status` tetap `'PENDING'`).
   - Tangani `authLoading`, `dataLoading`, dan `syncError`.
8. Buat Auth UI & Gate:
   - `app/(auth)/_layout.tsx`, `app/(auth)/login.tsx`, `app/(auth)/register.tsx` (dengan validasi form & error message jelas).
   - Update `app/_layout.tsx` & `app/index.tsx`: tampilkan loading saat `authLoading`, arahkan ke `/(auth)/login` jika belum login, tampilkan `AssistantView` jika `role === 'assistant'` atau `/student` jika `role === 'student'`.
   - Update `src/components/Header.tsx`: tampilkan nama, role badge, NIM/kelas, status sinkronisasi, dan tombol **Logout** (hapus Role Switcher & Persona Picker Sprint 1).
9. Buat `firestore.rules` sesuai `SPRINT_2_MODELS_API_AND_AUTH.md`.

**Definition of Done (P1)**:
- Login, Register, Logout berjalan dengan Firebase Auth + Firestore `users/{uid}`.
- Data real-time tersinkronisasi via `onSnapshot` dan persisten setelah app ditutup/dibuka ulang.
- `npx tsc --noEmit` & `npx expo lint` lolos 0 error.

---

### Programmer 2 — Modul Asisten (CRUD Praktikum, Rekap Real-time & Review Izin AI)
**Branch**: `feat/sprint2-p2-assistant-module`

**Checklist Pekerjaan**:
1. Buat `src/features/assistant/assistantAdapter.ts`:
   - Hook/wrapper di atas `useApp()` yang menyediakan akses aman ke `sessions`, `classes`, `students`, `attendanceList`, `leaveRequests`, `dataLoading`, `syncError`, dan seluruh action CRUD/Review (`createSession`, `updateSession`, `deleteSession`, `openSession`, `closeSession`, `createClass`, `updateClass`, `deleteClass`, `assignStudentToClass`, `reviewLeaveRequest`).
2. Update `src/screens/AssistantView.tsx`:
   - Tambah sub-navigasi / segmented tabs di layar Asisten:
     - **Sesi Praktikum**: StatCards, tombol **+ Tambah Sesi**, daftar sesi dengan tombol **Ubah**, **Hapus**, **Buka Sesi**, **Rekap Presensi**, **Tutup Sesi**.
     - **Kelas & Peserta**: tombol **+ Tambah Kelas**, daftar kelas beserta jumlah & daftar peserta, tombol kelola peserta (assign/pindah kelas mahasiswa), ubah/hapus kelas.
     - **Pengajuan Izin**: badge jumlah izin `PENDING`, daftar pengajuan izin dengan nama praktikan, sesi, alasan, **badge kategori AI** + confidence (jika ada), status (`PENDING`/`APPROVED`/`REJECTED`), dan tombol **Periksa**.
   - Tangani state `dataLoading` (loading indicator), `syncError` (banner error koneksi), dan empty state pada masing-masing tab.
3. Buat `src/features/assistant/components/SessionFormModal.tsx`:
   - Form Tambah & Edit Sesi (`courseName`, `courseCode`, `moduleCode`, `moduleTitle`, `className`, `day`, `date`, `startTime`, `endTime`, `room`, `totalStudents`, `notes`) dengan validasi input wajib.
4. Buat `src/features/assistant/components/ClassManagementModal.tsx`:
   - Modal Tambah/Edit Kelas dan kelola daftar peserta (`students` yang terdaftar di kelas tersebut).
5. Buat `src/features/assistant/components/LeaveReviewModal.tsx`:
   - Tampilkan detail pengajuan izin, alasan lengkap, **Kotak Info Klasifikasi AI** (kategori, confidence, status AI, dengan keterangan eksplisit *"Hasil AI hanya sebagai informasi pendukung"*), input opsional `reviewNotes`, serta tombol **Terima Izin** (`APPROVED`) dan **Tolak Izin** (`REJECTED`).
6. Pastikan `SessionControlModal.tsx` & `AttendanceSummaryModal.tsx` terhubung ke data real-time & menampilkan feedback yang sesuai.

**Definition of Done (P2)**:
- Asisten dapat melakukan CRUD kelas, peserta, jadwal/sesi praktikum.
- Asisten dapat membuka sesi, memantau rekap kehadiran secara real-time, dan menutup sesi.
- Asisten dapat memeriksa pengajuan izin beserta hasil klasifikasi AI dan memberikan keputusan Terima/Tolak.
- `npx tsc --noEmit` & `npx expo lint` lolos 0 error.

---

### Programmer 3 — Modul Praktikan (Jadwal, Presensi Real-time & Pengajuan Izin + AI)
**Branch**: `feat/sprint2-p3-student-module`

**Checklist Pekerjaan**:
1. Update `src/features/student/centralState.ts` & `src/features/student/useStudentModule.ts`:
   - Sambungkan dengan state & action Sprint 2 (`leaveRequests`, `submitLeaveRequest`, `dataLoading`, `syncError`, `currentUser`) secara defensif.
   - Tambah state/computed: `myLeaveRequests` (diurutkan terbaru), `pendingLeaveCount`, helper cek apakah praktikan sudah mengajukan izin untuk suatu sesi.
2. Update `app/student/_layout.tsx`:
   - Tambah tab ke-3: **`leave`** (*Pengajuan Izin*) dengan ikon `document-text-outline` dan badge jumlah izin `PENDING`.
3. Update `app/student/index.tsx` & `src/features/student/components/SessionCard.tsx`:
   - Tampilkan loading state saat `dataLoading`, error banner saat `syncError`, dan empty state saat tidak ada jadwal.
   - Pastikan praktikan hanya melihat jadwal sesuai kelasnya, bisa melakukan presensi pada sesi `ACTIVE` (anti-duplikasi), dan bisa langsung menekan tombol **Ajukan Izin** pada sesi `PENDING` / `ACTIVE` yang belum dipresensi.
4. Update `app/student/history.tsx`:
   - Tampilkan riwayat presensi real-time dari Firestore dengan loading/empty state yang rapi.
5. Buat `app/student/leave.tsx`, `src/features/student/components/LeaveRequestModal.tsx`, dan `src/features/student/components/LeaveStatusCard.tsx`:
   - Praktikan dapat memilih sesi praktikum, mengisi alasan ketidakhadiran (validasi tidak boleh kosong), lalu mengirim pengajuan.
   - Tampilkan indikator proses saat mengirim ke AI & Firestore.
   - Tampilkan daftar pengajuan izin praktikan lengkap dengan status (`Menunggu`, `Disetujui`, `Ditolak`), hasil klasifikasi kategori AI (informasi pendukung), dan catatan keputusan asisten.

**Definition of Done (P3)**:
- Praktikan dapat melihat jadwal & status sesi secara real-time.
- Praktikan dapat melakukan presensi 1x pada sesi `ACTIVE` dan melihat riwayatnya.
- Praktikan dapat mengajukan izin, melihat hasil klasifikasi AI sebagai info pendukung, dan memantau keputusan asisten secara real-time.
- `npx tsc --noEmit` & `npx expo lint` lolos 0 error.

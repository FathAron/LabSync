# Sprint 2 — Aturan Agent, Batasan File, & Acuan Sprint 1

Dokumen ini adalah **aturan mengikat** untuk seluruh AI Agent / Programmer (**Naufal Dwi Yusmawan**, **Wipin Saputra Poh**, **Adelia Clearesta**) pada pengembangan **LabSync Sprint 2 (Data Dinamis dengan Firebase & AI)**.

> [!IMPORTANT]
> **Semua agent WAJIB membaca seluruh file `docs/SPRINT_2_*.md` sebelum menulis atau mengubah satu baris kode pun.**

---

## 1. Pemetaan Programmer & SRS Resmi

| Programmer | Kode Peran | Cakupan SRS | Lingkup Utama |
| :--- | :--- | :--- | :--- |
| **Naufal Dwi Yusmawan** | Nama 1 | **SRS-01, SRS-02, SRS-03, SRS-04** | Firebase Config, Auth (Register/Login/Logout), Role Routing, Security Rules, & Global Error/Feedback UI |
| **Wipin Saputra Poh** | Nama 2 | **SRS-05, SRS-06, SRS-07, SRS-08** | CRUD Kelas/Jadwal/Peserta/Sesi (Asisten), Jadwal Praktikan, Buka/Tutup Sesi + Rekap Real-time, & Presensi Anti-Duplikasi |
| **Adelia Clearesta** | Nama 3 | **SRS-09, SRS-10, SRS-11, SRS-12** | Form & Riwayat Pengajuan Izin Praktikan, Integrasi Endpoint API AI, & Daftar/Keputusan Izin Asisten |

---

## 2. Aturan Keras (Hard Constraints) untuk Semua Agent

1. **TIDAK ADA DATABASE BARU & TIDAK ADA KOLEKSI LIAR**
   - Aplikasi hanya menggunakan **1 project Firebase** dan **1 database Cloud Firestore** yang dikonfigurasi oleh **Naufal Dwi Yusmawan** di `src/services/firebaseConfig.ts`.
   - Agent **DILARANG** membuat database baru (SQLite, AsyncStorage sebagai pengganti database utama, Supabase, Realm, atau Firebase project lain).
   - Agent **DILARANG** menambah koleksi Firestore baru atau mengubah nama field di luar 5 koleksi resmi (`users`, `classes`, `sessions`, `attendance`, `leaveRequests`) pada [SPRINT_2_MODELS_API_AND_AUTH.md](./SPRINT_2_MODELS_API_AND_AUTH.md).

2. **ATURAN GIT & BRANCH (DILARANG NGERECOKIN BRANCH BARU)**
   - **Dilarang** membuat branch eksperimen/baru di luar branch tugas masing-masing atau mengutak-atik branch milik programmer lain.
   - Gunakan **1 branch kerja per programmer**:
     - Naufal Dwi Yusmawan (Nama 1): `feat/sprint2-naufal-auth-core`
     - Wipin Saputra Poh (Nama 2): `feat/sprint2-wipin-practicum-attendance`
     - Adelia Clearesta (Nama 3): `feat/sprint2-adelia-leave-ai`
   - **ABIS PUSH LANGSUNG MERGE**: Begitu fitur selesai, lolos `npx tsc --noEmit` dan `npx expo lint`, segera `git push` dan **langsung merge ke `main`** agar perubahan segera tersedia bagi tim tanpa bottleneck.
   - Sebelum mulai bekerja atau setelah programmer lain merge, lakukan `git pull origin main` tanpa menimpa file programmer lain.

3. **ZERO FILE OVERLAP (BATAS MUTLAK KEPEMILIKAN FILE)**
   - Setiap programmer **HANYA BOLEH** membuat atau mengedit file di dalam zona miliknya.
   - **DILARANG KERAS** mengedit file di zona programmer lain. Komunikasi antar modul mengikuti kontrak resmi di [SPRINT_2_MODELS_API_AND_AUTH.md](./SPRINT_2_MODELS_API_AND_AUTH.md).

4. **SPRINT 1 ADALAH ACUAN UTAMA**
   - Semua fondasi Sprint 1 yang sudah berjalan dan teruji **WAJIB dipertahankan** konvensinya:
     - **Routing**: Menggunakan `expo-router` di folder `app/` (`app/_layout.tsx`, `app/index.tsx`, `app/student/_layout.tsx`, `app/student/index.tsx`, `app/student/history.tsx`).
     - **Model Dasar**: Nama field inti Sprint 1 (`Session`, `AttendanceRecord`, `SessionStatus = 'PENDING' | 'ACTIVE' | 'CLOSED'`, `courseName`, `courseCode`, `moduleCode`, `moduleTitle`, `className`, `date`, `startTime`, `endTime`, `room`, `assistantId`, `assistantName`, `studentId`, `studentNim`, `studentName`, `timestamp`, `attendedAt`, `notes`) **dipertahankan** agar komponen UI Sprint 1 tetap kompatibel.
     - **Design System & Komponen Bersama**: `src/styles/theme.ts`, `src/components/AppModal.tsx`, `src/components/EmptyState.tsx`, `src/components/FeedbackToast.tsx`, `src/features/student/studentTokens.ts`, dan `src/features/student/studentUtils.ts` tetap menjadi acuan UI.
   - **Perintah Wajib Sebelum Selesai**:
     - `npx tsc --noEmit` (harus 0 error)
     - `npx expo lint` (harus lolos tanpa error)
     - Hanya **Naufal Dwi Yusmawan** yang boleh menginstall package Firebase (`npx expo install firebase`).

---

## 3. Matriks Kepemilikan File (Siapa Boleh Sentuh Apa)

### Naufal Dwi Yusmawan (Nama 1 — SRS-01, SRS-02, SRS-03, SRS-04)
**Fokus**: Firebase Setup, Auth (Register/Login/Logout), Role-Based Routing, Firebase Security Rules, & Global Error/Feedback Handling.

| Boleh Dibuat / Diedit | Keterangan |
| :--- | :--- |
| `package.json`, `.env.example`, `app.json` | Install `firebase` & env config (`EXPO_PUBLIC_FIREBASE_*`, `EXPO_PUBLIC_AI_API_URL`) |
| `firestore.rules` | Firebase Security Rules (role-based & ownership-based untuk 5 koleksi) |
| `src/types/models.ts` | Definisi seluruh TypeScript interface standar Sprint 2 |
| `src/services/firebaseConfig.ts` | Inisialisasi Firebase App, Auth, dan Firestore (`db`, `auth`) |
| `src/services/authService.ts` | Register, Login, Logout, Auth state listener, ambil profil `users/{uid}` |
| `src/context/AppContext.tsx` | State auth (`currentUser`, `currentRole`, `authLoading`), global `syncError`, `reportError`, & `showToast`/`notify` |
| `src/components/Header.tsx`, `src/components/FeedbackToast.tsx` | Tampilkan profil user login, role badge, status koneksi/error, & tombol Logout (hapus Role Switcher bebas Sprint 1) |
| `app/_layout.tsx`, `app/index.tsx` | Auth Gate & Role Routing (`/(auth)/login`, `AssistantView`, `/student`) |
| `app/(auth)/_layout.tsx`, `app/(auth)/login.tsx`, `app/(auth)/register.tsx` | Halaman Login & Registrasi dengan validasi input dan error handling |

**DILARANG disentuh oleh Naufal**:
- `src/services/practicumService.ts`, `src/services/leaveService.ts`, `src/services/aiService.ts`
- `src/hooks/usePracticum.ts`, `src/hooks/useLeave.ts`
- `src/screens/AssistantView.tsx`, `src/features/assistant/**`
- `app/student/**`, `src/features/student/**`, `src/features/leave/**`

---

### Wipin Saputra Poh (Nama 2 — SRS-05, SRS-06, SRS-07, SRS-08)
**Fokus**: CRUD Kelas/Jadwal/Peserta/Sesi (Asisten), Jadwal Praktikan sesuai akun, Buka/Tutup Sesi & Rekap Real-time, serta Presensi Anti-Duplikasi.

| Boleh Dibuat / Diedit | Keterangan |
| :--- | :--- |
| `src/services/practicumService.ts` *(baru)* | Firestore CRUD & `onSnapshot` untuk `classes`, `sessions`, `users` (peserta), dan `attendance` |
| `src/hooks/usePracticum.ts` *(baru)* | Hook state real-time & action untuk kelas, peserta, sesi, buka/tutup sesi, dan presensi |
| `src/screens/AssistantView.tsx` | Layar Asisten (tab Sesi Praktikum, tab Kelas & Peserta, serta slot tab Izin yang me-render `<AssistantLeaveSection />`) |
| `src/features/assistant/**` | `SessionControlModal.tsx`, `AttendanceSummaryModal.tsx`, `SessionFormModal.tsx`, `ClassManagementModal.tsx` |
| `app/student/index.tsx`, `app/student/history.tsx` | Jadwal sesi sesuai kelas/akun praktikan, presensi anti-duplikasi, & riwayat presensi real-time |
| `src/features/student/**` | `useStudentModule.ts`, `centralState.ts`, `SessionCard.tsx`, `AttendanceModal.tsx`, `HistoryItem.tsx`, `StudentProfileCard.tsx`, `StudentEmptyState.tsx` |

> [!WARNING]
> **Aturan Khusus `src/features/student/studentUtils.ts`**:
> Boleh menambah helper baru jika dibutuhkan, tetapi **DILARANG** menghapus atau mengubah signature ekspor Sprint 1 (`STATUS_META`, `formatDateID`, `formatTimeRange`, `formatTimeWIB`, `readStudent`, `sameId`, `sameText`, dll.).

**DILARANG disentuh oleh Wipin**:
- `src/services/firebaseConfig.ts`, `src/services/authService.ts`, `src/services/leaveService.ts`, `src/services/aiService.ts`
- `src/hooks/useLeave.ts`, `src/context/**`, `src/types/**`, `firestore.rules`
- `app/_layout.tsx`, `app/index.tsx`, `app/(auth)/**`, `app/student/_layout.tsx`, `app/student/leave.tsx`
- `src/components/**`, `src/features/leave/**`

---

### Adelia Clearesta (Nama 3 — SRS-09, SRS-10, SRS-11, SRS-12)
**Fokus**: Pengajuan Izin Praktikan, Riwayat & Status Izin, Integrasi API AI Klasifikasi Alasan, & Daftar/Keputusan Izin Asisten.

| Boleh Dibuat / Diedit | Keterangan |
| :--- | :--- |
| `src/services/aiService.ts` *(baru)* | HTTP `POST` ke `EXPO_PUBLIC_AI_API_URL` dengan timeout 10 detik & fallback `UNAVAILABLE` |
| `src/services/leaveService.ts` *(baru)* | Firestore CRUD & `onSnapshot` untuk koleksi `leaveRequests` + keputusan Asisten (`APPROVED`/`REJECTED`) |
| `src/hooks/useLeave.ts` *(baru)* | Hook real-time daftar izin, `submitLeaveRequest` (panggil `aiService` → simpan ke Firestore), & `reviewLeaveRequest` |
| `app/student/_layout.tsx` | Tambah tab ke-3 **Pengajuan Izin** (`leave`) di samping tab `index` dan `history` milik Wipin |
| `app/student/leave.tsx` *(baru)* | Halaman pengajuan izin & daftar riwayat status izin praktikan |
| `src/features/leave/**` *(baru)* | `LeaveRequestModal.tsx`, `LeaveStatusCard.tsx`, `AssistantLeaveSection.tsx`, `LeaveReviewModal.tsx` |

**DILARANG disentuh oleh Adelia**:
- `src/services/firebaseConfig.ts`, `src/services/authService.ts`, `src/services/practicumService.ts`
- `src/hooks/usePracticum.ts`, `src/context/**`, `src/types/**`, `firestore.rules`
- `app/_layout.tsx`, `app/index.tsx`, `app/(auth)/**`, `app/student/index.tsx`, `app/student/history.tsx`
- `src/components/**`, `src/screens/AssistantView.tsx`, `src/features/assistant/**`, `src/features/student/**`

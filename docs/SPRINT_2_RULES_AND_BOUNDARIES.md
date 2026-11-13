# Sprint 2 — Aturan Agent, Batasan File, & Acuan Sprint 1

Dokumen ini adalah **aturan mengikat** untuk seluruh AI Agent / Programmer (**Programmer 1**, **Programmer 2**, **Programmer 3**) pada pengembangan **LabSync Sprint 2 (Data Dinamis dengan Firebase & AI)**.

> [!IMPORTANT]
> **Semua agent WAJIB membaca seluruh file `docs/SPRINT_2_*.md` sebelum menulis atau mengubah satu baris kode pun.**

---

## 1. Aturan Keras (Hard Constraints) untuk Semua Agent

1. **TIDAK ADA DATABASE BARU & TIDAK ADA KOLEKSI LIAR**
   - Aplikasi hanya menggunakan **1 project Firebase** dan **1 database Cloud Firestore** yang dikonfigurasi oleh Programmer 1 di `src/services/firebaseConfig.ts`.
   - Agent **DILARANG** membuat database baru (SQLite, AsyncStorage sebagai pengganti database utama, Supabase, Realm, atau Firebase project lain).
   - Agent **DILARANG** menambah koleksi Firestore baru atau mengubah nama field di luar skema resmi pada [SPRINT_2_MODELS_API_AND_AUTH.md](./SPRINT_2_MODELS_API_AND_AUTH.md).

2. **ATURAN GIT & BRANCH (DILARANG NGERECOKIN BRANCH BARU)**
   - **Dilarang** membuat branch eksperimen/baru di luar branch tugas masing-masing atau mengutak-atik branch milik programmer lain.
   - Gunakan **1 branch kerja per programmer** (atau langsung sesuai penugasan):
     - Programmer 1: `feat/sprint2-p1-firebase-core`
     - Programmer 2: `feat/sprint2-p2-assistant-module`
     - Programmer 3: `feat/sprint2-p3-student-module`
   - **ABIS PUSH LANGSUNG MERGE**: Begitu fitur/tiket selesai, lolos `npx tsc --noEmit` dan `npx expo lint`, segera `git push` dan **langsung merge ke `main`** agar perubahan segera tersedia bagi tim tanpa bottleneck.
   - Sebelum mulai bekerja atau setelah programmer lain merge, lakukan `git pull origin main` (merge `main` ke branch kerja) dengan aman tanpa menimpa file programmer lain.

3. **ZERO FILE OVERLAP (BATAS MUTLAK KEPEMILIKAN FILE)**
   - Setiap programmer **HANYA BOLEH** membuat atau mengedit file di dalam zona miliknya.
   - **DILARANG KERAS** mengedit file di zona programmer lain. Jika membutuhkan sesuatu dari zona lain, ikuti kontrak yang sudah ditetapkan di [SPRINT_2_MODELS_API_AND_AUTH.md](./SPRINT_2_MODELS_API_AND_AUTH.md).

4. **SPRINT 1 ADALAH ACUAN UTAMA**
   - Semua fondasi Sprint 1 yang sudah berjalan dan teruji **WAJIB dipertahankan** konvensinya:
     - **Routing**: Menggunakan `expo-router` di folder `app/` (`app/_layout.tsx`, `app/index.tsx`, `app/student/_layout.tsx`, `app/student/index.tsx`, `app/student/history.tsx`).
     - **Model Dasar**: Nama field inti Sprint 1 (`Session`, `AttendanceRecord`, `SessionStatus = 'PENDING' | 'ACTIVE' | 'CLOSED'`, `courseName`, `courseCode`, `moduleCode`, `moduleTitle`, `className`, `date`, `startTime`, `endTime`, `room`, `assistantId`, `assistantName`, `studentId`, `studentNim`, `studentName`, `timestamp`, `attendedAt`, `notes`) **dipertahankan** agar komponen UI Sprint 1 tetap kompatibel.
     - **Design System & Komponen Bersama**: `src/styles/theme.ts`, `src/components/AppModal.tsx`, `src/components/EmptyState.tsx`, `src/components/FeedbackToast.tsx`, `src/features/student/studentTokens.ts`, dan `src/features/student/studentUtils.ts` tetap menjadi acuan UI.
   - **Perintah Wajib Sebelum Selesai**:
     - `npx tsc --noEmit` (harus 0 error)
     - `npx expo lint` (harus lolos tanpa error)
     - Gunakan `npx expo install <package>` jika menambah paket Expo-kompatibel (hanya Programmer 1 yang boleh install dependency Firebase/Env).

---

## 2. Matriks Kepemilikan File (Siapa Boleh Sentuh Apa)

### Programmer 1 — Core, Auth, Firebase & Firestore Services
**Fokus**: Firebase Auth, Cloud Firestore CRUD & Real-time Listeners, AI API Client, `AppContext`, Auth Screens, Header, Security Rules.

| Boleh Dibuat / Diedit | Keterangan |
| :--- | :--- |
| `package.json`, `.env.example`, `app.json` | Install `firebase` & env config (`EXPO_PUBLIC_FIREBASE_*`, `EXPO_PUBLIC_AI_API_URL`) |
| `firestore.rules` | Firebase Security Rules (role-based & ownership-based) |
| `src/types/models.ts` | Definisi seluruh TypeScript interface standar Sprint 2 |
| `src/services/firebaseConfig.ts` | Inisialisasi Firebase App, Auth, dan Firestore |
| `src/services/authService.ts` | Register, Login, Logout, Auth state listener, ambil profil `users/{uid}` |
| `src/services/firestoreService.ts` | CRUD & `onSnapshot` untuk `classes`, `users`, `sessions`, `attendance`, `leaveRequests` |
| `src/services/aiService.ts` | Integrasi HTTP ke API Model AI pengajar + timeout & fallback handling |
| `src/context/AppContext.tsx` | Integrasi real-time state, auth state, loading/error state, & seluruh action Sprint 2 |
| `src/data/mockData.ts` | Boleh dijadikan seed data awal / fallback type re-export saja |
| `src/components/Header.tsx` | Hapus Role Switcher bebas; tampilkan profil user login, badge role, & tombol Logout |
| `app/_layout.tsx`, `app/index.tsx` | Auth Gate: redirect ke `/(auth)/login` jika belum login, atau ke view sesuai role |
| `app/(auth)/_layout.tsx`, `app/(auth)/login.tsx`, `app/(auth)/register.tsx` | Halaman Login & Registrasi (pilih role `student` / `assistant`, NIM, kelas) |

**DILARANG disentuh oleh Programmer 1**:
- `src/screens/AssistantView.tsx`
- `src/features/assistant/**`
- `app/student/**`
- `src/features/student/**`

---

### Programmer 2 — Modul Asisten (CRUD Praktikum, Rekap Real-time, & Review Izin + AI)
**Fokus**: Antarmuka Asisten untuk kelola kelas/peserta/jadwal/sesi (CRUD), kontrol buka/tutup sesi, rekap presensi real-time, serta daftar & keputusan pengajuan izin dengan label klasifikasi AI.

| Boleh Dibuat / Diedit | Keterangan |
| :--- | :--- |
| `src/screens/AssistantView.tsx` | Layar utama Asisten (StatCards, tab/filter Sesi, Kelas/Peserta, & Pengajuan Izin) |
| `src/features/assistant/**` | Semua komponen, modal, hook, & adapter khusus Asisten |
| `src/features/assistant/assistantAdapter.ts` | Adapter aman untuk memanggil method Sprint 2 dari `useApp()` |
| `src/features/assistant/components/SessionControlModal.tsx` | Konfirmasi buka/tutup sesi |
| `src/features/assistant/components/AttendanceSummaryModal.tsx` | Rekap presensi real-time per sesi |
| `src/features/assistant/components/SessionFormModal.tsx` *(baru)* | Modal Tambah & Ubah sesi praktikum (CRUD) |
| `src/features/assistant/components/ClassManagementModal.tsx` *(baru)* | Modal CRUD Kelas & lihat/kelola daftar peserta kelas |
| `src/features/assistant/components/LeaveReviewModal.tsx` *(baru)* | Modal periksa izin: alasan, hasil klasifikasi AI (badge informatif), tombol Terima / Tolak + catatan |

**DILARANG disentuh oleh Programmer 2**:
- `src/context/**`, `src/services/**`, `src/types/**`, `firestore.rules`
- `app/**` (termasuk `app/_layout.tsx`, `app/(auth)/**`, `app/student/**`)
- `src/components/**` (`Header.tsx`, `AppModal.tsx`, `FeedbackToast.tsx`, `EmptyState.tsx`)
- `src/features/student/**`

---

### Programmer 3 — Modul Praktikan (Jadwal, Presensi Real-time, & Pengajuan Izin + AI)
**Fokus**: Antarmuka Praktikan untuk melihat jadwal & status sesi real-time, melakukan presensi anti-duplikasi, riwayat presensi, serta mengajukan izin & memantau status + hasil klasifikasi AI.

| Boleh Dibuat / Diedit | Keterangan |
| :--- | :--- |
| `app/student/_layout.tsx` | Tambah tab baru **Pengajuan Izin** (`leave`) di samping `index` & `history` |
| `app/student/index.tsx` | Daftar sesi kelas praktikan + tombol Presensi + tombol/pintasan Ajukan Izin + loading/empty/error state |
| `app/student/history.tsx` | Riwayat presensi real-time dari Firestore |
| `app/student/leave.tsx` *(baru)* | Halaman daftar pengajuan izin praktikan & tombol buat pengajuan baru |
| `src/features/student/**` | Hook, adapter, & komponen UI khusus Praktikan |
| `src/features/student/centralState.ts` | Bridge ke `useApp()` dengan dukungan method Sprint 2 |
| `src/features/student/useStudentModule.ts` | Logika jadwal, presensi, riwayat, & pengajuan izin praktikan |
| `src/features/student/components/LeaveRequestModal.tsx` *(baru)* | Form pengajuan izin untuk sesi tertentu (pilih sesi + isi alasan + tampilkan loading AI) |
| `src/features/student/components/LeaveStatusCard.tsx` *(baru)* | Kartu status pengajuan izin (`PENDING`, `APPROVED`, `REJECTED`), kategori AI, & catatan asisten |

> [!WARNING]
> **Aturan Khusus `src/features/student/studentUtils.ts`**:
> File ini diimpor oleh `AppContext.tsx` (Programmer 1) dan `AssistantView.tsx` (Programmer 2). Programmer 3 boleh **menambah** fungsi helper baru di `studentUtils.ts`, tetapi **DILARANG** menghapus atau mengubah signature fungsi yang sudah ada (`STATUS_META`, `formatDateID`, `formatTimeRange`, `formatTimeWIB`, `readStudent`, `sameId`, `sameText`, dll.).

**DILARANG disentuh oleh Programmer 3**:
- `src/context/**`, `src/services/**`, `src/types/**`, `firestore.rules`
- `app/_layout.tsx`, `app/index.tsx`, `app/(auth)/**`
- `src/components/**` (`Header.tsx`, `AppModal.tsx`, `FeedbackToast.tsx`, `EmptyState.tsx`)
- `src/screens/AssistantView.tsx`, `src/features/assistant/**`

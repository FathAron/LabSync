# Sprint 2 — Prompt Siap Pakai untuk AI Agents

Salin dan kirim prompt di bawah ini ke masing-masing agent (**Naufal Dwi Yusmawan**, **Wipin Saputra Poh**, **Adelia Clearesta**).

---

## Prompt untuk Naufal Dwi Yusmawan (Nama 1 — SRS-01, SRS-02, SRS-03, SRS-04)

```text
Baca semua isi file markdown di folder `docs/` khususnya `docs/SPRINT_2_RULES_AND_BOUNDARIES.md`, `docs/SPRINT_2_MODELS_API_AND_AUTH.md`, dan `docs/SPRINT_2_TASK_DIVISION.md`. Baca dan patuhi semua aturannya tanpa terkecuali.

Kerjakan bagian **Naufal Dwi Yusmawan (Nama 1 — SRS-01, SRS-02, SRS-03, SRS-04: Firebase Setup, Auth, Role Routing, Security Rules, & Global Error/Feedback UI)** pada branch `feat/sprint2-naufal-auth-core`.

Aturan wajib yang harus kamu patuhi:
1. HANYA sentuh file yang menjadi hak Naufal di `docs/SPRINT_2_RULES_AND_BOUNDARIES.md`. JANGAN menyentuh `src/services/practicumService.ts`, `src/services/leaveService.ts`, `src/services/aiService.ts`, `src/hooks/**`, `src/screens/AssistantView.tsx`, `src/features/assistant/**`, `app/student/**`, `src/features/student/**`, maupun `src/features/leave/**`.
2. JANGAN membuat database baru atau koleksi Firestore baru di luar 5 koleksi resmi (`users`, `classes`, `sessions`, `attendance`, `leaveRequests`).
3. Ikuti persis naming model (`src/types/models.ts`), format `ApiResponse<T>`, kontrak `AppContextValue`, dan `firestore.rules` pada `docs/SPRINT_2_MODELS_API_AND_AUTH.md`, dengan tetap menjaga kompatibilitas fondasi Sprint 1.
4. Gunakan `npx expo install firebase` untuk instalasi Firebase.
5. Setelah selesai, jalankan `npx tsc --noEmit` dan `npx expo lint` hingga 0 error, lalu commit, push, dan LANGSUNG merge ke `main`.
```

---

## Prompt untuk Wipin Saputra Poh (Nama 2 — SRS-05, SRS-06, SRS-07, SRS-08)

```text
Baca semua isi file markdown di folder `docs/` khususnya `docs/SPRINT_2_RULES_AND_BOUNDARIES.md`, `docs/SPRINT_2_MODELS_API_AND_AUTH.md`, dan `docs/SPRINT_2_TASK_DIVISION.md`. Baca dan patuhi semua aturannya tanpa terkecuali.

Kerjakan bagian **Wipin Saputra Poh (Nama 2 — SRS-05, SRS-06, SRS-07, SRS-08: CRUD Praktikum Asisten, Jadwal Praktikan, Buka/Tutup Sesi + Rekap Real-time, & Presensi Anti-Duplikasi)** pada branch `feat/sprint2-wipin-practicum-attendance`.

Aturan wajib yang harus kamu patuhi:
1. HANYA sentuh file yang menjadi hak Wipin di `docs/SPRINT_2_RULES_AND_BOUNDARIES.md`. JANGAN menyentuh `src/services/firebaseConfig.ts`, `src/services/authService.ts`, `src/services/leaveService.ts`, `src/services/aiService.ts`, `src/hooks/useLeave.ts`, `src/context/**`, `src/types/**`, `firestore.rules`, `app/_layout.tsx`, `app/index.tsx`, `app/(auth)/**`, `app/student/_layout.tsx`, `app/student/leave.tsx`, `src/components/**`, maupun `src/features/leave/**`.
2. Khusus `src/features/student/studentUtils.ts`, JANGAN menghapus atau mengubah signature ekspor yang sudah ada di Sprint 1.
3. JANGAN membuat database baru atau mengubah struktur model/API di luar kontrak `docs/SPRINT_2_MODELS_API_AND_AUTH.md`.
4. Di `src/screens/AssistantView.tsx`, sediakan tab "Pengajuan Izin" yang me-render komponen `<AssistantLeaveSection />` dari `src/features/leave/components/AssistantLeaveSection` (siapkan fallback aman jika file Adelia belum di-merge saat build lokal).
5. Setelah selesai, pull/merge `main` jika sudah ada update dari Naufal/Adelia, jalankan `npx tsc --noEmit` dan `npx expo lint` hingga 0 error, lalu commit, push, dan LANGSUNG merge ke `main`.
```

---

## Prompt untuk Adelia Clearesta (Nama 3 — SRS-09, SRS-10, SRS-11, SRS-12)

```text
Baca semua isi file markdown di folder `docs/` khususnya `docs/SPRINT_2_RULES_AND_BOUNDARIES.md`, `docs/SPRINT_2_MODELS_API_AND_AUTH.md`, dan `docs/SPRINT_2_TASK_DIVISION.md`. Baca dan patuhi semua aturannya tanpa terkecuali.

Kerjakan bagian **Adelia Clearesta (Nama 3 — SRS-09, SRS-10, SRS-11, SRS-12: Pengajuan & Riwayat Izin Praktikan, Integrasi API AI, & Pemeriksaan Izin Asisten)** pada branch `feat/sprint2-adelia-leave-ai`.

Aturan wajib yang harus kamu patuhi:
1. HANYA sentuh file yang menjadi hak Adelia di `docs/SPRINT_2_RULES_AND_BOUNDARIES.md` (`src/services/aiService.ts`, `src/services/leaveService.ts`, `src/hooks/useLeave.ts`, `app/student/_layout.tsx`, `app/student/leave.tsx`, dan `src/features/leave/**`). JANGAN menyentuh `src/services/firebaseConfig.ts`, `src/services/authService.ts`, `src/services/practicumService.ts`, `src/hooks/usePracticum.ts`, `src/context/**`, `src/types/**`, `firestore.rules`, `app/_layout.tsx`, `app/index.tsx`, `app/(auth)/**`, `app/student/index.tsx`, `app/student/history.tsx`, `src/components/**`, `src/screens/AssistantView.tsx`, `src/features/assistant/**`, maupun `src/features/student/**`.
2. JANGAN membuat database baru atau mengubah struktur model/API di luar kontrak `docs/SPRINT_2_MODELS_API_AND_AUTH.md`.
3. Pastikan pengajuan izin selalu disimpan dengan status awal `PENDING`, dan hasil klasifikasi AI hanya ditampilkan sebagai informasi pendukung (AI TIDAK boleh menentukan diterima atau ditolak).
4. Jika API AI tidak merespons atau belum dikonfigurasi, tampilkan informasi yang jelas namun pengajuan izin tetap dapat tersimpan ke Firestore dengan `aiStatus: 'UNAVAILABLE'`.
5. Setelah selesai, pull/merge `main` jika sudah ada update dari Naufal/Wipin, jalankan `npx tsc --noEmit` dan `npx expo lint` hingga 0 error, lalu commit, push, dan LANGSUNG merge ke `main`.
```

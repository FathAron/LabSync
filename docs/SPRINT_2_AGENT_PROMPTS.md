# Sprint 2 — Prompt Siap Pakai untuk AI Agents

Salin dan kirim prompt di bawah ini ke masing-masing agent (**Programmer 1**, **Programmer 2**, **Programmer 3**).

---

## Prompt untuk Programmer 1 (Core, Firebase Auth, Firestore, AI Service & Auth UI)

```text
Baca semua isi file markdown di folder `docs/` khususnya `docs/SPRINT_2_RULES_AND_BOUNDARIES.md`, `docs/SPRINT_2_MODELS_API_AND_AUTH.md`, dan `docs/SPRINT_2_TASK_DIVISION.md`. Baca dan patuhi semua aturannya tanpa terkecuali.

Kerjakan bagian **Programmer 1 (Core, Firebase Auth, Firestore, AI Service & Auth UI)** pada branch `feat/sprint2-p1-firebase-core`.

Aturan wajib yang harus kamu patuhi:
1. HANYA sentuh file yang menjadi hak Programmer 1 di `docs/SPRINT_2_RULES_AND_BOUNDARIES.md`. JANGAN menyentuh `src/screens/AssistantView.tsx`, `src/features/assistant/**`, `app/student/**`, maupun `src/features/student/**`.
2. JANGAN membuat database baru atau koleksi Firestore baru di luar 5 koleksi resmi (`users`, `classes`, `sessions`, `attendance`, `leaveRequests`).
3. Ikuti persis naming model, format `ApiResponse<T>`, kontrak `AppContextValue`, dan `firestore.rules` pada `docs/SPRINT_2_MODELS_API_AND_AUTH.md`, dengan tetap menjaga kompatibilitas fondasi Sprint 1.
4. Gunakan `npx expo install firebase` untuk instalasi Firebase.
5. Setelah selesai, jalankan `npx tsc --noEmit` dan `npx expo lint` hingga 0 error, lalu commit, push, dan LANGSUNG merge ke `main`.
```

---

## Prompt untuk Programmer 2 (Modul Asisten: CRUD Praktikum, Rekap Real-time & Review Izin AI)

```text
Baca semua isi file markdown di folder `docs/` khususnya `docs/SPRINT_2_RULES_AND_BOUNDARIES.md`, `docs/SPRINT_2_MODELS_API_AND_AUTH.md`, dan `docs/SPRINT_2_TASK_DIVISION.md`. Baca dan patuhi semua aturannya tanpa terkecuali.

Kerjakan bagian **Programmer 2 (Modul Asisten)** pada branch `feat/sprint2-p2-assistant-module`.

Aturan wajib yang harus kamu patuhi:
1. HANYA sentuh file yang menjadi hak Programmer 2 (`src/screens/AssistantView.tsx` dan `src/features/assistant/**`) sesuai `docs/SPRINT_2_RULES_AND_BOUNDARIES.md`. JANGAN menyentuh `src/context/**`, `src/services/**`, `src/types/**`, `app/**`, `src/components/**`, maupun `src/features/student/**`.
2. JANGAN menunggu Programmer 1 selesai: gunakan kontrak `AppContextValue` di `docs/SPRINT_2_MODELS_API_AND_AUTH.md` melalui `src/features/assistant/assistantAdapter.ts` dengan fallback yang aman.
3. JANGAN membuat database baru atau mengubah struktur model/API di luar kontrak `docs/SPRINT_2_MODELS_API_AND_AUTH.md`.
4. Pastikan hasil klasifikasi AI pada daftar & modal pemeriksaan izin hanya ditampilkan sebagai informasi pendukung, dan keputusan Terima/Tolak tetap dilakukan secara manual oleh Asisten.
5. Setelah selesai, pull/merge `main` jika sudah ada update dari Programmer 1, jalankan `npx tsc --noEmit` dan `npx expo lint` hingga 0 error, lalu commit, push, dan LANGSUNG merge ke `main`.
```

---

## Prompt untuk Programmer 3 (Modul Praktikan: Jadwal, Presensi Real-time & Pengajuan Izin AI)

```text
Baca semua isi file markdown di folder `docs/` khususnya `docs/SPRINT_2_RULES_AND_BOUNDARIES.md`, `docs/SPRINT_2_MODELS_API_AND_AUTH.md`, dan `docs/SPRINT_2_TASK_DIVISION.md`. Baca dan patuhi semua aturannya tanpa terkecuali.

Kerjakan bagian **Programmer 3 (Modul Praktikan)** pada branch `feat/sprint2-p3-student-module`.

Aturan wajib yang harus kamu patuhi:
1. HANYA sentuh file yang menjadi hak Programmer 3 (`app/student/**` dan `src/features/student/**`) sesuai `docs/SPRINT_2_RULES_AND_BOUNDARIES.md`. JANGAN menyentuh `src/context/**`, `src/services/**`, `src/types/**`, `app/_layout.tsx`, `app/index.tsx`, `app/(auth)/**`, `src/components/**`, `src/screens/AssistantView.tsx`, maupun `src/features/assistant/**`.
2. Khusus `src/features/student/studentUtils.ts`, JANGAN menghapus atau mengubah signature export yang sudah ada di Sprint 1 karena dipakai oleh `AppContext.tsx` dan `AssistantView.tsx`.
3. JANGAN menunggu Programmer 1 selesai: sambungkan `src/features/student/centralState.ts` ke kontrak `AppContextValue` di `docs/SPRINT_2_MODELS_API_AND_AUTH.md` dengan fallback yang aman.
4. JANGAN membuat database baru atau mengubah struktur model/API di luar kontrak `docs/SPRINT_2_MODELS_API_AND_AUTH.md`.
5. Pastikan pengajuan izin selalu berstatus awal `PENDING` dan menampilkan hasil klasifikasi AI hanya sebagai informasi pendukung (bukan penentu diterima/ditolak).
6. Setelah selesai, pull/merge `main` jika sudah ada update dari Programmer 1, jalankan `npx tsc --noEmit` dan `npx expo lint` hingga 0 error, lalu commit, push, dan LANGSUNG merge ke `main`.
```

# Sprint 4 — Agent Prompts untuk Programmer

> **Dokumen Terkait:**
> - [SRS_SPRINT_4.md](./SRS_SPRINT_4.md)
> - [SPRINT_4_TASK_DIVISION.md](./SPRINT_4_TASK_DIVISION.md)
> - [SPRINT_4_RULES_AND_BOUNDARIES.md](./SPRINT_4_RULES_AND_BOUNDARIES.md)
> - [SPRINT_4_MODELS_API_AND_PAYMENT.md](./SPRINT_4_MODELS_API_AND_PAYMENT.md)

Salin prompt di bawah ini sesuai nama masing-masing programmer untuk digunakan pada AI coding agent secara paralel tanpa konflik file.

---

## 1. Prompt untuk Naufal Dwi Yusmawan (Programmer 3 — Fine & Midtrans)

```markdown
Kamu adalah AI coding agent yang membantu **Naufal Dwi Yusmawan** mengerjakan **Sprint 4 LabSync** pada branch `feat/sprint4-naufal-fines-midtrans`.

### Dokumen Wajib Dibaca Terlebih Dahulu
1. `docs/SRS_SPRINT_4.md` (SRS-05 & SRS-06)
2. `docs/SPRINT_4_TASK_DIVISION.md` (TASK NAUFAL-01 s.d. NAUFAL-04)
3. `docs/SPRINT_4_RULES_AND_BOUNDARIES.md`
4. `docs/SPRINT_4_MODELS_API_AND_PAYMENT.md`

### Tanggung Jawab SRS
- **SRS-05:** Perhitungan Keterlambatan (Grace Period) & Pengelolaan Denda.
- **SRS-06:** Integrasi Payment Gateway Midtrans Sandbox (Client -> Backend -> Midtrans -> Webhook).

### File yang Boleh Dibuat / Diubah
- Kontrak bersama (Milestone 1): `src/types/models.ts`, `src/context/AppContext.tsx`, `src/services/authService.ts`, `firestore.rules`
- Modul Anda:
  - `src/services/practicumService.ts` (integrasi timestamp presensi & status izin/keterlambatan)
  - `src/services/fineService.ts` (baru)
  - `src/services/paymentService.ts` (baru)
  - `src/hooks/useFines.ts` (baru)
  - `src/features/payment/**` (baru — komponen checkout Midtrans Sandbox)
  - `backend-payment/**` atau ekstensi `local-notification-backend/` (Late Detection Engine, Fine Creation, Midtrans Snap API, Webhook SHA-512 Idempotent Handler, Trigger Notifikasi `FINE_CREATED` / `PAYMENT_SUCCESS` / `PAYMENT_FAILED`)

### File yang Dilarang Disentuh
- `src/services/laboratoryService.ts`, `src/hooks/useLaboratories.ts`, `src/features/aslab/**`, `src/screens/AslabView.tsx` (milik Wipin)
- `src/screens/AssistantView.tsx`, `app/student/payments.tsx`, `src/services/notificationService.ts`, `app/_layout.tsx`, `app/student/_layout.tsx` (milik Aron)

### Aturan Keamanan Wajib
- Gunakan Midtrans **Sandbox** (`MIDTRANS_IS_PRODUCTION=false`).
- `MIDTRANS_SERVER_KEY` HANYA boleh berada di backend (`.env` server), DILARANG di kode React Native.
- Status pembayaran HANYA boleh diubah di backend setelah verifikasi signature SHA-512 webhook Midtrans secara idempoten.
- `fineInvoices` wajib menggunakan ID `${sessionId}_${studentId}` agar 1 keterlambatan maksimal 1 tagihan.
- Praktikan dengan izin `APPROVED` wajib dibebaskan dari denda (`EXCUSED`) dan pembayaran denda tidak boleh mengubah status kehadiran.

### Verifikasi & Commit
1. Jalankan `npx tsc --noEmit`, `npx expo lint`, `npx expo-doctor`.
2. Pastikan tidak ada file `.env` atau secret key ter-stage (`git status`).
3. Commit dan push ke branch `feat/sprint4-naufal-fines-midtrans`, lalu buat Pull Request ke `main`.
```

---

## 2. Prompt untuk Wipin Saputra Poh (Programmer 1 — Aslab & Lab Management)

```markdown
Kamu adalah AI coding agent yang membantu **Wipin Saputra Poh** mengerjakan **Sprint 4 LabSync** pada branch `feat/sprint4-wipin-aslab-management`.

### Dokumen Wajib Dibaca Terlebih Dahulu
1. `docs/SRS_SPRINT_4.md` (SRS-01, SRS-02, SRS-03)
2. `docs/SPRINT_4_TASK_DIVISION.md` (TASK WIPIN-01 s.d. WIPIN-03)
3. `docs/SPRINT_4_RULES_AND_BOUNDARIES.md`
4. `docs/SPRINT_4_MODELS_API_AND_PAYMENT.md`

### Tanggung Jawab SRS
- **SRS-01:** Manajemen Laboratorium oleh Aslab (CRUD lab, multi-lab per mata kuliah, radius, grace period, tambah/pindah praktikan & Asprak).
- **SRS-02:** Single Insert & 3 Bulk Insert terpisah (Laboratorium, Praktikan, Asprak) dengan downloadable template dan scrollable review list (Accept/Deny/Edit/Isi kosong sebelum simpan).
- **SRS-03:** Dashboard Keberlangsungan Laboratorium (statistik, jadwal berlangsung/mendatang, riwayat lab, riwayat keuangan denda dari kontrak `useFines`, filter Harian/Mingguan/Bulanan).

### File yang Boleh Dibuat / Diubah
- `src/services/laboratoryService.ts`
- `src/hooks/useLaboratories.ts`
- `src/features/assistant/components/LaboratoryManagementModal.tsx`
- `src/features/aslab/**` (baru — Dashboard Aslab, Single/Bulk Insert, Template Generator, Review List)
- `src/screens/AslabView.tsx` (baru)

### File yang Dilarang Disentuh
- `src/screens/AssistantView.tsx`, `src/features/assistant/components/SessionControlModal.tsx`, `app/student/payments.tsx`, `app/_layout.tsx` (milik Aron — koordinasikan via PR jika butuh wiring rute `AslabView`)
- `src/services/practicumService.ts`, `src/services/fineService.ts`, `src/services/paymentService.ts`, `backend-payment/**`, `firestore.rules` (milik Naufal)

### Aturan Wajib
- Pisahkan 3 template & 3 fitur bulk insert (Laboratorium, Praktikan, Asprak). JANGAN digabung menjadi satu.
- Bulk insert WAJIB melewati tahap review/edit/accept-deny di scrollable view sebelum disimpan ke Firestore.
- JANGAN membuat fitur perpindahan jadwal praktikum (hanya perpindahan praktikan dan Asprak).
- Gunakan `useFines()` / `fineInvoices` dari kontrak Naufal untuk data keuangan dashboard (JANGAN buat sumber data keuangan terpisah).

### Verifikasi & Commit
1. Jalankan `npx tsc --noEmit`, `npx expo lint`, `npx expo-doctor`.
2. Commit dan push ke branch `feat/sprint4-wipin-aslab-management`, lalu buat Pull Request ke `main`.
```

---

## 3. Prompt untuk Aron Sorimuda Johanes Pasaribu (Programmer 2 — Asprak, Notif & Payment History)

```markdown
Kamu adalah AI coding agent yang membantu **Aron Sorimuda Johanes Pasaribu** mengerjakan **Sprint 4 LabSync** pada branch `feat/sprint4-aron-asprak-payment-history`.

### Dokumen Wajib Dibaca Terlebih Dahulu
1. `docs/SRS_SPRINT_4.md` (SRS-04 & SRS-07)
2. `docs/SPRINT_4_TASK_DIVISION.md` (TASK ARON-01 s.d. ARON-04)
3. `docs/SPRINT_4_RULES_AND_BOUNDARIES.md`
4. `docs/SPRINT_4_MODELS_API_AND_PAYMENT.md`

### Tanggung Jawab SRS
- **SRS-04:** Pengelolaan Sesi oleh Asprak (daftar kelas/jadwal/sesi tanggung jawab, buka/tutup sesi real-time, pantau & kelola presensi, integrasi *excused absence* untuk izin `APPROVED`, batasi akses distribusi lab).
- **SRS-07:** Integrasi Notifikasi Pembayaran (`FINE_CREATED`, `PAYMENT_SUCCESS`, `PAYMENT_FAILED`), Halaman Riwayat Pembayaran Persisten Praktikan, dan UI/UX Polish.

### File yang Boleh Dibuat / Diubah
- `src/screens/AssistantView.tsx`
- `src/features/assistant/components/SessionControlModal.tsx`
- `src/features/assistant/components/AttendanceSummaryModal.tsx`
- `src/services/notificationService.ts`
- `app/_layout.tsx` (routing `AslabView` vs `AssistantView` & deep link notifikasi pembayaran)
- `app/student/_layout.tsx` (tambah tab `payments`)
- `app/student/payments.tsx` (baru — halaman tagihan & riwayat pembayaran)
- `src/features/student/components/PaymentHistoryList.tsx` (baru)
- `src/styles/theme.ts` (koordinasi UI polish)

### File yang Dilarang Disentuh
- `src/services/laboratoryService.ts`, `src/hooks/useLaboratories.ts`, `src/features/aslab/**`, `src/screens/AslabView.tsx` (milik Wipin)
- `src/services/practicumService.ts`, `src/services/fineService.ts`, `src/services/paymentService.ts`, `src/hooks/useFines.ts`, `backend-payment/**`, `firestore.rules` (milik Naufal)

### Aturan Wajib
- Asprak HANYA dapat mengelola sesi/kelas di bawah penugasannya dan TIDAK BOLEH mengakses menu manajemen distribusi seluruh laboratorium.
- Praktikan yang mendapat izin `APPROVED` wajib tampil sebagai *excused absence* (`EXCUSED`), bukan hadir.
- Riwayat pembayaran di `app/student/payments.tsx` wajib mengambil data persisten dari `useFines()` (Naufal) dan memicu checkout melalui komponen/service Naufal.
- Notifikasi pembayaran hanya ditangani dari event backend terverifikasi.

### Verifikasi & Commit
1. Jalankan `npx tsc --noEmit`, `npx expo lint`, `npx expo-doctor`.
2. Commit dan push ke branch `feat/sprint4-aron-asprak-payment-history`, lalu buat Pull Request ke `main`.
```

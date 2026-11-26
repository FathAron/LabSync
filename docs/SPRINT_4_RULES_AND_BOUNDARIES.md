# Sprint 4 — Rules, Boundaries & File Ownership

> **Dokumen Terkait:**
> - [SRS_SPRINT_4.md](./SRS_SPRINT_4.md)
> - [SPRINT_4_TASK_DIVISION.md](./SPRINT_4_TASK_DIVISION.md)
> - [SPRINT_4_MODELS_API_AND_PAYMENT.md](./SPRINT_4_MODELS_API_AND_PAYMENT.md)

Dokumen ini menetapkan batasan teknis dan kepemilikan file untuk menjamin **Zero File Overlap** selama pengerjaan paralel Sprint 4 oleh **Wipin**, **Aron**, dan **Naufal**.

---

## 1. Pembagian Branch Git

| Peran | Nama | Branch Resmi |
| :--- | :--- | :--- |
| **PM Dokumentasi** | Project Manager | `docs/sprint4-planning` |
| **Programmer 1** | Wipin Saputra Poh | `feat/sprint4-wipin-aslab-management` |
| **Programmer 2** | Aron Sorimuda Johanes Pasaribu | `feat/sprint4-aron-asprak-payment-history` |
| **Programmer 3** | Naufal Dwi Yusmawan | `feat/sprint4-naufal-fines-midtrans` |

---

## 2. Aturan Umum & Hard Constraints

1. **Zero File Overlap**: Dua programmer **dilarang** mengubah file yang sama secara bersamaan tanpa koordinasi dan persetujuan pemilik file.
2. **Keamanan Midtrans & Firebase**:
   - `MIDTRANS_SERVER_KEY`, Firebase Service Account JSON, dan kredensial privat **dilarang keras** disimpan di aplikasi React Native maupun di-commit ke Git.
   - Status pembayaran hanya boleh diubah oleh backend setelah verifikasi signature webhook Midtrans.
3. **Pemisahan Kewenangan Role**:
   - **Aslab** (`assistantRole: 'aslab'`) mengelola laboratorium, bulk insert, dan distribusi praktikan/Asprak.
   - **Asprak** (`assistantRole: 'asprak'`) mengelola sesi dan izin di bawah penugasannya. Asprak tidak boleh mengakses fitur distribusi laboratorium.
4. **Integritas Data Presensi & Denda**:
   - Satu keterlambatan hanya menghasilkan maksimal 1 tagihan (`fineInvoices/${sessionId}_${studentId}`).
   - Pembayaran denda tidak boleh mengubah status kehadiran (`LATE` tetap `LATE`).
   - Izin yang disetujui (`APPROVED`) harus membebaskan praktikan dari denda dan mencatat status *excused absence*, bukan hadir.
5. **Tidak Merusak Fitur Sprint 1–3**: Auth, jadwal, presensi GPS, peta OSM, perizinan AI, dan push notification yang sudah berjalan harus tetap berfungsi.

---

## 3. Matriks Kepemilikan File (Berdasarkan Audit Repository Aktual)

### A. File Milik Wipin Saputra Poh (SRS-01, SRS-02, SRS-03)
| File / Direktori | Status | Keterangan |
| :--- | :--- | :--- |
| `src/services/laboratoryService.ts` | Sudah ada (Edit) | Tambah `courseCode`, `gracePeriodMinutes`, `fineAmount`, `studentIds`, `assistantIds`, transfer, dan batch insert |
| `src/hooks/useLaboratories.ts` | Sudah ada (Edit) | Ekspos aksi transfer, bulk insert, dan filter dashboard |
| `src/features/assistant/components/LaboratoryManagementModal.tsx` | Sudah ada (Edit) | Perluas form & pengelolaan lab Aslab |
| `src/features/aslab/**` | Baru | Komponen Dashboard Aslab, Single/Bulk Insert Lab/Praktikan/Asprak, Template Download, Scrollable Review List |
| `src/screens/AslabView.tsx` | Baru | Layar utama khusus role Aslab |

### B. File Milik Aron Sorimuda Johanes Pasaribu (SRS-04, SRS-07)
| File / Direktori | Status | Keterangan |
| :--- | :--- | :--- |
| `src/screens/AssistantView.tsx` | Sudah ada (Edit) | Scope sesi/kelas sesuai penugasan Asprak, sembunyikan manajemen distribusi lab dari Asprak |
| `src/features/assistant/components/SessionControlModal.tsx` | Sudah ada (Edit) | Kontrol buka/tutup sesi Asprak |
| `src/features/assistant/components/AttendanceSummaryModal.tsx` | Sudah ada (Edit) | Rekap presensi termasuk status `ON_TIME`, `LATE`, `EXCUSED` |
| `src/services/notificationService.ts` | Sudah ada (Edit) | Handler client untuk notifikasi `FINE_CREATED`, `PAYMENT_SUCCESS`, `PAYMENT_FAILED` |
| `app/student/payments.tsx` | Baru | Halaman tagihan & riwayat pembayaran persisten praktikan |
| `src/features/student/components/PaymentHistoryList.tsx` | Baru | Komponen kartu/daftar riwayat pembayaran & status |
| `src/styles/theme.ts` | Sudah ada (Koordinasi) | Penyelarasan token UI/UX polish |

### C. File Milik Naufal Dwi Yusmawan (SRS-05, SRS-06)
| File / Direktori | Status | Keterangan |
| :--- | :--- | :--- |
| `src/services/practicumService.ts` | Sudah ada (Edit) | Integrasi timestamp presensi dengan evaluasi keterlambatan & status izin |
| `src/services/fineService.ts` | Baru | Service baca/agregasi `fineInvoices` untuk praktikan & dashboard keuangan Aslab |
| `src/services/paymentService.ts` | Baru | Pemanggilan endpoint backend `create-transaction` dan query `paymentTransactions` |
| `src/hooks/useFines.ts` | Baru | Hook real-time tagihan denda & riwayat transaksi (`onSnapshot`) |
| `src/features/payment/**` | Baru | Modal/WebView checkout Midtrans Sandbox & status transaksi |
| `backend-payment/**` *(atau modul payment di `local-notification-backend/`)* | Baru / Edit | Server Express + `firebase-admin`: Late Detection Engine, Fine Creation, Midtrans Snap API, Webhook Handler (SHA-512), & Trigger Notifikasi |

### D. File Bersama (Single Primary Owner — Dilarang Edit Tanpa Koordinasi)
| File | Pemilik Utama | Aturan Perubahan |
| :--- | :--- | :--- |
| `src/types/models.ts` | **Naufal** | Kontrak tipe Sprint 4 dikunci pada Milestone 1 bersama Wipin & Aron |
| `firestore.rules` | **Naufal** | Penambahan aturan `isAslab()`, `isAsprak()`, `fineInvoices`, `paymentTransactions`, dan perbaikan duplikat blok `laboratories` |
| `src/context/AppContext.tsx` | **Naufal** | Ekspos `assistantRole`, `isAslab`, `isAsprak` secara backward-compatible |
| `src/services/authService.ts` | **Naufal** | Dukungan pembacaan/penyimpanan `assistantRole` |
| `app/_layout.tsx` | **Aron** | Routing `AslabView` vs `AssistantView` dan deep link notifikasi pembayaran |
| `app/student/_layout.tsx` | **Aron** | Penambahan tab `payments` pada navigasi praktikan |
| `local-notification-backend/index.js` | **Naufal** | Penambahan watcher `fineInvoices` & `paymentTransactions` untuk dispatch push notification |
| `package.json` & `app.json` | **Koordinasi PM** | Penambahan package (mis. parser CSV/XLSX atau WebView) wajib memakai `npx expo install` dan disetujui sebelum merge |

---

## 4. Alur Git & Pull Request

1. Sinkronkan `main` terbaru: `git checkout main && git pull origin main`.
2. Buat/pindah ke branch masing-masing (`feat/sprint4-...`).
3. Kerjakan hanya file yang menjadi hak masing-masing.
4. Sebelum commit, jalankan pemeriksaan wajib:
   ```bash
   npx tsc --noEmit
   npx expo lint
   npx expo-doctor
   ```
5. Pastikan tidak ada file `.env`, key Midtrans, atau service account ikut ter-stage (`git status`).
6. Commit dengan format konvensional (`feat(aslab): ...`, `feat(payment): ...`, `feat(asprak): ...`) lalu push ke origin.
7. Buat Pull Request ke `main` dan tunggu review PM.

---

## 5. Urutan Integrasi & Merge yang Direkomendasikan

1. **Tahap 1 (Fondasi Kontrak):** Merge kontrak `src/types/models.ts`, `AppContext.tsx`, dan `firestore.rules` dari branch **Naufal** (atau PR kontrak awal Milestone 1).
2. **Tahap 2 (Backend & Aslab):** Merge branch **Wipin** (`feat/sprint4-wipin-aslab-management`) untuk manajemen lab & data dasar.
3. **Tahap 3 (Fine & Midtrans):** Merge branch **Naufal** (`feat/sprint4-naufal-fines-midtrans`) untuk engine denda, Midtrans, dan `useFines`.
4. **Tahap 4 (Asprak, Payment UI & Polish):** Merge branch **Aron** (`feat/sprint4-aron-asprak-payment-history`) untuk finalisasi navigasi, riwayat pembayaran, notifikasi, dan UI polish.

---

## 6. Definition of Done Sprint 4

- [ ] Seluruh kriteria penerimaan SRS-01 sampai SRS-07 terpenuhi.
- [ ] Seluruh skenario di [SPRINT_4_ACCEPTANCE_TEST.md](./SPRINT_4_ACCEPTANCE_TEST.md) lulus.
- [ ] Tidak ada secret/Server Key di kode mobile.
- [ ] `npx tsc --noEmit`, `npx expo lint`, dan `npx expo-doctor` lulus pada branch `main` setelah seluruh PR digabungkan.

# Sprint 4 — Pembagian Tugas & Alur Integrasi

> **Dokumen Terkait:**
> - [SRS_SPRINT_4.md](./SRS_SPRINT_4.md)
> - [SPRINT_4_RULES_AND_BOUNDARIES.md](./SPRINT_4_RULES_AND_BOUNDARIES.md)
> - [SPRINT_4_MODELS_API_AND_PAYMENT.md](./SPRINT_4_MODELS_API_AND_PAYMENT.md)
> - [SPRINT_4_AGENT_PROMPTS.md](./SPRINT_4_AGENT_PROMPTS.md)

Dokumen ini membagi pekerjaan Sprint 4 kepada **tiga programmer** dengan prinsip **Zero File Overlap** agar seluruh tim dapat bekerja secara paralel tanpa konflik.

---

## 1. Rangkuman Pembagian Programmer & SRS

### Tabel PIC Utama per Programmer

| Programmer | Nama Lengkap | Branch Kerja | SRS | Fokus Utama |
| :--- | :--- | :--- | :--- | :--- |
| **Programmer 1** | **Wipin Saputra Poh** | `feat/sprint4-wipin-aslab-management` | **SRS-01, SRS-02, SRS-03** | Manajemen Laboratorium Aslab, Single & Bulk Insert, Dashboard Keberlangsungan Lab |
| **Programmer 2** | **Aron Sorimuda Johanes Pasaribu** | `feat/sprint4-aron-asprak-payment-history` | **SRS-04, SRS-07** | Operasional Sesi Asprak, Integrasi Notifikasi Pembayaran, Riwayat Pembayaran & UI/UX Polish |
| **Programmer 3** | **Naufal Dwi Yusmawan** | `feat/sprint4-naufal-fines-midtrans` | **SRS-05, SRS-06** | Late Detection Engine, Manajemen Denda, Backend & Integrasi Midtrans Sandbox |

### Tabel Pemetaan SRS

| ID SRS | Nama Kebutuhan | PIC Utama |
| :--- | :--- | :--- |
| **SRS-01** | Manajemen Laboratorium oleh Aslab | Wipin Saputra Poh |
| **SRS-02** | Single Insert & Bulk Insert (Lab, Praktikan, Asprak) | Wipin Saputra Poh |
| **SRS-03** | Dashboard Keberlangsungan Laboratorium | Wipin Saputra Poh |
| **SRS-04** | Pengelolaan Sesi oleh Asprak | Aron Sorimuda Johanes Pasaribu |
| **SRS-05** | Perhitungan Keterlambatan & Pengelolaan Denda | Naufal Dwi Yusmawan |
| **SRS-06** | Integrasi Midtrans Payment Gateway (Sandbox) | Naufal Dwi Yusmawan |
| **SRS-07** | Notifikasi & Riwayat Pembayaran | Aron Sorimuda Johanes Pasaribu |

---

## 2. Rincian Tugas Programmer 1 — Wipin Saputra Poh

**Branch:** `feat/sprint4-wipin-aslab-management`
**PIC:** SRS-01, SRS-02, SRS-03

### TASK WIPIN-01 — Laboratory Management (SRS-01)
- **Tujuan:** Memberikan kewenangan penuh kepada Aslab untuk mengelola data laboratorium dan distribusi praktikan/Asprak.
- **Ruang Lingkup:**
  - CRUD laboratorium (`courseCode`, `courseName`, `name`, `locationName`, `latitude`, `longitude`, `radiusMeters`, `gracePeriodMinutes`).
  - Mendukung pembuatan beberapa laboratorium untuk satu mata kuliah.
  - Menambahkan & memindahkan praktikan antar-laboratorium (`studentIds`).
  - Menambahkan & memindahkan Asprak antar-laboratorium (`assistantIds`).
- **Batasan:** Tidak boleh membuat fitur perpindahan jadwal praktikum; tidak boleh mengubah logika sesi Asprak, perhitungan denda, atau Midtrans.
- **Dependency:** Kontrak `Laboratory` & `UserProfile` (`assistantRole: 'aslab'`) di `src/types/models.ts` (Milestone 1).

### TASK WIPIN-02 — Single & Bulk Insert Management (SRS-02)
- **Tujuan:** Menyediakan input tunggal dan 3 fitur impor massal terpisah dengan tahap review interaktif.
- **Ruang Lingkup:**
  - Single Insert untuk Laboratorium, Praktikan, dan Asprak.
  - 3 fitur Bulk Insert terpisah: (A) Laboratorium per mata kuliah, (B) Praktikan ke lab tertentu, (C) Asprak ke lab tertentu.
  - 3 *downloadable template* CSV/XLSX terpisah (satu per kategori).
  - Parser CSV/XLSX -> validasi per baris -> daftar *scrollable* dengan aksi *Accept*, *Deny*, *Edit inline*, isi field kosong, dan indikator error per baris.
  - Simpan ke Firestore hanya untuk baris yang disetujui & valid.
- **Batasan:** Dilarang menggabungkan ketiga template menjadi satu; dilarang menulis langsung ke Firestore sebelum tahap review Aslab.

### TASK WIPIN-03 — Aslab Dashboard (SRS-03)
- **Tujuan:** Menyediakan pusat pemantauan keberlangsungan laboratorium dan rekap keuangan denda.
- **Ruang Lingkup:**
  - Statistik jumlah laboratorium, praktikan, dan Asprak.
  - Status kegiatan praktikum per lab (berlangsung, akan datang, selesai), lokasi, dan waktu pelaksanaan.
  - Daftar praktikum berlangsung, jadwal berikutnya, dan riwayat kegiatan lab.
  - Riwayat keuangan dari denda praktikum menggunakan kontrak data `fineInvoices` & `paymentTransactions` dari Naufal.
  - Filter periode **Harian**, **Mingguan**, dan **Bulanan** berbasis `Asia/Jakarta`.
- **Batasan:** Tidak membuat koleksi keuangan terpisah yang tidak sinkron dengan modul Naufal.

### Definition of Done (Wipin)
- [ ] Aslab dapat melakukan CRUD lab, konfigurasi radius & *grace period*, serta pemindahan praktikan & Asprak.
- [ ] Ketiga fitur bulk insert terpisah memiliki template unduhan masing-masing dan melewati *review list* sebelum simpan.
- [ ] Dashboard Aslab menampilkan data riil Firestore dengan filter Harian/Mingguan/Bulanan dan keuangan denda sinkron dengan modul Naufal.
- [ ] `npx tsc --noEmit` dan `npx expo lint` lulus tanpa error.

---

## 3. Rincian Tugas Programmer 2 — Aron Sorimuda Johanes Pasaribu

**Branch:** `feat/sprint4-aron-asprak-payment-history`
**PIC:** SRS-04, SRS-07

### TASK ARON-01 — Asprak Session Management (SRS-04)
- **Tujuan:** Memfokuskan `AssistantView` sebagai ruang kerja operasional Asprak sesuai penugasannya.
- **Ruang Lingkup:**
  - Menampilkan daftar kelas, jadwal, dan sesi yang menjadi tanggung jawab Asprak (`assistantId` atau lab penugasan Asprak).
  - Membuka sesi (`PENDING -> ACTIVE`), memantau & mengelola presensi secara *real-time*, dan menutup sesi (`ACTIVE -> CLOSED`).
  - Memastikan praktikan dengan izin `APPROVED` tercatat sebagai *excused absence* (bukan hadir) dan tidak terkena denda.
  - Menyembunyikan/membatasi akses manajemen distribusi & konfigurasi seluruh laboratorium dari Asprak.
  - Menangani state loading, empty, success, dan error dengan jelas.
- **Batasan:** Tidak boleh mengubah manajemen lab/bulk insert milik Wipin atau backend denda/Midtrans milik Naufal.

### TASK ARON-02 — Notification Integration (SRS-07)
- **Tujuan:** Menghubungkan aplikasi mobile dengan event notifikasi pembayaran & tagihan Sprint 4.
- **Ruang Lingkup:**
  - Menangani payload notifikasi `FINE_CREATED`, `PAYMENT_SUCCESS`, dan `PAYMENT_FAILED` di handler navigasi (`app/_layout.tsx` & `notificationService.ts`).
  - Mengarahkan pengguna ke halaman tagihan / riwayat pembayaran saat notifikasi diketuk.
- **Batasan:** Notifikasi hanya dipicu oleh event backend terverifikasi (Naufal), bukan dari respons client.

### TASK ARON-03 — Payment History Interface (SRS-07)
- **Tujuan:** Menyediakan halaman riwayat pembayaran dan daftar tagihan praktikan yang persisten.
- **Ruang Lingkup:**
  - Halaman/tab Riwayat Pembayaran & Tagihan pada modul praktikan (`app/student/payments.tsx`).
  - Menampilkan nama/info sesi, tanggal tagihan, nominal denda, waktu transaksi, status (`pending`, `success`, `failed`), serta tombol bayar yang memanggil komponen/service checkout Midtrans milik Naufal.
  - Data diambil secara persisten dari Firestore/backend via hook/service Naufal sehingga tetap tampil setelah aplikasi ditutup dan dibuka ulang.

### TASK ARON-04 — UI/UX Integration & Polish
- **Tujuan:** Menjaga konsistensi visual dan pengalaman pengguna antar-modul Sprint 4.
- **Ruang Lingkup:**
  - Mengoordinasikan pemakaian token tema (`src/styles/theme.ts`), komponen bersama, dan konsistensi navigasi tab antara Aslab, Asprak, dan Praktikan.
- **Batasan:** Tidak mengedit langsung file milik Wipin atau Naufal tanpa koordinasi PR.

### Definition of Done (Aron)
- [ ] Asprak hanya dapat mengelola sesi/kelas tanggung jawabnya dan tidak memiliki akses distribusi seluruh lab.
- [ ] Praktikan dengan izin `APPROVED` berstatus *excused absence* dan bebas denda.
- [ ] Notifikasi `FINE_CREATED`, `PAYMENT_SUCCESS`, dan `PAYMENT_FAILED` dapat diterima & menavigasi pengguna dengan benar.
- [ ] Halaman riwayat pembayaran menampilkan data persisten dan status terbaru setelah app restart.
- [ ] `npx tsc --noEmit` dan `npx expo lint` lulus tanpa error.

---

## 4. Rincian Tugas Programmer 3 — Naufal Dwi Yusmawan

**Branch:** `feat/sprint4-naufal-fines-midtrans`
**PIC:** SRS-05, SRS-06

### TASK NAUFAL-01 — Late Detection Engine (SRS-05)
- **Tujuan:** Menghitung keterlambatan presensi secara akurat di sisi backend/service dengan zona waktu `Asia/Jakarta`.
- **Ruang Lingkup:**
  - Mengambil waktu mulai sesi (`date` + `startTime` WIB), `gracePeriodMinutes` dari laboratorium/sesi, dan `timestamp` presensi.
  - Menghitung `toleranceDeadline` dan menentukan status `ON_TIME` vs `LATE` serta `lateMinutes`.
  - Menggunakan perbandingan epoch milidetik konsisten (bukan perbandingan string jam).

### TASK NAUFAL-02 — Fine Management (SRS-05)
- **Tujuan:** Menerbitkan tagihan denda otomatis bebas duplikasi dan mengecualikan praktikan berizin.
- **Ruang Lingkup:**
  - Membuat dokumen `fineInvoices/${sessionId}_${studentId}` secara otomatis saat terjadi keterlambatan.
  - Memastikan nominal denda tetap per kejadian dan satu kejadian hanya menghasilkan satu tagihan.
  - Memastikan praktikan dengan `leaveRequests` berstatus `APPROVED` pada sesi tersebut dibebaskan dari denda (`WAIVED` / tidak dibuatkan tagihan).
  - Menjamin pelunasan denda tidak mengubah status kehadiran praktikan.

### TASK NAUFAL-03 — Midtrans Integration (SRS-06)
- **Tujuan:** Mengintegrasikan pembayaran denda melalui Midtrans Sandbox dengan alur `client -> backend -> Midtrans -> webhook`.
- **Ruang Lingkup:**
  - Backend Node.js (`backend-payment/` atau ekstensi backend) dengan `MIDTRANS_SERVER_KEY` di environment server.
  - Endpoint `POST /api/payments/create-transaction` (verifikasi Firebase ID Token + kepemilikan tagihan -> buat `orderId` unik -> Snap API Sandbox -> kembalikan `snapToken` & `redirectUrl`).
  - Endpoint `POST /api/payments/midtrans-webhook` (verifikasi signature SHA-512 -> idempotency check -> update `paymentTransactions` & `fineInvoices` di Firestore -> picu notifikasi `PAYMENT_SUCCESS` / `PAYMENT_FAILED`).
  - Komponen checkout Midtrans di React Native (WebView / `redirectUrl`).

### TASK NAUFAL-04 — Payment Backend Contract (SRS-05, SRS-06)
- **Tujuan:** Menyediakan kontrak data, hook, dan service client yang stabil untuk Aron dan Wipin.
- **Ruang Lingkup:**
  - `src/services/fineService.ts`, `src/services/paymentService.ts`, `src/hooks/useFines.ts`.
  - Menyediakan query/agregasi untuk riwayat pembayaran praktikan (Aron) dan ringkasan keuangan denda Aslab (Wipin).
- **Batasan:** Tidak mengambil alih dashboard Aslab (Wipin) atau operasional sesi Asprak (Aron).

### Definition of Done (Naufal)
- [ ] Presensi melewati *grace period* otomatis membuat tepat 1 `fineInvoices/${sessionId}_${studentId}` tanpa duplikasi; presensi tepat pada batas tidak didenda.
- [ ] Praktikan berizin `APPROVED` tidak dikenakan denda.
- [ ] Transaksi Midtrans Sandbox berhasil dibuat di backend tanpa menyimpan Server Key di client.
- [ ] Webhook Midtrans memverifikasi signature, bersifat idempoten, memperbarui status tagihan, dan memicu event notifikasi.
- [ ] `npx tsc --noEmit` dan `npx expo lint` lulus tanpa error.

---

## 5. Dependency Antarprogrammer

| Milestone | Deskripsi | Pelaku | Menjadi Syarat Bagi |
| :--- | :--- | :--- | :--- |
| **M1 (Hari 1–2)** | Finalisasi `src/types/models.ts`, `assistantRole` di `AppContext.tsx`, dan kontrak `fineInvoices`/`paymentTransactions` | **Naufal** (review Wipin & Aron) | Semua programmer |
| **M2 (Hari 3–6)** | Implementasi paralel: Lab & Bulk Insert (Wipin), Scoped Asprak & UI Riwayat (Aron), Backend Denda & Midtrans Sandbox (Naufal) | **Wipin, Aron, Naufal** | Integrasi M3 |
| **M3 (Hari 7–8)** | Wiring `useFines` & checkout Midtrans ke halaman Aron + dashboard keuangan Wipin + event notifikasi | **Aron & Wipin** memakai kontrak **Naufal** | Pengujian E2E |
| **M4 (Hari 9–10)** | Eksekusi [SPRINT_4_ACCEPTANCE_TEST.md](./SPRINT_4_ACCEPTANCE_TEST.md), UI polish, `tsc`, `expo lint`, `expo-doctor`, PR & Merge | **Seluruh Tim + PM** | Rilis Sprint 4 |

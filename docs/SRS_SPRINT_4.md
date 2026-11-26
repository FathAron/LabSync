# Software Requirements Specification (SRS) — Sprint 4 LabSync

> **Dokumen Terkait:**
> - [SPRINT_4_TASK_DIVISION.md](./SPRINT_4_TASK_DIVISION.md)
> - [SPRINT_4_RULES_AND_BOUNDARIES.md](./SPRINT_4_RULES_AND_BOUNDARIES.md)
> - [SPRINT_4_MODELS_API_AND_PAYMENT.md](./SPRINT_4_MODELS_API_AND_PAYMENT.md)
> - [SPRINT_4_ACCEPTANCE_TEST.md](./SPRINT_4_ACCEPTANCE_TEST.md)
> - [SPRINT_4_OPEN_DECISIONS.md](./SPRINT_4_OPEN_DECISIONS.md)

---

## 1. Pendahuluan

Sprint 4 merupakan tahap penyempurnaan dan integrasi lanjutan aplikasi **LabSync** setelah fondasi autentikasi, manajemen kelas/sesi, perizinan AI (Sprint 2), serta presensi berbasis lokasi GPS, peta laboratorium, dan push notification (Sprint 3) selesai dibangun.

Pada Sprint 4, sistem diperluas untuk memisahkan kewenangan **Aslab (Asisten Laboratorium)** dan **Asprak (Asisten Praktikum)**, menyediakan fitur manajemen & *bulk insert* laboratorium/praktikan/Asprak, dashboard keberlangsungan laboratorium, perhitungan keterlambatan (*grace period*) dan denda otomatis, integrasi **Midtrans Sandbox Payment Gateway**, serta notifikasi dan riwayat pembayaran persisten.

Penomoran kebutuhan pada dokumen ini dimulai kembali dari **SRS-01 sampai SRS-07** dan berdiri sendiri dari penomoran Sprint 1–3.

---

## 2. Tujuan Sprint 4

1. Menyediakan peran **Aslab** dengan kewenangan penuh atas manajemen laboratorium, konfigurasi radius & *grace period*, serta distribusi praktikan dan Asprak.
2. Menyediakan mekanisme **Single Insert** dan **Bulk Insert** (terpisah untuk Laboratorium, Praktikan, dan Asprak) lengkap dengan template unduhan dan *review list* interaktif sebelum penyimpanan final.
3. Menyediakan **Dashboard Keberlangsungan Laboratorium** bagi Aslab yang tersinkronisasi dengan data jadwal, sesi, dan transaksi denda di Firestore.
4. Memfokuskan **Asprak** pada pengelolaan sesi praktikum yang menjadi tanggung jawabnya secara *real-time*, termasuk integrasi status izin (*excused absence*).
5. Menerapkan mesin deteksi keterlambatan berbasis *grace period* dan pembuatan tagihan denda otomatis yang bebas duplikasi di sisi backend.
6. Mengintegrasikan pembayaran denda melalui **Midtrans Sandbox** dengan alur `client -> backend -> payment gateway -> webhook` yang aman.
7. Mengintegrasikan notifikasi dan menyediakan halaman riwayat pembayaran yang persisten bagi praktikan, disertai finalisasi UI/UX seluruh aplikasi.

---

## 3. Ruang Lingkup

### Termasuk dalam Ruang Lingkup
- Pemisahan hak akses `Aslab` dan `Asprak` di atas sistem autentikasi Firebase yang sudah ada.
- CRUD laboratorium, *single insert*, dan 3 fitur *bulk insert* terpisah (CSV/XLSX) beserta alur *preview/review/edit*.
- Dashboard Aslab dengan filter harian, mingguan, dan bulanan.
- Operasional sesi Asprak yang terlingkup (*scoped*) pada kelas/laboratorium penugasannya.
- Perhitungan keterlambatan, pengecualian izin (*excused absence*), dan pembuatan tagihan denda tetap di backend.
- Pembayaran denda via Midtrans Sandbox (Snap/Redirect) dan verifikasi webhook idempoten di backend.
- Push notification event tagihan/pembayaran dan halaman riwayat pembayaran praktikan.

### Di Luar Ruang Lingkup
- Pembayaran menggunakan uang sungguhan / Midtrans Production.
- Perpindahan jadwal praktikum antar-laboratorium (perpindahan hanya untuk praktikan dan Asprak).
- Fitur pengembalian dana (*refund*) otomatis ke rekening bank praktikan.
- Integrasi `model-edom/` (masih berada di luar lingkup Sprint 4).

---

## 4. Aktor dan Karakteristik Pengguna

| Aktor | Peran di Sistem | Kewenangan Utama |
| :--- | :--- | :--- |
| **Aslab** *(Baru)* | `role: 'assistant'`, `assistantRole: 'aslab'` | Mengelola CRUD laboratorium, mengatur radius & *grace period*, melakukan single/bulk insert & pemindahan praktikan/Asprak, memantau dashboard keberlangsungan lab dan keuangan denda. |
| **Asprak** | `role: 'assistant'`, `assistantRole: 'asprak'` | Melihat kelas/jadwal/sesi yang menjadi tanggung jawabnya, membuka/menutup sesi, memantau & mengelola presensi, serta menyetujui/menolak izin praktikan. Tidak boleh mengelola distribusi atau konfigurasi seluruh lab. |
| **Praktikan** | `role: 'student'` | Melihat jadwal, melakukan presensi berbasis lokasi, mengajukan izin, melihat daftar tagihan denda, melakukan pembayaran via Midtrans Sandbox, melihat riwayat pembayaran, dan menerima push notification. |
| **Sistem / Backend** | Node.js Backend + Firebase Admin + Midtrans | Mengevaluasi keterlambatan, membuat tagihan denda anti-duplikasi, membuat transaksi Midtrans Sandbox, memverifikasi signature webhook secara idempoten, dan mengirim push notification via Expo Push API. |

---

## 5. Kebutuhan Fungsional & Acceptance Criteria

### SRS-01 — Manajemen Laboratorium oleh Aslab

**User Story**
Sebagai Aslab, saya ingin mengelola data laboratorium beserta distribusi praktikan dan Asprak sesuai mata kuliah tanggung jawab saya agar operasional praktikum tertata dan tidak dapat diubah sembarangan oleh Asprak.

**Kebutuhan Detail**
1. Menambahkan, mengedit, dan menghapus laboratorium (dengan validasi integritas data jika masih terhubung ke sesi aktif).
2. Membuat beberapa laboratorium berdasarkan satu mata kuliah (`courseCode`, `courseName`).
3. Mengelola nama, deskripsi/lokasi, koordinat `latitude` & `longitude`, `radiusMeters`, serta `gracePeriodMinutes`.
4. Menambahkan dan memindahkan praktikan dari satu laboratorium ke laboratorium lainnya.
5. Menambahkan dan memindahkan Asprak dari satu laboratorium ke laboratorium lainnya.
6. Membatasi agar Asprak tidak dapat mengakses fitur distribusi maupun mengubah konfigurasi seluruh laboratorium.
7. Tidak menyediakan fitur perpindahan jadwal praktikum (perpindahan hanya untuk praktikan dan Asprak).

**Acceptance Criteria**
- [ ] Akun Aslab dapat membuat, mengubah, dan menghapus laboratorium dengan koordinat, radius (> 0 m), dan *grace period* (>= 0 menit) yang valid.
- [ ] Akun Aslab dapat membuat lebih dari satu laboratorium untuk mata kuliah yang sama.
- [ ] Aslab dapat menambahkan dan memindahkan praktikan serta Asprak antar-laboratorium tanpa memindahkan jadwal sesi.
- [ ] Akun Asprak dan Praktikan ditolak (baik di UI maupun Firestore Security Rules) jika mencoba membuat/mengubah/menghapus laboratorium atau distribusi anggotanya.

---

### SRS-02 — Single Insert dan Bulk Insert

**User Story**
Sebagai Aslab, saya ingin menginput data laboratorium, praktikan, dan Asprak baik satu per satu maupun secara massal dengan tahap peninjauan agar data yang masuk ke Firestore bersih dan akurat.

**Kebutuhan Detail**
1. Menyediakan **Single Insert** untuk Laboratorium, Praktikan, dan Asprak.
2. Menyediakan **3 fitur Bulk Insert yang terpisah** (bukan satu template gabungan):
   - **Bulk Insert Laboratorium** (berdasarkan satu mata kuliah).
   - **Bulk Insert Praktikan** (ke laboratorium tertentu).
   - **Bulk Insert Asprak** (ke laboratorium tertentu).
3. Menyediakan *downloadable file template* (CSV/XLSX) khusus untuk masing-masing jenis bulk insert.
4. Alur Bulk Insert wajib melewati tahap **Review & Approval**:
   - Sistem membaca seluruh baris file yang diunggah dan memvalidasi setiap baris.
   - Setiap baris ditampilkan dalam daftar *scrollable view*.
   - Aslab dapat memeriksa, menerima (*accept*), menolak (*deny*), mengedit nilai yang salah, dan melengkapi field kosong per baris.
   - Sistem menampilkan pesan kesalahan spesifik per baris yang tidak valid.
   - Hanya baris yang berstatus *accepted* dan valid yang disimpan ke Firestore saat Aslab menekan tombol simpan final.

**Acceptance Criteria**
- [ ] Tersedia 3 menu/alur bulk insert terpisah beserta 3 tombol unduh template masing-masing.
- [ ] Mengunggah file tidak langsung menulis ke Firestore; data tampil terlebih dahulu dalam daftar *scrollable* untuk direview.
- [ ] Baris dengan data tidak valid ditandai dengan alasan error yang jelas dan tidak bisa disimpan sebelum diperbaiki atau ditolak (*deny*).
- [ ] Aslab dapat mengubah nilai atau mengisi kolom kosong langsung di daftar review lalu menyimpannya ke Firestore.

---

### SRS-03 — Dashboard Keberlangsungan Laboratorium

**User Story**
Sebagai Aslab, saya ingin memantau statistik operasional seluruh laboratorium, jadwal praktikum, dan rekap keuangan denda dalam satu dashboard agar pengawasan berjalan efektif.

**Kebutuhan Detail**
1. Menampilkan ringkasan metrik: jumlah laboratorium, jumlah praktikan, dan jumlah Asprak.
2. Menampilkan status kegiatan praktikum setiap laboratorium (sedang berlangsung, akan datang, selesai/kosong).
3. Menampilkan informasi lokasi dan waktu pelaksanaan praktikum.
4. Menampilkan daftar praktikum yang sedang berlangsung dan jadwal praktikum berikutnya.
5. Menampilkan riwayat kegiatan laboratorium.
6. Menampilkan riwayat keuangan yang berasal dari transaksi/tagihan denda yang sebenarnya (menggunakan kontrak data dari modul denda & pembayaran).
7. Menyediakan filter periode: **Harian**, **Mingguan**, dan **Bulanan**.

**Acceptance Criteria**
- [ ] Seluruh angka dan daftar pada dashboard Aslab berasal dari data nyata Firestore (`laboratories`, `sessions`, `users`, `fineInvoices`, `paymentTransactions`).
- [ ] Filter Harian, Mingguan, dan Bulanan memperbarui daftar riwayat kegiatan dan ringkasan keuangan denda secara akurat sesuai zona waktu `Asia/Jakarta`.
- [ ] Total penerimaan denda di dashboard cocok dengan jumlah tagihan berstatus `PAID` dari modul pembayaran.

---

### SRS-04 — Pengelolaan Sesi oleh Asprak

**User Story**
Sebagai Asprak, saya ingin mengelola sesi praktikum yang menjadi tanggung jawab saya secara *real-time* agar kegiatan praktikum dan pencatatan izin praktikan berjalan tertib.

**Kebutuhan Detail**
1. Melihat daftar kelas, jadwal, dan sesi praktikum yang menjadi tanggung jawabnya (terlingkup pada penugasan Asprak).
2. Membuka sesi saat praktikum dimulai (`PENDING -> ACTIVE`).
3. Memantau dan mengelola presensi praktikan secara *real-time*.
4. Menutup sesi setelah praktikum selesai (`ACTIVE -> CLOSED`).
5. Integrasi dengan modul pengajuan izin (`leaveRequests`): praktikan yang izinnya disetujui (`APPROVED`) tercatat sebagai `excused absence` (tidak hadir dengan izin), bukan `'Hadir'`.
6. Pembatasan akses: Asprak tidak dapat mengelola distribusi praktikan/Asprak atau konfigurasi seluruh laboratorium.

**Acceptance Criteria**
- [ ] Perubahan status sesi oleh Asprak langsung terlihat secara *real-time* di aplikasi praktikan.
- [ ] Asprak hanya melihat dan dapat mengontrol sesi/kelas yang berada di bawah penugasannya.
- [ ] Praktikan dengan izin `APPROVED` tercatat berstatus izin (`EXCUSED`), tidak dihitung hadir, dan bebas dari denda.
- [ ] Kompatibilitas dengan sistem presensi Sprint 1–3 (termasuk validasi GPS/radius) tetap terjaga.

---

### SRS-05 — Perhitungan Keterlambatan dan Pengelolaan Denda

**User Story**
Sebagai sistem, saya harus menghitung keterlambatan praktikan berdasarkan waktu mulai sesi dan *grace period* secara konsisten agar tagihan denda dibuat akurat tanpa duplikasi.

**Kebutuhan Detail**
1. Mengambil waktu mulai sesi (`date` + `startTime` dalam zona waktu `Asia/Jakarta`), konfigurasi `gracePeriodMinutes` laboratorium/sesi, dan waktu presensi aktual (`timestamp`).
2. Batas toleransi = `sessionStartAt + gracePeriodMinutes`.
   - `attendedAt <= toleranceDeadline` -> **Tepat Waktu** (`ON_TIME`), tidak ada denda.
   - `attendedAt > toleranceDeadline` -> **Terlambat** (`LATE`), dibuatkan tagihan denda nominal tetap.
3. Satu kejadian keterlambatan (`sessionId + studentId`) hanya boleh menghasilkan **maksimal satu tagihan** (`fineInvoices/${sessionId}_${studentId}`).
4. Tagihan terhubung dengan `studentId`, `sessionId`, dan `attendanceId`.
5. Pengecualian izin: praktikan dengan izin `APPROVED` (*excused absence*) **dibebaskan** dari denda keterlambatan dan status kehadirannya tetap izin (bukan hadir).
6. Pembayaran denda tidak mengubah status kehadiran praktikan (`LATE` tetap tercatat terlambat).
7. Perhitungan waktu wajib menggunakan timestamp numerik / ISO UTC + offset `Asia/Jakarta`, bukan perbandingan string jam mentah.

**Acceptance Criteria**
- [ ] Presensi sebelum atau tepat pada menit terakhir *grace period* tidak menghasilkan tagihan denda.
- [ ] Presensi 1 detik/1 menit melewati *grace period* menghasilkan tepat 1 dokumen tagihan di `fineInvoices/${sessionId}_${studentId}`.
- [ ] Pemanggilan ulang evaluasi denda untuk presensi yang sama tidak menciptakan tagihan kedua (idempoten di backend).
- [ ] Praktikan berstatus izin `APPROVED` tidak pernah dikenakan tagihan denda pada sesi tersebut.

---

### SRS-06 — Integrasi Midtrans Payment Gateway

**User Story**
Sebagai praktikan, saya ingin melihat tagihan denda saya dan membayarnya melalui Midtrans Sandbox dengan aman agar kewajiban denda terselesaikan secara transparan.

**Kebutuhan Detail**
1. Menampilkan daftar tagihan denda praktikan beserta detail sesi dan nominal denda.
2. Membuat transaksi pembayaran melalui **backend** (menggunakan Midtrans Sandbox Snap API) dengan `orderId` unik.
3. Mengarahkan praktikan ke halaman pembayaran Midtrans Sandbox (Snap WebView / `redirectUrl`).
4. Menerima dan memverifikasi callback/webhook Midtrans di **backend** menggunakan validasi signature key (`SHA-512`).
5. Mengelola status transaksi & tagihan: `pending`, `success`, `failed`.
6. Menangani webhook berulang secara idempoten agar tidak terjadi transaksi/update ganda.
7. Keamanan wajib:
   - Menggunakan Midtrans Sandbox (bukan Production).
   - `MIDTRANS_SERVER_KEY` hanya tersimpan di environment backend, **tidak pernah** di aplikasi React Native.
   - Status pembayaran hanya boleh diperbarui oleh backend setelah verifikasi webhook/status Midtrans yang valid, bukan dari respons client.
   - Hanya pemilik tagihan (`invoice.studentId === auth.uid`) yang dapat memulai transaksi.
   - Pembayaran yang berhasil tidak mengubah status kehadiran praktikan.

**Acceptance Criteria**
- [ ] Praktikan hanya melihat dan dapat membayar tagihan miliknya sendiri.
- [ ] Proses `create-transaction` mengembalikan `snapToken`/`redirectUrl` dari backend tanpa mengekspos Server Key ke client.
- [ ] Webhook dengan signature valid memperbarui status transaksi dan tagihan (`PAID`/`FAILED`/`PENDING`) di Firestore; webhook dengan signature tidak valid ditolak (`HTTP 403`).
- [ ] Pengiriman ulang webhook yang sama tidak menduplikasi log/perubahan status.

---

### SRS-07 — Notifikasi dan Riwayat Pembayaran

**User Story**
Sebagai praktikan, saya ingin menerima notifikasi saat ada tagihan baru atau perubahan status pembayaran serta melihat riwayat pembayaran yang persisten agar saya selalu mengetahui status kewajiban saya.

**Kebutuhan Detail**
1. Menggunakan infrastruktur push notification Sprint 3 (`local-notification-backend` + Expo Push API) untuk mengirim notifikasi saat:
   - Tagihan denda baru dibuat (`FINE_CREATED`).
   - Pembayaran berhasil (`PAYMENT_SUCCESS`).
   - Pembayaran gagal / kedaluwarsa / membutuhkan penyelesaian (`PAYMENT_FAILED`).
2. Notifikasi hanya dikirim setelah event terverifikasi tersimpan di backend/Firestore (bukan dari state client sementara).
3. Menyediakan halaman **Riwayat Pembayaran** di aplikasi praktikan yang menampilkan:
   - Informasi/nama sesi praktikum.
   - Tanggal tagihan.
   - Nominal denda.
   - Waktu transaksi.
   - Status pembayaran (`pending`, `success`, `failed`).
4. Data riwayat bersumber dari Firestore/backend sehingga tetap tersedia setelah aplikasi ditutup dan dibuka kembali.
5. Finalisasi UI/UX seluruh aplikasi agar konsisten, responsif, dan memiliki loading/empty/error state yang jelas.

**Acceptance Criteria**
- [ ] Praktikan menerima push notification ketika tagihan denda terbentuk, pembayaran sukses, atau pembayaran gagal.
- [ ] Halaman Riwayat Pembayaran menampilkan seluruh item tagihan/transaksi beserta status terbarunya dan tetap bertahan setelah aplikasi di-restart.
- [ ] Ketukan notifikasi pembayaran/tagihan mengarahkan praktikan ke halaman tagihan/riwayat pembayaran.

---

## 6. Kebutuhan Nonfungsional

1. **Keamanan & Integritas Data**: Seluruh logika denda, pembuatan transaksi Midtrans, verifikasi signature webhook, dan pembaruan status bayar wajib berada di backend tepercaya (`firebase-admin`). Aplikasi mobile tidak boleh menulis status `PAID` langsung ke Firestore.
2. **Idempotency**: Pembuatan tagihan denda (`${sessionId}_${studentId}`), pemrosesan webhook Midtrans, dan pengiriman push notification (`notificationDispatches`) harus idempoten.
3. **Konsistensi Waktu**: Seluruh perhitungan batas keterlambatan dan filter dashboard wajib menggunakan zona waktu `Asia/Jakarta` (WIB, UTC+7) berbasis epoch/ISO timestamp.
4. **Kompatibilitas**: Tidak merusak fitur autentikasi, jadwal, presensi GPS, peta lab, perizinan AI, dan push notification dari Sprint 1–3.
5. **Kualitas Kode**: Seluruh kode harus lolos `npx tsc --noEmit`, `npx expo lint`, dan kompatibel dengan Expo SDK 58.

---

## 7. Business Rules

1. `Aslab` berwenang mengelola laboratorium dan distribusi praktikan/Asprak; `Asprak` berwenang mengelola operasional sesi dan review izin pada penugasannya.
2. Satu kejadian keterlambatan hanya menghasilkan 1 tagihan denda bernominal tetap.
3. Izin yang disetujui (`APPROVED`) menghasilkan status tidak hadir dengan izin (`EXCUSED`) dan membebaskan praktikan dari denda.
4. Pelunasan denda tidak mengubah catatan kehadiran (terlambat tetap terlambat).
5. Pembayaran denda hanya dilakukan di lingkungan **Midtrans Sandbox**.

---

## 8. Alur Utama Aplikasi (Sprint 4)

### 8.1 Alur Manajemen Lab & Bulk Insert oleh Aslab
`Aslab login -> Menu Manajemen Lab -> Unduh template CSV/XLSX -> Unggah file -> Review daftar scrollable (Accept/Deny/Edit/Lengkapi) -> Simpan data valid ke Firestore`.

### 8.2 Alur Presensi, Keterlambatan, Denda & Pembayaran
`Asprak buka sesi -> Praktikan presensi (GPS valid) -> Backend evaluasi timestamp vs (startTime + gracePeriod) -> Jika terlambat & tidak izin: buat fineInvoices/${sessionId}_${studentId} -> Kirim notif FINE_CREATED -> Praktikan buka Tagihan & bayar via Midtrans Sandbox Snap -> Midtrans kirim webhook ke backend -> Backend verifikasi signature & update status PAID -> Kirim notif PAYMENT_SUCCESS -> Tampil di Riwayat Pembayaran & Dashboard Keuangan Aslab`.

---

## 9. Edge Cases

1. **Asisten Membuka Sesi dengan Jam Mulai Terlewat**: Perhitungan denda tetap mengacu pada konfigurasi waktu sesi atau kebijakan yang disepakati (lihat [SPRINT_4_OPEN_DECISIONS.md](./SPRINT_4_OPEN_DECISIONS.md)).
2. **Praktikan Menutup Aplikasi Saat Pembayaran Midtrans Berlangsung**: Status tetap `pending`; saat webhook masuk dari Midtrans, backend memperbarui status di Firestore dan mengirim notifikasi, sehingga saat aplikasi dibuka kembali riwayat sudah sinkron.
3. **Webhook Midtrans Terkirim Lebih dari Sekali**: Backend mendeteksi status terminal (`PAID` / `success`) atau `midtransTransactionId` yang sama dan mengembalikan `200 OK` tanpa menduplikasi mutasi atau notifikasi.
4. **File Bulk Insert Berisi Baris Campuran (Valid & Error)**: Baris valid tetap dapat di-accept, sementara baris error ditandai merah dengan detail kesalahan sampai diperbaiki Aslab atau di-deny.
5. **Asprak Mencoba Membuka Menu Manajemen Lab / Distribusi**: Menu disembunyikan di UI dan operasi tulis ke `laboratories` ditolak di `firestore.rules`.

# Sprint 4 — Open Decisions (Menunggu Persetujuan PM)

> **Dokumen Terkait:**
> - [SRS_SPRINT_4.md](./SRS_SPRINT_4.md)
> - [SPRINT_4_MODELS_API_AND_PAYMENT.md](./SPRINT_4_MODELS_API_AND_PAYMENT.md)

Daftar berikut merangkum keputusan teknis dan bisnis yang belum ditetapkan secara eksplisit pada requirement awal Sprint 4. Setiap poin menyertakan rekomendasi teknis beserta dampaknya untuk disetujui oleh **Project Manager**.

---

## 1. Penentuan Nominal Denda Keterlambatan
- **Pertanyaan:** Apakah nominal denda tetap berlaku **global** untuk seluruh praktikum (misal Rp 10.000 per keterlambatan) atau **dikonfigurasi per laboratorium / mata kuliah**?
- **Rekomendasi Teknis:** Simpan `fineAmount` opsional di `laboratories/{labId}` (dikelola Aslab) dengan nilai fallback global default (misal `DEFAULT_FINE_AMOUNT = 10000` di konfigurasi backend).
- **Dampak:** Memberikan fleksibilitas kebijakan per mata kuliah tanpa memblokir pembuatan tagihan bila Aslab belum mengisi nominal khusus.

## 2. Cakupan Mata Kuliah Aslab
- **Pertanyaan:** Apakah satu akun **Aslab** dapat mengelola **lebih dari satu mata kuliah**, atau 1 Aslab hanya untuk 1 mata kuliah?
- **Rekomendasi Teknis:** Izinkan Aslab mengelola banyak laboratorium dan menyimpan `aslabId` pada setiap dokumen `laboratories/{labId}` (serta opsional `managedCourseCodes?: string[]` pada `users/{uid}`).
- **Dampak:** Lebih realistis jika di lab kampus satu Aslab membawahi beberapa mata kuliah praktikum sekaligus.

## 3. Keanggotaan Praktikan di Lebih dari Satu Laboratorium
- **Pertanyaan:** Apakah satu praktikan dapat terdaftar di **lebih dari satu laboratorium** (misal mengikuti 2 mata kuliah praktikum berbeda), atau maksimal 1 laboratorium?
- **Rekomendasi Teknis:** Izinkan praktikan terdaftar di lebih dari 1 laboratorium **untuk mata kuliah yang berbeda**, namun hanya 1 laboratorium per mata kuliah (saat pemindahan praktikan di mata kuliah yang sama, pindahkan dari lab asal ke lab tujuan).
- **Dampak:** Mencegah bentrok distribusi praktikan pada mata kuliah yang sama sambil tetap mendukung praktikan mengambil beberapa mata kuliah.

## 4. Koreksi Status Presensi oleh Asprak
- **Pertanyaan:** Apakah **Asprak** boleh mengoreksi/mengubah status presensi praktikan yang sudah tercatat (misal dari tidak hadir/terlambat menjadi izin atau sebaliknya)?
- **Rekomendasi Teknis:** Pertahankan `attendance` bersifat append/create-only dari sisi praktikan, dan berikan aksi terbatas bagi Asprak untuk menandai *excused absence* (`EXCUSED`) melalui alur izin (`leaveRequests`) atau catatan koreksi Asprak yang diaudit (`updatedBy`, `updatedAt`) tanpa menghapus rekam jejak asli.
- **Dampak:** Menjaga integritas audit presensi sekaligus memberi jalan keluar jika terjadi kendala teknis di lab.

## 5. Cakupan Konfigurasi Grace Period
- **Pertanyaan:** Apakah `gracePeriodMinutes` berlaku **per laboratorium** atau dapat di-override **per sesi**?
- **Rekomendasi Teknis:** Simpan default `gracePeriodMinutes` pada dokumen `laboratories/{labId}` (diatur Aslab sesuai SRS-01), dan izinkan `sessions/{sessionId}.gracePeriodMinutes` mewarisi nilai tersebut saat sesi dibuat.
- **Dampak:** Aslab cukup mengatur sekali di level laboratorium, namun aturan tetap konsisten dan dapat dilacak per sesi saat audit denda.

## 6. Mekanisme Pembatalan / Refund Transaksi
- **Pertanyaan:** Bagaimana penanganan apabila terjadi kesalahan penagihan setelah transaksi berstatus `PAID` di Midtrans Sandbox?
- **Rekomendasi Teknis:** Untuk Sprint 4, transaksi `PAID` tidak direfund otomatis via API Midtrans; sediakan status `WAIVED` pada `fineInvoices` (hanya via backend/admin) jika ada pembebasan tagihan yang belum dibayar, dan catat pembatalan secara manual untuk tagihan yang sudah lunas.
- **Dampak:** Menjaga ruang lingkup Sprint 4 tetap fokus dan aman dari kompleksitas rekonsiliasi refund.

## 7. Hosting Backend Payment & Webhook Midtrans
- **Pertanyaan:** Di mana backend Node.js (`backend-payment/` / `local-notification-backend/`) akan dijalankan agar webhook Midtrans Sandbox dapat menjangkau server?
- **Rekomendasi Teknis:** Midtrans Sandbox webhook membutuhkan URL HTTPS publik. Gunakan tunnel HTTPS (mis. `ngrok` / Cloudflare Tunnel) untuk pengujian lokal, atau deploy service Node.js ke cloud hosting (Railway / Render / Cloud Run / Firebase Functions) sebelum demo/UAT.
- **Dampak:** Tanpa URL HTTPS publik, transaksi tetap bisa dibuat tetapi webhook otomatis dari Midtrans tidak akan masuk tanpa *manual status sync*.

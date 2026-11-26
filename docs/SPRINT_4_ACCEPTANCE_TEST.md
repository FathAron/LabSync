# Sprint 4 — Acceptance Test Plan

> **Dokumen Terkait:**
> - [SRS_SPRINT_4.md](./SRS_SPRINT_4.md)
> - [SPRINT_4_MODELS_API_AND_PAYMENT.md](./SPRINT_4_MODELS_API_AND_PAYMENT.md)

Dokumen ini berisi daftar uji penerimaan (*Acceptance Test*) resmi Sprint 4 untuk seluruh peran dan alur integrasi.

---

## A. Aslab & Manajemen Laboratorium (SRS-01, SRS-02)

| ID Uji | Skenario | Langkah Uji | Hasil yang Diharapkan |
| :--- | :--- | :--- | :--- |
| **TC-ASLAB-01** | Tambah laboratorium | Login Aslab -> Tambah Lab (`Lab C1`, matkul `PPK`, koordinat valid, radius `50 m`, grace period `15 menit`). | Lab tersimpan di `laboratories`, tampil di daftar lab & peta. |
| **TC-ASLAB-02** | Edit laboratorium | Edit `radiusMeters` menjadi `75` dan `gracePeriodMinutes` menjadi `10`. | Perubahan tersimpan di Firestore dan langsung dipakai validasi presensi & denda. |
| **TC-ASLAB-03** | Multi-lab 1 matkul | Buat `Lab C1` dan `Lab C2` untuk mata kuliah yang sama. | Keduanya tersimpan independen di bawah `courseCode` yang sama. |
| **TC-ASLAB-04** | Download 3 template terpisah | Buka 3 menu bulk insert (Lab, Praktikan, Asprak) -> klik Download Template pada masing-masing. | Terunduh 3 file template berbeda dengan header kolom sesuai kategori. |
| **TC-ASLAB-05** | Bulk insert Lab + Review | Unggah file CSV lab berisi 3 baris (2 valid, 1 koordinat kosong). | Muncul 3 item di *scrollable review list*; baris error ditandai pesan jelas; Aslab edit baris kosong & deny 1 baris -> simpan hanya 2 baris valid. |
| **TC-ASLAB-06** | Bulk insert Praktikan | Unggah CSV praktikan ke `Lab C1` -> review -> accept -> simpan. | Praktikan masuk ke `Lab C1.studentIds`. |
| **TC-ASLAB-07** | Bulk insert Asprak | Unggah CSV Asprak ke `Lab C1` -> review -> accept -> simpan. | Asprak masuk ke `Lab C1.assistantIds`. |
| **TC-ASLAB-08** | Pindah praktikan antar-lab | Pindahkan praktikan X dari `Lab C1` ke `Lab C2`. | X terhapus dari `Lab C1.studentIds` dan masuk ke `Lab C2.studentIds`; jadwal sesi tidak berubah. |
| **TC-ASLAB-09** | Pindah Asprak antar-lab | Pindahkan Asprak Y dari `Lab C1` ke `Lab C2`. | Y terhapus dari `Lab C1.assistantIds` dan masuk ke `Lab C2.assistantIds`. |

---

## B. Dashboard Keberlangsungan Laboratorium (SRS-03)

| ID Uji | Skenario | Langkah Uji | Hasil yang Diharapkan |
| :--- | :--- | :--- | :--- |
| **TC-DASH-01** | Statistik lab | Buka Dashboard Aslab. | Jumlah lab, jumlah praktikan, dan jumlah Asprak sesuai data Firestore aktual. |
| **TC-DASH-02** | Status berlangsung & mendatang | Buka 1 sesi (`ACTIVE`) dan biarkan 1 sesi (`PENDING`). | Dashboard menampilkan sesi `ACTIVE` pada bagian berlangsung dan `PENDING` pada jadwal berikutnya lengkap dengan lokasi & waktu. |
| **TC-DASH-03** | Riwayat kegiatan & denda | Tutup 1 sesi dan selesaikan 1 pembayaran denda (`PAID`). | Riwayat kegiatan dan ringkasan keuangan denda menampilkan transaksi `PAID` aktual dari `fineInvoices`. |
| **TC-DASH-04** | Filter Harian / Mingguan / Bulanan | Ganti filter antara Harian, Mingguan, dan Bulanan. | Daftar riwayat dan total keuangan terfilter akurat sesuai rentang tanggal `Asia/Jakarta`. |

---

## C. Asprak & Pengelolaan Sesi (SRS-04)

| ID Uji | Skenario | Langkah Uji | Hasil yang Diharapkan |
| :--- | :--- | :--- | :--- |
| **TC-ASPRAK-01** | Scope sesi penugasan | Login Asprak yang hanya ditugaskan ke `Lab C1`. | Hanya kelas/sesi tanggung jawabnya yang tampil. |
| **TC-ASPRAK-02** | Buka & tutup sesi real-time | Asprak klik Buka Sesi -> cek HP Praktikan -> Asprak klik Tutup Sesi. | Status di HP Praktikan berubah `PENDING -> ACTIVE -> CLOSED` secara real-time. |
| **TC-ASPRAK-03** | Monitoring & kelola presensi | Asprak membuka rekap presensi selama sesi berjalan. | Daftar hadir tampil real-time beserta status `ON_TIME` / `LATE` / `EXCUSED`. |
| **TC-ASPRAK-04** | Pembatasan akses Asprak | Cek navigasi Asprak dan coba akses fungsi manajemen lab. | Menu manajemen/distribusi seluruh lab tidak tersedia; tulis ke `laboratories` ditolak `firestore.rules`. |

---

## D. Perhitungan Keterlambatan & Denda (SRS-05)

| ID Uji | Skenario | Langkah Uji | Hasil yang Diharapkan |
| :--- | :--- | :--- | :--- |
| **TC-FINE-01** | Presensi tepat waktu | Sesi mulai `08:00`, grace period `15 menit`; praktikan presensi pukul `08:10 WIB`. | Status `ON_TIME`, tidak ada dokumen di `fineInvoices`. |
| **TC-FINE-02** | Presensi tepat pada batas | Sesi mulai `08:00`, grace period `15 menit`; presensi pukul `08:15:00 WIB`. | Status `ON_TIME`, tidak ada denda. |
| **TC-FINE-03** | Presensi melewati batas | Presensi pukul `08:16 WIB`. | Status `LATE`, terbuat tepat 1 dokumen `fineInvoices/${sessionId}_${studentId}` dengan status `UNPAID`. |
| **TC-FINE-04** | Pencegahan tagihan ganda | Jalankan ulang evaluasi denda untuk presensi terlambat yang sama. | Jumlah tagihan tetap 1 (idempoten). |
| **TC-FINE-05** | Izin disetujui (*excused absence*) | Praktikan ajukan izin -> Asprak klik Setujui (`APPROVED`). | Status tercatat `EXCUSED` (bukan `'Hadir'`), tidak dibuatkan tagihan denda. |
| **TC-FINE-06** | Pembayaran tidak ubah kehadiran | Lunasi tagihan denda sesi terlambat. | Status tagihan menjadi `PAID`, namun status kehadiran tetap `LATE` (tidak berubah menjadi `ON_TIME`). |

---

## E. Integrasi Midtrans Payment Gateway (SRS-06)

| ID Uji | Skenario | Langkah Uji | Hasil yang Diharapkan |
| :--- | :--- | :--- | :--- |
| **TC-PAY-01** | Pembuatan transaksi | Praktikan klik Bayar Denda -> backend panggil Midtrans Sandbox Snap. | `orderId`, `snapToken`, `redirectUrl` diterima; `paymentTransactions/{orderId}` berstatus `pending`. |
| **TC-PAY-02** | Pembayaran `pending` | Praktikan buka Snap lalu keluar sebelum bayar. | Status tetap `pending` hingga konfirmasi/kedaluwarsa. |
| **TC-PAY-03** | Pembayaran `success` via webhook | Selesaikan pembayaran di Simulator Midtrans Sandbox -> webhook `settlement` masuk. | Signature valid -> `paymentTransactions` menjadi `success` dan `fineInvoices` menjadi `PAID`. |
| **TC-PAY-04** | Pembayaran `failed` via webhook | Simulasikan `expire` / `deny` di Midtrans Sandbox -> webhook masuk. | Status menjadi `failed` / `FAILED`. |
| **TC-PAY-05** | Webhook signature tidak valid | Kirim POST ke `/api/payments/midtrans-webhook` dengan `signature_key` palsu. | Backend menolak (`403 Forbidden`), status di Firestore tidak berubah. |
| **TC-PAY-06** | Webhook berulang (idempotency) | Kirim payload webhook `settlement` yang sama 2 kali berturut-turut. | Request kedua mengembalikan `200 OK` tanpa mutasi atau notifikasi ganda. |
| **TC-PAY-07** | Persistensi riwayat setelah restart | Tutup paksa aplikasi praktikan -> buka kembali halaman Riwayat Pembayaran. | Seluruh tagihan & riwayat transaksi tetap tampil sesuai data Firestore. |

---

## F. Notifikasi Pembayaran (SRS-07)

| ID Uji | Skenario | Langkah Uji | Hasil yang Diharapkan |
| :--- | :--- | :--- | :--- |
| **TC-NOTIF-01** | Tagihan baru | Tagihan `fineInvoices` dibuat karena keterlambatan. | Praktikan menerima 1 push notification `FINE_CREATED`; tap mengarah ke `/student/payments`. |
| **TC-NOTIF-02** | Pembayaran berhasil | Webhook `settlement` diproses backend. | Praktikan menerima 1 push notification `PAYMENT_SUCCESS`. |
| **TC-NOTIF-03** | Pembayaran gagal | Webhook `expire`/`deny` diproses backend. | Praktikan menerima 1 push notification `PAYMENT_FAILED`. |
| **TC-NOTIF-04** | Kegagalan kirim notifikasi | Token push device tidak valid / offline. | Status `PAID` pada transaksi & tagihan di Firestore **tidak** ter-rollback. |
| **TC-NOTIF-05** | Tidak ada notifikasi ganda | Webhook dikirim ulang untuk transaksi yang sudah `success`. | `notificationDispatches` mencegah pengiriman notifikasi kedua. |

# 📱 LabSync - Aplikasi Manajemen Presensi Praktikum
> **Sprint 1: Antarmuka dan Alur Praktikum (2 Sudut Pandang: Asisten & Praktikan)**

LabSync adalah aplikasi mobile (*cross-platform* React Native / Expo) yang dirancang untuk memudahkan manajemen kehadiran dan absensi praktikum laboratorium. Aplikasi ini memungkinkan kolaborasi mulus antara **Asisten Praktikum (Asprak)** dan **Praktikan (Mahasiswa)** dengan antarmuka yang modern, responsif, dan berbasis *Flexbox*.

---

## 🎯 Fokus & Kebutuhan Sprint 1

Pada sprint ini, fokus utama adalah membangun antarmuka dan interaksi yang dapat mendemonstrasikan alur lengkap presensi praktikum tanpa ketergantungan database eksternal (*in-memory state management*):

1. **Jadwal dan Detail Sesi**:
   - Menampilkan daftar jadwal praktikum lengkap dengan nama mata kuliah, kelas, ruangan, waktu, asisten penanggung jawab, dan status sesi.
2. **Pengelolaan Sesi (Sudut Pandang Asisten)**:
   - Asisten dapat **Membuka Sesi** ketika praktikum dimulai.
   - Asisten dapat memantau kehadiran mahasiswa secara *live*.
   - Asisten dapat **Menutup Sesi** saat praktikum selesai.
3. **Pencatatan Presensi (Sudut Pandang Praktikan)**:
   - Praktikan hanya dapat melakukan presensi saat status sesi **Aktif / Dibuka**.
   - Sistem mencatat waktu kehadiran secara otomatis dan memberikan umpan balik (feedback) sukses.
   - **Validasi Anti-Duplikasi**: Praktikan yang sama **tidak dapat melakukan presensi 2 kali** pada sesi yang sama.
4. **Rekap Sederhana**:
   - **Asisten**: Dapat melihat modal/bottom sheet daftar mahasiswa yang sudah presensi beserta jam kehadiran dan catatan meja.
   - **Praktikan**: Dapat melihat riwayat sesi praktikum yang telah dihadirinya sendiri.
5. **Interaktivitas & UX**:
   - Menggunakan Form input, Bottom Sheet/Modal konfirmasi, serta banner notifikasi toast.
   - Penanganan berbagai kondisi: *empty state* (daftar kosong), sesi belum dibuka, sesi aktif, dan sesi ditutup.
   - Tersedia tombol **Role Switcher** & **User Selector** di *header* untuk mempermudah demonstrasi.

---

## 🏗️ Struktur Arsitektur Proyek

```text
LabSync/
├── App.js                      # Root application entry point & layout
├── app.json                    # Konfigurasi Expo & metadata aplikasi
├── package.json                # Dependensi proyek
├── src/
│   ├── components/             # Reusable UI components
│   │   ├── AttendanceModal.js         # Modal/Bottom Sheet formulir presensi praktikan
│   │   ├── AttendanceSummaryModal.js  # Modal rekapitulasi kehadiran untuk asisten
│   │   ├── EmptyState.js              # Tampilan saat data kosong / belum ada aksi
│   │   ├── Header.js                  # App bar, Role Switcher & Persona Selector
│   │   ├── SessionControlModal.js     # Modal konfirmasi buka & tutup sesi
│   │   └── StatCard.js                # Kartu indikator metrik/statistik
│   ├── context/
│   │   └── AppContext.js       # Centralized state management (Role, Sessions, Attendance)
│   ├── data/
│   │   └── mockData.js         # Dummy data (Mahasiswa, Asisten, Sesi, Riwayat)
│   ├── screens/
│   │   ├── AssistantView.js    # Dashboard sudut pandang Asisten Praktikum
│   │   └── StudentView.js      # Dashboard sudut pandang Praktikan (Mahasiswa)
│   └── styles/
│       └── theme.js            # Design tokens (Palette, Spacing, Radius, Shadow)
```

---

## 🚀 Cara Menjalankan Aplikasi

Aplikasi dapat dijalankan di perangkat mobile (Android/iOS) melalui **Expo Go**, maupun langsung di **Web Browser** di laptop/komputer.

### 1. Instalasi Dependensi (jika baru di-clone)
```bash
npm install
```

### 2. Menjalankan di Web Browser (Rekomendasi untuk Demo di Laptop)
```bash
npm run web
# atau
npx expo start --web
```
Buka browser di alamat `http://localhost:8081`. Tampilan sudah diatur agar otomatis responsif dan memiliki tata letak mobile yang rapi.

### 3. Menjalankan di Smartphone (Expo Go)
```bash
npm start
# atau
npx expo start
```
- Buka aplikasi **Expo Go** di Android (Scan QR code dari terminal).
- Untuk iOS, scan menggunakan aplikasi Kamera bawaan.

---

## 🎬 Skenario Demonstrasi Sprint 1

Gunakan langkah-langkah berikut saat mendemonstrasikan aplikasi kepada dosen/penguji:

### Tahap 1: Asisten Membuka Sesi Praktikum
1. Pastikan tab di header berada pada **"🛡️ Sudut Pandang Asisten"**.
2. Perhatikan sesi **"Pemrograman Perangkat Bergerak (IF-45-02)"** yang berstatus `⏳ Belum Dibuka`.
3. Klik tombol **"🚀 Buka Sesi Praktikum"**.
4. Muncul modal konfirmasi; klik **"✓ Ya, Buka Sesi"**.
5. Status sesi berubah menjadi `🟢 Sesi Aktif` dengan penanda waktu dibuka.

### Tahap 2: Praktikan Melakukan Presensi
1. Beralih ke **"🎓 Sudut Pandang Praktikan"** melalui tombol di header.
2. Identitas aktif secara *default* adalah **Fath Aron (1301210045)**.
3. Sesi "Pemrograman Perangkat Bergerak" kini memiliki tombol aktif **"📝 Lakukan Presensi Sekarang"**.
4. Klik tombol tersebut untuk membuka Bottom Sheet presensi.
5. Klik **"✓ Simpan Presensi"**.
6. Muncul toast notifikasi sukses dan kartu sesi berubah menjadi warna hijau bertuliskan **"✓ Sudah Presensi"** beserta catatan jam kehadiran.

### Tahap 3: Uji Coba Pencegahan Presensi Ganda
1. Pada sesi yang sama, coba perhatikan tombol aksi. Tombol telah digantikan oleh kotak konfirmasi dan terkunci.
2. Praktikan tidak dapat mengirimkan presensi kedua kalinya.

### Tahap 4: Praktikan Melihat Riwayat Pribadi
1. Pada sudut pandang praktikan, klik tab **"📋 Riwayat Presensi"**.
2. Terlihat riwayat presensi yang baru saja dicatat beserta sesi yang pernah diikuti sebelumnya.

### Tahap 5: Asisten Memantau Rekap Kehadiran
1. Beralih kembali ke **"🛡️ Sudut Pandang Asisten"**.
2. Pada sesi "Pemrograman Perangkat Bergerak", klik tombol **"📊 Rekap Presensi"**.
3. Terlihat nama praktikan (Fath Aron) telah masuk ke daftar hadir secara *real-time* lengkap dengan waktu hadir dan posisi mejanya.

### Tahap 6: Asisten Menutup Sesi Praktikum
1. Klik tombol **"🛑 Tutup Sesi"**.
2. Muncul modal konfirmasi penutupan sesi; klik **"✕ Ya, Tutup Sesi"**.
3. Status sesi berubah menjadi `🔒 Sesi Ditutup`.
4. Jika beralih kembali ke Praktikan, sesi tersebut sudah terkunci dan tidak dapat menerima presensi lagi.

> 💡 **Tip Presentasi**: Gunakan tombol **"🔄 Reset Demo"** di pojok kanan atas kapan saja untuk mengembalikan seluruh data ke kondisi awal saat ingin mengulang presentasi.

---

## ✅ Checklist Kebutuhan Sprint 1

| Kebutuhan / Fitur | Status | Keterangan |
| :--- | :---: | :--- |
| **Jadwal & Detail Sesi** | ✅ Selesai | Mata kuliah, modul, kelas, ruangan, waktu, status sesi |
| **Buka Sesi (Asisten)** | ✅ Selesai | Mengubah status dari `PENDING` ke `ACTIVE`, catat jam buka |
| **Tutup Sesi (Asisten)** | ✅ Selesai | Mengubah status ke `CLOSED`, mengunci presensi baru |
| **Presensi Mandiri (Praktikan)** | ✅ Selesai | Form input, feedback toast, pencatatan waktu otomatis |
| **Validasi Anti-Duplikasi** | ✅ Selesai | Praktikan tidak bisa absen 2x pada sesi yang sama |
| **Rekap Asisten** | ✅ Selesai | Modal rekap mahasiswa hadir, total kehadiran, persentase |
| **Catatan Kehadiran Praktikan** | ✅ Selesai | Tab riwayat kehadiran pribadi mahasiswa |
| **Interaksi Modal & Sheet** | ✅ Selesai | Modal buka/tutup sesi, form presensi, modal rekap |
| **Empty State & Variasi Status**| ✅ Selesai | Tampilan khusus saat daftar kosong, sesi pending, sesi closed |
| **Tata Letak Flexbox & Responsif** | ✅ Selesai | Menggunakan flexbox murni, rapi di HP & Web |
| **Peralihan Peran Mudah** | ✅ Selesai | Switcher Asisten vs Praktikan + Persona Selector di header |

---

## 👥 Tim Pengembang
- **Role**: Project Manager & Pengembang
- **Mata Kuliah**: Pemrograman Perangkat Bergerak / Komputer (PPK)

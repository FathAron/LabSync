# 📱 LabSync - Repository Proyek (Sprint 1)
> **Sistem Manajemen Presensi Praktikum Laboratorium**  
> **Role:** Project Manager  
> **Target Pengembang:** Tim Programmer  

Selamat datang di repositori **LabSync**. Repositori ini telah disiapkan oleh Project Manager untuk pengerjaan **Sprint 1: Antarmuka dan Alur Praktikum (2 Sudut Pandang: Asisten & Praktikan)**.

---

## 🎯 Target Utama Sprint 1

Pada sprint ini, tim pengembang ditugaskan untuk membangun antarmuka dan interaksi aplikasi yang dapat **mendemonstrasikan alur lengkap presensi praktikum**:
1. **Asisten** membuka sesi praktikum.
2. **Praktikan** melihat jadwal & melakukan presensi mandiri saat sesi dibuka.
3. **Sistem** mencegah presensi ganda (mahasiswa yang sama tidak dapat presensi 2x pada sesi yang sama).
4. **Asisten** memantau rekap kehadiran mahasiswa secara *real-time*.
5. **Asisten** menutup sesi praktikum setelah selesai.
6. **Praktikan** dapat melihat riwayat kehadiran pribadinya.

> ⚠️ **Catatan Penting**: Karena belum ada database eksternal, data dikelola menggunakan *local state* selama aplikasi berjalan (*in-memory*). Data tidak perlu tersinkronisasi lintas jaringan; pergantian peran dilakukan melalui tombol **Role Switcher** di antarmuka.

---

## 📚 Dokumen Spesifikasi Kebutuhan & Tugas (Wajib Dibaca)

Seluruh programmer diharapkan membaca dokumen acuan berikut sebelum menulis kode:

1. 📄 **[Software Requirements Specification (SRS) Sprint 1](file:///d:/PPK/LabSync/docs/SRS_SPRINT_1.md)**
   - Berisi spesifikasi kebutuhan fungsional (SRS-F01 s/d SRS-F07), non-fungsional, user stories, dan acceptance criteria.
2. 📋 **[Pembagian Tugas Programmer (Task Breakdown)](file:///d:/PPK/LabSync/docs/TASK_BREAKDOWN_DEVELOPER.md)**
   - Berisi pembagian tiket kerja (TASK-01 s/d TASK-05) beserta deskripsi tugas dan Definition of Done (DoD).

---

## 🛠️ Tech Stack & Konfigurasi

- **Framework**: React Native (Expo SDK 58)
- **Multiplatform**: Mobile (Android/iOS via Expo Go) & Web Preview (`react-native-web`)
- **Tata Letak**: Murni menggunakan **Flexbox** dan StyleSheet bawaan React Native
- **State Management**: React Context API / useState / Zustand (bebas disepakati tim)

---

## 💻 Panduan Menjalankan Repositori bagi Programmer

### 1. Clone & Pasang Dependensi
```bash
git clone https://github.com/FathAron/LabSync.git
cd LabSync
npm install
```

### 2. Menjalankan di Web Browser (Cepat & Ringan)
```bash
npm run web
# atau
npx expo start --web
```
Buka `http://localhost:8081` di browser.

### 3. Menjalankan di Smartphone (Expo Go)
```bash
npm start
# atau
npx expo start
```
Scan QR code menggunakan aplikasi **Expo Go** di Android atau kamera di iOS.

### 4. Diagnosa & Validasi Dependensi
Sebelum melakukan *commit*, jalankan perintah ini untuk memastikan tidak ada konflik pustaka:
```bash
npx expo-doctor
```

---

## 🌿 Aturan Git Branching Tim Programmer

Agar pengerjaan tidak saling bentrok (*merge conflict*), setiap programmer bekerja di cabang (*branch*) masing-masing:

- **ARON SORIMUDA JOHANES PASARIBU**:
  - `feat/aron-state-mock` : Pengerjaan TASK-01 (Mock data & Central Context Store)
  - `feat/aron-app-shell` : Pengerjaan TASK-02 (Header, Role Switcher & Persona Selector)
- **ADELIA CLEARESTA**:
  - `feat/adelia-student-module` : Pengerjaan TASK-04 (Jadwal Praktikan, Modal Presensi & Riwayat Kehadiran)
- **WIPIN SAPUTRA POH**:
  - `feat/wipin-assistant-module` : Pengerjaan TASK-03 (Sesi Asisten, Buka/Tutup Sesi & Rekapitulasi)
  - `feat/wipin-ui-components` : Pengerjaan TASK-05 (Modal, Empty State & Polish Flexbox)

Semua pull request wajib dicek terhadap checklist pada [TASK_BREAKDOWN_DEVELOPER.md](file:///d:/PPK/LabSync/docs/TASK_BREAKDOWN_DEVELOPER.md).

---

## 👥 Tim Proyek
- **Project Manager**: Naufal Dwi Yusmawan
- **Tim Programmer**:
  1. **ADELIA CLEARESTA** (PIC: Modul Praktikan & Presensi)
  2. **ARON SORIMUDA JOHANES PASARIBU** (PIC: State Architecture & Shell Navigasi)
  3. **WIPIN SAPUTRA POH** (PIC: Modul Asisten & Rekapitulasi)
- **Mata Kuliah**: Pemrograman Perangkat Bergerak / Komputer (PPK)

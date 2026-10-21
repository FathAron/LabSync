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

## 🌿 Aturan Git Branching untuk Rekan Programmer

Agar pengerjaan tidak saling bentrok (*merge conflict*), gunakan konvensi nama cabang (*branch*) berikut:

- `feat/task-01-mock-state` : Pengerjaan Task 1 (Mock data & State Store)
- `feat/task-02-app-shell` : Pengerjaan Task 2 (Header & Role Switcher)
- `feat/task-03-assistant-module` : Pengerjaan Task 3 (Modul & Rekap Asisten)
- `feat/task-04-student-module` : Pengerjaan Task 4 (Modul Presensi Praktikan)
- `feat/task-05-ui-polish` : Pengerjaan Task 5 (Modal, Toast & Responsive Polish)

Semua pull request atau commit wajib dicek terhadap checklist pada [TASK_BREAKDOWN_DEVELOPER.md](file:///d:/PPK/LabSync/docs/TASK_BREAKDOWN_DEVELOPER.md).

---

## 👥 Tim Proyek
- **Project Manager**: Fath Aron
- **Tim Pengembang**: Rekan-rekan Programmer (PPK)

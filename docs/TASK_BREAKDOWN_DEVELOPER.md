# 📋 Task Breakdown & Work Package (Sprint 1)
### Proyek: LabSync - Aplikasi Manajemen Presensi Praktikum
**Role:** Project Manager  
**Target:** Tim Programmer / Developer  

Dokumen ini membagi spesifikasi kebutuhan Sprint 1 menjadi tiket kerja (*actionable work packages*) yang siap diambil dan dikerjakan oleh masing-masing rekan programmer.

---

## 📌 Rangkuman Pembagian Tugas

```
                                  [ PROJECT MANAGER ]
                                           │
         ┌──────────────────┬──────────────┴─────┬──────────────────┐
         ▼                  ▼                    ▼                  ▼
    [ TASK 01 ]        [ TASK 02 ]          [ TASK 03 ]        [ TASK 04 ]
  State & Mock Data   App Shell & Nav     Modul Asisten      Modul Praktikan
   (Context / Store)   (Role Switcher)     (Lifecycle Sesi)  (Presensi & Riwayat)
         │                  │                    │                  │
         └──────────────────┼────────────────────┴──────────────────┘
                            ▼
                       [ TASK 05 ]
                 Common UI, Modal & Polish
```

---

## 🎫 Tiket Rinci Pekerjaan Programmer

### 🔹 TASK-01: State Management & Mock Data Setup
- **Kategori**: Core / State Architecture
- **Referensi SRS**: SRS-F01, SRS-F02, SRS-F03, SRS-F04
- **Deskripsi Tugas**:
  1. Siapkan file mock data berisi minimal:
     - 2 data Asisten (Nama, ID, Role).
     - 5 data Praktikan (Nama, NIM, Kelas).
     - 3 data Sesi praktikum dengan berbagai variasi status awal (`PENDING`, `ACTIVE`, `CLOSED`).
     - Data awal catatan presensi (*attendance records*).
  2. Bangun central state management (bisa menggunakan React Context API):
     - State `currentRole`: `'assistant'` | `'student'`.
     - State `currentAssistant` & `currentStudent`.
     - State `sessions` (daftar sesi praktikum).
     - State `attendanceList` (daftar presensi yang telah masuk).
  3. Buat fungsi mutasi state:
     - `openSession(sessionId)`: mengubah status ke `ACTIVE` dan mencatat `openedAt`.
     - `closeSession(sessionId)`: mengubah status ke `CLOSED` dan mencatat `closedAt`.
     - `recordAttendance(sessionId, student, notes)`: validasi status sesi, validasi apakah sudah presensi, catat waktu hadir `timestamp`, dan tambahkan ke `attendanceList`.
     - `hasStudentAttended(sessionId, studentId)`: fungsi pengecekan apakah praktikan tertentu sudah absen di sesi tersebut.
- **Kriteria Selesai (DoD)**:
  - Seluruh komponen UI dapat mengakses dan memodifikasi data melalui Context / Hook terpusat.
  - Data bersifat reaktif sehingga perubahan di satu komponen langsung mengubah tampilan komponen lain.

---

### 🔹 TASK-02: App Shell, Navigation & Role Switcher
- **Kategori**: UI / Navigation
- **Referensi SRS**: SRS-F07, SRS-NF01
- **Deskripsi Tugas**:
  1. Bangun komponen `Header` yang berisi:
     - Logo dan identitas aplikasi (LabSync - Sprint 1).
     - Segmented Switcher untuk beralih antara **Sudut Pandang Asisten** dan **Sudut Pandang Praktikan**.
     - Indikator identitas pengguna aktif (*Current Persona*) dengan tombol pemilih akun (*Account Picker Modal*).
  2. Implementasikan peralihan tampilan utama:
     - Jika peran aktif adalah `assistant`, render tampilan layar Asisten.
     - Jika peran aktif adalah `student`, render tampilan layar Praktikan.
  3. Tombol darurat/bantuan "Reset Demo Data" untuk mengembalikan state ke data awal.
- **Kriteria Selesai (DoD)**:
  - Perpindahan antara Asisten dan Praktikan terjadi secara instan tanpa lag atau error.
  - Pengguna dapat mengganti akun mahasiswa/asisten aktif untuk mensimulasikan skenario demo.

---

### 🔹 TASK-03: Modul Antarmuka Asisten Praktikum
- **Kategori**: Feature / Assistant Flow
- **Referensi SRS**: SRS-F01, SRS-F02, SRS-F05
- **Deskripsi Tugas**:
  1. Buat layar `AssistantView`:
     - Tampilkan ringkasan metrik statistik (*StatCard*): Total Sesi Aktif, Mahasiswa Hadir, Sesi Ditutup.
     - Render daftar kartu sesi praktikum (`SessionCard`).
  2. Pada setiap kartu sesi:
     - Tampilkan nama praktikum, kode modul, kelas, jam, ruangan, dan badge status (`Belum Dibuka`, `Sesi Aktif`, `Sesi Ditutup`).
     - Tampilkan progress bar kehadiran (*X dari Y Mahasiswa Hadir*).
     - Tombol aksi kontekstual:
       - Status `PENDING` ➡️ Tombol **"Buka Sesi Praktikum"**.
       - Status `ACTIVE` ➡️ Tombol **"Rekap Presensi"** dan tombol **"Tutup Sesi"**.
       - Status `CLOSED` ➡️ Tombol **"Lihat Rekap Akhir"**.
  3. Integrasikan dialog konfirmasi (**Modal / Bottom Sheet**) untuk aksi Buka Sesi dan Tutup Sesi.
  4. Bangun modal/layar **Rekap Presensi**:
     - Menampilkan daftar nama praktikan yang hadir, NIM, waktu presensi, dan catatan meja.
     - Menampilkan *Empty State* jika belum ada praktikan yang presensi pada sesi tersebut.
- **Kriteria Selesai (DoD)**:
  - Asisten berhasil membuka sesi, status berubah seketika menjadi aktif.
  - Asisten dapat memantau presensi praktikan dan menutup sesi dengan aman.

---

### 🔹 TASK-04: Modul Antarmuka Praktikan (Mahasiswa)
- **Kategori**: Feature / Student Flow
- **Referensi SRS**: SRS-F01, SRS-F03, SRS-F04, SRS-F06
- **Deskripsi Tugas**:
  1. Buat layar `StudentView`:
     - Tampilkan profil singkat mahasiswa yang sedang login (Nama, NIM, Kelas).
     - Buat 2 tab navigasi: **"Sesi Praktikum"** dan **"Riwayat Presensi"**.
  2. Pada Tab "Sesi Praktikum":
     - Render daftar kartu sesi praktikum untuk kelas mahasiswa tersebut.
     - Logika kondisi tombol presensi:
       - Sesi `PENDING`: Tampilkan keterangan *"Menunggu asisten membuka sesi"* (tombol tidak aktif).
       - Sesi `ACTIVE` & Mahasiswa belum absen: Tombol **"Lakukan Presensi Sekarang"** aktif dan mencolok.
       - Sesi `ACTIVE` & Mahasiswa sudah absen: Tampilkan status hijau *"Sudah Presensi"* beserta waktu hadirnya (tombol terkunci).
       - Sesi `CLOSED`: Tampilkan status *"Sesi praktikum telah ditutup"*.
  3. Bangun **Formulir Presensi (Modal / Bottom Sheet)**:
     - Tampilkan identitas mahasiswa & detail sesi.
     - Field input opsional posisi meja lab.
     - Tombol simpan presensi yang memicu fungsi `recordAttendance`.
     - Validasi anti-duplikasi: pastikan mahasiswa tidak dapat presensi 2x.
  4. Pada Tab "Riwayat Presensi":
     - Tampilkan daftar riwayat sesi yang telah dihadiri oleh mahasiswa tersebut beserta jam hadirnya.
     - Tampilkan *Empty State* jika belum ada riwayat kehadiran.
- **Kriteria Selesai (DoD)**:
  - Mahasiswa dapat melakukan presensi hanya saat sesi dibuka.
  - Mahasiswa tidak bisa presensi 2 kali pada sesi yang sama.
  - Riwayat presensi pribadi langsung terupdate setelah mahasiswa mengisi presensi.

---

### 🔹 TASK-05: Komponen Pendukung, Feedback UI & Polish Responsivitas
- **Kategori**: UI / UX Components & QA
- **Referensi SRS**: SRS-NF01, SRS-NF02, SRS-NF03
- **Deskripsi Tugas**:
  1. Siapkan design tokens / theme (`colors`, `spacing`, `borderRadius`, `shadows`).
  2. Buat komponen reusable:
     - `EmptyState`: untuk visual data kosong yang informatif dan ramah.
     - `FeedbackToast`: banner notifikasi melayang untuk umpan balik sukses/gagal.
     - `Modal / Bottom Sheet` wrapper yang responsif dan konsisten.
  3. Validasi Flexbox & Responsivitas:
     - Pastikan tampilan rapi di perangkat mobile (Android/iOS) dan tidak melar berantakan saat dibuka di layar Web browser.
     - Pastikan tidak ada teks yang terpotong atau tumpang tindih.
- **Kriteria Selesai (DoD)**:
  - Seluruh alur dari awal hingga akhir (Asisten Buka ➡️ Praktikan Absen ➡️ Rekap ➡️ Asisten Tutup) dapat didemokan dengan lancar tanpa error atau bug tampilan.

---

## 📋 Checklist Definition of Done (DoD) Sprint 1

Sebelum kode digabung (*merge*) ke branch utama, pastikan:
- [ ] Fitur berjalan sesuai Acceptance Criteria pada dokumen `docs/SRS_SPRINT_1.md`.
- [ ] Tidak ada error saat dijalankan dengan `npx expo start` maupun `npm run web`.
- [ ] Tidak ada dependensi yang *conflict* (`npx expo-doctor` lolos).
- [ ] Validasi anti-duplikasi presensi berjalan 100% akurat.
- [ ] Seluruh tampilan menggunakan Flexbox dan responsif.

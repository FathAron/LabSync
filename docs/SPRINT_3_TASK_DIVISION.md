# Sprint 3 — Pembagian Tugas & Alur Integrasi

Dokumen ini menjadi acuan pembagian pekerjaan Sprint 3 LabSync kepada **3 Programmer dan 1 Project Manager (PM)**. Penomoran kebutuhan Sprint 3 dimulai kembali dari **SRS-01 sampai SRS-07** dan tidak melanjutkan penomoran Sprint 2.

Prinsip pengerjaan:
- **Satu PIC Utama per SRS:** setiap SRS hanya memiliki satu penanggung jawab utama.
- **Clear Module Ownership:** setiap programmer memiliki modul utama dan batas file yang disepakati.
- **No Breaking Changes:** fitur Sprint 2 tetap berjalan setelah integrasi Sprint 3.
- **Koordinasi Sebelum Mengubah File Bersama:** perubahan model, konfigurasi, navigasi, dan Security Rules harus mengikuti kontrak di [SPRINT_3_MODELS_AND_INTEGRATION.md](./SPRINT_3_MODELS_AND_INTEGRATION.md).
- **Push → Pull Request → Review → Merge:** perubahan digabungkan ke `main` setelah pemeriksaan dan review PM.

Dokumen pendukung:
- [Kontrak Model & Integrasi Sprint 3](./SPRINT_3_MODELS_AND_INTEGRATION.md)
- [Aturan & Batas Pengerjaan Sprint 3](./SPRINT_3_RULES_AND_BOUNDARIES.md)
- [Dokumen Pembagian Sprint 2](./SPRINT_2_TASK_DIVISION.md) sebagai acuan fitur yang sudah ada.

---

## 1. Rangkuman Pembagian SRS

| ID SRS | Nama Kebutuhan | Ringkasan User Story | PIC Utama |
| :--- | :--- | :--- | :--- |
| **SRS-01** | Halaman Presensi | Sebagai praktikan, saya ingin melakukan presensi melalui halaman khusus yang menampilkan informasi dan status sesi. | **Naufal Dwi Yusmawan** |
| **SRS-02** | Validasi Lokasi Presensi | Sebagai praktikan, saya ingin lokasi saya diperiksa sebelum presensi dicatat agar presensi hanya berhasil saat sesi dibuka dan saya berada dalam radius laboratorium. | **Naufal Dwi Yusmawan** |
| **SRS-03** | Pengelolaan Lokasi Laboratorium | Sebagai asisten, saya ingin mengatur lokasi dan radius laboratorium agar dapat digunakan sebagai acuan presensi. | **Aron Sorimuda Johanes Pasaribu** |
| **SRS-04** | Peta Laboratorium Interaktif | Sebagai pengguna, saya ingin melihat lokasi laboratorium dan posisi saya pada peta agar mudah mengetahui persebaran laboratorium Informatika. | **Aron Sorimuda Johanes Pasaribu** |
| **SRS-05** | Informasi Aktivitas Laboratorium | Sebagai pengguna, saya ingin melihat praktikum yang sedang berlangsung dan praktikum berikutnya pada setiap laboratorium. | **Aron Sorimuda Johanes Pasaribu** |
| **SRS-06** | Push Notification | Sebagai pengguna, saya ingin menerima notifikasi ketika sesi dibuka, jadwal berubah, atau pengajuan izin diputuskan. | **Adelia Clearesta** |
| **SRS-07** | Penanganan Izin dan Kondisi Perangkat | Sebagai pengguna, saya ingin aplikasi menangani izin lokasi/notifikasi serta memberi informasi ketika lokasi, koneksi, atau notifikasi mengalami kendala. | **Adelia Clearesta** |

### Pembagian berdasarkan anggota

| Anggota | Peran | SRS | Fokus |
| :--- | :--- | :--- | :--- |
| **Naufal Dwi Yusmawan** | Programmer | SRS-01, SRS-02 | Halaman Presensi dan validasi lokasi presensi. |
| **Aron Sorimuda Johanes Pasaribu** | Programmer | SRS-03, SRS-04, SRS-05 | Data laboratorium, Maps, dan informasi aktivitas laboratorium. |
| **Adelia Clearesta** | Programmer | SRS-06, SRS-07 | Push notification, izin akses, dan penanganan kondisi perangkat. |
| **Wipin Saputra Poh** | **Project Manager** | Tidak mengambil SRS implementasi | Perencanaan, monitoring, koordinasi, review, integrasi, dan pengujian penerimaan. |

> **Catatan SRS-07:** PIC utamanya hanya Adelia. Naufal dan Aron tetap perlu menghubungkan fitur lokasi/Maps mereka ke mekanisme izin dan penanganan kondisi perangkat yang disepakati, tetapi keduanya tidak menjadi PIC SRS-07.

---

## 2. Naufal Dwi Yusmawan — SRS-01 & SRS-02

**Fokus:** Halaman Presensi dan Presensi Berbasis Lokasi
**Branch:** `feat/sprint3-naufal-location-attendance`

### Checklist Pekerjaan

1. **Persiapan dan Audit Fitur Sprint 2**
   - Periksa alur presensi yang saat ini ada pada `app/student/index.tsx`, `AttendanceModal`, `useStudentModule`, `usePracticum`, dan `practicumService`.
   - Pertahankan pengecekan status sesi, kesesuaian kelas, dan pencegahan presensi ganda yang sudah ada.
   - Koordinasikan kebutuhan data `laboratoryId` dan data laboratorium dengan Aron.
   - Gunakan service izin/lokasi sesuai kontrak bersama Adel; jangan membuat mekanisme permintaan izin yang berbeda-beda.

2. **SRS-01 — Halaman Presensi**
   - Buat halaman Presensi khusus yang terpisah dari halaman detail sesi.
   - Tampilkan informasi sesi yang akan diikuti, kelas, waktu, laboratorium, dan status sesi sesuai data yang tersedia.
   - Sediakan tombol untuk melakukan presensi.
   - Tampilkan status proses, hasil pemeriksaan, dan pesan ketika sesi belum dibuka atau sudah ditutup.
   - Hubungkan halaman dengan data sesi dan presensi Firestore yang sudah digunakan Sprint 2.

3. **SRS-02 — Validasi Lokasi Presensi**
   - Ambil koordinat perangkat saat praktikan akan melakukan presensi.
   - Ambil koordinat dan `radiusMeters` laboratorium yang terhubung dengan sesi.
   - Hitung jarak perangkat ke titik laboratorium dalam satuan meter.
   - Presensi hanya boleh diproses jika sesi berstatus `ACTIVE` dan jarak berada di dalam radius yang diizinkan.
   - Pastikan validasi lokasi menjadi bagian dari proses pencatatan, bukan hanya pemeriksaan di tampilan.
   - Pertahankan pencegahan presensi ganda dengan ID dokumen `${sessionId}_${uid}` atau mekanisme setara yang aman.
   - Koordinasikan proses pencatatan dengan endpoint/backend tepercaya agar aplikasi tidak dapat melewati validasi hanya dengan mengubah nilai di sisi client.
   - Pastikan hasil presensi tetap muncul pada rekap kehadiran asisten Sprint 2.

### Definition of Done (Naufal)

- Praktikan dapat membuka halaman Presensi yang terpisah dari halaman detail sesi.
- Informasi sesi dan status sesi ditampilkan sesuai data Firestore.
- Presensi hanya berhasil saat sesi `ACTIVE` dan lokasi berada dalam radius laboratorium.
- Presensi di luar radius atau ketika validasi gagal tidak dicatat sebagai kehadiran berhasil.
- Praktikan tidak dapat presensi lebih dari satu kali pada sesi yang sama.
- Rekap kehadiran Sprint 2 tetap berjalan.
- Fitur menampilkan hasil pemeriksaan lokasi dengan jelas.
- `npx tsc --noEmit` dan `npx expo lint` lolos tanpa error.

---

## 3. Aron Sorimuda Johanes Pasaribu — SRS-03, SRS-04 & SRS-05

**Fokus:** Pengelolaan Lokasi Laboratorium, Maps, dan Informasi Aktivitas
**Branch:** `feat/sprint3-aron-laboratory-maps`

### Checklist Pekerjaan

1. **SRS-03 — Pengelolaan Lokasi Laboratorium**
   - Buat model dan service data laboratorium menggunakan Firestore.
   - Simpan minimal nama laboratorium, latitude, longitude, dan radius presensi dalam meter.
   - Buat fitur bagi asisten untuk menambahkan serta mengubah lokasi dan radius laboratorium.
   - Validasi koordinat dan radius sebelum disimpan.
   - Hubungkan sesi dengan laboratorium yang digunakan melalui field `laboratoryId` atau referensi yang disepakati bersama.
   - Siapkan data laboratorium yang dapat digunakan oleh fitur Presensi dan Maps.

2. **SRS-04 — Peta Laboratorium Interaktif**
   - Integrasikan library Maps yang sesuai dengan versi Expo/React Native pada repository.
   - Tampilkan peta lingkungan Informatika.
   - Tampilkan marker untuk setiap laboratorium dari Firestore.
   - Tampilkan marker lokasi pengguna yang mengikuti perubahan lokasi perangkat selama halaman Maps digunakan.
   - Gunakan kontrak service lokasi yang disepakati dengan Naufal dan mekanisme izin dari Adel.
   - Hentikan pemantauan lokasi saat halaman tidak lagi digunakan.
   - Saat marker laboratorium dipilih, tampilkan informasi detail laboratorium.
   - Tangani tampilan ketika data laboratorium kosong atau lokasi pengguna belum tersedia.

3. **SRS-05 — Informasi Aktivitas Laboratorium**
   - Ambil data jadwal dan sesi dari Firestore.
   - Tampilkan praktikum yang sedang berlangsung pada setiap laboratorium.
   - Tampilkan praktikum berikutnya berdasarkan tanggal dan waktu jadwal.
   - Informasi minimal mencakup nama praktikum, kelas, waktu pelaksanaan, dan status sesi.
   - Cocokkan aktivitas dengan `laboratoryId` yang digunakan sesi.
   - Pastikan perubahan jadwal dan status sesi tercermin pada halaman Maps.
   - Tampilkan informasi yang sesuai ketika tidak ada praktikum yang sedang berlangsung atau tidak ada jadwal berikutnya.

### Definition of Done (Aron)

- Asisten dapat mengatur data lokasi dan radius laboratorium.
- Data laboratorium tersimpan dan dibaca dari Firestore.
- Maps menampilkan marker seluruh laboratorium yang tersedia.
- Marker pengguna mengikuti perubahan lokasi selama halaman aktif.
- Pengguna dapat memilih marker dan melihat detail laboratorium.
- Peta menampilkan aktivitas praktikum sekarang dan berikutnya dengan data yang sesuai.
- Perubahan jadwal/status sesi tercermin pada informasi laboratorium.
- `npx tsc --noEmit` dan `npx expo lint` lolos tanpa error.

---

## 4. Adelia Clearesta — SRS-06 & SRS-07

**Fokus:** Push Notification dan Penanganan Izin/Kondisi Perangkat
**Branch:** `feat/sprint3-adelia-push-notification`

### Checklist Pekerjaan

1. **Persiapan Integrasi**
   - Periksa konfigurasi Firebase dan identitas pengguna yang sudah ada pada Sprint 2.
   - Pilih mekanisme push notification yang kompatibel dengan Expo SDK dan development build repository.
   - Koordinasikan kebutuhan permission/lokasi dengan Naufal dan Aron agar alur permintaan izin konsisten.
   - Dokumentasikan konfigurasi native dan langkah build ulang jika ada dependency native baru.

2. **SRS-06 — Push Notification**
   - Implementasikan permintaan izin notifikasi dan registrasi token perangkat.
   - Hubungkan token dengan UID pengguna yang sedang login dan dukung pembaruan token.
   - Tangani penerimaan notifikasi saat aplikasi aktif (foreground) dan saat berada di background.
   - Tangani kondisi ketika aplikasi dibuka melalui notifikasi.
   - Arahkan pengguna ke halaman atau informasi yang sesuai ketika notifikasi ditekan.
   - Implementasikan notifikasi untuk peristiwa berikut:
     - Asisten membuka sesi praktikum.
     - Jadwal praktikum mengalami perubahan.
     - Pengajuan izin diterima.
     - Pengajuan izin ditolak.
   - Pastikan penerima notifikasi hanya pengguna yang berkepentingan dengan sesi, jadwal, atau pengajuan izin tersebut.
   - Kirim notifikasi melalui backend tepercaya (misalnya Firebase Cloud Functions atau server yang diamankan). Jangan menyimpan server key atau secret pengiriman pada aplikasi mobile.
   - Hindari pengiriman notifikasi berulang untuk peristiwa yang sama.

3. **SRS-07 — Penanganan Izin dan Kondisi Perangkat**
   - Tangani permintaan dan status izin akses lokasi serta notifikasi.
   - Berikan informasi yang jelas ketika pengguna menolak izin atau izin belum diberikan.
   - Tangani layanan lokasi/GPS yang tidak aktif dan lokasi yang belum tersedia.
   - Tangani gangguan koneksi ketika aplikasi mengambil data lokasi/laboratorium atau mendaftarkan token.
   - Tangani token notifikasi yang gagal diperoleh serta notifikasi yang gagal dikirim atau diterima.
   - Sediakan pesan atau arahan yang mudah dipahami pengguna, termasuk langkah mengaktifkan izin kembali bila diperlukan.
   - Pastikan kegagalan lokasi/notifikasi tidak membuat aplikasi mengklaim presensi berhasil atau membatalkan proses utama lain yang sudah tersimpan.
   - Sediakan kontrak permission/status yang dapat digunakan Naufal dan Aron agar penanganan izin tidak dibuat berulang.

### Definition of Done (Adel)

- Aplikasi dapat meminta dan membaca status izin notifikasi serta lokasi.
- Penolakan izin, GPS nonaktif, lokasi belum tersedia, dan gangguan koneksi ditangani dengan pesan yang jelas.
- Token perangkat terhubung dengan UID pengguna yang benar dan dapat diperbarui.
- Notifikasi dapat diterima saat aplikasi aktif dan background.
- Menekan notifikasi membuka informasi yang relevan.
- Notifikasi dikirim untuk pembukaan sesi, perubahan jadwal, serta keputusan izin.
- Notifikasi hanya dikirim kepada pengguna terkait.
- Kegagalan notifikasi tidak membatalkan proses utama aplikasi.
- `npx tsc --noEmit` dan `npx expo lint` lolos tanpa error.

---

## 5. Wipin Saputra Poh — Project Manager

**Peran:** Project Manager Sprint 3
**Tiket implementasi:** Tidak mengambil SRS coding.

### Checklist Pekerjaan PM

1. **Perencanaan Sprint**
   - Menetapkan backlog dan prioritas berdasarkan SRS-01 sampai SRS-07.
   - Menentukan target pengerjaan dan milestone bersama Naufal, Aron, dan Adel.
   - Memastikan setiap SRS memiliki PIC, checklist, dan Definition of Done.

2. **Koordinasi dan Monitoring**
   - Memantau progres dan blocker setiap programmer.
   - Memastikan kontrak data laboratorium, lokasi, presensi, dan notifikasi disepakati sebelum integrasi.
   - Mengatur komunikasi jika ada perubahan file bersama atau kebutuhan dependency baru.
   - Memastikan pengembangan Sprint 3 tidak mengganggu fitur Sprint 2.

3. **Review dan Integrasi**
   - Memeriksa Pull Request berdasarkan SRS dan Definition of Done.
   - Memastikan tidak ada API key, service account, token rahasia, atau kredensial server di dalam commit.
   - Mengatur urutan merge sesuai ketergantungan antarfitur.
   - Memastikan perubahan Security Rules dan backend ikut direview.

4. **Pengujian Penerimaan**
   - Mengkoordinasikan demonstrasi presensi berbasis lokasi.
   - Mengkoordinasikan pengujian Maps dan informasi aktivitas laboratorium.
   - Mengkoordinasikan pengujian notifikasi pada foreground dan background.
   - Memastikan skenario gagal/izin ditolak juga diuji.
   - Melakukan regression test terhadap fitur Sprint 2 sebelum sprint dinyatakan selesai.

### Definition of Done (PM)

- Semua SRS memiliki PIC dan hasil pengujian.
- Perubahan dari seluruh programmer sudah direview dan digabungkan.
- Fitur Sprint 2 tetap berjalan setelah integrasi Sprint 3.
- Tiga alur utama Sprint 3 dapat didemonstrasikan dari awal sampai akhir.
- Temuan pengujian kritis sudah diperbaiki atau dicatat sebagai pekerjaan lanjutan yang disepakati.

---

## 6. Matriks Kepemilikan Modul dan File

Matriks berikut menjadi batas awal agar pengerjaan tidak saling menimpa. File bersama hanya boleh diubah oleh pemilik yang tercantum; anggota lain menyampaikan kebutuhan perubahan melalui koordinasi/PR.

| Area / File | Pemilik | Catatan |
| :--- | :--- | :--- |
| Halaman Presensi baru dan alur masuk dari daftar sesi (`app/student/attendance.tsx`, `app/student/index.tsx`, komponen attendance) | Naufal | Fokus pada halaman dan alur presensi praktikan. |
| Service pencatatan presensi dan validasi lokasi (`practicumService`/service attendance baru, hook terkait) | Naufal | Perubahan hanya pada bagian presensi; pertahankan kompatibilitas rekap Sprint 2. |
| Model `Laboratory`, relasi laboratorium pada `Session`, dan model lokasi-presensi/notifikasi | Aron | Pemilik tunggal `src/types/models.ts`; menerima kebutuhan tipe dari Naufal dan Adel. |
| Service dan UI pengelolaan laboratorium | Aron | Termasuk integrasi tampilan asisten. |
| Halaman Maps dan route/tab Maps (`app/student/maps.tsx`, `app/student/_layout.tsx`, fitur Maps) | Aron | Menggunakan service lokasi dan permission yang disepakati. |
| Informasi aktivitas laboratorium | Aron | Menggunakan data sesi/jadwal dari Firestore. |
| Push notification, token perangkat, handler foreground/background, navigasi notifikasi | Adel | Termasuk backend trigger notifikasi tepercaya. |
| Service permission dan penanganan kondisi perangkat (`permissionService` atau nama yang disepakati) | Adel | Digunakan oleh modul lokasi/Maps dan notifikasi. |
| Dependency native dan konfigurasi Expo (`package.json`, `package-lock.json`, `app.json`) | Adel | Programmer lain mengajukan kebutuhan library; hindari install terpisah. |
| Root notification handler (`app/_layout.tsx`) | Adel | Koordinasikan jika ada kebutuhan perubahan navigasi global. |
| Firestore Security Rules (`firestore.rules`) | Aron | Menampung kebutuhan akses laboratorium, token perangkat, dan presensi dari Naufal/Adel. |
| Perencanaan, review PR, integrasi, dan acceptance test | Wipin (PM) | Tidak mengambil implementasi fitur. |

> Jika saat implementasi struktur file ternyata berbeda, PIC wajib menginformasikan perubahan kepada PM dan anggota terkait sebelum membuat file/struktur baru. Kepemilikan file bersama tidak boleh diubah sepihak.

---

## 7. Alur Pengerjaan dan Merge

1. **Kickoff:** seluruh anggota membaca dokumen Sprint 3 dan menyepakati kontrak pada `SPRINT_3_MODELS_AND_INTEGRATION.md`.
2. **Persiapan dependency dan data:** Adel mengoordinasikan dependency native; Aron menyiapkan model/lokasi laboratorium; Naufal mengunci kebutuhan validasi presensi.
3. **Pengerjaan paralel:** setiap programmer bekerja pada branch masing-masing dan tidak mengubah area programmer lain.
4. **Validasi lokal:** jalankan pemeriksaan TypeScript, lint, dan uji manual fitur masing-masing.
5. **Push dan Pull Request:** programmer push branch ke origin dan membuat PR menuju `main` dengan ringkasan perubahan serta bukti pengujian.
6. **Review PM:** Wipin memeriksa kesesuaian SRS, dampak terhadap Sprint 2, security, dan hasil pengujian.
7. **Merge bertahap:** gabungkan kontrak/model dan backend yang dibutuhkan terlebih dahulu, lalu modul konsumen. Selesaikan conflict melalui koordinasi.
8. **Regression test:** uji kembali login/register, jadwal, sesi, presensi lama/rekap, pengajuan izin, serta keputusan izin.
9. **Acceptance test:** demonstrasikan tiga alur utama Sprint 3 pada bagian berikut.

### Pemeriksaan sebelum Pull Request

```bash
npx tsc --noEmit
npx expo lint
npx expo-doctor
```

`npx expo-doctor` merupakan pemeriksaan tambahan. Perintah utama yang wajib dilaporkan adalah TypeScript dan lint. Jika ada dependency native baru, build ulang development build sesuai konfigurasi Expo repository.

---

## 8. Skenario Pengujian Penerimaan Sprint 3

### A. Presensi Berbasis Lokasi

1. Asisten membuka sesi praktikum yang terhubung dengan laboratorium.
2. Praktikan membuka halaman Presensi.
3. Aplikasi memeriksa izin dan memperoleh koordinat perangkat.
4. Aplikasi mengambil koordinat serta radius laboratorium yang sesuai dengan sesi.
5. Praktikan di dalam radius dan pada sesi aktif dapat melakukan presensi.
6. Praktikan di luar radius tidak dapat mencatat presensi.
7. Presensi tidak berhasil jika sesi belum dibuka/ditutup, lokasi tidak tersedia, atau validasi gagal.
8. Praktikan tidak dapat presensi dua kali pada sesi yang sama.
9. Asisten melihat data presensi yang berhasil pada rekap kehadiran.

### B. Peta dan Informasi Laboratorium

1. Pengguna membuka halaman Maps.
2. Aplikasi menampilkan peta dan marker laboratorium dari Firestore.
3. Aplikasi menampilkan posisi pengguna dan memperbaruinya selama halaman digunakan.
4. Pengguna memilih marker laboratorium.
5. Aplikasi menampilkan informasi laboratorium, praktikum yang sedang berlangsung, dan praktikum berikutnya.
6. Perubahan jadwal atau status sesi tercermin pada informasi laboratorium.

### C. Notifikasi Kegiatan

1. Asisten membuka sesi dan praktikan yang terkait menerima notifikasi.
2. Jadwal praktikum diubah dan praktikan yang terkait menerima notifikasi.
3. Asisten menerima atau menolak pengajuan izin dan praktikan pengaju menerima notifikasi keputusan.
4. Menekan notifikasi membuka informasi yang relevan.
5. Pengujian dilakukan ketika aplikasi aktif dan berada di background.
6. Penolakan izin atau kegagalan token tidak membuat proses utama aplikasi gagal.

---

## 9. Catatan Penting

- SRS Sprint 3 dimulai lagi dari **SRS-01 sampai SRS-07**.
- Setiap SRS hanya memiliki satu PIC utama: SRS-01/02 Naufal, SRS-03/04/05 Aron, dan SRS-06/07 Adel.
- Wipin bertugas sebagai PM dan tidak mengambil tiket implementasi coding.
- Koordinat dan radius laboratorium harus menjadi sumber data yang sama untuk Maps dan validasi presensi.
- Marker lokasi pengguna pada Maps hanya untuk tampilan; proses presensi tetap harus memvalidasi lokasi.
- Validasi radius di sisi aplikasi saja tidak cukup untuk mencegah manipulasi. Pencatatan final harus melalui backend tepercaya atau mekanisme server-side yang memeriksa sesi, laboratorium, jarak, dan duplikasi sebelum menulis ke Firestore.
- Jangan menyimpan server key, service account, atau secret push notification di aplikasi mobile.
- QR Code presensi bersifat opsional dan tidak termasuk target wajib pembagian ini.

# Software Requirements Specification (SRS) — Sprint 3 LabSync

## 1. Pendahuluan

Sprint 3 mengembangkan aplikasi LabSync dari sistem autentikasi, jadwal, sesi, presensi, dan pengajuan izin yang sudah dibuat pada sprint sebelumnya. Fokus pengembangan adalah presensi berdasarkan lokasi perangkat, peta laboratorium, informasi aktivitas laboratorium, dan push notification.

Penomoran kebutuhan pada dokumen ini dimulai kembali dari **SRS-01 sampai SRS-07** dan berdiri sendiri dari penomoran Sprint 2.

## 2. Tujuan Sprint

1. Memastikan presensi praktikan dilakukan ketika sesi dibuka dan perangkat berada dalam radius laboratorium yang ditentukan.
2. Menampilkan lokasi laboratorium dan posisi pengguna pada peta interaktif.
3. Menampilkan informasi praktikum yang sedang berlangsung dan praktikum berikutnya berdasarkan data Firestore.
4. Memberikan pemberitahuan kepada pengguna ketika ada perubahan penting terkait kegiatan praktikum.
5. Menangani izin dan kondisi perangkat agar aplikasi memberi respons yang jelas ketika fitur lokasi atau notifikasi tidak dapat digunakan.

## 3. Aktor

| Aktor | Deskripsi |
| :--- | :--- |
| **Praktikan** | Melihat jadwal, melakukan presensi berbasis lokasi, melihat Maps, dan menerima pemberitahuan. |
| **Asisten** | Mengelola lokasi/radius laboratorium, membuka sesi, mengubah jadwal, dan memutuskan pengajuan izin. |
| **Sistem** | Memeriksa lokasi, menyimpan presensi, memperbarui informasi laboratorium, dan mengirim push notification kepada pengguna terkait. |

## 4. Kebutuhan Fungsional

### SRS-01 — Halaman Presensi

**User Story**
Sebagai praktikan, saya ingin melakukan presensi melalui halaman khusus yang menampilkan informasi dan status sesi agar proses presensi lebih jelas.

**Kriteria Penerimaan**
- Terdapat halaman Presensi yang terpisah dari halaman detail sesi.
- Halaman menampilkan informasi sesi yang akan diikuti, termasuk praktikum/kelas, waktu, laboratorium, dan status sesi sesuai data yang tersedia.
- Praktikan dapat memulai proses presensi dari halaman tersebut.
- Halaman menampilkan status loading, hasil berhasil, atau pesan kegagalan.
- Halaman menggunakan data sesi dan presensi yang tersimpan di Firestore.

### SRS-02 — Validasi Lokasi Presensi

**User Story**
Sebagai praktikan, saya ingin lokasi perangkat diperiksa sebelum presensi dicatat agar presensi hanya berhasil ketika sesi dibuka dan saya berada dalam radius laboratorium.

**Kriteria Penerimaan**
- Aplikasi memperoleh koordinat perangkat ketika praktikan melakukan presensi.
- Sistem mengambil koordinat dan radius laboratorium yang terhubung dengan sesi.
- Sistem menghitung jarak perangkat ke laboratorium dalam meter.
- Presensi hanya dapat dicatat apabila sesi berstatus `ACTIVE` dan perangkat berada dalam radius yang diizinkan.
- Presensi di luar radius, pada sesi yang tidak aktif, atau ketika validasi gagal tidak dicatat sebagai kehadiran berhasil.
- Praktikan hanya dapat melakukan presensi satu kali pada sesi yang sama.
- Hasil pemeriksaan lokasi ditampilkan kepada praktikan.
- Validasi menjadi bagian dari proses pencatatan presensi dan tidak hanya dilakukan pada tampilan aplikasi.

### SRS-03 — Pengelolaan Lokasi Laboratorium

**User Story**
Sebagai asisten, saya ingin mengatur lokasi dan radius laboratorium agar data tersebut dapat digunakan sebagai acuan validasi presensi.

**Kriteria Penerimaan**
- Data setiap laboratorium memiliki nama, latitude, longitude, dan radius dalam meter.
- Asisten dapat menambahkan atau mengubah lokasi dan radius laboratorium.
- Koordinat dan radius divalidasi sebelum disimpan.
- Data laboratorium tersimpan di Cloud Firestore.
- Sesi praktikum dapat dihubungkan dengan laboratorium yang digunakan.
- Data yang sama dapat digunakan oleh fitur Maps dan validasi presensi.

### SRS-04 — Peta Laboratorium Interaktif

**User Story**
Sebagai pengguna, saya ingin melihat lokasi laboratorium dan posisi saya pada peta agar dapat mengetahui persebaran laboratorium Informatika.

**Kriteria Penerimaan**
- Halaman Maps menampilkan peta lingkungan Informatika.
- Setiap laboratorium yang terdaftar ditampilkan sebagai marker.
- Posisi pengguna ditampilkan sebagai marker tersendiri.
- Marker posisi pengguna diperbarui mengikuti perubahan lokasi selama halaman digunakan.
- Pengguna dapat memilih marker laboratorium untuk melihat informasi detailnya.
- Aplikasi menangani kondisi ketika izin lokasi tidak diberikan atau lokasi pengguna belum tersedia.

### SRS-05 — Informasi Aktivitas Laboratorium

**User Story**
Sebagai pengguna, saya ingin melihat praktikum yang sedang berlangsung dan praktikum berikutnya pada setiap laboratorium agar dapat mengetahui aktivitas laboratorium.

**Kriteria Penerimaan**
- Detail laboratorium menampilkan praktikum yang sedang berlangsung jika tersedia.
- Detail laboratorium menampilkan praktikum berikutnya berdasarkan jadwal.
- Informasi mencakup nama praktikum, kelas, waktu pelaksanaan, dan status sesi.
- Informasi diambil dari data jadwal dan sesi pada Firestore.
- Perubahan jadwal atau status sesi tercermin pada informasi laboratorium.
- Jika tidak ada aktivitas atau jadwal berikutnya, aplikasi menampilkan informasi kosong yang sesuai.

### SRS-06 — Push Notification

**User Story**
Sebagai pengguna, saya ingin menerima pemberitahuan ketika ada perubahan penting terkait praktikum agar tidak ketinggalan informasi.

**Kriteria Penerimaan**
- Notifikasi dikirim ketika asisten membuka sesi praktikum.
- Notifikasi dikirim ketika jadwal praktikum berubah.
- Notifikasi dikirim ketika pengajuan izin diterima atau ditolak.
- Penerima notifikasi ditentukan berdasarkan hubungan pengguna dengan sesi, jadwal, atau pengajuan izin.
- Notifikasi dapat ditangani ketika aplikasi aktif maupun berada di background.
- Ketika notifikasi ditekan, aplikasi membuka halaman atau informasi yang berkaitan.
- Kegagalan notifikasi tidak membatalkan proses utama yang sudah berhasil disimpan.

### SRS-07 — Penanganan Izin dan Kondisi Perangkat

**User Story**
Sebagai pengguna, saya ingin aplikasi menangani izin akses lokasi dan notifikasi serta memberi informasi ketika terjadi kendala agar saya mengetahui penyebab fitur tidak dapat digunakan.

**Kriteria Penerimaan**
- Aplikasi meminta izin akses lokasi dan notifikasi sesuai kebutuhan.
- Aplikasi menangani kondisi ketika pengguna menolak atau belum memberikan izin.
- Aplikasi memberi informasi ketika layanan lokasi/GPS tidak aktif.
- Aplikasi memberi informasi ketika lokasi belum tersedia, gagal diperoleh, atau mengalami timeout.
- Aplikasi menangani gangguan koneksi saat mengambil data lokasi/laboratorium atau mengelola token notifikasi.
- Aplikasi menangani kondisi token atau notifikasi gagal diperoleh/dikirim/diterima.
- Pesan yang ditampilkan mudah dipahami dan tidak menyatakan operasi berhasil ketika proses sebenarnya gagal.

## 5. Kebutuhan Nonfungsional

1. **Konsistensi Data:** Data laboratorium, jadwal, sesi, dan presensi menggunakan Cloud Firestore yang sama dengan sprint sebelumnya.
2. **Keamanan:** Validasi radius dan pencatatan presensi final dilakukan melalui mekanisme tepercaya di sisi server. Client tidak boleh dapat melewati validasi hanya dengan mengubah data lokal.
3. **Integritas Presensi:** Satu praktikan tidak boleh memiliki lebih dari satu presensi pada sesi yang sama.
4. **Privasi:** Data lokasi hanya digunakan untuk kebutuhan presensi dan tampilan posisi pengguna. Penyimpanan koordinat mentah harus dibatasi sesuai kebutuhan.
5. **Keandalan:** Kegagalan Maps atau notifikasi tidak boleh merusak autentikasi, jadwal, sesi, dan pengajuan izin.
6. **Kompatibilitas:** Library dan konfigurasi native harus sesuai dengan versi Expo/React Native yang digunakan repository.
7. **Respons Antarmuka:** Setiap proses yang membutuhkan waktu harus menampilkan loading, success, empty, atau error state yang sesuai.

## 6. Alur Utama Sprint 3

### 6.1 Presensi Berbasis Lokasi

Asisten membuka sesi → praktikan membuka halaman Presensi → aplikasi memperoleh lokasi perangkat → sistem memeriksa sesi dan radius laboratorium → presensi dicatat jika seluruh ketentuan terpenuhi → asisten melihat rekap kehadiran.

### 6.2 Peta dan Informasi Laboratorium

Pengguna membuka Maps → aplikasi menampilkan marker laboratorium dan posisi pengguna → pengguna memilih laboratorium → aplikasi menampilkan detail, praktikum yang sedang berlangsung, dan praktikum berikutnya dari Firestore.

### 6.3 Notifikasi Kegiatan

Asisten membuka sesi/mengubah jadwal/memberi keputusan izin → perubahan disimpan → sistem mengirim notifikasi kepada pengguna terkait → pengguna membuka informasi melalui notifikasi.

## 7. Di Luar Lingkup Wajib

- Presensi menggunakan QR Code merupakan fitur opsional.
- Fitur navigasi rute menuju laboratorium tidak menjadi kebutuhan wajib Sprint 3.

## 8. Pembagian SRS

| ID SRS | PIC Utama |
| :--- | :--- |
| SRS-01 — Halaman Presensi | Naufal Dwi Yusmawan |
| SRS-02 — Validasi Lokasi Presensi | Naufal Dwi Yusmawan |
| SRS-03 — Pengelolaan Lokasi Laboratorium | Aron Sorimuda Johanes Pasaribu |
| SRS-04 — Peta Laboratorium Interaktif | Aron Sorimuda Johanes Pasaribu |
| SRS-05 — Informasi Aktivitas Laboratorium | Aron Sorimuda Johanes Pasaribu |
| SRS-06 — Push Notification | Adelia Clearesta |
| SRS-07 — Penanganan Izin dan Kondisi Perangkat | Adelia Clearesta |

Wipin Saputra Poh bertugas sebagai Project Manager Sprint 3 dan tidak mengambil SRS implementasi.

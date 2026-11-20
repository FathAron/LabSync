# Sprint 3 — Kontrak Model & Integrasi

Dokumen ini menetapkan kontrak awal antarprogrammer untuk pengembangan Sprint 3. Tujuannya agar modul presensi, laboratorium/Maps, dan push notification menggunakan data yang konsisten serta tidak mengubah alur Sprint 2 secara sepihak.

Dokumen pembagian tugas: [SPRINT_3_TASK_DIVISION.md](./SPRINT_3_TASK_DIVISION.md).

---

## 1. Kondisi Repository Saat Ini

Berdasarkan audit repository Sprint 3 yang diberikan:

- Aplikasi menggunakan **Expo SDK 58**, React Native, TypeScript, Expo Router, dan Firebase JavaScript SDK.
- `src/services/firebaseConfig.ts` sudah mengekspor `app`, `auth`, dan `db`.
- Koleksi Firestore yang sudah digunakan pada model/service Sprint 2 adalah `users`, `classes`, `sessions`, `attendance`, dan `leaveRequests`.
- Model `Session` saat ini mempunyai field `room`, tetapi belum mempunyai `laboratoryId`.
- Model `AttendanceRecord` saat ini belum menyimpan informasi hasil validasi lokasi.
- `recordAttendance()` di `src/services/practicumService.ts` saat ini menggunakan transaksi Firestore dari client untuk memeriksa sesi `ACTIVE` dan ID presensi gabungan. Validasi radius belum ada.
- `app/student/_layout.tsx` saat ini menyediakan tab Sesi Praktikum, Riwayat Presensi, dan Pengajuan Izin.
- `package.json` saat ini belum mencantumkan library khusus Maps, geolocation, atau push notification. `expo-dev-client` sudah terpasang.
- `app.json` saat ini belum mempunyai konfigurasi plugin khusus lokasi, Maps, atau notifikasi.
- Repository belum memperlihatkan folder Firebase Cloud Functions untuk validasi presensi atau pengiriman push notification.

Poin-poin di atas merupakan kondisi awal repository, bukan batas akhir implementasi. Perubahan yang diperlukan harus dilakukan melalui PR dan tetap menjaga fitur Sprint 2.

---

## 2. Kontrak Data Laboratorium

**PIC: Aron Sorimuda Johanes Pasaribu**
**Koleksi yang diusulkan: `laboratories`**

Setiap dokumen laboratorium minimal menyediakan data berikut:

```ts
export interface Laboratory {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  createdAt: string;
  updatedAt: string;
}
```

Ketentuan:
- `latitude` dan `longitude` merupakan titik pusat laboratorium.
- `radiusMeters` adalah radius maksimum presensi dalam meter.
- Nilai koordinat dan radius harus divalidasi sebelum disimpan.
- Pengelolaan data hanya dapat dilakukan oleh asisten yang memiliki hak akses.
- Data laboratorium dapat dibaca oleh modul presensi dan halaman Maps.

### Relasi sesi dengan laboratorium

Model `Session` saat ini belum memiliki `laboratoryId`. Untuk Sprint 3, tambahkan relasi yang disepakati, misalnya:

```ts
laboratoryId: string;
```

Ketentuan migrasi:
- `laboratoryId` digunakan untuk menghubungkan sesi dengan dokumen `laboratories/{laboratoryId}`.
- Jangan menganggap teks `room` otomatis dapat dikonversi menjadi koordinat.
- Sesi lama yang belum memiliki `laboratoryId` harus ditangani sebagai data yang belum dikonfigurasi, bukan dianggap valid untuk presensi berbasis lokasi.
- Nama field akhir ditetapkan Aron setelah mendapat masukan dari Naufal dan disetujui tim.

---

## 3. Kontrak Lokasi Perangkat

**Koordinator kontrak lokasi: Naufal Dwi Yusmawan**
**Pengguna: Naufal (Presensi) dan Aron (Maps)**

Service lokasi perlu menyediakan dua kebutuhan:

```ts
export interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
}

export interface LocationService {
  getCurrentCoordinates(): Promise<Coordinates>;
  watchUserLocation(
    onChange: (coordinates: Coordinates) => void,
    onError?: (message: string) => void
  ): Promise<() => void>;
}
```

Catatan:
- Bentuk ekspor final boleh disesuaikan dengan library yang dipilih, tetapi fungsi dan hasilnya harus disepakati sebelum integrasi.
- `getCurrentCoordinates()` dipakai sebelum presensi.
- `watchUserLocation()` dipakai Maps untuk memperbarui marker pengguna.
- Subscription harus dihentikan ketika halaman Maps tidak aktif/unmount.
- Service mengembalikan error yang bisa dibedakan, misalnya permission ditolak, GPS nonaktif, timeout, atau lokasi belum tersedia.
- Permintaan izin dan penanganan status perangkat menggunakan kontrak bersama yang dikoordinasikan Adel pada SRS-07.

---

## 4. Aturan Validasi Presensi Berbasis Lokasi

**PIC fitur: Naufal**

Urutan validasi minimum:

1. Identitas pengguna harus berasal dari sesi autentikasi yang valid.
2. Pengguna harus memiliki role `student`.
3. Sesi harus ditemukan dan berstatus `ACTIVE`.
4. Kelas pengguna harus sesuai dengan kelas pada sesi.
5. Sesi harus terhubung dengan laboratorium yang valid.
6. Koordinat laboratorium dan `radiusMeters` harus tersedia.
7. Koordinat perangkat harus berhasil diperoleh dan memenuhi batas akurasi yang disepakati tim.
8. Jarak perangkat ke titik laboratorium harus berada di dalam radius.
9. Presensi untuk pasangan sesi dan pengguna tersebut belum pernah tercatat.
10. Baru setelah semua pemeriksaan lolos, sistem menyimpan presensi.

Jarak dihitung dalam meter menggunakan rumus geodesik yang sesuai (misalnya Haversine). Batas radius dan akurasi tidak boleh hanya menjadi teks atau indikator visual pada UI.

### Keamanan validasi

`recordAttendance()` saat ini melakukan transaksi dari client untuk memeriksa status sesi dan duplikasi, tetapi belum melakukan validasi lokasi. Untuk memenuhi kebutuhan Sprint 3:

- Pemeriksaan jarak di aplikasi boleh digunakan untuk memberi feedback cepat, tetapi bukan satu-satunya pengaman.
- Pencatatan final harus melalui backend tepercaya (misalnya Firebase Cloud Functions atau server yang memakai Firebase Admin SDK) yang memeriksa sesi, laboratorium, radius, dan duplikasi sebelum menulis data.
- Backend mengambil UID dari token autentikasi yang diverifikasi, bukan mempercayai `studentId` yang dikirim bebas dari client.
- Security Rules harus mencegah client menulis presensi dengan melewati proses validasi server.
- Jangan menerima flag seperti `locationValid: true` dari client sebagai bukti validasi.
- Lokasi/GPS dapat dipalsukan pada perangkat tertentu; dokumentasikan keterbatasan ini dan jangan mengklaim sistem sepenuhnya anti-spoofing hanya karena memakai GPS.

### Metadata presensi

Tim dapat menambahkan metadata minimum untuk audit, misalnya:

```ts
laboratoryId: string;
distanceMeters: number;
locationAccuracyMeters: number | null;
locationValidatedAt: string;
```

Hanya simpan koordinat mentah perangkat apabila memang diperlukan dan sudah disepakati terkait privasi. Metadata akhir ditentukan Aron pada `models.ts` setelah mendapat kebutuhan dari Naufal.

---

## 5. Kontrak Informasi Aktivitas Laboratorium

**PIC: Aron**

Aktivitas praktikum diperoleh dari koleksi `sessions`, bukan dibuat sebagai sumber data terpisah yang bisa berbeda dari jadwal utama.

Minimal informasi yang ditampilkan:
- Nama praktikum atau mata praktikum.
- Kelas.
- Tanggal dan waktu pelaksanaan.
- Status sesi (`PENDING`, `ACTIVE`, atau `CLOSED`).
- Laboratorium tempat sesi berlangsung.

Aturan pemilihan:
- **Sedang berlangsung:** sesi pada laboratorium yang sesuai dan status/waktu pelaksanaannya menunjukkan sesi sedang berjalan.
- **Berikutnya:** sesi terdekat berdasarkan tanggal dan jam mulai yang belum selesai.
- Perubahan sesi dan jadwal harus mengikuti data Firestore yang terbaru.
- Apabila belum ada sesi yang sesuai, tampilkan empty state.
- Aturan penentuan "sedang berlangsung" dan "berikutnya" perlu disepakati, termasuk perlakuan sesi yang statusnya `ACTIVE` tetapi melewati jam jadwal.

---

## 6. Kontrak Push Notification

**PIC: Adelia Clearesta**

### Data token perangkat

Setiap perangkat perlu terhubung dengan UID akun yang sedang login. Bentuk penyimpanan yang disarankan adalah subkoleksi perangkat, misalnya:

`users/{uid}/devices/{deviceId}`

Contoh field:

```ts
export interface UserDevice {
  id: string;
  token: string;
  provider: 'fcm' | 'expo';
  platform: 'android' | 'ios';
  enabled: boolean;
  updatedAt: string;
}
```

- Satu akun dapat memiliki lebih dari satu perangkat.
- Token harus diperbarui ketika provider mengeluarkan token baru.
- Token yang sudah tidak valid perlu dinonaktifkan atau dibersihkan.
- Security Rules harus membatasi pendaftaran/pengubahan token hanya untuk pemilik akun; backend yang mengirim notifikasi.

### Event dan penerima

| Event | Data sumber | Penerima |
| :--- | :--- | :--- |
| Sesi dibuka | Perubahan status sesi menjadi `ACTIVE` | Praktikan yang terdaftar/terkait dengan kelas sesi |
| Jadwal berubah | Perubahan data jadwal/sesi | Praktikan yang terkait dengan jadwal tersebut |
| Izin diterima | Perubahan `leaveRequests.status` menjadi `APPROVED` | Praktikan pemilik pengajuan izin |
| Izin ditolak | Perubahan `leaveRequests.status` menjadi `REJECTED` | Praktikan pemilik pengajuan izin |

Ketentuan:
- Notifikasi dikirim setelah perubahan data berhasil disimpan.
- Gunakan backend tepercaya untuk pengiriman. Jangan menaruh server key, private key, atau service account di aplikasi mobile.
- Hindari notifikasi ganda untuk satu event yang sama.
- Payload notifikasi minimal memiliki jenis event dan ID data tujuan agar aplikasi dapat membuka halaman yang benar.
- Tangani foreground, background, dan kondisi aplikasi dibuka melalui notifikasi.
- Notifikasi gagal tidak boleh membatalkan pembukaan sesi, perubahan jadwal, atau keputusan izin yang sudah berhasil disimpan.

---

## 7. Kontrak Permission dan Kondisi Perangkat

**PIC: Adel (SRS-07)**

Adel menyiapkan mekanisme permission/status yang dapat digunakan oleh Naufal dan Aron. Nama file dan bentuk API final disepakati pada kickoff; contoh pembagian tanggung jawab:

- Permission service: meminta dan membaca status izin lokasi/notifikasi.
- Naufal: memakai status izin untuk alur presensi dan menampilkan hasil validasi lokasi.
- Aron: memakai status izin untuk menampilkan posisi pengguna pada Maps.
- Adel: menangani logika permission bersama, notifikasi, serta pesan/fallback kondisi perangkat.

Kondisi minimum yang harus ditangani:

| Kondisi | Respons aplikasi |
| :--- | :--- |
| Izin lokasi belum diberikan/ditolak | Jelaskan alasan izin diperlukan dan berikan arahan untuk mengaktifkannya. |
| GPS/lokasi perangkat nonaktif | Beri tahu pengguna untuk mengaktifkan layanan lokasi. |
| Koordinat belum tersedia/timeout | Tampilkan status gagal memperoleh lokasi dan opsi mencoba kembali. |
| Akurasi lokasi tidak memadai | Jangan melanjutkan presensi; minta pengguna mencoba kembali di area terbuka bila sesuai. |
| Koneksi bermasalah | Tampilkan pesan koneksi dan jangan menganggap operasi berhasil. |
| Izin notifikasi ditolak | Aplikasi tetap dapat digunakan; jelaskan bahwa pemberitahuan tidak akan diterima sampai izin diaktifkan. |
| Token/pengiriman notifikasi gagal | Catat kegagalan untuk diagnosis dan jangan membatalkan proses utama yang sudah berhasil. |

---

## 8. Konfigurasi Expo dan Dependency

Audit awal menunjukkan library Maps, lokasi, dan notifikasi belum tercantum pada `package.json` maupun konfigurasi plugin `app.json`.

Ketentuan pemasangan:
- Adel menjadi koordinator pemasangan dependency native dan perubahan `package.json`, `package-lock.json`, serta `app.json` agar tidak terjadi konflik versi.
- Naufal dan Aron menyampaikan kebutuhan library terlebih dahulu.
- Gunakan `npx expo install <nama-package>` untuk memilih versi yang sesuai dengan Expo SDK repository.
- Setelah menambah/mengubah dependency native atau plugin, lakukan build ulang development build sebelum menguji di perangkat.
- Jalankan `npx expo-doctor` untuk memeriksa kompatibilitas dependency.
- Pilih satu strategi push notification dan dokumentasikan konfigurasi Android/iOS yang diperlukan; jangan mencampur beberapa provider tanpa kebutuhan yang jelas.

---

## 9. Referensi Implementasi

Artikel referensi yang diberikan untuk Sprint 3:

- [Rich Push Notifications in React Native: A Complete Guide](https://medium.com/@silverskytechnology/rich-push-notifications-in-react-native-a-complete-guide-797dd9747366)
- [Implementing Google Maps and Routes Tracking in React Native: A Starter Guide](https://medium.com/@silverskytechnology/implementing-google-maps-and-routes-tracking-in-react-native-a-starter-guide-9768282594b8)

Artikel tersebut menjadi referensi awal. Pilihan package, konfigurasi, dan API final tetap harus dicocokkan dengan versi Expo/React Native yang dipakai repository.

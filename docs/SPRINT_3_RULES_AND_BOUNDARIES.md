# Sprint 3 — Aturan Pengerjaan & Batas Kepemilikan File

Dokumen ini mengatur cara kerja tiga programmer Sprint 3 agar perubahan tidak saling menimpa dan fitur Sprint 2 tetap aman.

Dokumen terkait:
- [Pembagian Tugas Sprint 3](./SPRINT_3_TASK_DIVISION.md)
- [Kontrak Model & Integrasi Sprint 3](./SPRINT_3_MODELS_AND_INTEGRATION.md)
- [Pembagian Tugas Sprint 2](./SPRINT_2_TASK_DIVISION.md)

---

## 1. Pembagian Branch

Gunakan satu branch kerja untuk setiap programmer:

| Anggota | Branch |
| :--- | :--- |
| Naufal Dwi Yusmawan | `feat/sprint3-naufal-location-attendance` |
| Aron Sorimuda Johanes Pasaribu | `feat/sprint3-aron-laboratory-maps` |
| Adelia Clearesta | `feat/sprint3-adelia-push-notification` |
| Wipin Saputra Poh (PM) | `docs/sprint3-documentation` (jika melakukan perubahan dokumentasi di Git) |

PM tidak membuat branch implementasi fitur karena tidak mengambil tiket coding.

---

## 2. Aturan Umum

1. **Jangan mengubah pekerjaan anggota lain secara sepihak.** Jika membutuhkan perubahan file milik anggota lain, sampaikan kebutuhan dan sepakati implementasinya terlebih dahulu.
2. **Jangan mengganti struktur koleksi atau nama field Firestore tanpa koordinasi.** Perubahan data harus dicatat di `SPRINT_3_MODELS_AND_INTEGRATION.md`.
3. **Jangan menghapus kompatibilitas Sprint 2.** Login, role, jadwal, sesi, pengajuan izin, keputusan izin, dan rekap presensi harus tetap berjalan.
4. **Jangan menyimpan secret dalam aplikasi mobile.** FCM server key, service account, private key, dan kredensial backend hanya boleh berada di lingkungan server yang aman.
5. **Jangan memasang dependency native secara terpisah oleh beberapa programmer.** Kebutuhan package disampaikan ke Adel sebagai koordinator `package.json`, `package-lock.json`, dan `app.json`.
6. **Jangan menganggap validasi lokasi di UI sudah cukup.** Pencatatan presensi final harus melewati validasi server-side.
7. **Jangan mengirim notifikasi sebelum perubahan data berhasil.** Notifikasi harus mencerminkan event yang benar-benar tersimpan.
8. **Setiap fitur harus memiliki loading, empty, success, dan error state yang sesuai.**

---

## 3. Batas Kepemilikan File

| Anggota | Area yang boleh dibuat/diubah | Area yang tidak boleh diubah tanpa koordinasi |
| :--- | :--- | :--- |
| **Naufal** | Halaman presensi baru, entry point presensi dari daftar sesi, komponen presensi, service validasi lokasi/pencatatan presensi, dan bagian terkait pada hook praktikum. | `src/types/models.ts`, `firestore.rules`, `app.json`, dependency/package lock, root notification handler, modul Maps, dan service push notification. |
| **Aron** | Model `Laboratory` dan relasi sesi, service/komponen pengelolaan laboratorium, Maps, informasi aktivitas, route/tab Maps, integrasi lokasi pada AssistantView, serta `firestore.rules`. | Implementasi halaman presensi dan service pencatatan presensi milik Naufal, service push notification, root notification handler, serta dependency/package config. |
| **Adel** | Push notification, token perangkat, handler foreground/background, navigasi saat notifikasi ditekan, permission service, penanganan kondisi perangkat, backend trigger notifikasi, `package.json`, `package-lock.json`, `app.json`, dan root notification handler. | Halaman dan service bisnis presensi milik Naufal, model laboratorium milik Aron, halaman Maps, dan `firestore.rules` (kebutuhan Security Rules disampaikan kepada Aron). |
| **Wipin (PM)** | Dokumen perencanaan, pembagian tugas, checklist, review PR, monitoring, dan koordinasi pengujian. | Tidak mengambil alih implementasi fitur programmer. |

### File bersama yang perlu persetujuan

- `src/types/models.ts`: pemilik Aron. Naufal dan Adel menyampaikan field/type yang dibutuhkan sebelum perubahan.
- `firestore.rules`: pemilik Aron. Naufal menyampaikan aturan akses presensi dan Adel menyampaikan aturan token perangkat.
- `package.json`, `package-lock.json`, `app.json`: pemilik Adel. Anggota lain menyampaikan kebutuhan package/plugin.
- `app/student/_layout.tsx`: pemilik Aron untuk integrasi route/tab Maps. Entry point halaman presensi dikoordinasikan agar tidak mengedit layout yang sama.
- `app/_layout.tsx`: pemilik Adel untuk listener dan handler push notification. Perubahan routing global harus dikomunikasikan.

Jika struktur file berbeda dari matriks ini setelah implementasi dimulai, PM dan PIC terkait harus memperbarui kesepakatan sebelum perubahan dilanjutkan.

---

## 4. Alur Git dan Pull Request

### Sebelum mulai bekerja

```bash
git switch main
git pull origin main
git switch -c <branch-masing-masing>
```

Jika branch sudah pernah dibuat, pindah ke branch tersebut dan sinkronkan sesuai arahan tim. Jangan membuat branch baru setiap kali melanjutkan pekerjaan.

### Sebelum commit

```bash
git status
git diff --check
npx tsc --noEmit
npx expo lint
```

Periksa juga file yang akan di-commit. Jangan ikut memasukkan `.env`, token, service account, file build, atau file lokal yang tidak diperlukan.

### Setelah fitur selesai

1. Commit dengan pesan yang menjelaskan perubahan.
2. Push ke branch masing-masing.
3. Buat Pull Request menuju `main`.
4. Sertakan ringkasan fitur, SRS yang diselesaikan, file utama yang berubah, dan bukti pengujian.
5. Tunggu review PM dan selesaikan komentar review.
6. Merge setelah disetujui dan pemeriksaan berhasil.

---

## 5. Strategi Integrasi

Urutan integrasi yang disarankan:

1. **Kontrak model dan laboratorium:** Aron menyiapkan model/koleksi laboratorium serta relasi `laboratoryId` pada sesi setelah mendapat masukan Naufal.
2. **Permission dan konfigurasi perangkat:** Adel menyepakati dependency native dan API permission yang akan dipakai modul lokasi dan notifikasi.
3. **Presensi berbasis lokasi:** Naufal menghubungkan halaman presensi, lokasi, validasi radius, dan mekanisme pencatatan aman.
4. **Maps dan aktivitas:** Aron mengintegrasikan marker, lokasi pengguna, serta aktivitas laboratorium.
5. **Push notification:** Adel menghubungkan token perangkat dengan event pembukaan sesi, perubahan jadwal, dan keputusan izin.
6. **Regression test:** semua anggota membantu memastikan fitur Sprint 2 tidak rusak.
7. **Acceptance test:** PM mengoordinasikan demonstrasi ketiga alur utama Sprint 3.

Urutan ini dapat disesuaikan berdasarkan kesiapan branch, tetapi perubahan kontrak bersama harus masuk sebelum modul yang menggunakannya.

---

## 6. Checklist Pengujian Minimum

### Presensi
- [ ] Sesi belum dibuka: presensi ditolak.
- [ ] Sesi sudah ditutup: presensi ditolak.
- [ ] Lokasi di dalam radius: presensi dapat diproses.
- [ ] Lokasi di luar radius: presensi ditolak.
- [ ] Izin lokasi ditolak: presensi tidak dicatat.
- [ ] GPS nonaktif/lokasi timeout: presensi tidak dicatat.
- [ ] Jaringan terputus: aplikasi tidak menampilkan presensi berhasil.
- [ ] Presensi kedua pada sesi yang sama ditolak.
- [ ] Rekap kehadiran asisten tetap terbarui.

### Maps dan aktivitas laboratorium
- [ ] Marker setiap laboratorium muncul dari Firestore.
- [ ] Marker posisi pengguna muncul ketika izin tersedia.
- [ ] Posisi pengguna mengikuti perubahan lokasi selama halaman Maps digunakan.
- [ ] Memilih marker menampilkan detail laboratorium.
- [ ] Praktikum yang sedang berlangsung tampil sesuai data sesi.
- [ ] Praktikum berikutnya tampil berdasarkan jadwal.
- [ ] Perubahan jadwal/status sesi tercermin pada Maps.
- [ ] Kondisi data kosong dan izin lokasi ditolak ditangani.

### Push notification
- [ ] Izin notifikasi diminta dan statusnya ditangani.
- [ ] Token tersimpan untuk UID pengguna yang benar.
- [ ] Token diperbarui ketika berubah.
- [ ] Notifikasi pembukaan sesi dikirim kepada praktikan yang terkait.
- [ ] Notifikasi perubahan jadwal dikirim kepada praktikan yang terkait.
- [ ] Notifikasi keputusan izin dikirim kepada praktikan pengaju.
- [ ] Notifikasi diterima ketika aplikasi foreground.
- [ ] Notifikasi diterima ketika aplikasi background.
- [ ] Menekan notifikasi membuka halaman yang benar.
- [ ] Kegagalan notifikasi tidak membatalkan perubahan data utama.

---

## 7. Kriteria Sprint Selesai

Sprint 3 dapat dinyatakan selesai setelah:

- [ ] Semua SRS-01 sampai SRS-07 telah memenuhi Definition of Done.
- [ ] Setiap SRS memiliki satu PIC dan bukti pengujian.
- [ ] Perubahan sudah direview dan digabung ke `main`.
- [ ] Tidak ada secret atau kredensial sensitif di repository.
- [ ] Fitur Sprint 2 lolos regression test.
- [ ] Tiga alur utama Sprint 3 dapat didemonstrasikan dari awal sampai akhir.

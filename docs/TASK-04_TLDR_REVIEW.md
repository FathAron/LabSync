# TASK-04 - TLDR & Review (Adelia Clearesta)

Branch: `feat/adelia-student-module`

## TLDR

- Sudut pandang **praktikan** dibangun dengan **Expo Router**: dua tab (`Sesi Praktikum`, `Riwayat Presensi`) + modal presensi.
- Alur: lihat jadwal -> tekan **Lakukan Presensi Sekarang** -> isi meja (opsional) -> **Simpan Presensi** -> kartu jadi **Sudah Presensi** + jam hadir -> muncul di riwayat.
- Presensi ganda ditolak (kunci `sessionId + studentId`). Sesi `PENDING` dan `CLOSED` tidak bisa presensi.
- Belum terhubung ke state tim. Modul memakai **satu titik sambung**: `src/features/student/centralState.ts`.

## Rute (Expo Router)

| File | URL | Isi |
|---|---|---|
| `app/student/_layout.tsx` | - | `Tabs` + kartu profil praktikan |
| `app/student/index.tsx` | `/student` | Tab Sesi Praktikum + modal presensi |
| `app/student/history.tsx` | `/student/history` | Tab Riwayat Presensi |
| `app/index.tsx` | `/` | Sementara: redirect ke `/student` |
| `app/_layout.tsx` | - | Sementara: DemoProvider + DevPanel (milik shell Aron) |
| `app/+not-found.tsx` | rute tak dikenal | Halaman 404 |

## Kontrak dengan state pusat (TASK-01)

`useCentralState()` harus mengembalikan:

| Field | Bentuk |
|---|---|
| `currentStudent` | `{ id, name, nim, className }` |
| `sessions` | array sesi, `status` = `PENDING` / `ACTIVE` / `CLOSED` |
| `attendanceList` | array `{ id, sessionId, studentId, timestamp (ISO UTC), notes }` |
| `recordAttendance(sessionId, student, notes)` | fungsi pusat, sumber kebenaran anti-duplikasi |
| `hasStudentAttended(sessionId, studentId)` | opsional tapi disarankan |
| `notify({ type, message })` | opsional, untuk FeedbackToast milik TASK-05 |

Nama field lain (mis. `courseName` vs `practicumName`) dibaca oleh adapter di `studentUtils.ts`. Jika beda, tambahkan nama field di sana.

## Cara menyambungkan saat AppContext Aron sudah di-merge

1. Edit **hanya** `src/features/student/centralState.ts` (contoh sudah ada di komentar file).
2. Pakai `app/_layout.tsx` milik Aron; buang `DemoProvider` dan `DevPanel`.
3. Hapus folder `src/dev` dan `app/index.tsx` bila shell punya halaman awal sendiri.

## Self-review (kriteria penerimaan)

Diuji lewat build web asli Expo Router (DOM tiruan):

- [x] Profil, jadwal difilter per kelas, detail sesi lengkap, format jam `HH:mm WIB`
- [x] PENDING dan CLOSED: tombol tidak aktif, modal tidak terbuka
- [x] Modal: identitas dan detail sesi benar, meja opsional, Batal tidak mencatat
- [x] Simpan: loading, feedback sukses, kartu "Sudah Presensi" + jam, tombol terkunci
- [x] Tap "Simpan" 3x hanya mencatat 1 presensi
- [x] Riwayat langsung bertambah, terbaru di atas, tidak bocor antar persona
- [x] Empty state: tanpa identitas, jadwal kosong, riwayat kosong
- [x] Pindah tab mengubah URL (`/student` <-> `/student/history`), 404 berfungsi

Belum diuji (perlu dicek manual):

- [ ] Tampilan visual di layar HP asli (Expo Go) dan keyboard terbuka
- [ ] `npx expo-doctor` dan lint
- [ ] Integrasi dengan AppContext asli (menunggu TASK-01 di-merge)

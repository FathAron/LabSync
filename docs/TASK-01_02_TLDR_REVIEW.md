# TASK-01 & TASK-02 - TLDR & Review (Aron Sorimuda Johanes Pasaribu)

Branches:
- `feat/aron-state-mock` (TASK-01: State Management & Mock Data Setup)
- `feat/aron-app-shell` (TASK-02: App Shell, Navigation, Role Switcher & FeedbackToast)

## TLDR

- **TASK-01 (`src/data/mockData.ts` & `src/context/AppContext.tsx`)**:
  - Menyediakan data awal (`ASSISTANTS`, `STUDENTS`, `INITIAL_SESSIONS`, `INITIAL_ATTENDANCE`) dengan 2 asisten, 5 praktikan lintas kelas (`IF-26-A`, `IF-26-B`, `IF-26-C`), dan 6 sesi praktikum berstatus `PENDING`, `ACTIVE`, dan `CLOSED`.
  - Membangun state terpusat `AppContext` (`AppProvider` & `useApp`) yang mengelola `currentRole`, `currentAssistant`, `currentStudent`, `sessions`, `attendanceList`, dan `feedbackToast`.
  - Mengimplementasikan mutasi inti: `openSession`, `closeSession`, `recordAttendance` (dengan validasi kelas, status sesi, serta pencegahan duplikasi sinkron via `useRef`), `hasStudentAttended`, `getStudentAttendanceRecord`, `getAttendanceForSession`, `getStudentHistory`, dan `resetDemoData`.
  - Menyambungkan `src/features/student/centralState.ts` milik modul praktikan (Adelia - TASK-04) langsung ke `useApp()`.
- **TASK-02 (`src/components/Header.tsx`, `src/components/FeedbackToast.tsx`, `src/styles/theme.ts`, `app/_layout.tsx`)**:
  - Membangun `Header` dengan identitas **LabSync (Sprint 1)**, tombol **Reset Demo**, **Segmented Role Switcher** (`Sudut Pandang Asisten` <-> `Sudut Pandang Praktikan`), serta **Persona Selector Modal** untuk mengganti akun asisten/praktikan aktif (termasuk simulasi edge case tanpa identitas).
  - Membangun `FeedbackToast` global untuk umpan balik instan ketika membuka/menutup sesi, mencatat presensi (dilengkapi tautan cepat ke Riwayat Presensi), mengganti peran/persona, atau mereset data demo.
  - Mengintegrasikan `AssistantView` pada `app/_layout.tsx` dan menghapus `src/dev/DemoProvider.tsx` serta `src/dev/DevPanel.tsx`.

## Arsitektur File (TASK-01 & TASK-02)

| File | Tugas | Deskripsi |
|---|---|---|
| `src/data/mockData.ts` | TASK-01 | Data dummy Asisten (2), Praktikan (5), Sesi (6), dan Presensi Awal (3) |
| `src/context/AppContext.tsx` | TASK-01 | Central React Context Store & fungsi mutasi sesi/presensi |
| `src/features/student/centralState.ts` | TASK-01/04 | Titik sambung modul praktikan Adelia ke `useApp()` |
| `src/styles/theme.ts` | TASK-02 | Token desain yang selaras dengan `studentTokens.ts` |
| `src/components/Header.tsx` | TASK-02 | App Bar, Segmented Role Switcher, Persona Selector Modal & Reset Demo |
| `src/components/FeedbackToast.tsx` | TASK-02 | Banner notifikasi toast melayang terpusat |
| `src/screens/AssistantView.tsx` | TASK-02/03 | Tampilan sudut pandang Asisten (Buka/Tutup Sesi & Rekap Realtime) |
| `app/_layout.tsx` | TASK-02 | Root layout Expo Router yang membungkus `AppProvider`, `Header`, dan `FeedbackToast` |

## Self-Review (Kriteria Penerimaan SRS & DoD)

- [x] `mockData.ts` memiliki minimal 2 Asisten, 5 Praktikan, dan variasi status sesi (`PENDING`, `ACTIVE`, `CLOSED`)
- [x] Format tanggal (`YYYY-MM-DD`), jam (`HH:mm`), dan `timestamp` (ISO UTC) kompatibel 100% dengan `studentUtils.ts` milik Adelia
- [x] `openSession` mengubah status ke `ACTIVE` dan mencatat `openedAt` (`HH:mm WIB`)
- [x] `closeSession` mengubah status ke `CLOSED` dan mencatat `closedAt` (`HH:mm WIB`)
- [x] `recordAttendance` menolak presensi ganda (termasuk tap beruntun) dan menolak sesi `PENDING`/`CLOSED`
- [x] Perpindahan sudut pandang Asisten <-> Praktikan di `Header` berjalan instan tanpa kehilangan state
- [x] Persona Selector Modal dapat mengganti identitas asisten maupun praktikan aktif secara real-time
- [x] Lolos pemeriksaan TypeScript (`npx tsc --noEmit`) tanpa error


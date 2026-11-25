// DATA MODEL & MOCK DATA — LABORATORIUM INFORMATIKA UNDIP
// Menggunakan 7 Mata Kuliah Resmi dan 4 Laboratorium Resmi Informatika UNDIP.
// Data asisten dan jadwal merujuk pada katalog resmi Semester Gasal 2026/2027.
// Privasi: NIM dan data kontak praktikan dianonimisasi untuk repositori publik.

import type { SessionStatus } from '../features/student/types';
import { deriveWeekdayName } from '../utils/dateUtils';

export interface Assistant {
  id: string;
  name: string;
  nim?: string;
  role: string;
  avatar: string;
}

export interface Student {
  id: string;
  name: string;
  nim: string;
  className: string;
  class: string; // alias kompatibilitas
  avatar: string;
}

export interface Session {
  id: string;
  courseName: string;
  courseCode: string;
  moduleCode: string;
  moduleTitle: string;
  className: string;
  class: string; // alias kompatibilitas
  day: string;
  date: string; // ISO YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  time: string; // HH:mm - HH:mm WIB
  room: string;
  assistantId: string;
  assistantName: string;
  totalStudents: number;
  status: SessionStatus;
  openedAt: string | null;
  closedAt: string | null;
  notes: string;
  lastActivityAt?: string | null;
}

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  studentId: string;
  studentNim: string;
  studentName: string;
  timestamp: string; // ISO UTC string
  attendedAt: string; // HH:mm WIB
  status: 'Hadir';
  notes: string;
}

// ASISTEN RESMI DARI KATALOG PRAKTIKUM INFORMATIKA UNDIP
export const ASSISTANTS: Assistant[] = [
  {
    id: 'asprak-1',
    name: 'Nicholas Gunawan',
    role: 'Asisten Laboratorium',
    avatar: 'NG',
  },
  {
    id: 'asprak-2',
    name: 'Muhammad Farhan Al Ghifari',
    role: 'Asisten Laboratorium',
    avatar: 'FA',
  },
  {
    id: 'asprak-3',
    name: 'Syifa Aeni Mudrikah',
    role: 'Asisten Laboratorium',
    avatar: 'SM',
  },
  {
    id: 'asprak-4',
    name: 'Siriel Wafa Nuriel Fahri',
    role: 'Asisten Laboratorium',
    avatar: 'SF',
  },
];

// PRAKTIKAN DEMO (DATA DISAMARKAN DEMI PERLINDUNGAN PRIVASI MAHASISWA)
export const STUDENTS: Student[] = [
  {
    id: 'stu-001',
    name: 'Praktikan Informatika A1',
    nim: '24060124140001',
    className: 'A1',
    class: 'A1',
    avatar: 'P1',
  },
  {
    id: 'stu-002',
    name: 'Praktikan Informatika A2',
    nim: '24060124140002',
    className: 'A1',
    class: 'A1',
    avatar: 'P2',
  },
  {
    id: 'stu-003',
    name: 'Praktikan Informatika B1',
    nim: '24060124140003',
    className: 'B1',
    class: 'B1',
    avatar: 'P3',
  },
  {
    id: 'stu-004',
    name: 'Praktikan Informatika C1',
    nim: '24060124140004',
    className: 'C1',
    class: 'C1',
    avatar: 'P4',
  },
];

// SESI AWAL BERDASARKAN MATA KULIAH RESMI & LAB RESMI UNDIP
// Hari dihitung secara kanonikal:
// 2026-10-19: Senin
// 2026-10-21: Rabu
// 2026-10-22: Kamis
// 2026-10-23: Jumat
export const INITIAL_SESSIONS: Session[] = [
  {
    id: 'ses-a1',
    courseName: 'Dasar Pemrograman',
    courseCode: 'PAIK6101',
    moduleCode: 'Modul 01',
    moduleTitle: 'Pengenalan Algoritma & Variabel',
    className: 'A1',
    class: 'A1',
    day: deriveWeekdayName('2026-10-19') ?? 'Senin',
    date: '2026-10-19',
    startTime: '08:00',
    endTime: '10:00',
    time: '08:00 - 10:00 WIB',
    room: 'Lab B',
    assistantId: 'asprak-1',
    assistantName: 'Nicholas Gunawan',
    totalStudents: 28,
    status: 'CLOSED',
    openedAt: '08:00 WIB',
    closedAt: '10:00 WIB',
    notes: 'Sesi praktikum Modul 01 telah selesai dilaksanakan.',
    lastActivityAt: '2026-10-19T03:00:00.000Z',
  },
  {
    id: 'ses-a2',
    courseName: 'Pengembangan Platform Khusus',
    courseCode: 'PAIK6501',
    moduleCode: 'Modul 02',
    moduleTitle: 'Mobile UI Components & Navigation',
    className: 'A1',
    class: 'A1',
    day: deriveWeekdayName('2026-10-21') ?? 'Rabu',
    date: '2026-10-21',
    startTime: '10:10',
    endTime: '12:10',
    time: '10:10 - 12:10 WIB',
    room: 'Lab D',
    assistantId: 'asprak-2',
    assistantName: 'Muhammad Farhan Al Ghifari',
    totalStudents: 26,
    status: 'ACTIVE',
    openedAt: '10:10 WIB',
    closedAt: null,
    notes: 'Praktikum tatap muka di Lab D Gedung E Lt. 2. Presensi aktif.',
    lastActivityAt: '2026-10-21T03:10:00.000Z',
  },
  {
    id: 'ses-a3',
    courseName: 'Pengembangan Platform Khusus',
    courseCode: 'PAIK6501',
    moduleCode: 'Modul 03',
    moduleTitle: 'State Management & Offline Storage',
    className: 'A1',
    class: 'A1',
    day: deriveWeekdayName('2026-10-28') ?? 'Rabu',
    date: '2026-10-28',
    startTime: '10:10',
    endTime: '12:10',
    time: '10:10 - 12:10 WIB',
    room: 'Lab D',
    assistantId: 'asprak-1',
    assistantName: 'Nicholas Gunawan',
    totalStudents: 26,
    status: 'PENDING',
    openedAt: null,
    closedAt: null,
    notes: 'Menunggu asisten membuka sesi praktikum.',
    lastActivityAt: '2026-10-15T00:00:00.000Z',
  },
  {
    id: 'ses-b1',
    courseName: 'Basis Data',
    courseCode: 'PAIK6301',
    moduleCode: 'Modul 01',
    moduleTitle: 'Data Definition Language (DDL)',
    className: 'B1',
    class: 'B1',
    day: deriveWeekdayName('2026-10-20') ?? 'Selasa',
    date: '2026-10-20',
    startTime: '15:40',
    endTime: '17:40',
    time: '15:40 - 17:40 WIB',
    room: 'Lab B',
    assistantId: 'asprak-3',
    assistantName: 'Syifa Aeni Mudrikah',
    totalStudents: 25,
    status: 'ACTIVE',
    openedAt: '15:40 WIB',
    closedAt: null,
    notes: 'Sesi praktikum Kelas B1 sedang berlangsung.',
    lastActivityAt: '2026-10-20T08:40:00.000Z',
  },
  {
    id: 'ses-b2',
    courseName: 'Struktur Data',
    courseCode: 'PAIK6201',
    moduleCode: 'Modul 02',
    moduleTitle: 'Linked List & Pointer Implementation',
    className: 'B1',
    class: 'B1',
    day: deriveWeekdayName('2026-10-22') ?? 'Kamis',
    date: '2026-10-22',
    startTime: '13:00',
    endTime: '15:00',
    time: '13:00 - 15:00 WIB',
    room: 'Lab D',
    assistantId: 'asprak-4',
    assistantName: 'Siriel Wafa Nuriel Fahri',
    totalStudents: 25,
    status: 'PENDING',
    openedAt: null,
    closedAt: null,
    notes: 'Persiapkan materi pointer dan memory allocation.',
    lastActivityAt: '2026-10-16T00:00:00.000Z',
  },
  {
    id: 'ses-c1',
    courseName: 'Sistem Operasi',
    courseCode: 'PAIK6401',
    moduleCode: 'Modul 01',
    moduleTitle: 'Process Scheduling & Threading',
    className: 'C1',
    class: 'C1',
    day: deriveWeekdayName('2026-10-22') ?? 'Kamis',
    date: '2026-10-22',
    startTime: '15:40',
    endTime: '17:40',
    time: '15:40 - 17:40 WIB',
    room: 'Lab AP',
    assistantId: 'asprak-4',
    assistantName: 'Siriel Wafa Nuriel Fahri',
    totalStudents: 24,
    status: 'CLOSED',
    openedAt: '15:40 WIB',
    closedAt: '17:40 WIB',
    notes: 'Sesi praktikum telah ditutup.',
    lastActivityAt: '2026-10-22T10:40:00.000Z',
  },
];

export const INITIAL_ATTENDANCE: AttendanceRecord[] = [
  {
    id: 'att-seed-1',
    sessionId: 'ses-a1',
    studentId: 'stu-001',
    studentNim: '24060124140001',
    studentName: 'Praktikan Informatika A1',
    timestamp: '2026-10-19T01:05:00.000Z', // 08:05 WIB
    attendedAt: '08:05 WIB',
    status: 'Hadir',
    notes: 'Meja Lab B-03',
  },
  {
    id: 'att-seed-2',
    sessionId: 'ses-a1',
    studentId: 'stu-002',
    studentNim: '24060124140002',
    studentName: 'Praktikan Informatika A2',
    timestamp: '2026-10-19T01:08:00.000Z', // 08:08 WIB
    attendedAt: '08:08 WIB',
    status: 'Hadir',
    notes: 'Meja Lab B-05',
  },
  {
    id: 'att-seed-3',
    sessionId: 'ses-a2',
    studentId: 'stu-001',
    studentNim: '24060124140001',
    studentName: 'Praktikan Informatika A1',
    timestamp: '2026-10-21T03:15:00.000Z', // 10:15 WIB
    attendedAt: '10:15 WIB',
    status: 'Hadir',
    notes: 'Meja Lab D-12',
  },
];

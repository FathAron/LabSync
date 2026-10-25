// TASK-01 - Data Model & Mock Data (Aron Sorimuda Johanes Pasaribu)
// Menyediakan struktur data awal (Asisten, Praktikan, Sesi Praktikum, dan Catatan Presensi)
// yang kompatibel penuh dengan modul Praktikan (Adelia - TASK-04) dan modul Asisten (Wipin - TASK-03).

import type { SessionStatus } from '../features/student/types';

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
  date: string; // ISO YYYY-MM-DD (dibaca oleh formatDateID di studentUtils.ts)
  startTime: string; // HH:mm (dibaca oleh formatTimeRange di studentUtils.ts)
  endTime: string; // HH:mm
  time: string; // HH:mm - HH:mm WIB (alias tampilan langsung)
  room: string;
  assistantId: string;
  assistantName: string;
  totalStudents: number;
  status: SessionStatus;
  openedAt: string | null;
  closedAt: string | null;
  notes: string;
}

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  studentId: string;
  studentNim: string;
  studentName: string;
  timestamp: string; // ISO UTC string (dibaca oleh formatDateID & formatTimeWIB di studentUtils.ts)
  attendedAt: string; // HH:mm WIB
  status: 'Hadir';
  notes: string;
}

export const ASSISTANTS: Assistant[] = [
  {
    id: 'asprak-1',
    name: 'Aleole Ramadhan',
    nim: '2406012312009',
    role: 'Koordinator Asisten',
    avatar: 'AR',
  },
  {
    id: 'asprak-2',
    name: 'Zaza Amanda',
    nim: '2406012312018',
    role: 'Asisten Laboratorium',
    avatar: 'ZA',
  },
];

export const STUDENTS: Student[] = [
  {
    id: 'stu-001',
    name: 'Carlos Sainz',
    nim: '2406012414100',
    className: 'IF-26-A',
    class: 'IF-26-A',
    avatar: 'CS',
  },
  {
    id: 'stu-002',
    name: 'Aron Sorimuda',
    nim: '2406012414001',
    className: 'IF-26-A',
    class: 'IF-26-A',
    avatar: 'AS',
  },
  {
    id: 'stu-003',
    name: 'Adelia Clearesta',
    nim: '2406012414002',
    className: 'IF-26-A',
    class: 'IF-26-A',
    avatar: 'AC',
  },
  {
    id: 'stu-004',
    name: 'Max Verstappen',
    nim: '2406012414101',
    className: 'IF-26-B',
    class: 'IF-26-B',
    avatar: 'MV',
  },
  {
    id: 'stu-005',
    name: 'Charles Leclerc',
    nim: '2406012414102',
    className: 'IF-26-C',
    class: 'IF-26-C',
    avatar: 'CL',
  },
];

export const INITIAL_SESSIONS: Session[] = [
  // Kelas IF-26-A: mencakup status CLOSED, ACTIVE, dan PENDING untuk demonstrasi lengkap
  {
    id: 'ses-a1',
    courseName: 'Dasar Pemrograman',
    courseCode: 'CSG2A3',
    moduleCode: 'Modul 01',
    moduleTitle: 'Paradigma Pemrograman',
    className: 'IF-26-A',
    class: 'IF-26-A',
    day: 'Sabtu',
    date: '2026-10-17',
    startTime: '13:00',
    endTime: '15:00',
    time: '13:00 - 15:00 WIB',
    room: 'Lab Komputasi Dasar B-201',
    assistantId: 'asprak-1',
    assistantName: 'Aleole Ramadhan',
    totalStudents: 30,
    status: 'CLOSED',
    openedAt: '13:00 WIB',
    closedAt: '15:00 WIB',
    notes: 'Sesi praktikum Modul 01 telah selesai dilaksanakan.',
  },
  {
    id: 'ses-a2',
    courseName: 'Pemrograman Perangkat Bergerak',
    courseCode: 'CSG3H3',
    moduleCode: 'Modul 02',
    moduleTitle: 'Flexbox Layout & State Management',
    className: 'IF-26-A',
    class: 'IF-26-A',
    day: 'Sabtu',
    date: '2026-10-24',
    startTime: '15:30',
    endTime: '17:30',
    time: '15:30 - 17:30 WIB',
    room: 'Lab Komputasi Bergerak A-304',
    assistantId: 'asprak-2',
    assistantName: 'Zaza Amanda',
    totalStudents: 30,
    status: 'ACTIVE',
    openedAt: '15:30 WIB',
    closedAt: null,
    notes: 'Pastikan Expo Go telah terpasang untuk pengujian langsung.',
  },
  {
    id: 'ses-a3',
    courseName: 'Pemrograman Perangkat Bergerak',
    courseCode: 'CSG3H3',
    moduleCode: 'Modul 03',
    moduleTitle: 'Navigasi Multi-Layar & Komponen Interaktif',
    className: 'IF-26-A',
    class: 'IF-26-A',
    day: 'Sabtu',
    date: '2026-10-31',
    startTime: '13:00',
    endTime: '15:00',
    time: '13:00 - 15:00 WIB',
    room: 'Lab Komputasi Bergerak A-304',
    assistantId: 'asprak-1',
    assistantName: 'Aleole Ramadhan',
    totalStudents: 30,
    status: 'PENDING',
    openedAt: null,
    closedAt: null,
    notes: 'Menunggu asisten membuka sesi praktikum.',
  },

  // Kelas IF-26-B (Max Verstappen)
  {
    id: 'ses-b1',
    courseName: 'Dasar Pemrograman',
    courseCode: 'CSG2A3',
    moduleCode: 'Modul 01',
    moduleTitle: 'Paradigma Pemrograman',
    className: 'IF-26-B',
    class: 'IF-26-B',
    day: 'Sabtu',
    date: '2026-10-24',
    startTime: '13:00',
    endTime: '15:00',
    time: '13:00 - 15:00 WIB',
    room: 'Lab Komputasi Dasar B-201',
    assistantId: 'asprak-1',
    assistantName: 'Aleole Ramadhan',
    totalStudents: 28,
    status: 'ACTIVE',
    openedAt: '13:02 WIB',
    closedAt: null,
    notes: 'Sesi praktikum Kelas B sedang berlangsung.',
  },
  {
    id: 'ses-b2',
    courseName: 'Dasar Pemrograman',
    courseCode: 'CSG2A3',
    moduleCode: 'Modul 02',
    moduleTitle: 'Tipe Data dan Operator',
    className: 'IF-26-B',
    class: 'IF-26-B',
    day: 'Sabtu',
    date: '2026-10-31',
    startTime: '15:30',
    endTime: '17:30',
    time: '15:30 - 17:30 WIB',
    room: 'Lab Algoritma AP-102',
    assistantId: 'asprak-2',
    assistantName: 'Zaza Amanda',
    totalStudents: 28,
    status: 'PENDING',
    openedAt: null,
    closedAt: null,
    notes: 'Persiapkan materi tipe data dan operator.',
  },

  // Kelas IF-26-C (Charles Leclerc): hanya sesi CLOSED & belum pernah hadir (uji empty state riwayat)
  {
    id: 'ses-c1',
    courseName: 'Dasar Pemrograman',
    courseCode: 'CSG2A3',
    moduleCode: 'Modul 03',
    moduleTitle: 'Notasi Fungsional',
    className: 'IF-26-C',
    class: 'IF-26-C',
    day: 'Rabu',
    date: '2026-10-21',
    startTime: '13:30',
    endTime: '16:30',
    time: '13:30 - 16:30 WIB',
    room: 'Lab Komputasi Dasar B-201',
    assistantId: 'asprak-1',
    assistantName: 'Aleole Ramadhan',
    totalStudents: 25,
    status: 'CLOSED',
    openedAt: '13:30 WIB',
    closedAt: '16:30 WIB',
    notes: 'Sesi praktikum telah ditutup.',
  },
];

export const INITIAL_ATTENDANCE: AttendanceRecord[] = [
  {
    id: 'att-seed-1',
    sessionId: 'ses-a1',
    studentId: 'stu-001',
    studentNim: '2406012414100',
    studentName: 'Carlos Sainz',
    timestamp: '2026-10-17T06:05:00.000Z', // 13:05 WIB
    attendedAt: '13:05 WIB',
    status: 'Hadir',
    notes: 'Meja Lab B-03',
  },
  {
    id: 'att-seed-2',
    sessionId: 'ses-a1',
    studentId: 'stu-002',
    studentNim: '2406012414001',
    studentName: 'Aron Sorimuda',
    timestamp: '2026-10-17T06:08:00.000Z', // 13:08 WIB
    attendedAt: '13:08 WIB',
    status: 'Hadir',
    notes: 'Meja Lab B-05',
  },
  {
    id: 'att-seed-3',
    sessionId: 'ses-a2',
    studentId: 'stu-003',
    studentNim: '2406012414002',
    studentName: 'Adelia Clearesta',
    timestamp: '2026-10-24T08:35:00.000Z', // 15:35 WIB
    attendedAt: '15:35 WIB',
    status: 'Hadir',
    notes: 'Meja Lab A-12',
  },
];


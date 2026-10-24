import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { CentralState, Id } from '../features/student/types';

export const DEMO_VERSION = 'Task04';

export interface DemoStudent {
  id: string;
  name: string;
  nim: string;
  className: string;
}

interface DemoSession {
  id: string;
  courseName: string;
  moduleCode: string;
  moduleTitle: string;
  className: string;
  date: string;
  startTime: string;
  endTime: string;
  room: string;
  assistantName: string;
  status: 'PENDING' | 'ACTIVE' | 'CLOSED';
}

interface DemoAttendance {
  id: string;
  sessionId: string;
  studentId: string;
  studentName: string;
  timestamp: string;
  notes: string;
}

export const DEMO_STUDENTS: DemoStudent[] = [
  { id: 'stu-001', name: 'Carlos Sainz', nim: '2406012414100', className: 'IF-26-A' },
  { id: 'stu-002', name: 'Max Verstappen', nim: '2406012414101', className: 'IF-26-B' },
  { id: 'stu-003', name: 'Charles Leclerc', nim: '2406012414102', className: 'IF-26-C' },
];

const INITIAL_SESSIONS: DemoSession[] = [
  // Kelas A (Carlos): ada yang CLOSED (sudah hadir), ACTIVE, dan PENDING
  {
    id: 'ses-a1',
    courseName: 'Dasar Pemrograman',
    moduleCode: 'Modul 01',
    moduleTitle: 'Paradigma Pemrograman',
    className: 'IF-26-A',
    date: '2026-10-17',
    startTime: '13:00',
    endTime: '15:00',
    room: 'Lab B',
    assistantName: 'Aleole',
    status: 'CLOSED',
  },
  {
    id: 'ses-a2',
    courseName: 'Dasar Pemrograman',
    moduleCode: 'Modul 02',
    moduleTitle: 'Tipe Data dan Operator',
    className: 'IF-26-A',
    date: '2026-10-24',
    startTime: '15.30', // format titik sengaja dipakai untuk menguji adapter
    endTime: '17.30',
    room: 'Lab AP',
    assistantName: 'Zaza',
    status: 'ACTIVE',
  },
  {
    id: 'ses-a3',
    courseName: 'Dasar Pemrograman',
    moduleCode: 'Modul 03',
    moduleTitle: 'Notasi Fungsional dan Pemrograman Berorientasi Objek Tingkat Lanjut',
    className: 'IF-26-A',
    date: '2026-10-31',
    startTime: '13:00',
    endTime: '15:00',
    room: 'Lab Komputasi Bergerak A-304',
    assistantName: 'Aleole',
    status: 'PENDING',
  },
  // Kelas B (Max)
  {
    id: 'ses-b1',
    courseName: 'Dasar Pemrograman',
    moduleCode: 'Modul 01',
    moduleTitle: 'Paradigma Pemrograman',
    className: 'IF-26-B',
    date: '2026-10-24',
    startTime: '13:00',
    endTime: '15:00',
    room: 'Lab B',
    assistantName: 'Aleole',
    status: 'ACTIVE',
  },
  {
    id: 'ses-b2',
    courseName: 'Dasar Pemrograman',
    moduleCode: 'Modul 02',
    moduleTitle: 'Tipe Data dan Operator',
    className: 'IF-26-B',
    date: '2026-10-31',
    startTime: '15:30',
    endTime: '17:30',
    room: 'Lab AP',
    assistantName: 'Zaza',
    status: 'PENDING',
  },
  // Kelas C (Charles): hanya sesi CLOSED, belum pernah hadir -> riwayat kosong
  {
    id: 'ses-c1',
    courseName: 'Dasar Pemrograman',
    moduleCode: 'Modul 03',
    moduleTitle: 'Notasi Fungsional',
    className: 'IF-26-C',
    date: '2026-10-21',
    startTime: '13:30',
    endTime: '16:30',
    room: 'Lab B',
    assistantName: 'Aleole',
    status: 'CLOSED',
  },
  // Kelas lain: tidak boleh tampil di siapa pun (menguji filter kelas)
  {
    id: 'ses-x1',
    courseName: 'Dasar Pemrograman',
    moduleCode: 'Modul 10',
    moduleTitle: 'Set',
    className: 'IF-45-03',
    date: '2026-11-24',
    startTime: '08:00',
    endTime: '11:00',
    room: 'Lab D',
    assistantName: 'Diba',
    status: 'ACTIVE',
  },
];

const INITIAL_ATTENDANCE: DemoAttendance[] = [
  {
    id: 'att-seed-1',
    sessionId: 'ses-a1',
    studentId: 'stu-001',
    studentName: 'Carlos Sainz',
    timestamp: '2026-10-17T06:05:00.000Z', // 13:05 WIB
    notes: 'Meja Lab B-03',
  },
];

const SAVE_DELAY_MS = 600; 

export interface DemoDevControls {
  students: DemoStudent[];
  studentId: string | null;
  setStudentId: (id: string | null) => void;
  sessions: DemoSession[];
  setStatus: (sessionId: string, status: DemoSession['status']) => void;
  clearSessions: () => void;
  resetAll: () => void;
}

type DemoContextValue = CentralState & { dev: DemoDevControls };

const DemoContext = createContext<DemoContextValue | null>(null);

export const DemoProvider = ({ children }: { children: React.ReactNode }) => {
  const [studentId, setStudentId] = useState<string | null>(DEMO_STUDENTS[0].id);
  const [sessions, setSessions] = useState<DemoSession[]>(INITIAL_SESSIONS);
  const [attendanceList, setAttendanceList] = useState<DemoAttendance[]>(INITIAL_ATTENDANCE);

  const sessionsRef = useRef(sessions);
  sessionsRef.current = sessions;
  const attendanceRef = useRef(attendanceList);
  attendanceRef.current = attendanceList;

  const currentStudent = DEMO_STUDENTS.find((s) => s.id === studentId) ?? null;

  const hasStudentAttended = useCallback(
    (sessionId: Id, id: Id) =>
      attendanceList.some((a) => a.sessionId === sessionId && a.studentId === id),
    [attendanceList]
  );

  const recordAttendance = useCallback(
    (sessionId: Id, student: unknown, notes: string) =>
      new Promise<{ success: boolean; message?: string }>((resolve) => {
        setTimeout(() => {
          const who = student as DemoStudent;
          const session = sessionsRef.current.find((s) => s.id === sessionId);
          if (!session) return resolve({ success: false, message: 'Sesi tidak ditemukan.' });
          if (session.status !== 'ACTIVE') {
            return resolve({ success: false, message: 'Sesi tidak sedang dibuka.' });
          }
          const duplicate = attendanceRef.current.some(
            (a) => a.sessionId === sessionId && a.studentId === who.id
          );
          if (duplicate) {
            return resolve({ success: false, message: 'Praktikan sudah tercatat hadir.' });
          }
          const record: DemoAttendance = {
            id: `att-${Date.now()}`,
            sessionId: String(sessionId),
            studentId: who.id,
            studentName: who.name,
            timestamp: new Date().toISOString(),
            notes: notes || '',
          };
          attendanceRef.current = [...attendanceRef.current, record];
          setAttendanceList(attendanceRef.current);
          return resolve({ success: true });
        }, SAVE_DELAY_MS);
      }),
    []
  );

  const setStatus = useCallback((sessionId: string, status: DemoSession['status']) => {
    setSessions((prev) => prev.map((s) => (s.id === sessionId ? { ...s, status } : s)));
  }, []);

  const clearSessions = useCallback(() => setSessions([]), []);

  const resetAll = useCallback(() => {
    setSessions(INITIAL_SESSIONS);
    setAttendanceList(INITIAL_ATTENDANCE);
    setStudentId(DEMO_STUDENTS[0].id);
  }, []);

  const value = useMemo<DemoContextValue>(
    () => ({
      currentStudent,
      sessions,
      attendanceList,
      recordAttendance,
      hasStudentAttended,
      dev: {
        students: DEMO_STUDENTS,
        studentId,
        setStudentId,
        sessions,
        setStatus,
        clearSessions,
        resetAll,
      },
    }),
    [
      currentStudent,
      sessions,
      attendanceList,
      recordAttendance,
      hasStudentAttended,
      studentId,
      setStatus,
      clearSessions,
      resetAll,
    ]
  );

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
};

const useDemoContext = (): DemoContextValue => {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error('DemoProvider belum dipasang di app/_layout.tsx');
  return ctx;
};

// Kontrak ke modul praktikan (dipakai oleh centralState.ts).
export const useDemoCentral = (): CentralState => useDemoContext();

// Kontrol khusus Panel Dev.
export const useDemoDev = (): DemoDevControls => useDemoContext().dev;

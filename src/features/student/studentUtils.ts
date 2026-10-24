// TASK-04 - Helper modul praktikan.

import { colors } from './studentTokens';
import type {
  AttendanceInfo,
  CentralState,
  Id,
  SessionInfo,
  SessionStatus,
  StudentInfo,
} from './types';

export const SESSION_STATUS = {
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  CLOSED: 'CLOSED',
} as const;

export const MESSAGES = {
  alreadyAttended: 'Anda sudah melakukan presensi pada sesi ini.',
  sessionNotActive: 'Presensi hanya dapat dilakukan saat sesi dibuka.',
  missingStudent: 'Identitas praktikan belum tersedia. Pilih identitas terlebih dahulu.',
  missingSession: 'Data sesi tidak ditemukan.',
  wrongClass: 'Sesi ini bukan untuk kelasmu.',
  recordUnavailable: 'Fitur pencatatan presensi belum terhubung.',
  genericError: 'Presensi gagal dicatat. Silakan coba lagi.',
  success: 'Presensi berhasil dicatat.',
} as const;

interface StatusMeta {
  label: string;
  description: string;
  buttonLabel: string;
  fg: string;
  bg: string;
  dot: string;
}

export const STATUS_META: Record<SessionStatus, StatusMeta> = {
  PENDING: {
    label: 'Belum Dibuka',
    description: 'Menunggu asisten membuka sesi.',
    buttonLabel: 'Presensi Belum Dibuka',
    fg: colors.warningDark,
    bg: colors.warningSoft,
    dot: colors.warning,
  },
  ACTIVE: {
    label: 'Sesi Dibuka',
    description: 'Sesi sedang berlangsung.',
    buttonLabel: 'Lakukan Presensi Sekarang',
    fg: colors.primaryDark,
    bg: colors.primarySoft,
    dot: colors.primary,
  },
  CLOSED: {
    label: 'Sesi Ditutup',
    description: 'Sesi praktikum telah ditutup.',
    buttonLabel: 'Presensi Ditutup',
    fg: colors.neutralDark,
    bg: colors.neutralSoft,
    dot: colors.neutral,
  },
};

const isPresent = (value: unknown): boolean =>
  value !== undefined && value !== null && value !== '';

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;

const asText = (value: unknown, fallback = ''): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return fallback;
};

const asId = (value: unknown): Id | undefined =>
  typeof value === 'string' || typeof value === 'number' ? value : undefined;

// Ambil nilai pertama yang ada dari daftar kemungkinan nama field.
export const pickFirst = (obj: unknown, keys: string[]): unknown => {
  const record = asRecord(obj);
  if (!record) return undefined;
  for (const key of keys) {
    const value = record[key];
    if (isPresent(value)) return value;
  }
  return undefined;
};

// Bandingkan ID tanpa peduli tipe (angka 1 vs string "1").
export const sameId = (a: unknown, b: unknown): boolean => {
  const x = asId(a);
  const y = asId(b);
  if (x === undefined || y === undefined) return false;
  return String(x) === String(y);
};

export const sameText = (a: unknown, b: unknown): boolean =>
  asText(a).trim().toLowerCase() === asText(b).trim().toLowerCase();

export const readStudent = (student: unknown): StudentInfo | null => {
  if (!asRecord(student)) return null;
  const id = asId(pickFirst(student, ['id', 'studentId', 'nim']));
  if (id === undefined) return null; // tanpa ID, identitas dianggap belum tersedia

  return {
    id,
    name: asText(pickFirst(student, ['name', 'fullName', 'nama']), 'Tanpa nama'),
    nim: asText(pickFirst(student, ['nim', 'studentNumber']), '-'),
    className: asText(pickFirst(student, ['className', 'class', 'kelas'])),
    raw: student,
  };
};

const isSessionStatus = (value: string): value is SessionStatus =>
  value === 'PENDING' || value === 'ACTIVE' || value === 'CLOSED';

export const readSession = (session: unknown): SessionInfo | null => {
  if (!asRecord(session)) return null;
  const id = asId(pickFirst(session, ['id', 'sessionId']));
  if (id === undefined) return null;

  const rawStatus = asText(pickFirst(session, ['status']), 'PENDING').trim().toUpperCase();
  // Status tidak dikenal diperlakukan PENDING => presensi tidak bisa dilakukan.
  const status: SessionStatus = isSessionStatus(rawStatus) ? rawStatus : 'PENDING';

  const assistant = pickFirst(session, ['assistantName', 'assistant', 'asistenName', 'asisten']);
  const assistantName = asRecord(assistant)
    ? asText(pickFirst(assistant, ['name', 'fullName']))
    : asText(assistant);

  return {
    id,
    status,
    courseName: asText(
      pickFirst(session, ['courseName', 'practicumName', 'practicum', 'subject', 'title', 'name']),
      'Praktikum'
    ),
    moduleCode: asText(pickFirst(session, ['moduleCode', 'sessionCode', 'code', 'module'])),
    moduleTitle: asText(pickFirst(session, ['moduleTitle', 'moduleName', 'topic'])),
    className: asText(pickFirst(session, ['className', 'class', 'kelas'])),
    date: pickFirst(session, ['date', 'sessionDate']),
    startTime: pickFirst(session, ['startTime', 'start', 'timeStart']),
    endTime: pickFirst(session, ['endTime', 'end', 'timeEnd']),
    room: asText(pickFirst(session, ['room', 'lab', 'location'])),
    assistantName,
    raw: session,
  };
};

export const readRecord = (record: unknown): AttendanceInfo | null => {
  if (!asRecord(record)) return null;
  const studentField = pickFirst(record, ['student']);
  return {
    id: asId(pickFirst(record, ['id', 'attendanceId'])),
    sessionId: asId(pickFirst(record, ['sessionId'])),
    studentId:
      asId(pickFirst(record, ['studentId'])) ??
      asId(pickFirst(studentField, ['id', 'studentId', 'nim'])),
    timestamp: pickFirst(record, ['timestamp', 'attendedAt', 'createdAt', 'checkInTime', 'time']),
    notes: asText(
      pickFirst(record, ['notes', 'note', 'tableNumber', 'deskNumber', 'seat', 'position'])
    ),
    raw: record,
  };
};

export const toSessions = (sessions: unknown): SessionInfo[] =>
  Array.isArray(sessions)
    ? sessions.map(readSession).filter((s): s is SessionInfo => s !== null)
    : [];

export const toRecords = (attendanceList: unknown): AttendanceInfo[] =>
  Array.isArray(attendanceList)
    ? attendanceList.map(readRecord).filter((r): r is AttendanceInfo => r !== null)
    : [];

export const findStudentRecord = (
  records: AttendanceInfo[],
  studentId: Id,
  sessionId: Id
): AttendanceInfo | null =>
  records.find((r) => sameId(r.studentId, studentId) && sameId(r.sessionId, sessionId)) ?? null;

export const checkAttended = (central: CentralState, studentId: Id, sessionId: Id): boolean => {
  if (findStudentRecord(toRecords(central.attendanceList), studentId, sessionId)) return true;
  if (typeof central.hasStudentAttended === 'function') {
    try {
      return Boolean(central.hasStudentAttended(sessionId, studentId));
    } catch {
      return false;
    }
  }
  return false;
};

const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];
const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000;

const pad = (n: number): string => String(n).padStart(2, '0');

interface JakartaParts {
  year: number;
  monthIndex: number;
  day: number;
  hour: number;
  minute: number;
  weekday: number;
}

export const getJakartaParts = (input: unknown): JakartaParts | null => {
  if (!isPresent(input)) return null;

  if (typeof input === 'string') {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input.trim());
    if (m) {
      const year = Number(m[1]);
      const monthIndex = Number(m[2]) - 1;
      const day = Number(m[3]);
      const check = new Date(Date.UTC(year, monthIndex, day));
      if (
        check.getUTCFullYear() !== year ||
        check.getUTCMonth() !== monthIndex ||
        check.getUTCDate() !== day
      ) {
        return null;
      }
      return { year, monthIndex, day, hour: 0, minute: 0, weekday: check.getUTCDay() };
    }
  }

  let ms: number;
  if (input instanceof Date) ms = input.getTime();
  else if (typeof input === 'string' || typeof input === 'number') ms = new Date(input).getTime();
  else return null;
  if (Number.isNaN(ms)) return null;

  const shifted = new Date(ms + JAKARTA_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    monthIndex: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    weekday: shifted.getUTCDay(),
  };
};

// "Rabu, 21 Oktober 2026"
export const formatDateID = (input: unknown): string | null => {
  const p = getJakartaParts(input);
  if (!p) return null;
  return `${DAYS[p.weekday]}, ${p.day} ${MONTHS[p.monthIndex]} ${p.year}`;
};

// "14:05 WIB"
export const formatTimeWIB = (input: unknown): string | null => {
  const p = getJakartaParts(input);
  if (!p) return null;
  return `${pad(p.hour)}:${pad(p.minute)} WIB`;
};

// '13:30' / '13.30' / ISO -> '13:30'
export const formatClock = (value: unknown): string | null => {
  if (!isPresent(value)) return null;
  if (typeof value === 'string') {
    const m = /^(\d{1,2})[:.](\d{2})$/.exec(value.trim());
    if (m) return `${pad(Number(m[1]))}:${m[2]}`;
  }
  const p = getJakartaParts(value);
  if (!p) return null;
  return `${pad(p.hour)}:${pad(p.minute)}`;
};

// "13:30 - 16:30 WIB"
export const formatTimeRange = (start: unknown, end: unknown): string | null => {
  const s = formatClock(start);
  const e = formatClock(end);
  if (s && e) return `${s} - ${e} WIB`;
  if (s) return `${s} WIB`;
  return null;
};

// Milidetik dari timestamp, NaN jika tidak valid (dipakai untuk mengurutkan riwayat).
export const timestampToMs = (value: unknown): number => {
  if (!isPresent(value)) return Number.NaN;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'string' || typeof value === 'number') return new Date(value).getTime();
  return Number.NaN;
};

const sessionSortValue = (session: SessionInfo): number => {
  const p = getJakartaParts(session.date ?? session.startTime);
  if (!p) return Number.MAX_SAFE_INTEGER;
  let hour = p.hour;
  let minute = p.minute;
  const clock = formatClock(session.startTime);
  if (clock) {
    const [h, m] = clock.split(':').map(Number);
    hour = h;
    minute = m;
  }
  return Date.UTC(p.year, p.monthIndex, p.day, hour, minute);
};

const STATUS_RANK: Record<SessionStatus, number> = { ACTIVE: 0, PENDING: 1, CLOSED: 2 };

// Sesi aktif paling atas, lalu yang akan datang, lalu yang sudah ditutup.
export const sortSessions = (list: SessionInfo[]): SessionInfo[] =>
  [...list].sort((a, b) => {
    const rank = STATUS_RANK[a.status] - STATUS_RANK[b.status];
    if (rank !== 0) return rank;
    return sessionSortValue(a) - sessionSortValue(b);
  });

export const interpretRecordResult = (result: unknown): { ok: boolean; message: string } => {
  if (result === false || result === null) {
    return { ok: false, message: MESSAGES.genericError };
  }
  const record = asRecord(result);
  if (record) {
    const failed =
      record.success === false || record.ok === false || isPresent(record.error);
    if (failed) {
      const message =
        (typeof record.message === 'string' && record.message) ||
        (typeof record.error === 'string' && record.error) ||
        MESSAGES.genericError;
      return { ok: false, message };
    }
  }
  return { ok: true, message: '' };
};

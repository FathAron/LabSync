/**
 * LABSYNC SCHEDULE CONFLICT DETECTION UTILITY
 *
 * Mendeteksi bentrok jadwal praktikum:
 * 1. Bentrok Laboratorium: Dua sesi menggunakan lab fisik yang sama pada waktu yang bertabrakan.
 * 2. Bentrok Kelompok: Kelompok praktikan yang sama memiliki dua sesi pada waktu yang bertabrakan.
 *
 * Fleksibilitas:
 * - Dua kelompok berbeda BOLEH praktikum pada waktu yang sama jika lab berbeda.
 * - Dua sesi dari mata kuliah yang sama TIDAK bentrok jika waktunya berbeda.
 */

import type { Session } from '../types/models';

export interface ScheduleConflictCheckInput {
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  room: string;
  laboratoryId?: string;
  groupCode: string;
  existingSessions: Session[];
  excludeSessionId?: string;
}

export interface ConflictCheckResult {
  hasConflict: boolean;
  labConflicts: string[];
  groupConflicts: string[];
  allWarnings: string[];
}

export const timeToMinutes = (timeStr?: string | null): number | null => {
  if (!timeStr) return null;
  const clean = timeStr.trim().replace('.', ':').replace(/\s*WIB/i, '');
  const match = /^(\d{1,2}):(\d{2})$/.exec(clean);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
};

export const isTimeOverlapping = (
  startA: number,
  endA: number,
  startB: number,
  endB: number
): boolean => {
  return startA < endB && startB < endA;
};

export const checkScheduleConflicts = ({
  date,
  startTime,
  endTime,
  room,
  laboratoryId,
  groupCode,
  existingSessions,
  excludeSessionId,
}: ScheduleConflictCheckInput): ConflictCheckResult => {
  const labConflicts: string[] = [];
  const groupConflicts: string[] = [];

  const targetStart = timeToMinutes(startTime);
  const targetEnd = timeToMinutes(endTime);

  if (targetStart === null || targetEnd === null || targetStart >= targetEnd) {
    return {
      hasConflict: false,
      labConflicts: [],
      groupConflicts: [],
      allWarnings: [],
    };
  }

  const normalizedDate = date.trim();
  const normalizedGroup = groupCode.trim().toUpperCase();
  const normalizedRoom = room.trim().toLowerCase();

  for (const s of existingSessions) {
    if (excludeSessionId && s.id === excludeSessionId) {
      continue;
    }

    // Periksa apakah tanggal sama
    if ((s.date || '').trim() !== normalizedDate) {
      continue;
    }

    const sStart = timeToMinutes(s.startTime);
    const sEnd = timeToMinutes(s.endTime);

    if (sStart === null || sEnd === null) {
      continue;
    }

    // Periksa apakah interval jam tumpang tindih
    if (!isTimeOverlapping(targetStart, targetEnd, sStart, sEnd)) {
      continue;
    }

    // 1. CEK BENTROK LABORATORIUM FISIK
    const isSameLabId =
      laboratoryId &&
      s.laboratoryId &&
      laboratoryId.trim() === s.laboratoryId.trim();

    const isSameRoom =
      normalizedRoom &&
      (s.room || '').trim().toLowerCase() === normalizedRoom;

    if (isSameLabId || isSameRoom) {
      labConflicts.push(
        `Laboratorium "${s.room || room}" sudah terjadwal untuk sesi "${s.courseName} (${s.className})" pada pukul ${s.startTime} - ${s.endTime} WIB.`
      );
    }

    // 2. CEK BENTROK LAB PRAKTIKUM
    const sGroup = (s.groupCode || s.className || '').trim().toUpperCase();
    if (normalizedGroup && sGroup === normalizedGroup) {
      groupConflicts.push(
        `Lab. "${groupCode}" sudah memiliki sesi lain "${s.courseName}" pada pukul ${s.startTime} - ${s.endTime} WIB.`
      );
    }
  }

  const allWarnings = [...labConflicts, ...groupConflicts];

  return {
    hasConflict: allWarnings.length > 0,
    labConflicts,
    groupConflicts,
    allWarnings,
  };
};

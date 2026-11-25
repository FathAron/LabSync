
import { useCallback, useMemo } from 'react';

import { useApp } from '../../context/AppContext';
import { usePracticum } from '../../hooks/usePracticum';

import type {
  HistoryEntry,
  Id,
  SubmitResult,
} from './types';

import {
  MESSAGES,
  SESSION_STATUS,
  findStudentRecord,
  readStudent,
  sameId,
  sameText,
  sortSessions,
  timestampToMs,
  toRecords,
  toSessions,
} from './studentUtils';

export const useStudentModule = () => {
  // Identitas praktikan berasal dari Firebase Auth/AppContext.
  const {
    currentStudent,
    notify,
  } = useApp();

  // Data jadwal dan presensi berasal dari Firestore.
  const {
    sessions: firestoreSessions,
    attendanceList,
    recordAttendance,
    hasStudentAttended,
    dataLoading,
  } = usePracticum();

  // ==========================================
  // STUDENT IDENTITY
  // ==========================================

  const student = useMemo(
    () => readStudent(currentStudent),
    [currentStudent]
  );

  // ==========================================
  // FIRESTORE DATA CONVERSION
  // ==========================================

  const allSessions = useMemo(
    () => toSessions(firestoreSessions),
    [firestoreSessions]
  );

  const records = useMemo(
    () => toRecords(attendanceList),
    [attendanceList]
  );

  // ==========================================
  // FILTER SESSIONS BY STUDENT CLASS / GROUP
  // ==========================================

  const mySessions = useMemo(() => {
    if (!student) return [];

    const studentClass = student.className.trim().toLowerCase();
    if (!studentClass) return sortSessions(allSessions);

    const filtered = allSessions.filter((session) => {
      const sessClass = session.className.trim().toLowerCase();
      const sessGroup = (session.groupCode || '').trim().toLowerCase();
      if (!sessClass && !sessGroup) return true;
      return (
        sessClass === studentClass ||
        sessGroup === studentClass ||
        (sessGroup && studentClass.includes(sessGroup)) ||
        (sessClass && studentClass.includes(sessClass))
      );
    });

    return sortSessions(filtered);
  }, [allSessions, student]);

  // ==========================================
  // STUDENT ATTENDANCE HISTORY
  // ==========================================

  const myRecords = useMemo(
    () =>
      student
        ? records.filter((record) =>
            sameId(record.studentId, student.id)
          )
        : [],
    [records, student]
  );

  const historyItems = useMemo<HistoryEntry[]>(() => {
    const sorted = [...myRecords].sort((a, b) => {
      const timeA = timestampToMs(a.timestamp);
      const timeB = timestampToMs(b.timestamp);

      const invalidA = Number.isNaN(timeA);
      const invalidB = Number.isNaN(timeB);

      if (invalidA && invalidB) return 0;
      if (invalidA) return 1;
      if (invalidB) return -1;

      return timeB - timeA;
    });

    return sorted.map((record) => ({
      record,
      session:
        allSessions.find((session) =>
          sameId(session.id, record.sessionId)
        ) ?? null,
    }));
  }, [myRecords, allSessions]);

  // ==========================================
  // SESSION STATUS
  // ==========================================

  const hasActiveSession = useMemo(
    () =>
      mySessions.some(
        (session) =>
          session.status === SESSION_STATUS.ACTIVE
      ),
    [mySessions]
  );

  // ==========================================
  // FIND ATTENDANCE RECORD
  // ==========================================

  const findRecord = useCallback(
    (sessionId: Id) =>
      student
        ? findStudentRecord(
            records,
            student.id,
            sessionId
          )
        : null,
    [records, student]
  );

  // ==========================================
  // CHECK ATTENDANCE STATUS
  // ==========================================

  const isAttended = useCallback(
    (sessionId: Id): boolean => {
      if (!student) return false;

      const alreadyInRecords = findStudentRecord(
        records,
        student.id,
        sessionId
      );

      if (alreadyInRecords) return true;

      return hasStudentAttended(
        String(sessionId),
        String(student.id)
      );
    },
    [records, student, hasStudentAttended]
  );

  // ==========================================
  // SUBMIT ATTENDANCE
  // ==========================================

  const submitAttendance = useCallback(
    async (
      sessionId: Id,
      notes: string
    ): Promise<SubmitResult> => {
      if (!student) {
        return {
          ok: false,
          closeModal: true,
          tone: 'error',
          message: MESSAGES.missingStudent,
        };
      }

      const session = allSessions.find((item) =>
        sameId(item.id, sessionId)
      );

      if (!session) {
        return {
          ok: false,
          closeModal: true,
          tone: 'error',
          message: MESSAGES.missingSession,
        };
      }

      // Periksa kesesuaian kelas.
      if (
        session.className !== '' &&
        student.className !== '' &&
        !sameText(
          session.className,
          student.className
        )
      ) {
        return {
          ok: false,
          closeModal: true,
          tone: 'error',
          message: MESSAGES.wrongClass,
        };
      }

      // Pastikan sesi sudah dibuka asisten.
      if (session.status !== SESSION_STATUS.ACTIVE) {
        return {
          ok: false,
          closeModal: true,
          tone: 'error',
          message: MESSAGES.sessionNotActive,
        };
      }

      // Periksa apakah praktikan sudah melakukan presensi.
      if (isAttended(session.id)) {
        return {
          ok: false,
          closeModal: true,
          tone: 'info',
          message: MESSAGES.alreadyAttended,
        };
      }

      try {
        // Pencatatan dilakukan langsung ke Firestore.
        const result = await recordAttendance(
          String(session.id),
          notes
        );

        if (!result.ok) {
          return {
            ok: false,
            closeModal:
              result.errorCode === 'ALREADY_EXISTS',
            tone:
              result.errorCode === 'ALREADY_EXISTS'
                ? 'info'
                : 'error',
            message: result.message,
          };
        }

        return {
          ok: true,
          tone: 'success',
          message: result.message || MESSAGES.success,
        };
      } catch {
        return {
          ok: false,
          tone: 'error',
          message: MESSAGES.genericError,
        };
      }
    },
    [
      student,
      allSessions,
      isAttended,
      recordAttendance,
    ]
  );

  // ==========================================
  // RETURN
  // ==========================================

  return {
    student,
    allSessions,
    mySessions,
    myRecords,
    historyItems,
    hasActiveSession,
    findRecord,
    isAttended,
    submitAttendance,
    externalNotify: notify,
    dataLoading,
  };
};

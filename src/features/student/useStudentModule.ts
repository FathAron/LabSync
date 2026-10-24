// TASK-04 - Hook utama modul praktikan.

import { useCallback, useMemo, useRef } from 'react';
import { useCentralState } from './centralState';
import type { HistoryEntry, Id, SessionInfo, SubmitResult } from './types';
import {
  MESSAGES,
  SESSION_STATUS,
  checkAttended,
  findStudentRecord,
  interpretRecordResult,
  readStudent,
  sameId,
  sameText,
  sortSessions,
  timestampToMs,
  toRecords,
  toSessions,
} from './studentUtils';

export const useStudentModule = () => {
  const central = useCentralState();

  const centralRef = useRef(central);
  centralRef.current = central;

  const student = useMemo(() => readStudent(central.currentStudent), [central.currentStudent]);
  const allSessions = useMemo(() => toSessions(central.sessions), [central.sessions]);
  const records = useMemo(() => toRecords(central.attendanceList), [central.attendanceList]);

  const mySessions = useMemo(() => {
    if (!student) return [];
    const filtered =
      student.className === ''
        ? allSessions
        : allSessions.filter((s) => s.className === '' || sameText(s.className, student.className));
    return sortSessions(filtered);
  }, [allSessions, student]);

  const myRecords = useMemo(
    () => (student ? records.filter((r) => sameId(r.studentId, student.id)) : []),
    [records, student]
  );

  const historyItems = useMemo<HistoryEntry[]>(() => {
    const sorted = [...myRecords].sort((a, b) => {
      const A = timestampToMs(a.timestamp);
      const B = timestampToMs(b.timestamp);
      const aBad = Number.isNaN(A);
      const bBad = Number.isNaN(B);
      if (aBad && bBad) return 0;
      if (aBad) return 1;
      if (bBad) return -1;
      return B - A;
    });
    return sorted.map((record) => ({
      record,
      session: allSessions.find((s) => sameId(s.id, record.sessionId)) ?? null,
    }));
  }, [myRecords, allSessions]);

  const hasActiveSession = mySessions.some((s) => s.status === SESSION_STATUS.ACTIVE);

  const findRecord = useCallback(
    (sessionId: Id) => (student ? findStudentRecord(records, student.id, sessionId) : null),
    [records, student]
  );

  const isAttended = useCallback(
    (sessionId: Id) => (student ? checkAttended(central, student.id, sessionId) : false),
    [central, student]
  );

  const submitAttendance = useCallback(
    async (sessionId: Id, notes: string): Promise<SubmitResult> => {
      const latest = centralRef.current;

      const currentStudent = readStudent(latest.currentStudent);
      if (!currentStudent) {
        return { ok: false, closeModal: true, tone: 'error', message: MESSAGES.missingStudent };
      }

      const session: SessionInfo | undefined = toSessions(latest.sessions).find((s) =>
        sameId(s.id, sessionId)
      );
      if (!session) {
        return { ok: false, closeModal: true, tone: 'error', message: MESSAGES.missingSession };
      }
      if (session.className !== '' && !sameText(session.className, currentStudent.className)) {
        return { ok: false, closeModal: true, tone: 'error', message: MESSAGES.wrongClass };
      }
      if (session.status !== SESSION_STATUS.ACTIVE) {
        return { ok: false, closeModal: true, tone: 'error', message: MESSAGES.sessionNotActive };
      }
      if (checkAttended(latest, currentStudent.id, session.id)) {
        return { ok: false, closeModal: true, tone: 'info', message: MESSAGES.alreadyAttended };
      }
      if (typeof latest.recordAttendance !== 'function') {
        return { ok: false, message: MESSAGES.recordUnavailable };
      }

      try {
        const result = await latest.recordAttendance(session.id, currentStudent.raw, notes);
        const outcome = interpretRecordResult(result);
        if (!outcome.ok) return { ok: false, message: outcome.message };
        return { ok: true, tone: 'success', message: MESSAGES.success };
      } catch {
        return { ok: false, message: MESSAGES.genericError };
      }
    },
    []
  );

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
    externalNotify: central.notify,
  };
};

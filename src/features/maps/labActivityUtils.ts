import {
  formatClock,
  getJakartaParts,
} from '../student/studentUtils';

import type {
  Laboratory,
  LaboratoryActivitySummary,
  Session,
} from '../../types/models';

const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000;

const normalizeText = (value: string): string =>
  value.trim().toLowerCase();

export const isSessionInLaboratory = (
  session: Session,
  laboratory: Laboratory
): boolean => {
  if (session.laboratoryId?.trim()) {
    return session.laboratoryId.trim() === laboratory.id;
  }

  return (
    normalizeText(session.room) ===
    normalizeText(laboratory.name)
  );
};

const parseSessionTimeMs = (
  dateStr: string,
  timeStr: string
): number | null => {
  const parts = getJakartaParts(dateStr);
  const clock = formatClock(timeStr);

  if (!parts || !clock) {
    return null;
  }

  const [hour, minute] = clock.split(':').map(Number);

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return null;
  }

  return (
    Date.UTC(parts.year, parts.monthIndex, parts.day, hour, minute) -
    JAKARTA_OFFSET_MS
  );
};

const sessionStartMs = (session: Session): number =>
  parseSessionTimeMs(session.date, session.startTime) ??
  Number.MAX_SAFE_INTEGER;

const sessionEndMs = (session: Session): number =>
  parseSessionTimeMs(session.date, session.endTime) ??
  Number.MAX_SAFE_INTEGER;

export const getLaboratoryActivitySummary = (
  laboratory: Laboratory,
  sessions: Session[],
  nowMs: number = Date.now()
): LaboratoryActivitySummary => {
  const matched = sessions.filter((session) =>
    isSessionInLaboratory(session, laboratory)
  );

  const activeSessions = matched
    .filter((session) => session.status === 'ACTIVE')
    .sort((a, b) => {
      const aInWindow =
        sessionStartMs(a) <= nowMs && nowMs <= sessionEndMs(a);
      const bInWindow =
        sessionStartMs(b) <= nowMs && nowMs <= sessionEndMs(b);

      if (aInWindow !== bInWindow) {
        return aInWindow ? -1 : 1;
      }

      return sessionStartMs(a) - sessionStartMs(b);
    });

  const ongoingSession = activeSessions[0] ?? null;

  const upcomingSessions = matched
    .filter(
      (session) =>
        session.status === 'PENDING' &&
        session.id !== ongoingSession?.id &&
        sessionEndMs(session) >= nowMs
    )
    .sort((a, b) => sessionStartMs(a) - sessionStartMs(b));

  const nextSession = upcomingSessions[0] ?? null;

  return {
    laboratory,
    ongoingSession,
    nextSession,
    upcomingSessions,
  };
};

export const formatDistanceMeters = (
  meters: number
): string => {
  if (!Number.isFinite(meters) || meters < 0) {
    return '-';
  }

  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }

  return `${(meters / 1000).toFixed(2)} km`;
};

const SCHEDULE_FIELDS = [
  'courseName',
  'courseCode',
  'moduleCode',
  'moduleTitle',
  'className',
  'class',
  'day',
  'date',
  'startTime',
  'endTime',
  'time',
  'room',
  'laboratoryId',
  'laboratoryName',
];

const normalize = (value) => String(value ?? '').trim().toUpperCase();

const normalizeField = (value) => {
  if (value === null || value === undefined) return '';
  return String(value).trim();
};

const hasScheduleDetails = (session) =>
  SCHEDULE_FIELDS.some((field) => normalizeField(session?.[field]) !== '');

const hasScheduleChanged = (previousSession, currentSession) => {
  if (!currentSession) return false;
  if (!previousSession) return hasScheduleDetails(currentSession);

  return SCHEDULE_FIELDS.some(
    (field) =>
      normalizeField(previousSession[field]) !==
      normalizeField(currentSession[field])
  );
};

const shouldNotifySessionOpened = (previousSession, currentSession) =>
  normalize(currentSession?.status) === 'ACTIVE' &&
  normalize(previousSession?.status) !== 'ACTIVE';

const shouldNotifyLeaveReviewed = (previousLeave, currentLeave) =>
  normalize(previousLeave?.status) === 'PENDING' &&
  ['APPROVED', 'REJECTED'].includes(normalize(currentLeave?.status));

const getAffectedClassNames = (previousSession, currentSession) => {
  const values = [
    previousSession?.className || previousSession?.class,
    currentSession?.className || currentSession?.class,
  ]
    .map((value) => String(value ?? '').trim())
    .filter(Boolean);

  const unique = new Map();
  for (const value of values) unique.set(normalize(value), value);
  return [...unique.values()];
};

const makeScheduleEventId = (sessionId, updateTimeMillis) =>
  `session-${sessionId}-schedule-${updateTimeMillis}`;

const makeSessionOpenedEventId = (sessionId, updateTimeMillis) =>
  `session-${sessionId}-opened-${updateTimeMillis}`;

const buildScheduleNotification = ({
  sessionId,
  session,
  previousSession,
}) => {
  const className = String(
    session?.className || session?.class || 'kelas terkait'
  ).trim();
  const courseName = String(session?.courseName || 'Praktikum').trim();
  const moduleCode = String(session?.moduleCode || '').trim();
  const date = [session?.day, session?.date]
    .map((value) => String(value ?? '').trim())
    .filter(Boolean)
    .join(', ');
  const time = session?.startTime && session?.endTime
    ? `${session.startTime}–${session.endTime}`
    : String(session?.time || '').trim();
  const location = String(
    session?.laboratoryName || session?.room || 'lokasi belum ditentukan'
  ).trim();
  const sessionName = [courseName, moduleCode]
    .filter(Boolean)
    .join(' - ');
  const details = [date, time, location]
    .filter(Boolean)
    .join(' • ');
  const isNewSchedule = !previousSession;

  return {
    title: isNewSchedule
      ? 'Jadwal Praktikum Baru'
      : 'Jadwal Praktikum Diperbarui',
    body: isNewSchedule
      ? `${sessionName} untuk kelas ${className} tersedia${details ? `: ${details}` : '.'}`
      : `${sessionName} untuk kelas ${className} diperbarui${details ? `: ${details}` : '.'}`,
    data: {
      type: 'SCHEDULE_CHANGED',
      sessionId,
      className,
      url: '/student',
    },
  };
};

module.exports = {
  SCHEDULE_FIELDS,
  normalize,
  hasScheduleDetails,
  hasScheduleChanged,
  shouldNotifySessionOpened,
  shouldNotifyLeaveReviewed,
  getAffectedClassNames,
  makeScheduleEventId,
  makeSessionOpenedEventId,
  buildScheduleNotification,
};

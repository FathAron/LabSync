const test = require('node:test');
const assert = require('node:assert/strict');

const {
  normalize,
  hasScheduleDetails,
  hasScheduleChanged,
  shouldNotifySessionOpened,
  shouldNotifyLeaveReviewed,
  getAffectedClassNames,
  makeScheduleEventId,
  makeSessionOpenedEventId,
  buildScheduleNotification,
} = require('../notificationLogic');

test('normalize trims and compares class/status values consistently', () => {
  assert.equal(normalize(' if-26-a '), 'IF-26-A');
  assert.equal(normalize(null), '');
});

test('hasScheduleDetails ignores an empty session', () => {
  assert.equal(hasScheduleDetails({ status: 'PENDING' }), false);
  assert.equal(hasScheduleDetails({ room: 'Lab 1' }), true);
});

test('new schedule is recognized as a schedule event', () => {
  assert.equal(
    hasScheduleChanged(null, {
      className: 'IF-26-A',
      date: '2026-11-25',
      startTime: '08:00',
      endTime: '10:00',
    }),
    true
  );
});

test('schedule changes are detected for date, time, room, class, and laboratory', () => {
  const previous = {
    courseName: 'Pemrograman Mobile',
    className: 'IF-26-A',
    date: '2026-11-25',
    startTime: '08:00',
    endTime: '10:00',
    room: 'Lab 1',
    laboratoryId: 'lab-a',
    status: 'PENDING',
  };

  assert.equal(
    hasScheduleChanged(previous, { ...previous, status: 'ACTIVE' }),
    false,
    'status-only changes must not be classified as schedule changes'
  );
  assert.equal(
    hasScheduleChanged(previous, { ...previous, startTime: '09:00' }),
    true
  );
  assert.equal(
    hasScheduleChanged(previous, { ...previous, room: 'Lab 2' }),
    true
  );
  assert.equal(
    hasScheduleChanged(previous, { ...previous, className: 'IF-26-B' }),
    true
  );
  assert.equal(
    hasScheduleChanged(previous, { ...previous, laboratoryId: 'lab-b' }),
    true
  );
});

test('session-open notification only fires on a transition into ACTIVE', () => {
  assert.equal(
    shouldNotifySessionOpened({ status: 'PENDING' }, { status: 'ACTIVE' }),
    true
  );
  assert.equal(
    shouldNotifySessionOpened({ status: 'ACTIVE' }, { status: 'ACTIVE' }),
    false
  );
  assert.equal(
    shouldNotifySessionOpened({ status: 'CLOSED' }, { status: 'PENDING' }),
    false
  );
});

test('leave notification only fires when PENDING becomes APPROVED or REJECTED', () => {
  assert.equal(
    shouldNotifyLeaveReviewed({ status: 'PENDING' }, { status: 'APPROVED' }),
    true
  );
  assert.equal(
    shouldNotifyLeaveReviewed({ status: 'PENDING' }, { status: 'REJECTED' }),
    true
  );
  assert.equal(
    shouldNotifyLeaveReviewed({ status: 'APPROVED' }, { status: 'REJECTED' }),
    false
  );
});

test('class changes notify both the previous and the new class', () => {
  assert.deepEqual(
    getAffectedClassNames(
      { className: 'IF-26-A' },
      { className: 'IF-26-B' }
    ),
    ['IF-26-A', 'IF-26-B']
  );
  assert.deepEqual(
    getAffectedClassNames(
      { className: 'if-26-a' },
      { className: 'IF-26-A' }
    ),
    ['IF-26-A']
  );
});

test('schedule and session-open event IDs are stable per Firestore update version', () => {
  assert.equal(
    makeScheduleEventId('session-1', 12345),
    'session-session-1-schedule-12345'
  );
  assert.equal(
    makeSessionOpenedEventId('session-1', 12345),
    'session-session-1-opened-12345'
  );
});

test('schedule notification payload opens the current schedule tab', () => {
  const notification = buildScheduleNotification({
    sessionId: 'session-1',
    session: {
      courseName: 'Pemrograman Mobile',
      moduleCode: 'MOD-02',
      className: 'IF-26-A',
      day: 'Rabu',
      date: '2026-11-25',
      startTime: '08:00',
      endTime: '10:00',
      room: 'Lab 1',
    },
    previousSession: { date: '2026-11-24' },
  });

  assert.equal(notification.title, 'Jadwal Praktikum Diperbarui');
  assert.match(notification.body, /IF-26-A/);
  assert.match(notification.body, /08:00–10:00/);
  assert.deepEqual(notification.data, {
    type: 'SCHEDULE_CHANGED',
    sessionId: 'session-1',
    className: 'IF-26-A',
    url: '/student',
  });
});

test('new schedule notification is labelled as a new schedule', () => {
  const notification = buildScheduleNotification({
    sessionId: 'session-2',
    session: { className: 'IF-26-B', courseName: 'Jaringan Komputer' },
    previousSession: null,
  });

  assert.equal(notification.title, 'Jadwal Praktikum Baru');
});

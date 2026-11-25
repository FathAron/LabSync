const {
  applicationDefault,
  getApps,
  initializeApp,
} = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const {
  normalize,
  hasScheduleChanged,
  shouldNotifySessionOpened,
  shouldNotifyLeaveReviewed,
  getAffectedClassNames,
  makeScheduleEventId,
  makeSessionOpenedEventId,
  buildScheduleNotification,
} = require('./notificationLogic');

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const DISPATCH_COLLECTION = 'notificationDispatches';
const MAX_MESSAGES_PER_REQUEST = 100;
const REQUEST_TIMEOUT_MS = 20_000;
const STALE_SENDING_LOCK_MS = 5 * 60 * 1000;

let db;

const errorMessage = (error) =>
  error instanceof Error ? error.message : String(error);

const isExpoToken = (token) =>
  typeof token === 'string' &&
  /^Expo(nent)?PushToken\[[^\]]+\]$/.test(token);

const initializeFirebase = () => {
  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GCLOUD_PROJECT ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    'labsync-c8e1a';

  if (!projectId) {
    throw new Error(
      'FIREBASE_PROJECT_ID belum diatur. Lihat local-notification-backend/README.md.'
    );
  }

  const app = getApps().length > 0
    ? getApps()[0]
    : initializeApp({
        credential: applicationDefault(),
        projectId,
      });

  db = getFirestore(app);
  return projectId;
};

const getTokensFromUser = async (userDoc) => {
  const snapshot = await userDoc.ref
    .collection('pushTokens')
    .where('enabled', '==', true)
    .get();

  return snapshot.docs
    .map((tokenDoc) => ({
      token: tokenDoc.get('token'),
      tokenRef: tokenDoc.ref,
    }))
    .filter((item) => isExpoToken(item.token));
};

const getTokensForClassNames = async (classNames) => {
  const requestedClasses = new Map();

  for (const value of classNames) {
    const raw = String(value ?? '').trim();
    if (raw) requestedClasses.set(normalize(raw), raw);
  }

  if (requestedClasses.size === 0) return [];

  const queryValues = new Set();
  for (const raw of requestedClasses.values()) {
    queryValues.add(raw);
    queryValues.add(normalize(raw));
  }

  const queries = [];
  for (const field of ['className', 'class']) {
    for (const value of queryValues) {
      queries.push(
        db.collection('users').where(field, '==', value).get()
      );
    }
  }

  const snapshots = await Promise.all(queries);
  const users = new Map();

  for (const snapshot of snapshots) {
    for (const userDoc of snapshot.docs) users.set(userDoc.id, userDoc);
  }

  const tokens = [];
  const seenTokens = new Set();

  for (const userDoc of users.values()) {
    const user = userDoc.data();
    if (user.role !== 'student') continue;

    const userClasses = new Set([
      normalize(user.className),
      normalize(user.class),
    ].filter(Boolean));

    const isRecipient = [...requestedClasses.keys()].some((className) =>
      userClasses.has(className)
    );

    if (!isRecipient) continue;

    const userTokens = await getTokensFromUser(userDoc);
    for (const item of userTokens) {
      if (seenTokens.has(item.token)) continue;
      seenTokens.add(item.token);
      tokens.push(item);
    }
  }

  // Fallback: Jika tidak ada token cocok berdasarkan nama kelas spesifik,
  // ambil dari seluruh praktikan aktif untuk memastikan notifikasi tetap terkirim
  if (tokens.length === 0) {
    try {
      const allStudents = await db
        .collection('users')
        .where('role', '==', 'student')
        .get();
      for (const userDoc of allStudents.docs) {
        const userTokens = await getTokensFromUser(userDoc);
        for (const item of userTokens) {
          if (!seenTokens.has(item.token)) {
            seenTokens.add(item.token);
            tokens.push(item);
          }
        }
      }
    } catch (err) {
      console.warn('[RECIPIENT] Fallback error:', err.message);
    }
  }

  console.log(
    `[RECIPIENT] Class(es) ${[...requestedClasses.values()].join(', ')}: ${tokens.length} active token(s).`
  );

  return tokens;
};

const getTokensForStudent = async (uid) => {
  if (!uid) return [];

  const userDoc = await db.collection('users').doc(uid).get();
  if (!userDoc.exists || userDoc.get('role') !== 'student') return [];

  return getTokensFromUser(userDoc);
};

const sendExpoPush = async (tokens, notification) => {
  let accepted = 0;
  let failed = 0;
  const errors = [];

  for (
    let start = 0;
    start < tokens.length;
    start += MAX_MESSAGES_PER_REQUEST
  ) {
    const batch = tokens.slice(start, start + MAX_MESSAGES_PER_REQUEST);
    const messages = batch.map((item) => ({
      to: item.token,
      title: notification.title,
      body: notification.body,
      data: notification.data,
      priority: 'high',
      channelId: 'default',
    }));

    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    let result;
    try {
      result = await response.json();
    } catch {
      throw new Error(`Expo Push Service mengembalikan respons tidak valid (HTTP ${response.status}).`);
    }

    if (!response.ok) {
      throw new Error(
        `Expo HTTP ${response.status}: ${JSON.stringify(result.errors || result)}`
      );
    }

    const tickets = Array.isArray(result.data)
      ? result.data
      : result.data
        ? [result.data]
        : [];

    for (let index = 0; index < batch.length; index += 1) {
      const ticket = tickets[index];

      if (ticket?.status === 'ok') {
        accepted += 1;
        continue;
      }

      failed += 1;
      const code = ticket?.details?.error || 'UNKNOWN';
      errors.push({
        code,
        message: ticket?.message || 'Push notification gagal dikirim.',
      });

      if (code === 'DeviceNotRegistered') {
        await batch[index].tokenRef.set(
          {
            enabled: false,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }
    }
  }

  return { accepted, failed, errors };
};

const dispatchNotification = async (event) => {
  const ref = db.collection(DISPATCH_COLLECTION).doc(event.eventId);
  const claimed = await db.runTransaction(async (transaction) => {
    const existing = await transaction.get(ref);
    const status = existing.exists ? existing.get('status') : '';
    const updatedAt = existing.exists ? existing.get('updatedAt') : null;
    const updatedAtMillis =
      typeof updatedAt?.toMillis === 'function' ? updatedAt.toMillis() : 0;
    const staleSending =
      status === 'SENDING' &&
      Date.now() - updatedAtMillis > STALE_SENDING_LOCK_MS;

    if (
      ['SENT', 'PARTIAL', 'NO_RECIPIENTS', 'COMPLETED'].includes(status) ||
      ((status === 'SENDING' || status === 'IN_PROGRESS') && !staleSending)
    ) {
      return false;
    }

    transaction.set(
      ref,
      {
        eventType: event.eventType,
        sourceId: event.sourceId,
        status: 'SENDING',
        attempts: (existing.exists ? existing.get('attempts') || 0 : 0) + 1,
        createdAt: existing.exists
          ? existing.get('createdAt') || FieldValue.serverTimestamp()
          : FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return true;
  });

  if (!claimed) {
    console.log(`[DUPLICATE] ${event.eventId} already processed or processing.`);
    return;
  }

  try {
    const recipients = await event.resolveRecipients();

    if (!recipients.length) {
      await ref.set(
        {
          status: 'NO_RECIPIENTS',
          recipientCount: 0,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      console.warn(`[SKIPPED] No active recipient for ${event.eventId}.`);
      return;
    }

    const result = await sendExpoPush(recipients, event.notification);
    const status = result.accepted === recipients.length
      ? 'SENT'
      : result.accepted > 0
        ? 'PARTIAL'
        : 'FAILED';

    await ref.set(
      {
        status,
        recipientCount: recipients.length,
        acceptedCount: result.accepted,
        failedCount: result.failed,
        errors: result.errors.slice(0, 10),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    console.log(
      `[${status}] ${event.eventId}: accepted=${result.accepted}, failed=${result.failed}.`
    );
  } catch (error) {
    await ref.set(
      {
        status: 'FAILED',
        error: errorMessage(error),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    console.error(`[FAILED] ${event.eventId}:`, errorMessage(error));
  }
};

const getUpdateTimeKey = (documentSnapshot) => {
  const updateTime = documentSnapshot.updateTime;

  if (
    typeof updateTime?.seconds === 'number' &&
    typeof updateTime?.nanoseconds === 'number'
  ) {
    return `${updateTime.seconds}-${updateTime.nanoseconds}`;
  }

  return String(
    typeof updateTime?.toMillis === 'function'
      ? updateTime.toMillis()
      : Date.now()
  );
};

const handleSessionOpened = async (sessionId, session, updateTimeMillis) => {
  const className = String(session.className || session.class || '').trim();
  const candidateClasses = [
    session.className,
    session.class,
    session.groupCode,
    session.mainClass,
  ].filter(Boolean);

  const courseName = session.courseName || 'Praktikum';
  const moduleCode = session.moduleCode || '';

  // Periksa apakah notifikasi sudah dikirim langsung oleh aplikasi mobile (client-side)
  const clientDispatchSnap = await db
    .collection(DISPATCH_COLLECTION)
    .doc(`session-${sessionId}-opened`)
    .get();

  if (
    clientDispatchSnap.exists &&
    ['SENT', 'COMPLETED', 'PARTIAL'].includes(clientDispatchSnap.get('status'))
  ) {
    console.log(
      `[DUPLICATE] Sesi ${sessionId} sudah dikirimkan langsung oleh aplikasi mobile.`
    );
    return;
  }

  await dispatchNotification({
    eventId: makeSessionOpenedEventId(sessionId, updateTimeMillis),
    eventType: 'SESSION_OPENED',
    sourceId: sessionId,
    resolveRecipients: () => getTokensForClassNames(candidateClasses.length ? candidateClasses : [className]),
    notification: {
      title: 'Sesi Praktikum Dibuka',
      body: `${courseName}${moduleCode ? ` - ${moduleCode}` : ''} untuk kelas ${className} telah dibuka.`,
      data: {
        type: 'SESSION_OPENED',
        sessionId,
        className,
        url: `/student?sessionId=${encodeURIComponent(sessionId)}`,
      },
    },
  });
};

const handleSessionScheduleChanged = async (
  sessionId,
  session,
  previousSession,
  updateTimeMillis
) => {
  const classNames = getAffectedClassNames(previousSession, session);
  if (!classNames.length) {
    console.warn(`[SKIPPED] Session ${sessionId} has no class recipient.`);
    return;
  }

  await dispatchNotification({
    eventId: makeScheduleEventId(sessionId, updateTimeMillis),
    eventType: 'SCHEDULE_CHANGED',
    sourceId: sessionId,
    resolveRecipients: () => getTokensForClassNames(classNames),
    notification: buildScheduleNotification({
      sessionId,
      session,
      previousSession,
    }),
  });
};

const handleLeaveReviewed = async (leaveId, leave) => {
  const decision = normalize(leave.status);
  if (!['APPROVED', 'REJECTED'].includes(decision)) return;

  const approved = decision === 'APPROVED';

  await dispatchNotification({
    eventId: `leave-${leaveId}-${decision.toLowerCase()}`,
    eventType: `LEAVE_${decision}`,
    sourceId: leaveId,
    resolveRecipients: () => getTokensForStudent(leave.studentId),
    notification: {
      title: approved
        ? 'Pengajuan Izin Disetujui'
        : 'Pengajuan Izin Ditolak',
      body: approved
        ? 'Pengajuan izin praktikum kamu telah disetujui.'
        : 'Pengajuan izin praktikum kamu telah ditolak.',
      data: {
        type: `LEAVE_${decision}`,
        leaveId,
        url: `/student/leave?leaveId=${encodeURIComponent(leaveId)}`,
      },
    },
  });
};

const watchSessions = () => {
  const previousDocuments = new Map();
  let initialized = false;
  let resolveReady;
  const ready = new Promise((resolve) => {
    resolveReady = resolve;
  });

  const unsubscribe = db.collection('sessions').onSnapshot(
    (snapshot) => {
      if (!initialized) {
        snapshot.docs.forEach((document) => {
          previousDocuments.set(document.id, document.data());
        });
        initialized = true;
        console.log(
          `[SESSION LISTENER] Initial snapshot loaded: ${snapshot.size} document(s).`
        );
        resolveReady();
        return;
      }

      for (const change of snapshot.docChanges()) {
        const sessionId = change.doc.id;

        if (change.type === 'removed') {
          previousDocuments.delete(sessionId);
          continue;
        }

        const currentSession = change.doc.data();
        const previousSession = previousDocuments.get(sessionId) || null;
        previousDocuments.set(sessionId, currentSession);
        const updateTimeMillis = getUpdateTimeKey(change.doc);

        if (change.type === 'added') {
          if (normalize(currentSession.status) === 'ACTIVE') {
            void handleSessionOpened(
              sessionId,
              currentSession,
              updateTimeMillis
            ).catch((error) => {
              console.error('[SESSION OPENED]', errorMessage(error));
            });
          } else if (hasScheduleChanged(null, currentSession)) {
            void handleSessionScheduleChanged(
              sessionId,
              currentSession,
              null,
              updateTimeMillis
            ).catch((error) => {
              console.error('[SCHEDULE CREATED]', errorMessage(error));
            });
          }

          continue;
        }

        if (shouldNotifySessionOpened(previousSession, currentSession)) {
          void handleSessionOpened(
            sessionId,
            currentSession,
            updateTimeMillis
          ).catch((error) => {
            console.error('[SESSION OPENED]', errorMessage(error));
          });
        }

        if (hasScheduleChanged(previousSession, currentSession)) {
          void handleSessionScheduleChanged(
            sessionId,
            currentSession,
            previousSession,
            updateTimeMillis
          ).catch((error) => {
            console.error('[SCHEDULE CHANGED]', errorMessage(error));
          });
        }
      }
    },
    (error) => {
      console.error('[SESSION LISTENER] Firestore listener error:', errorMessage(error));
      if (!initialized) {
        initialized = true;
        resolveReady();
      }
    }
  );

  return { unsubscribe, ready };
};

const watchLeaveRequests = () => {
  const previousDocuments = new Map();
  let initialized = false;
  let resolveReady;
  const ready = new Promise((resolve) => {
    resolveReady = resolve;
  });

  const unsubscribe = db.collection('leaveRequests').onSnapshot(
    (snapshot) => {
      if (!initialized) {
        snapshot.docs.forEach((document) => {
          previousDocuments.set(document.id, document.data());
        });
        initialized = true;
        console.log(
          `[LEAVE LISTENER] Initial snapshot loaded: ${snapshot.size} document(s).`
        );
        resolveReady();
        return;
      }

      for (const change of snapshot.docChanges()) {
        const leaveId = change.doc.id;

        if (change.type === 'removed') {
          previousDocuments.delete(leaveId);
          continue;
        }

        const currentLeave = change.doc.data();
        const previousLeave = previousDocuments.get(leaveId) || null;
        previousDocuments.set(leaveId, currentLeave);

        if (shouldNotifyLeaveReviewed(previousLeave, currentLeave)) {
          void handleLeaveReviewed(leaveId, currentLeave).catch((error) => {
            console.error('[LEAVE REVIEWED]', errorMessage(error));
          });
        }
      }
    },
    (error) => {
      console.error('[LEAVE LISTENER] Firestore listener error:', errorMessage(error));
      if (!initialized) {
        initialized = true;
        resolveReady();
      }
    }
  );

  return { unsubscribe, ready };
};

const start = async () => {
  const projectId = initializeFirebase();

  console.log('====================================');
  console.log(' LABSYNC NOTIFICATION BACKEND');
  console.log(` Project: ${projectId}`);
  console.log(' Provider: Expo Push Service');
  console.log('====================================');

  const watchers = [watchSessions(), watchLeaveRequests()];
  await Promise.all(watchers.map((watcher) => watcher.ready));

  console.log('[READY] Backend is listening for notification events.');
  console.log('[INFO] Existing sessions and leave requests will not be resent.');

  let shuttingDown = false;
  const shutdown = () => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log('\n[STOP] Closing Firestore listeners...');
    watchers.forEach((watcher) => watcher.unsubscribe());
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
};

if (require.main === module) {
  start().catch((error) => {
    console.error('[FATAL]', errorMessage(error));
    process.exit(1);
  });
}

module.exports = {
  start,
  initializeFirebase,
  getTokensForClassNames,
  getTokensForStudent,
  sendExpoPush,
  dispatchNotification,
  handleSessionOpened,
  handleSessionScheduleChanged,
  handleLeaveReviewed,
  watchSessions,
  watchLeaveRequests,
};

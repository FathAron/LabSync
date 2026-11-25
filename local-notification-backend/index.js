const fs = require('fs');
const path = require('path');
const {
  cert,
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
  isClassMatching,
} = require('./notificationLogic');

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_RECEIPTS_URL = 'https://exp.host/--/api/v2/push/getReceipts';
const DISPATCH_COLLECTION = 'notificationDispatches';
const MAX_MESSAGES_PER_REQUEST = 100;
const REQUEST_TIMEOUT_MS = 20_000;
const STALE_SENDING_LOCK_MS = 5 * 60 * 1000;

let db;

const errorMessage = (error) =>
  error instanceof Error ? error.message : String(error);

const isExpoToken = (token) =>
  typeof token === 'string' &&
  /^(Expo(nent)?PushToken)\[[^\]]+\]$/.test(token.trim());

/**
 * Mencoba membaca file env jika belum diatur di environment sistem.
 */
const tryLoadEnvFiles = () => {
  const candidateFiles = [
    path.resolve(__dirname, '.env'),
    path.resolve(__dirname, '../.env.local'),
    path.resolve(__dirname, '../.env'),
  ];

  for (const envPath of candidateFiles) {
    if (fs.existsSync(envPath)) {
      try {
        const content = fs.readFileSync(envPath, 'utf8');
        for (const line of content.split('\n')) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          const equalIndex = trimmed.indexOf('=');
          if (equalIndex > 0) {
            const key = trimmed.slice(0, equalIndex).trim();
            const value = trimmed.slice(equalIndex + 1).trim().replace(/^["']|["']$/g, '');
            if (!process.env[key]) {
              process.env[key] = value;
            }
            if (key === 'EXPO_PUBLIC_FIREBASE_PROJECT_ID' && !process.env.FIREBASE_PROJECT_ID) {
              process.env.FIREBASE_PROJECT_ID = value;
            }
          }
        }
      } catch {
        // Abaikan jika gagal membaca file env opsional
      }
    }
  }
};

/**
 * Mencari kredensial service account JSON jika tersedia di folder atau env.
 */
const findServiceAccount = () => {
  const envPath =
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

  if (envPath && fs.existsSync(envPath)) {
    try {
      return JSON.parse(fs.readFileSync(envPath, 'utf8'));
    } catch {
      // Abaikan jika parsing gagal
    }
  }

  const directNames = [
    'service-account.json',
    'serviceAccountKey.json',
    'serviceAccount.json',
    'firebase-service-account.json',
  ];

  for (const name of directNames) {
    const localFile = path.resolve(__dirname, name);
    if (fs.existsSync(localFile)) {
      try {
        return JSON.parse(fs.readFileSync(localFile, 'utf8'));
      } catch {
        // Abaikan
      }
    }
    const parentFile = path.resolve(__dirname, '..', name);
    if (fs.existsSync(parentFile)) {
      try {
        return JSON.parse(fs.readFileSync(parentFile, 'utf8'));
      } catch {
        // Abaikan
      }
    }
  }

  return null;
};

const initializeFirebase = () => {
  tryLoadEnvFiles();

  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GCLOUD_PROJECT ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    'labsync-b6934';

  const serviceAccount = findServiceAccount();

  let credential;
  let authType = '';
  if (serviceAccount) {
    credential = cert(serviceAccount);
    authType = `Service Account (${serviceAccount.client_email || 'loaded'})`;
  } else {
    credential = applicationDefault();
    authType = 'Application Default Credentials (ADC)';
  }

  const app =
    getApps().length > 0
      ? getApps()[0]
      : initializeApp({
          credential,
          projectId,
        });

  db = getFirestore(app);
  return { projectId, authType };
};

/**
 * Mengambil push token aktif untuk satu akun praktikan.
 */
const getTokensFromUser = async (userDoc) => {
  const userRef = userDoc.ref || db.collection('users').doc(userDoc.id);
  const snapshot = await userRef.collection('pushTokens').get();

  const tokens = snapshot.docs
    .filter((tokenDoc) => tokenDoc.get('enabled') !== false)
    .map((tokenDoc) => ({
      token: String(tokenDoc.get('token') || '').trim(),
      tokenRef: tokenDoc.ref,
    }))
    .filter((item) => isExpoToken(item.token));

  // Fallback jika token tersimpan langsung di dokumen user
  const userData = typeof userDoc.data === 'function' ? userDoc.data() : userDoc;
  const directToken = String(userData?.pushToken || userData?.expoPushToken || '').trim();
  if (isExpoToken(directToken) && !tokens.some((t) => t.token === directToken)) {
    tokens.push({
      token: directToken,
      tokenRef: userRef,
    });
  }

  return tokens;
};

/**
 * Mengambil push tokens untuk seluruh praktikan yang cocok dengan kelas target.
 */
const getTokensForClassNames = async (classNames) => {
  const targetClasses = (classNames || [])
    .map((c) => String(c ?? '').trim())
    .filter(Boolean);

  if (targetClasses.length === 0) return [];

  // Ambil semua praktikan (role student atau praktikan, abaikan assistant)
  const usersSnapshot = await db.collection('users').get();

  const matchingUsers = [];
  for (const userDoc of usersSnapshot.docs) {
    const user = userDoc.data();
    const role = String(user.role || '').toLowerCase();
    if (role === 'assistant') continue;
    if (role && role !== 'student' && role !== 'praktikan') continue;

    const candidateUserClasses = [user.classCode, user.className, user.class]
      .map((c) => String(c ?? '').trim())
      .filter(Boolean);

    const isRecipient = targetClasses.some((tc) =>
      candidateUserClasses.some((sc) => isClassMatching(sc, tc))
    );

    if (isRecipient) {
      matchingUsers.push({ id: userDoc.id, ref: userDoc.ref, data: user });
    }
  }

  console.log(`\n[TARGET USERS]\nTarget class: ${targetClasses.join(', ')}\nMatching users: ${matchingUsers.length}`);

  const tokens = [];
  const seenTokens = new Set();
  let usersWithTokens = 0;
  let usersMissingTokens = 0;

  for (const userItem of matchingUsers) {
    const userTokens = await getTokensFromUser(userItem);
    if (userTokens.length > 0) {
      usersWithTokens += 1;
      for (const item of userTokens) {
        if (!seenTokens.has(item.token)) {
          seenTokens.add(item.token);
          tokens.push(item);
        }
      }
    } else {
      usersMissingTokens += 1;
    }
  }

  console.log(`\n[PUSH TOKEN]\nValid tokens found: ${tokens.length}\nMissing tokens: ${usersMissingTokens}`);

  return tokens;
};

const getTokensForStudent = async (uid) => {
  if (!uid) return [];

  const userDoc = await db.collection('users').doc(uid).get();
  if (!userDoc.exists) return [];
  const role = String(userDoc.get('role') || '').toLowerCase();
  if (role === 'assistant') return [];

  return getTokensFromUser(userDoc);
};

/**
 * Melakukan pengecekan Expo Push Receipts untuk memverifikasi penerimaan oleh FCM/APNs.
 */
const verifyExpoReceipts = async (ticketIds) => {
  if (!ticketIds || ticketIds.length === 0) {
    return { delivered: 0, failed: 0, errors: [] };
  }

  try {
    const response = await fetch(EXPO_RECEIPTS_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ids: ticketIds }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      return { delivered: ticketIds.length, failed: 0, errors: [] };
    }

    const json = await response.json();
    const receipts = json.data || {};

    let delivered = 0;
    let failed = 0;
    const errors = [];

    for (const ticketId of ticketIds) {
      const receipt = receipts[ticketId];
      if (!receipt) {
        // Receipt belum siap/pending di Expo service
        delivered += 1;
        continue;
      }

      if (receipt.status === 'ok') {
        delivered += 1;
      } else if (receipt.status === 'error') {
        failed += 1;
        errors.push({
          ticketId,
          code: receipt.details?.error || 'UNKNOWN',
          message: receipt.message || 'Receipt error from FCM/APNs',
        });
      }
    }

    return { delivered, failed, errors };
  } catch (error) {
    // Non-fatal, jika request receipt gagal cukup log peringatan
    return { delivered: ticketIds.length, failed: 0, errors: [errorMessage(error)] };
  }
};

/**
 * Mengirim notifikasi ke Expo Push Service dengan format payload Android yang optimal.
 */
const sendExpoPush = async (tokens, notification) => {
  let accepted = 0;
  let failed = 0;
  const errors = [];
  const ticketIds = [];

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

    console.log(`\n[EXPO REQUEST]\nMessages prepared: ${messages.length}`);

    let response;
    try {
      response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      console.log('Expo response received: true');
    } catch (networkErr) {
      console.error('[EXPO REQUEST] Network failure:', errorMessage(networkErr));
      throw new Error(`Koneksi ke Expo Push Service gagal: ${errorMessage(networkErr)}`);
    }

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
        if (ticket.id) {
          ticketIds.push(ticket.id);
        }
        continue;
      }

      failed += 1;
      const code = ticket?.details?.error || 'UNKNOWN';
      const msg = ticket?.message || 'Push notification ditolak oleh Expo.';
      errors.push({ code, message: msg });
      console.error(`[EXPO TICKET ERROR] Token #${index}: ${code} - ${msg}`);

      if (code === 'DeviceNotRegistered') {
        try {
          await batch[index].tokenRef.set(
            {
              enabled: false,
              updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
          console.log(`[TOKEN DEACTIVATED] Token tidak terdaftar dinonaktifkan: ${batch[index].token.slice(0, 15)}...`);
        } catch {
          // Abaikan jika gagal update flag
        }
      }
    }

    console.log(`\n[EXPO TICKET]\nAccepted: ${accepted}\nRejected: ${failed}`);
  }

  // Lakukan pengecekan Expo Push Receipt jika ada ticket yang diterima
  if (ticketIds.length > 0) {
    try {
      // Berikan jeda 2 detik agar Expo sempat meneruskan ke FCM
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const receiptResult = await verifyExpoReceipts(ticketIds);
      console.log(`\n[EXPO RECEIPT]\nDelivered: ${receiptResult.delivered}\nFailed: ${receiptResult.failed}`);
      if (receiptResult.failed > 0) {
        console.warn('[EXPO RECEIPT WARNING] Detail error FCM:', receiptResult.errors);
      }
    } catch (receiptErr) {
      console.log('\n[EXPO RECEIPT]\nDelivered: (Pending)\nFailed: 0');
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
    console.log(`[DUPLICATE] Event ${event.eventId} sudah pernah diproses.`);
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
      console.warn(`[SKIPPED] Tidak ada penerima aktif untuk event ${event.eventId}.`);
      return;
    }

    const result = await sendExpoPush(recipients, event.notification);
    const status =
      result.accepted === recipients.length
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
      `[${status}] Event ${event.eventId}: accepted=${result.accepted}, failed=${result.failed}.`
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
    console.error(`[FAILED] Event ${event.eventId}:`, errorMessage(error));
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
  const className = String(
    session.targetClassName || session.className || session.class || ''
  ).trim();
  const candidateClasses = [
    session.targetClassCode,
    session.targetClassName,
    session.className,
    session.class,
    session.groupCode,
    session.mainClass,
  ].filter(Boolean);

  const courseName = session.courseName || 'Praktikum';
  const moduleCode = session.moduleCode || '';

  console.log(`\n[SESSION EVENT]\nSession detected: ${sessionId}\nStatus: ACTIVE\nTarget Class: ${session.targetClassCode || className || 'Semua'}`);

  await dispatchNotification({
    eventId: makeSessionOpenedEventId(sessionId, updateTimeMillis),
    eventType: 'SESSION_OPENED',
    sourceId: sessionId,
    resolveRecipients: () =>
      getTokensForClassNames(candidateClasses.length ? candidateClasses : [className]),
    notification: {
      title: 'Sesi Praktikum Dibuka',
      body: `${courseName}${moduleCode ? ` - ${moduleCode}` : ''} untuk kelas ${className} telah dibuka. Segera masuk ke laboratorium dan lakukan presensi!`,
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
    console.warn(`[SKIPPED] Sesi ${sessionId} tidak memiliki kelas tujuan.`);
    return;
  }

  console.log(`\n[SCHEDULE EVENT]\nSession detected: ${sessionId}\nEvent: SCHEDULE_CHANGED\nTarget Class: ${classNames.join(', ')}`);

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

  console.log(`\n[LEAVE EVENT]\nLeave request: ${leaveId}\nStatus: ${decision}\nStudent ID: ${leave.studentId}`);

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
        ? 'Pengajuan izin praktikum kamu telah disetujui oleh asisten.'
        : 'Pengajuan izin praktikum kamu telah ditolak oleh asisten.',
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

  const setupListener = () => {
    return db.collection('sessions').onSnapshot(
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
        console.log('[SESSION LISTENER] Menjadwalkan reconnect dalam 5 detik...');
        setTimeout(() => {
          console.log('[SESSION LISTENER] Reconnecting session listener...');
          setupListener();
        }, 5000);
      }
    );
  };

  const unsubscribe = setupListener();
  return { unsubscribe, ready };
};

const watchLeaveRequests = () => {
  const previousDocuments = new Map();
  let initialized = false;
  let resolveReady;
  const ready = new Promise((resolve) => {
    resolveReady = resolve;
  });

  const setupListener = () => {
    return db.collection('leaveRequests').onSnapshot(
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
        console.log('[LEAVE LISTENER] Menjadwalkan reconnect dalam 5 detik...');
        setTimeout(() => {
          console.log('[LEAVE LISTENER] Reconnecting leave listener...');
          setupListener();
        }, 5000);
      }
    );
  };

  const unsubscribe = setupListener();
  return { unsubscribe, ready };
};

const start = async () => {
  const { projectId, authType } = initializeFirebase();

  console.log('====================================');
  console.log(' LABSYNC NOTIFICATION BACKEND');
  console.log(` Project: ${projectId}`);
  console.log(' Provider: Expo Push Service');
  if (authType) {
    console.log(` Auth: ${authType}`);
  }
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

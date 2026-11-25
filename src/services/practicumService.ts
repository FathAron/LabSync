
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';

import { formatTimeWIB } from '../features/student/studentUtils';
import {
  formatDisplayClass,
  isClassMatching,
  normalizeClassCode,
} from '../utils/classUtils';
import { validateSessionScheduleRealtime } from '../utils/dateUtils';

import type {
  ApiErrorCode,
  ApiResponse,
  AttendanceRecord,
  CreateClassInput,
  CreateSessionInput,
  LabClass,
  Session,
  UserProfile,
} from '../types/models';

import { auth, db, isFirebaseConfigured } from './firebaseConfig';
import {
  calculateDistanceMeters,
  isValidCoordinatePair,
  MAX_ACCEPTABLE_ACCURACY_METERS,
  type Coordinates,
  type LaboratoryLocation,
} from './locationService';

// ==========================================
// RESPONSE HELPER
// ==========================================

const makeSuccess = <T>(
  message: string,
  data?: T
): ApiResponse<T> => ({
  ok: true,
  success: true,
  message,
  data,
});

const makeError = <T = never>(
  message: string,
  errorCode: ApiErrorCode
): ApiResponse<T> => ({
  ok: false,
  success: false,
  message,
  errorCode,
});

class PracticumError extends Error {
  errorCode: ApiErrorCode;

  constructor(message: string, errorCode: ApiErrorCode) {
    super(message);
    this.name = 'PracticumError';
    this.errorCode = errorCode;
  }
}

const mapError = (
  error: unknown,
  fallback: string
): ApiResponse<never> => {
  if (error instanceof PracticumError) {
    return makeError(error.message, error.errorCode);
  }

  const code =
    typeof error === 'object' &&
    error !== null &&
    'code' in error
      ? String((error as { code?: unknown }).code ?? '')
      : '';

  if (code === 'unauthenticated') {
    return makeError(
      'Sesi login tidak valid. Silakan login kembali.',
      'UNAUTHENTICATED'
    );
  }

  if (code === 'permission-denied') {
    return makeError(
      'Anda tidak memiliki izin untuk melakukan tindakan ini.',
      'FORBIDDEN'
    );
  }

  if (
    code === 'unavailable' ||
    code === 'deadline-exceeded' ||
    code === 'network-request-failed'
  ) {
    return makeError(
      'Koneksi ke Firestore bermasalah. Periksa internet lalu coba lagi.',
      'NETWORK_ERROR'
    );
  }

  if (code === 'not-found') {
    return makeError(
      'Data yang diminta tidak ditemukan.',
      'NOT_FOUND'
    );
  }

  console.warn(
    '[practicumService] Firestore error:',
    code,
    error
  );

  return makeError(fallback, 'INTERNAL_ERROR');
};

const requireFirebase = (): void => {
  if (!isFirebaseConfigured) {
    throw new PracticumError(
      'Konfigurasi Firebase belum tersedia. Lengkapi file .env terlebih dahulu.',
      'INTERNAL_ERROR'
    );
  }
};

const requireAssistant = (
  user: UserProfile | null
): UserProfile => {
  if (!user) {
    throw new PracticumError(
      'Silakan login terlebih dahulu.',
      'UNAUTHENTICATED'
    );
  }

  if (user.role !== 'assistant') {
    throw new PracticumError(
      'Hanya asisten yang dapat mengelola data praktikum.',
      'FORBIDDEN'
    );
  }

  return user;
};

const requireStudent = (
  user: UserProfile | null
): UserProfile => {
  if (!user) {
    throw new PracticumError(
      'Silakan login terlebih dahulu.',
      'UNAUTHENTICATED'
    );
  }

  if (user.role !== 'student') {
    throw new PracticumError(
      'Presensi hanya dapat dilakukan oleh akun praktikan.',
      'FORBIDDEN'
    );
  }

  return user;
};

// ==========================================
// DATA NORMALIZER
// ==========================================

const asString = (value: unknown): string =>
  typeof value === 'string' ? value : '';

const normalizeClass = (
  raw: Record<string, unknown>,
  id: string
): LabClass => {
  const studentIds = Array.isArray(raw.studentIds)
    ? raw.studentIds.filter(
        (value): value is string =>
          typeof value === 'string'
      )
    : [];

  return {
    id,
    name: asString(raw.name),
    courseCode: asString(raw.courseCode),
    courseName: asString(raw.courseName),
    assistantId: asString(raw.assistantId),
    assistantName: asString(raw.assistantName),
    studentIds,
    totalStudents:
      typeof raw.totalStudents === 'number'
        ? raw.totalStudents
        : studentIds.length,
    createdAt: asString(raw.createdAt),
    updatedAt: asString(raw.updatedAt),
  };
};

const normalizeSession = (
  raw: Record<string, unknown>,
  id: string
): Session => {
  const className = asString(
    raw.className || raw.class
  );
  const targetClassCode =
    asString(raw.targetClassCode) || normalizeClassCode(className);
  const targetClassName =
    asString(raw.targetClassName) || formatDisplayClass(className);
  const laboratoryName = asString(raw.laboratoryName || raw.room);

  return {
    id,
    ...(typeof raw.classId === 'string'
      ? { classId: raw.classId }
      : {}),
    ...(typeof raw.laboratoryId === 'string' &&
    raw.laboratoryId.trim()
      ? { laboratoryId: raw.laboratoryId.trim() }
      : {}),
    ...(laboratoryName ? { laboratoryName } : {}),
    targetClassCode,
    targetClassName,
    ...(typeof raw.mainClass === 'string' && raw.mainClass.trim()
      ? { mainClass: raw.mainClass.trim() }
      : {}),
    ...(typeof raw.groupCode === 'string' && raw.groupCode.trim()
      ? { groupCode: raw.groupCode.trim() }
      : {}),
    courseName: asString(raw.courseName),
    courseCode: asString(raw.courseCode),
    moduleCode: asString(raw.moduleCode),
    moduleTitle: asString(raw.moduleTitle),
    className,
    class: className,
    day: asString(raw.day),
    date: asString(raw.date),
    startTime: asString(raw.startTime),
    endTime: asString(raw.endTime),
    time: asString(raw.time),
    room: asString(raw.room),
    assistantId: asString(raw.assistantId),
    assistantName: asString(raw.assistantName),
    totalStudents:
      typeof raw.totalStudents === 'number'
        ? raw.totalStudents
        : 0,
    status:
      raw.status === 'ACTIVE' ||
      raw.status === 'CLOSED'
        ? raw.status
        : 'PENDING',
    openedAt:
      typeof raw.openedAt === 'string'
        ? raw.openedAt
        : null,
    closedAt:
      typeof raw.closedAt === 'string'
        ? raw.closedAt
        : null,
    notes: asString(raw.notes),
    createdAt: asString(raw.createdAt),
    updatedAt: asString(raw.updatedAt),
    lastActivityAt:
      typeof raw.lastActivityAt === 'string'
        ? raw.lastActivityAt
        : null,
  };
};

const normalizeAttendance = (
  raw: Record<string, unknown>,
  id: string
): AttendanceRecord => ({
  id,
  sessionId: asString(raw.sessionId),
  studentId: asString(raw.studentId),
  studentNim: asString(raw.studentNim),
  studentName: asString(raw.studentName),
  className: asString(raw.className),
  timestamp: asString(raw.timestamp),
  attendedAt: asString(raw.attendedAt),
  status: 'Hadir',
  notes: asString(raw.notes),
});

// ==========================================
// GENERAL HELPER
// ==========================================

const nowIso = (): string =>
  new Date().toISOString();

const nowWib = (): string =>
  formatTimeWIB(new Date()) ?? '00:00 WIB';

const timeRange = (
  start: string,
  end: string
): string => `${start} - ${end} WIB`;

const validateSessionInput = (
  input: CreateSessionInput
): string | null => {
  const requiredFields: [string, string][] = [
    ['Nama praktikum', input.courseName],
    ['Kode praktikum', input.courseCode],
    ['Kode modul', input.moduleCode],
    ['Judul modul', input.moduleTitle],
    ['Kelas', input.className],
    ['Hari', input.day],
    ['Tanggal', input.date],
    ['Jam mulai', input.startTime],
    ['Jam selesai', input.endTime],
    ['Ruangan', input.room],
  ];

  const missing = requiredFields.find(
    ([, value]) => !value.trim()
  );

  if (missing) {
    return `${missing[0]} wajib diisi.`;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
    return 'Tanggal harus menggunakan format YYYY-MM-DD.';
  }

  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(input.startTime)) {
    return 'Jam mulai harus menggunakan format HH:mm.';
  }

  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(input.endTime)) {
    return 'Jam selesai harus menggunakan format HH:mm.';
  }

  if (input.endTime <= input.startTime) {
    return 'Jam selesai harus lebih besar dari jam mulai.';
  }

  // Validasi real-time: tanggal dan jam tidak boleh sudah berlalu
  const scheduleValidation = validateSessionScheduleRealtime(
    input.date.trim(),
    input.startTime.trim(),
    input.endTime.trim()
  );

  if (!scheduleValidation.valid) {
    return scheduleValidation.error || 'Jadwal sesi praktikum tidak valid.';
  }

  if (
    !Number.isFinite(input.totalStudents) ||
    input.totalStudents < 0
  ) {
    return 'Jumlah praktikan tidak boleh kurang dari 0.';
  }

  return null;
};

// ==========================================
// CLASS MANAGEMENT
// ==========================================

export const createClass = async (
  input: CreateClassInput,
  currentUser: UserProfile | null
): Promise<ApiResponse<LabClass>> => {
  try {
    requireFirebase();

    const assistant = requireAssistant(currentUser);

    const name = input.name.trim().toUpperCase();
    const courseCode = input.courseCode.trim().toUpperCase();
    const courseName = input.courseName.trim();

    if (!name || !courseCode || !courseName) {
      return makeError(
        'Nama kelas, kode praktikum, dan nama praktikum wajib diisi.',
        'VALIDATION_ERROR'
      );
    }

    const duplicate = await getDocs(
      query(
        collection(db, 'classes'),
        where('name', '==', name)
      )
    );

    if (!duplicate.empty) {
      return makeError(
        'Kelas dengan nama tersebut sudah terdaftar.',
        'ALREADY_EXISTS'
      );
    }

    // Sinkronkan praktikan yang sudah mendaftarkan className
    // sebelum kelas dibuat.
    const registeredStudents = await getDocs(
      query(
        collection(db, 'users'),
        where('className', '==', name)
      )
    );

    const studentIds = Array.from(
      new Set([
        ...(input.studentIds ?? []),
        ...registeredStudents.docs
          .filter(
            (studentDoc) =>
              studentDoc.data().role === 'student'
          )
          .map((studentDoc) => studentDoc.id),
      ])
    );

    const createdAt = nowIso();

    const payload = {
      name,
      courseCode,
      courseName,
      assistantId: assistant.uid,
      assistantName: assistant.name,
      studentIds,
      totalStudents: studentIds.length,
      createdAt,
      updatedAt: createdAt,
    };

    const ref = await addDoc(
      collection(db, 'classes'),
      payload
    );

    return makeSuccess(
      'Kelas berhasil ditambahkan.',
      { id: ref.id, ...payload }
    );
  } catch (error) {
    return mapError(
      error,
      'Kelas gagal ditambahkan. Silakan coba lagi.'
    );
  }
};

export const updateClass = async (
  classId: string,
  patch: Partial<CreateClassInput>,
  currentUser: UserProfile | null
): Promise<ApiResponse<void>> => {
  try {
    requireFirebase();
    requireAssistant(currentUser);

    const classRef = doc(db, 'classes', classId);
    const currentSnap = await getDoc(classRef);

    if (!currentSnap.exists()) {
      return makeError(
        'Kelas tidak ditemukan.',
        'NOT_FOUND'
      );
    }

    const current = normalizeClass(
      currentSnap.data() as Record<string, unknown>,
      currentSnap.id
    );

    const nextName = patch.name?.trim().toUpperCase();

    if (patch.name !== undefined && !nextName) {
      return makeError(
        'Nama kelas wajib diisi.',
        'VALIDATION_ERROR'
      );
    }

    if (
      patch.courseCode !== undefined &&
      !patch.courseCode.trim()
    ) {
      return makeError(
        'Kode praktikum wajib diisi.',
        'VALIDATION_ERROR'
      );
    }

    if (
      patch.courseName !== undefined &&
      !patch.courseName.trim()
    ) {
      return makeError(
        'Nama praktikum wajib diisi.',
        'VALIDATION_ERROR'
      );
    }

    if (nextName && nextName !== current.name) {
      const duplicate = await getDocs(
        query(
          collection(db, 'classes'),
          where('name', '==', nextName)
        )
      );

      if (!duplicate.empty) {
        return makeError(
          'Nama kelas tersebut sudah digunakan.',
          'ALREADY_EXISTS'
        );
      }
    }

    const update: Record<string, unknown> = {
      updatedAt: nowIso(),
    };

    if (patch.name !== undefined) {
      update.name = nextName;
    }

    if (patch.courseCode !== undefined) {
      update.courseCode =
        patch.courseCode.trim().toUpperCase();
    }

    if (patch.courseName !== undefined) {
      update.courseName = patch.courseName.trim();
    }

    if (patch.studentIds !== undefined) {
      update.studentIds = patch.studentIds;
      update.totalStudents = patch.studentIds.length;
    }

    const batch = writeBatch(db);

    batch.update(classRef, update);

    if (nextName && nextName !== current.name) {
      const [studentSnaps, sessionSnaps] =
        await Promise.all([
          getDocs(
            query(
              collection(db, 'users'),
              where('className', '==', current.name)
            )
          ),
          getDocs(
            query(
              collection(db, 'sessions'),
              where('className', '==', current.name)
            )
          ),
        ]);

      studentSnaps.docs.forEach((studentDoc) => {
        batch.update(studentDoc.ref, {
          className: nextName,
          class: nextName,
          updatedAt: nowIso(),
        });
      });

      sessionSnaps.docs.forEach((sessionDoc) => {
        batch.update(sessionDoc.ref, {
          className: nextName,
          class: nextName,
          updatedAt: nowIso(),
        });
      });
    }

    await batch.commit();

    return makeSuccess(
      'Data kelas berhasil diperbarui.'
    );
  } catch (error) {
    return mapError(
      error,
      'Data kelas gagal diperbarui.'
    );
  }
};

export const deleteClass = async (
  classId: string,
  currentUser: UserProfile | null
): Promise<ApiResponse<void>> => {
  try {
    requireFirebase();
    requireAssistant(currentUser);

    const classRef = doc(db, 'classes', classId);
    const classSnap = await getDoc(classRef);

    if (!classSnap.exists()) {
      return makeError(
        'Kelas tidak ditemukan.',
        'NOT_FOUND'
      );
    }

    const classData = normalizeClass(
      classSnap.data() as Record<string, unknown>,
      classSnap.id
    );

    const sessions = await getDocs(
      query(
        collection(db, 'sessions'),
        where('className', '==', classData.name)
      )
    );

    if (!sessions.empty) {
      return makeError(
        'Kelas tidak dapat dihapus karena masih memiliki jadwal/sesi praktikum.',
        'FORBIDDEN'
      );
    }

    const students = await getDocs(
      query(
        collection(db, 'users'),
        where('className', '==', classData.name)
      )
    );

    const batch = writeBatch(db);

    students.docs.forEach((studentDoc) => {
      batch.update(studentDoc.ref, {
        className: '',
        class: '',
        updatedAt: nowIso(),
      });
    });

    batch.delete(classRef);

    await batch.commit();

    return makeSuccess('Kelas berhasil dihapus.');
  } catch (error) {
    return mapError(error, 'Kelas gagal dihapus.');
  }
};

// ==========================================
// STUDENT CLASS ASSIGNMENT
// ==========================================

export const assignStudentToClass = async (
  studentId: string,
  classNameInput: string,
  currentUser: UserProfile | null
): Promise<ApiResponse<void>> => {
  try {
    requireFirebase();
    requireAssistant(currentUser);

    const className = classNameInput.trim().toUpperCase();

    if (!studentId || !className) {
      return makeError(
        'Praktikan dan kelas wajib dipilih.',
        'VALIDATION_ERROR'
      );
    }

    const [classQuery, studentSnap, previousClasses] =
      await Promise.all([
        getDocs(
          query(
            collection(db, 'classes'),
            where('name', '==', className)
          )
        ),
        getDoc(doc(db, 'users', studentId)),
        getDocs(
          query(
            collection(db, 'classes'),
            where('studentIds', 'array-contains', studentId)
          )
        ),
      ]);

    if (classQuery.empty) {
      return makeError(
        'Kelas tujuan tidak ditemukan.',
        'NOT_FOUND'
      );
    }

    if (
      !studentSnap.exists() ||
      studentSnap.data().role !== 'student'
    ) {
      return makeError(
        'Data praktikan tidak ditemukan.',
        'NOT_FOUND'
      );
    }

    const targetRef = classQuery.docs[0].ref;

    const targetIds = Array.isArray(
      classQuery.docs[0].data().studentIds
    )
      ? (classQuery.docs[0].data().studentIds as string[])
      : [];

    const batch = writeBatch(db);

    const targetSessions = await getDocs(
      query(
        collection(db, 'sessions'),
        where('className', '==', className)
      )
    );

    const targetTotal = targetIds.includes(studentId)
      ? targetIds.length
      : targetIds.length + 1;

    targetSessions.docs.forEach((sessionDoc) => {
      batch.update(sessionDoc.ref, {
        totalStudents: targetTotal,
        updatedAt: nowIso(),
      });
    });

    const previousSessionGroups = await Promise.all(
      previousClasses.docs.map(async (previous) => {
        if (previous.id === targetRef.id) {
          return { previous, sessions: null };
        }

        const ids = Array.isArray(previous.data().studentIds)
          ? (previous.data().studentIds as string[])
          : [];

        const previousClassName = asString(
          previous.data().name
        );

        const remainingTotal = Math.max(
          0,
          ids.filter((id) => id !== studentId).length
        );

        const sessions = await getDocs(
          query(
            collection(db, 'sessions'),
            where('className', '==', previousClassName)
          )
        );

        return {
          previous,
          remainingTotal,
          sessions,
        };
      })
    );

    previousSessionGroups.forEach((group) => {
      if (!group.sessions) return;

      batch.update(group.previous.ref, {
        studentIds: arrayRemove(studentId),
        totalStudents: group.remainingTotal,
        updatedAt: nowIso(),
      });

      group.sessions.docs.forEach((sessionDoc) => {
        batch.update(sessionDoc.ref, {
          totalStudents: group.remainingTotal,
          updatedAt: nowIso(),
        });
      });
    });

    batch.update(targetRef, {
      studentIds: arrayUnion(studentId),
      totalStudents: targetTotal,
      updatedAt: nowIso(),
    });

    batch.update(doc(db, 'users', studentId), {
      className,
      class: className,
      updatedAt: nowIso(),
    });

    await batch.commit();

    return makeSuccess(
      'Praktikan berhasil dimasukkan ke kelas.'
    );
  } catch (error) {
    return mapError(
      error,
      'Praktikan gagal dimasukkan ke kelas.'
    );
  }
};

// ==========================================
// SESSION MANAGEMENT
// ==========================================

export const createSession = async (
  input: CreateSessionInput,
  currentUser: UserProfile | null
): Promise<ApiResponse<Session>> => {
  try {
    requireFirebase();

    const assistant = requireAssistant(currentUser);

    const validation = validateSessionInput(input);

    if (validation) {
      return makeError(validation, 'VALIDATION_ERROR');
    }

    const resolvedGroupCode = input.groupCode?.trim().toUpperCase() || '';
    const rawClass = input.targetClassName || input.className || input.mainClass || '';
    const targetClassCode = normalizeClassCode(input.targetClassCode || rawClass);
    const targetClassName = formatDisplayClass(targetClassCode || rawClass);
    const resolvedMainClass = targetClassName;
    const resolvedClassName = targetClassName;
    const laboratoryName = input.laboratoryName?.trim() || input.room?.trim() || '';

    const classSnap = await getDocs(
      query(
        collection(db, 'classes'),
        where(
          'name',
          '==',
          resolvedClassName
        )
      )
    );

    let classId = '';
    let totalStudents = Number(input.totalStudents) || 0;

    if (!classSnap.empty) {
      const classData = normalizeClass(
        classSnap.docs[0].data() as Record<string, unknown>,
        classSnap.docs[0].id
      );
      if (classData) {
        classId = classData.id;
        totalStudents = classData.totalStudents || totalStudents;
      }
    } else {
      // Auto-register class/group in classes collection so it is an active entity
      const newClassRef = await addDoc(collection(db, 'classes'), {
        name: resolvedClassName,
        mainClass: resolvedMainClass,
        courseCode: input.courseCode.trim().toUpperCase(),
        courseName: input.courseName.trim(),
        assistantId: assistant.uid,
        studentIds: [],
        totalStudents,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      });
      classId = newClassRef.id;
    }

    const createdAt = nowIso();
    const laboratoryId = input.laboratoryId?.trim() ?? '';

    const payload: Omit<Session, 'id'> = {
      ...(classId ? { classId } : {}),
      ...(laboratoryId ? { laboratoryId } : {}),
      ...(laboratoryName ? { laboratoryName } : {}),
      targetClassCode,
      targetClassName,
      ...(resolvedMainClass ? { mainClass: resolvedMainClass } : {}),
      ...(resolvedGroupCode ? { groupCode: resolvedGroupCode } : {}),
      courseName: input.courseName.trim(),
      courseCode: input.courseCode.trim().toUpperCase(),
      moduleCode: input.moduleCode.trim(),
      moduleTitle: input.moduleTitle.trim(),
      className: resolvedClassName,
      class: resolvedClassName,
      day: input.day.trim(),
      date: input.date.trim(),
      startTime: input.startTime.trim(),
      endTime: input.endTime.trim(),
      time: timeRange(
        input.startTime.trim(),
        input.endTime.trim()
      ),
      room: input.room.trim(),
      assistantId: assistant.uid,
      assistantName: assistant.name,
      totalStudents,
      status: 'PENDING',
      openedAt: null,
      closedAt: null,
      notes: input.notes?.trim() ?? '',
      createdAt,
      updatedAt: createdAt,
      lastActivityAt: createdAt,
    };

    const ref = await addDoc(
      collection(db, 'sessions'),
      payload
    );

    return makeSuccess(
      'Sesi praktikum berhasil ditambahkan.',
      { id: ref.id, ...payload }
    );
  } catch (error) {
    return mapError(
      error,
      'Sesi praktikum gagal ditambahkan.'
    );
  }
};

export const updateSession = async (
  sessionId: string,
  patch: Partial<CreateSessionInput>,
  currentUser: UserProfile | null
): Promise<ApiResponse<void>> => {
  try {
    requireFirebase();
    requireAssistant(currentUser);

    const ref = doc(db, 'sessions', sessionId);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      return makeError(
        'Sesi praktikum tidak ditemukan.',
        'NOT_FOUND'
      );
    }

    const current = normalizeSession(
      snap.data() as Record<string, unknown>,
      snap.id
    );

    if (current.status !== 'PENDING') {
      return makeError(
        'Sesi yang sudah dibuka atau ditutup tidak dapat diubah.',
        'FORBIDDEN'
      );
    }

    const next = { ...current, ...patch };

    const validation = validateSessionInput({
      courseName: next.courseName,
      courseCode: next.courseCode,
      moduleCode: next.moduleCode,
      moduleTitle: next.moduleTitle,
      className: next.className,
      day: next.day,
      date: next.date,
      startTime: next.startTime,
      endTime: next.endTime,
      room: next.room,
      totalStudents: next.totalStudents,
      notes: next.notes,
    });

    if (validation) {
      return makeError(validation, 'VALIDATION_ERROR');
    }

    const values: Record<string, unknown> = {
      updatedAt: nowIso(),
    };

    if (patch.courseName !== undefined) {
      values.courseName = patch.courseName.trim();
    }

    if (patch.courseCode !== undefined) {
      values.courseCode =
        patch.courseCode.trim().toUpperCase();
    }

    if (patch.moduleCode !== undefined) {
      values.moduleCode = patch.moduleCode.trim();
    }

    if (patch.moduleTitle !== undefined) {
      values.moduleTitle = patch.moduleTitle.trim();
    }

    const rawPatchClass = patch.targetClassName || patch.className || patch.mainClass;
    const targetClassCode = rawPatchClass
      ? normalizeClassCode(patch.targetClassCode || rawPatchClass)
      : current.targetClassCode;
    const targetClassName = rawPatchClass
      ? formatDisplayClass(rawPatchClass)
      : (current.targetClassName || current.className);
    const nextClassName = targetClassName;

    let classId = current.classId || '';
    let totalStudents = current.totalStudents || 0;

    const classSnap = await getDocs(
      query(
        collection(db, 'classes'),
        where('name', '==', nextClassName)
      )
    );

    if (!classSnap.empty) {
      const linkedClass = normalizeClass(
        classSnap.docs[0].data() as Record<string, unknown>,
        classSnap.docs[0].id
      );
      if (linkedClass) {
        classId = linkedClass.id;
        totalStudents = linkedClass.totalStudents;
      }
    } else {
      const newClassRef = await addDoc(collection(db, 'classes'), {
        name: nextClassName,
        mainClass: patch.mainClass || current.mainClass || '',
        courseCode: patch.courseCode || current.courseCode,
        courseName: patch.courseName || current.courseName,
        assistantId: currentUser?.uid || '',
        studentIds: [],
        totalStudents,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      });
      classId = newClassRef.id;
    }

    values.className = nextClassName;
    values.class = nextClassName;
    values.mainClass = nextClassName;
    if (targetClassCode) values.targetClassCode = targetClassCode;
    if (targetClassName) values.targetClassName = targetClassName;
    if (patch.laboratoryId !== undefined) values.laboratoryId = patch.laboratoryId.trim();
    if (patch.room !== undefined) {
      values.room = patch.room.trim();
      values.laboratoryName = patch.room.trim();
    }
    if (classId) values.classId = classId;
    values.totalStudents = totalStudents;
    if (patch.groupCode !== undefined) values.groupCode = patch.groupCode.trim().toUpperCase();

    if (patch.day !== undefined) {
      values.day = patch.day.trim();
    }

    if (patch.date !== undefined) {
      values.date = patch.date.trim();
    }

    if (patch.startTime !== undefined) {
      values.startTime = patch.startTime.trim();
    }

    if (patch.endTime !== undefined) {
      values.endTime = patch.endTime.trim();
    }

    if (
      patch.startTime !== undefined ||
      patch.endTime !== undefined
    ) {
      values.time = timeRange(
        next.startTime,
        next.endTime
      );
    }

    if (patch.room !== undefined) {
      values.room = patch.room.trim();
    }

    if (patch.laboratoryId !== undefined) {
      values.laboratoryId = patch.laboratoryId.trim();
    }

    if (patch.notes !== undefined) {
      values.notes = patch.notes.trim();
    }

    await updateDoc(ref, values);

    return makeSuccess(
      'Sesi praktikum berhasil diperbarui.'
    );
  } catch (error) {
    return mapError(
      error,
      'Sesi praktikum gagal diperbarui.'
    );
  }
};

export const deleteSession = async (
  sessionId: string,
  currentUser: UserProfile | null
): Promise<ApiResponse<void>> => {
  try {
    requireFirebase();
    requireAssistant(currentUser);

    const ref = doc(db, 'sessions', sessionId);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      return makeError(
        'Sesi praktikum tidak ditemukan.',
        'NOT_FOUND'
      );
    }

    if (snap.data().status === 'ACTIVE') {
      return makeError(
        'Tutup sesi praktikum sebelum menghapusnya.',
        'FORBIDDEN'
      );
    }

    const attendance = await getDocs(
      query(
        collection(db, 'attendance'),
        where('sessionId', '==', sessionId)
      )
    );

    if (!attendance.empty) {
      return makeError(
        'Sesi tidak dapat dihapus karena sudah memiliki catatan presensi.',
        'FORBIDDEN'
      );
    }

    await deleteDoc(ref);

    return makeSuccess(
      'Sesi praktikum berhasil dihapus.'
    );
  } catch (error) {
    return mapError(
      error,
      'Sesi praktikum gagal dihapus.'
    );
  }
};

// ==========================================
// OPEN AND CLOSE SESSION
// ==========================================

export const openSession = async (
  sessionId: string,
  currentUser: UserProfile | null
): Promise<ApiResponse<void>> => {
  try {
    requireFirebase();
    requireAssistant(currentUser);

    const ref = doc(db, 'sessions', sessionId);
    const openedAt = nowWib();
    const timestamp = nowIso();

    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(ref);

      if (!snap.exists()) {
        throw new PracticumError(
          'Sesi praktikum tidak ditemukan.',
          'NOT_FOUND'
        );
      }

      if (snap.data().status !== 'PENDING') {
        throw new PracticumError(
          'Hanya sesi yang belum dibuka yang dapat diaktifkan.',
          'FORBIDDEN'
        );
      }

      transaction.update(ref, {
        status: 'ACTIVE',
        openedAt,
        closedAt: null,
        updatedAt: timestamp,
        lastActivityAt: timestamp,
      });
    });

    return makeSuccess(
      'Sesi praktikum berhasil dibuka.'
    );
  } catch (error) {
    return mapError(
      error,
      'Sesi praktikum gagal dibuka.'
    );
  }
};

export const closeSession = async (
  sessionId: string,
  currentUser: UserProfile | null
): Promise<ApiResponse<void>> => {
  try {
    requireFirebase();
    requireAssistant(currentUser);

    const ref = doc(db, 'sessions', sessionId);
    const closedAt = nowWib();
    const timestamp = nowIso();

    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(ref);

      if (!snap.exists()) {
        throw new PracticumError(
          'Sesi praktikum tidak ditemukan.',
          'NOT_FOUND'
        );
      }

      if (snap.data().status !== 'ACTIVE') {
        throw new PracticumError(
          'Hanya sesi yang sedang aktif yang dapat ditutup.',
          'FORBIDDEN'
        );
      }

      transaction.update(ref, {
        status: 'CLOSED',
        closedAt,
        updatedAt: timestamp,
        lastActivityAt: timestamp,
      });
    });

    return makeSuccess(
      'Sesi praktikum berhasil ditutup.'
    );
  } catch (error) {
    return mapError(
      error,
      'Sesi praktikum gagal ditutup.'
    );
  }
};

// ==========================================
// STUDENT ATTENDANCE
// ==========================================

export const fetchLaboratoryLocation = async (
  laboratoryId: string
): Promise<ApiResponse<LaboratoryLocation>> => {
  try {
    requireFirebase();
    const trimmedId = laboratoryId.trim();
    if (!trimmedId) {
      return makeError(
        'Laboratorium sesi belum dikonfigurasi.',
        'VALIDATION_ERROR'
      );
    }

    const labSnap = await getDoc(doc(db, 'laboratories', trimmedId));
    if (!labSnap.exists()) {
      return makeError(
        'Data laboratorium tidak ditemukan.',
        'NOT_FOUND'
      );
    }

    const raw = labSnap.data() as Record<string, unknown>;
    const latitude = Number(raw.latitude);
    const longitude = Number(raw.longitude);
    const radiusMeters = Number(raw.radiusMeters);

    if (
      !isValidCoordinatePair(latitude, longitude) ||
      !Number.isFinite(radiusMeters) ||
      radiusMeters <= 0
    ) {
      return makeError(
        'Koordinat atau radius laboratorium belum valid.',
        'VALIDATION_ERROR'
      );
    }

    return makeSuccess('Data laboratorium berhasil dimuat.', {
      id: labSnap.id,
      name:
        typeof raw.name === 'string' && raw.name.trim()
          ? raw.name.trim()
          : 'Laboratorium',
      latitude,
      longitude,
      radiusMeters,
    });
  } catch (error) {
    return mapError(error, 'Gagal memuat data laboratorium.');
  }
};

const submitAttendanceViaBackend = async (
  endpoint: string,
  sessionId: string,
  notes: string,
  coordinates: Coordinates
): Promise<ApiResponse<AttendanceRecord>> => {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) {
    return makeError('Sesi login tidak ditemukan. Silakan login ulang.', 'UNAUTHENTICATED');
  }

  const idToken = await firebaseUser.getIdToken();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        sessionId,
        notes: notes.trim().slice(0, 30),
        coordinates: {
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
          accuracy: coordinates.accuracy ?? null,
        },
      }),
      signal: controller.signal,
    });

    const payload = (await response.json().catch(() => null)) as
      | Partial<ApiResponse<AttendanceRecord>>
      | null;

    if (!response.ok || !payload?.ok) {
      return makeError(
        payload?.message || `Validasi presensi server gagal (HTTP ${response.status}).`,
        payload?.errorCode ?? (response.status === 403 ? 'FORBIDDEN' : 'INTERNAL_ERROR')
      );
    }

    return makeSuccess(
      payload.message || 'Presensi berhasil dicatat.',
      payload.data
    );
  } catch (error) {
    return mapError(error, 'Gagal menghubungi server validasi presensi.');
  } finally {
    clearTimeout(timeoutId);
  }
};

export const recordAttendance = async (
  sessionId: string,
  notes: string,
  currentUser: UserProfile | null,
  coordinates?: Coordinates | null
): Promise<ApiResponse<AttendanceRecord>> => {
  try {
    requireFirebase();

    const student = requireStudent(currentUser);

    if (!sessionId) {
      return makeError(
        'Sesi praktikum tidak valid.',
        'VALIDATION_ERROR'
      );
    }

    if (
      !coordinates ||
      !isValidCoordinatePair(coordinates.latitude, coordinates.longitude)
    ) {
      return makeError(
        'Koordinat lokasi perangkat belum tersedia. Ambil lokasi terlebih dahulu.',
        'VALIDATION_ERROR'
      );
    }

    if (
      typeof coordinates.accuracy === 'number' &&
      Number.isFinite(coordinates.accuracy) &&
      coordinates.accuracy > MAX_ACCEPTABLE_ACCURACY_METERS
    ) {
      return makeError(
        `Akurasi lokasi (${Math.round(coordinates.accuracy)} m) belum memadai. Coba lagi di area lebih terbuka.`,
        'VALIDATION_ERROR'
      );
    }

    const attendanceEndpoint = process.env.EXPO_PUBLIC_ATTENDANCE_API_URL?.trim();
    if (attendanceEndpoint) {
      return await submitAttendanceViaBackend(
        attendanceEndpoint,
        sessionId,
        notes,
        coordinates
      );
    }

    const sessionRef = doc(db, 'sessions', sessionId);

    // ID gabungan memastikan satu praktikan hanya punya
    // satu dokumen presensi untuk setiap sesi.
    const attendanceId = `${sessionId}_${student.uid}`;

    const attendanceRef = doc(
      db,
      'attendance',
      attendanceId
    );

    const timestamp = nowIso();
    const attendedAt = nowWib();

    const newRecord = await runTransaction(
      db,
      async (transaction): Promise<AttendanceRecord> => {
        const sessionSnap = await transaction.get(sessionRef);

        if (!sessionSnap.exists()) {
          throw new PracticumError(
            'Sesi praktikum tidak ditemukan.',
            'NOT_FOUND'
          );
        }

        const rawSession = sessionSnap.data() as Record<string, unknown>;
        const session = normalizeSession(
          rawSession,
          sessionSnap.id
        );

        if (session.status !== 'ACTIVE') {
          throw new PracticumError(
            'Presensi hanya dapat dilakukan saat sesi sedang dibuka.',
            'SESSION_NOT_ACTIVE'
          );
        }

        const sessionTargetClass =
          session.targetClassCode ||
          session.targetClassName ||
          session.mainClass ||
          session.className;
        if (
          sessionTargetClass &&
          student.className &&
          !isClassMatching(
            student.classCode || student.className,
            sessionTargetClass
          )
        ) {
          throw new PracticumError(
            'Sesi ini bukan untuk kelasmu.',
            'FORBIDDEN'
          );
        }

        const laboratoryId =
          typeof rawSession.laboratoryId === 'string'
            ? rawSession.laboratoryId.trim()
            : '';

        if (!laboratoryId) {
          throw new PracticumError(
            'Laboratorium untuk sesi ini belum dikonfigurasi. Hubungi asisten praktikum.',
            'VALIDATION_ERROR'
          );
        }

        const labSnap = await transaction.get(
          doc(db, 'laboratories', laboratoryId)
        );

        if (!labSnap.exists()) {
          throw new PracticumError(
            'Data laboratorium sesi tidak ditemukan.',
            'NOT_FOUND'
          );
        }

        const rawLab = labSnap.data() as Record<string, unknown>;
        const labLat = Number(rawLab.latitude);
        const labLon = Number(rawLab.longitude);
        const radiusMeters = Number(rawLab.radiusMeters);

        if (
          !isValidCoordinatePair(labLat, labLon) ||
          !Number.isFinite(radiusMeters) ||
          radiusMeters <= 0
        ) {
          throw new PracticumError(
            'Koordinat atau radius laboratorium belum dikonfigurasi dengan benar.',
            'VALIDATION_ERROR'
          );
        }

        const distanceMeters =
          Math.round(
            calculateDistanceMeters(coordinates, {
              latitude: labLat,
              longitude: labLon,
            }) * 10
          ) / 10;

        if (distanceMeters > radiusMeters) {
          throw new PracticumError(
            `Lokasi Anda berada di luar radius laboratorium (${Math.round(distanceMeters)} m dari batas ${radiusMeters} m).`,
            'FORBIDDEN'
          );
        }

        const existing = await transaction.get(attendanceRef);

        if (existing.exists()) {
          throw new PracticumError(
            'Anda sudah melakukan presensi pada sesi ini.',
            'ALREADY_EXISTS'
          );
        }

        const record: AttendanceRecord & {
          laboratoryId: string;
          distanceMeters: number;
          locationAccuracyMeters: number | null;
          locationValidatedAt: string;
        } = {
          id: attendanceId,
          sessionId,
          studentId: student.uid,
          studentNim: student.nim,
          studentName: student.name,
          className: student.className,
          timestamp,
          attendedAt,
          status: 'Hadir',
          notes: notes.trim().slice(0, 30),
          laboratoryId,
          distanceMeters,
          locationAccuracyMeters:
            typeof coordinates.accuracy === 'number' &&
            Number.isFinite(coordinates.accuracy)
              ? Math.round(coordinates.accuracy * 10) / 10
              : null,
          locationValidatedAt: timestamp,
        };

        transaction.set(attendanceRef, record);

        return record;
      }
    );

    return makeSuccess(
      'Presensi berhasil dicatat.',
      newRecord
    );
  } catch (error) {
    return mapError(
      error,
      'Presensi gagal dicatat. Silakan coba lagi.'
    );
  }
};

// ==========================================
// SNAPSHOT NORMALIZER
// ==========================================

export const normalizePracticumSnapshot = {
  normalizeClass,
  normalizeSession,
  normalizeAttendance,
};

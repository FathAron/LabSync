
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  collection,
  onSnapshot,
  query,
  where,
  type Query,
  type QuerySnapshot,
  type DocumentData,
} from 'firebase/firestore';

import { useApp } from '../context/AppContext';

import type {
  ApiResponse,
  AttendanceRecord,
  CreateClassInput,
  CreateSessionInput,
  LabClass,
  Session,
  UserProfile,
  UsePracticumResult,
} from '../types/models';

import {
  db,
  isFirebaseConfigured,
} from '../services/firebaseConfig';

import {
  assignStudentToClass as assignStudentToClassService,
  closeSession as closeSessionService,
  createClass as createClassService,
  createSession as createSessionService,
  deleteClass as deleteClassService,
  deleteSession as deleteSessionService,
  normalizePracticumSnapshot,
  openSession as openSessionService,
  recordAttendance as recordAttendanceService,
  updateClass as updateClassService,
  updateSession as updateSessionService,
} from '../services/practicumService';

// ==========================================
// ERROR HELPER
// ==========================================

const getMessage = (
  error: unknown,
  fallback: string
): string =>
  error instanceof Error && error.message
    ? error.message
    : fallback;

// ==========================================
// MAIN HOOK
// ==========================================

export const usePracticum = (): UsePracticumResult => {
  const {
    currentUser,
    reportError,
    setSyncError,
  } = useApp();

  // Data dari Firestore
  const [classes, setClasses] = useState<LabClass[]>([]);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [attendanceList, setAttendanceList] = useState<
    AttendanceRecord[]
  >([]);

  // Status loading
  const [studentsLoaded, setStudentsLoaded] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  // Identitas pengguna
  const userId = currentUser?.uid ?? '';
  const userRole = currentUser?.role ?? null;

  const userClassName =
    currentUser?.className?.trim().toUpperCase() ?? '';

  // ==========================================
  // FIRESTORE REAL-TIME LISTENERS
  // ==========================================

  useEffect(() => {
    // Jika belum login, kosongkan data
    if (!currentUser || !userId) {
      setClasses([]);
      setStudents([]);
      setSessions([]);
      setAttendanceList([]);
      setStudentsLoaded(false);
      setDataLoading(false);

      return undefined;
    }

    // Periksa konfigurasi Firebase
    if (!isFirebaseConfigured) {
      setDataLoading(false);

      reportError(
        'firestore',
        'Konfigurasi Firebase belum tersedia. Data praktikum belum dapat dimuat.'
      );

      return undefined;
    }

    setDataLoading(true);
    setStudentsLoaded(false);

    let completedSources = 0;
    let hasListenerError = false;

    const expectedSources = 4;

    const unsubscribers: Array<() => void> = [];
    const completed = new Set<string>();

    // Menandai listener yang sudah berhasil dimuat
    const markSourceReady = (source: string) => {
      if (completed.has(source)) return;

      completed.add(source);
      completedSources += 1;

      if (completedSources >= expectedSources) {
        setDataLoading(false);

        if (!hasListenerError) {
          setSyncError(null);
        }
      }
    };

    // Menangani kegagalan listener
    const handleListenerError = (
      sourceLabel: string,
      source: string,
      error: Error
    ) => {
      hasListenerError = true;
      setDataLoading(false);

      reportError(
        'firestore',
        `${sourceLabel}: ${getMessage(
          error,
          'Gagal memuat data dari Firestore.'
        )}`
      );

      markSourceReady(source);
    };

    // Helper untuk memasang listener Firestore
    const subscribe = <T,>(
      source: string,
      label: string,
      sourceQuery: Query<DocumentData>,
      onData: (
        snapshot: QuerySnapshot<DocumentData>
      ) => T,
      setter: (value: T) => void
    ) => {
      const unsubscribe = onSnapshot(
        sourceQuery,
        (snapshot) => {
          setter(onData(snapshot));
          markSourceReady(source);
        },
        (error) => {
          handleListenerError(label, source, error);
        }
      );

      unsubscribers.push(unsubscribe);
    };

    // ==========================================
    // CLASSES LISTENER
    // ==========================================

    const classesQuery =
      userRole === 'assistant'
        ? collection(db, 'classes')
        : userClassName
          ? query(
              collection(db, 'classes'),
              where('name', '==', userClassName)
            )
          : null;

    if (classesQuery) {
      subscribe(
        'classes',
        'Gagal memuat kelas',
        classesQuery,
        (snapshot) =>
          snapshot.docs.map((item) =>
            normalizePracticumSnapshot.normalizeClass(
              item.data(),
              item.id
            )
          ),
        setClasses
      );
    } else {
      setClasses([]);
      markSourceReady('classes');
    }

    // ==========================================
    // SESSIONS LISTENER
    // ==========================================

    const sessionsQuery =
      userRole === 'assistant'
        ? collection(db, 'sessions')
        : userClassName
          ? query(
              collection(db, 'sessions'),
              where('className', '==', userClassName)
            )
          : null;

    if (sessionsQuery) {
      subscribe(
        'sessions',
        'Gagal memuat jadwal praktikum',
        sessionsQuery,
        (snapshot) =>
          snapshot.docs.map((item) =>
            normalizePracticumSnapshot.normalizeSession(
              item.data(),
              item.id
            )
          ),
        setSessions
      );
    } else {
      setSessions([]);
      markSourceReady('sessions');
    }

    // ==========================================
    // STUDENTS LISTENER
    // ==========================================

    if (userRole === 'assistant') {
      subscribe(
        'students',
        'Gagal memuat daftar praktikan',
        query(
          collection(db, 'users'),
          where('role', '==', 'student')
        ),
        (snapshot) =>
          snapshot.docs.map((item) => ({
            ...(item.data() as UserProfile),
            uid: item.id,
            id: item.id,
            className:
              typeof item.data().className === 'string'
                ? item.data().className
                : '',
            class:
              typeof item.data().className === 'string'
                ? item.data().className
                : '',
          })),
        (value) => {
          setStudents(value);
          setStudentsLoaded(true);
        }
      );
    } else {
      setStudents([]);
      markSourceReady('students');
    }

    // ==========================================
    // ATTENDANCE LISTENER
    // ==========================================

    const attendanceQuery =
      userRole === 'assistant'
        ? collection(db, 'attendance')
        : query(
            collection(db, 'attendance'),
            where('studentId', '==', userId)
          );

    subscribe(
      'attendance',
      'Gagal memuat data presensi',
      attendanceQuery,
      (snapshot) =>
        snapshot.docs.map((item) =>
          normalizePracticumSnapshot.normalizeAttendance(
            item.data(),
            item.id
          )
        ),
      setAttendanceList
    );

    // Bersihkan seluruh listener saat pengguna berubah
    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [
    currentUser,
    reportError,
    setSyncError,
    userClassName,
    userId,
    userRole,
  ]);

  // ==========================================
  // DATA UNTUK ASSISTANT
  // ==========================================

  // Menghitung jumlah praktikan berdasarkan profil terbaru
  const visibleClasses = useMemo(() => {
    if (userRole !== 'assistant' || !studentsLoaded) {
      return classes;
    }

    return classes.map((item) => {
      const members = students.filter(
        (student) =>
          student.className.trim().toUpperCase() ===
          item.name.trim().toUpperCase()
      );

      return {
        ...item,
        studentIds: members.map((student) => student.uid),
        totalStudents: members.length,
      };
    });
  }, [classes, students, studentsLoaded, userRole]);

  // Menyesuaikan jumlah praktikan pada setiap sesi
  const visibleSessions = useMemo(() => {
    if (userRole !== 'assistant' || !studentsLoaded) {
      return sessions;
    }

    return sessions.map((item) => {
      const totalStudents = students.filter(
        (student) =>
          student.className.trim().toUpperCase() ===
          item.className.trim().toUpperCase()
      ).length;

      return {
        ...item,
        totalStudents,
      };
    });
  }, [sessions, students, studentsLoaded, userRole]);

  // ==========================================
  // ATTENDANCE HELPER
  // ==========================================

  const hasStudentAttended = useCallback(
    (sessionId: string, studentId: string): boolean =>
      attendanceList.some(
        (record) =>
          record.sessionId === sessionId &&
          record.studentId === studentId
      ),
    [attendanceList]
  );

  const getAttendanceForSession = useCallback(
    (sessionId: string): AttendanceRecord[] =>
      attendanceList.filter(
        (record) => record.sessionId === sessionId
      ),
    [attendanceList]
  );

  // ==========================================
  // ACTION HELPER
  // ==========================================

  const runAction = useCallback(
    async <T,>(
      action: Promise<ApiResponse<T>>
    ): Promise<ApiResponse<T>> => {
      const result = await action;

      if (!result.ok) {
        reportError('firestore', result.message);
      }

      return result;
    },
    [reportError]
  );

  // ==========================================
  // SESSION ACTIONS
  // ==========================================

  const createSession = useCallback(
    (input: CreateSessionInput) =>
      runAction(
        createSessionService(input, currentUser)
      ),
    [currentUser, runAction]
  );

  const updateSession = useCallback(
    (
      sessionId: string,
      patch: Partial<CreateSessionInput>
    ) =>
      runAction(
        updateSessionService(
          sessionId,
          patch,
          currentUser
        )
      ),
    [currentUser, runAction]
  );

  const deleteSession = useCallback(
    (sessionId: string) =>
      runAction(
        deleteSessionService(sessionId, currentUser)
      ),
    [currentUser, runAction]
  );

  const openSession = useCallback(
    (sessionId: string) =>
      runAction(
        openSessionService(sessionId, currentUser)
      ),
    [currentUser, runAction]
  );

  const closeSession = useCallback(
    (sessionId: string) =>
      runAction(
        closeSessionService(sessionId, currentUser)
      ),
    [currentUser, runAction]
  );

  // ==========================================
  // CLASS ACTIONS
  // ==========================================

  const createClass = useCallback(
    (input: CreateClassInput) =>
      runAction(
        createClassService(input, currentUser)
      ),
    [currentUser, runAction]
  );

  const updateClass = useCallback(
    (
      classId: string,
      patch: Partial<CreateClassInput>
    ) =>
      runAction(
        updateClassService(
          classId,
          patch,
          currentUser
        )
      ),
    [currentUser, runAction]
  );

  const deleteClass = useCallback(
    (classId: string) =>
      runAction(
        deleteClassService(classId, currentUser)
      ),
    [currentUser, runAction]
  );

  const assignStudentToClass = useCallback(
    (studentId: string, className: string) =>
      runAction(
        assignStudentToClassService(
          studentId,
          className,
          currentUser
        )
      ),
    [currentUser, runAction]
  );

  // ==========================================
  // STUDENT ATTENDANCE ACTION
  // ==========================================

  const recordAttendance = useCallback(
    (sessionId: string, notes = '') =>
      runAction(
        recordAttendanceService(
          sessionId,
          notes,
          currentUser
        )
      ),
    [currentUser, runAction]
  );

  // ==========================================
  // RETURN DATA AND ACTIONS
  // ==========================================

  return useMemo(
    () => ({
      classes: visibleClasses,
      students,
      sessions: visibleSessions,
      attendanceList,
      dataLoading,

      createSession,
      updateSession,
      deleteSession,
      openSession,
      closeSession,

      createClass,
      updateClass,
      deleteClass,
      assignStudentToClass,

      recordAttendance,
      hasStudentAttended,
      getAttendanceForSession,
    }),
    [
      visibleClasses,
      students,
      visibleSessions,
      attendanceList,
      dataLoading,

      createSession,
      updateSession,
      deleteSession,
      openSession,
      closeSession,

      createClass,
      updateClass,
      deleteClass,
      assignStudentToClass,

      recordAttendance,
      hasStudentAttended,
      getAttendanceForSession,
    ]
  );
};

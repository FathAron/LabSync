import React, { createContext, useContext, useState, useMemo } from 'react';
import { ASSISTANTS, STUDENTS, INITIAL_SESSIONS, INITIAL_ATTENDANCE } from '../data/mockData';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [currentRole, setCurrentRole] = useState('assistant'); // 'assistant' | 'student'
  const [currentAssistant, setCurrentAssistant] = useState(ASSISTANTS[0]);
  const [currentStudent, setCurrentStudent] = useState(STUDENTS[0]);
  const [sessions, setSessions] = useState(INITIAL_SESSIONS);
  const [attendanceList, setAttendanceList] = useState(INITIAL_ATTENDANCE);
  const [feedbackToast, setFeedbackToast] = useState(null);

  // Helper to show a temporary feedback notification toast
  const showToast = (message, type = 'success') => {
    setFeedbackToast({ message, type });
    setTimeout(() => {
      setFeedbackToast(null);
    }, 3500);
  };

  // Switch role between Assistant and Student
  const toggleRole = () => {
    const nextRole = currentRole === 'assistant' ? 'student' : 'assistant';
    setCurrentRole(nextRole);
    showToast(`Beralih ke mode ${nextRole === 'assistant' ? 'Asisten Praktikum' : 'Praktikan'}`, 'info');
  };

  // Assistant: Open session
  const openSession = (sessionId) => {
    const now = new Date();
    const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} WIB`;

    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, status: 'ACTIVE', openedAt: timeString } : s))
    );
    showToast('Sesi praktikum berhasil dibuka! Praktikan sekarang dapat presensi.', 'success');
  };

  // Assistant: Close session
  const closeSession = (sessionId) => {
    const now = new Date();
    const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} WIB`;

    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, status: 'CLOSED', closedAt: timeString } : s))
    );
    showToast('Sesi praktikum telah ditutup. Presensi baru tidak lagi diterima.', 'warning');
  };

  // Student: Check if already attended
  const hasStudentAttended = (sessionId, studentId) => {
    return attendanceList.some(
      (item) => item.sessionId === sessionId && item.studentId === studentId
    );
  };

  // Student: Get attendance record for specific session
  const getStudentAttendanceRecord = (sessionId, studentId) => {
    return attendanceList.find(
      (item) => item.sessionId === sessionId && item.studentId === studentId
    );
  };

  // Student: Record attendance
  const recordAttendance = (sessionId, student, notes = '') => {
    const targetSession = sessions.find((s) => s.id === sessionId);

    if (!targetSession) {
      showToast('Sesi tidak ditemukan!', 'danger');
      return { success: false, message: 'Sesi tidak ditemukan' };
    }

    if (targetSession.status !== 'ACTIVE') {
      const msg = targetSession.status === 'PENDING' 
        ? 'Sesi belum dibuka oleh Asisten!' 
        : 'Sesi praktikum telah ditutup!';
      showToast(msg, 'danger');
      return { success: false, message: msg };
    }

    if (hasStudentAttended(sessionId, student.id)) {
      showToast('Kamu sudah melakukan presensi di sesi ini!', 'danger');
      return { success: false, message: 'Praktikan sudah presensi pada sesi ini.' };
    }

    const now = new Date();
    const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} WIB`;

    const newRecord = {
      id: `att-${Date.now()}`,
      sessionId,
      studentId: student.id,
      studentNim: student.nim,
      studentName: student.name,
      timestamp: timeString,
      status: 'Hadir',
      device: 'Mobile App',
      notes: notes || 'Presensi Mandiri di Lab',
    };

    setAttendanceList((prev) => [newRecord, ...prev]);
    showToast(`Presensi berhasil dicatat pada ${timeString}!`, 'success');
    return { success: true, message: 'Presensi berhasil dicatat!', record: newRecord };
  };

  // Assistant: Get attendance list for a session
  const getAttendanceForSession = (sessionId) => {
    return attendanceList.filter((item) => item.sessionId === sessionId);
  };

  // Student: Get student history with session details
  const getStudentHistory = (studentId) => {
    const records = attendanceList.filter((item) => item.studentId === studentId);
    return records.map((record) => {
      const session = sessions.find((s) => s.id === record.sessionId);
      return {
        ...record,
        session,
      };
    });
  };

  // Reset demo data to initial state
  const resetDemoData = () => {
    setSessions(INITIAL_SESSIONS);
    setAttendanceList(INITIAL_ATTENDANCE);
    showToast('Data demo berhasil direset ke status awal.', 'info');
  };

  const value = useMemo(
    () => ({
      currentRole,
      setCurrentRole,
      toggleRole,
      currentAssistant,
      setCurrentAssistant,
      currentStudent,
      setCurrentStudent,
      assistants: ASSISTANTS,
      students: STUDENTS,
      sessions,
      attendanceList,
      feedbackToast,
      showToast,
      openSession,
      closeSession,
      recordAttendance,
      hasStudentAttended,
      getStudentAttendanceRecord,
      getAttendanceForSession,
      getStudentHistory,
      resetDemoData,
    }),
    [
      currentRole,
      currentAssistant,
      currentStudent,
      sessions,
      attendanceList,
      feedbackToast,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

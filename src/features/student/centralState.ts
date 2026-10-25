// TASK-04 & TASK-01/02 - TITIK SAMBUNG ke state pusat (AppContext & FeedbackToast).

import { useApp } from '../../context/AppContext';
import type { CentralState } from './types';

export const useCentralState = (): CentralState => {
  const app = useApp();
  return {
    currentStudent: app.currentStudent,
    sessions: app.sessions,
    attendanceList: app.attendanceList,
    recordAttendance: app.recordAttendance,
    hasStudentAttended: app.hasStudentAttended,
    notify: app.notify,
  };
};

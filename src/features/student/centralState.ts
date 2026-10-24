// TASK-04 - TITIK SAMBUNG ke state pusat.
//
// SEKARANG : memakai state demo sementara (src/dev/DemoProvider.tsx).
//
// NANTI (contoh, sesuaikan nama hook & field punya Aron):
//
//   import { useApp } from '../../context/AppContext';
//
//   export const useCentralState = (): CentralState => {
//     const app = useApp();
//     return {
//       currentStudent: app.currentStudent,
//       sessions: app.sessions,
//       attendanceList: app.attendanceList,
//       recordAttendance: app.recordAttendance,
//       hasStudentAttended: app.hasStudentAttended,
//       // notify: app.showToast,   // jika FeedbackToast milik Wipin tersedia
//     };
//   };

import { useDemoCentral } from '../../dev/DemoProvider';
import type { CentralState } from './types';

export const useCentralState = (): CentralState => useDemoCentral();

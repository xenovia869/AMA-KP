export type UserRole = 'student' | 'faculty';

export interface Student {
  usn: string;
  name: string;
  email: string;
  course: string;
  yearLevel: string;
  section: string;
  campusId: string;
  avatarUrl: string;
  contactNumber: string;
  currentStatus: 'CLOCKED_IN' | 'CLOCKED_OUT' | 'NOT_CLOCKED_IN';
  lastPunchTime?: string;
  lastPunchType?: 'TIME_IN' | 'TIME_OUT';
}

export interface Faculty {
  facultyId: string;
  name: string;
  email: string;
  department: string;
  roleTitle: string;
  campusId: string;
  avatarUrl: string;
}

export interface Campus {
  id: string;
  name: string;
  code: string;
  address: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  active: boolean;
}

export type PunchType = 'TIME_IN' | 'TIME_OUT';

export type VerificationStatus =
  | 'VERIFIED'
  | 'FLAGGED_GEOFENCE'
  | 'MANUALLY_APPROVED'
  | 'REJECTED'
  | 'PENDING';

export interface AttendanceRecord {
  id: string;
  studentUsn: string;
  studentName: string;
  studentAvatar: string;
  courseSection: string;
  campusId: string;
  campusName: string;
  type: PunchType;
  timestamp: string; // ISO
  timeFormatted: string; // "08:15:20 AM"
  dateFormatted: string; // "2026-09-29"
  subjectCode?: string;
  subjectTitle?: string;
  photoBase64: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  distanceMeters: number;
  withinGeofence: boolean;
  status: VerificationStatus;
  facultyNote?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  deviceInfo?: string;
  remarks?: string;
}

export interface ClassScheduleItem {
  id: string;
  subjectCode: string;
  subjectTitle: string;
  units: number;
  dayOfWeek: number; // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  dayName: string; // 'Monday', 'Tuesday', etc.
  startTime: string; // "08:00" (24h)
  endTime: string; // "10:30" (24h)
  displayTime: string; // "08:00 AM - 10:30 AM"
  room: string;
  instructor: string;
  section: string;
  color: string;
}

export interface FacultyStats {
  todayTotalPunches: number;
  currentlyClockedIn: number;
  verifiedOnCampus: number;
  flaggedGeofence: number;
  pendingReviews: number;
  complianceRate: number;
}

export interface DailyAttendanceSession {
  dateFormatted: string; // e.g. "2026-09-29"
  dateDisplay: string; // e.g. "Tue, Sep 29, 2026"
  studentUsn: string;
  studentName: string;
  timeIn?: AttendanceRecord;
  timeOut?: AttendanceRecord;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'TIME_OUT_ONLY';
  durationMinutes?: number;
  durationFormatted?: string; // e.g. "8h 15m"
}


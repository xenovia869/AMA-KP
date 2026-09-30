import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import * as XLSX from 'xlsx';
import { Campus, Student, Faculty, AttendanceRecord, ClassScheduleItem, FacultyStats, DailyAttendanceSession } from './src/types.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Generous payload limit for high-res selfie captures
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Haversine Distance Formula in meters
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

// In-Memory Database State with persistent presets
export const campuses: Campus[] = [
  {
    id: 'camp-main',
    name: 'AMA University & Colleges - Main Campus',
    code: 'AMA-QC-MAIN',
    address: 'Maximina St., Villa Arca Subd., Project 8, Quezon City, Metro Manila',
    latitude: 14.668705,
    longitude: 121.023412,
    radiusMeters: 500,
    active: true,
  },
  {
    id: 'camp-makati',
    name: 'AMA Computer College - Makati Campus',
    code: 'AMA-MAKATI',
    address: '5432 Osmeña Highway cor. Gen. Tinio St., Bangkal, Makati City',
    latitude: 14.542890,
    longitude: 121.011850,
    radiusMeters: 450,
    active: true,
  },
  {
    id: 'camp-pasig',
    name: 'AMA Computer College - East Rizal / Pasig',
    code: 'AMA-PASIG',
    address: 'Ortigas Ave. Extension, Cainta / Pasig Boundary',
    latitude: 14.582310,
    longitude: 121.082100,
    radiusMeters: 500,
    active: true,
  },
  {
    id: 'camp-manila',
    name: 'AMA Computer College - Manila Campus',
    code: 'AMA-MANILA',
    address: 'Rizal Avenue cor. Solis St., Sta. Cruz, Manila',
    latitude: 14.622410,
    longitude: 120.985230,
    radiusMeters: 400,
    active: true,
  }
];

export const students: Student[] = [
  {
    usn: '2023-01492-MN-0',
    name: 'Juan Carlos Dela Cruz',
    email: 'jcdelacruz@student.ama.edu.ph',
    course: 'BS Information Technology (BSIT)',
    yearLevel: '3rd Year - Regular',
    section: 'IT301-A',
    campusId: 'camp-main',
    avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
    contactNumber: '+63 917 832 9012',
    currentStatus: 'NOT_CLOCKED_IN',
  },
  {
    usn: '2022-09811-QC-0',
    name: 'Maria Christine Santos',
    email: 'mcsantos@student.ama.edu.ph',
    course: 'BS Computer Science (BSCS)',
    yearLevel: '4th Year - Graduating',
    section: 'CS401-B',
    campusId: 'camp-main',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    contactNumber: '+63 928 554 1198',
    currentStatus: 'CLOCKED_IN',
    lastPunchTime: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    lastPunchType: 'TIME_IN',
  },
  {
    usn: '2024-00123-MK-0',
    name: 'Ezekiel Vance Reyes',
    email: 'evreyes@student.ama.edu.ph',
    course: 'BS Cybersecurity (BSCSB)',
    yearLevel: '2nd Year - Regular',
    section: 'CYB201-A',
    campusId: 'camp-makati',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    contactNumber: '+63 999 123 4567',
    currentStatus: 'NOT_CLOCKED_IN',
  }
];

export const facultyMembers: Faculty[] = [
  {
    facultyId: 'FAC-2018-091',
    name: 'Engr. Roberto Reyes, MIT, CCNA',
    email: 'prof.reyes@ama.edu.ph',
    department: 'College of Computer Studies',
    roleTitle: 'Dean & Associate Professor',
    campusId: 'camp-main',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  },
  {
    facultyId: 'FAC-2020-044',
    name: 'Prof. Diana Dimaculangan, MSc',
    email: 'd.dimaculangan@ama.edu.ph',
    department: 'Software Engineering Department',
    roleTitle: 'Faculty Coordinator / Professor',
    campusId: 'camp-main',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
  }
];

// Seed Schedules for Students
export const schedules: Record<string, ClassScheduleItem[]> = {
  '2023-01492-MN-0': [
    {
      id: 'sch-1',
      subjectCode: 'IT301',
      subjectTitle: 'Advanced Web Applications & Frameworks',
      units: 3,
      dayOfWeek: 1, // Mon
      dayName: 'Monday',
      startTime: '08:00',
      endTime: '10:30',
      displayTime: '08:00 AM - 10:30 AM',
      room: 'Computer Lab 304',
      instructor: 'Engr. Roberto Reyes, MIT',
      section: 'IT301-A',
      color: 'blue',
    },
    {
      id: 'sch-2',
      subjectCode: 'IT303',
      subjectTitle: 'Information Assurance and Security 1',
      units: 3,
      dayOfWeek: 1, // Mon
      dayName: 'Monday',
      startTime: '13:00',
      endTime: '16:00',
      displayTime: '01:00 PM - 04:00 PM',
      room: 'Cisco Networking Lab 2',
      instructor: 'Prof. Diana Dimaculangan, MSc',
      section: 'IT301-A',
      color: 'purple',
    },
    {
      id: 'sch-3',
      subjectCode: 'IT305',
      subjectTitle: 'Mobile Application Development (Kotlin & React Native)',
      units: 3,
      dayOfWeek: 2, // Tue
      dayName: 'Tuesday',
      startTime: '09:00',
      endTime: '12:00',
      displayTime: '09:00 AM - 12:00 PM',
      room: 'Multimedia Lab 402',
      instructor: 'Prof. Diana Dimaculangan, MSc',
      section: 'IT301-A',
      color: 'emerald',
    },
    {
      id: 'sch-4',
      subjectCode: 'MATH202',
      subjectTitle: 'Quantitative Methods with Probability & Statistics',
      units: 3,
      dayOfWeek: 2, // Tue
      dayName: 'Tuesday',
      startTime: '13:30',
      endTime: '15:30',
      displayTime: '01:30 PM - 03:30 PM',
      room: 'Lecture Hall 201',
      instructor: 'Dr. Alejandro Gomez',
      section: 'IT301-A',
      color: 'amber',
    },
    {
      id: 'sch-5',
      subjectCode: 'IT307',
      subjectTitle: 'Cloud Infrastructure and DevOps',
      units: 3,
      dayOfWeek: 3, // Wed
      dayName: 'Wednesday',
      startTime: '08:30',
      endTime: '11:30',
      displayTime: '08:30 AM - 11:30 AM',
      room: 'Cloud Computing Lab 5',
      instructor: 'Engr. Roberto Reyes, MIT',
      section: 'IT301-A',
      color: 'cyan',
    },
    {
      id: 'sch-6',
      subjectCode: 'CAP201',
      subjectTitle: 'Capstone Project and Research 1',
      units: 3,
      dayOfWeek: 4, // Thu
      dayName: 'Thursday',
      startTime: '10:00',
      endTime: '13:00',
      displayTime: '10:00 AM - 01:00 PM',
      room: 'Research & Innovation Room 3',
      instructor: 'Engr. Roberto Reyes, MIT',
      section: 'IT301-A',
      color: 'rose',
    },
    {
      id: 'sch-7',
      subjectCode: 'IT309',
      subjectTitle: 'Integrative Programming and Technologies',
      units: 3,
      dayOfWeek: 5, // Fri
      dayName: 'Friday',
      startTime: '09:00',
      endTime: '12:00',
      displayTime: '09:00 AM - 12:00 PM',
      room: 'Computer Lab 304',
      instructor: 'Engr. Roberto Reyes, MIT',
      section: 'IT301-A',
      color: 'indigo',
    }
  ],
  '2022-09811-QC-0': [
    {
      id: 'sch-10',
      subjectCode: 'CS401',
      subjectTitle: 'Distributed Systems & Microservices',
      units: 3,
      dayOfWeek: 2, // Tue
      dayName: 'Tuesday',
      startTime: '08:00',
      endTime: '11:00',
      displayTime: '08:00 AM - 11:00 AM',
      room: 'Special Systems Lab 1',
      instructor: 'Prof. Diana Dimaculangan, MSc',
      section: 'CS401-B',
      color: 'purple',
    },
    {
      id: 'sch-11',
      subjectCode: 'CS403',
      subjectTitle: 'Artificial Intelligence & Neural Networks',
      units: 3,
      dayOfWeek: 2, // Tue
      dayName: 'Tuesday',
      startTime: '13:00',
      endTime: '16:00',
      displayTime: '01:00 PM - 04:00 PM',
      room: 'AI Computing Hub',
      instructor: 'Engr. Roberto Reyes, MIT',
      section: 'CS401-B',
      color: 'blue',
    }
  ]
};

// Seed Attendance Records with realistic photos and geolocations
const todayDate = new Date().toISOString().split('T')[0];
const yesterdayDate = new Date(Date.now() - 24 * 3600 * 1000).toISOString().split('T')[0];
const twoDaysAgoDate = new Date(Date.now() - 48 * 3600 * 1000).toISOString().split('T')[0];
const threeDaysAgoDate = new Date(Date.now() - 72 * 3600 * 1000).toISOString().split('T')[0];

export const attendanceRecords: AttendanceRecord[] = [
  // Today's records
  {
    id: 'att-102',
    studentUsn: '2023-01492-MN-0',
    studentName: 'Juan Carlos Dela Cruz',
    studentAvatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
    courseSection: 'BSIT 3rd Year / IT301-A',
    campusId: 'camp-main',
    campusName: 'AMA University & Colleges - Main Campus',
    type: 'TIME_IN',
    timestamp: new Date(Date.now() - 2.5 * 3600 * 1000).toISOString(),
    timeFormatted: '07:45:10 AM',
    dateFormatted: todayDate,
    subjectCode: 'IT301',
    subjectTitle: 'Advanced Web Applications & Frameworks',
    photoBase64: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=500&auto=format&fit=crop&q=80',
    latitude: 14.668740,
    longitude: 121.023410,
    accuracy: 9.0,
    distanceMeters: 18,
    withinGeofence: true,
    status: 'VERIFIED',
    deviceInfo: 'Android 14 Chrome / SM-G998B',
    remarks: 'Arrived for morning lecture session',
  },
  {
    id: 'att-101',
    studentUsn: '2022-09811-QC-0',
    studentName: 'Maria Christine Santos',
    studentAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    courseSection: 'BSCS 4th Year / CS401-B',
    campusId: 'camp-main',
    campusName: 'AMA University & Colleges - Main Campus',
    type: 'TIME_IN',
    timestamp: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    timeFormatted: '07:54:12 AM',
    dateFormatted: todayDate,
    subjectCode: 'CS401',
    subjectTitle: 'Distributed Systems & Microservices',
    photoBase64: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=500&auto=format&fit=crop&q=80',
    latitude: 14.668720,
    longitude: 121.023390,
    accuracy: 8.5,
    distanceMeters: 14,
    withinGeofence: true,
    status: 'VERIFIED',
    deviceInfo: 'Chrome Mobile / Android 14 (SM-G998B)',
    remarks: 'Arrived for CS401 Laboratory Session',
  },

  // Yesterday: Paired Time In & Time Out for Juan Carlos Dela Cruz
  {
    id: 'att-100',
    studentUsn: '2023-01492-MN-0',
    studentName: 'Juan Carlos Dela Cruz',
    studentAvatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
    courseSection: 'BSIT 3rd Year / IT301-A',
    campusId: 'camp-main',
    campusName: 'AMA University & Colleges - Main Campus',
    type: 'TIME_OUT',
    timestamp: new Date(Date.now() - 20 * 3600 * 1000).toISOString(),
    timeFormatted: '05:12:44 PM',
    dateFormatted: yesterdayDate,
    subjectCode: 'IT303',
    subjectTitle: 'Information Assurance and Security 1',
    photoBase64: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80',
    latitude: 14.668810,
    longitude: 121.023520,
    accuracy: 12.0,
    distanceMeters: 25,
    withinGeofence: true,
    status: 'VERIFIED',
    deviceInfo: 'Safari / iPhone 14 Pro',
    remarks: 'Dismissed after lab practical exam',
  },
  {
    id: 'att-98',
    studentUsn: '2023-01492-MN-0',
    studentName: 'Juan Carlos Dela Cruz',
    studentAvatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
    courseSection: 'BSIT 3rd Year / IT301-A',
    campusId: 'camp-main',
    campusName: 'AMA University & Colleges - Main Campus',
    type: 'TIME_IN',
    timestamp: new Date(Date.now() - 29 * 3600 * 1000).toISOString(),
    timeFormatted: '07:58:30 AM',
    dateFormatted: yesterdayDate,
    subjectCode: 'IT301',
    subjectTitle: 'Advanced Web Applications & Frameworks',
    photoBase64: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=500&auto=format&fit=crop&q=80',
    latitude: 14.668690,
    longitude: 121.023400,
    accuracy: 7.0,
    distanceMeters: 12,
    withinGeofence: true,
    status: 'VERIFIED',
    deviceInfo: 'Safari / iPhone 14 Pro',
    remarks: 'Regular morning time-in at Main Building',
  },

  // 2 Days Ago: Paired Time In & Time Out for Juan Carlos Dela Cruz
  {
    id: 'att-97',
    studentUsn: '2023-01492-MN-0',
    studentName: 'Juan Carlos Dela Cruz',
    studentAvatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
    courseSection: 'BSIT 3rd Year / IT301-A',
    campusId: 'camp-main',
    campusName: 'AMA University & Colleges - Main Campus',
    type: 'TIME_OUT',
    timestamp: new Date(Date.now() - 44 * 3600 * 1000).toISOString(),
    timeFormatted: '04:55:10 PM',
    dateFormatted: twoDaysAgoDate,
    subjectCode: 'IT305',
    subjectTitle: 'Mobile Application Development',
    photoBase64: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80',
    latitude: 14.668700,
    longitude: 121.023430,
    accuracy: 10.0,
    distanceMeters: 16,
    withinGeofence: true,
    status: 'VERIFIED',
    deviceInfo: 'Android 14 Chrome / SM-G998B',
    remarks: 'Finished Mobile App React Native lab workshop',
  },
  {
    id: 'att-96',
    studentUsn: '2023-01492-MN-0',
    studentName: 'Juan Carlos Dela Cruz',
    studentAvatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
    courseSection: 'BSIT 3rd Year / IT301-A',
    campusId: 'camp-main',
    campusName: 'AMA University & Colleges - Main Campus',
    type: 'TIME_IN',
    timestamp: new Date(Date.now() - 53 * 3600 * 1000).toISOString(),
    timeFormatted: '08:02:15 AM',
    dateFormatted: twoDaysAgoDate,
    subjectCode: 'IT305',
    subjectTitle: 'Mobile Application Development',
    photoBase64: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=500&auto=format&fit=crop&q=80',
    latitude: 14.668710,
    longitude: 121.023410,
    accuracy: 6.0,
    distanceMeters: 15,
    withinGeofence: true,
    status: 'VERIFIED',
    deviceInfo: 'Android 14 Chrome / SM-G998B',
    remarks: 'Arrived for morning lecture session',
  },

  // 3 Days Ago: Paired Time In & Time Out for Juan Carlos Dela Cruz
  {
    id: 'att-95',
    studentUsn: '2023-01492-MN-0',
    studentName: 'Juan Carlos Dela Cruz',
    studentAvatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
    courseSection: 'BSIT 3rd Year / IT301-A',
    campusId: 'camp-main',
    campusName: 'AMA University & Colleges - Main Campus',
    type: 'TIME_OUT',
    timestamp: new Date(Date.now() - 68 * 3600 * 1000).toISOString(),
    timeFormatted: '05:05:00 PM',
    dateFormatted: threeDaysAgoDate,
    subjectCode: 'IT307',
    subjectTitle: 'Cloud Infrastructure and DevOps',
    photoBase64: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80',
    latitude: 14.668720,
    longitude: 121.023400,
    accuracy: 8.0,
    distanceMeters: 17,
    withinGeofence: true,
    status: 'VERIFIED',
    deviceInfo: 'Safari / iPhone 14 Pro',
    remarks: 'Cloud containerization lab complete',
  },
  {
    id: 'att-94',
    studentUsn: '2023-01492-MN-0',
    studentName: 'Juan Carlos Dela Cruz',
    studentAvatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
    courseSection: 'BSIT 3rd Year / IT301-A',
    campusId: 'camp-main',
    campusName: 'AMA University & Colleges - Main Campus',
    type: 'TIME_IN',
    timestamp: new Date(Date.now() - 77 * 3600 * 1000).toISOString(),
    timeFormatted: '07:50:22 AM',
    dateFormatted: threeDaysAgoDate,
    subjectCode: 'IT307',
    subjectTitle: 'Cloud Infrastructure and DevOps',
    photoBase64: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=500&auto=format&fit=crop&q=80',
    latitude: 14.668680,
    longitude: 121.023390,
    accuracy: 11.0,
    distanceMeters: 19,
    withinGeofence: true,
    status: 'VERIFIED',
    deviceInfo: 'Safari / iPhone 14 Pro',
    remarks: 'On-time for cloud deployment quiz',
  },

  // Ezekiel Vance Reyes (Flagged record)
  {
    id: 'att-99',
    studentUsn: '2024-00123-MK-0',
    studentName: 'Ezekiel Vance Reyes',
    studentAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    courseSection: 'BSCSB 2nd Year / CYB201-A',
    campusId: 'camp-makati',
    campusName: 'AMA Computer College - Makati Campus',
    type: 'TIME_IN',
    timestamp: new Date(Date.now() - 26 * 3600 * 1000).toISOString(),
    timeFormatted: '08:41:09 AM',
    dateFormatted: yesterdayDate,
    photoBase64: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&auto=format&fit=crop&q=80',
    latitude: 14.569900,
    longitude: 121.022000,
    accuracy: 25.0,
    distanceMeters: 3100,
    withinGeofence: false,
    status: 'FLAGGED_GEOFENCE',
    deviceInfo: 'Edge / Windows 11 Laptop',
    remarks: 'Submitted from home due to heavy traffic on EDSA',
    facultyNote: 'Awaiting submission of medical/excuse slip before clearing.',
  }
];

// Helper: Philippine Standard Time formatting
function getPSTDetails(date: Date = new Date()) {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Manila',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  };
  const timeFormatted = new Intl.DateTimeFormat('en-US', options).format(date);
  const dateFormatted = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
  return { timeFormatted, dateFormatted };
}

// ----------------- API ROUTES -----------------

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'online',
    portal: 'AMA KingsPortal Attendance System',
    timestamp: new Date().toISOString(),
  });
});

// Authentication
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { identifier, password, role } = req.body;

  if (!identifier) {
    return res.status(400).json({ error: 'Please provide USN or Faculty ID' });
  }

  const cleanId = String(identifier).trim().toUpperCase();

  if (role === 'faculty') {
    const faculty = facultyMembers.find(
      (f) =>
        f.facultyId.toUpperCase() === cleanId ||
        f.email.toUpperCase() === cleanId
    );

    if (faculty) {
      return res.json({
        success: true,
        role: 'faculty',
        user: faculty,
      });
    }

    // Demo fallback for any faculty ID in demo mode
    return res.json({
      success: true,
      role: 'faculty',
      user: {
        facultyId: cleanId,
        name: cleanId.startsWith('FAC') ? 'Engr. Roberto Reyes, MIT' : 'Faculty Member',
        email: `${cleanId.toLowerCase()}@ama.edu.ph`,
        department: 'College of Computer Studies',
        roleTitle: 'Faculty Instructor',
        campusId: 'camp-main',
        avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      },
    });
  } else {
    // Student Login
    const student = students.find((s) => s.usn.toUpperCase() === cleanId);
    if (student) {
      return res.json({
        success: true,
        role: 'student',
        user: student,
      });
    }

    // Demo fallback for students
    const fallbackStudent: Student = {
      usn: cleanId,
      name: 'AMA Student',
      email: `${cleanId.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}@student.ama.edu.ph`,
      course: 'BS Information Technology (BSIT)',
      yearLevel: '3rd Year',
      section: 'IT301-A',
      campusId: 'camp-main',
      avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
      contactNumber: '+63 917 000 0000',
      currentStatus: 'NOT_CLOCKED_IN',
    };
    students.push(fallbackStudent);
    return res.json({
      success: true,
      role: 'student',
      user: fallbackStudent,
    });
  }
});

// Campuses
app.get('/api/campuses', (req: Request, res: Response) => {
  res.json({ campuses });
});

app.put('/api/campuses/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { latitude, longitude, radiusMeters, name, address } = req.body;
  const campus = campuses.find((c) => c.id === id);

  if (!campus) {
    return res.status(404).json({ error: 'Campus not found' });
  }

  if (latitude !== undefined) campus.latitude = Number(latitude);
  if (longitude !== undefined) campus.longitude = Number(longitude);
  if (radiusMeters !== undefined) campus.radiusMeters = Number(radiusMeters);
  if (name) campus.name = name;
  if (address) campus.address = address;

  res.json({ success: true, campus });
});

// Calibrate or set custom test campus location
app.post('/api/campuses/calibrate-custom', (req: Request, res: Response) => {
  const { latitude, longitude, radiusMeters, campusName } = req.body;
  const customId = 'camp-custom-user';
  let customCampus = campuses.find((c) => c.id === customId);

  if (!customCampus) {
    customCampus = {
      id: customId,
      name: campusName || 'My Current Campus Location (Calibrated GPS)',
      code: 'AMA-LOCAL-TEST',
      address: 'Current Device Geofence Perimeter',
      latitude: Number(latitude),
      longitude: Number(longitude),
      radiusMeters: Number(radiusMeters) || 500,
      active: true,
    };
    campuses.unshift(customCampus);
  } else {
    customCampus.latitude = Number(latitude);
    customCampus.longitude = Number(longitude);
    if (radiusMeters) customCampus.radiusMeters = Number(radiusMeters);
    if (campusName) customCampus.name = campusName;
  }

  res.json({ success: true, campus: customCampus });
});

// Schedules for student
app.get('/api/schedules/:usn', (req: Request, res: Response) => {
  const { usn } = req.params;
  const studentSchedule = schedules[usn] || schedules['2023-01492-MN-0'] || [];
  res.json({ schedules: studentSchedule });
});

// Attendance punch for student
app.get('/api/attendance/student/:usn', (req: Request, res: Response) => {
  const { usn } = req.params;
  const records = attendanceRecords
    .filter((r) => r.studentUsn.toUpperCase() === usn.toUpperCase())
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const today = getPSTDetails().dateFormatted;
  const todayRecords = records.filter((r) => r.dateFormatted === today);
  const latestToday = todayRecords[0];

  res.json({
    records,
    todayRecords,
    currentStatus: latestToday
      ? latestToday.type === 'TIME_IN'
        ? 'CLOCKED_IN'
        : 'CLOCKED_OUT'
      : 'NOT_CLOCKED_IN',
    lastPunch: latestToday || null,
  });
});

// Student Daily Attendance Session History (Paired Time In & Time Out with Selfie Proofs)
app.get('/api/attendance/student/:usn/daily-history', (req: Request, res: Response) => {
  const { usn } = req.params;
  const records = attendanceRecords
    .filter((r) => r.studentUsn.toUpperCase() === usn.toUpperCase())
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // Group records by calendar date
  const dateMap = new Map<string, { in?: AttendanceRecord; out?: AttendanceRecord }>();

  records.forEach((rec) => {
    const existing = dateMap.get(rec.dateFormatted) || {};
    if (rec.type === 'TIME_IN') {
      if (!existing.in || new Date(rec.timestamp) < new Date(existing.in.timestamp)) {
        existing.in = rec;
      }
    } else if (rec.type === 'TIME_OUT') {
      if (!existing.out || new Date(rec.timestamp) > new Date(existing.out.timestamp)) {
        existing.out = rec;
      }
    }
    dateMap.set(rec.dateFormatted, existing);
  });

  const sessions: DailyAttendanceSession[] = [];
  const student = students.find((s) => s.usn.toUpperCase() === usn.toUpperCase());
  const studentName = student?.name || 'Student';

  dateMap.forEach((entry, dateKey) => {
    let durationMinutes: number | undefined;
    let durationFormatted: string | undefined;

    if (entry.in && entry.out) {
      const diffMs = new Date(entry.out.timestamp).getTime() - new Date(entry.in.timestamp).getTime();
      if (diffMs > 0) {
        durationMinutes = Math.round(diffMs / 60000);
        const hours = Math.floor(durationMinutes / 60);
        const mins = durationMinutes % 60;
        durationFormatted = `${hours}h ${mins}m`;
      }
    }

    const dateObj = new Date(dateKey + 'T00:00:00');
    const dateDisplay = isNaN(dateObj.getTime())
      ? dateKey
      : new Intl.DateTimeFormat('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }).format(dateObj);

    sessions.push({
      dateFormatted: dateKey,
      dateDisplay,
      studentUsn: usn,
      studentName,
      timeIn: entry.in,
      timeOut: entry.out,
      status: entry.in && entry.out ? 'COMPLETED' : entry.in ? 'IN_PROGRESS' : 'TIME_OUT_ONLY',
      durationMinutes,
      durationFormatted,
    });
  });

  // Sort descending by date (most recent first)
  sessions.sort((a, b) => b.dateFormatted.localeCompare(a.dateFormatted));

  res.json({ sessions });
});

// Picture Attendance Submission & Geolocation Verification
app.post('/api/attendance/punch', (req: Request, res: Response) => {
  try {
    const {
      usn,
      type, // 'TIME_IN' | 'TIME_OUT'
      photoBase64,
      latitude,
      longitude,
      accuracy,
      campusId,
      subjectCode,
      remarks,
      simulateAtCampus,
      deviceInfo,
    } = req.body;

    if (!usn || !type) {
      return res.status(400).json({ error: 'Missing USN or punch type' });
    }

    if (!photoBase64) {
      return res.status(400).json({ error: 'Selfie photo capture is required for proof of presence.' });
    }

    // Find student
    let student = students.find((s) => s.usn.toUpperCase() === String(usn).toUpperCase());
    if (!student) {
      student = {
        usn,
        name: 'AMA Student',
        email: `${usn}@student.ama.edu.ph`,
        course: 'BS Information Technology',
        yearLevel: '3rd Year',
        section: 'IT301-A',
        campusId: campusId || 'camp-main',
        avatarUrl: photoBase64,
        contactNumber: '+63 900 000 0000',
        currentStatus: 'NOT_CLOCKED_IN',
      };
      students.push(student);
    }

    // Target Campus to verify against
    const targetCampusId = campusId || student.campusId || 'camp-main';
    const targetCampus = campuses.find((c) => c.id === targetCampusId) || campuses[0];

    // Coordinates: if simulateAtCampus is true, adjust coordinates to campus center
    let clientLat = Number(latitude);
    let clientLng = Number(longitude);
    const clientAccuracy = Number(accuracy) || 10;

    if (simulateAtCampus || isNaN(clientLat) || isNaN(clientLng)) {
      // If user simulated or coordinates were mocked/missing
      clientLat = targetCampus.latitude + (Math.random() - 0.5) * 0.0004; // ~20m jitter
      clientLng = targetCampus.longitude + (Math.random() - 0.5) * 0.0004;
    }

    // Calculate distance
    const distanceMeters = calculateHaversineDistance(
      clientLat,
      clientLng,
      targetCampus.latitude,
      targetCampus.longitude
    );

    const withinGeofence = distanceMeters <= targetCampus.radiusMeters;
    const status: AttendanceRecord['status'] = withinGeofence ? 'VERIFIED' : 'FLAGGED_GEOFENCE';

    const now = new Date();
    const { timeFormatted, dateFormatted } = getPSTDetails(now);

    // Subject reference
    const studentSched = schedules[student.usn] || [];
    const matchedSubject = studentSched.find((s) => s.subjectCode === subjectCode);

    const newRecord: AttendanceRecord = {
      id: `att-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      studentUsn: student.usn,
      studentName: student.name,
      studentAvatar: student.avatarUrl || photoBase64,
      courseSection: `${student.course} / ${student.section}`,
      campusId: targetCampus.id,
      campusName: targetCampus.name,
      type: type as 'TIME_IN' | 'TIME_OUT',
      timestamp: now.toISOString(),
      timeFormatted,
      dateFormatted,
      subjectCode: subjectCode || (matchedSubject ? matchedSubject.subjectCode : undefined),
      subjectTitle: matchedSubject ? matchedSubject.subjectTitle : undefined,
      photoBase64,
      latitude: clientLat,
      longitude: clientLng,
      accuracy: clientAccuracy,
      distanceMeters,
      withinGeofence,
      status,
      deviceInfo: deviceInfo || 'Web Camera / Geolocation API',
      remarks: remarks || '',
    };

    // Update student's state
    student.currentStatus = type === 'TIME_IN' ? 'CLOCKED_IN' : 'CLOCKED_OUT';
    student.lastPunchTime = now.toISOString();
    student.lastPunchType = type as 'TIME_IN' | 'TIME_OUT';

    // Store attendance
    attendanceRecords.unshift(newRecord);

    return res.status(201).json({
      success: true,
      record: newRecord,
      message: withinGeofence
        ? `Successfully recorded ${type.replace('_', ' ')}! You are within ${targetCampus.name} perimeter (${distanceMeters}m from center).`
        : `Recorded ${type.replace('_', ' ')}, but flagged! You are ${distanceMeters}m away from ${targetCampus.name} (exceeds ${targetCampus.radiusMeters}m geofence radius).`,
    });
  } catch (error: any) {
    console.error('Error recording attendance:', error);
    return res.status(500).json({ error: error.message || 'Internal server error processing punch.' });
  }
});

// Faculty: Attendance Logs with search and filters
app.get('/api/faculty/attendance', (req: Request, res: Response) => {
  const { date, section, status, search, type } = req.query;

  let filtered = [...attendanceRecords];

  if (date) {
    filtered = filtered.filter((r) => r.dateFormatted === date);
  }

  if (section && section !== 'ALL') {
    filtered = filtered.filter((r) =>
      r.courseSection.toLowerCase().includes(String(section).toLowerCase())
    );
  }

  if (status && status !== 'ALL') {
    filtered = filtered.filter((r) => r.status === status);
  }

  if (type && type !== 'ALL') {
    filtered = filtered.filter((r) => r.type === type);
  }

  if (search) {
    const q = String(search).toLowerCase();
    filtered = filtered.filter(
      (r) =>
        r.studentName.toLowerCase().includes(q) ||
        r.studentUsn.toLowerCase().includes(q) ||
        (r.subjectCode && r.subjectCode.toLowerCase().includes(q))
    );
  }

  // Sort descending by timestamp
  filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  res.json({ records: filtered, total: filtered.length });
});

// Admin / Faculty: Export Attendance Database Logs to Excel (.xlsx)
app.get('/api/faculty/export-excel', (req: Request, res: Response) => {
  try {
    const { date, section, status, search, type } = req.query;

    let filtered = [...attendanceRecords];

    if (date) {
      filtered = filtered.filter((r) => r.dateFormatted === date);
    }
    if (section && section !== 'ALL') {
      filtered = filtered.filter((r) =>
        r.courseSection.toLowerCase().includes(String(section).toLowerCase())
      );
    }
    if (status && status !== 'ALL') {
      filtered = filtered.filter((r) => r.status === status);
    }
    if (type && type !== 'ALL') {
      filtered = filtered.filter((r) => r.type === type);
    }
    if (search) {
      const q = String(search).toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.studentName.toLowerCase().includes(q) ||
          r.studentUsn.toLowerCase().includes(q) ||
          (r.subjectCode && r.subjectCode.toLowerCase().includes(q))
      );
    }

    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Prepare rows for Excel worksheet
    const excelRows = filtered.map((r, idx) => ({
      'No.': idx + 1,
      'Record ID': r.id,
      'Date': r.dateFormatted,
      'Time (PST)': r.timeFormatted,
      'Punch Action': r.type === 'TIME_IN' ? 'TIME IN (Arrival)' : 'TIME OUT (Dismissal)',
      'Student Name': r.studentName,
      'USN': r.studentUsn,
      'Course & Section': r.courseSection,
      'Subject Code': r.subjectCode || 'General Campus',
      'Subject Description': r.subjectTitle || '',
      'Campus Venue': r.campusName,
      'Distance (Meters)': r.distanceMeters,
      'Geofence Check': r.withinGeofence ? 'PASSED (On Campus)' : 'FLAGGED (Outside Perimeter)',
      'Verification Status': r.status,
      'GPS Latitude': r.latitude,
      'GPS Longitude': r.longitude,
      'GPS Accuracy (m)': r.accuracy,
      'Faculty Remarks': r.facultyNote || 'None',
      'Student Remarks': r.remarks || '',
      'Device/Signature': r.deviceInfo || 'Web Camera Geolocation',
      'Reviewed By': r.reviewedBy || 'Pending',
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelRows);

    // Auto Column Widths
    ws['!cols'] = [
      { wch: 6 },  // No.
      { wch: 18 }, // Record ID
      { wch: 12 }, // Date
      { wch: 14 }, // Time
      { wch: 22 }, // Punch Action
      { wch: 25 }, // Student Name
      { wch: 18 }, // USN
      { wch: 28 }, // Course & Section
      { wch: 14 }, // Subject Code
      { wch: 30 }, // Subject Description
      { wch: 32 }, // Campus
      { wch: 16 }, // Distance
      { wch: 24 }, // Geofence Check
      { wch: 20 }, // Verification Status
      { wch: 14 }, // Lat
      { wch: 14 }, // Lng
      { wch: 16 }, // Accuracy
      { wch: 26 }, // Faculty Remarks
      { wch: 26 }, // Student Remarks
      { wch: 28 }, // Device
      { wch: 20 }, // Reviewed By
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Attendance Logs');

    // Audit Summary Sheet
    const totalLogs = filtered.length;
    const timeIns = filtered.filter((r) => r.type === 'TIME_IN').length;
    const timeOuts = filtered.filter((r) => r.type === 'TIME_OUT').length;
    const verified = filtered.filter((r) => r.status === 'VERIFIED' || r.status === 'MANUALLY_APPROVED').length;
    const flagged = filtered.filter((r) => r.status === 'FLAGGED_GEOFENCE').length;

    const statsRows = [
      { 'Metric': 'Institution', 'Details': 'AMA Computer College - KingsPortal' },
      { 'Metric': 'Report Name', 'Details': 'Official Attendance Database Logs Audit' },
      { 'Metric': 'Date Exported', 'Details': getPSTDetails().dateFormatted },
      { 'Metric': 'Time Exported (PST)', 'Details': getPSTDetails().timeFormatted },
      { 'Metric': 'Total Attendance Records', 'Details': totalLogs },
      { 'Metric': 'Total Time In Punches', 'Details': timeIns },
      { 'Metric': 'Total Time Out Punches', 'Details': timeOuts },
      { 'Metric': 'Verified On-Campus', 'Details': verified },
      { 'Metric': 'Flagged Geofence Discrepancies', 'Details': flagged },
      { 'Metric': 'Campus Compliance Rate', 'Details': `${totalLogs > 0 ? Math.round((verified / totalLogs) * 100) : 100}%` },
    ];
    const statsWs = XLSX.utils.json_to_sheet(statsRows);
    statsWs['!cols'] = [{ wch: 30 }, { wch: 45 }];
    XLSX.utils.book_append_sheet(wb, statsWs, 'Audit Summary');

    const fileBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const fileName = `AMA_KingsPortal_Attendance_Database_${new Date().toISOString().split('T')[0]}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.send(fileBuffer);
  } catch (error: any) {
    console.error('Error generating Excel file:', error);
    return res.status(500).json({ error: 'Failed to generate Excel report' });
  }
});

// Faculty: Review / Override Attendance record
app.patch('/api/faculty/attendance/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, facultyNote, reviewedBy } = req.body;

  const record = attendanceRecords.find((r) => r.id === id);
  if (!record) {
    return res.status(404).json({ error: 'Attendance record not found' });
  }

  if (status) record.status = status;
  if (facultyNote !== undefined) record.facultyNote = facultyNote;
  if (reviewedBy) record.reviewedBy = reviewedBy;
  record.reviewedAt = new Date().toISOString();

  res.json({ success: true, record });
});

// Faculty: Stats dashboard
app.get('/api/faculty/stats', (req: Request, res: Response) => {
  const today = getPSTDetails().dateFormatted;
  const todayLogs = attendanceRecords.filter((r) => r.dateFormatted === today);

  const currentlyClockedIn = students.filter((s) => s.currentStatus === 'CLOCKED_IN').length;
  const verifiedOnCampus = todayLogs.filter(
    (r) => r.status === 'VERIFIED' || r.status === 'MANUALLY_APPROVED'
  ).length;
  const flaggedGeofence = todayLogs.filter((r) => r.status === 'FLAGGED_GEOFENCE').length;
  const pendingReviews = todayLogs.filter((r) => r.status === 'FLAGGED_GEOFENCE' && !r.reviewedBy).length;

  const complianceRate =
    todayLogs.length > 0 ? Math.round((verifiedOnCampus / todayLogs.length) * 100) : 100;

  const stats: FacultyStats = {
    todayTotalPunches: todayLogs.length,
    currentlyClockedIn,
    verifiedOnCampus,
    flaggedGeofence,
    pendingReviews,
    complianceRate,
  };

  res.json({ stats, todayDate: today });
});

// Vite integration for SPA development & production
async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`🚀 AMA KingsPortal server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});

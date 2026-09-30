/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { UserRole, Student, Faculty, Campus, AttendanceRecord, PunchType } from './types';
import { Header } from './components/Header';
import { LoginModal } from './components/LoginModal';
import { StudentPortal } from './components/StudentPortal';
import { FacultyDashboard } from './components/FacultyDashboard';
import { PictureAttendanceModal } from './components/PictureAttendanceModal';
import { AttendanceCardModal } from './components/AttendanceCardModal';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export default function App() {
  const [currentRole, setCurrentRole] = useState<UserRole>('student');
  const [student, setStudent] = useState<Student | null>(null);
  const [faculty, setFaculty] = useState<Faculty | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  // Core Data
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);

  // Modals
  const [punchModalOpen, setPunchModalOpen] = useState<boolean>(false);
  const [punchType, setPunchType] = useState<PunchType>('TIME_IN');
  const [inspectRecord, setInspectRecord] = useState<AttendanceRecord | null>(null);
  const [kioskPunchOpen, setKioskPunchOpen] = useState<boolean>(false);

  // Toast notifications
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: 'success' | 'warning' | 'info';
  } | null>(null);

  const showToast = (text: string, type: 'success' | 'warning' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Load Initial Campuses
  useEffect(() => {
    fetch('/api/campuses')
      .then((res) => res.json())
      .then((data) => {
        if (data.campuses) {
          setCampuses(data.campuses);
        }
      })
      .catch((err) => console.error('Error fetching campuses:', err));
  }, []);

  // Fetch Student Attendance
  const loadStudentData = async (usn: string) => {
    try {
      const attRes = await fetch(`/api/attendance/student/${encodeURIComponent(usn)}`);
      const attData = await attRes.json();

      if (attData.records) {
        setAttendanceRecords(attData.records);
      }

      // Update student currentStatus if returned
      if (attData.currentStatus && student) {
        setStudent((prev) =>
          prev ? { ...prev, currentStatus: attData.currentStatus } : null
        );
      }
    } catch (err) {
      console.error('Error loading student data:', err);
    }
  };

  // Handle Login
  const handleLoginSuccess = (role: UserRole, user: any) => {
    setCurrentRole(role);
    setIsAuthenticated(true);
    if (role === 'student') {
      setStudent(user);
      setFaculty(null);
      loadStudentData(user.usn);
    } else {
      setFaculty(user);
      setStudent(null);
    }
    showToast(`Signed in to AMA KingsPortal as ${user.name}`);
  };

  // Logout
  const handleLogout = () => {
    setIsAuthenticated(false);
    setStudent(null);
    setFaculty(null);
    showToast('Signed out of KingsPortal', 'info');
  };

  // Open Picture Attendance Modal
  const handleOpenPunchModal = (type: PunchType) => {
    setPunchType(type);
    setPunchModalOpen(true);
  };

  // Handle Successful Punch Submission
  const handlePunchSuccess = (record: AttendanceRecord) => {
    setPunchModalOpen(false);
    if (student) {
      loadStudentData(student.usn);
    }
    setInspectRecord(record);

    if (record.withinGeofence) {
      showToast(
        `✓ ${record.type.replace('_', ' ')} verified! You are on campus (${record.distanceMeters}m).`,
        'success'
      );
    } else {
      showToast(
        `⚠ ${record.type.replace('_', ' ')} recorded outside geofence (${record.distanceMeters}m). Flagged for faculty review.`,
        'warning'
      );
    }
  };

  // Update Campus in state
  const handleUpdateCampus = (updated: Campus) => {
    setCampuses((prev) =>
      prev.map((c) => (c.id === updated.id ? updated : c))
    );
    showToast(`Campus perimeter updated for ${updated.name}`);
  };

  // If not logged in, show Login Screen
  if (!isAuthenticated) {
    return (
      <>
        <LoginModal
          onLoginSuccess={handleLoginSuccess}
          onOpenKioskPunch={() => setKioskPunchOpen(true)}
        />

        {/* Express Kiosk Camera Punch Modal */}
        {kioskPunchOpen && (
          <PictureAttendanceModal
            student={{
              usn: '2023-01492-MN-0',
              name: 'Student Kiosk User',
              email: 'student@ama.edu.ph',
              course: 'BS Information Technology (BSIT)',
              yearLevel: '3rd Year',
              section: 'IT301-A',
              campusId: 'camp-main',
              avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
              contactNumber: '+63 900 000 0000',
              currentStatus: 'NOT_CLOCKED_IN',
            }}
            defaultType="TIME_IN"
            campuses={campuses}
            allowUsnEdit={true}
            onClose={() => setKioskPunchOpen(false)}
            onSuccess={(record) => {
              setKioskPunchOpen(false);
              setInspectRecord(record);
              if (record.withinGeofence) {
                showToast(
                  `✓ Kiosk: ${record.type.replace('_', ' ')} recorded & verified for USN ${record.studentUsn}!`,
                  'success'
                );
              } else {
                showToast(
                  `⚠ Kiosk: ${record.type.replace('_', ' ')} recorded outside geofence (${record.distanceMeters}m). Flagged for review.`,
                  'warning'
                );
              }
            }}
          />
        )}

        {/* Detail / Proof Lightbox Modal */}
        {inspectRecord && (
          <AttendanceCardModal
            record={inspectRecord}
            onClose={() => setInspectRecord(null)}
          />
        )}

        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-5 right-5 z-50 animate-bounce">
            <div
              className={`px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-3 text-sm font-semibold border ${
                toastMessage.type === 'success'
                  ? 'bg-emerald-950/95 border-emerald-500 text-emerald-100'
                  : toastMessage.type === 'warning'
                  ? 'bg-amber-950/95 border-amber-500 text-amber-100'
                  : 'bg-blue-950/95 border-blue-500 text-blue-100'
              }`}
            >
              {toastMessage.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
              )}
              <span>{toastMessage.text}</span>
            </div>
          </div>
        )}
      </>
    );
  }

  const activeCampus =
    campuses.find((c) => c.id === (student?.campusId || faculty?.campusId)) ||
    campuses[0] ||
    null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-red-500 selection:text-white">
      {/* Header Navigation */}
      <Header
        currentRole={currentRole}
        student={student}
        faculty={faculty}
        activeCampus={activeCampus}
        onLogout={handleLogout}
        onOpenSelfieAttendance={handleOpenPunchModal}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-12">
        {currentRole === 'student' && student ? (
          <StudentPortal
            student={student}
            campus={activeCampus}
            campuses={campuses}
            attendanceRecords={attendanceRecords}
            onOpenPunchModal={handleOpenPunchModal}
            onViewRecord={(rec) => setInspectRecord(rec)}
            onRefreshData={() => loadStudentData(student.usn)}
          />
        ) : currentRole === 'faculty' && faculty ? (
          <FacultyDashboard
            faculty={faculty}
            campuses={campuses}
            onUpdateCampus={handleUpdateCampus}
            onViewRecord={(rec) => setInspectRecord(rec)}
          />
        ) : null}
      </main>

      {/* Camera & Geolocation Picture Attendance Modal */}
      {punchModalOpen && student && (
        <PictureAttendanceModal
          student={student}
          defaultType={punchType}
          campuses={campuses}
          onClose={() => setPunchModalOpen(false)}
          onSuccess={handlePunchSuccess}
        />
      )}

      {/* Detail / Proof Lightbox Modal */}
      {inspectRecord && (
        <AttendanceCardModal
          record={inspectRecord}
          onClose={() => setInspectRecord(null)}
        />
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 animate-bounce">
          <div
            className={`px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-3 text-sm font-semibold border ${
              toastMessage.type === 'success'
                ? 'bg-emerald-950/95 border-emerald-500 text-emerald-100'
                : toastMessage.type === 'warning'
                ? 'bg-amber-950/95 border-amber-500 text-amber-100'
                : 'bg-blue-950/95 border-blue-500 text-blue-100'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}
    </div>
  );
}

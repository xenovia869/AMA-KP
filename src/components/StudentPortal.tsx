import React, { useState, useEffect } from 'react';
import {
  Student,
  Campus,
  AttendanceRecord,
  PunchType,
  DailyAttendanceSession,
} from '../types';
import { RealTimeClock } from './RealTimeClock';
import {
  Clock,
  Camera,
  MapPin,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  User,
  ChevronRight,
  Award,
  Sparkles,
  Info,
  History,
  Timer,
  CheckCircle,
  Eye,
  ListFilter,
  ArrowRight,
} from 'lucide-react';
import { formatDistance, getCurrentPST } from '../utils/geo';

interface StudentPortalProps {
  student: Student;
  campus: Campus | null;
  campuses: Campus[];
  attendanceRecords: AttendanceRecord[];
  onOpenPunchModal: (type: PunchType) => void;
  onViewRecord: (record: AttendanceRecord) => void;
  onRefreshData: () => void;
}

export const StudentPortal: React.FC<StudentPortalProps> = ({
  student,
  campus,
  campuses,
  attendanceRecords,
  onOpenPunchModal,
  onViewRecord,
  onRefreshData,
}) => {
  // Main Navigation Tabs
  const [activeMainTab, setActiveMainTab] = useState<'history' | 'allLogs'>('history');

  // Daily Sessions State
  const [dailySessions, setDailySessions] = useState<DailyAttendanceSession[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(true);

  // Fetch student daily history from API
  const fetchDailyHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/attendance/student/${encodeURIComponent(student.usn)}/daily-history`);
      const data = await res.json();
      if (data.sessions) {
        setDailySessions(data.sessions);
      }
    } catch (e) {
      console.error('Failed to load daily attendance sessions:', e);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchDailyHistory();
  }, [student.usn, attendanceRecords]);

  // Filter today's punches
  const todayDateStr = getCurrentPST().dateFormatted;
  const todayPunches = attendanceRecords.filter((r) => r.dateFormatted === todayDateStr);
  const timeInRecord = todayPunches.find((r) => r.type === 'TIME_IN');
  const timeOutRecord = todayPunches.find((r) => r.type === 'TIME_OUT');

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Real-time Clock Banner */}
      <RealTimeClock campusName={campus?.name} />

      {/* Student Profile & Quick Punch Hero */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Student Info */}
          <div className="flex items-start sm:items-center space-x-4">
            <div className="relative flex-shrink-0">
              <img
                src={student.avatarUrl}
                alt={student.name}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-amber-400 shadow-md"
              />
              <span className="absolute -bottom-1 -right-1 bg-blue-600 text-white p-1 rounded-lg border-2 border-slate-900 shadow">
                <Award className="w-3.5 h-3.5 text-amber-300" />
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-extrabold text-white">
                  {student.name}
                </h2>
                <span className="bg-blue-900/80 text-blue-200 border border-blue-700/60 font-mono text-xs px-2.5 py-0.5 rounded-full font-bold">
                  {student.usn}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 font-medium">
                {student.course} • Section {student.section}
              </p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                <span className="flex items-center space-x-1">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  <span>{campus?.name || 'Main Campus QC'}</span>
                </span>
                <span>•</span>
                <span className="text-emerald-400 font-medium">{student.yearLevel}</span>
              </div>
            </div>
          </div>

          {/* Today's Punch Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-slate-950/80 border border-slate-800/90 rounded-xl p-3 sm:p-4">
            {/* Status Indicator */}
            <div className="text-left sm:pr-4 sm:border-r border-slate-800">
              <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider block">
                Daily Status
              </span>
              <div className="flex items-center space-x-2 mt-0.5">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    timeOutRecord
                      ? 'bg-blue-400'
                      : timeInRecord
                      ? 'bg-emerald-400 animate-pulse'
                      : 'bg-amber-400'
                  }`}
                />
                <span className="font-bold text-white text-sm">
                  {timeOutRecord
                    ? 'Clocked Out for Today'
                    : timeInRecord
                    ? 'Currently Clocked In'
                    : 'Not Clocked In Yet'}
                </span>
              </div>
              {timeInRecord && (
                <p className="text-[11px] text-emerald-300/80 mt-0.5 font-mono">
                  In: {timeInRecord.timeFormatted}
                </p>
              )}
            </div>

            {/* Picture Attendance Trigger Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onOpenPunchModal('TIME_IN')}
                className="flex-1 sm:flex-none flex items-center justify-center space-x-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm shadow-lg shadow-emerald-950/40 transition cursor-pointer"
              >
                <Camera className="w-4 h-4 text-emerald-200" />
                <span>Picture Time In</span>
              </button>

              <button
                type="button"
                onClick={() => onOpenPunchModal('TIME_OUT')}
                className="flex-1 sm:flex-none flex items-center justify-center space-x-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm shadow-lg shadow-red-950/40 transition cursor-pointer"
              >
                <Camera className="w-4 h-4 text-red-200" />
                <span>Picture Time Out</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Top Navigation Tabs */}
      <div className="flex bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 shadow-md">
        <button
          type="button"
          onClick={() => setActiveMainTab('history')}
          className={`flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
            activeMainTab === 'history'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Time In & Time Out History</span>
          <span className="text-[10px] bg-slate-950/70 px-2 py-0.5 rounded-full font-mono">
            {dailySessions.length} Days
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab('allLogs')}
          className={`flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
            activeMainTab === 'allLogs'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ListFilter className="w-4 h-4" />
          <span>Raw Audit Logs</span>
          <span className="text-[10px] bg-slate-950/70 px-2 py-0.5 rounded-full font-mono">
            {attendanceRecords.length} Punches
          </span>
        </button>
      </div>

      {/* TAB 1: TIME IN & TIME OUT HISTORY (PAIRED SESSIONS WITH SELFIE PICTURES) */}
      {activeMainTab === 'history' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <History className="w-5 h-5 text-amber-400" />
                <span>Daily Time In & Time Out Attendance Records</span>
              </h3>
              <p className="text-xs text-slate-400">
                Official student presence journal featuring verified selfie photographs and total hours rendered
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                fetchDailyHistory();
                onRefreshData();
              }}
              className="text-xs text-blue-400 hover:underline flex items-center space-x-1 self-start sm:self-auto cursor-pointer"
            >
              <span>Refresh Records</span>
            </button>
          </div>

          {dailySessions.length > 0 ? (
            <div className="space-y-4">
              {dailySessions.map((session) => (
                <div
                  key={session.dateFormatted}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4"
                >
                  {/* Session Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/90 pb-3">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-xl bg-blue-950 border border-blue-800/60 text-blue-400">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-sm sm:text-base">
                          {session.dateDisplay}
                        </h4>
                        <span className="text-[11px] text-slate-400 font-mono">
                          Date: {session.dateFormatted}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2.5">
                      {session.durationFormatted && (
                        <div className="flex items-center space-x-1.5 bg-indigo-950/80 border border-indigo-700/60 text-indigo-200 px-3 py-1 rounded-xl text-xs font-mono font-bold">
                          <Timer className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Duration: {session.durationFormatted}</span>
                        </div>
                      )}

                      <span
                        className={`text-xs font-bold px-3 py-1 rounded-xl uppercase tracking-wider ${
                          session.status === 'COMPLETED'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60'
                            : session.status === 'IN_PROGRESS'
                            ? 'bg-amber-950 text-amber-300 border border-amber-700/60'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {session.status === 'COMPLETED'
                          ? 'Completed (In & Out)'
                          : session.status === 'IN_PROGRESS'
                          ? 'In Progress (Clocked In)'
                          : 'Time Out Only'}
                      </span>
                    </div>
                  </div>

                  {/* Paired Selfies Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Time In Card */}
                    <div
                      className={`p-3.5 rounded-xl border transition ${
                        session.timeIn
                          ? 'bg-slate-950/90 border-slate-800 hover:border-emerald-600/50'
                          : 'bg-slate-950/40 border-dashed border-slate-800 text-slate-500'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2.5">
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center space-x-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          <span>TIME IN (Arrival)</span>
                        </span>
                        {session.timeIn && (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              session.timeIn.status === 'VERIFIED'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            }`}
                          >
                            {session.timeIn.status}
                          </span>
                        )}
                      </div>

                      {session.timeIn ? (
                        <div className="flex items-start space-x-3.5">
                          {/* Selfie Picture */}
                          <div
                            onClick={() => onViewRecord(session.timeIn!)}
                            className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-slate-800 border-2 border-slate-700 flex-shrink-0 cursor-pointer group shadow"
                          >
                            <img
                              src={session.timeIn.photoBase64}
                              alt="Time In Selfie"
                              className="w-full h-full object-cover group-hover:scale-105 transition"
                            />
                            <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                              <Eye className="w-5 h-5 text-white" />
                            </div>
                            <span className="absolute bottom-1 right-1 bg-slate-950/80 text-white text-[9px] px-1 rounded font-mono">
                              Photo
                            </span>
                          </div>

                          <div className="text-xs space-y-1 flex-1">
                            <div className="font-mono text-base font-extrabold text-white">
                              {session.timeIn.timeFormatted}
                            </div>
                            <p className="text-[11px] text-slate-400 flex items-center space-x-1">
                              <MapPin className="w-3 h-3 text-amber-400 flex-shrink-0" />
                              <span>
                                {session.timeIn.campusName} (
                                {formatDistance(session.timeIn.distanceMeters)})
                              </span>
                            </p>
                            {session.timeIn.remarks && (
                              <p className="text-[11px] text-slate-300 italic truncate max-w-[220px]">
                                "{session.timeIn.remarks}"
                              </p>
                            )}
                            <button
                              type="button"
                              onClick={() => onViewRecord(session.timeIn!)}
                              className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold pt-1 flex items-center space-x-1 cursor-pointer"
                            >
                              <span>View Full Evidence</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="py-6 text-center text-xs text-slate-500">
                          <p>No Time-In recorded for this date</p>
                        </div>
                      )}
                    </div>

                    {/* Time Out Card */}
                    <div
                      className={`p-3.5 rounded-xl border transition ${
                        session.timeOut
                          ? 'bg-slate-950/90 border-slate-800 hover:border-red-600/50'
                          : 'bg-slate-950/40 border-dashed border-slate-800 text-slate-500'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2.5">
                        <span className="text-xs font-bold uppercase tracking-wider text-red-400 flex items-center space-x-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          <span>TIME OUT (Dismissal)</span>
                        </span>
                        {session.timeOut ? (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              session.timeOut.status === 'VERIFIED'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            }`}
                          >
                            {session.timeOut.status}
                          </span>
                        ) : session.timeIn ? (
                          <button
                            type="button"
                            onClick={() => onOpenPunchModal('TIME_OUT')}
                            className="text-[10px] bg-red-600 hover:bg-red-500 text-white font-bold px-2.5 py-0.5 rounded-md cursor-pointer"
                          >
                            Time Out Now
                          </button>
                        ) : null}
                      </div>

                      {session.timeOut ? (
                        <div className="flex items-start space-x-3.5">
                          {/* Selfie Picture */}
                          <div
                            onClick={() => onViewRecord(session.timeOut!)}
                            className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-slate-800 border-2 border-slate-700 flex-shrink-0 cursor-pointer group shadow"
                          >
                            <img
                              src={session.timeOut.photoBase64}
                              alt="Time Out Selfie"
                              className="w-full h-full object-cover group-hover:scale-105 transition"
                            />
                            <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                              <Eye className="w-5 h-5 text-white" />
                            </div>
                            <span className="absolute bottom-1 right-1 bg-slate-950/80 text-white text-[9px] px-1 rounded font-mono">
                              Photo
                            </span>
                          </div>

                          <div className="text-xs space-y-1 flex-1">
                            <div className="font-mono text-base font-extrabold text-white">
                              {session.timeOut.timeFormatted}
                            </div>
                            <p className="text-[11px] text-slate-400 flex items-center space-x-1">
                              <MapPin className="w-3 h-3 text-amber-400 flex-shrink-0" />
                              <span>
                                {session.timeOut.campusName} (
                                {formatDistance(session.timeOut.distanceMeters)})
                              </span>
                            </p>
                            {session.timeOut.remarks && (
                              <p className="text-[11px] text-slate-300 italic truncate max-w-[220px]">
                                "{session.timeOut.remarks}"
                              </p>
                            )}
                            <button
                              type="button"
                              onClick={() => onViewRecord(session.timeOut!)}
                              className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold pt-1 flex items-center space-x-1 cursor-pointer"
                            >
                              <span>View Full Evidence</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="py-6 text-center text-xs text-slate-400 space-y-1">
                          <p className="font-semibold text-slate-300">
                            {session.timeIn
                              ? 'Currently Clocked In — Ready for Time Out'
                              : 'No Time-Out record for this date'}
                          </p>
                          {session.timeIn && (
                            <button
                              type="button"
                              onClick={() => onOpenPunchModal('TIME_OUT')}
                              className="text-xs text-red-400 hover:underline font-bold inline-block"
                            >
                              Click here to snap dismissal selfie
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center text-slate-400 space-y-3">
              <Camera className="w-10 h-10 text-slate-600 mx-auto" />
              <h4 className="font-bold text-white text-base">No Attendance History Found</h4>
              <p className="text-xs max-w-md mx-auto">
                Snap a selfie photo using "Picture Time In" above to register your first verified attendance record.
              </p>
              <button
                type="button"
                onClick={() => onOpenPunchModal('TIME_IN')}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl cursor-pointer shadow"
              >
                Time In Now
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ALL RAW PUNCH AUDIT LOGS */}
      {activeMainTab === 'allLogs' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center space-x-2">
                <ListFilter className="w-5 h-5 text-amber-400" />
                <span>All Attendance Punch Logs (Chronological Audit)</span>
              </h3>
              <p className="text-xs text-slate-400">
                Detailed record of every individual Time-In and Time-Out punch event
              </p>
            </div>
            <button
              type="button"
              onClick={onRefreshData}
              className="text-xs text-blue-400 hover:underline cursor-pointer"
            >
              Refresh
            </button>
          </div>

          {attendanceRecords.length > 0 ? (
            <div className="space-y-3">
              {attendanceRecords.map((rec) => (
                <div
                  key={rec.id}
                  onClick={() => onViewRecord(rec)}
                  className="p-3.5 bg-slate-950/90 border border-slate-800 hover:border-blue-700/60 rounded-xl flex items-center justify-between gap-3 cursor-pointer group transition"
                >
                  <div className="flex items-center space-x-3.5">
                    <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-slate-800 flex-shrink-0 border border-slate-700">
                      <img
                        src={rec.photoBase64}
                        alt="Selfie proof"
                        className="w-full h-full object-cover group-hover:scale-105 transition"
                      />
                      <span
                        className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border border-slate-950 ${
                          rec.status === 'VERIFIED' || rec.status === 'MANUALLY_APPROVED'
                            ? 'bg-emerald-400'
                            : 'bg-amber-400'
                        }`}
                      />
                    </div>

                    <div className="text-xs space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase ${
                            rec.type === 'TIME_IN'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : 'bg-red-950 text-red-300 border border-red-800'
                          }`}
                        >
                          {rec.type.replace('_', ' ')}
                        </span>
                        <span className="text-slate-200 font-mono font-bold text-sm">
                          {rec.timeFormatted}
                        </span>
                        <span className="text-slate-400 font-mono text-xs">
                          {rec.dateFormatted}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-400 flex items-center space-x-1">
                        <MapPin className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                        <span>
                          {rec.campusName} •{' '}
                          {rec.withinGeofence
                            ? `Inside Geofence (${formatDistance(rec.distanceMeters)})`
                            : `Outside Geofence (${formatDistance(rec.distanceMeters)})`}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                        rec.status === 'VERIFIED'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : rec.status === 'MANUALLY_APPROVED'
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}
                    >
                      {rec.status === 'FLAGGED_GEOFENCE' ? 'Flagged' : rec.status}
                    </span>
                    <div className="text-[11px] text-blue-400 flex items-center justify-end space-x-0.5 mt-2 group-hover:underline">
                      <span>View Selfie Evidence</span>
                      <ChevronRight className="w-3 h-3" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400">
              <p>No punch logs found.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

import React from 'react';
import { AttendanceRecord } from '../types';
import { formatDistance } from '../utils/geo';
import { X, CheckCircle, AlertTriangle, MapPin, Clock, Calendar, ShieldCheck, User } from 'lucide-react';

interface AttendanceCardModalProps {
  record: AttendanceRecord | null;
  onClose: () => void;
}

export const AttendanceCardModal: React.FC<AttendanceCardModalProps> = ({
  record,
  onClose,
}) => {
  if (!record) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden my-auto text-white">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 border-b border-blue-800/60 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div
              className={`w-3 h-3 rounded-full ${
                record.withinGeofence ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
            <h3 className="font-bold text-base sm:text-lg text-white">
              Attendance Photo & Geoverification Proof
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs sm:text-sm">
          {/* Selfie Proof Image */}
          <div className="relative aspect-4/3 rounded-xl overflow-hidden bg-slate-950 border border-slate-700 shadow-inner">
            <img
              src={record.photoBase64}
              alt="Student Selfie Evidence"
              className="w-full h-full object-cover"
            />
            <div className="absolute top-3 left-3 bg-slate-950/85 backdrop-blur-sm px-2.5 py-1 rounded-md text-[11px] font-bold text-white border border-slate-700 font-mono">
              {record.type.replace('_', ' ')}
            </div>
            <div className="absolute bottom-3 left-3 bg-slate-950/85 backdrop-blur-sm px-2.5 py-1 rounded-md text-[11px] text-white border border-slate-700 font-mono">
              {record.dateFormatted} • {record.timeFormatted} PST
            </div>
          </div>

          {/* Student Info */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Student:</span>
              <span className="font-bold text-white">{record.studentName}</span>
            </div>
            <div className="flex justify-between font-mono">
              <span className="text-slate-400">USN:</span>
              <span className="text-amber-400 font-semibold">{record.studentUsn}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Program / Section:</span>
              <span className="text-slate-200">{record.courseSection}</span>
            </div>
            {record.subjectCode && (
              <div className="flex justify-between">
                <span className="text-slate-400">Subject Tag:</span>
                <span className="text-blue-300 font-mono font-semibold">
                  {record.subjectCode} {record.subjectTitle ? `(${record.subjectTitle})` : ''}
                </span>
              </div>
            )}
          </div>

          {/* Geolocation Details */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Verified Campus:</span>
              <span className="font-medium text-white">{record.campusName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Distance to Campus:</span>
              <span className="font-mono font-bold text-amber-300">
                {formatDistance(record.distanceMeters)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Geofence Status:</span>
              <span
                className={`font-bold flex items-center space-x-1 ${
                  record.withinGeofence ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {record.withinGeofence ? (
                  <>
                    <CheckCircle className="w-3.5 h-3.5 mr-1" />
                    <span>Inside Campus Perimeter</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                    <span>Outside Campus Perimeter</span>
                  </>
                )}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1 border-t border-slate-800">
              <span>GPS Coordinates:</span>
              <span>
                {record.latitude?.toFixed(6)}, {record.longitude?.toFixed(6)}
              </span>
            </div>
          </div>

          {/* Remarks / Faculty Review */}
          {record.remarks && (
            <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-xs">
              <span className="text-slate-400 block mb-0.5 font-semibold">Student Notes:</span>
              <p className="text-slate-300 italic">"{record.remarks}"</p>
            </div>
          )}

          {record.facultyNote && (
            <div className="bg-blue-950/40 border border-blue-800/60 rounded-xl p-3 text-xs">
              <span className="text-blue-300 block mb-0.5 font-semibold">
                Faculty Remarks ({record.reviewedBy || 'Academic Staff'}):
              </span>
              <p className="text-blue-100 italic">"{record.facultyNote}"</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-950 p-4 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow transition cursor-pointer"
          >
            Close Proof
          </button>
        </div>
      </div>
    </div>
  );
};

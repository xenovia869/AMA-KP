import React from 'react';
import { UserRole, Student, Faculty, Campus } from '../types';
import { RealTimeClock } from './RealTimeClock';
import { LogOut, GraduationCap, Building2, UserCircle2, CheckCircle2 } from 'lucide-react';

interface HeaderProps {
  currentRole: UserRole;
  student: Student | null;
  faculty: Faculty | null;
  activeCampus: Campus | null;
  onLogout: () => void;
  onOpenSelfieAttendance?: (type: 'TIME_IN' | 'TIME_OUT') => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  student,
  faculty,
  activeCampus,
  onLogout,
  onOpenSelfieAttendance,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-gradient-to-r from-blue-900 via-blue-950 to-slate-900 border-b border-blue-800/80 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Brand & Crest */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-red-600 via-blue-700 to-blue-900 border-2 border-amber-400 shadow-md text-white font-black tracking-wider text-base sm:text-lg select-none">
              <span className="text-amber-300 drop-shadow">AMA</span>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-lg sm:text-xl font-extrabold tracking-tight text-white font-sans">
                  Kings<span className="text-amber-400">Portal</span>
                </span>
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider bg-red-600 text-white px-1.5 py-0.5 rounded shadow-sm">
                  {currentRole === 'faculty' ? 'Faculty Admin' : 'Student Portal'}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-blue-200/80 hidden xs:block truncate">
                AMA Computer College • First in Computer Education
              </p>
            </div>
          </div>

          {/* Clock & Controls */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Real time ticker */}
            <div className="hidden lg:block">
              <RealTimeClock isCompact />
            </div>

            {/* User Profile Capsule */}
            <div className="flex items-center space-x-2 sm:space-x-3 bg-blue-900/60 border border-blue-700/50 rounded-xl px-2.5 sm:px-3 py-1.5">
              <div className="relative">
                {currentRole === 'student' && student?.avatarUrl ? (
                  <img
                    src={student.avatarUrl}
                    alt={student.name}
                    className="w-8 h-8 rounded-full object-cover border-2 border-amber-400"
                  />
                ) : currentRole === 'faculty' && faculty?.avatarUrl ? (
                  <img
                    src={faculty.avatarUrl}
                    alt={faculty.name}
                    className="w-8 h-8 rounded-full object-cover border-2 border-red-500"
                  />
                ) : (
                  <UserCircle2 className="w-8 h-8 text-blue-300" />
                )}
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-blue-950 rounded-full" />
              </div>

              <div className="hidden md:block text-left text-xs">
                <p className="font-semibold text-white truncate max-w-[130px]">
                  {currentRole === 'student' ? student?.name : faculty?.name}
                </p>
                <p className="text-[11px] text-blue-300 font-mono">
                  {currentRole === 'student' ? student?.usn : faculty?.facultyId}
                </p>
              </div>

              <button
                onClick={onLogout}
                title="Log Out"
                className="text-blue-300 hover:text-red-400 p-1 rounded-lg hover:bg-blue-800/40 transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

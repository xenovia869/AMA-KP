import React, { useState } from 'react';
import { UserRole } from '../types';
import { ShieldCheck, GraduationCap, Building2, KeyRound, User, ArrowRight, CheckCircle2, Lock, Sparkles, Camera } from 'lucide-react';

interface LoginModalProps {
  onLoginSuccess: (role: UserRole, user: any) => void;
  onOpenKioskPunch?: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onLoginSuccess, onOpenKioskPunch }) => {
  const [activeTab, setActiveTab] = useState<UserRole>('student');
  const [identifier, setIdentifier] = useState('2023-01492-MN-0');
  const [password, setPassword] = useState('••••••••');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleTabChange = (tab: UserRole) => {
    setActiveTab(tab);
    setErrorMessage('');
    if (tab === 'student') {
      setIdentifier('2023-01492-MN-0');
    } else {
      setIdentifier('FAC-2018-091');
    }
  };

  const handleQuickFill = (role: UserRole, id: string) => {
    setActiveTab(role);
    setIdentifier(id);
    setPassword('amaKings2026!');
    setErrorMessage('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setErrorMessage(activeTab === 'student' ? 'Please enter your USN' : 'Please enter your Faculty ID');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: identifier.trim(),
          password,
          role: activeTab,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Authentication failed');
      }

      onLoginSuccess(data.role, data.user);
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to connect to server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden selection:bg-red-500 selection:text-white">
      {/* Background radial gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-blue-900/20 blur-3xl pointer-events-none rounded-full" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-red-900/10 blur-3xl pointer-events-none rounded-full" />

      {/* Main Container */}
      <div className="w-full max-w-md relative z-10">
        {/* AMA College Header Card */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-900 via-blue-800 to-red-600 border-2 border-amber-400 shadow-xl shadow-blue-950/60 mb-3">
            <span className="text-white text-2xl font-black tracking-wider text-amber-300 drop-shadow">
              AMA
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Kings<span className="text-amber-400">Portal</span>
          </h1>
          <p className="text-xs sm:text-sm text-blue-200 mt-1 font-medium">
            AMA Computer College • Attendance & Schedule Verification
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-xl">
          {/* Dual Role Selector Tabs */}
          <div className="flex bg-slate-950/80 p-1.5 rounded-xl border border-slate-800 mb-6">
            <button
              type="button"
              onClick={() => handleTabChange('student')}
              className={`flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition cursor-pointer ${
                activeTab === 'student'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>Student Portal</span>
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('faculty')}
              className={`flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition cursor-pointer ${
                activeTab === 'faculty'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Faculty Admin</span>
            </button>
          </div>

          {/* Error notice */}
          {errorMessage && (
            <div className="mb-4 p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-red-200 text-xs flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                {activeTab === 'student' ? 'Unique Student Number (USN)' : 'Faculty ID / AMA Email'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={activeTab === 'student' ? 'e.g. 2023-01492-MN-0' : 'e.g. FAC-2018-091'}
                  className="w-full bg-slate-950/90 border border-slate-700 rounded-xl py-2.5 pl-10 pr-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  required
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {activeTab === 'student'
                  ? 'Format: YYYY-XXXXX-CC-0 as issued by the Registrar.'
                  : 'Faculty or Admin Department ID.'}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your KingsPortal password"
                  className="w-full bg-slate-950/90 border border-slate-700 rounded-xl py-2.5 pl-10 pr-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400">
              <label className="flex items-center space-x-1.5 cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded border-slate-700 text-blue-600 focus:ring-0" />
                <span>Remember on this device</span>
              </label>
              <span className="text-blue-400 hover:underline cursor-pointer">Forgot USN/Password?</span>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 px-4 rounded-xl text-white font-bold text-sm shadow-lg flex items-center justify-center space-x-2 transition cursor-pointer disabled:opacity-50 ${
                activeTab === 'student'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 shadow-blue-900/40'
                  : 'bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 shadow-red-900/40'
              }`}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In to KingsPortal</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Fast Demo Testing Switcher */}
          <div className="mt-6 pt-5 border-t border-slate-800">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider flex items-center space-x-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Instant Demo Accounts</span>
              </span>
              <span className="text-[10px] text-slate-400">Click to fill</span>
            </div>
            <div className="grid grid-cols-1 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickFill('student', '2023-01492-MN-0')}
                className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 hover:border-blue-600 text-left transition group cursor-pointer"
              >
                <div>
                  <p className="font-semibold text-slate-200 group-hover:text-blue-300">
                    Juan Carlos Dela Cruz (Student)
                  </p>
                  <p className="text-[11px] text-slate-400 font-mono">USN: 2023-01492-MN-0 • BSIT 3-A</p>
                </div>
                <span className="text-[10px] bg-blue-900/80 text-blue-200 px-2 py-0.5 rounded font-mono">
                  Fill
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('student', '2022-09811-QC-0')}
                className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 hover:border-blue-600 text-left transition group cursor-pointer"
              >
                <div>
                  <p className="font-semibold text-slate-200 group-hover:text-blue-300">
                    Maria Christine Santos (Student)
                  </p>
                  <p className="text-[11px] text-slate-400 font-mono">USN: 2022-09811-QC-0 • BSCS 4-B</p>
                </div>
                <span className="text-[10px] bg-blue-900/80 text-blue-200 px-2 py-0.5 rounded font-mono">
                  Fill
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('faculty', 'FAC-2018-091')}
                className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 hover:border-red-600 text-left transition group cursor-pointer"
              >
                <div>
                  <p className="font-semibold text-slate-200 group-hover:text-red-300">
                    Engr. Roberto Reyes, MIT (Faculty Dean)
                  </p>
                  <p className="text-[11px] text-slate-400 font-mono">ID: FAC-2018-091 • CCS Dept.</p>
                </div>
                <span className="text-[10px] bg-red-900/80 text-red-200 px-2 py-0.5 rounded font-mono">
                  Fill
                </span>
              </button>
            </div>
          </div>

          {/* Express Kiosk Attendance Button */}
          {onOpenKioskPunch && (
            <div className="mt-4 pt-4 border-t border-slate-800/80">
              <button
                type="button"
                onClick={onOpenKioskPunch}
                className="w-full py-2.5 px-3 bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 border border-blue-600/50 hover:border-amber-400 rounded-xl text-xs font-bold text-white flex items-center justify-center space-x-2 transition shadow cursor-pointer group"
              >
                <Camera className="w-4 h-4 text-amber-400 group-hover:scale-110 transition" />
                <span>Express Kiosk: Quick Time In/Out with USN & Selfie</span>
              </button>
              <p className="text-[10px] text-slate-400 text-center mt-1">
                Fast terminal punch without password login • Requires selfie & GPS
              </p>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="text-center mt-6 text-xs text-slate-400 space-y-1">
          <p>© 2026 AMA Education System • AMA Computer College</p>
          <p className="text-[11px] text-slate-400">
            Automated Geofence Facial Attendance System v2.6.4
          </p>
        </div>
      </div>
    </div>
  );
};

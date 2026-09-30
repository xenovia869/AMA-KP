import React, { useState, useEffect } from 'react';
import { Clock, Calendar, ShieldCheck, MapPin } from 'lucide-react';
import { getCurrentPST } from '../utils/geo';

interface RealTimeClockProps {
  campusName?: string;
  isCompact?: boolean;
}

export const RealTimeClock: React.FC<RealTimeClockProps> = ({ campusName, isCompact = false }) => {
  const [pst, setPst] = useState(getCurrentPST());

  useEffect(() => {
    const timer = setInterval(() => {
      setPst(getCurrentPST());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (isCompact) {
    return (
      <div className="flex items-center space-x-3 bg-blue-950/60 text-white px-3 py-1.5 rounded-lg border border-blue-800/40 text-xs">
        <div className="flex items-center space-x-1.5 font-mono text-amber-400 font-semibold text-sm">
          <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          <span>{pst.timeStr}</span>
        </div>
        <span className="text-blue-300">PST</span>
        <div className="hidden sm:flex items-center space-x-1 text-slate-300 text-[11px] border-l border-blue-700/50 pl-2">
          <Calendar className="w-3 h-3 text-blue-400" />
          <span>{pst.dateStr}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 rounded-xl p-4 sm:p-5 text-white shadow-lg border border-blue-700/40 relative overflow-hidden">
      {/* Background watermark badge */}
      <div className="absolute -right-6 -bottom-8 opacity-5 text-white pointer-events-none select-none text-9xl font-black">
        AMA
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-red-600/90 text-white tracking-wide uppercase">
              Philippine Standard Time (PST)
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping mr-1.5" />
              Live NTP Synchronized
            </span>
          </div>
          <div className="flex items-baseline space-x-3">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-mono font-extrabold tracking-tight text-white drop-shadow-sm">
              {pst.timeStr}
            </h1>
            <span className="text-xs sm:text-sm text-blue-300 font-medium font-sans">
              GMT+8
            </span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-blue-100 font-medium">
            <Calendar className="w-4 h-4 text-amber-400" />
            <span>{pst.dateStr}</span>
            <span className="text-blue-400">•</span>
            <span className="text-amber-300">1st Trimester A.Y. 2026-2027</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row md:flex-col gap-2 text-xs">
          <div className="bg-blue-950/70 border border-blue-700/50 rounded-lg p-2.5 flex items-center space-x-2.5 backdrop-blur-sm">
            <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <div>
              <p className="text-slate-300 text-[11px]">System Status</p>
              <p className="font-semibold text-emerald-400">Geofence Attendance Online</p>
            </div>
          </div>
          {campusName && (
            <div className="bg-blue-950/70 border border-blue-700/50 rounded-lg p-2.5 flex items-center space-x-2.5 backdrop-blur-sm">
              <MapPin className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <div>
                <p className="text-slate-300 text-[11px]">Assigned Campus</p>
                <p className="font-semibold text-white truncate max-w-[200px]">{campusName}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

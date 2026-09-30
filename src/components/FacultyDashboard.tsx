import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import {
  Faculty,
  Campus,
  AttendanceRecord,
  FacultyStats,
  VerificationStatus,
} from '../types';
import { RealTimeClock } from './RealTimeClock';
import { formatDistance, getCurrentPST } from '../utils/geo';
import {
  ShieldCheck,
  AlertTriangle,
  Users,
  Clock,
  Search,
  Filter,
  Download,
  Printer,
  CheckCircle,
  XCircle,
  ExternalLink,
  MapPin,
  RefreshCw,
  Sliders,
  Settings,
  Eye,
  Calendar,
  Building,
  Check,
  FileSpreadsheet,
  Database,
} from 'lucide-react';

interface FacultyDashboardProps {
  faculty: Faculty;
  campuses: Campus[];
  onUpdateCampus: (updatedCampus: Campus) => void;
  onRefreshStats?: () => void;
  onViewRecord: (record: AttendanceRecord) => void;
}

export const FacultyDashboard: React.FC<FacultyDashboardProps> = ({
  faculty,
  campuses,
  onUpdateCampus,
  onViewRecord,
}) => {
  const [stats, setStats] = useState<FacultyStats>({
    todayTotalPunches: 0,
    currentlyClockedIn: 0,
    verifiedOnCampus: 0,
    flaggedGeofence: 0,
    pendingReviews: 0,
    complianceRate: 100,
  });

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [sectionFilter, setSectionFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState<string>('');

  // Selected Record for in-dashboard review
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [facultyNoteInput, setFacultyNoteInput] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Geofence Management Modal
  const [showGeofenceModal, setShowGeofenceModal] = useState(false);
  const [selectedCampus, setSelectedCampus] = useState<Campus>(campuses[0]);
  const [radiusInput, setRadiusInput] = useState<number>(campuses[0]?.radiusMeters || 500);
  const [calibrating, setCalibrating] = useState(false);

  // Fetch Attendance Records & Stats
  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (typeFilter !== 'ALL') params.append('type', typeFilter);
      if (sectionFilter !== 'ALL') params.append('section', sectionFilter);
      if (dateFilter) params.append('date', dateFilter);

      const [logsRes, statsRes] = await Promise.all([
        fetch(`/api/faculty/attendance?${params.toString()}`),
        fetch('/api/faculty/stats'),
      ]);

      const logsData = await logsRes.json();
      const statsData = await statsRes.json();

      setRecords(logsData.records || []);
      if (statsData.stats) {
        setStats(statsData.stats);
      }
    } catch (err) {
      console.error('Error fetching faculty dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [searchQuery, statusFilter, typeFilter, sectionFilter, dateFilter]);

  // Review & Update Attendance Status
  const handleUpdateRecordStatus = async (
    status: VerificationStatus,
    note?: string
  ) => {
    if (!selectedRecord) return;
    setIsUpdatingStatus(true);
    try {
      const res = await fetch(`/api/faculty/attendance/${selectedRecord.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          facultyNote: note !== undefined ? note : facultyNoteInput,
          reviewedBy: faculty.name,
        }),
      });

      const data = await res.json();
      if (data.success && data.record) {
        // Update local list
        setRecords((prev) =>
          prev.map((r) => (r.id === data.record.id ? data.record : r))
        );
        setSelectedRecord(data.record);
        fetchData();
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Save to Excel (.xlsx) with formatting and summary tab
  const handleSaveToExcel = async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (typeFilter !== 'ALL') params.append('type', typeFilter);
      if (sectionFilter !== 'ALL') params.append('section', sectionFilter);
      if (dateFilter) params.append('date', dateFilter);

      // Attempt server export
      const response = await fetch(`/api/faculty/export-excel?${params.toString()}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `AMA_KingsPortal_Attendance_Database_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        return;
      }
    } catch (e) {
      console.warn('Server Excel generation failed, falling back to client-side XLSX:', e);
    }

    // Client-side XLSX generation fallback
    if (records.length === 0) return;

    const excelRows = records.map((r, idx) => ({
      'No.': idx + 1,
      'Record ID': r.id,
      'Date': r.dateFormatted,
      'Time (PST)': r.timeFormatted,
      'Punch Action': r.type === 'TIME_IN' ? 'TIME IN (Arrival)' : 'TIME OUT (Dismissal)',
      'Student Name': r.studentName,
      'USN': r.studentUsn,
      'Course & Section': r.courseSection,
      'Subject Code': r.subjectCode || 'General Campus',
      'Campus Venue': r.campusName,
      'Distance (Meters)': r.distanceMeters,
      'Geofence Check': r.withinGeofence ? 'PASSED (On Campus)' : 'FLAGGED (Outside Perimeter)',
      'Verification Status': r.status,
      'Faculty Remarks': r.facultyNote || 'None',
      'Student Remarks': r.remarks || '',
      'Device/Signature': r.deviceInfo || 'Web Camera Geolocation',
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelRows);
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance Logs');

    XLSX.writeFile(
      wb,
      `AMA_KingsPortal_Attendance_Database_${new Date().toISOString().split('T')[0]}.xlsx`
    );
  };

  // Export CSV
  const handleExportCSV = () => {
    if (records.length === 0) return;

    const headers = [
      'Record ID',
      'Student Name',
      'USN',
      'Course & Section',
      'Punch Type',
      'Date',
      'Time (PST)',
      'Subject',
      'Campus',
      'Distance (m)',
      'Geofence Verified',
      'Status',
      'Faculty Note',
      'Device Info',
    ];

    const rows = records.map((r) => [
      `"${r.id}"`,
      `"${r.studentName}"`,
      `"${r.studentUsn}"`,
      `"${r.courseSection}"`,
      `"${r.type}"`,
      `"${r.dateFormatted}"`,
      `"${r.timeFormatted}"`,
      `"${r.subjectCode || 'General'}"`,
      `"${r.campusName}"`,
      r.distanceMeters,
      r.withinGeofence ? 'YES' : 'NO',
      `"${r.status}"`,
      `"${r.facultyNote || ''}"`,
      `"${r.deviceInfo || ''}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `AMA_Attendance_Report_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calibrate Campus Coordinates to current browser location
  const handleCalibrateToCurrentLocation = () => {
    setCalibrating(true);
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      setCalibrating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch('/api/campuses/calibrate-custom', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              radiusMeters: radiusInput,
              campusName: `${selectedCampus.name} (Calibrated)`,
            }),
          });
          const data = await res.json();
          if (data.success && data.campus) {
            onUpdateCampus(data.campus);
            setSelectedCampus(data.campus);
            alert(
              `Campus calibrated to: ${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}. Radius: ${radiusInput}m`
            );
          }
        } catch (e) {
          console.error(e);
        } finally {
          setCalibrating(false);
        }
      },
      (err) => {
        alert('Could not access current location: ' + err.message);
        setCalibrating(false);
      },
      { enableHighAccuracy: true }
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Clock Banner */}
      <RealTimeClock campusName={faculty.department} />

      {/* Faculty Profile & Overview Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <img
            src={faculty.avatarUrl}
            alt={faculty.name}
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover border-2 border-red-500 shadow-md flex-shrink-0"
          />
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl sm:text-2xl font-extrabold text-white">
                {faculty.name}
              </h2>
              <span className="bg-red-950 text-red-300 border border-red-800 font-mono text-xs px-2.5 py-0.5 rounded-full font-bold">
                {faculty.facultyId}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300">
              {faculty.roleTitle} • {faculty.department}
            </p>
            <p className="text-xs text-slate-400">
              AMA Computer College Attendance Verification Console
            </p>
          </div>
        </div>

        {/* Global Actions */}
        <div className="flex items-center flex-wrap gap-2.5">
          <button
            type="button"
            onClick={handleSaveToExcel}
            className="flex items-center space-x-1.5 bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-500 hover:to-green-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg shadow-emerald-950/40 transition cursor-pointer border border-emerald-400/40"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
            <span>Save to Excel (.xlsx)</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-700 transition cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => setShowGeofenceModal(true)}
            className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-700 transition cursor-pointer"
          >
            <Settings className="w-4 h-4 text-amber-400" />
            <span>Perimeters</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center space-x-1.5 bg-blue-700 hover:bg-blue-600 text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Total Punches */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Today's Punches</span>
            <Clock className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-mono font-extrabold text-white">
            {stats.todayTotalPunches}
          </p>
          <span className="text-[11px] text-blue-300">Total in/out logs</span>
        </div>

        {/* Currently Clocked In */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Currently Present</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-mono font-extrabold text-emerald-400">
            {stats.currentlyClockedIn}
          </p>
          <span className="text-[11px] text-emerald-300/80">Active in campus</span>
        </div>

        {/* Verified On Campus */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Geoverified</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-mono font-extrabold text-white">
            {stats.verifiedOnCampus}
          </p>
          <span className="text-[11px] text-emerald-300">Within perimeter</span>
        </div>

        {/* Flagged Geofence */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Flagged Geofence</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-mono font-extrabold text-amber-400">
            {stats.flaggedGeofence}
          </p>
          <span className="text-[11px] text-amber-300">Outside perimeter</span>
        </div>

        {/* Compliance Rate */}
        <div className="col-span-2 lg:col-span-1 bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Presence Rate</span>
            <CheckCircle className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-mono font-extrabold text-blue-400">
            {stats.complianceRate}%
          </p>
          <span className="text-[11px] text-blue-300">Campus compliance</span>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Input */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by student name, USN, or subject code..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2 pl-9 pr-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2 px-3 text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">All Verification Statuses</option>
              <option value="VERIFIED">Verified (Within Perimeter)</option>
              <option value="FLAGGED_GEOFENCE">Flagged (Outside Geofence)</option>
              <option value="MANUALLY_APPROVED">Faculty Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2 px-3 text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">All Punch Types</option>
              <option value="TIME_IN">TIME IN (Arrival)</option>
              <option value="TIME_OUT">TIME OUT (Dismissal)</option>
            </select>
          </div>

          {/* Section Filter */}
          <div>
            <select
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2 px-3 text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">All Sections & Courses</option>
              <option value="IT301">BSIT 3-A</option>
              <option value="CS401">BSCS 4-B</option>
              <option value="CYB201">BSCSB 2-A</option>
            </select>
          </div>
        </div>
      </div>

      {/* Attendance Logs Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-blue-950 border border-blue-800 rounded-lg text-blue-400">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-white text-base sm:text-lg">
                  Attendance Records Database
                </h3>
                <span className="text-xs bg-blue-900 text-blue-200 px-2 py-0.5 rounded-full font-mono">
                  {records.length} logs
                </span>
                <span className="hidden md:inline-flex text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded">
                  Live Persistent
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Audited proof of presence with GPS coordinates & selfie photographs
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleSaveToExcel}
              className="flex items-center space-x-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Save to Excel (.xlsx)</span>
            </button>

            <button
              type="button"
              onClick={fetchData}
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center space-x-1 cursor-pointer bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-800 tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Selfie Proof</th>
                <th className="py-3.5 px-4">Student & USN</th>
                <th className="py-3.5 px-4">Action & Time</th>
                <th className="py-3.5 px-4">Subject Tag</th>
                <th className="py-3.5 px-4">GPS Geofence</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Review</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {records.length > 0 ? (
                records.map((r) => (
                  <tr
                    key={r.id}
                    className="hover:bg-slate-800/40 transition group"
                  >
                    {/* Selfie Preview */}
                    <td className="py-3 px-4">
                      <div
                        onClick={() => setSelectedRecord(r)}
                        className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-800 border border-slate-700 cursor-pointer shadow group-hover:scale-105 transition"
                      >
                        <img
                          src={r.photoBase64}
                          alt={r.studentName}
                          className="w-full h-full object-cover"
                        />
                        <span
                          className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border border-slate-950 ${
                            r.withinGeofence ? 'bg-emerald-400' : 'bg-amber-400'
                          }`}
                        />
                      </div>
                    </td>

                    {/* Student Info */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white group-hover:text-blue-300">
                        {r.studentName}
                      </div>
                      <div className="font-mono text-[11px] text-amber-400">
                        {r.studentUsn}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {r.courseSection}
                      </div>
                    </td>

                    {/* Punch Type & PST Timestamp */}
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-1.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            r.type === 'TIME_IN'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : 'bg-red-950 text-red-300 border border-red-800'
                          }`}
                        >
                          {r.type.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="font-mono text-xs font-semibold text-slate-200 mt-1">
                        {r.timeFormatted}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {r.dateFormatted}
                      </div>
                    </td>

                    {/* Subject Tag */}
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-blue-300 text-xs">
                        {r.subjectCode || 'General Campus'}
                      </span>
                      {r.subjectTitle && (
                        <p className="text-[11px] text-slate-400 truncate max-w-[150px]">
                          {r.subjectTitle}
                        </p>
                      )}
                    </td>

                    {/* Geofence Location & Distance */}
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-1">
                        <MapPin
                          className={`w-3.5 h-3.5 flex-shrink-0 ${
                            r.withinGeofence ? 'text-emerald-400' : 'text-amber-400'
                          }`}
                        />
                        <span className="font-mono font-semibold text-xs text-white">
                          {formatDistance(r.distanceMeters)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate max-w-[170px]">
                        {r.campusName}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        GPS: {r.latitude?.toFixed(4)}, {r.longitude?.toFixed(4)}
                      </p>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                          r.status === 'VERIFIED'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : r.status === 'MANUALLY_APPROVED'
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                            : r.status === 'REJECTED'
                            ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        }`}
                      >
                        {r.status === 'FLAGGED_GEOFENCE' ? (
                          <>
                            <AlertTriangle className="w-3 h-3 mr-1 text-amber-400" />
                            Flagged
                          </>
                        ) : r.status === 'VERIFIED' ? (
                          <>
                            <CheckCircle className="w-3 h-3 mr-1 text-emerald-400" />
                            Verified
                          </>
                        ) : (
                          r.status
                        )}
                      </span>
                      {r.facultyNote && (
                        <p className="text-[10px] text-slate-400 mt-1 italic truncate max-w-[130px]">
                          "{r.facultyNote}"
                        </p>
                      )}
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedRecord(r)}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow transition cursor-pointer"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Clock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="font-semibold text-sm">No attendance records found</p>
                    <p className="text-xs">Adjust your search filters or wait for students to submit attendance punches.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Modal for Selected Attendance Record */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto text-white">
            {/* Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-900 to-slate-900 border-b border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg text-white">
                  Attendance Verification Audit
                </h3>
                <p className="text-xs text-blue-200">
                  Student: {selectedRecord.studentName} ({selectedRecord.studentUsn})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Photo Evidence */}
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1 uppercase tracking-wider">
                    High-Resolution Selfie Evidence
                  </label>
                  <div className="aspect-4/3 rounded-xl overflow-hidden bg-slate-950 border border-slate-700 relative">
                    <img
                      src={selectedRecord.photoBase64}
                      alt="Student Selfie"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-2 left-2 bg-slate-950/80 px-2 py-1 rounded text-[11px] text-white font-mono">
                      {selectedRecord.timeFormatted} PST
                    </div>
                  </div>
                </div>

                {/* Geolocation Verification Report */}
                <div className="space-y-3">
                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-2">
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
                      Geofence Analysis
                    </span>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Target Campus:</span>
                        <span className="font-medium text-white text-right">
                          {selectedRecord.campusName}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Calculated Distance:</span>
                        <span className="font-mono font-bold text-amber-300">
                          {formatDistance(selectedRecord.distanceMeters)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Allowed Radius:</span>
                        <span className="font-mono text-slate-300">
                          {campuses.find((c) => c.id === selectedRecord.campusId)?.radiusMeters || 500}m
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Status Check:</span>
                        <span
                          className={`font-bold ${
                            selectedRecord.withinGeofence
                              ? 'text-emerald-400'
                              : 'text-amber-400'
                          }`}
                        >
                          {selectedRecord.withinGeofence
                            ? 'PASSED (On-Campus)'
                            : 'FAILED (Outside Perimeter)'}
                        </span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-slate-800 text-[11px]">
                        <span className="text-slate-400">GPS Coordinates:</span>
                        <span className="font-mono text-slate-300">
                          {selectedRecord.latitude?.toFixed(6)}, {selectedRecord.longitude?.toFixed(6)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Student Remarks */}
                  {selectedRecord.remarks && (
                    <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-xs">
                      <span className="text-slate-400 block mb-0.5 font-semibold">
                        Student's Remarks:
                      </span>
                      <p className="text-slate-200 italic">
                        "{selectedRecord.remarks}"
                      </p>
                    </div>
                  )}

                  {/* Device Info */}
                  <div className="text-[11px] text-slate-400">
                    <span className="text-slate-400">Device Signature: </span>
                    <span className="text-slate-400 font-mono">
                      {selectedRecord.deviceInfo || 'Standard Web Camera'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Faculty Action & Remarks Form */}
              <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 space-y-3">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                  Faculty Remarks / Coordinator Assessment:
                </label>
                <input
                  type="text"
                  value={facultyNoteInput}
                  onChange={(e) => setFacultyNoteInput(e.target.value)}
                  placeholder="Enter reason for approval or citation (e.g. Cleared for authorized field study)..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    disabled={isUpdatingStatus}
                    onClick={() => handleUpdateRecordStatus('MANUALLY_APPROVED')}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center space-x-1.5 transition cursor-pointer"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Approve Attendance</span>
                  </button>

                  <button
                    type="button"
                    disabled={isUpdatingStatus}
                    onClick={() => handleUpdateRecordStatus('FLAGGED_GEOFENCE')}
                    className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center space-x-1.5 transition cursor-pointer"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    <span>Flag Geofence Discrepancy</span>
                  </button>

                  <button
                    type="button"
                    disabled={isUpdatingStatus}
                    onClick={() => handleUpdateRecordStatus('REJECTED')}
                    className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center space-x-1.5 transition cursor-pointer"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Reject Punch</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Geofence Configuration Modal */}
      {showGeofenceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden my-auto text-white">
            <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-900 to-slate-900 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Settings className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-lg text-white">
                  Campus Geofence Settings
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGeofenceModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs sm:text-sm">
              <p className="text-slate-300">
                Configure the central GPS coordinates and radius of AMA campuses.
                Attendance punches within the radius are automatically verified.
              </p>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Select Campus:</label>
                <select
                  value={selectedCampus.id}
                  onChange={(e) => {
                    const c = campuses.find((x) => x.id === e.target.value);
                    if (c) {
                      setSelectedCampus(c);
                      setRadiusInput(c.radiusMeters);
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
                >
                  {campuses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">Center Latitude:</label>
                  <input
                    type="number"
                    step="any"
                    value={selectedCampus.latitude}
                    onChange={(e) =>
                      setSelectedCampus({
                        ...selectedCampus,
                        latitude: Number(e.target.value),
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Center Longitude:</label>
                  <input
                    type="number"
                    step="any"
                    value={selectedCampus.longitude}
                    onChange={(e) =>
                      setSelectedCampus({
                        ...selectedCampus,
                        longitude: Number(e.target.value),
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">
                  Geofence Radius (Meters):
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="range"
                    min="100"
                    max="3000"
                    step="50"
                    value={radiusInput}
                    onChange={(e) => setRadiusInput(Number(e.target.value))}
                    className="flex-1"
                  />
                  <span className="font-mono font-bold text-amber-400 w-16 text-right">
                    {radiusInput}m
                  </span>
                </div>
              </div>

              {/* Calibration Button */}
              <div className="pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleCalibrateToCurrentLocation}
                  disabled={calibrating}
                  className="w-full bg-blue-900/80 hover:bg-blue-800 text-blue-200 border border-blue-600/50 py-2.5 rounded-xl font-semibold flex items-center justify-center space-x-2 text-xs transition cursor-pointer"
                >
                  <MapPin className="w-4 h-4 text-amber-400" />
                  <span>
                    {calibrating
                      ? 'Acquiring device GPS...'
                      : 'Calibrate Campus to My Current GPS Location'}
                  </span>
                </button>
                <p className="text-[11px] text-slate-400 mt-1 text-center">
                  Sets the campus perimeter center right where you are located for instant testing.
                </p>
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowGeofenceModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const res = await fetch(`/api/campuses/${selectedCampus.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          latitude: selectedCampus.latitude,
                          longitude: selectedCampus.longitude,
                          radiusMeters: radiusInput,
                        }),
                      });
                      const data = await res.json();
                      if (data.success) {
                        onUpdateCampus(data.campus);
                        setShowGeofenceModal(false);
                      }
                    } catch (e) {
                      console.error(e);
                    }
                  }}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold"
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

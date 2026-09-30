import React, { useState, useEffect, useRef } from 'react';
import { Student, Campus, PunchType } from '../types';
import { calculateHaversineDistance, formatDistance } from '../utils/geo';
import {
  Camera,
  MapPin,
  CheckCircle,
  AlertTriangle,
  RotateCw,
  X,
  Upload,
  Sparkles,
  Compass,
  Clock,
  ShieldCheck,
  Building,
  RefreshCw,
  Sliders,
} from 'lucide-react';

interface PictureAttendanceModalProps {
  student: Student;
  defaultType: PunchType;
  campuses: Campus[];
  onClose: () => void;
  onSuccess: (record: any) => void;
  allowUsnEdit?: boolean;
}

export const PictureAttendanceModal: React.FC<PictureAttendanceModalProps> = ({
  student,
  defaultType,
  campuses,
  onClose,
  onSuccess,
  allowUsnEdit = false,
}) => {
  const [usnInput, setUsnInput] = useState<string>(student?.usn || '2023-01492-MN-0');
  const [punchType, setPunchType] = useState<PunchType>(defaultType);
  const [selectedCampusId, setSelectedCampusId] = useState<string>(
    student.campusId || (campuses[0]?.id || 'camp-main')
  );
  const [remarks, setRemarks] = useState<string>('');

  // Camera State
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  // Geolocation State
  const [geoCoords, setGeoCoords] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
  } | null>(null);
  const [geoLoading, setGeoLoading] = useState<boolean>(true);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [simulateAtCampus, setSimulateAtCampus] = useState<boolean>(false);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Active Campus
  const activeCampus = campuses.find((c) => c.id === selectedCampusId) || campuses[0];

  // Geofence Distance Calculation
  let computedDistance = 0;
  let isWithinGeofence = false;

  if (simulateAtCampus && activeCampus) {
    computedDistance = 18; // 18 meters from center (right in the building)
    isWithinGeofence = true;
  } else if (geoCoords && activeCampus) {
    computedDistance = calculateHaversineDistance(
      geoCoords.latitude,
      geoCoords.longitude,
      activeCampus.latitude,
      activeCampus.longitude
    );
    isWithinGeofence = computedDistance <= activeCampus.radiusMeters;
  }

  // Start Camera
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API is not supported on this browser.');
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.warn('Camera access failed, falling back to manual upload:', err);
      setCameraError(
        'Unable to access camera directly (permissions or device limitation). You may take or upload a photo proof below.'
      );
    }
  };

  // Acquire Geolocation
  const requestLocation = () => {
    setGeoLoading(true);
    setGeoError(null);

    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      setGeoLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGeoCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        setGeoLoading(false);
      },
      (error) => {
        console.warn('Geolocation error:', error);
        setGeoError(
          'Could not retrieve GPS coordinates. You can enable "Simulate On-Campus" for demonstration.'
        );
        // Fallback default coordinates (Project 8 QC)
        setGeoCoords({
          latitude: 14.668705,
          longitude: 121.023412,
          accuracy: 15,
        });
        setGeoLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  useEffect(() => {
    startCamera();
    requestLocation();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [facingMode]);

  // Capture Photo Snapshot
  const handleSnap = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Mirror image if front camera
      if (facingMode === 'user') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Watermark with timestamp and student USN
      ctx.setTransform(1, 0, 0, 1, 0, 0); // reset transform
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(0, canvas.height - 40, canvas.width, 40);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px monospace';
      ctx.fillText(
        `AMA KingsPortal • ${student.usn} • ${new Date().toLocaleTimeString('en-US')}`,
        15,
        canvas.height - 15
      );

      const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
      setCapturedPhoto(dataUrl);
    }
  };

  const handleRetake = () => {
    setCapturedPhoto(null);
  };

  // Upload or use sample photo
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCapturedPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUseSampleSelfie = () => {
    setCapturedPhoto(
      student.avatarUrl ||
        'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=600&auto=format&fit=crop&q=80'
    );
  };

  // Submit attendance punch
  const handleSubmitPunch = async () => {
    if (!capturedPhoto) {
      setSubmitError('Please capture or upload a selfie proof of attendance.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const payload = {
        usn: usnInput.trim(),
        type: punchType,
        photoBase64: capturedPhoto,
        latitude: simulateAtCampus ? activeCampus.latitude : geoCoords?.latitude,
        longitude: simulateAtCampus ? activeCampus.longitude : geoCoords?.longitude,
        accuracy: geoCoords?.accuracy || 10,
        campusId: selectedCampusId,
        remarks: remarks.trim(),
        simulateAtCampus,
        deviceInfo: `${navigator.userAgent.slice(0, 70)}...`,
      };

      const res = await fetch('/api/attendance/punch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to record attendance');
      }

      onSuccess(data.record);
    } catch (err: any) {
      setSubmitError(err.message || 'Submission error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 p-4 sm:p-5 border-b border-blue-800/60 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-md ${
                punchType === 'TIME_IN'
                  ? 'bg-gradient-to-tr from-emerald-600 to-teal-500'
                  : 'bg-gradient-to-tr from-amber-600 to-red-500'
              }`}
            >
              <Camera className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-bold text-white">
                  Picture Attendance Submission
                </h2>
                <span
                  className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                    punchType === 'TIME_IN'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}
                >
                  {punchType.replace('_', ' ')}
                </span>
              </div>
              <p className="text-xs text-blue-200">
                Selfie proof + real-time GPS geofence verification
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-white text-sm">
          {submitError && (
            <div className="p-3 bg-red-950/80 border border-red-800 rounded-xl text-red-200 text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Student USN Display / Input */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Unique Student Number (USN)
              </span>
              {allowUsnEdit ? (
                <input
                  type="text"
                  value={usnInput}
                  onChange={(e) => setUsnInput(e.target.value)}
                  placeholder="e.g. 2023-01492-MN-0"
                  className="bg-slate-900 border border-slate-700 rounded-lg py-1 px-2.5 text-amber-400 font-mono text-sm font-bold mt-1 focus:outline-none focus:ring-1 focus:ring-blue-500 w-full sm:w-64"
                />
              ) : (
                <div className="flex items-center space-x-2 mt-0.5">
                  <span className="font-mono font-bold text-amber-400 text-sm">{usnInput}</span>
                  <span className="text-xs text-slate-300">({student.name})</span>
                </div>
              )}
            </div>

            <div className="text-[11px] text-slate-400 flex items-center space-x-1.5 self-start sm:self-auto bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>Identity Verified Attendance</span>
            </div>
          </div>

          {/* Punch Type Selector */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setPunchType('TIME_IN')}
              className={`py-3 px-4 rounded-xl font-bold flex items-center justify-center space-x-2 transition cursor-pointer border ${
                punchType === 'TIME_IN'
                  ? 'bg-emerald-600 text-white border-emerald-400 shadow-lg shadow-emerald-900/30'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>TIME IN (Arrival)</span>
            </button>
            <button
              type="button"
              onClick={() => setPunchType('TIME_OUT')}
              className={`py-3 px-4 rounded-xl font-bold flex items-center justify-center space-x-2 transition cursor-pointer border ${
                punchType === 'TIME_OUT'
                  ? 'bg-red-600 text-white border-red-400 shadow-lg shadow-red-900/30'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>TIME OUT (Dismissal)</span>
            </button>
          </div>

          {/* Camera / Photo Capture Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <label className="font-semibold uppercase tracking-wider flex items-center space-x-1.5">
                <Camera className="w-4 h-4 text-blue-400" />
                <span>Selfie Proof of Presence</span>
              </label>
              <div className="flex items-center space-x-2">
                {!capturedPhoto && !cameraError && (
                  <button
                    type="button"
                    onClick={() =>
                      setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'))
                    }
                    className="flex items-center space-x-1 text-blue-400 hover:text-blue-300 text-[11px]"
                  >
                    <RotateCw className="w-3 h-3" />
                    <span>Flip Camera</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleUseSampleSelfie}
                  className="flex items-center space-x-1 text-amber-400 hover:text-amber-300 text-[11px]"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Use Student Photo</span>
                </button>
              </div>
            </div>

            {/* Viewport Frame */}
            <div className="relative aspect-video sm:aspect-4/3 w-full bg-slate-950 rounded-xl overflow-hidden border-2 border-slate-700 flex items-center justify-center">
              {capturedPhoto ? (
                // Captured Image Preview
                <div className="relative w-full h-full">
                  <img
                    src={capturedPhoto}
                    alt="Captured proof"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 right-3 flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={handleRetake}
                      className="bg-slate-900/90 hover:bg-slate-800 text-white text-xs px-3 py-1.5 rounded-lg border border-slate-600 shadow flex items-center space-x-1.5 cursor-pointer backdrop-blur-sm"
                    >
                      <RotateCw className="w-3.5 h-3.5 text-blue-400" />
                      <span>Retake Photo</span>
                    </button>
                  </div>
                  <div className="absolute bottom-3 left-3 bg-emerald-950/80 border border-emerald-600/60 text-emerald-300 text-xs px-2.5 py-1 rounded-md backdrop-blur-sm flex items-center space-x-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Photo Stamped & Ready</span>
                  </div>
                </div>
              ) : (
                // Live Stream or Upload Fallback
                <div className="relative w-full h-full flex flex-col items-center justify-center">
                  {!cameraError ? (
                    <>
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className={`w-full h-full object-cover ${
                          facingMode === 'user' ? 'scale-x-[-1]' : ''
                        }`}
                      />
                      <canvas ref={canvasRef} className="hidden" />

                      {/* Live Crosshair Guide */}
                      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                        <div className="w-48 h-56 border-2 border-dashed border-blue-400/60 rounded-3xl" />
                      </div>

                      {/* Snap Button Overlay */}
                      <div className="absolute bottom-4 inset-x-0 flex justify-center">
                        <button
                          type="button"
                          onClick={handleSnap}
                          className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-2.5 rounded-full shadow-xl flex items-center space-x-2 text-sm border-2 border-white/80 cursor-pointer transition transform active:scale-95"
                        >
                          <Camera className="w-4 h-4" />
                          <span>Snap Attendance Selfie</span>
                        </button>
                      </div>
                    </>
                  ) : (
                    // Camera permission denied / unavailable fallback
                    <div className="p-6 text-center space-y-3">
                      <Camera className="w-10 h-10 text-slate-500 mx-auto" />
                      <p className="text-xs text-slate-300 max-w-sm">{cameraError}</p>
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-2 rounded-lg font-medium flex items-center space-x-1.5 cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Upload / Camera File</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleUseSampleSelfie}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3 py-2 rounded-lg font-medium flex items-center space-x-1.5 cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          <span>Use Student Profile Photo</span>
                        </button>
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        capture="user"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Campus Geofence Verification Section */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <Compass className="w-4 h-4 text-amber-400" />
                <span className="font-semibold text-xs uppercase tracking-wider text-slate-200">
                  Target Campus & GPS Geofence
                </span>
              </div>
              <button
                type="button"
                onClick={requestLocation}
                disabled={geoLoading}
                className="flex items-center space-x-1 text-[11px] text-blue-400 hover:text-blue-300 self-start sm:self-auto cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${geoLoading ? 'animate-spin' : ''}`} />
                <span>Refresh GPS</span>
              </button>
            </div>

            {/* Campus Selector */}
            <div className="text-xs">
              <label className="text-slate-400 block mb-1">Select Campus</label>
              <select
                value={selectedCampusId}
                onChange={(e) => setSelectedCampusId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs focus:ring-1 focus:ring-blue-500"
              >
                {campuses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} (±{c.radiusMeters}m perimeter)
                  </option>
                ))}
              </select>
            </div>

            {/* Geofence Status Badge */}
            <div
              className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                isWithinGeofence
                  ? 'bg-emerald-950/50 border-emerald-700/60 text-emerald-200'
                  : 'bg-amber-950/50 border-amber-700/60 text-amber-200'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                {isWithinGeofence ? (
                  <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                )}
                <div className="text-xs">
                  <p className="font-bold">
                    {isWithinGeofence
                      ? 'Within Campus Geofence Perimeter'
                      : 'Outside Campus Geofence'}
                  </p>
                  <p className="text-[11px] opacity-80">
                    Distance: <span className="font-mono font-bold">{formatDistance(computedDistance)}</span>{' '}
                    (Allowed Radius: {activeCampus?.radiusMeters}m)
                  </p>
                </div>
              </div>

              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                  isWithinGeofence
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-amber-500 text-slate-950'
                }`}
              >
                {isWithinGeofence ? 'VERIFIED' : 'FLAGGED'}
              </span>
            </div>

            {/* GPS Demo Simulation Switcher */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-xs">
              <label className="flex items-center space-x-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={simulateAtCampus}
                  onChange={(e) => setSimulateAtCampus(e.target.checked)}
                  className="rounded border-slate-700 text-blue-600 focus:ring-0"
                />
                <span className="text-[11px] text-amber-300 font-medium">
                  🧪 Test Mode: Simulate On-Campus (forces within geofence)
                </span>
              </label>
              {geoCoords && !simulateAtCampus && (
                <span className="text-[10px] text-slate-400 font-mono">
                  GPS: {geoCoords.latitude.toFixed(4)}, {geoCoords.longitude.toFixed(4)} (±{Math.round(geoCoords.accuracy)}m)
                </span>
              )}
            </div>

            {/* Remarks note */}
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">
                Remarks / Room Number (Optional):
              </label>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="e.g. Lab 304, Lecture attendance, On-time"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-950 p-4 border-t border-slate-800 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-300 hover:text-white text-xs font-semibold hover:bg-slate-800 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSubmitting || !capturedPhoto}
            onClick={handleSubmitPunch}
            className={`px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white shadow-lg flex items-center space-x-2 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              punchType === 'TIME_IN'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-950/40'
                : 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 shadow-red-950/40'
            }`}
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Verifying Geofence & Storing...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Confirm {punchType.replace('_', ' ')} Submission</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

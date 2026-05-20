'use client';

import { useRef, useState, useEffect, useCallback } from 'react';

interface CameraCaptureProps {
  onCapture: (imageDataUrl: string) => void;
}

export default function CameraCapture({ onCapture }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // iOS Safari requires explicit play() after setting srcObject
        try {
          await videoRef.current.play();
        } catch (playErr) {
          // Some browsers play automatically, ignore play() rejection
          console.log('Video play() note:', playErr);
        }
        setStreaming(true);
      }
    } catch (err: any) {
      const msg = err?.name === 'NotAllowedError'
        ? 'Camera permission denied. Please allow camera access in your browser settings and try again.'
        : err?.name === 'NotFoundError'
        ? 'No camera found on this device. Try uploading a photo instead.'
        : 'Camera access denied or unavailable. Try uploading a photo instead.';
      setError(msg);
    }
  }, [facingMode]);

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((track) => track.stop());
      setStreaming(false);
    }
  }, []);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    stopCamera();
    onCapture(dataUrl);
  };

  const flipCamera = () => {
    stopCamera();
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  return (
    <div className="glass-card rounded-2xl p-6 max-w-lg mx-auto">
      <canvas ref={canvasRef} className="hidden" />
      
      {!streaming && !error && (
        <div className="text-center py-8">
          <div className="text-6xl mb-4">📷</div>
          <p className="text-gray-400 mb-6">Use your camera to capture a close-up of your eye</p>
          <button
            onClick={startCamera}
            className="px-6 py-3 rounded-full animated-gradient text-white font-semibold hover:scale-105 transition-transform"
          >
            Open Camera
          </button>
        </div>
      )}

      {error && (
        <div className="text-center py-4">
          <p className="text-red-400 text-sm">{error}</p>
          <button
            onClick={startCamera}
            className="mt-4 px-4 py-2 text-sm rounded-full border border-iris-500/50 text-iris-300 hover:bg-iris-500/10"
          >
            Try Again
          </button>
        </div>
      )}

      {streaming && (
        <div className="space-y-4">
          <div className="relative rounded-xl overflow-hidden aspect-video bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              controls={false}
              className="w-full h-full object-cover"
              style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
            />
            {/* Guide overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-32 h-32 border-2 border-iris-400/50 rounded-full" />
            </div>
          </div>
          <div className="flex gap-3 justify-center">
            <button
              onClick={flipCamera}
              className="px-4 py-2 rounded-full border border-white/20 text-gray-300 hover:bg-white/5 text-sm"
            >
              🔄 Flip
            </button>
            <button
              onClick={capturePhoto}
              className="px-8 py-3 rounded-full animated-gradient text-white font-semibold hover:scale-105 transition-transform"
            >
              📸 Capture
            </button>
            <button
              onClick={stopCamera}
              className="px-4 py-2 rounded-full border border-white/20 text-gray-300 hover:bg-white/5 text-sm"
            >
              Cancel
            </button>
          </div>
          <p className="text-center text-gray-500 text-xs">
            Position your eye inside the circle. Get as close as possible for best results.
          </p>
        </div>
      )}
    </div>
  );
}

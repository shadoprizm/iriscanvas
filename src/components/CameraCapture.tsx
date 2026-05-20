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
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setStreaming(false);
  }, []);

  const startCamera = useCallback(async () => {
    try {
      // Stop any existing stream first
      if (videoRef.current?.srcObject) {
        stopCamera();
      }

      setError(null);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      const video = videoRef.current;
      if (!video) {
        stream.getTracks().forEach(t => t.stop());
        return;
      }

      video.srcObject = stream;

      // Critical for iOS Safari: must set these before play
      video.setAttribute('playsinline', '');
      video.setAttribute('autoplay', '');
      video.setAttribute('muted', '');

      // Wait for video to be ready
      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => {
          video.play()
            .then(() => resolve())
            .catch(() => resolve()); // auto-play may reject, that's ok
        };
        video.onerror = () => reject(new Error('Video element error'));
        // Timeout fallback
        setTimeout(() => resolve(), 3000);
      });

      setStreaming(true);
    } catch (err: any) {
      console.error('Camera error:', err);
      const msg = err?.name === 'NotAllowedError'
        ? 'Camera permission denied. Please allow camera access in Settings > Safari > Camera and reload the page.'
        : err?.name === 'NotFoundError'
        ? 'No camera found. Try uploading a photo instead.'
        : 'Camera unavailable. Try uploading a photo instead.';
      setError(msg);
    }
  }, [facingMode, stopCamera]);

  // Auto-start when facingMode changes
  useEffect(() => {
    if (streaming) {
      startCamera();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach((track) => track.stop());
      }
    };
  }, []);

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    // Use actual video dimensions
    const w = video.videoWidth || 640;
    const h = video.videoHeight || 480;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;

    // Un-mirror for capture if using front camera
    if (facingMode === 'user') {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, w, h);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    stopCamera();
    onCapture(dataUrl);
  };

  const flipCamera = () => {
    stopCamera();
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  return (
    <div className="rounded-2xl p-6 max-w-lg mx-auto" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {!streaming && !error && (
        <div className="text-center py-8">
          <div className="text-6xl mb-4">📷</div>
          <p className="text-gray-400 mb-6">Use your camera to capture a close-up of your eye</p>
          <button
            onClick={startCamera}
            className="px-6 py-3 rounded-full text-white font-semibold hover:scale-105 transition-transform"
            style={{ background: 'linear-gradient(135deg, #6a1bff, #ff6ab3)' }}
          >
            Open Camera
          </button>
        </div>
      )}

      {error && (
        <div className="text-center py-4">
          <p className="text-red-400 text-sm mb-4">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={startCamera}
              className="px-4 py-2 text-sm rounded-full border text-gray-300 hover:bg-white/10"
              style={{ borderColor: 'rgba(106,27,255,0.4)' }}
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {streaming && (
        <div className="space-y-4">
          {/* Video container - explicit dimensions for iOS */}
          <div style={{ position: 'relative', width: '100%', borderRadius: '12px', overflow: 'hidden', background: '#000' }}>
            <video
              ref={videoRef}
              playsInline
              autoPlay
              muted
              controls={false}
              style={{
                width: '100%',
                height: 'auto',
                display: 'block',
                minHeight: '240px',
                transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
                objectFit: 'cover',
              }}
            />
            {/* Guide overlay */}
            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
            }}>
              <div style={{
                width: '120px',
                height: '120px',
                border: '2px solid rgba(106,27,255,0.5)',
                borderRadius: '50%',
                boxShadow: '0 0 20px rgba(106,27,255,0.3)',
              }} />
            </div>
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={flipCamera}
              className="px-4 py-2 rounded-full border text-gray-300 hover:bg-white/5 text-sm"
              style={{ borderColor: 'rgba(255,255,255,0.2)', minWidth: '70px' }}
            >
              🔄 Flip
            </button>
            <button
              onClick={capturePhoto}
              className="px-8 py-3 rounded-full text-white font-semibold hover:scale-105 transition-transform"
              style={{ background: 'linear-gradient(135deg, #6a1bff, #ff6ab3)', minWidth: '140px' }}
            >
              📸 Capture
            </button>
            <button
              onClick={() => stopCamera()}
              className="px-4 py-2 rounded-full border text-gray-300 hover:bg-white/5 text-sm"
              style={{ borderColor: 'rgba(255,255,255,0.2)', minWidth: '70px' }}
            >
              ✕ Cancel
            </button>
          </div>
          <p className="text-center text-gray-500 text-xs">
            Position your eye inside the circle. Use back camera for best results.
          </p>
        </div>
      )}

      {/* Hidden video element as fallback — always mounted so iOS can attach stream */}
      {!streaming && (
        <video ref={videoRef} playsInline autoPlay muted style={{ display: 'none' }} />
      )}
    </div>
  );
}

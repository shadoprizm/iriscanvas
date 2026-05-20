'use client';

import { useRef, useState, useCallback } from 'react';

interface CameraCaptureProps {
  onCapture: (imageDataUrl: string) => void;
}

export default function CameraCapture({ onCapture }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useBackCamera, setUseBackCamera] = useState(true);

  const stopStream = useCallback(() => {
    const video = videoRef.current;
    if (video?.srcObject) {
      (video.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      video.srcObject = null;
    }
    setStreaming(false);
  }, []);

  const startCamera = useCallback(async (back: boolean) => {
    try {
      setError(null);
      // Stop any existing stream
      const video = videoRef.current;
      if (video?.srcObject) {
        (video.srcObject as MediaStream).getTracks().forEach(t => t.stop());
        video.srcObject = null;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: back ? 'environment' : 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      if (!videoRef.current) {
        stream.getTracks().forEach(t => t.stop());
        return;
      }

      const v = videoRef.current;
      v.srcObject = stream;

      // iOS Safari: wait for metadata, then play
      await new Promise<void>((resolve) => {
        if (v.readyState >= 1) {
          // Already loaded
          v.play().then(resolve).catch(resolve);
          return;
        }
        v.onloadedmetadata = () => {
          v.play().then(resolve).catch(resolve);
        };
        setTimeout(resolve, 4000); // Safety timeout
      });

      setStreaming(true);
    } catch (err: any) {
      console.error('Camera error:', err);
      if (err?.name === 'NotAllowedError') {
        setError('Camera permission denied. Allow camera in Safari settings and reload.');
      } else if (err?.name === 'NotFoundError') {
        setError('No camera found. Try uploading a photo instead.');
      } else {
        setError('Could not start camera. Try uploading a photo instead.');
      }
      setStreaming(false);
    }
  }, []);

  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.videoWidth === 0) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    stopStream();
    onCapture(dataUrl);
  }, [onCapture, stopStream]);

  const handleFlip = useCallback(async () => {
    const next = !useBackCamera;
    setUseBackCamera(next);
    setStreaming(false);
    // Small delay to let state settle, then start new camera
    setTimeout(() => startCamera(next), 200);
  }, [useBackCamera, startCamera]);

  return (
    <div className="rounded-2xl p-6 max-w-lg mx-auto" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Pre-capture UI */}
      {!streaming && !error && (
        <div className="text-center py-8">
          <div className="text-6xl mb-4">📷</div>
          <p className="text-gray-400 mb-6">Capture a close-up of your eye</p>
          <button
            onClick={() => startCamera(useBackCamera)}
            className="px-6 py-3 rounded-full text-white font-semibold text-lg active:scale-95 transition-transform"
            style={{ background: 'linear-gradient(135deg, #6a1bff, #ff6ab3)' }}
          >
            Open Camera
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="text-center py-6">
          <p className="text-red-400 text-sm mb-4">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => startCamera(useBackCamera)}
              className="px-4 py-2 text-sm rounded-full text-white"
              style={{ background: 'linear-gradient(135deg, #6a1bff, #ff6ab3)' }}
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Live camera feed */}
      {streaming && (
        <div>
          <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', background: '#111', minHeight: '280px' }}>
            <video
              ref={videoRef}
              playsInline
              autoPlay
              muted
              style={{
                width: '100%',
                height: '100%',
                display: 'block',
                objectFit: 'cover',
                minHeight: '280px',
                transform: useBackCamera ? 'none' : 'scaleX(-1)',
              }}
            />
            {/* Eye guide circle */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '100px',
              height: '100px',
              border: '2px solid rgba(106, 27, 255, 0.6)',
              borderRadius: '50%',
              boxShadow: '0 0 20px rgba(106, 27, 255, 0.3)',
              pointerEvents: 'none',
            }} />
          </div>

          {/* Capture controls */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              onClick={handleFlip}
              style={{
                padding: '8px 16px',
                borderRadius: '9999px',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#d1d5db',
                background: 'transparent',
                fontSize: '14px',
                minWidth: '60px',
              }}
            >
              🔄
            </button>
            <button
              onClick={capturePhoto}
              style={{
                padding: '12px 32px',
                borderRadius: '9999px',
                background: 'linear-gradient(135deg, #6a1bff, #ff6ab3)',
                color: '#fff',
                fontWeight: 600,
                fontSize: '16px',
                minWidth: '140px',
                border: 'none',
              }}
            >
              📸 Capture
            </button>
            <button
              onClick={stopStream}
              style={{
                padding: '8px 16px',
                borderRadius: '9999px',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#d1d5db',
                background: 'transparent',
                fontSize: '14px',
                minWidth: '60px',
              }}
            >
              ✕
            </button>
          </div>
          <p style={{ textAlign: 'center', color: '#6b7280', fontSize: '12px', marginTop: '12px' }}>
            {useBackCamera ? 'Using back camera' : 'Using front camera'} — position your eye in the circle
          </p>
        </div>
      )}
    </div>
  );
}

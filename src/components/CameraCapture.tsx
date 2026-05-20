'use client';

import { useRef, useState, useCallback } from 'react';

interface CameraCaptureProps {
  onCapture: (imageDataUrl: string) => void;
}

export default function CameraCapture({ onCapture }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const openCamera = useCallback(async () => {
    try {
      setErrorMsg('');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });

      const v = videoRef.current;
      if (!v) { stream.getTracks().forEach(t => t.stop()); return; }

      v.srcObject = stream;
      v.setAttribute('playsinline', 'true');
      v.setAttribute('autoplay', 'true');
      v.setAttribute('muted', 'true');

      // Wait for video to be ready then play
      v.onloadedmetadata = () => {
        v.play().catch(() => {});
        setCameraActive(true);
      };
      // Fallback in case onloadedmetadata already fired
      setTimeout(() => {
        if (!cameraActive) {
          v.play().catch(() => {});
          setCameraActive(true);
        }
      }, 2000);
    } catch (e: any) {
      setErrorMsg(e.name === 'NotAllowedError' 
        ? 'Please allow camera access and reload' 
        : 'Camera not available — try uploading a photo');
    }
  }, []);

  const takePhoto = useCallback(() => {
    const v = videoRef.current;
    const c = canvasRef.current;
    if (!v || !c || v.videoWidth === 0) return;
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext('2d')!.drawImage(v, 0, 0);
    const data = c.toDataURL('image/jpeg', 0.9);
    // Stop camera
    (v.srcObject as MediaStream)?.getTracks().forEach(t => t.stop());
    v.srcObject = null;
    setCameraActive(false);
    onCapture(data);
  }, [onCapture]);

  const closeCamera = useCallback(() => {
    const v = videoRef.current;
    if (v?.srcObject) {
      (v.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      v.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  return (
    <div style={{ textAlign: 'center' }}>
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      
      {/* Video is ALWAYS in the DOM - just hidden/shown */}
      <div style={{ display: cameraActive ? 'block' : 'none', marginBottom: '16px' }}>
        <video
          ref={videoRef}
          playsInline
          autoPlay
          muted
          style={{
            width: '100%',
            maxWidth: '500px',
            borderRadius: '12px',
            display: 'block',
            margin: '0 auto',
            background: '#000',
          }}
        />
        <div style={{ marginTop: '16px', display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            onClick={takePhoto}
            style={{
              padding: '12px 32px',
              borderRadius: '24px',
              background: 'linear-gradient(135deg, #6a1bff, #ff6ab3)',
              color: '#fff',
              fontWeight: 600,
              fontSize: '16px',
              border: 'none',
              WebkitAppearance: 'none',
            }}
          >
            📸 Capture
          </button>
          <button
            onClick={closeCamera}
            style={{
              padding: '12px 20px',
              borderRadius: '24px',
              background: 'transparent',
              color: '#999',
              fontSize: '14px',
              border: '1px solid rgba(255,255,255,0.2)',
            }}
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Open camera button - only shown when camera is off */}
      {!cameraActive && !errorMsg && (
        <div style={{ padding: '32px 0' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📷</div>
          <p style={{ color: '#999', marginBottom: '24px' }}>Take a close-up photo of your eye</p>
          <button
            onClick={openCamera}
            style={{
              padding: '14px 32px',
              borderRadius: '24px',
              background: 'linear-gradient(135deg, #6a1bff, #ff6ab3)',
              color: '#fff',
              fontWeight: 600,
              fontSize: '16px',
              border: 'none',
              WebkitAppearance: 'none',
            }}
          >
            Open Camera
          </button>
        </div>
      )}

      {/* Error */}
      {errorMsg && (
        <div style={{ padding: '24px 0' }}>
          <p style={{ color: '#f87171', fontSize: '14px', marginBottom: '16px' }}>{errorMsg}</p>
          <button
            onClick={openCamera}
            style={{
              padding: '10px 24px',
              borderRadius: '24px',
              background: 'linear-gradient(135deg, #6a1bff, #ff6ab3)',
              color: '#fff',
              border: 'none',
              fontSize: '14px',
            }}
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}

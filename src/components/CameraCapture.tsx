'use client';

import { useRef, useState, useCallback, useEffect } from 'react';

interface CameraCaptureProps {
  onCapture: (imageDataUrl: string) => void;
}

export default function CameraCapture({ onCapture }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [autoMode, setAutoMode] = useState(true);
  const [autoStatus, setAutoStatus] = useState('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const autoDetectRef = useRef(false);
  const animFrameRef = useRef<number>(0);
  const capturedRef = useRef(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      const v = videoRef.current;
      if (v?.srcObject) {
        (v.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const startStream = useCallback(async (facing: 'environment' | 'user') => {
    try {
      setErrorMsg('');
      const v = videoRef.current;
      if (v?.srcObject) {
        (v.srcObject as MediaStream).getTracks().forEach(t => t.stop());
        v.srcObject = null;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });

      if (!v) { stream.getTracks().forEach(t => t.stop()); return; }

      v.srcObject = stream;
      v.setAttribute('playsinline', 'true');
      v.setAttribute('autoplay', 'true');
      v.setAttribute('muted', 'true');

      await new Promise<void>((resolve) => {
        v.onloadedmetadata = () => {
          v.play().catch(() => {}).then(resolve);
        };
        setTimeout(resolve, 3000);
      });

      setCameraActive(true);
      capturedRef.current = false;
    } catch (e: any) {
      setErrorMsg(e.name === 'NotAllowedError'
        ? 'Please allow camera access and reload'
        : 'Camera not available — try uploading a photo');
    }
  }, []);

  const openCamera = useCallback(() => startStream(facingMode), [startStream, facingMode]);

  const takePhoto = useCallback(() => {
    if (capturedRef.current) return;
    capturedRef.current = true;
    cancelAnimationFrame(animFrameRef.current);

    const v = videoRef.current;
    const c = canvasRef.current;
    if (!v || !c || v.videoWidth === 0) { capturedRef.current = false; return; }

    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext('2d')!.drawImage(v, 0, 0);
    const data = c.toDataURL('image/jpeg', 0.92);

    (v.srcObject as MediaStream)?.getTracks().forEach(t => t.stop());
    v.srcObject = null;
    setCameraActive(false);
    setAutoStatus('');
    onCapture(data);
  }, [onCapture]);

  const closeCamera = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    const v = videoRef.current;
    if (v?.srcObject) {
      (v.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      v.srcObject = null;
    }
    setCameraActive(false);
    setAutoStatus('');
  }, []);

  const handleFlip = useCallback(async () => {
    cancelAnimationFrame(animFrameRef.current);
    const v = videoRef.current;
    if (v?.srcObject) {
      (v.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      v.srcObject = null;
    }
    setCameraActive(false);
    const next = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(next);
    setTimeout(() => startStream(next), 300);
  }, [facingMode, startStream]);

  // Auto-detect iris loop
  useEffect(() => {
    if (!cameraActive || !autoMode || !autoDetectRef.current) return;

    const detect = () => {
      const v = videoRef.current;
      const c = canvasRef.current;
      if (!v || !c || v.videoWidth === 0 || v.readyState < 2) {
        animFrameRef.current = requestAnimationFrame(detect);
        return;
      }

      // Analyze center region of the frame
      const size = 80;
      const cx = Math.floor(v.videoWidth / 2 - size / 2);
      const cy = Math.floor(v.videoHeight / 2 - size / 2);

      c.width = size;
      c.height = size;
      const ctx = c.getContext('2d')!;
      ctx.drawImage(v, cx, cy, size, size, 0, 0, size, size);

      const imageData = ctx.getImageData(0, 0, size, size);
      const pixels = imageData.data;

      // Check for iris-like characteristics:
      // 1. Dark pupil center (low brightness in middle)
      // 2. Colored iris ring around it (moderate saturation)
      // 3. Contrast between center and edges
      const centerStart = (size / 2 - 10) * size + (size / 2 - 10);
      const centerPixels = 20 * 20;
      let centerBrightness = 0;
      for (let i = 0; i < centerPixels; i++) {
        const idx = (centerStart + (Math.floor(i / 20) * size) + (i % 20)) * 4;
        centerBrightness += (pixels[idx] + pixels[idx + 1] + pixels[idx + 2]) / 3;
      }
      centerBrightness /= centerPixels;

      // Edge ring (around the center)
      let edgeBrightness = 0;
      let edgeCount = 0;
      for (let y = 0; y < size; y += 4) {
        for (let x = 0; x < size; x += 4) {
          const dist = Math.sqrt((x - size/2) ** 2 + (y - size/2) ** 2);
          if (dist > 25 && dist < 35) {
            const idx = (y * size + x) * 4;
            edgeBrightness += (pixels[idx] + pixels[idx + 1] + pixels[idx + 2]) / 3;
            edgeCount++;
          }
        }
      }
      edgeBrightness /= (edgeCount || 1);

      const contrast = Math.abs(edgeBrightness - centerBrightness);

      // Good iris detection:
      // - Center is dark (pupil < 80)
      // - Contrast between iris ring and pupil is high (> 30)
      // - Not too dark overall (lighting is ok)
      const hasPupil = centerBrightness < 90;
      const hasContrast = contrast > 25;
      const hasLight = edgeBrightness > 40;

      if (hasPupil && hasContrast && hasLight) {
        setAutoStatus('🎯 Iris detected! Capturing...');
        // Brief delay to stabilize, then capture
        setTimeout(() => takePhoto(), 400);
      } else if (hasPupil) {
        setAutoStatus('👁️ Almost there... move closer');
      } else if (centerBrightness < 150) {
        setAutoStatus('🔍 Center your eye in the circle');
      } else {
        setAutoStatus('📷 Point camera at your eye');
      }

      animFrameRef.current = requestAnimationFrame(detect);
    };

    autoDetectRef.current = true;
    animFrameRef.current = requestAnimationFrame(detect);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [cameraActive, autoMode, takePhoto]);

  return (
    <div style={{ textAlign: 'center' }}>
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Camera feed */}
      <div style={{ display: cameraActive ? 'block' : 'none', marginBottom: '16px' }}>
        <div style={{ position: 'relative', maxWidth: '500px', margin: '0 auto' }}>
          <video
            ref={videoRef}
            playsInline
            autoPlay
            muted
            style={{
              width: '100%',
              borderRadius: '12px',
              display: 'block',
              margin: '0 auto',
              background: '#000',
              transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
            }}
          />

          {/* Iris target overlay */}
          {autoMode && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              border: '3px solid rgba(106, 27, 255, 0.7)',
              boxShadow: '0 0 30px rgba(106, 27, 255, 0.4), inset 0 0 20px rgba(106, 27, 255, 0.1)',
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {/* Inner target ring */}
              <div style={{
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                border: '2px solid rgba(255, 106, 179, 0.5)',
              }} />
            </div>
          )}

          {/* Auto-status text */}
          {autoMode && autoStatus && (
            <div style={{
              position: 'absolute',
              bottom: '12px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(0,0,0,0.7)',
              color: '#e2e8f0',
              padding: '6px 16px',
              borderRadius: '20px',
              fontSize: '13px',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
            }}>
              {autoStatus}
            </div>
          )}
        </div>

        {/* Controls */}
        <div style={{ marginTop: '16px', display: 'flex', gap: '12px', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={closeCamera} style={smallBtnStyle}>✕</button>

          {!autoMode && (
            <button onClick={takePhoto} style={captureBtnStyle}>📸 Capture</button>
          )}

          {autoMode && (
            <div style={{
              padding: '10px 24px',
              borderRadius: '24px',
              background: 'linear-gradient(135deg, rgba(106,27,255,0.3), rgba(255,106,179,0.3))',
              border: '1px solid rgba(106,27,255,0.5)',
              color: '#c4b5fd',
              fontSize: '14px',
            }}>
              🤖 Auto-Capture ON
            </div>
          )}

          <button onClick={() => setAutoMode(!autoMode)} style={smallBtnStyle}>
            {autoMode ? '🖐️ Manual' : '🤖 Auto'}
          </button>
          <button onClick={handleFlip} style={smallBtnStyle}>🔄</button>
        </div>

        {/* Tip */}
        <p style={{ color: '#6b7280', fontSize: '11px', marginTop: '12px', lineHeight: 1.4 }}>
          {autoMode
            ? 'Position your eye in the circle. Good lighting helps. AI will enhance the result.'
            : 'Tap Capture when your eye is centered'}
        </p>
      </div>

      {/* Pre-capture UI */}
      {!cameraActive && !errorMsg && (
        <div style={{ padding: '32px 0' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📷</div>
          <p style={{ color: '#999', marginBottom: '8px' }}>Take a close-up photo of your eye</p>
          <p style={{ color: '#6b7280', fontSize: '12px', marginBottom: '24px' }}>
            {autoMode ? 'Auto-mode: just hold your eye steady in the target circle' : 'Manual mode: tap capture when ready'}
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={openCamera} style={captureBtnStyle}>Open Camera</button>
            <button onClick={() => setAutoMode(!autoMode)} style={smallBtnStyle}>
              {autoMode ? '🤖 Auto' : '🖐️ Manual'}
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {errorMsg && (
        <div style={{ padding: '24px 0' }}>
          <p style={{ color: '#f87171', fontSize: '14px', marginBottom: '16px' }}>{errorMsg}</p>
          <button onClick={openCamera} style={captureBtnStyle}>Try Again</button>
        </div>
      )}
    </div>
  );
}

const captureBtnStyle: React.CSSProperties = {
  padding: '12px 32px',
  borderRadius: '24px',
  background: 'linear-gradient(135deg, #6a1bff, #ff6ab3)',
  color: '#fff',
  fontWeight: 600,
  fontSize: '16px',
  border: 'none',
  WebkitAppearance: 'none',
};

const smallBtnStyle: React.CSSProperties = {
  padding: '10px 16px',
  borderRadius: '24px',
  background: 'transparent',
  color: '#999',
  fontSize: '14px',
  border: '1px solid rgba(255,255,255,0.2)',
};

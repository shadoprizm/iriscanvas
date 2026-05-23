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
  const animFrameRef = useRef<number>(0);
  const capturedRef = useRef(false);
  const captureTimeoutRef = useRef<number>(0);
  const stableIrisFramesRef = useRef(0);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.clearTimeout(captureTimeoutRef.current);
      captureTimeoutRef.current = 0;
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
      stableIrisFramesRef.current = 0;
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
    stableIrisFramesRef.current = 0;
    cancelAnimationFrame(animFrameRef.current);
    window.clearTimeout(captureTimeoutRef.current);
    captureTimeoutRef.current = 0;

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
    window.clearTimeout(captureTimeoutRef.current);
    captureTimeoutRef.current = 0;
    const v = videoRef.current;
    if (v?.srcObject) {
      (v.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      v.srcObject = null;
    }
    setCameraActive(false);
    setAutoStatus('');
    stableIrisFramesRef.current = 0;
  }, []);

  const handleFlip = useCallback(async () => {
    cancelAnimationFrame(animFrameRef.current);
    window.clearTimeout(captureTimeoutRef.current);
    captureTimeoutRef.current = 0;
    const v = videoRef.current;
    if (v?.srcObject) {
      (v.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      v.srcObject = null;
    }
    setCameraActive(false);
    stableIrisFramesRef.current = 0;
    const next = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(next);
    setTimeout(() => startStream(next), 300);
  }, [facingMode, startStream]);

  // Auto-detect iris loop
  useEffect(() => {
    if (!cameraActive || !autoMode) return;
    let active = true;

    const detect = () => {
      if (!active || capturedRef.current) return;
      const v = videoRef.current;
      const c = canvasRef.current;
      if (!v || !c || v.videoWidth === 0 || v.readyState < 2) {
        animFrameRef.current = requestAnimationFrame(detect);
        return;
      }

      // Analyze region matching the overlay position (upper quarter of frame)
      const size = 120;
      const cx = Math.floor(v.videoWidth / 2 - size / 2);
      // Sample from upper area (25% mark) to match the overlay
      const cy = Math.floor(v.videoHeight * 0.25 - size / 2);

      c.width = size;
      c.height = size;
      const ctx = c.getContext('2d')!;
      ctx.drawImage(v, cx, cy, size, size, 0, 0, size, size);

      const imageData = ctx.getImageData(0, 0, size, size);
      const pixels = imageData.data;

      // Score the target for an eye-like structure: a centered dark pupil with
      // an iris annulus filling most of the guide circle.
      let pupilBrightness = 0;
      let pupilDarkPixels = 0;
      let pupilPixels = 0;
      let irisBrightness = 0;
      let irisSaturation = 0;
      let irisCandidatePixels = 0;
      let irisPixels = 0;
      let outerBrightness = 0;
      let outerPixels = 0;

      for (let y = 0; y < size; y += 2) {
        for (let x = 0; x < size; x += 2) {
          const dx = x - size / 2;
          const dy = y - size / 2;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const idx = (y * size + x) * 4;
          const r = pixels[idx], g = pixels[idx + 1], b = pixels[idx + 2];
          const brightness = (r + g + b) / 3;
          const max = Math.max(r, g, b), min = Math.min(r, g, b);
          const saturation = max === 0 ? 0 : (max - min) / max;

          if (dist <= 18) {
            pupilBrightness += brightness;
            pupilPixels++;
            if (brightness < 80) pupilDarkPixels++;
          } else if (dist >= 30 && dist <= 54) {
            irisBrightness += brightness;
            irisSaturation += saturation;
            irisPixels++;
            if (brightness > 35 && brightness < 215 && saturation > 0.07) irisCandidatePixels++;
          } else if (dist >= 56 && dist <= 60) {
            outerBrightness += brightness;
            outerPixels++;
          }
        }
      }

      pupilBrightness /= (pupilPixels || 1);
      irisBrightness /= (irisPixels || 1);
      irisSaturation /= (irisPixels || 1);
      outerBrightness /= (outerPixels || 1);

      // Full region brightness (lighting check)
      let totalBrightness = 0;
      for (let i = 0; i < pixels.length; i += 16) {
        totalBrightness += (pixels[i] + pixels[i+1] + pixels[i+2]) / 3;
      }
      totalBrightness /= (pixels.length / 16);

      const pupilDarkRatio = pupilDarkPixels / (pupilPixels || 1);
      const irisFillRatio = irisCandidatePixels / (irisPixels || 1);
      const pupilToIrisContrast = irisBrightness - pupilBrightness;
      const limbalContrast = Math.abs(outerBrightness - irisBrightness);

      const hasCenteredPupil = pupilBrightness < 90 && pupilDarkRatio > 0.45 && pupilDarkRatio < 0.95;
      const irisFillsTarget = irisFillRatio > 0.38 && irisSaturation > 0.09;
      const hasIrisContrast = pupilToIrisContrast > 32 && limbalContrast > 8;
      const hasLight = totalBrightness > 35 && totalBrightness < 220;
      const irisReady = hasCenteredPupil && irisFillsTarget && hasIrisContrast && hasLight;

      if (irisReady) {
        stableIrisFramesRef.current += 1;
      } else {
        stableIrisFramesRef.current = 0;
        window.clearTimeout(captureTimeoutRef.current);
        captureTimeoutRef.current = 0;
      }

      if (stableIrisFramesRef.current >= 8) {
        setAutoStatus('🎯 Iris centered. Capturing...');
        if (!captureTimeoutRef.current) {
          captureTimeoutRef.current = window.setTimeout(() => {
            captureTimeoutRef.current = 0;
            takePhoto();
          }, 250);
        }
      } else if (hasCenteredPupil && hasLight) {
        setAutoStatus('👁️ Fill the circle with your iris');
      } else if (totalBrightness < 25) {
        setAutoStatus('💡 Need more light');
      } else if (pupilBrightness < 160) {
        setAutoStatus('🔍 Move closer to your eye');
      } else {
        setAutoStatus('📷 Point camera at your eye');
      }

      animFrameRef.current = requestAnimationFrame(detect);
    };

    animFrameRef.current = requestAnimationFrame(detect);

    return () => {
      active = false;
      stableIrisFramesRef.current = 0;
      cancelAnimationFrame(animFrameRef.current);
      window.clearTimeout(captureTimeoutRef.current);
      captureTimeoutRef.current = 0;
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

          {/* Iris target overlay - positioned higher on mobile to match camera */}
          {autoMode && (
            <div style={{
              position: 'absolute',
              top: '25%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '140px',
              height: '140px',
              borderRadius: '50%',
              border: '3px dashed rgba(106, 27, 255, 0.8)',
              boxShadow: '0 0 30px rgba(106, 27, 255, 0.3)',
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                border: '2px solid rgba(255, 106, 179, 0.6)',
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

'use client';

import { useRef, useState, useCallback, useEffect } from 'react';

interface CameraCaptureProps {
  onCapture: (imageDataUrl: string) => void;
}

const GUIDE_CENTER_Y_RATIO = 0.25;
const GUIDE_DIAMETER_RATIO = 0.34;
const GUIDE_OUTPUT_SIZE = 768;

type GuideRect = {
  sx: number;
  sy: number;
  size: number;
};

type IrisGuideScore = {
  ready: boolean;
  hasCenteredPupil: boolean;
  irisFillsTarget: boolean;
  hasIrisContrast: boolean;
  hasLight: boolean;
};

function getGuideRect(video: HTMLVideoElement): GuideRect {
  const guideSize = Math.round(Math.min(video.videoWidth, video.videoHeight) * GUIDE_DIAMETER_RATIO);
  const cx = video.videoWidth / 2;
  const cy = video.videoHeight * GUIDE_CENTER_Y_RATIO;
  const size = Math.max(120, guideSize);
  const sx = Math.max(0, Math.min(video.videoWidth - size, Math.round(cx - size / 2)));
  const sy = Math.max(0, Math.min(video.videoHeight - size, Math.round(cy - size / 2)));

  return { sx, sy, size };
}

function scoreIrisGuide(pixels: Uint8ClampedArray, size: number): IrisGuideScore {
  let pupilBrightness = 0;
  let pupilDarkPixels = 0;
  let pupilPixels = 0;
  let irisBrightness = 0;
  let irisSaturation = 0;
  let irisCandidatePixels = 0;
  let irisPixels = 0;
  let outerBrightness = 0;
  let outerPixels = 0;
  let sectorFillMask = 0;
  let totalBrightness = 0;
  let totalSamples = 0;

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
      const normalizedDist = dist / (size / 2);

      totalBrightness += brightness;
      totalSamples++;

      if (normalizedDist <= 0.30) {
        pupilBrightness += brightness;
        pupilPixels++;
        if (brightness < 70) pupilDarkPixels++;
      } else if (normalizedDist >= 0.43 && normalizedDist <= 0.86) {
        irisBrightness += brightness;
        irisSaturation += saturation;
        irisPixels++;

        const isIrisLike = brightness > 38 && brightness < 205 && saturation > 0.10;
        if (isIrisLike) {
          irisCandidatePixels++;
          const angle = Math.atan2(dy, dx) + Math.PI;
          const sector = Math.min(15, Math.floor((angle / (Math.PI * 2)) * 16));
          sectorFillMask |= (1 << sector);
        }
      } else if (normalizedDist >= 0.88 && normalizedDist <= 0.98) {
        outerBrightness += brightness;
        outerPixels++;
      }
    }
  }

  pupilBrightness /= (pupilPixels || 1);
  irisBrightness /= (irisPixels || 1);
  irisSaturation /= (irisPixels || 1);
  outerBrightness /= (outerPixels || 1);
  totalBrightness /= (totalSamples || 1);

  const pupilDarkRatio = pupilDarkPixels / (pupilPixels || 1);
  const irisFillRatio = irisCandidatePixels / (irisPixels || 1);
  const pupilToIrisContrast = irisBrightness - pupilBrightness;
  const limbalContrast = Math.abs(outerBrightness - irisBrightness);
  const filledSectors = sectorFillMask.toString(2).replace(/0/g, '').length;

  const hasCenteredPupil = pupilBrightness < 82 && pupilDarkRatio > 0.52 && pupilDarkRatio < 0.88;
  const irisFillsTarget = irisFillRatio > 0.52 && irisSaturation > 0.12 && filledSectors >= 13;
  const hasIrisContrast = pupilToIrisContrast > 38 && limbalContrast > 12;
  const hasLight = totalBrightness > 45 && totalBrightness < 205;

  return {
    ready: hasCenteredPupil && irisFillsTarget && hasIrisContrast && hasLight,
    hasCenteredPupil,
    irisFillsTarget,
    hasIrisContrast,
    hasLight,
  };
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

    const guide = getGuideRect(v);
    c.width = GUIDE_OUTPUT_SIZE;
    c.height = GUIDE_OUTPUT_SIZE;
    c.getContext('2d')!.drawImage(
      v,
      guide.sx,
      guide.sy,
      guide.size,
      guide.size,
      0,
      0,
      GUIDE_OUTPUT_SIZE,
      GUIDE_OUTPUT_SIZE
    );
    const data = c.toDataURL('image/jpeg', 0.94);

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

      const guide = getGuideRect(v);
      const size = 160;

      c.width = size;
      c.height = size;
      const ctx = c.getContext('2d')!;
      ctx.drawImage(v, guide.sx, guide.sy, guide.size, guide.size, 0, 0, size, size);

      const imageData = ctx.getImageData(0, 0, size, size);
      const irisScore = scoreIrisGuide(imageData.data, size);

      if (irisScore.ready) {
        stableIrisFramesRef.current += 1;
      } else {
        stableIrisFramesRef.current = 0;
        window.clearTimeout(captureTimeoutRef.current);
        captureTimeoutRef.current = 0;
      }

      if (stableIrisFramesRef.current >= 12) {
        setAutoStatus('🎯 Iris centered. Capturing...');
        if (!captureTimeoutRef.current) {
          captureTimeoutRef.current = window.setTimeout(() => {
            captureTimeoutRef.current = 0;
            takePhoto();
          }, 250);
        }
      } else if (irisScore.hasCenteredPupil && irisScore.hasLight && !irisScore.irisFillsTarget) {
        setAutoStatus('👁️ Fill the circle with your iris');
      } else if (!irisScore.hasLight) {
        setAutoStatus('💡 Need more light');
      } else if (irisScore.hasCenteredPupil && !irisScore.hasIrisContrast) {
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

          {/* Iris target overlay - same capture target in auto and manual */}
          <div style={{
            position: 'absolute',
            top: `${GUIDE_CENTER_Y_RATIO * 100}%`,
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '34%',
            maxWidth: '170px',
            minWidth: '132px',
            aspectRatio: '1 / 1',
            borderRadius: '50%',
            border: '3px dashed rgba(106, 27, 255, 0.8)',
            boxShadow: '0 0 30px rgba(106, 27, 255, 0.3)',
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <div style={{
              width: '43%',
              aspectRatio: '1 / 1',
              borderRadius: '50%',
              border: '2px solid rgba(255, 106, 179, 0.6)',
            }} />
          </div>

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
            : 'Fill the circle with your iris, then tap Capture'}
        </p>
      </div>

      {/* Pre-capture UI */}
      {!cameraActive && !errorMsg && (
        <div style={{ padding: '32px 0' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📷</div>
          <p style={{ color: '#999', marginBottom: '8px' }}>Take a close-up photo of your eye</p>
          <p style={{ color: '#6b7280', fontSize: '12px', marginBottom: '24px' }}>
            {autoMode ? 'Auto-mode: just hold your eye steady in the target circle' : 'Manual mode: fill the target circle, then tap capture'}
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

'use client';

import { useRef, useState } from 'react';

interface ImageUploadProps {
  onUpload: (imageDataUrl: string) => void;
}

export default function ImageUpload({ onUpload }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select an image file');
      setStatus('error');
      return;
    }

    setStatus('loading');
    setErrorMsg('');

    // Resize image client-side to avoid memory issues on mobile
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      
      // Cap at 1024x1024 for upload
      const MAX = 1024;
      let w = img.width;
      let h = img.height;
      if (w > MAX || h > MAX) {
        if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
        else { w = Math.round(w * MAX / h); h = MAX; }
      }

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, w, h);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setStatus('idle');
      onUpload(dataUrl);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      // Fallback: try FileReader directly
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
          setStatus('idle');
          onUpload(result);
        } else {
          setErrorMsg('Could not read image. Try a different photo.');
          setStatus('error');
        }
      };
      reader.onerror = () => {
        setErrorMsg('Could not read image. Try a different photo.');
        setStatus('error');
      };
      reader.readAsDataURL(file);
    };

    img.src = url;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  return (
    <div
      style={{
        textAlign: 'center',
        maxWidth: '500px',
        margin: '0 auto',
        padding: '32px 16px',
        borderRadius: '16px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/heic,image/heif"
        onChange={handleChange}
        style={{ display: 'none' }}
      />
      
      {status === 'loading' && (
        <div style={{ padding: '20px 0' }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>⏳</div>
          <p style={{ color: '#999' }}>Processing your photo...</p>
        </div>
      )}

      {status === 'error' && (
        <div style={{ padding: '12px 0', marginBottom: '8px' }}>
          <p style={{ color: '#f87171', fontSize: '14px' }}>{errorMsg}</p>
        </div>
      )}

      {status !== 'loading' && (
        <>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>📁</div>
          <p style={{ color: '#999', marginBottom: '16px' }}>Upload a close-up photo of your eye</p>
          <button
            onClick={() => {
              if (inputRef.current) inputRef.current.value = '';
              inputRef.current?.click();
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              if (inputRef.current) inputRef.current.value = '';
              inputRef.current?.click();
            }}
            style={{
              padding: '12px 28px',
              borderRadius: '24px',
              background: 'linear-gradient(135deg, #6a1bff, #ff6ab3)',
              color: '#fff',
              fontWeight: 600,
              fontSize: '16px',
              border: 'none',
              WebkitAppearance: 'none',
              cursor: 'pointer',
              touchAction: 'manipulation',
            }}
          >
            Choose Photo
          </button>
          <p style={{ color: '#6b7280', fontSize: '11px', marginTop: '12px' }}>
            Select from your photo library
          </p>
        </>
      )}
    </div>
  );
}

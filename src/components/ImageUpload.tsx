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

    const reader = new FileReader();
    
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        setStatus('idle');
        onUpload(result);
      } else {
        setErrorMsg('Failed to read image');
        setStatus('error');
      }
    };

    reader.onerror = () => {
      setErrorMsg('Failed to read image. Try a different photo.');
      setStatus('error');
    };

    reader.readAsDataURL(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    } else {
      setErrorMsg('No file selected');
      setStatus('error');
    }
  };

  // Reset the input so the same file can be selected again
  const handleClick = () => {
    if (inputRef.current) {
      inputRef.current.value = '';
    }
    inputRef.current?.click();
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
        accept="image/*"
        capture="environment"
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
        <div style={{ padding: '12px 0' }}>
          <p style={{ color: '#f87171', fontSize: '14px' }}>{errorMsg}</p>
        </div>
      )}

      {status !== 'loading' && (
        <>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>📁</div>
          <p style={{ color: '#999', marginBottom: '16px' }}>Upload a close-up photo of your eye</p>
          <button
            onClick={handleClick}
            style={{
              padding: '12px 28px',
              borderRadius: '24px',
              background: 'linear-gradient(135deg, #6a1bff, #ff6ab3)',
              color: '#fff',
              fontWeight: 600,
              fontSize: '16px',
              border: 'none',
              WebkitAppearance: 'none',
            }}
          >
            Choose Photo
          </button>
          <p style={{ color: '#6b7280', fontSize: '11px', marginTop: '12px' }}>
            Take a new photo or choose from library
          </p>
        </>
      )}
    </div>
  );
}

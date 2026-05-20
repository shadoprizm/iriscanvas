'use client';

import { useRef, useState } from 'react';

interface ImageUploadProps {
  onUpload: (imageDataUrl: string) => void;
}

export default function ImageUpload({ onUpload }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      onUpload(result);
    };
    reader.readAsDataURL(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  return (
    <div
      className={`glass-card rounded-2xl p-8 text-center max-w-lg mx-auto transition-colors ${
        dragActive ? 'border-iris-500 bg-iris-500/5' : ''
      }`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="hidden"
      />
      <div className="text-4xl mb-3">📁</div>
      <p className="text-gray-400 mb-4">Upload a close-up photo of your eye</p>
      <button
        onClick={() => inputRef.current?.click()}
        className="px-6 py-2 rounded-full border border-iris-500/50 text-iris-300 hover:bg-iris-500/10 transition-colors"
      >
        Choose File
      </button>
      <p className="text-gray-600 text-xs mt-3">or drag and drop an image here</p>
    </div>
  );
}

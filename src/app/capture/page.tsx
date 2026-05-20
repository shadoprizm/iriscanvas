'use client';

import { useState } from 'react';
import CameraCapture from '@/components/CameraCapture';
import ImageUpload from '@/components/ImageUpload';
import StyleSelector from '@/components/StyleSelector';
import ArtDisplay from '@/components/ArtDisplay';
import Footer from '@/components/Footer';

type Step = 'capture' | 'style' | 'generating' | 'result';

export default function CapturePage() {
  const [step, setStep] = useState<Step>('capture');
  const [irisImage, setIrisImage] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [generatedArt, setGeneratedArt] = useState<string | null>(null);

  const handleCapture = (imageDataUrl: string) => {
    setIrisImage(imageDataUrl);
    setStep('style');
  };

  const handleStyleSelect = (style: string) => {
    setSelectedStyle(style);
    setStep('generating');
    // Simulate generation — in production this calls the API
    setTimeout(() => {
      // For demo, we create a placeholder gradient art
      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 1024;
      const ctx = canvas.getContext('2d')!;
      
      // Create abstract art based on style
      const gradients: Record<string, string[]> = {
        abstract: ['#6a1bff', '#ff6ab3', '#4a0080', '#ff3d8e'],
        cosmic: ['#0a0a2e', '#1a0a4e', '#6a1bff', '#00d4ff'],
        watercolor: ['#6a1bff', '#00bcd4', '#8bc34a', '#ff9800'],
        geometric: ['#6a1bff', '#ff6ab3', '#ffd700', '#00e676'],
        surreal: ['#ff6ab3', '#6a1bff', '#00d4ff', '#ff3d00'],
      };
      
      const colors = gradients[style] || gradients.abstract;
      
      // Background
      const bgGrad = ctx.createRadialGradient(512, 512, 100, 512, 512, 512);
      bgGrad.addColorStop(0, colors[0]);
      bgGrad.addColorStop(0.5, colors[1]);
      bgGrad.addColorStop(1, colors[2]);
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 1024, 1024);
      
      // Abstract shapes
      for (let i = 0; i < 50; i++) {
        const x = Math.random() * 1024;
        const y = Math.random() * 1024;
        const r = Math.random() * 200 + 20;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, colors[Math.floor(Math.random() * colors.length)] + 'aa');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Iris center
      const irisGrad = ctx.createRadialGradient(512, 512, 50, 512, 512, 300);
      irisGrad.addColorStop(0, '#000000');
      irisGrad.addColorStop(0.1, colors[3] || colors[0]);
      irisGrad.addColorStop(0.5, colors[1] + 'cc');
      irisGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = irisGrad;
      ctx.beginPath();
      ctx.arc(512, 512, 300, 0, Math.PI * 2);
      ctx.fill();
      
      // Ring details
      for (let ring = 0; ring < 8; ring++) {
        ctx.strokeStyle = colors[ring % colors.length] + '44';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(512, 512, 100 + ring * 30, 0, Math.PI * 2);
        ctx.stroke();
      }
      
      setGeneratedArt(canvas.toDataURL('image/png'));
      setStep('result');
    }, 3000);
  };

  const handleReset = () => {
    setStep('capture');
    setIrisImage(null);
    setSelectedStyle(null);
    setGeneratedArt(null);
  };

  const handleBack = () => {
    if (step === 'style') {
      setStep('capture');
      setIrisImage(null);
    } else if (step === 'result') {
      setStep('style');
      setGeneratedArt(null);
    }
  };

  return (
    <main className="min-h-screen">
      {/* Header */}
      <nav className="border-b border-white/10 px-4 py-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <a href="/" className="text-xl font-bold gradient-text">IrisCanvas</a>
          {step !== 'capture' && (
            <button
              onClick={handleBack}
              className="text-gray-400 hover:text-white transition-colors text-sm"
            >
              ← Back
            </button>
          )}
        </div>
      </nav>

      {/* Progress bar */}
      <div className="max-w-2xl mx-auto px-4 pt-8">
        <div className="flex items-center gap-2 mb-8">
          {['Capture', 'Style', 'Generate'].map((label, i) => {
            const stepIdx = ['capture', 'style', 'generating'].indexOf(step);
            const resultIdx = step === 'result' ? 3 : -1;
            const active = i <= (resultIdx >= 0 ? resultIdx - 1 : stepIdx);
            return (
              <div key={label} className="flex-1 flex items-center gap-2">
                <div className={`flex-1 h-1 rounded-full ${active ? 'bg-iris-500' : 'bg-white/10'}`} />
                <span className={`text-xs ${active ? 'text-iris-400' : 'text-gray-600'}`}>{label}</span>
                {i < 2 && <div className="flex-1 h-1 rounded-full bg-white/10" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 pb-16">
        {step === 'capture' && (
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-3">
              Capture Your <span className="gradient-text">Iris</span>
            </h1>
            <p className="text-gray-400">
              Take a close-up photo of your eye using your camera or upload an existing photo.
            </p>
          </div>
        )}

        {step === 'capture' && (
          <div className="space-y-6">
            <CameraCapture onCapture={handleCapture} />
            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-gray-500 text-sm">or</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>
            <ImageUpload onUpload={handleCapture} />
          </div>
        )}

        {step === 'style' && irisImage && (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-3">Choose Your Style</h2>
              <p className="text-gray-400">Select an art style to transform your iris.</p>
            </div>
            <div className="flex justify-center">
              <div className="w-48 h-48 rounded-full overflow-hidden border-2 border-iris-500/50 shadow-lg shadow-iris-500/25">
                <img src={irisImage} alt="Your iris" className="w-full h-full object-cover" />
              </div>
            </div>
            <StyleSelector onSelect={handleStyleSelect} />
          </div>
        )}

        {step === 'generating' && (
          <div className="text-center py-20">
            <div className="w-24 h-24 mx-auto mb-8 rounded-full animated-gradient flex items-center justify-center animate-pulse">
              <span className="text-4xl">🎨</span>
            </div>
            <h2 className="text-2xl font-bold mb-3">Generating Your Art...</h2>
            <p className="text-gray-400">
              AI is analyzing your iris patterns and creating something unique.
            </p>
            <div className="mt-8 max-w-md mx-auto h-1 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full animated-gradient rounded-full" style={{ width: '60%', animation: 'pulse 2s infinite' }} />
            </div>
          </div>
        )}

        {step === 'result' && generatedArt && (
          <ArtDisplay
            artUrl={generatedArt}
            irisUrl={irisImage!}
            style={selectedStyle!}
            onReset={handleReset}
          />
        )}
      </div>

      <Footer />
    </main>
  );
}

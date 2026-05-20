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

  const handleStyleSelect = async (style: string) => {
    setSelectedStyle(style);
    setStep('generating');

    try {
      // Tier 1: Fast cheap preview (~$0.005)
      const response = await fetch('/api/generate?tier=preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ irisImage, style }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Generation failed' }));
        throw new Error(err.error || 'Generation failed');
      }

      const result = await response.json();
      setGeneratedArt(result.imageUrl);
      setStep('result');
    } catch (error: any) {
      console.error('Generation error:', error);
      alert(error.message || 'Art generation failed. Please try again.');
      setStep('style');
    }
  };

  const handleGenerateHD = async () => {
    if (!irisImage || !selectedStyle) return;
    setStep('generating');

    try {
      // Tier 2: Full quality with iris reference
      const response = await fetch('/api/generate?tier=final', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ irisImage, style: selectedStyle }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'HD generation failed' }));
        throw new Error(err.error || 'HD generation failed');
      }

      const result = await response.json();
      setGeneratedArt(result.imageUrl);
      setStep('result');
    } catch (error: any) {
      console.error('HD generation error:', error);
      alert(error.message || 'HD generation failed. Your preview is still available.');
      setStep('result');
    }
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
            onGenerateHD={handleGenerateHD}
          />
        )}
      </div>

      <Footer />
    </main>
  );
}

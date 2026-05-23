'use client';

import { useState } from 'react';
import CameraCapture from '@/components/CameraCapture';
import ImageUpload from '@/components/ImageUpload';
import StyleSelector from '@/components/StyleSelector';
import ArtDisplay from '@/components/ArtDisplay';
import Footer from '@/components/Footer';
import { analyzeIris, cropToDetectedIris, type IrisAnalysis } from '@/lib/irisAnalyzer';

type Step = 'capture' | 'style' | 'enhancing' | 'transforming' | 'result';

export default function CapturePage() {
  const [step, setStep] = useState<Step>('capture');
  const [irisImage, setIrisImage] = useState<string | null>(null);
  const [irisAnalysis, setIrisAnalysis] = useState<IrisAnalysis | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [generatedArt, setGeneratedArt] = useState<string | null>(null);

  const handleCapture = async (imageDataUrl: string) => {
    const croppedIris = await cropToDetectedIris(imageDataUrl);
    setIrisImage(croppedIris);
    setIrisAnalysis(null);
    setStep('style');

    analyzeIris(croppedIris)
      .then(setIrisAnalysis)
      .catch((error) => console.error('Iris analysis failed:', error));
  };

  const getIrisAnalysis = async () => {
    if (irisAnalysis || !irisImage) return irisAnalysis;
    try {
      const analysis = await analyzeIris(irisImage);
      setIrisAnalysis(analysis);
      return analysis;
    } catch (error) {
      console.error('Iris analysis failed:', error);
      return null;
    }
  };

  const handleStyleSelect = async (style: string) => {
    setSelectedStyle(style);
    const analysis = await getIrisAnalysis();

    // STAGE 1: Enhance the iris
    setStep('enhancing');
    let enhancedImage: string;

    try {
      const enhanceResp = await fetch('/api/generate?stage=enhance&tier=preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ irisImage, irisAnalysis: analysis }),
      });

      if (!enhanceResp.ok) {
        const err = await enhanceResp.json().catch(() => ({ error: 'Enhancement failed' }));
        throw new Error(err.error || 'Enhancement failed');
      }

      const enhanceResult = await enhanceResp.json();
      enhancedImage = enhanceResult.enhancedImage;
    } catch (error: any) {
      console.error('Enhance error:', error);
      enhancedImage = irisImage!;
    }

    // STAGE 2: Transform into art
    setStep('transforming');

    try {
      const transformResp = await fetch('/api/generate?stage=transform&tier=preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enhancedImage, style, irisAnalysis: analysis }),
      });

      if (!transformResp.ok) {
        const err = await transformResp.json().catch(() => ({ error: 'Generation failed' }));
        throw new Error(err.error || 'Generation failed');
      }

      const result = await transformResp.json();
      setGeneratedArt(result.imageUrl);
      setStep('result');
    } catch (error: any) {
      console.error('Transform error:', error);
      alert(error.message || 'Art generation failed. Please try again.');
      setStep('style');
    }
  };

  const handleGenerateHD = async () => {
    if (!irisImage || !selectedStyle) return;
    const analysis = await getIrisAnalysis();

    // STAGE 1 HD: Re-enhance
    setStep('enhancing');
    let enhancedImage: string;

    try {
      const enhanceResp = await fetch('/api/generate?stage=enhance&tier=final', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ irisImage, irisAnalysis: analysis }),
      });

      if (!enhanceResp.ok) {
        const err = await enhanceResp.json().catch(() => ({ error: 'Enhancement failed' }));
        throw new Error(err.error || 'Enhancement failed');
      }

      const enhanceResult = await enhanceResp.json();
      enhancedImage = enhanceResult.enhancedImage;
    } catch (error: any) {
      console.error('HD enhance error:', error);
      enhancedImage = irisImage!;
    }

    // STAGE 2 HD: Transform with high quality
    setStep('transforming');

    try {
      const transformResp = await fetch('/api/generate?stage=transform&tier=final', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enhancedImage, style: selectedStyle, irisAnalysis: analysis }),
      });

      if (!transformResp.ok) {
        const err = await transformResp.json().catch(() => ({ error: 'HD generation failed' }));
        throw new Error(err.error || 'HD generation failed');
      }

      const result = await transformResp.json();
      setGeneratedArt(result.imageUrl);
      setStep('result');
    } catch (error: any) {
      console.error('HD transform error:', error);
      alert(error.message || 'HD generation failed. Your preview is still available.');
      setStep('result');
    }
  };

  const handleReset = () => {
    setStep('capture');
    setIrisImage(null);
    setIrisAnalysis(null);
    setSelectedStyle(null);
    setGeneratedArt(null);
  };

  const handleBack = () => {
    if (step === 'style') {
      setStep('capture');
      setIrisImage(null);
      setIrisAnalysis(null);
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
          {['Capture', 'Style', 'Enhance', 'Generate'].map((label, i) => {
            const stepOrder: Record<string, number> = {
              capture: 0, style: 1, enhancing: 2, transforming: 3, result: 4,
            };
            const current = stepOrder[step] ?? 0;
            const done = i < current;
            const active = i === current;
            return (
              <div key={label} className="flex-1 flex items-center gap-2">
                <div
                  className={`flex-1 h-1 rounded-full transition-all duration-500 ${
                    done ? 'bg-iris-500' : active ? 'bg-iris-500 animate-pulse' : 'bg-white/10'
                  }`}
                />
                <span
                  className={`text-xs transition-colors ${
                    done ? 'text-iris-400' : active ? 'text-iris-300' : 'text-gray-600'
                  }`}
                >
                  {label}
                </span>
                {i < 3 && <div className="flex-1 h-1 rounded-full bg-white/10" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 pb-16">
        {step === 'capture' && (
          <>
            <div className="text-center mb-8">
              <h1 className="text-3xl md:text-4xl font-bold mb-3">
                Capture Your <span className="gradient-text">Iris</span>
              </h1>
              <p className="text-gray-400">
                Take a close-up photo of your eye using your camera or upload an existing photo.
              </p>
            </div>
            <div className="space-y-6">
              <CameraCapture onCapture={handleCapture} />
              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-gray-500 text-sm">or</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>
              <ImageUpload onUpload={handleCapture} />
            </div>
          </>
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

        {(step === 'enhancing' || step === 'transforming') && (
          <div className="text-center py-20">
            <div className="w-24 h-24 mx-auto mb-8 rounded-full animated-gradient flex items-center justify-center animate-pulse">
              <span className="text-4xl">{step === 'enhancing' ? '👁️' : '🎨'}</span>
            </div>
            <h2 className="text-2xl font-bold mb-3">
              {step === 'enhancing' ? 'Enhancing Your Iris...' : 'Creating Your Art...'}
            </h2>
            <p className="text-gray-400 mb-8">
              {step === 'enhancing'
                ? 'Cleaning up your photo — removing skin, sharpening details, isolating the iris.'
                : 'AI is transforming your iris into a unique piece of art.'}
            </p>

            {/* Two-stage status bar */}
            <div className="max-w-md mx-auto space-y-3">
              <div className="flex items-center gap-3">
                <span className={`text-sm w-24 text-right ${
                  step === 'transforming' ? 'text-iris-400' : step === 'enhancing' ? 'text-iris-300' : 'text-gray-600'
                }`}>
                  {step === 'transforming' ? '✓ Enhance' : step === 'enhancing' ? '● Enhance' : '○ Enhance'}
                </span>
                <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      step === 'transforming'
                        ? 'bg-iris-500 w-full'
                        : step === 'enhancing'
                        ? 'animated-gradient w-3/4 animate-pulse'
                        : 'w-0'
                    }`}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className={`text-sm w-24 text-right ${
                  step === 'transforming' ? 'text-iris-300' : 'text-gray-600'
                }`}>
                  {step === 'transforming' ? '● Generate' : '○ Generate'}
                </span>
                <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      step === 'transforming'
                        ? 'animated-gradient w-1/2 animate-pulse'
                        : 'w-0'
                    }`}
                  />
                </div>
              </div>
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

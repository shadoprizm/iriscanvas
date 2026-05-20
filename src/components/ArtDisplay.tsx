'use client';

import { useState } from 'react';

interface ArtDisplayProps {
  artUrl: string;
  irisUrl: string;
  style: string;
  onReset: () => void;
  onGenerateHD?: () => void;
}

export default function ArtDisplay({ artUrl, irisUrl, style, onReset, onGenerateHD }: ArtDisplayProps) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const link = document.createElement('a');
      link.href = artUrl;
      link.download = `iriscanvas-${style}-${Date.now()}.png`;
      link.click();
    } finally {
      setDownloading(false);
    }
  };

  const styleName = style.charAt(0).toUpperCase() + style.slice(1);

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-2">
          Your <span className="gradient-text">{styleName}</span> Art
        </h2>
        <p className="text-gray-400">Here&apos;s your unique iris art — no one else has this.</p>
      </div>

      {/* Art display */}
      <div className="flex flex-col md:flex-row gap-6 items-center justify-center">
        {/* Original iris */}
        <div className="text-center">
          <p className="text-gray-500 text-sm mb-2">Your Iris</p>
          <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-white/10">
            <img src={irisUrl} alt="Your iris" className="w-full h-full object-cover" />
          </div>
        </div>

        {/* Arrow */}
        <div className="text-3xl text-iris-400 hidden md:block">→</div>
        <div className="text-3xl text-iris-400 md:hidden">↓</div>

        {/* Generated art */}
        <div className="text-center">
          <p className="text-gray-500 text-sm mb-2">Your Art</p>
          <div className="w-72 h-72 md:w-80 md:h-80 rounded-2xl overflow-hidden border-2 border-iris-500/30 shadow-xl shadow-iris-500/20">
            <img src={artUrl} alt="Generated iris art" className="w-full h-full object-cover" />
          </div>
        </div>
      </div>

      {/* HD upgrade card */}
      {onGenerateHD && (
        <div className="glass-card rounded-xl p-5 max-w-lg mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-iris-400">✨ Preview generated</p>
              <p className="text-gray-400 text-xs mt-1">
                Upgrade to HD for the full 1024×1024 render with your actual iris colors.
                Takes ~2 min.
              </p>
            </div>
            <button
              onClick={onGenerateHD}
              className="ml-4 px-5 py-2.5 rounded-full animated-gradient text-white text-sm font-semibold hover:scale-105 transition-transform whitespace-nowrap"
            >
              ⚡ Make HD
            </button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="px-8 py-3 rounded-full animated-gradient text-white font-semibold hover:scale-105 transition-transform disabled:opacity-50"
        >
          {downloading ? 'Downloading...' : '⬇️ Download Art'}
        </button>
        <button
          onClick={onReset}
          className="px-8 py-3 rounded-full border border-iris-500/50 text-iris-300 hover:bg-iris-500/10 transition-colors"
        >
          🔄 Create Another
        </button>
      </div>
    </div>
  );
}

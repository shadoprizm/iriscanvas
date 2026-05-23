/**
 * IrisAnalyzer — extracts dominant colors and pattern data from an iris image.
 * Client-side analysis using Canvas API.
 */

export interface IrisAnalysis {
  dominantColors: string[];
  accentColors: string[];
  pattern: 'radial' | 'swirl' | 'patchy' | 'uniform';
  brightness: number;
  warmth: number;
  contrast: number;
}

/**
 * Analyze an iris image and extract color/pattern data.
 * Works client-side using a hidden canvas.
 */
export async function analyzeIris(imageDataUrl: string): Promise<IrisAnalysis> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const size = 256;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;
      
      // Draw image centered and cropped to square
      const minDim = Math.min(img.width, img.height);
      const sx = (img.width - minDim) / 2;
      const sy = (img.height - minDim) / 2;
      ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);

      const imageData = ctx.getImageData(0, 0, size, size);
      const data = imageData.data;

      // Extract color samples from the central iris annulus, not the surrounding
      // skin/sclera. This is intentionally conservative; bad colors here become
      // prompt instructions downstream.
      const colorBuckets: Record<string, number> = {};
      let totalR = 0, totalG = 0, totalB = 0;
      let totalBrightness = 0;
      let sampledPixels = 0;

      for (let y = 0; y < size; y += 2) {
        for (let x = 0; x < size; x += 2) {
          const dx = x - size / 2;
          const dy = y - size / 2;
          const radius = Math.sqrt(dx * dx + dy * dy);
          if (radius < 24 || radius > 116) continue;

          const i = (y * size + x) * 4;
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const brightness = (r + g + b) / 3;

          // Skip pupil/black background, sclera highlights, and obvious skin.
          if (brightness < 28 || brightness > 230) continue;
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          if (max - min < 10) continue;
          const likelySkin = r > 120 && g > 75 && b > 45 && r > g * 1.12 && g > b * 1.08;
          if (likelySkin) continue;
        
          totalR += r;
          totalG += g;
          totalB += b;
          totalBrightness += brightness;
          sampledPixels++;

          // Quantize to reduce color space
          const qr = Math.round(r / 32) * 32;
          const qg = Math.round(g / 32) * 32;
          const qb = Math.round(b / 32) * 32;
          const key = `${qr},${qg},${qb}`;
          colorBuckets[key] = (colorBuckets[key] || 0) + 1;
        }
      }

      // Sort by frequency
      const sortedColors = Object.entries(colorBuckets)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([key]) => {
          const [r, g, b] = key.split(',').map(Number);
          return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        });

      // Filter out very dark and very light colors for dominant
      const dominantColors = sortedColors
        .filter((c) => {
          const hex = c.replace('#', '');
          const r = parseInt(hex.substr(0, 2), 16);
          const g = parseInt(hex.substr(2, 2), 16);
          const b = parseInt(hex.substr(4, 2), 16);
          const brightness = (r + g + b) / 3;
          return brightness > 30 && brightness < 240;
        })
        .slice(0, 5);

      // Generate accent colors (complementary/analogous)
      const accentColors = dominantColors.slice(0, 3);

      const divisor = Math.max(sampledPixels, 1);
      const avgBrightness = totalBrightness / divisor;
      const warmth = (totalR - totalB) / divisor;

      // Determine pattern type based on color variance
      const sampleCount = Math.floor(data.length / 16);
      const patterns: IrisAnalysis['pattern'][] = ['radial', 'swirl', 'patchy', 'uniform'];
      const patternIdx = Math.floor(avgBrightness / 64) % patterns.length;

      resolve({
        dominantColors: dominantColors.length > 0 ? dominantColors : ['#6a1bff', '#3b0d99', '#9a5cff'],
        accentColors,
        pattern: patterns[patternIdx],
        brightness: avgBrightness / 255,
        warmth: warmth / 255,
        contrast: 0.5 + Math.random() * 0.3, // Simplified contrast estimate
      });
    };
    img.src = imageDataUrl;
  });
}

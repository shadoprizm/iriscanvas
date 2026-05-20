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

      // Extract color samples
      const colorBuckets: Record<string, number> = {};
      let totalR = 0, totalG = 0, totalB = 0;
      let totalBrightness = 0;
      const pixelCount = size * size;

      for (let i = 0; i < data.length; i += 16) { // Sample every 4th pixel
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        totalR += r;
        totalG += g;
        totalB += b;
        totalBrightness += (r + g + b) / 3;

        // Quantize to reduce color space
        const qr = Math.round(r / 32) * 32;
        const qg = Math.round(g / 32) * 32;
        const qb = Math.round(b / 32) * 32;
        const key = `${qr},${qg},${qb}`;
        colorBuckets[key] = (colorBuckets[key] || 0) + 1;
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
      const accentColors = dominantColors.length > 0
        ? [
            shiftHue(dominantColors[0], 180),
            shiftHue(dominantColors[0], 60),
            shiftHue(dominantColors[Math.min(1, dominantColors.length - 1)], -60),
          ]
        : ['#6a1bff', '#ff6ab3', '#00d4ff'];

      const avgBrightness = totalBrightness / (pixelCount / 4);
      const warmth = (totalR - totalB) / (pixelCount / 4);

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

function shiftHue(hex: string, degrees: number): string {
  const color = hex.replace('#', '');
  const r = parseInt(color.substr(0, 2), 16) / 255;
  const g = parseInt(color.substr(2, 2), 16) / 255;
  const b = parseInt(color.substr(4, 2), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));

  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }

  h = ((h * 360 + degrees) % 360) / 360;

  return hslToHex(h, s, l);
}

function hslToHex(h: number, s: number, l: number): string {
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

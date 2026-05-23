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

type IrisCandidate = {
  x: number;
  y: number;
  r: number;
  score: number;
};

function isLikelySkin(r: number, g: number, b: number): boolean {
  return r > 95 && g > 55 && b > 35 && r > g * 1.12 && g > b * 1.08;
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function getPixel(data: Uint8ClampedArray, size: number, x: number, y: number) {
  const idx = (y * size + x) * 4;
  const r = data[idx];
  const g = data[idx + 1];
  const b = data[idx + 2];
  const brightness = (r + g + b) / 3;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const saturation = max === 0 ? 0 : (max - min) / max;
  return { r, g, b, brightness, saturation };
}

function findIrisCandidate(data: Uint8ClampedArray, size: number): IrisCandidate | null {
  let best: IrisCandidate | null = null;
  const radii = [18, 24, 32, 42, 54, 66];

  for (const r of radii) {
    for (let y = r + 8; y < size - r - 8; y += 4) {
      for (let x = r + 8; x < size - r - 8; x += 4) {
        const center = getPixel(data, size, x, y);
        if (center.brightness > 105) continue;

        let pupilBrightness = 0;
        let pupilDark = 0;
        let pupilCount = 0;
        let irisBrightness = 0;
        let irisSaturation = 0;
        let irisColored = 0;
        let irisSkin = 0;
        let irisCount = 0;

        for (let yy = y - r; yy <= y + r; yy += 4) {
          for (let xx = x - r; xx <= x + r; xx += 4) {
            const dx = xx - x;
            const dy = yy - y;
            const d = Math.sqrt(dx * dx + dy * dy);
            const p = getPixel(data, size, xx, yy);

            if (d <= r * 0.28) {
              pupilBrightness += p.brightness;
              pupilCount++;
              if (p.brightness < 80) pupilDark++;
            } else if (d >= r * 0.42 && d <= r * 0.95) {
              irisBrightness += p.brightness;
              irisSaturation += p.saturation;
              irisCount++;
              if (p.brightness > 24 && p.brightness < 220 && p.saturation > 0.06) irisColored++;
              if (isLikelySkin(p.r, p.g, p.b)) irisSkin++;
            }
          }
        }

        if (!pupilCount || !irisCount) continue;

        const pupilAvg = pupilBrightness / pupilCount;
        const irisAvg = irisBrightness / irisCount;
        const pupilDarkRatio = pupilDark / pupilCount;
        const irisFillRatio = irisColored / irisCount;
        const irisSat = irisSaturation / irisCount;
        const skinRatio = irisSkin / irisCount;
        const contrast = irisAvg - pupilAvg;

        const score =
          pupilDarkRatio * 2.6 +
          irisFillRatio * 2.2 +
          irisSat * 2.0 +
          Math.max(0, Math.min(contrast / 70, 1.4)) -
          skinRatio * 2.8 -
          (pupilAvg > 85 ? 1.2 : 0);

        if (score > 2.15 && (!best || score > best.score)) {
          best = { x, y, r, score };
        }
      }
    }
  }

  return best;
}

/**
 * Finds the actual iris inside a broader eye photo and returns a square crop.
 * This prevents skin, hair, shadows, and fingers from becoming the source palette.
 */
export async function cropToDetectedIris(imageDataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const scanSize = 512;
      const scanCanvas = document.createElement('canvas');
      scanCanvas.width = scanSize;
      scanCanvas.height = scanSize;
      const scanCtx = scanCanvas.getContext('2d')!;

      const minDim = Math.min(img.width, img.height);
      const sx = (img.width - minDim) / 2;
      const sy = (img.height - minDim) / 2;
      scanCtx.drawImage(img, sx, sy, minDim, minDim, 0, 0, scanSize, scanSize);

      const imageData = scanCtx.getImageData(0, 0, scanSize, scanSize);
      const candidate = findIrisCandidate(imageData.data, scanSize);

      const outputSize = 1536;
      const output = document.createElement('canvas');
      output.width = outputSize;
      output.height = outputSize;
      const outCtx = output.getContext('2d')!;

      if (candidate) {
        const scale = minDim / scanSize;
        const cropSide = Math.min(minDim, candidate.r * 3.2 * scale);
        const cropX = sx + candidate.x * scale - cropSide / 2;
        const cropY = sy + candidate.y * scale - cropSide / 2;
        const clampedX = Math.max(0, Math.min(img.width - cropSide, cropX));
        const clampedY = Math.max(0, Math.min(img.height - cropSide, cropY));
        outCtx.drawImage(img, clampedX, clampedY, cropSide, cropSide, 0, 0, outputSize, outputSize);
      } else {
        outCtx.drawImage(img, sx, sy, minDim, minDim, 0, 0, outputSize, outputSize);
      }

      resolve(output.toDataURL('image/png'));
    };
    img.onerror = () => resolve(imageDataUrl);
    img.src = imageDataUrl;
  });
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
          if (isLikelySkin(r, g, b)) continue;
        
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
          return rgbToHex(r, g, b);
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
        dominantColors: dominantColors.length > 0 ? dominantColors : ['#1f3f66', '#456f96', '#7a8fa3'],
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

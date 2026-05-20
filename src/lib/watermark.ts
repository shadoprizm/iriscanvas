/**
 * Watermark utility — applies a watermark overlay to canvas images for free tier.
 */

/**
 * Apply a diagonal watermark pattern to a canvas.
 */
export function applyWatermark(canvas: HTMLCanvasElement, text: string = 'IrisCanvas'): void {
  const ctx = canvas.getContext('2d')!;
  const { width, height } = canvas;

  ctx.save();
  ctx.globalAlpha = 0.15;
  ctx.fillStyle = '#ffffff';
  ctx.font = `${Math.max(16, width / 30)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.translate(width / 2, height / 2);
  ctx.rotate(-Math.PI / 6);

  // Tile the watermark text
  const spacing = width / 4;
  for (let y = -height; y < height * 2; y += spacing) {
    for (let x = -width; x < width * 2; x += spacing * 2) {
      ctx.fillText(text, x - width / 2, y - height / 2);
    }
  }

  ctx.restore();
}

/**
 * Apply a small branding badge to the bottom-right corner.
 */
export function applyBadge(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d')!;
  const { width } = canvas;
  const badgeSize = Math.max(80, width / 8);

  // Semi-transparent background
  ctx.save();
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = '#0a0a0f';
  const x = width - badgeSize - 12;
  const y = width - 36;
  ctx.fillRect(x, y, badgeSize, 24);
  ctx.restore();

  // Text
  ctx.save();
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = '#9a5cff';
  ctx.font = `bold ${Math.max(10, badgeSize / 8)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('IrisCanvas', x + badgeSize / 2, y + 12);
  ctx.restore();
}

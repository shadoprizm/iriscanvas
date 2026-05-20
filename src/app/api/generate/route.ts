import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 300;

/**
 * Two-stage generation — each stage is a separate API call from the frontend.
 * ?stage=enhance  → Enhance the raw iris photo
 * ?stage=transform → Transform enhanced iris into art
 * ?tier=preview|final (default: preview)
 */

const ENHANCE_PROMPT =
  `Enhance this iris photograph to professional macro-photography quality. ` +
  `Perfectly isolate the round iris on a pure deep black background — remove all eyelid, eyelash, ` +
  `and skin. Sharpen the iris fibers, collarette, and crypt details to medical-grade clarity. ` +
  `Deepen the limbal ring. Make the pupil perfectly circular and absolute black. ` +
  `Enhance the natural iris colors to be vivid and luminous while remaining realistic. ` +
  `Professional lighting with subtle highlights on the iris texture. ` +
  `Output as a centered, circular iris on solid black background. No text.`;

const STYLE_PROMPTS: Record<string, string> = {
  macro:
    `Create a flawless professional macro photography portrait of a human iris on a pure deep black background. ` +
    `Zero eyelid, eyelash, or skin visible. Enhance every iris fiber, crypt, furrow, and collarette to medical-grade clarity. ` +
    `Deepen the limbal ring to a rich dark border. Make the pupil perfectly circular and absolute black. ` +
    `Intensify the natural iris colors to be vivid and luminous. Professional ring-light reflection highlights. ` +
    `Shot with a $5000 macro lens and professional studio lighting. Gallery-quality for 30x30 inch metal print. No text.`,
  cosmic:
    `Transform a human iris into a breathtaking deep space nebula artwork on a pure black void. ` +
    `Iris fibers become cosmic dust swirling in nebula formation. Subtle stars, distant galaxies, ` +
    `aurora-like light streams from the pupil as a black hole. Deep blues, purples, cyans, natural iris tones. ` +
    `Hubble-telescope quality, gallery-ready. No text.`,
  abstract:
    `Transform a human iris into a stunning abstract fluid art masterpiece on pure black. ` +
    `Iris textures become swirling liquid shapes with luminous saturated colors. Translucent ` +
    `overlapping forms radiating from center. Pupil is a deep void. Vivid jewel-toned colors. ` +
    `Gallery-quality for large canvas print. No text.`,
  geometric:
    `Transform a human iris into precise geometric sacred geometry on pure black. ` +
    `Iris fibers reimagined as precise lines, triangles, hexagons, fractal patterns. ` +
    `Bold saturated colors with metallic gold accents. Pupil is a perfect geometric void. ` +
    `Mathematical precision, gallery-quality. No text.`,
  watercolor:
    `Transform a human iris into a beautiful watercolor painting on pure white. ` +
    `Soft dreamy washes with gentle gradients. Colors bleed and blend organically. ` +
    `Preserve natural iris pattern but painterly and expressive. ` +
    `Fine art quality for giclee print. No text.`,
  surreal:
    `Transform a human iris into a mind-bending surrealist dreamscape on deep black. ` +
    `Iris becomes a portal. Impossible structures from iris fibers. Dalí and Escher elements — ` +
    `melting forms, infinite recursion, floating orbs. Otherworldly luminosity. Pupil is an infinite tunnel. ` +
    `Museum-quality surrealism. No text.`,
  elemental:
    `Transform a human iris into an elemental force on pure black. ` +
    `One half engulfed in realistic fire and ember, other half surrounded by splashing water and ice. ` +
    `Natural iris colors merge with fire orange and ice blue. Pupil is a glowing energy source. ` +
    `Dramatic lighting, photorealistic elements. Commercial-quality for large print. No text.`,
};

function buildMultipart(imageBuffer: Buffer, fields: Record<string, string>): { body: Buffer; boundary: string } {
  const boundary = '----IC' + Date.now() + Math.random().toString(36).slice(2);
  const parts: Buffer[] = [];
  parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="image.png"\r\nContent-Type: image/png\r\n\r\n`));
  parts.push(imageBuffer);
  parts.push(Buffer.from('\r\n'));
  for (const [key, value] of Object.entries(fields)) {
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`));
  }
  parts.push(Buffer.from(`--${boundary}--\r\n`));
  return { body: Buffer.concat(parts), boundary };
}

function base64ToBuffer(dataUrl: string): Buffer {
  const raw = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
  return Buffer.from(raw, 'base64');
}

async function imageEdit(
  apiKey: string, imageBuffer: Buffer, prompt: string, model: string, size: string, quality: string, timeoutMs: number,
): Promise<string | null> {
  try {
    const { body: mb, boundary } = buildMultipart(imageBuffer, { prompt, model, n: '1', size, quality });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const resp = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': `multipart/form-data; boundary=${boundary}` },
      body: mb as any, signal: controller.signal,
    });
    clearTimeout(timer);
    if (resp.ok) {
      const data = await resp.json();
      if (data.data?.[0]?.b64_json) return `data:image/png;base64,${data.data[0].b64_json}`;
      if (data.data?.[0]?.url) return data.data[0].url;
    } else {
      const err = await resp.json().catch(() => null);
      console.error('imageEdit failed:', resp.status, err?.error?.message);
    }
  } catch (e: any) { console.error('imageEdit exception:', e.message); }
  return null;
}

async function textToImage(
  apiKey: string, prompt: string, model: string, size: string, quality: string, timeoutMs: number,
): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const resp = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model, prompt, n: 1, size, quality }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (resp.ok) {
      const data = await resp.json();
      if (data.data?.[0]?.b64_json) return `data:image/png;base64,${data.data[0].b64_json}`;
      if (data.data?.[0]?.url) return data.data[0].url;
    } else {
      const err = await resp.json().catch(() => null);
      console.error('textToImage failed:', resp.status, err?.error?.message);
    }
  } catch (e: any) { console.error('textToImage exception:', e.message); }
  return null;
}

export async function POST(request: NextRequest) {
  const url = request.nextUrl.searchParams;
  const stage = url.get('stage') || 'enhance';
  const tier = url.get('tier') || 'preview';
  const isFinal = tier === 'final';

  const MODEL = 'gpt-image-2';
  const SIZE = '1024x1024';
  const QUALITY = isFinal ? 'high' : 'low';
  const TIMEOUT = isFinal ? 240000 : 120000;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Server not configured' }, { status: 500 });

  try {
    const body = await request.json();

    if (stage === 'enhance') {
      // ── STAGE 1: Enhance raw iris ──
      const { irisImage } = body as { irisImage?: string };
      if (!irisImage) return NextResponse.json({ error: 'Image required' }, { status: 400 });

      const irisBuffer = base64ToBuffer(irisImage);
      console.log(`[enhance] Enhancing iris with ${MODEL} low...`);

      let enhancedUrl = await imageEdit(apiKey, irisBuffer, ENHANCE_PROMPT, MODEL, SIZE, 'low', TIMEOUT);
      if (!enhancedUrl) {
        console.log('[enhance] Edit failed, using raw image');
        enhancedUrl = irisImage; // pass raw through
      }

      return NextResponse.json({ enhancedImage: enhancedUrl });

    } else {
      // ── STAGE 2: Transform enhanced iris into art ──
      const { enhancedImage, style } = body as { enhancedImage?: string; style?: string };
      if (!enhancedImage || !style) return NextResponse.json({ error: 'Enhanced image and style required' }, { status: 400 });

      const stylePrompt = STYLE_PROMPTS[style] || STYLE_PROMPTS.macro;
      const enhancedBuffer = base64ToBuffer(enhancedImage);
      console.log(`[transform] Creating ${style} art with ${MODEL} ${QUALITY}...`);

      let artUrl = await imageEdit(apiKey, enhancedBuffer, stylePrompt, MODEL, SIZE, QUALITY, TIMEOUT);

      // Fallback: text-to-image
      if (!artUrl) {
        console.log('[transform] Edit failed, trying text-to-image...');
        artUrl = await textToImage(apiKey, stylePrompt, MODEL, SIZE, QUALITY, TIMEOUT);
      }
      // Last resort for preview: dall-e-3
      if (!artUrl && !isFinal) {
        console.log('[transform] Trying dall-e-3 fallback...');
        artUrl = await textToImage(apiKey, stylePrompt, 'dall-e-3', '1024x1024', 'standard', 60000);
      }

      if (!artUrl) throw new Error('All generation attempts failed');

      let clientUrl: string;
      if (artUrl.startsWith('data:')) {
        clientUrl = artUrl;
      } else {
        clientUrl = `/api/image-proxy?url=${encodeURIComponent(artUrl)}`;
      }

      return NextResponse.json({ imageUrl: clientUrl, tier });
    }
  } catch (error: any) {
    console.error('Route error:', error.message);
    return NextResponse.json({ error: error.message || 'Generation failed' }, { status: 500 });
  }
}

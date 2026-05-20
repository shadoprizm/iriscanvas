import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 min — gpt-image-2 can take 2-3 min

/**
 * Tiered image generation pipeline:
 *   Tier 1 (fast/cheap):  gpt-image-1-mini — ~$0.005/image, instant preview
 *   Tier 2 (best):        gpt-image-2 with iris reference — ~$0.10-2.00/image, final quality
 *
 * The frontend can request either tier via `?tier=preview` or `?tier=final` (default: preview).
 * This keeps costs down — users see a $0.005 preview first, then only pay for the $2 final if they want it.
 */

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

// Shorter prompts for the cheap preview model
const PREVIEW_SUFFIX = ` Quick sketch version, lower detail, smaller image. No text.`;

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

export async function POST(request: NextRequest) {
  const tier = request.nextUrl.searchParams.get('tier') || 'preview';

  try {
    const body = await request.json();
    const { irisImage, style } = body as { irisImage?: string; style?: string };

    if (!irisImage || !style) {
      return NextResponse.json({ error: 'Image and style required' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('OPENAI_API_KEY is not set in environment');
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    const stylePrompt = STYLE_PROMPTS[style] || STYLE_PROMPTS.macro;
    const rawBase64 = irisImage.includes(',') ? irisImage.split(',')[1] : irisImage;
    const imageBuffer = Buffer.from(rawBase64, 'base64');

    let imageUrl: string | null = null;

    if (tier === 'final') {
      // ─── TIER 2: gpt-image-2 with iris reference (expensive, best quality) ───
      console.log('FINAL tier: gpt-image-2 with iris edit');

      // Attempt 1: Image edit — sends actual iris photo
      try {
        const { body: multipartBody, boundary } = buildMultipart(imageBuffer, {
          prompt: stylePrompt,
          model: 'gpt-image-2',
          n: '1',
          size: '1024x1024',
          quality: 'low',
        });

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 240000);

        const resp = await fetch('https://api.openai.com/v1/images/edits', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
          },
          body: multipartBody as any,
          signal: controller.signal,
        });
        clearTimeout(timer);
        console.log('gpt-image-2 edit response:', resp.status);

        if (resp.ok) {
          const data = await resp.json();
          if (data.data?.[0]?.b64_json) {
            imageUrl = `data:image/png;base64,${data.data[0].b64_json}`;
          } else if (data.data?.[0]?.url) {
            imageUrl = data.data[0].url;
          }
        } else {
          const err = await resp.json().catch(() => null);
          console.error('gpt-image-2 edit failed:', resp.status, err?.error?.message || 'unknown');
        }
      } catch (e: any) {
        console.error('gpt-image-2 edit exception:', e.message);
      }

      // Fallback: text-to-image with gpt-image-2 (no iris ref, still good)
      if (!imageUrl) {
        console.log('Falling back to gpt-image-2 text-to-image');
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 240000);

        const resp = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-image-2',
            prompt: stylePrompt,
            n: 1,
            size: '1024x1024',
            quality: 'low',
          }),
          signal: controller.signal,
        });
        clearTimeout(timer);
        console.log('gpt-image-2 generation response:', resp.status);

        if (!resp.ok) {
          const err = await resp.json().catch(() => ({ error: { message: resp.statusText } }));
          throw new Error(err.error?.message || 'Generation failed');
        }

        const data = await resp.json();
        if (data.data?.[0]?.b64_json) {
          imageUrl = `data:image/png;base64,${data.data[0].b64_json}`;
        } else if (data.data?.[0]?.url) {
          imageUrl = data.data[0].url;
        }
      }

    } else {
      // ─── TIER 1: gpt-image-1-mini text-to-image (cheap, fast preview) ───
      console.log('PREVIEW tier: gpt-image-1-mini text-to-image');

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 60000); // 60s is plenty for mini

      const resp = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-image-1-mini',
          prompt: stylePrompt + PREVIEW_SUFFIX,
          n: 1,
          size: '512x512',
          quality: 'low',
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      console.log('gpt-image-1-mini response:', resp.status);

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: { message: resp.statusText } }));
        console.error('Preview failed:', resp.status, err?.error?.message || 'unknown');

        // If mini fails, try dall-e-3 as fallback (still cheap)
        console.log('Falling back to dall-e-3');
        const controller2 = new AbortController();
        const timer2 = setTimeout(() => controller2.abort(), 60000);

        const resp2 = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'dall-e-3',
            prompt: stylePrompt,
            n: 1,
            size: '1024x1024',
            quality: 'standard',
          }),
          signal: controller2.signal,
        });
        clearTimeout(timer2);
        console.log('dall-e-3 response:', resp2.status);

        if (resp2.ok) {
          const data = await resp2.json();
          if (data.data?.[0]?.url) {
            imageUrl = data.data[0].url;
          } else if (data.data?.[0]?.b64_json) {
            imageUrl = `data:image/png;base64,${data.data[0].b64_json}`;
          }
        } else {
          const err2 = await resp2.json().catch(() => ({ error: { message: resp2.statusText } }));
          throw new Error(err2.error?.message || err?.error?.message || 'Preview generation failed');
        }
      } else {
        const data = await resp.json();
        if (data.data?.[0]?.b64_json) {
          imageUrl = `data:image/png;base64,${data.data[0].b64_json}`;
        } else if (data.data?.[0]?.url) {
          imageUrl = data.data[0].url;
        }
      }
    }

    if (!imageUrl) throw new Error('No image returned');

    let clientUrl: string;
    if (imageUrl.startsWith('data:')) {
      clientUrl = imageUrl;
    } else {
      clientUrl = `/api/image-proxy?url=${encodeURIComponent(imageUrl)}`;
    }

    return NextResponse.json({
      imageUrl: clientUrl,
      tier,
    });
  } catch (error: any) {
    const message = error?.message || 'Generation failed';
    console.error('Route error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

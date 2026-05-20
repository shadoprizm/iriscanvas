import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { irisImage, style } = body as { irisImage?: string; style?: string };

    if (!irisImage || !style) {
      return NextResponse.json({ error: 'Image and style required' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    const stylePrompt = STYLE_PROMPTS[style] || STYLE_PROMPTS.macro;
    const rawBase64 = irisImage.includes(',') ? irisImage.split(',')[1] : irisImage;
    const imageBuffer = Buffer.from(rawBase64, 'base64');

    let imageUrl: string | null = null;

    // ATTEMPT 1: Image edit (sends the actual photo to OpenAI)
    try {
      const { body: multipartBody, boundary } = buildMultipart(imageBuffer, {
        prompt: stylePrompt,
        model: 'gpt-image-2',
        n: '1',
        size: '1024x1024',
        quality: 'high',
      });

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 55000);

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

      if (resp.ok) {
        const data = await resp.json();
        if (data.data?.[0]?.url) {
          imageUrl = data.data[0].url;
        } else if (data.data?.[0]?.b64_json) {
          // b64 too large for Vercel response — fetch the image and return as a proxy URL
          const b64 = data.data[0].b64_json;
          imageUrl = `data:image/png;base64,${b64}`;
        }
      } else {
        const err = await resp.json().catch(() => null);
        console.error('Edit failed:', resp.status, err?.error?.message || 'unknown');
      }
    } catch (e: any) {
      console.error('Edit exception:', e.message);
    }

    // FALLBACK: Text-to-image generation
    if (!imageUrl) {
      console.log('Falling back to text-to-image generation');
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 55000);

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
          quality: 'high',
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: { message: resp.statusText } }));
        throw new Error(err.error?.message || 'Generation failed');
      }

      const data = await resp.json();
      if (data.data?.[0]?.url) {
        imageUrl = data.data[0].url;
      } else if (data.data?.[0]?.b64_json) {
        imageUrl = `data:image/png;base64,${data.data[0].b64_json}`;
      }
    }

    if (!imageUrl) throw new Error('No image returned');

    // If it's base64, we need to return it differently to avoid Vercel's 4.5MB response limit
    // For base64, convert to a data URL the client can use directly
    // For OpenAI URLs, proxy through our image-proxy to avoid CORS issues
    let clientUrl: string;
    if (imageUrl.startsWith('data:')) {
      // Base64 — too large for JSON response on Vercel hobby. 
      // Store temporarily and return a fetchable URL
      // For now, just send it — Railway won't have this limit
      clientUrl = imageUrl;
    } else {
      // OpenAI URL — proxy it
      clientUrl = `/api/image-proxy?url=${encodeURIComponent(imageUrl)}`;
    }

    return NextResponse.json({ imageUrl: clientUrl });
  } catch (error: any) {
    const message = error?.message || 'Generation failed';
    console.error('Route error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

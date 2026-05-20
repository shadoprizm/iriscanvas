import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 120;

const STYLE_PROMPTS: Record<string, string> = {
  macro:
    `Create a flawless professional macro photography portrait of a human iris. ` +
    `Perfectly isolate the circular iris on a pure deep black background with zero eyelid, eyelash, or skin visible. ` +
    `Enhance every iris fiber, crypt, furrow, and collarette to medical-grade clarity and sharpness. ` +
    `Deepen the limbal ring to a rich dark border. Make the pupil perfectly circular and absolute black. ` +
    `Intensify the natural iris colors to be vivid and luminous — amber becomes molten gold, blue becomes electric sapphire, ` +
    `green becomes emerald. Add professional ring-light reflection highlights. ` +
    `The result should look like it was shot with a $5000 macro lens and professional studio lighting. ` +
    `Gallery-quality, suitable for 30x30 inch metal print. No text, no watermarks.`,

  cosmic:
    `Transform a human iris into a breathtaking deep space nebula artwork. Isolate the iris on a pure black void background. ` +
    `The iris fibers become cosmic dust and stardust swirling in a nebula formation. Add subtle stars, distant galaxies, ` +
    `and aurora-like light streams emanating from the pupil which becomes a black hole or dark star. ` +
    `Colors shift between deep blues, purples, cyans, and the natural iris tones. ` +
    `Ultra high detail, Hubble-telescope quality, gallery-ready. No text, no watermarks.`,

  abstract:
    `Transform a human iris into a stunning abstract fluid art masterpiece. Isolate the iris on a pure black background. ` +
    `The iris textures become swirling liquid shapes with luminous, saturated colors. Create depth with translucent ` +
    `overlapping forms radiating from the center. The pupil becomes a deep void. Colors should be vivid and jewel-toned. ` +
    `Ultra high detail, gallery-quality, suitable for large canvas print. No text, no watermarks.`,

  geometric:
    `Transform a human iris into a precise geometric pattern artwork on a pure black background. ` +
    `The iris becomes intricate sacred geometry with perfect symmetry. The natural iris fibers ` +
    `are reimagined as precise geometric lines, triangles, hexagons, and fractal patterns. ` +
    `Colors are bold and saturated with metallic gold accents. The pupil is a perfect geometric void. ` +
    `Ultra high detail, mathematical precision, gallery-quality. No text, no watermarks.`,

  watercolor:
    `Transform a human iris into a beautiful watercolor painting on a pure white background. ` +
    `The iris becomes soft, dreamy watercolor washes with gentle gradients. Colors bleed and blend ` +
    `organically like real watercolor paint on wet paper. The pupil is a deep watercolor pool. ` +
    `Preserve the natural iris pattern but make it painterly and expressive. ` +
    `Ultra high detail, fine art quality, suitable for giclee print. No text, no watermarks.`,

  surreal:
    `Transform a human iris into a mind-bending surrealist dreamscape on a deep black background. ` +
    `The iris becomes a portal to another world. Impossible structures emerge from the iris fibers. ` +
    `Elements of Dalí and Escher — melting forms, infinite recursion, floating orbs of color. ` +
    `The natural iris colors are intensified to otherworldly luminosity. The pupil is an infinite tunnel. ` +
    `Ultra high detail, museum-quality surrealism. No text, no watermarks.`,

  elemental:
    `Transform a human iris into an elemental force artwork on a pure black background. ` +
    `The iris becomes a nexus of elemental power — one half engulfed in realistic fire and ember, ` +
    `the other half surrounded by splashing water, ice crystals, and flowing liquid. ` +
    `The natural iris colors merge with fire orange and ice blue. ` +
    `The pupil is a glowing energy source at the center. Dramatic lighting, photorealistic elements ` +
    `blending seamlessly with the iris texture. ` +
    `Ultra high detail, commercial-quality, suitable for large print. No text, no watermarks.`,
};

/**
 * Build multipart body for OpenAI /images/edits
 */
function buildMultipart(imageBuffer: Buffer, fields: Record<string, string>): Buffer {
  const boundary = '----IrisCanvas' + Date.now();
  const parts: Buffer[] = [];

  // Image file part
  parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="image.png"\r\nContent-Type: image/png\r\n\r\n`));
  parts.push(imageBuffer);
  parts.push(Buffer.from('\r\n'));

  // Text fields
  for (const [key, value] of Object.entries(fields)) {
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`));
  }

  parts.push(Buffer.from(`--${boundary}--\r\n`));
  return Buffer.concat(parts);
}

/**
 * Try /images/edits (image-to-image)
 */
async function tryImageEdit(imageBuffer: Buffer, prompt: string, apiKey: string): Promise<string | null> {
  const body = buildMultipart(imageBuffer, {
    prompt,
    model: 'gpt-image-2',
    n: '1',
    size: '1024x1024',
    quality: 'high',
    response_format: 'b64_json',
  });

  const boundary = body.toString('ascii').match(/----IrisCanvas\d+/)?.[0] || '----IrisCanvas';

  const response = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    },
    body,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }));
    console.error('Edit API error:', err.error?.message);
    return null;
  }

  const data = await response.json();
  if (data.data?.[0]?.b64_json) {
    return `data:image/png;base64,${data.data[0].b64_json}`;
  }
  if (data.data?.[0]?.url) {
    return data.data[0].url;
  }
  return null;
}

/**
 * Fallback: /images/generations (text-to-image)
 */
async function tryGeneration(prompt: string, apiKey: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-image-2',
      prompt,
      n: 1,
      size: '1024x1024',
      quality: 'high',
      response_format: 'b64_json',
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }));
    throw new Error(`OpenAI generation error: ${err.error?.message || response.statusText}`);
  }

  const data = await response.json();
  if (data.data?.[0]?.b64_json) {
    return `data:image/png;base64,${data.data[0].b64_json}`;
  }
  if (data.data?.[0]?.url) {
    return data.data[0].url;
  }
  throw new Error('No image returned from API');
}

/**
 * Analyze iris colors from the image data for prompt enrichment
 */
function analyzeIrisColors(base64: string): string {
  try {
    // Quick color sampling — just describe dominant tones
    const raw = base64.includes(',') ? base64.split(',')[1] : base64;
    const buf = Buffer.from(raw, 'base64');
    
    // Sample every 1000th byte for a rough color profile
    let r = 0, g = 0, b = 0, count = 0;
    // Skip PNG header (~67 bytes), sample RGB-ish bytes
    for (let i = 100; i < buf.length - 3; i += 3000) {
      r += buf[i];
      g += buf[i + 1];
      b += buf[i + 2];
      count++;
    }
    if (count === 0) return 'mixed amber and brown tones';
    
    r = Math.round(r / count);
    g = Math.round(g / count);
    b = Math.round(b / count);

    if (r > 150 && g > 100 && b < 80) return 'warm amber and honey-gold tones';
    if (r > 120 && g > 120 && b > 150) return 'cool blue and steel tones';
    if (r > 120 && g > 80 && b < 60) return 'rich brown and hazel tones';
    if (r > 100 && g > 130 && b > 80) return 'green and emerald tones';
    if (r < 80 && g < 80 && b < 80) return 'dark charcoal tones';
    return 'mixed warm and cool tones';
  } catch {
    return 'rich natural iris colors';
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { irisImage, style } = body as { irisImage?: string; style?: string };

    if (!irisImage) return NextResponse.json({ error: 'Iris image is required' }, { status: 400 });
    if (!style) return NextResponse.json({ error: 'Style is required' }, { status: 400 });

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'Server not configured.' }, { status: 500 });

    const stylePrompt = STYLE_PROMPTS[style] || STYLE_PROMPTS.macro;
    
    // Decode image
    const rawBase64 = irisImage.includes(',') ? irisImage.split(',')[1] : irisImage;
    const imageBuffer = Buffer.from(rawBase64, 'base64');
    
    // Analyze iris colors for prompt enrichment
    const colorDesc = analyzeIrisColors(rawBase64);
    const enrichedPrompt = stylePrompt.replace(/a human iris/g, `a human iris with ${colorDesc}`);

    // Try image edit first (sends the actual photo)
    let result: string | null = null;

    // Stage 1: Try enhance + transform via edits
    const enhanceResult = await tryImageEdit(imageBuffer, 
      `Enhance this iris photograph to professional macro quality. Isolate the iris on a pure black background. ` +
      `Remove all eyelid, eyelash, and skin. Sharpen iris fibers and crypt details. ` +
      `Deepen the limbal ring. Make the pupil absolute black. Enhance natural colors to be vivid and luminous. ` +
      `Professional studio lighting. Ultra high quality. No text.`, 
      apiKey);

    if (enhanceResult) {
      // Use enhanced image for the art transform
      const enhancedBase64 = enhanceResult.includes(',') ? enhanceResult.split(',')[1] : enhanceResult;
      const enhancedBuf = Buffer.from(enhancedBase64, 'base64');
      result = await tryImageEdit(enhancedBuf, enrichedPrompt, apiKey);
    }

    // If edits didn't work, fall back to text-to-image generation
    if (!result) {
      console.log('Image edits failed, falling back to text-to-image generation');
      result = await tryGeneration(enrichedPrompt, apiKey);
    }

    return NextResponse.json({
      imageUrl: result,
      prompt: enrichedPrompt,
      provider: 'openai/gpt-image-2',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Generation failed';
    console.error('Generation error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

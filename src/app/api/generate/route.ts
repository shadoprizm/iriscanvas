import { NextRequest, NextResponse } from 'next/server';

// Use node runtime — edge doesn't handle FormData/blobs well with OpenAI
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { irisImage, style } = body as {
      irisImage?: string;
      style?: string;
    };

    if (!irisImage) {
      return NextResponse.json({ error: 'Iris image is required' }, { status: 400 });
    }
    if (!style) {
      return NextResponse.json({ error: 'Style is required' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Server not configured. OPENAI_API_KEY missing.' },
        { status: 500 }
      );
    }

    // Style prompts
    const STYLE_PROMPTS: Record<string, string> = {
      macro:
        `Create a flawless professional macro photography portrait of this iris. ` +
        `Perfectly isolate the circular iris on a pure deep black background with zero eyelid, eyelash, or skin visible. ` +
        `Enhance every iris fiber, crypt, furrow, and collarette to medical-grade clarity and sharpness. ` +
        `Deepen the limbal ring to a rich dark border. Make the pupil perfectly circular and absolute black. ` +
        `Intensify the natural iris colors to be vivid and luminous — amber becomes molten gold, blue becomes electric sapphire, ` +
        `green becomes emerald. Add professional ring-light reflection highlights. ` +
        `The result should look like it was shot with a $5000 macro lens and professional studio lighting. ` +
        `Gallery-quality, suitable for 30x30 inch metal print. No text, no watermarks.`,

      cosmic:
        `Transform this iris into a breathtaking deep space nebula artwork. Isolate the iris on a pure black void background. ` +
        `The iris fibers become cosmic dust and stardust swirling in a nebula formation. Add subtle stars, distant galaxies, ` +
        `and aurora-like light streams emanating from the pupil which becomes a black hole or dark star. ` +
        `Colors shift between deep blues, purples, cyans, and the natural iris tones. ` +
        `Ultra high detail, Hubble-telescope quality, gallery-ready. No text, no watermarks.`,

      abstract:
        `Transform this iris into a stunning abstract fluid art masterpiece. Isolate the iris on a pure black background. ` +
        `The iris textures become swirling liquid shapes with luminous, saturated colors. Create depth with translucent ` +
        `overlapping forms radiating from the center. The pupil becomes a deep void. Colors should be vivid and jewel-toned. ` +
        `Ultra high detail, gallery-quality, suitable for large canvas print. No text, no watermarks.`,

      geometric:
        `Transform this iris into a precise geometric pattern artwork on a pure black background. ` +
        `The iris becomes intricate sacred geometry with perfect symmetry. The natural iris fibers ` +
        `are reimagined as precise geometric lines, triangles, hexagons, and fractal patterns. ` +
        `Colors are bold and saturated with metallic gold accents. The pupil is a perfect geometric void. ` +
        `Ultra high detail, mathematical precision, gallery-quality. No text, no watermarks.`,

      watercolor:
        `Transform this iris into a beautiful watercolor painting on a pure white background. ` +
        `The iris becomes soft, dreamy watercolor washes with gentle gradients. Colors bleed and blend ` +
        `organically like real watercolor paint on wet paper. The pupil is a deep watercolor pool. ` +
        `Preserve the natural iris pattern but make it painterly and expressive. ` +
        `Ultra high detail, fine art quality, suitable for giclee print. No text, no watermarks.`,

      surreal:
        `Transform this iris into a mind-bending surrealist dreamscape on a deep black background. ` +
        `The iris becomes a portal to another world. Impossible structures emerge from the iris fibers. ` +
        `Elements of Dalí and Escher — melting forms, infinite recursion, floating orbs of color. ` +
        `The natural iris colors are intensified to otherworldly luminosity. The pupil is an infinite tunnel. ` +
        `Ultra high detail, museum-quality surrealism. No text, no watermarks.`,

      elemental:
        `Transform this iris into an elemental force artwork on a pure black background. ` +
        `The iris becomes a nexus of elemental power — one half engulfed in realistic fire and ember, ` +
        `the other half surrounded by splashing water, ice crystals, and flowing liquid. ` +
        `The natural iris colors merge with fire orange and ice blue. ` +
        `The pupil is a glowing energy source at the center. Dramatic lighting, photorealistic elements ` +
        `blending seamlessly with the iris texture. ` +
        `Ultra high detail, commercial-quality, suitable for large print. No text, no watermarks.`,
    };

    const stylePrompt = STYLE_PROMPTS[style] || STYLE_PROMPTS.macro;

    // Stage 1: Enhance the raw iris photo
    const enhancePrompt =
      `Enhance this iris photograph to professional macro-photography quality. ` +
      `Perfectly isolate the round iris on a pure deep black background — remove all eyelid, eyelash, ` +
      `and skin. Sharpen the iris fibers, collarette, and crypt details to medical-grade clarity. ` +
      `Deepen the limbal ring. Make the pupil perfectly circular and absolute black. ` +
      `Enhance the natural iris colors to be vivid and luminous while remaining realistic. ` +
      `Professional lighting with subtle highlights on the iris texture. ` +
      `Output as a centered, circular iris on solid black background. Ultra high quality. No text.`;

    // Extract base64 data
    const base64Data = irisImage.includes(',') ? irisImage.split(',')[1] : irisImage;

    // Call OpenAI images/edits for enhancement
    const enhanceResponse = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: (() => {
        const formData = new FormData();
        const buffer = Buffer.from(base64Data, 'base64');
        const blob = new Blob([buffer], { type: 'image/png' });
        formData.append('image', blob, 'iris.png');
        formData.append('prompt', enhancePrompt);
        formData.append('model', 'gpt-image-2');
        formData.append('n', '1');
        formData.append('size', '1024x1024');
        formData.append('quality', 'high');
        return formData;
      })(),
    });

    let enhancedBase64: string;
    if (enhanceResponse.ok) {
      const enhanceData = await enhanceResponse.json();
      enhancedBase64 = enhanceData.data?.[0]?.b64_json || enhanceData.data?.[0]?.url || base64Data;
      if (enhancedBase64.startsWith('http')) {
        // It's a URL, fetch it
        const imgResp = await fetch(enhancedBase64);
        const imgBuf = await imgResp.arrayBuffer();
        enhancedBase64 = Buffer.from(imgBuf).toString('base64');
      }
    } else {
      const err = await enhanceResponse.json().catch(() => ({}));
      console.error('Enhance stage failed:', JSON.stringify(err));
      enhancedBase64 = base64Data; // Fallback to raw image
    }

    // Stage 2: Transform enhanced iris into chosen art style
    const transformResponse = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: (() => {
        const formData = new FormData();
        const buffer = Buffer.from(enhancedBase64, 'base64');
        const blob = new Blob([buffer], { type: 'image/png' });
        formData.append('image', blob, 'iris.png');
        formData.append('prompt', stylePrompt);
        formData.append('model', 'gpt-image-2');
        formData.append('n', '1');
        formData.append('size', '1024x1024');
        formData.append('quality', 'high');
        return formData;
      })(),
    });

    if (!transformResponse.ok) {
      const err = await transformResponse.json().catch(() => ({}));
      console.error('Transform stage failed:', JSON.stringify(err));
      return NextResponse.json(
        { error: `Art generation failed: ${err.error?.message || transformResponse.statusText}` },
        { status: 500 }
      );
    }

    const transformData = await transformResponse.json();
    const resultImage = transformData.data?.[0]?.b64_json
      ? `data:image/png;base64,${transformData.data[0].b64_json}`
      : transformData.data?.[0]?.url || '';

    if (!resultImage) {
      return NextResponse.json({ error: 'No image returned from API' }, { status: 500 });
    }

    return NextResponse.json({
      imageUrl: resultImage,
      enhancedUrl: enhancedBase64 !== base64Data ? `data:image/png;base64,${enhancedBase64}` : undefined,
      prompt: stylePrompt,
      provider: 'openai/gpt-image-2',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Generation failed';
    console.error('Generation error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

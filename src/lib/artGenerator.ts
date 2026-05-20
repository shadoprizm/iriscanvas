/**
 * ArtGenerator — Two-stage iris art generation using gpt-image-2.
 *
 * Stage 1: Enhance — Takes the raw iris photo and enhances it to professional
 *           macro-photography quality with perfect isolation on black background.
 * Stage 2: Transform — Takes the enhanced iris and creates art in the chosen style.
 */

export interface GenerationConfig {
  apiKey: string;
  model?: string;
  size?: '1024x1024' | '1536x1024' | '1024x1536' | '1536x1536';
}

export interface GenerationResult {
  imageUrl: string;
  enhancedUrl?: string;
  prompt: string;
  provider: string;
}

// High-quality style prompts inspired by reference art
const STYLE_PROMPTS: Record<string, string> = {
  abstract:
    `Transform this iris into a stunning abstract fluid art masterpiece. Isolate the iris on a pure black background. ` +
    `The iris textures become swirling liquid shapes with luminous, saturated colors. Create depth with translucent ` +
    `overlapping forms radiating from the center. The pupil becomes a deep void. Colors should be vivid and jewel-toned. ` +
    `Ultra high detail, gallery-quality, suitable for large canvas print. No text, no watermarks.`,

  cosmic:
    `Transform this iris into a breathtaking deep space nebula artwork. Isolate the iris on a pure black void background. ` +
    `The iris fibers become cosmic dust and stardust swirling in a nebula formation. Add subtle stars, distant galaxies, ` +
    `and aurora-like light streams emanating from the pupil which becomes a black hole or dark star. ` +
    `Colors shift between deep blues, purples, cyans, and the natural iris tones. ` +
    `Ultra high detail, Hubble-telescope quality, gallery-ready. No text, no watermarks.`,

  watercolor:
    `Transform this iris into a beautiful watercolor painting on a pure white background. ` +
    `The iris becomes soft, dreamy watercolor washes with gentle gradients. Colors bleed and blend ` +
    `organically like real watercolor paint on wet paper. The pupil is a deep watercolor pool. ` +
    `Preserve the natural iris pattern but make it painterly and expressive. ` +
    `Ultra high detail, fine art quality, suitable for giclee print. No text, no watermarks.`,

  geometric:
    `Transform this iris into a precise geometric pattern artwork on a pure black background. ` +
    `The iris becomes intricate sacred geometry with perfect symmetry. The natural iris fibers ` +
    `are reimagined as precise geometric lines, triangles, hexagons, and fractal patterns. ` +
    `Colors are bold and saturated with metallic gold accents. The pupil is a perfect geometric void. ` +
    `Ultra high detail, mathematical precision, gallery-quality. No text, no watermarks.`,

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

  macro:
    `Create a flawless professional macro photography portrait of this iris. ` +
    `Perfectly isolate the circular iris on a pure deep black background with zero eyelid, eyelash, or skin visible. ` +
    `Enhance every iris fiber, crypt, furrow, and collarette to medical-grade clarity and sharpness. ` +
    `Deepen the limbal ring to a rich dark border. Make the pupil perfectly circular and absolute black. ` +
    `Intensify the natural iris colors to be vivid and luminous — amber becomes molten gold, blue becomes electric sapphire, ` +
    `green becomes emerald. Add professional ring-light reflection highlights. ` +
    `The result should look like it was shot with a $5000 macro lens and professional studio lighting. ` +
    `Gallery-quality, suitable for 30x30 inch metal print. No text, no watermarks.`,
};

const ENHANCE_PROMPT =
  `Enhance this iris photograph to professional macro-photography quality. ` +
  `Perfectly isolate the round iris on a pure deep black background — remove all eyelid, eyelash, ` +
  `and skin. Sharpen the iris fibers, collarette, and crypt details to medical-grade clarity. ` +
  `Deepen the limbal ring. Make the pupil perfectly circular and absolute black. ` +
  `Enhance the natural iris colors to be vivid and luminous while remaining realistic. ` +
  `Professional lighting with subtle highlights on the iris texture. ` +
  `Output as a centered, circular iris on solid black background. Ultra high quality. No text.`;

/**
 * Call gpt-image-2 API with an input image (edit mode).
 */
async function callImageAPI(
  prompt: string,
  imageBase64: string,
  config: GenerationConfig
): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: (() => {
      const formData = new FormData();
      // Convert base64 to blob
      const byteString = atob(imageBase64.split(',')[1] || imageBase64);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], { type: 'image/png' });
      formData.append('image', blob, 'iris.png');
      formData.append('prompt', prompt);
      formData.append('model', config.model || 'gpt-image-2');
      formData.append('n', '1');
      formData.append('size', config.size || '1024x1024');
      formData.append('quality', 'high');
      return formData;
    })(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();

  // gpt-image-2 returns b64_json
  if (data.data?.[0]?.b64_json) {
    return `data:image/png;base64,${data.data[0].b64_json}`;
  }
  if (data.data?.[0]?.url) {
    return data.data[0].url;
  }
  throw new Error('No image returned from API');
}

/**
 * Call gpt-image-2 generation API (text-to-image, no edit).
 */
async function callGenerateAPI(
  prompt: string,
  config: GenerationConfig
): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model || 'gpt-image-2',
      prompt,
      n: 1,
      size: config.size || '1024x1024',
      quality: 'high',
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
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
 * Two-stage generation pipeline.
 * Stage 1: Enhance the raw iris photo.
 * Stage 2: Transform the enhanced iris into art.
 */
export async function generateIrisArt(
  rawIrisImage: string,
  style: string,
  config: GenerationConfig
): Promise<GenerationResult> {
  const stylePrompt = STYLE_PROMPTS[style] || STYLE_PROMPTS.abstract;

  // Stage 1: Enhance raw iris to professional quality
  let enhancedUrl: string;
  try {
    enhancedUrl = await callImageAPI(ENHANCE_PROMPT, rawIrisImage, config);
  } catch (e) {
    console.error('Enhancement stage failed, using raw image:', e);
    enhancedUrl = rawIrisImage; // Fallback to raw image
  }

  // Stage 2: Transform enhanced iris into chosen art style
  let artUrl: string;
  try {
    artUrl = await callImageAPI(stylePrompt, enhancedUrl, config);
  } catch (e) {
    console.error('Art transform stage failed:', e);
    // Fallback: try generation without the enhanced image
    artUrl = await callGenerateAPI(stylePrompt, config);
  }

  return {
    imageUrl: artUrl,
    enhancedUrl,
    prompt: stylePrompt,
    provider: 'openai/gpt-image-2',
  };
}

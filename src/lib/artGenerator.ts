/**
 * ArtGenerator — generates iris art using AI image generation APIs.
 * Designed to be provider-agnostic. Swap the provider function to use
 * different image generation backends (OpenAI, Stability AI, etc.)
 */

import { IrisAnalysis } from './irisAnalyzer';

export interface GenerationConfig {
  provider: 'openai' | 'placeholder';
  apiKey?: string;
  model?: string;
  size?: '1024x1024' | '1536x1024' | '1024x1536';
}

export interface GenerationResult {
  imageUrl: string;
  prompt: string;
  provider: string;
}

/**
 * Build a generation prompt from iris analysis data and style.
 */
export function buildPrompt(analysis: IrisAnalysis, style: string): string {
  const styleDescriptors: Record<string, string> = {
    abstract: 'abstract fluid art with swirling shapes',
    cosmic: 'deep space nebula with stars and cosmic dust',
    watercolor: 'soft watercolor painting with gentle washes',
    geometric: 'precise geometric patterns with sharp symmetry',
    surreal: 'surreal dreamscape with impossible structures',
  };

  const colorList = analysis.dominantColors.slice(0, 3).join(', ');
  const accentList = analysis.accentColors.slice(0, 2).join(', ');
  const warmCool = analysis.warmth > 0 ? 'warm' : 'cool';
  const brightness = analysis.brightness > 0.5 ? 'vibrant' : 'deep';

  const descriptor = styleDescriptors[style] || styleDescriptors.abstract;

  return `Create stunning ${descriptor} inspired by an iris eye pattern. ` +
    `Use a ${warmCool}, ${brightness} color palette dominated by ${colorList} ` +
    `with accents of ${accentList}. The composition should radiate from center ` +
    `like an iris with ${analysis.pattern} patterns. High detail, artistic, ` +
    `suitable for large canvas print. No text, no letters, no watermarks.`;
}

/**
 * Generate art using OpenAI's image generation API.
 * Server-side only — requires API key.
 */
export async function generateWithOpenAI(
  prompt: string,
  config: GenerationConfig
): Promise<GenerationResult> {
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model || 'gpt-image-1',
      prompt,
      n: 1,
      size: config.size || '1024x1024',
      quality: 'hd',
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const imageUrl = data.data?.[0]?.url || data.data?.[0]?.b64_json;

  return {
    imageUrl,
    prompt,
    provider: 'openai',
  };
}

/**
 * Main generation function — routes to the configured provider.
 * Falls back to client-side placeholder if no API key is available.
 */
export async function generateArt(
  analysis: IrisAnalysis,
  style: string,
  config?: GenerationConfig
): Promise<GenerationResult> {
  const prompt = buildPrompt(analysis, style);

  if (config?.apiKey && config.provider === 'openai') {
    return generateWithOpenAI(prompt, config);
  }

  // Placeholder: returns the prompt for client-side demo generation
  return {
    imageUrl: '',
    prompt,
    provider: 'placeholder',
  };
}

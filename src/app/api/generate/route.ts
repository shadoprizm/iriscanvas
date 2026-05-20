import { NextRequest, NextResponse } from 'next/server';
import { buildPrompt, generateWithOpenAI } from '@/lib/artGenerator';
import { IrisAnalysis } from '@/lib/irisAnalyzer';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { irisImage, style, analysis } = body as {
      irisImage?: string;
      style?: string;
      analysis?: IrisAnalysis;
    };

    if (!style) {
      return NextResponse.json({ error: 'Style is required' }, { status: 400 });
    }

    // Default analysis if not provided
    const irisAnalysis: IrisAnalysis = analysis || {
      dominantColors: ['#6a1bff', '#3b0d99', '#9a5cff'],
      accentColors: ['#ff6ab3', '#00d4ff', '#ffd700'],
      pattern: 'radial',
      brightness: 0.5,
      warmth: 0,
      contrast: 0.6,
    };

    const prompt = buildPrompt(irisAnalysis, style);

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      // Return prompt for client-side generation
      return NextResponse.json({
        prompt,
        provider: 'placeholder',
        message: 'No API key configured. Using client-side generation.',
      });
    }

    const result = await generateWithOpenAI(prompt, {
      provider: 'openai',
      apiKey,
      model: 'gpt-image-1',
      size: '1024x1024',
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

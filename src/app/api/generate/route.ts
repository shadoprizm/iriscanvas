import { NextRequest, NextResponse } from 'next/server';
import { generateIrisArt } from '@/lib/artGenerator';

export const runtime = 'edge';

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
        { error: 'Server not configured. Please set OPENAI_API_KEY.' },
        { status: 500 }
      );
    }

    const result = await generateIrisArt(irisImage, style, {
      apiKey,
      model: 'gpt-image-2',
      size: '1024x1024',
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Generation failed';
    console.error('Generation error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

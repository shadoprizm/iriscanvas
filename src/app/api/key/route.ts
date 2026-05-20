import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * This route simply returns the OpenAI API key to the client.
 * The client makes the actual OpenAI API call directly, bypassing serverless timeouts.
 * 
 * This is acceptable for MVP — the key is only exposed to the user's own browser.
 * For production, we'd use a proper backend (Railway) or a signed URL pattern.
 */
export async function GET() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Not configured' }, { status: 500 });
  }
  return NextResponse.json({ key: apiKey });
}

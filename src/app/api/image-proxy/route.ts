import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * Proxy route: fetches an external image URL and returns the raw binary.
 * This avoids embedding large base64 strings in JSON responses.
 * Usage: /api/image-proxy?url=<encoded_url>
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  
  if (!url) {
    return NextResponse.json({ error: 'url parameter required' }, { status: 400 });
  }

  // Only allow OpenAI CDN URLs
  if (!url.startsWith('https://oaidalleapiprodscus.blob.core.windows.net/') && 
      !url.startsWith('https://cdn.openai.com/') &&
      !url.startsWith('https://files.oaiusercontent.com/')) {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  try {
    const resp = await fetch(url);
    if (!resp.ok) {
      return NextResponse.json({ error: 'Failed to fetch image' }, { status: resp.status });
    }

    const contentType = resp.headers.get('content-type') || 'image/png';
    const buffer = Buffer.from(await resp.arrayBuffer());

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

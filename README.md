# IrisCanvas — AI Iris Art Generator

Turn your unique iris pattern into stunning AI-generated artwork.

## Features

- 📸 **Camera Capture** — Use your phone or webcam to snap a close-up of your eye
- 📁 **Upload Fallback** — Upload an existing photo if no camera is available
- 🎨 **5 Art Styles** — Abstract, Cosmic, Watercolor, Geometric, Surreal
- 🖼️ **Instant Results** — Generate art in seconds
- ⬇️ **Download** — Save your art as high-quality PNG
- 📱 **Mobile-First** — Works perfectly on phones and desktops

## Tech Stack

- **Next.js 14** with TypeScript
- **Tailwind CSS** for styling
- **HTML5 getUserMedia** for camera access
- **OpenAI API** (gpt-image-1) for art generation (with client-side fallback)
- **Static Export** for GitHub Pages deployment

## Getting Started

### Prerequisites

- Node.js 20+
- npm

### Install

```bash
cd iriscanvas
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Build

```bash
npm run build
```

Static files are output to `./web/`.

### Production (with OpenAI)

Set the `OPENAI_API_KEY` environment variable for real AI generation:

```bash
OPENAI_API_KEY=sk-... npm run build
```

Without an API key, the app uses a client-side demo generator.

## Deployment

### GitHub Pages

1. Push to GitHub
2. Go to Settings → Pages
3. Source: GitHub Actions
4. The workflow in `.github/workflows/deploy.yml` handles the rest

### Manual Deploy

```bash
npm run build
# Upload contents of ./web/ to your hosting provider
```

### Vercel (with API)

For full API support (real AI generation), deploy to Vercel:

```bash
npx vercel
# Set OPENAI_API_KEY in Vercel environment variables
```

## Pricing Tiers

| Tier | Price | Features |
|------|-------|----------|
| Free | $0 | 1 generation, low-res, watermarked |
| Pro | $9.99 | 5 generations, high-res, no watermark |
| Canvas Print | $29.99+ | High-res + physical canvas shipped |

## Project Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Landing page
│   ├── capture/page.tsx    # Main app (camera + generation)
│   └── api/generate/       # Art generation API endpoint
├── components/
│   ├── CameraCapture.tsx   # Camera access + photo capture
│   ├── ImageUpload.tsx     # File upload fallback
│   ├── StyleSelector.tsx   # Art style picker
│   ├── ArtDisplay.tsx      # Result display + download
│   └── Footer.tsx          # Site footer
└── lib/
    ├── irisAnalyzer.ts     # Iris color/pattern extraction
    ├── artGenerator.ts     # AI art generation pipeline
    └── watermark.ts        # Free tier watermark utility
```

## License

MIT

---

**IrisCanvas** — A product of [North Star Holdings](https://astrawebdev.com)

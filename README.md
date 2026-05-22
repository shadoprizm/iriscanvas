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
- **OpenAI API** (`gpt-image-2`) for iris enhancement and art generation
- **Railway** for server-hosted Next.js deployment

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

The production build is emitted to `.next/` and must run with `npm start` or Railway's Next.js runtime.

### Production (with OpenAI)

Set the `OPENAI_API_KEY` environment variable for real AI generation:

```bash
OPENAI_API_KEY=sk-... npm run build
npm start
```

Without an API key, the generation API returns `Server not configured`.

## Deployment

### Railway

IrisCanvas is deployed on Railway from the GitHub `main` branch.

Required Railway environment variable:

```bash
OPENAI_API_KEY=sk-...
```

GitHub Actions is CI only. It runs `npm ci` and `npm run build`; it does not deploy to GitHub Pages.

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

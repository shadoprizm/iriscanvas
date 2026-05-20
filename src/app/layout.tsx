import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'IrisCanvas — Turn Your Iris Into Art',
  description: 'Capture your unique iris pattern and transform it into stunning AI-generated art. Download digital prints or order canvas prints.',
  keywords: ['iris art', 'eye art', 'AI art generator', 'personalized art', 'canvas prints'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}

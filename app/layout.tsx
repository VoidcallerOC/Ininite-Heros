import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import '@/app/assets/css/styles.css';
import '@/app/assets/css/forge-align.css';
import '@/app/globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://infiniteheroes.net'),
  title: { default: 'Infinite Heroes Comics | Watertown, CT', template: '%s | Infinite Heroes Comics' },
  description: 'Infinite Heroes Comics is the Main Street comic shop in Watertown, Connecticut — new comics and collectibles.',
  icons: { icon: '/assets/images/infinite-heroes-logo.webp' },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}

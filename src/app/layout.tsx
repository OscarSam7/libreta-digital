import type { Metadata, Viewport } from 'next';
import './globals.css';
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt';

export const metadata: Metadata = {
  title: 'LibretaDigital Pro | FinTech POS & Fiado en Tiempo Real',
  description: 'Control de cuentas corrientes, fiado y pagos con doble validación QR para almacenes y minimarkets.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'LibretaDigital',
  },
};

export const viewport: Viewport = {
  themeColor: '#090d16',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased bg-slate-100 text-slate-900 select-none">
        {children}
        <PWAInstallPrompt />
      </body>
    </html>
  );
}

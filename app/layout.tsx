import type { Metadata } from "next";
import { Fraunces, Manrope, Noto_Sans_Ethiopic } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Toaster } from 'react-hot-toast'
import AppProviders from '@/app/components/AppProviders'

const display = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

const sans = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const ethiopic = Noto_Sans_Ethiopic({
  variable: "--font-ethiopic",
  subsets: ["ethiopic"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "ENAT AI — Your Smart Business Companion",
  description: "Smart records. Smarter business. Voice, photo, and AI ledger for Ethiopian merchants.",
  icons: {
    icon: [
      { url: "/favicon.ico?v=4", sizes: "any" },
      { url: "/favicon.png?v=4", type: "image/png", sizes: "32x32" },
      { url: "/enat-ai-logo.png?v=4", type: "image/png", sizes: "512x512" },
    ],
    shortcut: "/favicon.ico?v=4",
    apple: "/apple-touch-icon.png?v=4",
  },
};

const themeInitScript = `
(function(){
  try {
    var t = localStorage.getItem('enat-theme');
    if (t !== 'light' && t !== 'dark') {
      t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    if (t === 'dark') document.documentElement.classList.add('dark');
    document.documentElement.style.colorScheme = t;
    var l = localStorage.getItem('enat-locale');
    if (l === 'am' || l === 'en') document.documentElement.lang = l === 'am' ? 'am' : 'en';
  } catch (e) {}
})();
`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${display.variable} ${sans.variable} ${ethiopic.variable} antialiased`}
      >
        <Script id="enat-theme-init" strategy="beforeInteractive">
          {themeInitScript}
        </Script>
        <AppProviders>
          {children}
          <Toaster 
            position="top-center"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#363636',
                color: '#fff',
              },
            }}
          />
        </AppProviders>
      </body>
    </html>
  );
}

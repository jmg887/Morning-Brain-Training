import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#F9F9F9",
};

export const metadata: Metadata = {
  title: "BrainTrain - Morning Brain Training",
  description: "Train your brain every morning with fun, challenging games. Memory Match, Word Puzzle, and Math Sprint.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "BrainTrain",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js').catch(() => {});
                });
              }
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} antialiased`}
        style={{ backgroundColor: '#F9F9F9', color: '#333333', maxWidth: 430, margin: '0 auto', minHeight: '100dvh', position: 'relative', boxShadow: '0 0 40px rgba(0,0,0,0.05)' }}
      >
        {children}
      </body>
    </html>
  );
}
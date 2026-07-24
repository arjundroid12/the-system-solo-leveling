import type { Metadata, Viewport } from "next";
import { Cinzel, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const cinzel = Cinzel({ variable: "--font-display", subsets: ["latin"], display: "swap", weight: ["400", "500", "600", "700", "800", "900"] });
const jetbrainsMono = JetBrains_Mono({ variable: "--font-mono", subsets: ["latin"], display: "swap", weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "THE SYSTEM — Player Interface",
  description: "Solo Leveling-style real-life RPG system. Gain XP from real actions, level up, recruit shadows, conquer dungeons.",
  applicationName: "THE SYSTEM",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "THE SYSTEM" },
  formatDetection: { telephone: false },
  openGraph: { title: "THE SYSTEM — Player Interface", description: "You have acquired the qualifications to be a Player.", type: "website" },
};

export const viewport: Viewport = { themeColor: "#03060f", width: "device-width", initialScale: 1, maximumScale: 1, userScalable: false, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${cinzel.variable} ${jetbrainsMono.variable} dark`} suppressHydrationWarning>
      <body className="font-mono bg-background text-foreground min-h-screen">
        <div className="sl-scan-line" />
        {children}
        <script dangerouslySetInnerHTML={{ __html: `if ('serviceWorker' in navigator) { window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => {}); }); }` }} />
      </body>
    </html>
  );
}

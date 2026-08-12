import type { Metadata, Viewport } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-manrope",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-space-grotesk",
});

export const viewport: Viewport = {
  themeColor: "#0e0e0e",
};

export const metadata: Metadata = {
  title: "HaxBall Client, Launcher & FPS Unlocker | Vexa Client (Resmi İstemci İndir)",
  description: "Vexa Client; HaxBall oyuncuları için özel tasarlanmış resmi Windows istemcisidir (launcher). Düşük ping, yüksek FPS unlocker, canlı arkadaş takibi, özel profil afişleri ve otomatik güncelleme ile HaxBall'u ücretsiz indirin.",
  keywords: "haxball client, haxball client indir, vexa client, haxball launcher, haxball fps unlocker, haxball bot, haxball istatistik, haxball oda katılma, haxball oyunu, haxball indir, vexa client haxball, haxball desktop client, haxball ping düşürme, haxball türkçe client, vexa haxball, haxball fps arttırma",
  authors: [{ name: "Vexa Client" }],
  alternates: {
    canonical: "https://vexaclient.com/",
    languages: {
      "tr-TR": "https://vexaclient.com/",
    },
  },
  openGraph: {
    siteName: "Vexa Client",
    title: "HaxBall Client & Launcher İndir | Vexa Client",
    description: "HaxBall için gelişmiş masaüstü launcher, FPS unlocker, canlı arkadaşlık ağı, profil afişleri ve 0 gecikme.",
    type: "website",
    url: "https://vexaclient.com/",
    images: [
      {
        url: "https://vexaclient.com/assets/logo.png",
        width: 512,
        height: 512,
        alt: "Vexa Client Logo",
      },
    ],
    locale: "tr_TR",
  },
  twitter: {
    card: "summary_large_image",
    title: "Vexa Client - Resmi HaxBall İstemcisi",
    description: "HaxBall için modern Windows masaüstü client ve launcher.",
    images: ["https://vexaclient.com/assets/logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className={`${manrope.variable} ${spaceGrotesk.variable}`}>
      <body>
        {children}
      </body>
    </html>
  );
}


import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://baseboingbattle.online"),

  title: "Base Boing Battle",
  description: "Online 1v1 physics battle built on Base",

  other: {
    "base:app_id": "6a2ad1880cfd412b2ab2bac7",
  },

  openGraph: {
    title: "Base Boing Battle",
    description: "Online 1v1 physics battle built on Base",
    url: "https://baseboingbattle.online",
    siteName: "Base Boing Battle",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Base Boing Battle",
      },
    ],
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "Base Boing Battle",
    description: "Online 1v1 physics battle built on Base",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
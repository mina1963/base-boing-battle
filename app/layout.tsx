import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import Script from "next/script";

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
  metadataBase: new URL("https://www.baseboingbattle.online"),

  applicationName: "Base Boing Battle",
  title: "Base Boing Battle — Online 1v1 Game on Base",
  description: "Draw, deflect, and battle in a fast online 1v1 physics game built on Base.",
  manifest: "/manifest.webmanifest",
  alternates: {
    canonical: "https://www.baseboingbattle.online/mobile",
  },

icons: {
  icon: "/icon.png",
  apple: "/icon.png",
  shortcut: "/icon.png",
},

  other: {
    "base:app_id": "6a2ad1880cfd412b2ab2bac7",
  },

  openGraph: {
    title: "Base Boing Battle — Online 1v1 Game on Base",
    description: "Draw, deflect, and battle in a fast online 1v1 physics game built on Base.",
    url: "https://www.baseboingbattle.online/mobile",
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
    title: "Base Boing Battle — Online 1v1 Game on Base",
    description: "Draw, deflect, and battle in a fast online 1v1 physics game built on Base.",
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
        <Script id="base-app-mobile-entry" strategy="beforeInteractive">
          {`(function(){try{var p=window.location.pathname;if(p!=='/'&&p!=='')return;var ua=navigator.userAgent||'';var mobile=/Android|iPhone|iPad|iPod|Mobile|IEMobile|Opera Mini/i.test(ua)||(navigator.maxTouchPoints>1&&/Macintosh/i.test(ua))||window.innerWidth<=768;if(mobile)window.location.replace('/mobile');}catch(e){}})();`}
        </Script>
      </body>
    </html>
  );
}

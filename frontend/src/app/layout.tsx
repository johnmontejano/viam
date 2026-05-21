import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Viam — AI-Powered Traditional Latin Mass Finder",
  description: "Find Traditional Latin Masses near you or along your route with AI-powered search, smart filters, and interactive maps.",
  metadataBase: new URL("https://viamtrad.netlify.app"),
  alternates: {
    canonical: "/",
  },
  applicationName: "Viam",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Viam",
  },
  openGraph: {
    type: "website",
    title: "Viam — AI-Powered Traditional Latin Mass Finder",
    description: "Find Traditional Latin Masses near you or along your route with AI-powered search, smart filters, and interactive maps.",
    url: "https://viamtrad.netlify.app",
    siteName: "Viam",
    images: [
      {
        url: "https://i.postimg.cc/KvbByNYv/Captura-de-pantalla-2026-05-18-a-la-s-9-20-48-p-m.png",
        width: 1200,
        height: 630,
        alt: "Viam — AI-Powered Traditional Latin Mass Finder Preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Viam — AI-Powered Traditional Latin Mass Finder",
    description: "Find Traditional Latin Masses near you or along your route with AI-powered search, smart filters, and interactive maps.",
    images: ["https://i.postimg.cc/KvbByNYv/Captura-de-pantalla-2026-05-18-a-la-s-9-20-48-p-m.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
    ],
  },
};

export const viewport = {
  themeColor: "#9f1239", // Burgundy Accent
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

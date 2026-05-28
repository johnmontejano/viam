import type { Metadata } from "next";
import "./globals.css";
import { AuthProviderWrapper } from "./AuthProviderWrapper";

export const metadata: Metadata = {
  title: "Viam — Discover Catholic Events & the Traditional Latin Mass",
  description: "Find local Catholic events, meet young Catholics, and discover the Traditional Latin Mass near you or along your route.",
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
    title: "Viam — Discover Catholic Events & the Traditional Latin Mass",
    description: "Find local Catholic events, meet young Catholics, and discover the Traditional Latin Mass near you or along your route.",
    url: "https://viamtrad.netlify.app",
    siteName: "Viam",
    images: [
      {
        url: "https://i.postimg.cc/KvbByNYv/Captura-de-pantalla-2026-05-18-a-la-s-9-20-48-p-m.png",
        width: 1200,
        height: 630,
        alt: "Viam — Discover Catholic Events & the Traditional Latin Mass",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Viam — Discover Catholic Events & the Traditional Latin Mass",
    description: "Find local Catholic events, meet young Catholics, and discover the Traditional Latin Mass near you or along your route.",
    images: ["https://i.postimg.cc/KvbByNYv/Captura-de-pantalla-2026-05-18-a-la-s-9-20-48-p-m.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
    ],
  },
};

export const viewport = {
  themeColor: "#8B1538",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="bg-background">
      <body className="font-sans antialiased">
        <AuthProviderWrapper>
          {children}
        </AuthProviderWrapper>
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { Providers } from "./providers";

// Mobil uyumluluk ve tam ekran deneyimi için
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

const frameMetadata = {
  version: "next",
  imageUrl: "https://houra.vercel.app/splash.png",
  button: {
    title: "Launch Houra",
    action: {
      type: "launch_app", 
      name: "Houra",
      url: "https://houra.vercel.app/",
      splashImageUrl: "https://houra.vercel.app/splash.png",
      splashBackgroundColor: "#000000",
    },
  },
};

export const metadata: Metadata = {
  title: "Houra",
  description: "Time Economy",
  manifest: "/manifest.json",
  openGraph: {
    title: "Houra",
    description: "Time Economy",
    images: ["https://houra.vercel.app/splash.png"],
  },
  other: {
    "base:app_id": "6989dfad73cda529e5cd6898",
    "fc:frame": JSON.stringify(frameMetadata),
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, backgroundColor: '#000000', color: '#ffffff' }}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}

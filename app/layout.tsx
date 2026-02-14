import type { Metadata } from "next";
import { Providers } from "./providers";

const frameMetadata = {
  version: "next",
  imageUrl: "https://houra.vercel.app/splash.png",
  button: {
    title: "Launch Houra",
    action: {
      type: "launch_frame",
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
  openGraph: {
    title: "Houra",
    description: "Time Economy",
    images: ["https://houra.vercel.app/splash.png"],
  },
  other: {
    // Farcaster Frame v2 meta etiketi
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

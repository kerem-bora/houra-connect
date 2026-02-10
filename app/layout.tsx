import type { Metadata } from "next";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Houra",
  description: "Time Economy",
  openGraph: {
    title: "Houra",
    description: "Time Economy",
    images: ["https://houra.vercel.app/splash.png"],
  },
  other: {
    "base:app_id": "6989dfad73cda529e5cd6898",
    "fc:frame": JSON.stringify({
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
    }),
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

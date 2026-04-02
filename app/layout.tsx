import type { Metadata, Viewport } from "next";
import { Providers } from "./providers";


export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover", 
  themeColor: "#000000",
};

export const metadata: Metadata = {
  title: "Houra",
  description: "Time Economy",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Houra",
  },
  other: {
    "base:app_id": "6989dfad73cda529e5cd6898",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ 
        margin: 0, 
        padding: 0, 
        backgroundColor: '#000000', 
        color: '#ffffff',
        overscrollBehavior: 'none', 
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
      }}>
        <Providers>
          {/*  */}
          <div style={{ 
            paddingTop: 'env(safe-area-inset-top)', 
            paddingBottom: 'env(safe-area-inset-bottom)' 
          }}>
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
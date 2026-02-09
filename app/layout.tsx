import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Houra Connect",
  description: "Farcaster Professional Network",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, backgroundColor: '#000000' }}>
        {children}
      </body>
    </html>
  );
}

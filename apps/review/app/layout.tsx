import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Skua Console",
  description: "Thin web console for Skua Legal"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

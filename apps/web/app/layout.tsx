import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Skua Control Room",
  description: "Support and trust console for Skua Legal AI"
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

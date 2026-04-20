import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Skua Review",
  description: "Commercial DD review surface for Skua Legal"
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

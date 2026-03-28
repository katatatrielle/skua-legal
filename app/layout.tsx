import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CleanRoom Law",
  description: "Trust-first legal research workflow scaffold",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-100 text-slate-950 antialiased">
        <main className="mx-auto min-h-screen max-w-7xl px-4 py-6 sm:px-6">{children}</main>
      </body>
    </html>
  );
}

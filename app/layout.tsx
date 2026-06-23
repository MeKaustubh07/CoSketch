import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CoSketch — Collaborative Whiteboard",
  description:
    "A real-time collaborative whiteboard with hand-drawn style. Sketch, brainstorm, and create together.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased dark`}>
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100 font-[var(--font-inter)]">
        {children}
      </body>
    </html>
  );
}

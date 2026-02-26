import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import CosmicBackground from "@/components/CosmicBackground";

const outfit = Outfit({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "VaaniX - AI Communication Platform",
  description: "VaaniX empowers university innovation with intelligent text, voice, and 3D avatar AI interactions — all in one seamless platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${outfit.className} bg-background text-foreground antialiased min-h-screen flex flex-col`}>
        <CosmicBackground />
        {children}
      </body>
    </html>
  );
}

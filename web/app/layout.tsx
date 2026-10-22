import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";

import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { SITE_URL } from "@/lib/site";

import "./globals.css";

const sans = localFont({
  src: [
    { path: "../fonts/source-sans-3-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../fonts/source-sans-3-latin-600-normal.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-sans",
  display: "swap",
  adjustFontFallback: "Arial",
});

const serif = localFont({
  src: [
    { path: "../fonts/source-serif-4-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../fonts/source-serif-4-latin-600-normal.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-serif",
  display: "swap",
  adjustFontFallback: "Times New Roman",
});

const description = "A multi-index RAG pipeline with BM25 reranking and a measured retrieval benchmark.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "RAG Evaluation Lab",
    template: "%s · RAG Evaluation Lab",
  },
  description,
  openGraph: {
    title: "RAG Evaluation Lab",
    description,
    url: SITE_URL,
    siteName: "RAG Evaluation Lab",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "RAG Evaluation Lab logo with the title Multi-index retrieval and reranking." }],
  },
  twitter: {
    card: "summary_large_image",
    title: "RAG Evaluation Lab",
    description,
    images: ["/og.png"],
  },
  icons: {
    icon: [{ url: "/favicon.ico", sizes: "48x48" }, { url: "/logo.png", type: "image/png" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#13293d",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable}`}>
      <body className="min-h-screen bg-paper font-sans text-ink antialiased">
        <a href="#content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-20 focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:text-ink">
          Skip to content
        </a>
        <Nav />
        <main id="content">{children}</main>
        <Footer />
      </body>
    </html>
  );
}

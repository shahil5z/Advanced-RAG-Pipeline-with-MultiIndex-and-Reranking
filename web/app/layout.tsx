import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";

import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { THEME_SCRIPT } from "@/components/ThemeToggle";
import { SITE_URL } from "@/lib/site";

import "./globals.css";

const sans = localFont({
  src: [{ path: "../fonts/inter-latin-wght.woff2", weight: "100 900", style: "normal" }],
  variable: "--font-sans",
  display: "swap",
  adjustFontFallback: "Arial",
});

const mono = localFont({
  src: [{ path: "../fonts/jetbrains-mono-latin-wght.woff2", weight: "100 800", style: "normal" }],
  variable: "--font-mono",
  display: "swap",
  adjustFontFallback: false,
});

const description = "A reproducible retrieval and generation evaluation system for document-grounded AI.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Advanced RAG Evaluation Platform",
    template: "%s · Advanced RAG Evaluation Platform",
  },
  description,
  openGraph: {
    title: "Advanced RAG Evaluation Platform",
    description,
    url: SITE_URL,
    siteName: "Advanced RAG Evaluation Platform",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "RAG Evaluation Lab logo with the title Multi-index retrieval and reranking." }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Advanced RAG Evaluation Platform",
    description,
    images: ["/og.png"],
  },
  icons: {
    icon: [{ url: "/favicon.ico", sizes: "48x48" }, { url: "/logo.png", type: "image/png" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f6fc" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0a1d" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-screen bg-paper font-sans text-ink antialiased">
        <a href="#content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-20 focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:text-ink">
          Skip to content
        </a>
        <Nav />
        <p className="border-b border-line bg-gradient-to-r from-navy/10 via-violet/10 to-teal/10 px-4 py-2 text-center text-sm leading-6 text-muted">
          The public demo answers questions live from your PDF or the built-in lab notes. Local engineering mode adds FastAPI, Qdrant, OpenTelemetry, and Kubernetes on your machine.
        </p>
        <main id="content">{children}</main>
        <Footer />
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { SampleDataNotice } from "@/components/ui";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Corvus",
  description: "A private, source-grounded memory for what you watch, search, and read.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-10 focus:rounded focus:bg-[var(--surface)] focus:px-3 focus:py-2">
          Skip to content
        </a>
        <header className="border-b border-[var(--border)]">
          <nav aria-label="Main" className="mx-auto flex w-full max-w-5xl items-center gap-6 px-4 py-3">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-wide">
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-[var(--accent)]" fill="currentColor" aria-hidden>
                <circle cx="5" cy="7" r="1.6" /><circle cx="11" cy="4" r="1.3" /><circle cx="18" cy="8" r="1.8" />
                <circle cx="14" cy="15" r="1.4" /><circle cx="7" cy="18" r="1.5" />
                <path d="M5 7 11 4 18 8 14 15 7 18Z" fill="none" stroke="currentColor" strokeWidth=".8" opacity=".6" />
              </svg>
              Corvus
            </Link>
            <Link href="/" className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]">Ask</Link>
            <Link href="/library" className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]">Memory</Link>
          </nav>
        </header>
        <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:py-12">{children}</main>
        <footer className="mx-auto w-full max-w-5xl px-4 pb-6">
          <SampleDataNotice />
        </footer>
      </body>
    </html>
  );
}

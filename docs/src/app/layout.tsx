import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { ThemeProvider } from "next-themes"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  metadataBase: new URL("https://ziflux.dev"),
  title: "ziflux — SWR caching for Angular resource()",
  description:
    "Zero-dependency, signal-native caching layer for Angular 21+. Stale-while-revalidate semantics for resource() — instant navigations, background refreshes, no spinners on return visits.",
  keywords: [
    "angular",
    "cache",
    "swr",
    "stale-while-revalidate",
    "resource",
    "signals",
    "angular 21",
    "data cache",
    "ziflux",
  ],
  openGraph: {
    title: "ziflux — SWR caching for Angular resource()",
    description:
      "Instant navigations, background refreshes, zero spinners. SWR caching for Angular resource().",
    type: "website",
    images: [{ url: "/og.svg", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ziflux — SWR caching for Angular resource()",
    description:
      "Instant navigations, background refreshes, zero spinners. SWR caching for Angular resource().",
    images: ["/og.svg"],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:bg-background focus:p-4 focus:text-foreground">
          Skip to content
        </a>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}

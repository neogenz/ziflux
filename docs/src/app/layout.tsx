import type { Metadata } from "next"
import { Archivo, Sometype_Mono } from "next/font/google"
import { ThemeProvider } from "next-themes"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
})

const sometypeMono = Sometype_Mono({
  variable: "--font-sometype-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  metadataBase: new URL("https://ziflux.dev"),
  // Routes override the title; the template keeps the brand on every tab.
  title: {
    default: "ziflux: SWR caching for Angular resource()",
    template: "%s — ziflux",
  },
  description:
    "Zero-dependency, signal-native caching layer for Angular 22+. Stale-while-revalidate semantics for resource(): cached data paints instantly on return visits, refreshes happen in the background.",
  keywords: [
    "angular",
    "cache",
    "swr",
    "stale-while-revalidate",
    "resource",
    "signals",
    "angular 22",
    "data cache",
    "ziflux",
  ],
  openGraph: {
    title: "ziflux: SWR caching for Angular resource()",
    description:
      "Instant navigations and silent background refreshes. SWR caching for Angular resource().",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ziflux: SWR caching for Angular resource()",
    description:
      "Instant navigations and silent background refreshes. SWR caching for Angular resource().",
    images: ["/og.png"],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${archivo.variable} ${sometypeMono.variable} antialiased`}
      >
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:bg-background focus:p-4 focus:text-foreground">
          Skip to content
        </a>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  )
}

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
      "Zero-dependency, signal-native caching layer for Angular 21+. Four exports. That's the entire API.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ziflux — SWR caching for Angular resource()",
    description:
      "Zero-dependency, signal-native caching layer for Angular 21+. Four exports. That's the entire API.",
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
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}

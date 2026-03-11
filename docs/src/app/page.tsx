import { Navbar } from "@/components/landing/navbar"
import { Hero } from "@/components/landing/hero"
import { WhatNot } from "@/components/landing/what-not"
import { QuickStart } from "@/components/landing/quickstart"
import { ApiReference } from "@/components/landing/api-reference"
import { Freshness } from "@/components/landing/freshness"
import { PriorArt } from "@/components/landing/prior-art"
import { Footer } from "@/components/landing/footer"

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <WhatNot />
        <QuickStart />
        <ApiReference />
        <Freshness />
        <PriorArt />
      </main>
      <Footer />
    </>
  )
}

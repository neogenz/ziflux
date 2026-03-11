import { Navbar } from "@/components/landing/navbar"
import { Hero } from "@/components/landing/hero"
import { QuickStart } from "@/components/landing/quickstart"
import { ApiReference } from "@/components/landing/api-reference"
import { Freshness } from "@/components/landing/freshness"
import { PriorArt } from "@/components/landing/prior-art"
import { Footer } from "@/components/landing/footer"

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main id="main">
        <Hero />
        <QuickStart />
        <Freshness />
        <ApiReference />
        <PriorArt />
      </main>
      <Footer />
    </>
  )
}

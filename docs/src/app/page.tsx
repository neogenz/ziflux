import { Navbar } from "@/components/shared/navbar"
import { Footer } from "@/components/shared/footer"
import { Hero } from "@/components/landing/hero"
import { FreshnessSummary } from "@/components/landing/freshness-summary"
import { NotAFit } from "@/components/landing/not-a-fit"
import { PriorArt } from "@/components/landing/prior-art"
import { AiSkills } from "@/components/landing/ai-skills"
import { ClosingCta } from "@/components/landing/closing-cta"

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main id="main" className="relative">
        <Hero />
        <FreshnessSummary />
        <NotAFit />
        <PriorArt />
        <AiSkills />
        <ClosingCta />
      </main>
      <Footer />
    </>
  )
}

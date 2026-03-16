import { Navbar } from "@/components/landing/navbar"
import { Hero } from "@/components/landing/hero"
import { QuickStart } from "@/components/landing/quickstart"
import { Guide } from "@/components/landing/guide"
import { Testing } from "@/components/landing/testing"
import { AdvancedUsage } from "@/components/landing/advanced-usage"
import { Freshness } from "@/components/landing/freshness"
import { ApiReference } from "@/components/landing/api-reference"
import { Gotchas } from "@/components/landing/gotchas"
import { PriorArt } from "@/components/landing/prior-art"
import { AiSkills } from "@/components/landing/ai-skills"
import { Footer } from "@/components/landing/footer"

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main id="main" className="relative">
        <Hero />
        <QuickStart />
        <PriorArt />
        <Guide />
        <Freshness />
        <AdvancedUsage />
        <Testing />
        <ApiReference />
        <Gotchas />
        <AiSkills />
      </main>
      <Footer />
    </>
  )
}

import { QuickStart } from "@/components/docs/quickstart"
import { Guide } from "@/components/docs/guide"
import { Freshness } from "@/components/docs/freshness"
import { Scenarios } from "@/components/docs/scenarios"
import { AdvancedUsage } from "@/components/docs/advanced-usage"
import { Testing } from "@/components/docs/testing"
import { ApiReference } from "@/components/docs/api-reference"
import { Gotchas } from "@/components/docs/gotchas"

export default function DocsPage() {
  return (
    <>
      <QuickStart />
      <Guide />
      <Freshness />
      <Scenarios />
      <AdvancedUsage />
      <Testing />
      <ApiReference />
      <Gotchas />
    </>
  )
}

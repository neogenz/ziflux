import { AdvancedUsage } from "./advanced-usage"
import { ApiReference } from "./api-reference"
import { Freshness } from "./freshness"
import { Gotchas } from "./gotchas"
import { Guide } from "./guide"
import { QuickStart } from "./quickstart"
import { Scenarios } from "./scenarios"
import { Testing } from "./testing"

export function DocsPage() {
  return (
    <div className="docs-register">
      <QuickStart />
      <Guide />
      <Freshness />
      <Scenarios />
      <AdvancedUsage />
      <Testing />
      <ApiReference />
      <Gotchas />
    </div>
  )
}

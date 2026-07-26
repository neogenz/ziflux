import assert from "node:assert/strict"
import test from "node:test"
import { pickTopmostId } from "./use-active-heading.ts"

test("pickTopmostId selects the highest intersecting heading", () => {
  const positions = new Map([
    ["guide", 120],
    ["freshness", 80],
  ])

  assert.equal(
    pickTopmostId(
      ["guide", "freshness", "gotchas"],
      new Set(["guide", "freshness"]),
      (id) => positions.get(id) ?? Infinity,
    ),
    "freshness",
  )
  assert.equal(
    pickTopmostId(["guide"], new Set(), () => 0),
    null,
  )
})

import react from "@astrojs/react"
import starlight from "@astrojs/starlight"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "astro/config"

export default defineConfig({
  site: "https://ziflux.dev",
  output: "static",
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [
    react(),
    starlight({
      title: "ziflux",
      description:
        "Signal-native stale-while-revalidate caching for Angular resource().",
      customCss: ["./src/styles/marketing.css"],
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/neogenz/ziflux",
        },
      ],
      sidebar: [
        {
          label: "Documentation",
          items: [
            { label: "Overview", slug: "docs" },
            { label: "Quick start", slug: "docs/quick-start" },
            { label: "Guide", slug: "docs/guide" },
            { label: "Caching", slug: "docs/caching" },
            { label: "Use cases", slug: "docs/use-cases" },
            { label: "Patterns", slug: "docs/patterns" },
            { label: "Testing", slug: "docs/testing" },
            { label: "API reference", slug: "docs/api-reference" },
            { label: "Gotchas", slug: "docs/gotchas" },
          ],
        },
      ],
    }),
  ],
})

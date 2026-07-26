import react from "@astrojs/react"
import starlight from "@astrojs/starlight"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "astro/config"
import starlightPageContextAction from "starlight-page-context-action"

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
      favicon: "/favicon.ico",
      logo: {
        src: "./public/icon.svg",
        alt: "ziflux",
      },
      head: [
        {
          tag: "meta",
          attrs: {
            property: "og:image",
            content: "https://ziflux.dev/og.png",
          },
        },
        {
          tag: "meta",
          attrs: {
            name: "twitter:card",
            content: "summary_large_image",
          },
        },
        {
          tag: "meta",
          attrs: {
            name: "twitter:image",
            content: "https://ziflux.dev/og.png",
          },
        },
      ],
      customCss: [
        "@fontsource-variable/archivo/wdth.css",
        "@fontsource-variable/sometype-mono",
        "./src/styles/starlight.css",
      ],
      expressiveCode: {
        themes: ["catppuccin-mocha", "catppuccin-latte"],
      },
      plugins: [
        starlightPageContextAction({
          layout: "compact",
          llmsTxt: true,
          actions: {
            copy: true,
            viewMarkdown: true,
            chatgpt: false,
            claude: false,
            t3chat: false,
            scrollTop: false,
          },
        }),
      ],
      components: {
        Footer: "./src/components/starlight/footer.astro",
      },
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/neogenz/ziflux",
        },
      ],
      credits: false,
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

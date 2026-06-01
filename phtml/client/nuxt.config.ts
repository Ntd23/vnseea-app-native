// English description: Configures the Nuxt frontend runtime, backend bridge endpoints, and allowed remote image hosts.
// https://nuxt.com/docs/api/configuration/nuxt-config
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

process.loadEnvFile?.(resolve(__dirname, ".env"));

function requireEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function normalizeBackendWebBase(value: string) {
  return value
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/api\/v2\/endpoints$/i, "")
    .replace(/\/api-v2\.php$/i, "")
    .replace(/\/api$/i, "");
}

function extractHostname(value: string) {
  try {
    return new URL(value).hostname;
  } catch {
    return "";
  }
}

const publicApiBase = requireEnv("NUXT_PUBLIC_API_BASE");
const backendApiBase = requireEnv("NUXT_BACKEND_API_BASE");
const backendServerKey = requireEnv("NUXT_BACKEND_SERVER_KEY");
const publicSiteUrl = requireEnv("NUXT_PUBLIC_SITE_URL");
const realtimeInternalUrl = process.env.REALTIME_INTERNAL_URL?.trim() || "";
const realtimeSecret = process.env.REALTIME_SECRET?.trim() || "";
const publicRealtimeUrl = process.env.NUXT_PUBLIC_REALTIME_URL?.trim() || "";
const backendWebBase = normalizeBackendWebBase(
  process.env.NUXT_PUBLIC_BACKEND_WEB_BASE?.trim() || backendApiBase,
);
const imageDomains = Array.from(
  new Set(
    [extractHostname(publicSiteUrl), extractHostname(backendWebBase)].filter(
      Boolean,
    ),
  ),
);
const allowedHosts = requireEnv("NUXT_ALLOWED_HOSTS")
  .split(",")
  .map((host) => host.trim())
  .filter(Boolean);

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  typescript: {
    tsConfig: {
      include: ["../src/**/*"]
    }
  },
  experimental: {
    // Avoid dev app-manifest build-id mismatches behind the PHP/Nginx proxy.
    appManifest: false,
  },
  features: {
    inlineStyles: true,
  },
  ui: {
    content: true,
  },
  colorMode: {
    preference: "light",
    fallback: "light",
    storage: "cookie",
    storageKey: "nuxt-color-mode",
    classSuffix: "",
  },
  nitro: {
    apiBaseURL: "/_api",
    externals: {
      inline: [
        "vue",
        "vue-router",
        "pinia",
        "@vueuse/core",
        "@vueuse/nuxt",
        "@pinia/nuxt",
        "nuxt-tiptap-editor",
        "@tiptap/vue-3",
        "@tiptap/core",
        "@tiptap/starter-kit",
      ],
    },
  },
  alias: {
    "#shared-kernel": resolve(__dirname, "src/shared-kernel"),
  },
  scripts: {
    registry: {
      googleMaps: { trigger: "manual" },
    },
  },
  runtimeConfig: {
    backendApiBase,
    backendServerKey,
    realtimeInternalUrl,
    realtimeSecret,
    public: {
      apiBase: publicApiBase,
      backendWebBase,
      siteUrl: publicSiteUrl,
      realtimeUrl: publicRealtimeUrl,
      scripts: {
        googleMaps: {
          apiKey: process.env.NUXT_PUBLIC_SCRIPTS_GOOGLE_MAPS_API_KEY || "",
        },
      },
    },
  },
  css: ["~/assets/css/main.css"],
  imports: {
    dirs: [resolve(__dirname, "src/shared-kernel/application/composables")],
  },
  devServer: {
    host: process.env.NUXT_DEV_HOST,
    port: Number(process.env.NUXT_DEV_PORT),
  },
  app: {
    head: {
      title: "VNSEEA",
      titleTemplate: "%s | VNSEEA",
      meta: [
        {
          name: "viewport",
          content: "width=device-width, initial-scale=1",
        },
      ],
    },
  },
  image: {
    domains: imageDomains,
  },
  site: {
    name: "VNSEEA",
    url: publicSiteUrl,
    defaultLocale: "vi",
  },
  ogImage: {
    zeroRuntime: true,
  },
  vite: {
    server: {
      allowedHosts,
    },
    optimizeDeps: {
      include: [
        "vue",
        "vue-router",
        "pinia",
        "@vueuse/core",
        "@tiptap/vue-3",
        "@tiptap/core",
        "@tiptap/starter-kit",
      ],
    },
    ssr: {
      noExternal: [
        "vue",
        "vue-router",
        "pinia",
        "@vueuse/core",
        "nuxt-tiptap-editor",
        "@tiptap/vue-3",
        "@tiptap/core",
        "@tiptap/starter-kit",
      ],
    },
  },
  modules: [
    "@nuxt/ui",
    "@nuxt/scripts",
    "@nuxtjs/seo",
    "@nuxt/icon",
    "@nuxt/image",
    "@pinia/nuxt",
    "@vueuse/nuxt",
    "@nuxtjs/i18n",
    "nuxt-tiptap-editor",
  ],
  tiptap: {
    prefix: "Tiptap",
  },
  i18n: {
    defaultLocale: "vi",
    langDir: "locales",
    locales: [
      { code: "vi", language: "vi-VN", file: "vi.json", name: "Tiếng Việt" },
      { code: "en", language: "en-US", file: "en.json", name: "English" },
    ],
    strategy: "no_prefix",
  },
});

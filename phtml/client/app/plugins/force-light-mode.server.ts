// English description: Forces Nuxt UI color mode and SSR HTML attributes to stay on the light theme during server rendering.

export default defineNuxtPlugin(() => {
  const colorMode = useColorMode()
  const colorModeCookie = useCookie<string | null>("nuxt-color-mode")

  colorMode.preference = "light"
  colorMode.value = "light"
  colorModeCookie.value = "light"

  useHead({
    htmlAttrs: {
      style: "color-scheme: light;",
    },
  })
})

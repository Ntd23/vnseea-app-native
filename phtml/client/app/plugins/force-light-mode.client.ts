// English description: Forces Nuxt UI color mode to the light theme at runtime.

export default defineNuxtPlugin(() => {
  const colorMode = useColorMode()

  colorMode.preference = "light"
  colorMode.value = "light"

  document.documentElement.classList.remove("dark")
  document.documentElement.style.colorScheme = "light"

  window.localStorage.setItem("nuxt-color-mode", "light")
})

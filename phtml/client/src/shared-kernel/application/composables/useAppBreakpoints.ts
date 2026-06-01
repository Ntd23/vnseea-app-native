import { useBreakpoints, breakpointsTailwind } from "@vueuse/core"
import { computed } from "vue"

export const useAppBreakpoints = () => {
  const breakpoints = useBreakpoints(breakpointsTailwind)

  const isMobile = breakpoints.smaller("md")
  const isTablet = breakpoints.between("md", "lg")
  const isDesktop = breakpoints.greaterOrEqual("lg")
  const isLaptop = breakpoints.between("lg", "xl")
  const isWide = breakpoints.greaterOrEqual("xl")
  const shouldShowSidebar = breakpoints.greaterOrEqual("lg")
  const isTouchDevice = computed(() => isMobile.value || isTablet.value)

  return {
    breakpoints,
    isMobile,
    isTablet,
    isDesktop,
    isLaptop,
    isWide,
    shouldShowSidebar,
    isTouchDevice,
  }
}

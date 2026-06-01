export default defineAppConfig({
  ui: {
    colors: {
      primary: "blue",
      secondary: "slate",
      success: "sky",
      info: "blue",
      warning: "yellow",
      error: "red",
      neutral: "slate",
    },
    button: {
      slots: {
        base: "relative cursor-pointer pointer-events-auto select-none",
      },
    },
  },
})

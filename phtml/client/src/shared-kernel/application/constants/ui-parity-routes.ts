export type UiParityRoutePriority = "P0" | "P1" | "P2"

export type UiParityRoute = {
  route: string
  priority: UiParityRoutePriority
  shell: string[]
  shared: string[]
  notes: string
}

export const uiParityRoutes: UiParityRoute[] = [
  {
    route: "/welcome",
    priority: "P0",
    shell: ["guest-layout", "auth-shell"],
    shared: ["forms", "foundation"],
    notes: "Login page parity against baseline auth shell",
  },
  {
    route: "/register",
    priority: "P0",
    shell: ["guest-layout", "auth-shell"],
    shared: ["forms", "foundation"],
    notes: "Register page parity against baseline auth shell",
  },
  {
    route: "/home",
    priority: "P0",
    shell: ["default-layout", "navigation"],
    shared: ["feed", "post", "comment", "publisher", "foundation"],
    notes: "Highest leverage route for global parity",
  },
  {
    route: "/@username",
    priority: "P0",
    shell: ["default-layout", "navigation"],
    shared: ["feed", "post", "comment", "foundation"],
    notes: "Profile page parity including hero, tabs, feed",
  },
  {
    route: "/messages",
    priority: "P0",
    shell: ["messages-layout", "navigation"],
    shared: ["forms", "foundation"],
    notes: "Messages shell and side panel parity",
  },
  {
    route: "/products",
    priority: "P1",
    shell: ["default-layout", "navigation"],
    shared: ["foundation", "forms"],
    notes: "Marketplace listing parity",
  },
  {
    route: "/groups",
    priority: "P1",
    shell: ["default-layout", "navigation"],
    shared: ["feed", "foundation"],
    notes: "Community listing parity",
  },
  {
    route: "/blogs",
    priority: "P1",
    shell: ["default-layout", "navigation"],
    shared: ["foundation"],
    notes: "Blog listing parity",
  },
  {
    route: "/search",
    priority: "P1",
    shell: ["default-layout", "navigation"],
    shared: ["forms", "foundation"],
    notes: "Search filters and result shell parity",
  },
  {
    route: "/checkout",
    priority: "P1",
    shell: ["default-layout", "navigation"],
    shared: ["forms", "foundation"],
    notes: "Checkout composition parity without touching data flow",
  },
]

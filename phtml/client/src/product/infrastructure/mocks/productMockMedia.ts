import type { ProductCurrentImage } from "../../domain/types/product-editor.types"

const encodeSvg = (svg: string) => `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`

const createMockSvg = (label: string, start: string, end: string) =>
  encodeSvg(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 420">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="${start}" />
          <stop offset="100%" stop-color="${end}" />
        </linearGradient>
      </defs>
      <rect width="600" height="420" fill="url(#g)" rx="36" />
      <circle cx="500" cy="92" r="70" fill="rgba(255,255,255,0.12)" />
      <circle cx="116" cy="332" r="96" fill="rgba(255,255,255,0.09)" />
      <rect x="58" y="64" width="250" height="28" rx="14" fill="rgba(255,255,255,0.2)" />
      <rect x="58" y="116" width="168" height="168" rx="28" fill="rgba(255,255,255,0.18)" />
      <rect x="252" y="138" width="214" height="20" rx="10" fill="rgba(255,255,255,0.3)" />
      <rect x="252" y="176" width="162" height="16" rx="8" fill="rgba(255,255,255,0.22)" />
      <rect x="252" y="216" width="204" height="16" rx="8" fill="rgba(255,255,255,0.22)" />
      <rect x="58" y="324" width="192" height="18" rx="9" fill="rgba(255,255,255,0.2)" />
      <text x="58" y="382" fill="white" font-family="Arial, sans-serif" font-size="38" font-weight="700">${label}</text>
    </svg>
  `)

const mockPalette = [
  ["#1d4ed8", "#38bdf8"],
  ["#7c3aed", "#ec4899"],
  ["#0369a1", "#38bdf8"],
  ["#b45309", "#f59e0b"],
] as const

export const createProductMockImage = (id: string, label: string, index = 0): ProductCurrentImage => {
  const [start, end] = mockPalette[index % mockPalette.length]

  return {
    id,
    alt: label,
    src: createMockSvg(label, start, end),
  }
}

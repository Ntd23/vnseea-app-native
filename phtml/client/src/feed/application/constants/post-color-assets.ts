// English description: Centralizes feed post background color definitions for composer and post rendering.

export type FeedPostColorAsset = {
  id: number
  labelKey?: string
  label?: string
  bg: string
  text: string
}

export const feedPostColorAssets = [
  {
    id: 1,
    labelKey: "feed.publisherBox.colorPurpleBlue",
    bg: "linear-gradient(135deg, #ffb0ff 0%, #8080c0 100%)",
    text: "#ffffff",
  },
  {
    id: 2,
    labelKey: "feed.publisherBox.colorCherryPink",
    bg: "linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)",
    text: "#ffffff",
  },
  {
    id: 3,
    labelKey: "feed.publisherBox.colorSunsetGold",
    bg: "linear-gradient(135deg, #f6d365 0%, #fda085 100%)",
    text: "#ffffff",
  },
  {
    id: 4,
    labelKey: "feed.publisherBox.colorDeepOcean",
    bg: "linear-gradient(135deg, #30cfd0 0%, #330867 100%)",
    text: "#ffffff",
  },
  {
    id: 5,
    labelKey: "feed.publisherBox.colorSkyBlue",
    bg: "linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)",
    text: "#000000",
  },
  {
    id: 6,
    labelKey: "feed.publisherBox.colorMintGreen",
    bg: "linear-gradient(135deg, #d4fc79 0%, #96e6a1 100%)",
    text: "#000000",
  },
] satisfies FeedPostColorAsset[]

export const feedPostColorById = feedPostColorAssets.reduce(
  (assets, asset) => {
    assets[asset.id] = asset
    return assets
  },
  {} as Record<number, FeedPostColorAsset>,
)

export const defaultFeedPostColorAsset = feedPostColorAssets[0]

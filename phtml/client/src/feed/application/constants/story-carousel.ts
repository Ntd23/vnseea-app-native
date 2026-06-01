// English description: Centralizes story carousel UI behavior constants used by the feed presentation layer.

import { appRoutes } from "../../../shared-kernel/application/constants/route-registry"

export const feedStoryCreatePath = appRoutes.statusCreate

export const feedHomePath = appRoutes.feed

export const feedStoryCreateRedirectDelay = 500

export const feedStoryAcceptedMimeTypes = "image/*,video/*"

export const feedStoryDropZoneDataTypes = ["image/*", "video/*", "Files"] as const

export const feedStoryImageMimePrefix = "image/"

export const feedStoryVideoMimePrefix = "video/"

export const feedStoryCaptionMaxLength = 200

export const feedStoryCaptionWarningLength = 180

export const feedStoryPreviewProgressWidths = {
  empty: "24%",
  ready: "76%",
} as const

export const feedStoryViewerFallbackGradient = "linear-gradient(135deg,#0f172a 0%,#1d4ed8 58%,#38bdf8 100%)"

export const feedStoryCarouselScrollDistance = 220

export const feedStoryPointerTapTolerance = 10

export const feedStorySwipeMinDistance = 50

export const feedStoryViewerSideTapDivisor = 3

export const feedStoryReactionLongPressDelay = 420

export const feedStoryVideoPathHint = "video"

export const feedStoryVideoExtensions = ["mp4", "webm", "ogg", "mov", "m4v", "mpg", "mpeg", "avi", "mkv"] as const

export const feedStoryKeyboardKeys = {
  close: "Escape",
  previous: "ArrowLeft",
  next: "ArrowRight",
} as const

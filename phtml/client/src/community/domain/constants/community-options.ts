// English description: Defines shared community options, tabs, and route maps for group and page surfaces.

import { appRoutes } from "#shared-kernel/application/constants/route-registry"
import type {
  CommunityGroupTab,
  CommunityOption,
  CommunityPageTab,
} from "../types/community.types"

export const communityUrlPrefix = "https://vnseea.vn/"
export const communityPageUrlPrefix = "https://vnseea.vn/p/"

export const communityPrivacyOptions: CommunityOption[] = [
  {
    label: "community.privacy.public.label",
    value: "public",
    description: "community.privacy.public.description",
    icon: "i-ph-globe-hemisphere-west-fill",
  },
  {
    label: "community.privacy.private.label",
    value: "private",
    description: "community.privacy.private.description",
    icon: "i-ph-lock-key-fill",
  },
  {
    label: "community.privacy.secret.label",
    value: "secret",
    description: "community.privacy.secret.description",
    icon: "i-ph-eye-slash-fill",
  },
]

export const communityCategoryOptions: CommunityOption[] = [
  {
    label: "community.categories.auto.label",
    value: "auto",
    description: "community.categories.auto.description",
    icon: "i-ph-car-profile-fill",
  },
  {
    label: "community.categories.business.label",
    value: "business",
    description: "community.categories.business.description",
    icon: "i-ph-briefcase-fill",
  },
  {
    label: "community.categories.technology.label",
    value: "technology",
    description: "community.categories.technology.description",
    icon: "i-ph-cpu-fill",
  },
  {
    label: "community.categories.education.label",
    value: "education",
    description: "community.categories.education.description",
    icon: "i-ph-graduation-cap-fill",
  },
  {
    label: "community.categories.travel.label",
    value: "travel",
    description: "community.categories.travel.description",
    icon: "i-ph-airplane-tilt-fill",
  },
  {
    label: "community.categories.marketplace.label",
    value: "marketplace",
    description: "community.categories.marketplace.description",
    icon: "i-ph-storefront-fill",
  },
]

export const communityPageCategoryOptions: CommunityOption[] = [
  {
    label: "community.categories.local-business.label",
    value: "local-business",
    description: "community.categories.local-business.description",
    icon: "i-ph-storefront-fill",
  },
  {
    label: "community.categories.creator.label",
    value: "creator",
    description: "community.categories.creator.description",
    icon: "i-ph-microphone-stage-fill",
  },
  {
    label: "community.categories.brand.label",
    value: "brand",
    description: "community.categories.brand.description",
    icon: "i-ph-megaphone-simple-fill",
  },
  {
    label: "community.categories.education.label",
    value: "education",
    description: "community.categories.education.description",
    icon: "i-ph-graduation-cap-fill",
  },
  {
    label: "community.categories.organization.label",
    value: "organization",
    description: "community.categories.organization.description",
    icon: "i-ph-buildings-fill",
  },
  {
    label: "community.categories.service.label",
    value: "service",
    description: "community.categories.service.description",
    icon: "i-ph-briefcase-fill",
  },
]

export const communityPageCtaOptions: CommunityOption[] = [
  {
    label: "community.cta.message.label",
    value: "message",
    description: "community.cta.message.description",
    icon: "i-ph-chat-circle-dots-fill",
  },
  {
    label: "community.cta.follow.label",
    value: "follow",
    description: "community.cta.follow.description",
    icon: "i-ph-bell-simple-ringing-fill",
  },
  {
    label: "community.cta.catalog.label",
    value: "catalog",
    description: "community.cta.catalog.description",
    icon: "i-ph-storefront-fill",
  },
  {
    label: "community.cta.booking.label",
    value: "booking",
    description: "community.cta.booking.description",
    icon: "i-ph-calendar-check-fill",
  },
  {
    label: "community.cta.call.label",
    value: "call",
    description: "community.cta.call.description",
    icon: "i-ph-phone-call-fill",
  },
]

export const communityGroupTabs: Array<{ label: string; value: CommunityGroupTab }> = [
  { label: "community.tabs.groups.mine", value: "mine" },
  { label: "community.tabs.groups.suggested", value: "suggested" },
  { label: "community.tabs.groups.joined", value: "joined" },
]

export const communityPageTabs: Array<{ label: string; value: CommunityPageTab }> = [
  { label: "community.tabs.pages.mine", value: "mine" },
  { label: "community.tabs.pages.suggested", value: "suggested" },
  { label: "community.tabs.pages.favorite", value: "favorite" },
]

export const communityPageRouteMap: Record<CommunityPageTab, string> = {
  mine: appRoutes.pages,
  suggested: appRoutes.suggestedPages,
  favorite: appRoutes.likedPages,
}

export const communityGroupRouteMap: Record<CommunityGroupTab, string> = {
  mine: appRoutes.groups,
  suggested: appRoutes.suggestedGroups,
  joined: appRoutes.joinedGroups,
}

// Description: Creates normalized community draft objects without UI-only fallback copy.

import { normalizeLocationSelection } from "../../../location/domain/types/location.types"
import { getDefaultCommunityCategory, getDefaultCommunityPageCategory } from "../../domain/services/community-helpers.service"
import type {
  CommunityDraft,
  CommunityGroupRecord,
  CommunityGroupSettingsDraft,
  CommunityPageRecord,
  CommunityPageSettingsDraft,
} from "../../domain/types/community.types"

export function createCommunityGroupSettingsDraft(
  group?: CommunityGroupRecord,
): CommunityGroupSettingsDraft {
  return {
    name: group?.name ?? "",
    slug: group?.slug ?? "",
    summary: group?.summary ?? "",
    website: group?.website ?? "",
    locationLabel: group?.locationLabel ?? "",
    privacy: group?.privacy ?? "public",
    category: group?.category ?? getDefaultCommunityCategory(),
    tags: group?.tags.join(", ") ?? "",
    guidelines: group?.guidelines?.join("\n") ?? "",
    joinApproval: group?.joinApproval ?? group?.privacy !== "public",
    postApproval: group?.postApproval ?? (group?.privacy === "private" || group?.privacy === "secret"),
    allowMemberInvites: group?.allowMemberInvites ?? true,
    showMemberDirectory: group?.showMemberDirectory ?? true,
    welcomePostEnabled: group?.welcomePostEnabled ?? true,
    avatarUrl: group?.avatar,
    bannerUrl: group?.bannerUrl || group?.banner,
  }
}

export function createCommunityGroupDraft(group?: CommunityGroupRecord): CommunityDraft {
  return {
    name: group?.name ?? "",
    slug: group?.slug ?? "",
    description: group?.summary ?? "",
    privacy: group?.privacy ?? "public",
    category: group?.category ?? getDefaultCommunityCategory(),
  }
}

export function createCommunityPageSettingsDraft(
  page?: CommunityPageRecord,
): CommunityPageSettingsDraft {
  return {
    name: page?.name ?? "",
    slug: page?.slug ?? "",
    summary: page?.summary ?? "",
    website: page?.website ?? "",
    locationLabel: page?.locationLabel ?? "",
    location: normalizeLocationSelection({
      address: page?.locationLabel ?? "",
      lat: page?.lat ?? null,
      lng: page?.lng ?? null,
      placeId: page?.placeId ?? "",
    }),
    category: page?.category ?? getDefaultCommunityPageCategory(),
    ctaLabel: page?.ctaLabel ?? "",
    responseLabel: page?.responseLabel ?? "",
    ownerLabel: page?.ownerLabel ?? "",
    tags: page?.tags.join(", ") ?? "",
    allowMessages: true,
    showFollowerCount: true,
    showLikeCount: true,
    showWebsite: true,
    recommendRelatedPages: true,
    avatarUrl: page?.avatarUrl,
    bannerUrl: page?.banner,
  }
}

export function createCommunityPageDraft(page?: CommunityPageRecord): CommunityDraft {
  return {
    name: page?.name ?? "",
    slug: page?.slug ?? "",
    description: page?.summary ?? "",
    privacy: "public",
    category: page?.category ?? getDefaultCommunityPageCategory(),
    location: normalizeLocationSelection({
      address: page?.locationLabel ?? "",
      lat: page?.lat ?? null,
      lng: page?.lng ?? null,
      placeId: page?.placeId ?? "",
    }),
  }
}

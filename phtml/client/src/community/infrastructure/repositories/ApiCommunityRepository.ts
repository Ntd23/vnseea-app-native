// English description: Nuxt API backed repository for community groups, pages, and management flows.

import { apiRoutes } from "#shared-kernel/application/constants/route-registry"
import { useNuxtApiClient } from "#shared-kernel/infrastructure/http/nuxt-api-client"
import type { FeedPostsResponse } from "../../../feed/domain/types/feed.types"
import type { CommunityRepository } from "../../domain/repositories/CommunityRepository"
import type { UserRecord } from "../../../shared-kernel/domain/types/user.types"
import type {
  CommunityDraft,
  CommunityGroupRecord,
  CommunityGroupSettingsDraft,
  CommunityGroupTab,
  CommunityPageFollowerRecord,
  CommunityPageRecord,
  CommunityPageSettingsDraft,
  CommunityPageTab,
} from "../../domain/types/community.types"

export function createApiCommunityRepository(): CommunityRepository {
  const client = useNuxtApiClient()

  return {
    async getGroups(mode: CommunityGroupTab) {
      return await client.get<CommunityGroupRecord[]>(apiRoutes.community.groups, { mode })
    },
    async getGroupBySlug(slug: string) {
      return await client.get<CommunityGroupRecord | null>(apiRoutes.community.groupBySlug(slug))
    },
    async createGroup(input: CommunityDraft) {
      return await client.post<CommunityGroupRecord, CommunityDraft>(apiRoutes.community.groups, input)
    },
    async updateGroup(slug: string, input: CommunityGroupSettingsDraft) {
      if (input.avatarFile || input.bannerFile) {
        const formData = new FormData()

        Object.entries(input).forEach(([key, value]) => {
          if (
            value !== undefined &&
            value !== null &&
            !["avatarFile", "bannerFile", "avatarUrl", "bannerUrl"].includes(key)
          ) {
            formData.append(key, String(value))
          }
        })
        if (input.avatarFile) formData.append("avatar", input.avatarFile)
        if (input.bannerFile) formData.append("banner", input.bannerFile)

        return await client.put<CommunityGroupRecord>(
          apiRoutes.community.groupBySlug(slug),
          formData as any,
        )
      }

      return await client.put<CommunityGroupRecord, CommunityGroupSettingsDraft>(
        apiRoutes.community.groupBySlug(slug),
        input,
      )
    },
    async joinGroup(slug: string) {
      return await client.post<CommunityGroupRecord>(apiRoutes.community.groupJoin(slug))
    },
    async getGroupRequests(slug: string) {
      return await client.get<UserRecord[]>(apiRoutes.community.groupRequests(slug))
    },
    async respondToGroupRequest(slug: string, userId: number, action: "accept" | "decline") {
      await client.post<void>(apiRoutes.community.groupRequestsAction(slug), { userId, action })
    },
    async getGroupMembers(slug: string) {
      return await client.get<UserRecord[]>(apiRoutes.community.groupMembers(slug))
    },
    async kickGroupMember(slug: string, userId: number) {
      await client.post<void>(apiRoutes.community.groupMemberKick(slug), { userId })
    },
    async getGroupPosts(slug, input) {
      return await client.get<FeedPostsResponse>(apiRoutes.community.groupPosts(slug), {
        limit: input?.limit,
        afterPostId: input?.afterPostId,
      })
    },
    async getPages(mode: CommunityPageTab) {
      return await client.get<CommunityPageRecord[]>(apiRoutes.community.pages, { mode })
    },
    async getPageBySlug(slug: string) {
      return await client.get<CommunityPageRecord | null>(apiRoutes.community.pageBySlug(slug))
    },
    async createPage(input: CommunityDraft) {
      return await client.post<CommunityPageRecord, CommunityDraft>(apiRoutes.community.pages, input)
    },
    async updatePage(slug: string, input: CommunityPageSettingsDraft) {
      const formData = new FormData()
      const fields: Array<keyof CommunityPageSettingsDraft> = [
        "name",
        "slug",
        "summary",
        "website",
        "locationLabel",
        "category",
        "ctaLabel",
        "responseLabel",
        "ownerLabel",
        "allowMessages",
        "showFollowerCount",
        "showLikeCount",
        "showWebsite",
        "recommendRelatedPages",
      ]

      fields.forEach((key) => {
        const value = input[key]

        if (value !== undefined && value !== null) {
          formData.append(key, typeof value === "boolean" ? (value ? "1" : "0") : String(value))
        }
      })

      if (input.location) {
        formData.set("locationLabel", input.location.address)

        if (input.location.lat !== null) {
          formData.set("lat", String(input.location.lat))
        }

        if (input.location.lng !== null) {
          formData.set("lng", String(input.location.lng))
        }

        if (input.location.placeId) {
          formData.set("placeId", input.location.placeId)
        }
      }

      if (input.avatarFile) formData.append("avatar", input.avatarFile)
      if (input.bannerFile) formData.append("banner", input.bannerFile)

      return await client.put<CommunityPageRecord, CommunityPageSettingsDraft>(
        apiRoutes.community.pageBySlug(slug),
        formData as any,
      )
    },
    async followPage(slug: string) {
      return await client.post<CommunityPageRecord>(apiRoutes.community.pageFollow(slug))
    },
    async likePage(slug: string) {
      return await client.post<CommunityPageRecord>(apiRoutes.community.pageLike(slug))
    },
    async getPageFollowers(slug: string) {
      return await client.get<CommunityPageFollowerRecord[]>(apiRoutes.community.pageFollowers(slug))
    },
    async getPageInvites(slug: string) {
      return await client.get<UserRecord[]>(apiRoutes.community.pageInvites(slug))
    },
    async sendPageInvite(slug: string, userId: number) {
      await client.post<void, { userId: number }>(apiRoutes.community.pageInvite(slug), { userId })
    },
    async getPagePosts(slug, input) {
      return await client.get<FeedPostsResponse>(apiRoutes.community.pagePosts(slug), {
        limit: input?.limit,
        afterPostId: input?.afterPostId,
      })
    },
    async deletePage(id: number, password: string) {
      await client.request<void, { password: string }>(
        apiRoutes.community.pageById(id),
        {
          method: "DELETE",
          body: { password },
        },
      )
    },
    async deleteGroup(slug: string, password: string) {
      await client.request<void, { password: string }>(
        apiRoutes.community.groupBySlug(slug),
        {
          method: "DELETE",
          body: { password },
        },
      )
    },
  }
}

// English description: Repository contract for community directory, detail, and management API operations.

import type {
  FeedPostsResponse,
} from "../../../feed/domain/types/feed.types"
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
} from "../types/community.types"

export interface CommunityRepository {
  getGroups(mode: CommunityGroupTab): Promise<CommunityGroupRecord[]>
  getGroupBySlug(slug: string): Promise<CommunityGroupRecord | null>
  getGroupPosts(slug: string, input?: { limit?: number; afterPostId?: number }): Promise<FeedPostsResponse>
  createGroup(input: CommunityDraft): Promise<CommunityGroupRecord>
  updateGroup(slug: string, input: CommunityGroupSettingsDraft): Promise<CommunityGroupRecord>
  joinGroup(slug: string): Promise<CommunityGroupRecord>
  getGroupRequests(slug: string): Promise<UserRecord[]>
  respondToGroupRequest(slug: string, userId: number, action: "accept" | "decline"): Promise<void>
  getGroupMembers(slug: string): Promise<UserRecord[]>
  kickGroupMember(slug: string, userId: number): Promise<void>
  getPages(mode: CommunityPageTab): Promise<CommunityPageRecord[]>
  getPageBySlug(slug: string): Promise<CommunityPageRecord | null>
  createPage(input: CommunityDraft): Promise<CommunityPageRecord>
  updatePage(slug: string, input: CommunityPageSettingsDraft): Promise<CommunityPageRecord>
  followPage(slug: string): Promise<CommunityPageRecord>
  likePage(slug: string): Promise<CommunityPageRecord>
  getPageFollowers(slug: string): Promise<CommunityPageFollowerRecord[]>
  getPageInvites(slug: string): Promise<UserRecord[]>
  sendPageInvite(slug: string, userId: number): Promise<void>
  getPagePosts(slug: string, input?: { limit?: number; afterPostId?: number }): Promise<FeedPostsResponse>
  deletePage(id: number, password: string): Promise<void>
  deleteGroup(slug: string, password: string): Promise<void>
}

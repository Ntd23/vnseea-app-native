// English description: Repository contract for loading backend-backed profile data by username.

import type { ProfileActionResult, ProfileApiResponse, ProfilePostsResponse } from "../types/profile.types"

export interface ProfileRepository {
  getProfileByUsername(username: string): Promise<ProfileApiResponse | null>
  getProfilePosts(input: {
    username: string
    afterPostId?: number | null
  }): Promise<ProfilePostsResponse>
  runProfileAction(input: {
    action: "follow"
    userId: number
  }): Promise<ProfileActionResult>
}

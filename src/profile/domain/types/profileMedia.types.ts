export type ProfileMediaKind = 'avatar' | 'cover';

export type ProfileMediaPostType = 'profile_picture' | 'profile_cover_picture';

export interface ProfileMediaUpdateResult {
  kind: ProfileMediaKind;
  url: string;
  fullUrl: string;
  postId: string;
  postType: ProfileMediaPostType;
  reconciled?: boolean;
}

export interface ProfileMediaSnapshot {
  avatarUrl?: string;
  coverUrl?: string;
  avatarPostId?: string;
  coverPostId?: string;
}

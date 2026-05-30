// Description: Domain model for posts saved by the current user.
export type SavedItemKind = 'text' | 'photo' | 'video';

export interface SavedItem {
  id: string;
  title: string;
  author: string;
  postedAt?: number;
  imageUrl?: string;
  kind: SavedItemKind;
  postUrl?: string;
}

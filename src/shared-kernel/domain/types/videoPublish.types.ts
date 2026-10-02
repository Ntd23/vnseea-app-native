// Description: Where a post, reel or story held back for its Bunny Stream video stands on the server.

/**
 * The server creates the post, reel or story only once its video is encoded
 * (`publishState` "published"), or drops it when encoding fails ("discarded").
 */
export interface VideoPublishStatus {
  uploadId: string;
  status: 'processing' | 'ready' | 'failed';
  publishState: string;
  needsReview: boolean;
  postId?: string;
  storyId?: string;
}

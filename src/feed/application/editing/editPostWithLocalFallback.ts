import type { PostPrivacy } from '../../domain/types/feed.types';
import { localPostEditsStorage } from '../../infrastructure/storage/localPostEditsStorage';
import { postEditedEvents } from '../events/postEditedEvents';

export type PostEditPersistence = 'server' | 'local';

export type PostEditWithFallbackResult = {
  edited: boolean;
  persistence: PostEditPersistence;
};

type RemotePostEditor = (
  postId: string,
  input: { text: string; privacy?: PostPrivacy },
) => Promise<{ edited: boolean }>;

export async function editPostWithLocalFallback(
  remoteEdit: RemotePostEditor,
  postId: string,
  input: { text: string; privacy?: PostPrivacy },
): Promise<PostEditWithFallbackResult> {
  try {
    const result = await remoteEdit(postId, input);
    if (result.edited) {
      localPostEditsStorage.removeCaptionEdit(postId);
      postEditedEvents.emit({
        postId,
        text: input.text,
        persistence: 'server',
      });
      return { edited: true, persistence: 'server' };
    }
  } catch (caught) {
    console.warn(
      '[editPostWithLocalFallback] Server edit unavailable; saved locally',
      caught,
    );
  }

  localPostEditsStorage.saveCaptionEdit(postId, input.text);
  postEditedEvents.emit({
    postId,
    text: input.text,
    persistence: 'local',
  });
  return { edited: true, persistence: 'local' };
}

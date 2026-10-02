// Description: Builds the "8 ảnh" style count label shown above a chat media stack.
import type { MessageItem } from '../../domain/types/messages.types';
import type { AppLanguage } from '../../../shared-kernel/infrastructure/storage/languageStorage';

export function formatMediaGroupLabel(
  messages: Pick<MessageItem, 'mediaType'>[],
  language: AppLanguage,
) {
  const videos = messages.filter(message => message.mediaType === 'video').length;
  const photos = messages.length - videos;

  if (language === 'en') {
    const photoText = `${photos} ${photos === 1 ? 'photo' : 'photos'}`;
    const videoText = `${videos} ${videos === 1 ? 'video' : 'videos'}`;
    if (videos === 0) return photoText;
    if (photos === 0) return videoText;
    return `${photoText}, ${videoText}`;
  }

  if (videos === 0) return `${photos} ảnh`;
  if (photos === 0) return `${videos} video`;
  return `${photos} ảnh, ${videos} video`;
}

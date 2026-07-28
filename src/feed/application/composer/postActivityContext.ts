import type { AppLanguage } from '../../../shared-kernel/infrastructure/storage/languageStorage';
import type {
  PostFeeling,
  PostLocation,
  PostTaggedUser,
} from '../../domain/types/feed.types';

const FEELING_LABELS: Record<AppLanguage, Record<string, string>> = {
  vi: {
    happy: 'vui vẻ',
    loved: 'được yêu',
    lovely: 'yêu thương',
    funny: 'vui nhộn',
    cool: 'ngầu',
    blessed: 'may mắn',
    pretty: 'thư thái',
    smirk: 'đắc ý',
    sad: 'buồn',
    so_sad: 'rất buồn',
    angry: 'tức giận',
    tired: 'mệt mỏi',
    sleepy: 'buồn ngủ',
    bored: 'chán',
    confused: 'bối rối',
    shocked: 'sốc',
    broke: 'tan vỡ',
    expressionless: 'vô cảm',
  },
  en: {
    happy: 'happy',
    loved: 'loved',
    lovely: 'lovely',
    funny: 'funny',
    cool: 'cool',
    blessed: 'blessed',
    pretty: 'relaxed',
    smirk: 'smug',
    sad: 'sad',
    so_sad: 'very sad',
    angry: 'angry',
    tired: 'tired',
    sleepy: 'sleepy',
    bored: 'bored',
    confused: 'confused',
    shocked: 'shocked',
    broke: 'brokenhearted',
    expressionless: 'expressionless',
  },
};

export interface PostActivityContextInput {
  language: AppLanguage;
  feeling?: PostFeeling;
  taggedUsers?: PostTaggedUser[];
  location?: PostLocation;
}

export interface PostActivityContextParts {
  beforeTaggedUsers: string;
  taggedUsersLabel: string;
  afterTaggedUsers: string;
  segments: PostActivityContextSegment[];
  fullText: string;
}

export type PostActivityContextSegmentKind =
  | 'text'
  | 'feeling'
  | 'tagged_users'
  | 'location';

export interface PostActivityContextSegment {
  kind: PostActivityContextSegmentKind;
  text: string;
}

export function getPostFeelingLabel(
  feeling: PostFeeling,
  language: AppLanguage,
): string {
  return (
    FEELING_LABELS[language]?.[feeling.value] ??
    feeling.label?.trim() ??
    feeling.value
  );
}

function getTaggedUsersLabel(
  users: PostTaggedUser[],
  language: AppLanguage,
): string {
  const firstName = users[0]?.name?.trim();
  if (!firstName) return '';
  const remaining = users.length - 1;
  if (remaining < 1) return firstName;
  return language === 'vi'
    ? `${firstName} và ${remaining} người khác`
    : `${firstName} and ${remaining} ${remaining === 1 ? 'other' : 'others'}`;
}

export function buildPostActivityContext({
  language,
  feeling,
  taggedUsers = [],
  location,
}: PostActivityContextInput): PostActivityContextParts {
  const feelingLabel = feeling
    ? getPostFeelingLabel(feeling, language)
    : '';
  const taggedUsersLabel = getTaggedUsersLabel(taggedUsers, language);
  const locationLabel = location?.label?.trim() ?? '';

  let beforeTaggedUsers = '';
  let afterTaggedUsers = '';

  if (feelingLabel) {
    beforeTaggedUsers =
      language === 'vi'
        ? `hiện đang cảm thấy ${feelingLabel}`
        : `is feeling ${feelingLabel}`;
  }

  if (taggedUsersLabel) {
    const withPrefix = language === 'vi' ? 'cùng với ' : 'is with ';
    beforeTaggedUsers = beforeTaggedUsers
      ? `${beforeTaggedUsers} ${language === 'vi' ? 'cùng với ' : 'with '}`
      : withPrefix;
  }

  if (locationLabel) {
    const locationText =
      language === 'vi' ? `tại ${locationLabel}` : `in ${locationLabel}`;
    if (taggedUsersLabel) {
      afterTaggedUsers = ` ${locationText}`;
    } else if (beforeTaggedUsers) {
      beforeTaggedUsers = `${beforeTaggedUsers} ${locationText}`;
    } else {
      beforeTaggedUsers = language === 'vi'
        ? `đang ở ${locationLabel}`
        : `is in ${locationLabel}`;
    }
  }

  const segments: PostActivityContextSegment[] = [];

  if (feelingLabel) {
    segments.push({
      kind: 'text',
      text: language === 'vi' ? 'hiện đang cảm thấy ' : 'is feeling ',
    });
    segments.push({ kind: 'feeling', text: feelingLabel });
  }

  if (taggedUsersLabel) {
    segments.push({
      kind: 'text',
      text: feelingLabel
        ? language === 'vi'
          ? ' cùng với '
          : ' with '
        : language === 'vi'
          ? 'cùng với '
          : 'is with ',
    });
    segments.push({ kind: 'tagged_users', text: taggedUsersLabel });
  }

  if (locationLabel) {
    segments.push({
      kind: 'text',
      text:
        feelingLabel || taggedUsersLabel
          ? language === 'vi'
            ? ' tại '
            : ' in '
          : language === 'vi'
            ? 'đang ở '
            : 'is in ',
    });
    segments.push({ kind: 'location', text: locationLabel });
  }

  const fullText = segments.map(segment => segment.text).join('');
  return {
    beforeTaggedUsers,
    taggedUsersLabel,
    afterTaggedUsers,
    segments,
    fullText,
  };
}

export const POST_FEELING_LABELS = FEELING_LABELS;

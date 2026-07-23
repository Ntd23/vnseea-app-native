import type { ProfileMediaActivity } from '../../domain/types/feed.types';

type ProfileMediaActivityCopy = {
  updatedProfilePicture: string;
  updatedCoverPhoto: string;
};

export function mapProfileMediaActivity(
  postType: unknown,
): ProfileMediaActivity | undefined {
  if (postType === 'profile_picture') {
    return 'updated_profile_picture';
  }
  if (postType === 'profile_cover_picture') {
    return 'updated_cover_photo';
  }
  return undefined;
}

export function getProfileMediaActivityLabel(
  activity: ProfileMediaActivity | undefined,
  copy: ProfileMediaActivityCopy,
) {
  if (activity === 'updated_profile_picture') {
    return copy.updatedProfilePicture;
  }
  if (activity === 'updated_cover_photo') {
    return copy.updatedCoverPhoto;
  }
  return '';
}

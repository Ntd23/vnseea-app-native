export const PROFILE_AVATAR_ASPECT_RATIO = 1;
export const PROFILE_COVER_ASPECT_RATIO = 16 / 9;

export const PROFILE_AVATAR_OUTPUT_SIZE = {
  width: 1080,
  height: 1080,
} as const;

export const PROFILE_COVER_OUTPUT_SIZE = {
  // Keep the exact canonical dimensions expected by deployed profile-media
  // endpoints. The source preview is already downsampled before this export,
  // so producing 1600x900 here no longer requires decoding the original photo.
  width: 1600,
  height: 900,
} as const;

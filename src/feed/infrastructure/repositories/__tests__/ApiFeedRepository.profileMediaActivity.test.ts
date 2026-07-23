import { mapProfileMediaActivity } from '../../../application/mappers/profileMediaActivity';

describe('profile media activity mapping', () => {
  it('maps avatar and cover update post types to stable activities', () => {
    expect(mapProfileMediaActivity('profile_picture')).toBe(
      'updated_profile_picture',
    );
    expect(mapProfileMediaActivity('profile_cover_picture')).toBe(
      'updated_cover_photo',
    );
  });

  it('does not add an activity label to regular posts', () => {
    expect(mapProfileMediaActivity('photo')).toBeUndefined();
  });
});

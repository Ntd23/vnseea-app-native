import { mapUserProfile } from '../userProfileMapper';

const WEB_BASE_URL = 'https://v2.vnseea.vn';

describe('profile avatar post mapping', () => {
  it('maps a valid avatar post id for profile media navigation', () => {
    const profile = mapUserProfile(
      {
        user_id: 7,
        username: 'admin',
        avatar_post_id: 321,
      },
      WEB_BASE_URL,
    );

    expect(profile.avatarPostId).toBe('321');
  });

  it.each([0, '0', '', null, undefined])(
    'does not expose an invalid avatar post id: %p',
    avatarPostId => {
      const profile = mapUserProfile(
        {
          user_id: 7,
          username: 'admin',
          avatar_post_id: avatarPostId,
        },
        WEB_BASE_URL,
      );

      expect(profile.avatarPostId).toBeUndefined();
    },
  );

  it('maps a valid cover post id for canonical cover reconciliation', () => {
    const profile = mapUserProfile(
      {
        user_id: 7,
        username: 'admin',
        cover_post_id: 654,
      },
      WEB_BASE_URL,
    );

    expect(profile.coverPostId).toBe('654');
  });

  it.each([0, '0', '', null, undefined])(
    'does not expose an invalid cover post id: %p',
    coverPostId => {
      const profile = mapUserProfile(
        {
          user_id: 7,
          username: 'admin',
          cover_post_id: coverPostId,
        },
        WEB_BASE_URL,
      );

      expect(profile.coverPostId).toBeUndefined();
    },
  );
});

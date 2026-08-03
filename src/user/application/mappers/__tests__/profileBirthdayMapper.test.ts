import { mapUserProfile } from '../userProfileMapper';

describe('profile birthday mapping', () => {
  it('keeps the birthday returned after account registration', () => {
    const profile = mapUserProfile(
      {
        user_id: 7,
        username: 'birthday_user',
        birthday: '1995-04-21',
      },
      'https://vnseea.vn',
    );

    expect(profile.birthday).toBe('1995-04-21');
  });
});

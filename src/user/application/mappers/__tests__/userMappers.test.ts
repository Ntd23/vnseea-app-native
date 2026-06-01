// Description: Verifies user profile and payload mappers for the user API bridge.
import { mapUserProfile } from '../userProfileMapper';
import {
  toNearbyUsersPayload,
  toUpdateCurrentUserPayload,
  toUserProfileFetchValue,
  toUserSuggestionsPayload,
} from '../userPayloadMapper';

const WEB_BASE_URL = 'https://v2.vnseea.vn';

describe('userProfileMapper', () => {
  it('maps raw user records into profile domain data', () => {
    expect(
      mapUserProfile(
        {
          user_id: 7,
          username: 'admin',
          name: 'Admin User',
          avatar: '/upload/avatar.jpg',
          cover: '/upload/cover.jpg',
          verified: '1',
          email: 'admin@gmail.com',
          phone_number: '0900000000',
          gender: 'male',
          gender_text: 'Male',
          about: 'About admin',
          admin: '1',
          active: '1',
          is_pro: 0,
          is_following: 2,
          can_follow: 1,
          is_following_me: '0',
          notification_settings: {
            e_liked: 1,
          },
        },
        WEB_BASE_URL,
      ),
    ).toEqual(
      expect.objectContaining({
        id: '7',
        username: 'admin',
        name: 'Admin User',
        avatarUrl: 'https://v2.vnseea.vn/upload/avatar.jpg',
        coverUrl: 'https://v2.vnseea.vn/upload/cover.jpg',
        verified: true,
        email: 'admin@gmail.com',
        phoneNumber: '0900000000',
        gender: 'male',
        genderText: 'Male',
        about: 'About admin',
        admin: true,
        active: true,
        pro: false,
        followingState: 'requested',
        canFollow: true,
        followsCurrentUser: false,
        notificationSettings: {
          e_liked: 1,
        },
      }),
    );
  });
});

describe('userPayloadMapper', () => {
  it('maps profile fetch options into WoWonder fetch string', () => {
    expect(
      toUserProfileFetchValue({
        followers: true,
        following: true,
        likedPages: true,
      }),
    ).toBe('user_data,followers,following,liked_pages');
  });

  it('maps suggestions input into API payload', () => {
    expect(
      toUserSuggestionsPayload({
        limit: 10,
        contacts: '0900000000',
      }),
    ).toEqual({
      limit: 10,
      contacts: '0900000000',
    });
  });

  it('maps nearby input into API payload field names', () => {
    expect(
      toNearbyUsersPayload({
        limit: 20,
        offset: 40,
        keyword: 'admin',
        relationship: 'single',
        lat: 10,
        lng: 20,
      }),
    ).toEqual({
      limit: 20,
      offset: 40,
      keyword: 'admin',
      relship: 'single',
      lat: 10,
      lng: 20,
    });
  });

  it('maps update input into WoWonder profile field names', () => {
    expect(
      toUpdateCurrentUserPayload({
        username: 'admin',
        phoneNumber: '0900000000',
        firstName: 'Admin',
        lastName: 'User',
        relationshipId: '1',
        messagePrivacy: 0,
        showLastSeen: 1,
        shareLocation: false,
      }),
    ).toEqual({
      username: 'admin',
      phone_number: '0900000000',
      first_name: 'Admin',
      last_name: 'User',
      relationship: '1',
      message_privacy: 0,
      showlastseen: 1,
      share_my_location: false,
    });
  });
});

// Description: Verifies user profile and payload mappers for the user API bridge.
import { mapUserProfile } from '../userProfileMapper';
import { mapNearbyPage, mapNearbyPlace } from '../nearbyPlaceMapper';
import {
  toNearbyPagesQuery,
  toNearbyPlacesPayload,
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

  it('maps nearby places input into nearby endpoint field names', () => {
    expect(
      toNearbyPlacesPayload({
        limit: 20,
        offset: 40,
        keyword: 'cafe',
        distance: 25,
      }),
    ).toEqual({
      limit: 20,
      offset: 40,
      name: 'cafe',
      distance: 25,
    });
  });

  it('maps nearby page input into the existing web handler query', () => {
    expect(
      toNearbyPagesQuery({
        limit: 20,
        keyword: 'cafe',
        distance: 25,
        lat: 21.0285,
        lng: 105.8542,
      }),
    ).toEqual({
      application: 'phone',
      f: 'explore_nearby_suggestions',
      type: 'page',
      query: 'cafe',
      distance: 25,
      limit: 20,
      origin_lat: 21.0285,
      origin_lng: 105.8542,
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
      relationship_id: '1',
      message_privacy: 0,
      showlastseen: 1,
      share_my_location: false,
    });
  });
});

describe('nearbyPlaceMapper', () => {
  it('maps an independent nearby page from the website discovery handler', () => {
    expect(
      mapNearbyPage(
        {
          id: '19',
          title: 'VNSEEA Page',
          subtitle: '@vnseeapage',
          description: 'Trang cộng đồng',
          avatar: '/upload/page.jpg',
          url: 'https://v2.vnseea.vn/vnseeapage',
          location: 'Hà Nội',
          lat: '21.0285',
          lng: '105.8542',
          distance_meters: '1250',
        },
        WEB_BASE_URL,
      ),
    ).toEqual({
      id: 'page:19',
      pageId: '19',
      kind: 'page',
      source: 'page',
      placeId: undefined,
      name: 'VNSEEA Page',
      username: 'vnseeapage',
      avatarUrl: 'https://v2.vnseea.vn/upload/page.jpg',
      url: 'https://v2.vnseea.vn/vnseeapage',
      description: 'Trang cộng đồng',
      location: 'Hà Nội',
      distance: 1.25,
      distanceMeters: 1250,
      mapPinStatus: undefined,
      mapPinApproved: false,
      isPinned: false,
      coordinate: {
        latitude: 21.0285,
        longitude: 105.8542,
      },
    });
  });

  it('hydrates page id, address, and coordinates from nested page_data', () => {
    expect(
      mapNearbyPage(
        {
          page_data: {
            page_id: '27',
            page_title: 'Tiệm tóc nested',
            page_name: 'tiemto nested',
            address: 'Cầu Giấy, Hà Nội',
            latitude: '21.035',
            longitude: '105.79',
          },
        },
        WEB_BASE_URL,
      ),
    ).toEqual(
      expect.objectContaining({
        id: 'page:27',
        pageId: '27',
        name: 'Tiệm tóc nested',
        location: 'Cầu Giấy, Hà Nội',
        coordinate: {
          latitude: 21.035,
          longitude: 105.79,
        },
      }),
    );
  });

  it('prefers top-level coordinates and rejects invalid page coordinates', () => {
    expect(
      mapNearbyPage(
        {
          id: '28',
          title: 'Top level wins',
          lat: '21.02',
          lng: '105.8',
          page_data: {
            lat: '999',
            lng: '999',
          },
        },
        WEB_BASE_URL,
      )?.coordinate,
    ).toEqual({ latitude: 21.02, longitude: 105.8 });

    expect(
      mapNearbyPage(
        {
          id: '29',
          title: 'Invalid coordinate',
          lat: '91',
          lng: '105.8',
        },
        WEB_BASE_URL,
      )?.coordinate,
    ).toBeUndefined();
  });

  it('maps a nearby shop page and product location', () => {
    expect(
      mapNearbyPlace(
        {
          distance: '1.25',
          page_data: {
            page_id: '17',
            name: 'VNSEEA Store',
            username: 'vnseeastore',
            avatar: '/upload/store.jpg',
            category: 'Mua sắm',
            url: 'https://v2.vnseea.vn/vnseeastore',
          },
          product: {
            id: '5',
            lat: '21.0285',
            lng: '105.8542',
            location: 'Hà Nội',
          },
        },
        'shop',
        WEB_BASE_URL,
      ),
    ).toEqual({
      id: 'shop:17',
      pageId: '17',
      kind: 'shop',
      name: 'VNSEEA Store',
      username: 'vnseeastore',
      avatarUrl: 'https://v2.vnseea.vn/upload/store.jpg',
      url: 'https://v2.vnseea.vn/vnseeastore',
      category: 'Mua sắm',
      description: undefined,
      location: 'Hà Nội',
      distance: 1.25,
      coordinate: {
        latitude: 21.0285,
        longitude: 105.8542,
      },
    });
  });

  it('maps a nearby business page and job location', () => {
    expect(
      mapNearbyPlace(
        {
          page_data: {
            page_id: '18',
            name: 'VNSEEA Jobs',
            username: 'vnseeajobs',
          },
          job: {
            id: '6',
            lat: 10.7769,
            lng: 106.7009,
            location: 'TP. Hồ Chí Minh',
          },
        },
        'business',
        WEB_BASE_URL,
      ),
    ).toEqual(
      expect.objectContaining({
        id: 'business:18',
        kind: 'business',
        name: 'VNSEEA Jobs',
        location: 'TP. Hồ Chí Minh',
        coordinate: {
          latitude: 10.7769,
          longitude: 106.7009,
        },
      }),
    );
  });
});

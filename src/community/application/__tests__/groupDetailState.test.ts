import {
  normalizeHostedMediaUrl,
  resolveGroupMembershipStatus,
} from '../groupDetailState';

describe('group detail state', () => {
  describe('resolveGroupMembershipStatus', () => {
    it('prioritizes group ownership', () => {
      expect(
        resolveGroupMembershipStatus({
          is_owner: 1,
          is_group_joined: 0,
        }),
      ).toBe('owner');
    });

    it('does not treat a pending join request as active membership', () => {
      expect(resolveGroupMembershipStatus({ is_group_joined: 2 })).toBe(
        'requested',
      );
      expect(resolveGroupMembershipStatus({ is_group_joined: 1 })).toBe(
        'joined',
      );
      expect(resolveGroupMembershipStatus({ is_group_joined: 0 })).toBe(
        'not_joined',
      );
    });

    it('accepts the canonical backend membership status', () => {
      expect(
        resolveGroupMembershipStatus({
          membership_status: 'requested',
          is_group_joined: 1,
        }),
      ).toBe('requested');
    });
  });

  describe('normalizeHostedMediaUrl', () => {
    const webBaseUrl = 'https://v2.vnseea.vn';

    it('builds absolute HTTPS URLs for relative and protocol-relative media', () => {
      expect(
        normalizeHostedMediaUrl('upload/photos/group.jpg', webBaseUrl),
      ).toBe('https://v2.vnseea.vn/upload/photos/group.jpg');
      expect(
        normalizeHostedMediaUrl('//v2.vnseea.vn/upload/group.jpg', webBaseUrl),
      ).toBe('https://v2.vnseea.vn/upload/group.jpg');
      expect(
        normalizeHostedMediaUrl(
          'upload/photos/group.jpg',
          webBaseUrl,
          'https://media.vnseea.vn',
        ),
      ).toBe('https://media.vnseea.vn/upload/photos/group.jpg');
    });

    it('upgrades same-host HTTP media without changing external HTTPS media', () => {
      expect(
        normalizeHostedMediaUrl(
          'http://v2.vnseea.vn/upload/group.jpg',
          webBaseUrl,
        ),
      ).toBe('https://v2.vnseea.vn/upload/group.jpg');
      expect(
        normalizeHostedMediaUrl(
          'https://cdn.example.com/group.jpg',
          webBaseUrl,
        ),
      ).toBe('https://cdn.example.com/group.jpg');
    });
  });
});

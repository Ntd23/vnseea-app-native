import {
  assertNotSelfGroupMemberRemoval,
  isSelfGroupMemberRemoval,
  SELF_GROUP_MEMBER_REMOVAL_MESSAGE,
} from '../groupMemberRemoval';

describe('group member removal policy', () => {
  it('recognizes the signed-in account across string and number ids', () => {
    expect(isSelfGroupMemberRemoval('42', 42)).toBe(true);
    expect(isSelfGroupMemberRemoval(' 42 ', '42')).toBe(true);
  });

  it('allows another member and ignores missing session identity', () => {
    expect(isSelfGroupMemberRemoval('42', '43')).toBe(false);
    expect(isSelfGroupMemberRemoval(undefined, '42')).toBe(false);
  });

  it('blocks self-removal through the destructive member action', () => {
    expect(() => assertNotSelfGroupMemberRemoval('42', '42')).toThrow(
      SELF_GROUP_MEMBER_REMOVAL_MESSAGE,
    );
  });
});

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../../../../../');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('profile media activity identity label', () => {
  it('defines localized avatar and cover update labels', () => {
    const copy = read('src/feed/presentation/components/PostCards.tsx');

    expect(copy).toContain("updatedProfilePicture: 'đã cập nhật ảnh đại diện'");
    expect(copy).toContain("updatedCoverPhoto: 'đã cập nhật ảnh bìa'");
    expect(copy).toContain("updatedProfilePicture: 'updated their profile picture'");
    expect(copy).toContain("updatedCoverPhoto: 'updated their cover photo'");
  });

  it('renders the activity after the bold name in the shared post header', () => {
    const source = read('src/feed/presentation/components/PostCards.tsx');

    expect(source).toContain('getProfileMediaActivityLabel(post?.activity, copy)');
    expect(source).toContain('{activityLabel ?');
    expect(source).toContain('numberOfLines={activityLabel ? 2 : 1}');
  });

  it('preserves the backend post type when mapping feed posts', () => {
    const source = read(
      'src/feed/infrastructure/repositories/ApiFeedRepository.ts',
    );

    expect(source).toContain(
      "activity: mapProfileMediaActivity(readString(raw, 'postType', 'post_type'))",
    );
  });
});

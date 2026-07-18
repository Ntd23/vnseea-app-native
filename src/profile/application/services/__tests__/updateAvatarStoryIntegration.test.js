const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(
  path.join(
    process.cwd(),
    'src/profile/application/view-models/useProfileViewModel.ts',
  ),
  'utf8',
);

describe('profile avatar Story integration', () => {
  it('shares every successful avatar update to Stories and emits the optimistic item', () => {
    expect(source).toContain('updateAvatarAndShareStory(avatarUri');
    expect(source).toContain('storiesRepository.createStory(draft)');
    expect(source).toContain('storyCreatedEvents.emit(story)');
    expect(source).toContain('return result.avatarUpdated');
  });
});

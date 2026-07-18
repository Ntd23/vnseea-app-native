import {
  buildAvatarStoryDraft,
  buildAvatarUploadFile,
  updateAvatarAndShareStory,
} from '../updateAvatarAndShareStory';

describe('updateAvatarAndShareStory', () => {
  const timestamp = 1_789_200_000_000;
  const avatarUri = 'content://photos/new-avatar';

  it('uses the same avatar image for the profile upload and Story upload', async () => {
    const uploadAvatar = jest.fn().mockResolvedValue(true);
    const createStory = jest
      .fn()
      .mockResolvedValue({ storyId: 'story-42', message: 'created' });
    const emitStory = jest.fn();

    const result = await updateAvatarAndShareStory(avatarUri, {
      uploadAvatar,
      createStory,
      emitStory,
      currentUserId: 'user-7',
      currentUserProfile: {
        name: 'Giang',
        username: 'giang',
        avatarUrl: 'https://cdn.example.com/old-avatar.jpg',
      },
      now: () => timestamp,
    });

    const avatarFile = buildAvatarUploadFile(avatarUri, timestamp);
    expect(uploadAvatar).toHaveBeenCalledWith(avatarFile);
    expect(createStory).toHaveBeenCalledWith(buildAvatarStoryDraft(avatarFile));
    expect(emitStory).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'story-42',
        publisher: expect.objectContaining({
          userId: 'user-7',
          avatarUrl: avatarUri,
        }),
        thumbnailUrl: avatarUri,
        media: [
          expect.objectContaining({
            type: 'image',
            url: avatarUri,
          }),
        ],
      }),
    );
    expect(result).toEqual({ avatarUpdated: true, storyCreated: true });
  });

  it('does not create a Story when updating the avatar fails', async () => {
    const createStory = jest.fn();
    const emitStory = jest.fn();

    await expect(
      updateAvatarAndShareStory(avatarUri, {
        uploadAvatar: jest.fn().mockResolvedValue(false),
        createStory,
        emitStory,
        now: () => timestamp,
      }),
    ).resolves.toEqual({ avatarUpdated: false, storyCreated: false });

    expect(createStory).not.toHaveBeenCalled();
    expect(emitStory).not.toHaveBeenCalled();
  });

  it('keeps a successful avatar update when the Story upload fails', async () => {
    const storyError = new Error('story upload failed');

    const result = await updateAvatarAndShareStory(avatarUri, {
      uploadAvatar: jest.fn().mockResolvedValue(true),
      createStory: jest.fn().mockRejectedValue(storyError),
      emitStory: jest.fn(),
      now: () => timestamp,
    });

    expect(result).toEqual({
      avatarUpdated: true,
      storyCreated: false,
      storyError,
    });
  });
});

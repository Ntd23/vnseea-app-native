import {
  applyComposerVideoThumbnail,
  createComposerMediaDrafts,
  markComposerMediaPreparationFailed,
} from '../messageComposerMediaDraft';

describe('message composer media drafts', () => {
  const assets = [
    {
      uri: 'file:///photo.jpg',
      fileName: 'photo.jpg',
      type: 'image/jpeg',
      width: 1200,
      height: 900,
    },
    {
      uri: '/storage/emulated/0/DCIM/video.mp4',
      fileName: 'video.mp4',
      type: 'video/mp4',
      width: 1080,
      height: 1920,
      duration: 25,
    },
  ];

  it('creates image and video drafts immediately without waiting for a thumbnail', () => {
    const drafts = createComposerMediaDrafts(assets, {
      platform: 'android',
      createDraftId: index => `draft-${index}`,
      now: 123,
    });

    expect(drafts).toEqual([
      expect.objectContaining({
        draftId: 'draft-0',
        uri: 'file:///photo.jpg',
        mediaType: 'image',
        preparationState: 'ready',
      }),
      expect.objectContaining({
        draftId: 'draft-1',
        uri: 'file:///storage/emulated/0/DCIM/video.mp4',
        mediaType: 'video',
        preparationState: 'preparing',
      }),
    ]);
    expect(drafts[1]?.thumbnailUri).toBeUndefined();
  });

  it('updates only the matching video when its thumbnail is ready', () => {
    const drafts = createComposerMediaDrafts(assets, {
      platform: 'ios',
      createDraftId: index => `draft-${index}`,
      now: 123,
    });

    const updated = applyComposerVideoThumbnail(drafts, 'draft-1', {
      uri: 'file:///video-thumb.jpg',
      name: 'video-thumb.jpg',
      type: 'image/jpeg',
    });

    expect(updated[0]).toBe(drafts[0]);
    expect(updated[1]).toEqual(
      expect.objectContaining({
        draftId: 'draft-1',
        thumbnailUri: 'file:///video-thumb.jpg',
        preparationState: 'ready',
      }),
    );
  });

  it('ignores a completed task after the user removed that draft', () => {
    const drafts = createComposerMediaDrafts(assets, {
      platform: 'ios',
      createDraftId: index => `draft-${index}`,
      now: 123,
    }).filter(draft => draft.draftId !== 'draft-1');

    expect(
      applyComposerVideoThumbnail(drafts, 'draft-1', {
        uri: 'file:///stale-thumb.jpg',
        name: 'stale-thumb.jpg',
        type: 'image/jpeg',
      }),
    ).toBe(drafts);
    expect(markComposerMediaPreparationFailed(drafts, 'draft-1')).toBe(drafts);
  });
});

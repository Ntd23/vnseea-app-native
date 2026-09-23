import { getGroupPipGridLayout } from '../callPipGridLayout';

describe('group call PiP grid layout', () => {
  it('keeps two portrait 3:4 cells in the existing horizontal PiP', () => {
    expect(getGroupPipGridLayout(2)).toEqual({
      aspectHeight: 2,
      aspectWidth: 3,
      columns: 2,
      contentHeight: 720,
      contentWidth: 1080,
      rows: 1,
      slots: 2,
      tileHeight: 720,
      tileWidth: 540,
    });
  });

  it.each([3, 4])(
    'uses a 2x2 portrait grid for %i visible videos',
    videoCount => {
      expect(getGroupPipGridLayout(videoCount)).toEqual({
        aspectHeight: 4,
        aspectWidth: 3,
        columns: 2,
        contentHeight: 1440,
        contentWidth: 1080,
        rows: 2,
        slots: 4,
        tileHeight: 720,
        tileWidth: 540,
      });
    },
  );
});

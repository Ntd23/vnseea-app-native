import {
  getPhotoGridItemGutterStyle,
  getPhotoGridItemLayout,
  getPhotoGridRows,
} from '../photoGridLayout';

describe('photo grid layout', () => {
  it('splits odd two-column widths without leaving a horizontal gap', () => {
    const left = getPhotoGridItemLayout(0, 2, 353);
    const right = getPhotoGridItemLayout(1, 2, 353);

    expect(left.width + right.width).toBe(353);
  });

  it('uses a full-width hero and exact-width second row for three photos', () => {
    const hero = getPhotoGridItemLayout(0, 3, 353);
    const left = getPhotoGridItemLayout(1, 3, 353);
    const right = getPhotoGridItemLayout(2, 3, 353);

    expect(hero.width).toBe(353);
    expect(left.width + right.width).toBe(353);
  });

  it('keeps each two-column row exact-width for four or more photos', () => {
    const rowOneLeft = getPhotoGridItemLayout(0, 5, 353);
    const rowOneRight = getPhotoGridItemLayout(1, 5, 353);
    const rowTwoLeft = getPhotoGridItemLayout(2, 5, 353);
    const rowTwoRight = getPhotoGridItemLayout(3, 5, 353);

    expect(rowOneLeft.width + rowOneRight.width).toBe(353);
    expect(rowTwoLeft.width + rowTwoRight.width).toBe(353);
  });

  it('keeps a two-photo grid flush at the outer edges with a two-pixel internal gutter', () => {
    const left = getPhotoGridItemGutterStyle(0, 2, 2);
    const right = getPhotoGridItemGutterStyle(1, 2, 2);

    expect(left).toEqual({ paddingRight: 1 });
    expect(right).toEqual({ paddingLeft: 1 });
    expect((left.paddingRight ?? 0) + (right.paddingLeft ?? 0)).toBe(2);
  });

  it('keeps a three-photo hero and second row flush around the outside', () => {
    const hero = getPhotoGridItemGutterStyle(0, 3, 2);
    const bottomLeft = getPhotoGridItemGutterStyle(1, 3, 2);
    const bottomRight = getPhotoGridItemGutterStyle(2, 3, 2);

    expect(hero).toEqual({ paddingBottom: 1 });
    expect(bottomLeft).toEqual({ paddingTop: 1, paddingRight: 1 });
    expect(bottomRight).toEqual({ paddingTop: 1, paddingLeft: 1 });
  });

  it('uses gutters only between cells in a four-photo grid', () => {
    expect(getPhotoGridItemGutterStyle(0, 5, 2)).toEqual({
      paddingRight: 1,
      paddingBottom: 1,
    });
    expect(getPhotoGridItemGutterStyle(1, 5, 2)).toEqual({
      paddingLeft: 1,
      paddingBottom: 1,
    });
    expect(getPhotoGridItemGutterStyle(2, 5, 2)).toEqual({
      paddingTop: 1,
      paddingRight: 1,
    });
    expect(getPhotoGridItemGutterStyle(3, 5, 2)).toEqual({
      paddingTop: 1,
      paddingLeft: 1,
    });
  });

  it('groups composer previews into the same explicit rows as Feed', () => {
    expect(getPhotoGridRows(1)).toEqual([[0]]);
    expect(getPhotoGridRows(2)).toEqual([[0, 1]]);
    expect(getPhotoGridRows(3)).toEqual([[0], [1, 2]]);
    expect(getPhotoGridRows(4)).toEqual([
      [0, 1],
      [2, 3],
    ]);
    expect(getPhotoGridRows(9)).toEqual([
      [0, 1],
      [2, 3],
    ]);
  });
});

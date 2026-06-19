import { getPhotoGridItemLayout } from '../photoGridLayout';

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
});

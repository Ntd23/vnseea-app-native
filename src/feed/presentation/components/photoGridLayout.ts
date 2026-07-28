export type PhotoGridItemLayout = {
  width: number;
  height: number;
};

export type PhotoGridItemGutterStyle = {
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
};

export function getPhotoGridRows(totalPhotos: number): number[][] {
  const displayedCount = Math.min(Math.max(Math.floor(totalPhotos), 0), 4);

  if (displayedCount === 0) return [];
  if (displayedCount === 1) return [[0]];
  if (displayedCount === 2) return [[0, 1]];
  if (displayedCount === 3) return [[0], [1, 2]];
  return [[0, 1], [2, 3]];
}

function getTwoColumnWidth(gridWidth: number, isLeftColumn: boolean) {
  const leftWidth = Math.floor(gridWidth / 2);
  return isLeftColumn ? leftWidth : gridWidth - leftWidth;
}

export function getPhotoGridItemLayout(
  index: number,
  totalPhotos: number,
  gridWidth: number,
): PhotoGridItemLayout {
  const safeGridWidth = Math.max(0, gridWidth);

  if (totalPhotos <= 1) {
    return {
      width: safeGridWidth,
      height: safeGridWidth / 1.4,
    };
  }

  if (totalPhotos === 3 && index === 0) {
    return {
      width: safeGridWidth,
      height: safeGridWidth / 1.6,
    };
  }

  const isLeftColumn = totalPhotos === 3 ? index === 1 : index % 2 === 0;

  return {
    width: getTwoColumnWidth(safeGridWidth, isLeftColumn),
    height: safeGridWidth / 2,
  };
}

export function getPhotoGridItemGutterStyle(
  index: number,
  totalPhotos: number,
  gutterSize: number,
): PhotoGridItemGutterStyle {
  if (totalPhotos <= 1 || index < 0) return {};

  const halfGutter = Math.max(0, gutterSize) / 2;
  const style: PhotoGridItemGutterStyle = {};

  if (totalPhotos === 3 && index === 0) {
    if (halfGutter > 0) style.paddingBottom = halfGutter;
    return style;
  }

  const adjustedIndex = totalPhotos === 3 ? index - 1 : index;
  const isLeftColumn = adjustedIndex % 2 === 0;
  const rowIndex = totalPhotos === 3 ? 1 : Math.floor(index / 2);
  const displayedCount = Math.min(totalPhotos, 4);
  const lastRowIndex = totalPhotos === 3 ? 1 : Math.ceil(displayedCount / 2) - 1;

  if (halfGutter > 0) {
    if (isLeftColumn) {
      style.paddingRight = halfGutter;
    } else {
      style.paddingLeft = halfGutter;
    }

    if (rowIndex > 0) style.paddingTop = halfGutter;
    if (rowIndex < lastRowIndex) style.paddingBottom = halfGutter;
  }

  return style;
}

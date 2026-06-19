export type PhotoGridItemLayout = {
  width: number;
  height: number;
};

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

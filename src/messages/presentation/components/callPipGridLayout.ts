const GROUP_PIP_TILE_WIDTH = 540;
const GROUP_PIP_TILE_HEIGHT = 720;

export type GroupPipGridLayout = {
  aspectHeight: number;
  aspectWidth: number;
  columns: number;
  contentHeight: number;
  contentWidth: number;
  rows: number;
  slots: number;
  tileHeight: number;
  tileWidth: number;
};

export function getGroupPipGridLayout(
  visibleVideoCount: number,
): GroupPipGridLayout {
  const normalizedCount = Math.max(1, Math.min(4, visibleVideoCount));
  const usesPortraitGrid = normalizedCount >= 3;
  const columns = normalizedCount === 1 ? 1 : 2;
  const rows = usesPortraitGrid ? 2 : 1;

  return {
    aspectHeight: usesPortraitGrid ? 4 : 2,
    aspectWidth: 3,
    columns,
    contentHeight: usesPortraitGrid
      ? GROUP_PIP_TILE_HEIGHT * rows
      : GROUP_PIP_TILE_HEIGHT,
    contentWidth: usesPortraitGrid ? GROUP_PIP_TILE_WIDTH * columns : 1080,
    rows,
    slots: usesPortraitGrid ? 4 : normalizedCount,
    tileHeight: GROUP_PIP_TILE_HEIGHT,
    tileWidth: GROUP_PIP_TILE_WIDTH,
  };
}

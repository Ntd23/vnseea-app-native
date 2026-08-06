// Description: Preserves list-item references across unrelated Home feed updates.

type StableListItem = {
  id: string;
};

/**
 * FlashList memoizes view holders with reference equality for `item`.
 * Rebuilding wrapper objects for every row therefore invalidates every
 * engaged cell even when only one supplemental rail/live row changed.
 *
 * Reuse the previous object for equivalent ids and return the previous array
 * itself when neither order nor payload changed.
 */
export function reuseStableItemsById<T extends StableListItem>(
  previousItems: T[],
  nextItems: T[],
  areEquivalent: (previous: T, next: T) => boolean,
  options: { preserveExistingOrder?: boolean } = {},
): T[] {
  if (previousItems.length === 0) return nextItems;

  const orderedNextItems = options.preserveExistingOrder
    ? (() => {
        const nextById = new Map(nextItems.map(item => [item.id, item] as const));
        const previousIds = new Set(previousItems.map(item => item.id));

        return [
          ...previousItems
            .map(item => nextById.get(item.id))
            .filter((item): item is T => Boolean(item)),
          ...nextItems.filter(item => !previousIds.has(item.id)),
        ];
      })()
    : nextItems;

  const previousById = new Map(
    previousItems.map(item => [item.id, item] as const),
  );
  let matchesPreviousArray = previousItems.length === orderedNextItems.length;

  const stableItems = orderedNextItems.map((nextItem, index) => {
    const previousItem = previousById.get(nextItem.id);
    const stableItem =
      previousItem && areEquivalent(previousItem, nextItem)
        ? previousItem
        : nextItem;

    if (stableItem !== previousItems[index]) {
      matchesPreviousArray = false;
    }

    return stableItem;
  });

  return matchesPreviousArray ? previousItems : stableItems;
}

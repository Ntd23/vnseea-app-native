import { reuseStableItemsById } from '../feedListItemStability';

type TestItem = {
  id: string;
  payload: object;
};

const samePayload = (previous: TestItem, next: TestItem) =>
  previous.payload === next.payload;

describe('reuseStableItemsById', () => {
  it('returns the previous array when ids, order, and payloads are unchanged', () => {
    const firstPayload = {};
    const secondPayload = {};
    const previous = [
      { id: '1', payload: firstPayload },
      { id: '2', payload: secondPayload },
    ];

    const result = reuseStableItemsById(
      previous,
      [
        { id: '1', payload: firstPayload },
        { id: '2', payload: secondPayload },
      ],
      samePayload,
    );

    expect(result).toBe(previous);
  });

  it('reuses unchanged rows while replacing only the changed payload', () => {
    const firstPayload = {};
    const previous = [
      { id: '1', payload: firstPayload },
      { id: '2', payload: {} },
    ];
    const changedSecondItem = { id: '2', payload: {} };

    const result = reuseStableItemsById(
      previous,
      [
        { id: '1', payload: firstPayload },
        changedSecondItem,
      ],
      samePayload,
    );

    expect(result).not.toBe(previous);
    expect(result[0]).toBe(previous[0]);
    expect(result[1]).toBe(changedSecondItem);
  });

  it('keeps stable row objects while following the next order', () => {
    const previous = [
      { id: '1', payload: {} },
      { id: '2', payload: {} },
    ];

    const result = reuseStableItemsById(
      previous,
      [
        { id: '2', payload: previous[1].payload },
        { id: '1', payload: previous[0].payload },
      ],
      samePayload,
    );

    expect(result).not.toBe(previous);
    expect(result).toEqual([previous[1], previous[0]]);
  });

  it('keeps the existing deep-feed order and appends newly arriving rows', () => {
    const previous = [
      { id: 'post-1', payload: {} },
      { id: 'post-2', payload: {} },
      { id: 'post-3', payload: {} },
    ];
    const insertedRow = { id: 'product-1', payload: {} };
    const appendedRow = { id: 'post-4', payload: {} };

    const result = reuseStableItemsById(
      previous,
      [previous[0], insertedRow, previous[1], previous[2], appendedRow],
      samePayload,
      { preserveExistingOrder: true },
    );

    expect(result).toEqual([
      previous[0],
      previous[1],
      previous[2],
      insertedRow,
      appendedRow,
    ]);
  });
});

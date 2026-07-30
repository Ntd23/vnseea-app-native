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
});

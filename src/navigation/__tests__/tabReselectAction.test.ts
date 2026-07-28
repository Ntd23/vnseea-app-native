import {
  getTabReselectAction,
  TAB_RESELECT_TOP_THRESHOLD,
} from '../tabReselectAction';

describe('getTabReselectAction', () => {
  it('scrolls when the list is below the top threshold', () => {
    expect(getTabReselectAction(TAB_RESELECT_TOP_THRESHOLD + 1)).toBe(
      'scroll-to-top',
    );
    expect(getTabReselectAction(100)).toBe('scroll-to-top');
  });

  it('refreshes at the threshold and during an iOS top bounce', () => {
    expect(getTabReselectAction(TAB_RESELECT_TOP_THRESHOLD)).toBe('refresh');
    expect(getTabReselectAction(0)).toBe('refresh');
    expect(getTabReselectAction(-24)).toBe('refresh');
  });

  it('treats an invalid offset as the top of the list', () => {
    expect(getTabReselectAction(Number.NaN)).toBe('refresh');
    expect(getTabReselectAction(Number.POSITIVE_INFINITY)).toBe('refresh');
  });
});

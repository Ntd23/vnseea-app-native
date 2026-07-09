import { iosPagerSwipeLock } from '../iosPagerSwipeLock';

describe('iosPagerSwipeLock', () => {
  afterEach(() => {
    iosPagerSwipeLock.setLocked(false);
  });

  it('publishes locked state changes for the iOS tab pager', () => {
    const listener = jest.fn();
    const unsubscribe = iosPagerSwipeLock.subscribe(listener);

    iosPagerSwipeLock.setLocked(true);
    iosPagerSwipeLock.setLocked(true);
    iosPagerSwipeLock.setLocked(false);

    unsubscribe();
    iosPagerSwipeLock.setLocked(true);

    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenNthCalledWith(1, true);
    expect(listener).toHaveBeenNthCalledWith(2, false);
  });
});
